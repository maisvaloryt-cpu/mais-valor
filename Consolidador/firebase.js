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

/* ---- salva ativos + metas no Firestore ---- */
async function syncFirestore(){
  const user = _auth.currentUser;
  if(!user) return;
  try{
    await _db.collection('carteiras').doc(user.uid).set({ativos, metas}, {merge: true});
  }catch(e){ console.warn('syncFirestore:', e); }
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

/* ---- observador de autenticação ---- */
_auth.onAuthStateChanged(async user => {
  if(user){
    try{
      const doc = await _db.collection('carteiras').doc(user.uid).get();
      if(doc.exists){
        // carrega dados do Firestore (nuvem tem prioridade)
        const d = doc.data();
        if(d.ativos){ ativos = d.ativos; localStorage.setItem(STORAGE_ATIVOS, JSON.stringify(ativos)); }
        if(d.metas){  metas  = d.metas;  localStorage.setItem(STORAGE_METAS,  JSON.stringify(metas));  }
      } else {
        // primeiro login: sobe o que está no localStorage para a nuvem
        await _db.collection('carteiras').doc(user.uid).set({ativos, metas});
        toast('Carteira sincronizada com a nuvem! ☁️');
      }
    }catch(e){ console.warn('onAuthStateChanged:', e); }
    if(typeof renderAll === 'function') renderAll();
  }
  renderAuthUI(user);
});
