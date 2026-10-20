/**
 * ============================================================
 * COMPAGNON DE CÉRÉMONIE - MODULE PROGRAMME DÉROULÉ EN DIRECT
 * Synchronisé avec l'heure exacte du téléphone & Notifications
 * ============================================================
 */

import { Api } from './api.js';
import { AppState } from './state.js';

export const ProgramModule = {
  items: [],
  currentSlotId: null,
  timerInterval: null,
  reminders: new Set(),

  init() {
    this.loadReminders();
    this.fetchProgram();

    // Boucle d'horloge précise à la seconde (heure du téléphone)
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.updateLiveClock();
      this.evaluateSlots();
    }, 1000);
  },

  loadReminders() {
    try {
      const saved = JSON.parse(localStorage.getItem('compagnon_program_reminders') || '[]');
      this.reminders = new Set(saved);
    } catch (_) {
      this.reminders = new Set();
    }
  },

  saveReminders() {
    try {
      localStorage.setItem('compagnon_program_reminders', JSON.stringify([...this.reminders]));
    } catch (_) {}
  },

  async fetchProgram() {
    try {
      const res = await Api.request('/program');
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        this.items = res.items;
      } else {
        this.items = this.getDefaultProgram();
      }
      if (res && res.direct_feature_enabled !== undefined) {
        AppState.direct_feature_enabled = Number(res.direct_feature_enabled);
        this.applyDirectFeatureToggle(AppState.direct_feature_enabled);
      }
      this.render();
    } catch (err) {
      console.warn("Chargement programme en cache/hors-ligne:", err);
      this.items = this.getDefaultProgram();
      this.render();
    }
  },

  getDefaultProgram() {
    return [
      { id: 'prog-1', start_time: '16:00', end_time: '17:00', title: "Accueil des invités & Cocktail de bienvenue", speaker: "Équipe d'accueil", description: "Cocktail de bienvenue et installation conviviale", order_index: 1 },
      { id: 'prog-2', start_time: '17:00', end_time: '17:15', title: "Ouverture officielle & Mot de bienvenue", speaker: "Avec remerciement à la salle Le Rocher des Âges", description: "Cérémonie d'ouverture et allocution d'accueil", order_index: 2 },
      { id: 'prog-3', start_time: '17:15', end_time: '17:45', title: "Prestation artistique & témoignage inspirant", speaker: "Artistes invités", description: "Chants, louange et témoignages poignants", order_index: 3 },
      { id: 'prog-4', start_time: '17:45', end_time: '18:05', title: "Message principal (20 min)", speaker: "Pasteur KAMZOLES Charly Ingénu", description: "Exhortation solennelle et vision d'excellence", order_index: 4 },
      { id: 'prog-5', start_time: '18:05', end_time: '18:20', title: "Présentation des ouvrages & Dédicace", speaker: "Pasteur KAMZOLES", description: "Présentation spéciale des livres et signatures d'auteurs", order_index: 5 },
      { id: 'prog-6', start_time: '18:20', end_time: '19:15', title: "Dîner convivial", speaker: "La table des livres reste ouverte pendant le repas", description: "Service du repas gastronomique et échanges fraternels", order_index: 6 },
      { id: 'prog-7', start_time: '19:15', end_time: '19:45', title: "Prestation artistique & témoignage", speaker: "Artistes invités", description: "Deuxième partie musicale et partages d'impact", order_index: 7 },
      { id: 'prog-8', start_time: '19:45', end_time: '20:30', title: "Duo artistique de clôture", speaker: "Artistes invités", description: "Prestation finale en duo et bénédiction de clôture", order_index: 8 }
    ];
  },


  // Bascule dynamique "Direct" vs "Programme" côté utilisateur
  applyDirectFeatureToggle(isEnabled) {
    const directNavItem = document.querySelector('.nav-item[data-tab="chat"], .nav-item[data-tab="program"]');
    if (!directNavItem) return;

    if (isEnabled === 0) {
      directNavItem.dataset.tab = 'program';
      directNavItem.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>Programme</span>
      `;

      // Si l'utilisateur était sur l'onglet chat, le basculer sur programme
      if (AppState.activeTab === 'chat') {
        window.switchTab('program');
      }
    } else {
      directNavItem.dataset.tab = 'chat';
      directNavItem.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>Direct</span>
      `;

      // Si l'utilisateur était sur programme et que direct est réactivé
      if (AppState.activeTab === 'program') {
        window.switchTab('chat');
      }
    }
  },

  // Parse une heure au format "16:00" ou "16h00" en minutes depuis minuit
  parseTimeToMinutes(str) {
    if (!str) return 0;
    const clean = str.replace('h', ':').trim();
    const parts = clean.split(':').map(n => parseInt(n, 10) || 0);
    return parts[0] * 60 + (parts[1] || 0);
  },

  formatTimeLabel(str) {
    if (!str) return '';
    return str.replace(':', 'h');
  },

  updateLiveClock() {
    const clockEl = document.getElementById('program-live-clock-time');
    if (!clockEl) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}:${s}`;
  },

  // Évalue l'état de chaque créneau selon l'heure du téléphone
  evaluateSlots() {
    if (!this.items || this.items.length === 0) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let activeItem = null;

    this.items.forEach(item => {
      const startMin = this.parseTimeToMinutes(item.start_time);
      const endMin = this.parseTimeToMinutes(item.end_time);

      if (currentMinutes >= startMin && currentMinutes < endMin) {
        activeItem = item;
      }

      // Vérifier les rappels 5 minutes avant
      if (this.reminders.has(item.id)) {
        const diff = startMin - currentMinutes;
        if (diff === 5 && now.getSeconds() === 0) {
          this.triggerNotification(
            `🔔 Rappel Cérémonie dans 5 minutes`,
            `Prochain moment : "${item.title}" ${item.speaker ? '(' + item.speaker + ')' : ''}`
          );
        }
      }
    });

    // Si le créneau en cours vient de changer, notifier l'invité
    if (activeItem && activeItem.id !== this.currentSlotId) {
      const isInitial = this.currentSlotId === null;
      this.currentSlotId = activeItem.id;
      if (!isInitial) {
        this.triggerNotification(
          `📢 En ce moment au Programme !`,
          `✨ ${activeItem.title} ${activeItem.speaker ? '— ' + activeItem.speaker : ''}`
        );
      }
      this.render();
    }
  },

  // Carillon sonore et notification visuelle
  triggerNotification(title, message) {
    this.playChimeSound();

    if (window.showToast) {
      window.showToast(`${title} : ${message}`, 'success');
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/icon.svg',
          badge: '/favicon.svg',
          vibrate: [200, 100, 200],
        });
      } catch (_) {}
    }
  },

  // Synthétiseur audio carillon doux (sans fichier externe)
  playChimeSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const playTone = (freq, delay, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      };

      playTone(587.33, 0.0, 0.5); // Ré
      playTone(880.00, 0.15, 0.7); // La
    } catch (_) {}
  },

  toggleReminder(itemId) {
    if (this.reminders.has(itemId)) {
      this.reminders.delete(itemId);
      if (window.showToast) window.showToast("Rappel désactivé pour ce créneau.", "info");
    } else {
      this.reminders.add(itemId);
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      if (window.showToast) window.showToast("🔔 Rappel programmé 5 min avant le début !", "success");
    }
    this.saveReminders();
    this.render();
  },

  render() {
    const listContainer = document.getElementById('program-timeline-list');
    if (!listContainer) return;

    if (!this.items || this.items.length === 0) {
      listContainer.innerHTML = `
        <div class="program-card" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          <p>Le programme de la cérémonie est en cours d'organisation par la régie.</p>
        </div>
      `;
      return;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let pastCount = 0;

    const cardsHtml = this.items.map((item, index) => {
      const startMin = this.parseTimeToMinutes(item.start_time);
      const endMin = this.parseTimeToMinutes(item.end_time);

      let status = 'upcoming'; // vert par défaut
      let statusLabel = '🟢 À venir';
      let statusBtnClass = 'btn-upcoming';
      let progressPercent = 0;

      if (currentMinutes >= endMin) {
        status = 'past';
        statusLabel = '🔴 Passé';
        statusBtnClass = 'btn-past';
        pastCount++;
      } else if (currentMinutes >= startMin && currentMinutes < endMin) {
        status = 'current';
        statusLabel = '⚡ EN COURS';
        statusBtnClass = 'btn-current';
        const totalDuration = Math.max(1, endMin - startMin);
        const elapsed = currentMinutes - startMin;
        progressPercent = Math.min(100, Math.max(5, Math.round((elapsed / totalDuration) * 100)));
      } else {
        const diff = startMin - currentMinutes;
        if (diff > 0 && diff <= 60) {
          statusLabel = `🟢 Dans ${diff} min`;
        }
      }

      const hasReminder = this.reminders.has(item.id);

      return `
        <article class="program-card status-${status}" data-slot-id="${item.id}">
          <div class="program-card-header">
            <div class="program-time-range">
              <span>⏰</span>
              <span>${this.formatTimeLabel(item.start_time)} – ${this.formatTimeLabel(item.end_time)}</span>
            </div>

            <!-- BOUTON STATUT DYNAMIQUE SYNCHRONE TÉLÉPHONE (VERT / EN COURS / ROUGE) -->
            <button type="button" class="program-status-btn ${statusBtnClass}">
              ${statusLabel}
            </button>
          </div>

          <div class="program-card-body">
            <h3 class="program-slot-title">${escapeHtml(item.title)}</h3>
            ${item.speaker ? `
              <div class="program-slot-speaker">
                <span>👤</span>
                <span>${escapeHtml(item.speaker)}</span>
              </div>
            ` : ''}
            ${item.description ? `
              <p class="program-slot-desc">${escapeHtml(item.description)}</p>
            ` : ''}

            ${status === 'current' ? `
              <div class="program-slot-progress-bar" title="Progression du créneau : ${progressPercent}%">
                <div class="program-slot-progress-fill" style="width: ${progressPercent}%;"></div>
              </div>
            ` : ''}
          </div>

          <div class="program-card-footer">
            <span style="font-size: 0.72rem; color: var(--text-dim);">Étape ${index + 1} / ${this.items.length}</span>

            ${status === 'upcoming' ? `
              <button type="button" class="btn-program-reminder ${hasReminder ? 'active' : ''}" onclick="window.ProgramModule.toggleReminder('${item.id}')">
                <span>${hasReminder ? '🔔 Rappel activé' : '🔔 M\'alerter'}</span>
              </button>
            ` : status === 'current' ? `
              <span style="font-size: 0.72rem; font-weight: 800; color: var(--terracotta-accent);">🔴 Moment présent</span>
            ` : `
              <span style="font-size: 0.72rem; color: var(--text-dim);">Déjà écoulé</span>
            `}
          </div>
        </article>
      `;
    }).join('');

    listContainer.innerHTML = cardsHtml;

    // Mise à jour de la barre de progression globale du gala
    const overallProgress = Math.round((pastCount / this.items.length) * 100);
    const globalBar = document.getElementById('program-overall-progress');
    const summaryText = document.getElementById('program-step-summary');
    if (globalBar) globalBar.style.width = `${overallProgress}%`;
    if (summaryText) summaryText.textContent = `${pastCount} sur ${this.items.length} étapes terminées (${overallProgress}%)`;
  }
};

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

window.ProgramModule = ProgramModule;
