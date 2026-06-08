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
    
    // Atualiza CDI e SELIC no ticker bar
    const cdiEl = document.getElementById('tk-cdi');
    if(cdiEl && j.cdi?.anual) cdiEl.textContent = j.cdi.anual.toFixed(2) + '% a.a.';
    
    const selicEl = document.getElementById('tk-selic');
    if(selicEl && j.selic?.anual) selicEl.textContent = j.selic.anual.toFixed(2) + '% a.a.';

    const ipcaEl = document.getElementById('tk-ipca');
    if(ipcaEl && j.ipca?.acumulado_12m) ipcaEl.textContent = j.ipca.acumulado_12m.toFixed(2) + '%';

    // Disponibiliza globalmente para o gráfico
    window.BCB_DATA = j;
  } catch(e) {}
}

async function loadIndicesNav() {
  try {
    const r = await fetch('data/indices.json?t=' + Date.now());
    if (!r.ok) return;
    const j = await r.json();

    const fmt = (v, dec=0) => v?.val != null ? v.val.toLocaleString('pt-BR', {minimumFractionDigits:dec, maximumFractionDigits:dec}) : '—';
    const chgClass = v => v?.chg >= 0 ? 'up-pill' : 'dn-pill';
    const chgStr = v => v?.chg != null ? `${v.chg >= 0 ? '+' : ''}${v.chg.toFixed(2)}%` : '';

    // Ticker bar
    const tb = document.getElementById('ticker-bar-inner');
    if (tb && j.ibov) {
      tb.innerHTML = `
        <div class="ticker-item"><span class="ticker-name">IBOV</span><span class="ticker-val">${fmt(j.ibov)}</span><span class="pill ${chgClass(j.ibov)}">${chgStr(j.ibov)}</span></div>
        <span class="ticker-sep">|</span>
        <div class="ticker-item"><span class="ticker-name">IFIX</span><span class="ticker-val">${fmt(j.ifix)}</span><span class="pill ${chgClass(j.ifix)}">${chgStr(j.ifix)}</span></div>
        <span class="ticker-sep">|</span>
        <div class="ticker-item"><span class="ticker-name">USD/BRL</span><span class="ticker-val">R$${fmt(j.dolar,2)}</span><span class="pill ${chgClass(j.dolar)}">${chgStr(j.dolar)}</span></div>
        <span class="ticker-sep">|</span>
        <div class="ticker-item"><span class="ticker-name">EUR/BRL</span><span class="ticker-val">R$${fmt(j.euro,2)}</span><span class="pill ${chgClass(j.euro)}">${chgStr(j.euro)}</span></div>
        <span class="ticker-sep">|</span>
        <div class="ticker-item"><span class="ticker-name">OURO</span><span class="ticker-val">US$${fmt(j.ouro,0)}</span><span class="pill ${chgClass(j.ouro)}">${chgStr(j.ouro)}</span></div>
        <span class="ticker-sep">|</span>
        <div class="ticker-item"><span class="ticker-name">BTC</span><span class="ticker-val">US$${fmt(j.btc,0)}</span><span class="pill ${chgClass(j.btc)}">${chgStr(j.btc)}</span></div>
        <span class="ticker-sep">|</span>
        <div class="ticker-item"><span class="ticker-name">SELIC</span><span class="ticker-val">13,75%</span></div>
        <span class="ticker-sep">|</span>
        <div class="ticker-item"><span class="ticker-name">ATIVOS</span><span class="ticker-val" id="tk-total">—</span></div>`;
    }

    // Barra de índices
    if (j.ibov) {
      const el = document.getElementById('idx-ibov');
      if(el) el.textContent = fmt(j.ibov);
      const ec = document.getElementById('idx-ibov-chg');
      if(ec) { ec.textContent = `${j.ibov.chg_pts >= 0 ? '+' : ''}${j.ibov.chg_pts?.toFixed(0)} pts (${chgStr(j.ibov)})`; ec.className = `idx-chg ${j.ibov.chg >= 0 ? 'up' : 'dn'}`; }
    }
    if (j.ifix) {
      const el = document.getElementById('idx-ifix');
      if(el) el.textContent = fmt(j.ifix);
      const ec = document.getElementById('idx-ifix-chg');
      if(ec) { ec.textContent = `${chgStr(j.ifix)}`; ec.className = `idx-chg ${j.ifix.chg >= 0 ? 'up' : 'dn'}`; }
    }
    if (j.dolar) {
      const el = document.getElementById('idx-dolar');
      if(el) el.textContent = 'R$ ' + fmt(j.dolar, 2);
      const ec = document.getElementById('idx-dolar-chg');
      if(ec) { ec.textContent = chgStr(j.dolar); ec.className = `idx-chg ${j.dolar.chg >= 0 ? 'up' : 'dn'}`; }
    }
  } catch(e) {}
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
    <div class="ticker-item"><span class="ticker-name">Carregando índices...</span></div>
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

  setTimeout(loadIndicesNav, 500);
  setTimeout(loadBCBNav, 800);
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
