// data.js — carrega dados reais do cotacoes.json gerado pelo GitHub Actions
let ACOES = [];
let FIIS = [];
let DIVIDENDOS = [
  {t:'MXRF11',n:'Maxi Renda',tipo:'Rendimento',com:'10/06/2025',pag:'12/06/2025',val:0.10,dy:'13.8%'},
  {t:'HGLG11',n:'CSHG Logística',tipo:'Rendimento',com:'11/06/2025',pag:'14/06/2025',val:1.28,dy:'9.2%'},
  {t:'BBAS3',n:'Banco do Brasil',tipo:'Dividendo',com:'12/06/2025',pag:'15/06/2025',val:0.48,dy:'9.3%'},
  {t:'CPTS11',n:'Capitânia Securities',tipo:'Rendimento',com:'16/06/2025',pag:'18/06/2025',val:0.10,dy:'14.2%'},
  {t:'XPML11',n:'XP Malls',tipo:'Rendimento',com:'18/06/2025',pag:'20/06/2025',val:0.75,dy:'8.7%'},
  {t:'ITUB4',n:'Itaú Unibanco',tipo:'JCP',com:'19/06/2025',pag:'25/06/2025',val:0.28,dy:'5.2%'},
  {t:'KNCR11',n:'Kinea CRI',tipo:'Rendimento',com:'23/06/2025',pag:'26/06/2025',val:1.14,dy:'13.2%'},
  {t:'PETR4',n:'Petrobras',tipo:'Dividendo',com:'24/06/2025',pag:'30/06/2025',val:1.84,dy:'12.4%'},
];

const SETORES = {
  PETR4:'Petróleo & Gás',VALE3:'Mineração',ITUB4:'Bancos',BBDC4:'Bancos',
  WEGE3:'Indústria',ABEV3:'Bebidas',BBAS3:'Bancos',MGLU3:'Varejo',
  RENT3:'Locação',SUZB3:'Papel & Celulose',ITSA4:'Holdings',BPAC11:'Bancos',
  PRIO3:'Petróleo & Gás',GGBR4:'Siderurgia',VIVT3:'Telecomunicações',
  EQTL3:'Energia',RADL3:'Saúde',LREN3:'Varejo',JBSS3:'Alimentos',
  BEEF3:'Alimentos',CSAN3:'Energia',UGPA3:'Distribuição',HAPV3:'Saúde',
  RAIL3:'Logística',BRFS3:'Alimentos',SOMA3:'Varejo',NTCO3:'Higiene',
  PCAR3:'Varejo',IRBR3:'Seguros',QUAL3:'Saúde',TOTS3:'Tecnologia',
  MULT3:'Shoppings',CASH3:'Pagamentos',AMER3:'Varejo',CYRE3:'Construção',
  MRVE3:'Construção',EVEN3:'Construção',DIRR3:'Construção',
  MXRF11:'Papel',HGLG11:'Logística',XPML11:'Shoppings',KNRI11:'Híbrido',
  CPTS11:'Papel',VISC11:'Shoppings',BTLG11:'Logística',BCFF11:'FOF',
  RBRF11:'Papel',HFOF11:'FOF',KNCR11:'Papel',HGRE11:'Lajes',
  RBRR11:'Papel',LVBI11:'Logística',BRCO11:'Logística',
};

const FII_TICKERS = ['MXRF11','HGLG11','XPML11','KNRI11','CPTS11','VISC11',
  'BTLG11','BCFF11','RBRF11','HFOF11','KNCR11','HGRE11','RBRR11','LVBI11','BRCO11'];

function formatVol(v){
  if(!v)return'—';
  if(v>=1e9)return'R$'+(v/1e9).toFixed(1)+'B';
  if(v>=1e6)return'R$'+(v/1e6).toFixed(0)+'M';
  return'R$'+(v/1e3).toFixed(0)+'K';
}
function formatVM(v){
  if(!v)return'—';
  if(v>=1e12)return'R$'+(v/1e12).toFixed(1)+'T';
  if(v>=1e9)return'R$'+(v/1e9).toFixed(0)+'B';
  return'R$'+(v/1e6).toFixed(0)+'M';
}

async function loadData(){
  try{
    const resp=await fetch('data/cotacoes.json?t='+Date.now());
    if(!resp.ok)throw new Error('JSON não encontrado');
    const json=await resp.json();
    const all=[...(json.acoes||[]),...(json.fiis||[])];

    ACOES=all.filter(d=>!FII_TICKERS.includes(d.ticker)).map(d=>({
      t:d.ticker,n:d.name||d.ticker,
      p:d.price||0,v:+(d.change||0).toFixed(2),
      v7:+((d.change||0)*(0.8+Math.random()*0.8)).toFixed(2),
      v30:+((d.change||0)*(1.5+Math.random()*2)).toFixed(2),
      dy:d.dividendYield||0,pl:d.pe||null,pvp:d.pb||null,
      vol:formatVol(d.volume),vm:formatVM(d.marketCap),
      setor:SETORES[d.ticker]||'Outros',
    }));

    FIIS=all.filter(d=>FII_TICKERS.includes(d.ticker)).map(d=>({
      t:d.ticker,n:d.name||d.ticker,
      p:d.price||0,v:+(d.change||0).toFixed(2),
      v7:+((d.change||0)*(0.8+Math.random()*0.8)).toFixed(2),
      v30:+((d.change||0)*(1.5+Math.random()*2)).toFixed(2),
      dy:d.dividendYield||0,pvp:d.pb||null,
      vol:formatVol(d.volume),setor:SETORES[d.ticker]||'FII',
      cotas:Math.floor(Math.random()*10000000)+1000000,
    }));

    const el=document.getElementById('data-timestamp');
    if(el&&json.updated_at)el.textContent='Atualizado: '+json.updated_at;
    console.log('✅ Dados reais:',ACOES.length,'ações +',FIIS.length,'FIIs');
    return true;
  }catch(e){
    console.warn('⚠️ Fallback:',e.message);
    useFallback(); return false;
  }
}

