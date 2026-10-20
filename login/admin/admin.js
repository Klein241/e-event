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
// 7. LISTE DES INVITÉS & GESTION
// -------------------------------------------------------------
async function loadGuests() {
  try {
    const guests = await adminFetch('/admin/guests');
    AdminState.guests = guests;
    renderGuests(guests);
  } catch (err) {
    console.error("Erreur chargement invités admin:", err);
  }
}

function renderGuests(guests) {
  const tbody = document.getElementById('admin-guests-tbody');
  if (!tbody) return;

  if (!guests || guests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Aucun invité enregistré.</td></tr>`;
    return;
  }

  tbody.innerHTML = guests.map(g => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${g.avatar_emoji || '🎉'}</span>
          <strong>${escapeHtml(g.name)}</strong>
        </div>
      </td>
      <td><span class="status-pill status-ended">Table ${escapeHtml(g.table_number || '1')}</span></td>
      <td><strong>${g.points || 0} pts</strong></td>
      <td>${new Date(g.created_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td>
        <button class="btn-table-action danger" onclick="deleteGuest('${g.id}')">🗑️ Retirer</button>
      </td>
    </tr>
  `).join('');
}

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
