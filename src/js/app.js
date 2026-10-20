import { AppState } from './state.js';
import { Api } from './api.js';
import { ChatModule } from './chat.js';
import { GamesModule } from './games.js';
import { NetworkingModule } from './networking.js';
import { PrayerModule } from './prayer.js';
import { ProjectorModule } from './projector.js';
import { PushManagerService } from './push.js';
import { OfflineQueue } from './offline-queue.js';
import { PrayerWizard } from './prayer-wizard.js';
import { NetworkingWizard } from './networking-wizard.js';
import { BibleGamesModule } from './bible-games.js';
import { ProgramModule } from './program.js';
import { AdsModule } from './ads.js';

window.PrayerWizard = PrayerWizard;
window.NetworkingWizard = NetworkingWizard;
window.BibleGames = BibleGamesModule;
window.ProgramModule = ProgramModule;
window.AdsModule = AdsModule;


let deferredPrompt = null;

// Initialisation et Bascule Thème Neumorphique Clair (défaut) / Sombre
function initTheme() {
  const savedTheme = localStorage.getItem('compagnon_theme') || 'light';
  const isDark = savedTheme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  document.documentElement.classList.toggle('dark-mode', isDark);
  updateThemeIcon(isDark);
}

window.toggleAppTheme = () => {
  const isDark = document.body.classList.toggle('dark-mode');
  document.documentElement.classList.toggle('dark-mode', isDark);
  localStorage.setItem('compagnon_theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
  if (typeof window.showToast === 'function') {
    window.showToast(isDark ? "🌙 Mode sombre activé" : "☀️ Mode clair Neumorphism activé", "info");
  }
};

function updateThemeIcon(isDark) {
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.textContent = isDark ? '☀️' : '🌙';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // 0. Initialiser le thème (Mode Clair Neumorphique par défaut)
  initTheme();

  // 1. Initialiser l'état
  AppState.init();

  // 2. Initialiser les modules
  ChatModule.init();
  GamesModule.init();
  BibleGamesModule.init();
  NetworkingModule.init();
  PrayerModule.init();
  ProjectorModule.init();
  PrayerWizard.init();
  NetworkingWizard.init();
  ProgramModule.init();
  AdsModule.init();

  // 3. Charger l'événement
  loadEventInfo();

  // 4. Configurer la navigation
  setupNavigation();

  // 5. Configurer les 3 grands hubs de l'accueil
  setupHeroButtons();

  // 6. Mettre à jour l'en-tête du profil
  updateGuestHeader();
  AppState.on('guest_changed', () => updateGuestHeader());
  AppState.on('points_updated', () => updateGuestHeader());

  // 7. Enregistrer le Service Worker PWA
  registerServiceWorker();

  // 8. Gestion de l'installation PWA
  setupPwaInstall();

  // 9. Initialiser les notifications Web Push et la Régie Broadcast
  PushManagerService.renderPushPrompt('push-prompt-container');
  setupBroadcastModal();

  // 10. Synchronisation automatique des actions hors-ligne
  OfflineQueue.initAutoSync(
    (endpoint, data) => Api.request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    (count) => window.showToast(`✨ ${count} action(s) hors-ligne synchronisée(s) !`, "success")
  );

  // 11. Boucle de rafraîchissement temps réel (Polling doux 5s)
  setInterval(() => {
    refreshCurrentView();
  }, 5000);

  // 12. Retrait fluide de l'écran de chargement anti-flash
  setTimeout(() => {
    if (typeof window.dismissSplash === 'function') {
      window.dismissSplash();
    }
  }, 80);

  // 13. Proposer l'onboarding aux nouveaux invités sans bloquer l'accès
  if (!AppState.guest) {
    setTimeout(() => {
      window.openOnboarding();
    }, 450);
  }
});


