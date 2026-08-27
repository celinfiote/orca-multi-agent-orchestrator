# 🛠️ Regra Permanente: Fidelidade Funcional Obrigatória de Todos os Itens (HELIOS)

> ⚠️ **DIRETRIZ MANDATÓRIA PERMANENTE PARA OS 4 AGENTES (Claude Code, Gemini 1, Gemini 2, GLM 5.2)**:
> **Todo e qualquer item, ferramenta, equipamento, consumível, módulo ou objeto interativo concebido ou registrado no HELIOS que possua uma função ou utilidade descrita no mundo do jogo DEVE, POR OBRIGAÇÃO ABSOLUTA, TER ESSA FUNÇÃO 100% IMPLEMENTADA, EXECUTÁVEL E TESTÁVEL NO MOTOR GODOT.**
>
> ❌ **É TERMINANTEMENTE PROIBIDO**: Criar itens com descrições de utilidade que sirvam apenas de "texto estético", "placeholders sem lógica" ou "itens inúteis" cujo clique ou uso não execute a sua ação correspondente no mundo real do jogo.

---

## 🏛️ 1. Princípio da Fidelidade Funcional Absoluta

No universo de HELIOS, o design de jogo é **diegético e sistêmico**. Se um objeto existe no inventário do jogador ou no cenário, a física, a química e a lógica do mundo respondem às suas propriedades:

| Se o Item For... | Função Obrigatória que DEVE Cumprir no Jogo | Efeito no Código / Motor |
|---|---|---|
| **Isqueiro / Acendedor de Plasma** | **ACENDER E PRODUZIR FOGO** | Emite faíscas/chamas 2D, consome gás/carga, queima vegetação/biomassa, acende fogueiras e emite luz local. |
| **Lanterna / Sinalizador Químico** | **ILUMINAR O AMBIENTE** | Instancia ou ativa `PointLight2D`, dissipa sombras e gasta bateria/tempo de queima. |
| **Picareta / Broca de Mineração** | **QUEBRAR E EXTRAIR ROCHAS/MINÉRIOS** | Aplica dano ao TileMap de terreno, extrai recursos para o inventário e gasta durabilidade. |
| **Bússola / Scanner / Radar Portátil** | **DETECTAR E INDICAR DIREÇÃO/RECURSOS** | Calcula vetores para o polo magnético/norte, revela marcadores no minimapa e aponta depósitos minerais. |
| **Cartão de Acesso / Chave Criptográfica**| **DESTRAVAR PORTAS E TERMINAIS** | Valida tag de segurança `security_level` e abre comportas trancadas. |
| **Kit Médico / Bandagem / Nanogel** | **CURAR E ESTANCAR DANO CONTÍNUO** | Restaura HP, cessa sangramento/queimadura e atualiza a barra de vida no HUD. |
| **Cilindro de Oxigênio / Filtro de Ar** | **RESTAURAR E PROVER SUPORTE DE VIDA** | Repõe a reserva de O₂ do traje e previne sufocamento em ambientes hostis. |
| **Cantil / Ração de Sobrevivência** | **SACIAL SEDE/FOME E RESTAURAR ESTAMINA** | Reduz o desgaste de energia e melhora a regeneração do jogador. |
| **Bateria / Célula de Energia** | **RECARREGAR FERRAMENTAS E TRAJE** | Transfere joules/amperes para dispositivos descarregados. |

---

## 📂 2. Padrão de Arquitetura para Itens Funcionais

Todo item adicionado ao sistema deve seguir o contrato de execução:

1. **Definição de Ação Primária e Secundária**:
   - Todo script de item ou handler de inventário deve possuir o método de uso ativo (`use(user: Node2D, target: Variant) -> bool`).
2. **Retorno de Feedback Real no Jogo**:
   - **Feedback Visual**: Sprite em uso, animação ou emissão de partículas 2D.
   - **Feedback Físico/Lógico**: Alteração de estado no mundo (queima, corte, destravamento, cura, telemetria).
   - **Feedback Sonoro**: SFX do acionamento via `AudioStreamPlayer2D`.
3. **Consumo de Recurso / Durabilidade**:
   - Itens consumíveis gastam unidades; ferramentas gastam durabilidade ou energia.

---

## 🧪 3. Critério de Aceite e Validação em Testes Headless

Nenhuma issue envolvendo criação de novos itens ou mecânicas de inventário pode ser movida para **Done** sem uma suíte de testes headless (`tools/test_...`) comprovando:
- [ ] O item pode ser acionado (`use(...)`).
- [ ] O efeito real esperado ocorre no alvo ou no jogador (ex: fogo acendeu, vida subiu, luz foi emitida, porta abriu).
- [ ] O estado de carga/quantidade foi decrementado corretamente.

---

## 🔒 4. Responsabilidade Multi-Agente

- **Claude / GLM**: Implementam a lógica server-authoritative, equações determinísticas de consumo e interação de física/dados.
- **Gemini 1**: Cria os shaders, sprites, iluminação 2D (`PointLight2D`) e partículas visuais do efeito funcional do item (chama, faíscas, feixe).
- **Gemini 2**: Implementa os slots de inventário, barras diegéticas de carga/durabilidade, interface HUD e efeitos sonoros (SFX) do uso do item.
