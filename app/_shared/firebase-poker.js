import { initializeApp, getApps, getApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, query, where, getDocs, Timestamp, deleteDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const FB_CONFIG = {
  apiKey:     'AIzaSyA7YbK9xW2OiGXZu55mvlTLSw2enQf4Efg',
  authDomain: 'blog-a5907.firebaseapp.com',
  projectId:  'blog-a5907',
};

export const FACILITATOR_EMAILS = [
  'demetrio.ferraro@pagopa.it',
  'lorenzo.franceschini@pagopa.it',
];

export function isFacilitatorEmail(email) {
  return FACILITATOR_EMAILS.includes((email || '').toLowerCase());
}

export function initFirebase() {
  const app       = getApps().length ? getApp() : initializeApp(FB_CONFIG);
  const db        = getFirestore(app);
  const auth      = getAuth(app);
  const gProvider = new GoogleAuthProvider();
  return { app, db, auth, gProvider };
}

export async function cleanOldSessions(db, collectionName) {
  try {
    const cutoff = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const snap = await getDocs(query(collection(db, collectionName), where('createdAt', '<', cutoff)));
    snap.forEach(d => deleteDoc(d.ref));
  } catch(e) {}
}

export async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Configura l'intera UI di autenticazione Google per un tool poker.
 *
 * ids: {
 *   authLoggedOut, authLoggedIn, userAvatar, userName,
 *   joinNameRow, joinNameDisplay, facilitatorChoice, passwordPanel,
 *   btnGoogleLogin, btnGoogleLogout, btnBecomeFacilitator, btnJoinAsParticipant, joinCodeInput
 * }
 */
export function setupAuthUI({
  auth, gProvider,
  ids, storageKey, urlSessionCode,
  setCurrentUser, getIsUnlocked, setIsUnlocked, applyUnlockUI,
  getState, onFacilitatorCreate, onAutoJoin,
  onLogout = null,
}) {
  const el = id => document.getElementById(id);

  onAuthStateChanged(auth, user => {
    setCurrentUser(user);
    if (user) {
      el(ids.authLoggedOut).style.display = 'none';
      el(ids.authLoggedIn).style.display  = 'flex';
      el(ids.userAvatar).src = user.photoURL || '';
      el(ids.userAvatar).style.display = user.photoURL ? '' : 'none';
      el(ids.userName).textContent = user.displayName || user.email;
      const nameRow     = el(ids.joinNameRow);
      const nameDisplay = el(ids.joinNameDisplay);
      if (nameRow)     nameRow.style.display = 'none';
      if (nameDisplay) {
        nameDisplay.textContent = 'Verrai identificato come: ' + (user.displayName || user.email.split('@')[0]);
        nameDisplay.style.display = '';
      }
      if (isFacilitatorEmail(user.email)) {
        el(ids.facilitatorChoice).style.display = 'flex';
        el(ids.passwordPanel).style.display     = 'none';
      } else {
        el(ids.facilitatorChoice).style.display = 'none';
        el(ids.passwordPanel).style.display     = '';
      }
      if (urlSessionCode && !getState().sessionCode) onAutoJoin();
    } else {
      el(ids.authLoggedOut).style.display = 'flex';
      el(ids.authLoggedIn).style.display  = 'none';
      el(ids.facilitatorChoice).style.display = 'none';
      el(ids.passwordPanel).style.display     = '';
      const nameRow     = el(ids.joinNameRow);
      const nameDisplay = el(ids.joinNameDisplay);
      if (nameRow)     nameRow.style.display = '';
      if (nameDisplay) nameDisplay.style.display = 'none';
      if (getIsUnlocked()) {
        setIsUnlocked(false);
        sessionStorage.removeItem(storageKey);
        applyUnlockUI();
      }
    }
  });

  el(ids.btnGoogleLogin).addEventListener('click', () =>
    signInWithPopup(auth, gProvider).catch(e => {
      if (e.code !== 'auth/popup-closed-by-user') console.error(e);
    })
  );
  el(ids.btnGoogleLogout).addEventListener('click', async () => {
    await signOut(auth);
    if (onLogout) onLogout();
  });
  el(ids.btnBecomeFacilitator).addEventListener('click', () => {
    setIsUnlocked(true);
    sessionStorage.setItem(storageKey, '1');
    applyUnlockUI();
    onFacilitatorCreate();
  });
  el(ids.btnJoinAsParticipant).addEventListener('click', () => el(ids.joinCodeInput).focus());
}