async function loadEventInfo() {
  const ev = await Api.getEvent();
  if (ev) {
    AppState.event = ev;
    const titleEl = document.getElementById('header-event-title');
    if (titleEl) titleEl.textContent = ev.name;

    if (ev.direct_feature_enabled !== undefined) {
      AppState.direct_feature_enabled = Number(ev.direct_feature_enabled);
      ProgramModule.applyDirectFeatureToggle(AppState.direct_feature_enabled);
    }
  }
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.tab-view');

  window.switchTab = (targetTab) => {
    if (!targetTab) return;

    // Si l'utilisateur clique sur chat ou direct mais que la régie l'a remplacé par le programme
    if (targetTab === 'chat' && AppState.direct_feature_enabled === 0) {
      targetTab = 'program';
    } else if (targetTab === 'program' && AppState.direct_feature_enabled === 1) {
      targetTab = 'chat';
    }

    navItems.forEach(n => {
      if (n.dataset.tab === targetTab || (targetTab === 'program' && n.dataset.tab === 'chat')) n.classList.add('active');
      else n.classList.remove('active');
    });

    views.forEach(v => {
      if (v.id === `${targetTab}-tab`) v.classList.add('active');
      else v.classList.remove('active');
    });

    AppState.activeTab = targetTab;
    window.location.hash = targetTab;
    refreshCurrentView();
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      let targetTab = btn.dataset.tab;
      window.switchTab(targetTab);
    });
  });

  // Gestion du hash d'URL (ex: #home, #chat, #program, #games, #networking, #prayer)
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (['home', 'chat', 'program', 'games', 'networking', 'prayer'].includes(hash)) {
      window.switchTab(hash);
    }
  });

  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    if (['home', 'chat', 'program', 'games', 'networking', 'prayer'].includes(hash)) {
      window.switchTab(hash);
    }
  } else {
    window.switchTab('home');
  }

  // Bouton mode Grand Écran
  const btnProjector = document.getElementById('btn-toggle-projector');
  if (btnProjector) {
    btnProjector.addEventListener('click', () => {
      const projEl = document.getElementById('projector-view');
      const mainAppEl = document.getElementById('main-app-layout');
      if (projEl && mainAppEl) {
        if (projEl.style.display === 'none' || !projEl.style.display) {
          projEl.style.display = 'block';
          mainAppEl.style.display = 'none';
          ProjectorModule.refresh();
        } else {
          projEl.style.display = 'none';
          mainAppEl.style.display = 'block';
        }
      }
    });
  }

  const btnCloseProjector = document.getElementById('btn-close-projector');
  if (btnCloseProjector) {
    btnCloseProjector.addEventListener('click', () => {
      const projEl = document.getElementById('projector-view');
      const mainAppEl = document.getElementById('main-app-layout');
      if (projEl && mainAppEl) {
        projEl.style.display = 'none';
        mainAppEl.style.display = 'block';
      }
    });
  }
}

function setupHeroButtons() {
  const btnPrayer = document.getElementById('btn-hero-prayer');
  if (btnPrayer) {
    btnPrayer.addEventListener('click', (e) => {
      e.preventDefault();
      PrayerWizard.open();
    });
  }

  const btnNetworking = document.getElementById('btn-hero-networking');
  if (btnNetworking) {
    btnNetworking.addEventListener('click', (e) => {
      e.preventDefault();
      NetworkingWizard.open();
    });
  }

  const btnGames = document.getElementById('btn-hero-games');
  if (btnGames) {
    btnGames.addEventListener('click', (e) => {
      e.preventDefault();
      window.switchTab('games');
    });
  }
}

function refreshCurrentView() {
  switch (AppState.activeTab) {
    case 'home':
      break;
    case 'chat':
      ChatModule.refresh();
      break;
    case 'program':
      ProgramModule.fetchProgram();
      break;
    case 'games':
      GamesModule.refresh();
      break;
    case 'networking':
      NetworkingModule.refresh();
      break;
    case 'prayer':
      PrayerModule.refresh();
      break;
  }

  const projEl = document.getElementById('projector-view');
  if (projEl && projEl.style.display === 'block') {
    ProjectorModule.refresh();
  }
}

function updateGuestHeader() {
  const pill = document.getElementById('guest-status-pill');
  if (!pill) return;

  if (AppState.guest) {
    const points = AppState.guest.points || 0;
    pill.innerHTML = `
      <span style="font-size: 1.1rem;">${AppState.guest.avatar_emoji || '🎉'}</span>
      <span style="font-weight: 600;">${escapeHtml(AppState.guest.name)}</span>
      <span class="guest-table-badge">Table ${escapeHtml(AppState.guest.table_number || '1')}</span>
      <span class="guest-points-badge" style="background: rgba(245,158,11,0.2); color: #f59e0b; padding: 2px 7px; border-radius: 12px; font-weight: 700; font-size: 0.75rem; border: 1px solid rgba(245,158,11,0.4);">⭐ ${points} pts</span>
    `;
  } else {
    pill.innerHTML = `
      <span>👋</span>
      <span>Rejoindre</span>
      <span class="guest-table-badge">QR</span>
    `;
  }
}

