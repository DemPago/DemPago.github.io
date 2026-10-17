function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
const renderCVDebounced = debounce(renderCV, 180);

/* ── Sector roles ───────────────────────────────────────── */
const SECTOR_NAMES = {
  tech:'IT & Tecnologia', marketing:'Marketing & Comunicazione',
  finance:'Finanza & Contabilità', health:'Sanità & Medicina',
  education:'Istruzione & Formazione', engineering:'Ingegneria',
  legal:'Legale & Giuridico', sales:'Vendite & Commerciale',
  design:'Design & Creatività', hr:'Risorse Umane', other:'Altro',
};

const SECTOR_ROLES = {
  tech: ['Software Developer','Frontend Developer','Backend Developer','Full Stack Developer',
    'Data Analyst','Data Scientist','DevOps Engineer','Cloud Architect','Product Manager',
    'IT Service Manager','Service Manager','UX/UI Designer','Cybersecurity Analyst',
    'Machine Learning Engineer','Mobile Developer','QA Engineer','Technical Lead','CTO',
    'Solution Architect','Scrum Master',
    'Sviluppatore Software','Analista Dati','Architetto Cloud','Sviluppatore Mobile','Ingegnere QA'],
  marketing: ['Marketing Manager','Digital Marketing Specialist','Content Creator','SEO Specialist',
    'Social Media Manager','Brand Manager','Copywriter','Growth Hacker','Email Marketing Specialist',
    'Marketing Analyst','CMO','Campaign Manager','Performance Marketing Manager',
    'Responsabile Marketing','Specialista SEO','Creatore di Contenuti','Analista Marketing'],
  finance: ['Financial Analyst','Accountant','Controller','CFO','Investment Analyst',
    'Risk Manager','Auditor','Tax Consultant','Treasurer','Credit Analyst',
    'Analista Finanziario','Contabile','Revisore Contabile','Consulente Fiscale','Tesoriere'],
  health: ['Medical Doctor','Nurse','Physiotherapist','Psychologist','Pharmacist',
    'Surgeon','Clinical Researcher','Radiologist','Dentist','Nutritionist',
    'Medico','Infermiere','Fisioterapista','Psicologo','Farmacista','Chirurgo',
    'Ricercatore Clinico','Radiologo','Dentista','Nutrizionista'],
  education: ['Teacher','Professor','Trainer','Tutor','Lecturer',
    'Educational Coordinator','Researcher','Curriculum Designer','School Principal',
    'Insegnante','Professore','Formatore','Docente','Coordinatore Didattico',
    'Ricercatore','Dirigente Scolastico'],
  engineering: ['Civil Engineer','Mechanical Engineer','Electrical Engineer','Chemical Engineer',
    'Aerospace Engineer','Project Engineer','R&D Engineer','Process Engineer',
    'Structural Engineer','Systems Engineer',
    'Ingegnere Civile','Ingegnere Meccanico','Ingegnere Elettrico','Ingegnere Chimico',
    'Ingegnere Aerospaziale','Ingegnere di Processo','Ingegnere Strutturale'],
  legal: ['Lawyer','Legal Consultant','Notary','Paralegal','Compliance Officer',
    'Legal Counsel','In-House Counsel','Corporate Lawyer',
    'Avvocato','Consulente Legale','Notaio','Responsabile Compliance'],
  sales: ['Sales Manager','Account Manager','Business Development Manager','Sales Representative',
    'Key Account Manager','Sales Director','Inside Sales','Pre-Sales Consultant',
    'Direttore Commerciale','Responsabile Vendite','Agente Commerciale','Account Executive'],
  design: ['UX Designer','UI Designer','Graphic Designer','Motion Designer','Art Director',
    'Product Designer','Brand Designer','Creative Director','Photographer','Video Editor',
    'Illustrator','3D Designer',
    'Direttore Artistico','Grafico','Fotografo','Editor Video','Illustratore'],
  hr: ['HR Manager','Recruiter','HR Business Partner','HR Generalist',
    'L&D Manager','Compensation & Benefits Specialist','Employer Branding Specialist',
    'Talent Acquisition Specialist','People Operations Manager',
    'Responsabile HR','Selezionatore del Personale','Responsabile Formazione'],
  other: [],
};

const SECTOR_TITLES = {
  tech: ['Software Engineer','Senior Developer','Tech Lead','CTO','Product Manager','Data Scientist'],
  marketing: ['Marketing Manager','CMO','Brand Strategist','Digital Marketing Manager'],
  finance: ['CFO','Financial Controller','Investment Manager','Chief Accountant'],
  health: ['Medico Specialista','Primario','Direttore Sanitario','Responsabile Reparto'],
  education: ['Docente','Ricercatore','Dirigente Scolastico','Professore Associato'],
  engineering: ['Lead Engineer','Project Manager','R&D Manager','Chief Engineer'],
  legal: ['Senior Associate','Partner','General Counsel','Head of Legal'],
  sales: ['Sales Director','VP Sales','Head of Business Development','Chief Revenue Officer'],
  design: ['Creative Director','Head of Design','Design Lead','Chief Design Officer'],
  hr: ['HR Director','Chief People Officer','Head of Talent','VP People'],
  other: [],
};

