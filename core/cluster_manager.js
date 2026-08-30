const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadRegistry } = require('./agent_registry');

const STATE_FILE = path.join(__dirname, 'cluster_state.json');

/**
 * CORREÇÃO (2026-08-28, 3 rodadas):
 * 1ª: 'claude' estava ausente da fila desde sempre (hardcoded, esquecido quando o time
 *     cresceu).
 * 2ª: virou uma lista hardcoded correta mas ESTÁTICA — corrigido derivando de
 *     .agents/registry.json (fonte única, versionada no git).
 * 3ª (esta): descoberto que `helios-gemini3/tools/cluster_manager.js` era uma
 *     implementação PARALELA e DIVERGENTE deste mesmo arquivo — construída
 *     independentemente pelo Gemini 3 dentro do próprio worktree dele, com uma auditoria
 *     de terminal REAL (lê o output de verdade via `orca terminal read` e detecta erro de
 *     cota por regex) que este arquivo nunca teve — só descrevia isso em prosa na skill
 *     `orchestra`, sem implementar de verdade. E pior: `orca-live-preview/server.js`
 *     estava lendo o `cluster_state.json` do Gemini 3, não este — ou seja, TODAS as
 *     correções feitas aqui nas rodadas 1 e 2 nunca apareciam no painel real que o usuário
 *     via. Consolidado: a auditoria real do Gemini 3 foi portada pra cá (com a lista de
 *     agentes vindo do registro, não mais hardcoded), e server.js foi corrigido pra ler
 *     ESTE arquivo. A cópia em helios-gemini3/tools/ foi deixada intacta (não é apagar
 *     trabalho de outro agente), mas com um aviso apontando pra cá.
 */
function buildPriorityQueue() {
  const { agents } = loadRegistry();
  return agents
    .slice()
    .sort((a, b) => (a.failoverPriority ?? 999) - (b.failoverPriority ?? 999))
    .map(a => a.id);
}
const PRIORITY_QUEUE = buildPriorityQueue();
const QUARANTINE_DURATION_MS = 60 * 60 * 1000; // 60 minutos mínimos antes de reconsiderar recuperação

// Padrões de erro de exaustão de cota — ampliado a partir do que o Gemini 3 já tinha
// validado contra terminais reais (cada padrão aqui já bateu em algum terminal de verdade
// nesta equipe pelo menos uma vez).
const SYSTEM_QUOTA_ERROR_PATTERNS = [
  /You've hit your weekly limit/i,
  /hit your limit\s*·\s*resets/i,
  /\/upgrade to increase your usage limit/i,
  /Individual quota reached/i,
  /Please upgrade your subscription to increase your limits/i,
  /Error ID:\s*[a-f0-9-]+-\d+/i,
  /RESOURCE_EXHAUSTED/i,
  /insufficient_quota/i,
  /rate_limit_exceeded/i,
  /status code 429/i,
  /HTTP 429/i
];

function defaultNode(id, isSupervisor) {
  return {
    role: isSupervisor ? 'supervisor' : 'worker',
    status: isSupervisor ? 'ACTIVE' : 'READY',
    pool: 'ACTIVE',
    quarantine_until: null,
    current_task: null,
    last_seen: Date.now(),
    retries: 0
  };
}

// Mapa id -> caminho de worktree (pra casar com worktreePath devolvido por `orca terminal
// list`), derivado do registro — não mais um if/else hardcoded por agente (era assim na
// versão do Gemini 3; funcionava, mas exigia lembrar de adicionar um `else if` a cada
// agente novo).
function buildWorktreeMatchers() {
  const map = {};
  for (const agent of loadRegistry().agents) {
    map[agent.id] = agent.worktree.toLowerCase();
  }
  return map;
}

/**
 * Lê o estado REAL de cada terminal via `orca terminal list`/`terminal read` e detecta
 * exaustão de cota por regex no output de verdade — não é uma suposição, é o que está
 * escrito na tela daquele agente agora. Portado da implementação original do Gemini 3
 * (helios-gemini3/tools/cluster_manager.js), generalizada pra usar o registro de agentes
 * em vez de uma lista hardcoded.
 */
