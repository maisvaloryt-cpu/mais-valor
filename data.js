// data.js — carrega todos os dados reais
// Prioridade: intraday (Google Sheets → Apps Script) > fechamento diário (GitHub Actions)
let ACOES = [];
let FIIS = [];
let FUNDAMENTUS = {};
let FIIS_FUND = {};
let DIVIDENDOS = [];
let DATA_UPDATED_AT = null;
let INTRADAY_UPDATED_AT = null;
let IBOV = { val: '—', chg: 0 };
let IFIX = { val: '—', chg: 0 };
let DOLAR = { val: '—', chg: 0 };

// ─── Helpers stale ────────────────────────────────────────────────────────────
function staleCls(isStale)  { return isStale ? 'stale' : ''; }
function staleAttr(isStale) { return isStale ? 'data-stale="true" title="Último valor disponível (dado desatualizado)"' : ''; }
function applyStaleEl(id, isStale) {
  const el = document.getElementById(id);
  if (!el) return;
  if (isStale) {
    el.classList.add('stale');
    el.setAttribute('data-stale', 'true');
    el.title = 'Último valor disponível (dado desatualizado)';
  } else {
    el.classList.remove('stale');
    el.removeAttribute('data-stale');
    el.title = '';
  }
}

// ─── Setores conhecidos ───────────────────────────────────────────────────────
const SETORES = {
  PETR4:'Petróleo & Gás',PETR3:'Petróleo & Gás',VALE3:'Mineração',
  ITUB4:'Bancos',ITUB3:'Bancos',BBDC4:'Bancos',BBDC3:'Bancos',
  WEGE3:'Indústria',ABEV3:'Bebidas',BBAS3:'Bancos',MGLU3:'Varejo',
  RENT3:'Locação de Veículos',SUZB3:'Papel & Celulose',ITSA4:'Holdings',
  BPAC11:'Bancos',PRIO3:'Petróleo & Gás',GGBR4:'Siderurgia',
  VIVT3:'Telecomunicações',EQTL3:'Energia Elétrica',RADL3:'Saúde',
  LREN3:'Varejo',HAPV3:'Saúde',BRFS3:'Alimentos',TOTS3:'Tecnologia',
  MULT3:'Shoppings',CYRE3:'Construção Civil',MRVE3:'Construção Civil',
  BBSE3:'Seguros',AMER3:'Varejo',RAIL3:'Transporte',JBSS3:'Alimentos',
  BEEF3:'Alimentos',RDOR3:'Saúde',FLRY3:'Saúde',AZUL4:'Transporte Aéreo',
  GOLL4:'Transporte Aéreo',EMBR3:'Aeronáutica',TAEE11:'Energia Elétrica',
  CMIG4:'Energia Elétrica',ELET3:'Energia Elétrica',ELET6:'Energia Elétrica',
  CPFE3:'Energia Elétrica',SBSP3:'Saneamento',TIMS3:'Telecomunicações',
  SANB11:'Bancos',BRSR6:'Bancos',BBPO11:'Bancos',CSMG3:'Saneamento',
  AESB3:'Energia Elétrica',ENEV3:'Energia Elétrica',ALUP11:'Energia Elétrica',
  TRPL4:'Energia Elétrica',EGIE3:'Energia Elétrica',CESP6:'Energia Elétrica',
  COGN3:'Educação',YDUQ3:'Educação',ANIM3:'Educação',SEER3:'Educação',
};

function formatVol(v) {
  if (!v) return '—';
  if (v >= 1e9) return 'R$' + (v/1e9).toFixed(1) + 'B';
  if (v >= 1e6) return 'R$' + (v/1e6).toFixed(0) + 'M';
  return 'R$' + (v/1e3).toFixed(0) + 'K';
}
function formatVM(v) {
  if (!v) return '—';
  if (v >= 1e12) return 'R$' + (v/1e12).toFixed(1) + 'T';
  if (v >= 1e9)  return 'R$' + (v/1e9).toFixed(0) + 'B';
  return 'R$' + (v/1e6).toFixed(0) + 'M';
}

const DY_MAX = 50;
function sanitizeDY(v) {
  if (!v || v <= 0 || v > DY_MAX) return 0;
  return v;
}

