/* ===================== CONSOLIDADOR DE CARTEIRA - NÚCLEO COMPARTILHADO ===================== */

const CLASS_COLORS={'B3':'#185FA5','FII':'#3B6D11','Crypto':'#BA7517','RF':'#534AB7','ETF':'#0F6E56','Exterior':'#993C1D','BDR':'#72243E'};
const CLASS_LABEL={'B3':'Ações B3','FII':'FIIs','Crypto':'Criptos','RF':'Renda Fixa','ETF':'ETFs','Exterior':'Exterior','BDR':'BDRs'};
const CLASS_BADGE={'B3':'badge-b3','FII':'badge-fii','Crypto':'badge-crypto','RF':'badge-rf','ETF':'badge-etf','Exterior':'badge-ext','BDR':'badge-bdr'};
const IRPF_CODE={'B3':'03','FII':'73','Crypto':'08','RF':'45','ETF':'03','Exterior':'03','BDR':'04'};
const NOTA_COLOR=n=>n>=8?'#1D9E75':n>=5?'#BA7517':'#E24B4A';

/* ---- UNITs B3: ações que terminam em 11 (não são FIIs nem ETFs) ---- */
const UNITS_SUFIXO_11=new Set(['BPAC11','SANB11','ENGI11','KLBN11','TAEE11','SAPR11','ALUP11','IGTI11','BRBI11','DMMO11']);

function classificarB3(ticker,nome){
  const t=ticker.toUpperCase().trim();
  const n=(nome||'').toUpperCase();
  if(t.endsWith('34'))return 'BDR';
  if(/TESOURO|CDB\b|LCI\b|LCA\b|LFT\b|NTN-/i.test(n))return 'RF';
  if(t.endsWith('11')){
    if(UNITS_SUFIXO_11.has(t))return 'B3';
    if(/[ÍI]NDICE|INDEX|\bETF\b/i.test(n))return 'ETF';
    return 'FII';
  }
  return 'B3';
}

const STORAGE_ATIVOS='consolidador_ativos_v2';
const STORAGE_METAS='consolidador_metas_v2';

const DEFAULT_ATIVOS=[];

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
function saveAtivos(){ localStorage.setItem(STORAGE_ATIVOS, JSON.stringify(ativos)); if(typeof syncFirestore==='function')syncFirestore(); }

function loadMetas(){
  try{
    const raw=localStorage.getItem(STORAGE_METAS);
    if(raw)return JSON.parse(raw);
  }catch(e){}
  return JSON.parse(JSON.stringify(DEFAULT_METAS));
}
function saveMetas(){ localStorage.setItem(STORAGE_METAS, JSON.stringify(metas)); if(typeof syncFirestore==='function')syncFirestore(); }

let ativos=loadAtivos();
let metas=loadMetas();
let charts={};

