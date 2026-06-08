const LOGO = 'logo.png';

const NAV_LINKS = [
  { href: 'index.html',        label: 'Home' },
  { href: 'acoes.html',        label: 'Ações' },
  { href: 'fiis.html',         label: 'FIIs' },
  { href: 'dividendos.html',   label: 'Dividendos' },
  { href: 'rankings.html',     label: 'Rankings' },
  { href: 'comparador.html',   label: 'Comparador' },
  { href: 'ferramentas.html',  label: 'Ferramentas' },
  { href: 'watchlist.html',              label: '★ Watchlist' },
  { href: 'Calculadora_maisvalor/index.html', label: 'Simulador' },
  { href: 'status.html',                 label: '● Status' },
];

async function loadBCBNav() {
  try {
    const r = await fetch('data/bcb.json?t=' + Date.now());
    if (!r.ok) return;
    const j = await r.json();
    const cdiEl = document.getElementById('tk-selic');
    if(cdiEl && j.cdi?.anual) cdiEl.textContent = j.cdi.anual.toFixed(2) + '% a.a.';
    const ipcaEl = document.getElementById('tk-ipca');
    if(ipcaEl && j.ipca?.acumulado_12m) ipcaEl.textContent = j.ipca.acumulado_12m.toFixed(2) + '%';
    window.BCB_DATA = j;
  } catch(e) {}
}

// Busca índices diretamente via APIs públicas (sempre, sem depender do indices.json)
async function fetchLiveIndices() {
  const result = {};

  // Busca câmbio + IBOV em paralelo
  await Promise.allSettled([
    // USD/BRL e EUR/BRL via AwesomeAPI (gratuita, sem CORS)
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-USD')
      .then(r => r.json())
      .then(d => {
        if (d.USDBRL?.bid) result.dolar = { val: +parseFloat(d.USDBRL.bid).toFixed(4), chg: +parseFloat(d.USDBRL.pctChange).toFixed(2), chg_pts: 0 };
        if (d.EURBRL?.bid) result.euro  = { val: +parseFloat(d.EURBRL.bid).toFixed(4), chg: +parseFloat(d.EURBRL.pctChange).toFixed(2), chg_pts: 0 };
        if (d.BTCUSD?.bid) result.btc   = { val: +parseFloat(d.BTCUSD.bid).toFixed(0), chg: +parseFloat(d.BTCUSD.pctChange).toFixed(2), chg_pts: 0 };
      })
      .catch(() => {}),

    // IBOV e IFIX via Brapi
    fetch('https://brapi.dev/api/quote/%5EBVSP,IFIX11?fundamental=false')
      .then(r => r.json())
      .then(d => {
        for (const q of (d.results || [])) {
          if (q.symbol === '^BVSP' && q.regularMarketPrice) {
            result.ibov = { val: q.regularMarketPrice, chg: +(q.regularMarketChangePercent||0).toFixed(2), chg_pts: +(q.regularMarketChange||0).toFixed(2) };
          }
          if (q.symbol === 'IFIX11' && q.regularMarketPrice) {
            result.ifix = { val: q.regularMarketPrice, chg: +(q.regularMarketChangePercent||0).toFixed(2), chg_pts: +(q.regularMarketChange||0).toFixed(2) };
          }
        }
      })
      .catch(() => {}),
  ]);

  return result;
}

