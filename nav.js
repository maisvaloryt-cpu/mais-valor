const LOGO = 'logo.png';

const NAV_LINKS = [
  { href: 'index.html',        label: 'Home' },
  { href: 'acoes.html',        label: 'Ações' },
  { href: 'fiis.html',         label: 'FIIs' },
  { href: 'criptos.html',      label: 'Criptos' },
  {
    label: 'Exterior',
    dropdown: [
      { href: 'stocks.html',   label: 'Stocks' },
      { href: 'reits.html',    label: 'REITs' },
      { href: 'bdrs.html',     label: 'BDRs' },
      { href: 'etfs.html',     label: 'ETFs' },
    ]
  },
  { href: 'dividendos.html',   label: 'Dividendos' },
  { href: 'rankings.html',     label: 'Rankings' },
  { href: 'comparador.html',   label: 'Comparador' },
  { href: 'ferramentas.html',  label: 'Ferramentas' },
  { href: 'analise.html',      label: '✦ Análise' },
  { href: 'watchlist.html',    label: '★ Watchlist' },
  { href: 'Calculadora_maisvalor/index.html', label: 'Calculadora' },
  { href: 'simulador.html',                 label: 'Simulador' },
  { href: 'status.html',       label: '● Status' },
];

// ── Theme toggle ─────────────────────────────────────────────────
function getTheme() { return localStorage.getItem('mv_theme') || 'dark'; }
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('mv_theme', t);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() { applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

// ── Logo Cache (IndexedDB) ────────────────────────────────────────
const _logoCache = (() => {
  const DB_NAME = 'mv_logo_cache', STORE = 'logos', VERSION = 1;
  let _db = null;

  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'ticker' });
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror = () => rej(req.error);
    });
  }

  async function get(ticker) {
    try {
      const db = await openDB();
      return new Promise((res) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(ticker);
        req.onsuccess = () => res(req.result?.url || null);
        req.onerror = () => res(null);
      });
    } catch { return null; }
  }

  async function set(ticker, url) {
    try {
      const db = await openDB();
      return new Promise((res) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ ticker, url, ts: Date.now() });
        tx.oncomplete = () => res(true);
        tx.onerror = () => res(false);
      });
    } catch { return false; }
  }

  return { get, set };
})();

// ── Logo sources cascade ──────────────────────────────────────────
// Ordem de tentativa para cada ticker
function _logoSources(ticker) {
  return [
    `https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${ticker}.png`,
    `https://brapi.dev/favicon.svg`,  // placeholder — substituído abaixo por URL real
    `https://cdn.jsdelivr.net/gh/thefintz/icones-b3@main/icones/${ticker}.png`,
  ].filter(Boolean);
}

// Fontes reais por prioridade
function _logoSourcesReal(ticker) {
  return [
    `https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${ticker}.png`,
    `https://cdn.jsdelivr.net/gh/thefintz/icones-b3@main/icones/${ticker}.png`,
    `https://brapi.dev/api/quote/${ticker}?token=demo`,  // usado apenas para fallback via fetch
  ];
}

