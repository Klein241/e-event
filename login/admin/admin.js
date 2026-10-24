/**
 * ============================================================
 * COMPAGNON DE CÉRÉMONIE - JAVASCRIPT DU BACKOFFICE RÉGIE
 * Logique complète pour la production, temps réel & sécurité PIN
 * ============================================================
 */

const API_BASE = '/api';

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

// État de l'administrateur
const AdminState = {
  token: null,
  pin: null,
  activeTab: 'overview',
  overview: null,
  guests: [],
  quizQuestions: [],
  chatMessages: [],
  prayers: [],
  networking: [],
  program: [],
  ads: [],
  directFeatureEnabled: 1,
  pollingTimer: null,
};

// Requête API avec en-têtes d'authentification régie
async function adminFetch(endpoint, options = {}) {
  const pin = AdminState.pin || sessionStorage.getItem('compagnon_admin_pin') || '';
  const token = AdminState.token || sessionStorage.getItem('compagnon_admin_token') || '';

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || pin}`,
    'X-Admin-PIN': pin,
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    logout();
    throw new Error("Session expirée ou code PIN incorrect.");
  }

  if (!res.ok) {
    let errData = {};
    try { errData = await res.json(); } catch (_) {}
    throw new Error(errData.error || errData.message || `Erreur serveur (${res.status})`);
  }

  return await res.json();
}

// Notifications Toasts avec déduplication anti-spam (3.5s)
const _lastAdminToasts = new Map();
function showAdminToast(message, type = 'info') {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;

  const now = Date.now();
  const key = `${type}:${message}`;
  if (_lastAdminToasts.has(key) && (now - _lastAdminToasts.get(key) < 3500)) {
    return; // Évite d'inonder l'écran en boucle de polling
  }
  _lastAdminToasts.set(key, now);

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : '📢';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupNumpad();

  const savedPin = sessionStorage.getItem('compagnon_admin_pin');
  if (savedPin) {
    submitPin(savedPin);
  } else {
    showLoginScreen();
  }
});

// Gestion Thème Neumorphique Clair (défaut) / Sombre
function initTheme() {
  const savedTheme = localStorage.getItem('compagnon_theme') || 'light';
  const isDark = savedTheme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  updateThemeIcon(isDark);
}

window.toggleAdminTheme = () => {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('compagnon_theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
  showAdminToast(isDark ? "🌙 Mode sombre activé" : "☀️ Mode clair activé", "info");
};

function updateThemeIcon(isDark) {
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
}

// Pavé numérique tactile du Login Gate
function setupNumpad() {
  const pinInput = document.getElementById('admin-pin-input');
  const numpadBtns = document.querySelectorAll('.numpad-btn');

  numpadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      if (val === 'clear') {
        pinInput.value = '';
      } else if (val === 'enter') {
        handleLoginSubmit();
      } else if (val) {
        if (pinInput.value.length < 10) {
          pinInput.value += val;
        }
      }
      pinInput.focus();
    });
  });

  pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLoginSubmit();
    }
  });
}

function handleLoginSubmit() {
  const pin = document.getElementById('admin-pin-input').value.trim();
  if (!pin) {
    showAdminToast("Veuillez saisir votre code PIN régie.", "error");
    return;
  }
  submitPin(pin);
}

async function submitPin(pin) {
  const unlockBtn = document.getElementById('btn-unlock-gate');
  if (unlockBtn) {
    unlockBtn.disabled = true;
    unlockBtn.textContent = "Vérification en cours...";
  }

  try {
    const res = await fetch(`${API_BASE}/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Code PIN invalide");
    }

    AdminState.pin = pin;
    AdminState.token = data.token;
    sessionStorage.setItem('compagnon_admin_pin', pin);
    sessionStorage.setItem('compagnon_admin_token', data.token);

    showDashboardScreen();
    showAdminToast(`Bienvenue dans la régie : ${data.event_name}`, "success");
    startLivePolling();
  } catch (err) {
    showAdminToast(err.message, "error");
    sessionStorage.removeItem('compagnon_admin_pin');
    sessionStorage.removeItem('compagnon_admin_token');
    showLoginScreen();
  } finally {
    if (unlockBtn) {
      unlockBtn.disabled = false;
      unlockBtn.textContent = "Déverrouiller l'Espace Régie 🔓";
    }
  }
}

function showLoginScreen() {
  document.getElementById('admin-login-screen').style.display = 'flex';
  document.getElementById('admin-dashboard-screen').style.display = 'none';
  document.getElementById('btn-logout').style.display = 'none';
  if (AdminState.pollingTimer) clearInterval(AdminState.pollingTimer);
}

function showDashboardScreen() {
  document.getElementById('admin-login-screen').style.display = 'none';
  document.getElementById('admin-dashboard-screen').style.display = 'flex';
  document.getElementById('btn-logout').style.display = 'inline-flex';
  setupNavigationTabs();
  loadCurrentTab();
}

function logout() {
  sessionStorage.removeItem('compagnon_admin_pin');
  sessionStorage.removeItem('compagnon_admin_token');
  AdminState.pin = null;
  AdminState.token = null;
  document.getElementById('admin-pin-input').value = '';
  showLoginScreen();
  showAdminToast("Déconnexion de la régie effectuée", "info");
}
window.adminLogout = logout;

// Configuration des onglets
function setupNavigationTabs() {
  const tabs = document.querySelectorAll('.admin-tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabKey = btn.dataset.tab;
      switchAdminTab(tabKey);
    });
  });
}

function switchAdminTab(tabKey) {
  AdminState.activeTab = tabKey;

  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabKey);
  });

  document.querySelectorAll('.admin-tab-content').forEach(view => {
    view.classList.toggle('active', view.id === `tab-${tabKey}`);
  });

  loadCurrentTab();
}

function loadCurrentTab() {
  switch (AdminState.activeTab) {
    case 'overview':
      loadOverview();
      break;
    case 'push':
      loadPushHistory();
      break;
    case 'quiz':
      loadQuiz();
      break;
    case 'chat':
      loadChat();
      break;
    case 'prayers':
      loadPrayers();
      break;
    case 'networking':
      loadNetworking();
      break;
    case 'guests':
      loadGuests();
      break;
    case 'program':
      loadProgram();
      break;
    case 'ads':
      loadAds();
      break;
  }
}

function startLivePolling() {
  if (AdminState.pollingTimer) clearInterval(AdminState.pollingTimer);
  AdminState.pollingTimer = setInterval(() => {
    if (!document.hidden) {
      loadCurrentTab();
      window.loadAdminPinnedNote();
    }
  }, 20000);
}

// -------------------------------------------------------------
// GESTION DE LA NOTE ÉPINGLÉE RÉGIE (Hôtesses & Superviseur)
// -------------------------------------------------------------
window.loadAdminPinnedNote = async () => {
  try {
    const res = await fetch('/api/shared/pinned-note');
    if (!res.ok) return;
    const data = await res.json();
    const inputEl = document.getElementById('admin-pinned-note-input');
    const badgeEl = document.getElementById('badge-pinned-note-status');
    const updatedEl = document.getElementById('admin-pinned-note-last-updated');

    if (data && data.success && data.note && data.note.is_active && data.note.content) {
      if (inputEl) inputEl.value = data.note.content;
      if (badgeEl) {
        badgeEl.textContent = '🟢 Note Active & Épinglée';
        badgeEl.style.background = 'rgba(16, 185, 129, 0.2)';
        badgeEl.style.color = '#34d399';
      }
      if (updatedEl) {
        const timeStr = new Date(data.note.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        updatedEl.textContent = `Dernière mise à jour : ${timeStr} par ${data.note.author || 'Régie'}`;
      }
    } else {
      if (badgeEl) {
        badgeEl.textContent = '⚪ Aucune note active';
        badgeEl.style.background = 'rgba(255, 255, 255, 0.1)';
        badgeEl.style.color = 'var(--text-muted)';
      }
      if (updatedEl) {
        updatedEl.textContent = 'Aucune consigne épinglée actuellement';
      }
    }
  } catch (err) {
    console.error('Erreur chargement note admin:', err);
  }
};

window.adminSavePinnedNote = async () => {
  const inputEl = document.getElementById('admin-pinned-note-input');
  const content = (inputEl ? inputEl.value : '').trim();
  const btn = document.getElementById('btn-save-pinned-note');

  if (!content) {
    alert('Veuillez saisir le texte de la consigne avant de l\'épingler.');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Diffusion...';
  }

  try {
    const res = await fetch('/api/admin/pinned-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        author: 'Régie Générale',
        is_active: 1
      })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Erreur lors de la sauvegarde de la note');
    }

    alert('✅ Note épinglée avec succès ! Elle est immédiatement visible chez les Hôtesses et le Superviseur.');
    window.loadAdminPinnedNote();
  } catch (err) {
    console.error('Erreur épinglage note:', err);
    alert(`Erreur : ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>📌</span> Épingler chez Hôtesses & Superviseur';
    }
  }
};

window.adminRemovePinnedNote = async () => {
  if (!confirm('Êtes-vous sûr de vouloir retirer la note épinglée chez les hôtesses et le superviseur ?')) {
    return;
  }

  try {
    const res = await fetch('/api/admin/pinned-note', { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Erreur lors du retrait de la note');
    }

    const inputEl = document.getElementById('admin-pinned-note-input');
    if (inputEl) inputEl.value = '';

    alert('✅ Note retirée avec succès.');
    window.loadAdminPinnedNote();
  } catch (err) {
    console.error('Erreur retrait note:', err);
    alert(`Erreur : ${err.message}`);
  }
};

// -------------------------------------------------------------
// 1. VUE D'ENSEMBLE (OVERVIEW)
// -------------------------------------------------------------
async function loadOverview() {
  try {
    const data = await adminFetch('/admin/overview');
    AdminState.overview = data;
    renderOverview(data);
    window.loadAdminPinnedNote();
  } catch (err) {
    console.error("Erreur chargement overview:", err);
  }
}

function getPublicPrayerCount(realCount = 0) {
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

function renderOverview(data) {
  const { stats, event, active_quiz } = data;

  // Mise à jour des compteurs KPIs
  document.getElementById('kpi-guests-count').textContent = stats.guests_count || 0;
  document.getElementById('kpi-tables-count').textContent = stats.tables_count || 0;
  document.getElementById('kpi-chat-count').textContent = stats.chat_count || 0;
  
  const realPrayers = stats.prayers_count || 0;
  const fakePrayers = getPublicPrayerCount(realPrayers);
  document.getElementById('kpi-prayers-count').textContent = realPrayers;
  const realKpi = document.getElementById('admin-prayers-real-kpi');
  const fakeKpi = document.getElementById('admin-prayers-fake-kpi');
  if (realKpi) realKpi.textContent = realPrayers;
  if (fakeKpi) fakeKpi.textContent = fakePrayers;

  document.getElementById('kpi-networking-count').textContent = stats.networking_count || 0;
  document.getElementById('kpi-push-count').textContent = stats.push_subscribers_count || 0;

  // En-tête événement
  const titleEl = document.getElementById('admin-event-name');
  if (titleEl && event) titleEl.textContent = event.name;

  // Question active en direct
  const activeQuizCard = document.getElementById('overview-active-quiz-box');
  if (active_quiz) {
    activeQuizCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <span class="status-pill status-active">🔴 EN DIRECT SUR LES TÉLÉPHONES</span>
        <button class="btn-table-action danger" onclick="closeLiveQuizQuestion()">⏹️ Clôturer</button>
      </div>
      <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-top: 0.5rem;">${escapeHtml(active_quiz.question)}</h4>
      <p style="font-size: 0.82rem; color: var(--text-muted);">Points en jeu : <strong>${active_quiz.points} pts</strong> | Durée : ${active_quiz.duration_seconds}s</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 0.5rem;">
        <div style="padding: 6px 10px; border-radius: 8px; background: var(--bg-secondary); font-size: 0.8rem;">A: ${escapeHtml(active_quiz.option_a)}</div>
        <div style="padding: 6px 10px; border-radius: 8px; background: var(--bg-secondary); font-size: 0.8rem;">B: ${escapeHtml(active_quiz.option_b)}</div>
      </div>
    `;
  } else {
    activeQuizCard.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.88rem; margin: 0;">Aucune question de quiz n'est actuellement en direct sur les téléphones.</p>
      <button class="btn-table-action" style="margin-top: 0.75rem; background: var(--terracotta-gradient); color: #fff; font-weight: 800;" onclick="switchAdminTab('quiz')">
        🚀 Propulser une question
      </button>
    `;
  }

  // Pré-remplir le formulaire d'édition d'événement si ouvert
  if (event) {
    const nameInput = document.getElementById('edit-event-name');
    const subInput = document.getElementById('edit-event-subtitle');
    const venueInput = document.getElementById('edit-event-venue');
    if (nameInput && !nameInput.value) nameInput.value = event.name || '';
    if (subInput && !subInput.value) subInput.value = event.subtitle || '';
    if (venueInput && !venueInput.value) venueInput.value = event.venue || '';

    // Mise à jour de l'état Direct vs Programme
    const directEnabled = event.direct_feature_enabled !== undefined && event.direct_feature_enabled !== null 
      ? Number(event.direct_feature_enabled) 
      : 1;
    AdminState.directFeatureEnabled = directEnabled;
    updateDirectToggleUI(directEnabled);
  }
}

window.saveEventDetails = async (e) => {
  e.preventDefault();
  const name = document.getElementById('edit-event-name').value.trim();
  const subtitle = document.getElementById('edit-event-subtitle').value.trim();
  const venue = document.getElementById('edit-event-venue').value.trim();

  try {
    await adminFetch('/admin/event/update', {
      method: 'POST',
      body: JSON.stringify({ name, subtitle, venue }),
    });
    showAdminToast("Informations de la soirée mises à jour !", "success");
    loadOverview();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

// -------------------------------------------------------------
// 2. RÉGIE PUSH & DIFFUSION D'ALERTES
// -------------------------------------------------------------

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

window.refreshPushSubscribersCount = async () => {
  const badge = document.getElementById('badge-push-live-subscribers');
  const kpiCount = document.getElementById('kpi-push-count');
  try {
    const res = await adminFetch('/push/subscribers-count');
    const total = res.total !== undefined ? res.total : 0;
    if (kpiCount) kpiCount.textContent = total;
    if (badge) {
      if (total === 0) {
        badge.className = 'status-pill status-ended';
        badge.innerHTML = '⚠️ 0 appareil abonné (ouvrez un billet invité pour tester)';
      } else {
        badge.className = 'status-pill status-active';
        badge.innerHTML = `🟢 ${total} appareil${total > 1 ? 's' : ''} abonné${total > 1 ? 's' : ''}`;
      }
    }
    return total;
  } catch (err) {
    if (badge) badge.textContent = 'Compteur hors-ligne';
    return 0;
  }
};

window.subscribeAdminToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    showAdminToast("Les notifications Push ne sont pas supportées sur ce navigateur", "error");
    return null;
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      showAdminToast("Autorisation de notification refusée par votre navigateur", "error");
      return null;
    }

    const keyRes = await fetch('/api/push/vapid-public-key').then(r => r.json());
    if (!keyRes || !keyRes.publicKey) {
      throw new Error("Impossible de récupérer la clé VAPID depuis le serveur");
    }

    let reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const appKey = urlBase64ToUint8Array(keyRes.publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appKey,
      });
    }

    await adminFetch('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        subscription: sub.toJSON(),
        guest_id: 'admin-regie'
      })
    });

    showAdminToast("✅ Cet appareil est désormais abonné aux alertes push !", "success");
    window.refreshPushSubscribersCount();
    return sub;
  } catch (err) {
    showAdminToast("Erreur d'abonnement push : " + err.message, "error");
    return null;
  }
};

window.testAdminPush = async () => {
  const btn = document.getElementById('btn-admin-test-push');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Test en cours...';
  }

  try {
    let sub = null;
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg) {
        sub = await reg.pushManager.getSubscription();
      }
    }

    if (!sub) {
      showAdminToast("Abonnement préalable de cet appareil...", "info");
      sub = await window.subscribeAdminToPush();
      if (!sub) {
        throw new Error("Impossible d'activer les notifications sur cet appareil.");
      }
    }

    const subJson = sub.toJSON();
    const testRes = await adminFetch('/push/test', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        admin_pin: AdminState.pin
      })
    });

    if (testRes.success) {
      showAdminToast("🎉 Notification de test reçue avec succès sur votre appareil !", "success");
    } else {
      showAdminToast("⚠️ Résultat test : " + (testRes.message || testRes.status), "info");
    }
    loadPushHistory();
  } catch (err) {
    showAdminToast("Erreur test push : " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🧪</span> Tester la notification sur cet écran';
    }
  }
};

window.sendCustomBroadcast = async (e) => {
  e.preventDefault();
  const title = document.getElementById('push-title').value.trim();
  const body = document.getElementById('push-body').value.trim();
  const url = document.getElementById('push-url').value.trim() || '/dinedegala2026/';
  const tag = document.getElementById('push-tag').value || 'gala-alert';

  if (!title || !body) {
    showAdminToast("Titre et message obligatoires pour la diffusion", "error");
    return;
  }

  const btn = document.getElementById('btn-send-push');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Diffusion en cours...";
  }

  try {
    const res = await adminFetch('/push/broadcast', {
      method: 'POST',
      body: JSON.stringify({ title, body, url, tag, admin_pin: AdminState.pin }),
    });

    if (res.recipients_count > 0) {
      showAdminToast(`📢 Alerte diffusée avec succès ! Reçue par ${res.recipients_count} appareil(s) actif(s).`, "success");
    } else {
      showAdminToast(`📢 Alerte enregistrée dans le journal. (0 appareil n'était connecté actuellement)`, "info");
    }

    document.getElementById('broadcast-admin-form').reset();
    loadPushHistory();
    window.refreshPushSubscribersCount();
  } catch (err) {
    showAdminToast(err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🚀 Diffuser la notification push maintenant";
    }
  }
};

window.sendPushPreset = (title, body, url = '/dinedegala2026/') => {
  document.getElementById('push-title').value = title;
  document.getElementById('push-body').value = body;
  document.getElementById('push-url').value = url;
  document.getElementById('broadcast-admin-form').scrollIntoView({ behavior: 'smooth' });
  showAdminToast("Modèle chargé dans le diffuseur. Cliquez sur Diffuser pour envoyer.", "info");
};

async function loadPushHistory() {
  try {
    window.refreshPushSubscribersCount();
    const history = await adminFetch('/push/history');
    const container = document.getElementById('push-history-list');
    if (!container) return;

    if (!history || history.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Aucune notification diffusée pour le moment.</p>`;
      return;
    }

    container.innerHTML = history.map(item => `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <div>
          <strong style="color: var(--text-main); font-size: 0.9rem;">${escapeHtml(item.title)}</strong>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 2px 0 0;">${escapeHtml(item.body)}</p>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <span class="status-pill status-ended">${item.recipient_count || 0} récepteur(s)</span>
          <p style="font-size: 0.7rem; color: var(--text-dim); margin-top: 4px;">${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("Erreur chargement historique push:", err);
  }
}

// -------------------------------------------------------------
// 3. GESTION DU QUIZ & JEUX EN DIRECT
// -------------------------------------------------------------
async function loadQuiz() {
  try {
    const [questions, leaderboard] = await Promise.all([
      adminFetch('/admin/quiz/questions'),
      adminFetch('/games/quiz/leaderboard').catch(() => ({ tables: [], guests: [] })),
    ]);

    AdminState.quizQuestions = questions;
    renderQuizQuestions(questions);
    renderLeaderboard(leaderboard);
  } catch (err) {
    console.error("Erreur chargement quiz:", err);
  }
}

function renderQuizQuestions(questions) {
  const tbody = document.getElementById('quiz-questions-tbody');
  if (!tbody) return;

  if (!questions || questions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Aucune question enregistrée. Créez-en une ci-dessous.</td></tr>`;
    return;
  }

  tbody.innerHTML = questions.map(q => {
    const isActive = q.status === 'active';
    const statusHtml = isActive 
      ? `<span class="status-pill status-active">🔴 En direct</span>`
      : q.status === 'ended' 
        ? `<span class="status-pill status-ended">Terminée</span>` 
        : `<span class="status-pill status-pending">En attente</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(q.question)}</strong></td>
        <td><span style="font-weight: 800; color: var(--terracotta-accent);">${q.correct_option}</span></td>
        <td>${q.duration_seconds}s</td>
        <td>${q.points} pts</td>
        <td>${statusHtml}</td>
        <td>
          <div class="table-actions">
            ${isActive 
              ? `<button class="btn-table-action danger" onclick="closeLiveQuizQuestion()">Arrêter</button>` 
              : `<button class="btn-table-action" style="background: var(--terracotta-gradient); color:#fff;" onclick="launchQuizQuestion('${q.id}')">🚀 Lancer</button>`
            }
            <button class="btn-table-action danger" onclick="deleteQuizQuestion('${q.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderLeaderboard(data) {
  const tablesContainer = document.getElementById('leaderboard-tables-list');
  const guestsContainer = document.getElementById('leaderboard-guests-list');

  if (tablesContainer) {
    const tables = data.tables || [];
    if (tables.length === 0) {
      tablesContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Aucun point encore marqué.</p>`;
    } else {
      tablesContainer.innerHTML = tables.slice(0, 5).map((t, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-secondary); border-radius: 12px; font-size: 0.85rem;">
          <span>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎖️'} Table ${escapeHtml(t.table_number)}</span>
          <strong style="color: var(--terracotta-accent);">${t.total_points} pts</strong>
        </div>
      `).join('');
    }
  }

  if (guestsContainer) {
    const guests = data.guests || [];
    if (guests.length === 0) {
      guestsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Aucun score individuel.</p>`;
    } else {
      guestsContainer.innerHTML = guests.slice(0, 5).map((g, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-secondary); border-radius: 12px; font-size: 0.85rem;">
          <span>${i === 0 ? '👑' : '⭐'} ${escapeHtml(g.guest_name)} (Table ${escapeHtml(g.table_number)})</span>
          <strong style="color: var(--terracotta-accent);">${g.total_points} pts</strong>
        </div>
      `).join('');
    }
  }
}

