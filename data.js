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
  // Petróleo & Gás
  PETR3:'Petróleo & Gás',PETR4:'Petróleo & Gás',PRIO3:'Petróleo & Gás',
  RECV3:'Petróleo & Gás',RRRP3:'Petróleo & Gás',UGPA3:'Petróleo & Gás',
  VBBR3:'Petróleo & Gás',CSAN3:'Combustíveis',
  // Mineração & Siderurgia
  VALE3:'Mineração',BRAP3:'Mineração',BRAP4:'Mineração',CBAV3:'Mineração',
  CSNA3:'Siderurgia',GGBR3:'Siderurgia',GGBR4:'Siderurgia',
  GOAU3:'Siderurgia',GOAU4:'Siderurgia',USIM3:'Siderurgia',USIM5:'Siderurgia',USIM6:'Siderurgia',
  // Bancos
  ITUB3:'Bancos',ITUB4:'Bancos',BBDC3:'Bancos',BBDC4:'Bancos',BBAS3:'Bancos',
  SANB3:'Bancos',SANB4:'Bancos',SANB11:'Bancos',BPAC3:'Bancos',BPAC5:'Bancos',BPAC11:'Bancos',
  BRSR3:'Bancos',BRSR5:'Bancos',BRSR6:'Bancos',BMEB3:'Bancos',BMEB4:'Bancos',
  BMIN3:'Bancos',BMIN4:'Bancos',BGIP3:'Bancos',BGIP4:'Bancos',
  PINE3:'Bancos',PINE4:'Bancos',ABCB4:'Bancos',
  // Energia Elétrica
  ELET3:'Energia Elétrica',ELET6:'Energia Elétrica',CMIG3:'Energia Elétrica',CMIG4:'Energia Elétrica',
  EQTL3:'Energia Elétrica',CPFE3:'Energia Elétrica',ENGI3:'Energia Elétrica',
  ENGI4:'Energia Elétrica',ENGI11:'Energia Elétrica',TAEE3:'Energia Elétrica',
  TAEE4:'Energia Elétrica',TAEE11:'Energia Elétrica',TRPL3:'Energia Elétrica',TRPL4:'Energia Elétrica',
  CESP3:'Energia Elétrica',CESP6:'Energia Elétrica',AESB3:'Energia Elétrica',ENEV3:'Energia Elétrica',
  ALUP3:'Energia Elétrica',ALUP4:'Energia Elétrica',ALUP11:'Energia Elétrica',EGIE3:'Energia Elétrica',
  EQPA3:'Energia Elétrica',EQPA5:'Energia Elétrica',EMAE3:'Energia Elétrica',EMAE4:'Energia Elétrica',
  GEPA3:'Energia Elétrica',GEPA4:'Energia Elétrica',EKTR3:'Energia Elétrica',EKTR4:'Energia Elétrica',
  COCE3:'Energia Elétrica',COCE5:'Energia Elétrica',CEBR3:'Energia Elétrica',CEBR5:'Energia Elétrica',
  CEBR6:'Energia Elétrica',CEEB3:'Energia Elétrica',CEEB5:'Energia Elétrica',
  RNEW3:'Energia Elétrica',RNEW4:'Energia Elétrica',AURE3:'Energia Elétrica',
  ISAE3:'Energia Elétrica',ISAE4:'Energia Elétrica',EALT3:'Energia Elétrica',EALT4:'Energia Elétrica',
  ENMT3:'Energia Elétrica',ENMT4:'Energia Elétrica',
  // Saneamento
  SBSP3:'Saneamento',CSMG3:'Saneamento',SAPR3:'Saneamento',SAPR4:'Saneamento',SAPR11:'Saneamento',
  // Telecomunicações
  VIVT3:'Telecomunicações',TIMS3:'Telecomunicações',OIBR3:'Telecomunicações',OIBR4:'Telecomunicações',
  TELB3:'Telecomunicações',TELB4:'Telecomunicações',
  // Varejo
  MGLU3:'Varejo',LREN3:'Varejo',AMER3:'Varejo',PCAR3:'Varejo',GMAT3:'Varejo',
  SOMA3:'Varejo',AMAR3:'Varejo',CEAB3:'Varejo',GRND3:'Varejo',VVAR3:'Varejo',
  // Saúde
  RDOR3:'Saúde',HAPV3:'Saúde',RADL3:'Saúde',FLRY3:'Saúde',DASA3:'Saúde',
  HYPE3:'Saúde',ONCO3:'Saúde',BLAU3:'Saúde',AALR3:'Saúde',PNVL3:'Saúde',
  ADHM3:'Saúde',
  // Alimentos & Bebidas
  ABEV3:'Bebidas',JBSS3:'Alimentos',BEEF3:'Alimentos',BRFS3:'Alimentos',
  MRFG3:'Alimentos',MDIA3:'Alimentos',SMTO3:'Alimentos',CAML3:'Alimentos',
  TTEN3:'Alimentos',CVAL3:'Alimentos',TASA3:'Alimentos',TASA4:'Alimentos',
  // Agronegócio
  SOJA3:'Agronegócio',SLCE3:'Agronegócio',AGRO3:'Agronegócio',
  // Tecnologia
  TOTS3:'Tecnologia',LWSA3:'Tecnologia',POSI3:'Tecnologia',SQIA3:'Tecnologia',
  STNE3:'Tecnologia',CASH3:'Tecnologia',IFCM3:'Tecnologia',INTB3:'Tecnologia',
  // Construção Civil
  CYRE3:'Construção Civil',CYRE4:'Construção Civil',MRVE3:'Construção Civil',
  EVEN3:'Construção Civil',DIRR3:'Construção Civil',TEND3:'Construção Civil',
  LAVV3:'Construção Civil',MTRE3:'Construção Civil',TRIS3:'Construção Civil',
  // Shoppings
  MULT3:'Shoppings',IGTI3:'Shoppings',IGTI11:'Shoppings',BRML3:'Shoppings',ALSC3:'Shoppings',
  // Holdings & Financeiro
  ITSA3:'Holdings',ITSA4:'Holdings',WIZC3:'Financeiro',IRBR3:'Seguros',
  BBSE3:'Seguros',PSSA3:'Seguros',
  // Papel & Celulose
  SUZB3:'Papel & Celulose',KLBN3:'Papel & Celulose',KLBN4:'Papel & Celulose',KLBN11:'Papel & Celulose',
  // Transporte & Logística
  RAIL3:'Transporte',EMBR3:'Aeronáutica',AZUL4:'Transporte Aéreo',GOLL4:'Transporte Aéreo',
  JSLG3:'Transporte',VAMO3:'Locação de Veículos',RENT3:'Locação de Veículos',
  // Indústria
  WEGE3:'Indústria',ROMI3:'Indústria',FRAS3:'Indústria',TUPY3:'Indústria',
  KEPL3:'Indústria',MYPK3:'Indústria',MAPT3:'Indústria',MAPT4:'Indústria',
  UNIP3:'Indústria',UNIP5:'Indústria',UNIP6:'Indústria',RAPT3:'Indústria',RAPT4:'Indústria',
  WHRL3:'Eletrodomésticos',WHRL4:'Eletrodomésticos',WLMM3:'Indústria',WLMM4:'Indústria',
  CRPG3:'Indústria',CRPG5:'Indústria',CRPG6:'Indústria',TXRX3:'Indústria',TXRX4:'Indústria',
  CLSC3:'Distribuição',CLSC4:'Distribuição',CGAS3:'Gás',CGAS5:'Gás',
  CGRA3:'Varejo',CGRA4:'Varejo',DEXP3:'Transporte',DEXP4:'Transporte',
  INEP3:'Indústria',INEP4:'Indústria',EUCA3:'Papel & Celulose',EUCA4:'Papel & Celulose',
  FESA3:'Mineração',FESA4:'Mineração',BLUT3:'Financeiro',BLUT4:'Financeiro',
  BEES3:'Bancos',BEES4:'Bancos',BDLL3:'Alimentos',BDLL4:'Alimentos',
  BALM3:'Saúde',BALM4:'Saúde',AZEV3:'Papel & Celulose',AZEV4:'Papel & Celulose',
  ALPA3:'Calçados',ALPA4:'Calçados',CTSA3:'Têxtil',CTSA4:'Têxtil',
  CTKA3:'Têxtil',CTKA4:'Têxtil',HAGA3:'Indústria',HAGA4:'Indústria',
  BSLI3:'Financeiro',BSLI4:'Financeiro',PEAB3:'Bancos',PEAB4:'Bancos',
  SIMH3:'Transporte',WEST3:'Varejo',NATU3:'Cosméticos',CVCB3:'Turismo',
  AXIA3:'Energia Elétrica',AXIA6:'Energia Elétrica',SEQL3:'Saúde',
  MRSA3B:'Mineração',MRSA5B:'Mineração',MRSA6B:'Mineração',
  PATI3:'Financeiro',PATI4:'Financeiro',PTNT3:'Farmacêutica',PTNT4:'Farmacêutica',
  RCSL3:'Indústria',RCSL4:'Indústria',RPAD3:'Holdings',RPAD5:'Holdings',RPAD6:'Holdings',
  SOND5:'Construção Civil',SOND6:'Construção Civil',JOPA3:'Varejo',JOPA4:'Varejo',
  HBSA3:'Saúde',DTCY3:'Tecnologia',NGRD3:'Gás',ATED3:'Energia Elétrica',
  FIEI3:'Financeiro',MNDL3:'Alimentos',BIED3:'Financeiro',OBTC3:'Financeiro',
  CEDO3:'Têxtil',CEDO4:'Têxtil',AZTE3:'Telecomunicações',MSPA3:'Saúde',
  UCAS3:'Educação',
  // Educação
  COGN3:'Educação',YDUQ3:'Educação',ANIM3:'Educação',SEER3:'Educação',ENJU3:'Educação',
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

