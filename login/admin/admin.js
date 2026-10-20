/**
 * ============================================================
 * COMPAGNON DE CÉRÉMONIE - JAVASCRIPT DU BACKOFFICE RÉGIE
 * Logique complète pour la production, temps réel & sécurité PIN
 * ============================================================
 */

const API_BASE = '/api';

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

// Notifications Toasts
function showAdminToast(message, type = 'info') {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;

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
    loadCurrentTab();
  }, 5000);
}

// -------------------------------------------------------------
// 1. VUE D'ENSEMBLE (OVERVIEW)
// -------------------------------------------------------------
async function loadOverview() {
  try {
    const data = await adminFetch('/admin/overview');
    AdminState.overview = data;
    renderOverview(data);
  } catch (err) {
    console.error("Erreur chargement overview:", err);
  }
}

function renderOverview(data) {
  const { stats, event, active_quiz } = data;

  // Mise à jour des compteurs KPIs
  document.getElementById('kpi-guests-count').textContent = stats.guests_count || 0;
  document.getElementById('kpi-tables-count').textContent = stats.tables_count || 0;
  document.getElementById('kpi-chat-count').textContent = stats.chat_count || 0;
  document.getElementById('kpi-prayers-count').textContent = stats.prayers_count || 0;
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
window.sendCustomBroadcast = async (e) => {
  e.preventDefault();
  const title = document.getElementById('push-title').value.trim();
  const body = document.getElementById('push-body').value.trim();
  const url = document.getElementById('push-url').value.trim() || '/';
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

    showAdminToast(`📢 Alerte diffusée avec succès ! (${res.recipients_count || 0} appareils)`, "success");
    document.getElementById('broadcast-admin-form').reset();
    loadPushHistory();
  } catch (err) {
    showAdminToast(err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🚀 Envoyer la notification push générale";
    }
  }
};

window.sendPushPreset = (title, body, url = '/') => {
  document.getElementById('push-title').value = title;
  document.getElementById('push-body').value = body;
  document.getElementById('push-url').value = url;
  document.getElementById('broadcast-admin-form').scrollIntoView({ behavior: 'smooth' });
  showAdminToast("Modèle chargé dans le formulaire. Cliquez sur Envoyer pour diffuser.", "info");
};

