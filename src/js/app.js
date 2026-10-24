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

// Redirection automatique immédiate côté client vers le domaine officiel
if (typeof window !== 'undefined' && window.location.hostname.includes('compagnon-de-ceremonie.mynexus.workers.dev')) {
  window.location.replace(`https://joursderencontre.com${window.location.pathname}${window.location.search}${window.location.hash}`);
}

export function getCanonicalOrigin() {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return window.location.origin;
  }
  return 'https://joursderencontre.com';
}
window.getCanonicalOrigin = getCanonicalOrigin;

export function buildGuestTicketId(name, coupleName, ticketType) {
  let target = (ticketType === 'couple' && coupleName) ? coupleName : (name || 'invite');
  target = target.replace(/^(m\.|mme|mr|monsieur|madame|docteur|dr|pasteur|couple)\s+/i, '');
  const clean = target
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 24);
  const rand = Math.random().toString(36).substring(2, 6);
  return `billet-${clean || 'invite'}-${rand}`;
}
window.buildGuestTicketId = buildGuestTicketId;

export function getCanonicalTicketUrl(guest) {
  if (!guest) return `${getCanonicalOrigin()}/dinedegala2026/?invite=gala2026`;
  const origin = getCanonicalOrigin();
  const ticketId = encodeURIComponent(guest.id || '');
  const guestName = (guest.ticket_type === 'couple' && guest.couple_name) ? guest.couple_name : (guest.name || '');
  const cleanName = guestName.replace(/^(m\.|mme|mr|monsieur|madame)\s+/i, '').trim();
  const nameParam = cleanName ? `&nom=${encodeURIComponent(cleanName)}` : '';
  return `${origin}/dinedegala2026/?ticket=${ticketId}${nameParam}`;
}
window.getCanonicalTicketUrl = getCanonicalTicketUrl;

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
  PushManagerService.syncExistingSubscription();
  PushManagerService.renderPushPrompt('push-prompt-container');
  setupBroadcastModal();

  // 10. Synchronisation automatique des actions hors-ligne
  OfflineQueue.initAutoSync(
    (endpoint, data) => Api.request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    (count) => window.showToast(`✨ ${count} action(s) hors-ligne synchronisée(s) !`, "success")
  );

  // 11. Initialisation et mise à jour des métriques dynamiques d'accueil (Prières & Réseautage)
  updateHomeMetrics();
  setInterval(() => {
    updateHomeMetrics();
  }, 20000);

  // 12. Boucle de rafraîchissement temps réel (Polling doux 5s)
  setInterval(() => {
    refreshCurrentView();
  }, 5000);

  // 12bis. Compte à rebours officiel du Gala (Formulaire d'invitation + Onglet Programme)
  updateInvitationCountdown();
  setInterval(updateInvitationCountdown, 1000);

  // 12ter. Gestes tactiles et contrôles de la visionneuse plein écran du billet
  setupTicketFullscreenGestures();

  // 13. Retrait immédiat de l'écran de chargement anti-flash (0ms)
  if (typeof window.dismissSplash === 'function') {
    window.dismissSplash();
  }

  // 14. Détection du Billet Officiel 3D Claymorphic (?ticket=... ou ?billet=...) ou invitation (?invite=...)
  const urlParams = new URLSearchParams(window.location.search);
  const ticketParam = urlParams.get('ticket') || urlParams.get('billet');
  const isInvite = urlParams.has('invite') || urlParams.has('invitation') || window.location.hash === '#invitation';

  if (ticketParam) {
    setTimeout(() => {
      window.openClaymorphicTicketModalById(ticketParam);
    }, 120);
  } else if (isInvite) {
    trackInvitationClick();
    const hostParam = urlParams.get('par') || urlParams.get('hote') || urlParams.get('by');
    if (hostParam) {
      setTimeout(() => {
        const hostEl = document.getElementById('inv-input-host');
        if (hostEl) hostEl.value = decodeURIComponent(hostParam);
      }, 100);
    }
    setTimeout(() => {
      window.openInvitationModal();
    }, 250);
  } else if (!AppState.guest) {
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
    if (titleEl) titleEl.textContent = 'E-event';

    if (ev.direct_feature_enabled !== undefined) {
      AppState.direct_feature_enabled = Number(ev.direct_feature_enabled);
      ProgramModule.applyDirectFeatureToggle(AppState.direct_feature_enabled);
    }
  }
}

