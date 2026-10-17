import { initializeApp, getApps, getApp }
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp, deleteField, arrayUnion }
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ── Firebase ────────────────────────────────────────────── */
const FB_CONFIG = {
  apiKey:     "AIzaSyA7YbK9xW2OiGXZu55mvlTLSw2enQf4Efg",
  authDomain: "blog-a5907.firebaseapp.com",
  projectId:  "blog-a5907",
};
const app = getApps().length ? getApp() : initializeApp(FB_CONFIG);
const db  = getFirestore(app);

/* ── Voti config ─────────────────────────────────────────── */
const VOTES = [
  { val:'1',  suit:'♠', red:false, label:'1 — Triviale',            explain:'Compito banale, già fatto decine di volte. Nessun rischio. Si chiude in meno di un\'ora.' },
  { val:'2',  suit:'♥', red:true,  label:'2 — Semplice',            explain:'Piccola modifica con logica chiara. Qualche dettaglio da verificare, nessuna sorpresa attesa.' },
  { val:'3',  suit:'♦', red:true,  label:'3 — Piccolo-medio',       explain:'Richiede un po\' di analisi o tocca più file. Effort contenuto ma non trascurabile.' },
  { val:'5',  suit:'♣', red:false, label:'5 — Medio',               explain:'Task significativo con qualche incognita. Può toccare più layer o richiedere un piccolo design.' },
  { val:'8',  suit:'♠', red:false, label:'8 — Complesso',           explain:'Alta complessità tecnica o molte dipendenze. Valuta di spezzarla o approfondire prima.' },
  { val:'13', suit:'♥', red:true,  label:'13 — Molto complesso',    explain:'Effort elevato, incertezze significative. Considera di suddividerla in sotto-task.' },
  { val:'21', suit:'♦', red:true,  label:'21 — Epico',              explain:'Troppo grande per uno sprint. Va quasi certamente spezzata prima di procedere.' },
  { val:'?',  suit:'♣', red:false, label:'? — Informazioni mancanti', explain:'Non abbiamo abbastanza dettagli. Serve analisi o conversazione col product owner.' },
  { val:'☕', suit:'♠', red:false, label:'☕ — Da spezzare',         explain:'Card troppo vaga o grande. Il team si ferma, la ridefinisce o la divide.' },
];
const SUITS  = ['♠','♥','♦','♣'];
const COLORS = ['#1a1a1a','#c0392b','#c0392b','#1a1a1a'];

/* ── Stato locale ────────────────────────────────────────── */
let state = {
  sessionCode:       null,
  isFacilitator:     false,
  myName:            null,
  unsubscribe:       null,
  presenceInterval:  null,
  sessionSuit:       '♠', // seme scelto dal facilitatore
  setupMembers:      [],
  setupCards:        [],
  myVotes:           {},   // cardId → val (locale)
  selectedFinal:     null,
  lastCardIdx:       -1,   // per trigger animazione flip solo a cambio card
  cachedData:        null, // ultima snapshot Firestore — evita getDoc extra
};

/* ── Auth ────────────────────────────────────────────────── */
const PWD_HASH = '2a43da7cc03407a5c5a2458acee91c7c1e0ced9c9e83ed3df31b0fb73f82bcec';
let isUnlocked = sessionStorage.getItem('pp_unlocked') === '1';

async function sha256(str) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function applyUnlockUI() {
  el('lockBadge').className    = 'pp-lock-badge' + (isUnlocked ? ' unlocked' : '');
  el('lockBadge').innerHTML    = isUnlocked ? '&#128275; Team sbloccato' : '&#128274; Sessione bloccata';
  el('btnCreateSession').style.display = isUnlocked ? '' : 'none';
  el('importPanel').style.display      = isUnlocked ? '' : 'none';
}

el('btnUnlock').addEventListener('click', async () => {
  const pwd = el('facilitatorPwd').value;
  if (!pwd) return;
  const hash = await sha256(pwd);
  if (hash === PWD_HASH) {
    isUnlocked = true;
    sessionStorage.setItem('pp_unlocked', '1');
    el('facilitatorPwd').value = '';
    el('pwdError').style.display = 'none';
    applyUnlockUI();
  } else {
    el('pwdError').textContent = 'Password errata.';
    el('pwdError').style.display = '';
    el('facilitatorPwd').value = '';
    el('facilitatorPwd').focus();
  }
});
el('facilitatorPwd').addEventListener('keydown', e => { if (e.key === 'Enter') el('btnUnlock').click(); });

// applica stato iniziale
applyUnlockUI();

/* ── Utilità ─────────────────────────────────────────────── */
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:5}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
}
function suitFor(i)  { return SUITS[i % 4]; }
function colorFor(i) { return COLORS[i % 4]; }
function voteInfo(v) { return VOTES.find(x => x.val === v) || {label: v, explain:''}; }

function showScreen(id) {
  document.querySelectorAll('.pp-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function el(id) { return document.getElementById(id); }

/* ── Selettore seme ─────────────────────────────────────── */
document.querySelectorAll('.pp-suit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pp-suit-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.sessionSuit = btn.dataset.suit;
  });
});

/* ── Presenza online ─────────────────────────────────────── */
function startPresence(name, sessionCode) {
  stopPresence();
  const writeHeartbeat = () => {
    if (!state.sessionCode) return;
    updateDoc(doc(db, 'poker_sessions', sessionCode), {
      ['presence.' + name]: serverTimestamp()
    }).catch(() => {});
  };
  writeHeartbeat();
  state.presenceInterval = setInterval(writeHeartbeat, 30_000);
}
function stopPresence() {
  if (state.presenceInterval) { clearInterval(state.presenceInterval); state.presenceInterval = null; }
}

/* ── Utility: utente online? (heartbeat < 5 min fa) ─────── */
function isOnline(presenceMap, name) {
  if (!presenceMap || !presenceMap[name]) return false;
  const ts = presenceMap[name];
  const ms = ts?.toDate ? ts.toDate().getTime() : (ts?.seconds ? ts.seconds * 1000 : null);
  if (!ms) return false;
  return (Date.now() - ms) < 90_000; // 90 secondi
}

/* ══════════════════════════════════════════════════════════ */
/* SCREEN: Welcome                                           */
/* ══════════════════════════════════════════════════════════ */
el('btnCreateSession').addEventListener('click', () => {
  state.isFacilitator = true;
  state.sessionCode   = genCode();
  state.setupMembers  = [];
  state.setupCards    = [];
  el('setupCodeBadge').textContent = state.sessionCode;
  renderSetupMembers();
  renderSetupCards();
  showScreen('screenSetup');
});