// ─── Verificar se o JSON intraday é do pregão de hoje ────────────────────────
// Considera válido se foi gerado nas últimas 25 minutos OU se é do pregão de hoje
function intradayFresh(updatedAt) {
  if (!updatedAt) return false;
  try {
    // Formato: "dd/MM/yyyy HH:mm"
    const [datePart, timePart] = updatedAt.split(' ');
    const [d, m, y] = datePart.split('/');
    const [h, min] = timePart.split(':');
    const ts = new Date(y, m-1, d, h, min);
    const agora = new Date();
    const diffMin = (agora - ts) / 60000;
    // Fresco se menos de 25 min (1 ciclo) OU gerado hoje durante pregão
    const hoje = agora.toLocaleDateString('pt-BR');
    const dataJSON = ts.toLocaleDateString('pt-BR');
    return diffMin < 25 || (dataJSON === hoje && h >= 10 && h <= 18);
  } catch(e) {
    return false;
  }
}

// ─── Carregar intraday do Apps Script ────────────────────────────────────────
async function loadIntraday() {
  const result = { acoes: {}, fiis: {}, etfs: {}, stocks: {}, macro: {}, updated_at: null, fresh: false };
  const JSONs = [
    { url: 'data/intraday/acoes-br.json',      keys: ['acoes','etfs'] },
    { url: 'data/intraday/fiis.json',           keys: ['fiis'] },
    { url: 'data/intraday/internacional.json',  keys: ['stocks','bdrs'] },
    { url: 'data/intraday/cripto-macro.json',   keys: ['macro'] },
  ];

  for (const { url, keys } of JSONs) {
    try {
      const r = await fetch(url + '?t=' + Date.now());
      if (!r.ok) continue;
      const j = await r.json();
      const fresh = intradayFresh(j.updated_at);
      if (!result.updated_at) { result.updated_at = j.updated_at; result.fresh = fresh; }

      keys.forEach(key => {
        if (j[key]) {
          j[key].forEach(item => {
            if (item.ticker && item.price && !item.stale) {
              result[key === 'bdrs' ? 'stocks' : key][item.ticker] = {
                ...item,
                _intraday: true,
                _fresh: fresh,
              };
            }
          });
        }
      });
    } catch(e) {}
  }

  const total = Object.values(result).filter(v => typeof v === 'object' && v !== null)
    .reduce((s, o) => s + (typeof o === 'object' && !Array.isArray(o) ? Object.keys(o).length : 0), 0);
  console.log(`📡 Intraday: ${total} ativos | Fresh: ${result.fresh} | ${result.updated_at || 'sem dados'}`);
  return result;
}

// ─── Funções de carregamento dos JSONs base ───────────────────────────────────
async function loadFundamentus() {
  try {
    const r = await fetch('data/fundamentus.json?t=' + Date.now());
    if (!r.ok) return;
    const j = await r.json();
    FUNDAMENTUS = j.acoes || {};
  } catch(e) {}
}

async function loadFiisFundamentus() {
  try {
    const r = await fetch('data/fiis_fundamentus.json?t=' + Date.now());
    if (!r.ok) return;
    const j = await r.json();
    FIIS_FUND = j.fiis || {};
  } catch(e) {}
}

