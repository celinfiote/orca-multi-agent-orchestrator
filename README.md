# 🐋 Orca Multi-Agent Orchestrator

Framework de engenharia e orquestração simultânea para desenvolvimento de software de alta complexidade com múltiplos agentes de Inteligência Artificial concorrentes (**Gemini 1**, **Gemini 2**, **GLM 5.2** e **Claude**), isolamento atômico de contas Google via Windows Credential Manager, worktrees Git paralelos e visualização em tempo real via Server-Sent Events (SSE).

---

## 🌟 Arquitetura Geral do Sistema

```
                               [ ORCA IDE / TERMINAL HUB ]
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
[ AGENTE GEMINI 1 ]                   [ AGENTE GEMINI 2 ]                    [ AGENTE GLM 5.2 ]
• Conta Google A                      • Conta Google B                       • NVIDIA NIM API (550B)
• Token: conta1_token.txt             • Token: conta2_token.txt              • Token: nvapi-...
• Injeção via advapi32.dll            • Injeção via advapi32.dll             • Autônomo com Tool Calling
• Worktree: helios-gemini1            • Worktree: helios-gemini2             • Worktree: helios-glm
• Escopo: Shaders 2D / VFX / Arte     • Escopo: Supervisor / UI / Net        • Escopo: Funções Puras / Fórmulas
      │                                      │                                      │
      └──────────────────────────────────────┼──────────────────────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [ 4 FONTES DA VERDADE ]                     [ ORCA LIVE PREVIEW ]
             1. Linear (Gestão e Locks)                  • Servidor SSE Local (Porta 54321)
             2. Git Worktrees (Código & Assets)          • Abas Dedicadas por Agente
             3. Godot 4.7 (Testes 100% Headless)         • Visualização Pixel Art & Telemetria
             4. Documentação & GDD
```

---

## 🔑 1. O Segredo da Multi-Conta: Injeção Atômica no Windows Credential Manager

O Google Antigravity armazena a sessão ativa de autenticação no cofre de credenciais do Windows sob a chave `gemini:antigravity`.

Para permitir que dois ou mais agentes Gemini operem em paralelo consumindo cotas, limites de taxa e tokens de contas Google diferentes sem que uma deslogue a outra:

1. Os tokens de autenticação são mantidos em arquivos isolados:
   - `C:\Users\Usuario\.gemini\conta1_token.txt` *(Conta Google 1)*
   - `C:\ProgramData\agy\conta2_token.txt` *(Conta Google 2)*
2. Cada inicializador (`gemini1.ps1` e `gemini2.ps1`) compila e invoca via P/Invoke a DLL nativa `advapi32.dll` (`CredWriteW`):
   ```csharp
   [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
   public static extern bool CredWrite([In] ref CREDENTIAL userCredential, int flags);
   ```
3. O token da respectiva conta é gravado no cofre do Windows no exato milissegundo antes de iniciar o executável do agente (`agy.exe --dangerously-skip-permissions`).
4. **Resultado**: Isolamento total de tokens e cotas entre os agentes, com execução nativa concorrente.

---

## ⚡ 2. Diretriz *Dispatch-First Parallelism* (Orquestração Simultânea)

O Supervisor (**Gemini 2**) opera sob o princípio de **Despacho Imediato**:
1. **Decomposição Instantânea**: Ao receber uma tarefa do usuário, analisa a arquitetura global e divide as subtarefas entre os agentes.
2. **Registro no Linear**: Cria as issues com lock de escopo.
3. **Despacho nos Terminais**: Envia as instruções detalhadas com comandos limpos de inicialização para **Gemini 1** e **GLM 5.2** via `orca terminal send`.
4. **Execução Concorrente**: Somente após os terminais dos outros agentes estarem processando, Gemini 2 inicia sua parte. **Todos os 3 agentes trabalham juntos ao mesmo tempo**.

---

## 🧠 3. Agente GLM 5.2 (NVIDIA NIM 550B com Tool Calling)

O **GLM 5.2** roda em um ambiente Node.js dedicado (`core/glm_agent_cli.js`) conectado diretamente à **NVIDIA NIM API**:
- **Modelos Suportados**: `nvidia/nemotron-3-ultra-550b-a55b` (550B Flagship MoE), `nemotron-3-super-120b-a12b` e `nemotron-3-nano-30b-a3b`.
- **Tool Calling Nativo**: Execução de scripts PowerShell, leitura/edição de arquivos com numeração de linhas, busca por padrões no código e execução de testes automatizados headless no Godot.
- **Protocolo de Proteção**: O GLM recebe comandos com mesa limpa (`git checkout -- . ; git clean -fd ; git pull origin main`) e foca exclusivamente em funções puras, constantes e cálculos matemáticos determinísticos.

---

## 📺 4. Orca Live Preview (Servidor SSE em Tempo Real)

Localizado em `live-preview/`:
- **Servidor HTTP + SSE** (`server.js` na porta 54321): Mantém conexão contínua com a janela de visualização do navegador Edge/Chromium.
- **CLI Universal** (`show.js`): Permite que qualquer agente envie status, tempo de execução e imagens geradas com comando único:
  ```powershell
  node show.js assets/sprites/ui/hud/poi_hangar.png "Hangar" "Ícone tático 32x32" --agent gemini1
  ```
- **Abas Dedicadas**: Separação visual instantânea para `[🌟 Todos]`, `[🔵 Gemini 1]`, `[🟢 Gemini 2]`, `[🟣 Claude]` e `[🔶 GLM]`.

---

## 🚀 Como Instalar e Configurar

1. Clone este repositório:
   ```bash
   git clone https://github.com/celinfiote/orca-multi-agent-orchestrator.git
   cd orca-multi-agent-orchestrator
   ```
2. Execute o instalador PowerShell no terminal com permissão:
   ```powershell
   .\config\setup.ps1
   ```
3. Use os comandos rápidos no terminal:
   - `gemini1` — Inicia o Gemini 1 (Visual/VFX/Arte).
   - `gemini2` — Inicia o Gemini 2 (Supervisor/UI/Net).
   - `glm` — Inicia o GLM 5.2 (NVIDIA NIM 550B).

---

## 📄 Licença
Distribuído sob a licença MIT. Desenvolvido para o ecossistema HELIOS MMORPG.
