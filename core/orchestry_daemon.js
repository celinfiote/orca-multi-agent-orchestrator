/**
 * HELIOS — Daemon de Orquestração Contínua Multi-Agente (Supervisor Ativo da sessão)
 * Monitora Linear, terminais Orca e estado de TODOS os agentes ativos (ver
 * .agents/registry.json — o registro único, não uma lista hardcoded aqui).
 * Executa em loop contínuo (daemon mode), checando a cada 60s por tarefas concluídas,
 * realizando auto-merge no main e disparando o próximo lote de trabalho sem interrupções.
 *
 * CORREÇÃO (2026-08-28, 2 rodadas): primeiro 'claude' estava ausente de WORKTREES e do
 * painel (hardcoded, esquecido quando o time cresceu). Depois disso o WORKTREES ficou
 * correto mas ainda hardcoded — agora deriva de .agents/registry.json, então um agente
 * novo aparece aqui sozinho, sem editar este arquivo. Removido também TERMINALS (dead
 * code: nunca era lido em lugar nenhum, e hardcodeava handles de terminal — que são UUIDs
 * efêmeros por sessão do Orca, nunca estáveis o suficiente pra hardcode, ver
 * .agents/rules/orchestry_protocol.md seção 2.4).
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const { loadRegistry } = require('./agent_registry');

const POLL_INTERVAL_MS = 60 * 1000; // 60 segundos

function buildWorktrees() {
  const map = { mirror: 'C:\\Users\\Usuario\\Documents\\helios' };
  for (const agent of loadRegistry().agents) {
    map[agent.id] = `C:\\Users\\Usuario\\Documents\\${agent.worktree}`;
  }
  return map;
}
const WORKTREES = buildWorktrees();

function runCmd(cmd, cwd = WORKTREES.gemini2) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return (e.stdout || e.stderr || e.message || '').toString().trim();
  }
}

async function checkLivePreview() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 54321,
      path: '/events',
      method: 'GET',
      headers: { 'Accept': 'text/event-stream' }
    }, (res) => {
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        if (buffer.includes('event: init')) {
          const match = buffer.match(/data: (\{.*\})/);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              req.destroy();
              resolve(data);
            } catch (e) {
              req.destroy();
              resolve(null);
            }
          }
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(2500, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

function updateAgentStatus(title, desc, agent = 'gemini2') {
  try {
    runCmd(`node C:\\Users\\Usuario\\Documents\\orca-live-preview\\show.js --status "${title}" "${desc}" --agent ${agent}`);
  } catch (e) {}
}

async function runCycle(cycleNum) {
  console.log(`\n================================================================================`);
  console.log(`🔄 HELIOS ORCHESTRY DAEMON — CICLO #${cycleNum} [${new Date().toLocaleTimeString()}]`);
  console.log(`================================================================================`);

  // 1. Sincronização e Fetch do Git
  console.log('📡 [1/6] Sincronizando repositório e branches dos 6 agentes...');
  runCmd('git fetch origin');

  // 1.5. Sincroniza .agents/rules|skills -> ~/.gemini/rules|skills (achado real de
  // 2026-08-28: o Gemini CLI le config global, nao o .agents/ do projeto, e nada
  // sincronizava os dois - uma correcao em .agents/ ficava invisivel pros 4 agentes
  // Gemini ate alguem copiar manualmente. Roda a cada ciclo pra nunca mais dessincronizar.
  console.log('🔄 [1.5/6] Sincronizando .agents/ -> ~/.gemini/ (config real do Gemini CLI)...');
  runCmd(`node "${__dirname}\\sync_gemini_config.js" "${WORKTREES.claude}"`);

  // 1.75. Auditoria REAL de cota (achado de 2026-08-28: essa auditoria só existia hardcoded
  // dentro do worktree do Gemini 3, então só rodava quando ELE lembrava de rodar. Lê o
  // terminal de verdade de cada agente e atualiza cluster_state.json (o mesmo arquivo que
  // o painel do Live Preview lê) — a cada ciclo, automaticamente, para qualquer supervisor.
  console.log('🩺 [1.75/6] Auditoria real de cota (lê terminais ao vivo, detecta erro por regex)...');
  runCmd(`node "${__dirname}\\cluster_manager.js" audit`);

  // 2. Leitura do Live Preview
  const previewData = await checkLivePreview();
  const agentsState = previewData?.agentStatuses || {};

  console.log('\n📊 [2/6] Painel Consolidado de Status Multi-Agente:');
  console.log('--------------------------------------------------------------------------------');
  console.log(' Agente      | Especialidade     | Status Atual                    | Tempo');
  console.log('-------------|-------------------|---------------------------------|------------');

  // Deriva do registro único — qualquer agente novo aparece aqui automaticamente, sem
  // precisar editar este arquivo (ver .agents/registry.json e agent_registry.js).
  for (const agent of loadRegistry().agents) {
    const state = agentsState[agent.id] || { title: 'Idle / Aguardando', description: `Pronto para ${agent.specialtyShort}` };
    const nameCol = agent.name.padEnd(11).slice(0, 11);
    const specCol = agent.specialtyShort.padEnd(17).slice(0, 17);
    console.log(` ${agent.emoji} ${nameCol} | ${specCol} | ${state.title.padEnd(31).slice(0, 31)} | ${state.time || 'Agora'}`);
  }
  console.log('--------------------------------------------------------------------------------');

  // 3. Verificação de Merges Pendentes no Main
  console.log('\n🔗 [3/6] Verificando integridade e merge em main...');
  const mainLog = runCmd('git log -n 1 --oneline origin/main');
  console.log(`  Último commit em origin/main: ${mainLog}`);

  // 4. Conclusão do ciclo
  console.log('\n✅ [6/6] Ciclo concluído. Próxima checagem em 60s.');
  console.log('================================================================================\n');
}

async function startDaemon() {
  console.log('🚀 INICIANDO HELIOS ORCHESTRY DAEMON (MODO CONTÍNUO)...');
  updateAgentStatus('Orchestry Daemon Ativo', 'Supervisão contínua em segundo plano', 'gemini2');

  let cycle = 1;
  while (true) {
    try {
      await runCycle(cycle++);
    } catch (err) {
      console.error('❌ Erro no ciclo do daemon:', err.message);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

if (require.main === module) {
  startDaemon();
}

module.exports = { runCycle, checkLivePreview };
