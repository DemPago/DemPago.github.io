import { initializeApp }    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot,
         serverTimestamp, deleteField, arrayUnion }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp({
  apiKey:            'AIzaSyA7YbK9xW2OiGXZu55mvlTLSw2enQf4Efg',
  authDomain:        'blog-a5907.firebaseapp.com',
  projectId:         'blog-a5907',
  storageBucket:     'blog-a5907.appspot.com',
  messagingSenderId: '612926535',
  appId:             '1:612926535:web:cf5b5e94e70fc7697d3e4c',
});
const db = getFirestore(app);

/* ── Taglie T-shirt ────────────────────────────────────────── */
const SIZES = [
  { val: 'XS',  icon: '👕', label: 'XS',  sub: 'Extra Small', explain: ' — Banale, pochissimo effort.' },
  { val: 'S',   icon: '👕', label: 'S',   sub: 'Small',       explain: ' — Piccolo, effort basso.' },
  { val: 'M',   icon: '👕', label: 'M',   sub: 'Medium',      explain: ' — Media complessità.' },
  { val: 'L',   icon: '👕', label: 'L',   sub: 'Large',       explain: ' — Complessa, qualche dipendenza.' },
  { val: 'XL',  icon: '👕', label: 'XL',  sub: 'Extra Large', explain: ' — Molto complessa, alto rischio.' },
  { val: 'XXL', icon: '👕', label: 'XXL', sub: 'Da splittare',explain: ' — Troppo grande: considera di splitarla.' },
  { val: '?',   icon: '❓', label: '?',   sub: 'Non so',      explain: ' — Informazioni insufficienti.', red: true },
  { val: '☕',  icon: '☕', label: '☕',  sub: 'Pausa',        explain: '',                              red: true },
];

/* Ordine taglia per confronto divergenza (escluso ?, ☕, XXL) */
const SIZE_ORDER = { XS:1, S:2, M:3, L:4, XL:5 };

/* ── T-shirt icon per la card visuale ──────────────────────── */
const CARD_ICONS = { XS:'🩴', S:'👕', M:'👔', L:'🧥', XL:'🪄', XXL:'🐘', '?':'❓', '☕':'☕' };

/* ── Auth ──────────────────────────────────────────────────── */
const PWD_HASH = '2a43da7cc03407a5c5a2458acee91c7c1e0ced9c9e83ed3df31b0fb73f82bcec';
let isUnlocked = sessionStorage.getItem('ts_unlocked') === '1';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function applyUnlockUI() {
  el('tsLockBadge').className = 'ts-lock-badge' + (isUnlocked ? ' unlocked' : '');
  el('tsLockBadge').innerHTML = isUnlocked ? '&#128275; Team sbloccato' : '&#128274; Sessione bloccata';
  el('tsBtnCreateSession').style.display = isUnlocked ? '' : 'none';
  el('tsImportPanel').style.display      = isUnlocked ? '' : 'none';
}
applyUnlockUI();

el('tsBtnUnlock').addEventListener('click', async () => {
  const pwd = el('tsFacilitatorPwd').value;
  if (!pwd) return;
  const hash = await sha256(pwd);
  if (hash === PWD_HASH) {
    isUnlocked = true;
    sessionStorage.setItem('ts_unlocked', '1');
    el('tsFacilitatorPwd').value = '';
    el('tsPwdError').style.display = 'none';
    applyUnlockUI();
  } else {
    el('tsPwdError').style.display = '';
  }
});

/* ── State ─────────────────────────────────────────────────── */
let state = {
  sessionCode:       null,
  isFacilitator:     false,
  myName:            null,
  unsubscribe:       null,
  presenceInterval:  null,
  setupMembers:      [],
  setupCards:        [],
  myVotes:           {},
  selectedFinal:     null,
  lastCardIdx:       -1,
  cachedData:        null,
  sessionColor:      '#3b82f6',
};

/* ── Utils ─────────────────────────────────────────────────── */
function el(id)           { return document.getElementById(id); }
function escHtml(s)       { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function randCode()       { return Math.random().toString(36).slice(2,7).toUpperCase(); }
function sizeInfo(v)      { return SIZES.find(x => x.val === v) || { label: v, explain: '', icon: '👕' }; }

function showScreen(id) {
  document.querySelectorAll('.ts-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ── Presenza ──────────────────────────────────────────────── */
function startPresence(name, code) {
  stopPresence();
  const beat = () => {
    if (!state.sessionCode) return;
    updateDoc(doc(db, 'ts_sessions', code), { ['presence.' + name]: serverTimestamp() }).catch(()=>{});
  };
  beat();
  state.presenceInterval = setInterval(beat, 30_000);
}
function stopPresence() {
  if (state.presenceInterval) { clearInterval(state.presenceInterval); state.presenceInterval = null; }
}
function isOnline(pmap, name) {
  if (!pmap || !pmap[name]) return false;
  const ts = pmap[name];
  const ms = ts?.toDate ? ts.toDate().getTime() : (ts?.seconds ? ts.seconds * 1000 : null);
  return ms && (Date.now() - ms) < 90_000;
}

/* ── Welcome ───────────────────────────────────────────────── */
el('tsBtnCreateSession').addEventListener('click', () => {
  state.isFacilitator = true;
  state.sessionCode   = randCode();
  el('tsSetupCode').textContent = state.sessionCode;
  showScreen('tsScreenSetup');
});

/* ── Setup: partecipanti ───────────────────────────────────── */
el('tsBtnAddMember').addEventListener('click', addMember);
el('tsMemberInput').addEventListener('keydown', e => { if (e.key === 'Enter') addMember(); });

/* ── Color picker ──────────────────────────────────────────── */
document.querySelectorAll('.ts-color-swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ts-color-swatch').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.sessionColor = btn.dataset.color;
  });
});