/* ---- formatação ---- */
const fmt=(v,d=2)=>(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtR=v=>'R$ '+fmt(v);
const fmtP=(v,plus=true)=>(plus&&v>=0?'+':'')+fmt(v)+'%';

/* ===================== BANCO DE DADOS DO SITE (em memória) ===================== */

let COTACOES={};            // ticker → preço atual (carregado do site a cada página)
const DIVIDENDOS_CACHE={};  // ticker → [{date, value}]  (carregado do site a cada página)

/* -- preços atuais ----------------------------------------------------------- */
async function atualizarCotacoes(){
  try{
    const base='../data/';
    const reqs=await Promise.allSettled([
      fetch(base+'cotacoes.json?t='+Date.now()).then(r=>r.ok?r.json():{}),
      fetch(base+'intraday/acoes-br.json?t='+Date.now()).then(r=>r.ok?r.json():{}),
      fetch(base+'intraday/fiis.json?t='+Date.now()).then(r=>r.ok?r.json():{}),
      fetch(base+'intraday/internacional.json?t='+Date.now()).then(r=>r.ok?r.json():{}),
      fetch(base+'intraday/cripto-macro.json?t='+Date.now()).then(r=>r.ok?r.json():{}),
    ]);
    const [cotJson,iaJson,ifJson,iiJson,icJson]=reqs.map(r=>r.status==='fulfilled'?r.value:{});
    const add=(arr=[])=>arr.forEach(it=>{if(it&&it.ticker&&it.price>0)COTACOES[it.ticker]=it.price;});
    add(cotJson.acoes); add(cotJson.fiis);
    add(iaJson.acoes);  add(iaJson.etfs);
    add(ifJson.fiis);
    add(iiJson.stocks); add(iiJson.bdrs);
    add(icJson.macro);
  }catch(e){console.warn('atualizarCotacoes:',e);}
}

/* -- histórico mensal de preços por ticker ----------------------------------- */
const HISTORICO_CACHE={};  // ticker → {YYYY-MM: close}

async function fetchHistoricoTicker(ticker){
  if(HISTORICO_CACHE[ticker]!==undefined)return HISTORICO_CACHE[ticker];
  const map={};
  try{
    // preços mensais
    const r=await fetch('../data/historico/'+ticker+'.json?t='+Date.now());
    if(r.ok){
      const j=await r.json();
      (j.history||[]).forEach(p=>{map[p.date.slice(0,7)]=p.close;});
    }
  }catch(e){}
  try{
    // preços diários recentes (sobrescreve o mês se tiver dado mais novo)
    const r2=await fetch('../data/diario/'+ticker+'.json?t='+Date.now());
    if(r2.ok){
      const j2=await r2.json();
      (j2.history||[]).forEach(p=>{map[p.date.slice(0,7)]=p.close;});
    }
  }catch(e){}
  HISTORICO_CACHE[ticker]=map;
  return map;
}

async function loadAllHistorico(){
  await Promise.allSettled(ativos.map(a=>fetchHistoricoTicker(a.ticker)));
}

/* calcula evolução real do patrimônio mês a mês usando preços históricos */
function calcEvolucaoPatrimonio(nMeses=24){
  // monta lista de meses a exibir
  const hoje=new Date();
  const meses=[];
  for(let i=nMeses-1;i>=0;i--){
    const d=new Date(hoje.getFullYear(),hoje.getMonth()-i,1);
    meses.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
  }
  return meses.map(ym=>{
    let vt=0,custo=0;
    ativos.forEach(a=>{
      if(!a.data||a.data.slice(0,7)>ym)return; // ainda não tinha comprado
      const hist=HISTORICO_CACHE[a.ticker]||{};
      // pega o preço deste mês, ou o mais recente anterior disponível
      let price=hist[ym];
      if(!price){
        const anterior=Object.keys(hist).filter(k=>k<=ym).sort();
        if(anterior.length)price=hist[anterior[anterior.length-1]];
      }
      if(price){vt+=a.qtd*price;custo+=a.qtd*a.pm;}
    });
    const [y,m]=ym.split('-');
    const nomes=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return{ym,label:nomes[parseInt(m)]+'/'+y.slice(2),vt:parseFloat(vt.toFixed(2)),custo:parseFloat(custo.toFixed(2))};
  });
}

/* -- dividendos por ticker --------------------------------------------------- */
async function fetchDividendosTicker(ticker){
  if(DIVIDENDOS_CACHE[ticker]!==undefined)return DIVIDENDOS_CACHE[ticker];
  try{
    const r=await fetch('../data/dividendos/'+ticker+'.json?t='+Date.now());
    DIVIDENDOS_CACHE[ticker]=r.ok?(await r.json()).dividendos||[]:[];
  }catch(e){DIVIDENDOS_CACHE[ticker]=[];}
  return DIVIDENDOS_CACHE[ticker];
}

async function loadAllDividendos(){
  await Promise.allSettled(ativos.map(a=>fetchDividendosTicker(a.ticker)));
}

/* -- helpers de cálculo de proventos ---------------------------------------- */
function calcProventosAtivo(ticker,dataCompra,qtd){
  const from=dataCompra||'1900-01-01';
  return(DIVIDENDOS_CACHE[ticker]||[])
    .filter(d=>d.date>=from)
    .reduce((s,d)=>s+d.value*qtd,0);
}

function calcProventosUltimos12m(){
  const cutoff=new Date();
  cutoff.setFullYear(cutoff.getFullYear()-1);
  const cutoffStr=cutoff.toISOString().slice(0,10);
  return ativos.reduce((sum,a)=>{
    const from=a.data&&a.data>cutoffStr?a.data:cutoffStr;
    return sum+(DIVIDENDOS_CACHE[a.ticker]||[])
      .filter(d=>d.date>=from)
      .reduce((s,d)=>s+d.value*a.qtd,0);
  },0);
}

/* retorna [{ym:'YYYY-MM', total, tickers:{TICKER:valor}}] últimos 13 meses */
function getDividendosPorMes(){
  const now=new Date();
  const map={};
  for(let i=12;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const ym=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    map[ym]={total:0,tickers:{}};
  }
  ativos.forEach(a=>{
    const from=a.data||'1900-01-01';
    (DIVIDENDOS_CACHE[a.ticker]||[]).forEach(d=>{
      if(d.date<from)return;
      const ym=d.date.slice(0,7);
      if(!map[ym])return;
      const val=d.value*a.qtd;
      map[ym].total+=val;
      map[ym].tickers[a.ticker]=(map[ym].tickers[a.ticker]||0)+val;
    });
  });
  return Object.entries(map)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([ym,v])=>({ym,...v}));
}