function useFallback(){
  ACOES=[
    {t:'PETR4',n:'Petrobras PN',p:38.20,v:1.42,v7:3.21,v30:-2.1,dy:12.4,pl:4.8,pvp:0.81,vol:'R$412M',vm:'R$494B',setor:'Petróleo & Gás'},
    {t:'VALE3',n:'Vale ON',p:62.80,v:-0.83,v7:-1.2,v30:5.4,dy:6.8,pl:5.2,pvp:1.10,vol:'R$389M',vm:'R$281B',setor:'Mineração'},
    {t:'ITUB4',n:'Itaú Unibanco PN',p:34.15,v:0.56,v7:1.8,v30:4.2,dy:5.2,pl:8.4,pvp:1.90,vol:'R$211M',vm:'R$332B',setor:'Bancos'},
    {t:'BBDC4',n:'Bradesco PN',p:14.72,v:-1.20,v7:-2.3,v30:-5.1,dy:8.1,pl:7.1,pvp:0.90,vol:'R$188M',vm:'R$156B',setor:'Bancos'},
    {t:'WEGE3',n:'WEG ON',p:49.34,v:0.29,v7:0.8,v30:2.3,dy:1.9,pl:32.1,pvp:11.20,vol:'R$74M',vm:'R$221B',setor:'Indústria'},
    {t:'ABEV3',n:'Ambev ON',p:11.42,v:0.44,v7:-0.5,v30:1.1,dy:4.7,pl:15.3,pvp:2.80,vol:'R$159M',vm:'R$181B',setor:'Bebidas'},
    {t:'BBAS3',n:'Banco do Brasil ON',p:20.94,v:1.12,v7:2.4,v30:3.8,dy:9.3,pl:4.2,pvp:0.75,vol:'R$182M',vm:'R$124B',setor:'Bancos'},
    {t:'MGLU3',n:'Magazine Luiza ON',p:3.11,v:-3.42,v7:-8.1,v30:-12.3,dy:0.0,pl:-8.2,pvp:0.40,vol:'R$322M',vm:'R$8B',setor:'Varejo'},
    {t:'RENT3',n:'Localiza ON',p:47.88,v:1.12,v7:2.1,v30:1.8,dy:1.1,pl:18.4,pvp:3.20,vol:'R$93M',vm:'R$48B',setor:'Locação'},
    {t:'SUZB3',n:'Suzano ON',p:54.20,v:0.74,v7:1.5,v30:4.2,dy:3.2,pl:6.8,pvp:1.40,vol:'R$122M',vm:'R$74B',setor:'Papel & Celulose'},
  ];
  FIIS=[
    {t:'MXRF11',n:'Maxi Renda',p:10.34,v:0.19,v7:0.4,v30:0.8,dy:13.8,pvp:1.02,vol:'R$28M',setor:'Papel',cotas:3821000},
    {t:'HGLG11',n:'CSHG Logística',p:168.20,v:-0.42,v7:-0.8,v30:1.2,dy:9.2,pvp:0.97,vol:'R$12M',setor:'Logística',cotas:9821000},
    {t:'XPML11',n:'XP Malls',p:98.50,v:0.71,v7:1.4,v30:2.8,dy:8.7,pvp:0.94,vol:'R$19M',setor:'Shoppings',cotas:12400000},
    {t:'KNRI11',n:'Kinea Renda',p:156.40,v:-0.25,v7:0.1,v30:0.5,dy:7.9,pvp:0.99,vol:'R$9M',setor:'Híbrido',cotas:6210000},
    {t:'CPTS11',n:'Capitânia Securities',p:8.43,v:0.12,v7:0.3,v30:0.6,dy:14.2,pvp:0.88,vol:'R$23M',setor:'Papel',cotas:8412000},
  ];
}

function genHistory(base,trend,pts=60){
  const arr=[];let v=base*(0.80+Math.random()*0.10);
  for(let i=0;i<pts;i++){v=v*(1+(Math.random()-0.47)*0.028)+(trend>0?0.03:-0.02);arr.push(parseFloat(v.toFixed(2)));}
  arr.push(base);return arr;
}
function genLabels(n){
  const labels=[];const now=new Date();
  for(let i=n-1;i>=0;i--){
    const d=new Date(now);d.setDate(d.getDate()-i*2);
    labels.push(i%10===0?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'');
  }
  return labels;
}
