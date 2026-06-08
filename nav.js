const LOGO = 'logo.png';

const NAV_LINKS = [
  { href: 'index.html',        label: 'Home' },
  { href: 'acoes.html',        label: 'Ações' },
  { href: 'fiis.html',         label: 'FIIs' },
  { href: 'dividendos.html',   label: 'Dividendos' },
  { href: 'rankings.html',     label: 'Rankings' },
  { href: 'comparador.html',   label: 'Comparador' },
  { href: 'ferramentas.html',  label: 'Ferramentas' },
  { href: 'watchlist.html',    label: '★ Watchlist' },
  { href: 'Calculadora_maisvalor/index.html', label: 'Simulador' },
  { href: 'status.html',       label: '● Status' },
];

async function loadBCBNav() {
  try {
    const r = await fetch('data/bcb.json?t=' + Date.now());
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

async function fetchLiveIndices() {
  const result = {};
  await Promise.allSettled([
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-USD')
      .then(r => r.json())
      .then(d => {
        if (d.USDBRL?.bid) result.dolar = { val: +parseFloat(d.USDBRL.bid).toFixed(4), chg: +parseFloat(d.USDBRL.pctChange).toFixed(2) };
        if (d.EURBRL?.bid) result.euro  = { val: +parseFloat(d.EURBRL.bid).toFixed(4), chg: +parseFloat(d.EURBRL.pctChange).toFixed(2) };
        if (d.BTCUSD?.bid) result.btc   = { val: +parseFloat(d.BTCUSD.bid).toFixed(0), chg: +parseFloat(d.BTCUSD.pctChange).toFixed(2) };
      })
      .catch(() => {}),
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

function fmtNum(v, dec=0) {
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
    dolar: pick('dolar'),
    euro:  pick('euro'),
    btc:   pick('btc'),
    ouro:  pick('ouro'),
  };

  // ── Ticker bar (animated scroll) ────────────────────────────────
  const buildTickerItems = () => {
    const items = [
      j.ibov  && `<div class="ticker-item"><span class="ticker-name">IBOV</span><span class="ticker-val">${fmtNum(j.ibov)}</span>${pillHtml(j.ibov)}</div>`,
      j.ifix  && `<div class="ticker-item"><span class="ticker-name">IFIX</span><span class="ticker-val">${fmtNum(j.ifix)}</span>${pillHtml(j.ifix)}</div>`,
      j.dolar && `<div class="ticker-item"><span class="ticker-name">USD/BRL</span><span class="ticker-val">R$${fmtNum(j.dolar,4)}</span>${pillHtml(j.dolar)}</div>`,
      j.euro  && `<div class="ticker-item"><span class="ticker-name">EUR/BRL</span><span class="ticker-val">R$${fmtNum(j.euro,4)}</span>${pillHtml(j.euro)}</div>`,
      j.ouro  && `<div class="ticker-item"><span class="ticker-name">OURO</span><span class="ticker-val">US$${fmtNum(j.ouro,0)}</span>${pillHtml(j.ouro)}</div>`,
      j.btc   && `<div class="ticker-item"><span class="ticker-name">BTC</span><span class="ticker-val">US$${fmtNum(j.btc,0)}</span>${pillHtml(j.btc)}</div>`,
      `<div class="ticker-item"><span class="ticker-name">SELIC</span><span class="ticker-val tk-selic">—</span></div>`,
      `<div class="ticker-item"><span class="ticker-name">IPCA</span><span class="ticker-val tk-ipca">—</span></div>`,
    ].filter(Boolean);
    return items.join('');
  };

  const track = document.getElementById('ticker-track');
  if (track) {
    const html = buildTickerItems();
    // Duplicate for seamless loop
    track.innerHTML = html + html;
  }

  // ── Index cards ──────────────────────────────────────────────────
  const updateCard = (valId, chgId, data, decimals=0, prefix='') => {
    const valEl = document.getElementById(valId);
    const chgEl = document.getElementById(chgId);
    if (!data) return;
    if (valEl) valEl.textContent = prefix + fmtNum(data, decimals);
    if (chgEl) {
      chgEl.textContent = chgStr(data);
      chgEl.className = `idx-chg ${(data.chg||0) >= 0 ? 'up' : 'dn'}`;
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
  if (j.ifix) {
    const el = document.getElementById('idx-ifix');
    if (el) el.textContent = fmtNum(j.ifix);
    const ec = document.getElementById('idx-ifix-chg');
    if (ec) { ec.textContent = chgStr(j.ifix); ec.className = `idx-chg ${j.ifix.chg >= 0 ? 'up' : 'dn'}`; }
  }
  if (j.dolar) {
    const el = document.getElementById('idx-dolar');
    if (el) el.textContent = 'R$ ' + fmtNum(j.dolar, 4);
    const ec = document.getElementById('idx-dolar-chg');
    if (ec) { ec.textContent = chgStr(j.dolar); ec.className = `idx-chg ${j.dolar.chg >= 0 ? 'up' : 'dn'}`; }
  }

  setTimeout(loadBCBNav, 300);
}

function renderNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = NAV_LINKS.map(l => {
    const isStatus = l.href === 'status.html';
    const cls = page === l.href ? 'active' : '';
    const style = isStatus ? 'color:var(--up);font-size:11px' : '';
    return `<a href="${l.href}" class="${cls}" style="${style}">${l.label}</a>`;
  }).join('');

  document.getElementById('nav-placeholder').innerHTML = `
  <nav>
    <a class="nav-logo" href="index.html">
      <img src="${LOGO}" alt="Mais Valor">
      <span>MAIS <em>VALOR</em></span>
    </a>
    <div class="nav-links">${links}</div>
    <div class="nav-right">
      <div class="nav-search-wrap">
        <span class="nav-search-icon">⌕</span>
        <input class="nav-search" type="text" placeholder="Buscar ativo..." id="nav-search-input"
          oninput="navSearchLive(this.value)" onkeydown="if(event.key==='Enter')navSearchGo(this.value)">
        <div id="nav-search-results"></div>
      </div>
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
      <div class="idx-val">—</div>
      <div class="idx-chg" style="color:var(--text3)">via brapi</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">IDIV</div>
      <div class="idx-val">—</div>
      <div class="idx-chg" style="color:var(--text3)">via brapi</div>
    </div>
    <div class="idx-card">
      <div class="idx-name">USD / BRL</div>
      <div class="idx-val" id="idx-dolar">—</div>
      <div class="idx-chg" id="idx-dolar-chg">—</div>
    </div>
  </div>`;

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search-wrap')) {
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
  const all = [...(typeof ACOES !== 'undefined' ? ACOES : []), ...(typeof FIIS !== 'undefined' ? FIIS : [])];
  const results = all.filter(d =>
    d.t.toLowerCase().startsWith(q.toLowerCase()) || d.n.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);
  if (!results.length) { box.style.display = 'none'; return; }
  const isFii = d => d.t.match(/\d{2}$/);
  box.innerHTML = results.map(d => `
    <div onclick="location.href='ativo.html?t=${d.t}${isFii(d) ? '&tipo=fii' : ''}'"
      style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
      <div style="display:flex;align-items:center;gap:10px">
        <img src="https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${d.t}.png"
          onerror="this.style.display='none'"
          style="width:22px;height:22px;border-radius:50%;object-fit:contain;background:#fff;flex-shrink:0">
        <div>
          <div style="font-weight:700;font-size:13px">${d.t}</div>
          <div style="font-size:11px;color:var(--text3)">${d.n}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--font-mono);font-size:13px">R$ ${d.p.toFixed(2)}</div>
        <div style="font-size:11px;color:${d.v >= 0 ? 'var(--up)' : 'var(--dn)'}">${d.v >= 0 ? '+' : ''}${d.v.toFixed(2)}%</div>
      </div>
    </div>`).join('');
  box.style.display = 'block';
}

function navSearchGo(q) {
  if (!q) return;
  const all = [...(typeof ACOES !== 'undefined' ? ACOES : []), ...(typeof FIIS !== 'undefined' ? FIIS : [])];
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