el('btnJoinSession').addEventListener('click', joinSession);
el('joinCodeInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinSession(); });

async function joinSession() {
  const code = el('joinCodeInput').value.trim().toUpperCase();
  const name = el('joinNameInput').value.trim();
  if (!code || code.length < 4) { showJoinError('Inserisci un codice sessione valido.'); return; }
  if (!name) { showJoinError('Inserisci il tuo nome.'); return; }

  el('joinError').style.display = 'none';
  el('btnJoinSession').disabled = true;
  el('btnJoinSession').textContent = 'Connessione…';

  try {
    const snap = await getDoc(doc(db, 'poker_sessions', code));
    if (!snap.exists()) { showJoinError('Sessione non trovata. Controlla il codice.'); return; }
    const data = snap.data();
    // Sessione già terminata
    if (data.status === 'finished') {
      showJoinError('Questa sessione è già terminata. Chiedi al facilitatore di crearne una nuova.');
      return;
    }
    // Verifica che il nome sia nella lista membri (se lista configurata).
    // Match case-insensitive, ma si adotta la grafia ufficiale della lista
    // così "demetrio" e "Demetrio" non diventano due partecipanti distinti.
    let resolvedName = name;
    if (data.members && data.members.length > 0) {
      const target = name.trim().toLowerCase();
      const official = data.members.find(m => m.trim().toLowerCase() === target);
      if (!official) {
        showJoinError('Non sei nella lista dei partecipanti. Chiedi al facilitatore di aggiungerti.');
        return;
      }
      resolvedName = official;
    }
    state.sessionCode   = code;
    state.isFacilitator = false;
    state.myName        = resolvedName;
    startListening();
  } catch(e) {
    showJoinError('Errore di connessione. Riprova.');
  } finally {
    el('btnJoinSession').disabled = false;
    el('btnJoinSession').textContent = 'Unisciti alla sessione';
  }
}

function showJoinError(msg) {
  const div = el('joinError');
  div.className = 'pp-alert pp-alert-error';
  div.textContent = msg;
  div.style.display = 'block';
}

/* ══════════════════════════════════════════════════════════ */
/* SCREEN: Setup                                             */
/* ══════════════════════════════════════════════════════════ */
el('btnCopyCode').addEventListener('click', () => {
  navigator.clipboard.writeText(state.sessionCode).then(() => {
    el('btnCopyCode').textContent = '✓ Copiato!';
    setTimeout(() => { el('btnCopyCode').innerHTML = '&#128203; Copia'; }, 2000);
  });
});

el('btnAddMember').addEventListener('click', addMember);
el('memberInput').addEventListener('keydown', e => { if (e.key === 'Enter') addMember(); });

function addMember() {
  const name = el('memberInput').value.trim();
  if (!name || state.setupMembers.includes(name)) return;
  state.setupMembers.push(name);
  el('memberInput').value = '';
  el('memberInput').focus();
  renderSetupMembers();
}

function renderSetupMembers() {
  const wrap = el('memberTags');
  wrap.innerHTML = '';
  state.setupMembers.forEach(name => {
    const tag = document.createElement('span');
    tag.className = 'pp-tag';
    tag.innerHTML = name + ' <button title="Rimuovi">✕</button>';
    tag.querySelector('button').addEventListener('click', () => {
      state.setupMembers = state.setupMembers.filter(n => n !== name);
      renderSetupMembers();
    });
    wrap.appendChild(tag);
  });
}

el('btnAddCard').addEventListener('click', addCard);
el('cardTitleInput').addEventListener('keydown', e => { if (e.key === 'Enter') addCard(); });
el('btnClearCard').addEventListener('click', () => {
  el('cardTitleInput').value = '';
  el('cardDescInput').value = '';
  el('cardTitleInput').focus();
});

function addCard() {
  const title = el('cardTitleInput').value.trim();
  if (!title) { el('cardTitleInput').focus(); return; }
  const desc = el('cardDescInput').value.trim();
  state.setupCards.push({ id: 'c' + Date.now(), title, desc });
  el('cardTitleInput').value = '';
  el('cardDescInput').value = '';
  el('cardTitleInput').focus();
  renderSetupCards();
}

function renderSetupCards() {
  const list = el('setupCardList');
  list.innerHTML = '';
  state.setupCards.forEach((card, i) => {
    const div = document.createElement('div');
    div.className = 'pp-card-item';
    div.innerHTML = `
      <div class="pp-card-item-text">
        <div class="pp-card-item-title">${i+1}. ${escHtml(card.title)}</div>
        ${card.desc ? '<div class="pp-card-item-desc">'+escHtml(card.desc)+'</div>' : ''}
      </div>
      <button title="Rimuovi">✕</button>`;
    div.querySelector('button').addEventListener('click', () => {
      state.setupCards.splice(i, 1);
      renderSetupCards();
    });
    list.appendChild(div);
  });
}

el('btnAbortSetup').addEventListener('click', () => { state.sessionCode = null; showScreen('screenWelcome'); });

el('btnStartSession').addEventListener('click', async () => {
  if (state.setupCards.length === 0) {
    const e = el('setupError');
    e.className = 'pp-alert pp-alert-error';
    e.textContent = 'Aggiungi almeno una card prima di avviare.';
    e.style.display = 'block';
    return;
  }
  el('setupError').style.display = 'none';
  el('btnStartSession').disabled = true;
  el('btnStartSession').textContent = 'Avvio…';

  const sessionData = {
    createdAt:    serverTimestamp(),
    members:      state.setupMembers,
    cards:        state.setupCards,
    currentCard:  0,
    status:       'voting',
    votes:        {},
    finalVotes:   {},
    suit:         state.sessionSuit,
  };

  try {
    await setDoc(doc(db, 'poker_sessions', state.sessionCode), sessionData);
    state.myName = 'Facilitatore';
    startListening();
  } catch(e) {
    el('setupError').className = 'pp-alert pp-alert-error';
    el('setupError').textContent = 'Errore nel creare la sessione. Riprova.';
    el('setupError').style.display = 'block';
    el('btnStartSession').disabled = false;
    el('btnStartSession').textContent = '▶️ Avvia sessione';
  }
});

/* ══════════════════════════════════════════════════════════ */
/* Listener Firestore real-time                              */
/* ══════════════════════════════════════════════════════════ */
function startListening() {
  if (state.unsubscribe) state.unsubscribe();
  state.unsubscribe = onSnapshot(
    doc(db, 'poker_sessions', state.sessionCode),
    snap => { if (snap.exists()) renderSession(snap.data()); },
    err  => console.error('Firestore error', err)
  );
  startPresence(state.myName, state.sessionCode);
}

function renderSession(data) {
  state.cachedData = data;
  const { status, cards, currentCard, votes, finalVotes, members, presence, suit: sessionSuit } = data;
  const isFac   = state.isFacilitator;
  const cardIdx = currentCard ?? 0;
  const card    = cards[cardIdx];

  // ── Waiting: sessione non ancora avviata (votante arrivato prima) ──
  if (!card) {
    el('waitingCodeBadge').textContent = state.sessionCode;
    el('waitingRoleLabel').textContent = isFac ? '👑 Facilitatore' : '👤 ' + state.myName;
    showScreen('screenWaiting');
    return;
  }

  // Seme fisso per sessione (fallback ♠ per sessioni vecchie)
  const suit  = sessionSuit || '♠';
  const color = (suit === '♥' || suit === '♦') ? '#c0392b' : '#1a1a1a';
  const cardVotes = (votes && votes[card.id]) ? votes[card.id] : {};

  if (status === 'finished') {
    renderSummary(cards, finalVotes, votes || {});
    return;
  }

  if (status === 'board') {
    renderBoard(data, isFac);
    return;
  }

  if (status === 'voting') {
    renderVotingScreen(card, cardIdx, cards.length, cardVotes, members, isFac, suit, color, presence || {});
    return;
  }

  if (status === 'revealed') {
    renderRevealScreen(card, cardIdx, cards.length, cardVotes, members, finalVotes, isFac, presence || {});
    return;
  }
}

/* ══════════════════════════════════════════════════════════ */
/* SCREEN: Voting                                            */
/* ══════════════════════════════════════════════════════════ */
function renderVotingScreen(card, idx, total, cardVotes, members, isFac, suit, color, presence) {
  el('votingRoleLabel').textContent = isFac ? '👑 Facilitatore' : '👤 ' + state.myName;
  el('votingCodeBadge').textContent = state.sessionCode;
  el('votingCardCounter').textContent = (idx+1) + ' / ' + total;

  // Carta da poker — flip solo a cambio card
  if (state.lastCardIdx !== idx) {
    const cardEl = el('votingPlayingCard');
    cardEl.classList.remove('flip-in');
    void cardEl.offsetWidth; // reflow per riavviare animazione
    cardEl.classList.add('flip-in');
    state.lastCardIdx = idx;
  }

  el('vcCornerNum').textContent   = idx+1;
  el('vcCornerSuit').textContent  = suit;
  el('vcCornerNum2').textContent  = idx+1;
  el('vcCornerSuit2').textContent = suit;
  el('vcSuitBg').textContent      = suit;
  // vcSuitTL / vcSuitBR sono display:none — niente da aggiornare
  el('vcCornerNum').style.color    = color;
  el('vcCornerNum2').style.color   = color;
  el('vcCornerSuit').style.color   = color;
  el('vcCornerSuit2').style.color  = color;
  el('vcSuitBg').style.color       = color;
  el('vcTitle').textContent = card.title;
  el('vcDesc').textContent  = card.desc || '';
  el('vcDesc').style.display = card.desc ? '' : 'none';
  // Mostra chiave Jira se presente nel titolo es. "[SMION-123] Titolo"
  const keyMatch = card.title.match(/^\[([A-Z]+-\d+)\]/);
  el('vcIssueKey').textContent = keyMatch ? keyMatch[1] : '';

  // Progress votanti
  const memberList = members && members.length > 0 ? members : Object.keys(cardVotes);
  const votedCount = Object.keys(cardVotes).length;
  const totalCount = memberList.length || '?';
  el('voteProgressCount').textContent = votedCount + ' / ' + totalCount;
  const pct = memberList.length > 0 ? Math.round(votedCount / memberList.length * 100) : 0;
  el('voteProgressBar').style.width = pct + '%';

  const vList = el('votersList');
  vList.innerHTML = '';
  if (memberList.length > 0) {
    memberList.forEach(m => {
      const chip = document.createElement('span');
      chip.className = 'pp-voter-chip' + (cardVotes[m] ? ' voted' : '');
      const dot = document.createElement('span');
      dot.className = 'pp-presence-dot ' + (isOnline(presence, m) ? 'online' : 'offline');
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(m));
      vList.appendChild(chip);
    });
  }

  // Mini-carte voto (nascosto per facilitatore)
  const myVote = cardVotes[state.myName] || state.myVotes[card.id] || null;
  if (!isFac) {
    el('votingSection').style.display = '';
    const vCards = el('voteCards');
    vCards.innerHTML = '';
    VOTES.forEach(vc => {
      vCards.appendChild(makeVoteCard(vc, myVote === vc.val, () => castVote(card.id, vc.val)));
    });
    // Spiegazione
    const box = el('voteExplainBox');
    if (myVote) {
      const info = voteInfo(myVote);
      box.innerHTML = `<div class="pp-vote-explain"><strong>${info.label}</strong>${info.explain}</div>`;
    } else {
      box.innerHTML = '';
    }
    el('revealSection').style.display = 'none';
  } else {
    el('votingSection').style.display = 'none';
    el('voteExplainBox').innerHTML = '';
    el('revealSection').style.display = '';
    el('btnReveal').disabled = false;  // reset dopo rivota
    const allVoted = memberList.length > 0 && votedCount >= memberList.length;
    el('revealHint').style.display = allVoted ? 'none' : '';
  }

  el('votingAddMemberBar').style.display = isFac ? '' : 'none';

  showScreen('screenVoting');
}

