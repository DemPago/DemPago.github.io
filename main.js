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

// Loader hide — gestisce anche il caso in cui load sia già scattato
function initLoader() {
  const hide = () => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  };
  if (document.readyState === 'complete') {
    hide();
  } else {
    window.addEventListener('load', hide);
  }
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

// Initialize all
document.addEventListener('DOMContentLoaded', () => {
  initCounter();
  initLoader();
  initBackToTop();
  initProgressBar();
  initCopyButtons();
  initTabs();
});
