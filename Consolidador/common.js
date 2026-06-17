/* ===================== CONSOLIDADOR DE CARTEIRA - NÚCLEO COMPARTILHADO ===================== */

const CLASS_COLORS={'B3':'#185FA5','FII':'#3B6D11','Crypto':'#BA7517','RF':'#534AB7','ETF':'#0F6E56','Exterior':'#993C1D','BDR':'#72243E'};
const CLASS_LABEL={'B3':'Ações B3','FII':'FIIs','Crypto':'Criptos','RF':'Renda Fixa','ETF':'ETFs','Exterior':'Exterior','BDR':'BDRs'};
const CLASS_BADGE={'B3':'badge-b3','FII':'badge-fii','Crypto':'badge-crypto','RF':'badge-rf','ETF':'badge-etf','Exterior':'badge-ext','BDR':'badge-bdr'};
const IRPF_CODE={'B3':'03','FII':'73','Crypto':'08','RF':'45','ETF':'03','Exterior':'03','BDR':'04'}; // legado
// [BUG-F1 FIX] Grupo e Código IRPF corretos conforme PGFN (declaração 2024)
const IRPF_GRUPO={'B3':'03','FII':'07','Crypto':'08','RF':'04','ETF':'07','Exterior':'03','BDR':'03'};
const IRPF_CODIGO={'B3':'01','FII':'03','Crypto':'01','RF':'01','ETF':'09','Exterior':'01','BDR':'04'};
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

const DEFAULT_ATIVOS=[];

const DEFAULT_METAS=[
  {classe:'B3',ideal:30},{classe:'FII',ideal:25},{classe:'RF',ideal:20},{classe:'Crypto',ideal:10},{classe:'Exterior',ideal:10},{classe:'ETF',ideal:5}
];

/* ===================== MÚLTIPLAS CARTEIRAS — TUDO SÓ NA NUVEM (FIRESTORE) =====================
   Não existe mais leitura/escrita em localStorage aqui. Enquanto o login não resolve,
   essas variáveis ficam vazias. firebase.js é quem preenche tudo após o login
   (veja onAuthStateChanged) e quem limpa tudo no logout. */
let carteiras=[];
let carteiraAtual=null;
let ativos=[];
let metas=[];
let charts={};

// [BUG-D2 FIX] Debounce no syncFirestore — evita múltiplas escritas em operações em lote (import, etc.)
let _syncTimer=null;
function saveAtivos(){ if(typeof syncFirestore==='function'){clearTimeout(_syncTimer);_syncTimer=setTimeout(syncFirestore,1500);} }
function saveMetas(){ if(typeof syncFirestore==='function')syncFirestore(); }

/* ---- formatação ---- */
// [BUG-P2 FIX] Trata NaN e null corretamente — (v||0) mascarava NaN como zero, ocultando bugs
const fmt=(v,d=2)=>(isNaN(v)||v==null?0:v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtR=v=>'R$ '+fmt(v);
const fmtP=(v,plus=true)=>(plus&&v>=0?'+':'')+fmt(v)+'%';

/* ===================== BANCO DE DADOS DO SITE (em memória) ===================== */

let COTACOES={};            // ticker → preço atual (carregado do site a cada página)
const DIVIDENDOS_CACHE={};  // ticker → [{date, value}]  (carregado do site a cada página)
// [BUG-D1 FIX] Taxas de câmbio: moeda → multiplicador para BRL (USD/BRL carregado de indices.json)
const TAXAS_CAMBIO={'BRL':1};
function getRate(moeda){if(!moeda||moeda==='BRL')return 1;return TAXAS_CAMBIO[moeda]||1;}

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
    // [BUG-D1 FIX] Tenta carregar taxa USD/BRL dos índices do site
    try{
      const rIdx=await fetch(base+'indices.json?t='+Date.now());
      if(rIdx.ok){
        const jIdx=await rIdx.json();
        const usdbrl=jIdx?.USDBRL||jIdx?.['USD/BRL']||jIdx?.dolar||
          (Array.isArray(jIdx)?jIdx.find(x=>x?.ticker==='USDBRL')?.price:null);
        if(usdbrl&&usdbrl>0)TAXAS_CAMBIO['USD']=usdbrl;
      }
    }catch(e){}
    if(!TAXAS_CAMBIO['USD']&&COTACOES['USDBRL'])TAXAS_CAMBIO['USD']=COTACOES['USDBRL'];
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
  const tickers=[...new Set(ativos.map(a=>a.ticker))];
  await Promise.allSettled(tickers.map(t=>fetchHistoricoTicker(t)));
}