/* ── Aggiungi membro live ────────────────────────────────── */
async function addMemberLive(inputId, okId) {
  const input = el(inputId);
  const name  = input.value.trim();
  if (!name) return;
  try {
    await updateDoc(doc(db, 'poker_sessions', state.sessionCode), {
      members: arrayUnion(name)
    });
    input.value = '';
    const ok = el(okId);
    ok.textContent   = '✓ ' + name + ' aggiunto';
    ok.style.color   = '';
    ok.style.display = '';
    setTimeout(() => { ok.style.display = 'none'; }, 2500);
  } catch(e) {
    console.error('Add member error', e);
    const ok = el(okId);
    ok.textContent   = '✗ Errore: ' + (e.message || 'scrittura fallita');
    ok.style.color   = '#e05c5c';
    ok.style.display = '';
    setTimeout(() => { ok.style.display = 'none'; ok.style.color = ''; }, 4000);
  }
}

el('btnVotingAddMember').addEventListener('click', () => addMemberLive('votingAddMemberInput', 'votingAddMemberOk'));
el('votingAddMemberInput').addEventListener('keydown', e => { if (e.key === 'Enter') addMemberLive('votingAddMemberInput', 'votingAddMemberOk'); });
el('btnRevealAddMember').addEventListener('click', () => addMemberLive('revealAddMemberInput', 'revealAddMemberOk'));
el('revealAddMemberInput').addEventListener('keydown', e => { if (e.key === 'Enter') addMemberLive('revealAddMemberInput', 'revealAddMemberOk'); });

