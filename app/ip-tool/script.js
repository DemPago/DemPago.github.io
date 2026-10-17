/* ══════════════════════════════════════════
   MY IP
══════════════════════════════════════════ */
let _myIP = '';

async function loadMyIP() {
  // sessionStorage cache
  try {
    const cached = JSON.parse(sessionStorage.getItem('ip_cache') || 'null');
    if (cached && cached.ip) {
      renderIPData(cached);
      return;
    }
  } catch(_) {}

  document.getElementById('ip-loading').style.display = '';
  document.getElementById('ip-result').style.display  = 'none';
  document.getElementById('ip-error').style.display   = 'none';

  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    sessionStorage.setItem('ip_cache', JSON.stringify(d));
    renderIPData(d);
  } catch (e) {
    document.getElementById('ip-loading').style.display = 'none';
    document.getElementById('ip-error').style.display = '';
  }
}

function retryIP() {
  sessionStorage.removeItem('ip_cache');
  loadMyIP();
}

function renderIPData(d) {
  _myIP = d.ip || '';
  document.getElementById('ip-address-val').textContent = _myIP;

  const flag = countryFlag(d.country_code || '');
  document.getElementById('ip-country').textContent = (flag ? flag + ' ' : '') + (d.country_name || '—');
  document.getElementById('ip-city').textContent = [d.city, d.region].filter(Boolean).join(', ') || '—';

  const org = (d.org || '').replace(/^AS\d+\s+/, '');
  document.getElementById('ip-org').textContent = org || '—';
  document.getElementById('ip-timezone').textContent = d.timezone || '—';

  document.getElementById('ip-loading').style.display = 'none';
  document.getElementById('ip-result').style.display = '';

  const ipInput = document.getElementById('cidr-ip');
  if (!ipInput.value) {
    ipInput.value = _myIP;
    calcCIDR();
  }
}

function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  return Array.from(code.toUpperCase())
    .map(c => String.fromCodePoint(0x1F1E0 - 65 + c.charCodeAt(0)))
    .join('');
}

function copyIP() {
  if (!_myIP) return;
  navigator.clipboard.writeText(_myIP).then(() => {
    const btn = document.getElementById('ip-copy-btn');
    btn.textContent = 'Copiato!';
    setTimeout(() => btn.textContent = 'Copia', 1800);
  });
}

/* ══════════════════════════════════════════
   CIDR CALCULATOR
══════════════════════════════════════════ */
function parseIPv4(str) {
  const parts = str.trim().split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  // re-validate cleanly
  for (let i = 0; i < 4; i++) {
    if (isNaN(nums[i]) || nums[i] < 0 || nums[i] > 255) return null;
    if (parts[i] === '' || parts[i].trim() !== String(nums[i])) return null;
  }
  return nums;
}