/* ── Onboarding ─────────────────────────────────────────── */
function openOnboarding() {
  document.getElementById('obOverlay').classList.add('visible');
}
function skipOnboarding() {
  document.getElementById('obOverlay').classList.remove('visible');
}
function confirmOnboarding() {
  const nome    = document.getElementById('ob-nome').value.trim();
  const cognome = document.getElementById('ob-cognome').value.trim();
  const sector  = document.getElementById('ob-sector').value;
  if (nome)    { const el = document.getElementById('f-nome');    el.value = nome[0].toUpperCase() + nome.slice(1); }
  if (cognome) { const el = document.getElementById('f-cognome'); el.value = cognome[0].toUpperCase() + cognome.slice(1); }
  if (sector)  setSector(sector);
  skipOnboarding();
  renderCV();
}
function setSector(key) {
  if (!key) return;
  state.sector = key;
  // Update badge
  const badge = document.getElementById('sectorBadge');
  const label = document.getElementById('sectorLabel');
  if (badge && label) { label.textContent = SECTOR_NAMES[key] || key; badge.style.display = 'inline-flex'; }
  // Reset datalists to full list
  refreshDatalist('sector-roles-list',  SECTOR_ROLES[key]  || []);
  refreshDatalist('sector-titles-list', SECTOR_TITLES[key] || []);
}

function refreshDatalist(id, items) {
  const dl = document.getElementById(id);
  if (dl) dl.innerHTML = items.map(r => `<option value="${r}">`).join('');
}

function onRoleInput(input) {
  const items = SECTOR_ROLES[state.sector] || [];
  const val = input.value.toLowerCase();
  const filtered = val ? items.filter(r => r.toLowerCase().includes(val)) : items;
  refreshDatalist('sector-roles-list', filtered);
  renderCV();
}

function onTitleInput(input) {
  const items = SECTOR_TITLES[state.sector] || [];
  const val = input.value.toLowerCase();
  const filtered = val ? items.filter(t => t.toLowerCase().includes(val)) : items;
  refreshDatalist('sector-titles-list', filtered);
  renderCV();
}

/* ── State ─────────────────────────────────────────────── */
const THEMES = [
  { name: 'Navy',     primary: '#0f3460', header: '#1a1a2e', headerGrad: '#16213e', badgeBg: 'rgba(15,52,96,0.12)'   },
  { name: 'Foresta',  primary: '#1a6b4a', header: '#0d2e1e', headerGrad: '#0a2416', badgeBg: 'rgba(26,107,74,0.12)'  },
  { name: 'Bordeaux', primary: '#7b1c3a', header: '#2e0d18', headerGrad: '#200910', badgeBg: 'rgba(123,28,58,0.12)'  },
  { name: 'Ardesia',  primary: '#374151', header: '#111827', headerGrad: '#1f2937', badgeBg: 'rgba(55,65,81,0.12)'   },
  { name: 'Rame',     primary: '#92400e', header: '#1c0a00', headerGrad: '#2d1200', badgeBg: 'rgba(146,64,14,0.12)'  },
  { name: 'Viola',    primary: '#4c1d95', header: '#1e0a3c', headerGrad: '#2d1060', badgeBg: 'rgba(76,29,149,0.12)'  },
];

const state = {
  photo: null,
  skills: [],
  theme: THEMES[0],
};

/* ── Entry counters ────────────────────────────────────── */
let expCount = 0, eduCount = 0, langCount = 0,
    certCount = 0, projCount = 0, volCount = 0,
    pubCount = 0, awardCount = 0;