let voteDebounceTimer = null;

async function castVote(cardId, val) {
  state.myVotes[cardId] = val;
  // aggiorna subito UI locale
  el('voteCards').querySelectorAll('.pp-vote-card').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === val);
  });
  const info = voteInfo(val);
  el('voteExplainBox').innerHTML = `<div class="pp-vote-explain"><strong>${info.label}</strong>${info.explain}</div>`;

  // debounce: aspetta 300ms prima di scrivere su Firestore
  clearTimeout(voteDebounceTimer);
  voteDebounceTimer = setTimeout(async () => {
    try {
      const path = 'votes.' + cardId + '.' + state.myName;
      await updateDoc(doc(db, 'poker_sessions', state.sessionCode), { [path]: val });
    } catch(e) { console.error('Vote error', e); }
  }, 300);
}

el('btnReveal').addEventListener('click', async () => {
  el('btnReveal').disabled = true;
  try {
    await updateDoc(doc(db, 'poker_sessions', state.sessionCode), { status: 'revealed' });
  } catch(e) { el('btnReveal').disabled = false; }
});

/* ══════════════════════════════════════════════════════════ */
/* SCREEN: Reveal                                            */
/* ══════════════════════════════════════════════════════════ */
function renderRevealScreen(card, idx, total, cardVotes, members, finalVotes, isFac, presence) {
  el('revealRoleLabel').textContent = isFac ? '👑 Facilitatore' : '👤 ' + state.myName;
  el('revealCodeBadge').textContent = state.sessionCode;
  el('revealCardCounter').textContent = (idx+1) + ' / ' + total;
  el('revealCardTitle').textContent = card.title;

  // Calcola spread — escludi 21, ?, ☕ dal range (non sono stime valide)
  const allVoted      = Object.entries(cardVotes);
  const numericVotes  = allVoted.map(([n,v]) => ({ name: n, val: v, num: parseInt(v) }));
  const EXCLUDED_VALS = new Set(['21', '?', '☕']);
  const validVotes    = numericVotes.filter(x => !isNaN(x.num) && !EXCLUDED_VALS.has(x.val));
  const nums          = validVotes.map(x => x.num);
  const allQuestion   = allVoted.length > 0 && allVoted.every(([,v]) => v === '?');
  const allTwentyOne  = allVoted.length > 0 && allVoted.every(([,v]) => v === '21');
  const hasTwentyOne  = !allTwentyOne && numericVotes.some(x => x.num === 21);
  const maxVal        = nums.length ? Math.max(...nums) : null;
  const minVal        = nums.length ? Math.min(...nums) : null;
  const hasDivergence = !allQuestion && !allTwentyOne && nums.length >= 2 && (maxVal - minVal) >= 3;

  // Grid voti
  const grid = el('revealGrid');
  grid.innerHTML = '';
  const allNames = (members && members.length > 0) ? members : Object.keys(cardVotes);
  allNames.forEach(name => {
    const v   = cardVotes[name];
    const num = parseInt(v);
    const chip = document.createElement('div');
    chip.className = 'pp-reveal-chip';
    if (!isNaN(num) && num === maxVal && hasDivergence) chip.classList.add('high');
    if (!isNaN(num) && num === minVal && hasDivergence) chip.classList.add('low');
    const dot = `<span class="pp-presence-dot ${isOnline(presence, name) ? 'online' : 'offline'}" style="display:inline-block;vertical-align:middle;margin-right:3px;"></span>`;
    chip.innerHTML = `
      <span class="pp-reveal-name">${dot}${escHtml(name)}</span>
      <span class="pp-reveal-value${v === '?' || v === '☕' ? ' red' : ''}">${v ? escHtml(v) : '—'}</span>`;
    grid.appendChild(chip);
  });

  // Statistiche di consenso (solo su voti numerici validi)
  const statsBox = el('revealStats');
  if (nums.length >= 1) {
    const sorted = [...nums].sort((a, b) => a - b);
    const sum    = nums.reduce((a, b) => a + b, 0);
    const avg    = sum / nums.length;
    const mid    = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
    // Moda (valore più votato)
    const freq = {};
    nums.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
    let mode = sorted[0], modeCount = 0;
    Object.entries(freq).forEach(([val, c]) => { if (c > modeCount) { modeCount = c; mode = +val; } });
    // Consenso: quanti hanno votato la moda sul totale voti validi
    const agreePct = Math.round(modeCount / nums.length * 100);
    const spread   = maxVal - minVal;
    const cls = spread === 0 ? 'consensus-ok'
              : spread >= 3  ? 'consensus-high'
              : 'consensus-warn';
    const fmt = n => Number.isInteger(n) ? n : n.toFixed(1);
    statsBox.style.display = '';
    statsBox.innerHTML = `
      <div class="pp-stat"><div class="pp-stat-val">${fmt(avg)}</div><div class="pp-stat-label">Media</div></div>
      <div class="pp-stat"><div class="pp-stat-val">${fmt(median)}</div><div class="pp-stat-label">Mediana</div></div>
      <div class="pp-stat"><div class="pp-stat-val">${mode}</div><div class="pp-stat-label">Più votato</div></div>
      <div class="pp-stat ${cls}"><div class="pp-stat-val">${agreePct}%</div><div class="pp-stat-label">Consenso</div></div>`;
  } else {
    statsBox.style.display = 'none';
    statsBox.innerHTML = '';
  }

  // Divergenza
  const divBox = el('divergenceBox');
  if (allQuestion) {
    divBox.style.display = '';
    divBox.innerHTML = `<div class="pp-divergence">
      <strong>&#10067; Nessuno ha una stima chiara</strong>
      <p style="margin:0.5rem 0 0;">
        Il team non ha informazioni sufficienti per votare questa storia. Opzioni:
      </p>
      <ul style="margin:0.4rem 0 0;padding-left:1.2rem;line-height:1.8;">
        <li><strong>Rimetti nel backlog</strong> — affina i criteri di accettazione prima del prossimo sprint</li>
        <li><strong>Splitta la storia</strong> — potrebbe essere troppo grande o ambigua per essere stimata intera</li>
        <li><strong>Organizza una call ad hoc</strong> — 15 minuti con i diretti interessati per chiarire i requisiti</li>
      </ul>
    </div>`;
  } else if (allTwentyOne) {
    divBox.style.display = '';
    divBox.innerHTML = `<div class="pp-divergence">
      <strong>&#128308; Storia troppo grande</strong>
      <p style="margin:0.5rem 0 0;">
        Il team è concorde: questa storia supera la soglia massima di stima. Opzioni:
      </p>
      <ul style="margin:0.4rem 0 0;padding-left:1.2rem;line-height:1.8;">
        <li><strong>Splitta la storia</strong> — dividila in sotto-task stimabili separatamente</li>
        <li><strong>Organizza una sessione di refinement</strong> — dedica tempo prima dello sprint a ridurre la complessità</li>
        <li><strong>Rimetti nel backlog</strong> — finché non è abbastanza chiara da poter essere splittata</li>
      </ul>
    </div>`;
  } else if (hasDivergence) {
    // Split per mediana: chi ha votato ≤ mediana → gruppo basso, chi > mediana → gruppo alto
    const sorted = [...nums].sort((a, b) => a - b);
    const mid    = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;

    const lowGroup  = validVotes.filter(x => x.num <= median).sort((a,b) => a.num - b.num);
    const highGroup = validVotes.filter(x => x.num >  median).sort((a,b) => a.num - b.num);

    const fmtGroup = g => g.map(x => `<strong>${escHtml(x.name)}</strong> (${x.num})`).join(', ');

    const twentyOneVoters = numericVotes.filter(x => x.num === 21).map(x => x.name);
    const twentyOneNote   = hasTwentyOne
      ? `<p style="margin:0.5rem 0 0;font-size:0.8rem;opacity:0.8;">
           &#128308; ${twentyOneVoters.map(n => `<strong>${escHtml(n)}</strong>`).join(', ')}
           ${twentyOneVoters.length === 1 ? 'ha' : 'hanno'} votato 21 —
           spiega perché ritieni la storia così complessa, poi si rivota.
         </p>`
      : '';

    divBox.style.display = '';
    divBox.innerHTML = `<div class="pp-divergence">
      <strong>&#9888;&#65039; Divergenza rilevata — ${minVal} pt vs ${maxVal} pt</strong>
      <p style="margin:0.5rem 0 0;">
        &#128172; ${fmtGroup(lowGroup)}
        — spiega perché ritieni che l'effort sia basso.<br>
        &#128172; ${fmtGroup(highGroup)}
        — spiega perché ritieni che l'effort sia alto.
      </p>
      ${twentyOneNote}
      <p style="margin:0.5rem 0 0;font-size:0.8rem;opacity:0.8;">
        Dopo la discussione il facilitatore può azzerare i voti e far rivotare il team.
      </p>
    </div>`;
  } else {
    divBox.style.display = 'none';
  }

  // Voto finale (solo facilitatore)
  const finalPanel  = el('finalVotePanel');
  const revealActs  = el('revealActions');
  const revealWait  = el('revealWaiting');
  if (isFac) {
    finalPanel.style.display = '';
    revealActs.style.display = '';
    revealWait.style.display = 'none';
    // mini-carte per voto finale — escludi ?, ☕ e 21 (non sono stime valide)
    const fCards = el('finalVoteCards');
    fCards.innerHTML = '';
    const existing = finalVotes && finalVotes[card.id];
    VOTES.filter(vc => vc.val !== '?' && vc.val !== '☕' && vc.val !== '21').forEach(vc => {
      fCards.appendChild(makeVoteCard(vc, existing === vc.val, () => selectFinalVote(card.id, vc.val)));
    });
    state.selectedFinal = existing || null;
    el('btnNextCard').disabled = !existing;
    // Nota sulla issue (condivisa) — popola senza sovrascrivere ciò che il facilitatore sta digitando
    const noteInput = el('cardNoteInput');
    const savedNote = (state.cachedData && state.cachedData.cardNotes && state.cachedData.cardNotes[card.id]) || '';
    if (document.activeElement !== noteInput) noteInput.value = savedNote;
    noteInput.dataset.cardId = card.id;
    el('cardNoteSaved').style.display = 'none';
    // label contestuale: ultima card → "Vai ai post-it"
    const isLast = (idx + 1) >= total;
    el('btnNextCard').innerHTML = isLast
      ? '&#128204; Vai ai post-it'
      : 'Prossima card &#8594;';
    el('finalVotePanel').querySelector('h2').textContent = isLast
      ? '✓ Voto finale — ultima card'
      : '✓ Voto finale';
  } else {
    finalPanel.style.display  = 'none';
    revealActs.style.display  = 'none';
    revealWait.style.display  = '';
  }

  el('revealAddMemberBar').style.display = isFac ? '' : 'none';

  showScreen('screenReveal');
}

