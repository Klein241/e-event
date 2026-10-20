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

  // 11. Initialisation et mise à jour des métriques dynamiques d'accueil (Prières & Réseautage)
  updateHomeMetrics();
  setInterval(() => {
    updateHomeMetrics();
  }, 20000);

  // 12. Boucle de rafraîchissement temps réel (Polling doux 5s)
  setInterval(() => {
    refreshCurrentView();
  }, 5000);

  // 13. Retrait fluide de l'écran de chargement anti-flash
  setTimeout(() => {
    if (typeof window.dismissSplash === 'function') {
      window.dismissSplash();
    }
  }, 80);

  // 14. Proposer l'onboarding aux nouveaux invités sans bloquer l'accès
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
    if (titleEl) titleEl.textContent = 'E-event';

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

