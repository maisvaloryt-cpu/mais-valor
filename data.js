// data.js — dados de demonstração (serão substituídos pelos JSONs reais via GitHub Actions)
const ACOES = [
  {t:'PETR4',n:'Petrobras PN',p:38.20,v:1.42,v7:3.21,v30:-2.1,dy:12.4,pl:4.8,pvp:0.81,vol:'R$412M',setor:'Petróleo & Gás',vm:'R$494B'},
  {t:'VALE3',n:'Vale ON',p:62.80,v:-0.83,v7:-1.2,v30:5.4,dy:6.8,pl:5.2,pvp:1.10,vol:'R$389M',setor:'Mineração',vm:'R$281B'},
  {t:'ITUB4',n:'Itaú Unibanco PN',p:34.15,v:0.56,v7:1.8,v30:4.2,dy:5.2,pl:8.4,pvp:1.90,vol:'R$211M',setor:'Bancos',vm:'R$332B'},
  {t:'BBDC4',n:'Bradesco PN',p:14.72,v:-1.20,v7:-2.3,v30:-5.1,dy:8.1,pl:7.1,pvp:0.90,vol:'R$188M',setor:'Bancos',vm:'R$156B'},
  {t:'WEGE3',n:'WEG ON',p:49.34,v:0.29,v7:0.8,v30:2.3,dy:1.9,pl:32.1,pvp:11.20,vol:'R$74M',setor:'Indústria',vm:'R$221B'},
  {t:'ABEV3',n:'Ambev ON',p:11.42,v:0.44,v7:-0.5,v30:1.1,dy:4.7,pl:15.3,pvp:2.80,vol:'R$159M',setor:'Bebidas',vm:'R$181B'},
  {t:'BBAS3',n:'Banco do Brasil ON',p:20.94,v:1.12,v7:2.4,v30:3.8,dy:9.3,pl:4.2,pvp:0.75,vol:'R$182M',setor:'Bancos',vm:'R$124B'},
  {t:'MGLU3',n:'Magazine Luiza ON',p:3.11,v:-3.42,v7:-8.1,v30:-12.3,dy:0.0,pl:-8.2,pvp:0.40,vol:'R$322M',setor:'Varejo',vm:'R$8B'},
  {t:'RENT3',n:'Localiza ON',p:47.88,v:1.12,v7:2.1,v30:1.8,dy:1.1,pl:18.4,pvp:3.20,vol:'R$93M',setor:'Locação',vm:'R$48B'},
  {t:'SUZB3',n:'Suzano ON',p:54.20,v:0.74,v7:1.5,v30:4.2,dy:3.2,pl:6.8,pvp:1.40,vol:'R$122M',setor:'Papel & Celulose',vm:'R$74B'},
  {t:'ITSA4',n:'Itaúsa PN',p:12.87,v:0.47,v7:1.2,v30:2.8,dy:6.4,pl:9.1,pvp:1.60,vol:'R$88M',setor:'Holdings',vm:'R$98B'},
  {t:'BPAC11',n:'BTG Pactual units',p:53.93,v:0.82,v7:1.9,v30:4.1,dy:3.8,pl:12.4,pvp:2.10,vol:'R$71M',setor:'Bancos',vm:'R$94B'},
  {t:'PRIO3',n:'PetroRio ON',p:38.40,v:2.14,v7:4.2,v30:6.3,dy:0.0,pl:6.4,pvp:2.80,vol:'R$64M',setor:'Petróleo & Gás',vm:'R$21B'},
  {t:'GGBR4',n:'Gerdau PN',p:18.92,v:-0.42,v7:-1.1,v30:0.8,dy:7.2,pl:5.8,pvp:0.90,vol:'R$78M',setor:'Siderurgia',vm:'R$33B'},
  {t:'VIVT3',n:'Telefônica ON',p:48.10,v:0.21,v7:0.6,v30:1.4,dy:6.8,pl:14.2,pvp:2.20,vol:'R$42M',setor:'Telecomunicações',vm:'R$78B'},
];

