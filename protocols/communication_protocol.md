---
description: "Protocolo de Comunicação Obrigatório para os Agentes Gemini (Gemini 1 e Gemini 2) no HELIOS."
trigger: "always_on"
---

# 💬 Protocolo Permanente de Comunicação dos Agentes Gemini (Gemini 1 e Gemini 2)

> **DIRETRIZ OBRIGATÓRIA**:
> Sempre que o Gemini 1 ou o Gemini 2 responder ao usuário, a mensagem DEVE seguir este formato:
> 1. **Resumida e Direta**: Objetiva, sem enrolação e focada no resultado prático.
> 2. **Altamente Organizada**: Uso de tópicos claros, tabelas visuais e passos sequenciais.
> 3. **Linguagem Técnica Explicada Entre Parênteses `( )`**: Toda terminologia técnica, de programação, de motor ou de rede DEVE conter uma explicação simples e compreensível logo ao lado entre parênteses `( )`.

---

## 📖 Exemplos Práticos de Tradução Técnica Obrigatória:

- `GDScript` → `GDScript (linguagem de programação do motor Godot)`
- `Headless` → `Headless (execução sem interface gráfica para testes rápidos de código)`
- `Worktree` → `Worktree (pasta de trabalho isolada para desenvolvimento paralelo)`
- `HUD Diegético` → `HUD Diegético (interface visual que existe dentro do mundo do jogo, como painéis e visores de capacete)`
- `Shaders / VFX` → `Shaders e VFX (efeitos visuais e programas gráficos calculados na GPU)`
- `RPCs / Multiplayer` → `RPCs (comandos de rede enviados entre servidor e jogadores)`
- `TileSet / Atlas` → `TileSet (conjunto de blocos gráficos 2D usados para montar o terreno)`
- `Parallax` → `Parallax (efeito de camadas de fundo que se movem em velocidades diferentes para dar profundidade)`
- `Linear` → `Linear (sistema de gestão e rastreamento de tarefas do projeto)`
- `Commit / Merge` → `Commit e Merge (salvar e mesclar as alterações de código no repositório)`

---

## 🚀 Regra Permanente de Validação e Testes Práticos para o Usuário
Sempre que qualquer agente corrigir um bug visual, de gameplay ou de física apontado pelo usuário:
1. **Gerar ou Atualizar Scripts Executáveis `.bat`**: Manter `launch_game.bat` (jogo completo) e `launch_<cenateste>.bat` na raiz do worktree.
2. **NUNCA Manter Processo Interativo Rodando em Segundo Plano no Terminal**: Jamais deixar a janela do jogo rodando como background task no terminal do agente, pois isso trava o status da IA em "running" no Orca.
3. **Fornecer SEMPRE o Link Clicável do Jogo Completo (`launch_game.bat`) e do Teste Específico**: Apresentar SEMPRE os links diretos para o inicializador do jogo completo ([`launch_game.bat`](file:///C:/Users/Usuario/Documents/helios-gemini2/launch_game.bat)), para o lançador de teste da entrega (`launch_<cenateste>.bat`) e para a pasta do worktree `file:///C:/Users/Usuario/Documents/helios-.../` para que o usuário execute e teste o jogo completo com duplo clique no Windows Explorer com total facilidade e autonomia.
4. **Exibição Obrigatória do Horário da Próxima Checagem em Modo de Espera / Watchdog**: Sempre que o Backlog do Linear estiver zerado (0 tarefas abertas) e o watchdog de 10 minutos (temporizador de polling contínuo) estiver ativo, a resposta DEVE OBRIGATORIAMENTE incluir logo abaixo do status do watchdog o horário exato (calculado a partir do horário local atual, ex: `• Próxima Checagem Agendada: HH:MM:SS (Horário Local)`) em que o sistema realizará a próxima busca por tarefas no Linear.
