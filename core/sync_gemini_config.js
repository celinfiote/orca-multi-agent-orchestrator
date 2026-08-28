#!/usr/bin/env node
/**
 * Sincroniza .agents/rules/ e .agents/skills/ (fonte de verdade compartilhada entre os 6
 * agentes, versionada no git, corrigida na auditoria de coordenação multi-agente de
 * 2026-08-28) para ~/.gemini/rules/ e ~/.gemini/skills/ — onde o Gemini CLI DE FATO lê
 * suas regras e skills.
 *
 * ACHADO REAL (2026-08-28): ~/.gemini/rules/ e ~/.gemini/skills/ existem, são arquivos
 * ESTÁTICOS (não symlinks) e não têm NENHUM mecanismo de sincronização automática com o
 * projeto. Confirmado rodando diff: ~/.gemini/rules/orchestry_protocol.md ainda dizia
 * "4 AGENTES" — uma versão mais antiga até que o bug de "5 agentes" já corrigido em
 * .agents/rules/ nesta mesma auditoria. As 6 skills de qualidade criativa/testes
 * (comparar-com-referencia, godot-game-feel, validar-godot-headless,
 * testar-multiplayer-real, gerar-arte-pixellab, prompts-arte-helios) nunca chegaram lá.
 *
 * Sem rodar este script depois de editar .agents/rules|skills, a correção fica invisível
 * pros 4 agentes Gemini (Gemini 1-4) até alguém copiar manualmente os arquivos — foi
 * exatamente isso que aconteceu.
 *
 * Uso:
 *   node core/sync_gemini_config.js [caminho_do_worktree]
 *   (padrão: C:\Users\Usuario\Documents\helios-claude — qualquer worktree serve, .agents/
 *   é idêntico em todos depois de um merge em main)
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_ROOT = process.argv[2] || 'C:\\Users\\Usuario\\Documents\\helios-claude';
const AGENTS_RULES_DIR = path.join(PROJECT_ROOT, '.agents', 'rules');
const AGENTS_SKILLS_DIR = path.join(PROJECT_ROOT, '.agents', 'skills');
const GEMINI_RULES_DIR = path.join(os.homedir(), '.gemini', 'rules');
const GEMINI_SKILLS_DIR = path.join(os.homedir(), '.gemini', 'skills');

function syncRules() {
  if (!fs.existsSync(AGENTS_RULES_DIR)) {
    console.log(`[AVISO] ${AGENTS_RULES_DIR} não existe — pulando rules.`);
    return 0;
  }
  fs.mkdirSync(GEMINI_RULES_DIR, { recursive: true });
  let count = 0;
  for (const file of fs.readdirSync(AGENTS_RULES_DIR)) {
    if (!file.endsWith('.md')) continue;
    const destPath = path.join(GEMINI_RULES_DIR, file);
    const changed = !fs.existsSync(destPath) || fs.readFileSync(destPath, 'utf8') !== fs.readFileSync(path.join(AGENTS_RULES_DIR, file), 'utf8');
    fs.copyFileSync(path.join(AGENTS_RULES_DIR, file), destPath);
    console.log(`  ${changed ? '✔ atualizado' : '· já atual  '} rules/${file}`);
    count++;
  }
  return count;
}

function syncSkills() {
  if (!fs.existsSync(AGENTS_SKILLS_DIR)) {
    console.log(`[AVISO] ${AGENTS_SKILLS_DIR} não existe — pulando skills.`);
    return 0;
  }
  let count = 0;
  for (const skillName of fs.readdirSync(AGENTS_SKILLS_DIR)) {
    const srcDir = path.join(AGENTS_SKILLS_DIR, skillName);
    if (!fs.statSync(srcDir).isDirectory()) continue; // pula README.md solto na raiz
    const srcFile = path.join(srcDir, 'SKILL.md');
    if (!fs.existsSync(srcFile)) continue;
    const destDir = path.join(GEMINI_SKILLS_DIR, skillName);
    const destFile = path.join(destDir, 'SKILL.md');
    fs.mkdirSync(destDir, { recursive: true });
    const changed = !fs.existsSync(destFile) || fs.readFileSync(destFile, 'utf8') !== fs.readFileSync(srcFile, 'utf8');
    fs.copyFileSync(srcFile, destFile);
    console.log(`  ${changed ? '✔ atualizado' : '· já atual  '} skills/${skillName}/SKILL.md`);
    count++;
  }
  return count;
}

console.log('================================================================================');
console.log('🔄 SINCRONIZANDO .agents/ (projeto, versionado no git) -> ~/.gemini/ (config real do Gemini CLI)');
console.log(`   Origem: ${PROJECT_ROOT}`);
console.log('================================================================================');
const rulesCount = syncRules();
const skillsCount = syncSkills();
console.log('================================================================================');
console.log(`✅ ${rulesCount} regras e ${skillsCount} skills verificadas/sincronizadas.`);
console.log('   Rode isto de novo sempre que .agents/rules ou .agents/skills mudar.');
console.log('================================================================================');
