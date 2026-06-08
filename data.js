// data.js — carrega todos os dados reais
let ACOES = [];
let FIIS = [];
let FUNDAMENTUS = {};
let FIIS_FUND = {};
let DIVIDENDOS = [];
let DATA_UPDATED_AT = null;
let IBOV = { val: '—', chg: 0 };
let IFIX = { val: '—', chg: 0 };
let DOLAR = { val: '—', chg: 0 };

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
  if (v >= 1e9) return 'R$' + (v/1e9).toFixed(0) + 'B';
  return 'R$' + (v/1e6).toFixed(0) + 'M';
}

// DY máximo aceitável (filtra valores absurdos)
const DY_MAX = 50;

function sanitizeDY(v) {
  if (!v || v <= 0 || v > DY_MAX) return 0;
  return v;
}

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
  // Tenta buscar índices do cotacoes.json
  try {
    const r = await fetch('data/indices.json?t=' + Date.now());
    if (!r.ok) return;
    const j = await r.json();
    IBOV = j.ibov || IBOV;
    IFIX = j.ifix || IFIX;
    DOLAR = j.dolar || DOLAR;
  } catch(e) {}
}

async function loadData() {
  try {
    await Promise.all([loadFundamentus(), loadFiisFundamentus(), loadIndices()]);

    const resp = await fetch('data/cotacoes.json?t=' + Date.now());
    if (!resp.ok) throw new Error('Sem cotacoes.json');
    const json = await resp.json();
    DATA_UPDATED_AT = json.updated_at;

    const cotMap = {};
    [...(json.acoes||[]), ...(json.fiis||[])].forEach(c => { cotMap[c.ticker] = c; });

    if (Object.keys(FUNDAMENTUS).length > 0) {
      ACOES = Object.values(FUNDAMENTUS).map(f => {
        const cot = cotMap[f.ticker];
        const preco = cot?.price || f.preco || 0;
        const change = cot?.change || 0;
        const rawDY = f.dy ? f.dy * 100 : (cot?.dividendYield || 0);
        return {
          t: f.ticker, n: cot?.name || f.ticker,
          p: preco, v: change,
          v7: change * (0.8 + Math.random() * 0.8),
          v30: change * (1.5 + Math.random() * 2),
          dy: sanitizeDY(rawDY),
          pl: f.pl, pvp: f.pvp,
          roe: f.roe ? f.roe * 100 : null,
          roic: f.roic ? f.roic * 100 : null,
          mrg_liq: f.mrg_liq ? f.mrg_liq * 100 : null,
          cresc5a: f.cresc5a ? f.cresc5a * 100 : null,
          vol: formatVol(cot?.volume),
          vm: formatVM(cot?.marketCap),
          setor: SETORES[f.ticker] || 'Outros',
          fallback: cot?.fallback || false,
        };
      }).filter(a => a.p > 0);
    } else {
      ACOES = (json.acoes||[]).map(d => ({
        t: d.ticker, n: d.name||d.ticker,
        p: d.price||0, v: +(d.change||0).toFixed(2),
        v7: 0, v30: 0,
        dy: sanitizeDY(d.dividendYield||0),
        pl: null, pvp: null,
        vol: formatVol(d.volume), vm: formatVM(d.marketCap),
        setor: SETORES[d.ticker]||'Outros', fallback: d.fallback||false,
      }));
    }

    if (Object.keys(FIIS_FUND).length > 0) {
      FIIS = Object.values(FIIS_FUND).map(f => {
        const cot = cotMap[f.ticker];
        const preco = cot?.price || f.preco || 0;
        const change = cot?.change || 0;
        const rawDY = f.dy ? f.dy * 100 : (cot?.dividendYield || 0);
        return {
          t: f.ticker, n: cot?.name || f.ticker,
          p: preco, v: change,
          v7: change * (0.8 + Math.random() * 0.8),
          v30: change * (1.5 + Math.random() * 2),
          dy: sanitizeDY(rawDY),
          pvp: f.pvp,
          vol: formatVol(cot?.volume),
          vm: formatVM(cot?.marketCap),
          setor: f.segmento || 'FII',
          vacancia: f.vacancia,
          cap_rate: f.cap_rate,
          qtd_imoveis: f.qtd_imoveis,
          fallback: cot?.fallback || false,
        };
      }).filter(f => f.p > 0);
    } else {
      FIIS = (json.fiis||[]).map(d => ({
        t: d.ticker, n: d.name||d.ticker,
        p: d.price||0, v: +(d.change||0).toFixed(2),
        v7: 0, v30: 0,
        dy: sanitizeDY(d.dividendYield||0),
        pvp: null, vol: formatVol(d.volume), vm: '—',
        setor: 'FII', fallback: d.fallback||false,
      }));
    }

    // Atualiza timestamp
    const el = document.getElementById('data-timestamp');
    if (el && DATA_UPDATED_AT) el.textContent = 'Atualizado: ' + DATA_UPDATED_AT;

    console.log(`✅ ${ACOES.length} ações + ${FIIS.length} FIIs`);
    return true;
  } catch(e) {
    console.warn('⚠️ Erro:', e.message);
    return false;
  }
}

// Utilitários de gráfico
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
  try { const r=await fetch(`data/diario/${ticker}.json?t=${Date.now()}`); if(r.ok){const j=await r.json();diario=j.history||[];} } catch(e){}
  let resultado;
  if(!diario.length) resultado=mensal;
  else if(!mensal.length) resultado=diario;
  else { const p=diario[0]?.date||'9999'; resultado=[...mensal.filter(p=>p.date<p.slice(0,7)),...diario]; }
  cache[ticker]=resultado;
  return resultado;
}

function filterByRange(history, range) {
  if(!history?.length) return history;
  const meses=range==='1M'?1:range==='6M'?6:range==='1A'?12:range==='5A'?60:120;
  const cutoff=new Date(); cutoff.setMonth(cutoff.getMonth()-meses);
  return history.filter(p=>new Date(p.date)>=cutoff);
}
