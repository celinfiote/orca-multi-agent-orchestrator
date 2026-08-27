---
description: "Regra Permanente de Comunicação Estruturada (JSON/YAML) e Poda de Contexto (Context Pruning) para todos os Agentes"
trigger: "always_on"
---

# 📦 Regra Permanente: Comunicação Estruturada (JSON/YAML) & Poda de Contexto (Context Pruning)

Todos os agentes (Gemini 1, Gemini 2, Gemini 3, Gemini 4, GLM 5.2, Claude Code) atuam sob as seguintes diretrizes mandatórias:

---

## 1. 📋 Comunicação Estruturada Inter-Agentes (JSON / YAML)

- **Eliminação de Pontes Conversacionais**: Comunicações entre agentes, despachos de tarefas do Supervisor e relatórios de workers DEVEM priorizar payloads estruturados em **JSON** ou **YAML**.
- **Sem Floreios**: Eliminar saudações, cortesias e textos intermediários desnecessários na troca entre agentes.
- **Padrão de Payload de Despacho (Supervisor ➔ Worker)**:
  ```json
  {
    "action": "DISPATCH_TASK",
    "issue_id": "P-XXX",
    "assignee": "gemini3",
    "scope": "worldgen",
    "target_files": ["scripts/world/...", "tools/test_..."],
    "acceptance_criteria": ["GDScript 4.7 tipado", "100% headless pass"]
  }
  ```
- **Padrão de Payload de Retorno (Worker ➔ Supervisor)**:
  ```json
  {
    "action": "TASK_COMPLETED",
    "issue_id": "P-XXX",
    "agent": "gemini3",
    "status": "DONE",
    "files_created": ["scripts/world/..."],
    "tests_passed": "7/7 (100%)",
    "artifacts": ["launch_test.bat"]
  }
  ```

---

## 2. ✂️ Poda de Contexto (Context Pruning)

- **Consolidação de Estado**: Em vez de acumular todo o histórico bruto de comandos de terminal, tentativas intermediárias e logs extensos de erro, transmita **apenas o estado consolidado** da tarefa para o próximo turno.
- **Preservação da Compreensão do Projeto**: A poda de contexto NUNCA deve diminuir o entendimento arquitetural. O estado consolidado DEVE conter:
  1. Identificador da tarefa e status final (`DONE` / `IN_PROGRESS` / `BLOCKED`).
  2. Arquivos criados ou modificados com caminhos exatos.
  3. Contratos de API, funções públicas e tipos adicionados.
  4. Resultados consolidados dos testes headless (ex.: `7/7 aprovados`).
  5. Links clicáveis e lançadores `.bat`.
- **Prevenção de Inchaço de Tokens**: Garante que o contexto permaneça sempre limpo, rápido e focado nas decisões ativas do projeto.