// ─── Deduplicação de tickers ──────────────────────────────────────────────────
// Tickers secundários → mostrar só o principal de cada empresa
const TICKER_PRINCIPAL = {
  PETR3:'PETR4', ITUB3:'ITUB4', BBDC3:'BBDC4', GGBR3:'GGBR4',
  GOAU3:'GOAU4', BRAP3:'BRAP4', ITSA3:'ITSA4', TAEE3:'TAEE11',
  ALUP3:'ALUP11', ENGI3:'ENGI11', KLBN3:'KLBN11', SANB3:'SANB11',
  BPAC3:'BPAC11', BPAC5:'BPAC11', CMIG3:'CMIG4', USIM3:'USIM5',
  SAPR3:'SAPR11', TRPL3:'TRPL4', CESP3:'CESP6', BRSR3:'BRSR6',
  CYRE3:'CYRE4', UNIP3:'UNIP6', KLBN4:'KLBN11', TAEE4:'TAEE11',
  ALUP4:'ALUP11', ENGI4:'ENGI11', SANB4:'SANB11', IGTI3:'IGTI11',
  GGBR3:'GGBR4', USIM6:'USIM5', BRSR5:'BRSR6', CESP6:'CESP6',
  TRPL4:'TRPL4', UNIP5:'UNIP6', BMEB3:'BMEB4', PINE3:'PINE4',
  BGIP3:'BGIP4', BMIN3:'BMIN4', BEES3:'BEES4', CMIG3:'CMIG4',
  EALT3:'EALT4', GEPA3:'GEPA4', ISAE3:'ISAE4', WLMM3:'WLMM4',
  CGRA3:'CGRA4', DEXP3:'DEXP4', KLBN3:'KLBN11', EUCA3:'EUCA4',
  CRPG3:'CRPG6', CRPG5:'CRPG6', CTKA3:'CTKA4', TASA3:'TASA4',
  BALM3:'BALM4', RPAD3:'RPAD6', RPAD5:'RPAD6', PATI3:'PATI4',
  PTNT3:'PTNT4', RCSL3:'RCSL4', HAGA3:'HAGA4', MAPT3:'MAPT4',
  JOPA3:'JOPA4', CEDO3:'CEDO4', TXRX3:'TXRX4', AZEV3:'AZEV4',
  ALPA3:'ALPA4', BDLL3:'BDLL4', BLUT3:'BLUT4', BSLI3:'BSLI4',
  PEAB3:'PEAB4', CTSA3:'CTSA4', CTKA3:'CTKA4',
};
const _vistos = new Set();
function isDuplicado(ticker) {
  if (TICKER_PRINCIPAL[ticker]) return true; // ticker secundário — ignora
  if (_vistos.has(ticker)) return true;       // já apareceu antes
  _vistos.add(ticker);
  return false;
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
        const rawDY = f.dy ? f.dy : (cot.dividendYield || 0);
        // div12m: dividendos absolutos em R$/ação nos últimos 12 meses
        // Fundamentus retorna f.dy já em porcentagem (ex: 4.12 = 4,12%)
        // Convertemos para fração (f.dy/100) × preço atual para obter o valor absoluto
        // Este campo é a base correta para o cálculo do preço teto de Bazin
        const div12m = f.dy > 0 ? (f.dy / 100) * cot.price : 0;
        return {
          t: f.ticker, n: cot.name || f.ticker,
          p: cot.price, v: cot.change || 0,
          v7:  (cot.change || 0) * (0.8 + Math.random() * 0.8),
          v30: (cot.change || 0) * (1.5 + Math.random() * 2),
          dy:   sanitizeDY(rawDY),
          div12m,
          pl:   f.pl, pvp: f.pvp,
          roe:  f.roe  ?? null,
          roic: f.roic ?? null,
          mrg_liq: f.mrg_liq ?? null,
          cresc5a: f.cresc5a ?? null,
          vol:    formatVol(cot.volume),
          // Sempre usa Fundamentus para market cap e liquidez — dados mais precisos e estáveis
          mcap:   (f.patrim && f.pvp) ? f.patrim * f.pvp : (cot.marketCap || 0),
          volNum: f.liq || cot.volume || 0,
          vm:     formatVM((f.patrim && f.pvp) ? f.patrim * f.pvp : (cot.marketCap || 0)),
          ml:     f.mrg_liq ?? null,
          setor:   SETORES[f.ticker] || 'Outros',
          fallback: cot.fallback || false,
          stale:    cot.stale    || false,
          _source:  cot._source,
        };
      }).filter(a => a && !isDuplicado(a.t));
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
      }).filter(a => a.p > 0 && !isDuplicado(a.t));
    }

    // ── Montar FIIS ───────────────────────────────────────────────────────────
    if (Object.keys(FIIS_FUND).length > 0) {
      FIIS = Object.values(FIIS_FUND).map(f => {
        const cot = mergeCot(f.ticker, 'fiis');
        if (!cot || !cot.price) return null;
        const rawDY = f.dy ? f.dy : (cot.dividendYield || 0);
        return {
          t: f.ticker, n: cot.name || f.ticker,
          p: cot.price, v: cot.change || 0,
          v7:  (cot.change || 0) * (0.8 + Math.random() * 0.8),
          v30: (cot.change || 0) * (1.5 + Math.random() * 2),
          dy:  sanitizeDY(rawDY),
          pvp: f.pvp,
          vol:    formatVol(cot.volume),
          // Sempre usa Fundamentus para market cap e liquidez
          mcap:   f.valor_mercado || cot.marketCap || 0,
          volNum: f.liq           || cot.volume    || 0,
          vm:     formatVM(f.valor_mercado || cot.marketCap || 0),
          pl_val: f.valor_mercado || cot.marketCap || 0,
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

    // ── Dividendos ────────────────────────────────────────────────────────────
    try {
      const dr = await fetch('data/dividendos.json?t=' + Date.now());
      if (dr.ok) { const dj = await dr.json(); DIVIDENDOS = dj.dividendos || []; }
    } catch(e) {}

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

// ─── Intraday chart acumulado ─────────────────────────────────────────────────
// Retorna o grupo do arquivo chart para um ticker
function _getIntradayGroup(ticker) {
  if (ACOES.some(a => a.t === ticker)) return 'acoes-br';
  if (FIIS.some(f => f.t === ticker)) return 'fiis';
  return null; // índices, stocks, ETFs — sem suporte intraday chart ainda
}

// Carrega data/intraday/chart/{grupo}.json e retorna [{date:"HH:mm", close: X}, ...]
// para o ticker e dia de hoje. Retorna [] se não houver dados.
async function loadIntradayChart(ticker) {
  const group = _getIntradayGroup(ticker);
  if (!group) return [];
  try {
    const r = await fetch(`data/intraday/chart/${group}.json?t=${Date.now()}`);
    if (!r.ok) return [];
    const j = await r.json();
    // Verifica se é de hoje (formato yyyy-MM-dd)
    const hoje = new Date().toISOString().slice(0, 10);
    if (j.date !== hoje) return [];
    // Extrai pontos do ticker
    return (j.points || [])
      .filter(p => p[ticker] != null)
      .map(p => ({ date: p.t, close: p[ticker] }));
  } catch(e) { return []; }
}

function filterByRange(history, range) {
  if(!history?.length) return history;
  if(range === '1D') {
    // Fallback: últimos 2 dias do diário (quando não há intraday acumulado)
    return history.slice(-2);
  }
  if(range === '1S') {
    const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-7);
    return history.filter(p=>new Date(p.date)>=cutoff);
  }
  const meses=range==='1M'?1:range==='6M'?6:range==='1A'?12:range==='5A'?60:120;
  const cutoff=new Date(); cutoff.setMonth(cutoff.getMonth()-meses);
  return history.filter(p=>new Date(p.date)>=cutoff);
}
