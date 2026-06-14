/* ===================== CONSOLIDADOR DE CARTEIRA - NÚCLEO COMPARTILHADO ===================== */

const CLASS_COLORS={'B3':'#185FA5','FII':'#3B6D11','Crypto':'#BA7517','RF':'#534AB7','ETF':'#0F6E56','Exterior':'#993C1D','BDR':'#72243E'};
const CLASS_LABEL={'B3':'Ações B3','FII':'FIIs','Crypto':'Criptos','RF':'Renda Fixa','ETF':'ETFs','Exterior':'Exterior','BDR':'BDRs'};
const CLASS_BADGE={'B3':'badge-b3','FII':'badge-fii','Crypto':'badge-crypto','RF':'badge-rf','ETF':'badge-etf','Exterior':'badge-ext','BDR':'badge-bdr'};
const IRPF_CODE={'B3':'03','FII':'73','Crypto':'08','RF':'45','ETF':'03','Exterior':'03','BDR':'04'};
const NOTA_COLOR=n=>n>=8?'#1D9E75':n>=5?'#BA7517':'#E24B4A';

const STORAGE_ATIVOS='consolidador_ativos_v2';
const STORAGE_METAS='consolidador_metas_v2';

const DEFAULT_ATIVOS=[
  {ticker:'PETR4',classe:'B3',tipo:'Compra',qtd:200,pm:32.5,cotacao:38.2,dy:8.2,data:'2024-03-15',moeda:'BRL',nota:8,ideal:5,comprar:'Sim'},
  {ticker:'BBAS3',classe:'B3',tipo:'Compra',qtd:150,pm:48.0,cotacao:45.2,dy:9.5,data:'2024-04-01',moeda:'BRL',nota:7,ideal:4,comprar:'Não'},
  {ticker:'MXRF11',classe:'FII',tipo:'Compra',qtd:300,pm:10.2,cotacao:10.8,dy:12.5,data:'2024-04-10',moeda:'BRL',nota:9,ideal:8,comprar:'Sim'},
  {ticker:'HGLG11',classe:'FII',tipo:'Compra',qtd:50,pm:158,cotacao:167,dy:8.9,data:'2024-02-20',moeda:'BRL',nota:8,ideal:5,comprar:'Sim'},
  {ticker:'BTC',classe:'Crypto',tipo:'Compra',qtd:0.05,pm:280000,cotacao:345000,dy:0,data:'2024-01-20',moeda:'BRL',nota:6,ideal:5,comprar:'Não'},
  {ticker:'AAPL',classe:'Exterior',tipo:'Compra',qtd:5,pm:870,cotacao:940,dy:1.2,data:'2024-05-01',moeda:'USD',nota:8,ideal:6,comprar:'Sim'},
  {ticker:'TSLA',classe:'Exterior',tipo:'Compra',qtd:3,pm:600,cotacao:520,dy:0,data:'2024-06-01',moeda:'USD',nota:5,ideal:3,comprar:'Não'},
  {ticker:'TESOURO SELIC',classe:'RF',tipo:'Compra',qtd:1,pm:15000,cotacao:16200,dy:10.75,data:'2023-11-01',moeda:'BRL',nota:9,ideal:10,comprar:'Sim'},
  {ticker:'BOVA11',classe:'ETF',tipo:'Compra',qtd:50,pm:110,cotacao:118,dy:4.5,data:'2024-02-14',moeda:'BRL',nota:7,ideal:4,comprar:'Sim'},
  {ticker:'VALE3',classe:'B3',tipo:'Compra',qtd:100,pm:68,cotacao:62,dy:11.2,data:'2023-12-10',moeda:'BRL',nota:7,ideal:4,comprar:'Não'},
];

const DEFAULT_METAS=[
  {classe:'B3',ideal:30},{classe:'FII',ideal:25},{classe:'RF',ideal:20},{classe:'Crypto',ideal:10},{classe:'Exterior',ideal:10},{classe:'ETF',ideal:5}
];

function loadAtivos(){
  try{
    const raw=localStorage.getItem(STORAGE_ATIVOS);
    if(raw)return JSON.parse(raw);
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_ATIVOS));
}
function saveAtivos(){ localStorage.setItem(STORAGE_ATIVOS, JSON.stringify(ativos)); }

function loadMetas(){
  try{
    const raw=localStorage.getItem(STORAGE_METAS);
    if(raw)return JSON.parse(raw);
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_METAS));
}
function saveMetas(){ localStorage.setItem(STORAGE_METAS, JSON.stringify(metas)); }

