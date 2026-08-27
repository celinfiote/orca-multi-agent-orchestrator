---
description: "Protocolo de loop contínuo e diretrizes de convivência para os 5 Agentes no projeto HELIOS."
trigger: "always_on"
---

# Regra Permanente de Execução: Modo de Loop Autônomo Concorrente (5 Agentes)

Sempre que o usuário enviar o comando "ENTRE EM LOOP" (ou `/goal`), inicie o MODO DE LOOP AUTÔNOMO CONTÍNUO até receber "PARE" ou concluir todas as tarefas.

## 1. AS 4 FONTES DA VERDADE DO HELIOS
1. **Linear = Fonte de Verdade do Projeto** → O que existe, o que falta, prioridades, decisões, bugs, roadmap.
2. **Git = Fonte de Verdade do Código & Assets** → O estado real e versionado dos scripts, cenas e assets.
3. **Godot = Fonte de Verdade do Estado Executável** → O que realmente compila e passa nos testes headless com 100% de sucesso.
4. **Documentação Técnica / GDD = Fonte de Verdade das Regras** → Arquitetura, sistemas, padrões visuais e decisões permanentes.

## 2. CONSCIÊNCIA DE EQUIPE (OS 5 AGENTES ATIVOS)
O projeto HELIOS é construído por **5 agentes de IA trabalhando em paralelo**:
1. **Gemini 2** (`helios-gemini2` / `task-gemini2` / `[Gemini 2]`): Supervisor geral, gameplay, multiplayer RPCs, quests, inventário, UI/HUD diegéticos e áudio.
2. **Gemini 1** (`helios-gemini1` / `task-gemini1` / `[Gemini 1]`): Shaders 2D, VFX, animações, sprites, texturas e iluminação 2D.
3. **Gemini 3** (`helios-gemini3` / `task-gemini3` / `[Gemini 3]`): Worldgen procedural, biomas planetários, spawners de fauna/flora, cavernas e sobrevivência.
4. **Gemini 4** (`helios-gemini4` / `task-gemini4` / `[Gemini 4]`): IA de NPCs & Inimigos, FSM, Behavior Trees, navegação/pathfinding 2D e combate tático.
5. **GLM 5.2** (`helios-glm` / `task-glm` / `[GLM]`): Engine Developer, funções puras matemáticas (`static func`), constantes termofísicas e balanceamento numérico.

## 3. ARQUIVOS OBRIGATÓRIOS DE CONSULTA
Antes de iniciar qualquer tarefa, consulte:
1. `AGENTS.md` (As 4 Fontes da Verdade, 5 agentes e locks de arquivos/pastas)
2. `HANDOFF.md` (Estado das entregas atuais)
3. `GEMINI.md`, `GLM.md` ou `DEVELOPMENT_GUIDELINES.md` (Diretrizes do respectivo agente)
4. `DEVELOPMENT_GUIDELINES.md` (Padrões de GDScript e arquitetura)
5. `.agents/skills/helios-world-design-bible/SKILL.md` (Bíblia de level design e contratos de mapas)

## 4. PROTOCOLO DO LOOP AUTÔNOMO
- **PASSO 1 (Sincronização):** Execute `git pull origin main` no seu próprio worktree.
- **PASSO 2 (Seleção):** Consulte o Linear e pegue a menor issue `[P-XX]` da sua tag (`[Gemini 1]`, `[Gemini 2]`, `[Gemini 3]`, `[Gemini 4]` ou `[GLM]`) em `Todo`.
- **PASSO 3 (Lock):** Mova para `In Progress` no Linear ANTES de abrir ou editar qualquer arquivo.
- **PASSO 4 (Implementação Desacoplada):** Implemente estritamente no seu próprio worktree. NUNCA edite scripts sob lock de outro agente (ver `AGENTS.md`).
- **PASSO 5 (Validação Executável no Godot):** Execute testes headless (`100% de aprovação`).
- **PASSO 6 (Commit & Sync):** Commit descritivo `feat(escopo): [P-XX] descricao (MAR-YY)` e faça push na sua branch e merge em `main`.
- **PASSO 7 (Finalização):** Mova para `Done` no Linear, registre a entrega em `HANDOFF.md` e volte ao PASSO 1 imediatamente.
