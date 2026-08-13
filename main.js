// Firebase Counter
async function initCounter() {
  try {
    const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const { getFirestore, doc, runTransaction } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

    const firebaseConfig = {
      apiKey: "AIzaSyA7YbK9xW2OiGXZu55mvlTLSw2enQf4Efg",
      authDomain: "blog-a5907.firebaseapp.com",
      projectId: "blog-a5907",
      storageBucket: "blog-a5907.firebasestorage.app",
      messagingSenderId: "271024686592",
      appId: "1:271024686592:web:6e5609f3a841cb2cf77ae5"
    };

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const result = await runTransaction(db, async (t) => {
      const docRef = doc(db, "counters", "blog");
      const docSnap = await t.get(docRef);
      if (!docSnap.exists()) {
        t.set(docRef, { count: 1 });
        return 1;
      }
      const newCount = docSnap.data().count + 1;
      t.update(docRef, { count: newCount });
      return newCount;
    });

    const counter = document.getElementById("counter");
    if (counter) {
      counter.innerText = result < 10 ? "0" + result : result;
    }
  } catch (e) {
    const counter = document.getElementById("counter");
    if (counter) counter.innerText = "--";
  }
}

// Loader hide — nasconde al DOMContentLoaded, non al window.load
// (window.load aspetta tutte le immagini — troppo tardi su pagine pesanti)
function initLoader() {
  const hide = () => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  };
  // DOMContentLoaded è già scattato quando siamo qui (chiamato da DOMContentLoaded)
  hide();
}

// Back to top
function initBackToTop() {
  window.addEventListener('scroll', () => {
    const btn = document.getElementById('backToTop');
    if (btn) {
      btn.classList.toggle('visible', window.scrollY > 300);
    }
  });

  const btn = document.getElementById('backToTop');
  if (btn) {
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// Progress bar
function initProgressBar() {
  window.addEventListener('scroll', function() {
    const progress = document.getElementById("progress");
    if (progress) {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      progress.style.width = height > 0 ? (winScroll / height) * 100 + "%" : "0%";
    }
  });
}

// Copy button for code blocks
function initCopyButtons() {
  document.querySelectorAll('.post-content pre, .esempio-tech pre').forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.innerText = 'Copia';
    btn.onclick = () => {
      const code = pre.querySelector('code');
      if (code) {
        navigator.clipboard.writeText(code.innerText)
          .then(() => {
            btn.innerText = 'Copiato!';
            btn.classList.add('copied');
            setTimeout(() => {
              btn.innerText = 'Copia';
              btn.classList.remove('copied');
            }, 2000);
          })
          .catch(() => {
            btn.innerText = 'Errore';
            setTimeout(() => { btn.innerText = 'Copia'; }, 2000);
          });
      }
    };
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
}

// Tab pill switching
function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  const indicator = document.querySelector('.tab-indicator');

  if (!buttons.length || !indicator) return;

  function moveIndicator(btn) {
    indicator.style.width = btn.offsetWidth + 'px';
    indicator.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
  }

  // Posiziona l'indicatore sul tab attivo iniziale
  const activeBtn = document.querySelector('.tab-btn.active');
  if (activeBtn) moveIndicator(activeBtn);

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      // Aggiorna bottoni
      buttons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Aggiorna pannelli
      panels.forEach(panel => {
        const isTarget = panel.id === 'panel-' + target;
        panel.classList.toggle('active', isTarget);
        panel.hidden = !isTarget;
      });

      // Muovi indicatore
      moveIndicator(btn);
    });
  });
}

// Share copy button
function initShareCopy() {
  document.querySelectorAll('.share-copy[data-url]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      navigator.clipboard.writeText(url)
        .then(() => {
          btn.textContent = '✓ Copiato!';
          setTimeout(() => { btn.textContent = '🔗 Copia link'; }, 2000);
        })
        .catch(() => {
          btn.textContent = 'Errore';
          setTimeout(() => { btn.textContent = '🔗 Copia link'; }, 2000);
        });
    });
  });
}

// Newsletter popup — appare dopo 80% di lettura, una volta per sessione
function initNewsletterPopup() {
  const overlay = document.getElementById('newsletterOverlay');
  if (!overlay) return;

  // Non mostrare se già visto o iscritto
  if (sessionStorage.getItem('newsletter_shown') || localStorage.getItem('newsletter_subscribed')) return;

  let triggered = false;

  function showPopup() {
    if (triggered) return;
    triggered = true;
    sessionStorage.setItem('newsletter_shown', '1');
    overlay.classList.add('visible');
  }

  function hidePopup() {
    overlay.classList.remove('visible');
  }

  // Mostra popup all'80% di scroll
  window.addEventListener('scroll', () => {
    if (triggered) return;
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    if (scrolled / total >= 0.80) showPopup();
  });

  // Chiudi con X
  document.getElementById('newsletterClose')?.addEventListener('click', hidePopup);

  // Chiudi con "No grazie"
  document.getElementById('newsletterSkip')?.addEventListener('click', hidePopup);

  // Chiudi cliccando fuori
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hidePopup();
  });

  // Chiudi con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePopup();
  });

  // Salva iscrizione
  document.getElementById('newsletterForm')?.addEventListener('submit', () => {
    localStorage.setItem('newsletter_subscribed', '1');
    hidePopup();
  });
}