function ensureModelViewerLoaded() {
  if (window.customElements && window.customElements.get('model-viewer')) return;
  if (document.querySelector('script[src*="model-viewer"]')) return;
  const s = document.createElement('script');
  s.type = 'module';
  s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
  document.head.appendChild(s);
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.tab-view');

  window.switchTab = (targetTab) => {
    if (!targetTab) return;

    if (targetTab === 'vitrine') {
      ensureModelViewerLoaded();
    }

    // Si l'utilisateur clique sur chat ou direct mais que la régie l'a remplacé par le programme
    if (targetTab === 'chat' && AppState.direct_feature_enabled === 0) {
      targetTab = 'program';
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

  // Gestion du hash d'URL (ex: #home, #vitrine, #chat, #program, #games, #networking, #prayer)
  const validTabs = ['home', 'vitrine', 'chat', 'program', 'games', 'networking', 'prayer'];
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (validTabs.includes(hash)) {
      window.switchTab(hash);
    }
  });

  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    if (validTabs.includes(hash)) {
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

  const btnVitrine = document.getElementById('btn-hero-vitrine');
  if (btnVitrine) {
    btnVitrine.addEventListener('click', (e) => {
      e.preventDefault();
      window.switchTab('vitrine');
    });
  }
}

function refreshCurrentView() {
  switch (AppState.activeTab) {
    case 'home':
      break;
    case 'vitrine':
      if (AdsModule && typeof AdsModule.renderVitrinePage === 'function') {
        AdsModule.renderVitrinePage();
      }
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
  const labelEl = document.getElementById('header-profile-label');
  const tableEl = document.getElementById('header-profile-table');

  if (AppState.guest) {
    const points = AppState.guest.points || 0;
    if (labelEl) labelEl.textContent = AppState.guest.name || 'Votre Profil';
    if (tableEl) {
      const cleanTable = String(AppState.guest.table_number || '1').replace(/^table\s*/i, '');
      tableEl.textContent = `Table ${cleanTable}`;
    }
    let pointsBadge = pill.querySelector('.guest-points-badge');
    if (!pointsBadge) {
      pointsBadge = document.createElement('span');
      pointsBadge.className = 'guest-points-badge';
      pointsBadge.style.cssText = 'background: rgba(245,158,11,0.2); color: #f59e0b; padding: 2px 7px; border-radius: 12px; font-weight: 700; font-size: 0.75rem; border: 1px solid rgba(245,158,11,0.4);';
      pill.appendChild(pointsBadge);
    }
    pointsBadge.textContent = `⭐ ${points} pts`;
  } else {
    if (labelEl) labelEl.textContent = 'Votre Profil';
    if (tableEl) tableEl.textContent = 'Invité';
    const pointsBadge = pill.querySelector('.guest-points-badge');
    if (pointsBadge) pointsBadge.remove();
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

// ==========================================
// Modale d'Invitation Publique Prestige (Gala 24 Octobre 2026)
// ==========================================
let invitationCountdownInterval = null;
const GALA_DATE_TARGET = new Date('2026-10-24T15:00:00+01:00').getTime();

function updateInvitationCountdown() {
  const now = Date.now();
  const diff = GALA_DATE_TARGET - now;

  const daysEls = [document.getElementById('inv-count-days'), document.getElementById('prog-count-days')].filter(Boolean);
  const hoursEls = [document.getElementById('inv-count-hours'), document.getElementById('prog-count-hours')].filter(Boolean);
  const minsEls = [document.getElementById('inv-count-minutes'), document.getElementById('prog-count-minutes')].filter(Boolean);
  const secsEls = [document.getElementById('inv-count-seconds'), document.getElementById('prog-count-seconds')].filter(Boolean);

  if (diff <= 0) {
    daysEls.forEach(el => { el.textContent = '00'; });
    hoursEls.forEach(el => { el.textContent = '00'; });
    minsEls.forEach(el => { el.textContent = '00'; });
    secsEls.forEach(el => { el.textContent = '00'; });
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const dStr = String(days).padStart(2, '0');
  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');

  daysEls.forEach(el => { el.textContent = dStr; });
  hoursEls.forEach(el => { el.textContent = hStr; });
  minsEls.forEach(el => { el.textContent = mStr; });
  secsEls.forEach(el => { el.textContent = sStr; });
}

// Valid tables officielles du Gala 2026
const DEFAULT_GALA_TABLES = ['A','D','F','G','H','I','J','K','L','M','O','P','Q','S','T','U','V','W','X','Z'];
let dynamicGalaTables = [...DEFAULT_GALA_TABLES];
let currentGeneratedTicketDataUrl = null;
let currentTicketGuest = null;

// Synchronisation de la liste dynamique des tables depuis l'API
async function fetchGalaTables() {
  try {
    const list = await Api.getValidTables();
    if (Array.isArray(list) && list.length > 0) {
      dynamicGalaTables = list.map(t => String(t).toUpperCase().replace(/^TABLE\s*/i, '').trim());
    }
  } catch(e) {}
}

window.toggleCoupleFields = (isCouple) => {
  const coupleContainer = document.getElementById('inv-couple-fields');
  const partnerInput = document.getElementById('inv-input-partner');
  const coupleNameInput = document.getElementById('inv-input-couple-name');

  if (coupleContainer) {
    coupleContainer.style.display = isCouple ? 'block' : 'none';
  }
  if (partnerInput) {
    partnerInput.required = !!isCouple;
  }
  if (coupleNameInput) {
    coupleNameInput.required = !!isCouple;
  }
};

let currentInvitationPhotoBase64 = null;

window.handleInvitationPhotoSelect = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      currentInvitationPhotoBase64 = compressedDataUrl;

      const imgEl = document.getElementById('inv-photo-img-preview');
      const emojiEl = document.getElementById('inv-photo-emoji-placeholder');
      const removeBtn = document.getElementById('inv-photo-remove-btn');

      if (imgEl) {
        imgEl.src = compressedDataUrl;
        imgEl.style.display = 'block';
      }
      if (emojiEl) emojiEl.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'inline-block';

      window.onInvitationFieldChange();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

window.removeInvitationPhoto = (saveDraft = true) => {
  currentInvitationPhotoBase64 = null;
  const input = document.getElementById('inv-photo-input');
  if (input) input.value = '';

  const imgEl = document.getElementById('inv-photo-img-preview');
  const emojiEl = document.getElementById('inv-photo-emoji-placeholder');
  const removeBtn = document.getElementById('inv-photo-remove-btn');

  if (imgEl) {
    imgEl.src = '';
    imgEl.style.display = 'none';
  }
  if (emojiEl) emojiEl.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';

  if (saveDraft) window.onInvitationFieldChange();
};

function trackInvitationClick() {
  try {
    if (!sessionStorage.getItem('compagnon_invite_tracked')) {
      sessionStorage.setItem('compagnon_invite_tracked', '1');
      fetch('/api/invitation-link/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'link',
          referrer: document.referrer || '',
          url: window.location.href
        })
      }).catch(() => {});
    }
  } catch(e) {}
}

window.onInvitationFieldChange = () => {
  const gender = document.querySelector('input[name="inv-gender"]:checked')?.value || 'M';
  const ticketType = document.querySelector('input[name="inv-ticket-type"]:checked')?.value || 'seul';
  const name = document.getElementById('inv-input-name')?.value || '';
  const partner = document.getElementById('inv-input-partner')?.value || '';
  const coupleName = document.getElementById('inv-input-couple-name')?.value || '';
  const phone = document.getElementById('inv-input-phone')?.value || '';
  const table = document.getElementById('inv-input-table')?.value || '';
  const rank = document.getElementById('inv-input-rank')?.value || '';
  const host = document.getElementById('inv-input-host')?.value || '';

  const draft = { 
    gender, ticketType, name, partner, coupleName, phone, table, rank, host,
    photoUrl: currentInvitationPhotoBase64 
  };
  try {
    localStorage.setItem('compagnon_invite_draft', JSON.stringify(draft));
  } catch(e) {}
};

window.closeInvalidTableModal = () => {
  const modal = document.getElementById('invitation-invalid-table-modal');
  if (modal) modal.style.display = 'none';
  const tableInput = document.getElementById('inv-input-table');
  if (tableInput) {
    tableInput.focus();
    tableInput.select();
  }
};

window.openInvitationModal = () => {
  const modal = document.getElementById('invitation-link-modal');
  if (!modal) return;

  trackInvitationClick();
  fetchGalaTables();

  const formView = document.getElementById('invitation-form-view');
  const successView = document.getElementById('invitation-success-view');
  if (formView) formView.style.display = 'block';
  if (successView) successView.style.display = 'none';

  // Restaurer les données sauvegardées en localStorage UNIQUEMENT s'il y a un brouillon non achevé
  try {
    const savedDraftStr = localStorage.getItem('compagnon_invite_draft');
    if (savedDraftStr) {
      const draft = JSON.parse(savedDraftStr);
      if (draft.gender) {
        const r = document.querySelector(`input[name="inv-gender"][value="${draft.gender}"]`);
        if (r) r.checked = true;
      }
      if (draft.ticketType) {
        const r = document.querySelector(`input[name="inv-ticket-type"][value="${draft.ticketType}"]`);
        if (r) r.checked = true;
        window.toggleCoupleFields(draft.ticketType === 'couple');
      }
      if (draft.name) document.getElementById('inv-input-name').value = draft.name;
      if (draft.partner) document.getElementById('inv-input-partner').value = draft.partner;
      if (draft.coupleName) document.getElementById('inv-input-couple-name').value = draft.coupleName;
      if (draft.phone) document.getElementById('inv-input-phone').value = draft.phone;
      if (draft.table) document.getElementById('inv-input-table').value = draft.table;
      if (draft.rank && document.getElementById('inv-input-rank')) {
        document.getElementById('inv-input-rank').value = draft.rank;
      }
      if (draft.host && !document.getElementById('inv-input-host')?.value) {
        document.getElementById('inv-input-host').value = draft.host;
      }
      if (draft.photoUrl) {
        currentInvitationPhotoBase64 = draft.photoUrl;
        const imgEl = document.getElementById('inv-photo-img-preview');
        const emojiEl = document.getElementById('inv-photo-emoji-placeholder');
        const removeBtn = document.getElementById('inv-photo-remove-btn');
        if (imgEl) {
          imgEl.src = draft.photoUrl;
          imgEl.style.display = 'block';
        }
        if (emojiEl) emojiEl.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'inline-block';
      }
    } else {
      // Aucun brouillon inachevé : formulaire totalement vierge
      const nameInput = document.getElementById('inv-input-name');
      const partnerInput = document.getElementById('inv-input-partner');
      const coupleNameInput = document.getElementById('inv-input-couple-name');
      const phoneInput = document.getElementById('inv-input-phone');
      const tableInput = document.getElementById('inv-input-table');
      const rankInput = document.getElementById('inv-input-rank');
      const hostInput = document.getElementById('inv-input-host');

      if (nameInput) nameInput.value = '';
      if (partnerInput) partnerInput.value = '';
      if (coupleNameInput) coupleNameInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (tableInput) tableInput.value = '';
      if (rankInput) rankInput.value = '';

      const hostParam = new URLSearchParams(window.location.search).get('par') || 
                        new URLSearchParams(window.location.search).get('hote') || 
                        new URLSearchParams(window.location.search).get('by');
      if (hostInput) {
        hostInput.value = hostParam ? decodeURIComponent(hostParam) : '';
      }

      const rSingle = document.querySelector('input[name="inv-ticket-type"][value="seul"]') ||
                      document.querySelector('input[name="inv-ticket-type"][value="solo"]');
      if (rSingle) rSingle.checked = true;
      window.toggleCoupleFields(false);

      const rMale = document.querySelector('input[name="inv-gender"][value="M"]');
      if (rMale) rMale.checked = true;

      window.removeInvitationPhoto(false);
    }
  } catch(e) {}

  updateInvitationCountdown();
  modal.style.display = 'flex';
};

window.closeInvitationModal = () => {
  const modal = document.getElementById('invitation-link-modal');
  if (modal) modal.style.display = 'none';
};

window.renderInvitationTicket = async (guest) => {
  currentTicketGuest = guest;
  const canvas = document.getElementById('inv-ticket-canvas');
  const previewImg = document.getElementById('inv-ticket-preview-img');
  if (!canvas) return;

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }
  } catch(e) {}

  const ctx = canvas.getContext('2d');
  const img = new Image();

  return new Promise((resolve) => {
    img.onload = () => {
      // 1. Dessiner le fond du billet officiel (1024 x 921)
      canvas.width = 1024;
      canvas.height = 921;
      ctx.drawImage(img, 0, 0, 1024, 921);

      // 2. Déterminer le texte calligraphié à poser sur la ligne en pointillés
      let textToInscribe = '';
      if (guest.ticket_type === 'couple') {
        const rawCouple = (guest.couple_name || `Couple ${guest.name}`).trim();
        if (/^couple\s+/i.test(rawCouple)) {
          textToInscribe = 'Couple ' + rawCouple.replace(/^couple\s+/i, '').trim();
        } else {
          textToInscribe = rawCouple;
        }
      } else {
        const prefix = guest.gender === 'F' ? 'Mme ' : 'M. ';
        const cleanName = (guest.name || '').replace(/^(m\.|mme|mr|madame|monsieur)\s+/i, '').trim();
        textToInscribe = `${prefix}${cleanName}`.trim();
      }

      // 3. Dessiner le nom avec calligraphie raffinée sur les pointillés (centre X=512, Y=94)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Ombre portée subtile dorée/brun pour relief prestige
      ctx.shadowColor = 'rgba(212, 175, 55, 0.45)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Déterminer la taille de police adaptée à la longueur du texte
      let fontSize = 36;
      if (textToInscribe.length > 34) fontSize = 24;
      else if (textToInscribe.length > 26) fontSize = 28;
      else if (textToInscribe.length > 18) fontSize = 32;

      ctx.font = `700 ${fontSize}px "Playfair Display", Georgia, "Brush Script MT", cursive, serif`;
      ctx.fillStyle = '#1c130d';
      ctx.fillText(textToInscribe, 512, 94);

      // Réinitialiser les ombres
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 4. Mention élégante de la Table en haut à droite
      const cleanTableNum = String(guest.table_number || '').toUpperCase().replace(/^TABLE\s*/i, '').trim();
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#8B5A2B';
      ctx.textAlign = 'right';
      ctx.fillText(`TABLE ${cleanTableNum}`, 930, 48);

      // 5. Générer le Data URL et mettre à jour l'image d'aperçu
      try {
        const dataUrl = canvas.toDataURL('image/png');
        currentGeneratedTicketDataUrl = dataUrl;
        if (previewImg) previewImg.src = dataUrl;
        const clayImg = document.getElementById('clay-ticket-img-preview');
        if (clayImg) clayImg.src = dataUrl;
      } catch(err) {
        console.warn("Export canvas to DataURL:", err);
      }
      resolve();
    };

    img.onerror = () => {
      console.error("Impossible de charger le modèle de billet d'invitation");
      resolve();
    };

    img.src = '/billet-invitation-template.png';
  });
};

