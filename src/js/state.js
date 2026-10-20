/**
 * État global de l'application et persistance locale
 */

const STORAGE_KEY_GUEST = 'compagnon_guest_v1';
const STORAGE_KEY_ADMIN = 'compagnon_admin_v1';

export const AppState = {
  // Profil de l'invité courant
  guest: null,
  isAdmin: false,
  activeTab: 'home',
  event: null,

  // Données dynamiques
  chatMessages: [],
  activeQuiz: null,
  activePoll: null,
  leaderboard: { tables: [], guests: [] },
  networkingProfiles: [],
  prayers: [],
  projectorFeed: null,

  // Listeners pour réactivité
  listeners: {},

  init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GUEST);
      if (stored) {
        this.guest = JSON.parse(stored);
      }
      const adminStored = localStorage.getItem(STORAGE_KEY_ADMIN);
      if (adminStored === 'true') {
        this.isAdmin = true;
      }
    } catch (e) {
      console.error("Erreur chargement état local", e);
    }
  },

  setGuest(guestData) {
    this.guest = { ...this.guest, ...guestData };
    try {
      localStorage.setItem(STORAGE_KEY_GUEST, JSON.stringify(this.guest));
    } catch (e) {}
    this.emit('guest_changed', this.guest);
  },

  addPoints(pointsWon, reason = 'quiz') {
    if (!this.guest) return;
    const current = parseInt(this.guest.points || 0, 10);
    const newTotal = current + pointsWon;
    this.guest.points = newTotal;
    try {
      localStorage.setItem(STORAGE_KEY_GUEST, JSON.stringify(this.guest));
    } catch (e) {}
    this.emit('points_updated', { total: newTotal, won: pointsWon, reason });
    this.emit('guest_changed', this.guest);
  },

  setAdmin(val) {
    this.isAdmin = !!val;
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN, this.isAdmin ? 'true' : 'false');
    } catch (e) {}
    this.emit('admin_changed', this.isAdmin);
  },

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  }
};
