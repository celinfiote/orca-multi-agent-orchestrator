# 🌐 Orca Multi-Agent Orchestrator (HELIOS & Beyond)

Framework mestre de orquestração distribuída para múltiplos agentes autônomos de IA (**Gemini 1**, **Gemini 2**, **Gemini 3**, **Gemini 4**, **GLM 5.2**, **Claude Code**) integrados ao ecossistema Orca.

---

## 🏛️ 1. Arquitetura do Cluster & CLI Wrappers

| Agente | CLI / Motor | Worktree / Escopo | Função Primária |
|---|---|---|---|
| 🟢 **Gemini 2** | `gemini2` / Antigravity CLI | `helios-gemini2` | Orquestração Geral, Gameplay, UI/HUD, Redes RPC, Soundscape |
| 🔵 **Gemini 1** | `gemini1` / Antigravity CLI | `helios-gemini1` | Shaders 2D GPU, VFX de Partículas, Iluminação 2D, Sprites |
| 🟡 **Gemini 3** | `gemini3` / Antigravity CLI | `helios-gemini3` | Worldgen Procedural, Biomas Planetários, Cavernas, Sobrevivência |
| 🟣 **Gemini 4** | `gemini4` / Antigravity CLI | `helios-gemini4` | IA de NPCs/Inimigos, FSM, Behavior Trees, Combate Tático |
| 🔶 **GLM 5.2** | `glm` / NVIDIA NIM 550B | `helios-glm` | Engine Developer, GDScript Core, Funções Puras Matemáticas |
| 🔴 **Claude** | `claude` / Claude Code | `helios-claude` | Arquitetura Core & Protocolos Globais *(Pausado)* |

---

## ⚡ 2. Comandos Globais de Linha de Comando

- **`gemini1`** — Inicia o terminal isolado do Gemini 1.
- **`gemini2`** — Inicia o terminal isolado do Gemini 2.
- **`gemini3`** — Inicia o terminal isolado do Gemini 3.
- **`gemini4`** — Inicia o terminal isolado do Gemini 4.
- **`glm`** — Inicia o agente matemático GLM 5.2 no NVIDIA NIM 550B.
- **`orchestra` / `/orchestra`** — Assume a supervisão ativa e comanda workers em paralelo (*Dispatch-First Parallelism*).
- **`economizarON` / `/economizarON`** — Ativa protocolo de extrema economia de tokens em todos os agentes.
- **`economizarOFF` / `/economizarOFF`** — Retorna à comunicação técnica descritiva padrão.

---

## 🛡️ 3. Protocolos de Governança Integrados

1. **Orca Failover & Quarentena de Tokens (`protocols/orca_orchestration_failover_protocol.md`)**:
   - Transição automática de liderança se o Supervisor esgotar cota (`Gemini 2` ➔ `Gemini 1` ➔ `Gemini 3` ➔ `Gemini 4` ➔ `GLM 5.2`).
   - Quarentena obrigatória de 60 minutos para nós com `TOKEN_EXHAUSTED`.
   - Sonda leve de reativação horária (`ping`).
2. **Comunicação Estruturada JSON/YAML (`protocols/structured_communication_and_context_pruning.md`)**:
   - Eliminação de conversas redundantes entre agentes, transmitindo apenas payloads e estados consolidados.
3. **Orca Live Preview (`live-preview/`)**:
   - Interface visual em tempo real (`http://localhost:54321`) com abas para cada agente, status de cotas e renderizador de pixel art.