async function selectFinalVote(cardId, val) {
  state.selectedFinal = val;
  el('finalVoteCards').querySelectorAll('.pp-vote-card').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === val);
  });
  el('btnNextCard').disabled = false;
  try {
    const path = 'finalVotes.' + cardId;
    await updateDoc(doc(db, 'poker_sessions', state.sessionCode), { [path]: val });
  } catch(e) {
    console.error('Final vote error', e);
    // rollback UI: il voto non è stato salvato
    state.selectedFinal = null;
    el('finalVoteCards').querySelectorAll('.pp-vote-card').forEach(btn => btn.classList.remove('selected'));
    el('btnNextCard').disabled = true;
    const hint = el('revealActions').querySelector('.pp-save-error') || (() => {
      const d = document.createElement('span');
      d.className = 'pp-save-error';
      d.style.cssText = 'font-size:0.8rem;color:#e05c5c;margin-left:0.5rem;';
      el('revealActions').appendChild(d);
      return d;
    })();
    hint.textContent = '⚠ Salvataggio fallito, riprova.';
    setTimeout(() => { hint.textContent = ''; }, 3500);
  }
}

el('btnRevote').addEventListener('click', async () => {
  const data = state.cachedData;
  if (!data) return;
  const cardId = data.cards[data.currentCard].id;
  // Cancella lo stato locale prima di scrivere su Firestore,
  // così se lo snapshot arriva prima del return non rilegge il voto vecchio
  delete state.myVotes[cardId];
  try {
    await updateDoc(doc(db, 'poker_sessions', state.sessionCode), {
      ['votes.' + cardId]: deleteField(),
      status: 'voting'
    });
  } catch(e) {
    console.error('Revote error', e);
    // in caso di errore non c'è da ripristinare: il render si riallineerà al prossimo snapshot
  }
});

