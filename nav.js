// nav.js — componente compartilhado de navegação
const LOGO = 'logo.png';

const NAV_LINKS = [
  { href: 'index.html',       label: 'Home' },
  { href: 'acoes.html',       label: 'Ações' },
  { href: 'fiis.html',        label: 'FIIs' },
  { href: 'dividendos.html',  label: 'Dividendos' },
  { href: 'rankings.html',    label: 'Rankings' },
  { href: 'ferramentas.html', label: 'Ferramentas' },
];

const TICKER_DATA = [
  { name:'IBOV', val:'136.420', chg:'+0.82%', up:true },
  { name:'IFIX', val:'3.421',   chg:'-0.14%', up:false },
  { name:'USD/BRL', val:'5,18', chg:'-0.23%', up:false },
  { name:'EUR/BRL', val:'5,62', chg:'+0.11%', up:true },
  { name:'SELIC', val:'13,75%', chg:null },
  { name:'CDI',   val:'13,65%', chg:null },
  { name:'IPCA 12m', val:'4,62%', chg:null },
  { name:'OURO', val:'R$18.320', chg:'+0.44%', up:true },
  { name:'PETRÓLEO', val:'US$74,3', chg:'-0.67%', up:false },
  { name:'BTC', val:'US$67.420', chg:'+2.14%', up:true },
];

const INDICES = [
  { name:'Ibovespa', val:'136.420', chg:'+1.124 pts (+0.82%)', up:true },
  { name:'IFIX',     val:'3.421',   chg:'-4,8 pts (-0.14%)',   up:false },
  { name:'Small Caps', val:'2.187', chg:'+12,3 pts (+0.57%)',  up:true },
  { name:'IDIV',     val:'8.932',   chg:'+43 pts (+0.48%)',    up:true },
  { name:'BDRX',     val:'5.614',   chg:'-28 pts (-0.49%)',    up:false },
];

function renderNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = NAV_LINKS.map(l =>
    `<a href="${l.href}" class="${page===l.href?'active':''}">${l.label}</a>`
  ).join('');

  document.getElementById('nav-placeholder').innerHTML = `
  <nav>
    <a class="nav-logo" href="index.html">
      <img src="${LOGO}" alt="Mais Valor">
      <span>MAIS <em>VALOR</em></span>
    </a>
    <div class="nav-links">${links}</div>
    <div class="nav-right">
      <input class="nav-search" type="text" placeholder="🔍 Buscar ativo..." oninput="navSearch(this.value)">
      <div class="nav-badge">PRO</div>
    </div>
  </nav>
  <div class="ticker-bar">
    ${TICKER_DATA.map((t,i) => `
      ${i>0?'<span class="ticker-sep">|</span>':''}
      <div class="ticker-item">
        <span class="ticker-name">${t.name}</span>
        <span class="ticker-val">${t.val}</span>
        ${t.chg?`<span class="pill ${t.up?'up-pill':'dn-pill'}">${t.chg}</span>`:''}
      </div>`).join('')}
  </div>
  <div class="indices-bar">
    ${INDICES.map(i=>`
      <div class="idx-card">
        <div class="idx-name">${i.name}</div>
        <div class="idx-val">${i.val}</div>
        <div class="idx-chg ${i.up?'up':'dn'}">${i.chg}</div>
      </div>`).join('')}
  </div>`;
}

function navSearch(q) {
  if (q.length < 2) return;
  // redireciona para a página mais relevante
  const fiis = ['11','FII'];
  const isFii = fiis.some(f => q.toUpperCase().includes(f));
  if (isFii) window.location.href = `fiis.html?q=${q}`;
  else window.location.href = `acoes.html?q=${q}`;
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
});