function addMember() {
  const name = el('tsMemberInput').value.trim();
  if (!name || state.setupMembers.includes(name)) return;
  state.setupMembers.push(name);
  el('tsMemberInput').value = '';
  renderMemberList();
}
function renderMemberList() {
  const list = el('tsMemberList');
  list.innerHTML = '';
  state.setupMembers.forEach(m => {
    const chip = document.createElement('span');
    chip.className = 'ts-member-chip';
    chip.innerHTML = `${escHtml(m)}<button title="Rimuovi">&#10005;</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      state.setupMembers = state.setupMembers.filter(x => x !== m);
      renderMemberList();
    });
    list.appendChild(chip);
  });
}

/* ── Setup: copia codice ───────────────────────────────────── */
el('tsBtnCopyCode').addEventListener('click', () => {
  navigator.clipboard.writeText(state.sessionCode).then(() => {
    el('tsBtnCopyCode').textContent = '✓ Copiato!';
    setTimeout(() => { el('tsBtnCopyCode').innerHTML = '&#128203; Copia codice'; }, 2000);
  });
});

/* ── Setup: card manuali ───────────────────────────────────── */
el('tsBtnAddCard').addEventListener('click', addCard);
el('tsCardTitleInput').addEventListener('keydown', e => { if (e.key === 'Enter') addCard(); });
function addCard() {
  const title = el('tsCardTitleInput').value.trim();
  const desc  = el('tsCardDescInput').value.trim();
  if (!title) return;
  state.setupCards.push({ id: 'c' + Date.now(), title, desc });
  el('tsCardTitleInput').value = '';
  el('tsCardDescInput').value  = '';
  renderSetupCardList();
}
el('tsBtnClearCard').addEventListener('click', () => {
  el('tsCardTitleInput').value = '';
  el('tsCardDescInput').value  = '';
});
function renderSetupCardList() {
  const list = el('tsSetupCardList');
  list.innerHTML = '';
  state.setupCards.forEach((c, i) => {
    const item = document.createElement('div');
    item.className = 'ts-card-item';
    item.innerHTML = `
      <span class="ts-card-item-num">${i+1}</span>
      <span class="ts-card-item-text">${escHtml(c.title)}</span>
      <button title="Rimuovi">&#10005;</button>`;
    item.querySelector('button').addEventListener('click', () => {
      state.setupCards.splice(i, 1);
      renderSetupCardList();
    });
    list.appendChild(item);
  });
}

/* ── Setup: import CSV Jira ────────────────────────────────── */
const dropzone = el('tsCsvDropzone');
dropzone.addEventListener('click',      () => el('tsCsvFileInput').click());
dropzone.addEventListener('dragover',   e  => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave',  ()  => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop',       e  => { e.preventDefault(); dropzone.classList.remove('drag-over'); parseCSV(e.dataTransfer.files[0]); });
el('tsCsvFileInput').addEventListener('change', e => parseCSV(e.target.files[0]));

function parseCSV(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const lines   = e.target.result.split(/\r?\n/).filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g,'').trim().toLowerCase());
      const iSum = headers.findIndex(h => h === 'summary');
      const iKey = headers.findIndex(h => h === 'issue key');
      if (iSum === -1 || iKey === -1) { el('tsCsvError').textContent = 'Colonne Summary e Issue key non trovate.'; el('tsCsvError').style.display = ''; return; }
      el('tsCsvError').style.display = 'none';
      const rows = lines.slice(1).map(l => {
        const cells = l.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || [];
        const clean = cells.map(c => c.replace(/^"|"$/g,'').trim());
        return { key: clean[iKey] || '', title: clean[iSum] || '' };
      }).filter(r => r.title);
      renderCsvPreview(rows);
    } catch(err) { el('tsCsvError').textContent = 'Errore nel parsing CSV.'; el('tsCsvError').style.display = ''; }
  };
  reader.readAsText(file, 'utf-8');
}