el('btnReject').addEventListener('click', async () => {
  const data = state.cachedData;
  if (!data) return;
  if (!confirm('Bocciare questa issue e segnarla come "da splittare"?')) return;
  const card    = data.cards[data.currentCard];
  const nextIdx = (data.currentCard ?? 0) + 1;
  try {
    const update = { ['finalVotes.' + card.id]: 'split' };
    if (nextIdx >= data.cards.length) {
      update.status = 'finished';
    } else {
      update.currentCard = nextIdx;
      update.status      = 'voting';
      state.selectedFinal = null;
    }
    await updateDoc(doc(db, 'poker_sessions', state.sessionCode), update);
  } catch(e) { console.error('Reject error', e); }
});

el('btnNextCard').addEventListener('click', async () => {
  if (!state.selectedFinal) return;
  const data = state.cachedData;
  if (!data) return;
  try {
    const nextIdx = (data.currentCard ?? 0) + 1;
    if (nextIdx >= data.cards.length) {
      await updateDoc(doc(db, 'poker_sessions', state.sessionCode), { status: 'board' });
    } else {
      await updateDoc(doc(db, 'poker_sessions', state.sessionCode), {
        currentCard: nextIdx, status: 'voting'
      });
      state.selectedFinal = null;
    }
  } catch(e) { console.error('Next card error', e); }
});

/* ── Nota sulla issue (facilitatore, condivisa) ──────────── */
let noteDebounceTimer = null;
el('cardNoteInput').addEventListener('input', () => {
  const input  = el('cardNoteInput');
  const cardId = input.dataset.cardId;
  if (!cardId) return;
  const val = input.value;
  el('cardNoteSaved').style.display = 'none';
  clearTimeout(noteDebounceTimer);
  noteDebounceTimer = setTimeout(async () => {
    try {
      const path = 'cardNotes.' + cardId;
      await updateDoc(doc(db, 'poker_sessions', state.sessionCode),
        { [path]: val.trim() ? val : deleteField() });
      const ok = el('cardNoteSaved');
      ok.style.display = '';
      setTimeout(() => { ok.style.display = 'none'; }, 1800);
    } catch(e) { console.error('Card note error', e); }
  }, 500);
});

/* ══════════════════════════════════════════════════════════ */
/* SCREEN: Board (lavagna post-it)                           */
/* ══════════════════════════════════════════════════════════ */
const POSTIT_COLORS = ['#ffe066', '#ffadad', '#a0e7a0', '#a0c4ff', '#ffd6a5', '#e0c3fc'];
let postitColor = POSTIT_COLORS[0];

function renderPostitColors() {
  const wrap = el('postitColors');
  if (wrap.childElementCount) return; // build once
  POSTIT_COLORS.forEach(c => {
    const sw = document.createElement('span');
    sw.className = 'pp-postit-swatch' + (c === postitColor ? ' selected' : '');
    sw.style.background = c;
    sw.addEventListener('click', () => {
      postitColor = c;
      wrap.querySelectorAll('.pp-postit-swatch').forEach(s => s.classList.toggle('selected', s === sw));
    });
    wrap.appendChild(sw);
  });
}

function renderPostit(p, container, canDelete) {
  const d = document.createElement('div');
  d.className = 'pp-postit';
  d.style.background = p.color || '#ffe066';
  const delBtn = canDelete
    ? `<button class="pp-postit-del" data-id="${p.id}" title="Elimina">&times;</button>` : '';
  d.innerHTML = `${delBtn}
    <div class="pp-postit-text">${escHtml(p.text)}</div>
    <div class="pp-postit-author">— ${escHtml(p.author || '?')}</div>`;
  container.appendChild(d);
}

function renderBoard(data, isFac) {
  el('boardCodeBadge').textContent = state.sessionCode;
  el('boardRoleLabel').textContent = isFac ? '👑 Facilitatore' : '👤 ' + state.myName;
  renderPostitColors();
  const postits = Array.isArray(data.postits) ? data.postits : [];
  const board = el('postitBoard');
  board.innerHTML = '';
  postits.forEach(p => renderPostit(p, board, p.author === state.myName || isFac));
  el('postitEmpty').style.display = postits.length ? 'none' : '';
  el('boardActions').style.display = isFac ? '' : 'none';
  el('boardWaiting').style.display = isFac ? 'none' : '';
  board.querySelectorAll('.pp-postit-del').forEach(b => {
    b.addEventListener('click', () => removePostit(b.dataset.id));
  });
  showScreen('screenBoard');
}

async function addPostit() {
  const input = el('postitInput');
  const text  = input.value.trim();
  if (!text) return;
  const postit = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text, author: state.myName || '?', color: postitColor, ts: Date.now()
  };
  input.value = '';
  try {
    await updateDoc(doc(db, 'poker_sessions', state.sessionCode), { postits: arrayUnion(postit) });
  } catch(e) { console.error('Add post-it error', e); input.value = text; }
}

async function removePostit(id) {
  const data = state.cachedData;
  if (!data || !Array.isArray(data.postits)) return;
  const next = data.postits.filter(p => p.id !== id);
  try {
    await updateDoc(doc(db, 'poker_sessions', state.sessionCode), { postits: next });
  } catch(e) { console.error('Remove post-it error', e); }
}

el('btnAddPostit').addEventListener('click', addPostit);
el('postitInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addPostit(); }
});
el('btnCloseBoard').addEventListener('click', async () => {
  el('btnCloseBoard').disabled = true;
  try {
    await updateDoc(doc(db, 'poker_sessions', state.sessionCode), { status: 'finished' });
  } catch(e) { el('btnCloseBoard').disabled = false; }
});

