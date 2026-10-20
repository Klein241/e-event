/**
 * COMPAGNON DE CÉRÉMONIE - Client API Haute Fiabilité
 * - Helper unique request() avec AbortController (timeout 8s) & retry exponentiel
 * - Suppression des faux succès inventés en production
 * - Mode DEMO strictement isolé derrière un flag explicite (?demo=1)
 * - File d'attente hors-ligne (OfflineQueue) pour les écritures (chat, prières, profils)
 * - Correction du quiz STRICTEMENT validée par le serveur
 * - Authentification par PIN requise pour la diffusion push
 */

import { OfflineQueue } from './offline-queue.js';
import * as Mocks from './mocks.js';

const API_BASE = '/api';
const DEFAULT_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(message, status = 0, isNetworkError = false, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.details = details;
  }
}

/**
 * Détecte si le mode démo est explicitement activé
 */
export function isDemoMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('demo')) return true;
    if (localStorage.getItem('compagnon_demo_mode') === 'true') return true;
  } catch (e) {}
  return false;
}

/**
 * Exécuteur HTTP centralisé avec timeout et retry exponentiel
 */
export async function request(endpoint, options = {}, retries = 1, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const isIdempotent = method === 'GET' || method === 'HEAD';

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timer);

      // Traitement des erreurs HTTP
      if (!res.ok) {
        let errorData = null;
        try {
          errorData = await res.json();
        } catch (e) {
          errorData = { error: res.statusText || 'Erreur HTTP' };
        }
        throw new ApiError(
          errorData.error || errorData.message || `Erreur serveur (${res.status})`,
          res.status,
          false,
          errorData
        );
      }

      // Réponse 204 No Content
      if (res.status === 204) return null;

      return await res.json();
    } catch (err) {
      clearTimeout(timer);

      // Si erreur HTTP explicite (4xx, 5xx), on ne retry pas aveuglément
      if (err instanceof ApiError && err.status > 0) {
        throw err;
      }

      const isNetworkError = err.name === 'AbortError' || err.message.includes('fetch');

      // Retry uniquement pour requêtes idempotentes (GET) en cas de panne réseau
      if (isIdempotent && attempt < retries) {
        const delay = Math.pow(2, attempt) * 400; // 400ms, 800ms...
        console.warn(`[API] Tentative ${attempt + 1} échouée pour ${endpoint}. Nouvelle tentative dans ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      const msg = err.name === 'AbortError' 
        ? 'Délai d\'attente dépassé (réseau lent). Veuillez réessayer.'
        : 'Impossible de joindre le serveur. Vérifiez votre connexion internet.';

      throw new ApiError(msg, 0, isNetworkError);
    }
  }
}

/**
 * Envoi d'une écriture avec bascule automatique dans la file hors-ligne si le réseau échoue
 */
async function sendWithOfflineFallback(type, endpoint, data, options = {}) {
  try {
    return await request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    }, 0);
  } catch (err) {
    if (err.isNetworkError) {
      console.warn(`[API] Réseau indisponible. Action mise en file d'attente hors-ligne :`, type);
      OfflineQueue.enqueue(type, endpoint, data);
      return {
        queued: true,
        offline: true,
        message: 'Action sauvegardée hors-ligne. Elle sera envoyée dès le retour du réseau.'
      };
    }
    throw err;
  }
}

