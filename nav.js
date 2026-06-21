// ── Sentry — monitoramento de erros ──────────────────────────────
(function() {
  const s = document.createElement('script');
  s.src = 'https://browser.sentry-cdn.com/7.99.0/bundle.min.js';
  s.crossOrigin = 'anonymous';
  s.onload = function() {
    if (window.Sentry) {
      Sentry.init({
        dsn: 'https://5c73ae0a2da83db6c80acffed3530730@o4511545034932224.ingest.de.sentry.io/4511545047187536',
        environment: location.hostname.includes('localhost') ? 'development' : 'production',
        tracesSampleRate: 0.1,
      });
    }
  };
  document.head.appendChild(s);
})();

// ── Google Analytics ─────────────────────────────────────────────
(function() {
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-MXYNF830JM';
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-MXYNF830JM');
})();

const LOGO_SVG_HTML = `<svg viewBox="0 0 530 530" xmlns="http://www.w3.org/2000/svg" style="display:block;border-radius:12px;overflow:hidden;flex-shrink:0">
  <rect width="530" height="530" fill="#C90D08"/>
  <path fill="#FFD76A" d="M459 58 L346 125 L387 142 L365 181 L296 277 L258 315 L212 349 L174 367 L147 374 L110 376 L89 372 L67 362 L49 345 L37 324 L32 302 L31 349 L52 392 L70 409 L94 422 L150 429 L196 420 L230 407 L298 365 L337 329 L377 280 L441 171 L475 192 L480 191 Z"/>
  <path fill="#FFD76A" d="M399 303 L384 326 L358 359 L318 398 L283 424 L258 438 L222 452 L190 459 L161 460 L178 465 L200 468 L237 467 L278 458 L315 441 L340 421 L361 395 L383 353 L397 314 Z"/>
</svg>`;

const NAV_LINKS = [
  { href: 'index.html',        label: 'Home' },
  { href: 'acoes.html',        label: 'Ações' },
  { href: 'fiis.html',         label: 'FIIs' },
  { href: 'criptos.html',      label: 'Criptos' },
  { href: 'dividendos.html',   label: 'Dividendos' },
  { href: 'rankings.html',     label: 'Rankings' },
  { href: 'comparador.html',   label: 'Comparador' },
  { href: 'ferramentas.html',  label: 'Ferramentas' },
  { href: 'analise.html',      label: '✦ Análise' },
  { href: 'watchlist.html',    label: '★ Watchlist' },
  { href: 'simulador.html',    label: 'Simulador' },
  { href: 'Consolidador/index.html', label: 'Carteira' },
  { href: 'status.html',       label: '● Status' },
];

// ── Ícones SVG dourados do dropdown Ativos (mesmo estilo do Simulador Backtest) ──
const ATIVO_ICONS = {
  acoes: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="#e0b84a" stroke-width="5" stroke-opacity="0.22"/><polyline points="16 7 22 7 22 13" stroke="#e0b84a" stroke-width="5" stroke-opacity="0.22"/><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="#e0b84a" stroke-width="1.5"/><polyline points="16 7 22 7 22 13" stroke="#e0b84a" stroke-width="1.5"/></svg>`,
  fiis: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6" stroke="#e0b84a" stroke-width="5" stroke-opacity="0.22"/><path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6" stroke="#e0b84a" stroke-width="1.5"/></svg>`,
  dividendos: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><circle cx="12" cy="12" r="9" stroke="#e0b84a" stroke-width="5" stroke-opacity="0.22"/><circle cx="12" cy="12" r="9" fill="#e0b84a" fill-opacity="0.12" stroke="#e0b84a" stroke-width="1.5"/><path d="M12 7v10M9.6 9.2c0-1.1 1.1-1.7 2.4-1.7s2.5.7 2.5 1.8c0 2.3-4.9 1.3-4.9 3.5 0 1.1 1.1 1.8 2.4 1.8s2.5-.6 2.5-1.7" stroke="#e0b84a" stroke-width="1.3"/></svg>`,
  criptos: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894M10.551 19.089L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 5.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" stroke="#e0b84a" stroke-width="5" stroke-opacity="0.22"/><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894M10.551 19.089L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 5.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" stroke="#e0b84a" stroke-width="1.5"/></svg>`,
  bdrs: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><circle cx="12" cy="12" r="10" fill="#e0b84a" fill-opacity="0.12" stroke="#e0b84a" stroke-width="1.5"/><line x1="2" y1="12" x2="22" y2="12" stroke="#e0b84a" stroke-width="1" stroke-opacity="0.75"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#e0b84a" stroke-width="1" stroke-opacity="0.75"/></svg>`,
  etfs: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="#e0b84a" fill-opacity="0.15" stroke="#e0b84a" stroke-width="1.4" stroke-linejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="#e0b84a" stroke-width="1.4"/><path d="M16 10a4 4 0 0 1-8 0" stroke="#e0b84a" stroke-width="1.4"/></svg>`,
  reits: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6" stroke="#e0b84a" stroke-width="5" stroke-opacity="0.22"/><path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6" stroke="#e0b84a" stroke-width="1.5"/></svg>`,
  stocks: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><circle cx="12" cy="12" r="10" fill="#e0b84a" fill-opacity="0.12" stroke="#e0b84a" stroke-width="1.5"/><line x1="2" y1="12" x2="22" y2="12" stroke="#e0b84a" stroke-width="1" stroke-opacity="0.75"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#e0b84a" stroke-width="1" stroke-opacity="0.75"/></svg>`,
  rankings: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" stroke="#e0b84a" stroke-width="5" stroke-opacity="0.22"/><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" fill="#e0b84a" fill-opacity="0.15" stroke="#e0b84a" stroke-width="1.5"/><path d="M7 5H4.5v1.5A3 3 0 0 0 7 9.5M17 5h2.5v1.5A3 3 0 0 1 17 9.5M9.5 21h5M12 13.5V21" stroke="#e0b84a" stroke-width="1.4"/></svg>`,
};