/* ══════════════════════════════════════════════════════════ */
/* SCREEN: Summary                                           */
/* ══════════════════════════════════════════════════════════ */
function renderSummary(cards, finalVotes, allVotes) {
  const tbody = el('summaryBody');
  tbody.innerHTML = '';
  const cardNotes = (state.cachedData && state.cachedData.cardNotes) || {};
  let total = 0;
  cards.forEach(card => {
    const v       = finalVotes && finalVotes[card.id];
    const isSplit = v === 'split';
    const n = parseInt(v);
    if (!isNaN(n)) total += n;

    // Distribuzione voti individuali per questa card
    const cardVotes = (allVotes && allVotes[card.id]) || {};
    const voteEntries = Object.entries(cardVotes);
    const voteDetail = voteEntries.length
      ? voteEntries.map(([name, val]) => `${escHtml(name)}: ${escHtml(val)}`).join(', ')
      : '';

    const ptsCell  = isSplit ? '&#128683;' : (v ? escHtml(v) : '—');
    let noteCell = isSplit
      ? `<span style="color:#e05c5c;font-weight:700;">Da splittare</span>${voteDetail ? ` &middot; <span style="opacity:0.7">${voteDetail}</span>` : ''}`
      : v
        ? `${voteInfo(v).label}${voteDetail ? ` &middot; <span style="opacity:0.7">${voteDetail}</span>` : ''}`
        : `<em>non stimata</em>${voteDetail ? ` &middot; <span style="opacity:0.7">${voteDetail}</span>` : ''}`;
    const facNote = cardNotes && cardNotes[card.id];
    if (facNote) {
      noteCell += `<div style="margin-top:0.3rem;color:var(--text);">&#128221; ${escHtml(facNote)}</div>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(card.title)}</td>
      <td>${ptsCell}</td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${noteCell}</td>`;
    tbody.appendChild(tr);
  });
  el('summaryTotal').textContent = total + ' pt';

  // Post-it della lavagna
  const postits = Array.isArray(state.cachedData && state.cachedData.postits) ? state.cachedData.postits : [];
  const sp = el('summaryPostits');
  sp.innerHTML = '';
  postits.forEach(p => renderPostit(p, sp, false));
  el('summaryBoardPanel').style.display = postits.length ? '' : 'none';

  state.summaryData = { cards, finalVotes: finalVotes || {}, allVotes: allVotes || {}, cardNotes: cardNotes || {}, postits };
  showScreen('screenSummary');
}

el('btnCopySummary').addEventListener('click', () => {
  const d = state.summaryData || { cards: [], finalVotes: {}, cardNotes: {}, postits: [] };
  let text = '🃏 Planning Poker — Riepilogo sprint\n\n';
  d.cards.forEach((card, i) => {
    const fv = d.finalVotes[card.id];
    const pts = fv === 'split' ? '🚫 da splittare' : (fv != null ? fv + ' pt' : 'non stimata');
    text += (i+1) + '. ' + (card.title || '') + '  →  ' + pts + '\n';
    const note = d.cardNotes && d.cardNotes[card.id];
    if (note) text += '   📝 ' + note + '\n';
  });
  text += '\nTotale: ' + el('summaryTotal').textContent;
  const postits = d.postits || [];
  if (postits.length) {
    text += '\n\n📌 Lavagna del team\n';
    postits.forEach(p => { text += '• ' + p.text + ' (— ' + (p.author || '?') + ')\n'; });
  }
  navigator.clipboard.writeText(text).then(() => {
    el('btnCopySummary').textContent = '✓ Copiato!';
    setTimeout(() => { el('btnCopySummary').innerHTML = '&#128203; Copia riepilogo'; }, 2000);
  }).catch(() => alert(text));
});

/* ── Export CSV / JSON scaricabile ───────────────────────── */
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function summaryRows() {
  const d = state.summaryData || { cards: [], finalVotes: {}, allVotes: {}, cardNotes: {} };
  return d.cards.map(card => {
    const fv       = d.finalVotes[card.id];
    const isSplit  = fv === 'split';
    const points   = isSplit ? '' : (fv != null ? String(fv) : '');
    const votes    = d.allVotes[card.id] || {};
    const keyMatch = (card.title || '').match(/^\[([A-Z]+-\d+)\]/);
    return {
      key:    keyMatch ? keyMatch[1] : '',
      title:  card.title || '',
      points: points,
      status: isSplit ? 'da splittare' : (fv != null ? 'stimata' : 'non stimata'),
      nota:   (d.cardNotes && d.cardNotes[card.id]) || '',
      votes:  votes
    };
  });
}

el('btnExportCsv').addEventListener('click', () => {
  const rows = summaryRows();
  const esc  = s => `"${String(s).replace(/"/g, '""')}"`;
  let csv = ['Chiave', 'Titolo', 'Punti', 'Stato', 'Nota', 'Voti individuali'].map(esc).join(',') + '\r\n';
  rows.forEach(r => {
    const voti = Object.entries(r.votes).map(([n, v]) => `${n}:${v}`).join(' | ');
    csv += [r.key, r.title, r.points, r.status, r.nota, voti].map(esc).join(',') + '\r\n';
  });
  const postits = (state.summaryData && state.summaryData.postits) || [];
  if (postits.length) {
    csv += '\r\n' + ['Lavagna — post-it', 'Autore'].map(esc).join(',') + '\r\n';
    postits.forEach(p => { csv += [p.text, p.author || ''].map(esc).join(',') + '\r\n'; });
  }
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(`planning-poker-${state.sessionCode || 'sessione'}-${stamp}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
});

el('btnExportJson').addEventListener('click', () => {
  const rows = summaryRows();
  const totale = rows.reduce((a, r) => a + (parseInt(r.points) || 0), 0);
  const payload = {
    tool: 'planning-poker',
    sessione: state.sessionCode || null,
    esportato: new Date().toISOString(),
    totalePunti: totale,
    cards: rows,
    lavagna: ((state.summaryData && state.summaryData.postits) || [])
      .map(p => ({ testo: p.text, autore: p.author || null, colore: p.color || null }))
  };
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(`planning-poker-${state.sessionCode || 'sessione'}-${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json');
});

el('btnNewSession').addEventListener('click', () => {
  if (state.unsubscribe) { state.unsubscribe(); state.unsubscribe = null; }
  stopPresence();
  state = { sessionCode:null, isFacilitator:false, myName:null, unsubscribe:null, presenceInterval:null, sessionSuit:'♠', setupMembers:[], setupCards:[], myVotes:{}, selectedFinal:null, lastCardIdx:-1, cachedData:null, summaryData:null };
  // Riporta il picker al default ♠
  document.querySelectorAll('.pp-suit-btn').forEach(b => b.classList.toggle('selected', b.dataset.suit === '♠'));
  el('joinCodeInput').value = '';
  el('joinNameInput').value = '';
  el('joinError').style.display = 'none';
  showScreen('screenWelcome');
});

/* ══════════════════════════════════════════════════════════ */
/* Import Jira CSV                                           */
/* ══════════════════════════════════════════════════════════ */
let csvParsed = []; // [{key, title, desc}]

// Drag & drop
const dropzone = el('csvDropzone');
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) parseCSVFile(file);
});
el('csvFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) parseCSVFile(file);
  e.target.value = ''; // reset per permettere ricarico stesso file
});