// Search — client-side, powered by /search.json generated by Jekyll
// Riceve i post già caricati per evitare un double fetch con initTags
function initSearch(posts) {
  const input    = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  const results  = document.getElementById('search-results');
  const grid     = document.getElementById('search-results-grid');
  const label    = document.getElementById('search-results-label');
  const noRes    = document.getElementById('search-no-results');
  const tabsCont = document.getElementById('tabs-container');
  const panels   = document.querySelectorAll('.tab-panel');
  if (!input) return;

  function showResults(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      results.hidden = true;
      tabsCont.hidden = false;
      panels.forEach(p => { p.hidden = !p.classList.contains('active'); });
      clearBtn.hidden = true;
      return;
    }
    clearBtn.hidden = false;
    const matches = posts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (Array.isArray(p.tags) ? p.tags.join(' ') : p.tags || '').toLowerCase().includes(q)
    );
    tabsCont.hidden = true;
    panels.forEach(p => p.hidden = true);
    results.hidden = false;
    label.textContent = matches.length
      ? `${matches.length} risultat${matches.length === 1 ? 'o' : 'i'} per "${query.trim()}"`
      : '';
    noRes.hidden = matches.length > 0;
    grid.innerHTML = matches.map(p => {
      const cat = (p.categories || []).includes('business') ? 'business' : 'tech';
      const catLabel = cat === 'business' ? 'Business' : 'Tech';
      return `<li class="post-card">
        ${p.cover ? `<a href="${p.url}" class="post-card-cover"><img src="${p.cover}" alt="${p.title}" loading="lazy"></a>` : ''}
        <div class="post-card-content">
          <span class="post-card-category cat-${cat}">${catLabel}</span>
          <h3><a href="${p.url}">${p.title}</a></h3>
          <p class="post-card-desc">${p.description || ''}</p>
        </div>
      </li>`;
    }).join('');
  }

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => showResults(input.value), 200);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    showResults('');
    input.focus();
  });
}

// Tags panel — builds tag cloud and filters posts by tag
// Riceve i post già caricati per evitare un double fetch con initSearch
function initTags(posts) {
  const cloud    = document.getElementById('tag-cloud');
  const grid     = document.getElementById('tag-results-grid');
  const label    = document.getElementById('tag-filter-label');
  const noRes    = document.getElementById('tag-no-results');
  if (!cloud) return;

  // Collect unique tags sorted by frequency
  const freq = {};
  posts.forEach(p => {
    const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? p.tags.split(',').map(t => t.trim()) : []);
    tags.forEach(t => { if (t) freq[t] = (freq[t] || 0) + 1; });
  });
  const allTags = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);

  if (!allTags.length) {
    cloud.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Nessun tag disponibile.</p>';
    return;
  }

  let activeTag = null;

  function filterByTag(tag) {
    activeTag = tag;
    cloud.querySelectorAll('.tag-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tag === tag);
    });
    if (!tag) {
      grid.innerHTML = '';
      label.hidden = true;
      noRes.hidden = true;
      return;
    }
    const matches = posts.filter(p => {
      const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? p.tags.split(',').map(t => t.trim()) : []);
      return tags.includes(tag);
    });
    label.textContent = `${matches.length} articol${matches.length === 1 ? 'o' : 'i'} con tag "${tag}"`;
    label.hidden = false;
    noRes.hidden = matches.length > 0;
    grid.innerHTML = matches.map(p => {
      const cat = (p.categories || []).includes('business') ? 'business' : 'tech';
      return `<li class="post-card">
        ${p.cover ? `<a href="${p.url}" class="post-card-cover"><img src="${p.cover}" alt="${p.title}" loading="lazy"></a>` : ''}
        <div class="post-card-content">
          <span class="post-card-category cat-${cat}">${cat === 'business' ? 'Business' : 'Tech'}</span>
          <h3><a href="${p.url}">${p.title}</a></h3>
          <p class="post-card-desc">${p.description || ''}</p>
        </div>
      </li>`;
    }).join('');
  }

  cloud.innerHTML = allTags.map(tag =>
    `<button class="tag-btn" data-tag="${tag}">${tag} <span class="tag-count">${freq[tag]}</span></button>`
  ).join('');

  cloud.addEventListener('click', e => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;
    const tag = btn.dataset.tag;
    filterByTag(activeTag === tag ? null : tag);
  });
}

// Initialize all
document.addEventListener('DOMContentLoaded', () => {
  const isApp = document.body.dataset.layout === 'app';

  initLoader(); // needed everywhere

  if (!isApp) {
    initCounter();
    initBackToTop();
    initProgressBar();
    initCopyButtons();
    initShareCopy();
    initTabs();
    initNewsletterPopup();

    // Fetch search.json una sola volta e passa i dati a search e tags
    fetch('/search.json')
      .then(r => r.json())
      .catch(() => [])
      .then(posts => {
        initSearch(posts);
        initTags(posts);
      });
  }
});

/* ── Accordion toggle (used in CV + Cover Letter tools) ── */
function toggleAcc(btn) {
  btn.closest('.acc-item').classList.toggle('acc-open');
}