let csvRows = [];
function renderCsvPreview(rows) {
  csvRows = rows;
  const list = el('tsCsvList');
  list.innerHTML = '';
  rows.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'ts-csv-row';
    div.innerHTML = `
      <input type="checkbox" id="tscsv${i}" checked>
      <div class="ts-csv-row-body">
        ${r.key ? `<div class="ts-csv-row-key">${escHtml(r.key)}</div>` : ''}
        <div class="ts-csv-row-title">${escHtml(r.title)}</div>
      </div>`;
    list.appendChild(div);
  });
  el('tsCsvPreviewCount').textContent = rows.length + ' issue trovate';
  el('tsCsvPreview').style.display = '';
}
el('tsCsvSelectAll').addEventListener('click', () => { csvRows.forEach((_,i) => { const cb = el('tscsv'+i); if(cb) cb.checked = true; }); });
el('tsCsvDeselectAll').addEventListener('click', () => { csvRows.forEach((_,i) => { const cb = el('tscsv'+i); if(cb) cb.checked = false; }); });
el('tsCsvImportBtn').addEventListener('click', () => {
  const sel = csvRows.filter((_,i) => el('tscsv'+i)?.checked);
  if (!sel.length) return;
  sel.forEach(r => state.setupCards.push({ id: 'c' + Date.now() + Math.random(), title: (r.key ? '[' + r.key + '] ' : '') + r.title, desc: '' }));
  renderSetupCardList();
  el('tsCsvPreview').style.display = 'none';
});

/* ── Setup: avvia sessione ─────────────────────────────────── */
el('tsBtnAbortSetup').addEventListener('click', () => {
  state.sessionCode = null; state.isFacilitator = false;
  state.setupCards = []; state.setupMembers = [];
  showScreen('tsScreenWelcome');
});

el('tsBtnStartSession').addEventListener('click', async () => {
  if (state.setupCards.length === 0) {
    const e = el('tsSetupError');
    e.className = 'ts-alert ts-alert-error';
    e.textContent = 'Aggiungi almeno una card prima di avviare.';
    e.style.display = 'block';
    return;
  }
  el('tsSetupError').style.display = 'none';
  el('tsBtnStartSession').disabled = true;
  el('tsBtnStartSession').textContent = 'Avvio…';

  const sessionData = {
    createdAt:   serverTimestamp(),
    members:     state.setupMembers,
    cards:       state.setupCards,
    currentCard: 0,
    status:      'voting',
    votes:       {},
    finalVotes:  {},
    color:       state.sessionColor,
  };

  try {
    await setDoc(doc(db, 'ts_sessions', state.sessionCode), sessionData);
    state.myName = 'Facilitatore';
    startListening();
  } catch(e) {
    el('tsSetupError').className = 'ts-alert ts-alert-error';
    el('tsSetupError').textContent = 'Errore nel creare la sessione. Riprova.';
    el('tsSetupError').style.display = 'block';
  } finally {
    el('tsBtnStartSession').disabled = false;
    el('tsBtnStartSession').textContent = '▶️ Avvia sessione';
  }
});