/* ── Add entry ─────────────────────────────────────────── */
function addEntry(type) {
  const configs = {
    exp: {
      counter: () => expCount++,
      fields: `
        <div class="cv-row2">
          <div class="cv-field"><label>Ruolo *</label><input type="text" placeholder="Senior Dev" list="sector-roles-list" oninput="onRoleInput(this)"></div>
          <div class="cv-field"><label>Azienda *</label><input type="text" placeholder="Acme Srl" oninput="renderCVDebounced()"></div>
        </div>
        <div class="cv-row2">
          <div class="cv-field"><label>Da</label><input type="month" oninput="renderCVDebounced()"></div>
          <div class="cv-field to-field">
            <label>A</label>
            <input type="month" oninput="renderCVDebounced()">
            <label class="present-label"><input type="checkbox" class="present-check" onchange="togglePresent(this)"> <span>Attuale</span></label>
          </div>
        </div>
        <div class="cv-field"><label>Descrizione</label><textarea placeholder="Attivita svolte, risultati, tecnologie..." oninput="renderCVDebounced()"></textarea></div>`,
    },
    edu: {
      counter: () => eduCount++,
      fields: `
        <div class="cv-row2">
          <div class="cv-field"><label>Titolo *</label><input type="text" placeholder="Laurea Magistrale in Informatica" oninput="renderCVDebounced()"></div>
          <div class="cv-field"><label>Istituto *</label><input type="text" placeholder="Universita di Bologna" oninput="renderCVDebounced()"></div>
        </div>
        <div class="cv-row2">
          <div class="cv-field"><label>Da</label><input type="month" oninput="renderCVDebounced()"></div>
          <div class="cv-field to-field">
            <label>A</label>
            <input type="month" oninput="renderCVDebounced()">
            <label class="present-label"><input type="checkbox" class="present-check" onchange="togglePresent(this)"> <span>In corso</span></label>
          </div>
        </div>
        <div class="cv-field"><label>Note</label><textarea placeholder="Voto, tesi, specializzazione..." oninput="renderCVDebounced()"></textarea></div>`,
    },
    proj: {
      counter: () => projCount++,
      fields: `
        <div class="cv-row2">
          <div class="cv-field"><label>Nome progetto *</label><input type="text" placeholder="App meteo" oninput="renderCVDebounced()"></div>
          <div class="cv-field"><label>Ruolo</label><input type="text" placeholder="Lead Developer" oninput="renderCVDebounced()"></div>
        </div>
        <div class="cv-row2">
          <div class="cv-field"><label>Da</label><input type="month" oninput="renderCVDebounced()"></div>
          <div class="cv-field to-field">
            <label>A</label>
            <input type="month" oninput="renderCVDebounced()">
            <label class="present-label"><input type="checkbox" class="present-check" onchange="togglePresent(this)"> <span>In corso</span></label>
          </div>
        </div>
        <div class="cv-field"><label>Descrizione</label><textarea placeholder="Di cosa si tratta, tecnologie usate, impatto..." oninput="renderCVDebounced()"></textarea></div>
        <div class="cv-field"><label>Link (opzionale)</label><input type="text" placeholder="https://github.com/..." oninput="validateUrl(this)"><span class="field-hint">Deve iniziare con http:// o https://</span></div>`,
    },
    vol: {
      counter: () => volCount++,
      fields: `
        <div class="cv-row2">
          <div class="cv-field"><label>Ruolo *</label><input type="text" placeholder="Tutor volontario" oninput="renderCVDebounced()"></div>
          <div class="cv-field"><label>Organizzazione *</label><input type="text" placeholder="Croce Rossa" oninput="renderCVDebounced()"></div>
        </div>
        <div class="cv-row2">
          <div class="cv-field"><label>Da</label><input type="month" oninput="renderCVDebounced()"></div>
          <div class="cv-field to-field">
            <label>A</label>
            <input type="month" oninput="renderCVDebounced()">
            <label class="present-label"><input type="checkbox" class="present-check" onchange="togglePresent(this)"> <span>Attuale</span></label>
          </div>
        </div>
        <div class="cv-field"><label>Descrizione</label><textarea placeholder="Attivita svolte, impatto..." oninput="renderCVDebounced()"></textarea></div>`,
    },
    pub: {
      counter: () => pubCount++,
      fields: `
        <div class="cv-field"><label>Titolo *</label><input type="text" placeholder="Machine Learning applicato al..." oninput="renderCVDebounced()"></div>
        <div class="cv-row2">
          <div class="cv-field"><label>Editore / Rivista</label><input type="text" placeholder="IEEE / O'Reilly" oninput="renderCVDebounced()"></div>
          <div class="cv-field"><label>Anno</label><input type="text" placeholder="2024" oninput="renderCVDebounced()"></div>
        </div>
        <div class="cv-field"><label>Link (opzionale)</label><input type="text" placeholder="https://doi.org/..." oninput="validateUrl(this)"><span class="field-hint">Deve iniziare con http:// o https://</span></div>`,
    },
    lang: {
      counter: () => langCount++,
      fields: `
        <div class="cv-row2">
          <div class="cv-field"><label>Lingua *</label><input type="text" placeholder="Inglese" oninput="renderCVDebounced()"></div>
          <div class="cv-field"><label>Livello</label><select onchange="renderCV()"><option value="">— Seleziona —</option><option>Madrelingua</option><option>C2 – Padronanza</option><option>C1 – Efficacia</option><option>B2 – Autonomia</option><option>B1 – Soglia</option><option>A2 – Sopravvivenza</option><option>A1 – Contatto</option></select></div>
        </div>`,
    },
    cert: {
      counter: () => certCount++,
      fields: `
        <div class="cv-field"><label>Nome certificazione *</label><input type="text" placeholder="AWS Solutions Architect" oninput="renderCVDebounced()"></div>
        <div class="cv-row2">
          <div class="cv-field"><label>Ente</label><input type="text" placeholder="Amazon Web Services" oninput="renderCVDebounced()"></div>
          <div class="cv-field"><label>Anno</label><input type="text" placeholder="2024" oninput="renderCVDebounced()"></div>
        </div>`,
    },
    award: {
      counter: () => awardCount++,
      fields: `
        <div class="cv-field"><label>Premio / Riconoscimento *</label><input type="text" placeholder="Best Innovation Award" oninput="renderCVDebounced()"></div>
        <div class="cv-row2">
          <div class="cv-field"><label>Organizzazione</label><input type="text" placeholder="Google DevFest" oninput="renderCVDebounced()"></div>
          <div class="cv-field"><label>Anno</label><input type="text" placeholder="2023" oninput="renderCVDebounced()"></div>
        </div>
        <div class="cv-field"><label>Descrizione (opzionale)</label><textarea placeholder="Motivazione del riconoscimento..." oninput="renderCVDebounced()" style="min-height:50px"></textarea></div>`,
    },
  };

  const cfg = configs[type];
  if (!cfg) return;
  const id = `${type}-${cfg.counter()}`;
  const div = document.createElement('div');
  div.className = 'entry-card';
  div.id = id;
  div.innerHTML = `
    <button class="entry-remove" onclick="removeEl('${id}');renderCV()" title="Rimuovi">&times;</button>
    ${cfg.fields}
  `;
  document.getElementById(`${type}-list`).appendChild(div);
  // Auto-open accordion for this section
  const acc = document.getElementById(`acc-${type}`);
  if (acc) acc.classList.add('acc-open');
  renderCV();
}

