/**
 * Carrega .agents/registry.json — o registro ÚNICO de todos os agentes ativos do HELIOS
 * (versionado no git, dentro do projeto). Todo script deste repo que precisa saber "quais
 * agentes existem" deve usar este módulo, nunca uma lista hardcoded própria.
 *
 * Por que isto existe (2026-08-28): antes, cluster_manager.js, orchestry_daemon.js e
 * orchestry_watchdog.js tinham CADA UM sua própria lista hardcoded de agentes — 3 cópias
 * divergentes, e foi exatamente assim que o bug de "Claude Code ausente" sobreviveu tanto
 * tempo (cada script tinha esquecido dele de um jeito ligeiramente diferente). Com um
 * registro único, adicionar um agente novo é uma edição num arquivo JSON, não uma caça a
 * quantos scripts têm uma lista escondida em algum lugar.
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_PROJECT_ROOT = 'C:\\Users\\Usuario\\Documents\\helios-claude';

function registryPath(projectRoot) {
  return path.join(projectRoot || DEFAULT_PROJECT_ROOT, '.agents', 'registry.json');
}

/**
 * Retorna { agents: [...] } — lança erro claro (não retorna lista vazia silenciosa) se o
 * arquivo não existir ou estiver com JSON inválido, porque um consumidor tratando "registro
 * ausente" como "zero agentes" apagaria silenciosamente todo mundo dos painéis/dispatch.
 */
function loadRegistry(projectRoot) {
  const filePath = registryPath(projectRoot);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Registro de agentes não encontrado em ${filePath}. Isto não é uma lista vazia válida — corrija o caminho ou restaure o arquivo antes de continuar.`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    throw new Error(`Registro de agentes em ${filePath} tem JSON inválido: ${e.message}`);
  }
  if (!Array.isArray(parsed.agents) || parsed.agents.length === 0) {
    throw new Error(`Registro de agentes em ${filePath} não tem nenhum agente listado — provavelmente corrompido, não uma equipe real de zero pessoas.`);
  }
  return parsed;
}

function getAgentIds(projectRoot) {
  return loadRegistry(projectRoot).agents.map(a => a.id);
}

function getAgentById(id, projectRoot) {
  return loadRegistry(projectRoot).agents.find(a => a.id === id) || null;
}

module.exports = { loadRegistry, getAgentIds, getAgentById, registryPath, DEFAULT_PROJECT_ROOT };