function intToIP(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function ipClass(firstOctet) {
  if (firstOctet < 128)  return 'A';
  if (firstOctet < 192)  return 'B';
  if (firstOctet < 224)  return 'C';
  if (firstOctet < 240)  return 'D (Multicast)';
  return 'E (Riservata)';
}

function isPrivate(parts) {
  const [a, b] = parts;
  return (a === 10) ||
         (a === 172 && b >= 16 && b <= 31) ||
         (a === 192 && b === 168) ||
         (a === 127) ||
         (a === 169 && b === 254);
}

function calcCIDR() {
  const ipStr  = document.getElementById('cidr-ip').value;
  const prefix = parseInt(document.getElementById('cidr-prefix-num').value, 10);

  const resultEl  = document.getElementById('cidr-result');
  const invalidEl = document.getElementById('cidr-invalid');

  if (!ipStr.trim()) {
    resultEl.style.display  = 'none';
    invalidEl.style.display = 'none';
    return;
  }

  const parts = parseIPv4(ipStr);
  if (!parts || isNaN(prefix) || prefix < 0 || prefix > 32) {
    resultEl.style.display  = 'none';
    invalidEl.style.display = '';
    return;
  }

  invalidEl.style.display = 'none';

  const ipInt       = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const maskInt     = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const networkInt  = (ipInt & maskInt) >>> 0;
  const bcastInt    = (networkInt | (~maskInt >>> 0)) >>> 0;
  const wildcardInt = (~maskInt) >>> 0;

  let firstInt, lastInt, usable;
  if (prefix === 32) {
    firstInt = lastInt = networkInt;
    usable = 1;
  } else if (prefix === 31) {
    firstInt = networkInt;
    lastInt  = bcastInt;
    usable   = 2;
  } else {
    firstInt = (networkInt + 1) >>> 0;
    lastInt  = (bcastInt  - 1) >>> 0;
    usable   = Math.pow(2, 32 - prefix) - 2;
  }

  const total = prefix === 32 ? 1 : Math.pow(2, 32 - prefix);

  const cls = ipClass(parts[0]);
  const priv = isPrivate(parts);

  const rows = [
    ['Indirizzo IP',        ipStr + ' / ' + prefix],
    ['Network',             intToIP(networkInt)],
    ['Broadcast',           prefix >= 31 ? 'N/A (/' + prefix + ')' : intToIP(bcastInt)],
    ['Primo host usabile',  intToIP(firstInt)],
    ['Ultimo host usabile', intToIP(lastInt)],
    ['Host usabili',        usable.toLocaleString('it-IT')],
    ['Indirizzi totali',    total.toLocaleString('it-IT')],
    ['Subnet mask',         intToIP(maskInt)],
    ['Wildcard mask',       intToIP(wildcardInt)],
    ['Classe IP',           cls],
    ['Tipo',                priv ? 'Privato' : 'Pubblico'],
  ];

  const tbody = document.getElementById('cidr-tbody');
  tbody.innerHTML = rows.map(([label, val], i) => {
    let display = val;
    if (label === 'Tipo') {
      display = priv
        ? '<span class="badge badge-private">Privato</span>'
        : '<span class="badge badge-public">Pubblico</span>';
    } else if (label === 'Classe IP') {
      display = '<span class="badge badge-class">' + val + '</span>';
    }
    return `<tr><td>${label}</td><td>${display}</td></tr>`;
  }).join('');

  // Binary representation
  const ipBits  = parts.flatMap(o => Array.from({length:8}, (_,i) => (o >> (7-i)) & 1));
  const binaryRow = document.getElementById('cidr-binary-row');
  binaryRow.innerHTML = [0,1,2,3].map(oct => {
    const bits = ipBits.slice(oct*8, oct*8+8).map((bit, i) => {
      const pos = oct * 8 + i;
      const cls = pos < prefix ? 'b-net' : 'b-host';
      return `<span class="${cls}">${bit}</span>`;
    }).join('');
    const sep = oct < 3 ? '<span class="oct-sep">.</span>' : '';
    return `<span class="oct">${bits}</span>${sep}`;
  }).join('');

  resultEl.style.display = '';
}

/* ── Sync slider ↔ number input ───────────────────────────── */
document.getElementById('cidr-prefix-range').addEventListener('input', function() {
  document.getElementById('cidr-prefix-num').value = this.value;
  calcCIDR();
});
document.getElementById('cidr-prefix-num').addEventListener('input', function() {
  let v = Math.max(0, Math.min(32, parseInt(this.value) || 0));
  document.getElementById('cidr-prefix-range').value = v;
  calcCIDR();
});

/* ── Debounce helper ──────────────────────────────────────── */
function debounce(fn, ms) {
  let t; return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}
document.getElementById('cidr-ip').addEventListener('input', debounce(calcCIDR, 280));

/* ── Subnet mask → CIDR converter ────────────────────────── */
function maskToCIDR(maskStr) {
  const parts = maskStr.trim().split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some(n => isNaN(n) || n < 0 || n > 255)) return null;
  const bin = nums.map(n => n.toString(2).padStart(8,'0')).join('');
  if (!/^1*0*$/.test(bin)) return null; // not a valid mask
  return bin.split('').filter(b => b === '1').length;
}
document.getElementById('cidr-mask').addEventListener('input', debounce(function() {
  const prefix = maskToCIDR(this.value);
  if (prefix !== null) {
    document.getElementById('cidr-prefix-num').value  = prefix;
    document.getElementById('cidr-prefix-range').value = prefix;
    calcCIDR();
  }
}, 280));

/* ── Init ─────────────────────────────────────────────────── */
loadMyIP();
calcCIDR();
