/* ===================== CONSOLIDADOR DE CARTEIRA - NÚCLEO COMPARTILHADO ===================== */

const CLASS_COLORS={'B3':'#F2871E','FII':'#E8511F','Crypto':'#C9772E','RF':'#7A1E12','ETF':'#FFCF5C','Exterior':'#9B2D1F','BDR':'#F5A623','TD':'#B5341F','ETFINT':'#D98324','REIT':'#A4451E','FUNDO':'#E0A82E','OUTRO':'#8A5A3B'}; // Paleta "Brasa" (vermelho→amarelo) + extensão quente
const CLASS_LABEL={'B3':'Ações','FII':'FIIs','Crypto':'Criptomoedas','RF':'Renda Fixa','ETF':'ETFs','Exterior':'Stocks','BDR':'BDRs','TD':'Tesouro Direto','ETFINT':'ETFs Internacionais','REIT':'Reits','FUNDO':'Fundos de Investimentos','OUTRO':'Outros'};
const CLASS_BADGE={'B3':'badge-b3','FII':'badge-fii','Crypto':'badge-crypto','RF':'badge-rf','ETF':'badge-etf','Exterior':'badge-ext','BDR':'badge-bdr','TD':'badge-rf','ETFINT':'badge-etf','REIT':'badge-fii','FUNDO':'badge-crypto','OUTRO':'badge-ext'};
/* Ícones dourados por classe (mesmo estilo da aba "Ativos" do site). Usados no cabeçalho dos grupos. */
const _SVG=(p)=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle">${p}</svg>`;
const CLASS_ICONS={
  'B3':_SVG('<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke="#e0b84a" stroke-width="1.6"/><polyline points="16 7 22 7 22 13" stroke="#e0b84a" stroke-width="1.6"/>'),
  'FII':_SVG('<path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6" stroke="#e0b84a" stroke-width="1.5"/>'),
  'REIT':_SVG('<path d="M3 21h18M5 21V9l7-6 7 6v12M9 21v-6h6v6" stroke="#e0b84a" stroke-width="1.5"/>'),
  'ETF':_SVG('<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="#e0b84a" stroke-width="1.5"/><line x1="3" y1="6" x2="21" y2="6" stroke="#e0b84a" stroke-width="1.5"/><path d="M16 10a4 4 0 0 1-8 0" stroke="#e0b84a" stroke-width="1.5"/>'),
  'ETFINT':_SVG('<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="#e0b84a" stroke-width="1.5"/><line x1="3" y1="6" x2="21" y2="6" stroke="#e0b84a" stroke-width="1.5"/><path d="M16 10a4 4 0 0 1-8 0" stroke="#e0b84a" stroke-width="1.5"/>'),
  'BDR':_SVG('<circle cx="12" cy="12" r="9" stroke="#e0b84a" stroke-width="1.5"/><line x1="3" y1="12" x2="21" y2="12" stroke="#e0b84a" stroke-width="1.2"/><path d="M12 3a14 14 0 0 1 3.6 9 14 14 0 0 1-3.6 9 14 14 0 0 1-3.6-9A14 14 0 0 1 12 3z" stroke="#e0b84a" stroke-width="1.2"/>'),
  'Exterior':_SVG('<circle cx="12" cy="12" r="9" stroke="#e0b84a" stroke-width="1.5"/><line x1="3" y1="12" x2="21" y2="12" stroke="#e0b84a" stroke-width="1.2"/><path d="M12 3a14 14 0 0 1 3.6 9 14 14 0 0 1-3.6 9 14 14 0 0 1-3.6-9A14 14 0 0 1 12 3z" stroke="#e0b84a" stroke-width="1.2"/>'),
  'Crypto':_SVG('<circle cx="12" cy="12" r="9" stroke="#e0b84a" stroke-width="1.5"/><path d="M9.5 8h4a2.2 2.2 0 0 1 0 4.4h-4M9.5 12.4h4.3a2.2 2.2 0 0 1 0 4.4H9.5M9.5 8v8.8M11 6.5v1.5M11 16.8v1.5" stroke="#e0b84a" stroke-width="1.3"/>'),
  'RF':_SVG('<rect x="2.5" y="6" width="19" height="12" rx="2" stroke="#e0b84a" stroke-width="1.5"/><circle cx="12" cy="12" r="2.5" stroke="#e0b84a" stroke-width="1.5"/><path d="M5.5 9v6M18.5 9v6" stroke="#e0b84a" stroke-width="1.2"/>'),
  'TD':_SVG('<path d="M3 21h18M4 10h16M12 3l8 4H4l8-4z" stroke="#e0b84a" stroke-width="1.4"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8" stroke="#e0b84a" stroke-width="1.3"/>'),
  'FUNDO':_SVG('<circle cx="12" cy="12" r="9" stroke="#e0b84a" stroke-width="1.3" stroke-opacity="0.55"/><path d="M12 3v9l7.5 4.3M12 12 4.5 16.3" stroke="#e0b84a" stroke-width="1.5"/>'),
  'OUTRO':_SVG('<circle cx="7" cy="9" r="1.7" fill="#e0b84a"/><circle cx="12" cy="9" r="1.7" fill="#e0b84a"/><circle cx="17" cy="9" r="1.7" fill="#e0b84a"/><circle cx="7" cy="15" r="1.7" fill="#e0b84a"/><circle cx="12" cy="15" r="1.7" fill="#e0b84a"/><circle cx="17" cy="15" r="1.7" fill="#e0b84a"/>'),
};
function classIconHtml(cls){ return CLASS_ICONS[cls]||`<span>${(CLASS_LABEL[cls]||cls).slice(0,2)}</span>`; }
const IRPF_CODE={'B3':'03','FII':'73','Crypto':'08','RF':'45','ETF':'03','Exterior':'03','BDR':'04','TD':'45','ETFINT':'03','REIT':'03','FUNDO':'07','OUTRO':'99'}; // legado
// [BUG-F1 FIX] Grupo e Código IRPF corretos conforme PGFN (declaração 2024)
const IRPF_GRUPO={'B3':'03','FII':'07','Crypto':'08','RF':'04','ETF':'07','Exterior':'03','BDR':'03','TD':'04','ETFINT':'03','REIT':'03','FUNDO':'07','OUTRO':'99'};
const IRPF_CODIGO={'B3':'01','FII':'03','Crypto':'01','RF':'01','ETF':'09','Exterior':'01','BDR':'04','TD':'02','ETFINT':'01','REIT':'01','FUNDO':'99','OUTRO':'99'};
const NOTA_COLOR=n=>n>=8?'#1D9E75':n>=5?'#BA7517':'#E24B4A';

/* ---- UNITs B3: ações que terminam em 11 (não são FIIs nem ETFs) ---- */
const UNITS_SUFIXO_11=new Set(['BPAC11','SANB11','ENGI11','KLBN11','TAEE11','SAPR11','ALUP11','IGTI11','BRBI11','DMMO11']);

function classificarB3(ticker,nome){
  const t=ticker.toUpperCase().trim();
  const n=(nome||'').toUpperCase();
  if(t.endsWith('34'))return 'BDR';
  if(/TESOURO/i.test(n))return 'TD';
  // Ticker terminado em 11 = ativo de bolsa (FII/FIAGRO/ETF/Unit). Decidimos por aqui
  // ANTES de olhar o nome — senão um FIAGRO de CRA (ex: VGIA11) cairia em "Renda Fixa".
  if(t.endsWith('11')){
    if(UNITS_SUFIXO_11.has(t))return 'B3';
    if(/[ÍI]NDICE|INDEX|\bETF\b/i.test(n))return 'ETF';
    return 'FII';
  }
  if(/CDB\b|LCI\b|LCA\b|LFT\b|NTN-|DEB[ÊE]NTURE|\bCRI\b|\bCRA\b|\bLC\b/i.test(n))return 'RF';
  return 'B3';
}

/* Lê número de planilha mesmo com "R$", espaços e milhar: "R$ 1.700,00" -> 1700 */
function parseNumBR(v){
  if(typeof v==='number')return isFinite(v)?v:0;
  let str=String(v==null?'':v).trim();
  if(!str)return 0;
  str=str.replace(/[^\d.,-]/g,'');           // remove R$, espaços, letras
  if(str.includes(',')){
    str=str.replace(/\./g,'').replace(',','.');         // BR: ponto=milhar, vírgula=decimal
  }else if(/^-?\d{1,3}(\.\d{3})+$/.test(str)){
    str=str.replace(/\./g,'');                          // só pontos em grupos de 3 = milhar (1.700)
  }                                                     // senão, ponto é decimal (1.7, 0.78)
  const n=parseFloat(str);
  return isFinite(n)?n:0;
}

// Classes tratadas como Renda Fixa (valor corrigido por taxa, não por cotação de mercado)
const RF_CLASSES=new Set(['RF','TD']);

// Migra dados antigos para a nova taxonomia (idempotente): Tesouro que estava em "Renda Fixa" vira "Tesouro Direto".
function migrarClasses(){
  if(!Array.isArray(ativos))return;
  let mudou=false;
  ativos.forEach(a=>{
    const ehTesouro=(a.rf&&a.rf.titulo==='Tesouro Direto')||/^TESOURO\s/i.test(a.ticker||'');
    if(a.classe==='RF'&&ehTesouro){a.classe='TD';mudou=true;}
    // FIAGRO/FII de bolsa (ticker termina em 11) salvo como Renda Fixa por causa de "CRA/CRI" no nome
    if(a.classe==='RF'&&!ehTesouro&&/11$/.test((a.ticker||'').trim())){a.classe='FII';if(a.rf)delete a.rf;mudou=true;}
  });
  if(mudou&&typeof saveAtivos==='function')saveAtivos();
}

const DEFAULT_ATIVOS=[];

const DEFAULT_METAS=[
  {classe:'B3',ideal:30},{classe:'FII',ideal:20},{classe:'ETF',ideal:5},{classe:'BDR',ideal:5},{classe:'RF',ideal:10},{classe:'TD',ideal:10},{classe:'Crypto',ideal:5},{classe:'Exterior',ideal:15}
];

/* ===================== MÚLTIPLAS CARTEIRAS — TUDO SÓ NA NUVEM (FIRESTORE) =====================
   Não existe mais leitura/escrita em localStorage aqui. Enquanto o login não resolve,
   essas variáveis ficam vazias. firebase.js é quem preenche tudo após o login
   (veja onAuthStateChanged) e quem limpa tudo no logout. */