// ── Ícones SVG dourados do dropdown Ferramentas (mesmo estilo) ──
const FERRAMENTA_ICONS = {
  simulador: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><rect x="4" y="11" width="3.5" height="9" rx="1" fill="#e0b84a" fill-opacity="0.15" stroke="#e0b84a" stroke-width="1.4"/><rect x="10.25" y="7" width="3.5" height="13" rx="1" fill="#e0b84a" fill-opacity="0.15" stroke="#e0b84a" stroke-width="1.4"/><rect x="16.5" y="4" width="3.5" height="16" rx="1" fill="#e0b84a" fill-opacity="0.15" stroke="#e0b84a" stroke-width="1.4"/></svg>`,
  calculadora: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><rect x="5" y="3" width="14" height="18" rx="2" fill="#e0b84a" fill-opacity="0.13" stroke="#e0b84a" stroke-width="1.4"/><rect x="7.5" y="5.5" width="9" height="3" rx="0.6" stroke="#e0b84a" stroke-width="1.2"/><circle cx="8.5" cy="12" r="0.9" fill="#e0b84a"/><circle cx="12" cy="12" r="0.9" fill="#e0b84a"/><circle cx="15.5" cy="12" r="0.9" fill="#e0b84a"/><circle cx="8.5" cy="15.5" r="0.9" fill="#e0b84a"/><circle cx="12" cy="15.5" r="0.9" fill="#e0b84a"/><circle cx="15.5" cy="15.5" r="0.9" fill="#e0b84a"/></svg>`,
  comparador: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M12 3v18M5 7h14M8 21h8" stroke="#e0b84a" stroke-width="1.4"/><path d="M5 7l-2.5 6a3 3 0 0 0 5 0L5 7zM19 7l-2.5 6a3 3 0 0 0 5 0L19 7z" fill="#e0b84a" fill-opacity="0.13" stroke="#e0b84a" stroke-width="1.4"/></svg>`,
  analise: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3z" fill="#e0b84a" fill-opacity="0.15" stroke="#e0b84a" stroke-width="1.3"/><path d="M18 15l.7 1.8 1.8.7-1.8.7L18 20l-.7-1.8-1.8-.7 1.8-.7L18 15z" fill="#e0b84a" fill-opacity="0.2" stroke="#e0b84a" stroke-width="1"/></svg>`,
  outras: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle"><path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L3 18l3 3 6.5-6.5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.1-.6-.6-2.1 2.4-2.4z" fill="#e0b84a" fill-opacity="0.13" stroke="#e0b84a" stroke-width="1.4"/></svg>`,
};

// ── Theme toggle ─────────────────────────────────────────────────
function getTheme() { return localStorage.getItem('mv_theme') || 'dark'; }
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('mv_theme', t);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() { applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

// ── Logo helper ───────────────────────────────────────────────────
function logoHtml(ticker, size = 32, cls = 'asset-logo') {
  const initials = ticker.replace(/\d+/g, '').slice(0, 3) || ticker.slice(0, 3);
  const avCls = size <= 26 ? 'logo-sm-avatar' : 'logo-avatar';
  return `<img
    src="https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${ticker}.png"
    style="width:${size}px;height:${size}px;border-radius:50%;object-fit:contain;background:#fff;flex-shrink:0"
    onerror="this.outerHTML='<div class=\\'${avCls}\\' style=\\'width:${size}px;height:${size}px;font-size:${Math.round(size*0.35)}px\\'>${initials}</div>'"
    loading="lazy">`;
}
window.logoHtml = logoHtml;

// ── Score fundamentalista ─────────────────────────────────────────
function calcScore(d) {
  if (!d) return null;
  let pts = 0, max = 0;
  const isFii = d.t && /\d{2}$/.test(d.t);
  // Base FIXA: dado faltando NÃO infla mais o score. Antes o total possível só
  // contava indicadores presentes, então microcap com poucos dados chegava a 100.
  // Agora cada indicador ausente simplesmente não pontua (mas conta na base).
  if (isFii) {
    max += 30; if (d.dy >= 8 && d.dy <= 25) pts += 30; else if (d.dy >= 5) pts += 15;
    max += 40; if (d.pvp > 0 && d.pvp <= 0.95) pts += 40; else if (d.pvp > 0 && d.pvp <= 1.05) pts += 20;
    max += 30; if (d.v30 >= 0) pts += 30; else if (d.v30 >= -5) pts += 15;
  } else {
    max += 25; if (d.pl > 0 && d.pl <= 15) pts += 25; else if (d.pl > 0 && d.pl <= 25) pts += 12;
    max += 15; if (d.pvp > 0 && d.pvp < 1) pts += 15; else if (d.pvp > 0 && d.pvp < 1.5) pts += 8;
    max += 20; if (d.dy >= 6) pts += 20; else if (d.dy >= 3) pts += 10;
    max += 20; if (d.roe >= 15) pts += 20; else if (d.roe >= 10) pts += 10;
    max += 10; if (d.roic >= 12) pts += 10; else if (d.roic >= 8) pts += 5;
    max += 10; if (d.mrg_liq > 10) pts += 10; else if (d.mrg_liq > 0) pts += 5;
  }
  if (!max) return null;
  return Math.round((pts / max) * 100);
}
window.calcScore = calcScore;

function scoreBadge(d) {
  const s = calcScore(d);
  if (s === null) return '';
  const cls = s >= 65 ? 'score-a' : s >= 40 ? 'score-b' : 'score-c';
  const lbl = s >= 65 ? 'A' : s >= 40 ? 'B' : 'C';
  return `<span class="score-badge ${cls}" title="Score fundamentalista: ${s}/100">${lbl} ${s}</span>`;
}
window.scoreBadge = scoreBadge;

// ── Base path (para subpastas como /Consolidador/) ────────────────
const NAV_BASE = window.NAV_BASE_PATH || '';

// ── BCB data ──────────────────────────────────────────────────────
async function loadBCBNav() {
  try {
    const r = await fetch(NAV_BASE + 'data/bcb.json?t=' + Date.now());
    if (!r.ok) return;
    const j = await r.json();
    window.BCB_DATA = j;
    if (j.cdi?.anual) {
      document.querySelectorAll('.tk-selic').forEach(el => { el.textContent = j.cdi.anual.toFixed(2) + '%'; });
    }
    if (j.ipca?.acumulado_12m) {
      document.querySelectorAll('.tk-ipca').forEach(el => { el.textContent = j.ipca.acumulado_12m.toFixed(2) + '%'; });
    }
  } catch(e) {}
}

// ── Verifica se hoje é dia de COPOM ──────────────────────────────
function isCopomDay() {
  const COPOM_DATES = [
    '2025-01-29','2025-03-19','2025-05-07','2025-06-18',
    '2025-07-30','2025-09-17','2025-11-05','2025-12-10',
    '2026-01-28','2026-03-18','2026-05-06','2026-06-17',
    '2026-07-29','2026-09-16','2026-11-04','2026-12-09',
  ];
  const today = new Date().toISOString().slice(0, 10);
  return COPOM_DATES.includes(today);
}

// ── Live indices ──────────────────────────────────────────────────
// Índices BR/EUA vêm do indices.json gerado pelo Actions (brapi com token via Secret).
// AwesomeAPI é gratuita e usada aqui para câmbio e cripto em tempo real.
// A brapi NÃO é chamada no browser — evita consumo do limite gratuito.
async function fetchLiveIndices() {
  const result = {};
  await Promise.allSettled([
    // Câmbio ao vivo
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,JPY-BRL,ARS-BRL')
      .then(r => r.json())
      .then(d => {
        if (d.USDBRL?.bid) result.dolar = { val: +parseFloat(d.USDBRL.bid).toFixed(4), chg: +parseFloat(d.USDBRL.pctChange).toFixed(2) };
        if (d.EURBRL?.bid) result.euro  = { val: +parseFloat(d.EURBRL.bid).toFixed(4), chg: +parseFloat(d.EURBRL.pctChange).toFixed(2) };
        if (d.GBPBRL?.bid) result.gbp   = { val: +parseFloat(d.GBPBRL.bid).toFixed(4), chg: +parseFloat(d.GBPBRL.pctChange).toFixed(2) };
        if (d.JPYBRL?.bid) result.jpy   = { val: +parseFloat(d.JPYBRL.bid).toFixed(4), chg: +parseFloat(d.JPYBRL.pctChange).toFixed(2) };
        if (d.ARSBRL?.bid) result.ars   = { val: +parseFloat(d.ARSBRL.bid).toFixed(4), chg: +parseFloat(d.ARSBRL.pctChange).toFixed(2) };
      }).catch(() => {}),
    // Cripto ao vivo
    fetch('https://economia.awesomeapi.com.br/json/last/BTC-USD,ETH-USD,SOL-USD,BNB-USD')
      .then(r => r.json())
      .then(d => {
        if (d.BTCUSD?.bid) result.btc = { val: +parseFloat(d.BTCUSD.bid).toFixed(0), chg: +parseFloat(d.BTCUSD.pctChange).toFixed(2) };
        if (d.ETHUSD?.bid) result.eth = { val: +parseFloat(d.ETHUSD.bid).toFixed(0), chg: +parseFloat(d.ETHUSD.pctChange).toFixed(2) };
        if (d.SOLUSD?.bid) result.sol = { val: +parseFloat(d.SOLUSD.bid).toFixed(2), chg: +parseFloat(d.SOLUSD.pctChange).toFixed(2) };
        if (d.BNBUSD?.bid) result.bnb = { val: +parseFloat(d.BNBUSD.bid).toFixed(2), chg: +parseFloat(d.BNBUSD.pctChange).toFixed(2) };
      }).catch(() => {}),
  ]);
  return result;
}

function fmtNum(v, dec = 0) {
  if (!v?.val || v.val <= 0) return '—';
  return v.val.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function chgClass(v) { return (v?.chg || 0) >= 0 ? 'up-pill' : 'dn-pill'; }
function chgStr(v)   { return v?.chg != null ? `${v.chg >= 0 ? '+' : ''}${v.chg.toFixed(2)}%` : ''; }
function pillHtml(v) { return v?.val > 0 ? `<span class="pill ${chgClass(v)}">${chgStr(v)}</span>` : ''; }

async function loadIndicesNav() {
  const [jsonResult, liveResult] = await Promise.allSettled([
    fetch(NAV_BASE + 'data/indices.json?t=' + Date.now()).then(r => r.ok ? r.json() : {}),
    fetchLiveIndices(),
  ]);

  const fromJson = jsonResult.status === 'fulfilled' ? (jsonResult.value || {}) : {};
  const fromLive = liveResult.status  === 'fulfilled' ? (liveResult.value || {}) : {};

  // Live (AwesomeAPI) tem prioridade; fallback para JSON do Actions
  const pick = (key) => {
    const live = fromLive[key], json = fromJson[key];
    if (live?.val && live.val > 0) return live;
    if (json?.val && json.val > 0) return json;
    return null;
  };

  const j = {
    ibov:     pick('ibov'),
    ifix:     pick('ifix'),
    small:    pick('small'),
    idiv:     pick('idiv'),
    ibra:     pick('ibra'),
    ifnc:     pick('ifnc'),
    sp500:    pick('sp500'),
    nasdaq:   pick('nasdaq'),
    dow:      pick('dow'),
    russell:  pick('russell'),
    dolar:    pick('dolar'),
    euro:     pick('euro'),
    gbp:      pick('gbp'),
    jpy:      pick('jpy'),
    ars:      pick('ars'),
    btc:      pick('btc'),
    eth:      pick('eth'),
    sol:      pick('sol'),
    bnb:      pick('bnb'),
    ouro:     pick('ouro'),
    prata:    pick('prata'),
    petroleo: pick('petroleo'),
  };

  const buildTickerItems = () => {
    const items = [];
    // Índices BR
    if (j.ibov)     items.push(`<div class="ticker-item"><span class="ticker-name">IBOV</span><span class="ticker-val">${fmtNum(j.ibov)}</span>${pillHtml(j.ibov)}</div>`);
    if (j.ifix)     items.push(`<div class="ticker-item"><span class="ticker-name">IFIX</span><span class="ticker-val">${fmtNum(j.ifix)}</span>${pillHtml(j.ifix)}</div>`);
    if (j.small)    items.push(`<div class="ticker-item"><span class="ticker-name">SMALL</span><span class="ticker-val">${fmtNum(j.small)}</span>${pillHtml(j.small)}</div>`);
    if (j.idiv)     items.push(`<div class="ticker-item"><span class="ticker-name">IDIV</span><span class="ticker-val">${fmtNum(j.idiv)}</span>${pillHtml(j.idiv)}</div>`);
    if (j.ibra)     items.push(`<div class="ticker-item"><span class="ticker-name">IBrA</span><span class="ticker-val">${fmtNum(j.ibra)}</span>${pillHtml(j.ibra)}</div>`);
    if (j.ifnc)     items.push(`<div class="ticker-item"><span class="ticker-name">IFNC</span><span class="ticker-val">${fmtNum(j.ifnc)}</span>${pillHtml(j.ifnc)}</div>`);
    // Índices EUA
    if (j.sp500)    items.push(`<div class="ticker-item"><span class="ticker-name">S&P 500</span><span class="ticker-val">${fmtNum(j.sp500)}</span>${pillHtml(j.sp500)}</div>`);
    if (j.nasdaq)   items.push(`<div class="ticker-item"><span class="ticker-name">NASDAQ</span><span class="ticker-val">${fmtNum(j.nasdaq)}</span>${pillHtml(j.nasdaq)}</div>`);
    if (j.dow)      items.push(`<div class="ticker-item"><span class="ticker-name">DOW</span><span class="ticker-val">${fmtNum(j.dow)}</span>${pillHtml(j.dow)}</div>`);
    if (j.russell)  items.push(`<div class="ticker-item"><span class="ticker-name">RUSSELL</span><span class="ticker-val">${fmtNum(j.russell)}</span>${pillHtml(j.russell)}</div>`);
    // Câmbio
    if (j.dolar)    items.push(`<div class="ticker-item"><span class="ticker-name">USD/BRL</span><span class="ticker-val">R$${fmtNum(j.dolar,4)}</span>${pillHtml(j.dolar)}</div>`);
    if (j.euro)     items.push(`<div class="ticker-item"><span class="ticker-name">EUR/BRL</span><span class="ticker-val">R$${fmtNum(j.euro,4)}</span>${pillHtml(j.euro)}</div>`);
    if (j.gbp)      items.push(`<div class="ticker-item"><span class="ticker-name">GBP/BRL</span><span class="ticker-val">R$${fmtNum(j.gbp,4)}</span>${pillHtml(j.gbp)}</div>`);
    if (j.jpy)      items.push(`<div class="ticker-item"><span class="ticker-name">JPY/BRL</span><span class="ticker-val">R$${fmtNum(j.jpy,4)}</span>${pillHtml(j.jpy)}</div>`);
    if (j.ars)      items.push(`<div class="ticker-item"><span class="ticker-name">ARS/BRL</span><span class="ticker-val">R$${fmtNum(j.ars,4)}</span>${pillHtml(j.ars)}</div>`);
    // Commodities
    if (j.ouro)     items.push(`<div class="ticker-item"><span class="ticker-name">OURO</span><span class="ticker-val">US$${fmtNum(j.ouro,0)}</span>${pillHtml(j.ouro)}</div>`);
    if (j.prata)    items.push(`<div class="ticker-item"><span class="ticker-name">PRATA</span><span class="ticker-val">US$${fmtNum(j.prata,2)}</span>${pillHtml(j.prata)}</div>`);
    if (j.petroleo) items.push(`<div class="ticker-item"><span class="ticker-name">PETRÓLEO</span><span class="ticker-val">US$${fmtNum(j.petroleo,2)}</span>${pillHtml(j.petroleo)}</div>`);
    // Cripto
    if (j.btc)      items.push(`<div class="ticker-item"><span class="ticker-name">BTC</span><span class="ticker-val">US$${fmtNum(j.btc,0)}</span>${pillHtml(j.btc)}</div>`);
    if (j.eth)      items.push(`<div class="ticker-item"><span class="ticker-name">ETH</span><span class="ticker-val">US$${fmtNum(j.eth,0)}</span>${pillHtml(j.eth)}</div>`);
    if (j.sol)      items.push(`<div class="ticker-item"><span class="ticker-name">SOL</span><span class="ticker-val">US$${fmtNum(j.sol,2)}</span>${pillHtml(j.sol)}</div>`);
    if (j.bnb)      items.push(`<div class="ticker-item"><span class="ticker-name">BNB</span><span class="ticker-val">US$${fmtNum(j.bnb,2)}</span>${pillHtml(j.bnb)}</div>`);
    // Renda fixa (BCB)
    items.push(`<div class="ticker-item"><span class="ticker-name">IPCA 12m</span><span class="ticker-val tk-ipca">—</span></div>`);
    if (isCopomDay()) {
      items.push(`<div class="ticker-item" style="border-color:rgba(245,166,35,0.4)"><span class="ticker-name" style="color:var(--gold)">🔔 SELIC</span><span class="ticker-val tk-selic">—</span></div>`);
    }
    setTimeout(() => {
      if (typeof ACOES !== 'undefined' && ACOES.length) {
        const topLiquid = [...ACOES]
          .filter(a => a.volNum > 0)
          .sort((a, b) => (b.volNum || 0) - (a.volNum || 0))
          .slice(0, 6);
        const track = document.getElementById('ticker-track');
        if (track && topLiquid.length) {
          const extraHtml = topLiquid.map(a => {
            const cls = a.v >= 0 ? 'up-pill' : 'dn-pill';
            const sign = a.v >= 0 ? '+' : '';
            return `<div class="ticker-item">
              <span class="ticker-name">${a.t}</span>
              <span class="ticker-val">R$${a.p.toFixed(2)}</span>
              <span class="pill ${cls}">${sign}${a.v.toFixed(2)}%</span>
            </div>`;
          }).join('');
          const current = track.innerHTML.slice(0, track.innerHTML.length / 2);
          track.innerHTML = (current + extraHtml) + (current + extraHtml);
        }
      }
    }, 3000);
    return items.join('');
  };

  const track = document.getElementById('ticker-track');
  if (track) {
    const html = buildTickerItems();
    track.innerHTML = html + html;
  }

  const setCard = (valId, chgId, data, decimals = 0, prefix = '') => {
    const valEl = document.getElementById(valId);
    const chgEl = document.getElementById(chgId);
    if (!data) return;
    if (valEl) valEl.textContent = prefix + fmtNum(data, decimals);
    if (chgEl) {
      chgEl.textContent = chgStr(data);
      chgEl.className = `idx-chg ${(data.chg || 0) >= 0 ? 'up' : 'dn'}`;
    }
  };

  if (j.ibov) {
    const el = document.getElementById('idx-ibov');
    if (el) el.textContent = fmtNum(j.ibov);
    const ec = document.getElementById('idx-ibov-chg');
    if (ec) {
      ec.textContent = `${(j.ibov.chg_pts||0) >= 0 ? '+' : ''}${(j.ibov.chg_pts||0).toFixed(0)} pts (${chgStr(j.ibov)})`;
      ec.className = `idx-chg ${j.ibov.chg >= 0 ? 'up' : 'dn'}`;
    }
  }
  setCard('idx-ifix',     'idx-ifix-chg',     j.ifix);
  setCard('idx-small',    'idx-small-chg',    j.small);
  setCard('idx-idiv',     'idx-idiv-chg',     j.idiv);
  setCard('idx-sp500',    'idx-sp500-chg',    j.sp500);
  setCard('idx-nasdaq',   'idx-nasdaq-chg',   j.nasdaq);
  setCard('idx-dolar',    'idx-dolar-chg',    j.dolar,    4, 'R$ ');
  setCard('idx-euro',     'idx-euro-chg',     j.euro,     4, 'R$ ');
  setCard('idx-btc',      'idx-btc-chg',      j.btc,      0, 'US$ ');
  setCard('idx-eth',      'idx-eth-chg',      j.eth,      0, 'US$ ');
  setCard('idx-ouro',     'idx-ouro-chg',     j.ouro,     0, 'US$ ');
  setCard('idx-petroleo', 'idx-petroleo-chg', j.petroleo, 2, 'US$ ');

  setTimeout(loadBCBNav, 300);
}

// ── Hambúrguer mobile ─────────────────────────────────────────────
function toggleMobileMenu() {
  const menu = document.getElementById('nav-mobile-menu');
  const btn  = document.getElementById('nav-hamburger');
  if (!menu) return;
  const open = menu.classList.toggle('open');
  if (btn) btn.innerHTML = open ? '✕' : '☰';
  document.body.style.overflow = open ? 'hidden' : '';
}

function renderNavSlim() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = NAV_LINKS.map(l => {
    const cls = page === l.href.split('/').pop() ? 'active' : '';
    return `<a href="${NAV_BASE}${l.href}" class="${cls}">${l.label}</a>`;
  }).join('');
  document.getElementById('nav-placeholder').innerHTML = `
  <style>
  .nav-slim{
    position:sticky;top:0;z-index:200;
    background:rgba(8,8,9,0.95);
    backdrop-filter:blur(20px);
    border-bottom:1px solid var(--border,rgba(255,255,255,0.06));
    padding:0 2rem;
    display:flex;align-items:center;gap:0;
    animation:slideDown 0.35s ease both;
    overflow-x:auto;
  }
  [data-theme="light"] .nav-slim{background:rgba(245,245,240,0.95);}
  .nav-slim-logo{
    display:flex;align-items:center;gap:8px;
    flex-shrink:0;text-decoration:none;padding:14px 0;padding-right:4px;
    font-size:18px;font-weight:800;color:var(--text,#ECEAE4);
    border-bottom:none!important;
  }
  .nav-slim-logo em{color:var(--gold,#F5A623);font-style:normal;}
  .nav-slim-links{display:flex;align-items:center;gap:0;overflow-x:auto;flex:1;}
  .nav-slim a{
    font-size:13px;font-weight:600;color:var(--text2,#8A8884);
    padding:0 10px;height:48px;display:inline-flex;align-items:center;
    text-decoration:none;white-space:nowrap;
    border-bottom:2px solid transparent;
    transition:color .15s,border-color .15s;
  }
  .nav-slim a:hover,.nav-slim a.active{color:var(--text,#ECEAE4);}
  .nav-slim a.active{color:var(--gold,#F5A623);border-bottom-color:var(--gold,#F5A623);}
  </style>
  <div class="nav-slim">
    <div style="display:flex;align-items:center;flex:1;min-width:0">
      <a class="nav-slim-logo" href="${NAV_BASE}index.html">${LOGO_SVG_HTML}<span>Mais <em>Valor</em></span></a>
      <div class="nav-slim-links">${links}</div>
    </div>
    <button class="theme-toggle" id="theme-btn" onclick="toggleTheme()" title="Alternar tema" style="flex-shrink:0;background:transparent;border:none;cursor:pointer;font-size:16px;padding:4px 8px;margin-left:1rem;color:var(--text2)">☀️</button>
  </div>`;
  applyTheme(getTheme());
}

function renderNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const inConsolidador = location.pathname.includes('Consolidador');
  document.body.classList.toggle('is-consolidador', inConsolidador);

  const ativosNacPages  = ['acoes.html','fiis.html','dividendos.html','criptos.html'];
  const ativosExtPages  = ['bdrs.html','etfs.html','reits.html','stocks.html'];
  const ativosAllPages  = [...ativosNacPages, ...ativosExtPages, 'rankings.html'];
  const ferramentasAllPages = ['simulador.html','comparador.html','analise.html','ferramentas.html'];

  const ativosActive      = ativosAllPages.includes(page);
  const ferramentasActive = ferramentasAllPages.includes(page);
  const homeActive        = page === 'index.html' && !inConsolidador;
  const watchActive       = page === 'watchlist.html';
  const carteiraActive    = inConsolidador;
  const statusActive      = page === 'status.html';

  const dropBtnStyle = (active) =>
    `cursor:pointer;font-size:12.5px;font-weight:600;letter-spacing:0.2px;white-space:nowrap;` +
    `padding:5px 10px;border-radius:7px;transition:var(--transition,all .15s);user-select:none;` +
    (active
      ? 'color:var(--gold,#F5A623);background:var(--bg4,rgba(245,166,35,0.08));box-shadow:inset 0 0 0 1px rgba(245,166,35,0.2)'
      : 'color:var(--text2,#8A8884);background:transparent');

  document.getElementById('nav-placeholder').innerHTML = `
  <style>
  #nav-hamburger{display:none;background:transparent;border:none;color:var(--text);font-size:22px;cursor:pointer;padding:6px 8px;line-height:1;border-radius:8px;transition:background .15s;flex-shrink:0}
  #nav-hamburger:hover{background:var(--bg3)}
  #nav-mobile-menu{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:var(--bg,#0E0E11);z-index:500;flex-direction:column;padding:20px 24px;overflow-y:auto;animation:slideDown .2s ease}
  #nav-mobile-menu.open{display:flex}
  #nav-mobile-menu .mob-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
  #nav-mobile-menu .mob-close{background:transparent;border:1px solid var(--border);color:var(--text);font-size:20px;cursor:pointer;padding:6px 12px;border-radius:8px;font-family:var(--font-body,sans-serif)}
  #nav-mobile-menu a{display:block;padding:11px 0 11px 8px;font-size:16px;font-weight:600;color:var(--text2);border-bottom:1px solid var(--border);text-decoration:none;transition:color .15s}
  #nav-mobile-menu a:hover,#nav-mobile-menu a.active{color:var(--gold,#D4A017)}
  .mob-group-label{font-size:10px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:var(--text3,#555);padding:18px 0 4px;border-bottom:none!important}
  .mob-group-sub{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--gold,#D4A017);opacity:.65;padding:10px 0 2px;border-bottom:none!important}
  @media (max-width:900px){#nav-hamburger{display:none!important}}
  .mv-floatdrop{
    display:none;position:fixed;
    background:var(--bg2,#1a1a1f);
    border:1px solid var(--border3,rgba(255,255,255,0.12));
    border-radius:12px;padding:8px;min-width:170px;
    z-index:99999;box-shadow:0 12px 40px rgba(0,0,0,0.6);
  }
  .mv-floatdrop a{display:block;padding:8px 12px;border-radius:7px;font-size:13px;font-weight:600;color:var(--text2,#aaa);white-space:nowrap;text-decoration:none;transition:background .12s,color .12s}
  .mv-floatdrop a:hover{background:var(--bg3,#252529);color:var(--text,#fff)}
  .mv-floatdrop a.active{color:var(--gold,#F5A623)}
  .mv-floatdrop a.active:hover{background:var(--bg3,#252529)}
  .mv-drop-label{font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--text3,#555);padding:6px 12px 3px}
  .mv-drop-div{height:1px;background:var(--border,rgba(255,255,255,0.07));margin:6px 0}
  </style>

  <div id="nav-mobile-menu">
    <div class="mob-header">
      <a href="${NAV_BASE}index.html" style="display:flex;align-items:center;gap:10px;text-decoration:none;border:none;padding:0">
        ${LOGO_SVG_HTML}
        <span style="font-size:20px;font-weight:800;color:#fff">Mais <em style="color:#D4A017;font-style:normal">Valor</em></span>
      </a>
      <button class="mob-close" onclick="toggleMobileMenu()">✕</button>
    </div>
    <div id="nav-auth-area-mobile" style="padding:12px 0 16px;border-bottom:1px solid var(--border);margin-bottom:4px"></div>
    <a href="${NAV_BASE}index.html" class="${homeActive?'active':''}" onclick="toggleMobileMenu()">🏠 Home</a>
    <div class="mob-group-label">Ativos</div>
    <div class="mob-group-sub">Nacional</div>
    <a href="${NAV_BASE}acoes.html" class="${page==='acoes.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.acoes} Ações</a>
    <a href="${NAV_BASE}fiis.html" class="${page==='fiis.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.fiis} FIIs</a>
    <a href="${NAV_BASE}dividendos.html" class="${page==='dividendos.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.dividendos} Dividendos</a>
    <a href="${NAV_BASE}criptos.html" class="${page==='criptos.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.criptos} Criptos</a>
    <div class="mob-group-sub">Exterior</div>
    <a href="${NAV_BASE}bdrs.html" class="${page==='bdrs.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.bdrs} BDRs</a>
    <a href="${NAV_BASE}etfs.html" class="${page==='etfs.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.etfs} ETFs</a>
    <a href="${NAV_BASE}reits.html" class="${page==='reits.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.reits} REITs</a>
    <a href="${NAV_BASE}stocks.html" class="${page==='stocks.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.stocks} Stocks</a>
    <a href="${NAV_BASE}rankings.html" class="${page==='rankings.html'?'active':''}" onclick="toggleMobileMenu()">${ATIVO_ICONS.rankings} Rankings</a>
    <div class="mob-group-label">Ferramentas</div>
    <a href="${NAV_BASE}simulador.html" class="${page==='simulador.html'?'active':''}" onclick="toggleMobileMenu()">${FERRAMENTA_ICONS.simulador} Simulador</a>
    <a href="${NAV_BASE}Calculadora_maisvalor/index.html" onclick="toggleMobileMenu()">${FERRAMENTA_ICONS.calculadora} Calculadora</a>
    <a href="${NAV_BASE}comparador.html" class="${page==='comparador.html'?'active':''}" onclick="toggleMobileMenu()">${FERRAMENTA_ICONS.comparador} Comparador</a>
    <a href="${NAV_BASE}analise.html" class="${page==='analise.html'?'active':''}" onclick="toggleMobileMenu()">${FERRAMENTA_ICONS.analise} Análise IA</a>
    <a href="${NAV_BASE}ferramentas.html" class="${page==='ferramentas.html'?'active':''}" onclick="toggleMobileMenu()">${FERRAMENTA_ICONS.outras} Outras</a>
    <div class="mob-group-label">Conta</div>
    <a href="${NAV_BASE}watchlist.html" class="${watchActive?'active':''}" onclick="toggleMobileMenu()">★ Watchlist</a>
    <a href="${NAV_BASE}Consolidador/index.html" class="${carteiraActive?'active':''}" onclick="toggleMobileMenu()">📊 Carteira</a>
    <a href="${NAV_BASE}status.html" class="${statusActive?'active':''}" onclick="toggleMobileMenu()" style="color:var(--up)">● Status</a>
  </div>

  <nav>
    <div class="nav-top-row">
      <a class="nav-logo" href="${NAV_BASE}index.html">
        ${LOGO_SVG_HTML.replace('style="display:block', 'style="display:block;width:175px;height:175px')}
        <span style="font-size:175px;line-height:175px;font-family:'Bebas Neue',sans-serif;font-weight:400;letter-spacing:0.5px;white-space:nowrap;color:var(--text,#ECEAE4)">Mais <em style="color:var(--text,#ECEAE4);font-style:normal">Valor</em></span>
      </a>
      <div id="nav-auth-area"></div>
      <button id="nav-hamburger" onclick="toggleMobileMenu()" aria-label="Menu">☰</button>
    </div>
    <div class="nav-bottom-row">
      <div class="nav-links">
        <a href="${NAV_BASE}index.html" class="${homeActive?'active':''}">Home</a>
        <span id="mv-ativos-btn" style="${dropBtnStyle(ativosActive)}">Ativos ▾</span>
        <span id="mv-ferramentas-btn" style="${dropBtnStyle(ferramentasActive)}">Ferramentas ▾</span>
        <a href="${NAV_BASE}watchlist.html" class="${watchActive?'active':''}">★ Watchlist</a>
        <a href="${NAV_BASE}Consolidador/index.html" class="${carteiraActive?'active':''}">Carteira</a>
        <a href="${NAV_BASE}status.html" class="${statusActive?'active':''}" style="color:var(--up);font-size:11px">● Status</a>
      </div>
      <div class="nav-search-wrap">
        <span class="nav-search-icon">⌕</span>
        <input class="nav-search" type="text" placeholder="Buscar ativo... " id="nav-search-input"
          oninput="navSearchLive(this.value)" onkeydown="if(event.key==='Enter')navSearchGo(this.value)"
          onfocus="document.querySelector('.nav-search-shortcut').style.display='none'"
          onblur="document.querySelector('.nav-search-shortcut').style.display=''">
        <span class="nav-search-shortcut">/</span>
        <div id="nav-search-results"></div>
      </div>
    </div>
  </nav>

  ${document.documentElement.dataset.indices === 'true' ? `
  <div class="ticker-bar">
    <div class="ticker-track" id="ticker-track">
      <div class="ticker-item"><span class="ticker-name" style="animation:pulse 1s ease-in-out infinite">Carregando...</span></div>
    </div>
  </div>

  <div class="indices-bar">
    <div class="idx-card">
      <div class="idx-name">Ibovespa</div>
      <div class="idx-val" id="idx-ibov">—</div>
      <div class="idx-chg" id="idx-ibov-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">IFIX</div>
      <div class="idx-val" id="idx-ifix">—</div>
      <div class="idx-chg" id="idx-ifix-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">Small Caps</div>
      <div class="idx-val" id="idx-small">—</div>
      <div class="idx-chg" id="idx-small-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">IDIV</div>
      <div class="idx-val" id="idx-idiv">—</div>
      <div class="idx-chg" id="idx-idiv-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">S&amp;P 500</div>
      <div class="idx-val" id="idx-sp500">—</div>
      <div class="idx-chg" id="idx-sp500-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">Nasdaq</div>
      <div class="idx-val" id="idx-nasdaq">—</div>
      <div class="idx-chg" id="idx-nasdaq-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">USD / BRL</div>
      <div class="idx-val" id="idx-dolar">—</div>
      <div class="idx-chg" id="idx-dolar-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">EUR / BRL</div>
      <div class="idx-val" id="idx-euro">—</div>
      <div class="idx-chg" id="idx-euro-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">Bitcoin</div>
      <div class="idx-val" id="idx-btc">—</div>
      <div class="idx-chg" id="idx-btc-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">Ethereum</div>
      <div class="idx-val" id="idx-eth">—</div>
      <div class="idx-chg" id="idx-eth-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">Ouro</div>
      <div class="idx-val" id="idx-ouro">—</div>
      <div class="idx-chg" id="idx-ouro-chg">—</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">Petróleo</div>
      <div class="idx-val" id="idx-petroleo">—</div>
      <div class="idx-chg" id="idx-petroleo-chg">—</div>
    </div>
  </div>` : ''}`;

  applyTheme(getTheme());

  // ── Dropdown: Ativos ─────────────────────────────────────────────
  const ativosDrop = document.createElement('div');
  ativosDrop.id = 'mv-ativos-floatdrop';
  ativosDrop.className = 'mv-floatdrop';
  ativosDrop.innerHTML = `
    <div class="mv-drop-label">Nacional</div>
    <a href="${NAV_BASE}acoes.html" class="${page==='acoes.html'?'active':''}">${ATIVO_ICONS.acoes} Ações</a>
    <a href="${NAV_BASE}fiis.html" class="${page==='fiis.html'?'active':''}">${ATIVO_ICONS.fiis} FIIs</a>
    <a href="${NAV_BASE}dividendos.html" class="${page==='dividendos.html'?'active':''}">${ATIVO_ICONS.dividendos} Dividendos</a>
    <a href="${NAV_BASE}criptos.html" class="${page==='criptos.html'?'active':''}">${ATIVO_ICONS.criptos} Criptos</a>
    <div class="mv-drop-div"></div>
    <div class="mv-drop-label">Exterior</div>
    <a href="${NAV_BASE}bdrs.html" class="${page==='bdrs.html'?'active':''}">${ATIVO_ICONS.bdrs} BDRs</a>
    <a href="${NAV_BASE}etfs.html" class="${page==='etfs.html'?'active':''}">${ATIVO_ICONS.etfs} ETFs</a>
    <a href="${NAV_BASE}reits.html" class="${page==='reits.html'?'active':''}">${ATIVO_ICONS.reits} REITs</a>
    <a href="${NAV_BASE}stocks.html" class="${page==='stocks.html'?'active':''}">${ATIVO_ICONS.stocks} Stocks</a>
    <div class="mv-drop-div"></div>
    <a href="${NAV_BASE}rankings.html" class="${page==='rankings.html'?'active':''}">${ATIVO_ICONS.rankings} Rankings</a>`;
  document.body.appendChild(ativosDrop);

  // ── Dropdown: Ferramentas ────────────────────────────────────────
  const ferramentasDrop = document.createElement('div');
  ferramentasDrop.id = 'mv-ferramentas-floatdrop';
  ferramentasDrop.className = 'mv-floatdrop';
  ferramentasDrop.innerHTML = `
    <a href="${NAV_BASE}simulador.html" class="${page==='simulador.html'?'active':''}">${FERRAMENTA_ICONS.simulador} Simulador</a>
    <a href="${NAV_BASE}Calculadora_maisvalor/index.html">${FERRAMENTA_ICONS.calculadora} Calculadora</a>
    <a href="${NAV_BASE}comparador.html" class="${page==='comparador.html'?'active':''}">${FERRAMENTA_ICONS.comparador} Comparador</a>
    <a href="${NAV_BASE}analise.html" class="${page==='analise.html'?'active':''}">${FERRAMENTA_ICONS.analise} Análise IA</a>
    <div class="mv-drop-div"></div>
    <a href="${NAV_BASE}ferramentas.html" class="${page==='ferramentas.html'?'active':''}">${FERRAMENTA_ICONS.outras} Outras ferramentas</a>`;
  document.body.appendChild(ferramentasDrop);

  // ── Lógica genérica de hover para os dropdowns ───────────────────
  function setupDropHover(btnId, dropEl) {
    let timer;
    const show = () => {
      clearTimeout(timer);
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      dropEl.style.display = 'block';
      dropEl.style.top  = (r.bottom + 6) + 'px';
      dropEl.style.left = r.left + 'px';
    };
    const hide = () => { timer = setTimeout(() => { dropEl.style.display = 'none'; }, 120); };
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('#' + btnId)) show();
      else if (e.target.closest('#' + dropEl.id)) clearTimeout(timer);
    });
    document.addEventListener('mouseout', (e) => {
      const to = e.relatedTarget;
      if (!to || (!to.closest('#' + btnId) && !to.closest('#' + dropEl.id))) hide();
    });
  }

  setupDropHover('mv-ativos-btn',      ativosDrop);
  setupDropHover('mv-ferramentas-btn', ferramentasDrop);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search-wrap')) {
      const r = document.getElementById('nav-search-results');
      if (r) r.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      document.getElementById('nav-search-input')?.focus();
    }
    if (e.key === 'Escape') {
      document.getElementById('nav-search-input')?.blur();
      const r = document.getElementById('nav-search-results');
      if (r) r.style.display = 'none';
      const menu = document.getElementById('nav-mobile-menu');
      if (menu?.classList.contains('open')) toggleMobileMenu();
    }
  });

  loadIndicesNav();

  // Mobile: move o login (#nav-auth-area) para a linha da busca,
  // posicionado antes das abas (.nav-links) para ficar na linha 2.
  if (window.matchMedia('(max-width:768px)').matches) {
    const authArea = document.getElementById('nav-auth-area');
    const bottomRow = document.querySelector('.nav-bottom-row');
    const navLinks = bottomRow ? bottomRow.querySelector('.nav-links') : null;
    if (authArea && bottomRow) {
      if (navLinks) bottomRow.insertBefore(authArea, navLinks);
      else bottomRow.appendChild(authArea);
    }
  }
}

function navUpdateTotal() {
  setTimeout(() => {
    const items = document.querySelectorAll('.tk-total');
    if (typeof ACOES !== 'undefined') {
      const total = ACOES.length + (FIIS?.length || 0);
      items.forEach(el => el.textContent = total + ' ativos');
    }
  }, 3000);
}

function navSearchLive(q) {
  const box = document.getElementById('nav-search-results');
  if (!box || q.length < 2) { if (box) box.style.display = 'none'; return; }
  const all = [
    ...(typeof ACOES !== 'undefined' ? ACOES : []),
    ...(typeof FIIS  !== 'undefined' ? FIIS  : []),
  ];
  const results = all.filter(d =>
    d.t.toLowerCase().startsWith(q.toLowerCase()) || d.n.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);
  if (!results.length) { box.style.display = 'none'; return; }
  const isFii = d => d.t.match(/\d{2}$/);
  box.innerHTML = results.map(d => {
    const score = scoreBadge(d);
    return `
    <div onclick="location.href='${NAV_BASE}ativo.html?t=${d.t}${isFii(d) ? '&tipo=fii' : ''}'"
      style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
      <div style="display:flex;align-items:center;gap:10px">
        ${logoHtml(d.t, 28)}
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-weight:700;font-size:13px">${d.t}</span>
            ${score}
          </div>
          <div style="font-size:11px;color:var(--text3)">${d.n.slice(0,30)}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--font-mono);font-size:13px">R$ ${d.p.toFixed(2)}</div>
        <div style="font-size:11px;color:${d.v >= 0 ? 'var(--up)' : 'var(--dn)'}">${d.v >= 0 ? '+' : ''}${d.v.toFixed(2)}%</div>
      </div>
    </div>`;
  }).join('');
  box.style.display = 'block';
}

function navSearchGo(q) {
  if (!q) return;
  const all = [
    ...(typeof ACOES !== 'undefined' ? ACOES : []),
    ...(typeof FIIS  !== 'undefined' ? FIIS  : []),
  ];
  const found = all.find(d => d.t.toLowerCase() === q.toLowerCase());
  if (found) location.href = `${NAV_BASE}ativo.html?t=${found.t}${found.t.match(/\d{2}$/) ? '&tipo=fii' : ''}`;
  else location.href = `${NAV_BASE}acoes.html?q=${q}`;
}

// ── Autenticação global (Firebase) ───────────────────────────────
const _NAV_FB_CONFIG = {
  apiKey: "AIzaSyBDojPPrdkrqr52WxDL-WPy5wL1fsWo1HI",
  authDomain: "consolidador-de-carteira-c3a83.firebaseapp.com",
  projectId: "consolidador-de-carteira-c3a83",
  storageBucket: "consolidador-de-carteira-c3a83.firebasestorage.app",
  messagingSenderId: "691277823486",
  appId: "1:691277823486:web:a17e3faf4375adc61354af"
};

function navLoginGoogle() {
  if (typeof firebase === 'undefined') return;
  firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch(e => console.warn('Login:', e.message));
}
window.navLoginGoogle = navLoginGoogle;

function navLogout() {
  if (typeof firebase === 'undefined') return;
  firebase.auth().signOut();
}
window.navLogout = navLogout;

function _navAuthBtnHtml(user) {
  if (user) {
    const name = (user.displayName || '').split(' ')[0] || 'Conta';
    const photo = user.photoURL || '';
    return `
      <img src="${photo}" alt="${name}"
        style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(212,160,23,0.5);cursor:pointer;flex-shrink:0"
        onerror="this.style.display='none'"
        title="${user.displayName || ''}"
        onclick="document.getElementById('nav-user-drop')?.classList.toggle('open')">
      <div id="nav-user-drop"
        style="display:none;position:absolute;right:0;top:38px;background:var(--bg2,#1a1a1f);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:12px 14px;z-index:99999;min-width:170px;box-shadow:0 8px 32px rgba(0,0,0,0.5)">
        <div style="font-size:13px;font-weight:700;color:var(--text,#eee);margin-bottom:4px;white-space:nowrap">${name}</div>
        <div style="font-size:11px;color:var(--text3,#666);margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px">${user.email || ''}</div>
        <a href="${NAV_BASE}Consolidador/index.html" style="display:block;font-size:12px;color:var(--gold,#D4A017);text-decoration:none;padding:4px 0;font-weight:600">📊 Minha Carteira</a>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:8px 0">
        <button onclick="navLogout()"
          style="width:100%;background:transparent;border:1px solid rgba(255,255,255,0.1);color:var(--text2,#aaa);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit">
          Sair da conta
        </button>
      </div>`;
  } else {
    return `
      <button onclick="navLoginGoogle()"
        style="display:flex;align-items:center;gap:5px;background:transparent;border:1px solid rgba(212,160,23,0.45);color:var(--gold,#D4A017);padding:5px 12px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;white-space:nowrap;transition:all .15s;flex-shrink:0"
        onmouseover="this.style.background='rgba(212,160,23,0.1)'" onmouseout="this.style.background='transparent'">
        <svg width="13" height="13" viewBox="0 0 24 24" style="flex-shrink:0">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Entrar
      </button>`;
  }
}

function _navAuthMobileBtnHtml(user) {
  if (user) {
    const name = (user.displayName || '').split(' ')[0] || 'Conta';
    const photo = user.photoURL || '';
    return `
      <div style="display:flex;align-items:center;gap:10px">
        <img src="${photo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid rgba(212,160,23,0.4)" onerror="this.style.display='none'">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text,#eee)">${name}</div>
          <button onclick="navLogout();toggleMobileMenu()"
            style="margin-top:4px;background:transparent;border:1px solid rgba(255,255,255,0.15);color:var(--text2,#aaa);padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-family:inherit">
            Sair
          </button>
        </div>
      </div>`;
  } else {
    return `
      <button onclick="navLoginGoogle()"
        style="display:flex;align-items:center;gap:8px;background:transparent;border:1.5px solid rgba(212,160,23,0.45);color:var(--gold,#D4A017);padding:10px 16px;border-radius:10px;cursor:pointer;font-size:15px;font-weight:700;font-family:inherit;width:100%">
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Entrar com Google
      </button>`;
  }
}

function renderNavAuth(user) {
  const d = document.getElementById('nav-auth-area');
  const m = document.getElementById('nav-auth-area-mobile');
  if (d) d.innerHTML = _navAuthBtnHtml(user);
  if (m) m.innerHTML = _navAuthMobileBtnHtml(user);
  // fecha dropdown ao clicar fora
  if (user) {
    document.addEventListener('click', (e) => {
      const drop = document.getElementById('nav-user-drop');
      if (drop && !e.target.closest('#nav-auth-area')) drop.classList.remove('open');
    }, { once: false, capture: false });
  }
}

function _setupNavAuth() {
  if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') return;
  if (!firebase.apps.length) firebase.initializeApp(_NAV_FB_CONFIG);
  firebase.auth().onAuthStateChanged(renderNavAuth);
}

function initSiteAuth() {
  if (typeof firebase !== 'undefined') { _setupNavAuth(); return; }
  let loaded = 0;
  const srcs = [
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  ];
  srcs.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { if (++loaded === srcs.length) _setupNavAuth(); };
    document.head.appendChild(s);
  });
}

// CSS extra: dropdown aberto
(function(){
  const st = document.createElement('style');
  st.textContent = '#nav-user-drop.open{display:block!important}';
  document.head.appendChild(st);
})();

function renderFooter() {
  const el = document.getElementById('footer-placeholder');
  if (!el) return;
  const year = new Date().getFullYear();
  el.innerHTML = `
  <footer>
    <p>© ${year} <em>Mais Valor</em> — dados atualizados diariamente após o fechamento do pregão B3.<br>
    Não constitui recomendação de investimento.</p>
  </footer>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();
  navUpdateTotal();
  initSiteAuth();
});