function parseCSVFile(file) {
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    showCsvError('Il file non sembra un CSV. Esporta da Jira in formato CSV.');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      csvParsed = parseJiraCSV(e.target.result);
      if (csvParsed.length === 0) {
        showCsvError('Nessuna issue trovata nel CSV. Verifica di aver esportato dal progetto SMION.');
        return;
      }
      el('csvError').style.display = 'none';
      renderCsvPreview();
    } catch(err) {
      showCsvError('Errore nel parsing del CSV: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function parseJiraCSV(text) {
  // Parser CSV robusto: gestisce campi tra virgolette con newline/virgole interne
  const rows = [];
  let cur = '', inQ = false, fields = [], r = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i+1];
    if (inQ) {
      if (ch === '"' && nx === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
      else if (ch === '\n' || (ch === '\r' && nx === '\n')) {
        if (ch === '\r') i++;
        fields.push(cur.trim()); cur = '';
        if (r === 0) { rows.push(fields); } // header
        else if (fields.some(f => f)) rows.push(fields);
        fields = []; r++;
      } else { cur += ch; }
    }
  }
  if (cur || fields.length) { fields.push(cur.trim()); if (fields.some(f => f)) rows.push(fields); }

  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Mappa colonne Jira (nomi possibili in italiano/inglese)
  const idx = {
    key:     findCol(headers, ['issuekey','key','codice','id']),
    summary: findCol(headers, ['summary','riepilogo','titolo','title','nome']),
    desc:    findCol(headers, ['description','descrizione','desc']),
    type:    findCol(headers, ['issuetype','tipo','type']),
    status:  findCol(headers, ['status','stato']),
  };

  if (idx.summary === -1) throw new Error('Colonna "Summary" non trovata. Usa "Esporta in CSV (tutti i campi)".');

  return rows.slice(1).map(row => ({
    key:   idx.key   >= 0 ? row[idx.key]     || '' : '',
    title: idx.summary >= 0 ? row[idx.summary] || '' : '',
    desc:  idx.desc  >= 0 ? row[idx.desc]    || '' : '',
    type:  idx.type  >= 0 ? row[idx.type]    || '' : '',
  })).filter(r => r.title.trim());
}

function findCol(headers, names) {
  for (const n of names) {
    const i = headers.findIndex(h => h.includes(n));
    if (i >= 0) return i;
  }
  return -1;
}

function renderCsvPreview() {
  const preview = el('csvPreview');
  const list    = el('csvList');
  preview.style.display = '';
  el('csvPreviewCount').textContent = csvParsed.length + ' issue trovate';
  el('csvPreviewSub').textContent = 'Seleziona quelle da portare in sessione';
  list.innerHTML = '';
  csvParsed.forEach((issue, i) => {
    const row = document.createElement('div');
    row.className = 'pp-csv-row';
    row.innerHTML = `
      <input type="checkbox" id="csv_${i}" checked>
      <div class="pp-csv-row-body">
        ${issue.key ? `<div class="pp-csv-row-key">${escHtml(issue.key)}${issue.type ? ' · ' + escHtml(issue.type) : ''}</div>` : ''}
        <div class="pp-csv-row-title">${escHtml(issue.title)}</div>
        ${issue.desc ? `<div class="pp-csv-row-desc">${escHtml(issue.desc)}</div>` : ''}
      </div>`;
    list.appendChild(row);
  });
}

function showCsvError(msg) {
  el('csvError').textContent = msg;
  el('csvError').style.display = '';
  el('csvPreview').style.display = 'none';
}

el('csvSelectAll').addEventListener('click', () => {
  el('csvList').querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
});
el('csvDeselectAll').addEventListener('click', () => {
  el('csvList').querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
});

el('csvImportBtn').addEventListener('click', () => {
  const checkboxes = el('csvList').querySelectorAll('input[type=checkbox]');
  let imported = 0;
  checkboxes.forEach((cb, i) => {
    if (!cb.checked) return;
    const issue = csvParsed[i];
    if (!issue) return;
    const title = (issue.key ? '[' + issue.key + '] ' : '') + issue.title;
    // evita duplicati (stesso titolo già presente)
    if (state.setupCards.some(c => c.title === title)) return;
    state.setupCards.push({ id: 'c' + Date.now() + i, title, desc: issue.desc });
    imported++;
  });
  renderSetupCards();
  // feedback visivo
  const btn = el('csvImportBtn');
  btn.textContent = '✓ ' + imported + ' card importate!';
  setTimeout(() => { btn.innerHTML = '&#43; Importa selezionate'; }, 2500);
  // chiudi il pannello
  el('importPanel').removeAttribute('open');
});

/* ── Escape HTML ─────────────────────────────────────────── */
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Crea mini-carta voto ────────────────────────────────── */
function makeVoteCard(vc, isSelected, onClick) {
  const btn = document.createElement('button');
  btn.className = 'pp-vote-card' + (vc.red ? ' red' : '') + (isSelected ? ' selected' : '');
  btn.dataset.val  = vc.val;
  btn.dataset.suit = vc.suit;
  btn.title        = vc.label;
  btn.textContent  = vc.val;
  const suitSpan = document.createElement('span');
  suitSpan.className = 'pp-vote-card-suit';
  suitSpan.textContent = vc.suit;
  btn.appendChild(suitSpan);
  btn.addEventListener('click', onClick);
  return btn;
}