async function loadIndicesNav() {
  const fmt = (v, dec=0) => v?.val != null && v.val > 0
    ? v.val.toLocaleString('pt-BR', {minimumFractionDigits:dec, maximumFractionDigits:dec})
    : '—';
  const chgClass = v => (v?.chg || 0) >= 0 ? 'up-pill' : 'dn-pill';
  const chgStr  = v => v?.chg != null ? `${v.chg >= 0 ? '+' : ''}${v.chg.toFixed(2)}%` : '';
  const pill    = v => v?.val > 0 ? `<span class="pill ${chgClass(v)}">${chgStr(v)}</span>` : '';

  // Carrega indices.json E live em paralelo
  const [jsonResult, liveResult] = await Promise.allSettled([
    fetch('data/indices.json?t=' + Date.now()).then(r => r.ok ? r.json() : {}),
    fetchLiveIndices(),
  ]);

  const fromJson = jsonResult.status === 'fulfilled' ? (jsonResult.value || {}) : {};
  const fromLive = liveResult.status  === 'fulfilled' ? (liveResult.value  || {}) : {};

  // Live tem prioridade se tiver valor válido; caso contrário usa JSON
  const pick = (key) => {
    const live = fromLive[key];
    const json = fromJson[key];
    if (live?.val && live.val > 0) return live;
    if (json?.val && json.val > 0) return json;
    return null;
  };

  const j = {
    ibov:  pick('ibov'),
    ifix:  pick('ifix'),
    dolar: pick('dolar'),
    euro:  pick('euro'),
    btc:   pick('btc'),
    ouro:  pick('ouro'),
  };

  // ── Ticker bar ──────────────────────────────────────────────────
  const tb = document.getElementById('ticker-bar-inner');
  if (tb) {
    tb.innerHTML = `
      <div class="ticker-item"><span class="ticker-name">IBOV</span><span class="ticker-val">${fmt(j.ibov)}</span>${pill(j.ibov)}</div>
      <span class="ticker-sep">|</span>
      <div class="ticker-item"><span class="ticker-name">IFIX</span><span class="ticker-val">${fmt(j.ifix)}</span>${pill(j.ifix)}</div>
      <span class="ticker-sep">|</span>
      <div class="ticker-item"><span class="ticker-name">USD/BRL</span><span class="ticker-val">R$${fmt(j.dolar,4)}</span>${pill(j.dolar)}</div>
      <span class="ticker-sep">|</span>
      <div class="ticker-item"><span class="ticker-name">EUR/BRL</span><span class="ticker-val">R$${fmt(j.euro,4)}</span>${pill(j.euro)}</div>
      <span class="ticker-sep">|</span>
      <div class="ticker-item"><span class="ticker-name">OURO</span><span class="ticker-val">US$${fmt(j.ouro,0)}</span>${pill(j.ouro)}</div>
      <span class="ticker-sep">|</span>
      <div class="ticker-item"><span class="ticker-name">BTC</span><span class="ticker-val">US$${fmt(j.btc,0)}</span>${pill(j.btc)}</div>
      <span class="ticker-sep">|</span>
      <div class="ticker-item"><span class="ticker-name">SELIC</span><span class="ticker-val" id="tk-selic">—</span></div>
      <span class="ticker-sep">|</span>
      <div class="ticker-item"><span class="ticker-name">ATIVOS</span><span class="ticker-val" id="tk-total">—</span></div>`;
  }

  // ── Barra de índices ─────────────────────────────────────────────
  if (j.ibov) {
    const el = document.getElementById('idx-ibov');
    if(el) el.textContent = fmt(j.ibov);
    const ec = document.getElementById('idx-ibov-chg');
    if(ec) { ec.textContent = `${(j.ibov.chg_pts||0) >= 0 ? '+' : ''}${(j.ibov.chg_pts||0).toFixed(0)} pts (${chgStr(j.ibov)})`; ec.className = `idx-chg ${j.ibov.chg >= 0 ? 'up' : 'dn'}`; }
  }
  if (j.ifix) {
    const el = document.getElementById('idx-ifix');
    if(el) el.textContent = fmt(j.ifix);
    const ec = document.getElementById('idx-ifix-chg');
    if(ec) { ec.textContent = chgStr(j.ifix); ec.className = `idx-chg ${j.ifix.chg >= 0 ? 'up' : 'dn'}`; }
  }
  if (j.dolar) {
    const el = document.getElementById('idx-dolar');
    if(el) el.textContent = 'R$ ' + fmt(j.dolar, 4);
    const ec = document.getElementById('idx-dolar-chg');
    if(ec) { ec.textContent = chgStr(j.dolar); ec.className = `idx-chg ${j.dolar.chg >= 0 ? 'up' : 'dn'}`; }
  }

  setTimeout(loadBCBNav, 300);
}

function renderNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = NAV_LINKS.map(l => {
    const isStatus = l.href === 'status.html';
    return `<a href="${l.href}" class="${page === l.href ? 'active' : ''}" style="${isStatus ? 'color:var(--up);font-size:11px' : ''}">${l.label}</a>`;
  }).join('');

  document.getElementById('nav-placeholder').innerHTML = `
  <nav>
    <a class="nav-logo" href="index.html">
      <img src="${LOGO}" alt="Mais Valor">
      <span>MAIS <em>VALOR</em></span>
    </a>
    <div class="nav-links">${links}</div>
    <div class="nav-right" style="position:relative">
      <input class="nav-search" type="text" placeholder="🔍 Buscar ativo..." id="nav-search-input"
        oninput="navSearchLive(this.value)" onkeydown="if(event.key==='Enter')navSearchGo(this.value)">
      <div id="nav-search-results" style="position:absolute;top:54px;right:0;background:var(--bg2);border:1px solid var(--border);border-radius:10px;width:300px;max-height:360px;overflow-y:auto;display:none;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.6)"></div>
      <div class="nav-badge">PRO</div>
    </div>
  </nav>
  <div class="ticker-bar" id="ticker-bar-inner">
    <div class="ticker-item"><span class="ticker-name" style="color:var(--text3)">Carregando índices...</span></div>
  </div>
  <div class="indices-bar">
    <div class="idx-card"><div class="idx-name">Ibovespa</div><div class="idx-val" id="idx-ibov">—</div><div class="idx-chg" id="idx-ibov-chg">—</div></div>
    <div class="idx-card"><div class="idx-name">IFIX</div><div class="idx-val" id="idx-ifix">—</div><div class="idx-chg" id="idx-ifix-chg">—</div></div>
    <div class="idx-card"><div class="idx-name">Small Caps</div><div class="idx-val">2.187</div><div class="idx-chg up">+0.57%</div></div>
    <div class="idx-card"><div class="idx-name">IDIV</div><div class="idx-val">8.932</div><div class="idx-chg up">+0.48%</div></div>
    <div class="idx-card"><div class="idx-name">USD/BRL</div><div class="idx-val" id="idx-dolar">—</div><div class="idx-chg" id="idx-dolar-chg">—</div></div>
  </div>`;

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-right')) {
      const r = document.getElementById('nav-search-results');
      if(r) r.style.display = 'none';
    }
  });

  loadIndicesNav();
}

function navUpdateTotal() {
  setTimeout(() => {
    const el = document.getElementById('tk-total');
    if(el && typeof ACOES !== 'undefined') el.textContent = (ACOES.length + (FIIS?.length||0)) + ' ativos';
  }, 3000);
}

function navSearchLive(q) {
  const box = document.getElementById('nav-search-results');
  if (!box || q.length < 2) { if(box) box.style.display = 'none'; return; }
  const all = [...(typeof ACOES!=='undefined'?ACOES:[]), ...(typeof FIIS!=='undefined'?FIIS:[])];
  const results = all.filter(d =>
    d.t.toLowerCase().startsWith(q.toLowerCase()) ||
    d.n.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);
  if (!results.length) { box.style.display = 'none'; return; }
  const isFii = d => d.t.match(/\d{2}$/);
  box.innerHTML = results.map(d => `
    <div onclick="location.href='ativo.html?t=${d.t}${isFii(d)?'&tipo=fii':''}'"
      style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .1s"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
      <div>
        <div style="font-weight:700;font-size:13px">${d.t}</div>
        <div style="font-size:11px;color:var(--text3)">${d.n}</div>
      </div>
      <div style="text-align:right">
        <div style="font-family:'DM Mono',monospace;font-size:13px">R$ ${d.p.toFixed(2)}</div>
        <div style="font-size:11px;color:${d.v>=0?'var(--up)':'var(--dn)'}">${d.v>=0?'+':''}${d.v.toFixed(2)}%</div>
      </div>
    </div>`).join('');
  box.style.display = 'block';
}

function navSearchGo(q) {
  if (!q) return;
  const all = [...(typeof ACOES!=='undefined'?ACOES:[]), ...(typeof FIIS!=='undefined'?FIIS:[])];
  const found = all.find(d => d.t.toLowerCase() === q.toLowerCase());
  if (found) location.href = `ativo.html?t=${found.t}${found.t.match(/\d{2}$/)?'&tipo=fii':''}`;
  else location.href = `acoes.html?q=${q}`;
}

function renderFooter() {
  document.getElementById('footer-placeholder').innerHTML = `
  <footer>
    <p>© 2025 <em>Mais Valor</em> — dados atualizados diariamente após o fechamento do pregão B3. Não constitui recomendação de investimento.</p>
  </footer>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();
  navUpdateTotal();
});
