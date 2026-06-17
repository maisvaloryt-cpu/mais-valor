/* ============ FIREBASE — Consolidador de Carteira ============ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBDojPPrdkrqr52WxDL-WPy5wL1fsWo1HI",
  authDomain: "consolidador-de-carteira-c3a83.firebaseapp.com",
  projectId: "consolidador-de-carteira-c3a83",
  storageBucket: "consolidador-de-carteira-c3a83.firebasestorage.app",
  messagingSenderId: "691277823486",
  appId: "1:691277823486:web:a17e3faf4375adc61354af"
};

firebase.initializeApp(FIREBASE_CONFIG);
const _auth = firebase.auth();
const _db   = firebase.firestore();

/* ---- login / logout ---- */
function loginGoogle(){
  _auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch(e => toast('Erro ao fazer login: ' + e.message));
}
function logoutUser(){
  _auth.signOut().then(() => toast('Saiu da conta.'));
}

/* Guarda em memória os dados de TODAS as carteiras do usuário (vindos da nuvem).
   Formato: { [carteiraId]: { ativos, metas, nome } } */
let _dadosCarteiras = {};

/* ---- salva ativos + metas da carteira ATIVA, e a lista de carteiras, no Firestore ---- */
async function syncFirestore(){
  const user = _auth.currentUser;
  if(!user) return;
  try{
    const cInfo = carteiras.find(c=>c.id===carteiraAtual);
    const nome = cInfo?cInfo.nome:'';
    _dadosCarteiras[carteiraAtual] = { ativos, metas, nome };
    await _db.collection('carteiras').doc(user.uid).set({
      listaCarteiras: carteiras,
      carteiraAtual,
      dados: { [carteiraAtual]: { ativos, metas, nome } }
    }, {merge: true});
  }catch(e){ console.warn('syncFirestore:', e); }
}

/* ---- remove de vez uma carteira excluída no documento da nuvem ---- */
async function excluirCarteiraNuvem(id){
  const user = _auth.currentUser;
  if(!user) return;
  try{
    await _db.collection('carteiras').doc(user.uid).update({
      ['dados.'+id]: firebase.firestore.FieldValue.delete(),
      listaCarteiras: carteiras,
      carteiraAtual
    });
  }catch(e){ console.warn('excluirCarteiraNuvem:', e); }
}

/* ---- renderiza botão de login ou avatar do usuário no header ---- */
function renderAuthUI(user){
  const el = document.getElementById('auth-area');
  if(!el) return;
  if(user){
    el.innerHTML = `
      <img src="${user.photoURL||''}" onerror="this.style.display='none'"
        style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:1px solid #444;flex-shrink:0">
      <span style="font-size:12px;color:var(--color-text-secondary);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
        title="${user.displayName||''}">${(user.displayName||'').split(' ')[0]}</span>
      <button class="btn" style="padding:4px 10px;font-size:12px" onclick="logoutUser()">
        <i class="ti ti-logout" aria-hidden="true"></i> Sair
      </button>`;
  } else {
    el.innerHTML = `
      <button class="btn btn-primary" style="padding:4px 12px;font-size:12px;display:flex;align-items:center;gap:6px" onclick="loginGoogle()">
        <svg width="14" height="14" viewBox="0 0 24 24" style="flex-shrink:0">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Entrar com Google
      </button>`;
  }
}

/* ---- limpa todos os dados da carteira da memória (chamado no logout) ---- */
function _limparDadosCarteira(){
  carteiras = [];
  carteiraAtual = null;
  ativos = [];
  metas = [];
  _dadosCarteiras = {};
}

/* ---- cria a carteira padrão vazia em memória (primeiro acesso do usuário) ---- */
function _criarCarteiraPadraoVazia(){
  const id = 'default';
  carteiras = [{id, nome:'Carteira Principal'}];
  carteiraAtual = id;
  ativos = [];
  metas = JSON.parse(JSON.stringify(DEFAULT_METAS));
  _dadosCarteiras = { [id]: { ativos, metas, nome:'Carteira Principal' } };
}

/* ---- observador de autenticação: agora é a ÚNICA fonte de dados da carteira.
   Não existe mais localStorage no meio do caminho — tudo vem direto do Firestore
   para a memória, e some da memória no logout. ---- */
_auth.onAuthStateChanged(async user => {
  if(user){
    try{
      const doc = await _db.collection('carteiras').doc(user.uid).get();
      if(doc.exists){
        const d = doc.data();
        if(d.dados && Object.keys(d.dados).length){
          // Formato novo (multi-carteira): tudo vem da nuvem
          _dadosCarteiras = d.dados;
          carteiras = (Array.isArray(d.listaCarteiras) && d.listaCarteiras.length)
            ? d.listaCarteiras
            : Object.keys(d.dados).map(id=>({id, nome: (d.dados[id]&&d.dados[id].nome)||id}));
          carteiraAtual = (d.carteiraAtual && carteiras.some(c=>c.id===d.carteiraAtual))
            ? d.carteiraAtual : carteiras[0].id;
          const cAtual = _dadosCarteiras[carteiraAtual] || {};
          ativos = cAtual.ativos || [];
          metas  = cAtual.metas  || JSON.parse(JSON.stringify(DEFAULT_METAS));
        } else if(d.ativos){
          // Formato bem antigo (uma única carteira salva direto na raiz do documento) — migra
          _criarCarteiraPadraoVazia();
          ativos = d.ativos;
          if(d.metas) metas = d.metas;
          _dadosCarteiras[carteiraAtual] = { ativos, metas, nome:'Carteira Principal' };
          await syncFirestore(); // grava já no formato novo multi-carteira
          toast('Formato antigo detectado na nuvem — carteira migrada. ☁️');
        } else {
          // documento existe mas está vazio
          _criarCarteiraPadraoVazia();
        }
      } else {
        // primeiro login do usuário: nunca salvou nada na nuvem ainda
        _criarCarteiraPadraoVazia();
        await syncFirestore();
        toast('Carteira criada na nuvem! ☁️');
      }
    }catch(e){
      console.warn('onAuthStateChanged:', e);
      _criarCarteiraPadraoVazia();
    }
    window.mvLoggedIn = true;
  } else {
    _limparDadosCarteira();
    window.mvLoggedIn = false;
  }
  window.mvAuthResolved = true;
  renderAuthUI(user);
  if(typeof _mvApplyGate === 'function') _mvApplyGate();
});