/* -- init assíncrono: carrega cotações + dividendos + histórico e re-renderiza */
async function initConsolidador(){
  await Promise.all([atualizarCotacoes(),loadAllDividendos(),loadAllHistorico()]);
  if(typeof renderAll==='function')renderAll();
}
window.addEventListener('load',()=>initConsolidador());

/* ---- cálculos ---- */
function calcAtivos(){
  return ativos.map(a=>{
    const cotacao=COTACOES[a.ticker]||a.cotacao||0;
    const vt=a.qtd*cotacao, custo=a.qtd*a.pm;
    const res=vt-custo, resPct=custo>0?((vt-custo)/custo)*100:0;
    const proventos=calcProventosAtivo(a.ticker,a.data,a.qtd);
    const dy=custo>0?(proventos/custo)*100:0; // DY real recebido desde a compra
    const lucroTotal=res+proventos;
    const rentTotal=custo>0?(lucroTotal/custo)*100:0;
    return{...a,cotacao,vt,custo,res,resPct,proventos,dy,lucroTotal,rentTotal};
  });
}
function getTotals(){
  const c=calcAtivos();
  const total=c.reduce((s,a)=>s+a.vt,0);
  const custo=c.reduce((s,a)=>s+a.custo,0);
  const res=total-custo;
  const resPct=custo>0?((total-custo)/custo)*100:0;
  const proventosTotal=c.reduce((s,a)=>s+a.proventos,0);
  const lucroTotal=res+proventosTotal;
  const rentTotal=custo>0?(lucroTotal/custo)*100:0;
  const provAno=calcProventosUltimos12m();
  const dyMed=total>0?(provAno/total)*100:0;
  return{total,custo,res,resPct,proventosTotal,lucroTotal,rentTotal,provAno,dyMed};
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
    if(typeof XLSX==='undefined'){toast('Biblioteca de Excel não carregada.');return;}
    const reader=new FileReader();
    reader.onload=e=>{
      const wb=XLSX.read(e.target.result,{type:'array',cellDates:true});
      const sheet=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''});
      // Auto-detecta: se tiver coluna "Movimentação" e "Produto" é arquivo B3
      const header=(rows[0]||[]).join('|').toLowerCase();
      if(header.includes('movimenta')&&header.includes('produto')){
        processB3Rows(rows);
      }else{
        processImportRows(rows);
      }
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