let carteiras=[];
let carteiraAtual=null;
let ativos=[];
let metas=[];
let objetivos=[];
let charts={};

// [BUG-D2 FIX] Debounce no syncFirestore — evita múltiplas escritas em operações em lote (import, etc.)
let _syncTimer=null;
function saveAtivos(){ if(typeof syncFirestore==='function'){clearTimeout(_syncTimer);_syncTimer=setTimeout(syncFirestore,1500);} }
function saveMetas(){ if(typeof syncFirestore==='function')syncFirestore(); }
function saveObjetivos(){ if(typeof syncFirestore==='function')syncFirestore(); }

/* ---- formatação ---- */
// [BUG-P2 FIX] Trata NaN e null corretamente — (v||0) mascarava NaN como zero, ocultando bugs
const fmt=(v,d=2)=>(isNaN(v)||v==null?0:v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtR=v=>'R$ '+fmt(v);
const fmtP=(v,plus=true)=>(plus&&v>=0?'+':'')+fmt(v)+'%';

/* ===================== BANCO DE DADOS DO SITE (em memória) ===================== */

let COTACOES={};            // ticker → preço atual (carregado do site a cada página)
let BCB={};                 // taxas do Banco Central (CDI/Selic/IPCA), carregado de data/bcb.json
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
    // Taxas do Banco Central (CDI diário) para corrigir a Renda Fixa
    try{
      const rBcb=await fetch(base+'bcb.json?t='+Date.now());
      if(rBcb.ok)BCB=await rBcb.json();
    }catch(e){}
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
    // Data de referência do mês = último dia do mês (limitado a hoje), para corrigir RF e escolher cotação.
    const [yy,mm]=ym.split('-').map(Number);
    const fimMes=new Date(Date.UTC(yy,mm,0)).toISOString().slice(0,10);
    const hojeStr=new Date().toISOString().slice(0,10);
    const ateData=fimMes>hojeStr?hojeStr:fimMes;
    let vt=0,custo=0;
    posicoes.forEach(a=>{
      const rate=getRate(a.moeda);
      custo+=a.qtd*a.pm;
      // Valor de mercado do mês — mesma lógica do calcAtivos, para o lucro/prejuízo refletir SÓ preço/correção:
      let valorUnit;
      if(RF_CLASSES.has(a.classe)){
        // Renda Fixa / Tesouro: valor corrigido (CDI/prefixado) até o fim do mês — nunca "prejuízo falso".
        valorUnit=a.pm*fatorRF(a.rf,a.data,ateData);
      }else{
        const hist=HISTORICO_CACHE[a.ticker]||{};
        let price=hist[ym];
        if(!price){
          const anterior=Object.keys(hist).filter(k=>k<=ym).sort();
          if(anterior.length)price=hist[anterior[anterior.length-1]];
        }
        // Sem histórico: usa a cotação atual; se nem essa existir, o preço médio (empate, sem prejuízo falso).
        if(!price)price=COTACOES[a.ticker]||a.cotacao||a.pm;
        valorUnit=price*rate;
      }
      vt+=a.qtd*valorUnit;
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
  // [BUG-RF3 FIX] Ordena por data (Compra antes de Venda no mesmo dia) antes de processar.
  // Sem isso, a ordem dependia da ordem de IMPORTAÇÃO dos arquivos B3: se a planilha com a
  // venda (mais recente) fosse importada antes da planilha com a compra (mais antiga), a venda
  // era processada com qtd ainda em 0 (ficava travada em 0) e a compra posterior fazia o ativo
  // parecer ainda detido em datas futuras — gerando provento fantasma para algo já vendido.
  ativos.filter(a=>a.ticker===ticker&&a.data&&a.data<=dateStr)
    .slice()
    .sort((a,b)=>{
      if(a.data!==b.data)return a.data<b.data?-1:1;
      const oa=a.tipo==='Venda'?1:0, ob=b.tipo==='Venda'?1:0;
      return oa-ob;
    })
    .forEach(a=>{
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

/* Proventos totais por mês em TODO o histórico → { 'YYYY-MM': totalR$ }.
   Usado no gráfico de evolução para estimar o "dividendo reinvestido". */
function getDividendosTotalPorMes(){
  const map={};
  const tickers=[...new Set(ativos.map(a=>a.ticker))];
  tickers.forEach(ticker=>{
    const cache=DIVIDENDOS_CACHE[ticker]||[];
    if(cache.length>0){
      cache.forEach(d=>{
        const ym=d.date.slice(0,7);
        const qtd=getQtdTickerAtDate(ticker,d.date);
        if(qtd<=0)return;
        const val=Math.round(d.value*qtd*100)/100;
        map[ym]=(map[ym]||0)+val;
      });
    }else{
      ativos.filter(a=>a.ticker===ticker&&a.tipo==='Provento'&&a.data).forEach(a=>{
        const ym=a.data.slice(0,7);
        const val=Math.round(a.qtd*a.pm*100)/100;
        if(val<=0)return;
        map[ym]=(map[ym]||0)+val;
      });
    }
  });
  return map;
}

/* Dado o array de evolução (com .ym e .custo), separa o custo acumulado em
   "aporte próprio" (dinheiro novo) e "dividendo reinvestido" (provento que voltou
   pra carteira), usando um caixa de dividendos: o provento recebido num mês fica
   disponível para cobrir o aporte dos meses SEGUINTES (com carry-over se não houver
   compra). Retorna {proprio[], reinvest[]} alinhados ao array de evolução.

   IMPORTANTE (uso futuro): estes dois vetores são a base de dados de "quanto do
   meu aporte foi dinheiro novo vs dividendo reaplicado". Em QUALQUER lugar que
   mencione "aporte", a parte de dividendo retornando = split.reinvest[i], e o
   dinheiro novo do bolso = split.proprio[i] (proprio + reinvest = custo acumulado).
   Pode alimentar ferramentas futuras: taxa de reinvestimento, "bola de neve" de
   proventos, renda passiva que vira patrimônio, snowball/yield-on-cost no tempo. */
function calcSplitAporteDividendo(evol){
  const divMes=getDividendosTotalPorMes();
  const proprio=[], reinvest=[];
  let custoAnt=0, caixaDiv=0, reinvestAcum=0;
  evol.forEach(m=>{
    const deltaCusto=Math.max(0, (m.custo||0)-custoAnt);   // quanto entrou de aporte no mês
    const usado=Math.min(deltaCusto, caixaDiv);            // coberto por dividendo de meses anteriores
    caixaDiv-=usado;
    reinvestAcum+=usado;
    caixaDiv+=(divMes[m.ym]||0);                            // dividendo do mês entra para os próximos
    custoAnt=m.custo||0;
    const ra=Math.min(reinvestAcum, m.custo||0);
    reinvest.push(parseFloat(ra.toFixed(2)));
    proprio.push(parseFloat(Math.max(0,(m.custo||0)-ra).toFixed(2)));
  });
  return {proprio, reinvest};
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

/* ===== Menu "⋮" por linha: abre Editar / Remover transação ===== */
function openRowMenu(ev, idx){
  ev.stopPropagation();
  closeRowMenu();
  const btn=ev.currentTarget;
  const m=document.createElement('div');
  m.id='row-menu';
  m.className='row-menu';
  m.innerHTML=`
    <button type="button" onclick="closeRowMenu();editAtivoIdx(${idx})"><i class="ti ti-pencil" aria-hidden="true"></i> Editar transação</button>
    <button type="button" class="danger" onclick="closeRowMenu();removeAtivoIdx(${idx})"><i class="ti ti-trash" aria-hidden="true"></i> Remover transação</button>`;
  document.body.appendChild(m);
  const r=btn.getBoundingClientRect();
  // alinha o menu pela direita do botão, logo abaixo dele
  m.style.top=(window.scrollY+r.bottom+4)+'px';
  m.style.left=(window.scrollX+r.right-m.getBoundingClientRect().width)+'px';
  // fecha ao clicar em qualquer lugar fora (no próximo clique)
  setTimeout(()=>document.addEventListener('click',closeRowMenu,{once:true}),0);
}
function closeRowMenu(){ const m=document.getElementById('row-menu'); if(m)m.remove(); }

/* Menu "⋮" para a tela de Resumo, onde cada linha é a POSIÇÃO somada de um
   ticker (não um lançamento). Editar leva à aba Lançamentos já filtrada nesse
   ativo (lá o editar individual funciona certo); Remover apaga todos os
   lançamentos do ativo. */
function openRowMenuTicker(ev, ticker){
  ev.stopPropagation();
  closeRowMenu();
  const btn=ev.currentTarget;
  const t=String(ticker).replace(/'/g,"\\'");
  const m=document.createElement('div');
  m.id='row-menu';
  m.className='row-menu';
  m.innerHTML=`
    <button type="button" onclick="closeRowMenu();location.href='lancamentos.html?ticker='+encodeURIComponent('${t}')"><i class="ti ti-pencil" aria-hidden="true"></i> Editar transações</button>
    <button type="button" class="danger" onclick="closeRowMenu();removeAtivo('${t}')"><i class="ti ti-trash" aria-hidden="true"></i> Remover ativo</button>`;
  document.body.appendChild(m);
  const r=btn.getBoundingClientRect();
  m.style.top=(window.scrollY+r.bottom+4)+'px';
  m.style.left=(window.scrollX+r.right-m.getBoundingClientRect().width)+'px';
  setTimeout(()=>document.addEventListener('click',closeRowMenu,{once:true}),0);
}

/* ===== Modal de edição de um lançamento ===== */
function injectEditModal(){
  if(document.getElementById('modal-edit'))return;
  const w=document.createElement('div');
  w.innerHTML=`
<div class="modal-bg" id="modal-edit" style="display:none" onclick="if(event.target===this)closeEditModal()">
  <div class="modal" style="width:min(440px,96vw)">
    <h2><i class="ti ti-pencil" aria-hidden="true" style="margin-right:6px"></i>Editar Lançamento</h2>
    <input type="hidden" id="e-idx">
    <div class="modal-grid">
      <div class="form-group"><label>Ativo</label><input id="e-ticker" type="text" readonly></div>
      <div class="form-group"><label>Tipo</label><select id="e-tipo"><option value="Compra">Compra</option><option value="Venda">Venda</option></select></div>
      <div class="form-group"><label>Data</label><input id="e-data" type="date"></div>
      <div class="form-group"><label>Quantidade</label><input id="e-qtd" type="number" step="0.0001" min="0" oninput="atualizarTotalEdit()"></div>
      <div class="form-group"><label>Preço em R$</label><input id="e-pm" type="number" step="0.0001" min="0" oninput="atualizarTotalEdit()"></div>
      <div class="form-group"><label>Total da operação</label><input id="e-total" type="text" readonly></div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeEditModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEdicaoAtivo()"><i class="ti ti-check" aria-hidden="true"></i> Salvar</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(w);
}
function atualizarTotalEdit(){
  const q=parseFloat(document.getElementById('e-qtd').value)||0;
  const p=parseFloat(document.getElementById('e-pm').value)||0;
  document.getElementById('e-total').value=fmtR(q*p);
}
function editAtivoIdx(idx){
  const a=ativos[idx];
  if(!a){toast('Lançamento não encontrado.');return;}
  injectEditModal();
  document.getElementById('e-idx').value=idx;
  document.getElementById('e-ticker').value=a.ticker||'';
  document.getElementById('e-data').value=a.data||'';
  document.getElementById('e-qtd').value=a.qtd;
  document.getElementById('e-pm').value=a.pm;
  const tsel=document.getElementById('e-tipo');
  if(tsel)tsel.value=(a.tipo==='Venda')?'Venda':'Compra';
  atualizarTotalEdit();
  document.getElementById('modal-edit').style.display='flex';
}
function closeEditModal(){ const m=document.getElementById('modal-edit'); if(m)m.style.display='none'; }
function salvarEdicaoAtivo(){
  const idx=parseInt(document.getElementById('e-idx').value);
  const a=ativos[idx];
  if(!a){toast('Lançamento não encontrado.');return;}
  const q=parseFloat(document.getElementById('e-qtd').value);
  const p=parseFloat(document.getElementById('e-pm').value);
  if(!isFinite(q)||q<0){toast('Quantidade inválida.');return;}
  if(!isFinite(p)||p<0){toast('Preço inválido.');return;}
  // se a cotação ainda era igual ao preço antigo (import), acompanha o novo preço;
  // se já vier de cotação de mercado, não mexe — atualizarCotacoes() cuida disso.
  if(a.cotacao==null || a.cotacao===a.pm) a.cotacao=p;
  a.qtd=q;
  a.pm=p;
  a.data=document.getElementById('e-data').value||a.data;
  if(a.tipo!=='Provento'){
    const tsel=document.getElementById('e-tipo');
    if(tsel)a.tipo=tsel.value;
  }
  saveAtivos();
  closeEditModal();
  if(typeof renderAll==='function')renderAll();
  toast('Lançamento atualizado.');
}

/* -- init assíncrono: carrega cotações + dividendos + histórico e re-renderiza.
   Não é mais chamado direto no window 'load' — só roda depois que o login
   resolver e os dados da carteira vierem da nuvem (veja mvGate() mais abaixo). */
async function initConsolidador(){
  mvInitSortableTables();
  await Promise.all([atualizarCotacoes(),loadAllDividendos(),loadAllHistorico()]);
  if(typeof renderAll==='function')renderAll();
  if(typeof atualizarBadgeRF==='function')atualizarBadgeRF();
}

/* ===================== ORDENAR TABELAS POR CLIQUE NO CABEÇALHO =====================
   Vale para toda tabela .tbl. Listener delegado (uma vez só) — funciona mesmo após
   as tabelas serem redesenhadas. Detecta número (R$/%/qtd) x texto automaticamente. */
var _mvSortReady=false;
function mvInitSortableTables(){
  if(_mvSortReady)return; _mvSortReady=true;
  document.addEventListener('click',e=>{
    const th=e.target.closest?e.target.closest('table.tbl thead th'):null;
    if(!th)return;
    const headRow=th.parentElement;
    const col=[...headRow.children].indexOf(th);
    const table=th.closest('table');
    const tbody=table&&table.querySelector('tbody');
    if(col<0||!tbody)return;
    mvSortTable(table,tbody,th,col);
  });
}
/* Tira R$, %, separador de milhar, ▲▼ etc. e devolve só o texto "numérico" */
function _mvCleanNum(s){
  return String(s==null?'':s).replace(/\s/g,'').replace(/[R$%▲▼+]/g,'')
    .replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.'); // milhar '.' fora, decimal ',' -> '.'
}
/* É um número "puro" (sem letras)? Ex.: "R$ 1.603,37"=sim, "TAEE11"=não */
function _mvIsNum(s){ return /^-?\d+(\.\d+)?$/.test(_mvCleanNum(s)); }
function _mvParseNum(s){ const t=_mvCleanNum(s); const m=t.match(/-?\d+(\.\d+)?/); return m?parseFloat(m[0]):null; }
function mvSortTable(table,tbody,th,col){
  const rows=[...tbody.querySelectorAll(':scope > tr')];
  const cellOf=tr=>[...tr.children].filter(c=>c.tagName==='TD')[col];
  const isData=tr=>{
    const tds=[...tr.children].filter(c=>c.tagName==='TD');
    if(tds.length<=col)return false;
    if(tds.some(td=>td.hasAttribute('colspan')))return false; // pula linhas "Adicione X", "Troco", etc.
    return true;
  };
  const data=rows.filter(isData);
  const rest=rows.filter(r=>!isData(r)); // linhas especiais ficam no fim, na ordem original
  if(data.length<2)return;
  const valOf=tr=>{const td=cellOf(tr);return td?td.textContent.trim():'';};
  const naoVazios=data.map(valOf).filter(v=>v&&v!=='—'&&v!=='-');
  const numeric=naoVazios.length>0 && naoVazios.every(_mvIsNum);
  // direção: alterna se for a mesma coluna; senão 1º clique inteligente (número=desc, texto=asc)
  let dir;
  if(table.__sortCol===col){ dir=table.__sortDir==='asc'?'desc':'asc'; }
  else { dir=numeric?'desc':'asc'; }
  table.__sortCol=col; table.__sortDir=dir;
  const cmp=(a,b)=>{
    const va=valOf(a), vb=valOf(b);
    const ea=(!va||va==='—'||va==='-'), eb=(!vb||vb==='—'||vb==='-');
    if(ea&&eb)return 0; if(ea)return 1; if(eb)return -1; // vazios sempre no fim
    if(numeric){ const na=_mvParseNum(va),nb=_mvParseNum(vb); return dir==='asc'?na-nb:nb-na; }
    return dir==='asc'?va.localeCompare(vb,'pt',{numeric:true}):vb.localeCompare(va,'pt',{numeric:true});
  };
  data.sort(cmp);
  data.forEach(tr=>tbody.appendChild(tr));
  rest.forEach(tr=>tbody.appendChild(tr));
  // seta indicadora no cabeçalho
  [...th.parentElement.children].forEach(h=>{const a=h.querySelector(':scope > .sort-arrow');if(a)a.remove();});
  const ar=document.createElement('span');
  ar.className='sort-arrow';
  ar.textContent=dir==='asc'?'▲':'▼';
  th.appendChild(ar);
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
  // Insere logo antes da .app (depois da navegação), para não empurrar a barra/título do site.
  const appEl=document.querySelector('.app');
  document.body.insertBefore(login,appEl);
  document.body.insertBefore(loading,appEl);
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
  migrarClasses(); // normaliza dados antigos (Tesouro → Tesouro Direto) — idempotente
  // [BUG-RF2 FIX] Ordena por data (e Compra antes de Venda no mesmo dia) antes de processar.
  // Sem isso, a ordem dependia de qual arquivo B3 foi importado primeiro: se uma planilha com
  // vendas mais recentes era importada antes da planilha com as compras mais antigas, a venda
  // era processada com posição ainda em 0 (virava "venda a descoberto" e era ignorada), e a
  // compra posterior fazia o ativo parecer que nunca tinha sido vendido.
  const arr=(txArray||ativos).slice().sort((a,b)=>{
    const da=a.data||'',db=b.data||'';
    if(da!==db)return da<db?-1:1;
    const oa=a.tipo==='Venda'?1:0, ob=b.tipo==='Venda'?1:0;
    return oa-ob;
  });
  const map={};
  arr.forEach(a=>{
    const t=a.ticker;
    if(!map[t]){
      map[t]={ticker:t,classe:a.classe,qtd:0,pm:0,_custo:0,
        cotacao:a.cotacao||0,dy:a.dy||0,data:'',
        nota:0,ideal:0,moeda:a.moeda||'BRL',comprar:'Não',rf:a.rf||null,nome:a.nome||'',rfSubtipo:a.rfSubtipo||''};
    }
    if(a.nota)map[t].nota=a.nota;
    if(a.ideal)map[t].ideal=a.ideal;
    if(a.comprar&&a.comprar!=='Não')map[t].comprar=a.comprar;
    if(a.rf)map[t].rf=a.rf;
    if(a.nome)map[t].nome=a.nome;
    if(a.rfSubtipo)map[t].rfSubtipo=a.rfSubtipo;
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

/* ---- Feriados nacionais (para não contar como dia útil na Renda Fixa) ----
   Fixos + móveis (Carnaval, Sexta-feira Santa, Corpus Christi) calculados pela Páscoa. */
const _feriadosCache={};
function feriadosBR(ano){
  if(_feriadosCache[ano])return _feriadosCache[ano];
  // Páscoa — algoritmo de Meeus/Butcher
  const a=ano%19,b=Math.floor(ano/100),c=ano%100,d=Math.floor(b/4),e=b%4,
        f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
        i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
        mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1;
  const pascoa=new Date(Date.UTC(ano,mes-1,dia));
  const movel=(off)=>{const x=new Date(pascoa);x.setUTCDate(x.getUTCDate()+off);return x.toISOString().slice(0,10);};
  const p=n=>String(n).padStart(2,'0');
  const set=new Set([
    `${ano}-01-01`,  // Confraternização
    `${ano}-04-21`,  // Tiradentes
    `${ano}-05-01`,  // Dia do Trabalho
    `${ano}-09-07`,  // Independência
    `${ano}-10-12`,  // N. Sra. Aparecida
    `${ano}-11-02`,  // Finados
    `${ano}-11-15`,  // Proclamação da República
    `${ano}-12-25`,  // Natal
    movel(-48),      // Carnaval (segunda)
    movel(-47),      // Carnaval (terça)
    movel(-2),       // Sexta-feira Santa
    movel(60),       // Corpus Christi
  ]);
  _feriadosCache[ano]=set;
  return set;
}
function ehFeriadoUTC(dt){
  return feriadosBR(dt.getUTCFullYear()).has(dt.toISOString().slice(0,10));
}

/* ---- Renda Fixa: correção em dias úteis (exclui fins de semana e feriados) ----
   Conta dias úteis entre a data da aplicação e a data 'ate' (ou hoje). */
function diasUteisRF(de,ate){
  if(!de)return 0;
  const d1=new Date(de+'T00:00:00Z');
  const d2=ate?new Date(ate+'T00:00:00Z'):new Date();
  if(isNaN(d1)||d2<=d1)return 0;
  let dias=0;const cur=new Date(d1);
  while(cur<d2){
    cur.setUTCDate(cur.getUTCDate()+1);
    const wd=cur.getUTCDay();
    if(wd!==0&&wd!==6&&!ehFeriadoUTC(cur))dias++;
  }
  return dias;
}
/* Fator de correção que multiplica o valor aplicado.
   CDI: rende (CDI diário × taxa%) por dia útil. Selic/IPCA/Prefixado: taxa anual → dia útil (base 252).
   Proteção: se a taxa do bcb.json vier inválida/quebrada, não corrige (fator 1). */
function fatorRF(rf,dataAplic,ate){
  if(!rf)return 1;
  const idx=rf.indexador,taxa=parseFloat(rf.taxa)||0;
  const dias=diasUteisRF(dataAplic,ate);
  if(dias<=0)return 1;
  // Converte uma taxa anual (% a.a.) em fator acumulado por dias úteis, ignorando dados absurdos.
  const porAnual=(anual)=>{
    if(!isFinite(anual)||anual<=0||anual>100)return 1;
    const taxaDia=Math.pow(1+anual/100,1/252)-1;
    return Math.pow(1+taxaDia,dias);
  };
  if(idx==='CDI'){
    const cdiDia=parseFloat(BCB?.cdi?.diario)||0;     // % ao dia útil
    if(cdiDia<=0)return 1;
    const taxaDia=(cdiDia/100)*(taxa/100);            // ex.: 0,0534% × 1,13
    return Math.pow(1+taxaDia,dias);
  }
  if(idx==='Selic'){
    const selicAnual=parseFloat(BCB?.selic?.anual)||0; // Selic anualizada (% a.a.)
    return porAnual(selicAnual+taxa);                  // Selic + spread
  }
  if(idx==='IPCA'){
    const ipca12=parseFloat(BCB?.ipca?.acumulado_12m)||0;
    if(ipca12<=0)return 1;                             // sem IPCA no bcb.json → não corrige ainda
    return porAnual(ipca12+taxa);                      // IPCA + spread
  }
  if(idx==='Prefixado')return porAnual(taxa);          // taxa anual fixa
  return 1;
}

// [BUG-C7 FIX] Parâmetro 'ate' (YYYY-MM-DD) para calcular posição em data específica (ex: IRPF 31/12)
function calcAtivos(ate=null){
  const posicoes=ate?calcPosicoes(ativos.filter(a=>a.data&&a.data<=ate)):calcPosicoes();
  return posicoes.map(a=>{
    // [BUG-D1 FIX] Aplica taxa de câmbio para ativos em moeda estrangeira
    const rate=getRate(a.moeda);
    // Renda Fixa: valor corrigido pelo CDI/Prefixado em dias úteis. Demais: cotação de mercado.
    const cotacao=RF_CLASSES.has(a.classe)
      ?a.pm*fatorRF(a.rf,a.data,ate)
      :(COTACOES[a.ticker]||a.cotacao||0)*rate;
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

/* ---- Sugestão de aporte (usada na aba Aporte e nas colunas % Ideal / Comprar? do Resumo) ----
   2 níveis: a classe puxa pro % ideal (metas), depois a nota (peso suave = raiz da nota)
   divide dentro da classe.
   - alvoPct[ticker]  : % alvo do ativo na carteira inteira (ideal da classe × peso da nota)
   - comprar[ticker]  : 'Sim' se o ativo está abaixo do alvo, senão 'Não'
   - aporteAtivo[tic] : R$ sugerido do aporte para o ativo                                  */
function calcSugestaoAporte(c,totalAtual,aporte){
  const idealMap={}; metas.forEach(m=>idealMap[m.classe]=m.ideal);
  const pesoNota=n=>n>0?Math.sqrt(n):0;
  // Classes consideradas = as que TÊM ativo + as da meta (mesmo sem ativo).
  // Assim a fatia de uma classe da meta sem ativo (ex.: Cripto) é reservada, não repassada às outras.
  const classesCarteira=[...new Set(c.map(a=>a.classe))];
  const temAtivo={}; classesCarteira.forEach(cl=>temAtivo[cl]=true);
  const classes=[...new Set([...classesCarteira,...Object.keys(idealMap).filter(cl=>idealMap[cl]>0)])];
  const somaPesoClasse={}, qtdClasse={};
  const notaDe=a=>a.nota||1; // ativo sem nota = nota 1 (padrão)
  c.forEach(a=>{somaPesoClasse[a.classe]=(somaPesoClasse[a.classe]||0)+pesoNota(notaDe(a));qtdClasse[a.classe]=(qtdClasse[a.classe]||0)+1;});
  const shareNota=a=>{const sp=somaPesoClasse[a.classe]||0;return sp>0?pesoNota(notaDe(a))/sp:(qtdClasse[a.classe]?1/qtdClasse[a.classe]:0);};
  const alvoPct={}, comprar={};
  c.forEach(a=>{
    alvoPct[a.ticker]=(idealMap[a.classe]||0)*shareNota(a);
    const atualPct=totalAtual>0?(a.vt/totalAtual)*100:0;
    comprar[a.ticker]=atualPct<alvoPct[a.ticker]-0.05?'Sim':'Não';
  });
  const aporteAtivo={}; c.forEach(a=>aporteAtivo[a.ticker]=0);
  const qtdComprar={};   // cotas inteiras a comprar (ativos de cota: ações/FIIs/ETFs/BDRs/Stocks)
  const reservaClasse={};
  let sobra=0;           // troco que não fecha uma cota e não cabe em fracionário
  if(aporte>0){
    const novoTotal=totalAtual+aporte;
    const bc=byClasse(c);
    const deficit={}; let somaDef=0;
    classes.forEach(cl=>{const d=Math.max(0,novoTotal*((idealMap[cl]||0)/100)-(bc[cl]||0));deficit[cl]=d;somaDef+=d;});
    const somaIdeal=classes.reduce((s,cl)=>s+(idealMap[cl]||0),0);
    const aporteClasse={};
    classes.forEach(cl=>{aporteClasse[cl]=somaDef>0?aporte*deficit[cl]/somaDef:(somaIdeal>0?aporte*((idealMap[cl]||0)/somaIdeal):0);});
    // Fracionários: aceitam qualquer valor (não precisam comprar cota inteira).
    const FRAC=new Set(['RF','TD','Crypto','FUNDO']);
    classes.forEach(cl=>{
      const budget=aporteClasse[cl];
      if(budget<=0.005)return;
      if(!temAtivo[cl]){ reservaClasse[cl]=budget; return; } // classe da meta sem ativo → reserva
      const ativosCl=c.filter(a=>a.classe===cl);
      if(FRAC.has(cl)){
        // fracionário: divide o orçamento da classe pela nota (valor contínuo)
        const sp=ativosCl.reduce((s,a)=>s+pesoNota(notaDe(a)),0);
        ativosCl.forEach(a=>{aporteAtivo[a.ticker]+=sp>0?budget*pesoNota(notaDe(a))/sp:budget/ativosCl.length;});
        return;
      }
      // cota inteira: compra 1 cota do ativo mais defasado (maior gap relativo) que caiba no orçamento
      const sim={}; ativosCl.forEach(a=>sim[a.ticker]=a.vt);
      const alvo={}; ativosCl.forEach(a=>alvo[a.ticker]=(alvoPct[a.ticker]||0)/100*novoTotal);
      let rest=budget,guarda=0;
      while(rest>0.005&&guarda++<100000){
        let best=null,bestRel=-1;
        for(const a of ativosCl){
          const p=a.cotacao||0, gap=alvo[a.ticker]-sim[a.ticker];
          if(gap<=0.005||p<=0||p>rest+0.005)continue;
          const rel=alvo[a.ticker]>0?gap/alvo[a.ticker]:0;
          if(rel>bestRel){bestRel=rel;best=a;}
        }
        if(!best)break;
        const p=best.cotacao; sim[best.ticker]+=p; rest-=p;
        aporteAtivo[best.ticker]+=p;
        qtdComprar[best.ticker]=(qtdComprar[best.ticker]||0)+1;
      }
      sobra+=rest>0.005?rest:0; // não coube outra cota nessa classe
    });
    // Troco sobrando vai pros fracionários que ainda estão abaixo do alvo (ex.: CDB aceita qualquer valor)
    if(sobra>0.005){
      const fr=c.filter(a=>FRAC.has(a.classe))
        .map(a=>({a,gap:(alvoPct[a.ticker]||0)/100*novoTotal-(a.vt+(aporteAtivo[a.ticker]||0))}))
        .filter(x=>x.gap>0.005);
      const sg=fr.reduce((s,x)=>s+x.gap,0);
      if(sg>0){let u=0;fr.forEach(x=>{const give=Math.min(x.gap,sobra*x.gap/sg);aporteAtivo[x.a.ticker]+=give;u+=give;});sobra-=u;}
    }
  }
  return {alvoPct,comprar,aporteAtivo,qtdComprar,reservaClasse,sobra,temAporte:aporte>0};
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
        if(k.includes('valor')&&k.includes('opera'))col.valor=idx;
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
    const movLow=mov.toLowerCase();
    // Aceita: "Transferência - Liquidação" (ações/FIIs), "COMPRA / VENDA" (CDB/RF), "Compra", "Venda"
    const isLiquid=movLow.includes('liquid');
    const isCompraVenda=movLow.includes('compra')||movLow.includes('venda');
    if(!isLiquid&&!isCompraVenda)continue;

    // Normaliza "Credito"/"Crédito"/"Debito"/"Débito"
    const tipoNorm=String(r[col.tipo]||'').trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g,'');
    // B3 usa Entrada/Saída do ponto de vista do ATIVO (não do dinheiro):
    // Crédito = ativo entrou na carteira = COMPRA
    // Débito  = ativo saiu da carteira   = VENDA
    // Para "Compra"/"Venda" explícitos no campo Movimentação, usa esse campo diretamente
    let isBuy,isSell;
    if(movLow==='compra'||movLow==='venda'){
      isBuy=movLow==='compra';
      isSell=movLow==='venda';
    }else{
      isBuy=tipoNorm==='credito';   // ativo entrou → comprou
      isSell=tipoNorm==='debito';   // ativo saiu   → vendeu
    }
    if(!isBuy&&!isSell)continue;

    const produtoRaw=String(r[col.produto]||'').trim();
    if(!produtoRaw)continue;

    // "TICKER4 - Nome completo" → extrai ticker e nome
    // CDB vem como "CDB - CDB82478KE6 - BANCO ORIGINAL S/A"
    //   → ticker = "CDB_CDB82478KE6", nome = "BANCO ORIGINAL S/A"
    let ticker,nome;
    const isCDB=/^(CDB|LCI|LCA|LFT|RDB|LC|CRI|CRA|DEB)\s*-\s*/i.test(produtoRaw);
    if(isCDB){
      // Partes: ["CDB", "CDB82478KE6", "BANCO ORIGINAL S/A"]
      const partes=produtoRaw.split(/\s*-\s*/);
      const tipo=partes[0].trim().toUpperCase();          // CDB
      const codigo=(partes[1]||'').trim().toUpperCase();  // CDB82478KE6
      ticker=codigo||tipo;                                 // usa o código como ticker único
      nome=partes.slice(2).join(' - ').trim()||tipo;      // "BANCO ORIGINAL S/A"
    }else{
      const dashIdx=produtoRaw.indexOf(' - ');
      ticker=(dashIdx>0?produtoRaw.slice(0,dashIdx):produtoRaw.split(/\s/)[0]).trim().toUpperCase();
      nome=dashIdx>0?produtoRaw.slice(dashIdx+3).trim():'';
    }
    if(!ticker){continue;}
    // Tesouro Direto: nome completo vira ticker (ex: "Tesouro IPCA+ 2029"), classe RF
    const isTesouro=/^TESOURO\s/i.test(produtoRaw);
    if(isTesouro){
      ticker=produtoRaw.trim();  // nome completo como identificador único
      nome=produtoRaw.trim();
    }
    // Aceita: tickers de ações (BBAS3), ETFs (NASD11), CDB/LCI por código, Tesouro por nome completo
    if(!isCDB&&!isTesouro&&!/^[A-Z]{3,6}\d{1,2}$/.test(ticker)){
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

    const qtd=parseNumBR(r[col.qtd]);
    let   preco=parseNumBR(r[col.preco]);
    const valorOp=col.valor!=null?parseNumBR(r[col.valor]):0;
    if(qtd<=0)continue;
    // [FIX preço-milhar] Preço unitário com 3 casas decimais (ex.: 11.238 = R$ 11,238)
    // pode ser lido errado como milhar (vira R$ 11.238,00) — parseNumBR não consegue
    // distinguir "11.238" (decimal) de "1.700" (milhar). A coluna "Valor da Operação"
    // vem confiável, então recalculamos o preço por ela. Afetava CMIG4, GARE11, MXRF11.
    if(valorOp>0 && qtd>0) preco = valorOp/qtd;

    if(!ops[ticker])ops[ticker]={nome,txs:[],rfTipo:isTesouro?'TD':(isCDB?'RF':null),isRF:isCDB||isTesouro,rfSubtipo:isCDB?produtoRaw.split(/\s*-\s*/)[0].trim().toUpperCase():isTesouro?'Tesouro Direto':null};
    if(nome&&!ops[ticker].nome)ops[ticker].nome=nome;
    ops[ticker].txs.push({data:dataStr,side:isBuy?'buy':'sell',qtd,preco,valor:valorOp});
  }

  let importados=0;
  const pendingRF=[]; // CDBs/RF que precisam de dados complementares

  for(const [ticker,{nome,txs,rfTipo,isRF,rfSubtipo}] of Object.entries(ops)){
    txs.sort((a,b)=>a.data.localeCompare(b.data));
    const classe=rfTipo||classificarB3(ticker,nome);

    // Bug #8 fix: salva cada transação individual (igual ao processImportRows)
    // calcPosicoes() cuida do PM ponderado e qtd líquida
    for(const tx of txs){
      const tipo=tx.side==='buy'?'Compra':'Venda';
      // RF (CDB/LCI/Tesouro etc): normaliza para qtd=1, pm=valorTotal
      // Assim fatorRF(rf, data) multiplica pm corretamente (igual ao lançamento manual)
      const qtdFinal  = isRF ? 1                                        : Math.round(tx.qtd*10000)/10000;
      const rfValor=(tx.valor>0?tx.valor:tx.qtd*tx.preco);
      const pmFinal   = isRF ? parseFloat(rfValor.toFixed(2)) : parseFloat(tx.preco.toFixed(4));
      const obj={
        ticker,classe,tipo,
        qtd:qtdFinal,
        pm:pmFinal,
        cotacao:pmFinal,
        dy:0,
        data:tx.data||new Date().toISOString().slice(0,10),
        nota:0,ideal:0,moeda:'BRL',comprar:'Não',
        nome:nome||'',rfSubtipo:rfSubtipo||''
      };
      // RF: se já existe esse título nessa data, atualiza valor/nome em vez de duplicar
      //     (corrige CDBs antigos que entraram zerados ou sem o nome do banco).
      if(isRF){
        const ex=ativos.find(a=>a.ticker===obj.ticker&&a.tipo===obj.tipo&&a.data===obj.data&&RF_CLASSES.has(a.classe));
        if(ex){
          if(obj.pm>0){ex.pm=obj.pm;ex.cotacao=obj.pm;} // valor do Excel é a fonte da verdade p/ RF
          if(obj.nome)ex.nome=obj.nome;
          if(obj.rfSubtipo)ex.rfSubtipo=obj.rfSubtipo;
          continue;
        }
      }
      // [BUG-L2 FIX] Dedup com toFixed(4) para normalizar floats
      const key=`${obj.ticker}|${obj.tipo}|${obj.data}|${parseFloat(obj.qtd).toFixed(4)}|${parseFloat(obj.pm).toFixed(4)}`;
      if(ativos.some(a=>`${a.ticker}|${a.tipo}|${a.data}|${parseFloat(a.qtd).toFixed(4)}|${parseFloat(a.pm).toFixed(4)}`===key))continue;
      ativos.push(obj);
      importados++;
      // RF importado via B3 não tem indexador/taxa/vencimento — coleta para perguntar depois
      if(isRF&&tipo==='Compra'){
        pendingRF.push({ativoRef:obj,ticker,nome,valor:(tx.valor>0?tx.valor:tx.qtd*tx.preco),data:tx.data,rfSubtipo});
      }
    }
  }

  // [BUG-RF1 FIX] Resgata Renda Fixa de importações anteriores que ficou sem indexador/taxa
  // (ex: CDB "pulado" no modal, ou importado num arquivo B3 diferente). Sem isso, esses
  // ativos nunca mais reapareciam para completar os dados, mesmo importando outros extratos.
  const _rfJaNaFila=new Set(pendingRF.map(p=>p.ativoRef));
  ativos.forEach(a=>{
    if(RF_CLASSES.has(a.classe)&&a.tipo==='Compra'&&!a.rf&&!_rfJaNaFila.has(a)){
      pendingRF.push({ativoRef:a,ticker:a.ticker,nome:a.ticker,valor:a.pm,data:a.data,rfSubtipo:null});
    }
  });

  saveAtivos();
  if(pendingRF.length){
    toast(`B3: ${importados} lançamento(s) importado(s). Completando dados da Renda Fixa…`);
    openModalRFComplement(pendingRF,()=>{
      saveAtivos();
      initConsolidador();
    });
  }else{
    toast(`B3: ${importados} lançamento(s) importado(s).`);
    initConsolidador(); // recarrega cotações + dividendos e re-renderiza
  }
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
  objetivos=dados.objetivos?JSON.parse(JSON.stringify(dados.objetivos)):[];
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
  if(typeof _dadosCarteiras==='object')_dadosCarteiras[id]={ativos:JSON.parse(JSON.stringify(DEFAULT_ATIVOS)),metas:JSON.parse(JSON.stringify(DEFAULT_METAS)),objetivos:[],nome};
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
    <span style="display:inline-flex;align-items:center;gap:8px;margin-left:3px">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5A623" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0">
        <path d="M17 8V5a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12"></path>
        <path d="M20 12v4h-4a2 2 0 0 1 0 -4h4"></path>
      </svg>
      <span style="font-size:14px;font-weight:600;color:var(--text,#ECEAE4);white-space:nowrap">Sua carteira:</span>
      <select id="sel-carteira" onchange="trocarCarteira(this.value)" title="Selecionar carteira" style="font-size:14px;padding:7px 12px;min-width:150px">
        ${carteiras.map(c=>`<option value="${c.id}" ${c.id===carteiraAtual?'selected':''}>${escapeHtml(c.nome)}</option>`).join('')}
      </select>
      <button class="btn btn-sm" onclick="openModalCarteiras()" title="Configurar carteiras">⚙</button>
    </span>
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
  {id:'aporte',label:'Aporte',icon:'ti-cash',href:'aporte.html'},
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
    // Só o seletor de carteira fica nesta linha. Os botões Importar/Transação foram
    // pro final da linha das ABAS (ali sobra espaço à direita).
    headerActions.innerHTML=`
      <div class="carteira-switcher" id="carteira-switcher"></div>
    `;
    renderCarteiraSwitcher();
  }
  const tabsEl=document.getElementById('tabs');
  if(tabsEl){
    tabsEl.innerHTML=NAV_TABS.map(t=>`<a class="tab ${t.id===active?'active':''}" href="${t.href}"><i class="ti ${t.icon}" aria-hidden="true"></i> ${t.label}</a>`).join('')
      +`<div class="tabs-actions" style="margin-left:auto;display:flex;align-items:center;gap:7px;flex-shrink:0;padding-bottom:4px">
          <input type="file" id="csv-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="handleCSVImport(this)">
          <button class="btn btn-sm" onclick="openImport()"><i class="ti ti-file-spreadsheet" aria-hidden="true"></i> Importar Excel</button>
          <button class="btn btn-sm btn-primary" onclick="openModal()" style="position:relative">+ Transação<span id="rf-badge" title="Há Renda Fixa sem dados" style="display:none;position:absolute;top:-7px;right:-7px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#e23b3b;color:#fff;font-size:11px;font-weight:800;line-height:18px;text-align:center;box-shadow:0 0 0 2px var(--bg2,#16161a)">!</span></button>
        </div>`;
    atualizarBadgeRF();
  }
  mvInitSpaTabs();
}

/* ===================== TROCA DE ABAS SEM RECARREGAR (SPA leve) =====================
   Ao clicar numa aba, em vez de recarregar a página inteira, busca só o conteúdo
   (#tab-*) e o script daquela página e troca apenas a parte abaixo dos menus.
   A barra de navegação, o cabeçalho e as abas continuam fixos no lugar.
   Os dados já estão na memória, então não há novo carregamento. */
let _mvSpaReady=false;
function mvInitSpaTabs(){
  if(_mvSpaReady)return;
  _mvSpaReady=true;
  document.addEventListener('click',e=>{
    const a=e.target.closest?e.target.closest('.tabs .tab'):null;
    if(!a)return;
    // deixa o navegador agir normalmente em abrir-em-nova-aba / clique do meio
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0)return;
    const href=a.getAttribute('href');
    if(!href||!/\.html$/.test(href))return;
    e.preventDefault();
    if(a.classList.contains('active'))return;
    mvLoadTab(href,true);
  });
  window.addEventListener('popstate',()=>{
    const f=(location.pathname.split('/').pop()||'resumo.html');
    mvLoadTab(f,false);
  });
}

async function mvLoadTab(href,push){
  let html;
  try{
    const res=await fetch(href,{cache:'no-cache'});
    html=await res.text();
  }catch(err){ location.href=href; return; } // se falhar, navega do jeito antigo
  const doc=new DOMParser().parseFromString(html,'text/html');
  const novo=doc.querySelector('.app [id^="tab-"]');
  const atual=document.querySelector('.app [id^="tab-"]');
  if(!novo||!atual){ location.href=href; return; }
  atual.replaceWith(novo);
  if(doc.title)document.title=doc.title;
  // roda o script da página (define o renderAll e desenha) — sem refazer o fetch dos dados
  const scr=[...doc.querySelectorAll('script:not([src])')].find(s=>/function\s+renderAll/.test(s.textContent));
  if(scr){
    const code=scr.textContent.replace(/mvGate\s*\(\s*initConsolidador\s*\)\s*;?/,'if(typeof renderAll==="function")renderAll();');
    const el=document.createElement('script');
    el.textContent=code;
    document.body.appendChild(el);
    el.remove();
  }
  if(push)history.pushState({},'',href);
  window.scrollTo(0,0);
}

/* ---- modais (lançamento e meta) ---- */
/* ===================== MODAL DE COMPLEMENTO DE RENDA FIXA (pós-import B3) =====================
   Exibido sequencialmente para cada CDB/LCI/LCA/Tesouro importado que não tem indexador/taxa/vencimento.
   O usuário preenche os dados e eles são gravados no objeto ativo já salvo em ativos[]. */

/* [BUG-RF1 FIX] Verifica a qualquer momento (não só no import) se há Renda Fixa sem
   indexador/taxa/vencimento e abre o modal de complemento para elas. */
/* Renda Fixa de Compra que entrou sem dados (sem indexador/taxa) */
/* Faltam dados na Renda Fixa? CDB precisa de indexador + taxa + vencimento (ou liquidez diária). */
function rfFaltaDados(a){
  const rf=a.rf;
  if(!rf||!rf.indexador)return true;
  if(a.classe==='RF'){
    if(!(parseFloat(rf.taxa)>0))return true;
    const venc=rf.vencimento||rf.venc;
    if(!venc&&!rf.liquidez)return true;
  }
  return false;
}
/* Nome amigável da Renda Fixa: "CDB Digimais 118%" em vez do código */
function _rfEmissorCurto(em){
  return (em||'').replace(/\b(BANCO|BCO|S\/?A\.?|S\.?A\.?|LTDA|CIA|FINANCEIRA|CR[EÉ]DITO)\b/gi,'')
    .replace(/[.\-\/]/g,' ').replace(/\s+/g,' ').trim()
    .toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase());
}
function _rfTaxaLabel(rf){
  const t=parseFloat(rf.taxa)||0;
  const n=t.toLocaleString('pt-BR',{maximumFractionDigits:2});
  if(rf.indexador==='CDI')return t?n+'%':'';
  if(rf.indexador==='IPCA')return 'IPCA+'+n+'%';
  if(rf.indexador==='Selic')return 'Selic+'+n+'%';
  if(rf.indexador==='Prefixado')return n+'%';
  return t?n+'%':'';
}
/* Texto do ativo (sem logo) */
function _rotuloAtivoTexto(a){
  if(a.classe==='TD')return a.ticker; // Tesouro: o ticker já é o nome ("Tesouro IPCA+ 2029")
  if(a.classe==='RF'){
    const em=_rfEmissorCurto((a.rf&&a.rf.emissor)||a.nome||'');
    if(em){
      const tit=(a.rf&&a.rf.titulo&&a.rf.titulo!=='Tesouro Direto')?a.rf.titulo:(a.rfSubtipo||'CDB');
      const tx=a.rf?_rfTaxaLabel(a.rf):'';
      return [tit,em,tx].filter(Boolean).join(' ')||a.ticker;
    }
  }
  return a.ticker;
}
/* Só a logo da empresa (reutilizável em qualquer citação de ativo).
   RF/Tesouro/Fundos/Outros não têm logo → pontinho na cor da classe. */
function logoAtivo(a,size=22){
  const semLogo=(a.classe==='RF'||a.classe==='TD'||a.classe==='FUNDO'||a.classe==='OUTRO');
  const cor=(typeof CLASS_COLORS!=='undefined'&&CLASS_COLORS[a.classe])||'#888';
  if(semLogo){
    const d=Math.max(10,Math.round(size*0.72));
    return `<span style="width:${d}px;height:${d}px;border-radius:50%;background:${cor};flex-shrink:0;display:inline-block"></span>`;
  }
  const tk=a.classe==='BDR'?a.ticker.replace(/\d+$/,''):a.ticker; // BDR: logo sem o número final (igual ao site)
  return (typeof logoHtml==='function')?logoHtml(tk,size):'';
}
/* Logo da empresa + nome (usado nas tabelas de ativos). */
function rotuloAtivo(a){
  return `<span style="display:inline-flex;align-items:center;gap:8px">${logoAtivo(a,22)}<span>${_rotuloAtivoTexto(a)}</span></span>`;
}
function _pendenciasRF(){
  return (typeof ativos!=='undefined'&&ativos?ativos:[]).filter(a=>RF_CLASSES.has(a.classe)&&a.tipo==='Compra'&&rfFaltaDados(a));
}

/* Mostra/esconde a bolinha "!" no botão "+ Transação" */
function atualizarBadgeRF(){
  const b=document.getElementById('rf-badge');
  if(!b)return;
  b.style.display=_pendenciasRF().length>0?'inline-block':'none';
}

/* Atualiza a linha de aviso de pendências dentro do modal "+ Transação" */
function atualizarAvisoRFModal(){
  const box=document.getElementById('modal-rf-pend');
  if(!box)return;
  const n=_pendenciasRF().length;
  if(n>0){
    const txt=document.getElementById('modal-rf-pend-txt');
    if(txt)txt.textContent='⚠ '+n+(n>1?' títulos de Renda Fixa estão':' título de Renda Fixa está')+' sem dados (indexador/taxa).';
    box.style.display='flex';
  }else{
    box.style.display='none';
  }
}

function abrirPendenciasRF(){
  const pend=_pendenciasRF()
    .map(a=>({ativoRef:a,ticker:a.ticker,nome:a.nome||a.ticker,valor:a.pm,data:a.data,rfSubtipo:a.rfSubtipo||null}));
  if(!pend.length){toast('Nenhuma Renda Fixa pendente de dados.');return;}
  openModalRFComplement(pend,()=>{saveAtivos();initConsolidador();});
}

function openModalRFComplement(pendingList, onDone){
  injectModals();
  let idx=0;

  function showNext(){
    if(idx>=pendingList.length){ onDone(); return; }
    const item=pendingList[idx];
    const isTesouro=/^Tesouro\s/i.test(item.ticker);
    const subtipo=item.rfSubtipo||'CDB';
    const titulo=isTesouro?'Tesouro Direto':subtipo;
    const nomeExib=item.nome||item.ticker;
    const valorExib=item.valor?'R$ '+item.valor.toLocaleString('pt-BR',{minimumFractionDigits:2}):'';

    // Guarda contexto do item atual para os handlers (fecha escopo corretamente)
    window._rfcCtx={item,isTesouro,subtipo};

    // Remove modal anterior se existir
    const old=document.getElementById('modal-rf-complement');
    if(old)old.remove();

    const el=document.createElement('div');
    el.id='modal-rf-complement';
    el.className='modal-bg';
    el.style.zIndex='1100';
    el.innerHTML=`
<div class="modal" style="width:min(480px,96vw)">
  <h2 style="display:flex;align-items:center;gap:8px">
    <i class="ti ti-building-bank" style="color:var(--gold)"></i>
    Completar dados — ${titulo}
    <span style="margin-left:auto;font-size:11px;color:var(--color-text-secondary);font-weight:400">${idx+1} de ${pendingList.length}</span>
  </h2>
  <div style="background:var(--bg3,#141418);border:1px solid var(--border,rgba(255,255,255,0.06));border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;line-height:1.6">
    <div style="color:var(--text,#ECEAE4);font-weight:600">${nomeExib}</div>
    <div style="color:var(--color-text-secondary)">${item.data?item.data.split('-').reverse().join('/'):''}${valorExib?' · '+valorExib:''}</div>
  </div>
  <div class="modal-grid">
    <div class="form-group"><label>Valor aplicado (R$)</label><input id="rfc-valor" type="number" step="0.01" min="0" placeholder="0,00" value="${item.valor||''}"></div>
    ${!isTesouro?`<div class="form-group"><label>Emissor</label><input id="rfc-emissor" type="text" placeholder="Ex: Banco Inter, Nubank…" value="${nomeExib}"></div>`:''}
    <div class="form-group"><label>Indexador</label>
      <select id="rfc-indexador" onchange="
        const t=this.value;
        document.getElementById('rfc-taxa-label').textContent=t==='CDI'?'% do CDI':t==='Prefixado'?'Taxa a.a. (%)':'Spread a.a. (%)';
        document.getElementById('rfc-taxa').placeholder=t==='CDI'?'Ex: 110':'Ex: 6.5';
      ">
        <option value="CDI">CDI</option>
        <option value="IPCA">IPCA+</option>
        <option value="Prefixado">Prefixado</option>
        <option value="Selic">Selic</option>
      </select>
    </div>
    <div class="form-group"><label id="rfc-taxa-label">% do CDI</label>
      <input id="rfc-taxa" type="number" placeholder="Ex: 110" step="0.01" min="0">
    </div>
    <div class="form-group"><label>Vencimento</label>
      <input id="rfc-venc" type="date">
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:8px;padding-top:20px">
      <input id="rfc-liquidez" type="checkbox" style="width:auto;cursor:pointer">
      <label for="rfc-liquidez" style="margin:0;cursor:pointer;font-size:12px;color:var(--text,#ECEAE4)">Liquidez diária</label>
    </div>
  </div>
  <div class="modal-actions" style="margin-top:1rem">
    <button class="btn" onclick="_rfcSkip()">Pular</button>
    <button class="btn btn-primary" onclick="_rfcSave()"><i class="ti ti-check"></i> Salvar e continuar</button>
  </div>
</div>`;
    document.body.appendChild(el);
    setTimeout(()=>{ const f=document.getElementById('rfc-emissor')||document.getElementById('rfc-indexador'); if(f)f.focus(); },100);
  }

  window._rfcSave=function(){
    // Lê contexto salvo em window._rfcCtx para evitar problema de escopo
    const {item,isTesouro,subtipo}=window._rfcCtx||{};
    if(!item)return;
    const indexador=document.getElementById('rfc-indexador')?.value||'CDI';
    const taxa=parseFloat(document.getElementById('rfc-taxa')?.value)||0;
    const venc=document.getElementById('rfc-venc')?.value||'';
    const liquidez=document.getElementById('rfc-liquidez')?.checked||false;
    const emissor=document.getElementById('rfc-emissor')?.value||item.nome||'';

    const ativo=item.ativoRef;
    const valorAplic=parseFloat(document.getElementById('rfc-valor')?.value)||0;
    if(valorAplic>0){ativo.pm=valorAplic;ativo.cotacao=valorAplic;}
    ativo.rf={
      titulo:isTesouro?'Tesouro Direto':subtipo,
      emissor,indexador,taxa,
      vencimento:venc,
      liquidez
    };
    if(venc)ativo.vencimento=venc;

    document.getElementById('modal-rf-complement')?.remove();
    idx++;
    showNext();
  };

  window._rfcSkip=function(){
    document.getElementById('modal-rf-complement')?.remove();
    idx++;
    showNext();
  };

  showNext();
}

function injectModals(){
  if(document.getElementById('modal'))return;
  const wrap=document.createElement('div');
  wrap.innerHTML=`
<div class="modal-bg" id="modal" style="display:none" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <h2><i class="ti ti-plus" aria-hidden="true" style="margin-right:6px"></i>Adicionar Lançamento</h2>

    <div id="modal-rf-pend" style="display:none;align-items:center;gap:10px;background:rgba(226,59,59,0.12);border:1px solid rgba(226,59,59,0.4);color:#ff6b6b;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;line-height:1.4">
      <span id="modal-rf-pend-txt" style="flex:1"></span>
      <button type="button" class="btn btn-sm" onclick="closeModal();abrirPendenciasRF()" style="white-space:nowrap">Completar agora</button>
    </div>

    <div class="seg-toggle">
      <button type="button" id="seg-Compra" class="seg-btn active" onclick="setTipoTx('Compra')"><i class="ti ti-shopping-cart" aria-hidden="true"></i> Compra</button>
      <button type="button" id="seg-Venda" class="seg-btn" onclick="setTipoTx('Venda')"><i class="ti ti-cash" aria-hidden="true"></i> Venda</button>
    </div>
    <input type="hidden" id="f-tipo" value="Compra">

    <div class="modal-grid">
      <div class="form-group" style="grid-column:1/-1"><label>Tipo de ativo</label>
        <select id="f-classe" onchange="onClasseChange()">
          <option value="B3">Ações</option><option value="FII">FIIs</option>
          <option value="ETF">ETFs</option><option value="BDR">BDRs</option>
          <option value="Crypto">Criptomoedas</option><option value="Exterior">Stocks</option>
          <option value="ETFINT">ETFs Internacionais</option><option value="REIT">Reits</option>
          <option value="FUNDO">Fundos de Investimentos</option><option value="OUTRO">Outros</option>
          <option value="RF">Renda Fixa (CDB/LCI/LCA/LC...)</option>
          <option value="TD">Tesouro Direto</option>
        </select>
      </div>

      <!-- Bloco Ações / variável -->
      <div class="grp-equity form-group"><label>Ativo</label><input id="f-ticker" type="text" placeholder="PETR4, BTC, AAPL..."></div>
      <div class="grp-equity form-group"><label>Data da transação</label><input id="f-data" type="date"></div>
      <div class="grp-equity form-group"><label>Quantidade</label><input id="f-qtd" type="number" placeholder="100" min="0"></div>
      <div class="grp-equity form-group"><label>Preço em R$</label><input id="f-pm" type="number" placeholder="28,50" step="0.01"></div>
      <div class="grp-equity form-group"><label>Outros custos (R$) <small style="color:var(--color-text-secondary)">(opcional)</small></label><input id="f-custos" type="number" placeholder="0,00" step="0.01"></div>

      <!-- Bloco Renda Fixa -->
      <div class="grp-rf form-group"><label>Emissor</label><input id="rf-emissor" type="text" placeholder="Ex: Banco Inter, Nubank..."></div>
      <div class="grp-rf form-group"><label>Tipo de título</label>
        <select id="rf-titulo"><option>CDB</option><option>LCI</option><option>LCA</option><option>LC</option><option>Tesouro Direto</option><option>Debênture</option><option>CRI</option><option>CRA</option><option>Outro</option></select>
      </div>
      <div class="grp-rf form-group"><label>Indexador</label>
        <select id="rf-indexador" onchange="onIndexadorChange()"><option value="CDI">CDI</option><option value="IPCA">IPCA+</option><option value="Prefixado">Prefixado</option><option value="Selic">Selic</option></select>
      </div>
      <div class="grp-rf form-group"><label id="rf-taxa-label">Taxa do CDI (%)</label><input id="rf-taxa" type="number" placeholder="0,00" step="0.01"></div>
      <div class="grp-rf form-group"><label>Forma</label>
        <select id="rf-forma"><option>Pós-fixado</option><option>Prefixado</option><option>Híbrido</option></select>
      </div>
      <div class="grp-rf form-group"><label>Valor aplicado (R$)</label><input id="rf-valor" type="number" placeholder="0,00" step="0.01"></div>
      <div class="grp-rf form-group"><label>Data da transação</label><input id="rf-data" type="date"></div>
      <div class="grp-rf form-group"><label>Data de vencimento</label><input id="rf-venc" type="date"></div>
      <div class="grp-rf form-group" style="grid-column:1/-1;display:flex;align-items:center;gap:8px">
        <input id="rf-liquidez" type="checkbox" style="width:auto;cursor:pointer"><label for="rf-liquidez" style="margin:0;cursor:pointer">Liquidez diária</label>
      </div>

      <!-- Bloco Venda de Renda Fixa: escolher título + valor a resgatar + IR -->
      <div id="rf-venda-box" style="grid-column:1/-1;display:none">
        <div id="rf-venda-lista"></div>
        <div id="rf-venda-form" style="display:none;margin-top:10px">
          <div class="form-group"><label>Título selecionado</label><input id="rf-venda-titulo" type="text" readonly></div>
          <div class="modal-grid">
            <div class="form-group"><label>Data da venda</label><input id="rf-venda-data" type="date"></div>
            <div class="form-group"><label>Valor a resgatar (R$)</label><input id="rf-venda-valor" type="number" step="0.01" placeholder="0,00" oninput="atualizarResumoVendaRF()"></div>
          </div>
          <div id="rf-venda-resumo" style="margin-top:8px;font-size:13px;line-height:1.7;color:var(--color-text-secondary)"></div>
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="addAtivo()"><i class="ti ti-check" aria-hidden="true"></i> Adicionar Lançamento</button>
    </div>
  </div>
</div>
<div class="modal-bg" id="modal-meta" style="display:none" onclick="if(event.target===this)closeModalMeta()">
  <div class="modal">
    <h2><i class="ti ti-target" aria-hidden="true" style="margin-right:6px"></i>Nova Meta de Alocação</h2>
    <div class="modal-grid">
      <div class="form-group"><label>Classe</label>
        <select id="m-classe">
          <option value="B3">Ações</option><option value="FII">FIIs</option>
          <option value="ETF">ETFs</option><option value="BDR">BDRs</option>
          <option value="Crypto">Criptomoedas</option><option value="Exterior">Stocks</option>
          <option value="ETFINT">ETFs Internacionais</option><option value="REIT">Reits</option>
          <option value="FUNDO">Fundos de Investimentos</option><option value="OUTRO">Outros</option>
          <option value="RF">Renda Fixa</option><option value="TD">Tesouro Direto</option>
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

function openModal(){
  injectModals();
  document.getElementById('modal').style.display='flex';
  const hoje=new Date().toISOString().slice(0,10);
  document.getElementById('f-data').value=hoje;
  document.getElementById('rf-data').value=hoje;
  setTipoTx('Compra');
  onClasseChange();
  atualizarAvisoRFModal();
}
function closeModal(){
  document.getElementById('modal').style.display='none';
  ['f-ticker','f-qtd','f-pm','f-custos','rf-emissor','rf-taxa','rf-valor','rf-venc','rf-venda-valor','rf-venda-titulo'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});
  const liq=document.getElementById('rf-liquidez');if(liq)liq.checked=false;
  _rfVendaSel=null;
  const vf=document.getElementById('rf-venda-form');if(vf)vf.style.display='none';
}

/* Alterna botão Compra/Venda */
function setTipoTx(t){
  document.getElementById('f-tipo').value=t;
  ['Compra','Venda'].forEach(x=>{document.getElementById('seg-'+x).classList.toggle('active',x===t)});
  updateModalMode();
}

function onClasseChange(){updateModalMode();}

/* Mostra os campos certos conforme Tipo de ativo + Compra/Venda.
   Só na Venda de Renda Fixa aparece a tela de escolher o título. */
function updateModalMode(){
  const classe=document.getElementById('f-classe').value;
  const tipo=document.getElementById('f-tipo').value;
  const rf=RF_CLASSES.has(classe);
  const vendaRF=(rf&&tipo==='Venda');
  document.querySelectorAll('#modal .grp-rf').forEach(el=>{el.style.display=(rf&&!vendaRF)?'':'none'});
  document.querySelectorAll('#modal .grp-equity').forEach(el=>{el.style.display=rf?'none':''});
  const box=document.getElementById('rf-venda-box');
  if(box)box.style.display=vendaRF?'':'none';
  if(vendaRF)montarListaVendaRF();
}

/* ---- Venda de Renda Fixa ---- */
let _rfVendaLista=[],_rfVendaSel=null;
const RF_ISENTO=['LCI','LCA','CRI','CRA']; // isentos de IR

function diasCorridos(de,ate){
  if(!de)return 0;
  const d1=new Date(de+'T00:00:00');
  const d2=ate?new Date(ate+'T00:00:00'):new Date();
  return Math.max(0,Math.round((d2-d1)/(24*3600*1000)));
}
/* Tabela regressiva de IR para Renda Fixa (sobre o rendimento) */
function aliquotaRF(dias){
  if(dias<=180)return 0.225;
  if(dias<=360)return 0.20;
  if(dias<=720)return 0.175;
  return 0.15;
}

/* Posições de RF que ainda tenho em carteira (com saldo corrigido) */
function getPosicoesRF(){
  return calcAtivos().filter(a=>RF_CLASSES.has(a.classe)&&a.qtd>0.000001);
}

/* Monta a listinha de títulos de RF para escolher qual vender */
function montarListaVendaRF(){
  _rfVendaLista=getPosicoesRF();_rfVendaSel=null;
  const lista=document.getElementById('rf-venda-lista');
  const form=document.getElementById('rf-venda-form');
  if(form)form.style.display='none';
  if(!lista)return;
  if(!_rfVendaLista.length){
    lista.innerHTML='<div class="empty" style="padding:12px">Você não tem títulos de Renda Fixa em carteira para vender.</div>';
    return;
  }
  lista.innerHTML='<div style="font-weight:600;margin-bottom:8px">Selecione o título para vender</div>'+
    _rfVendaLista.map((a,i)=>{
      const sub=a.rf?`${a.rf.indexador||''} ${a.rf.taxa||''}`.trim():'';
      return `<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 10px;border:1px solid var(--border3, rgba(255,255,255,0.12));border-radius:var(--border-radius-md);margin-bottom:6px;cursor:pointer">
        <span style="display:flex;align-items:center;gap:8px">
          <input type="radio" name="rf-venda-pick" value="${i}" style="width:auto;cursor:pointer" onchange="_rfVendaSel=${i}">
          <span>${escapeHtml(a.ticker)}${sub?` <small style="color:var(--color-text-secondary)">— ${escapeHtml(sub)}</small>`:''}</span>
        </span>
        <strong>R$ ${fmt(a.vt)}</strong>
      </label>`;
    }).join('')+
    '<button type="button" class="btn btn-primary btn-sm" style="margin-top:4px" onclick="confirmarSelecaoRF()"><i class="ti ti-check" aria-hidden="true"></i> Confirmar seleção</button>';
}

/* Depois de escolher o título, abre o formulário de valor + IR já preenchido */
function confirmarSelecaoRF(){
  if(_rfVendaSel===null||!_rfVendaLista[_rfVendaSel]){alert('Selecione um título para vender.');return}
  const pos=_rfVendaLista[_rfVendaSel];
  document.getElementById('rf-venda-titulo').value=pos.ticker;
  document.getElementById('rf-venda-data').value=new Date().toISOString().slice(0,10);
  document.getElementById('rf-venda-valor').value=pos.vt.toFixed(2);
  document.getElementById('rf-venda-form').style.display='';
  atualizarResumoVendaRF();
}

/* Calcula rendimento e IR da parte vendida */
function calcVendaRFInfo(pos,valor,dataVenda){
  const principalUnit=pos.pm, precoUnit=pos.cotacao;
  const qtd=precoUnit>0?valor/precoUnit:0;
  const custo=qtd*principalUnit;
  const rend=valor-custo;
  const titulo=pos.rf&&pos.rf.titulo?pos.rf.titulo:'';
  const isento=RF_ISENTO.includes(titulo);
  const dias=diasCorridos(pos.data,dataVenda);
  const aliq=aliquotaRF(dias);
  const ir=isento?0:Math.max(0,rend)*aliq;
  return {qtd,rend,isento,dias,aliq,ir,liquido:valor-ir};
}

/* Atualiza o resumo (rendimento, IR, líquido) enquanto o usuário digita o valor */
function atualizarResumoVendaRF(){
  if(_rfVendaSel===null)return;
  const pos=_rfVendaLista[_rfVendaSel];
  const valor=parseFloat(document.getElementById('rf-venda-valor').value)||0;
  const dataVenda=document.getElementById('rf-venda-data').value;
  const r=document.getElementById('rf-venda-resumo');
  if(!r)return;
  if(valor<=0){r.innerHTML='Informe o valor a resgatar.';return}
  const info=calcVendaRFInfo(pos,valor,dataVenda);
  const irTxt=info.isento
    ?'Isento de IR (LCI/LCA/CRI/CRA)'
    :`IR (${(info.aliq*100).toFixed(1).replace('.',',')}% • ${info.dias} dias): <strong>R$ ${fmt(info.ir)}</strong>`;
  r.innerHTML=`Rendimento na parte vendida: <strong>R$ ${fmt(info.rend)}</strong><br>${irTxt}<br>Valor líquido a receber: <strong style="color:var(--text, #ECEAE4)">R$ ${fmt(info.liquido)}</strong>`;
}

/* Grava a venda de RF como uma fração do título (permite venda parcial) */
function finalizarVendaRF(){
  if(_rfVendaSel===null||!_rfVendaLista[_rfVendaSel]){alert('Selecione um título e clique em "Confirmar seleção".');return}
  const pos=_rfVendaLista[_rfVendaSel];
  const valor=parseFloat(document.getElementById('rf-venda-valor').value)||0;
  const dataVenda=document.getElementById('rf-venda-data').value||new Date().toISOString().slice(0,10);
  if(valor<=0){alert('Informe o valor a resgatar.');return}
  if(valor>pos.vt+0.01){alert(`Valor maior que o saldo do título (R$ ${fmt(pos.vt)}).`);return}
  const precoUnit=pos.cotacao;
  const qtdVendida=precoUnit>0?valor/precoUnit:0;
  const obj={ticker:pos.ticker,classe:pos.classe||'RF',tipo:'Venda',qtd:qtdVendida,pm:precoUnit,cotacao:precoUnit,
    data:dataVenda,nota:0,ideal:0,moeda:'BRL',comprar:'Não',rf:pos.rf};
  ativos.push(obj);
  saveAtivos();
  closeModal();
  initConsolidador();
  toast('Venda de Renda Fixa registrada.');
}

/* Ajusta o rótulo da taxa conforme o indexador */
function onIndexadorChange(){
  const idx=document.getElementById('rf-indexador').value;
  const lbl={CDI:'Taxa do CDI (%)',IPCA:'Taxa + IPCA (% a.a.)',Prefixado:'Taxa prefixada (% a.a.)',Selic:'Taxa + Selic (%)'}[idx]||'Taxa (%)';
  document.getElementById('rf-taxa-label').textContent=lbl;
}
function openModalMeta(){injectModals();document.getElementById('modal-meta').style.display='flex'}
function closeModalMeta(){document.getElementById('modal-meta').style.display='none'}
/* modal redesign v2 — campos dinâmicos RF/Ações */

function addAtivo(){
  const classe=document.getElementById('f-classe').value;
  const tipo=document.getElementById('f-tipo').value;
  // Venda de Renda Fixa/Tesouro tem fluxo próprio (escolher título + valor + IR)
  if(tipo==='Venda'&&RF_CLASSES.has(classe)){return finalizarVendaRF();}
  let obj;
  // Nota / % Ideal / Comprar são definidos depois, na carteira (Resumo).
  if(RF_CLASSES.has(classe)){
    const emissor=document.getElementById('rf-emissor').value.trim();
    const titulo=document.getElementById('rf-titulo').value;
    const indexador=document.getElementById('rf-indexador').value;
    const taxa=parseFloat(document.getElementById('rf-taxa').value)||0;
    const forma=document.getElementById('rf-forma').value;
    const valor=parseFloat(document.getElementById('rf-valor').value)||0;
    const data=document.getElementById('rf-data').value;
    const venc=document.getElementById('rf-venc').value;
    const liquidez=document.getElementById('rf-liquidez').checked;
    if(!emissor||!valor){alert('Preencha Emissor e Valor aplicado.');return}
    const ticker=`${titulo} ${emissor}`.toUpperCase();
    // qtd=1 e pm=valor → total = valor aplicado (mantém o formato dos demais consumidores)
    obj={ticker,classe:titulo==='Tesouro Direto'?'TD':classe,tipo,qtd:1,pm:valor,cotacao:valor,data,nota:0,ideal:0,moeda:'BRL',comprar:'Não',
         rf:{emissor,titulo,indexador,taxa,forma,valor,venc,liquidez}};
  }else{
    const ticker=document.getElementById('f-ticker').value.trim().toUpperCase();
    const qtd=parseFloat(document.getElementById('f-qtd').value)||0;
    const preco=parseFloat(document.getElementById('f-pm').value)||0;
    const custos=parseFloat(document.getElementById('f-custos').value)||0;
    const data=document.getElementById('f-data').value;
    if(!ticker||!qtd||!preco){alert('Preencha Ativo, Quantidade e Preço.');return}
    // Outros custos entram no preço médio (custo de aquisição all-in)
    const pm=preco+(qtd>0?custos/qtd:0);
    obj={ticker,classe,tipo,qtd,pm,cotacao:0,data,nota:0,ideal:0,moeda:'BRL',comprar:'Não',custos};
  }
  // Bug #1 fix: sempre push — novo modelo de transações (não sobrescreve lançamentos anteriores)
  ativos.push(obj);
  saveAtivos();
  closeModal();
  initConsolidador(); // recarrega cotação e proventos do site
  toast('Lançamento salvo.');
}

/* Define Nota / % Ideal / Comprar depois, na carteira (grava em todos os lançamentos do ticker) */
function setMetaAtivo(ticker,campo,valor){
  const v=campo==='comprar'?valor:(parseFloat(valor)||0);
  let mexeu=false;
  ativos.forEach(a=>{if(a.ticker===ticker){a[campo]=v;mexeu=true}});
  if(mexeu){saveAtivos();if(typeof renderAll==='function')renderAll();}
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