window.downloadInvitationTicket = () => {
  if (!currentGeneratedTicketDataUrl) {
    window.showToast("Génération du billet en cours...");
    return;
  }
  const guest = currentTicketGuest || AppState.guest || {};
  const filenameName = (guest.couple_name || guest.name || 'Invite').replace(/[^a-zA-Z0-9]/g, '_');
  const a = document.createElement('a');
  a.href = currentGeneratedTicketDataUrl;
  a.download = `Billet-Gala-2026-${filenameName}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.showToast("Billet officiel téléchargé avec succès ! 📥");
};

window.shareTicketOnWhatsApp = async () => {
  const guest = currentTicketGuest || AppState.guest || {};
  let displayName = '';
  if (guest.ticket_type === 'couple') {
    let rawCouple = (guest.couple_name || guest.name || '').trim().replace(/^couple\s+/i, '').trim();
    displayName = `Couple ${rawCouple}`;
    if (guest.name && guest.partner_name && !rawCouple.toLowerCase().includes(guest.partner_name.toLowerCase())) {
      displayName += ` (${guest.name} & ${guest.partner_name})`;
    }
  } else {
    const cleanName = (guest.name || 'Invité').replace(/^(m\.|mme|mr|madame|monsieur)\s+/i, '').trim();
    const prefix = guest.gender === 'F' ? 'Mme ' : 'M. ';
    displayName = `${prefix}${cleanName}`;
  }

  const cleanTable = String(guest.table_number || '').toUpperCase().replace(/^TABLE\s*/i, '').trim() || 'A';
  const ticketUrl = getCanonicalTicketUrl(guest);

  // Texte formaté WhatsApp sans caractères UTF-16 corrompus pour un rendu parfait sur iOS & Android
  const cleanMessage =
    `*INVITATION OFFICIELLE - 2ÈME ÉDITION DU DÎNER DE GALA*\n\n` +
    `⭐ *Événement :* 2ème édition du Dîner de Gala 2026\n` +
    `📅 *Date :* Samedi 24 Octobre 2026 dès 15h00\n` +
    `🎟️ *Billet officiel :* ${displayName}\n` +
    `🍽️ *Table réservée :* Table ${cleanTable}\n` +
    `📍 *Lieu :* Salle de fête Le Rocher des Âges sise Rond point Entraco.\n\n` +
    `🎟️ *Voir mon Billet Officiel en 3D & Accéder à la Cérémonie :*\n${ticketUrl}`;

  const canvas = document.getElementById('inv-ticket-canvas') || document.getElementById('clay-ticket-render-canvas');
  const filenameSafe = (guest.couple_name || guest.name || 'Billet').replace(/[^a-zA-Z0-9]/g, '_');

  // S'assurer que le billet officiel est bien dessiné sur le canvas avant l'export
  if (!currentGeneratedTicketDataUrl || !canvas || canvas.width < 100) {
    await window.renderInvitationTicket(guest);
  }

  // 1. Partage direct natif avec l'IMAGE du billet (Android, iPhone, navigateurs compatibles)
  if (canvas && navigator.canShare) {
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const ticketFile = new File([blob], `Billet-Gala-2026-${filenameSafe}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [ticketFile] })) {
          try {
            await navigator.share({
              title: 'Mon Billet d\'Invitation - Dîner de Gala 2026',
              text: cleanMessage,
              files: [ticketFile]
            });
            window.showToast("Billet et invitation partagés avec succès ! ✨");
            return;
          } catch (err) {
            if (err.name === 'AbortError') return;
            console.warn("Échec partage fichier natif, bascule vers WhatsApp Web:", err);
          }
        }
      }
    } catch (e) {
      console.warn("Erreur préparation image billet pour partage:", e);
    }
  }

  // 2. Repli pour Desktop / WhatsApp Web : Copier l'image dans le presse-papier + Téléchargement auto
  try {
    if (canvas && navigator.clipboard && window.ClipboardItem) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
      }
    }
  } catch (e) {}

  window.downloadInvitationTicket();
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(cleanMessage)}`;
  window.open(whatsappUrl, '_blank');
  window.showToast("Billet téléchargé et copié ! Collez l'image (Ctrl+V) dans votre message WhatsApp.");
};

// ============================================================
// LOGIQUE MODALE 3D CLAYMORPHIC DU BILLET OFFICIEL
// ============================================================

window.openClaymorphicTicketModal = async (guest) => {
  if (!guest) return;
  currentTicketGuest = guest;

  const modal = document.getElementById('modal-ticket-claymorphic');
  if (!modal) return;

  // Formatage du nom d'affichage
  let titleName = '';
  if (guest.ticket_type === 'couple') {
    let rawCouple = (guest.couple_name || guest.name || '').trim().replace(/^couple\s+/i, '').trim();
    titleName = `Couple ${rawCouple}`;
    if (guest.name && guest.partner_name && !rawCouple.toLowerCase().includes(guest.partner_name.toLowerCase())) {
      titleName += ` (${guest.name} & ${guest.partner_name})`;
    }
  } else {
    const cleanName = (guest.name || 'Invité').replace(/^(m\.|mme|mr|madame|monsieur)\s+/i, '').trim();
    const prefix = guest.gender === 'F' ? 'Mme ' : 'M. ';
    titleName = `${prefix}${cleanName}`;
  }

  const titleEl = document.getElementById('clay-guest-display-title');
  if (titleEl) titleEl.textContent = titleName;

  const cleanTable = String(guest.table_number || '').toUpperCase().replace(/^TABLE\s*/i, '').trim() || 'A';
  const tableValEl = document.getElementById('clay-val-table');
  if (tableValEl) tableValEl.textContent = `TABLE ${cleanTable}`;

  const hostValEl = document.getElementById('clay-val-host');
  if (hostValEl) hostValEl.textContent = guest.invited_by ? guest.invited_by.trim() : 'Organisateurs';

  const typeValEl = document.getElementById('clay-val-type');
  const typeIconEl = document.getElementById('clay-icon-type');
  if (typeValEl) {
    typeValEl.textContent = guest.ticket_type === 'couple' ? 'Billet Couple (2p)' : 'Billet Seul';
  }
  if (typeIconEl) {
    typeIconEl.textContent = guest.ticket_type === 'couple' ? '👥' : '👤';
  }

  modal.style.display = 'flex';
  setupClaymorphicTicketTilt();

  // Rendu graphique du billet officiel
  await window.renderInvitationTicket(guest);

  const clayImg = document.getElementById('clay-ticket-img-preview');
  if (clayImg && currentGeneratedTicketDataUrl) {
    clayImg.src = currentGeneratedTicketDataUrl;
  }
};

window.openClaymorphicTicketModalById = async (guestId) => {
  if (!guestId) return;

  // 1. Vérifier si l'invité est déjà dans AppState
  if (AppState.guest && (AppState.guest.id === guestId || AppState.guest.phone === guestId)) {
    window.openClaymorphicTicketModal(AppState.guest);
    return;
  }

  // 2. Afficher la modale temporaire avec indicateur
  const modal = document.getElementById('modal-ticket-claymorphic');
  if (modal) modal.style.display = 'flex';
  const titleEl = document.getElementById('clay-guest-display-title');
  if (titleEl) titleEl.textContent = "Chargement de votre billet...";

  try {
    let res = await Api.request(`/guests/detail?id=${encodeURIComponent(guestId)}`);
    if ((!res || !res.guest)) {
      const urlParams = new URLSearchParams(window.location.search);
      const nomParam = urlParams.get('nom');
      if (nomParam && nomParam !== guestId) {
        res = await Api.request(`/guests/detail?id=${encodeURIComponent(nomParam)}`);
      }
    }
    if (res && res.guest) {
      AppState.setGuest(res.guest);
      updateGuestHeader();
      window.openClaymorphicTicketModal(res.guest);
    } else {
      window.showToast("Billet introuvable ou lien expiré.", "error");
      if (modal) modal.style.display = 'none';
      if (!AppState.guest) window.openOnboarding();
    }
  } catch (err) {
    console.error("Erreur récupération billet 3D:", err);
    window.showToast("Impossible de charger le billet pour le moment.", "error");
    if (modal) modal.style.display = 'none';
  }
};

window.closeClaymorphicTicketModal = () => {
  const modal = document.getElementById('modal-ticket-claymorphic');
  if (modal) modal.style.display = 'none';
};

window.downloadClayTicket = () => {
  window.downloadInvitationTicket();
};

window.shareClayTicketWhatsApp = () => {
  window.shareTicketOnWhatsApp();
};

window.enterAppFromClayTicket = () => {
  window.closeClaymorphicTicketModal();
  const guest = currentTicketGuest || AppState.guest;
  if (guest && !AppState.guest) {
    AppState.setGuest(guest);
    updateGuestHeader();
  }
  window.showToast("Bienvenue à la 2ème édition du Dîner de Gala ! 🥂", "success");
};

window.goToProgramFromTicket = () => {
  window.closeClaymorphicTicketModal();
  const guest = currentTicketGuest || AppState.guest;
  if (guest && !AppState.guest) {
    AppState.setGuest(guest);
    updateGuestHeader();
  }
  window.switchTab('program');
  window.showToast("Bienvenue au programme officiel de la soirée ! 📜", "success");
};

// ========================================================
// VISIONNEUSE PLEIN ÉCRAN DU BILLET AVEC ZOOM & ROTATION AUTO
// ========================================================
const fsTicketState = {
  rotation: 0,
  userZoom: 1.0,
  panX: 0,
  panY: 0,
  naturalW: 1024,
  naturalH: 921,
  isOpen: false,
  isDragging: false,
  startX: 0,
  startY: 0,
  isPinching: false,
  initialPinchDist: 0,
  initialPinchZoom: 1.0,
  lastTapTime: 0
};

function applyTicketFsTransform(animate = true) {
  const layer = document.getElementById('ticket-fs-layer');
  const zoomText = document.getElementById('ticket-fs-zoom-text');
  const rotText = document.getElementById('ticket-fs-rot-text');
  if (!layer) return;

  if (rotText) rotText.textContent = `${fsTicketState.rotation}°`;
  if (zoomText) zoomText.textContent = `${Math.round(fsTicketState.userZoom * 100)}%`;

  const vpW = window.innerWidth;
  const vpH = Math.max(300, window.innerHeight - 80);
  const isSideways = fsTicketState.rotation % 180 !== 0;

  const effectiveW = isSideways ? fsTicketState.naturalH : fsTicketState.naturalW;
  const effectiveH = isSideways ? fsTicketState.naturalW : fsTicketState.naturalH;

  const fitScale = Math.min((vpW * 0.94) / effectiveW, (vpH * 0.94) / effectiveH);
  const totalScale = fitScale * fsTicketState.userZoom;

  layer.style.transition = animate ? 'transform 0.18s cubic-bezier(0.2, 0, 0.2, 1)' : 'none';
  layer.style.transform = `translate3d(${fsTicketState.panX}px, ${fsTicketState.panY}px, 0) rotate(${fsTicketState.rotation}deg) scale(${totalScale.toFixed(4)})`;
}

window.openTicketFullscreen = () => {
  const modal = document.getElementById('ticket-fullscreen-modal');
  const fsImg = document.getElementById('ticket-fs-img');
  if (!modal || !fsImg) return;

  // Récupérer l'image source du billet (canvas généré en priorité, puis aperçu, puis fallback)
  const clayImg = document.getElementById('clay-ticket-img-preview');
  const invImg = document.getElementById('inv-ticket-preview-img');
  const ticketSrc = currentGeneratedTicketDataUrl || clayImg?.src || invImg?.src || '/billet-invitation-template.png';
  fsImg.src = ticketSrc;

  // Détection automatique de l'orientation de l'écran du smartphone :
  // Sur smartphone vertical (portrait), le billet horizontal pivote à 90° automatiquement pour occuper toute la hauteur de l'écran !
  const isPortrait = window.innerHeight > window.innerWidth;
  fsTicketState.rotation = isPortrait ? 90 : 0;
  fsTicketState.userZoom = 1.0;
  fsTicketState.panX = 0;
  fsTicketState.panY = 0;
  fsTicketState.isOpen = true;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  applyTicketFsTransform(false);
  if (fsImg.naturalWidth && fsImg.naturalHeight) {
    fsTicketState.naturalW = fsImg.naturalWidth;
    fsTicketState.naturalH = fsImg.naturalHeight;
    applyTicketFsTransform(false);
  } else {
    fsImg.onload = () => {
      fsTicketState.naturalW = fsImg.naturalWidth || 1024;
      fsTicketState.naturalH = fsImg.naturalHeight || 921;
      applyTicketFsTransform(false);
    };
  }
};

window.closeTicketFullscreen = () => {
  const modal = document.getElementById('ticket-fullscreen-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  fsTicketState.isOpen = false;
  fsTicketState.isDragging = false;
  fsTicketState.isPinching = false;
};

window.toggleTicketFsRotation = () => {
  fsTicketState.rotation = (fsTicketState.rotation + 90) % 360;
  applyTicketFsTransform(true);
};

window.adjustTicketFsZoom = (delta) => {
  fsTicketState.userZoom = Math.max(0.6, Math.min(4.0, fsTicketState.userZoom + delta));
  applyTicketFsTransform(true);
};

window.resetTicketFsZoom = () => {
  fsTicketState.userZoom = 1.0;
  fsTicketState.panX = 0;
  fsTicketState.panY = 0;
  applyTicketFsTransform(true);
};

function setupTicketFullscreenGestures() {
  const viewport = document.getElementById('ticket-fs-viewport');
  if (!viewport) return;

  // Gestion tactile Mobile (Pinch to zoom, pan, double-tap)
  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      fsTicketState.isPinching = true;
      fsTicketState.isDragging = false;
      fsTicketState.initialPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      fsTicketState.initialPinchZoom = fsTicketState.userZoom;
    } else if (e.touches.length === 1) {
      fsTicketState.isDragging = true;
      fsTicketState.startX = e.touches[0].clientX;
      fsTicketState.startY = e.touches[0].clientY;

      // Double tap pour basculer le zoom
      const now = Date.now();
      if (now - fsTicketState.lastTapTime < 300) {
        if (fsTicketState.userZoom > 1.15) {
          window.resetTicketFsZoom();
        } else {
          fsTicketState.userZoom = 2.2;
          applyTicketFsTransform(true);
        }
      }
      fsTicketState.lastTapTime = now;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (fsTicketState.isPinching && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (fsTicketState.initialPinchDist > 0) {
        const factor = dist / fsTicketState.initialPinchDist;
        fsTicketState.userZoom = Math.max(0.6, Math.min(4.0, fsTicketState.initialPinchZoom * factor));
        applyTicketFsTransform(false);
      }
    } else if (fsTicketState.isDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - fsTicketState.startX;
      const dy = e.touches[0].clientY - fsTicketState.startY;
      fsTicketState.panX += dx;
      fsTicketState.panY += dy;
      fsTicketState.startX = e.touches[0].clientX;
      fsTicketState.startY = e.touches[0].clientY;
      applyTicketFsTransform(false);
    }
  }, { passive: true });

  const endTouch = () => {
    fsTicketState.isDragging = false;
    fsTicketState.isPinching = false;
  };
  viewport.addEventListener('touchend', endTouch);
  viewport.addEventListener('touchcancel', endTouch);

  // Gestion Souris Desktop (Drag & Wheel Zoom)
  let isMouseDown = false;
  let mouseStartX = 0;
  let mouseStartY = 0;

  viewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isMouseDown = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isMouseDown || !fsTicketState.isOpen) return;
    const dx = e.clientX - mouseStartX;
    const dy = e.clientY - mouseStartY;
    fsTicketState.panX += dx;
    fsTicketState.panY += dy;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    applyTicketFsTransform(false);
  });

  window.addEventListener('mouseup', () => {
    isMouseDown = false;
  });

  viewport.addEventListener('wheel', (e) => {
    if (!fsTicketState.isOpen) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    fsTicketState.userZoom = Math.max(0.6, Math.min(4.0, fsTicketState.userZoom + delta));
    applyTicketFsTransform(true);
  }, { passive: false });

  // Double-clic souris
  viewport.addEventListener('dblclick', () => {
    if (fsTicketState.userZoom > 1.15) {
      window.resetTicketFsZoom();
    } else {
      fsTicketState.userZoom = 2.2;
      applyTicketFsTransform(true);
    }
  });

  // Rotation automatique si le téléphone pivote physiquement
  window.addEventListener('resize', () => {
    if (fsTicketState.isOpen) {
      const isPortrait = window.innerHeight > window.innerWidth;
      if (fsTicketState.rotation === 0 || fsTicketState.rotation === 90) {
        fsTicketState.rotation = isPortrait ? 90 : 0;
      }
      applyTicketFsTransform(true);
    }
  });

  // Fermeture par touche Echap
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fsTicketState.isOpen) {
      window.closeTicketFullscreen();
    }
  });
}

// Effet 3D Tilt interactif sur le billet au survol / toucher
let _clayTiltBound = false;
function setupClaymorphicTicketTilt() {
  if (_clayTiltBound) return;
  const scene = document.getElementById('clay-ticket-scene');
  const card = document.getElementById('clay-ticket-object');
  if (!scene || !card) return;
  _clayTiltBound = true;

  const handleMove = (clientX, clientY) => {
    const rect = scene.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    const rotX = -(y / (rect.height / 2)) * 10;
    const rotY = (x / (rect.width / 2)) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  scene.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
  scene.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  const resetTilt = () => {
    card.style.transform = `perspective(1000px) rotateX(3deg) rotateY(-1deg) scale3d(1, 1, 1)`;
  };
  scene.addEventListener('mouseleave', resetTilt);
  scene.addEventListener('touchend', resetTilt);
}


window.submitInvitationRegistration = async () => {
  const nameEl = document.getElementById('inv-input-name');
  const phoneEl = document.getElementById('inv-input-phone');
  const tableEl = document.getElementById('inv-input-table');
  const hostEl = document.getElementById('inv-input-host');
  const partnerEl = document.getElementById('inv-input-partner');
  const coupleNameEl = document.getElementById('inv-input-couple-name');
  const btn = document.getElementById('inv-btn-submit');

  const gender = document.querySelector('input[name="inv-gender"]:checked')?.value || 'M';
  const ticketType = document.querySelector('input[name="inv-ticket-type"]:checked')?.value || 'seul';
  const name = nameEl ? nameEl.value.trim() : '';
  const phone = phoneEl ? phoneEl.value.trim() : '';
  const rawTable = tableEl ? tableEl.value.trim() : '';
  const host = hostEl ? hostEl.value.trim() : '';
  const rank = document.getElementById('inv-input-rank')?.value.trim() || "Invitée de Marque";
  const partnerName = partnerEl ? partnerEl.value.trim() : '';
  const coupleName = coupleNameEl ? coupleNameEl.value.trim() : '';

  if (!name) {
    alert("Veuillez saisir votre nom et prénom.");
    nameEl?.focus();
    return;
  }
  if (ticketType === 'couple') {
    if (!partnerName) {
      alert("Veuillez saisir le nom et prénom de votre conjoint.");
      partnerEl?.focus();
      return;
    }
    if (!coupleName) {
      alert("Veuillez indiquer comment nommer votre couple (ex: Couple LEGRAND).");
      coupleNameEl?.focus();
      return;
    }
  }
  if (!phone) {
    alert("Veuillez saisir votre numéro WhatsApp.");
    phoneEl?.focus();
    return;
  }
  if (!rawTable) {
    alert("Veuillez indiquer votre numéro de table.");
    tableEl?.focus();
    return;
  }
  if (!host) {
    alert("Veuillez préciser la personne qui vous a invité.");
    hostEl?.focus();
    return;
  }

  // 1. Normalisation et vérification de la table : A, D, F, G, H, I, J, K, L, M, O, P, Q, S, T, U, V, W, X, Z
  const cleanTable = rawTable.toUpperCase().replace(/^TABLE\s*/i, '').trim();

  // S'assurer d'avoir les dernières tables autorisées
  const allowedTables = dynamicGalaTables.length > 0 ? dynamicGalaTables : DEFAULT_GALA_TABLES;

  if (!allowedTables.includes(cleanTable)) {
    // Affichage de la modale de réassurance demandée par le client
    const invalidModal = document.getElementById('invitation-invalid-table-modal');
    if (invalidModal) {
      invalidModal.style.display = 'flex';
    } else {
      alert("Table non valide ! Ne stressez pas, contactez la personne qui vous invite pour qu'elle vous fournisse votre Numéro de table, puis revenez compléter.");
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span> Génération de votre billet officiel...`;
  }

  // Toujours générer un identifiant personnalisé et unique dédié avec le nom de l'invité
  const freshGuestId = buildGuestTicketId(name, coupleName, ticketType);

  const payload = {
    id: freshGuestId,
    name,
    gender,
    ticket_type: ticketType,
    partner_name: partnerName,
    couple_name: coupleName,
    phone,
    table_number: cleanTable,
    invited_by: host,
    role: rank,
    photo_url: currentInvitationPhotoBase64 || '',
    avatar_emoji: gender === 'F' ? '👑' : '🎉'
  };

  try {
    const res = await Api.registerByInvitationLink(payload);
    const guestObj = (res && res.guest) ? res.guest : payload;

    AppState.setGuest(guestObj);
    updateGuestHeader();

    // Rendu haute fidélité du Billet d'invitation sur Canvas avec le nom du couple ou le nom de l'invité
    await window.renderInvitationTicket(guestObj);

    // Mettre à jour les détails récapitulatifs
    const formView = document.getElementById('invitation-form-view');
    const successView = document.getElementById('invitation-success-view');
    const detailsEl = document.getElementById('inv-summary-details');

    const displayName = ticketType === 'couple' 
      ? `<strong>${escapeHtml(coupleName)}</strong> (${escapeHtml(name)} & ${escapeHtml(partnerName)})`
      : `<strong>${escapeHtml(name)}</strong>`;

    if (detailsEl) {
      detailsEl.innerHTML = `
        <div>🎟️ Billet : ${displayName}</div>
        <div>🍽️ Table réservée : <strong>Table ${escapeHtml(cleanTable)}</strong></div>
        <div>💬 Contact WhatsApp : <strong>${escapeHtml(phone)}</strong></div>
        <div>👑 Invité(e) par : <strong>${escapeHtml(host)}</strong></div>
        <div style="margin-top: 6px; font-size: 0.78rem; color: #10b981;">✓ Inscription enregistrée avec succès pour le 24 Octobre 2026</div>
      `;
    }

    if (formView) formView.style.display = 'none';
    if (successView) successView.style.display = 'block';

    // Nettoyer le brouillon et la photo une fois validé
    currentInvitationPhotoBase64 = null;
    try { localStorage.removeItem('compagnon_invite_draft'); } catch(e) {}

    window.showToast(`Félicitations ${name} ! Votre billet officiel 3D est prêt.`, "success");

    // Fermer l'ancienne modale d'inscription et ouvrir directement la modale 3D Claymorphic
    setTimeout(() => {
      window.closeInvitationModal();
      window.openClaymorphicTicketModal(guestObj);
    }, 350);
  } catch (err) {
    console.error("Erreur enregistrement invitation link:", err);

    // Si l'erreur du serveur indique une table non valide
    if (err && err.details && err.details.invalid_table) {
      const invalidModal = document.getElementById('invitation-invalid-table-modal');
      if (invalidModal) invalidModal.style.display = 'flex';
      return;
    }

    // Sinon repli local avec rendu du billet
    AppState.setGuest(payload);
    updateGuestHeader();
    await window.renderInvitationTicket(payload);

    const formView = document.getElementById('invitation-form-view');
    const successView = document.getElementById('invitation-success-view');
    const detailsEl = document.getElementById('inv-summary-details');

    if (detailsEl) {
      detailsEl.innerHTML = `
        <div>🎟️ Billet : <strong>${escapeHtml(ticketType === 'couple' ? coupleName : name)}</strong></div>
        <div>🍽️ Table : <strong>Table ${escapeHtml(cleanTable)}</strong></div>
        <div>👑 Invité(e) par : <strong>${escapeHtml(host)}</strong></div>
        <div style="margin-top: 6px; font-size: 0.78rem; color: #10b981;">✓ Validé sur votre appareil (synchronisation automatique)</div>
      `;
    }
    if (formView) formView.style.display = 'none';
    if (successView) successView.style.display = 'block';

    // Nettoyer le brouillon une fois validé
    try { localStorage.removeItem('compagnon_invite_draft'); } catch(e) {}

    setTimeout(() => {
      window.closeInvitationModal();
      window.openClaymorphicTicketModal(payload);
    }, 350);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>✨</span> Confirmer mon invitation & Générer mon billet ➔`;
    }
  }
};

window.enterAppFromInvitation = () => {
  window.closeInvitationModal();

  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    url.searchParams.delete('invitation');
    url.searchParams.delete('par');
    url.searchParams.delete('hote');
    url.searchParams.delete('by');
    window.history.replaceState({}, '', url.pathname + url.search);
  } catch(e) {}

  window.showToast("Bienvenue au Dîner de Gala ! Profitez de la soirée ✨");
};

// ==========================================
// Espace Profil & Parcours Invité (Modale CRM)
// ==========================================
window.openProfileModal = async () => {
  const modal = document.getElementById('modal-guest-profile');
  if (!modal) return;

  const g = AppState.guest || {};
  const nameEl = document.getElementById('profile-input-name');
  const tableEl = document.getElementById('profile-input-table');
  const phoneEl = document.getElementById('profile-input-phone');
  const profEl = document.getElementById('profile-input-profession');
  const compEl = document.getElementById('profile-input-company');
  const resEl = document.getElementById('profile-input-residence');
  const churchSelect = document.getElementById('profile-select-has-church');
  const churchNameEl = document.getElementById('profile-input-church-name');
  const churchBox = document.getElementById('profile-church-details-box');
  const pointsEl = document.getElementById('profile-stat-points');

  if (nameEl) nameEl.value = g.name || g.full_name || '';
  if (tableEl) tableEl.value = g.table_number || 'Table 1';
  if (phoneEl) phoneEl.value = g.phone || g.whatsapp || '';
  if (profEl) profEl.value = g.profession || '';
  if (compEl) compEl.value = g.company || '';
  if (resEl) resEl.value = g.residence_location || g.residence || '';

  const hasChurch = g.has_church === 1 || g.has_church === '1' || g.has_church === true || g.has_church === 'oui';
  if (churchSelect) churchSelect.value = hasChurch ? '1' : '0';
  if (churchBox) churchBox.style.display = hasChurch ? 'block' : 'none';
  if (churchNameEl) churchNameEl.value = g.church_name || '';

  if (pointsEl) pointsEl.textContent = g.points || 0;

  // Par défaut sur le premier sous-onglet "info"
  window.switchProfileSubtab('info');

  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('active'));

  // Charger les données enrichies (prières + réseautage) en arrière-plan
  window.loadGuestProfileData();
};

window.closeProfileModal = () => {
  const modal = document.getElementById('modal-guest-profile');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      if (!modal.classList.contains('active')) modal.style.display = 'none';
    }, 200);
  }
};

window.switchProfileSubtab = (subTab) => {
  const subTabs = ['info', 'prayers', 'networking', 'points'];
  subTabs.forEach(t => {
    const btn = document.getElementById(`btn-profile-subtab-${t}`);
    const content = document.getElementById(`profile-subtab-content-${t}`);
    if (btn) btn.classList.toggle('active', t === subTab);
    if (content) content.style.display = (t === subTab) ? 'block' : 'none';
  });
};

window.saveProfileCoordinates = async () => {
  const name = document.getElementById('profile-input-name')?.value.trim();
  const table = document.getElementById('profile-input-table')?.value.trim() || 'Table 1';
  const phone = document.getElementById('profile-input-phone')?.value.trim() || '';
  const profession = document.getElementById('profile-input-profession')?.value.trim() || '';
  const company = document.getElementById('profile-input-company')?.value.trim() || '';
  const residenceLocation = document.getElementById('profile-input-residence')?.value.trim() || '';
  const hasChurchVal = document.getElementById('profile-select-has-church')?.value;
  const hasChurch = hasChurchVal === '1' ? 1 : 0;
  const churchName = document.getElementById('profile-input-church-name')?.value.trim() || '';
  const submitBtn = document.getElementById('btn-save-profile-coords');

  if (!name) {
    alert("Veuillez renseigner votre nom complet.");
    return;
  }

  const guestId = AppState.guest ? AppState.guest.id : `guest-${Date.now()}`;
  const updatedGuest = {
    ...(AppState.guest || {}),
    id: guestId,
    name,
    table_number: table,
    phone,
    whatsapp: phone,
    profession,
    company,
    residence_location: residenceLocation,
    has_church: hasChurch,
    church_name: hasChurch ? churchName : '',
  };

  AppState.setGuest(updatedGuest);
  localStorage.setItem('compagnon_guest', JSON.stringify(updatedGuest));
  updateGuestHeader();

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Enregistrement...";
  }

  try {
    await Api.request('/guests/profile', {
      method: 'POST',
      body: JSON.stringify(updatedGuest)
    });
    window.showToast("✅ Vos coordonnées ont été enregistrées avec succès !", "success");
    window.closeProfileModal();
  } catch (err) {
    window.showToast("Coordonnées sauvegardées localement.", "info");
    window.closeProfileModal();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "💾 Enregistrer mes coordonnées";
    }
  }
};

window.loadGuestProfileData = async () => {
  const guestId = AppState.guest?.id;
  const prayersContainer = document.getElementById('profile-prayers-list');
  const netContainer = document.getElementById('profile-net-summary-box');

  // 1. Prières locales & distantes
  let localPrayers = [];
  try {
    localPrayers = JSON.parse(localStorage.getItem('compagnon_my_prayers') || '[]');
  } catch (_) {}

  // 2. Fiche réseautage locale
  let myNet = null;
  try {
    myNet = JSON.parse(localStorage.getItem('compagnon_my_net_profile') || 'null');
  } catch (_) {}

  if (guestId) {
    try {
      const res = await Api.request(`/guests/detail?id=${guestId}`);
      if (res) {
        if (Array.isArray(res.prayers) && res.prayers.length > 0) {
          localPrayers = res.prayers;
        }
        if (res.networking) {
          myNet = res.networking;
        }
      }
    } catch (_) {}
  }

  // Rendu de la liste des prières
  if (prayersContainer) {
    if (localPrayers.length === 0) {
      prayersContainer.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 0; color: var(--text-muted); font-size: 0.85rem;">
          <span style="font-size: 1.6rem; display: block; margin-bottom: 4px;">🕊️</span>
          Vous n'avez pas encore envoyé de requête de prière.<br>
          <button type="button" class="btn-primary" style="margin-top: 8px; font-size: 0.78rem;" onclick="window.closeProfileModal(); window.PrayerWizard?.open();">
            Déposer une intention pastorale
          </button>
        </div>
      `;
    } else {
      prayersContainer.innerHTML = localPrayers.map(p => `
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,55,0.25); border-radius: 12px; padding: 10px 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #d4af37; font-size: 0.84rem;">${escapeHtml(p.title || 'Sujet de prière')}</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">${p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ce soir'}</span>
          </div>
          <p style="margin: 0; font-size: 0.78rem; color: var(--text-main); line-height: 1.35;">
            ${escapeHtml(p.content || '')}
          </p>
          <div style="font-size: 0.7rem; color: #10b981; font-weight: 700; margin-top: 6px;">
            ✓ Transmis à l'équipe pastorale (Confidentiel)
          </div>
        </div>
      `).join('');
    }
  }

  // Rendu du résumé de réseautage
  if (netContainer) {
    if (myNet) {
      netContainer.innerHTML = `
        <div style="background: rgba(255, 122, 69, 0.08); border: 1px solid rgba(255, 122, 69, 0.3); border-radius: 16px; padding: 16px; text-align: left;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
            ${myNet.photo_url ? `<img src="${myNet.photo_url}" style="width: 50px; height: 50px; border-radius: 14px; object-fit: cover; border: 2px solid #ff7a45;">` : '<span style="font-size: 2rem;">👤</span>'}
            <div>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-main);">${escapeHtml(myNet.full_name || AppState.guest?.name || '')}</div>
              <div style="font-size: 0.8rem; color: #ff7a45; font-weight: 700;">${escapeHtml(myNet.profession || '')}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(myNet.company || '')}</div>
            </div>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 12px;">
            ${escapeHtml(myNet.bio || '')}
          </div>
          <button type="button" class="btn-primary" style="width: 100%; font-size: 0.82rem;" onclick="window.closeProfileModal(); window.NetworkingWizard?.open();">
            ✏️ Modifier ma fiche de réseautage
          </button>
        </div>
      `;
    } else {
      netContainer.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 0; color: var(--text-muted);">
          <span style="font-size: 2rem; display: block; margin-bottom: 6px;">🤝</span>
          Vous n'avez pas encore publié votre fiche de contact.<br>
          <span style="font-size: 0.76rem;">Partagez votre profil avec vos voisins de table pour échanger en 1 clic.</span><br>
          <button type="button" class="btn-primary" style="margin-top: 12px; font-size: 0.82rem;" onclick="window.closeProfileModal(); window.NetworkingWizard?.open();">
            ✨ Créer ma fiche de réseautage
          </button>
        </div>
      `;
    }
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

// ==========================================
// Métriques dynamiques de l'Accueil (Prières & Réseautage)
// ==========================================
function getFictionalPrayerCount(realCount = 0) {
  const now = Date.now();
  const anchor = 1792454400000;
  const slotMinutes = 10;
  const slotMs = slotMinutes * 60 * 1000;
  const elapsedSlots = Math.max(0, Math.floor((now - anchor) / slotMs));

  let simulatedBonus = 0;
  const cappedSlots = Math.min(elapsedSlots, 200);
  for (let s = 1; s <= cappedSlots; s++) {
    const inc = (((s * 9301 + 49297) % 233280) % 15) + 1;
    simulatedBonus += inc;
  }
  if (elapsedSlots > 200) {
    simulatedBonus += (elapsedSlots - 200) * 8;
  }

  const base = 102;
  return base + simulatedBonus + (Number(realCount) || 0);
}

async function updateHomeMetrics() {
  // 1. Compteur Prières (102 de base, +1 à 15 aléatoire chaque 10 min, + envois réels)
  const prayerCountEl = document.getElementById('prayer-display-count');
  if (prayerCountEl) {
    let realPrayers = 0;
    try {
      if (Api && typeof Api.getPrayers === 'function') {
        const prayers = await Api.getPrayers();
        if (Array.isArray(prayers)) realPrayers = prayers.length;
      }
    } catch (_) {}
    prayerCountEl.textContent = getFictionalPrayerCount(realPrayers);
  }

  // 2. Compteur Réseautage (10 profils de base + nombre réel de profils publiés)
  const netCountEl = document.getElementById('networking-display-count');
  if (netCountEl) {
    let realNet = 0;
    try {
      if (Api && typeof Api.getNetworkingProfiles === 'function') {
        const netProfiles = await Api.getNetworkingProfiles();
        if (Array.isArray(netProfiles)) realNet = netProfiles.length;
      }
    } catch (_) {}
    const baseNetworking = 10;
    netCountEl.textContent = baseNetworking + realNet;
  }
}
window.updateHomeMetrics = updateHomeMetrics;

// Sous-onglets de l'onglet Jeux (Jeux Bibliques vs Duel Tables)
window.switchGameSubTab = (subTab) => {
  const bibleContainer = document.getElementById('bible-games-container');
  const liveContainer = document.getElementById('live-games-container');
  const btnBible = document.getElementById('btn-mode-bible-games');
  const btnDuel = document.getElementById('btn-mode-duel-games');

  if (btnBible) {
    btnBible.classList.remove('active', 'btn-3d-gold', 'btn-3d-coral');
    btnBible.classList.add('btn-3d-porcelain');
  }
  if (btnDuel) {
    btnDuel.classList.remove('active', 'btn-3d-gold', 'btn-3d-coral');
    btnDuel.classList.add('btn-3d-porcelain');
  }

  if (subTab === 'duel') {
    if (bibleContainer) bibleContainer.style.display = 'none';
    if (liveContainer) liveContainer.style.display = 'block';
    if (btnDuel) {
      btnDuel.classList.remove('btn-3d-porcelain');
      btnDuel.classList.add('active', 'btn-3d-coral');
    }
    window.GamesModule?.openDuelLobby();
  } else {
    // Mode Jeux Bibliques par défaut
    if (bibleContainer) bibleContainer.style.display = 'block';
    if (liveContainer) liveContainer.style.display = 'none';
    if (btnBible) {
      btnBible.classList.remove('btn-3d-porcelain');
      btnBible.classList.add('active', 'btn-3d-gold');
    }
    window.BibleGames?.init();
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

