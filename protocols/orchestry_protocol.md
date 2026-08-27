# Regra Permanente: Orquestração Contínua Multi-Agente e Comando /orchestry

> ⚠️ **DIRETRIZ MANDATÓRIA PARA TODOS OS 5 AGENTES (Gemini 2, Gemini 1, Gemini 3, Gemini 4, GLM 5.2)**:
> O comando `/orchestry` é o gatilho mestre de orquestração ininterrupta do HELIOS.
> Quando ativado:
> 1. Se o comando contiver uma instrução: `/orchestry "INSTRUÇÃO"`, dar **ênfase total e imediata** ao que foi solicitado.
> 2. Se for emitido apenas `/orchestry`, orquestrar e concluir **todas as tarefas pendentes** do Linear na ordem padrão de prioridade de issues (`[P-XX]`).
> 3. O modo opera de forma **contínua e ininterrupta**, sem parar à espera de confirmações supérfluas do usuário até a conclusão total ou comando `PARE`.

---

## 👥 1. Divisão Estrita dos 5 Agentes em Paralelo

| Agente | Pasta / Worktree | Tag Linear | Especialidade Obrigatória |
|---|---|---|---|
| 🟢 **Gemini 2 (Supervisor)** | `helios-gemini2` | `[Gemini 2]` | **Orquestração Geral, Core Gameplay, UI & HUD diegéticos, Áudio/SFX 16-bit, RPCs multiplayer, Inventário e Persistência**. |
| 🔵 **Gemini 1** | `helios-gemini1` | `[Gemini 1]` | **Shaders 2D (GPU), VFX de partículas, iluminação 2D dinâmica, normal maps, sprites pixel art e animações visuais**. |
| 🟡 **Gemini 3** | `helios-gemini3` | `[Gemini 3]` | **Worldgen procedural, biomas planetários, cavernas subterrâneas, dungeons, ecossistemas, spawners e sobrevivência**. |
| 🟣 **Gemini 4** | `helios-gemini4` | `[Gemini 4]` | **IA de NPCs & Inimigos, FSM, Behavior Trees, Pathfinding 2D/Navegação, Diálogos Diegéticos e Combate Tático**. |
| 🔶 **GLM 5.2** | `helios-glm` | `[GLM]` | **Funções puras matemáticas (`static func`), constantes termofísicas, dados planetários puros e balanceamento numérico**. |

---

## ⚡ 2. Princípio Dispatch-First Parallelism

Ao receber qualquer solicitação:
1. **Gemini 2 (Supervisor)** faz a decomposição arquitetural e cria as issues no Linear.
2. Despacha imediatamente as instruções para os terminais de **Gemini 1**, **Gemini 3**, **Gemini 4** e **GLM 5.2** com comando de inicialização limpa:
   ```bash
   git pull origin main
   ```
3. Somente após todos começarem a rodar, Gemini 2 inicia sua implementação.
4. **Trabalho 100% simultâneo** dos 5 agentes ao mesmo tempo.

---

## 🔄 3. Daemon Mode, Watchdog a Cada 60s & Detecção de Travamentos
O Gemini 2 opera em **Modo Daemon Ininterrupto** (`tools/orchestry_daemon.js`):
- **Verificação Contínua (60s)**: Monitora o término de tarefas dos agentes para despachar a próxima issue do Linear sem esperar intervenção humana.
- **Detecção de Quota / Token Expirado**: Se algum agente parar por erro `429`, `RESOURCE_EXHAUSTED` ou `Quota Limit`, Gemini 2 emite diagnóstico no Live Preview e comanda retry sem paralisar o progresso global.
- **Detecção de Travamento em Background**: Nenhum agente pode deixar janelas de jogos ou processos gráficos rodando em background no terminal.
- **Sincronização Periódica**: Todo agente commita, testa no Headless (`100% de sucesso`), faz push na sua branch e merge em `main` a cada issue entregue.

---

## 🔗 4. Links Clicáveis Obrigatórios ao Final de Toda Ação (Incluindo Link Direto do Jogo Completo)

Toda mensagem de conclusão de QUALQUER agente DEVE incluir obrigatoriamente links clicáveis no padrão markdown do GitHub (`file:///...`):
- **Link Direto do Jogo Completo**: [`launch_game.bat`](file:///C:/Users/Usuario/Documents/helios-gemini2/launch_game.bat) para abrir o jogo completo com 2 cliques.
- **Link do Lançador de Teste Específico**: `launch_<cenateste>_test.bat`.
- **Link para a Pasta do Worktree**: `file:///C:/Users/Usuario/Documents/helios-.../`
- **Links para os Arquivos Modificados**: Links para os scripts e recursos alterados.

---

## 📊 5. Exibição Obrigatória do Painel em Tabela no Terminal do Gemini 2 (Supervisor)

Sempre que qualquer agente (`Gemini 1`, `Gemini 3`, `GLM 5.2`) concluir uma tarefa e retornar para o **Gemini 2 (Supervisor)** para receber a próxima instrução da fila, o Gemini 2 **DEVE OBRIGATORIAMENTE IMPRIMIR NO SEU TERMINAL UMA TABELA FORMATADA DO STATUS GERAL**:

| Agente | Especialidade | Tarefa Atual / Entregue | Status | Próxima Tarefa Atribuída | Lançador Executável (.bat) |
|---|---|---|---|---|---|
| 🔵 **Gemini 1** | Shaders & VFX | `MAR-XXX` `[P-XX]` | ✅ Concluída | `MAR-YYY` `[P-YY]` | [`launch_vfx_test.bat`](file:///...) |
| 🟡 **Gemini 3** | Worldgen & Biomas | `MAR-XXX` `[P-XX]` | ✅ Concluída | `MAR-YYY` `[P-YY]` | [`launch_world_test.bat`](file:///...) |
| 🔶 **GLM 5.2** | Funções Puras | `MAR-XXX` `[P-XX]` | ✅ Concluída | `MAR-YYY` `[P-YY]` | [`launch_math_test.bat`](file:///...) |
| 🟢 **Gemini 2** | UI, HUD & Net | `MAR-XXX` `[P-XX]` | 🔄 Em Execução | `MAR-YYY` `[P-YY]` | [`launch_game.bat`](file:///...) |

> **Ação Imediata**: Logo após imprimir a tabela, o Gemini 2 despacha a próxima tarefa para o terminal do respectivo agente e dá seguimento à execução ininterrupta.

---

## 💬 6. Padrão de Comunicação Gemini
- Resposta concisa e organizada em tópicos.
- Termos técnicos sempre acompanhados de explicação simples entre parênteses `( )`.