const FIIS = [
  {t:'MXRF11',n:'Maxi Renda',p:10.34,v:0.19,v7:0.4,v30:0.8,dy:13.8,pvp:1.02,vol:'R$28M',setor:'Papel',cotas:3821000},
  {t:'HGLG11',n:'CSHG Logística',p:168.20,v:-0.42,v7:-0.8,v30:1.2,dy:9.2,pvp:0.97,vol:'R$12M',setor:'Logística',cotas:9821000},
  {t:'XPML11',n:'XP Malls',p:98.50,v:0.71,v7:1.4,v30:2.8,dy:8.7,pvp:0.94,vol:'R$19M',setor:'Shoppings',cotas:12400000},
  {t:'KNRI11',n:'Kinea Renda',p:156.40,v:-0.25,v7:0.1,v30:0.5,dy:7.9,pvp:0.99,vol:'R$9M',setor:'Híbrido',cotas:6210000},
  {t:'CPTS11',n:'Capitânia Securities',p:8.43,v:0.12,v7:0.3,v30:0.6,dy:14.2,pvp:0.88,vol:'R$23M',setor:'Papel',cotas:8412000},
  {t:'VISC11',n:'Vinci Shopping Centers',p:112.80,v:0.38,v7:0.9,v30:2.1,dy:8.3,pvp:0.95,vol:'R$8M',setor:'Shoppings',cotas:4820000},
  {t:'BTLG11',n:'BTG Pactual Logística',p:105.60,v:-0.57,v7:-1.1,v30:-0.8,dy:9.6,pvp:0.91,vol:'R$11M',setor:'Logística',cotas:5120000},
  {t:'BCFF11',n:'BTG Pactual FOF',p:7.82,v:0.26,v7:0.5,v30:1.3,dy:11.4,pvp:0.93,vol:'R$18M',setor:'FOF',cotas:18240000},
  {t:'RBRF11',n:'RBR Alpha Multiestratégia',p:8.21,v:-0.12,v7:0.2,v30:0.9,dy:12.1,pvp:0.89,vol:'R$14M',setor:'Papel',cotas:9810000},
  {t:'HFOF11',n:'Hedge Top FOFII 3',p:7.94,v:0.38,v7:0.7,v30:1.6,dy:11.8,pvp:0.90,vol:'R$10M',setor:'FOF',cotas:8920000},
  {t:'KNCR11',n:'Kinea CRI',p:105.10,v:0.14,v7:0.3,v30:0.7,dy:13.2,pvp:1.01,vol:'R$21M',setor:'Papel',cotas:7420000},
  {t:'HGRE11',n:'CSHG Real Estate',p:138.20,v:-0.32,v7:-0.6,v30:0.4,dy:8.1,pvp:0.88,vol:'R$7M',setor:'Lajes',cotas:4210000},
  {t:'RBRR11',n:'RBR Rendimento High Grade',p:97.40,v:0.21,v7:0.4,v30:1.1,dy:13.6,pvp:0.97,vol:'R$9M',setor:'Papel',cotas:3820000},
  {t:'LVBI11',n:'VBI Logístico',p:102.80,v:0.48,v7:1.0,v30:2.4,dy:9.8,pvp:0.93,vol:'R$6M',setor:'Logística',cotas:2940000},
  {t:'BRCO11',n:'Bresco Logística',p:98.60,v:-0.18,v7:0.2,v30:0.9,dy:8.4,pvp:0.92,vol:'R$5M',setor:'Logística',cotas:2810000},
];

const DIVIDENDOS = [
  {t:'MXRF11',n:'Maxi Renda',tipo:'Rendimento',com:'10/06/2025',pag:'12/06/2025',val:0.10,dy:'13.8%'},
  {t:'HGLG11',n:'CSHG Logística',tipo:'Rendimento',com:'11/06/2025',pag:'14/06/2025',val:1.28,dy:'9.2%'},
  {t:'BBAS3',n:'Banco do Brasil',tipo:'Dividendo',com:'12/06/2025',pag:'15/06/2025',val:0.48,dy:'9.3%'},
  {t:'CPTS11',n:'Capitânia Securities',tipo:'Rendimento',com:'16/06/2025',pag:'18/06/2025',val:0.10,dy:'14.2%'},
  {t:'XPML11',n:'XP Malls',tipo:'Rendimento',com:'18/06/2025',pag:'20/06/2025',val:0.75,dy:'8.7%'},
  {t:'ITUB4',n:'Itaú Unibanco',tipo:'JCP',com:'19/06/2025',pag:'25/06/2025',val:0.28,dy:'5.2%'},
  {t:'KNCR11',n:'Kinea CRI',tipo:'Rendimento',com:'23/06/2025',pag:'26/06/2025',val:1.14,dy:'13.2%'},
  {t:'PETR4',n:'Petrobras',tipo:'Dividendo',com:'24/06/2025',pag:'30/06/2025',val:1.84,dy:'12.4%'},
  {t:'KNRI11',n:'Kinea Renda',tipo:'Rendimento',com:'25/06/2025',pag:'27/06/2025',val:1.03,dy:'7.9%'},
  {t:'VISC11',n:'Vinci Shopping',tipo:'Rendimento',com:'26/06/2025',pag:'30/06/2025',val:0.78,dy:'8.3%'},
  {t:'BBDC4',n:'Bradesco',tipo:'JCP',com:'27/06/2025',pag:'10/07/2025',val:0.12,dy:'8.1%'},
  {t:'VIVT3',n:'Telefônica',tipo:'Dividendo',com:'30/06/2025',pag:'15/07/2025',val:2.72,dy:'6.8%'},
];

function genHistory(base, trend, pts=60) {
  const arr = []; let v = base * (0.80 + Math.random()*0.10);
  for (let i=0;i<pts;i++) {
    v = v*(1+(Math.random()-0.47)*0.028)+(trend>0?0.03:-0.02);
    arr.push(parseFloat(v.toFixed(2)));
  }
  arr.push(base); return arr;
}

function genLabels(n) {
  const labels=[]; const now=new Date(2025,5,6);
  for (let i=n-1;i>=0;i--) {
    const d=new Date(now); d.setDate(d.getDate()-i*2);
    labels.push(i%10===0?d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'');
  }
  return labels;
}