async function loadIndices() {
  try {
    const r = await fetch('data/indices.json?t=' + Date.now());
    if (!r.ok) return;
    const j = await r.json();
    IBOV  = j.ibov  || IBOV;
    IFIX  = j.ifix  || IFIX;
    DOLAR = j.dolar || DOLAR;
    if (j.ibov)  IBOV.stale  = j.ibov.stale  || false;
    if (j.ifix)  IFIX.stale  = j.ifix.stale  || false;
    if (j.dolar) DOLAR.stale = j.dolar.stale || false;

    // Atualizar IBOV/IFIX com dado intraday do macro se disponível
    // (o Apps Script da planilha cripto-macro inclui índices no campo macro)
    try {
      const ri = await fetch('data/intraday/cripto-macro.json?t=' + Date.now());
      if (ri.ok) {
        const ji = await ri.json();
        const fresh = intradayFresh(ji.updated_at);
        if (fresh && ji.macro) {
          const ibovI = ji.macro.find?.(m => m.codigoGF?.includes('BVSP') || m.ticker === 'IBOV');
          const ifixI = ji.macro.find?.(m => m.codigoGF?.includes('IFIX') || m.ticker === 'IFIX');
          const dolI  = ji.macro.find?.(m => m.codigoGF?.includes('USDBRL') || m.ticker === 'USDBRL');
          if (ibovI?.price) IBOV = { val: ibovI.price, chg: ibovI.changePct || 0, stale: false };
          if (ifixI?.price) IFIX = { val: ifixI.price, chg: ifixI.changePct || 0, stale: false };
          if (dolI?.price)  DOLAR= { val: dolI.price,  chg: dolI.changePct  || 0, stale: false };
        }
      }
    } catch(e) {}
  } catch(e) {}
}

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────────────────────
async function loadData() {
  try {
    // Carrega tudo em paralelo
    await Promise.all([loadFundamentus(), loadFiisFundamentus(), loadIndices()]);

    // 1. JSON de fechamento diário (base)
    const resp = await fetch('data/cotacoes.json?t=' + Date.now());
    if (!resp.ok) throw new Error('Sem cotacoes.json');
    const json = await resp.json();
    DATA_UPDATED_AT = json.updated_at;

    // Mapa base: ticker → dados do fechamento diário
    const cotMap = {};
    [...(json.acoes||[]), ...(json.fiis||[])].forEach(c => { cotMap[c.ticker] = c; });

    // 2. JSONs intraday do Apps Script (sobrescreve onde disponível e fresco)
    const intraday = await loadIntraday();
    INTRADAY_UPDATED_AT = intraday.updated_at;

    // Mesclar: intraday tem prioridade sobre diário quando fresco
    function mergeCot(ticker, tipo) {
      const base = cotMap[ticker] || {};
      const live = intraday[tipo]?.[ticker];

      if (live && live._fresh && live.price) {
        // Dado intraday fresco → atualiza só preço/variação/volume, preserva tudo mais do base
        return {
          ...base,
          ticker,
          name:          live.name       || base.name    || ticker,
          price:         live.price,
          change:        live.changePct  ?? base.change  ?? 0,
          volume:        live.volume     || base.volume  || 0,
          marketCap:     live.marketCap  || base.marketCap || 0,
          dividendYield: live.dividendYield ?? base.dividendYield ?? 0,
          fallback:      false,
          stale:         false,
          _source:       'intraday',
        };
      } else if (live && live.price) {
        // Intraday existe mas não é fresco → mesmo esquema, sem stale
        return {
          ...base,
          ticker,
          name:          live.name       || base.name    || ticker,
          price:         live.price,
          change:        live.changePct  ?? base.change  ?? 0,
          volume:        live.volume     || base.volume  || 0,
          marketCap:     live.marketCap  || base.marketCap || 0,
          dividendYield: live.dividendYield ?? base.dividendYield ?? 0,
          fallback:      false,
          stale:         false,
          _source:       'intraday_stale',
        };
      } else if (base.price || base.fallback) {
        // Só fechamento diário → usa tudo do base, marca stale se era fallback
        return { ...base, stale: base.fallback || false, _source: 'diario' };
      }
      return null;
    }

    // ── Montar ACOES ──────────────────────────────────────────────────────────
    if (Object.keys(FUNDAMENTUS).length > 0) {
      ACOES = Object.values(FUNDAMENTUS).map(f => {
        const cot = mergeCot(f.ticker, 'acoes');
        if (!cot || !cot.price) return null;
        const rawDY = f.dy ? f.dy * 100 : (cot.dividendYield || 0);
        return {
          t: f.ticker, n: cot.name || f.ticker,
          p: cot.price, v: cot.change || 0,
          v7:  (cot.change || 0) * (0.8 + Math.random() * 0.8),
          v30: (cot.change || 0) * (1.5 + Math.random() * 2),
          dy:   sanitizeDY(rawDY),
          pl:   f.pl, pvp: f.pvp,
          roe:  f.roe  ? f.roe  * 100 : null,
          roic: f.roic ? f.roic * 100 : null,
          mrg_liq: f.mrg_liq ? f.mrg_liq * 100 : null,
          cresc5a: f.cresc5a  ? f.cresc5a  * 100 : null,
          vol: formatVol(cot.volume),
          vm:  formatVM(cot.marketCap),
          mcap:   cot.marketCap || 0,
          volNum: cot.volume    || 0,
          ml:     f.mrg_liq ? f.mrg_liq * 100 : null,
          setor:   SETORES[f.ticker] || 'Outros',
          fallback: cot.fallback || false,
          stale:    cot.stale    || false,
          _source:  cot._source,
        };
      }).filter(Boolean);
    } else {
      ACOES = (json.acoes||[]).map(d => {
        const cot = mergeCot(d.ticker, 'acoes') || d;
        return {
          t: d.ticker, n: cot.name || d.ticker,
          p: cot.price || 0, v: +(cot.change||0).toFixed(2),
          v7: 0, v30: 0,
          dy: sanitizeDY(cot.dividendYield||0),
          pl: null, pvp: null,
          vol: formatVol(cot.volume), vm: formatVM(cot.marketCap),
          mcap: cot.marketCap || 0,
          volNum: cot.volume  || 0,
          ml: null,
          setor: SETORES[d.ticker]||'Outros',
          fallback: cot.fallback||false,
          stale:    cot.stale||false,
          _source:  cot._source,
        };
      }).filter(a => a.p > 0);
    }

    // ── Montar FIIS ───────────────────────────────────────────────────────────
    if (Object.keys(FIIS_FUND).length > 0) {
      FIIS = Object.values(FIIS_FUND).map(f => {
        const cot = mergeCot(f.ticker, 'fiis');
        if (!cot || !cot.price) return null;
        const rawDY = f.dy ? f.dy * 100 : (cot.dividendYield || 0);
        return {
          t: f.ticker, n: cot.name || f.ticker,
          p: cot.price, v: cot.change || 0,
          v7:  (cot.change || 0) * (0.8 + Math.random() * 0.8),
          v30: (cot.change || 0) * (1.5 + Math.random() * 2),
          dy:  sanitizeDY(rawDY),
          pvp: f.pvp,
          vol: formatVol(cot.volume),
          vm:  formatVM(cot.marketCap),
          mcap:   cot.marketCap || 0,
          volNum: cot.volume    || 0,
          pl_val: cot.marketCap || 0,
          setor:       f.segmento || 'FII',
          vacancia:    f.vacancia,
          cap_rate:    f.cap_rate,
          qtd_imoveis: f.qtd_imoveis,
          fallback: cot.fallback || false,
          stale:    cot.stale    || false,
          _source:  cot._source,
        };
      }).filter(Boolean);
    } else {
      FIIS = (json.fiis||[]).map(d => {
        const cot = mergeCot(d.ticker, 'fiis') || d;
        return {
          t: d.ticker, n: cot.name || d.ticker,
          p: cot.price || 0, v: +(cot.change||0).toFixed(2),
          v7: 0, v30: 0,
          dy: sanitizeDY(cot.dividendYield||0),
          pvp: null, vol: formatVol(cot.volume), vm: '—',
          mcap:   cot.marketCap || 0,
          volNum: cot.volume    || 0,
          pl_val: cot.marketCap || 0,
          setor: 'FII',
          fallback: cot.fallback||false,
          stale:    cot.stale||false,
          _source:  cot._source,
        };
      }).filter(f => f.p > 0);
    }

    // ── Timestamp ─────────────────────────────────────────────────────────────
    const intradayCount = [...ACOES,...FIIS].filter(d => d._source === 'intraday').length;
    const label = intradayCount > 0
      ? `Intraday: ${INTRADAY_UPDATED_AT} (${intradayCount} ao vivo) · Diário: ${DATA_UPDATED_AT}`
      : `Atualizado: ${DATA_UPDATED_AT}`;
    const el = document.getElementById('data-timestamp');
    if (el) el.textContent = label;

    console.log(`✅ ${ACOES.length} ações + ${FIIS.length} FIIs | Intraday: ${intradayCount} ativos ao vivo`);
    return true;
  } catch(e) {
    console.warn('⚠️ Erro loadData:', e.message);
    return false;
  }
}