function removeEl(id) { document.getElementById(id)?.remove(); }

/* ── Theme selector ────────────────────────────────────── */
function setTheme(idx) {
  state.theme = THEMES[idx];
  document.querySelectorAll('.theme-swatch').forEach((s, i) =>
    s.classList.toggle('active', i === idx));
  renderCV();
}

function buildSwatches() {
  const wrap = document.getElementById('theme-swatches');
  THEMES.forEach((t, i) => {
    const btn = document.createElement('button');
    btn.className = 'theme-swatch' + (i === 0 ? ' active' : '');
    btn.title = t.name;
    btn.style.background = `linear-gradient(135deg, ${t.header}, ${t.primary})`;
    btn.setAttribute('aria-label', `Tema ${t.name}`);
    btn.onclick = () => setTheme(i);
    wrap.appendChild(btn);
  });
}

/* ── Tags (skills) ─────────────────────────────────────── */
function addTag(e, _listId) {
  if (e.key !== 'Enter' && e.key !== ',') return;
  e.preventDefault();
  const input = document.getElementById('skill-input');
  const val = input.value.trim().replace(/,$/, '');
  if (!val) return;
  state.skills.push(val);
  input.value = '';
  renderTags();
  renderCV();
}

function removeTag(idx) {
  state.skills.splice(idx, 1);
  renderTags();
  renderCV();
}

function renderTags() {
  const wrap = document.getElementById('skills-wrap');
  const input = document.getElementById('skill-input');
  wrap.querySelectorAll('.skill-tag').forEach(t => t.remove());
  state.skills.forEach((s, i) => {
    const tag = document.createElement('span');
    tag.className = 'skill-tag';
    tag.innerHTML = `${s}<button onclick="removeTag(${i})" title="Rimuovi">&times;</button>`;
    wrap.insertBefore(tag, input);
  });
}

/* ── Collect entries from a list ───────────────────────── */
function collectEntries(listId, fields) {
  const cards = document.querySelectorAll(`#${listId} .entry-card`);
  return Array.from(cards).map(card => {
        const inputs = card.querySelectorAll('input:not([type="checkbox"]), textarea, select');
    const obj = {};
    fields.forEach((f, i) => { obj[f] = inputs[i]?.value.trim() || ''; });
    const presentCheck = card.querySelector('.present-check');
    if (presentCheck?.checked) obj.to = 'Presente';
    return obj;
  });
}

/* ── Format YYYY-MM → "Mmm YYYY" ───────────────────────── */
const IT_MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
function formatMonth(val) {
  if (!val || val === 'Presente') return val;
  const parts = val.split('-');
  if (parts.length === 2) {
    const m = parseInt(parts[1]) - 1;
    if (m >= 0 && m < 12) return `${IT_MONTHS[m]} ${parts[0]}`;
  }
  return val;
}

/* ── Toggle "Attuale" checkbox ─────────────────────────── */
function togglePresent(cb) {
  const toInput = cb.closest('.to-field')?.querySelector('input[type="month"]');
  if (toInput) toInput.disabled = cb.checked;
  renderCV();
}

/* ── Input helpers ──────────────────────────────────────── */
function capFirst(el) {
  if (el.value) el.value = el.value.charAt(0).toUpperCase() + el.value.slice(1);
  renderCV();
}

