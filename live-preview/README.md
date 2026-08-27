# Orca Live Preview

Sistema de visualização em tempo real de imagens, mockups, sprites (Godot Engine) e status de desenvolvimento para o ecossistema Antigravity / Orca.

## 🚀 Como Iniciar

### 1. Início Rápido (1 Clique)
Basta dar dois cliques no arquivo:
`start.bat`

### 2. Pelo Terminal / Node
```powershell
node server.js --open
```

### 3. Pelo Navegador
Com o servidor ativo, acesse:
[http://localhost:54321](http://localhost:54321)

---

## 🛠️ Comandos de Integração CLI

* **Enviar uma imagem para o preview**:
  ```powershell
  node show.js "C:\caminho\para\imagem.png" "Título" "Descrição"
  ```
* **Atualizar apenas o status ticker**:
  ```powershell
  node show.js --status "Compilando Shaders..." "Testando na Godot Engine"
  ```
* **Abrir e focar a janela**:
  ```powershell
  node show.js --open
  ```

---

## ⌨️ Atalhos de Teclado no Preview

| Tecla | Ação |
| :--- | :--- |
| `+` / `-` | Aumentar / Diminuir zoom (ou scroll do mouse) |
| `0` | Ajustar à tela (Fit to screen) |
| `1` | Zoom 100% (1:1) |
| `P` | Alternar Modo Pixel Art (Nitidez sem blur) |
| `F` | Alternar Modo Tela Cheia |

---

## 📁 Estrutura dos Arquivos

* `server.js`: Servidor HTTP + Server-Sent Events (SSE) sem dependências externas.
* `public/index.html`: Interface visual moderna, com suporte a Pan, Zoom, Histórico, Pixel Art e Status Ticker.
* `show.js`: Utilitário de linha de comando para agentes e scripts enviarem atualizações.
* `focus.ps1`: Script PowerShell para trazer a janela do preview para a frente.
* `start.bat`: Atalho para inicialização rápida.