// ==========================================
// PWA Service Worker & Bannière Installation
// ==========================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker PWA enregistré', reg.scope))
      .catch(err => console.warn('Erreur SW', err));
  }
}

function setupPwaInstall() {
  const banner = document.getElementById('pwa-install-banner');
  const installBtn = document.getElementById('btn-pwa-install');

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isDismissed = localStorage.getItem('compagnon_pwa_dismissed') === 'true';

  if (!isStandalone && !isDismissed && banner) {
    // Affiche la bannière clignotante avec un léger délai pour un effet doux
    setTimeout(() => {
      banner.style.display = 'flex';
    }, 800);
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (banner && !isStandalone) banner.style.display = 'flex';
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          if (banner) banner.style.display = 'none';
          localStorage.setItem('compagnon_pwa_dismissed', 'true');
        }
        deferredPrompt = null;
      } else {
        window.showToast("📲 Pour installer : Ouvrez le menu de votre navigateur ➔ 'Ajouter à l\\'écran d\\'accueil'");
      }
    });
  }
}


// ==========================================
// Fonctions Globales pour Modales et Toasts
// ==========================================
window.showToast = (msg) => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3200);
};

// Modale Onboarding
window.openOnboarding = () => {
  const modal = document.getElementById('onboarding-modal');
  if (!modal) return;
  
  if (AppState.guest) {
    const nameEl = document.getElementById('input-guest-name');
    const tableEl = document.getElementById('input-guest-table');
    if (nameEl) nameEl.value = AppState.guest.name || '';
    if (tableEl) tableEl.value = AppState.guest.table_number || '';
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
};

window.closeOnboarding = () => {
  const modal = document.getElementById('onboarding-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
};

window.saveOnboarding = async () => {
  const nameInput = document.getElementById('input-guest-name');
  const tableInput = document.getElementById('input-guest-table');
  const name = nameInput ? nameInput.value.trim() : '';
  const table = tableInput ? tableInput.value.trim() : '1';

  if (!name) {
    alert("Veuillez saisir votre prénom ou surnom.");
    return;
  }

  const selectedEmojiBtn = document.querySelector('.emoji-btn.selected');
  const avatarEmoji = selectedEmojiBtn ? selectedEmojiBtn.dataset.emoji : '🎉';

  const guestData = {
    id: AppState.guest ? AppState.guest.id : `guest-${Date.now()}`,
    name,
    table_number: table,
    avatar_emoji: avatarEmoji
  };

  // 1. Fermer immédiatement la modale pour que l'écran soit tout de suite libéré !
  window.closeOnboarding();
  AppState.setGuest(guestData);
  updateGuestHeader();
  window.showToast(`Bienvenue ${name} ! Table ${table} configurée.`);

  // 2. Synchronisation serveur en arrière-plan (sans bloquer l'interface si réseau lent)
  try {
    const res = await Api.joinGuest(guestData);
    if (res && res.id) {
      AppState.setGuest(res);
      updateGuestHeader();
    }
  } catch (err) {
    console.warn("Synchronisation invité enregistrée localement :", err);
  }
};

// Modale Prière (Wizard)
window.openPrayerModal = () => {
  window.PrayerWizard?.open();
};

window.closePrayerModal = () => {
  window.PrayerWizard?.close();
};

// Modale Réseautage (Wizard)
window.openNetworkingModal = () => {
  window.NetworkingWizard?.open();
};

window.closeNetworkingModal = () => {
  window.NetworkingWizard?.close();
};

// Sous-onglets de l'onglet Jeux (Jeux Bibliques vs Duel Tables vs Quiz IA Live)
window.switchGameSubTab = (subTab) => {
  const bibleContainer = document.getElementById('bible-games-container');
  const liveContainer = document.getElementById('live-games-container');
  const btnBible = document.getElementById('btn-mode-bible-games');
  const btnDuel = document.getElementById('btn-mode-duel-games');
  const btnLive = document.getElementById('btn-mode-live-quiz');

  // Réinitialiser les états et classes de tous les boutons
  [btnBible, btnDuel, btnLive].forEach(btn => {
    if (btn) {
      btn.classList.remove('active', 'btn-3d-gold', 'btn-3d-coral', 'btn-3d-porcelain');
      btn.classList.add('btn-3d-porcelain');
    }
  });

  if (subTab === 'bible') {
    if (bibleContainer) bibleContainer.style.display = 'block';
    if (liveContainer) liveContainer.style.display = 'none';
    if (btnBible) {
      btnBible.classList.remove('btn-3d-porcelain');
      btnBible.classList.add('active', 'btn-3d-gold');
    }
    window.BibleGames?.init();
  } else if (subTab === 'duel') {
    if (bibleContainer) bibleContainer.style.display = 'none';
    if (liveContainer) liveContainer.style.display = 'block';
    if (btnDuel) {
      btnDuel.classList.remove('btn-3d-porcelain');
      btnDuel.classList.add('active', 'btn-3d-coral');
    }
    window.GamesModule?.openDuelLobby();
  } else {
    // Mode Quiz IA en Live
    if (bibleContainer) bibleContainer.style.display = 'none';
    if (liveContainer) liveContainer.style.display = 'block';
    if (btnLive) {
      btnLive.classList.remove('btn-3d-porcelain');
      btnLive.classList.add('active', 'btn-3d-gold');
    }
    window.GamesModule?.openLiveQuiz();
  }
};


window.submitNetworkingForm = async (e) => {
  if (e) e.preventDefault();

  const fullName = document.getElementById('net-fullname').value.trim();
  const profession = document.getElementById('net-profession').value.trim();
  const company = document.getElementById('net-company').value.trim();
  const bio = document.getElementById('net-bio').value.trim();
  const interests = document.getElementById('net-interests').value.trim();
  const lookingFor = document.getElementById('net-looking-for').value.trim();
  const offering = document.getElementById('net-offering').value.trim();
  const whatsapp = document.getElementById('net-whatsapp').value.trim();

  if (!fullName) {
    alert("Veuillez indiquer votre nom complet.");
    return;
  }

  await Api.saveNetworkingProfile({
    guest_id: AppState.guest ? AppState.guest.id : `guest-${Date.now()}`,
    full_name: fullName,
    profession,
    company,
    bio,
    interests_tags: interests,
    looking_for: lookingFor,
    offering,
    whatsapp,
    table_number: AppState.guest ? AppState.guest.table_number : '1'
  });

  window.closeNetworkingModal();
  window.showToast("Votre fiche de réseautage a été créée ! 🤝");
  NetworkingModule.refresh();
};

// ==========================================
// RÉGIE & DIFFUSION NOTIFICATIONS PUSH
// ==========================================
function setupBroadcastModal() {
  const btnOpen = document.getElementById('btn-open-broadcast');
  const modal = document.getElementById('broadcast-modal');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => {
      modal.style.display = 'flex';
      requestAnimationFrame(() => modal.classList.add('active'));
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) window.closeBroadcastModal();
    });
  }

  // Configuration des raccourcis de diffusion pré-remplis
  document.querySelectorAll('.quick-broadcast-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const b = e.currentTarget;
      const titleInput = document.getElementById('broadcast-title');
      const bodyInput = document.getElementById('broadcast-body');
      const urlInput = document.getElementById('broadcast-url');

      if (titleInput && b.dataset.title) titleInput.value = b.dataset.title;
      if (bodyInput && b.dataset.body) bodyInput.value = b.dataset.body;
      if (urlInput && b.dataset.url) urlInput.value = b.dataset.url;
    });
  });
}

