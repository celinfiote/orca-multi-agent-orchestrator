const fs = require('fs');
const path = require('path');

const targetState = (process.argv[2] || 'on').toLowerCase();
const isEnabled = targetState === 'on' || targetState === 'true' || targetState === '1';

const WORKTREES = [
  'C:\\Users\\Usuario\\Documents\\helios',
  'C:\\Users\\Usuario\\Documents\\helios-gemini1',
  'C:\\Users\\Usuario\\Documents\\helios-gemini2',
  'C:\\Users\\Usuario\\Documents\\helios-gemini3',
  'C:\\Users\\Usuario\\Documents\\helios-gemini4',
  'C:\\Users\\Usuario\\Documents\\helios-glm',
  'C:\\Users\\Usuario\\Documents\\helios-claude'
];

const contentON = `---
description: "Protocolo de Extrema Economia de Tokens e Cota para todos os Agentes do HELIOS"
trigger: "always_on"
---

# ⚡ Regra Permanente: Protocolo de Extrema Economia de Tokens e Cota

> ⚠️ **STATUS: ATIVADO (ON)**
> *(Para desativar ou reativar, use os comandos \`/economizarOFF\` ou \`/economizarON\`)*

Atue sob protocolo de extrema economia de tokens e cota. Siga rigorosamente as regras abaixo em todas as respostas:

1. **CONCISÃO MÁXIMA**: Vá direto ao ponto. Elimine introduções, saudações, conclusões óbvias, frases de transição e cortesias (ex.: "Aqui está o que você pediu", "Espero ter ajudado").
2. **FORMATO ENXUTO**: Priorize listas em tópicos curtos ou tabelas compactas em vez de parágrafos longos.
3. **CÓDIGO E TÉCNICA**: Ao fornecer código ou texto, entregue apenas o bloco modificado/essencial, sem reescrever arquivos inteiros ou explicações redundantes antes e depois.
4. **PROFUNDIDADE SOB DEMANDA**: Responda apenas ao escopo exato da pergunta.
5. **LIMITE DE SAÍDA**: Mantenha a resposta com o menor número viável de tokens sem comprometer a precisão técnica.
`;

const contentOFF = `---
description: "Protocolo de Extrema Economia de Tokens e Cota para todos os Agentes do HELIOS"
trigger: "manual"
---

# ⚡ Regra Permanente: Protocolo de Extrema Economia de Tokens e Cota

> ⚠️ **STATUS: DESATIVADO (OFF)**
> *(Para ativar, use o comando \`/economizarON\`)*

Atue sob protocolo padrão do projeto HELIOS com descrições técnicas acompanhadas de parênteses \`( )\`.
`;

console.log(`================================================================================`);
console.log(`🔄 ALTERANDO PROTOCOLO DE ECONOMIA DE TOKENS: [${isEnabled ? 'ATIVADO (ON)' : 'DESATIVADO (OFF)'}]`);
console.log(`================================================================================`);

let updatedCount = 0;
for (const wt of WORKTREES) {
  if (!fs.existsSync(wt)) continue;

  const rulesDir = path.join(wt, '.agents', 'rules');
  if (!fs.existsSync(rulesDir)) {
    fs.mkdirSync(rulesDir, { recursive: true });
  }

  const ruleFile = path.join(rulesDir, 'token_economy.md');
  fs.writeFileSync(ruleFile, isEnabled ? contentON : contentOFF, 'utf8');
  console.log(`✔ Atualizado: ${ruleFile}`);
  updatedCount++;
}

console.log(`\n🎉 Protocolo de Economia atualizado com sucesso em ${updatedCount} worktrees!`);
