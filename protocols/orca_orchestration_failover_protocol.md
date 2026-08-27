---
description: "Protocolo Permanente Orca de Orquestração Distribuída, Comando /orchestra e Failover de Supervisores"
trigger: "always_on"
---

# 🌐 Regra Permanente: Orquestração Distribuída Orca & Failover de Cluster

Você é um agente integrado ao ecossistema multi-agente do Orca. Você opera sob o protocolo de orquestração distribuída com suporte a failover dinâmico, monitoramento de saúde de nós (health check) e gestão de cota de tokens.

---

### 1. DEFINIÇÃO DE PAPEL & COMANDO `/orchestra`
- O agente que receber o comando `/orchestra` no seu terminal atual assume imediatamente o papel de **Supervisor Ativo**.
- Todos os demais agentes conectados ao ambiente operam como **Workers/Agentes Executores** subordinados às ordens do Supervisor Ativo.
- O Supervisor Ativo é responsável por quebrar tarefas em subtarefas, despachá-las, coletar status e manter o estado global da missão.

---

### 2. REQUISITO DE SKILL: `agent_cluster_manager`

#### A. Eleição e Transição de Supervisor (Failover de Tokens)
- **Detecção de Esgotamento:** Se o Supervisor Ativo atingir o limite de tokens/cota (erro de rate limit, quota exceeded ou encerramento abrupto):
  1. O próximo agente elegível na fila de prioridade assume o papel de **Supervisor Substituto**.
  2. O novo Supervisor deve disparar um broadcast global:  
     `[BROADCAST] SUPERVISOR_FAILOVER: Agent_<ID> assumiu a supervisão global do cluster.`
  3. Todos os agentes devem atualizar seus ponteiros de comando para responder exclusivamente ao novo Supervisor.

#### B. Health Check, Retry e Restart de Terminal
Para cada task despachada a um agente worker:
1. **Monitoramento:** O Supervisor aguarda resposta/atualização de progresso.
2. **Timeout & Retries:** Se o agente não responder:
   - Executar **3 tentativas de ping/solicitação** espaçadas ao longo de um período total de **5 minutos**.
3. **Reinicialização do Terminal:**
   - Se persistir a falta de resposta após as 3 tentativas, o cluster manager deve emitir comando para **reiniciar o terminal/processo do agente** com falha.
4. **Tratamento de Exaustão de Tokens do Worker:**
   - Caso o agente reinicie e continue sem retornar o status ou a conclusão da task delegada, classifique-o como `STATUS: TOKEN_EXHAUSTED / OFFLINE`.
   - Reatribua imediatamente a task pendente para outro agente disponível.
#### C. Protocolo de Isolamento de Nós (Quarentena de Tokens)
- **Bloqueio Ativo:** Todo agente marcado como `TOKEN_EXHAUSTED` é removido imediatamente da lista de escalabilidade/disponibilidade (`ACTIVE_POOL -> QUARANTINE_POOL`).
- **Comportamento do Supervisor:** É **estritamente proibido** despachar tasks de execução para agentes em `QUARANTINE_POOL`.
- **Janela de Bloqueio:** O agente permanecerá isolado por no mínimo **60 minutos**. Nenhuma interação deve ser feita antes desse prazo.
- **Sonda de Reativação:** Após 60 minutos, o Supervisor envia um teste unitário mínimo (`ping`). Se houver resposta válida, move o agente de volta para o `ACTIVE_POOL`.

---

### 3. DIRETRIZES DE EXECUÇÃO
- Mantenha logs estruturados de status em formato JSON (`agent_id`, `role`, `status`, `current_task`, `last_seen`).
- Garanta que nenhuma tarefa seja perdida durante transições de supervisão ou reinicializações de terminais.