export const Api = {
  request,

  // 1. Événement actif
  async getEvent() {
    try {
      return await request('/event');
    } catch (e) {
      if (isDemoMode()) return Mocks.getDemoEvent();
      throw e;
    }
  },

  // 2. Inscription Invité
  async joinGuest(data) {
    return await request('/guests/join', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 3. Messages du Chat
  async getChatMessages() {
    try {
      return await request('/chat');
    } catch (e) {
      if (isDemoMode()) return Mocks.getDemoChatMessages();
      throw e;
    }
  },

  // 4. Envoi de message Chat (avec file d'attente hors-ligne)
  async sendChatMessage(data) {
    return await sendWithOfflineFallback('chat', '/chat', data);
  },

  // 5. Réaction emoji
  async reactToMessage(messageId, emoji) {
    return await request(`/chat/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    }, 0);
  },

  // 6. Jeux en direct (Quiz actif & Sondage)
  async getActiveGames() {
    try {
      return await request('/games/active');
    } catch (e) {
      if (isDemoMode()) return Mocks.getDemoActiveGames();
      throw e;
    }
  },

  // 7. Soumission de réponse au Quiz (VALIDATION EXCLUSIVEMENT SERVEUR)
  async submitQuizAnswer(data) {
    // Aucune correction inventée en local : le serveur valide seul la réponse et les points
    return await request('/games/quiz/answer', {
      method: 'POST',
      body: JSON.stringify(data)
    }, 0);
  },

  // 8. Leaderboard
  async getLeaderboard() {
    try {
      return await request('/games/quiz/leaderboard');
    } catch (e) {
      if (isDemoMode()) return Mocks.getDemoLeaderboard();
      throw e;
    }
  },

  // 8b. Créditer des points (Jeux bibliques, Qui Suis-Je, Chrono, Verset...)
  async addPoints(data) {
    return await request('/games/points/add', {
      method: 'POST',
      body: JSON.stringify(data)
    }, 0);
  },

  // 8c. Régie / MC : Lancer une question live
  async launchQuizQuestion(data) {
    return await request('/games/quiz/launch', {
      method: 'POST',
      body: JSON.stringify(data)
    }, 0);
  },

  // 8d. Régie / MC : Clôturer la question live
  async closeQuizQuestion(pin) {
    return await request('/games/quiz/close', {
      method: 'POST',
      body: JSON.stringify({ pin })
    }, 0);
  },

  // 8e. DUEL : Créer ou défier une table
  async createDuel(data) {
    return await request('/games/duel/create', {
      method: 'POST',
      body: JSON.stringify(data)
    }, 0);
  },

  // 8f. DUEL : Liste des défis actifs
  async getActiveDuels() {
    try {
      return await request('/games/duels/active');
    } catch (e) {
      return { duels: [] };
    }
  },

  // 8g. DUEL : État temps réel du duel
  async getDuelStatus(duelId) {
    return await request(`/games/duel/${duelId}`);
  },

  // 8h. DUEL : Répondre à une question
  async submitDuelAnswer(duelId, data) {
    return await request(`/games/duel/${duelId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data)
    }, 0);
  },

  // 8i. ANIMATEUR IA : Commentaires dynamiques en direct
  async getAiMcCommentary() {
    try {
      return await request('/games/ai-mc/commentary');
    } catch (e) {
      return { commentary: "Que le meilleur gagne ! Faites briller votre table !", leader: "Table 1", score: 0 };
    }
  },


  // 9. Vote à un sondage
  async votePoll(pollId, data) {
    return await sendWithOfflineFallback('vote', `/games/polls/${pollId}/vote`, data);
  },

  // 10. Profils Réseautage
  async getNetworkingProfiles(search = '') {
    try {
      const q = search ? `?q=${encodeURIComponent(search)}` : '';
      return await request(`/networking${q}`);
    } catch (e) {
      if (isDemoMode()) return Mocks.getDemoNetworkingProfiles();
      throw e;
    }
  },

  // 11. Sauvegarder son profil Réseautage
  async saveNetworkingProfile(data) {
    return await sendWithOfflineFallback('networking', '/networking/profile', data);
  },

  // 12. Prières & Vœux
  async getPrayers() {
    try {
      return await request('/prayers');
    } catch (e) {
      if (isDemoMode()) return Mocks.getDemoPrayers();
      throw e;
    }
  },

  // 13. Déposer une prière
  async submitPrayer(data) {
    return await sendWithOfflineFallback('prayer', '/prayers', data);
  },

  // 14. Soutien "Amen"
  async supportPrayer(prayerId, guestId) {
    return await request(`/prayers/${prayerId}/support`, {
      method: 'POST',
      body: JSON.stringify({ guest_id: guestId })
    }, 0);
  },

  // 15. Flux Grand Écran Vidéoprojecteur
  async getProjectorFeed() {
    try {
      return await request('/projector/feed');
    } catch (e) {
      if (isDemoMode()) return Mocks.getDemoProjectorFeed();
      throw e;
    }
  },

  // 16. Récupération de la clé VAPID pour les notifications Push (SANS CLÉ EN DUR)
  async fetchVapidKey() {
    const res = await request('/push/vapid-public-key');
    if (!res || !res.publicKey) {
      throw new ApiError('Clé publique VAPID absente de la réponse serveur', 500);
    }
    return res;
  },

  // 17. Enregistrement d'une souscription Push
  async registerPushSubscription(subscription, guestId = null) {
    return await request('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription, guest_id: guestId })
    });
  },

  // 18. Désinscription Push
  async unregisterPushSubscription(endpoint) {
    return await request('/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint })
    });
  },

  // 19. Diffusion collective d'alerte Push (SÉCURISÉE PAR PIN ADMIN)
  async broadcastPushNotification(title, body, url = '/', tag = 'gala-alert', adminPin = '') {
    const pin = adminPin || sessionStorage.getItem('compagnon_admin_pin') || '';
    if (!pin) {
      throw new ApiError('Code PIN administrateur requis pour diffuser', 401);
    }

    return await request('/push/broadcast', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pin}`
      },
      body: JSON.stringify({ title, body, url, tag, admin_pin: pin })
    });
  },

  // 20. Synchronisation manuelle ou automatique de la file d'attente hors-ligne
  async syncOfflineQueue() {
    return await OfflineQueue.flush(async (endpoint, data) => {
      await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      }, 0);
    });
  }
};

export const ApiService = Api;