let ativos=loadAtivos();
let metas=loadMetas();
let charts={};

/* ---- formatação ---- */
const fmt=(v,d=2)=>(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtR=v=>'R$ '+fmt(v);
const fmtP=(v,plus=true)=>(plus&&v>=0?'+':'')+fmt(v)+'%';

/* ---- cálculos ---- */
function calcAtivos(){
  return ativos.map(a=>{
    const vt=a.qtd*a.cotacao, custo=a.qtd*a.pm, res=vt-custo, resPct=custo>0?((vt-custo)/custo)*100:0;
    return{...a,vt,custo,res,resPct};
  });
}
function getTotals(){
  const c=calcAtivos();
  const total=c.reduce((s,a)=>s+a.vt,0);
  const custo=c.reduce((s,a)=>s+a.custo,0);
  const res=total-custo;
  const resPct=custo>0?((total-custo)/custo)*100:0;
  const provAno=c.reduce((s,a)=>s+(a.vt*(a.dy/100)),0);
  const dyMed=total>0?c.reduce((s,a)=>s+(a.dy*(a.vt/total)),0):0;
  return{total,custo,res,resPct,provAno,dyMed};
}
function byClasse(c){
  const m={};
  c.forEach(a=>{m[a.classe]=(m[a.classe]||0)+a.vt});
  return m;
}

/* ---- toast ---- */
function toast(msg){
  let el=document.getElementById('toast');
  if(!el){
    el=document.createElement('div');
    el.id='toast';
    el.className='toast';
    document.body.appendChild(el);
  }
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
}

/* ---- ações de cabeçalho (placeholders das integrações externas) ---- */
function infoB3(){
  toast('Essa opção estará disponível em breve.');
}
function exportarRelatorioIRPF(){
  const c=calcAtivos();
  const data={
    geradoEm:new Date().toISOString(),
    bensEDireitos:c.map(a=>({ticker:a.ticker,classe:CLASS_LABEL[a.classe]||a.classe,codigoIRPF:IRPF_CODE[a.classe]||'03',custoAquisicao:a.custo,quantidade:a.qtd,precoMedio:a.pm})),
    rendimentosIsentos:c.map(a=>({ticker:a.ticker,classe:CLASS_LABEL[a.classe]||a.classe,dyAnual:a.dy,proventoEstAnual:a.vt*(a.dy/100),tributacao:(a.classe==='FII'||a.classe==='B3')?'Isento':'Tributável'})),
    ganhoCapital:c.reduce((s,a)=>s+a.res,0)
  };
  downloadFile('relatorio_irpf.json', JSON.stringify(data,null,2), 'application/json');
  toast('Relatório IRPF exportado.');
}
function downloadFile(filename, content, mime){
  const blob=new Blob([content],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url)},100);
}

/* ---- importar Excel / CSV ---- */
function openImport(){
  document.getElementById('csv-input').click();
}
function processImportRows(rows){
  // rows: array of arrays (first row may be header)
  let start=0;
  if(rows.length && typeof rows[0][0]==='string' && rows[0][0].toLowerCase().includes('ticker'))start=1;
  let count=0;
  for(let i=start;i<rows.length;i++){
    const cols=rows[i];
    if(!cols || cols.length<5)continue;
    const [ticker,classe,tipo,qtd,pm,cotacao,dy,data,nota,ideal,moeda,comprar]=cols;
    if(!ticker)continue;
    let dataStr=data;
    if(data instanceof Date)dataStr=data.toISOString().slice(0,10);
    const obj={
      ticker:String(ticker).trim().toUpperCase(),
      classe:classe?String(classe).trim():'B3',
      tipo:tipo?String(tipo).trim():'Compra',
      qtd:parseFloat(qtd)||0,
      pm:parseFloat(pm)||0,
      cotacao:parseFloat(cotacao)||parseFloat(pm)||0,
      dy:parseFloat(dy)||0,
      data:dataStr||new Date().toISOString().slice(0,10),
      nota:parseInt(nota)||0,
      ideal:parseFloat(ideal)||0,
      moeda:moeda?String(moeda).trim():'BRL',
      comprar:comprar?String(comprar).trim():'Não'
    };
    const idx=ativos.findIndex(a=>a.ticker===obj.ticker);
    if(idx>=0)ativos[idx]=obj; else ativos.push(obj);
    count++;
  }
  saveAtivos();
  toast(count+' lançamento(s) importado(s) com sucesso.');
  if(typeof renderAll==='function')renderAll();
}
function handleCSVImport(input){
  const file=input.files[0];
  if(!file)return;
  const name=file.name.toLowerCase();
  if(name.endsWith('.xlsx')||name.endsWith('.xls')){
    if(typeof XLSX==='undefined'){toast('Biblioteca de Excel não carregada.');return}
    const reader=new FileReader();
    reader.onload=e=>{
      const wb=XLSX.read(e.target.result,{type:'array',cellDates:true});
      const sheet=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''});
      processImportRows(rows);
      input.value='';
    };
    reader.readAsArrayBuffer(file);
  } else {
    const reader=new FileReader();
    reader.onload=e=>{
      const text=e.target.result;
      const lines=text.split(/\r?\n/).filter(l=>l.trim().length);
      const rows=lines.map(l=>l.split(',').map(c=>c.trim()));
      processImportRows(rows);
      input.value='';
    };
    reader.readAsText(file);
  }
}

