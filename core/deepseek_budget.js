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
 * ATUALIZADO em 2026-08-29 (achado real do usuário: o próprio painel de uso
 * da DeepSeek mostrava só $0.10 gastos nos últimos 30 dias inteiros, enquanto
 * este arquivo registrava $0.2084 gastos NO MESMO DIA e bloqueava o cluster
 * inteiro por "orçamento esgotado"). Causa raiz: a versão anterior deste
 * arquivo sempre usava a taxa de PICO (mais cara), sob a premissa de que
 * "a API não informa se uma chamada caiu em horário de pico" — mas isso
 * estava ERRADO: pico/fora-de-pico da DeepSeek é 100% determinado pelo
 * RELÓGIO (dia da semana + hora UTC), não algo que só se descobre depois da
 * chamada. Dá pra calcular com certeza total ANTES de gastar, sem precisar
 * "assumir o pior caso". O dia em que o bug foi achado (sábado, 2026-08-29)
 * é justamente um dia de fim de semana — 100% fora de pico o dia inteiro,
 * pela regra nova do próprio provedor (ver `isOffPeakNow()` abaixo) — daí o
 * gasto registrado ter ficado ~2x acima do real (fora de pico = metade do
 * preço de pico, confirmado na página oficial).
 *
 * Preços e regras confirmados em 2026-08-29 via GET /v1/models e a página
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

/** Fora de pico é SEMPRE exatamente 50% do preço de pico, em toda tarifa
 * (cache hit, cache miss, saída) — confirmado na página oficial de pricing.
 * Derivado automaticamente do PRICING_PER_1M_PEAK acima pra nunca divergir
 * se os preços de pico forem atualizados no futuro. */
function _offPeakPricing(peakPricing) {
  return {
    input_miss: peakPricing.input_miss / 2,
    input_hit: peakPricing.input_hit / 2,
    output: peakPricing.output / 2,
  };
}

/**
 * Determina se `now` cai em horário fora-de-pico (mais barato) da DeepSeek.
 * Regras confirmadas em 2026-08-29 (api-docs.deepseek.com/quick_start/pricing
 * + banner oficial no próprio site de uso: "Effective 00:00 (Beijing Time)
 * on Sunday, August 23, 2026 ... off-peak rates applying throughout the day
 * on weekends"):
 *
 * - Fim de semana (sábado/domingo, horário de PEQUIM/Beijing = UTC+8):
 *   fora de pico o DIA INTEIRO — regra nova desde 23/08/2026.
 * - Dias de semana: fora de pico das 01:00–04:00 UTC e 06:00–10:00 UTC;
 *   pico no resto do dia (janelas em UTC, conforme a página oficial).
 *
 * `now` é injetável só pra teste determinístico — código real sempre chama
 * sem argumento (usa o relógio de verdade no momento da chamada).
 */
function isOffPeakNow(now = new Date()) {
  const beijingMs = now.getTime() + 8 * 60 * 60 * 1000; // UTC+8, sem horário de verão
  const beijingDay = new Date(beijingMs).getUTCDay(); // 0=domingo ... 6=sábado
  if (beijingDay === 0 || beijingDay === 6) return true; // fim de semana inteiro
  const utcHour = now.getUTCHours();
  return (utcHour >= 1 && utcHour < 4) || (utcHour >= 6 && utcHour < 10);
}

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
  const peakPricing = PRICING_PER_1M_PEAK[model] || FALLBACK_PRICING;
  const pricing = isOffPeakNow() ? _offPeakPricing(peakPricing) : peakPricing;
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

module.exports = {
  checkBudget, recordUsage, loadState, DAILY_CAP_USD, PRICING_PER_1M_PEAK, STATE_FILE,
  isOffPeakNow,
  offPeakPricingOf: _offPeakPricing, // exportado só pra teste determinístico da matemática de desconto
};