/* ── Join sessione ─────────────────────────────────────────── */
el('tsBtnJoinSession').addEventListener('click', joinSession);
el('tsJoinCodeInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinSession(); });

async function joinSession() {
  const code = el('tsJoinCodeInput').value.trim().toUpperCase();
  const name = el('tsJoinNameInput').value.trim();
  el('tsJoinError').style.display = 'none';
  if (!code || !name) { showJoinError('Inserisci codice e nome.'); return; }
  el('tsBtnJoinSession').disabled = true;
  el('tsBtnJoinSession').textContent = 'Connessione…';
  try {
    const snap = await getDoc(doc(db, 'ts_sessions', code));
    if (!snap.exists()) { showJoinError('Sessione non trovata. Controlla il codice.'); return; }
    const data = snap.data();
    if (data.status === 'finished') { showJoinError('Questa sessione è già terminata.'); return; }
    if (data.members && data.members.length > 0) {
      const norm = data.members.map(m => m.trim().toLowerCase());
      if (!norm.includes(name.trim().toLowerCase())) {
        showJoinError('Non sei nella lista dei partecipanti. Chiedi al facilitatore di aggiungerti.');
        return;
      }
    }
    state.sessionCode   = code;
    state.isFacilitator = false;
    state.myName        = name;
    startListening();
  } catch(e) {
    showJoinError('Errore di connessione. Riprova.');
  } finally {
    el('tsBtnJoinSession').disabled = false;
    el('tsBtnJoinSession').textContent = 'Unisciti alla sessione';
  }
}
function showJoinError(msg) {
  const d = el('tsJoinError');
  d.className = 'ts-alert ts-alert-error';
  d.textContent = msg;
  d.style.display = 'block';
}

/* ── Firestore listener ────────────────────────────────────── */
function startListening() {
  if (state.unsubscribe) state.unsubscribe();
  state.unsubscribe = onSnapshot(
    doc(db, 'ts_sessions', state.sessionCode),
    snap => { if (snap.exists()) renderSession(snap.data()); },
    err  => console.error('Firestore error', err)
  );
  startPresence(state.myName, state.sessionCode);
}

/* ── Render sessione ───────────────────────────────────────── */
function renderSession(data) {
  state.cachedData = data;
  const { status, cards, currentCard, votes, finalVotes, members, presence, color } = data;
  const isFac   = state.isFacilitator;
  const cardIdx = currentCard ?? 0;
  const card    = cards[cardIdx];
  const sessionColor = color || '#3b82f6';

  if (!card) {
    el('tsWaitingCodeBadge').textContent = state.sessionCode;
    showScreen('tsScreenWaiting');
    return;
  }
  const cardVotes = (votes && votes[card.id]) ? votes[card.id] : {};

  if (status === 'finished') { renderSummary(cards, finalVotes, votes || {}); return; }
  if (status === 'board')    { renderBoard(data, isFac); return; }
  if (status === 'voting')   { renderVotingScreen(card, cardIdx, cards.length, cardVotes, members, isFac, presence || {}, sessionColor); return; }
  if (status === 'revealed') { renderRevealScreen(card, cardIdx, cards.length, cardVotes, members, finalVotes, isFac, presence || {}, sessionColor); return; }
}

/* ── Voting screen ─────────────────────────────────────────── */
function renderVotingScreen(card, idx, total, cardVotes, members, isFac, presence, sessionColor) {
  el('tsVotingRoleLabel').textContent    = isFac ? '👑 Facilitatore' : '👤 ' + state.myName;
  el('tsVotingCodeBadge').textContent    = state.sessionCode;
  el('tsVotingCardCounter').textContent  = (idx+1) + ' / ' + total;

  // Flip
  if (state.lastCardIdx !== idx) {
    const c = el('tsVotingCard');
    c.classList.remove('flip-in');
    void c.offsetWidth;
    c.classList.add('flip-in');
    state.lastCardIdx = idx;
  }

  const keyMatch = card.title.match(/^\[([A-Z]+-\d+)\]/);
  el('tsvIssueKey').textContent = keyMatch ? keyMatch[1] : '';
  el('tsvTitle').textContent    = card.title.replace(/^\[[A-Z]+-\d+\]\s*/, '');
  el('tsvDesc').textContent     = card.desc || '';
  el('tsvDesc').style.display   = card.desc ? '' : 'none';
  el('tsvIcon').textContent     = '👕';
  el('tsvIcon').style.background    = sessionColor ? sessionColor + '33' : '';
  el('tsvIcon').style.borderRadius  = sessionColor ? '50%' : '';
  el('tsvIcon').style.padding       = sessionColor ? '0.4rem' : '';
  el('tsvIcon').style.boxShadow     = sessionColor ? `0 0 0 3px ${sessionColor}66` : '';
  el('tsvIcon').style.filter        = '';

  // Progress
  const memberList  = (members && members.length > 0) ? members : Object.keys(cardVotes);
  const votedCount  = memberList.filter(m => cardVotes[m]).length;
  el('tsvProgressCount').textContent = votedCount + ' / ' + memberList.length;
  el('tsvProgressBar').style.width   = (memberList.length > 0 ? Math.round(votedCount / memberList.length * 100) : 0) + '%';

  const vList = el('tsvVotersList');
  vList.innerHTML = '';
  memberList.forEach(m => {
    const chip = document.createElement('span');
    chip.className = 'ts-voter-chip' + (cardVotes[m] ? ' voted' : '');
    const dot = document.createElement('span');
    dot.className = 'ts-presence-dot ' + (isOnline(presence, m) ? 'online' : 'offline');
    chip.appendChild(dot);
    chip.appendChild(document.createTextNode(m));
    vList.appendChild(chip);
  });

  // Add member bar
  el('tsVotingAddMemberBar').style.display = isFac ? '' : 'none';

  // Bottoni voto
  if (!isFac) {
    el('tsVotingSection').style.display = '';
    const myVote = cardVotes[state.myName] || state.myVotes[card.id] || null;
    const vCards = el('tsVoteCards');
    vCards.innerHTML = '';
    SIZES.forEach(sz => {
      vCards.appendChild(makeVoteBtn(sz, myVote === sz.val, () => castVote(card.id, sz.val), sessionColor));
    });
    const box = el('tsVoteExplainBox');
    if (myVote) {
      const info = sizeInfo(myVote);
      box.innerHTML = `<div class="ts-vote-explain"><strong>${escHtml(myVote)}</strong>${info.explain}</div>`;
    } else {
      box.innerHTML = '';
    }
    el('tsRevealHint').style.display = myVote ? '' : 'none';
  } else {
    el('tsVotingSection').style.display = 'none';
    el('tsRevealHint').style.display    = 'none';
  }

  el('tsBtnReveal').style.display = isFac ? '' : 'none';
  showScreen('tsScreenVoting');
}

/* ── Crea bottone voto ─────────────────────────────────────── */
function makeVoteBtn(sz, isSelected, onClick, color) {
  const btn = document.createElement('button');
  btn.className = 'ts-vote-btn' + (sz.red ? ' red' : '') + (isSelected ? ' selected' : '');
  btn.dataset.val = sz.val;
  btn.title       = sz.sub;
  btn.innerHTML   = `<span class="ts-vote-icon">${sz.icon}</span><span class="ts-vote-label">${escHtml(sz.val)}</span><span class="ts-vote-sub">${escHtml(sz.sub)}</span>`;
  if (color && !sz.red) btn.style.borderTopColor = color;
  btn.addEventListener('click', onClick);
  return btn;
}

/* ── Cast voto ─────────────────────────────────────────────── */
let voteTimeout = null;
async function castVote(cardId, val) {
  state.myVotes[cardId] = val;
  if (voteTimeout) clearTimeout(voteTimeout);
  voteTimeout = setTimeout(async () => {
    try {
      await updateDoc(doc(db, 'ts_sessions', state.sessionCode), {
        ['votes.' + cardId + '.' + state.myName]: val
      });
    } catch(e) { console.error('castVote error', e); }
  }, 300);
}

/* ── Rivela ────────────────────────────────────────────────── */
el('tsBtnReveal').addEventListener('click', async () => {
  try {
    await updateDoc(doc(db, 'ts_sessions', state.sessionCode), { status: 'revealed' });
  } catch(e) { console.error('reveal error', e); }
});

/* ── Reveal screen ─────────────────────────────────────────── */
function renderRevealScreen(card, idx, total, cardVotes, members, finalVotes, isFac, presence, sessionColor) {
  el('tsRevealRoleLabel').textContent    = isFac ? '👑 Facilitatore' : '👤 ' + state.myName;
  el('tsRevealCodeBadge').textContent    = state.sessionCode;
  el('tsRevealCardCounter').textContent  = (idx+1) + ' / ' + total;
  el('tsRevealCardTitle').textContent    = card.title;

  // Calcola spread (esclude ?, ☕, XXL)
  const allVoted    = Object.entries(cardVotes);
  const EXCL        = new Set(['?', '☕', 'XXL']);
  const validVotes  = allVoted.filter(([,v]) => !EXCL.has(v) && SIZE_ORDER[v]);
  const allQuestion = allVoted.length > 0 && allVoted.every(([,v]) => v === '?');
  const allXXL      = allVoted.length > 0 && allVoted.every(([,v]) => v === 'XXL');
  const hasXXL      = !allXXL && allVoted.some(([,v]) => v === 'XXL');
  const orders      = validVotes.map(([,v]) => SIZE_ORDER[v]);
  const maxOrd      = orders.length ? Math.max(...orders) : null;
  const minOrd      = orders.length ? Math.min(...orders) : null;
  const maxVal      = maxOrd ? Object.keys(SIZE_ORDER).find(k => SIZE_ORDER[k] === maxOrd) : null;
  const minVal      = minOrd ? Object.keys(SIZE_ORDER).find(k => SIZE_ORDER[k] === minOrd) : null;
  const hasDivergence = !allQuestion && !allXXL && orders.length >= 2 && (maxOrd - minOrd) >= 2;

  // Grid
  const grid = el('tsRevealGrid');
  grid.innerHTML = '';
  const allNames = (members && members.length > 0) ? members : Object.keys(cardVotes);
  allNames.forEach(name => {
    const v   = cardVotes[name];
    const ord = SIZE_ORDER[v];
    const chip = document.createElement('div');
    chip.className = 'ts-reveal-chip';
    if (ord && ord === maxOrd && hasDivergence) chip.classList.add('high');
    if (ord && ord === minOrd && hasDivergence) chip.classList.add('low');
    const dot = `<span class="ts-presence-dot ${isOnline(presence, name) ? 'online' : 'offline'}" style="display:inline-block;vertical-align:middle;margin-right:3px;"></span>`;
    chip.innerHTML = `
      <span class="ts-reveal-name">${dot}${escHtml(name)}</span>
      <span class="ts-reveal-value${v === '?' || v === '☕' ? ' red' : ''}">${v ? escHtml(v) : '—'}</span>`;
    grid.appendChild(chip);
  });

  // Divergenza
  const divBox = el('tsDivergenceBox');
  if (allQuestion) {
    divBox.style.display = '';
    divBox.innerHTML = `<div class="ts-divergence">
      <strong>❓ Nessuno ha una stima chiara</strong>
      <ul>
        <li><strong>Rimetti nel backlog</strong> — affina i criteri di accettazione</li>
        <li><strong>Splitta la storia</strong> — troppo grande o ambigua</li>
        <li><strong>Organizza una call ad hoc</strong> — 15 min per chiarire i requisiti</li>
      </ul></div>`;
  } else if (allXXL) {
    divBox.style.display = '';
    divBox.innerHTML = `<div class="ts-divergence">
      <strong>🔴 Storia troppo grande</strong>
      <ul>
        <li><strong>Splitta la storia</strong> — dividila in sotto-task stimabili</li>
        <li><strong>Organizza una sessione di refinement</strong></li>
        <li><strong>Rimetti nel backlog</strong> — finché non è splittabile</li>
      </ul></div>`;
  } else if (hasDivergence) {
    const sorted = [...validVotes].sort(([,a],[,b]) => SIZE_ORDER[a] - SIZE_ORDER[b]);
    const midIdx = Math.floor(sorted.length / 2);
    const medOrd = sorted.length % 2 !== 0
      ? SIZE_ORDER[sorted[midIdx][1]]
      : (SIZE_ORDER[sorted[midIdx-1][1]] + SIZE_ORDER[sorted[midIdx][1]]) / 2;
    const lowG  = sorted.filter(([,v]) => SIZE_ORDER[v] <= medOrd).map(([n,v]) => `<strong>${escHtml(n)}</strong> (${v})`).join(', ');
    const highG = sorted.filter(([,v]) => SIZE_ORDER[v] >  medOrd).map(([n,v]) => `<strong>${escHtml(n)}</strong> (${v})`).join(', ');
    const xxlNote = hasXXL
      ? `<p style="margin:0.4rem 0 0;font-size:0.8rem;opacity:0.8;">🔴 Chi ha votato XXL spiega perché, poi si rivota.</p>`
      : '';
    divBox.style.display = '';
    divBox.innerHTML = `<div class="ts-divergence">
      <strong>⚠️ Divergenza rilevata — ${minVal} vs ${maxVal}</strong>
      <p style="margin:0.5rem 0 0;">💬 ${lowG} — effort basso.<br>💬 ${highG} — effort alto.</p>
      ${xxlNote}
      <p style="margin:0.4rem 0 0;font-size:0.8rem;opacity:0.8;">Dopo la discussione il facilitatore può azzerare i voti e far rivotare.</p>
    </div>`;
  } else {
    divBox.style.display = 'none';
  }

  // Voto finale (solo facilitatore, escludi ?, ☕, XXL)
  const finalPanel = el('tsFinalVotePanel');
  const revealActs = el('tsRevealActions');
  const revealWait = el('tsRevealWaiting');
  if (isFac) {
    finalPanel.style.display = '';
    revealActs.style.display = '';
    revealWait.style.display = 'none';
    const fCards   = el('tsFinalVoteCards');
    fCards.innerHTML = '';
    const existing = finalVotes && finalVotes[card.id];
    SIZES.filter(sz => !['?','☕','XXL'].includes(sz.val)).forEach(sz => {
      fCards.appendChild(makeVoteBtn(sz, existing === sz.val, () => selectFinal(card.id, sz.val), sessionColor));
    });
    state.selectedFinal = existing || null;
    el('tsBtnNextCard').disabled = !existing;
    const noteInput = el('tsCardNoteInput');
    const savedNote = (state.cachedData && state.cachedData.cardNotes && state.cachedData.cardNotes[card.id]) || '';
    if (document.activeElement !== noteInput) noteInput.value = savedNote;
    noteInput.dataset.cardId = card.id;
    el('tsCardNoteSaved').style.display = 'none';
    const isLast = (idx + 1) >= total;
    el('tsBtnNextCard').innerHTML = isLast ? '&#128204; Vai ai post-it' : 'Prossima card &#8594;';
    el('tsFinalVoteLabel').textContent = isLast ? '✓ Taglia finale — ultima card' : '✓ Taglia finale';
  } else {
    finalPanel.style.display  = 'none';
    revealActs.style.display  = 'none';
    revealWait.style.display  = '';
  }
  el('tsRevealAddMemberBar').style.display = isFac ? '' : 'none';
  showScreen('tsScreenReveal');
}

/* ── Select final ──────────────────────────────────────────── */
async function selectFinal(cardId, val) {
  state.selectedFinal = val;
  el('tsBtnNextCard').disabled = false;
  try {
    await updateDoc(doc(db, 'ts_sessions', state.sessionCode), { ['finalVotes.' + cardId]: val });
  } catch(e) { console.error('selectFinal error', e); state.selectedFinal = null; el('tsBtnNextCard').disabled = true; }
}

/* ── Rivota ────────────────────────────────────────────────── */
el('tsBtnRevote').addEventListener('click', async () => {
  const data = state.cachedData;
  if (!data) return;
  const cardId = data.cards[data.currentCard].id;
  delete state.myVotes[cardId];
  try {
    await updateDoc(doc(db, 'ts_sessions', state.sessionCode), { ['votes.' + cardId]: deleteField(), status: 'voting' });
  } catch(e) { console.error('revote error', e); }
});

/* ── Boccia ────────────────────────────────────────────────── */
el('tsBtnReject').addEventListener('click', async () => {
  const data = state.cachedData;
  if (!data) return;
  if (!confirm('Bocciare questa issue e segnarla come "da splittare"?')) return;
  const card    = data.cards[data.currentCard];
  const nextIdx = (data.currentCard ?? 0) + 1;
  try {
    const update = { ['finalVotes.' + card.id]: 'split' };
    if (nextIdx >= data.cards.length) { update.status = 'finished'; }
    else { update.currentCard = nextIdx; update.status = 'voting'; state.selectedFinal = null; }
    await updateDoc(doc(db, 'ts_sessions', state.sessionCode), update);
  } catch(e) { console.error('reject error', e); }
});

/* ── Next card ─────────────────────────────────────────────── */
el('tsBtnNextCard').addEventListener('click', async () => {
  if (!state.selectedFinal) return;
  const data = state.cachedData;
  if (!data) return;
  try {
    const nextIdx = (data.currentCard ?? 0) + 1;
    if (nextIdx >= data.cards.length) {
      await updateDoc(doc(db, 'ts_sessions', state.sessionCode), { status: 'board' });
    } else {
      await updateDoc(doc(db, 'ts_sessions', state.sessionCode), { currentCard: nextIdx, status: 'voting' });
      state.selectedFinal = null;
    }
  } catch(e) { console.error('nextCard error', e); }
});

/* ── Nota sulla issue (facilitatore, condivisa) ────────────── */
let noteDebounceTimer = null;
el('tsCardNoteInput').addEventListener('input', () => {
  const input  = el('tsCardNoteInput');
  const cardId = input.dataset.cardId;
  if (!cardId) return;
  const val = input.value;
  el('tsCardNoteSaved').style.display = 'none';
  clearTimeout(noteDebounceTimer);
  noteDebounceTimer = setTimeout(async () => {
    try {
      await updateDoc(doc(db, 'ts_sessions', state.sessionCode),
        { ['cardNotes.' + cardId]: val.trim() ? val : deleteField() });
      const ok = el('tsCardNoteSaved');
      ok.style.display = '';
      setTimeout(() => { ok.style.display = 'none'; }, 1800);
    } catch(e) { console.error('cardNote error', e); }
  }, 500);
});

/* ── Board (lavagna post-it) ───────────────────────────────── */
const POSTIT_COLORS = ['#ffe066', '#ffadad', '#a0e7a0', '#a0c4ff', '#ffd6a5', '#e0c3fc'];
let postitColor = POSTIT_COLORS[0];

function renderPostitColors() {
  const wrap = el('tsPostitColors');
  if (wrap.childElementCount) return;
  POSTIT_COLORS.forEach(c => {
    const sw = document.createElement('span');
    sw.className = 'ts-postit-swatch' + (c === postitColor ? ' selected' : '');
    sw.style.background = c;
    sw.addEventListener('click', () => {
      postitColor = c;
      wrap.querySelectorAll('.ts-postit-swatch').forEach(s => s.classList.toggle('selected', s === sw));
    });
    wrap.appendChild(sw);
  });
}

function renderPostit(p, container, canDelete) {
  const d = document.createElement('div');
  d.className = 'ts-postit';
  d.style.background = p.color || '#ffe066';
  const delBtn = canDelete ? `<button class="ts-postit-del" data-id="${p.id}" title="Elimina">&times;</button>` : '';
  d.innerHTML = `${delBtn}
    <div class="ts-postit-text">${escHtml(p.text)}</div>
    <div class="ts-postit-author">— ${escHtml(p.author || '?')}</div>`;
  container.appendChild(d);
}

function renderBoard(data, isFac) {
  renderPostitColors();
  const postits = Array.isArray(data.postits) ? data.postits : [];
  const board = el('tsPostitBoard');
  board.innerHTML = '';
  postits.forEach(p => renderPostit(p, board, p.author === state.myName || isFac));
  el('tsPostitEmpty').style.display = postits.length ? 'none' : '';
  el('tsBoardActions').style.display = isFac ? '' : 'none';
  el('tsBoardWaiting').style.display = isFac ? 'none' : '';
  board.querySelectorAll('.ts-postit-del').forEach(b => {
    b.addEventListener('click', () => removePostit(b.dataset.id));
  });
  showScreen('tsScreenBoard');
}

async function addPostit() {
  const input = el('tsPostitInput');
  const text  = input.value.trim();
  if (!text) return;
  const postit = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text, author: state.myName || '?', color: postitColor, ts: Date.now()
  };
  input.value = '';
  try {
    await updateDoc(doc(db, 'ts_sessions', state.sessionCode), { postits: arrayUnion(postit) });
  } catch(e) { console.error('addPostit error', e); input.value = text; }
}