window.closeBroadcastModal = () => {
  const modal = document.getElementById('broadcast-modal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      if (!modal.classList.contains('active')) modal.style.display = 'none';
    }, 200);
  }
};

window.submitBroadcastForm = async (event) => {
  event.preventDefault();
  const title = document.getElementById('broadcast-title').value.trim();
  const body = document.getElementById('broadcast-body').value.trim();
  const url = document.getElementById('broadcast-url').value;
  const pinInput = document.getElementById('broadcast-pin');
  const adminPin = pinInput ? pinInput.value.trim() : '';
  const submitBtn = document.getElementById('btn-submit-broadcast');

  if (!title || !body || !adminPin) {
    alert("Veuillez renseigner le titre, le message et le code PIN de la régie.");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Diffusion en cours...";
  }

  try {
    const res = await Api.broadcastPushNotification(title, body, url, 'gala-alert', adminPin);
    if (res && res.success) {
      sessionStorage.setItem('compagnon_admin_pin', adminPin);
      window.closeBroadcastModal();
      window.showToast(`📢 Alerte diffusée avec succès ! (${res.recipients_count || 0} destinataires)`, "success");
      document.getElementById('broadcast-form')?.reset();
    } else {
      window.showToast("Erreur lors de la diffusion : " + (res?.error || "Inconnu"), "error");
    }
  } catch (err) {
    window.showToast(err.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "🚀 Diffuser à tous les invités";
    }
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