function getActiveTerminalDetails() {
  try {
    const raw = execSync('orca terminal list --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const parsed = JSON.parse(raw);
    const terminals = parsed.result?.terminals || [];
    const worktreeMatchers = buildWorktreeMatchers();
    const map = {};

    for (const t of terminals) {
      const p = (t.worktreePath || '').replace(/\\/g, '/').toLowerCase();
      let agent = null;
      for (const [id, worktreeName] of Object.entries(worktreeMatchers)) {
        if (p.includes(worktreeName.toLowerCase())) { agent = id; break; }
      }
      if (!agent) continue;

      let fullOutput = t.preview || '';
      try {
        const readRaw = execSync(`orca terminal read --terminal ${t.handle} --limit 35 --json`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        const readParsed = JSON.parse(readRaw);
        const tail = readParsed.result?.terminal?.tail || [];
        const systemLines = tail.filter(l => {
          const trimmed = l.trim();
          if (!trimmed) return false;
          if (trimmed.startsWith('❯') || trimmed.startsWith('>') || trimmed.startsWith('●') || trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('|') || trimmed.startsWith('#')) return false;
          if (trimmed.includes('cluster_state') || trimmed.includes('motivo') || trimmed.includes('misatribuição') || trimmed.includes('quarantine_reason')) return false;
          // Achado real (2026-08-30, terminal do próprio Claude Code marcado
          // TOKEN_EXHAUSTED com motivo "/HTTP 429/i" sem nenhum erro real —
          // usuário reportou que o painel dizia "sem cota" com cota de sobra
          // no indicador nativo do Orca). O bloqueio de palavras-chave acima
          // (linha anterior) é reativo por natureza — cada nova ocorrência
          // exige adicionar mais uma palavra à lista, e nunca cobre tudo que
          // um agente pode discutir sobre esses mesmos padrões no futuro
          // (documentação, commits, código deste próprio arquivo sendo lido/
          // editado). Filtro mais geral: texto em markdown que MENCIONA um
          // padrão de erro (ex: discutindo "`HTTP 429`" ou "/HTTP 429/i" como
          // exemplo) quase sempre usa crase (inline code) ou barras de
          // delimitador de regex — erro real de API/sistema nunca usa essas
          // formatações. Excluir qualquer linha com esses caracteres reduz
          // drasticamente falso-positivo de prosa sem precisar prever cada
          // palavra-chave nova.
          if (trimmed.includes('`') || /\/[A-Za-z][^/\n]{2,40}\/[a-z]?\b/.test(trimmed)) return false;
          return true;
        });
        fullOutput = systemLines.join('\n');
      } catch (e) {}

      let hasQuotaError = false;
      let matchedReason = '';
      for (const pat of SYSTEM_QUOTA_ERROR_PATTERNS) {
        if (pat.test(fullOutput)) {
          hasQuotaError = true;
          matchedReason = pat.toString();
          break;
        }
      }

      let resetInfo = '';
      const weeklyMatch = fullOutput.match(/resets\s+([^\n]+)/i);
      if (weeklyMatch) resetInfo = weeklyMatch[1].trim();

      map[agent] = {
        handle: t.handle,
        preview: fullOutput.slice(0, 140),
        lastOutputAt: t.lastOutputAt,
        connected: t.connected,
        writable: t.writable,
        hasQuotaError,
        quotaReason: matchedReason,
        resetInfo
      };
    }
    return map;
  } catch (e) {
    return {};
  }
}

/**
 * Audita todos os agentes do registro contra o estado REAL dos terminais e sincroniza
 * quarantine_pool/active_pool de acordo — detecção automática, não depende de alguém
 * rodar `quarantine <agente>` manualmente. Respeita QUARANTINE_DURATION_MS como piso
 * mínimo antes de reconsiderar recuperação (evita flapping: um agente que ainda mostra o
 * erro na tela mas já não está gerando output novo não deveria sair e voltar da quarentena
 * a cada ciclo de 60s do daemon).
 */
function auditAndSyncClusterState(state) {
  const terminalDetails = getActiveTerminalDetails();
  const now = Date.now();

  for (const id of PRIORITY_QUEUE) {
    if (!state.nodes[id]) {
      state.nodes[id] = defaultNode(id, id === state.active_supervisor);
    }

    const term = terminalDetails[id];
    if (!term) continue;

    if (term.hasQuotaError) {
      state.nodes[id].status = 'TOKEN_EXHAUSTED';
      state.nodes[id].pool = 'QUARANTINE';
      state.nodes[id].quarantine_reason = term.quotaReason;
      state.nodes[id].reset_info = term.resetInfo || 'Pendente de reset';
      state.nodes[id].last_seen = term.lastOutputAt || now;
      if (!state.nodes[id].quarantine_until) {
        state.nodes[id].quarantine_until = now + QUARANTINE_DURATION_MS;
      }
      if (!state.quarantine_pool.includes(id)) state.quarantine_pool.push(id);
      state.active_pool = state.active_pool.filter(item => item !== id);
    } else if (state.quarantine_pool.includes(id)) {
      // Só libera se: piso mínimo de tempo já passou E o terminal está conectado E sem erro.
      const pastMinimumHold = !state.nodes[id].quarantine_until || now >= state.nodes[id].quarantine_until;
      if (pastMinimumHold && term.connected) {
        state.nodes[id].status = 'READY';
        state.nodes[id].pool = 'ACTIVE';
        state.nodes[id].quarantine_until = null;
        state.nodes[id].quarantine_reason = null;
        state.quarantine_pool = state.quarantine_pool.filter(item => item !== id);
        if (!state.active_pool.includes(id)) state.active_pool.push(id);
      }
    } else if (state.nodes[id].status === 'TOKEN_EXHAUSTED') {
      // Achado real (2026-08-30): este ramo só limpava status/pool, deixando
      // quarantine_reason/quarantine_until/reset_info velhos pra trás quando um
      // nó saía do quarantine_pool por outro caminho (ex: correção manual) — o
      // painel de disponibilidade continuava mostrando o motivo antigo até o
      // próximo ciclo completo. Limpa tudo de uma vez, igual ao ramo de cima.
      state.nodes[id].status = 'READY';
      state.nodes[id].pool = 'ACTIVE';
      state.nodes[id].quarantine_until = null;
      state.nodes[id].quarantine_reason = null;
    }
  }

  if (!state.active_pool.includes(state.active_supervisor)) {
    state.active_pool.push(state.active_supervisor);
    state.quarantine_pool = state.quarantine_pool.filter(item => item !== state.active_supervisor);
    if (state.nodes[state.active_supervisor]) {
      state.nodes[state.active_supervisor].pool = 'ACTIVE';
      state.nodes[state.active_supervisor].status = 'ACTIVE';
      // Mesmo gap do ramo de recuperação acima (achado 2026-08-30) — este ramo
      // forçava o supervisor pra ACTIVE mas deixava quarantine_reason/
      // quarantine_until velhos pra trás (achado ao ver gemini3 com "ACTIVE" e
      // um motivo de quarentena fantasma ao mesmo tempo).
      state.nodes[state.active_supervisor].quarantine_until = null;
      state.nodes[state.active_supervisor].quarantine_reason = null;
    }
  }

  saveState(state);
  return state;
}

function loadState() {
  let state;
  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      console.warn('Erro ao carregar cluster_state.json, recriando...', e.message);
    }
  }

  if (!state) {
    const initialNodes = {};
    for (const id of PRIORITY_QUEUE) {
      initialNodes[id] = defaultNode(id, id === PRIORITY_QUEUE[0]);
    }
    state = {
      active_supervisor: PRIORITY_QUEUE[0],
      priority_queue: PRIORITY_QUEUE,
      active_pool: [...PRIORITY_QUEUE],
      quarantine_pool: [],
      last_failover: null,
      nodes: initialNodes
    };
  }

  if (!state.active_pool) state.active_pool = [...PRIORITY_QUEUE];
  if (!state.quarantine_pool) state.quarantine_pool = [];
  if (!state.nodes) state.nodes = {};
  // Backfill: qualquer agente novo no registro que um cluster_state.json salvo
  // anteriormente ainda não conhece.
  for (const id of PRIORITY_QUEUE) {
    if (!state.nodes[id]) {
      state.nodes[id] = defaultNode(id, false);
      if (!state.active_pool.includes(id)) state.active_pool.push(id);
    }
  }
  if (!state.priority_queue) {
    state.priority_queue = [...PRIORITY_QUEUE];
  } else {
    for (const id of PRIORITY_QUEUE) {
      if (!state.priority_queue.includes(id)) state.priority_queue.push(id);
    }
  }

  return state;
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function broadcastLivePreview(title, description, agent = 'global') {
  try {
    const showJs = 'C:\\Users\\Usuario\\Documents\\orca-live-preview\\show.js';
    if (fs.existsSync(showJs)) {
      execSync(`node "${showJs}" --status "${title}" "${description}" --agent ${agent}`, { stdio: 'ignore' });
    }
  } catch (e) {}
}

/**
 * Despacha uma instrução pro terminal real de um agente via `orca terminal send` —
 * bloqueado automaticamente se o agente estiver em quarentena. Portado do Gemini 3.
 */
function sendToTerminal(agentKey, text) {
  const state = loadState();
  if (state.quarantine_pool.includes(agentKey) || state.nodes[agentKey]?.status === 'TOKEN_EXHAUSTED') {
    console.error(`⛔ [BLOQUEIO DE QUARENTENA] Agente ${agentKey.toUpperCase()} está sem tokens / limite semanal esgotado. Envio cancelado.`);
    return false;
  }
  const details = getActiveTerminalDetails();
  const handle = details[agentKey]?.handle;
  if (!handle) {
    console.error(`❌ Terminal handle não encontrado para ${agentKey} (agente pode estar fechado).`);
    return false;
  }
  try {
    const cleanText = text.replace(/"/g, '\\"');
    execSync(`orca terminal send --terminal ${handle} --text "${cleanText}" --enter --json`, { stdio: 'ignore' });
    console.log(`📡 [Despacho IPC] Enviado com sucesso para ${agentKey.toUpperCase()} (${handle})`);
    return true;
  } catch (e) {
    console.error(`❌ Falha ao enviar para ${agentKey}:`, e.message);
    return false;
  }
}

function printStatus(state) {
  const now = Date.now();
  console.log('================================================================================');
  console.log(`🌐 ORCA CLUSTER STATUS | Supervisor Ativo: [${state.active_supervisor.toUpperCase()}]`);
  console.log(`🏊 ACTIVE_POOL: [${state.active_pool.join(', ').toUpperCase()}]`);
  console.log(`⛔ QUARANTINE_POOL: [${state.quarantine_pool.length > 0 ? state.quarantine_pool.join(', ').toUpperCase() : 'NENHUM'}]`);
  console.log('================================================================================');
  console.log(' Agente   | Papel        | Pool       | Status             | Info / Quarentena');
  console.log('----------|--------------|------------|--------------------|--------------------------------');
  for (const [id, node] of Object.entries(state.nodes)) {
    const isSup = id === state.active_supervisor;
    const roleStr = isSup ? '👑 Supervisor' : '⚙️ Worker';
    let info = 'Liberado';
    if (node.pool === 'QUARANTINE') {
      const remMin = node.quarantine_until ? Math.max(0, Math.ceil((node.quarantine_until - now) / (60 * 1000))) : '?';
      info = node.reset_info ? `${node.reset_info} (piso ${remMin}m)` : `Bloqueado (${remMin}m)`;
    }
    console.log(` ${id.padEnd(8)} | ${roleStr.padEnd(12)} | ${(node.pool || 'ACTIVE').padEnd(10)} | ${node.status.padEnd(18)} | ${info}`);
  }
  console.log('================================================================================');
}

if (require.main === module) {
  const command = process.argv[2] || 'status';
  const targetAgent = process.argv[3];
  const targetText = process.argv.slice(4).join(' ');

  let state = loadState();

  switch (command.toLowerCase()) {
    case 'elect': {
      let newSupervisor = (targetAgent || '').toLowerCase();
      if (!state.nodes[newSupervisor]) {
        const cwd = process.cwd();
        const match = cwd.match(/helios-(gemini\d|glm|claude)/i);
        if (match && state.nodes[match[1].toLowerCase()]) {
          newSupervisor = match[1].toLowerCase();
        } else {
          newSupervisor = state.active_supervisor || PRIORITY_QUEUE[0];
        }
      }
      if (state.quarantine_pool.includes(newSupervisor)) {
        console.error(`⛔ Agente '${newSupervisor}' está em QUARANTINE_POOL e não pode ser eleito Supervisor!`);
        process.exit(1);
      }
      for (const [id, node] of Object.entries(state.nodes)) {
        if (id === newSupervisor) {
          node.role = 'supervisor'; node.status = 'ACTIVE'; node.pool = 'ACTIVE';
        } else {
          node.role = 'worker';
          if (node.status === 'ACTIVE') node.status = 'READY';
        }
        node.last_seen = Date.now();
      }
      state.active_supervisor = newSupervisor;
      state.last_failover = Date.now();
      saveState(state);
      const msg = `[BROADCAST] SUPERVISOR_FAILOVER: Agent_${newSupervisor.toUpperCase()} assumiu a supervisão global do cluster.`;
      console.log(`\n👑 ${msg}\n`);
      broadcastLivePreview(`Supervisor Ativo: ${newSupervisor.toUpperCase()}`, msg, newSupervisor);
      break;
    }

    case 'failover': {
      const currentSup = state.active_supervisor;
      const now = Date.now();
      state.nodes[currentSup].status = 'TOKEN_EXHAUSTED';
      state.nodes[currentSup].role = 'worker';
      state.nodes[currentSup].pool = 'QUARANTINE';
      state.nodes[currentSup].quarantine_until = now + QUARANTINE_DURATION_MS;
      state.active_pool = state.active_pool.filter(id => id !== currentSup);
      if (!state.quarantine_pool.includes(currentSup)) state.quarantine_pool.push(currentSup);

      let nextSupervisor = null;
      for (const id of state.priority_queue) {
        if (id !== currentSup && state.active_pool.includes(id) && state.nodes[id].status !== 'TOKEN_EXHAUSTED') {
          nextSupervisor = id;
          break;
        }
      }
      if (!nextSupervisor) nextSupervisor = state.priority_queue.find(id => id !== currentSup) || PRIORITY_QUEUE[0];

      state.nodes[nextSupervisor].role = 'supervisor';
      state.nodes[nextSupervisor].status = 'ACTIVE';
      state.nodes[nextSupervisor].pool = 'ACTIVE';
      state.nodes[nextSupervisor].last_seen = now;
      state.active_supervisor = nextSupervisor;
      state.last_failover = now;
      saveState(state);
      const msg = `[BROADCAST] SUPERVISOR_FAILOVER: Agent_${nextSupervisor.toUpperCase()} assumiu a supervisão global do cluster após failover de ${currentSup.toUpperCase()}.`;
      console.log(`\n🚨 FAILOVER EXECUTADO!\n👑 ${msg}\n`);
      broadcastLivePreview(`Failover: ${nextSupervisor.toUpperCase()} Ativo`, msg, nextSupervisor);
      break;
    }

    case 'mark-exhausted':
    case 'quarantine': {
      const agent = (targetAgent || '').toLowerCase();
      if (state.nodes[agent]) {
        const now = Date.now();
        state.nodes[agent].status = 'TOKEN_EXHAUSTED';
        state.nodes[agent].pool = 'QUARANTINE';
        state.nodes[agent].quarantine_until = now + QUARANTINE_DURATION_MS;
        state.nodes[agent].last_seen = now;
        state.active_pool = state.active_pool.filter(id => id !== agent);
        if (!state.quarantine_pool.includes(agent)) state.quarantine_pool.push(agent);
        saveState(state);
        console.log(`⛔ Agente ${agent.toUpperCase()} isolado em QUARANTINE_POOL por 60 minutos (manual).`);
        broadcastLivePreview(`Quarentena: ${agent.toUpperCase()}`, 'Isolado em QUARANTINE_POOL (60 min). Despacho bloqueado.', agent);
      }
      break;
    }

    case 'can-dispatch': {
      const agent = (targetAgent || '').toLowerCase();
      if (!state.nodes[agent]) {
        console.log(`❌ Agente ${agent} não existe.`);
        process.exit(1);
      }
      if (state.quarantine_pool.includes(agent)) {
        const remainingMs = (state.nodes[agent].quarantine_until || 0) - Date.now();
        const remainingMin = Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
        console.log(`⛔ BLOQUEIO ATIVO: Agente ${agent.toUpperCase()} está em QUARANTINE_POOL (${remainingMin} min restantes). Proibido despachar!`);
        process.exit(1);
      }
      console.log(`✔ Agente ${agent.toUpperCase()} está no ACTIVE_POOL. Despacho permitido.`);
      break;
    }

    case 'dispatch': {
      const agent = (targetAgent || '').toLowerCase();
      if (!state.nodes[agent]) {
        console.error(`❌ Agente ${agent} inválido.`);
        process.exit(1);
      }
      if (state.quarantine_pool.includes(agent)) {
        console.warn(`⚠️ Agente ${agent} em quarentena. Escolha outro agente ativo ou o Supervisor assume.`);
        process.exit(2);
      }
      const ok = sendToTerminal(agent, targetText);
      if (ok) {
        state.nodes[agent].current_task = targetText.slice(0, 80);
        state.nodes[agent].last_seen = Date.now();
        saveState(state);
      }
      break;
    }

    case 'audit':
    case 'poll-recovery': {
      console.log(`🔍 Executando auditoria ATIVA (lê o terminal real de cada agente e detecta cota exaurida por regex)...`);
      state = auditAndSyncClusterState(state);
      printStatus(state);
      break;
    }

    case 'status':
    default: {
      printStatus(state);
      break;
    }
  }
}

module.exports = {
  loadState, saveState, sendToTerminal, getActiveTerminalDetails, auditAndSyncClusterState,
  broadcastLivePreview, PRIORITY_QUEUE, STATE_FILE
};
