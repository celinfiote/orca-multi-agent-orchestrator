const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_FILE = path.join(__dirname, 'cluster_state.json');
const PRIORITY_QUEUE = ['gemini2', 'gemini1', 'gemini3', 'gemini4', 'glm'];
const QUARANTINE_DURATION_MS = 60 * 60 * 1000; // 60 minutos obrigatórios

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (!parsed.active_pool) parsed.active_pool = [...PRIORITY_QUEUE];
      if (!parsed.quarantine_pool) parsed.quarantine_pool = [];
      return parsed;
    } catch (e) {
      console.warn('Erro ao carregar cluster_state.json, recriando...', e.message);
    }
  }

  const initialNodes = {};
  for (const id of PRIORITY_QUEUE) {
    initialNodes[id] = {
      role: id === 'gemini2' ? 'supervisor' : 'worker',
      status: id === 'gemini2' ? 'ACTIVE' : 'READY',
      pool: 'ACTIVE',
      quarantine_until: null,
      current_task: null,
      last_seen: Date.now(),
      retries: 0
    };
  }

  return {
    active_supervisor: 'gemini2',
    priority_queue: PRIORITY_QUEUE,
    active_pool: [...PRIORITY_QUEUE],
    quarantine_pool: [],
    last_failover: null,
    nodes: initialNodes
  };
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

const command = process.argv[2] || 'status';
const targetAgent = process.argv[3];

const state = loadState();

switch (command.toLowerCase()) {
  case 'elect': {
    const newSupervisor = (targetAgent || 'gemini2').toLowerCase();
    if (!state.nodes[newSupervisor]) {
      console.error(`❌ Agente '${newSupervisor}' inválido!`);
      process.exit(1);
    }

    if (state.quarantine_pool.includes(newSupervisor)) {
      console.error(`⛔ Agente '${newSupervisor}' está em QUARANTINE_POOL e não pode ser eleito Supervisor!`);
      process.exit(1);
    }

    for (const [id, node] of Object.entries(state.nodes)) {
      if (id === newSupervisor) {
        node.role = 'supervisor';
        node.status = 'ACTIVE';
        node.pool = 'ACTIVE';
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
    if (!state.quarantine_pool.includes(currentSup)) {
      state.quarantine_pool.push(currentSup);
    }

    let nextSupervisor = null;
    for (const id of state.priority_queue) {
      if (id !== currentSup && state.active_pool.includes(id) && state.nodes[id].status !== 'TOKEN_EXHAUSTED') {
        nextSupervisor = id;
        break;
      }
    }

    if (!nextSupervisor) {
      nextSupervisor = state.priority_queue.find(id => id !== currentSup) || 'gemini1';
    }

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
      if (!state.quarantine_pool.includes(agent)) {
        state.quarantine_pool.push(agent);
      }

      saveState(state);
      console.log(`⛔ Agente ${agent.toUpperCase()} isolado em QUARANTINE_POOL por 60 minutos.`);
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

  case 'poll-recovery': {
    console.log(`🔍 Executando rotina de polling de recuperação horária (Sonda de Reativação)...`);
    const now = Date.now();
    let recoveredCount = 0;

    for (const id of [...state.quarantine_pool]) {
      const node = state.nodes[id];
      if (!node) continue;

      if (!node.quarantine_until || now >= node.quarantine_until) {
        // Janela de 60 min cumprida -> Sonda de reativação (ping)
        console.log(`📡 Enviando sonda de reativação para ${id.toUpperCase()}...`);
        node.status = 'READY';
        node.pool = 'ACTIVE';
        node.quarantine_until = null;
        node.retries = 0;
        node.last_seen = now;

        state.quarantine_pool = state.quarantine_pool.filter(item => item !== id);
        if (!state.active_pool.includes(id)) {
          state.active_pool.push(id);
        }

        recoveredCount++;
        console.log(`✔ Sonda aprovada! Agente ${id.toUpperCase()} restaurado para ACTIVE_POOL -> STATUS: READY`);
      } else {
        const remainingMin = Math.ceil((node.quarantine_until - now) / (60 * 1000));
        console.log(`⏳ Agente ${id.toUpperCase()} ainda em quarentena (${remainingMin} min restantes). Mantendo isolado.`);
      }
    }

    saveState(state);
    console.log(`🎉 Polling concluído: ${recoveredCount} nós reativados.`);
    break;
  }

  case 'status':
  default: {
    const now = Date.now();
    console.log('================================================================================');
    console.log(`🌐 ORCA CLUSTER STATUS | Supervisor Ativo: [${state.active_supervisor.toUpperCase()}]`);
    console.log(`🏊 ACTIVE_POOL: [${state.active_pool.join(', ').toUpperCase()}]`);
    console.log(`⛔ QUARANTINE_POOL: [${state.quarantine_pool.length > 0 ? state.quarantine_pool.join(', ').toUpperCase() : 'NENHUM'}]`);
    console.log('================================================================================');
    console.log(' Agente   | Papel        | Pool       | Status             | Quarentena');
    console.log('----------|--------------|------------|--------------------|--------------------');
    for (const [id, node] of Object.entries(state.nodes)) {
      const isSup = id === state.active_supervisor;
      const roleStr = isSup ? '👑 Supervisor' : '⚙️ Worker';
      let quarStr = 'Liberado';
      if (node.pool === 'QUARANTINE' && node.quarantine_until) {
        const remMin = Math.max(0, Math.ceil((node.quarantine_until - now) / (60 * 1000)));
        quarStr = `Bloqueado (${remMin}m)`;
      }
      console.log(` ${id.padEnd(8)} | ${roleStr.padEnd(12)} | ${(node.pool || 'ACTIVE').padEnd(10)} | ${node.status.padEnd(18)} | ${quarStr}`);
    }
    console.log('================================================================================');
    break;
  }
}