// ── Gerar avatar SVG inline como data URI ────────────────────────
function _avatarDataUri(ticker, size) {
  // Remove APENAS dígitos do FINAL do ticker: ANCR11 → ANCR, KNRI11 → KNRI, PETR4 → PETR
  const initials = ticker.replace(/\d+$/, '').slice(0, 4) || ticker.slice(0, 4);
  const fs = Math.round(size * 0.30);
  // Paleta de cores baseada no hash do ticker para consistência visual
  const colors = [
    ['#1A3A5C','#2563a8'],['#1A4731','#16a34a'],['#4A1A2C','#be185d'],
    ['#2D1A4A','#7c3aed'],['#4A2A00','#b45309'],['#1A3A4A','#0891b2'],
    ['#3A1A1A','#dc2626'],['#1A3A3A','#0d9488'],
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = (hash * 31 + ticker.charCodeAt(i)) & 0xffffffff;
  const [c1, c2] = colors[Math.abs(hash) % colors.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>`
    + `<defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>`
    + `<stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/>`
    + `</linearGradient></defs>`
    + `<circle cx='${size/2}' cy='${size/2}' r='${size/2}' fill='url(#g)'/>`
    + `<text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' `
    + `font-family='Inter,sans-serif' font-weight='800' font-size='${fs}' fill='#fff'>${initials}</text>`
    + `</svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// ── Renderiza logo com cascata + cache ────────────────────────────
// Retorna HTML imediato com avatar; substitui assincronamente se achar logo real
function logoHtml(ticker, size = 32) {
  const uid = `logo-${ticker}-${size}-${Math.random().toString(36).slice(2,7)}`;
  const avatarSrc = _avatarDataUri(ticker, size);
  const baseStyle = `width:${size}px;height:${size}px;border-radius:50%;object-fit:contain;flex-shrink:0;`;

  // Renderiza avatar imediatamente (sem flash branco)
  const html = `<img id="${uid}" src="${avatarSrc}"
    style="${baseStyle}background:transparent;"
    loading="lazy" data-ticker="${ticker}" data-size="${size}">`;

  // Tenta carregar logo real de forma assíncrona
  requestAnimationFrame(() => _loadLogoAsync(uid, ticker, size, avatarSrc));

  return html;
}

async function _loadLogoAsync(uid, ticker, size, avatarSrc) {
  // 1. Verificar cache
  const cached = await _logoCache.get(ticker);
  if (cached) {
    _applyLogo(uid, cached, size);
    return;
  }

  // 2. Tentar fontes em cascata
  const sources = [
    `https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${ticker}.png`,
    `https://cdn.jsdelivr.net/gh/thefintz/icones-b3@main/icones/${ticker}.png`,
  ];

  for (const src of sources) {
    const ok = await _testImage(src);
    if (ok) {
      await _logoCache.set(ticker, src);
      _applyLogo(uid, src, size);
      return;
    }
  }

  // 3. Tentar brapi para obter URL de logo
  try {
    const r = await fetch(`https://brapi.dev/api/quote/${ticker}?fundamental=false&token=demo`, { signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const j = await r.json();
      const logoUrl = j?.results?.[0]?.logourl || j?.results?.[0]?.logo_url;
      if (logoUrl) {
        const ok = await _testImage(logoUrl);
        if (ok) {
          await _logoCache.set(ticker, logoUrl);
          _applyLogo(uid, logoUrl, size);
          return;
        }
      }
    }
  } catch {}

  // 4. Sem logo — salvar sentinel no cache para não tentar de novo
  await _logoCache.set(ticker, '__avatar__');
}

function _testImage(src) {
  return new Promise(res => {
    const img = new Image();
    img.onload  = () => res(img.naturalWidth > 1);
    img.onerror = () => res(false);
    img.src = src;
    setTimeout(() => res(false), 5000);
  });
}

function _applyLogo(uid, src, size) {
  if (src === '__avatar__') return; // mantém avatar gerado
  const el = document.getElementById(uid);
  if (!el) return;
  el.style.background = '#fff';
  el.src = src;
  el.onerror = () => { el.style.background = 'transparent'; };
}

window.logoHtml = logoHtml;

// ── Score fundamentalista (Graham/Bazin simplificado) ─────────────
function calcScore(d) {
  if (!d) return null;
  let pts = 0, max = 0;
  const isFii = d.t && /\d{2}$/.test(d.t);
  if (isFii) {
    if (d.dy > 0)  { max += 30; if (d.dy >= 8 && d.dy <= 25)  pts += 30; else if (d.dy >= 5) pts += 15; }
    if (d.pvp > 0) { max += 40; if (d.pvp <= 0.95) pts += 40; else if (d.pvp <= 1.05) pts += 20; }
    if (d.v30 !== undefined) { max += 30; if (d.v30 >= 0) pts += 30; else if (d.v30 >= -5) pts += 15; }
  } else {
    if (d.pl !== undefined && d.pl !== null) { max += 25; if (d.pl > 0 && d.pl <= 15) pts += 25; else if (d.pl > 0 && d.pl <= 25) pts += 12; }
    if (d.pvp !== undefined && d.pvp !== null) { max += 15; if (d.pvp < 1) pts += 15; else if (d.pvp < 1.5) pts += 8; }
    if (d.dy > 0)   { max += 20; if (d.dy >= 6) pts += 20; else if (d.dy >= 3) pts += 10; }
    if (d.roe > 0)  { max += 20; if (d.roe >= 15) pts += 20; else if (d.roe >= 10) pts += 10; }
    if (d.roic > 0) { max += 10; if (d.roic >= 12) pts += 10; else if (d.roic >= 8) pts += 5; }
    if (d.mrg_liq !== undefined && d.mrg_liq !== null) { max += 10; if (d.mrg_liq > 10) pts += 10; else if (d.mrg_liq > 0) pts += 5; }
  }
  if (!max) return null;
  const pct = Math.round((pts / max) * 100);
  return pct;
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

// ── BCB data ──────────────────────────────────────────────────────
async function loadBCBNav() {
  try {
    const r = await fetch('data/bcb.json?t=' + Date.now());
    if (!r.ok) return;
    const j = await r.json();
    window.BCB_DATA = j;
    if (j.cdi?.anual) {
      document.querySelectorAll('.tk-selic').forEach(el => {
        el.textContent = j.cdi.anual.toFixed(2) + '%';
        if (j.cdi.stale) { el.classList.add('stale'); el.setAttribute('data-stale','true'); el.title='Último valor disponível (dado desatualizado)'; }
      });
    }
    if (j.ipca?.acumulado_12m) {
      document.querySelectorAll('.tk-ipca').forEach(el => {
        el.textContent = j.ipca.acumulado_12m.toFixed(2) + '%';
        if (j.ipca.stale) { el.classList.add('stale'); el.setAttribute('data-stale','true'); el.title='Último valor disponível (dado desatualizado)'; }
      });
    }
  } catch(e) {}
}

// ── Verifica se hoje é dia de COPOM ──────────────────────────────
function isCopomDay() {
  // Datas aproximadas das reuniões COPOM 2025/2026 — atualizar anualmente
  const COPOM_DATES = [
    '2025-01-29','2025-03-19','2025-05-07','2025-06-18',
    '2025-07-30','2025-09-17','2025-11-05','2025-12-10',
    '2026-01-28','2026-03-18','2026-05-06','2026-06-17',
    '2026-07-29','2026-09-16','2026-11-04','2026-12-09',
  ];
  const today = new Date().toISOString().slice(0, 10);
  return COPOM_DATES.includes(today);
}

// ── Live indices (brapi + awesomeapi) ────────────────────────────
async function fetchLiveIndices() {
  const result = {};
  await Promise.allSettled([
    // Câmbio e BTC
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-USD')
      .then(r => r.json())
      .then(d => {
        if (d.USDBRL?.bid) result.dolar = { val: +parseFloat(d.USDBRL.bid).toFixed(4), chg: +parseFloat(d.USDBRL.pctChange).toFixed(2) };
        if (d.EURBRL?.bid) result.euro  = { val: +parseFloat(d.EURBRL.bid).toFixed(4), chg: +parseFloat(d.EURBRL.pctChange).toFixed(2) };
        if (d.BTCUSD?.bid) result.btc   = { val: +parseFloat(d.BTCUSD.bid).toFixed(0),  chg: +parseFloat(d.BTCUSD.pctChange).toFixed(2) };
      }).catch(() => {}),

    // Ibovespa, IFIX, Small Caps, IDIV via brapi
    fetch('https://brapi.dev/api/quote/%5EBVSP,IFIX11,SMLL11,DIVO11?fundamental=false')
      .then(r => r.json())
      .then(d => {
        for (const q of (d.results || [])) {
          const sym = q.symbol;
          if (!q.regularMarketPrice) continue;
          const entry = { val: q.regularMarketPrice, chg: +(q.regularMarketChangePercent||0).toFixed(2), chg_pts: +(q.regularMarketChange||0).toFixed(2) };
          if (sym === '^BVSP')  result.ibov   = entry;
          if (sym === 'IFIX11') result.ifix   = entry;
          if (sym === 'SMLL11') result.small  = entry;
          if (sym === 'DIVO11') result.idiv   = entry;
        }
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
    fetch('data/indices.json?t=' + Date.now()).then(r => r.ok ? r.json() : {}),
    fetchLiveIndices(),
  ]);

  const fromJson = jsonResult.status === 'fulfilled' ? (jsonResult.value || {}) : {};
  const fromLive = liveResult.status  === 'fulfilled' ? (liveResult.value || {}) : {};

  const pick = (key) => {
    const live = fromLive[key], json = fromJson[key];
    if (live?.val && live.val > 0) return live;
    if (json?.val && json.val > 0) return json;
    return null;
  };

  const j = {
    ibov:  pick('ibov'),
    ifix:  pick('ifix'),
    small: pick('small'),
    idiv:  pick('idiv'),
    dolar: pick('dolar'),
    euro:  pick('euro'),
    btc:   pick('btc'),
    ouro:  pick('ouro'),
  };

  // ── Ticker bar dinâmica ──────────────────────────────────────────
  // Ativos prioritários: grandes índices, câmbio, BTC, top ações líquidas
  const buildTickerItems = () => {
    const items = [];
    const sc = (item) => item?.stale ? ' class="stale"' : '';
    const sa = (item) => item?.stale ? ' data-stale="true" title="Último valor disponível (dado desatualizado)"' : '';

    // Índices se disponíveis
    if (j.ibov)  items.push(`<div class="ticker-item"><span class="ticker-name">IBOV</span><span class="ticker-val"${sc(j.ibov)}${sa(j.ibov)}>${fmtNum(j.ibov)}</span>${pillHtml(j.ibov)}</div>`);
    if (j.ifix)  items.push(`<div class="ticker-item"><span class="ticker-name">IFIX</span><span class="ticker-val"${sc(j.ifix)}${sa(j.ifix)}>${fmtNum(j.ifix)}</span>${pillHtml(j.ifix)}</div>`);
    if (j.small) items.push(`<div class="ticker-item"><span class="ticker-name">SMALL</span><span class="ticker-val">${fmtNum(j.small)}</span>${pillHtml(j.small)}</div>`);
    if (j.idiv)  items.push(`<div class="ticker-item"><span class="ticker-name">IDIV</span><span class="ticker-val">${fmtNum(j.idiv)}</span>${pillHtml(j.idiv)}</div>`);

    // Câmbio
    if (j.dolar) items.push(`<div class="ticker-item"><span class="ticker-name">USD/BRL</span><span class="ticker-val"${sc(j.dolar)}${sa(j.dolar)}>R$${fmtNum(j.dolar,4)}</span>${pillHtml(j.dolar)}</div>`);
    if (j.euro)  items.push(`<div class="ticker-item"><span class="ticker-name">EUR/BRL</span><span class="ticker-val"${sc(j.euro)}${sa(j.euro)}>R$${fmtNum(j.euro,4)}</span>${pillHtml(j.euro)}</div>`);

    // Commodities
    if (j.ouro)  items.push(`<div class="ticker-item"><span class="ticker-name">OURO</span><span class="ticker-val"${sc(j.ouro)}${sa(j.ouro)}>US$${fmtNum(j.ouro,0)}</span>${pillHtml(j.ouro)}</div>`);

    // Cripto
    if (j.btc)   items.push(`<div class="ticker-item"><span class="ticker-name">BTC</span><span class="ticker-val"${sc(j.btc)}${sa(j.btc)}>US$${fmtNum(j.btc,0)}</span>${pillHtml(j.btc)}</div>`);

    // IPCA sempre (relevante)
    items.push(`<div class="ticker-item"><span class="ticker-name">IPCA 12m</span><span class="ticker-val tk-ipca">—</span></div>`);

    // SELIC apenas no dia do COPOM
    if (isCopomDay()) {
      items.push(`<div class="ticker-item" style="border-color:rgba(245,166,35,0.4)"><span class="ticker-name" style="color:var(--gold)">🔔 SELIC</span><span class="ticker-val tk-selic">—</span></div>`);
    }

    // Top ações líquidas (PETR4, VALE3, ITUB4, BBAS3, WEGE3) se disponíveis via data.js
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
    track.innerHTML = html + html; // duplica para loop contínuo
  }

  // ── Index cards ──────────────────────────────────────────────────
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
  setCard('idx-ifix',  'idx-ifix-chg',  j.ifix);
  setCard('idx-small', 'idx-small-chg', j.small);
  setCard('idx-idiv',  'idx-idiv-chg',  j.idiv);
  setCard('idx-dolar', 'idx-dolar-chg', j.dolar, 4, 'R$ ');

  setTimeout(loadBCBNav, 300);
}

function renderNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = NAV_LINKS.map(l => {
    if (l.dropdown) {
      const isActiveParent = l.dropdown.some(s => s.href === page);
      const items = l.dropdown.map(s =>
        `<a href="${s.href}" class="nav-dropdown-item${page === s.href ? ' active' : ''}">${s.label}</a>`
      ).join('');
      return `<div class="nav-dropdown-wrap${isActiveParent ? ' active' : ''}">
        <button class="nav-dropdown-btn${isActiveParent ? ' active' : ''}" onclick="event.stopPropagation();mvToggleDropdown(this)">${l.label} &#9662;</button>
        <div class="nav-dropdown">${items}</div>
      </div>`;
    }
    const isStatus = l.href === 'status.html';
    const cls = page === l.href ? 'active' : '';
    const style = isStatus ? 'color:var(--up);font-size:11px' : '';
    return `<a href="${l.href}" class="${cls}" style="${style}">${l.label}</a>`;
  }).join('');

  if (!document.getElementById('mv-dropdown-style')) {
    const s = document.createElement('style');
    s.id = 'mv-dropdown-style';
    s.textContent = `
      .nav-dropdown-wrap{position:relative;display:inline-flex;align-items:center}
      .nav-dropdown-btn{background:transparent;border:none;color:var(--text2);font-size:13px;font-weight:500;cursor:pointer;padding:4px 6px;border-radius:6px;transition:color .15s;white-space:nowrap;font-family:inherit}
      .nav-dropdown-btn:hover,.nav-dropdown-btn.active{color:var(--gold)}
      .nav-dropdown{display:none;position:fixed;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:6px;min-width:160px;z-index:99999;box-shadow:0 8px 32px rgba(0,0,0,.4)}
      .nav-dropdown-wrap.open .nav-dropdown{display:flex !important;flex-direction:column;gap:2px}
      .nav-dropdown-item{display:block;padding:8px 12px;border-radius:7px;font-size:13px;color:var(--text2);text-decoration:none;transition:background .12s,color .12s;white-space:nowrap}
      .nav-dropdown-item:hover,.nav-dropdown-item.active{background:var(--bg3);color:var(--gold)}
    `;
    document.head.appendChild(s);
  }

  document.getElementById('nav-placeholder').innerHTML = `
  <nav>
    <a class="nav-logo" href="index.html">
      <img src="${LOGO}" alt="Mais Valor">
      <span>Mais <em>Valor</em></span>
    </a>
    <div class="nav-links">${links}</div>
    <div class="nav-right">
      <div class="nav-search-wrap">
        <span class="nav-search-icon">⌕</span>
        <input class="nav-search" type="text" placeholder="Buscar ativo... " id="nav-search-input"
          oninput="navSearchLive(this.value)" onkeydown="if(event.key==='Enter')navSearchGo(this.value)"
          onfocus="document.querySelector('.nav-search-shortcut').style.display='none'"
          onblur="document.querySelector('.nav-search-shortcut').style.display=''">
        <span class="nav-search-shortcut">/</span>
        <div id="nav-search-results"></div>
      </div>
      <button class="theme-toggle" id="theme-btn" onclick="toggleTheme()" title="Alternar tema">☀️</button>
      <div class="nav-badge">PRO</div>
    </div>
  </nav>

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
      <div class="idx-name">USD / BRL</div>
      <div class="idx-val" id="idx-dolar">—</div>
      <div class="idx-chg" id="idx-dolar-chg">—</div>
    </div>
  </div>`;

  // Aplica tema salvo
  applyTheme(getTheme());

  // Fecha busca e dropdowns ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search-wrap')) {
      const r = document.getElementById('nav-search-results');
      if (r) r.style.display = 'none';
    }
    if (!e.target.closest('.nav-dropdown-wrap')) {
      document.querySelectorAll('.nav-dropdown-wrap.open').forEach(el => el.classList.remove('open'));
    }
  });

  // Atalho de teclado "/" para abrir busca
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      document.getElementById('nav-search-input')?.focus();
    }
    if (e.key === 'Escape') {
      document.getElementById('nav-search-input')?.blur();
      const r = document.getElementById('nav-search-results');
      if (r) r.style.display = 'none';
    }
  });

  loadIndicesNav();
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
    <div onclick="location.href='ativo.html?t=${d.t}${isFii(d) ? '&tipo=fii' : ''}'"
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
  if (found) location.href = `ativo.html?t=${found.t}${found.t.match(/\d{2}$/) ? '&tipo=fii' : ''}`;
  else location.href = `acoes.html?q=${q}`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  document.getElementById('footer-placeholder').innerHTML = `
  <footer>
    <p>© ${year} <em>Mais Valor</em> — dados atualizados diariamente após o fechamento do pregão B3.<br>
    Não constitui recomendação de investimento.</p>
  </footer>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();
  navUpdateTotal();
});

// ── Dropdown com position:fixed (evita clipping do overflow-x:auto do nav-links) ──
function mvToggleDropdown(btn) {
  const wrap = btn.parentElement;
  const isOpen = wrap.classList.contains('open');

  // Fecha todos
  document.querySelectorAll('.nav-dropdown-wrap.open').forEach(el => {
    el.classList.remove('open');
  });

  if (!isOpen) {
    wrap.classList.add('open');
    // Posiciona o dropdown via getBoundingClientRect
    const dropdown = wrap.querySelector('.nav-dropdown');
    const rect = btn.getBoundingClientRect();
    dropdown.style.top  = (rect.bottom + 6) + 'px';
    dropdown.style.left = rect.left + 'px';
  }
}
