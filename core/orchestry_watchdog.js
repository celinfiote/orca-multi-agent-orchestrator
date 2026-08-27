/**
 * Watchdog de Orquestração Multi-Agente do HELIOS (Gemini 2 Supervisor).
 * Monitora o status dos 4 agentes (Gemini 1, Gemini 2, Gemini 3, GLM 5.2) a cada 2 minutos,
 * detectando atrasos, travamentos por cota de tokens ou processos congelados.
 */

const http = require('http');

const SERVER_HOST = '127.0.0.1';
const SERVER_PORT = 54321;
const STALL_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutos

function checkAgentsStatus() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/events',
      method: 'GET',
      headers: { 'Accept': 'text/event-stream' }
    }, (res) => {
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        // Capture initial snapshot
        if (buffer.includes('event: init')) {
          const match = buffer.match(/data: (\{.*\})/);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              req.destroy();
              resolve(data);
            } catch (e) {
              req.destroy();
              reject(e);
            }
          }
        }
      });
      res.on('error', (err) => reject(err));
    });

    req.on('error', (err) => {
      // Server not running, fallback to offline diagnostic
      resolve(null);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

async function runWatchdogReport() {
  console.log('================================================================================');
  console.log('🔍 RELATÓRIO DO WATCHDOG DE ORQUESTRAÇÃO MULTI-AGENTE (HELIOS)');
  console.log('================================================================================');
  
  const now = Date.now();
  const data = await checkAgentsStatus();

  if (!data || !data.agentStatus) {
    console.log('⚠️ [AVISO] Servidor Live Preview não está respondendo na porta 54321.');
    console.log('ℹ️ Para iniciar o servidor: node C:\\Users\\Usuario\\Documents\\orca-live-preview\\server.js');
    console.log('================================================================================');
    return;
  }

  const agents = ['gemini1', 'gemini2', 'gemini3', 'gemini4', 'glm'];
  let allHealthy = true;

  for (const key of agents) {
    const agent = data.agentStatus[key] || { name: key, status: 'Não inicializado', lastUpdate: 0 };
    const elapsedMs = now - (agent.lastUpdate || 0);
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const elapsedMin = (elapsedSec / 60).toFixed(1);

    const isStalled = elapsedMs > STALL_THRESHOLD_MS;
    const hasError = /\b(erro|error|quota|exhausted|429|rate_limit|rate\s*limit)\b/i.test(agent.status + ' ' + (agent.details || ''));

    let statusEmoji = '🟢';
    let healthText = 'Ativo e Saudável';

    if (hasError) {
      statusEmoji = '🔴';
      healthText = 'ALERTA DE ERRO/COTA DETECTADO';
      allHealthy = false;
    } else if (isStalled) {
      statusEmoji = '🟡';
      healthText = `Inativo há ${elapsedMin} min (> 2 min)`;
      allHealthy = false;
    }

    console.log(`${statusEmoji} [${agent.name || key}]: ${healthText}`);
    console.log(`   ├─ Status: ${agent.status || 'N/A'}`);
    console.log(`   ├─ Detalhes: ${agent.details || 'N/A'}`);
    console.log(`   └─ Última atualização: há ${elapsedSec} segundos`);
  }

  console.log('================================================================================');
  if (allHealthy) {
    console.log('🎉 TODOS OS AGENTES ESTÃO OPERANDO NORMALMENTE EM PARALELO!');
  } else {
    console.log('⚠️ ATENÇÃO: Verifique os agentes sinalizados acima.');
  }
  console.log('================================================================================');

  // Exibe Tabela Formatada para o Terminal do Gemini 2
  console.log('\n📊 TABELA DE STATUS MULTI-AGENTE HELIOS:\n');
  console.log('| Agente | Especialidade | Status Atual | Detalhes da Execução | Última Atualização |');
  console.log('|---|---|---|---|---|');
  for (const key of agents) {
    const agent = data.agentStatus[key] || { name: key, status: 'Não inicializado', lastUpdate: 0, details: '' };
    const elapsedSec = Math.floor((now - (agent.lastUpdate || 0)) / 1000);
    const specialty = key === 'gemini1' ? 'Shaders & VFX' : key === 'gemini2' ? 'Supervisor, UI & Net' : key === 'gemini3' ? 'Worldgen & Biomas' : key === 'gemini4' ? 'IA NPCs & Combate' : 'Funções Puras & Math';
    console.log(`| **${agent.name || key}** | ${specialty} | \`${agent.status || 'N/A'}\` | ${agent.details || '—'} | há ${elapsedSec}s |`);
  }
  console.log('\n');
}

runWatchdogReport();