window.createQuizQuestion = async (e) => {
  e.preventDefault();
  const question = document.getElementById('new-q-text').value.trim();
  const option_a = document.getElementById('new-q-a').value.trim();
  const option_b = document.getElementById('new-q-b').value.trim();
  const option_c = document.getElementById('new-q-c').value.trim();
  const option_d = document.getElementById('new-q-d').value.trim();
  const correct_option = document.getElementById('new-q-correct').value;
  const explanation = document.getElementById('new-q-expl').value.trim();
  const duration_seconds = document.getElementById('new-q-duration').value || 20;
  const points = document.getElementById('new-q-points').value || 100;
  const launch_now = document.getElementById('new-q-launch-now').checked;

  try {
    await adminFetch('/admin/quiz/question/create', {
      method: 'POST',
      body: JSON.stringify({ question, option_a, option_b, option_c, option_d, correct_option, explanation, duration_seconds, points, launch_now }),
    });

    showAdminToast(launch_now ? "Question lancée en direct !" : "Question enregistrée dans la banque.", "success");
    document.getElementById('new-quiz-form').reset();
    loadQuiz();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

window.launchQuizQuestion = async (questionId) => {
  try {
    await adminFetch('/admin/quiz/question/launch', {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId }),
    });
    showAdminToast("Question propulsée en direct sur tous les téléphones !", "success");
    loadQuiz();
    loadOverview();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

window.closeLiveQuizQuestion = async () => {
  try {
    await adminFetch('/admin/quiz/question/close', { method: 'POST' });
    showAdminToast("Question clôturée.", "info");
    loadQuiz();
    loadOverview();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

window.deleteQuizQuestion = async (questionId) => {
  if (!confirm("Voulez-vous vraiment supprimer cette question ?")) return;
  try {
    await adminFetch(`/admin/quiz/question/${questionId}`, { method: 'DELETE' });
    showAdminToast("Question supprimée.", "info");
    loadQuiz();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

window.resetQuizScores = async () => {
  if (!confirm("⚠️ ATTENTION : Cela va remettre à zéro TOUS les scores du quiz pour toutes les tables. Confirmer ?")) return;
  try {
    await adminFetch('/admin/quiz/reset-scores', { method: 'POST' });
    showAdminToast("Scores réinitialisés.", "success");
    loadQuiz();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

window.addBonusPoints = async (e) => {
  e.preventDefault();
  const table_number = document.getElementById('bonus-table-num').value.trim();
  const points = parseInt(document.getElementById('bonus-points-val').value, 10) || 50;
  const reason = document.getElementById('bonus-reason').value.trim() || 'Animation Régie';

  try {
    await adminFetch('/admin/points/add', {
      method: 'POST',
      body: JSON.stringify({ table_number, points, reason }),
    });
    showAdminToast(`+${points} points attribués à la Table ${table_number} !`, "success");
    document.getElementById('bonus-points-form').reset();
    loadQuiz();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

// -------------------------------------------------------------
// 4. MODÉRATION DU CHAT EN DIRECT
// -------------------------------------------------------------
async function loadChat() {
  try {
    const messages = await adminFetch('/admin/chat');
    AdminState.chatMessages = messages;
    renderChatMessages(messages);
  } catch (err) {
    console.error("Erreur chargement chat admin:", err);
  }
}

function renderChatMessages(messages) {
  const container = document.getElementById('admin-chat-list');
  if (!container) return;

  if (!messages || messages.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">Aucun message dans le chat.</p>`;
    return;
  }

  container.innerHTML = messages.map(msg => `
    <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 18px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; box-shadow: var(--shadow-sm);">
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <strong style="color: var(--text-main); font-size: 0.92rem;">${escapeHtml(msg.guest_name)}</strong>
          <span class="status-pill status-ended">Table ${escapeHtml(msg.table_number)}</span>
          ${msg.is_pinned ? `<span class="status-pill status-active">📌 Épinglé</span>` : ''}
          <span style="font-size: 0.72rem; color: var(--text-dim); margin-left: auto;">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p style="font-size: 0.88rem; color: var(--text-main); margin: 0; word-break: break-word;">${escapeHtml(msg.message)}</p>
      </div>
      <div class="table-actions" style="flex-shrink: 0;">
        <button class="btn-table-action" onclick="togglePinMessage('${msg.id}', ${msg.is_pinned ? 0 : 1})" title="${msg.is_pinned ? 'Désépingler' : 'Épingler en haut'}">
          ${msg.is_pinned ? 'Unpin' : '📌'}
        </button>
        <button class="btn-table-action danger" onclick="deleteChatMessage('${msg.id}')" title="Supprimer">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.postOfficialAnnouncement = async (e) => {
  e.preventDefault();
  const message = document.getElementById('announcement-text').value.trim();
  const author_name = document.getElementById('announcement-author').value.trim() || '👑 Régie Soirée Royale';

  if (!message) return;

  try {
    await adminFetch('/admin/chat/announcement', {
      method: 'POST',
      body: JSON.stringify({ message, author_name }),
    });
    showAdminToast("Annonce officielle diffusée sur le chat !", "success");
    document.getElementById('announcement-text').value = '';
    loadChat();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

window.togglePinMessage = async (msgId, isPinned) => {
  try {
    await adminFetch(`/chat/${msgId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ is_pinned: isPinned }),
    });
    showAdminToast(isPinned ? "Message épinglé en bannière d'or !" : "Message désépinglé.", "info");
    loadChat();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

window.deleteChatMessage = async (msgId) => {
  if (!confirm("Supprimer ce message du chat ?")) return;
  try {
    await adminFetch(`/admin/chat/${msgId}`, { method: 'DELETE' });
    showAdminToast("Message supprimé.", "info");
    loadChat();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

// -------------------------------------------------------------
// 5. ESPACE PRIÈRES & SUIVI PASTORAL (WHATSAPP DIRECT)
// -------------------------------------------------------------
async function loadPrayers() {
  try {
    const prayers = await adminFetch('/admin/prayers');
    AdminState.prayers = prayers;
    renderPrayers(prayers);
  } catch (err) {
    console.error("Erreur chargement prières admin:", err);
  }
}

function renderPrayers(prayers) {
  const container = document.getElementById('admin-prayers-list');
  if (!container) return;

  const realCount = prayers ? prayers.length : 0;
  const fakeCount = getPublicPrayerCount(realCount);
  const realH = document.getElementById('admin-prayers-real-header');
  const fakeH = document.getElementById('admin-prayers-fake-header');
  if (realH) realH.textContent = realCount;
  if (fakeH) fakeH.textContent = fakeCount;

  if (!prayers || prayers.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">Aucune requête déposée.</p>`;
    return;
  }

  container.innerHTML = prayers.map(p => {
    const rawPhone = (p.whatsapp || '').replace(/[^0-9]/g, '');
    const waLink = rawPhone ? `https://wa.me/${rawPhone}?text=${encodeURIComponent(`Bonjour ${p.author_name}, nous avons bien reçu votre demande de prière lors de la cérémonie.`)}` : null;

    return `
      <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 22px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(p.author_name)}</strong>
            <span class="status-pill status-ended">${p.category || 'priere'}</span>
            ${p.is_private ? `<span class="status-pill status-pending">🔒 Privé</span>` : `<span class="status-pill status-active">🌐 Public</span>`}
          </div>
          <span style="font-size: 0.72rem; color: var(--text-dim);">${new Date(p.created_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--terracotta-accent); margin: 0;">${escapeHtml(p.title)}</h4>
        <p style="font-size: 0.86rem; color: var(--text-main); line-height: 1.45; margin: 0; white-space: pre-line;">${escapeHtml(p.content)}</p>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 4px;">
          <div>
            ${p.whatsapp ? `
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">WhatsApp : <strong>${escapeHtml(p.whatsapp)}</strong></span>
            ` : `<span style="font-size: 0.75rem; color: var(--text-dim);">Pas de numéro WhatsApp renseigné</span>`}
          </div>

          <div class="table-actions">
            ${waLink ? `
              <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn-table-action whatsapp">
                💬 Écrire sur WhatsApp
              </a>
            ` : ''}
            <button class="btn-table-action danger" onclick="deletePrayer('${p.id}')">🗑️ Supprimer</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.deletePrayer = async (prayerId) => {
  if (!confirm("Supprimer cette requête de prière ?")) return;
  try {
    await adminFetch(`/admin/prayers/${prayerId}`, { method: 'DELETE' });
    showAdminToast("Requête supprimée.", "info");
    loadPrayers();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

// -------------------------------------------------------------
// 6. RÉSEAUTAGE & FICHES VIP (TROMBINOSCOPE & EXPORT CSV)
// -------------------------------------------------------------
async function loadNetworking() {
  try {
    const profiles = await adminFetch('/admin/networking');
    AdminState.networking = profiles;
    renderNetworking(profiles);
  } catch (err) {
    console.error("Erreur chargement réseautage admin:", err);
  }
}

function renderNetworking(profiles) {
  const container = document.getElementById('admin-networking-grid');
  if (!container) return;

  if (!profiles || profiles.length === 0) {
    container.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">Aucune fiche VIP publiée pour le moment.</p>`;
    return;
  }

  container.innerHTML = profiles.map(prof => `
    <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 26px; padding: 14px; display: flex; gap: 12px; align-items: center; box-shadow: var(--shadow-sm); position: relative;">
      <div style="width: 68px; height: 82px; border-radius: 18px; overflow: hidden; border: 3px solid var(--terracotta-accent); flex-shrink: 0; background: var(--bg-secondary);">
        ${prof.photo_url 
          ? `<img src="${prof.photo_url}" style="width: 100%; height: 100%; object-fit: cover;">` 
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.8rem;">👤</div>`
        }
      </div>
      <div style="flex: 1; min-width: 0;">
        <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(prof.full_name)}</h4>
        <p style="font-size: 0.78rem; font-weight: 700; color: var(--terracotta-accent); margin: 2px 0;">${escapeHtml(prof.profession || prof.company || 'Participant')}</p>
        <p style="font-size: 0.74rem; color: var(--text-muted); line-height: 1.3; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(prof.bio || prof.interests_tags || '')}</p>
        <div style="display: flex; gap: 6px; margin-top: 6px; align-items: center;">
          <span class="status-pill status-ended" style="font-size: 0.65rem;">Table ${escapeHtml(prof.table_number || '1')}</span>
          ${prof.whatsapp ? `<span style="font-size: 0.7rem; color: var(--text-dim);">📞 ${escapeHtml(prof.whatsapp)}</span>` : ''}
        </div>
      </div>
      <button class="btn-table-action danger" style="position: absolute; top: 10px; right: 10px; padding: 4px 8px;" onclick="deleteNetworkingProfile('${prof.id}')" title="Supprimer">🗑️</button>
    </div>
  `).join('');
}

window.deleteNetworkingProfile = async (profId) => {
  if (!confirm("Supprimer cette fiche de réseautage ?")) return;
  try {
    await adminFetch(`/admin/networking/${profId}`, { method: 'DELETE' });
    showAdminToast("Fiche supprimée.", "info");
    loadNetworking();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

window.exportNetworkingCSV = () => {
  const profiles = AdminState.networking || [];
  if (profiles.length === 0) {
    showAdminToast("Aucune donnée à exporter.", "error");
    return;
  }

  const headers = ['Nom Complet', 'Métier', 'Entreprise', 'Table', 'WhatsApp', 'Centres Intérêt', 'Recherche', 'Offre', 'Bio'];
  const rows = profiles.map(p => [
    `"${(p.full_name || '').replace(/"/g, '""')}"`,
    `"${(p.profession || '').replace(/"/g, '""')}"`,
    `"${(p.company || '').replace(/"/g, '""')}"`,
    `"${(p.table_number || '').replace(/"/g, '""')}"`,
    `"${(p.whatsapp || '').replace(/"/g, '""')}"`,
    `"${(p.interests_tags || '').replace(/"/g, '""')}"`,
    `"${(p.looking_for || '').replace(/"/g, '""')}"`,
    `"${(p.offering || '').replace(/"/g, '""')}"`,
    `"${(p.bio || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `repertoire-reseautage-gala-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showAdminToast("Export CSV généré avec succès !", "success");
};

// -------------------------------------------------------------
// 7. LISTE DES INVITÉS & CRM COMPLET (PRIÈRES, RÉSEAUTAGE, COORDONNÉES)
// -------------------------------------------------------------
let currentCrmGuestId = null;

let currentGuestSubTab = 'all'; // 'salle', 'link', or 'all'
let guestViewMode = 'grid'; // 'grid' or 'hosts'
let currentAdminGuestPhotoBase64 = null;

window.setGuestSubTab = (tab) => {
  currentGuestSubTab = tab;
  const btnSalle = document.getElementById('subtab-guests-salle');
  const btnLink = document.getElementById('subtab-guests-link');
  const btnNoBillet = document.getElementById('subtab-guests-nobillet');
  const btnEvang = document.getElementById('subtab-guests-evangelized');
  const btnAll = document.getElementById('subtab-guests-all');

  [
    { el: btnSalle, key: 'salle', bg: 'var(--terracotta-gradient)', col: '#fff' },
    { el: btnLink, key: 'link', bg: 'var(--terracotta-gradient)', col: '#fff' },
    { el: btnNoBillet, key: 'nobillet', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', col: '#fff' },
    { el: btnEvang, key: 'evangelized', bg: 'linear-gradient(135deg, #10b981, #059669)', col: '#fff' },
    { el: btnAll, key: 'all', bg: 'var(--terracotta-gradient)', col: '#fff' }
  ].forEach(item => {
    if (!item.el) return;
    if (item.key === tab) {
      item.el.style.background = item.bg;
      item.el.style.color = item.col;
      item.el.classList.add('active');
    } else {
      item.el.style.background = 'var(--bg-secondary)';
      item.el.style.color = item.key === 'nobillet' ? '#fbbf24' : (item.key === 'evangelized' ? '#34d399' : 'var(--text-main)');
      item.el.classList.remove('active');
    }
  });

  window.filterGuests();
};

window.setGuestViewMode = (mode) => {
  guestViewMode = mode;
  const btnGrid = document.getElementById('btn-view-mode-grid');
  const btnHosts = document.getElementById('btn-view-mode-hosts');

  if (mode === 'hosts') {
    if (btnGrid) {
      btnGrid.style.background = 'transparent';
      btnGrid.style.color = 'var(--text-muted)';
      btnGrid.classList.remove('active');
    }
    if (btnHosts) {
      btnHosts.style.background = 'var(--terracotta-gradient)';
      btnHosts.style.color = '#fff';
      btnHosts.classList.add('active');
    }
  } else {
    if (btnGrid) {
      btnGrid.style.background = 'var(--terracotta-gradient)';
      btnGrid.style.color = '#fff';
      btnGrid.classList.add('active');
    }
    if (btnHosts) {
      btnHosts.style.background = 'transparent';
      btnHosts.style.color = 'var(--text-muted)';
      btnHosts.classList.remove('active');
    }
  }

  window.filterGuests();
};

// Dictionnaire canonique des hôtes officiels avec titres honorifiques corrects
const CANONICAL_HOST_NAMES = {
  'georgette-kammoe': 'Dr GEORGETTE KAMMOE',
  'jeanne-d-arc': "Jeanne d'Arc",
  'micky': 'Pasteur Micky',
  'nematchoue-emilie': 'Madame Nematchoue Émilie',
  'emilienne': 'Ma Emilienne',
  'tina': 'Maman Tina',
  'charly': 'Pasteur Charly',
  'rosie': 'Soeur Rosie',
  'blaise': 'Frère Blaise',
  'alex': 'Frère Alex',
  'edith': 'Soeur Édith',
  'lydie': 'Soeur Lydie'
};

// Normalisation canonique universelle des hôtes (fusionne casse, accents, apostrophes, fautes et titres)
function getHostKey(rawHost) {
  if (!rawHost) return 'hote-non-specifie';
  let str = String(rawHost).trim().toLowerCase();

  // 1. Remplacer les caractères de remplacement UTF-8 cassés (ex: Jeanne dArc)
  str = str.replace(/[\uFFFD]+/g, "'");

  // 2. Normaliser toutes les formes d'apostrophes et de guillemets
  str = str.replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4']/g, "'");

  // 3. Retirer les accents (NFD)
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 4. Retirer les préfixes et titres (docteur, dr, pasteur, etc.)
  str = str.replace(/^(docteur|dr|pasteur|pst|monsieur|m\.|mr|madame|mme|mlle|soeur|sr|frere|fr|ma|maman|papa)\s+/i, '');
  str = str.replace(/^(docteur|dr|pasteur|pst|monsieur|m\.|mr|madame|mme|mlle|soeur|sr|frere|fr|ma|maman|papa)\s+/i, '');

  // 5. Nettoyer les caractères spéciaux et espaces
  str = str.replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // 6. Fusions sémantiques connues / fautes constatées
  if (str.includes('kammoe') || str.includes('georgette') || str.includes('gorgette')) {
    return 'georgette-kammoe';
  }
  if (str.includes('jeanne') || (str.includes('arc') && !str.includes('marcelle'))) {
    return 'jeanne-d-arc';
  }
  if (str.includes('micky') || str.includes('miki')) {
    return 'micky';
  }
  if (str.includes('nematchoue')) {
    return 'nematchoue-emilie';
  }
  if (str.includes('emilienne')) {
    return 'emilienne';
  }
  if (str.includes('emilie')) {
    return 'nematchoue-emilie';
  }
  if (str.includes('tina')) {
    return 'tina';
  }
  if (str.includes('charly') || str.includes('charli')) {
    return 'charly';
  }
  if (str.includes('rosie') || str.includes('rozy')) {
    return 'rosie';
  }
  if (str.includes('blaise')) {
    return 'blaise';
  }
  if (str.includes('alex')) {
    return 'alex';
  }
  if (str.includes('edith')) {
    return 'edith';
  }
  if (str.includes('lydie')) {
    return 'lydie';
  }

  return str.replace(/\s+/g, '-') || 'hote-non-specifie';
}

function getHostDisplayName(rawHost) {
  if (!rawHost) return 'Hôte non spécifié';
  const key = getHostKey(rawHost);
  if (CANONICAL_HOST_NAMES[key]) {
    return CANONICAL_HOST_NAMES[key];
  }
  let trimmed = String(rawHost).trim().replace(/[\uFFFD]+/g, "'").replace(/[\u2018\u2019\u201A\u201B']/g, "'");
  if (!trimmed) return 'Hôte non spécifié';
  return trimmed.replace(/\b\w/g, l => l.toUpperCase());
}

function updateHostsDropdownAndDatalist() {
  const hostSelect = document.getElementById('admin-guest-host-filter');
  const hostDatalist = document.getElementById('admin-hosts-datalist');
  const guests = AdminState.guests || [];

  // Regrouper par hostKey canonique pour unifier la casse et les préfixes (Micky vs micky)
  const hostGroups = {};
  guests.forEach(g => {
    const raw = (g.invited_by || '').trim();
    if (raw) {
      const key = getHostKey(raw);
      if (!hostGroups[key]) {
        hostGroups[key] = {
          key,
          displayName: getHostDisplayName(raw),
          count: 0
        };
      }
      if (raw.length > hostGroups[key].displayName.length || (raw !== raw.toLowerCase() && hostGroups[key].displayName === hostGroups[key].displayName.toLowerCase())) {
        hostGroups[key].displayName = getHostDisplayName(raw);
      }
      hostGroups[key].count++;
    }
  });

  const sortedKeys = Object.keys(hostGroups).sort((a, b) => {
    return hostGroups[a].displayName.localeCompare(hostGroups[b].displayName, 'fr', { sensitivity: 'base' });
  });

  if (hostSelect) {
    const currentVal = hostSelect.value;
    hostSelect.innerHTML = `
      <option value="">👑 Tous les hôtes / Parrains (Tous)</option>
      ${sortedKeys.map(k => {
        const item = hostGroups[k];
        return `<option value="${escapeHtml(item.key)}">${escapeHtml(item.displayName)} (${item.count} invité${item.count > 1 ? 's' : ''})</option>`;
      }).join('')}
    `;
    if (currentVal && (sortedKeys.includes(currentVal) || sortedKeys.some(k => hostGroups[k].displayName === currentVal))) {
      hostSelect.value = currentVal;
    }
  }

  if (hostDatalist) {
    hostDatalist.innerHTML = sortedKeys.map(k => `<option value="${escapeHtml(hostGroups[k].displayName)}">`).join('');
  }
}

// -------------------------------------------------------------
// CRÉATION MANUELLE D'UN INVITÉ PAR L'ADMIN
// -------------------------------------------------------------
window.openCreateGuestModal = () => {
  const modal = document.getElementById('modal-create-guest');
  if (!modal) return;
  const form = document.getElementById('admin-create-guest-form');
  if (form) form.reset();
  window.removeAdminGuestPhoto();
  window.toggleAdminCoupleFields(false);
  modal.style.display = 'flex';
  const nameInput = document.getElementById('admin-input-guest-name');
  if (nameInput) nameInput.focus();
};

window.closeCreateGuestModal = () => {
  const modal = document.getElementById('modal-create-guest');
  if (modal) modal.style.display = 'none';
};

window.toggleAdminCoupleFields = (isCouple) => {
  const container = document.getElementById('admin-couple-fields');
  const partnerInput = document.getElementById('admin-input-guest-partner');
  const coupleInput = document.getElementById('admin-input-guest-couple-name');
  if (container) container.style.display = isCouple ? 'block' : 'none';
  if (partnerInput) partnerInput.required = !!isCouple;
  if (coupleInput) coupleInput.required = !!isCouple;
};

window.handleAdminGuestPhotoSelect = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showAdminToast("Veuillez sélectionner un fichier image valide", "warning");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 400;
      let width = img.width, height = img.height;
      if (width > height) {
        if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
      } else {
        if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      currentAdminGuestPhotoBase64 = dataUrl;

      const imgEl = document.getElementById('admin-guest-photo-img');
      const placeholder = document.getElementById('admin-guest-photo-placeholder');
      const removeBtn = document.getElementById('admin-guest-photo-remove');

      if (imgEl) { imgEl.src = dataUrl; imgEl.style.display = 'block'; }
      if (placeholder) placeholder.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'inline-block';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

window.removeAdminGuestPhoto = () => {
  currentAdminGuestPhotoBase64 = null;
  const fileInput = document.getElementById('admin-guest-photo-file');
  if (fileInput) fileInput.value = '';

  const imgEl = document.getElementById('admin-guest-photo-img');
  const placeholder = document.getElementById('admin-guest-photo-placeholder');
  const removeBtn = document.getElementById('admin-guest-photo-remove');

  if (imgEl) { imgEl.src = ''; imgEl.style.display = 'none'; }
  if (placeholder) placeholder.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';
};

window.saveManualGuest = async () => {
  const name = document.getElementById('admin-input-guest-name')?.value.trim();
  const gender = document.querySelector('input[name="admin-guest-gender"]:checked')?.value || 'M';
  const ticketType = document.querySelector('input[name="admin-guest-ticket-type"]:checked')?.value || 'seul';
  const partnerName = document.getElementById('admin-input-guest-partner')?.value.trim() || '';
  const coupleName = document.getElementById('admin-input-guest-couple-name')?.value.trim() || '';
  const rawTable = document.getElementById('admin-input-guest-table')?.value.trim() || 'A';
  const cleanTable = rawTable.toUpperCase().replace(/^TABLE\s*/i, '').trim() || 'A';
  const host = document.getElementById('admin-input-guest-host')?.value.trim() || 'Admin';
  const phone = document.getElementById('admin-input-guest-phone')?.value.trim() || '';
  const rank = document.getElementById('admin-input-guest-rank')?.value.trim() || "Invitée de Marque";

  if (!name) {
    showAdminToast("Veuillez saisir le nom de l'invité", "warning");
    return;
  }
  if (ticketType === 'couple' && (!partnerName || !coupleName)) {
    showAdminToast("Veuillez renseigner le conjoint et le nom du couple", "warning");
    return;
  }

  const btn = document.getElementById('btn-admin-save-guest');
  if (btn) { btn.disabled = true; btn.innerHTML = `<span>⏳</span> Enregistrement...`; }

  try {
    const generatedGuestId = buildGuestTicketId(name, coupleName, ticketType);
    const payload = {
      id: generatedGuestId,
      name,
      gender,
      ticket_type: ticketType,
      partner_name: partnerName,
      couple_name: coupleName,
      table_number: cleanTable,
      invited_by: host,
      role: rank,
      phone,
      photo_url: currentAdminGuestPhotoBase64 || '',
      registration_source: 'link'
    };

    await adminFetch('/admin/guests', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showAdminToast(`Invité ${name} enregistré avec succès !`, "success");
    window.closeCreateGuestModal();
    await loadGuests();
  } catch (err) {
    console.error("Erreur création manuelle invité:", err);
    showAdminToast("Erreur création invité : " + err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `✨ Enregistrer l'invité`; }
  }
};

window.copyInvitationLink = () => {
  const url = `${getCanonicalOrigin()}/dinedegala2026/?invite=gala2026`;
  const input = document.getElementById('admin-invitation-link-input');
  if (input) input.value = url;
  navigator.clipboard.writeText(url).then(() => {
    showAdminToast("Lien d'invitation officiel copié : " + url, "success");
  }).catch(() => {
    showAdminToast("Lien d'invitation : " + url, "info");
  });
};

window.shareInvitationWhatsApp = () => {
  const url = `${getCanonicalOrigin()}/dinedegala2026/?invite=gala2026`;
  const text =
    `*INVITATION OFFICIELLE - 2ÈME ÉDITION DU DÎNER DE GALA*\n\n` +
    `⭐ Vous êtes chaleureusement invité(e) à la 2ème édition de notre prestigieux Dîner de Gala le *Samedi 24 Octobre 2026 dès 15h00* !\n\n` +
    `📍 *Lieu :* Salle de fête Le Rocher des Âges sise Rond point Entraco.\n\n` +
    `🎟️ Cliquez sur ce lien officiel pour confirmer votre présence et réserver votre table :\n${url}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
};

function normalizeTableCode(val) {
  if (!val) return '';
  return String(val)
    .toUpperCase()
    .replace(/^TABLE\s*/i, '')
    .replace(/[\u0022\u201C\u201D\u2033]/g, "''")
    .replace(/[\u2018\u2019\u2032\u00B4`]/g, "'")
    .trim();
}

window.filterByTable = (tableCode) => {
  if (!tableCode || (AdminState.selectedTableFilter && normalizeTableCode(AdminState.selectedTableFilter) === normalizeTableCode(tableCode))) {
    AdminState.selectedTableFilter = null;
    showAdminToast("Affichage de toutes les tables", "info");
  } else {
    AdminState.selectedTableFilter = tableCode;
    // Si l'onglet sélectionné est 'salle' (qui contient 0 invités), basculer automatiquement sur 'all'
    if (currentGuestSubTab === 'salle') {
      currentGuestSubTab = 'all';
      document.querySelectorAll('.subtab-guest-btn').forEach(b => b.classList.remove('active'));
      const allBtn = document.getElementById('subtab-guests-all');
      if (allBtn) allBtn.classList.add('active');
    }
    showAdminToast(`Filtrage actif : Table ${tableCode}`, "success");
  }
  loadAdminTables();
  window.filterGuests();

  if (AdminState.selectedTableFilter) {
    const grid = document.getElementById('admin-guests-grid') || document.getElementById('admin-tables-pills');
    if (grid) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
};

async function loadAdminTables() {
  try {
    const res = await adminFetch('/admin/tables');
    const tables = Array.isArray(res) ? res : [];
    AdminState.tables = tables;
    const countEl = document.getElementById('admin-tables-count');
    if (countEl) countEl.textContent = tables.length;
    const container = document.getElementById('admin-tables-pills');
    if (!container) return;

    const pillsHtml = tables.map(t => {
      const isSelected = AdminState.selectedTableFilter && (normalizeTableCode(AdminState.selectedTableFilter) === normalizeTableCode(t.table_code));
      const bgStyle = isSelected
        ? 'background: var(--terracotta-gradient); color: #fff; border: 1.5px solid #d4af37; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.45);'
        : 'background: var(--bg-secondary); color: var(--text-main); border: 1px solid var(--border-color);';
      
      return `
        <div data-table-filter="${escapeHtml(t.table_code)}" style="${bgStyle} border-radius: 999px; padding: 5px 12px; font-size: 0.82rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" title="Cliquer pour afficher uniquement les invités de la Table ${escapeHtml(t.table_code)}">
          <span>🍽️ Table ${escapeHtml(t.table_code)}</span>
          <span style="font-size: 0.72rem; opacity: 0.85; font-weight: 800;">(${t.guest_count || 0})</span>
          <button type="button" data-table-delete="${escapeHtml(t.table_code)}" style="background: none; border: none; color: ${isSelected ? '#fee2e2' : '#ef4444'}; cursor: pointer; padding: 0 2px; font-weight: 800; font-size: 0.85rem;" title="Supprimer cette table">✕</button>
        </div>
      `;
    }).join('');

    const resetHtml = AdminState.selectedTableFilter ? `
      <button type="button" id="btn-admin-reset-table-filter" class="btn-table-action" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1.5px solid rgba(239, 68, 68, 0.4); border-radius: 999px; padding: 4px 12px; font-size: 0.78rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
        ✕ Afficher toutes les tables (Filtre actif : Table ${escapeHtml(AdminState.selectedTableFilter)})
      </button>
    ` : '';

    container.innerHTML = pillsHtml + resetHtml;

    if (!container.__hasTableListener) {
      container.__hasTableListener = true;
      container.addEventListener('click', (e) => {
        const resetBtn = e.target.closest('#btn-admin-reset-table-filter');
        if (resetBtn) {
          window.filterByTable(null);
          return;
        }
        const delBtn = e.target.closest('[data-table-delete]');
        if (delBtn) {
          e.stopPropagation();
          const code = delBtn.getAttribute('data-table-delete');
          if (code) window.adminDeleteTable(code);
          return;
        }
        const filterItem = e.target.closest('[data-table-filter]');
        if (filterItem) {
          const code = filterItem.getAttribute('data-table-filter');
          if (code) window.filterByTable(code);
        }
      });
    }
  } catch(e) {}
}

// -------------------------------------------------------------
// DÉPLACEMENT RAPIDE D'UN INVITÉ VERS UNE AUTRE TABLE (MENU DÉPLACER VERS)
// -------------------------------------------------------------
function getAvailableAdminTables() {
  const tableCounts = {};
  (AdminState.guests || []).forEach(g => {
    const t = normalizeTableCode(g.table_number || '1');
    tableCounts[t] = (tableCounts[t] || 0) + 1;
  });

  const set = new Set();
  if (Array.isArray(AdminState.tables) && AdminState.tables.length > 0) {
    AdminState.tables.forEach(t => {
      const code = normalizeTableCode(t.table_code);
      if (code) set.add(code);
    });
  }
  Object.keys(tableCounts).forEach(t => set.add(t));

  const list = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  return list.map(code => ({
    code,
    count: tableCounts[code] || 0
  }));
}

window.openMoveGuestModal = (guestId) => {
  const guest = AdminState.guests.find(g => String(g.id) === String(guestId));
  if (!guest) return;

  AdminState.activeMoveGuestId = guestId;

  const modal = document.getElementById('modal-move-guest-table');
  const nameEl = document.getElementById('move-modal-guest-name');
  const curTableEl = document.getElementById('move-modal-current-table');
  const searchInput = document.getElementById('move-modal-search-table');

  const curTable = normalizeTableCode(guest.table_number || '1');

  if (nameEl) nameEl.textContent = guest.name;
  if (curTableEl) curTableEl.textContent = `Table ${curTable}`;
  if (searchInput) searchInput.value = '';

  renderMoveModalTablesGrid(curTable, '');

  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
};

window.closeMoveGuestModal = () => {
  const modal = document.getElementById('modal-move-guest-table');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  AdminState.activeMoveGuestId = null;
};

window.filterMoveModalTables = (query) => {
  const guest = AdminState.guests.find(g => String(g.id) === String(AdminState.activeMoveGuestId));
  const curTable = guest ? normalizeTableCode(guest.table_number || '1') : '';
  renderMoveModalTablesGrid(curTable, query);
};

function renderMoveModalTablesGrid(currentTable, filterQuery = '') {
  const container = document.getElementById('move-modal-tables-grid');
  if (!container) return;

  const allTables = getAvailableAdminTables();
  const q = (filterQuery || '').toUpperCase().trim();

  const filtered = q
    ? allTables.filter(t => t.code.toUpperCase().includes(q) || `TABLE ${t.code.toUpperCase()}`.includes(q))
    : allTables;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="width: 100%; text-align: center; color: var(--text-muted); padding: 26px 10px;">
        <span style="font-size: 1.8rem; display: block; margin-bottom: 6px;">🍽️</span>
        <p>Aucune table ne correspond à « ${escapeHtml(filterQuery)} ».</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isCurrent = normalizeTableCode(t.code) === normalizeTableCode(currentTable);
    const pillStyle = isCurrent
      ? 'background: rgba(212, 175, 55, 0.25); border: 2px solid var(--accent-gold); color: #fff; box-shadow: 0 0 12px rgba(212, 175, 55, 0.45);'
      : 'background: var(--bg-secondary); border: 1.5px solid var(--border-color); color: var(--text-main);';

    return `
      <button 
        type="button" 
        class="btn-table-pill-choice"
        onclick="window.confirmMoveGuestToTable('${AdminState.activeMoveGuestId}', '${escapeHtml(t.code)}')"
        style="${pillStyle} border-radius: 999px; padding: 7px 14px; font-size: 0.85rem; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.15s ease;"
        onmouseover="this.style.transform='scale(1.05)'"
        onmouseout="this.style.transform='scale(1)'"
        title="${isCurrent ? 'Table actuelle de l\'invité' : 'Cliquer pour déplacer directement vers la Table ' + t.code}"
      >
        <span>🍽️ Table ${escapeHtml(t.code)}</span>
        <span style="font-size: 0.74rem; font-weight: 800; opacity: 0.9; color: var(--accent-gold);">(${t.count})</span>
        ${isCurrent ? '<span style="color: #10b981; margin-left: 2px;">✓ Actuelle</span>' : ''}
      </button>
    `;
  }).join('');
}

// -------------------------------------------------------------
// MENU DÉROULANT FLOTTANT DÉPLACER VERS (ANCRÉ SOUS LE BOUTON)
// -------------------------------------------------------------
window.closeMoveGuestDropdown = () => {
  const dropdown = document.getElementById('admin-guest-move-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  AdminState.activeDropdownGuestId = null;
};

// Fermeture au clic à l'extérieur
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('admin-guest-move-dropdown');
    if (dropdown && dropdown.style.display === 'block') {
      if (!dropdown.contains(e.target) && !e.target.closest('[data-move-guest-trigger]')) {
        window.closeMoveGuestDropdown();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeMoveGuestDropdown();
      window.closeMoveGuestModal();
    }
  });
}

window.openMoveGuestDropdown = (triggerEl, guestId, event) => {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const guest = AdminState.guests.find(g => String(g.id) === String(guestId));
  if (!guest) {
    showAdminToast("Invité introuvable dans la liste", "error");
    return;
  }

  const dropdown = document.getElementById('admin-guest-move-dropdown');
  if (!dropdown) {
    window.openMoveGuestModal(guestId);
    return;
  }

  // Toggle : fermer si déjà ouvert sur le même invité
  if (dropdown.style.display === 'block' && AdminState.activeDropdownGuestId === guestId) {
    window.closeMoveGuestDropdown();
    return;
  }

  AdminState.activeDropdownGuestId = guestId;

  // Calcul du positionnement ancré précis
  const rect = triggerEl.getBoundingClientRect();
  const dropdownWidth = 290;
  let left = rect.left;
  if (left + dropdownWidth > window.innerWidth - 12) {
    left = window.innerWidth - dropdownWidth - 12;
  }
  if (left < 10) left = 10;

  let top = rect.bottom + 6;
  const estimatedHeight = 330;
  if (top + estimatedHeight > window.innerHeight && rect.top > estimatedHeight) {
    top = Math.max(10, rect.top - estimatedHeight - 6);
  }

  dropdown.style.top = `${top}px`;
  dropdown.style.left = `${left}px`;
  dropdown.style.display = 'block';

  renderMoveDropdownContent(guest, '');

  setTimeout(() => {
    const input = document.getElementById('move-dropdown-search');
    if (input) input.focus();
  }, 40);
};

window.filterMoveDropdownTables = (query) => {
  const guest = AdminState.guests.find(g => String(g.id) === String(AdminState.activeDropdownGuestId));
  if (!guest) return;
  renderMoveDropdownTablesList(guest, query);
};

function renderMoveDropdownContent(guest, filterQuery = '') {
  const dropdown = document.getElementById('admin-guest-move-dropdown');
  if (!dropdown) return;

  const curTable = normalizeTableCode(guest.table_number || '1');

  dropdown.innerHTML = `
    <div style="padding: 10px 14px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary);">
      <div style="min-width: 0;">
        <div style="font-size: 0.68rem; color: var(--terracotta-accent); text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">
          Déplacer vers une table
        </div>
        <strong style="font-size: 0.92rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 220px;">
          ${escapeHtml(guest.name)}
        </strong>
      </div>
      <button type="button" onclick="event.stopPropagation(); window.closeMoveGuestDropdown()" style="background: none; border: none; font-size: 1.2rem; color: var(--text-muted); cursor: pointer; padding: 2px 6px; line-height: 1;">✕</button>
    </div>

    <div style="padding: 8px 12px 6px 12px; background: var(--bg-card);">
      <div style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
        <span>Table actuelle : <strong style="color: var(--accent-gold);">Table ${curTable}</strong></span>
        <span style="font-size: 0.7rem; opacity: 0.8; color: #10b981;">1 clic = déplacé</span>
      </div>
      <input 
        type="text" 
        id="move-dropdown-search" 
        placeholder="🔍 Filtrer (ex: A, J, VIP)..." 
        style="width: 100%; box-sizing: border-box; padding: 6px 10px; font-size: 0.8rem; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-secondary); color: var(--text-main); outline: none;"
        oninput="window.filterMoveDropdownTables(this.value)"
        onclick="event.stopPropagation()"
      >
    </div>

    <div id="move-dropdown-tables-list" style="max-height: 220px; overflow-y: auto; padding: 4px 10px 10px 10px; display: flex; flex-direction: column; gap: 4px; background: var(--bg-card);">
      <!-- Injecté dynamiquement -->
    </div>
  `;

  renderMoveDropdownTablesList(guest, filterQuery);
}

function renderMoveDropdownTablesList(guest, filterQuery = '') {
  const container = document.getElementById('move-dropdown-tables-list');
  if (!container) return;

  const allTables = getAvailableAdminTables();
  const q = (filterQuery || '').toUpperCase().trim();
  const curTable = normalizeTableCode(guest.table_number || '1');

  const filtered = q
    ? allTables.filter(t => t.code.toUpperCase().includes(q) || `TABLE ${t.code.toUpperCase()}`.includes(q))
    : allTables;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 16px 8px; font-size: 0.78rem;">
        Aucune table ne correspond à « ${escapeHtml(filterQuery)} ».
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isCurrent = normalizeTableCode(t.code) === curTable;
    const bgStyle = isCurrent
      ? 'background: rgba(212, 175, 55, 0.18); border-color: var(--accent-gold);'
      : 'background: var(--bg-secondary); border-color: var(--border-color);';

    return `
      <button 
        type="button" 
        class="move-dropdown-item-btn"
        onclick="event.stopPropagation(); window.confirmMoveGuestToTable('${guest.id}', '${escapeHtml(t.code)}')"
        style="display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; border-radius: 10px; border: 1px solid transparent; ${bgStyle} color: var(--text-main); cursor: pointer; text-align: left; transition: all 0.12s ease; width: 100%; box-sizing: border-box;"
        onmouseover="this.style.background='rgba(212, 175, 55, 0.28)'; this.style.borderColor='var(--accent-gold)';"
        onmouseout="this.style.background='${isCurrent ? 'rgba(212, 175, 55, 0.18)' : 'var(--bg-secondary)'}'; this.style.borderColor='${isCurrent ? 'var(--accent-gold)' : 'var(--border-color)'}';"
      >
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 0.85rem;">🍽️</span>
          <strong style="font-size: 0.84rem; color: var(--text-main);">Table ${escapeHtml(t.code)}</strong>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 0.74rem; font-weight: 800; color: var(--accent-gold);">(${t.count})</span>
          ${isCurrent ? '<span style="font-size: 0.7rem; color: #10b981; font-weight: 800;">✓ Actuelle</span>' : ''}
        </div>
      </button>
    `;
  }).join('');
}

window.confirmMoveGuestToTable = async (guestId, targetTable) => {
  const guest = AdminState.guests.find(g => String(g.id) === String(guestId));
  if (!guest) return;

  const oldTable = normalizeTableCode(guest.table_number || '1');
  const newTable = normalizeTableCode(targetTable);

  if (oldTable === newTable) {
    showAdminToast(`L'invité(e) ${guest.name} est déjà assigné(e) à la Table ${newTable}`, "info");
    window.closeMoveGuestDropdown();
    window.closeMoveGuestModal();
    return;
  }

  // 1. Mise à jour optimiste locale immédiate
  guest.table_number = newTable;

  // 2. Mise à jour visuelle sur la carte existante
  const card = document.querySelector(`[data-guest-card-id="${guestId}"]`);
  if (card) {
    const badge = card.querySelector('.guest-table-badge');
    if (badge) badge.textContent = `Table ${newTable} ▾`;
  }

  // Si la vue CRM est ouverte pour cet invité, la rafraîchir en temps réel
  const crmModal = document.getElementById('modal-guest-crm');
  if (crmModal && crmModal.style.display === 'flex' && currentCrmGuestId === guestId) {
    window.openGuestCRM(guestId);
  }

  // 3. Si un filtre de table était actif, réappliquer le filtrage
  if (AdminState.selectedTableFilter) {
    window.filterGuests();
  }

  // 4. Fermer le dropdown et la modale
  window.closeMoveGuestDropdown();
  window.closeMoveGuestModal();

  // 5. Toast positif avec animation
  showAdminToast(`✅ ${guest.name} a été déplacé(e) vers la Table ${newTable} !`, "success");

  // 6. Actualiser les compteurs officiels des tables de l'en-tête (Image 1)
  loadAdminTables();

  // 7. Envoi réseau asynchrone à Cloudflare D1
  try {
    const res = await adminFetch(`/admin/guests/${encodeURIComponent(guestId)}/table`, {
      method: 'PATCH',
      body: JSON.stringify({ table_number: newTable })
    });
    if (!res || !res.success) {
      // Fallback
      await adminFetch(`/admin/guests/${encodeURIComponent(guestId)}`, {
        method: 'PUT',
        body: JSON.stringify({ ...guest, table_number: newTable })
      });
    }
  } catch(err) {
    console.warn("Erreur mise à jour table:", err);
  }
};

window.adminAddTable = async () => {
  const input = document.getElementById('admin-new-table-input');
  const code = (input?.value || '').toUpperCase().replace(/^TABLE\s*/i, '').trim();
  if (!code) {
    showAdminToast("Veuillez saisir un code ou numéro de table (ex: B, C, VIP)", "warning");
    return;
  }
  try {
    await adminFetch('/admin/tables', {
      method: 'POST',
      body: JSON.stringify({ table_code: code })
    });
    if (input) input.value = '';
    showAdminToast(`Table ${code} ajoutée avec succès !`, "success");
    loadAdminTables();
  } catch(e) {
    showAdminToast("Erreur ajout table : " + e.message, "error");
  }
};

window.adminDeleteTable = async (code) => {
  if (!confirm(`Supprimer la table ${code} des tables autorisées pour l'invitation ?`)) return;
  try {
    await adminFetch(`/admin/tables/${code}`, { method: 'DELETE' });
    showAdminToast(`Table ${code} supprimée`, "info");
    loadAdminTables();
  } catch(e) {
    showAdminToast("Erreur suppression table : " + e.message, "error");
  }
};

// -------------------------------------------------------------
// GESTION DES HÔTESSES & ÉMARGEMENT EN SALLE
// -------------------------------------------------------------
window.copyHostessGeneralLink = () => {
  const url = `${getCanonicalOrigin()}/hotesse/`;
  navigator.clipboard.writeText(url).then(() => {
    showAdminToast("Lien général des hôtesses copié !", "success");
  }).catch(() => {
    const input = document.getElementById('admin-hostess-general-link');
    if (input) {
      input.select();
      document.execCommand('copy');
      showAdminToast("Lien copié !", "success");
    }
  });
};

window.shareHostessGeneralWhatsApp = () => {
  const url = `${getCanonicalOrigin()}/hotesse/`;
  const text =
    `*ESPACE ACCUEIL & ÉMARGEMENT OFFICIEL - DÎNER DE GALA 2026*\n\n` +
    `💁‍♀️ Chère hôtesse d'accueil,\n\n` +
    `Voici le lien officiel pour accéder au registre des invités, filtrer les tables et valider les entrées en temps réel dans la salle :\n\n` +
    `🔗 *Lien d'émargement :*\n${url}\n\n` +
    `Bon accueil et excellente soirée royale !`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
};

window.copyHostessPersonalLink = (code) => {
  const url = `${getCanonicalOrigin()}/hotesse/?h=${encodeURIComponent(code)}`;
  navigator.clipboard.writeText(url).then(() => {
    showAdminToast(`Lien personnalisé copié pour ${code} !`, "success");
  });
};

window.shareHostessWhatsApp = (name, code, phone) => {
  const url = `${getCanonicalOrigin()}/hotesse/?h=${encodeURIComponent(code)}`;
  const text =
    `*ESPACE HÔTESSE PERSONNALISÉ - DÎNER DE GALA 2026*\n\n` +
    `Bonjour ${name},\n\n` +
    `Voici votre lien d'accès exclusif pour assurer l'accueil et l'émargement des invités à l'entrée :\n\n` +
    `🔗 *Votre lien d'accueil :*\n${url}\n\n` +
    `Cliquez sur ce lien dès votre arrivée en salle. Bon service ! ✨`;

  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const waUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
};

window.adminAddHostess = async () => {
  const nameInput = document.getElementById('admin-hostess-name-input');
  const phoneInput = document.getElementById('admin-hostess-phone-input');
  const tablesInput = document.getElementById('admin-hostess-tables-input');

  const name = (nameInput?.value || '').trim();
  const phone = (phoneInput?.value || '').trim();
  const assigned_tables = (tablesInput?.value || 'Toutes').trim();

  if (!name) {
    showAdminToast("Veuillez saisir le nom de l'hôtesse", "warning");
    return;
  }

  try {
    await adminFetch('/admin/hostesses', {
      method: 'POST',
      body: JSON.stringify({ name, phone, assigned_tables })
    });
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    showAdminToast(`Hôtesse ${name} enregistrée avec succès !`, "success");
    loadAdminHostesses();
  } catch(e) {
    showAdminToast("Erreur ajout hôtesse : " + e.message, "error");
  }
};

window.adminDeleteHostess = async (id, name) => {
  if (!confirm(`Supprimer l'hôtesse ${name || ''} ?`)) return;
  try {
    await adminFetch(`/admin/hostesses/${id}`, { method: 'DELETE' });
    showAdminToast("Hôtesse supprimée", "info");
    loadAdminHostesses();
  } catch(e) {
    showAdminToast("Erreur suppression hôtesse : " + e.message, "error");
  }
};

async function loadAdminHostesses() {
  try {
    const hostesses = await adminFetch('/admin/hostesses');
    const container = document.getElementById('admin-hostesses-list');
    
    // Mettre à jour l'input du lien général
    const genInput = document.getElementById('admin-hostess-general-link');
    if (genInput) genInput.value = `${getCanonicalOrigin()}/hotesse/`;

    // Mettre à jour les KPIs d'émargement
    const guests = AdminState.guests || [];
    const total = guests.length;
    const arrived = guests.filter(g => Number(g.is_arrived) === 1).length;
    const rate = total > 0 ? Math.round((arrived / total) * 100) : 0;

    const elArr = document.getElementById('admin-hostess-kpi-arrived');
    const elTot = document.getElementById('admin-hostess-kpi-total');
    const elRate = document.getElementById('admin-hostess-kpi-rate');
    if (elArr) elArr.textContent = arrived;
    if (elTot) elTot.textContent = total;
    if (elRate) elRate.textContent = `(${rate}%)`;

    if (!container) return;

    if (!hostesses || hostesses.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px dashed var(--border-color); text-align: center; color: var(--text-muted); font-size: 0.82rem;">
          Aucune hôtesse personnalisée définie pour l'instant. Vous pouvez utiliser le <strong>Lien Général</strong> ci-dessus ou en ajouter une ci-contre.
        </div>
      `;
      return;
    }

    container.innerHTML = hostesses.map(h => {
      const code = h.code || h.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const personalUrl = `${getCanonicalOrigin()}/hotesse/?h=${encodeURIComponent(code)}`;

      return `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">👑</span>
              <div>
                <strong style="font-size: 0.95rem; color: #fff;">${escapeHtml(h.name)}</strong>
                <div style="font-size: 0.72rem; color: var(--accent-gold);">Tables : ${escapeHtml(h.assigned_tables || 'Toutes')}</div>
              </div>
            </div>
            <button type="button" data-hostess-delete-id="${escapeHtml(h.id)}" data-hostess-delete-name="${escapeHtml(h.name)}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.9rem;" title="Supprimer">🗑️</button>
          </div>

          <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: rgba(0,0,0,0.25); padding: 4px 8px; border-radius: 6px;">
            ${escapeHtml(personalUrl)}
          </div>

          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px;">
            <button type="button" class="btn-table-action" data-hostess-copy-code="${escapeHtml(code)}" style="font-size: 0.74rem; padding: 4px 10px; background: var(--terracotta-gradient); color: #fff; font-weight: 700; border-radius: 8px;">
              📋 Copier
            </button>
            <button type="button" class="btn-table-action" data-hostess-share-name="${escapeHtml(h.name)}" data-hostess-share-code="${escapeHtml(code)}" data-hostess-share-phone="${escapeHtml(h.phone || '')}" style="font-size: 0.74rem; padding: 4px 10px; background: #25D366; color: #fff; font-weight: 700; border-radius: 8px;">
              💬 WhatsApp
            </button>
            <a href="${personalUrl}" target="_blank" class="btn-table-action" style="font-size: 0.74rem; padding: 4px 10px; background: var(--bg-secondary); color: var(--text-main); font-weight: 700; border-radius: 8px; text-decoration: none;">
              👁️ Ouvrir
            </a>
          </div>
        </div>
      `;
    }).join('');

    if (!container.__hasHostessListener) {
      container.__hasHostessListener = true;
      container.addEventListener('click', (e) => {
        const delBtn = e.target.closest('[data-hostess-delete-id]');
        if (delBtn) {
          const id = delBtn.getAttribute('data-hostess-delete-id');
          const name = delBtn.getAttribute('data-hostess-delete-name');
          if (id) window.adminDeleteHostess(id, name);
          return;
        }
        const copyBtn = e.target.closest('[data-hostess-copy-code]');
        if (copyBtn) {
          const code = copyBtn.getAttribute('data-hostess-copy-code');
          if (code) window.copyHostessPersonalLink(code);
          return;
        }
        const shareBtn = e.target.closest('[data-hostess-share-name]');
        if (shareBtn) {
          const name = shareBtn.getAttribute('data-hostess-share-name');
          const code = shareBtn.getAttribute('data-hostess-share-code');
          const phone = shareBtn.getAttribute('data-hostess-share-phone');
          if (code) window.shareHostessWhatsApp(name, code, phone);
          return;
        }
      });
    }
  } catch(e) {
    console.warn("Erreur chargement hôtesses admin:", e);
  }
}
window.loadAdminHostesses = loadAdminHostesses;

async function loadInvitationStats() {
  try {
    const res = await adminFetch('/admin/invitation-stats');
    const d = (res && res.data) ? res.data : (res || {});
    const elClicks = document.getElementById('admin-stats-total-clicks');
    const elUniq = document.getElementById('admin-stats-unique-visitors');
    const elReg = document.getElementById('admin-stats-link-registrations');
    const elRate = document.getElementById('admin-stats-conversion-rate');

    if (elClicks) elClicks.textContent = d.total_clicks ?? 0;
    if (elUniq) elUniq.textContent = d.unique_visitors ?? 0;
    if (elReg) elReg.textContent = d.link_registrations ?? 0;
    if (elRate) elRate.textContent = (d.conversion_rate ?? 0) + '%';
  } catch (e) {
    console.warn("Erreur chargement stats invitation:", e);
  }
}
window.loadInvitationStats = loadInvitationStats;

async function loadGuests() {
  try {
    const guests = await adminFetch('/admin/guests');
    AdminState.guests = Array.isArray(guests) ? guests : [];
    updateHostsDropdownAndDatalist();
    window.filterGuests();
    loadAdminTables();
    loadInvitationStats();
    loadAdminHostesses();
  } catch (err) {
    console.error("Erreur chargement invités admin:", err);
    showAdminToast("Impossible de charger les invités : " + err.message, "error");
  }
}

function renderGroupedByHostView(guests, container) {
  if (!guests || guests.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 8px;">👑</span>
        <p>Aucun invité ne correspond à cette sélection.</p>
      </div>
    `;
    return;
  }

  // Regrouper par hôte (normalisation canonique insensible à la casse et aux préfixes Micky vs micky)
  const hostGroups = {};
  guests.forEach(g => {
    const rawHost = (g.invited_by || '').trim();
    const hostKey = getHostKey(rawHost);
    if (!hostGroups[hostKey]) {
      hostGroups[hostKey] = {
        key: hostKey,
        displayName: getHostDisplayName(rawHost),
        items: []
      };
    }
    if (rawHost.length > hostGroups[hostKey].displayName.length || (rawHost !== rawHost.toLowerCase() && hostGroups[hostKey].displayName === hostGroups[hostKey].displayName.toLowerCase())) {
      hostGroups[hostKey].displayName = getHostDisplayName(rawHost);
    }
    hostGroups[hostKey].items.push(g);
  });

  const sortedHostKeys = Object.keys(hostGroups).sort((a, b) => {
    if (a === 'hote-non-specifie') return 1;
    if (b === 'hote-non-specifie') return -1;
    return hostGroups[a].displayName.localeCompare(hostGroups[b].displayName, 'fr', { sensitivity: 'base' });
  });

  container.innerHTML = `
    <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 20px;">
      ${sortedHostKeys.map(key => {
        const group = hostGroups[key];
        const hostName = group.displayName;
        const list = group.items;
        
        // Calcul des tables uniques occupées par les invités de cet hôte
        const tablesCount = {};
        list.forEach(g => {
          const t = String(g.table_number || '1').toUpperCase();
          tablesCount[t] = (tablesCount[t] || 0) + 1;
        });
        const tablesSummary = Object.keys(tablesCount).map(t => `Table ${t} (${tablesCount[t]})`).join(' • ');

        return `
          <div class="admin-card" style="padding: 18px; border: 1.5px solid rgba(212, 175, 55, 0.4); border-radius: 20px; background: var(--bg-card); box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid var(--border-color); padding-bottom: 12px; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.8rem;">👑</span>
                <div>
                  <h4 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-main);">
                    ${escapeHtml(hostName)}
                  </h4>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                    🍽️ Répartition des tables : <strong>${escapeHtml(tablesSummary)}</strong>
                  </div>
                </div>
              </div>
              <span class="status-pill status-active" style="background: rgba(212, 175, 55, 0.18); color: #b45309; border: 1.5px solid rgba(212, 175, 55, 0.5); font-weight: 800; font-size: 0.85rem; padding: 4px 12px;">
                ${list.length} invité${list.length > 1 ? 's' : ''}
              </span>
            </div>

            <!-- Liste des invités sous cet hôte -->
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;">
              ${list.map(g => {
                const hasPhoto = !!(g.photo_url && g.photo_url.length > 5);
                const photoHtml = hasPhoto
                  ? `<img src="${g.photo_url}" alt="${escapeHtml(g.name)}" style="width: 44px; height: 44px; border-radius: 14px; object-fit: cover; border: 1.5px solid var(--terracotta-accent);">`
                  : `<div style="width: 44px; height: 44px; border-radius: 14px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; border: 1px solid var(--border-color);">${g.avatar_emoji || (g.gender === 'F' ? '👑' : '🎉')}</div>`;

                const isLink = g.registration_source === 'link';
                const sourceBadge = isLink
                  ? `<span class="status-pill status-active" style="font-size: 0.68rem; padding: 1px 6px; background: rgba(212, 175, 55, 0.15); color: #b45309; font-weight: 800;">💌 Par lien</span>`
                  : `<span class="status-pill status-active" style="font-size: 0.68rem; padding: 1px 6px; background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 800;">🏛️ En salle</span>`;

                const coupleHtml = g.ticket_type === 'couple' && g.couple_name
                  ? `<div style="font-size: 0.74rem; color: #db2777; font-weight: 700; margin-top: 1px;">💍 ${escapeHtml(g.couple_name)}</div>`
                  : '';

                return `
                  <div onclick="window.openGuestCRM('${g.id}')" style="display: flex; gap: 10px; align-items: center; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 10px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
                    ${photoHtml}
                    <div style="flex: 1; min-width: 0;">
                      <div style="display: flex; justify-content: space-between; align-items: center; gap: 4px;">
                        <strong style="font-size: 0.92rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${escapeHtml(g.name)}
                        </strong>
                        <span class="status-pill status-ended guest-table-badge" data-move-guest-trigger="true" data-guest-id="${escapeHtml(g.id)}" onclick="event.stopPropagation(); window.openMoveGuestDropdown(this, this.getAttribute('data-guest-id'), event)" style="font-size: 0.68rem; font-weight: 800; padding: 1px 6px; cursor: pointer;" title="Cliquer pour dérouler les tables et déplacer">Table ${escapeHtml(g.table_number || '1')} ▾</span>
                      </div>
                      ${coupleHtml}
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                        <span style="font-size: 0.74rem; color: var(--text-muted);">${g.phone ? escapeHtml(g.phone) : 'Sans contact'}</span>
                        ${sourceBadge}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderGuests(guests) {
  const container = document.getElementById('admin-guests-grid');
  const countBadge = document.getElementById('admin-guests-count');
  if (countBadge) countBadge.textContent = `${guests ? guests.length : 0} invité(s)`;

  // Mettre à jour les compteurs des catégories officielles (+ Sans Billet, Évangélisés, Tous)
  const allCount = (AdminState.guests || []).length;
  const salleCount = (AdminState.guests || []).filter(g => g.registration_source !== 'link' && g.registration_source !== 'sans_billet').length;
  const linkCount = (AdminState.guests || []).filter(g => g.registration_source === 'link').length;
  const noBilletCount = (AdminState.guests || []).filter(g => g.registration_source === 'sans_billet').length;
  const evangelizedCount = (AdminState.guests || []).filter(g => Number(g.is_evangelized) === 1).length;

  const countAllEl = document.getElementById('subtab-count-all');
  const countSalleEl = document.getElementById('subtab-count-salle');
  const countLinkEl = document.getElementById('subtab-count-link');
  const countNoBilletEl = document.getElementById('subtab-count-nobillet');
  const countEvangelizedEl = document.getElementById('subtab-count-evangelized');

  if (countAllEl) countAllEl.textContent = allCount;
  if (countSalleEl) countSalleEl.textContent = salleCount;
  if (countLinkEl) countLinkEl.textContent = linkCount;
  if (countNoBilletEl) countNoBilletEl.textContent = noBilletCount;
  if (countEvangelizedEl) countEvangelizedEl.textContent = evangelizedCount;

  // Initialiser l'URL du lien d'invitation avec le domaine officiel
  const canonicalInviteUrl = `${getCanonicalOrigin()}/dinedegala2026/?invite=gala2026`;
  const linkInput = document.getElementById('admin-invitation-link-input');
  if (linkInput) {
    linkInput.value = canonicalInviteUrl;
  }
  const testBtn = document.getElementById('admin-invitation-test-btn');
  if (testBtn) {
    testBtn.href = canonicalInviteUrl;
  }

  if (!container) return;

  // Si le mode de vue "Répartition par Hôte" est activé
  if (guestViewMode === 'hosts') {
    renderGroupedByHostView(guests, container);
    return;
  }

  if (!guests || guests.length === 0) {
    const emptyMsg = currentGuestSubTab === 'salle'
      ? "Aucun invité en salle n'est actuellement enregistré (ceux qui scannent le QR code et remplissent leur profil)."
      : (currentGuestSubTab === 'link'
        ? "Aucun invité par lien ou manuel n'est encore enregistré."
        : (currentGuestSubTab === 'nobillet'
          ? "Aucun invité sans billet n'a été enregistré par les hôtesses pour le moment."
          : (currentGuestSubTab === 'evangelized'
            ? "Aucun invité n'a encore été marqué comme évangélisé."
            : "Aucun invité ne correspond à votre recherche.")));
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 8px;">${currentGuestSubTab === 'salle' ? '🏛️' : (currentGuestSubTab === 'link' ? '💌' : (currentGuestSubTab === 'nobillet' ? '🎫' : (currentGuestSubTab === 'evangelized' ? '✝️' : '👥')))}</span>
        <p>${emptyMsg}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = guests.map(g => {
    const hasPhoto = !!(g.photo_url && g.photo_url.length > 5);
    const photoHtml = hasPhoto
      ? `<img src="${g.photo_url}" alt="${escapeHtml(g.name)}" style="width: 52px; height: 52px; border-radius: 16px; object-fit: cover; border: 2px solid var(--terracotta-accent);">`
      : `<div style="width: 52px; height: 52px; border-radius: 16px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1.5px solid var(--border-color);">${g.avatar_emoji || (g.gender === 'F' ? '👑' : '🎉')}</div>`;

    const prayersBadge = g.prayers_count > 0
      ? `<span class="status-pill status-active" title="${g.prayers_count} demande(s) de prière" style="font-size: 0.72rem; padding: 2px 8px;">🙏 ${g.prayers_count} prière(s)</span>`
      : '';

    const churchBadge = g.has_church
      ? `<span class="status-pill status-active" title="Église : ${escapeHtml(g.church_name || 'Oui')}" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(16, 185, 129, 0.15); color: #059669;">⛪ Église</span>`
      : `<span class="status-pill" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(107, 93, 84, 0.1); color: var(--text-muted);">Sans église</span>`;

    const isLink = g.registration_source === 'link';
    const isSansBillet = g.registration_source === 'sans_billet';
    const isEvangelized = Number(g.is_evangelized) === 1;

    let sourceBadge = `<span class="status-pill status-active" title="Invité en salle (QR code scanné)" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(16, 185, 129, 0.15); color: #059669; border: 1px solid rgba(16, 185, 129, 0.4); font-weight: 800;">🏛️ En salle</span>`;
    if (isLink) {
      sourceBadge = `<span class="status-pill status-active" title="Inscrit par lien ou créé par l'admin" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(212, 175, 55, 0.2); color: #b45309; border: 1px solid rgba(212, 175, 55, 0.5); font-weight: 800;">💌 Par lien</span>`;
    } else if (isSansBillet) {
      sourceBadge = `<span class="status-pill status-warning" title="Enregistré sans billet à l'accueil" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.5); font-weight: 800;">🏷️ Sans Billet</span>`;
    }

    const evangelizedBadge = isEvangelized
      ? `<span class="status-pill status-active" title="Évangélisé - Fiche renseignée" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.5); font-weight: 800;">✝️ Évangélisé</span>`
      : '';

    const coupleBadge = g.ticket_type === 'couple'
      ? `<span class="status-pill status-active" title="Billet en Couple" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(236, 72, 153, 0.15); color: #db2777; border: 1px solid rgba(236, 72, 153, 0.4); font-weight: 800;">👥 Couple</span>`
      : '';

    const professionText = g.profession
      ? `${escapeHtml(g.profession)}${g.company ? ' • ' + escapeHtml(g.company) : ''}`
      : 'Profession non renseignée';

    const residenceText = g.residence_location
      ? `📍 ${escapeHtml(g.residence_location)}`
      : '📍 Résidence non renseignée';

    const phoneText = g.phone
      ? `📱 ${escapeHtml(g.phone)}`
      : '📱 Sans téléphone';

    const hostHtml = g.invited_by
      ? `<div style="font-size: 0.8rem; color: #b45309; font-weight: 700; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
           <span>👑</span> ${isSansBillet ? 'Accueil par' : 'Invité par'} : <strong>${escapeHtml(g.invited_by)}</strong>
         </div>`
      : '';

    const coupleInfoHtml = g.ticket_type === 'couple' && g.couple_name
      ? `<div style="font-size: 0.8rem; color: #db2777; font-weight: 700; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
           <span>💍</span> <strong>${escapeHtml(g.couple_name)}</strong> ${g.partner_name ? '(' + escapeHtml(g.partner_name) + ')' : ''}
         </div>`
      : '';

    return `
      <div class="guest-crm-card-item" data-guest-card-id="${escapeHtml(g.id)}" onclick="window.openGuestCRM('${g.id}')" title="Cliquer pour voir la fiche complète">
        <div style="display: flex; gap: 12px; align-items: center;">
          ${photoHtml}
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(g.name)}
              </h4>
              <span class="status-pill status-ended guest-table-badge" data-move-guest-trigger="true" data-guest-id="${escapeHtml(g.id)}" onclick="event.stopPropagation(); window.openMoveGuestDropdown(this, this.getAttribute('data-guest-id'), event)" style="font-size: 0.72rem; font-weight: 800; cursor: pointer; transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Cliquer pour dérouler les tables et déplacer l'invité">Table ${escapeHtml(g.table_number || '1')} ▾</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--terracotta-accent); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
              ${professionText}
            </div>
            ${coupleInfoHtml}
            ${hostHtml}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 10px; font-size: 0.78rem; color: var(--text-muted);">
          <div>${residenceText}</div>
          <div>${phoneText}</div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--border-color); gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
            ${sourceBadge}
            ${evangelizedBadge}
            ${coupleBadge}
            ${prayersBadge}
            ${churchBadge}
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" class="btn-table-action" data-move-guest-trigger="true" data-guest-id="${escapeHtml(g.id)}" onclick="event.stopPropagation(); window.openMoveGuestDropdown(this, this.getAttribute('data-guest-id'), event)" style="background: rgba(212, 175, 55, 0.16); border: 1.5px solid var(--accent-gold); color: var(--accent-gold); font-size: 0.74rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;" onmouseover="this.style.background='rgba(212,175,55,0.3)'" onmouseout="this.style.background='rgba(212,175,55,0.16)'" title="Dérouler les tables pour déplacer cet invité">
              <span>🔄 Déplacer vers ▾</span>
            </button>
            <button type="button" class="btn-table-action" style="background: var(--terracotta-gradient); color: #fff; font-size: 0.74rem; font-weight: 700; padding: 4px 10px; border-radius: 999px;">
              Fiche CRM ➔
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.filterGuests = (query) => {
  const searchInput = document.getElementById('admin-guest-search');
  const hostSelect = document.getElementById('admin-guest-host-filter');
  const q = (query !== undefined ? query : (searchInput ? searchInput.value : '')).toLowerCase().trim();
  const selectedHost = (hostSelect ? hostSelect.value : '').toLowerCase().trim();
  
  let list = AdminState.guests || [];

  // 1. Filtrage par catégories officielles (+ Sans Billet, Évangélisés, Tous)
  if (currentGuestSubTab === 'salle') {
    list = list.filter(g => g.registration_source !== 'link' && g.registration_source !== 'sans_billet');
  } else if (currentGuestSubTab === 'link') {
    list = list.filter(g => g.registration_source === 'link');
  } else if (currentGuestSubTab === 'nobillet') {
    list = list.filter(g => g.registration_source === 'sans_billet');
  } else if (currentGuestSubTab === 'evangelized') {
    list = list.filter(g => Number(g.is_evangelized) === 1);
  }

  // 1.5. Filtrage par Table sélectionnée (au clic sur une table)
  if (AdminState.selectedTableFilter) {
    const sel = normalizeTableCode(AdminState.selectedTableFilter);
    list = list.filter(g => {
      return normalizeTableCode(g.table_number) === sel;
    });
  }

  // 2. Filtrage par Hôte sélectionné (normalisation canonique insensible à la casse et aux préfixes)
  if (selectedHost) {
    list = list.filter(g => getHostKey(g.invited_by) === selectedHost || (g.invited_by || '').toLowerCase().trim() === selectedHost.toLowerCase());
  }

  // 3. Filtrage par recherche textuelle
  if (q) {
    list = list.filter(g => {
      return (g.name || '').toLowerCase().includes(q) ||
        (g.table_number || '').toString().toLowerCase().includes(q) ||
        (g.invited_by || '').toLowerCase().includes(q) ||
        (g.profession || '').toLowerCase().includes(q) ||
        (g.company || '').toLowerCase().includes(q) ||
        (g.couple_name || '').toLowerCase().includes(q) ||
        (g.partner_name || '').toLowerCase().includes(q) ||
        (g.residence_location || '').toLowerCase().includes(q) ||
        (g.phone || '').toLowerCase().includes(q) ||
        (g.church_name || '').toLowerCase().includes(q);
    });
  }

  renderGuests(list);
};

window.openGuestCRM = (guestId) => {
  const guest = AdminState.guests.find(g => g.id === guestId);
  if (!guest) return;

  currentCrmGuestId = guestId;

  const modal = document.getElementById('modal-guest-crm');
  const body = document.getElementById('guest-crm-modal-body');
  if (!modal || !body) return;

  const hasPhoto = !!(guest.photo_url && guest.photo_url.length > 5);
  const photoHtml = hasPhoto
    ? `<img src="${guest.photo_url}" alt="${escapeHtml(guest.name)}" style="width: 80px; height: 80px; border-radius: 24px; object-fit: cover; border: 3px solid var(--terracotta-accent); box-shadow: 0 8px 16px rgba(0,0,0,0.15);">`
    : `<div style="width: 80px; height: 80px; border-radius: 24px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 2.8rem; border: 2px solid var(--border-color);">${guest.avatar_emoji || '🎉'}</div>`;

  const cleanPhone = (guest.phone || '').replace(/[^0-9]/g, '');
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

  // Prières
  const prayers = guest.prayers_history || [];
  const prayersHtml = prayers.length > 0 ? prayers.map((p, idx) => `
    <div style="background: var(--bg-secondary); border-radius: 14px; padding: 12px; margin-top: 8px; border-left: 3px solid #f59e0b;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <strong style="color: var(--terracotta-accent); font-size: 0.88rem;">🙏 Sujet : ${escapeHtml(p.title || 'Prière')}</strong>
        <span style="font-size: 0.72rem; color: var(--text-muted);">${new Date(p.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      ${p.target_person ? `<div style="font-size: 0.8rem; margin-bottom: 4px;"><strong>Pour qui :</strong> ${escapeHtml(p.target_person)}</div>` : ''}
      <p style="font-size: 0.85rem; margin: 4px 0; color: var(--text-main); font-style: italic;">« ${escapeHtml(p.content)} »</p>
      ${p.residence_location ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">📍 Résidence pour visite : <strong>${escapeHtml(p.residence_location)}</strong></div>` : ''}
      ${p.has_church ? `<div style="font-size: 0.78rem; color: var(--text-muted);">⛪ Église mentionnée : ${escapeHtml(p.church_name || 'Oui')} (${escapeHtml(p.church_duration || 'Durée non précisée')})</div>` : ''}
    </div>
  `).join('') : `<p style="color: var(--text-muted); font-size: 0.82rem; margin: 6px 0;">Aucune demande de prière enregistrée pour cet invité.</p>`;

  body.innerHTML = `
    <!-- En-tête profil -->
    <div style="display: flex; gap: 16px; align-items: center; background: var(--bg-secondary); padding: 14px; border-radius: 20px; margin-bottom: 16px;">
      ${photoHtml}
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <h2 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${escapeHtml(guest.name)}</h2>
          <span class="status-pill status-ended" data-move-guest-trigger="true" data-guest-id="${escapeHtml(guest.id)}" onclick="window.openMoveGuestDropdown(this, this.getAttribute('data-guest-id'), event)" style="font-weight: 800; cursor: pointer;" title="Cliquer pour dérouler les tables et déplacer">Table ${escapeHtml(guest.table_number || '1')} ▾</span>
          <span class="status-pill status-active" style="font-weight: 800;">🏆 ${guest.points || 0} pts</span>
        </div>
        <div style="font-size: 0.84rem; color: var(--terracotta-accent); font-weight: 700; margin-top: 4px;">
          ${guest.profession ? escapeHtml(guest.profession) : 'Profession non spécifiée'}
          ${guest.company ? ' chez <strong style="color: var(--text-main);">' + escapeHtml(guest.company) + '</strong>' : ''}
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
          Arrivée : ${new Date(guest.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>

    ${guest.registration_source === 'link' ? `
      <!-- Origine Inscription par Lien -->
      <div style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(180, 83, 9, 0.15)); border: 1.5px solid rgba(212, 175, 55, 0.45); border-radius: 16px; padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h4 style="margin: 0; font-size: 0.88rem; color: #b45309; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
            💌 Inscription par Lien d'Invitation Public
          </h4>
          <span class="status-pill status-active" style="background: rgba(212, 175, 55, 0.25); color: #b45309; font-weight: 800; font-size: 0.72rem;">2ème Édition Gala</span>
        </div>
        <div style="font-size: 0.92rem; color: var(--text-main);">
          Invité(e) par : <strong style="color: var(--terracotta-accent); font-size: 1.05rem;">${escapeHtml(guest.invited_by || 'Non précisé')}</strong>
        </div>
        <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">
          N° de table attribué : <strong>Table ${escapeHtml(guest.table_number || '1')}</strong> (fourni par son hôte)
        </div>
      </div>
    ` : ''}

    ${guest.ticket_type === 'couple' ? `
      <!-- Détails Billet Couple -->
      <div style="background: rgba(236, 72, 153, 0.1); border: 1.5px solid rgba(236, 72, 153, 0.35); border-radius: 16px; padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h4 style="margin: 0; font-size: 0.88rem; color: #db2777; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
            👥 Formule Billet en Couple
          </h4>
          <span class="status-pill status-active" style="background: rgba(236, 72, 153, 0.2); color: #db2777; font-weight: 800; font-size: 0.72rem;">2 Personnes</span>
        </div>
        <div style="font-size: 0.95rem; color: var(--text-main);">
          Nom officiel du couple : <strong style="color: #db2777; font-size: 1.05rem;">${escapeHtml(guest.couple_name || 'Couple')}</strong>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-main); margin-top: 4px;">
          Conjoint(e) : <strong>${escapeHtml(guest.partner_name || 'Non renseigné')}</strong>
        </div>
      </div>
    ` : ''}

    ${guest.registration_source === 'sans_billet' ? `
      <!-- Origine Inscription SANS BILLET Accueil -->
      <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15)); border: 1.5px solid rgba(245, 158, 11, 0.5); border-radius: 16px; padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h4 style="margin: 0; font-size: 0.88rem; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
            🏷️ Invité Enregistré SANS BILLET à l'Accueil
          </h4>
          <span class="status-pill status-warning" style="background: rgba(245, 158, 11, 0.25); color: #fbbf24; font-weight: 800; font-size: 0.72rem;">Accueil Hôtesse</span>
        </div>
        <div style="font-size: 0.92rem; color: var(--text-main);">
          Enregistré(e) par : <strong style="color: #fbbf24;">${escapeHtml(guest.invited_by || 'Hôtesse Accueil')}</strong>
        </div>
        <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">
          Genre : <strong>${guest.gender === 'F' ? 'Femme' : 'Homme'}</strong> • Formule : <strong>${guest.ticket_type === 'couple' ? 'En Couple' : 'Seul'}</strong>
        </div>
      </div>
    ` : ''}

    ${guest.evangelization_record ? `
      <!-- FICHE D'ÉVANGÉLISATION TRANSMIS PAR LE SUPERVISEUR -->
      <div style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(15, 43, 89, 0.25)); border: 2px solid #0ea5e9; border-radius: 18px; padding: 16px; margin-bottom: 16px; box-shadow: 0 4px 18px rgba(14, 165, 233, 0.15);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(14, 165, 233, 0.3); padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.4rem;">✝️</span>
            <div>
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">
                FICHE D'ÉVANGÉLISATION (OFFICIELLE)
              </h4>
              <span style="font-size: 0.74rem; color: #94a3b8; font-style: italic;">Une vie transformée, un monde éclairé !</span>
            </div>
          </div>
          <span class="status-pill status-active" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 800; font-size: 0.75rem;">
            ✓ Transmise à la Régie
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; font-size: 0.85rem;">
          <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 8px;">
            <span style="color: #94a3b8; font-size: 0.74rem; display: block;">Fréquente une église :</span>
            <strong style="color: ${guest.evangelization_record.attends_church ? '#34d399' : '#f87171'};">
              ${guest.evangelization_record.attends_church ? 'Oui' : 'Non'}
            </strong>
            ${guest.evangelization_record.attends_church 
              ? `<div style="font-size: 0.78rem; color: #e2e8f0; margin-top: 2px;">Assemblée : <em>${escapeHtml(guest.evangelization_record.church_name || 'Non précisé')}</em></div>`
              : `<div style="font-size: 0.78rem; color: #cbd5e1; margin-top: 2px;">Raison : <em>${escapeHtml(guest.evangelization_record.church_no_reason || 'Non précisée')}</em></div>`
            }
          </div>

          <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 8px;">
            <span style="color: #94a3b8; font-size: 0.74rem; display: block;">Déjà baptisé(e) :</span>
            <strong style="color: ${guest.evangelization_record.is_baptized ? '#34d399' : '#f87171'};">
              ${guest.evangelization_record.is_baptized ? 'Oui' : 'Non'}
            </strong>
            ${guest.evangelization_record.is_baptized 
              ? `<div style="font-size: 0.78rem; color: #e2e8f0; margin-top: 2px;">Date / période : <em>${escapeHtml(guest.evangelization_record.baptism_date || 'Non précisée')}</em></div>`
              : `<div style="font-size: 0.78rem; color: #cbd5e1; margin-top: 2px;">Raison : <em>${escapeHtml(guest.evangelization_record.baptism_no_reason || 'Non précisée')}</em></div>`
            }
          </div>

          <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 8px;">
            <span style="color: #94a3b8; font-size: 0.74rem; display: block;">Dernière église fréquentée :</span>
            <strong style="color: #e2e8f0;">${escapeHtml(guest.evangelization_record.last_church_attended || 'Non renseigné')}</strong>
          </div>

          <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 8px;">
            <span style="color: #94a3b8; font-size: 0.74rem; display: block;">Activité Professionnelle :</span>
            <strong style="color: #e2e8f0;">${escapeHtml(guest.evangelization_record.profession || guest.profession || 'Non renseigné')}</strong>
          </div>

          <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 8px;">
            <span style="color: #94a3b8; font-size: 0.74rem; display: block;">Décision & Orientation pastorale :</span>
            <strong style="color: #38bdf8;">${escapeHtml(guest.evangelization_record.spiritual_decision || 'Acceptation de Christ')}</strong>
          </div>

          <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 8px;">
            <span style="color: #94a3b8; font-size: 0.74rem; display: block;">Superviseur référent :</span>
            <strong style="color: #fde047;">${escapeHtml(guest.evangelization_record.supervisor_name || 'Superviseur Régie')}</strong>
          </div>
        </div>

        ${guest.evangelization_record.notes ? `
          <div style="margin-top: 10px; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 8px; font-size: 0.82rem; color: #cbd5e1; border-left: 3px solid #38bdf8;">
            <strong>Notes & Prière :</strong> <em>« ${escapeHtml(guest.evangelization_record.notes)} »</em>
          </div>
        ` : ''}

        <div style="margin-top: 10px; font-size: 0.74rem; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
          <span>Enregistrée le : ${guest.evangelization_record.created_at ? new Date(guest.evangelization_record.created_at).toLocaleString('fr-FR') : 'Ce jour'}</span>
          <span style="color: #f59e0b; font-weight: 700;">« Allez par tout le monde... » Marc 16:15</span>
        </div>
      </div>
    ` : (Number(guest.is_evangelized) === 1 ? `
      <!-- Marqué évangélisé sans fiche encore soumise -->
      <div style="background: rgba(16, 185, 129, 0.12); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 14px; padding: 12px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
        <span style="color: #34d399; font-weight: 700; font-size: 0.88rem;">✝️ Invité marqué comme évangélisé par l'accueil ou le superviseur</span>
        <span class="status-pill status-active" style="font-size: 0.72rem;">Fiche en cours</span>
      </div>
    ` : '')}

    <!-- Section 1 : Coordonnées & Lieu de vie -->
    <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 16px; padding: 14px; margin-bottom: 14px;">
      <h4 style="margin: 0 0 10px 0; font-size: 0.88rem; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
        📍 Coordonnées & Résidence
      </h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; font-size: 0.85rem;">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.76rem;">Lieu de résidence :</span>
          <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(guest.residence_location || 'Non renseigné')}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.76rem;">Téléphone / WhatsApp :</span>
          ${waLink
            ? `<a href="${waLink}" target="_blank" rel="noopener noreferrer" style="color: #059669; font-weight: 800; text-decoration: underline; display: inline-flex; align-items: center; gap: 4px;">
                <span>💬</span> ${escapeHtml(guest.phone)} (Écrire sur WhatsApp)
               </a>`
            : `<strong style="color: var(--text-muted);">${escapeHtml(guest.phone || 'Non renseigné')}</strong>`
          }
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.76rem;">Lieu de travail / Entreprise :</span>
          <strong style="color: var(--text-main);">${escapeHtml(guest.company || 'Non renseigné')}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.76rem;">Profession / Spécialité :</span>
          <strong style="color: var(--text-main);">${escapeHtml(guest.profession || 'Non renseigné')}</strong>
        </div>
      </div>
    </div>

    <!-- Section 2 : Église & Vie Spirituelle -->
    <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 16px; padding: 14px; margin-bottom: 14px;">
      <h4 style="margin: 0 0 10px 0; font-size: 0.88rem; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
        ⛪ Engagement Spirituel & Église
      </h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; font-size: 0.85rem;">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.76rem;">Fréquente une église :</span>
          ${guest.has_church
            ? `<span class="status-pill status-active" style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 800;">🟢 Oui</span>`
            : `<span class="status-pill" style="background: rgba(107, 93, 84, 0.1); color: var(--text-muted);">⚪ Non / Pas d'église régulière</span>`
          }
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.76rem;">Nom de l'église :</span>
          <strong style="color: var(--text-main);">${escapeHtml(guest.church_name || 'Non renseigné')}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.76rem;">Ancienneté / Fréquentation :</span>
          <strong style="color: var(--text-main);">${escapeHtml(guest.church_duration || 'Non renseigné')}</strong>
        </div>
      </div>
    </div>

    <!-- Section 3 : Fiche Réseautage & Connexions VIP -->
    ${guest.net_bio || guest.interests_tags || guest.looking_for || guest.offering ? `
      <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 16px; padding: 14px; margin-bottom: 14px;">
        <h4 style="margin: 0 0 10px 0; font-size: 0.88rem; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
          🤝 Fiche Réseautage Publiée
        </h4>
        ${guest.net_bio ? `<p style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 8px;">${escapeHtml(guest.net_bio)}</p>` : ''}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.82rem;">
          ${guest.looking_for ? `<div><strong style="color: #ea580c;">Recherche :</strong> ${escapeHtml(guest.looking_for)}</div>` : ''}
          ${guest.offering ? `<div><strong style="color: #10b981;">Propose :</strong> ${escapeHtml(guest.offering)}</div>` : ''}
        </div>
        ${guest.interests_tags ? `<div style="margin-top: 8px; font-size: 0.78rem; color: var(--text-muted);">🏷️ Tags : ${escapeHtml(guest.interests_tags)}</div>` : ''}
      </div>
    ` : ''}

    <!-- Section 4 : Historique des Requêtes de Prière -->
    <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 16px; padding: 14px; margin-bottom: 16px;">
      <h4 style="margin: 0 0 10px 0; font-size: 0.88rem; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
        🙏 Requêtes de Prières (${prayers.length})
      </h4>
      ${prayersHtml}
    </div>

    <!-- Traçabilité & Enregistrement -->
    <div style="background: var(--bg-card); border: 1.5px solid var(--border-color); border-radius: 16px; padding: 14px; margin-bottom: 14px;">
      <h4 style="margin: 0 0 8px 0; font-size: 0.88rem; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
        📱 Traçabilité & Enregistrement
      </h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.84rem;">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.74rem;">Canal d'inscription :</span>
          <strong style="color: ${guest.registration_source === 'link' ? '#b45309' : '#059669'};">
            ${guest.registration_source === 'link' ? '🔗 Lien Public (Smartphone / WhatsApp)' : '🏛️ Saisie Régie / En Salle'}
          </strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.74rem;">Date & Heure d'inscription :</span>
          <strong>${new Date(guest.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.74rem;">Identifiant Unique du Billet :</span>
          <code style="font-size: 0.74rem; background: var(--bg-secondary); padding: 2px 6px; border-radius: 6px; word-break: break-all;">${escapeHtml(guest.id)}</code>
        </div>
      </div>
    </div>

    <!-- Actions régie -->
    <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
      <button type="button" class="btn-table-action danger" onclick="window.deleteGuest('${guest.id}'); window.closeGuestCRM();">
        🗑️ Retirer cet invité
      </button>
      <button type="button" class="btn-table-action" data-move-guest-trigger="true" data-guest-id="${escapeHtml(guest.id)}" style="background: rgba(212, 175, 55, 0.18); border: 1.5px solid var(--accent-gold); color: var(--accent-gold); font-weight: 800; padding: 10px 16px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;" onclick="window.openMoveGuestDropdown(this, this.getAttribute('data-guest-id'), event)">
        🔄 Déplacer vers une table ▾
      </button>
      <button type="button" class="btn-table-action" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; font-weight: 800; padding: 10px 18px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;" onclick="window.openEditGuestModal('${guest.id}')">
        ✏️ Modifier Coordonnées & Table
      </button>
      <a href="${getCanonicalTicketUrl(guest)}" target="_blank" class="btn-table-action" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; font-weight: 800; padding: 10px 16px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; border-radius: 12px;">
        🎟️ Voir Billet 3D
      </a>
      <button type="button" class="btn-table-action" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; font-weight: 800; padding: 10px 16px;" onclick="window.adminShareGuestTicketWhatsApp('${guest.id}')">
        💬 Envoyer WhatsApp
      </button>
      <button type="button" class="btn-table-action" style="background: var(--honey-gradient); color: var(--honey-dark); font-weight: 800; padding: 10px 18px;" onclick="window.exportCurrentGuestPDF()">
        🖨️ Exporter Fiche Imprimable (PDF)
      </button>
    </div>
  `;

  modal.style.display = 'flex';
};

async function generateGuestTicketBlob(guest) {
  try {
    if (document.fonts) {
      await document.fonts.ready;
    }
  } catch(e) {}

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 921;
  const ctx = canvas.getContext('2d');

  const img = new Image();

  await new Promise((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1024, 921);

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

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(212, 175, 55, 0.45)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      let fontSize = 36;
      if (textToInscribe.length > 34) fontSize = 24;
      else if (textToInscribe.length > 26) fontSize = 28;
      else if (textToInscribe.length > 18) fontSize = 32;

      ctx.font = `700 ${fontSize}px "Playfair Display", Georgia, "Brush Script MT", cursive, serif`;
      ctx.fillStyle = '#1c130d';
      ctx.fillText(textToInscribe, 512, 94);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      const cleanTableNum = String(guest.table_number || '').toUpperCase().replace(/^TABLE\s*/i, '').trim();
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#8B5A2B';
      ctx.textAlign = 'right';
      ctx.fillText(`TABLE ${cleanTableNum}`, 930, 48);

      resolve();
    };

    img.onerror = () => {
      console.warn("Échec chargement image fond billet");
      resolve();
    };

    img.src = '/billet-invitation-template.png';
  });

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

window.adminShareGuestTicketWhatsApp = async (guestId) => {
  const guest = (AdminState.guests || []).find(g => g.id === guestId);
  if (!guest) return;

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

  const cleanMessage =
    `*INVITATION OFFICIELLE - 2ÈME ÉDITION DU DÎNER DE GALA*\n\n` +
    `⭐ *Événement :* 2ème édition du Dîner de Gala 2026\n` +
    `📅 *Date :* Samedi 24 Octobre 2026 dès 15h00\n` +
    `🎟️ *Billet officiel :* ${displayName}\n` +
    `🍽️ *Table réservée :* Table ${cleanTable}\n` +
    `📍 *Lieu :* Salle de fête Le Rocher des Âges sise Rond point Entraco.\n\n` +
    `🎟️ *Voir mon Billet Officiel en 3D & Accéder à la Cérémonie :*\n${ticketUrl}`;

  const filenameSafe = (guest.couple_name || guest.name || 'Billet').replace(/[^a-zA-Z0-9]/g, '_');

  showAdminToast("Génération du billet officiel en cours...", "info");

  try {
    const blob = await generateGuestTicketBlob(guest);
    if (blob) {
      const ticketFile = new File([blob], `Billet-Gala-2026-${filenameSafe}.png`, { type: 'image/png' });

      // 1. Sur Smartphone / Navigateur supportant le partage direct natif avec fichier (Android, iPhone)
      if (navigator.canShare && navigator.canShare({ files: [ticketFile] })) {
        try {
          await navigator.share({
            title: `Billet d'Invitation - ${displayName}`,
            text: cleanMessage,
            files: [ticketFile]
          });
          showAdminToast("Billet et invitation partagés avec succès ! ✨", "success");
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn("Échec partage natif régie, bascule vers WhatsApp Web:", err);
        }
      }

      // 2. Sur Desktop / PC : Copie de l'image dans le presse-papier + Téléchargement automatique
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
        }
      } catch (e) {}

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Billet-Gala-2026-${filenameSafe}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err) {
    console.warn("Erreur génération image billet régie:", err);
  }

  // 3. Ouvrir WhatsApp avec le message texte formaté
  let waPhone = (guest.phone || '').replace(/[^0-9]/g, '');
  const waUrl = waPhone
    ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(cleanMessage)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(cleanMessage)}`;

  window.open(waUrl, '_blank');
  showAdminToast("Image du billet téléchargée et texte préparé pour WhatsApp ! 💬", "success");
};

window.closeGuestCRM = () => {
  const modal = document.getElementById('modal-guest-crm');
  if (modal) modal.style.display = 'none';
  currentCrmGuestId = null;
};

// -------------------------------------------------------------
// MODIFICATION D'UN INVITÉ (COORDONNÉES, ORTHOGRAPHE & TABLE)
// -------------------------------------------------------------
window.openEditGuestModal = (guestId) => {
  const guest = (AdminState.guests || []).find(g => g.id === guestId);
  if (!guest) return;

  const modal = document.getElementById('modal-edit-guest');
  if (!modal) return;

  document.getElementById('admin-edit-guest-id').value = guest.id;
  document.getElementById('admin-edit-name').value = guest.name || '';
  document.getElementById('admin-edit-phone').value = guest.phone || '';
  document.getElementById('admin-edit-table').value = (guest.table_number || 'A').toUpperCase().replace(/^TABLE\s*/i, '').trim();
  document.getElementById('admin-edit-host').value = guest.invited_by || '';
  const rankEl = document.getElementById('admin-edit-rank');
  if (rankEl) {
    rankEl.value = (guest.role && guest.role !== 'invite') ? guest.role : (guest.rank || "Invitée de Marque");
  }
  document.getElementById('admin-edit-profession').value = guest.profession || '';
  document.getElementById('admin-edit-company').value = guest.company || '';
  document.getElementById('admin-edit-residence').value = guest.residence_location || '';

  // Sexe M / F
  if (guest.gender === 'F') {
    document.getElementById('admin-edit-gender-f').checked = true;
  } else {
    document.getElementById('admin-edit-gender-m').checked = true;
  }

  // Type billet (seul / couple)
  const isCouple = guest.ticket_type === 'couple';
  if (isCouple) {
    document.getElementById('admin-edit-ticket-couple').checked = true;
  } else {
    document.getElementById('admin-edit-ticket-seul').checked = true;
  }
  window.toggleAdminEditCoupleFields(isCouple);

  document.getElementById('admin-edit-partner').value = guest.partner_name || '';
  document.getElementById('admin-edit-couple-name').value = guest.couple_name || '';

  // Remplir la liste des tables disponibles dans le datalist
  const tablesDatalist = document.getElementById('admin-tables-datalist');
  if (tablesDatalist) {
    const knownTables = ['A', "A'", 'D', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'O', 'P', 'Q', 'S', 'T', 'U', 'V', 'W', 'X', 'Z'];
    tablesDatalist.innerHTML = knownTables.map(t => `<option value="${t}">Table ${t}</option>`).join('');
  }

  modal.style.display = 'flex';
};

window.closeEditGuestModal = () => {
  const modal = document.getElementById('modal-edit-guest');
  if (modal) modal.style.display = 'none';
};

window.toggleAdminEditCoupleFields = (isCouple) => {
  const container = document.getElementById('admin-edit-couple-fields');
  const partnerInput = document.getElementById('admin-edit-partner');
  const coupleInput = document.getElementById('admin-edit-couple-name');
  if (container) container.style.display = isCouple ? 'block' : 'none';
  if (partnerInput) partnerInput.required = isCouple;
  if (coupleInput) coupleInput.required = isCouple;
};

window.saveEditedGuest = async () => {
  const guestId = document.getElementById('admin-edit-guest-id').value;
  if (!guestId) return;

  const btn = document.getElementById('btn-admin-update-guest');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Enregistrement...';
  }

  const name = document.getElementById('admin-edit-name').value.trim();
  const gender = document.querySelector('input[name="admin-edit-gender"]:checked')?.value || 'M';
  const ticketType = document.querySelector('input[name="admin-edit-ticket-type"]:checked')?.value || 'seul';
  const partnerName = document.getElementById('admin-edit-partner').value.trim();
  const coupleName = document.getElementById('admin-edit-couple-name').value.trim();
  const rawTable = document.getElementById('admin-edit-table').value.trim();
  const cleanTable = rawTable.toUpperCase().replace(/^TABLE\s*/i, '').trim() || 'A';
  const host = document.getElementById('admin-edit-host').value.trim();
  const phone = document.getElementById('admin-edit-phone').value.trim();
  const rank = document.getElementById('admin-edit-rank')?.value.trim() || "Invitée de Marque";
  const profession = document.getElementById('admin-edit-profession').value.trim();
  const company = document.getElementById('admin-edit-company').value.trim();
  const residence = document.getElementById('admin-edit-residence').value.trim();

  if (!name) {
    alert("Veuillez saisir le nom de l'invité.");
    if (btn) { btn.disabled = false; btn.textContent = '💾 Enregistrer les modifications'; }
    return;
  }

  if (ticketType === 'couple' && (!partnerName || !coupleName)) {
    alert("Pour un billet couple, veuillez renseigner le nom du conjoint et le nom officiel du couple.");
    if (btn) { btn.disabled = false; btn.textContent = '💾 Enregistrer les modifications'; }
    return;
  }

  try {
    await adminFetch(`/admin/guests/${guestId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name,
        gender,
        ticket_type: ticketType,
        partner_name: partnerName,
        couple_name: coupleName,
        table_number: cleanTable,
        invited_by: host,
        role: rank,
        phone,
        profession,
        company,
        residence_location: residence
      })
    });

    showAdminToast("Coordonnées et table mises à jour avec succès !", "success");
    window.closeEditGuestModal();
    window.closeGuestCRM();
    await loadGuests();
    await loadOverview();
  } catch (err) {
    showAdminToast("Erreur modification : " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 Enregistrer les modifications';
    }
  }
};

window.exportCurrentGuestPDF = () => {
  if (currentCrmGuestId) {
    window.exportGuestPDF(currentCrmGuestId);
  }
};

window.exportGuestPDF = (guestId) => {
  const guest = AdminState.guests.find(g => g.id === guestId);
  if (!guest) return;

  const prayers = guest.prayers_history || [];
  const prayersList = prayers.map(p => `
    <div style="border-left: 3px solid #f59e0b; padding-left: 12px; margin-bottom: 12px;">
      <div style="font-weight: bold; font-size: 14px; color: #b45309;">${escapeHtml(p.title || 'Prière')} (${new Date(p.created_at).toLocaleDateString()})</div>
      ${p.target_person ? `<div style="font-size: 13px;"><strong>Pour :</strong> ${escapeHtml(p.target_person)}</div>` : ''}
      <div style="font-style: italic; margin: 4px 0; font-size: 13px;">« ${escapeHtml(p.content)} »</div>
      ${p.residence_location ? `<div style="font-size: 12px; color: #666;">Lieu de visite : ${escapeHtml(p.residence_location)}</div>` : ''}
    </div>
  `).join('');

  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fiche Participant - ${escapeHtml(guest.name)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #222; line-height: 1.5; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #ea580c; padding-bottom: 14px; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: bold; color: #ea580c; margin: 0; }
    .badge { background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 999px; font-weight: bold; font-size: 12px; }
    .section { margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .section h3 { margin-top: 0; font-size: 14px; color: #475569; text-transform: uppercase; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
    .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${escapeHtml(guest.name)}</div>
      <div style="font-size: 13px; color: #64748b;">Table : <strong>Table ${escapeHtml(guest.table_number || '1')}</strong> • Rang : <strong>${escapeHtml(guest.role && guest.role !== 'invite' ? guest.role : (guest.rank || "Invitée de Marque"))}</strong> • Score : <strong>${guest.points || 0} pts</strong></div>
    </div>
    <button onclick="window.print()" style="padding: 8px 16px; background: #ea580c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
      🖨️ Imprimer / Enregistrer PDF
    </button>
  </div>

  <div class="section">
    <h3>📍 Coordonnées & Situation Professionnelle</h3>
    <div class="grid">
      <div><strong>Lieu de résidence :</strong> ${escapeHtml(guest.residence_location || 'Non renseigné')}</div>
      <div><strong>Téléphone :</strong> ${escapeHtml(guest.phone || 'Non renseigné')}</div>
      <div><strong>Profession / Métier :</strong> ${escapeHtml(guest.profession || 'Non renseigné')}</div>
      <div><strong>Lieu de travail / Entreprise :</strong> ${escapeHtml(guest.company || 'Non renseigné')}</div>
    </div>
  </div>

  <div class="section">
    <h3>⛪ Vie Spirituelle & Église</h3>
    <div class="grid">
      <div><strong>Fréquente une église :</strong> ${guest.has_church ? 'Oui' : 'Non'}</div>
      <div><strong>Nom de l'église :</strong> ${escapeHtml(guest.church_name || 'Non renseigné')}</div>
      <div><strong>Ancienneté :</strong> ${escapeHtml(guest.church_duration || 'Non renseigné')}</div>
    </div>
  </div>

  <div class="section">
    <h3>🙏 Requêtes de Prière (${prayers.length})</h3>
    ${prayersList || '<p style="font-size: 13px; color: #666;">Aucune demande de prière enregistrée.</p>'}
  </div>

  <div class="footer">
    Compagnon de Cérémonie • Dîner de Gala • Fiche générée le ${new Date().toLocaleString()}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  try {
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert("Veuillez autoriser les fenêtres pop-up pour imprimer ou exporter en PDF.");
    }
  } catch (e) {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
    } else {
      alert("Veuillez autoriser les fenêtres pop-up pour imprimer ou exporter en PDF.");
    }
  }
};

window.exportGuestsReceptionSheet = (filterMode = 'current') => {
  try {
    let mode = filterMode;
    if (mode === 'current') {
      mode = (typeof currentGuestSubTab !== 'undefined' && currentGuestSubTab) ? currentGuestSubTab : 'all';
    }

    // 1. Filtrer les invités
    let guests = AdminState.guests || [];
    if (mode === 'link') {
      guests = guests.filter(g => g.registration_source === 'link');
    } else if (mode === 'salle') {
      guests = guests.filter(g => g.registration_source !== 'link');
    }

    // Filtrer impérativement les résidus sans hôte (ex: hôte non spécifié ou sans parrain)
    guests = guests.filter(g => {
      const h = (g.invited_by || '').trim();
      return h && h.toLowerCase() !== 'hôte non spécifié' && h.toLowerCase() !== 'hote non specifie';
    });

    // Respecter le filtre d'hôte s'il est actif dans l'admin (normalisation canonique)
    const hostFilter = document.getElementById('admin-guest-host-filter')?.value;
    if (hostFilter) {
      guests = guests.filter(g => getHostKey(g.invited_by) === hostFilter || (g.invited_by || '').toLowerCase().trim() === hostFilter.toLowerCase());
    }

    // Si aucun invité n'est encore enregistré avec ces critères
    if (guests.length === 0) {
      const labelMode = mode === 'link' ? "par lien" : (mode === 'salle' ? "en salle" : "enregistré");
      const confirmBlank = confirm(
        `Aucun invité ${labelMode} n'est actuellement trouvé avec ces filtres.\n\nSouhaitez-vous générer le gabarit officiel vierge des Tables (A, D, F, G, H...) pour que l'équipe d'accueil puisse noter les présences manuellement sur papier ?`
      );
      if (!confirmBlank) return;
      
      // Gabarit de tables officielles vierges
      const sampleTables = ['A', 'D', 'F', 'G', 'H', 'I'];
      guests = sampleTables.map(t => ({
        name: '',
        table_number: t,
        invited_by: hostFilter || 'Hôte Officiel',
        phone: '',
        is_placeholder: true
      }));
    }

    // 2. Regrouper par Table puis par Hôte (normalisation canonique insensible à la casse Micky vs micky)
    const groupMap = {};
    guests.forEach(g => {
      const rawTable = (g.table_number || 'A').toUpperCase().replace(/^TABLE\s*/i, '').trim() || 'A';
      const rawHost = (g.invited_by || '').trim();
      const hostKey = getHostKey(rawHost);
      const key = `${rawTable}___${hostKey}`;
      if (!groupMap[key]) {
        groupMap[key] = {
          table: rawTable,
          host: getHostDisplayName(rawHost),
          items: []
        };
      }
      if (rawHost.length > groupMap[key].host.length || (rawHost !== rawHost.toLowerCase() && groupMap[key].host === groupMap[key].host.toLowerCase())) {
        groupMap[key].host = getHostDisplayName(rawHost);
      }
      if (!g.is_placeholder) {
        groupMap[key].items.push(g);
      }
    });

    // Trier les groupes par Table (A, A', B, C...) puis par Hôte
    const groups = Object.values(groupMap).sort((a, b) => {
      const cmp = a.table.localeCompare(b.table, undefined, { numeric: true });
      if (cmp !== 0) return cmp;
      return a.host.localeCompare(b.host);
    });

    // 3. Découper en blocs de 10 places
    const blocks = [];
    groups.forEach(grp => {
      if (grp.items.length === 0) {
        blocks.push({
          table: grp.table,
          host: grp.host,
          items: []
        });
      } else {
        for (let i = 0; i < grp.items.length; i += 10) {
          const slice = grp.items.slice(i, i + 10);
          const isFollowUp = i > 0;
          blocks.push({
            table: grp.table,
            host: isFollowUp ? `${grp.host} (suite)` : grp.host,
            items: slice
          });
        }
      }
    });

    // 4. Découper en pages de MAXIMUM 3 tables par page A4 (Adaptabilité dynamique demandée par le client)
    const BLOCKS_PER_PAGE = 3;
    const pages = [];
    for (let i = 0; i < blocks.length; i += BLOCKS_PER_PAGE) {
      const pageSlice = blocks.slice(i, i + BLOCKS_PER_PAGE);
      pages.push(pageSlice);
    }

    // 5. Rendu HTML de chaque page A4
    const pagesHtml = pages.map((pageBlocks, pageIndex) => {
      const blocksHtml = pageBlocks.map(block => {
        // 10 lignes par bloc
        let rowsHtml = '';
        for (let rowIdx = 1; rowIdx <= 10; rowIdx++) {
          const guest = block.items[rowIdx - 1];
          let guestName = '';
          let guestRank = '';
          let guestPhone = '';

          if (guest) {
            if (guest.ticket_type === 'couple') {
              let rawCouple = (guest.couple_name || guest.name || '').trim();
              rawCouple = rawCouple.replace(/^couple\s+/i, '').trim();
              let cName = `Couple ${rawCouple}`;
              let details = '';
              if (guest.name && guest.partner_name) {
                const cleanP1 = (guest.name || '').replace(/^(m\.|mme|mr)\s+/i, '').trim();
                const cleanP2 = (guest.partner_name || '').replace(/^(m\.|mme|mr)\s+/i, '').trim();
                details = ` (${cleanP1} & ${cleanP2})`;
              }
              guestName = `<strong>${escapeHtml(cName)}</strong>${escapeHtml(details)}`;
            } else {
              let cleanN = (guest.name || '').trim();
              cleanN = cleanN.replace(/^(m\.|mme|mr|madame|monsieur)\s+/i, '').trim();
              const prefix = guest.gender === 'F' ? 'Mme ' : 'M. ';
              guestName = `${prefix}<strong>${escapeHtml(cleanN)}</strong>`;
            }
            guestPhone = escapeHtml(guest.phone || '');
            const rawRole = (guest.role || guest.rank || '').trim();
            if (rawRole && !/^(invite|invitée de marque|invitee de marque)$/i.test(rawRole)) {
              guestName += ` <span style="font-size: 9.5px; font-weight: 700; color: #7d773c; margin-left: 4px;">[${escapeHtml(rawRole)}]</span>`;
            }
          }

          // Ligne 1 : inclut les cellules fusionnées (Hôte à gauche, Table à droite)
          if (rowIdx === 1) {
            rowsHtml += `
              <tr>
                <td rowspan="10" class="col-host">
                  <div class="host-name-box">
                    <div class="host-name-label">Invité par :</div>
                    <div class="host-name-text">${escapeHtml(block.host)}</div>
                  </div>
                </td>
                <td class="col-num">${rowIdx}</td>
                <td class="col-name">${guestName}</td>
                <td class="col-phone">${guestPhone}</td>
                <td rowspan="10" class="col-table">
                  <div class="table-name-text">TABLE ${escapeHtml(block.table)}</div>
                </td>
              </tr>
            `;
          } else {
            rowsHtml += `
              <tr>
                <td class="col-num">${rowIdx}</td>
                <td class="col-name">${guestName}</td>
                <td class="col-phone">${guestPhone}</td>
              </tr>
            `;
          }
        }

        return `
          <div class="block-wrapper">
            <table class="block-table">
              <thead>
                <tr class="header-band-row">
                  <th colspan="5" class="header-band"></th>
                </tr>
                <tr class="header-labels-row">
                  <th class="th-host">Inviter par</th>
                  <th class="th-num">N°</th>
                  <th class="th-name">Nom de l'invité</th>
                  <th class="th-phone">N° TEL</th>
                  <th class="th-table-blank">TABLE</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      }).join('');

      return `
        <div class="sheet-page">
          <div class="sheet-main-content">
            ${blocksHtml}
          </div>
          <div class="sheet-vertical-banner">
            <div class="vertical-title">LISTE DES INVITES</div>
          </div>
          <div style="position: absolute; bottom: 2mm; left: 8mm; right: 40mm; font-size: 8.5px; color: #64748b; display: flex; justify-content: space-between;">
            <span>2ème Édition Dîner de Gala 2026 • Fiche d'Accueil Officielle</span>
            <span><strong>Page ${pageIndex + 1} / ${pages.length}</strong></span>
          </div>
        </div>
      `;
    }).join('');

    const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fiche d'Accueil Officielle - Liste des Invités (${pages.length} page${pages.length > 1 ? 's' : ''})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm 6mm;
    }
    * { box-sizing: border-box; }
    html, body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0 !important;
      padding: 0 !important;
      background: #f1f5f9;
      color: #111;
      height: auto !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Barre d'action supérieure (masquée à l'impression) */
    .top-action-bar {
      background: #1e293b;
      color: #fff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 999;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    }
    .top-action-bar button {
      font-size: 14px;
      font-weight: 700;
      padding: 8px 18px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
    }
    .btn-print {
      background: #f59e0b;
      color: #1e293b;
      margin-right: 8px;
    }
    .btn-close {
      background: #475569;
      color: #fff;
    }

    /* Structure de Page A4 */
    .sheet-page {
      width: 198mm;
      min-height: 280mm;
      margin: 15px auto;
      background: #fff;
      display: flex;
      flex-direction: row;
      border: 1px solid #cbd5e1;
      box-shadow: 0 8px 24px rgba(0,0,0,0.1);
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      box-sizing: border-box;
      overflow: visible;
      position: relative;
    }
    .sheet-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    /* Zone Principale gauche (Tables) */
    .sheet-main-content {
      flex: 1;
      padding: 5mm 4mm 8mm 5mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 5mm;
    }

    /* Bloc individuel (Table + Hôte) */
    .block-wrapper {
      margin-bottom: 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .block-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 1.5px solid #222;
    }

    /* Bande supérieure verte olive / bronze */
    .header-band {
      background-color: #7d773c !important;
      height: 12px;
      border: 1.5px solid #222;
    }
    .header-labels-row th {
      border: 1.5px solid #222;
      font-size: 10.5px;
      font-weight: 800;
      padding: 3px 4px;
      text-align: center;
      background-color: #fff;
      color: #1c130d;
    }
    .th-host { width: 17%; }
    .th-num { width: 4.5%; }
    .th-name { width: 52%; }
    .th-phone { width: 15%; }
    .th-table-blank { width: 11.5%; background: #ded9c8 !important; border: 1.5px solid #222; font-size: 10.5px; }

    /* Lignes de contenu */
    .block-table td {
      border: 1.5px solid #222;
      height: 22px;
      padding: 2px 4px;
      font-size: 11px;
      vertical-align: middle;
    }

    /* Cellule Hôte fusionnée (gauche) */
    .col-host {
      text-align: center;
      vertical-align: middle;
      background: #fff;
      font-weight: 700;
      font-size: 11px;
      color: #1c130d;
      padding: 4px !important;
    }
    .host-name-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .host-name-label {
      font-size: 8.5px;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .host-name-text {
      max-width: 110px;
      word-break: break-word;
      font-size: 11px;
      font-weight: 800;
    }

    /* Numéro */
    .col-num {
      text-align: center;
      font-weight: 700;
      font-size: 10.5px;
      color: #222;
      background: #fafafa;
    }

    /* Nom invité : Pleine largeur, adaptation dynamique multi-lignes */
    .col-name {
      text-align: left;
      white-space: normal !important;
      word-break: normal;
      overflow-wrap: break-word;
      line-height: 1.25;
      font-size: 11px;
      padding: 2px 6px !important;
    }

    /* Téléphone */
    .col-phone {
      text-align: center;
      font-size: 10px;
      color: #222;
      white-space: nowrap;
      font-family: Consolas, "Segoe UI Mono", monospace, sans-serif;
    }

    /* Cellule Table fusionnée (droite) */
    .col-table {
      background-color: #ded9c8 !important;
      text-align: center;
      vertical-align: middle;
      font-weight: 900;
      font-size: 13px;
      letter-spacing: 0.5px;
      color: #111;
    }
    .table-name-text {
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 800;
    }

    /* Bannière verticale droite */
    .sheet-vertical-banner {
      width: 36mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border-left: 2px solid #222;
      padding: 8px 0;
    }
    .vertical-title {
      writing-mode: vertical-rl;
      text-orientation: upright;
      font-family: Impact, "Arial Black", sans-serif;
      font-weight: 900;
      font-size: 26px;
      letter-spacing: 5px;
      text-transform: uppercase;
      background: linear-gradient(180deg, #f97316 0%, #facc15 50%, #ea580c 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 2px 2px rgba(234, 88, 12, 0.25));
      user-select: none;
    }

    /* Règles d'impression pour exporter TOUTES les pages sans coupure */
    @media print {
      html, body {
        background: #fff !important;
        padding: 0 !important;
        margin: 0 !important;
        height: auto !important;
        overflow: visible !important;
      }
      .top-action-bar { display: none !important; }
      .sheet-page {
        margin: 0 !important;
        border: none !important;
        box-shadow: none !important;
        width: 100% !important;
        min-height: 275mm !important;
        max-height: none !important;
        height: auto !important;
        overflow: visible !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .sheet-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .block-wrapper {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="top-action-bar">
    <div>
      <span style="font-size: 16px; font-weight: 800; color: #f59e0b;">📋 Fiche d'Accueil Officielle • Dîner de Gala 2026</span>
      <span style="font-size: 12px; margin-left: 12px; opacity: 0.85;">(${blocks.length} table(s) • Max 3 tables par feuille A4 • ${pages.length} page(s) à imprimer)</span>
    </div>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
      <button class="btn-close" onclick="window.close()">✖ Fermer</button>
    </div>
  </div>

  ${pagesHtml}
</body>
</html>`;

    // 6. Ouvrir la fenêtre de prévisualisation proprement via Blob URL
    try {
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank', 'width=1150,height=960');
      if (!printWindow) {
        alert("Veuillez autoriser les fenêtres pop-up de votre navigateur pour afficher la fiche d'accueil.");
      }
    } catch (e) {
      console.warn("Échec Blob URL, repli sur document.write:", e);
      const printWindow = window.open('', '_blank', 'width=1150,height=960');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(fullHtml);
        printWindow.document.close();
      } else {
        alert("Veuillez autoriser les fenêtres pop-up pour afficher la fiche d'accueil.");
      }
    }
  } catch (err) {
    console.error("Erreur génération fiche d'accueil:", err);
    showAdminToast("Erreur lors de la génération de la fiche d'accueil : " + err.message, "error");
  }
};

// -------------------------------------------------------------
// FICHE HÔTESSE OFFICIELLE (GROUPÉE PAR TABLE DE 10 PLACES)
// Rapproche les invités d'une même table physique (A, A', B...)
// avec l'hôte parrain affiché sous le nom de l'invité
// -------------------------------------------------------------
window.exportGuestsHostessSheet = (filterMode = 'current') => {
  try {
    let mode = filterMode;
    if (mode === 'current') {
      mode = (typeof currentGuestSubTab !== 'undefined' && currentGuestSubTab) ? currentGuestSubTab : 'all';
    }

    let guests = AdminState.guests || [];
    if (mode === 'link') {
      guests = guests.filter(g => g.registration_source === 'link');
    } else if (mode === 'salle') {
      guests = guests.filter(g => g.registration_source !== 'link');
    }

    // Filtrer impérativement les résidus sans hôte
    guests = guests.filter(g => {
      const h = (g.invited_by || '').trim();
      return h && h.toLowerCase() !== 'hôte non spécifié' && h.toLowerCase() !== 'hote non specifie';
    });

    // Si une table spécifique est actuellement filtrée au clic
    if (AdminState.selectedTableFilter) {
      const sel = AdminState.selectedTableFilter.toUpperCase();
      guests = guests.filter(g => (g.table_number || '').toUpperCase().replace(/^TABLE\s*/i, '').trim() === sel);
    }

    if (guests.length === 0) {
      alert("Aucun invité trouvé pour générer la Fiche Hôtesse avec ces critères.");
      return;
    }

    // Regrouper STRICTEMENT PAR TABLE (Table A, Table A', Table B, etc.)
    const tableMap = {};
    guests.forEach(g => {
      const rawTable = (g.table_number || 'A').toUpperCase().replace(/^TABLE\s*/i, '').trim() || 'A';
      if (!tableMap[rawTable]) {
        tableMap[rawTable] = [];
      }
      tableMap[rawTable].push(g);
    });

    // Trier les tables par ordre alphabétique / numérique naturel (A, A', A'', B, D, E...)
    const sortedTableKeys = Object.keys(tableMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    // Découper en blocs physiques de 10 places par table
    const blocks = [];
    sortedTableKeys.forEach(tKey => {
      const items = tableMap[tKey];
      for (let i = 0; i < items.length; i += 10) {
        blocks.push({
          table: i === 0 ? tKey : `${tKey} (suite)`,
          items: items.slice(i, i + 10)
        });
      }
    });

    // 3 tables par page A4
    const BLOCKS_PER_PAGE = 3;
    const pages = [];
    for (let i = 0; i < blocks.length; i += BLOCKS_PER_PAGE) {
      pages.push(blocks.slice(i, i + BLOCKS_PER_PAGE));
    }

    // Rendu HTML des blocs
    const pagesHtml = pages.map((pageBlocks, pageIndex) => {
      const blocksHtml = pageBlocks.map(block => {
        let rowsHtml = '';
        for (let rowIdx = 1; rowIdx <= 10; rowIdx++) {
          const guest = block.items[rowIdx - 1];
          let guestHtml = '';

          if (guest) {
            let nameTitle = '';
            if (guest.ticket_type === 'couple') {
              let rawCouple = (guest.couple_name || guest.name || '').trim();
              rawCouple = rawCouple.replace(/^couple\s+/i, '').trim();
              let cName = `Couple ${rawCouple}`;
              let details = '';
              if (guest.name && guest.partner_name) {
                const cleanP1 = (guest.name || '').replace(/^(m\.|mme|mr)\s+/i, '').trim();
                const cleanP2 = (guest.partner_name || '').replace(/^(m\.|mme|mr)\s+/i, '').trim();
                details = ` (${cleanP1} & ${cleanP2})`;
              }
              nameTitle = `<strong>${escapeHtml(cName)}</strong>${escapeHtml(details)}`;
            } else {
              let cleanN = (guest.name || '').trim();
              cleanN = cleanN.replace(/^(m\.|mme|mr|madame|monsieur)\s+/i, '').trim();
              const prefix = guest.gender === 'F' ? 'Mme ' : 'M. ';
              nameTitle = `${prefix}<strong>${escapeHtml(cleanN)}</strong>`;
            }

            const rawRole = (guest.role || guest.rank || '').trim();
            if (rawRole && !/^(invite|invitée de marque|invitee de marque)$/i.test(rawRole)) {
              nameTitle += ` <span style="font-size: 9px; font-weight: 700; color: #7d773c; margin-left: 4px;">[${escapeHtml(rawRole)}]</span>`;
            }

            const hostDisplay = getHostDisplayName(guest.invited_by);
            const phoneDisplay = guest.phone ? `<span style="color: #475569; font-size: 9px; font-weight: 600; margin-left: 6px;">📞 ${escapeHtml(guest.phone)}</span>` : '';

            guestHtml = `
              <div style="font-size: 11px; line-height: 1.25; color: #0f172a;">${nameTitle}</div>
              <div style="margin-top: 2px; font-size: 9px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                <span style="font-weight: 800; color: #854d0e; font-size: 8.5px; letter-spacing: 0.3px;">INVITÉ PAR :</span>
                <span style="background: #fef08a; color: #713f12; font-weight: 800; padding: 1px 6px; border-radius: 4px; border: 1px solid #fde047; font-size: 9px;">${escapeHtml(hostDisplay)}</span>
                ${phoneDisplay}
              </div>
            `;
          }

          if (rowIdx === 1) {
            rowsHtml += `
              <tr>
                <td class="col-num">${rowIdx}</td>
                <td class="col-name">${guestHtml}</td>
                <td rowspan="10" class="col-table">
                  <div class="table-name-text">TABLE ${escapeHtml(block.table)}</div>
                </td>
              </tr>
            `;
          } else {
            rowsHtml += `
              <tr>
                <td class="col-num">${rowIdx}</td>
                <td class="col-name">${guestHtml}</td>
              </tr>
            `;
          }
        }

        return `
          <div class="block-wrapper">
            <table class="block-table">
              <thead>
                <tr class="header-band-row">
                  <th colspan="3" class="header-band"></th>
                </tr>
                <tr class="header-labels-row">
                  <th class="th-num">N°</th>
                  <th class="th-name">Nom de l'invité & Hôte parrain</th>
                  <th class="th-table-blank">TABLE</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      }).join('');

      return `
        <div class="sheet-page">
          <div class="sheet-main-content">
            ${blocksHtml}
          </div>
          <div class="sheet-vertical-banner">
            <div class="vertical-title">LISTE DES INVITES</div>
          </div>
          <div style="position: absolute; bottom: 2mm; left: 8mm; right: 40mm; font-size: 8.5px; color: #64748b; display: flex; justify-content: space-between;">
            <span>2ème Édition Dîner de Gala 2026 • Fiche Hôtesse Officielle (Par Table)</span>
            <span><strong>Page ${pageIndex + 1} / ${pages.length}</strong></span>
          </div>
        </div>
      `;
    }).join('');

    const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fiche Hôtesse Officielle - Liste des Invités (${pages.length} page${pages.length > 1 ? 's' : ''})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm 6mm;
    }
    * { box-sizing: border-box; }
    html, body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0 !important;
      padding: 0 !important;
      background: #f1f5f9;
      color: #111;
      height: auto !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .top-action-bar {
      background: #1e293b;
      color: #fff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .btn-print {
      background: linear-gradient(135deg, #b45309, #d97706);
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    .btn-close {
      background: #334155;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      margin-left: 8px;
      font-size: 13px;
    }

    .sheet-page {
      width: 210mm;
      min-height: 297mm;
      margin: 10px auto;
      background: #fff;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      display: flex;
      position: relative;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }

    .sheet-main-content {
      flex: 1;
      padding: 5mm 4mm 8mm 5mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 5mm;
    }

    .block-wrapper {
      margin-bottom: 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .block-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 1.5px solid #222;
    }

    .header-band {
      background-color: #7d773c !important;
      height: 12px;
      border: 1.5px solid #222;
    }
    .header-labels-row th {
      border: 1.5px solid #222;
      font-size: 10.5px;
      font-weight: 800;
      padding: 3px 4px;
      text-align: center;
      background-color: #fff;
      color: #1c130d;
    }
    .th-num { width: 5.5%; }
    .th-name { width: 74.5%; text-align: left !important; padding-left: 8px !important; }
    .th-table-blank { width: 20%; background: #ded9c8 !important; border: 1.5px solid #222; font-size: 10.5px; }

    .block-table td {
      border: 1.5px solid #222;
      height: 24px;
      padding: 2px 6px;
      font-size: 11px;
      vertical-align: middle;
    }

    .col-num {
      text-align: center;
      font-weight: 800;
      font-size: 11px;
      color: #222;
      background: #fafafa;
    }

    .col-name {
      text-align: left;
      padding-left: 8px !important;
    }

    .col-table {
      text-align: center;
      vertical-align: middle;
      background: #ded9c8 !important;
      font-weight: 900;
      font-size: 14px;
      letter-spacing: 0.5px;
      color: #111;
    }
    .table-name-text {
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 800;
    }

    .sheet-vertical-banner {
      width: 36mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border-left: 2px solid #222;
      padding: 8px 0;
    }
    .vertical-title {
      writing-mode: vertical-rl;
      text-orientation: upright;
      font-family: Impact, "Arial Black", sans-serif;
      font-weight: 900;
      font-size: 26px;
      letter-spacing: 5px;
      text-transform: uppercase;
      background: linear-gradient(180deg, #f97316 0%, #facc15 50%, #ea580c 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 2px 2px rgba(234, 88, 12, 0.25));
      user-select: none;
    }

    @media print {
      html, body {
        background: #fff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .top-action-bar { display: none !important; }
      .sheet-page {
        margin: 0 auto !important;
        box-shadow: none !important;
        width: 100% !important;
        height: 100vh !important;
        min-height: 100vh !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="top-action-bar">
    <div>
      <span style="font-size: 16px; font-weight: 800; color: #f59e0b;">📑 Fiche Hôtesse Officielle (Par Table) • Dîner de Gala 2026</span>
      <span style="font-size: 12px; margin-left: 12px; opacity: 0.85;">(${blocks.length} table(s) • 10 places par table • ${pages.length} page(s) à imprimer)</span>
    </div>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ Imprimer la Fiche Hôtesse (PDF)</button>
      <button class="btn-close" onclick="window.close()">✖ Fermer</button>
    </div>
  </div>

  ${pagesHtml}
</body>
</html>`;

    try {
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank', 'width=1150,height=960');
      if (!printWindow) {
        alert("Veuillez autoriser les fenêtres pop-up de votre navigateur pour afficher la fiche hôtesse.");
      }
    } catch (e) {
      const printWindow = window.open('', '_blank', 'width=1150,height=960');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(fullHtml);
        printWindow.document.close();
      } else {
        alert("Veuillez autoriser les fenêtres pop-up pour afficher la fiche hôtesse.");
      }
    }
  } catch (err) {
    console.error("Erreur génération fiche hôtesse:", err);
    showAdminToast("Erreur lors de la génération de la fiche hôtesse : " + err.message, "error");
  }
};

window.deleteGuest = async (guestId) => {
  if (!confirm("Retirer cet invité de la cérémonie ?")) return;
  try {
    await adminFetch(`/admin/guests/${guestId}`, { method: 'DELETE' });
    showAdminToast("Invité retiré.", "info");
    loadGuests();
    loadOverview();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

// -------------------------------------------------------------
// 8. CONTRÔLE VIDÉOPROJECTEUR GRAND ÉCRAN
// -------------------------------------------------------------
window.setProjectorDisplayMode = async (mode) => {
  try {
    const res = await adminFetch('/admin/projector/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
    showAdminToast(`Vidéoprojecteur basculé sur : ${mode.toUpperCase()} 📽️`, "success");
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

// -------------------------------------------------------------
// 9. PURGE DES DONNÉES DE TEST
// -------------------------------------------------------------
window.purgeTestData = async () => {
  if (!confirm("⚠️ Confirmation : Voulez-vous supprimer les messages de test, requêtes de prières de test et réponses de quiz ?")) return;
  try {
    await adminFetch('/admin/purge-test-data', { method: 'POST' });
    showAdminToast("Données de test purgées avec succès !", "success");
    loadOverview();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

// -------------------------------------------------------------
// 10. COMMUTATEUR DIRECT VS PROGRAMME & GESTION DU DÉROULÉ
// -------------------------------------------------------------
function updateDirectToggleUI(directEnabled) {
  const isDirect = directEnabled === 1;

  // Badge overview
  const badgeEl = document.getElementById('badge-direct-status');
  if (badgeEl) {
    badgeEl.className = isDirect ? 'status-pill status-active' : 'status-pill status-pending';
    badgeEl.textContent = isDirect ? '🔴 Direct Activé' : '📋 Remplacé par Programme';
  }

  // Boutons overview
  const btnDirect = document.getElementById('btn-toggle-direct-active');
  const btnProg = document.getElementById('btn-toggle-direct-program');
  if (btnDirect) {
    btnDirect.style.background = isDirect ? 'var(--terracotta-gradient)' : 'var(--bg-card)';
    btnDirect.style.color = isDirect ? '#fff' : 'var(--text-main)';
  }
  if (btnProg) {
    btnProg.style.background = !isDirect ? 'var(--terracotta-gradient)' : 'var(--bg-card)';
    btnProg.style.color = !isDirect ? '#fff' : 'var(--text-main)';
  }

  // Onglet programme
  const statusProgText = document.getElementById('program-current-broadcast-status');
  if (statusProgText) {
    statusProgText.textContent = isDirect ? 'Direct Actif 🔴 (Chat & Interactions)' : 'Remplacé par le Programme Déroulé 📋 (Synchrone Heure Téléphone)';
    statusProgText.style.color = isDirect ? '#10b981' : 'var(--terracotta-accent)';
  }

  const btnTabDirect = document.getElementById('btn-tab-prog-direct');
  const btnTabReplace = document.getElementById('btn-tab-prog-replace');
  if (btnTabDirect) {
    btnTabDirect.style.background = isDirect ? 'var(--terracotta-gradient)' : 'var(--bg-card)';
    btnTabDirect.style.color = isDirect ? '#fff' : 'var(--text-main)';
  }
  if (btnTabReplace) {
    btnTabReplace.style.background = !isDirect ? 'var(--terracotta-gradient)' : 'var(--bg-card)';
    btnTabReplace.style.color = !isDirect ? '#fff' : 'var(--text-main)';
  }
}

window.adminToggleDirect = async (enabled) => {
  try {
    const res = await adminFetch('/admin/feature/toggle-direct', {
      method: 'POST',
      body: JSON.stringify({ enabled: !!enabled }),
    });
    AdminState.directFeatureEnabled = res.direct_feature_enabled;
    updateDirectToggleUI(res.direct_feature_enabled);
    showAdminToast(res.message, "success");
    loadOverview();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

async function loadProgram() {
  try {
    const data = await adminFetch('/admin/program');
    AdminState.program = data.items || [];
    if (data.direct_feature_enabled !== undefined) {
      AdminState.directFeatureEnabled = Number(data.direct_feature_enabled);
      updateDirectToggleUI(AdminState.directFeatureEnabled);
    }
    renderProgram(AdminState.program);
  } catch (err) {
    console.error("Erreur chargement programme:", err);
  }
}

function parseTimeToMin(str) {
  if (!str) return 0;
  const clean = str.replace('h', ':').trim();
  const parts = clean.split(':').map(n => parseInt(n, 10) || 0);
  return parts[0] * 60 + (parts[1] || 0);
}

function renderProgram(items) {
  const tbody = document.getElementById('admin-program-tbody');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Aucun créneau dans le programme. Cliquez sur "Restaurer le Programme Officiel" pour initialiser.</td></tr>`;
    return;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  tbody.innerHTML = items.map(slot => {
    const startMin = parseTimeToMin(slot.start_time);
    const endMin = parseTimeToMin(slot.end_time);

    let statusPill = '';
    if (currentMinutes >= endMin) {
      statusPill = `<span class="status-pill status-ended" style="color: #991b1b; background: #fee2e2; border-color: #fca5a5;">🔴 Passé</span>`;
    } else if (currentMinutes >= startMin && currentMinutes < endMin) {
      statusPill = `<span class="status-pill status-active" style="background: var(--terracotta-soft); color: var(--terracotta-accent); border-color: var(--terracotta-accent); font-weight: 800;">⚡ En cours</span>`;
    } else {
      statusPill = `<span class="status-pill status-active" style="background: #e6f7f0; color: #065f46; border-color: #a7f3d0;">🟢 À venir</span>`;
    }

    return `
      <tr>
        <td><strong>#${slot.order_index || 1}</strong></td>
        <td><span style="font-family:'Outfit',sans-serif;font-weight:800;color:var(--text-main);">${escapeHtml(slot.start_time)} – ${escapeHtml(slot.end_time)}</span></td>
        <td>
          <strong style="color: var(--text-main); font-size: 0.9rem;">${escapeHtml(slot.title)}</strong>
          ${slot.speaker ? `<div style="color: var(--terracotta-accent); font-size: 0.76rem; font-weight: 700;">👤 ${escapeHtml(slot.speaker)}</div>` : ''}
        </td>
        <td><span style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(slot.description || '—')}</span></td>
        <td>${statusPill}</td>
        <td>
          <div class="table-actions">
            <button class="btn-table-action" onclick="editProgramSlot('${slot.id}')" title="Modifier">✏️</button>
            <button class="btn-table-action danger" onclick="deleteProgramSlot('${slot.id}')" title="Supprimer">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.saveProgramSlot = async (e) => {
  e.preventDefault();
  const id = document.getElementById('slot-id').value.trim() || undefined;
  const start_time = document.getElementById('slot-start-time').value.trim();
  const end_time = document.getElementById('slot-end-time').value.trim();
  const title = document.getElementById('slot-title').value.trim();
  const speaker = document.getElementById('slot-speaker').value.trim();
  const order_index = parseInt(document.getElementById('slot-order').value, 10) || 1;
  const description = document.getElementById('slot-desc').value.trim();

  if (!title || !start_time || !end_time) {
    showAdminToast("Heures et titre obligatoires.", "error");
    return;
  }

  try {
    await adminFetch('/admin/program/item', {
      method: 'POST',
      body: JSON.stringify({ id, start_time, end_time, title, speaker, order_index, description }),
    });

    showAdminToast(id ? "Créneau mis à jour avec succès !" : "Nouveau créneau ajouté au programme !", "success");
    cancelProgramSlotEdit();
    loadProgram();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

window.editProgramSlot = (id) => {
  const slot = (AdminState.program || []).find(s => s.id === id);
  if (!slot) return;

  document.getElementById('slot-id').value = slot.id;
  document.getElementById('slot-start-time').value = slot.start_time;
  document.getElementById('slot-end-time').value = slot.end_time;
  document.getElementById('slot-title').value = slot.title;
  document.getElementById('slot-speaker').value = slot.speaker || '';
  document.getElementById('slot-order').value = slot.order_index || 1;
  document.getElementById('slot-desc').value = slot.description || '';

  const formTitle = document.getElementById('program-form-title');
  if (formTitle) formTitle.textContent = "✏️ Modifier le Créneau du Programme";

  const btnSave = document.getElementById('btn-save-program-slot');
  if (btnSave) btnSave.textContent = "💾 Mettre à jour ce créneau";

  const cancelBtn = document.getElementById('btn-cancel-slot-edit');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  document.getElementById('admin-program-slot-form').scrollIntoView({ behavior: 'smooth' });
};

window.cancelProgramSlotEdit = () => {
  document.getElementById('admin-program-slot-form').reset();
  document.getElementById('slot-id').value = '';

  const formTitle = document.getElementById('program-form-title');
  if (formTitle) formTitle.textContent = "➕ Ajouter ou Modifier un Moment du Programme";

  const btnSave = document.getElementById('btn-save-program-slot');
  if (btnSave) btnSave.textContent = "💾 Enregistrer ce créneau dans le programme";

  const cancelBtn = document.getElementById('btn-cancel-slot-edit');
  if (cancelBtn) cancelBtn.style.display = 'none';
};

window.deleteProgramSlot = async (id) => {
  if (!confirm("Voulez-vous vraiment retirer ce créneau du programme ?")) return;
  try {
    await adminFetch(`/admin/program/item/${id}`, { method: 'DELETE' });
    showAdminToast("Créneau retiré du programme.", "info");
    loadProgram();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

window.resetProgramToDefaultGala = async () => {
  if (!confirm("Voulez-vous réinitialiser le déroulé complet avec les 8 créneaux officiels du Dîner de Gala ?")) return;
  try {
    await adminFetch('/admin/program/reset-default', { method: 'POST' });
    showAdminToast("Programme officiel du Gala restauré !", "success");
    loadProgram();
  } catch (err) {
    showAdminToast(err.message, "error");
  }
};

// -------------------------------------------------------------
// ONGLET 9 : RÉGIE PUBLICITAIRE & SPONSORS
// -------------------------------------------------------------
async function loadAds() {
  try {
    const data = await adminFetch('/admin/ads');
    AdminState.ads = Array.isArray(data) ? data : [];
    renderAds();
    updateAdsKpis();
  } catch (err) {
    showAdminToast("Erreur lors du chargement des annonces : " + err.message, "error");
  }
}

function updateAdsKpis() {
  const ads = AdminState.ads || [];
  const totalViews = ads.reduce((acc, a) => acc + (a.views_count || 0), 0);
  const totalClicks = ads.reduce((acc, a) => acc + (a.clicks_count || 0), 0);
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0';

  const viewsEl = document.getElementById('kpi-ads-views');
  const clicksEl = document.getElementById('kpi-ads-clicks');
  const ctrEl = document.getElementById('kpi-ads-ctr');

  if (viewsEl) viewsEl.textContent = totalViews.toLocaleString('fr-FR');
  if (clicksEl) clicksEl.textContent = totalClicks.toLocaleString('fr-FR');
  if (ctrEl) ctrEl.textContent = `${ctr}%`;
}

function renderAds() {
  const tbody = document.getElementById('admin-ads-tbody');
  if (!tbody) return;

  const ads = AdminState.ads;
  if (!ads || ads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Aucune annonce enregistrée pour le moment. Remplissez le formulaire ci-dessus pour ajouter un produit 3D !</td></tr>`;
    return;
  }

  tbody.innerHTML = ads.map(ad => {
    const views = ad.views_count || 0;
    const clicks = ad.clicks_count || 0;
    const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) + '%' : '0.0%';
    const themeBadgeClass = `theme-${ad.theme_color || 'peach'}`;
    const themeName = {
      sage: '🌿 Vert Menthe',
      peach: '🍑 Pêche Saumon',
      honey: '🍯 Miel Doré',
      blue: '🌊 Bleu Poudré'
    }[ad.theme_color] || ad.theme_color;

    return `
      <tr>
        <td style="font-weight: 800; text-align: center; width: 50px;">#${ad.order_index || 1}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 12px; background: var(--bg-card); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; box-shadow: var(--shadow-sm); overflow: hidden; flex-shrink: 0;">
              ${ad.image_url ? `<img src="${escapeHtml(ad.image_url)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.outerHTML='${ad.icon_emoji || '🛍️'}'">` : (ad.icon_emoji || '🛍️')}
            </div>
            <div>
              <div style="font-weight: 800; color: var(--text-main); font-size: 0.9rem;">${escapeHtml(ad.title)}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(ad.brand || 'Partenaire')} ${ad.tagline ? '• ' + escapeHtml(ad.tagline) : ''}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="clay-theme-pill ${themeBadgeClass}" style="padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 800;">
            ${themeName}
          </span>
        </td>
        <td style="font-weight: 700; color: var(--terracotta-accent);">${escapeHtml(ad.price_tag || '—')}</td>
        <td style="font-weight: 800; font-size: 0.95rem; text-align: center;">${views}</td>
        <td style="font-weight: 800; font-size: 0.95rem; color: #10b981; text-align: center;">${clicks}</td>
        <td style="font-weight: 900; font-size: 0.95rem; color: #f59e0b; text-align: center;">${ctr}</td>
        <td>
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-table-action" style="background: var(--bg-card); color: var(--text-main);" onclick="editAd('${ad.id}')" title="Modifier">
              ✏️
            </button>
            <button type="button" class="btn-table-action" style="background: rgba(245, 158, 11, 0.15); color: #d97706;" onclick="resetAdStats('${ad.id}')" title="Remettre à zéro les stats">
              🔄 Stats
            </button>
            <button type="button" class="btn-table-action" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;" onclick="deleteAd('${ad.id}')" title="Supprimer">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function readImageFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const fileName = (file.name || '').toLowerCase();
    const isGlb = fileName.endsWith('.glb') || fileName.endsWith('.gltf') || file.type.includes('gltf') || file.type.includes('glb');

    const reader = new FileReader();

    // Pour les fichiers 3D .glb / .gltf : lecture directe en DataURL binaire
    if (isGlb) {
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    // Pour les photos classiques : compression canvas fluide
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

window.previewAdImage = (event) => {
  const file = event.target.files && event.target.files[0];
  const preview = document.getElementById('ad-image-preview');
  const wrapper = document.getElementById('ad-image-preview-wrapper');
  const prompt = document.getElementById('ad-upload-prompt');
  const badge3d = document.getElementById('ad-3d-model-badge');
  const badge3dName = document.getElementById('ad-3d-filename');
  if (!file) return;

  const fileName = (file.name || '').toLowerCase();
  const isGlb = fileName.endsWith('.glb') || fileName.endsWith('.gltf') || file.type.includes('gltf') || file.type.includes('glb');

  if (isGlb) {
    if (prompt) prompt.style.display = 'none';
    if (wrapper) wrapper.style.display = 'none';
    if (badge3d) {
      badge3d.style.display = 'flex';
      if (badge3dName) badge3dName.textContent = `📦 Modèle 3D GLB : ${file.name} (${(file.size / 1024).toFixed(0)} Ko)`;
    }
    return;
  }

  if (badge3d) badge3d.style.display = 'none';
  const reader = new FileReader();
  reader.onload = (e) => {
    if (preview) preview.src = e.target.result;
    if (wrapper) wrapper.style.display = 'flex';
    if (prompt) prompt.style.display = 'none';
  };
  reader.readAsDataURL(file);
};


async function saveAd(event) {
  if (event) event.preventDefault();

  const id = document.getElementById('ad-id').value.trim() || `ad-${Date.now()}`;
  const title = document.getElementById('ad-title').value.trim();
  const brand = document.getElementById('ad-brand').value.trim();
  const theme_color = document.getElementById('ad-theme').value;
  const icon_emoji = document.getElementById('ad-emoji').value.trim() || '🛍️';
  const price_tag = document.getElementById('ad-price').value.trim();
  const redirect_url = document.getElementById('ad-redirect-url').value.trim();
  const tagline = document.getElementById('ad-tagline').value.trim();
  const order_index = parseInt(document.getElementById('ad-order').value, 10) || 1;
  const description = document.getElementById('ad-desc').value.trim();

  if (!title) {
    showAdminToast("Le titre du produit ou de l'annonce est requis", "error");
    return;
  }

  let imageData = (document.getElementById('ad-existing-image')?.value || '').trim();
  const fileInput = document.getElementById('ad-image-file');

  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      imageData = await readImageFileAsBase64(fileInput.files[0]);
    } catch (err) {
      showAdminToast("Erreur lors de la lecture de la photo : " + err.message, "error");
      return;
    }
  }

  if (!imageData) {
    showAdminToast("Veuillez sélectionner une photo pour le produit (Upload local)", "error");
    return;
  }

  const payload = {
    id,
    title,
    brand,
    theme_color,
    icon_emoji,
    price_tag,
    image_url: imageData,
    image_data: imageData,
    redirect_url,
    tagline,
    order_index,
    description,
    is_active: 1
  };

  const btn = document.getElementById('btn-save-ad');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Enregistrement en cours...";
  }

  try {
    await adminFetch('/admin/ads/item', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showAdminToast("✨ Annonce enregistrée avec succès !", "success");
    resetAdForm();
    await loadAds();
  } catch (err) {
    showAdminToast("Erreur lors de l'enregistrement : " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "💾 Enregistrer dans la vitrine publicitaire";
    }
  }
}

function editAd(id) {
  const ad = AdminState.ads.find(a => a.id === id);
  if (!ad) return;

  document.getElementById('ad-id').value = ad.id;
  document.getElementById('ad-title').value = ad.title || '';
  document.getElementById('ad-brand').value = ad.brand || '';
  document.getElementById('ad-theme').value = ad.theme_color || 'peach';
  document.getElementById('ad-emoji').value = ad.icon_emoji || '🛍️';
  document.getElementById('ad-price').value = ad.price_tag || '';
  document.getElementById('ad-redirect-url').value = ad.redirect_url || '';
  document.getElementById('ad-tagline').value = ad.tagline || '';
  document.getElementById('ad-order').value = ad.order_index || 1;
  document.getElementById('ad-desc').value = ad.description || '';

  // Preview de l'image existante
  const preview = document.getElementById('ad-image-preview');
  const wrapper = document.getElementById('ad-image-preview-wrapper');
  const prompt = document.getElementById('ad-upload-prompt');
  const existingSrc = ad.image_data || ad.image_url || '';
  if (preview) {
    preview.src = existingSrc;
  }
  if (wrapper) {
    wrapper.style.display = existingSrc ? 'flex' : 'none';
  }
  if (prompt) {
    prompt.style.display = existingSrc ? 'none' : 'block';
  }
  const existingInput = document.getElementById('ad-existing-image');
  if (existingInput) existingInput.value = existingSrc;

  const titleEl = document.getElementById('form-ad-title');
  if (titleEl) titleEl.textContent = `✏️ Modifier l'annonce : ${ad.title}`;

  window.scrollTo({ top: 300, behavior: 'smooth' });
}

async function deleteAd(id) {
  if (!confirm("Voulez-vous vraiment retirer cette annonce de la vitrine ?")) return;
  try {
    await adminFetch(`/admin/ads/item/${id}`, { method: 'DELETE' });
    showAdminToast("Annonce retirée de la vitrine", "info");
    await loadAds();
  } catch (err) {
    showAdminToast("Erreur de suppression : " + err.message, "error");
  }
}

async function resetAdStats(id) {
  if (!confirm("Réinitialiser les compteurs de vues et de clics pour cette annonce ?")) return;
  try {
    await adminFetch(`/admin/ads/reset-stats/${id}`, { method: 'POST' });
    showAdminToast("Statistiques remises à zéro !", "success");
    await loadAds();
  } catch (err) {
    showAdminToast("Erreur : " + err.message, "error");
  }
}

function resetAdForm() {
  const form = document.getElementById('form-ad-item');
  if (form) form.reset();
  document.getElementById('ad-id').value = '';
  document.getElementById('ad-existing-image').value = '';
  const preview = document.getElementById('ad-image-preview');
  const wrapper = document.getElementById('ad-image-preview-wrapper');
  const badge3d = document.getElementById('ad-3d-model-badge');
  const prompt = document.getElementById('ad-upload-prompt');
  if (preview) preview.src = '';
  if (wrapper) wrapper.style.display = 'none';
  if (badge3d) badge3d.style.display = 'none';
  if (prompt) prompt.style.display = 'block';
  document.getElementById('ad-order').value = (AdminState.ads.length + 1) || 1;
  const titleEl = document.getElementById('form-ad-title');
  if (titleEl) titleEl.textContent = "🛍️ Ajouter un Espace Publicitaire / Produit 3D";
}

window.loadAds = loadAds;
window.saveAd = saveAd;
window.editAd = editAd;
window.deleteAd = deleteAd;
window.resetAdStats = resetAdStats;
window.resetAdForm = resetAdForm;