/* ---- navegação ---- */
const NAV_TABS=[
  {id:'resumo',label:'Resumo',icon:'ti-layout-dashboard',href:'resumo.html'},
  {id:'proventos',label:'Proventos',icon:'ti-coin',href:'proventos.html'},
  {id:'patrimonio',label:'Patrimônio',icon:'ti-trending-up',href:'patrimonio.html'},
  {id:'rentabilidade',label:'Rentabilidade',icon:'ti-percent',href:'rentabilidade.html'},
  {id:'metas',label:'Metas',icon:'ti-target',href:'metas.html'},
  {id:'analise',label:'Análise',icon:'ti-microscope',href:'analise.html'},
  {id:'lancamentos',label:'Lançamentos',icon:'ti-list',href:'lancamentos.html'},
  {id:'irpf',label:'IRPF',icon:'ti-file-text',href:'irpf.html'},
];

function renderHeaderAndNav(active){
  const headerActions=document.getElementById('header-actions');
  if(headerActions){
    headerActions.innerHTML=`
      <button class="btn" onclick="infoB3()"><i class="ti ti-building-bank" aria-hidden="true"></i> Integração B3</button>
      <button class="btn" onclick="openImport()"><i class="ti ti-file-spreadsheet" aria-hidden="true"></i> Importar Excel</button>
      <input type="file" id="csv-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="handleCSVImport(this)">
      <button class="btn btn-primary" onclick="openModal()"><i class="ti ti-edit" aria-hidden="true"></i> Modo Manual</button>
    `;
  }
  const tabsEl=document.getElementById('tabs');
  if(tabsEl){
    tabsEl.innerHTML=NAV_TABS.map(t=>`<a class="tab ${t.id===active?'active':''}" href="${t.href}"><i class="ti ${t.icon}" aria-hidden="true"></i> ${t.label}</a>`).join('');
  }
}

