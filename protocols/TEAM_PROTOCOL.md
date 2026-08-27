# Protocolo Mestre de Coesão e Orquestração Multi-Agente

## 1. As 4 Fontes da Verdade
1. **Linear**: Fonte da verdade das tarefas, status e prioridades.
2. **Git**: Fonte da verdade do código-fonte e assets versionados em worktrees dedicados.
3. **Godot / Engine**: Fonte da verdade do estado executável (100% de aprovação headless).
4. **Documentação / GDD**: Fonte da verdade das regras, locks e arquitetura.

## 2. Divisão de Agentes
- **Gemini 2**: Supervisor Geral, UI/HUD, Soundscape, Rede/RPCs, Persistência JSON e Gestão da Equipe.
- **Gemini 1**: Shaders 2D, VFX de partículas, iluminação dinâmica, animações e arte pixel art.
- **GLM 5.2**: Funções puras, scripts de constantes físicas planetárias e cálculos matemáticos determinísticos.

## 3. Diretriz Dispatch-First Parallelism (Orquestração Simultânea)
O supervisor SEMPRE analisa, divide e despacha as tarefas nos terminais dos outros agentes ANTES de começar a sua própria implementação. Todos começam e trabalham juntos ao mesmo tempo.
