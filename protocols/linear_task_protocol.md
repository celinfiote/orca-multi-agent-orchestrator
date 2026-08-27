---
description: "Protocolo Mandatório de Criação e Gestão de Tarefas e Assets no Linear para todos os 4 Agentes"
trigger: "always_on"
---

# Regra Permanente: Registro Obrigatório de Tarefas e Assets no Linear

> ⚠️ **REGRA MANDATÓRIA PARA TODOS OS 5 AGENTES ATIVOS (Gemini 1, Gemini 2, Gemini 3, Gemini 4, GLM 5.2)**:
> **Toda alteração relevante que possa ser considerada task, refatoração estrutural, novo sistema ou criação/modificação de assets (sprites, texturas, animações, tilesets, SFX, HUDs, IA de NPCs) DEVE ser formalmente criada, gerenciada e movida no Linear**, operando em harmonia com as 4 Fontes da Verdade do HELIOS.

---

## 🏛️ As 4 Fontes da Verdade do HELIOS

1. **Linear = Fonte de Verdade do Projeto** → O que existe, o que falta, prioridades, decisões aprovadas, bugs e roadmap.
2. **Git = Fonte de Verdade do Código & Assets** → O estado real e versionado dos arquivos nas branches e worktrees.
3. **Godot = Fonte de Verdade do Estado Executável** → O que realmente compila e passa nos testes headless com 100% de aprovação.
4. **Documentação Técnica / GDD = Fonte de Verdade das Regras** → Padrões arquiteturais, locks, convenções e bíblia de design.

---

## 1. Princípios Fundamentais de Rastreabilidade no Linear

1. **Linear como Fonte de Verdade do Projeto**:
   Nenhum agente começa a trabalhar sem uma issue atribuída à sua respectiva tag (`[Gemini 1]`, `[Gemini 2]`, `[Gemini 3]`, `[Gemini 4]`, `[GLM]`).
2. **Lock Pré-Edição Mandatório**:
   Antes de abrir, criar ou editar qualquer arquivo do projeto, a issue correspondente DEVE ser movida para **In Progress** no Linear. Isso serve de lock explícito para evitar sobreposição entre os 5 agentes concorrentes.
3. **Criação de Tasks Emergentes / Novos Assets**:
   Se durante o desenvolvimento surgir a necessidade de criar novos assets, refatorar um subsistema ou implementar uma demanda nova do usuário não mapeada:
   - O agente DEVE criar a issue no Linear com o identificador sequencial `[P-XX] [Tag] Descrição`.
   - Adicionar a tag da IA responsável (`[Gemini 1]`, `[Gemini 2]`, `[Gemini 3]`, `[Gemini 4]`, `[GLM]`).
   - Mover imediatamente para `In Progress` antes de iniciar a escrita do código ou geração do asset.

---

## 2. Estrutura Padrão de Issues no Linear

Ao criar ou editar uma issue no Linear, utilize o seguinte formato:

```markdown
### 🎯 Objetivo
[Descrição concisa e clara da funcionalidade, sistema, soundscape ou asset a ser implementado]

### 📂 Arquivos Afetados / Lock de Escopo
- `caminho/do/arquivo1.gd`
- `scenes/categoria/cena.tscn`
- `assets/sprites/...` (se houver arte)

### 🧪 Critérios de Aceite e Validação
- [ ] Implementação 100% desacoplada e tipada no GDScript 4.7.
- [ ] Validação executável via suíte `tools/test_nome_suite.gd` no Godot Headless aprovada com 100% de sucesso.
- [ ] Visualização/inspeção de assets no Orca Live Preview (`show.js`).
```

---

## 3. Padrão de Commits e Fechamento

1. **Citação Obrigatória no Commit**:
   Todo commit deve referenciar o identificador da issue no Linear:
   - Código: `feat(escopo): [P-XX] descricao da entrega (MAR-YY)`
   - Assets: `asset(sprites): [P-XX] criacao de assets pixel art (MAR-YY)`
   - Correção: `fix(escopo): [P-XX] correcao de bug visual/logica (MAR-YY)`
2. **Ciclo de Conclusão**:
   - Executar suíte de testes headless (`100% de aprovação`).
   - Push na branch do worktree (`task-gemini1`, `task-gemini2`, `task-gemini3`, `task-gemini4` ou `task-glm`) e merge em `main`.
   - Mover a issue para **Done** no Linear.
   - Atualizar a seção 3 do [`HANDOFF.md`](HANDOFF.md) com o resumo executivo da entrega.