async function removePostit(id) {
  const data = state.cachedData;
  if (!data || !Array.isArray(data.postits)) return;
  const next = data.postits.filter(p => p.id !== id);
  try {
    await updateDoc(doc(db, 'ts_sessions', state.sessionCode), { postits: next });
  } catch(e) { console.error('removePostit error', e); }
}

el('tsBtnAddPostit').addEventListener('click', addPostit);
el('tsPostitInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addPostit(); }
});
el('tsBtnCloseBoard').addEventListener('click', async () => {
  el('tsBtnCloseBoard').disabled = true;
  try {
    await updateDoc(doc(db, 'ts_sessions', state.sessionCode), { status: 'finished' });
  } catch(e) { el('tsBtnCloseBoard').disabled = false; }
});

/* ── Add member live ───────────────────────────────────────── */
async function addMemberLive(inputId, okId) {
  const input = el(inputId);
  const name  = input.value.trim();
  if (!name) return;
  try {
    await updateDoc(doc(db, 'ts_sessions', state.sessionCode), { members: arrayUnion(name) });
    input.value = '';
    const ok = el(okId);
    ok.textContent = '✓ ' + name + ' aggiunto';
    ok.style.color = '';
    ok.style.display = '';
    setTimeout(() => { ok.style.display = 'none'; }, 2500);
  } catch(e) {
    const ok = el(okId);
    ok.textContent = '✗ Errore: ' + (e.message || 'scrittura fallita');
    ok.style.color = '#e05c5c';
    ok.style.display = '';
    setTimeout(() => { ok.style.display = 'none'; ok.style.color = ''; }, 4000);
  }
}
el('tsBtnVotingAddMember').addEventListener('click', () => addMemberLive('tsVotingAddMemberInput', 'tsVotingAddMemberOk'));
el('tsVotingAddMemberInput').addEventListener('keydown', e => { if (e.key === 'Enter') addMemberLive('tsVotingAddMemberInput', 'tsVotingAddMemberOk'); });
el('tsBtnRevealAddMember').addEventListener('click', () => addMemberLive('tsRevealAddMemberInput', 'tsRevealAddMemberOk'));
el('tsRevealAddMemberInput').addEventListener('keydown', e => { if (e.key === 'Enter') addMemberLive('tsRevealAddMemberInput', 'tsRevealAddMemberOk'); });

