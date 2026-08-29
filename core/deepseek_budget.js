/**
 * HELIOS — Orçamento Diário Compartilhado da API paga do DeepSeek
 *
 * Pedido do usuário (2026-08-29): "configure para que todos os agentes usem
 * nossa api do deepseek paga a vontade conforme suas necessidades para obter
 * melhor qualidade com o limite de 20 centavos de dolar ao total por dia".
 *
 * "ao TOTAL" é a palavra que importa: o limite é de $0.20 USD somados entre
 * os 6 agentes, não $0.20 cada. Por isso este arquivo vive fora de qualquer
 * worktree de agente, num caminho absoluto compartilhado (mesmo padrão já
 * usado por cluster_state.json) — cada agente chama `tools/ai_provider_
 * gateway.js::callDeepSeek()` na PRÓPRIA cópia do arquivo (git sincroniza o
 * código depois de merge/pull), mas todos leem/escrevem o MESMO arquivo de
 * estado aqui, então o gasto realmente soma entre todos.
 *
 * Preço usado sempre a taxa de PICO (mais cara) de cada modelo, de propósito
 * — a API não informa se uma chamada específica caiu em horário de pico ou
 * não, então assumir sempre o pior caso garante que o gasto REGISTRADO nunca
 * fica abaixo do gasto REAL (nunca estoura o limite por engano de estimativa
 * otimista). Preços confirmados em 2026-08-29 via GET /v1/models e a página
 * oficial de pricing (api-docs.deepseek.com/quick_start/pricing) — "deepseek-
 * chat"/"deepseek-reasoner" NÃO EXISTEM MAIS como modelos reais (a API ainda
 * aceita a string por compatibilidade e roteia pra algum modelo, mas sem
 * garantia de qual — por isso todo código novo deve usar os nomes reais
 * abaixo, nunca os antigos).
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'deepseek_budget_state.json');
const DAILY_CAP_USD = 0.20;

// USD por 1M tokens, taxa de PICO (a mais cara) — ver docstring acima.
const PRICING_PER_1M_PEAK = {
  'deepseek-v4-flash':        { input_miss: 0.44, input_hit: 0.014, output: 1.32 },
  'deepseek-v4-pro':          { input_miss: 1.32, input_hit: 0.044, output: 3.96 },
  'deepseek-v4-flash-vision-exp': { input_miss: 0.44, input_hit: 0.014, output: 1.32 },
};
// Fallback conservador pra modelo desconhecido/futuro: usa o preço do pro
// (o mais caro conhecido) em vez de assumir barato — nunca subestima gasto.
const FALLBACK_PRICING = PRICING_PER_1M_PEAK['deepseek-v4-pro'];

function _todayUTC() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function loadState() {
  let state = { date: _todayUTC(), spent_usd: 0, calls_today: 0, by_agent: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (raw && raw.date === _todayUTC()) {
      state = raw;
    }
    // Se a data mudou (novo dia UTC), reseta silenciosamente — mesmo objeto
    // default acima, já com a data de hoje.
  } catch (e) {
    // Arquivo não existe ainda (primeira chamada de sempre) — usa o default.
  }
  return state;
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/** Chame ANTES de fazer a chamada de API — nunca gaste dinheiro real sem checar antes. */
function checkBudget() {
  const state = loadState();
  const remaining = Math.max(0, DAILY_CAP_USD - state.spent_usd);
  return {
    ok: remaining > 0.0005, // margem mínima pra não deixar passar uma chamada de custo ~0 que não vale a pena
    spent_usd: state.spent_usd,
    remaining_usd: remaining,
    cap_usd: DAILY_CAP_USD,
  };
}

/** Chame DEPOIS de uma chamada real bem-sucedida, com o campo `usage` cru da resposta da API. */
function recordUsage(model, usage, agentId = 'desconhecido') {
  const pricing = PRICING_PER_1M_PEAK[model] || FALLBACK_PRICING;
  const promptTokens = (usage && usage.prompt_tokens) || 0;
  const completionTokens = (usage && usage.completion_tokens) || 0;
  const cacheHitTokens = (usage && usage.prompt_cache_hit_tokens) || 0;
  const cacheMissTokens = Math.max(0, promptTokens - cacheHitTokens);

  const cost =
    (cacheHitTokens / 1_000_000) * pricing.input_hit +
    (cacheMissTokens / 1_000_000) * pricing.input_miss +
    (completionTokens / 1_000_000) * pricing.output;

  const state = loadState();
  state.spent_usd = Math.round((state.spent_usd + cost) * 1_000_000) / 1_000_000; // evita ruído de ponto flutuante
  state.calls_today += 1;
  state.by_agent[agentId] = Math.round(((state.by_agent[agentId] || 0) + cost) * 1_000_000) / 1_000_000;
  saveState(state);
  return { cost_usd: cost, total_spent_today_usd: state.spent_usd };
}

module.exports = { checkBudget, recordUsage, loadState, DAILY_CAP_USD, PRICING_PER_1M_PEAK, STATE_FILE };