async function loadPushHistory() {
  try {
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
          <span class="status-pill status-ended">${item.recipient_count || 0} récepteurs</span>
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

async function loadGuests() {
  try {
    const guests = await adminFetch('/admin/guests');
    AdminState.guests = Array.isArray(guests) ? guests : [];
    renderGuests(AdminState.guests);
  } catch (err) {
    console.error("Erreur chargement invités admin:", err);
    showAdminToast("Impossible de charger les invités : " + err.message, "error");
  }
}

function renderGuests(guests) {
  const container = document.getElementById('admin-guests-grid');
  const countBadge = document.getElementById('admin-guests-count');
  if (countBadge) countBadge.textContent = `${guests ? guests.length : 0} invité(s)`;

  if (!container) return;

  if (!guests || guests.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 8px;">👥</span>
        <p>Aucun invité ne correspond à votre recherche ou aucun invité connecté.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = guests.map(g => {
    const hasPhoto = !!(g.photo_url && g.photo_url.length > 5);
    const photoHtml = hasPhoto
      ? `<img src="${g.photo_url}" alt="${escapeHtml(g.name)}" style="width: 52px; height: 52px; border-radius: 16px; object-fit: cover; border: 2px solid var(--terracotta-accent);">`
      : `<div style="width: 52px; height: 52px; border-radius: 16px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1.5px solid var(--border-color);">${g.avatar_emoji || '🎉'}</div>`;

    const prayersBadge = g.prayers_count > 0
      ? `<span class="status-pill status-active" title="${g.prayers_count} demande(s) de prière" style="font-size: 0.72rem; padding: 2px 8px;">🙏 ${g.prayers_count} prière(s)</span>`
      : '';

    const churchBadge = g.has_church
      ? `<span class="status-pill status-active" title="Église : ${escapeHtml(g.church_name || 'Oui')}" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(16, 185, 129, 0.15); color: #059669;">⛪ Église</span>`
      : `<span class="status-pill" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(107, 93, 84, 0.1); color: var(--text-muted);">Sans église</span>`;

    const professionText = g.profession
      ? `${escapeHtml(g.profession)}${g.company ? ' • ' + escapeHtml(g.company) : ''}`
      : 'Profession non renseignée';

    const residenceText = g.residence_location
      ? `📍 ${escapeHtml(g.residence_location)}`
      : '📍 Résidence non renseignée';

    const phoneText = g.phone
      ? `📱 ${escapeHtml(g.phone)}`
      : '📱 Sans téléphone';

    return `
      <div class="guest-crm-card-item" onclick="window.openGuestCRM('${g.id}')" title="Cliquer pour voir la fiche complète">
        <div style="display: flex; gap: 12px; align-items: center;">
          ${photoHtml}
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(g.name)}
              </h4>
              <span class="status-pill status-ended" style="font-size: 0.72rem; font-weight: 800;">Table ${escapeHtml(g.table_number || '1')}</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--terracotta-accent); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
              ${professionText}
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 10px; font-size: 0.78rem; color: var(--text-muted);">
          <div>${residenceText}</div>
          <div>${phoneText}</div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${prayersBadge}
            ${churchBadge}
          </div>
          <button type="button" class="btn-table-action" style="background: var(--terracotta-gradient); color: #fff; font-size: 0.74rem; font-weight: 700; padding: 4px 10px; border-radius: 999px;">
            Fiche CRM ➔
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.filterGuests = (query) => {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderGuests(AdminState.guests);
    return;
  }
  const filtered = AdminState.guests.filter(g => {
    return (g.name || '').toLowerCase().includes(q) ||
      (g.table_number || '').toString().toLowerCase().includes(q) ||
      (g.profession || '').toLowerCase().includes(q) ||
      (g.company || '').toLowerCase().includes(q) ||
      (g.residence_location || '').toLowerCase().includes(q) ||
      (g.phone || '').toLowerCase().includes(q) ||
      (g.church_name || '').toLowerCase().includes(q);
  });
  renderGuests(filtered);
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
          <span class="status-pill status-ended" style="font-weight: 800;">Table ${escapeHtml(guest.table_number || '1')}</span>
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

    <!-- Actions régie -->
    <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center;">
      <button type="button" class="btn-table-action danger" onclick="window.deleteGuest('${guest.id}'); window.closeGuestCRM();">
        🗑️ Retirer cet invité
      </button>
      <button type="button" class="btn-table-action" style="background: var(--honey-gradient); color: var(--honey-dark); font-weight: 800; padding: 10px 18px;" onclick="window.exportCurrentGuestPDF()">
        🖨️ Exporter Fiche Imprimable (PDF)
      </button>
    </div>
  `;

  modal.style.display = 'flex';
};

window.closeGuestCRM = () => {
  const modal = document.getElementById('modal-guest-crm');
  if (modal) modal.style.display = 'none';
  currentCrmGuestId = null;
};

window.exportCurrentGuestPDF = () => {
  if (currentCrmGuestId) {
    window.exportGuestPDF(currentCrmGuestId);
  }
};

window.exportGuestPDF = (guestId) => {
  const guest = AdminState.guests.find(g => g.id === guestId);
  if (!guest) return;

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer ou exporter en PDF.");
    return;
  }

  const prayers = guest.prayers_history || [];
  const prayersList = prayers.map(p => `
    <div style="border-left: 3px solid #f59e0b; padding-left: 12px; margin-bottom: 12px;">
      <div style="font-weight: bold; font-size: 14px; color: #b45309;">${escapeHtml(p.title || 'Prière')} (${new Date(p.created_at).toLocaleDateString()})</div>
      ${p.target_person ? `<div style="font-size: 13px;"><strong>Pour :</strong> ${escapeHtml(p.target_person)}</div>` : ''}
      <div style="font-style: italic; margin: 4px 0; font-size: 13px;">« ${escapeHtml(p.content)} »</div>
      ${p.residence_location ? `<div style="font-size: 12px; color: #666;">Lieu de visite : ${escapeHtml(p.residence_location)}</div>` : ''}
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
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
          <div style="font-size: 13px; color: #64748b;">Table : <strong>Table ${escapeHtml(guest.table_number || '1')}</strong> • Score : <strong>${guest.points || 0} pts</strong></div>
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
    </html>
  `);
  printWindow.document.close();
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
    const reader = new FileReader();
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
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    if (preview) preview.src = e.target.result;
    if (wrapper) wrapper.style.display = 'flex';
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
  const existingSrc = ad.image_data || ad.image_url || '';
  if (preview) {
    preview.src = existingSrc;
  }
  if (wrapper) {
    wrapper.style.display = existingSrc ? 'flex' : 'none';
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
  if (preview) preview.src = '';
  if (wrapper) wrapper.style.display = 'none';
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

