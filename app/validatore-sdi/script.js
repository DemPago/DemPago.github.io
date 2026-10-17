/* ══════════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════════ */
const CACHE_KEY    = 'sdi_db_v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CKAN_URL     = 'https://indicepa.gov.it/ipa-dati/api/3/action/package_show?id=servizi-fatturazione-elettronica';
const CORS_PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
let db = null; // Map: codice -> descrizione

/* ══════════════════════════════════════════════════════
   UI HELPERS
══════════════════════════════════════════════════════ */
function setDbStatus(state, text) {
  const el = document.getElementById('db-status');
  el.className = 'sdi-db-status ' + state;
  document.getElementById('db-status-text').textContent = text;
}

function setProgress(show, label = '') {
  const wrap = document.getElementById('sdi-progress');
  wrap.classList.toggle('show', show);
  if (label) document.getElementById('progress-label').textContent = label;
}

function showResult(type, badge, message, ente = '') {
  const box = document.getElementById('sdi-result');
  box.className = 'sdi-result show res-' + type;
  document.getElementById('res-badge').textContent = badge;
  document.getElementById('res-message').textContent = message;
  const enteEl = document.getElementById('res-ente');
  enteEl.textContent = ente;
  enteEl.style.display = ente ? '' : 'none';
}

function hideResult() {
  document.getElementById('sdi-result').className = 'sdi-result';
}

/* ══════════════════════════════════════════════════════
   FETCH WITH PROXY FALLBACK
══════════════════════════════════════════════════════ */
async function fetchWithFallback(url) {
  // Try direct first
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (r.ok) return await r.text();
  } catch (_) {}

  // Try proxies
  for (const makeProxy of CORS_PROXIES) {
    try {
      const r = await fetch(makeProxy(url));
      if (r.ok) return await r.text();
    } catch (_) {}
  }
  throw new Error('Impossibile scaricare il dataset. Controlla la connessione.');
}

/* ══════════════════════════════════════════════════════
   PARSE DATASET
══════════════════════════════════════════════════════ */
function parseDataset(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error('Dataset vuoto.');

  const sep = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());

  let idxCodice = headers.indexOf('cod_uni_ou');
  let idxDesUff = headers.indexOf('des_ou');
  let idxComune = headers.indexOf('comune');

  // Fallback posizionale (sicurezza)
  if (idxCodice === -1) idxCodice = 0;
  if (idxDesUff === -1) idxDesUff = 2;
  if (idxComune === -1) idxComune = 4;

  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(sep);
    const codice = cols[idxCodice] ? cols[idxCodice].trim().toUpperCase() : '';
    if (codice && /^[A-Z0-9]{6}$/.test(codice)) {
      const des = cols[idxDesUff] ? cols[idxDesUff].trim() : 'Ente Pubblico';
      const comune = (idxComune !== -1 && cols[idxComune]) ? cols[idxComune].trim() : '';
      map.set(codice, des + (comune ? ' (' + comune + ')' : ''));
    }
  }
  return map;
}

/* ══════════════════════════════════════════════════════
   CARICA DATABASE
══════════════════════════════════════════════════════ */
async function caricaDatabase(forceRefresh = false) {
  const btn = document.getElementById('db-refresh-btn');
  btn.disabled = true;

    // Check cache
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL_MS && cached.data) {
          db = new Map(Object.entries(cached.data));
          const ts = new Date(cached.ts).toLocaleString('it-IT');
          setDbStatus('loaded', `${db.size.toLocaleString('it-IT')} codici · aggiornato ${ts}`);
          document.getElementById('sdi-btn').disabled = false;
          btn.disabled = false;
          return;
        }
      }
    } catch (_) {}
  }

  // Download
  setDbStatus('loading', 'Download dataset iPA…');
  setProgress(true, 'Recupero URL dal catalogo iPA…');

  try {
    // Step 1: get download URL from CKAN
    const ckanText = await fetchWithFallback(CKAN_URL);
    const ckanJson = JSON.parse(ckanText);
    const resources = ckanJson.result.resources;
    let dataUrl = '';
    for (const r of resources) {
      const fmt = (r.format || '').toUpperCase();
      if (fmt === 'TXT' || fmt === 'CSV') { dataUrl = r.url; break; }
    }
    if (!dataUrl) throw new Error('URL del dataset non trovato nel catalogo iPA.');

    // Step 2: download actual dataset
    setProgress(true, 'Download dataset in corso…');
    const csvText = await fetchWithFallback(dataUrl);

    // Step 3: parse
    setProgress(true, 'Elaborazione…');
    db = parseDataset(csvText);

    // Step 4: cache
    const plain = Object.fromEntries(db);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: plain }));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn('localStorage pieno — cache non salvata.');
      }
    }

    const ts = new Date().toLocaleString('it-IT');
    setDbStatus('loaded', `${db.size.toLocaleString('it-IT')} codici · aggiornato ${ts}`);
    setProgress(false);
    document.getElementById('sdi-btn').disabled = false;

  } catch (e) {
    setDbStatus('error', 'Errore: ' + e.message);
    setProgress(false);
    console.error(e);
  }

  btn.disabled = false;
}

/* ══════════════════════════════════════════════════════
   VALIDA CODICE
══════════════════════════════════════════════════════ */
function validaSDI() {
  const input = document.getElementById('sdi-input');
  const codice = input.value.trim().toUpperCase();

  input.className = '';

  // Validazione formato
  if (!codice) {
    showResult('warn', 'ATTENZIONE', 'Inserisci un codice SDI prima di procedere.');
    return;
  }
  if (!/^[A-Z0-9]{6}$/.test(codice)) {
    input.classList.add('input-invalid');
    showResult('invalid', 'FORMATO NON VALIDO',
      'Il codice deve contenere esattamente 6 caratteri alfanumerici (lettere e numeri).');
    return;
  }

  // DB non ancora caricato
  if (!db) {
    showResult('info', 'DATABASE IN CARICAMENTO',
      'Attendi il completamento del download del database iPA, poi riprova.');
    return;
  }

  // Lookup
  if (db.has(codice)) {
    input.classList.add('input-valid');
    const ente = db.get(codice);
    showResult('valid', '✓ CODICE VALIDO',
      `Il codice ${codice} è presente nell'Indice PA ed è abilitato alla fatturazione elettronica.`,
      ente);
  } else {
    input.classList.add('input-invalid');
    showResult('invalid', '✗ NON TROVATO',
      `Il codice ${codice} ha un formato valido ma non è presente nel database iPA. Potrebbe essere errato, scaduto o non ancora registrato.`);
  }
}

/* ── Input: uppercase + invio ─────────────────────────────── */
document.getElementById('sdi-input').addEventListener('input', function() {
  this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  hideResult();
  this.className = '';
});

document.getElementById('sdi-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') validaSDI();
});

/* ── Init ──────────────────────────────────────────────────── */
caricaDatabase();