/* ---- modais (lançamento e meta) ---- */
function injectModals(){
  if(document.getElementById('modal'))return;
  const wrap=document.createElement('div');
  wrap.innerHTML=`
<div class="modal-bg" id="modal" style="display:none" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <h2><i class="ti ti-plus" aria-hidden="true" style="margin-right:6px"></i>Adicionar Lançamento</h2>
    <div class="modal-grid">
      <div class="form-group"><label>Ticker / Nome</label><input id="f-ticker" type="text" placeholder="PETR4, BTC, AAPL..."></div>
      <div class="form-group"><label>Classe</label>
        <select id="f-classe">
          <option value="B3">Ações B3</option><option value="FII">FIIs</option>
          <option value="Crypto">Criptomoedas</option><option value="RF">Renda Fixa</option>
          <option value="ETF">ETFs</option><option value="Exterior">Exterior</option><option value="BDR">BDRs</option>
        </select>
      </div>
      <div class="form-group"><label>Tipo</label>
        <select id="f-tipo"><option value="Compra">Compra</option><option value="Venda">Venda</option><option value="Provento">Provento</option></select>
      </div>
      <div class="form-group"><label>Data</label><input id="f-data" type="date"></div>
      <div class="form-group"><label>Quantidade</label><input id="f-qtd" type="number" placeholder="100" min="0"></div>
      <div class="form-group"><label>Preço Médio (R$)</label><input id="f-pm" type="number" placeholder="28.50" step="0.01"></div>
      <div class="form-group"><label>Cotação Atual (R$)</label><input id="f-cotacao" type="number" placeholder="32.10" step="0.01"></div>
      <div class="form-group"><label>DY Anual (%)</label><input id="f-dy" type="number" placeholder="6.5" step="0.01"></div>
      <div class="form-group"><label>Nota (0–10)</label><input id="f-nota" type="number" placeholder="8" min="0" max="10"></div>
      <div class="form-group"><label>% Ideal na Carteira</label><input id="f-ideal" type="number" placeholder="5" step="0.1"></div>
      <div class="form-group"><label>Moeda</label>
        <select id="f-moeda"><option value="BRL">R$ BRL</option><option value="USD">$ USD</option></select>
      </div>
      <div class="form-group"><label>Comprar mais?</label>
        <select id="f-comprar"><option value="Sim">Sim</option><option value="Não">Não</option></select>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="addAtivo()"><i class="ti ti-check" aria-hidden="true"></i> Salvar</button>
    </div>
  </div>
</div>
<div class="modal-bg" id="modal-meta" style="display:none" onclick="if(event.target===this)closeModalMeta()">
  <div class="modal">
    <h2><i class="ti ti-target" aria-hidden="true" style="margin-right:6px"></i>Nova Meta de Alocação</h2>
    <div class="modal-grid">
      <div class="form-group"><label>Classe</label>
        <select id="m-classe">
          <option value="B3">Ações B3</option><option value="FII">FIIs</option>
          <option value="Crypto">Cripto</option><option value="RF">Renda Fixa</option>
          <option value="ETF">ETFs</option><option value="Exterior">Exterior</option><option value="BDR">BDRs</option>
        </select>
      </div>
      <div class="form-group"><label>% Ideal</label><input id="m-ideal" type="number" placeholder="20" min="0" max="100"></div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModalMeta()">Cancelar</button>
      <button class="btn btn-primary" onclick="addMeta()"><i class="ti ti-check" aria-hidden="true"></i> Salvar</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(wrap);
}

function openModal(){injectModals();document.getElementById('modal').style.display='flex';document.getElementById('f-data').value=new Date().toISOString().slice(0,10)}
function closeModal(){document.getElementById('modal').style.display='none';['f-ticker','f-qtd','f-pm','f-cotacao','f-dy','f-nota','f-ideal'].forEach(id=>{document.getElementById(id).value=''})}
function openModalMeta(){injectModals();document.getElementById('modal-meta').style.display='flex'}
function closeModalMeta(){document.getElementById('modal-meta').style.display='none'}

function addAtivo(){
  const ticker=document.getElementById('f-ticker').value.trim().toUpperCase();
  const classe=document.getElementById('f-classe').value;
  const tipo=document.getElementById('f-tipo').value;
  const qtd=parseFloat(document.getElementById('f-qtd').value)||0;
  const pm=parseFloat(document.getElementById('f-pm').value)||0;
  const cotacao=parseFloat(document.getElementById('f-cotacao').value)||pm;
  const dy=parseFloat(document.getElementById('f-dy').value)||0;
  const data=document.getElementById('f-data').value;
  const nota=parseInt(document.getElementById('f-nota').value)||0;
  const ideal=parseFloat(document.getElementById('f-ideal').value)||0;
  const moeda=document.getElementById('f-moeda').value;
  const comprar=document.getElementById('f-comprar').value;
  if(!ticker||!qtd||!pm){alert('Preencha Ticker, Quantidade e Preço Médio.');return}
  const idx=ativos.findIndex(a=>a.ticker===ticker);
  const obj={ticker,classe,tipo,qtd,pm,cotacao,dy,data,nota,ideal,moeda,comprar};
  if(idx>=0)ativos[idx]=obj; else ativos.push(obj);
  saveAtivos();
  closeModal();
  if(typeof renderAll==='function')renderAll();
  toast('Lançamento salvo.');
}

function addMeta(){
  const classe=document.getElementById('m-classe').value;
  const ideal=parseFloat(document.getElementById('m-ideal').value)||0;
  const idx=metas.findIndex(m=>m.classe===classe);
  if(idx>=0)metas[idx].ideal=ideal; else metas.push({classe,ideal});
  saveMetas();
  closeModalMeta();
  if(typeof renderMetas==='function')renderMetas();
  toast('Meta salva.');
}

function removeAtivo(ticker){
  if(!confirm('Remover '+ticker+'?'))return;
  ativos=ativos.filter(a=>a.ticker!==ticker);
  saveAtivos();
  if(typeof renderAll==='function')renderAll();
  toast('Ativo removido.');
}

function toggleGrupo(id,hdr){
  const el=document.getElementById(id);
  const ch=hdr.querySelector('.chevron');
  if(el.style.display==='none'){el.style.display='';ch.classList.add('open')}
  else{el.style.display='none';ch.classList.remove('open')}
}