/* calcula evolução real do patrimônio mês a mês usando preços históricos */
function calcEvolucaoPatrimonio(nMeses=24){
  const hoje=new Date();
  const meses=[];
  for(let i=nMeses-1;i>=0;i--){
    const d=new Date(hoje.getFullYear(),hoje.getMonth()-i,1);
    meses.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
  }
  return meses.map(ym=>{
    // [BUG-D3 FIX] Ignora lançamentos sem data — evita que apareçam em todos os meses
    const txAte=ativos.filter(a=>a.data&&a.data.slice(0,7)<=ym);
    const posicoes=calcPosicoes(txAte);
    let vt=0,custo=0;
    posicoes.forEach(a=>{
      const rate=getRate(a.moeda);
      const hist=HISTORICO_CACHE[a.ticker]||{};
      let price=hist[ym];
      if(!price){
        const anterior=Object.keys(hist).filter(k=>k<=ym).sort();
        if(anterior.length)price=hist[anterior[anterior.length-1]];
      }
      // [BUG-C8 FIX] Custo sempre acumulado; VT só se tiver preço histórico disponível
      custo+=a.qtd*a.pm;
      if(price){vt+=a.qtd*price*rate;}
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
  const tickers=[...new Set(ativos.map(a=>a.ticker))];
  await Promise.allSettled(tickers.map(t=>fetchDividendosTicker(t)));
}

/* -- helpers de cálculo de proventos ---------------------------------------- */

/* Retorna a qtd líquida de um ticker em uma data específica */
function getQtdTickerAtDate(ticker,dateStr){
  let qtd=0;
  // Bug #4 fix: guard data vazia ('' <= qualquer string em JS → incluiria lançamentos sem data)
  ativos.filter(a=>a.ticker===ticker&&a.data&&a.data<=dateStr).forEach(a=>{
    const tipo=a.tipo||'Compra';
    if(tipo==='Venda')qtd=Math.max(0,qtd-a.qtd);
    else if(tipo==='Compra')qtd+=a.qtd;
    // Provento: não altera quantidade
  });
  return qtd;
}

function calcProventosAtivo(ticker,dataCompra,_qtd){
  const from=dataCompra||'1900-01-01';
  const cache=DIVIDENDOS_CACHE[ticker]||[];
  if(cache.length>0){
    // [BUG-P1 FIX] Arredondamento intermediário para evitar acúmulo de erro de ponto flutuante
    return cache
      .filter(d=>d.date>=from)
      .reduce((s,d)=>s+Math.round(d.value*getQtdTickerAtDate(ticker,d.date)*100)/100,0);
  }
  // Fallback: proventos importados via Excel (só usados se site não tiver dados)
  return ativos
    .filter(a=>a.ticker===ticker&&a.tipo==='Provento'&&a.data&&a.data>=from)
    .reduce((s,a)=>s+Math.round(a.qtd*a.pm*100)/100,0);
}

function calcProventosUltimos12m(){
  const cutoff=new Date();
  cutoff.setFullYear(cutoff.getFullYear()-1);
  const cutoffStr=cutoff.toISOString().slice(0,10);
  const tickers=[...new Set(ativos.map(a=>a.ticker))];
  return tickers.reduce((sum,ticker)=>{
    const cache=DIVIDENDOS_CACHE[ticker]||[];
    if(cache.length>0){
      return sum+cache
        .filter(d=>d.date>=cutoffStr)
        .reduce((s,d)=>s+Math.round(d.value*getQtdTickerAtDate(ticker,d.date)*100)/100,0);
    }
    // Fallback: proventos importados
    return sum+ativos
      .filter(a=>a.ticker===ticker&&a.tipo==='Provento'&&a.data&&a.data>=cutoffStr)
      .reduce((s,a)=>s+Math.round(a.qtd*a.pm*100)/100,0);
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
  const tickers=[...new Set(ativos.map(a=>a.ticker))];
  tickers.forEach(ticker=>{
    const cache=DIVIDENDOS_CACHE[ticker]||[];
    if(cache.length>0){
      // Usa dados do site
      cache.forEach(d=>{
        const ym=d.date.slice(0,7);
        if(!map[ym])return;
        const qtd=getQtdTickerAtDate(ticker,d.date);
        if(qtd<=0)return;
        // [BUG-P1 FIX] Arredondamento intermediário
        const val=Math.round(d.value*qtd*100)/100;
        map[ym].total+=val;
        map[ym].tickers[ticker]=(map[ym].tickers[ticker]||0)+val;
      });
    }else{
      // Fallback: proventos importados via Excel
      ativos.filter(a=>a.ticker===ticker&&a.tipo==='Provento'&&a.data).forEach(a=>{
        const ym=a.data.slice(0,7);
        if(!map[ym])return;
        const val=Math.round(a.qtd*a.pm*100)/100;
        if(val<=0)return;
        map[ym].total+=val;
        map[ym].tickers[ticker]=(map[ym].tickers[ticker]||0)+val;
      });
    }
  });
  return Object.entries(map)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([ym,v])=>({ym,...v}));
}

/* Calcula proventos recebidos em um ano-calendário específico (para IRPF) */
function calcProventosAno(ticker,ano){
  const from=String(ano)+'-01-01';const to=String(ano)+'-12-31';
  const cache=DIVIDENDOS_CACHE[ticker]||[];
  if(cache.length>0){
    return cache.filter(d=>d.date>=from&&d.date<=to)
      .reduce((s,d)=>s+Math.round(d.value*getQtdTickerAtDate(ticker,d.date)*100)/100,0);
  }
  return ativos.filter(a=>a.ticker===ticker&&a.tipo==='Provento'&&a.data&&a.data>=from&&a.data<=to)
    .reduce((s,a)=>s+Math.round(a.qtd*a.pm*100)/100,0);
}

/* [BUG-C5 FIX] Calcula ganhos realizados em ordem cronológica (PM sempre correto a cada venda).
   [BUG-F3 FIX] Criptos com vendas mensais totais < R$35.000 são isentos de IR. */
function getGanhosRealizados(ano){
  const anoStr=String(ano);
  const posMap={};
  let ganhoTotal=0;
  const cryptoMes={};
  ativos.filter(a=>a.data).sort((a,b)=>a.data.localeCompare(b.data)).forEach(a=>{
    const t=a.ticker;
    if(!posMap[t])posMap[t]={qtd:0,custo:0,classe:a.classe};
    if(a.classe)posMap[t].classe=a.classe;
    const tipo=a.tipo||'Compra';
    if(tipo==='Compra'){posMap[t].qtd+=a.qtd;posMap[t].custo+=a.qtd*a.pm;}
    else if(tipo==='Venda'){
      const pm=posMap[t].qtd>0?posMap[t].custo/posMap[t].qtd:0;
      const ganho=(a.pm-pm)*a.qtd;
      const qtdR=Math.max(0,posMap[t].qtd-a.qtd);
      posMap[t].custo=qtdR*pm;posMap[t].qtd=qtdR;
      if(a.data.slice(0,4)===anoStr){
        if(posMap[t].classe==='Crypto'){
          // [BUG-F3 FIX] Agrupa por mês para checar isenção mensal de R$35k
          const ym=a.data.slice(0,7);
          if(!cryptoMes[ym])cryptoMes[ym]={ganho:0,vendas:0};
          cryptoMes[ym].ganho+=ganho;cryptoMes[ym].vendas+=a.pm*a.qtd;
        }else{ganhoTotal+=ganho;}
      }
    }
  });
  // [BUG-F3 FIX] Isenção de cripto: só soma se total de vendas no mês >= R$35.000
  Object.values(cryptoMes).forEach(m=>{if(m.vendas>=35000)ganhoTotal+=m.ganho;});
  return parseFloat(ganhoTotal.toFixed(2));
}

/* Remove um lançamento individual pelo índice no array ativos[] */
function removeAtivoIdx(idx){
  if(!confirm('Remover este lançamento?'))return;
  ativos.splice(idx,1);
  saveAtivos();
  if(typeof renderAll==='function')renderAll();
  toast('Lançamento removido.');
}

/* -- init assíncrono: carrega cotações + dividendos + histórico e re-renderiza.
   Não é mais chamado direto no window 'load' — só roda depois que o login
   resolver e os dados da carteira vierem da nuvem (veja mvGate() mais abaixo). */
async function initConsolidador(){
  await Promise.all([atualizarCotacoes(),loadAllDividendos(),loadAllHistorico()]);
  if(typeof renderAll==='function')renderAll();
}

/* ===================== GATE DE LOGIN (a carteira só aparece depois de logar) =====================
   Cria (se ainda não existir) duas telas por cima da página: uma de "Carregando..."
   e uma pedindo login. Mostra a certa de acordo com o estado de autenticação,
   e só chama a função de render quando o usuário estiver logado e os dados
   já tiverem vindo do Firestore. */
window.mvAuthResolved=false;
window.mvLoggedIn=false;
let _mvPendingInit=null;

function _mvEnsureGateEls(){
  if(document.getElementById('mv-gate-loading'))return;
  const loading=document.createElement('div');
  loading.id='mv-gate-loading';
  loading.style.cssText='display:flex;align-items:center;justify-content:center;min-height:60vh;color:var(--color-text-secondary);font-size:14px;gap:8px';
  loading.innerHTML='<i class="ti ti-loader-2" aria-hidden="true"></i> Carregando...';
  const login=document.createElement('div');
  login.id='mv-gate-login';
  login.style.cssText='display:none;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:14px;text-align:center;color:var(--color-text-secondary);font-size:14px';
  login.innerHTML=`<div>Faça login para ver sua carteira.</div>
    <button class="btn btn-primary" style="padding:8px 16px;font-size:13px" onclick="loginGoogle()">
      <i class="ti ti-brand-google" aria-hidden="true"></i> Entrar com Google
    </button>`;
  document.body.insertBefore(login,document.body.firstChild);
  document.body.insertBefore(loading,document.body.firstChild);
}

/* Cada página chama mvGate(initConsolidador) no lugar de renderAll() direto,
   no final do seu <script>. */
function mvGate(initFn){
  _mvPendingInit=initFn;
  _mvApplyGate();
}

/* firebase.js chama isso sempre que o estado de login muda. */
function _mvApplyGate(){
  _mvEnsureGateEls();
  const app=document.querySelector('.app');
  const loading=document.getElementById('mv-gate-loading');
  const login=document.getElementById('mv-gate-login');
  if(loading)loading.style.display='none';
  if(!window.mvAuthResolved){
    // ainda verificando login: mantém o app visível (título e abas fixos no topo).
    // Os dados chegam depois e preenchem as áreas — sem "Carregando" e sem o título saltar.
    if(login)login.style.display='none';
    if(app)app.style.display='';
    return;
  }
  if(!window.mvLoggedIn){
    if(login)login.style.display='flex';
    if(app)app.style.display='none';
    return;
  }
  if(login)login.style.display='none';
  if(app)app.style.display='';
  if(typeof renderCarteiraSwitcher==='function')renderCarteiraSwitcher();
  if(typeof _mvPendingInit==='function')_mvPendingInit();
}

/* ---- cálculos ---- */

/* Agrega lançamentos em posições líquidas por ticker (PM ponderado, qtd líquida) */
function calcPosicoes(txArray){
  const arr=txArray||ativos;
  const map={};
  arr.forEach(a=>{
    const t=a.ticker;
    if(!map[t]){
      map[t]={ticker:t,classe:a.classe,qtd:0,pm:0,_custo:0,
        cotacao:a.cotacao||0,dy:a.dy||0,data:'',
        nota:0,ideal:0,moeda:a.moeda||'BRL',comprar:'Não'};
    }
    if(a.nota)map[t].nota=a.nota;
    if(a.ideal)map[t].ideal=a.ideal;
    if(a.comprar&&a.comprar!=='Não')map[t].comprar=a.comprar;
    if(a.classe)map[t].classe=a.classe;
    if(a.moeda)map[t].moeda=a.moeda;
    // Bug #2 fix: Provento não altera posição (não é Compra nem Venda)
    const isBuy=(a.tipo||'Compra')==='Compra';
    const isSell=(a.tipo||'Compra')==='Venda';
    if(isSell){
      // [BUG-C1 FIX] Calcula qtd restante ANTES de atualizar, evitando PM incorreto
      // [BUG-L4 FIX] Loga aviso se venda excede posição (venda a descoberto)
      if(a.qtd>map[t].qtd+0.0001)console.warn(`Venda a descoberto detectada: ${t} (vendendo ${a.qtd}, posição ${map[t].qtd.toFixed(4)})`);
      const qtdR=Math.max(0,map[t].qtd-a.qtd);
      map[t]._custo=qtdR*map[t].pm;
      map[t].qtd=qtdR;
    }else if(isBuy){
      const newQtd=map[t].qtd+a.qtd;
      map[t]._custo+=a.qtd*a.pm;
      map[t].pm=newQtd>0?map[t]._custo/newQtd:0;
      map[t].qtd=newQtd;
      if(!map[t].data||a.data<map[t].data)map[t].data=a.data;
    }
    // else: Provento — ignora (não afeta qtd nem PM)
  });
  return Object.values(map).filter(a=>a.qtd>0.0001).map(({_custo,...rest})=>rest);
}

// [BUG-C7 FIX] Parâmetro 'ate' (YYYY-MM-DD) para calcular posição em data específica (ex: IRPF 31/12)
function calcAtivos(ate=null){
  const posicoes=ate?calcPosicoes(ativos.filter(a=>a.data&&a.data<=ate)):calcPosicoes();
  return posicoes.map(a=>{
    // [BUG-D1 FIX] Aplica taxa de câmbio para ativos em moeda estrangeira
    const rate=getRate(a.moeda);
    const cotacao=(COTACOES[a.ticker]||a.cotacao||0)*rate;
    const vt=a.qtd*cotacao;
    const custo=a.qtd*a.pm; // pm sempre em BRL conforme rótulo do formulário
    const res=vt-custo,resPct=custo>0?((vt-custo)/custo)*100:0;
    const proventos=calcProventosAtivo(a.ticker,a.data,a.qtd);
    // [BUG-C2 FIX] DY = proventos / valor de mercado (não / custo)
    const dy=vt>0?(proventos/vt)*100:0;
    const lucroTotal=res+proventos;
    const rentTotal=custo>0?(lucroTotal/custo)*100:0;
    // [BUG-C4 FIX] CAGR anualizado pela data da primeira compra
    const anos=a.data?Math.max((Date.now()-new Date(a.data).getTime())/(365.25*24*3600*1000),1/12):1;
    const cagr=custo>0&&anos>0?(Math.pow(Math.max(0,1+lucroTotal/custo),1/anos)-1)*100:0;
    return{...a,cotacao,vt,custo,res,resPct,proventos,dy,lucroTotal,rentTotal,cagr,anos:parseFloat(anos.toFixed(1))};
  });
}
function getTotals(){
  const c=calcAtivos();
  const total=c.reduce((s,a)=>s+a.vt,0);
  const custo=c.reduce((s,a)=>s+a.custo,0);
  const res=total-custo;
  const resPct=custo>0?((total-custo)/custo)*100:0;
  // Bug #5 fix: inclui proventos de tickers totalmente vendidos (não só posições abertas)
  const proventosAbertos=c.reduce((s,a)=>s+a.proventos,0);
  const tickersAbertos=new Set(c.map(a=>a.ticker));
  const proventosFechados=[...new Set(ativos.map(a=>a.ticker))]
    .filter(t=>!tickersAbertos.has(t))
    .reduce((sum,ticker)=>{
      const firstBuy=ativos.filter(a=>a.ticker===ticker&&(a.tipo||'Compra')==='Compra')
        .sort((a,b)=>(a.data||'').localeCompare(b.data||''))[0];
      return sum+calcProventosAtivo(ticker,firstBuy?.data,0);
    },0);
  const proventosTotal=proventosAbertos+proventosFechados;
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
  // [BUG-C7 FIX] Posição em 31/12 do ano-calendário (não posição atual)
  const anoCalendario=new Date().getFullYear()-1;
  const c=calcAtivos(anoCalendario+'-12-31');
  const data={
    geradoEm:new Date().toISOString(),
    anoCalendario,
    // [BUG-F1 FIX] Grupo e Código IRPF corretos por classe
    bensEDireitos:c.map(a=>({ticker:a.ticker,classe:CLASS_LABEL[a.classe]||a.classe,
      grupo:IRPF_GRUPO[a.classe]||'03',codigo:IRPF_CODIGO[a.classe]||'01',
      custoAquisicao:parseFloat(a.custo.toFixed(2)),quantidade:a.qtd,precoMedio:parseFloat(a.pm.toFixed(4))})),
    // [BUG-F4 FIX] Proventos reais recebidos (não estimativa DY × VT)
    rendimentosRecebidos:c.map(a=>({ticker:a.ticker,classe:CLASS_LABEL[a.classe]||a.classe,
      proventosRecebidos:parseFloat(a.proventos.toFixed(2)),
      tributacao:a.classe==='FII'?'Isento (Lei 11.033/04)':a.classe==='B3'?'Div:Isento/JCP:15%':
        a.classe==='ETF'?'15% RF / 15-22,5% RV':a.classe==='Crypto'?'Isento se vendas < R$35k/mês':
        a.classe==='BDR'?'15-22,5% sobre dividendos':'Tributável'})),
    ganhoCapitalRealizado:getGanhosRealizados(anoCalendario)
  };
  downloadFile('relatorio_irpf_'+anoCalendario+'.json', JSON.stringify(data,null,2), 'application/json');
  toast('Relatório IRPF '+anoCalendario+' exportado.');
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
    // [BUG-L2 FIX] Dedup com toFixed(4) para normalizar floats e evitar falsos negativos
    const key=`${obj.ticker}|${obj.tipo}|${obj.data}|${parseFloat(obj.qtd).toFixed(4)}|${parseFloat(obj.pm).toFixed(4)}`;
    if(ativos.some(a=>`${a.ticker}|${a.tipo}|${a.data}|${parseFloat(a.qtd).toFixed(4)}|${parseFloat(a.pm).toFixed(4)}`===key))continue;
    ativos.push(obj);
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
        // [BUG-L3 FIX] 'sa' era genérico demais; agora checa 'saída'/'saida'/'entrada' explicitamente
        if(k.includes('entrada')||k.includes('saida')||k.includes('saída'))col.tipo=idx;
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
    // [BUG-L5 FIX] Tesouro Direto tem nomes longos (ex: "Tesouro IPCA+ 2035") — avisa e pula
    if(!ticker){continue;}
    if(!/^[A-Z]{3,6}\d{1,2}$/.test(ticker)){
      if(produtoRaw.toLowerCase().includes('tesouro'))console.warn('[B3] Tesouro Direto ignorado (não é ativo de renda variável): '+produtoRaw);
      continue;
    }

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

  let importados=0;

  for(const [ticker,{nome,txs}] of Object.entries(ops)){
    txs.sort((a,b)=>a.data.localeCompare(b.data));
    const classe=classificarB3(ticker,nome);

    // Bug #8 fix: salva cada transação individual (igual ao processImportRows)
    // calcPosicoes() cuida do PM ponderado e qtd líquida
    for(const tx of txs){
      const tipo=tx.side==='buy'?'Compra':'Venda';
      const obj={
        ticker,classe,tipo,
        qtd:Math.round(tx.qtd*10000)/10000,
        pm:parseFloat(tx.preco.toFixed(4)),
        cotacao:parseFloat(tx.preco.toFixed(4)),
        dy:0,
        data:tx.data||new Date().toISOString().slice(0,10),
        nota:0,ideal:0,moeda:'BRL',comprar:'Não'
      };
      // [BUG-L2 FIX] Dedup com toFixed(4) para normalizar floats
      const key=`${obj.ticker}|${obj.tipo}|${obj.data}|${parseFloat(obj.qtd).toFixed(4)}|${parseFloat(obj.pm).toFixed(4)}`;
      if(ativos.some(a=>`${a.ticker}|${a.tipo}|${a.data}|${parseFloat(a.qtd).toFixed(4)}|${parseFloat(a.pm).toFixed(4)}`===key))continue;
      ativos.push(obj);
      importados++;
    }
  }

  saveAtivos();
  toast(`B3: ${importados} lançamento(s) importado(s).`);
  initConsolidador(); // recarrega cotações + dividendos e re-renderiza
}

/* ===================== GERENCIAMENTO DE CARTEIRAS ===================== */

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* Troca a carteira ativa, recarrega os dados (já vieram da nuvem no login) e re-renderiza a página */
function trocarCarteira(id){
  if(id===carteiraAtual||!carteiras.some(c=>c.id===id))return;
  carteiraAtual=id;
  const dados=(typeof _dadosCarteiras==='object'&&_dadosCarteiras[id])?_dadosCarteiras[id]:{};
  ativos=dados.ativos?JSON.parse(JSON.stringify(dados.ativos)):JSON.parse(JSON.stringify(DEFAULT_ATIVOS));
  metas=dados.metas?JSON.parse(JSON.stringify(dados.metas)):JSON.parse(JSON.stringify(DEFAULT_METAS));
  if(typeof syncFirestore==='function')syncFirestore();
  renderCarteiraSwitcher();
  if(typeof initConsolidador==='function'){ initConsolidador(); } // recarrega cotações/proventos e re-renderiza
  else if(typeof renderAll==='function'){ renderAll(); }
  toast('Carteira selecionada: '+(carteiras.find(c=>c.id===id)?.nome||''));
}

/* Cria uma nova carteira vazia e troca para ela */
function criarCarteira(nome){
  nome=(nome||'').trim();
  if(!nome)return;
  const id='c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  carteiras.push({id,nome});
  if(typeof _dadosCarteiras==='object')_dadosCarteiras[id]={ativos:JSON.parse(JSON.stringify(DEFAULT_ATIVOS)),metas:JSON.parse(JSON.stringify(DEFAULT_METAS)),nome};
  trocarCarteira(id);
  toast('Carteira "'+nome+'" criada.');
}

/* Renomeia uma carteira existente */
function renomearCarteira(id,novoNome){
  novoNome=(novoNome||'').trim();
  if(!novoNome)return;
  const c=carteiras.find(c=>c.id===id);
  if(!c)return;
  c.nome=novoNome;
  if(typeof _dadosCarteiras==='object'&&_dadosCarteiras[id])_dadosCarteiras[id].nome=novoNome;
  renderCarteiraSwitcher();
  if(typeof syncFirestore==='function')syncFirestore();
  toast('Carteira renomeada.');
}

/* Exclui uma carteira (sempre deve restar ao menos uma) */
function excluirCarteira(id){
  if(carteiras.length<=1){ alert('Você precisa ter ao menos uma carteira.'); return; }
  const c=carteiras.find(c=>c.id===id);
  if(!c)return;
  if(!confirm('Excluir a carteira "'+c.nome+'"? Todos os lançamentos e metas dela serão perdidos. Essa ação não pode ser desfeita.'))return;
  carteiras=carteiras.filter(x=>x.id!==id);
  if(typeof _dadosCarteiras==='object')delete _dadosCarteiras[id];
  if(carteiraAtual===id){
    trocarCarteira(carteiras[0].id);
  }
  renderGerenciarCarteiras();
  renderCarteiraSwitcher();
  if(typeof excluirCarteiraNuvem==='function')excluirCarteiraNuvem(id);
  else if(typeof syncFirestore==='function')syncFirestore();
  toast('Carteira excluída.');
}

/* Renderiza o seletor de carteira no cabeçalho */
function renderCarteiraSwitcher(){
  const el=document.getElementById('carteira-switcher');
  if(!el)return;
  el.innerHTML=`
    <select id="sel-carteira" onchange="trocarCarteira(this.value)" title="Selecionar carteira">
      ${carteiras.map(c=>`<option value="${c.id}" ${c.id===carteiraAtual?'selected':''}>${escapeHtml(c.nome)}</option>`).join('')}
    </select>
    <button class="btn btn-sm" onclick="openModalCarteiras()" title="Gerenciar carteiras"><i class="ti ti-folders" aria-hidden="true"></i></button>
  `;
}

/* Renderiza a lista de carteiras dentro do modal de gerenciamento */
function renderGerenciarCarteiras(){
  const el=document.getElementById('lista-carteiras');
  if(!el)return;
  el.innerHTML=carteiras.map(c=>`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <input type="text" value="${escapeHtml(c.nome)}" style="flex:1;font-size:12px;padding:7px 10px;border:1px solid var(--border3, rgba(255,255,255,0.12));border-radius:var(--border-radius-md);background:var(--bg3, #141418);color:var(--text, #ECEAE4);font-family:var(--font-sans)"
        onchange="renomearCarteira('${c.id}', this.value)">
      ${c.id===carteiraAtual
        ? '<span class="badge badge-b3" style="white-space:nowrap">Ativa</span>'
        : `<button class="btn btn-sm" onclick="trocarCarteira('${c.id}');renderGerenciarCarteiras()">Usar</button>`}
      <button class="btn btn-sm" onclick="excluirCarteira('${c.id}')" title="Excluir carteira" ${carteiras.length<=1?'disabled':''}><i class="ti ti-trash" aria-hidden="true"></i></button>
    </div>
  `).join('');
}

function openModalCarteiras(){
  injectModals();
  renderGerenciarCarteiras();
  document.getElementById('nc-nome').value='';
  document.getElementById('modal-carteiras').style.display='flex';
}
function closeModalCarteiras(){ document.getElementById('modal-carteiras').style.display='none'; }

function adicionarCarteiraModal(){
  const input=document.getElementById('nc-nome');
  const nome=input.value.trim();
  if(!nome){ alert('Digite um nome para a nova carteira.'); return; }
  criarCarteira(nome);
  input.value='';
  renderGerenciarCarteiras();
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
      <div class="carteira-switcher" id="carteira-switcher"></div>
      <button class="btn" onclick="infoB3()"><i class="ti ti-building-bank" aria-hidden="true"></i> Integração B3</button>
      <button class="btn" onclick="openImport()"><i class="ti ti-file-spreadsheet" aria-hidden="true"></i> Importar Excel</button>
      <input type="file" id="csv-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="handleCSVImport(this)">
      <button class="btn btn-primary" onclick="openModal()"><i class="ti ti-edit" aria-hidden="true"></i> Modo Manual</button>
    `;
    renderCarteiraSwitcher();
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
</div>
<div class="modal-bg" id="modal-carteiras" style="display:none" onclick="if(event.target===this)closeModalCarteiras()">
  <div class="modal">
    <h2><i class="ti ti-folders" aria-hidden="true" style="margin-right:6px"></i>Gerenciar Carteiras</h2>
    <div id="lista-carteiras"></div>
    <div class="modal-grid" style="margin-top:10px">
      <div class="form-group" style="grid-column:1/-1"><label>Nova Carteira</label><input id="nc-nome" type="text" placeholder="Ex: Carteira da Esposa, Aposentadoria..."></div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModalCarteiras()">Fechar</button>
      <button class="btn btn-primary" onclick="adicionarCarteiraModal()"><i class="ti ti-plus" aria-hidden="true"></i> Adicionar Carteira</button>
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
  // Bug #1 fix: sempre push — novo modelo de transações (não sobrescreve lançamentos anteriores)
  const obj={ticker,classe,tipo,qtd,pm,cotacao,data,nota,ideal,moeda,comprar};
  ativos.push(obj);
  saveAtivos();
  closeModal();
  initConsolidador(); // recarrega cotação e proventos do site
  toast('Lançamento salvo.');
}

function addMeta(){
  const classe=document.getElementById('m-classe').value;
  const ideal=parseFloat(document.getElementById('m-ideal').value)||0;
  const idx=metas.findIndex(m=>m.classe===classe);
  // [BUG-U2 FIX] Avisa se a soma ultrapassar 100%
  const tempMetas=idx>=0?metas.map((m,i)=>i===idx?{...m,ideal}:m):[...metas,{classe,ideal}];
  const total=tempMetas.reduce((s,m)=>s+m.ideal,0);
  if(total>100){
    if(!confirm(`A soma das metas ficaria em ${total.toFixed(0)}% (acima de 100%). Salvar mesmo assim?`))return;
  }
  if(idx>=0)metas[idx].ideal=ideal; else metas.push({classe,ideal});
  saveMetas();
  closeModalMeta();
  if(typeof renderMetas==='function')renderMetas();
  toast('Meta salva.');
}

function removeAtivo(ticker){
  // [BUG-L1 FIX] Mostra quantidade de lançamentos que serão apagados
  const count=ativos.filter(a=>a.ticker===ticker).length;
  if(!confirm(`Remover ${ticker}? Isso apagará ${count} lançamento(s). Essa ação não pode ser desfeita.`))return;
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
