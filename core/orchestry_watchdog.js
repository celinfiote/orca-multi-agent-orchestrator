/**
 * Watchdog de Orquestração Multi-Agente do HELIOS (Supervisor Ativo da sessão).
 * Monitora o status de TODOS os agentes ativos (ver .agents/registry.json) a cada 2
 * minutos, detectando atrasos, travamentos por cota de tokens ou processos congelados.
 * Também reporta a disponibilidade real (não estimada) da Rede Híbrida —
 * Groq/DeepSeek/ImageMagick/PixelLab — que os agentes devem acionar diretamente em vez de
 * gastar cota de terminal.
 *
 * CORREÇÃO (2026-08-28, 2 rodadas): primeiro 'claude' estava ausente da lista de agentes
 * monitorados (hardcoded, esquecido quando o time cresceu). Agora deriva de
 * .agents/registry.json — um agente novo aparece aqui sozinho, sem editar este arquivo.
 */

const http = require('http');
const { execSync } = require('child_process');
const { loadRegistry } = require('./agent_registry');

const SERVER_HOST = '127.0.0.1';
const SERVER_PORT = 54321;
const STALL_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutos

// Checagem real (não simulada) de disponibilidade dos recursos da Rede Híbrida — cada um só
// entra como "Online" se a evidência concreta (variável de ambiente ou binário no PATH)
// realmente existir, nunca por suposição.
function checkMeshResources() {
  const results = [];

  const hasEnv = (name) => !!(process.env[name] && process.env[name].trim().length > 0);
  results.push({ name: 'Groq Cloud API', ok: hasEnv('GROQ_API_KEY'), info: hasEnv('GROQ_API_KEY') ? 'GROQ_API_KEY definida' : 'GROQ_API_KEY ausente no ambiente' });
  results.push({ name: 'DeepSeek V3/R1 API', ok: hasEnv('DEEPSEEK_API_KEY'), info: hasEnv('DEEPSEEK_API_KEY') ? 'DEEPSEEK_API_KEY definida' : 'DEEPSEEK_API_KEY ausente no ambiente' });
  results.push({ name: 'PixelLab API', ok: hasEnv('PIXELLAB_API_KEY'), info: hasEnv('PIXELLAB_API_KEY') ? 'PIXELLAB_API_KEY definida' : 'PIXELLAB_API_KEY ausente no ambiente' });

  for (const [label, cmd] of [['ImageMagick 7 (magick)', 'magick'], ['Python (Sobel normal maps)', 'python']]) {
    try {
      execSync(`where ${cmd}`, { stdio: ['ignore', 'ignore', 'ignore'] });
      results.push({ name: label, ok: true, info: `'${cmd}' encontrado no PATH` });
    } catch (e) {
      results.push({ name: label, ok: false, info: `'${cmd}' NÃO encontrado no PATH` });
    }
  }

  return results;
}

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

  const registryAgents = loadRegistry().agents;
  const agents = registryAgents.map(a => a.id);
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

  // Exibe Tabela Formatada para o Terminal do Supervisor Ativo
  console.log('\n📊 TABELA DE STATUS MULTI-AGENTE HELIOS:\n');
  console.log('| Agente | Especialidade | Status Atual | Detalhes da Execução | Última Atualização |');
  console.log('|---|---|---|---|---|');
  const SPECIALTY = {};
  for (const a of registryAgents) SPECIALTY[a.id] = a.specialty || a.specialtyShort;
  for (const key of agents) {
    const agent = data.agentStatus[key] || { name: key, status: 'Não inicializado', lastUpdate: 0, details: '' };
    const elapsedSec = Math.floor((now - (agent.lastUpdate || 0)) / 1000);
    console.log(`| **${agent.name || key}** | ${SPECIALTY[key] || key} | \`${agent.status || 'N/A'}\` | ${agent.details || '—'} | há ${elapsedSec}s |`);
  }

  // Rede Híbrida: disponibilidade real dos recursos que os 6 agentes devem acionar
  // diretamente (Groq/DeepSeek/ImageMagick/PixelLab) em vez de gastar cota de terminal.
  console.log('\n📊 REDE HÍBRIDA (Smart AI Mesh) — Disponibilidade Real:\n');
  console.log('| Recurso | Status | Evidência |');
  console.log('|---|---|---|');
  for (const r of checkMeshResources()) {
    console.log(`| **${r.name}** | ${r.ok ? '🟢 Online' : '🔴 Indisponível'} | ${r.info} |`);
  }
  console.log('\n');
}

runWatchdogReport();
