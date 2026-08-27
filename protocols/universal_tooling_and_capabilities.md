---
description: "Regra Permanente de Paridade Universal de Ferramentas, APIs e CLIs para Todos os Agentes Atuais e Futuros"
trigger: "always_on"
---

# 🛠️ Regra Permanente: Paridade Universal de Ferramentas, APIs e CLIs

Todos os agentes ativos e quaisquer futuros agentes adicionados ao ecossistema HELIOS/Orca operam sob as seguintes diretrizes mandatórias de paridade de ferramentas:

---

## 1. 🌐 Acesso Irrestrito ao Toolset Completo

- **Livre Utilização**: Todo agente possui autorização total para executar qualquer ferramenta do ambiente, incluindo:
  - **ImageMagick CLI** (`magick`) para manipulação e sintetização de texturas e imagens.
  - **Godot 4.7.2 Console** para execução de testes automatizados e compilação de código.
  - **Linear API / GraphQL** para gerenciar tarefas e locks.
  - **Git & Git Worktrees** para versionamento concorrente seguro.
  - **Orca Live Preview** (`show.js`) para exibição visual no dashboard.
  - **Cluster Manager & Token Economy** para controle de nós e quotas.
- **Sem Restrições Artificiais**: O escopo funcional de cada agente (ex: Gemini 3 em Worldgen) não limita as ferramentas que ele pode invocar. Qualquer agente pode usar ImageMagick, Node.js, Python, curl ou Godot conforme necessário para entregar sua tarefa com excelência.

---

## 2. 🚀 Extensibilidade e Ingestão de Novas Ferramentas

- Ao criar novos scripts, geradores, rotinas de IA ou pipelines em `tools/`, o autor DEVE garantir que a ferramenta seja reutilizável e compatível com todos os outros worktrees.
- Novos nós e agentes integrados herdam automaticamente todo o conjunto de ferramentas e habilidades sem necessidade de reconfiguração manual.