/* ---- importar extrato B3 (Transferência - Liquidação) ---- */
function processB3Rows(rows){
  // Localizar cabeçalho
  let hi=-1,col={};
  for(let i=0;i<Math.min(10,rows.length);i++){
    const r=rows[i];
    const s=r.join('|').toLowerCase();
    if(s.includes('produto')&&s.includes('quantidade')){
      hi=i;
      r.forEach((h,idx)=>{
        const k=(h||'').toString().toLowerCase().trim();
        if(k.includes('entrada')||k.includes('sa'))col.tipo=idx; // Entrada/Saída
        if(k==='data')col.data=idx;
        if(k.includes('movimenta'))col.mov=idx;
        if(k==='produto')col.produto=idx;
        if(k==='quantidade')col.qtd=idx;
        if(k.includes('pre')&&k.includes('unit'))col.preco=idx;
      });
      break;
    }
  }
  if(hi<0){toast('Formato não reconhecido. Use o extrato de movimentação da B3.');return;}

  const ops={}; // ticker → {nome, txs:[{data,side,qtd,preco}]}

  for(let i=hi+1;i<rows.length;i++){
    const r=rows[i];
    if(!r||r.length<4)continue;
    const mov=String(r[col.mov]||'').trim();
    if(!mov.toLowerCase().includes('liquid'))continue;

    // Normaliza "Credito"/"Crédito"/"Debito"/"Débito"
    const tipoNorm=String(r[col.tipo]||'').trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g,'');
    const isBuy=tipoNorm==='debito';   // dinheiro saiu → comprou
    const isSell=tipoNorm==='credito'; // dinheiro entrou → vendeu
    if(!isBuy&&!isSell)continue;

    const produtoRaw=String(r[col.produto]||'').trim();
    if(!produtoRaw)continue;

    // "TICKER4 - Nome completo"
    const dashIdx=produtoRaw.indexOf(' - ');
    const ticker=(dashIdx>0?produtoRaw.slice(0,dashIdx):produtoRaw.split(/\s/)[0]).trim().toUpperCase();
    const nome=dashIdx>0?produtoRaw.slice(dashIdx+3).trim():'';
    if(!ticker||!/^[A-Z]{3,6}\d{1,2}$/.test(ticker))continue;

    // Parse data DD/MM/YYYY → YYYY-MM-DD
    let dataStr='';
    const dv=r[col.data];
    if(dv instanceof Date)dataStr=dv.toISOString().slice(0,10);
    else{
      const ds=String(dv||'').trim();
      const m=ds.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if(m)dataStr=`${m[3]}-${m[2]}-${m[1]}`;
      else dataStr=ds.slice(0,10);
    }

    const qtd=parseFloat(String(r[col.qtd]||'0').replace(',','.'))||0;
    const preco=parseFloat(String(r[col.preco]||'0').replace(',','.'))||0;
    if(qtd<=0)continue;

    if(!ops[ticker])ops[ticker]={nome,txs:[]};
    if(nome&&!ops[ticker].nome)ops[ticker].nome=nome;
    ops[ticker].txs.push({data:dataStr,side:isBuy?'buy':'sell',qtd,preco});
  }

  let importados=0,ignorados=0;

  for(const [ticker,{nome,txs}] of Object.entries(ops)){
    // Ordenar cronologicamente
    txs.sort((a,b)=>a.data.localeCompare(b.data));

    // PM iterativo: PM ponderado recalculado a cada compra; vendas só reduzem qtd
    let pmAtual=0,qtdAtual=0,dataCompra='';
    for(const tx of txs){
      if(tx.side==='buy'){
        if(qtdAtual===0)pmAtual=tx.preco;
        else pmAtual=(pmAtual*qtdAtual+tx.preco*tx.qtd)/(qtdAtual+tx.qtd);
        qtdAtual+=tx.qtd;
        if(!dataCompra)dataCompra=tx.data;
      }else{
        qtdAtual=Math.max(0,qtdAtual-tx.qtd);
        if(qtdAtual===0){pmAtual=0;dataCompra='';}
      }
    }

    // Corrigir erros de ponto flutuante
    qtdAtual=Math.round(qtdAtual*10000)/10000;
    if(qtdAtual<=0){ignorados++;continue;}

    const classe=classificarB3(ticker,nome);
    const pm=parseFloat(pmAtual.toFixed(4));
    const obj={ticker,classe,tipo:'Compra',qtd:qtdAtual,pm,cotacao:pm,dy:0,
      data:dataCompra||new Date().toISOString().slice(0,10),nota:0,ideal:0,moeda:'BRL',comprar:'Não'};

    const idx=ativos.findIndex(a=>a.ticker===ticker);
    if(idx>=0){
      // Preserva campos do usuário (nota, ideal, comprar, cotacao, dy)
      ativos[idx]={...ativos[idx],qtd:obj.qtd,pm:obj.pm,classe:obj.classe,data:obj.data};
    }else{
      ativos.push(obj);
    }
    importados++;
  }

  saveAtivos();
  toast(`B3: ${importados} ativo(s) importado(s)${ignorados?', '+ignorados+' zerado(s) ignorado(s)':''}.`);
  initConsolidador(); // recarrega cotações + dividendos e re-renderiza
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
      <div id="auth-area" style="display:flex;align-items:center;gap:8px"></div>
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
      <div class="form-group"><label>Cotação Atual (R$) <small style="color:var(--color-text-secondary)">(auto)</small></label><input id="f-cotacao" type="number" placeholder="Preenchido pelo site" step="0.01"></div>
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
function closeModal(){document.getElementById('modal').style.display='none';['f-ticker','f-qtd','f-pm','f-cotacao','f-nota','f-ideal'].forEach(id=>{document.getElementById(id).value=''})}
function openModalMeta(){injectModals();document.getElementById('modal-meta').style.display='flex'}
function closeModalMeta(){document.getElementById('modal-meta').style.display='none'}

function addAtivo(){
  const ticker=document.getElementById('f-ticker').value.trim().toUpperCase();
  const classe=document.getElementById('f-classe').value;
  const tipo=document.getElementById('f-tipo').value;
  const qtd=parseFloat(document.getElementById('f-qtd').value)||0;
  const pm=parseFloat(document.getElementById('f-pm').value)||0;
  const cotacao=parseFloat(document.getElementById('f-cotacao').value)||0; // fallback se site não tiver
  const data=document.getElementById('f-data').value;
  const nota=parseInt(document.getElementById('f-nota').value)||0;
  const ideal=parseFloat(document.getElementById('f-ideal').value)||0;
  const moeda=document.getElementById('f-moeda').value;
  const comprar=document.getElementById('f-comprar').value;
  if(!ticker||!qtd||!pm){alert('Preencha Ticker, Quantidade e Preço Médio.');return}
  const idx=ativos.findIndex(a=>a.ticker===ticker);
  const obj={ticker,classe,tipo,qtd,pm,cotacao,data,nota,ideal,moeda,comprar};
  if(idx>=0)ativos[idx]=obj; else ativos.push(obj);
  saveAtivos();
  closeModal();
  initConsolidador(); // recarrega cotação e proventos do site
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
