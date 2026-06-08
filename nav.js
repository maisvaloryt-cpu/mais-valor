const LOGO = 'logo.png';

const NAV_LINKS = [
  { href: 'index.html',        label: 'Home' },
  { href: 'acoes.html',        label: 'Ações' },
  { href: 'fiis.html',         label: 'FIIs' },
  { href: 'dividendos.html',   label: 'Dividendos' },
  { href: 'rankings.html',     label: 'Rankings' },
  { href: 'comparador.html',   label: 'Comparador' },
  { href: 'ferramentas.html',  label: 'Ferramentas' },
  { href: 'status.html',       label: '● Status' },
];

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
      <input class="nav-search" type="text" placeholder="🔍 Buscar ativo..." id="nav-search-input"
        oninput="navSearchLive(this.value)" onkeydown="if(event.key==='Enter')navSearchGo(this.value)">
      <div id="nav-search-results" style="position:absolute;top:54px;right:2rem;background:var(--bg2);border:1px solid var(--border);border-radius:10px;width:280px;max-height:320px;overflow-y:auto;display:none;z-index:200;box-shadow:0 8px 32px rgba(0,0,0,0.5)"></div>
      <div class="nav-badge">PRO</div>
    </div>
  </nav>
  <div class="ticker-bar" id="ticker-bar-inner">
    <div class="ticker-item"><span class="ticker-name">IBOV</span><span class="ticker-val" id="tk-ibov">—</span></div>
    <span class="ticker-sep">|</span>
    <div class="ticker-item"><span class="ticker-name">IFIX</span><span class="ticker-val" id="tk-ifix">—</span></div>
    <span class="ticker-sep">|</span>
    <div class="ticker-item"><span class="ticker-name">USD/BRL</span><span class="ticker-val" id="tk-dolar">—</span></div>
    <span class="ticker-sep">|</span>
    <div class="ticker-item"><span class="ticker-name">SELIC</span><span class="ticker-val">13,75%</span></div>
    <span class="ticker-sep">|</span>
    <div class="ticker-item"><span class="ticker-name">CDI</span><span class="ticker-val">13,65%</span></div>
    <span class="ticker-sep">|</span>
    <div class="ticker-item"><span class="ticker-name">IPCA 12m</span><span class="ticker-val">4,62%</span></div>
    <span class="ticker-sep">|</span>
    <div class="ticker-item"><span class="ticker-name">ATIVOS</span><span class="ticker-val" id="tk-total">—</span></div>
  </div>
  <div class="indices-bar">
    <div class="idx-card"><div class="idx-name">Ibovespa</div><div class="idx-val" id="idx-ibov">—</div><div class="idx-chg" id="idx-ibov-chg">—</div></div>
    <div class="idx-card"><div class="idx-name">IFIX</div><div class="idx-val" id="idx-ifix">—</div><div class="idx-chg" id="idx-ifix-chg">—</div></div>
    <div class="idx-card"><div class="idx-name">Small Caps</div><div class="idx-val">2.187</div><div class="idx-chg up">+12,3 pts (+0.57%)</div></div>
    <div class="idx-card"><div class="idx-name">IDIV</div><div class="idx-val">8.932</div><div class="idx-chg up">+43 pts (+0.48%)</div></div>
    <div class="idx-card"><div class="idx-name">USD/BRL</div><div class="idx-val" id="idx-dolar">—</div><div class="idx-chg" id="idx-dolar-chg">—</div></div>
  </div>`;

  // Fecha busca ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-right')) {
      document.getElementById('nav-search-results').style.display = 'none';
    }
  });
}

function navUpdateTickers() {
  // Atualiza com dados reais quando disponíveis
  setTimeout(() => {
    if (typeof ACOES !== 'undefined' && ACOES.length) {
      document.getElementById('tk-total').textContent = (ACOES.length + (FIIS?.length||0)) + ' ativos';
    }
    if (typeof DATA_UPDATED_AT !== 'undefined' && DATA_UPDATED_AT) {
      const el = document.getElementById('nav-updated');
      if (el) el.textContent = DATA_UPDATED_AT;
    }
  }, 2000);
}

function navSearchLive(q) {
  const box = document.getElementById('nav-search-results');
  if (q.length < 2) { box.style.display = 'none'; return; }
  
  const all = [...(typeof ACOES!=='undefined'?ACOES:[]), ...(typeof FIIS!=='undefined'?FIIS:[])];
  const results = all.filter(d =>
    d.t.toLowerCase().startsWith(q.toLowerCase()) ||
    d.n.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);

  if (!results.length) { box.style.display = 'none'; return; }

  const isFii = d => d.t.endsWith('11');
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
  if (found) {
    location.href = `ativo.html?t=${found.t}${found.t.endsWith('11')?'&tipo=fii':''}`;
  } else {
    location.href = `acoes.html?q=${q}`;
  }
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
  navUpdateTickers();
});