function validateEmail(el) {
  const v = el.value.trim();
  el.classList.toggle('input-error', !!v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  renderCV();
}

function validateUrl(el) {
  const v = el.value.trim();
  el.classList.toggle('input-error', !!v && !/^https?:\/\/.+/.test(v));
  renderCV();
}

/* ── Language flags ─────────────────────────────────────── */
const LANG_FLAGS = {
  'italiano':'🇮🇹','italian':'🇮🇹','inglese':'🇬🇧','english':'🇬🇧',
  'americano':'🇺🇸','american english':'🇺🇸','francese':'🇫🇷','french':'🇫🇷',
  'tedesco':'🇩🇪','german':'🇩🇪','deutsch':'🇩🇪','spagnolo':'🇪🇸','spanish':'🇪🇸',
  'portoghese':'🇵🇹','portuguese':'🇵🇹','cinese':'🇨🇳','chinese':'🇨🇳','mandarino':'🇨🇳',
  'giapponese':'🇯🇵','japanese':'🇯🇵','arabo':'🇸🇦','arabic':'🇸🇦',
  'russo':'🇷🇺','russian':'🇷🇺','olandese':'🇳🇱','dutch':'🇳🇱',
  'svedese':'🇸🇪','swedish':'🇸🇪','norvegese':'🇳🇴','norwegian':'🇳🇴',
  'danese':'🇩🇰','danish':'🇩🇰','finlandese':'🇫🇮','finnish':'🇫🇮',
  'polacco':'🇵🇱','polish':'🇵🇱','turco':'🇹🇷','turkish':'🇹🇷',
  'coreano':'🇰🇷','korean':'🇰🇷','hindi':'🇮🇳','greco':'🇬🇷','greek':'🇬🇷',
  'ucraino':'🇺🇦','ukrainian':'🇺🇦','rumeno':'🇷🇴','romanian':'🇷🇴',
  'ungherese':'🇭🇺','hungarian':'🇭🇺','ceco':'🇨🇿','czech':'🇨🇿',
  'bulgaro':'🇧🇬','bulgarian':'🇧🇬','croato':'🇭🇷','croatian':'🇭🇷',
  'albanese':'🇦🇱','albanian':'🇦🇱','ebraico':'🇮🇱','hebrew':'🇮🇱',
  'vietnamita':'🇻🇳','vietnamese':'🇻🇳','tailandese':'🇹🇭','thai':'🇹🇭',
  'persiano':'🇮🇷','farsi':'🇮🇷','persian':'🇮🇷','swahili':'🇰🇪',
};

function v(id) { return document.getElementById(id)?.value.trim() || ''; }

/* ── Build CV HTML ─────────────────────────────────────── */
function renderCV() {
  const nome    = v('f-nome');
  const cognome = v('f-cognome');
  const fullName = [nome, cognome].filter(Boolean).join(' ') || 'Il tuo nome';

  const contacts = [
    v('f-email')    && `<span class="cv-contact-item">✉ ${v('f-email')}</span>`,
    v('f-tel')      && `<span class="cv-contact-item">☎ ${v('f-tel')}</span>`,
    v('f-citta')    && `<span class="cv-contact-item">📍 ${v('f-citta')}</span>`,
    v('f-linkedin') && `<span class="cv-contact-item">in ${v('f-linkedin')}</span>`,
    v('f-sito')     && `<span class="cv-contact-item">🌐 ${v('f-sito')}</span>`,
  ].filter(Boolean).join('');

  /* -- raccolta dati -- */
  const experiences = collectEntries('exp-list',   ['role','company','from','to','desc']);
  const educations  = collectEntries('edu-list',   ['degree','school','from','to','note']);
  const projects    = collectEntries('proj-list',  ['name','role','from','to','desc','link']);
  const volunteer   = collectEntries('vol-list',   ['role','org','from','to','desc']);
  const pubs        = collectEntries('pub-list',   ['title','publisher','year','link']);
  const languages   = collectEntries('lang-list',  ['lang','level']);
  const certs       = collectEntries('cert-list',  ['name','issuer','year']);
  const awards      = collectEntries('award-list', ['name','org','year','desc']);

  /* -- helper: sezione con entries standard -- */
  function entrySection(head, items, renderFn) {
    if (!items.length) return '';
    return `<div class="cv-section">
      <div class="cv-section-head">${head}</div>
      ${items.map(renderFn).join('')}
    </div>`;
  }

  /* -- render helpers -- */
  const renderExp = e => {
    const period = [formatMonth(e.from), formatMonth(e.to)].filter(Boolean).join(' – ');
    return `<div class="cv-entry">
      <div class="cv-entry-header">
        <span class="cv-entry-title">${e.role || '<em>Ruolo</em>'}</span>
        <span class="cv-entry-period">${period}</span>
      </div>
      ${e.company ? `<div class="cv-entry-sub">${e.company}</div>` : ''}
      ${e.desc    ? `<div class="cv-entry-desc">${e.desc.replace(/\n/g,'<br>')}</div>` : ''}
    </div>`;
  };

  const renderEdu = e => {
    const period = [formatMonth(e.from), formatMonth(e.to)].filter(Boolean).join(' – ');
    return `<div class="cv-entry">
      <div class="cv-entry-header">
        <span class="cv-entry-title">${e.degree || '<em>Titolo</em>'}</span>
        <span class="cv-entry-period">${period}</span>
      </div>
      ${e.school ? `<div class="cv-entry-sub">${e.school}</div>` : ''}
      ${e.note   ? `<div class="cv-entry-desc">${e.note}</div>` : ''}
    </div>`;
  };

  const renderProj = e => {
    const period = [formatMonth(e.from), formatMonth(e.to)].filter(Boolean).join(' – ');
    return `<div class="cv-entry">
      <div class="cv-entry-header">
        <span class="cv-entry-title">${e.name || '<em>Progetto</em>'}</span>
        <span class="cv-entry-period">${period}</span>
      </div>
      ${e.role ? `<div class="cv-entry-sub">${e.role}</div>` : ''}
      ${e.desc ? `<div class="cv-entry-desc">${e.desc.replace(/\n/g,'<br>')}</div>` : ''}
      ${e.link ? `<div class="cv-entry-link">${e.link}</div>` : ''}
    </div>`;
  };

  const renderVol = e => {
    const period = [formatMonth(e.from), formatMonth(e.to)].filter(Boolean).join(' – ');
    return `<div class="cv-entry">
      <div class="cv-entry-header">
        <span class="cv-entry-title">${e.role || '<em>Ruolo</em>'}</span>
        <span class="cv-entry-period">${period}</span>
      </div>
      ${e.org  ? `<div class="cv-entry-sub">${e.org}</div>` : ''}
      ${e.desc ? `<div class="cv-entry-desc">${e.desc.replace(/\n/g,'<br>')}</div>` : ''}
    </div>`;
  };

  const renderPub = e => `
    <div class="cv-entry">
      <div class="cv-entry-header">
        <span class="cv-entry-title" style="font-size:0.82rem">${e.title || '<em>Titolo</em>'}</span>
        <span class="cv-entry-period">${e.year}</span>
      </div>
      ${e.publisher ? `<div class="cv-entry-sub">${e.publisher}</div>` : ''}
      ${e.link      ? `<div class="cv-entry-link">${e.link}</div>` : ''}
    </div>`;

  const renderCert = e => `
    <div class="cv-cert-item">
      <div class="cv-cert-name">${e.name || '<em>Certificazione</em>'}</div>
      <div class="cv-cert-meta">${[e.issuer, e.year].filter(Boolean).join(' · ')}</div>
    </div>`;

  const renderAward = e => `
    <div class="cv-award-item">
      <div class="cv-award-name">${e.name || '<em>Premio</em>'}</div>
      <div class="cv-award-meta">${[e.org, e.year].filter(Boolean).join(' · ')}</div>
      ${e.desc ? `<div class="cv-entry-desc" style="margin-top:0.2rem">${e.desc}</div>` : ''}
    </div>`;

  /* -- skills & languages -- */
  const skillsHTML = state.skills.length
    ? `<div class="cv-skills-list">${state.skills.map(s =>
        `<span class="cv-skill-badge" style="background:${state.theme.badgeBg};color:${state.theme.primary}">${s}</span>`
      ).join('')}</div>`
    : '';

  const langHTML = languages.length
    ? languages.map(l => {
        const flag = LANG_FLAGS[l.lang.toLowerCase().trim()] || '';
        return `
        <div class="cv-lang-item">
          <span class="cv-lang-name">${flag ? flag + ' ' : ''}${l.lang}</span>
          <span class="cv-lang-level">${l.level}</span>
        </div>`;
      }).join('')
    : '';

  const profilo = v('f-profilo');

  /* -- assemble -- */
  const tpl = document.getElementById('cv-template');
  tpl.style.cssText = `
    --cv-primary: ${state.theme.primary};
    --cv-header: ${state.theme.header};
    --cv-header-grad: ${state.theme.headerGrad};
  `;
  tpl.innerHTML = `
    <div class="cv-header-block">
      ${state.photo ? `<img class="cv-photo" src="${state.photo}" alt="Foto" style="display:block">` : ''}
      <div class="cv-name-block">
        <h1>${fullName}</h1>
        ${v('f-titolo') ? `<div class="cv-title">${v('f-titolo')}</div>` : ''}
      </div>
    </div>
    ${contacts ? `<div class="cv-contact-bar">${contacts}</div>` : ''}
    <div class="cv-body">
      <div class="cv-main-col">
        ${profilo ? `<div class="cv-section"><div class="cv-section-head">Profilo</div><div class="cv-profile-text">${profilo.replace(/\n/g,'<br>')}</div></div>` : ''}
        ${entrySection('Esperienza', experiences, renderExp)}
        ${entrySection('Istruzione', educations, renderEdu)}
        ${entrySection('Progetti', projects, renderProj)}
        ${entrySection('Volontariato', volunteer, renderVol)}
        ${entrySection('Pubblicazioni', pubs, renderPub)}
      </div>
      <div class="cv-side-col">
        ${skillsHTML ? `<div class="cv-section"><div class="cv-section-head">Competenze</div>${skillsHTML}</div>` : ''}
        ${langHTML   ? `<div class="cv-section"><div class="cv-section-head">Lingue</div>${langHTML}</div>` : ''}
        ${entrySection('Certificazioni', certs, renderCert)}
        ${entrySection('Premi', awards, renderAward)}
      </div>
    </div>
  `;

  scalePreview();
  saveToStorage();
}

/* ── LocalStorage ───────────────────────────────────────── */
const STORAGE_KEY = 'cv_data_v1';

function showToast(msg) {
  let toast = document.getElementById('cv-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cv-toast';
    toast.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#1c2128;border:1px solid #30363d;color:#e6edf3;padding:0.7rem 1.2rem;border-radius:8px;font-size:0.85rem;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.4);max-width:90vw;text-align:center;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.display = 'none'; }, 5000);
}

function saveToStorage() {
  const data = {
    fields: {},
    skills: state.skills,
    themeIdx: THEMES.indexOf(state.theme),
    sector: state.sector || null,
    entries: {}
  };
  ['f-nome','f-cognome','f-titolo','f-email','f-tel','f-citta','f-linkedin','f-sito','f-profilo']
    .forEach(id => { const el = document.getElementById(id); if (el) data.fields[id] = el.value; });
  ['exp','edu','proj','vol','pub','lang','cert','award'].forEach(type => {
    const list = document.getElementById(`${type}-list`);
    if (!list) return;
    data.entries[type] = Array.from(list.querySelectorAll('.entry-card')).map(card => ({
      vals: Array.from(card.querySelectorAll('input:not([type="checkbox"]), textarea, select')).map(i => i.value),
      present: card.querySelector('.present-check')?.checked || false
    }));
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) {
    showToast('⚠️ Salvataggio automatico non riuscito. Usa Esporta dati per fare un backup completo.');
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.themeIdx >= 0 && data.themeIdx < THEMES.length) state.theme = THEMES[data.themeIdx];
    if (Array.isArray(data.skills)) state.skills = data.skills;
    if (data.sector) state.sector = data.sector;
    ['exp','edu','proj','vol','pub','lang','cert','award'].forEach(type => {
      const entries = data.entries?.[type];
      if (!entries?.length) return;
      entries.forEach(() => addEntry(type));
      const cards = document.getElementById(`${type}-list`)?.querySelectorAll('.entry-card');
      entries.forEach((entry, i) => {
        const card = cards?.[i]; if (!card) return;
    const inputs = card.querySelectorAll('input:not([type="checkbox"]), textarea, select');
        entry.vals.forEach((val, j) => { if (inputs[j]) inputs[j].value = val; });
        const check = card.querySelector('.present-check');
        if (check && entry.present) { check.checked = true; check.dispatchEvent(new Event('change')); }
      });
      // Open accordion for sections that have data
      document.getElementById(`acc-${type}`)?.classList.add('acc-open');
    });
    if (data.fields) Object.entries(data.fields).forEach(([id, val]) => {
      const el = document.getElementById(id); if (el) el.value = val;
    });
    return true;
  } catch(e) { return false; }
}

function resetCV() {
  const overlay = document.getElementById('cvResetOverlay');
  if (overlay) { overlay.style.display = 'flex'; }
}

function exportJSON() {
  saveToStorage();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const nome    = document.getElementById('f-nome')?.value    || 'CV';
  const cognome = document.getElementById('f-cognome')?.value || '';
  const filename = `CV_${[nome, cognome].filter(Boolean).join('_').replace(/\s+/g,'_')}.json`;
  const blob = new Blob([raw], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function importJSON() {
  document.getElementById('json-import-input').click();
}

function handleJSONImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      // Basic validation: must have fields or entries
      if (!data.fields && !data.entries) throw new Error('Formato non valido');
      if (!confirm('Sovrascrivere i dati attuali con quelli del file importato?')) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      location.reload();
    } catch(err) {
      alert('File non valido. Assicurati di importare un file JSON esportato da questo strumento.');
    }
  };
  reader.readAsText(file);
  // Reset input so the same file can be re-imported if needed
  e.target.value = '';
}

function downloadTemplate() {
  const template = {
    fields: {
      "f-nome":     "Mario",
      "f-cognome":  "Rossi",
      "f-titolo":   "Software Engineer",
      "f-email":    "mario.rossi@email.com",
      "f-tel":      "+39 333 1234567",
      "f-citta":    "Milano",
      "f-linkedin": "https://linkedin.com/in/mario-rossi",
      "f-sito":     "https://mariorossi.dev",
      "f-profilo":  "Sviluppatore con 5 anni di esperienza su tecnologie web e cloud. Appassionato di open source e architetture scalabili."
    },
    photo: null,
    skills: ["JavaScript", "React", "Node.js", "Docker", "AWS"],
    themeIdx: 0,
    sector: null,
    entries: {
      exp: [
        { vals: ["Software Engineer", "Acme S.p.A.", "2022-01", "2024-06", "Sviluppo e manutenzione del frontend React e delle API REST Node.js. Deploy su AWS con pipeline CI/CD."], present: false },
        { vals: ["Junior Developer", "Startup XYZ", "2019-06", "2021-12", "Sviluppo funzionalità full stack con Vue.js e Laravel."], present: false }
      ],
      edu: [
        { vals: ["Laurea Magistrale in Informatica", "Università La Sapienza", "2017-09", "2019-03", "110/110 con lode — tesi su architetture microservizi"], present: false }
      ],
      proj: [
        { vals: ["Portfolio Website", "Sviluppatore principale", "2023-01", "2023-03", "Sito portfolio personale in Next.js, deploy su Vercel.", "https://mariorossi.dev"], present: false }
      ],
      vol: [
        { vals: ["Mentore", "CoderDojo Italia", "2021-01", "", "Insegnamento della programmazione a ragazzi 8-14 anni."], present: true }
      ],
      pub: [
        { vals: ["Come strutturare un monorepo nel 2024", "Medium", "2024", "https://medium.com/@mario-rossi/monorepo-2024"], present: false }
      ],
      lang: [
        { vals: ["Inglese", "C1 – Efficacia"], present: false },
        { vals: ["Spagnolo", "B1 – Soglia"], present: false }
      ],
      cert: [
        { vals: ["AWS Solutions Architect Associate", "Amazon Web Services", "2023"], present: false }
      ],
      award: [
        { vals: ["Best Innovation Award", "Google DevFest Milano", "2022", "Riconoscimento per il progetto open source più innovativo della competizione."], present: false }
      ]
    }
  };
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'CV_template.json'; a.click();
  URL.revokeObjectURL(url);
}

/* ── Scale preview to fit container ────────────────────── */
function scalePreview() {
  const wrap   = document.getElementById('previewWrap');
  const scaler = document.getElementById('previewScaler');
  const tpl    = document.getElementById('cv-template');
  const W = 794;
  const available = wrap.clientWidth;
  if (!available) return;
  const scale = available / W;
  const templateH = tpl.offsetHeight || 1123;
  scaler.style.transform = `scale(${scale})`;
  scaler.style.height = `${templateH * scale}px`;
  wrap.style.height   = `${templateH * scale}px`;
  wrap.style.aspectRatio = 'unset';

  // Mostra la linea "Pagina 2" solo se il contenuto sfora l'A4
  const breakLine = document.getElementById('pageBreakLine');
  if (breakLine) breakLine.style.display = templateH > 1130 ? 'block' : 'none';
}

window.addEventListener('resize', scalePreview);

/* ── Photo upload ───────────────────────────────────────── */
document.getElementById('photoInput').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    state.photo = e.target.result;
    document.getElementById('photoPreview').src = e.target.result;
    document.getElementById('photoPreview').style.display = 'block';
    document.getElementById('photoPlaceholder').style.display = 'none';
    renderCV();
  };
  reader.readAsDataURL(file);
});