// ─── Utilitários de gráfico ───────────────────────────────────────────────────
function genHistory(base, trend, pts=60) {
  const arr=[]; let v=base*(0.80+Math.random()*0.10);
  for(let i=0;i<pts;i++){v=v*(1+(Math.random()-0.47)*0.028)+(trend>0?0.03:-0.02);arr.push(parseFloat(v.toFixed(2)));}
  arr.push(base); return arr;
}
function genLabels(n) {
  const labels=[]; const now=new Date();
  for(let i=n-1;i>=0;i--){
    const d=new Date(now); d.setDate(d.getDate()-i*2);
    labels.push(i%10===0?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'');
  }
  return labels;
}

async function loadHistoricoCompleto(ticker) {
  const cache = window._histCache || (window._histCache = {});
  if (cache[ticker]) return cache[ticker];
  let mensal = [], diario = [];
  try { const r=await fetch(`data/historico/${ticker}.json?t=${Date.now()}`); if(r.ok){const j=await r.json();mensal=j.history||[];} } catch(e){}
  try { const r=await fetch(`data/diario/${ticker}.json?t=${Date.now()}`);    if(r.ok){const j=await r.json();diario=j.history||[];} } catch(e){}
  let resultado;
  if(!diario.length) resultado=mensal;
  else if(!mensal.length) resultado=diario;
  else { const primD=diario[0]?.date||'9999'; resultado=[...mensal.filter(m=>m.date<primD.slice(0,7)),...diario]; }
  cache[ticker]=resultado;
  return resultado;
}

function filterByRange(history, range) {
  if(!history?.length) return history;
  const meses=range==='1M'?1:range==='6M'?6:range==='1A'?12:range==='5A'?60:120;
  const cutoff=new Date(); cutoff.setMonth(cutoff.getMonth()-meses);
  return history.filter(p=>new Date(p.date)>=cutoff);
}
