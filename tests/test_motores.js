/* ============================================================================
   TESTES DOS MOTORES DE CÁLCULO — Mais Valor
   Roda com: node tests/test_motores.js   (sem dependências externas)
   Extrai as funções REAIS dos arquivos do site (simulador.html e
   carteira/common.js) e valida invariantes financeiros. Se alguém quebrar uma
   fórmula, o GitHub Actions acusa no push.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let falhas = 0, total = 0;
function ok(cond, nome, detalhe) {
  total++;
  if (cond) { console.log('  ✓ ' + nome); }
  else { falhas++; console.error('  ✗ FALHOU: ' + nome + (detalhe ? ' — ' + detalhe : '')); }
}
function aprox(a, b, tol) { return Math.abs(a - b) <= (tol ?? 1e-6); }

/* Extrai o código-fonte de uma function/const top-level pelo nome (conta chaves). */
function extrair(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) throw new Error('não achei: ' + decl);
  // encontra o primeiro '{' ou '(' de bloco depois da declaração
  let j = src.indexOf('{', i);
  if (decl.startsWith('const')) {
    // const X = new Set([...]);  ou  const X = (...) => ...;
    const fim = src.indexOf(');', i);
    const fimAlt = src.indexOf(';\n', i);
    const f = (fim >= 0 && (fimAlt < 0 || fim < fimAlt)) ? fim + 2 : fimAlt + 1;
    return src.slice(i, f);
  }
  let depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(i, k + 1);
}

/* ── 1. SIMULADOR (backtest) ─────────────────────────────────────────────── */
console.log('\n■ simulador.html — motor de backtest');
{
  const html = fs.readFileSync(path.join(ROOT, 'simulador.html'), 'utf8');
  const partes = [
    "const DATA_MINIMA",
    "const INDICES_ACUMULADOS",
    "const SEM_DIVIDENDOS",
    "function generateMonthRange",
    "function calcEffectiveWeights",
    "function runBacktest",
  ].map(d => extrair(html, d));
  const ctx = { console, Math, Date };
  vm.createContext(ctx);
  vm.runInContext(partes.join('\n'), ctx);

  // generateMonthRange
  ok(ctx.generateMonthRange('2020-01', '2020-12').length === 12, 'generateMonthRange: 12 meses em 2020');
  ok(ctx.generateMonthRange('2019-11', '2020-02').join(',') === '2019-11,2019-12,2020-01,2020-02',
     'generateMonthRange: vira o ano corretamente');

  // calcEffectiveWeights: redistribuição quando um ativo não tem dado
  {
    const assets = [
      { ticker: 'A', weight: 0.5, assetClassId: 'acao', assetClass: 'Ações' },
      { ticker: 'B', weight: 0.5, assetClassId: 'acao', assetClass: 'Ações' },
    ];
    const prices = { A: { '2020-01': 10 }, B: {} };
    const w = ctx.calcEffectiveWeights(assets, prices, '2020-01');
    ok(aprox(w.A, 1) && aprox(w.B, 0), 'calcEffectiveWeights: peso do ausente vai pro presente');
  }

  // runBacktest: preço constante → lucro 0, retorno 0, drawdown 0
  {
    const months = ctx.generateMonthRange('2020-01', '2021-12');
    const pm = {}; months.forEach(m => pm[m] = 10);
    const cfg = { startDate: '2020-01', endDate: '2021-12', initialAmount: 1000, monthlyAmount: 100,
                  assets: [{ ticker: 'A', weight: 1, assetClassId: 'acao', assetClass: 'Ações' }] };
    const r = ctx.runBacktest(cfg, { A: pm }, { A: {} });
    ok(aprox(r.metrics.finalValue, r.metrics.totalInvested, 0.01),
       'runBacktest: preço constante → valor final = total aportado',
       `final=${r.metrics.finalValue} aportado=${r.metrics.totalInvested}`);
    ok(aprox(r.metrics.maxDrawdown, 0), 'runBacktest: preço constante → drawdown 0');
    ok(Math.abs(r.metrics.cagr) < 1e-4, 'runBacktest: preço constante → CAGR ~0');
  }

  // runBacktest: alta constante de 1%/mês → CAGR (TIR) ≈ 12,68% a.a.
  {
    const months = ctx.generateMonthRange('2020-01', '2024-12');
    const pm = {}; let p = 10;
    months.forEach(m => { pm[m] = p; p *= 1.01; });
    const cfg = { startDate: '2020-01', endDate: '2024-12', initialAmount: 10000, monthlyAmount: 0,
                  assets: [{ ticker: 'A', weight: 1, assetClassId: 'acao', assetClass: 'Ações' }] };
    const r = ctx.runBacktest(cfg, { A: pm }, { A: {} });
    const esperado = Math.pow(1.01, 12) - 1;
    ok(aprox(r.metrics.cagr, esperado, 0.002),
       'runBacktest: 1%/mês → CAGR ≈ 12,68% a.a. (TIR)',
       `cagr=${(r.metrics.cagr * 100).toFixed(2)}%`);
    ok(aprox(r.metrics.maxDrawdown, 0), 'runBacktest: alta constante → drawdown 0');
  }
}