/* ── PDF Download ───────────────────────────────────────── */
async function downloadPDF() {
  const btn = document.getElementById('downloadBtn');
  btn.disabled = true;
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generazione PDF…`;
  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  try {
    const { jsPDF } = window.jspdf;
    const template  = document.getElementById('cv-template');
    const scaler    = document.getElementById('previewScaler');
    const oldTransform = scaler.style.transform;
    scaler.style.transform = 'scale(1)';

    const canvas = await html2canvas(template, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
    });

    scaler.style.transform = oldTransform;

    const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgH = pdfW * (canvas.height / canvas.width);

    if (imgH <= pdfH + 0.5) { // +0.5mm tolerance for floating-point/subpixel rounding
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, Math.min(imgH, pdfH));
    } else {
      const pxPerPage = (canvas.width * pdfH) / pdfW;
      let yOffset = 0;
      while (yOffset < canvas.height) {
        const sliceH = Math.min(pxPerPage, canvas.height - yOffset);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width  = canvas.width;
        pageCanvas.height = sliceH;
        pageCanvas.getContext('2d').drawImage(
          canvas,
          0, yOffset,              // source x, y
          canvas.width, sliceH,    // source width, height
          0, 0,                    // dest x, y
          canvas.width, sliceH     // dest width, height
        );
        if (yOffset > 0) pdf.addPage();
        // Scale the slice to fill the page width; preserve aspect ratio on last page
        const renderedH = pdfW * (sliceH / canvas.width);
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdfW, renderedH);
        yOffset += pxPerPage;
      }
    }

    const nome    = v('f-nome')    || 'curriculum';
    const cognome = v('f-cognome') || '';
    pdf.save(`CV_${nome}_${cognome}.pdf`.replace(/\s+/g, '_'));

  } catch (err) {
    console.error('Errore PDF:', err);
    alert('Errore nella generazione del PDF. Riprova.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Scarica PDF`;
  }
}

/* ── Init ───────────────────────────────────────────────── */
buildSwatches();
const restored = loadFromStorage();
if (!restored) {
  addEntry('exp');
  addEntry('edu');
  addEntry('lang');
  // First visit: show onboarding after a short delay
  setTimeout(openOnboarding, 350);
}
if (restored) {
  // Re-sync theme swatches and skill tags after restore
  const themeIdx = THEMES.indexOf(state.theme);
  document.querySelectorAll('.theme-swatch').forEach((s, i) => s.classList.toggle('active', i === themeIdx));
  renderTags();
  if (state.photo) {
    const img = document.getElementById('photo-preview');
    if (img) { img.src = state.photo; img.style.display = 'block'; }
  }
  if (state.sector) setSector(state.sector);
}
renderCV();
// Ensure preview is correctly scaled after first paint
requestAnimationFrame(scalePreview);