/* ── Summary ───────────────────────────────────────────────── */
function renderSummary(cards, finalVotes, allVotes) {
  const tbody = el('tsSummaryBody');
  tbody.innerHTML = '';
  const cardNotes = (state.cachedData && state.cachedData.cardNotes) || {};
  let count = 0;
  cards.forEach(card => {
    const v       = finalVotes && finalVotes[card.id];
    const isSplit = v === 'split';
    if (v && !isSplit) count++;
    const cardVotes  = (allVotes && allVotes[card.id]) || {};
    const voteDetail = Object.entries(cardVotes).map(([n,val]) => `${escHtml(n)}: ${escHtml(val)}`).join(', ');
    const ptsCell  = isSplit ? '🚫' : (v ? escHtml(v) : '—');
    let noteCell = isSplit
      ? `<span style="color:#e05c5c;font-weight:700;">Da splittare</span>${voteDetail ? ` · <span style="opacity:0.7">${voteDetail}</span>` : ''}`
      : v ? `${sizeInfo(v).sub}${voteDetail ? ` · <span style="opacity:0.7">${voteDetail}</span>` : ''}`
          : `<em>non stimata</em>${voteDetail ? ` · <span style="opacity:0.7">${voteDetail}</span>` : ''}`;
    const facNote = cardNotes[card.id];
    if (facNote) noteCell += `<div style="margin-top:0.3rem;color:var(--text);">&#128221; ${escHtml(facNote)}</div>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escHtml(card.title)}</td><td>${ptsCell}</td><td style="font-size:0.78rem;color:var(--text-muted)">${noteCell}</td>`;
    tbody.appendChild(tr);
  });
  el('tsSummaryTotal').textContent = count + ' stimate';

  const postits = Array.isArray(state.cachedData && state.cachedData.postits) ? state.cachedData.postits : [];
  const sp = el('tsSummaryPostits');
  sp.innerHTML = '';
  postits.forEach(p => renderPostit(p, sp, false));
  el('tsSummaryBoardPanel').style.display = postits.length ? '' : 'none';

  state.summaryData = { cards, finalVotes: finalVotes || {}, cardNotes, postits };
  showScreen('tsScreenSummary');
}