/* ── 2. CARTEIRA (common.js) ─────────────────────────────────────────────── */
console.log('\n■ carteira/common.js — consolidador');
{
  const src = fs.readFileSync(path.join(ROOT, 'carteira', 'common.js'), 'utf8');
  const partes = [
    "const UNITS_SUFIXO_11",
    "function classificarB3",
    "function parseNumBR",
    "function feriadosBR",
    "function ehFeriadoUTC",
    "function diasUteisRF",
    "function _fatorRFHistorico",
  ].map(d => extrair(src, d));
  const ctx = { console, Math, Date, _feriadosCache: {}, BCB_HIST: null, _bcbHistKeys: null, _fatorRFCache: {} };
  vm.createContext(ctx);
  vm.runInContext('var _feriadosCache={};\n' + partes.join('\n'), ctx);

  // parseNumBR
  ok(ctx.parseNumBR('R$ 1.700,00') === 1700, "parseNumBR('R$ 1.700,00') = 1700");
  ok(ctx.parseNumBR('1,5') === 1.5, "parseNumBR('1,5') = 1.5");
  ok(ctx.parseNumBR('0.78') === 0.78, "parseNumBR('0.78') = 0.78");

  // classificarB3
  ok(ctx.classificarB3('PETR4') === 'B3', 'classificarB3: PETR4 → Ações');
  ok(ctx.classificarB3('MXRF11') === 'FII', 'classificarB3: MXRF11 → FII');
  ok(ctx.classificarB3('KLBN11') === 'B3', 'classificarB3: KLBN11 (unit) → Ações');
  ok(ctx.classificarB3('AAPL34') === 'BDR', 'classificarB3: AAPL34 → BDR');

  // dias úteis: janela 02..08/01/2026 (a data de aplicação 01/01 fica fora);
  // 02=sex, 05=seg, 06=ter, 07=qua, 08=qui → 5 dias úteis (03/04 = fim de semana)
  ok(ctx.diasUteisRF('2026-01-01', '2026-01-08') === 5,
     'diasUteisRF: 01/01→08/01/2026 = 5 dias úteis',
     'obtido=' + ctx.diasUteisRF('2026-01-01', '2026-01-08'));
  // feriado móvel: Sexta-feira Santa de 2026 (03/04) não conta como dia útil
  ok(ctx.diasUteisRF('2026-04-01', '2026-04-07') === 3,
     'diasUteisRF: Semana Santa 2026 exclui a Sexta-feira Santa',
     'obtido=' + ctx.diasUteisRF('2026-04-01', '2026-04-07'));

  // fatorRF histórico: CDI 110% com série sintética
  {
    const cdi = {}; const keys = [];
    // 24 meses ~ 500 dias úteis sintéticos a 0,05%/dia
    let d = new Date(Date.UTC(2024, 0, 1));
    while (keys.length < 500) {
      const wd = d.getUTCDay();
      if (wd !== 0 && wd !== 6) { const k = d.toISOString().slice(0, 10); cdi[k] = 0.05; keys.push(k); }
      d.setUTCDate(d.getUTCDate() + 1);
    }
    ctx.BCB_HIST = { cdi_diario: cdi, selic_diario: {}, ipca_mensal: {} };
    ctx._bcbHistKeys = { cdi: keys, selic: [], ipca: [] };
    const de = keys[0], ate = keys[keys.length - 1];
    const f = vm.runInContext(`_fatorRFHistorico('CDI',110,'${de}','${ate}')`, ctx);
    let manual = 1;
    keys.forEach(k => { if (k > de && k <= ate) manual *= 1 + (0.05 / 100) * 1.10; });
    ok(f != null && aprox(f, manual, 1e-9), 'fatorRF histórico: CDI 110% = produto diário real',
       `f=${f} manual=${manual}`);
    const fora = vm.runInContext(`_fatorRFHistorico('CDI',110,'2010-01-05','${ate}')`, ctx);
    ok(fora === null, 'fatorRF histórico: compra antes da série → null (usa fallback)');
  }
}

/* ── 3. CONVENÇÃO DE APORTE (invariantes do site) ────────────────────────── */
console.log('\n■ convenção "mês 1 sem aporte" — invariantes');
{
  // Regra do site: saldo = saldo*(1+r) + aporte, SEM aporte no mês 1
  const pipeline = (PV, PMT, txAnual, meses) => {
    const r = Math.pow(1 + txAnual, 1 / 12) - 1;
    let s = PV;
    for (let m = 1; m <= meses; m++) s = s * (1 + r) + (m === 1 ? 0 : PMT);
    return s;
  };
  // Fórmula fechada usada no modo reverso e em ferramentas.html: (n-1) aportes
  const fechada = (PV, PMT, txAnual, meses) => {
    const r = Math.pow(1 + txAnual, 1 / 12) - 1;
    const fvA = meses <= 1 ? 0 : (r > 0 ? PMT * (Math.pow(1 + r, meses - 1) - 1) / r : PMT * (meses - 1));
    return PV * Math.pow(1 + r, meses) + fvA;
  };
  ok(aprox(pipeline(10000, 1000, 0.12, 240), fechada(10000, 1000, 0.12, 240), 0.01),
     'fórmula fechada (n-1 aportes) = simulação iterativa');
  // Modo reverso: PMT calculado tem que bater a meta no pipeline
  const alvo = 1e6, PV = 10000, tx = 0.10, n = 240;
  const r = Math.pow(1 + tx, 1 / 12) - 1;
  const pmt = (alvo - PV * Math.pow(1 + r, n)) / ((Math.pow(1 + r, n - 1) - 1) / r);
  ok(aprox(pipeline(PV, pmt, tx, n), alvo, 0.01),
     'modo reverso: PMT sugerido atinge a meta com erro < R$ 0,01');
}

console.log(`\n${'='.repeat(60)}\n${total - falhas}/${total} testes passaram${falhas ? ' \u2014 ' + falhas + ' FALHA(S)' : ' \u2713'}\n`);
process.exit(falhas ? 1 : 0);
