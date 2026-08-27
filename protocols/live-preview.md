---
trigger: always_on
description: Automatically display visual assets and images to the user in Orca Live Preview
---

# Orca Live Preview Rule (Multi-Agente: Gemini 1, Gemini 2, Gemini 3, Gemini 4, GLM 5.2)

O **Orca Live Preview** possui abas dedicadas para cada agente (`[🌟 Todos]`, `[🔵 Gemini 1]`, `[🟢 Gemini 2]`, `[🟡 Gemini 3]`, `[🟣 Gemini 4]`, `[🔶 GLM]`) com status em tempo real e visualizador de assets/cenas testadas.

Sempre que qualquer agente gerar um asset visual, testar uma cena, ou iniciar uma tarefa relevante:

1. **Atualizar o Status do Agente em Tempo Real**:
   ```powershell
   node C:\Users\Usuario\Documents\orca-live-preview\show.js --status "<Nome da Tarefa>" "<Detalhes da Execução>" [--agent gemini1|gemini2|gemini3|gemini4|glm]
   ```
2. **Exibir Asset ou Captura de Cena no Live Preview**:
   ```powershell
   node C:\Users\Usuario\Documents\orca-live-preview\show.js "<caminho_da_imagem>" "<Título>" "<Descrição da Ação>" [--agent gemini1|gemini2|gemini3|gemini4|glm]
   ```
   *(Nota: O agente é detectado automaticamente pela pasta de trabalho `helios-gemini1`, `helios-gemini2`, `helios-gemini3`, `helios-gemini4` ou `helios-glm`, ou pode ser explicitamente informado com a flag `--agent`)*.

Isso garante que o usuário sempre veja instantaneamente o que cada um dos 5 agentes está fazendo, com consumo residual desprezível de tokens e alta nitidez pixel art.
