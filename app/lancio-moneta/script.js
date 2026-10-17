/* ── Genera reeding (dentellatura bordo) ─────────────────── */
function buildReeding(groupId) {
  const g   = document.getElementById(groupId);
  const cx  = 120, cy = 120, r = 113;
  const N   = 140; // numero denti
  const tw  = 2.2; // larghezza dente (gradi)
  for (let i = 0; i < N; i++) {
    const angle = (360 / N) * i - 90;
    const rad   = angle * Math.PI / 180;
    const rect  = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x',         cx + (r - 2.5));
    rect.setAttribute('y',         cy - tw / 2);
    rect.setAttribute('width',     5.5);
    rect.setAttribute('height',    tw);
    rect.setAttribute('rx',        0.5);
    rect.setAttribute('transform', `rotate(${angle} ${cx} ${cy})`);
    g.appendChild(rect);
  }
}

/* ── Genera stelle UE sull'anello ────────────────────────── */
function buildStars(groupId) {
  const g  = document.getElementById(groupId);
  const cx = 120, cy = 120, r = 98;
  for (let i = 0; i < 12; i++) {
    const angle = (360 / 12) * i - 90;
    const rad   = angle * Math.PI / 180;
    const x     = cx + r * Math.cos(rad);
    const y     = cy + r * Math.sin(rad);
    const txt   = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x',                x);
    txt.setAttribute('y',                y);
    txt.setAttribute('text-anchor',      'middle');
    txt.setAttribute('dominant-baseline','central');
    txt.setAttribute('font-size',        '10');
    txt.textContent = '★';
    g.appendChild(txt);
  }
}

buildReeding('reeding-testa');
buildReeding('reeding-croce');
buildStars('stars-croce');

/* ── Aggiungi stelle anche sul lato Testa sull'anello ─────── */
(function() {
  const g  = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('fill',    '#d4a017');
  g.setAttribute('opacity', '0.9');
  const svg = document.getElementById('svg-testa');
  // Insert before the specular highlight (last child)
  svg.insertBefore(g, svg.lastElementChild);
  const cx = 120, cy = 120, r = 98;
  for (let i = 0; i < 12; i++) {
    const angle = (360 / 12) * i - 90;
    const rad   = angle * Math.PI / 180;
    const x     = cx + r * Math.cos(rad);
    const y     = cy + r * Math.sin(rad);
    const txt   = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x',                x);
    txt.setAttribute('y',                y);
    txt.setAttribute('text-anchor',      'middle');
    txt.setAttribute('dominant-baseline','central');
    txt.setAttribute('font-size',        '10');
    txt.textContent = '★';
    g.appendChild(txt);
  }
})();

/* ── Flip logic ──────────────────────────────────────────── */
let isFlipping    = false;
let totalRotation = 0;
let stats         = { testa: 0, croce: 0 };

const DILEMMA_KEY = 'lancio_moneta_dilemma';

/* Ripristina dilemma salvato */
(function restoreDilemma() {
  try {
    const saved = JSON.parse(localStorage.getItem(DILEMMA_KEY) || 'null');
    if (!saved) return;
    if (saved.testo)  document.getElementById('dilemma-text').value = saved.testo;
    if (saved.testa)  document.getElementById('alt-testa').value    = saved.testa;
    if (saved.croce)  document.getElementById('alt-croce').value    = saved.croce;
    if (saved.testo || saved.testa || saved.croce)
      document.getElementById('coin-hint').style.display = 'none';
  } catch(_) {}
})();

/* Salva dilemma ad ogni modifica */
['dilemma-text','alt-testa','alt-croce'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    try {
      localStorage.setItem(DILEMMA_KEY, JSON.stringify({
        testo: document.getElementById('dilemma-text').value,
        testa: document.getElementById('alt-testa').value,
        croce: document.getElementById('alt-croce').value,
      }));
    } catch(_) {}
    const anyVal = ['dilemma-text','alt-testa','alt-croce'].some(i => document.getElementById(i).value.trim());
    document.getElementById('coin-hint').style.display = anyVal ? 'none' : '';
  });
});

/* Reset statistiche */
document.getElementById('stats-reset-btn').addEventListener('click', () => {
  stats = { testa: 0, croce: 0 };
  document.getElementById('stat-testa').textContent  = 0;
  document.getElementById('stat-croce').textContent  = 0;
  document.getElementById('stat-totale').textContent = 0;
  document.getElementById('stats-reset-btn').style.display = 'none';
});

function lancia() {
  if (isFlipping) return;
  isFlipping = true;

  const stage    = document.querySelector('.coin-stage');
  const btn      = document.getElementById('coin-btn');
  const resultEl = document.getElementById('coin-result');
  const coin     = document.getElementById('coin');

  btn.disabled = true;
  stage.classList.add('flipping-active');
  resultEl.className = 'coin-result';

  const isTesta    = Math.random() < 0.5;
  const giri       = 5 + Math.floor(Math.random() * 4);
  const currentMod = ((totalRotation % 360) + 360) % 360;
  const targetMod  = isTesta ? 0 : 180;
  let delta        = targetMod - currentMod;
  if (delta <= 0) delta += 360;
  const endRotation = totalRotation + (giri * 360) + delta;
  const duration    = 1800 + Math.random() * 600;

  coin.style.setProperty('--flip-end',      endRotation + 'deg');
  coin.style.setProperty('--flip-duration', duration + 'ms');
  coin.style.removeProperty('transform');
  coin.classList.add('flipping');

  setTimeout(() => {
    coin.classList.remove('flipping');
    /* Normalizza totalRotation per evitare crescita infinita */
    totalRotation = ((endRotation % 360) + 360) % 360;
    if (isTesta && totalRotation > 90 && totalRotation < 270) totalRotation = 0;
    if (!isTesta && (totalRotation < 90 || totalRotation > 270)) totalRotation = 180;
    coin.style.transform = `rotateY(${totalRotation}deg)`;

    const face = isTesta ? 'testa' : 'croce';
    stats[face]++;
    document.getElementById('stat-testa').textContent  = stats.testa;
    document.getElementById('stat-croce').textContent  = stats.croce;
    document.getElementById('stat-totale').textContent = stats.testa + stats.croce;
    document.getElementById('stats-reset-btn').style.display = '';

    const dilemma  = document.getElementById('dilemma-text').value.trim();
    const altTesta = document.getElementById('alt-testa').value.trim();
    const altCroce = document.getElementById('alt-croce').value.trim();
    const winner   = isTesta ? (altTesta || 'Testa') : (altCroce || 'Croce');
    const emoji    = isTesta ? '🪙' : '🌍';

    document.getElementById('res-label').textContent   = isTesta
      ? '🪙 È uscita TESTA — la scelta è:'
      : '🌍 È uscita CROCE — la scelta è:';
    document.getElementById('res-winner').textContent  = emoji + ' ' + winner;
    document.getElementById('res-dilemma').textContent = dilemma ? '«' + dilemma + '»' : '';

    resultEl.className = 'coin-result show res-' + face;

    stage.classList.remove('flipping-active');
    btn.disabled = false;
    isFlipping   = false;
  }, duration);
}