el('tsBtnCopySummary').addEventListener('click', () => {
  const d = state.summaryData || { cards: [], finalVotes: {}, cardNotes: {}, postits: [] };
  let text = '👕 T-Shirt Sizing — Riepilogo\n\n';
  d.cards.forEach((card, i) => {
    const fv = d.finalVotes[card.id];
    const size = fv === 'split' ? '🚫 da splittare' : (fv != null ? fv : 'non stimata');
    text += (i+1) + '. ' + (card.title || '') + '  →  ' + size + '\n';
    const note = d.cardNotes && d.cardNotes[card.id];
    if (note) text += '   📝 ' + note + '\n';
  });
  const postits = d.postits || [];
  if (postits.length) {
    text += '\n📌 Lavagna del team\n';
    postits.forEach(p => { text += '• ' + p.text + ' (— ' + (p.author || '?') + ')\n'; });
  }
  navigator.clipboard.writeText(text).then(() => {
    el('tsBtnCopySummary').textContent = '✓ Copiato!';
    setTimeout(() => { el('tsBtnCopySummary').innerHTML = '&#128203; Copia riepilogo'; }, 2000);
  }).catch(() => alert(text));
});

el('tsBtnNewSession').addEventListener('click', () => {
  if (state.unsubscribe) { state.unsubscribe(); state.unsubscribe = null; }
  stopPresence();
  state = { sessionCode:null, isFacilitator:false, myName:null, unsubscribe:null, presenceInterval:null, setupMembers:[], setupCards:[], myVotes:{}, selectedFinal:null, lastCardIdx:-1, cachedData:null, sessionColor:'#3b82f6', summaryData:null };
  // Riporta picker al default blu
  document.querySelectorAll('.ts-color-swatch').forEach(b => b.classList.toggle('selected', b.dataset.color === '#3b82f6'));
  showScreen('tsScreenWelcome');
});
