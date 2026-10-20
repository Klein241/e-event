/**
 * COMPAGNON DE CÉRÉMONIE - File d'attente hors-ligne (Offline Queue)
 * Stocke et rejoue automatiquement les écritures (chat, prières, votes) en cas de panne réseau
 */

const QUEUE_KEY = 'compagnon_offline_queue';

export const OfflineQueue = {
  getQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      this.notifyListeners(queue.length);
    } catch (e) {
      console.warn("Impossible de sauvegarder la file hors-ligne:", e);
    }
  },

  enqueue(type, endpoint, data) {
    const queue = this.getQueue();
    const item = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type, // 'chat', 'prayer', 'vote', 'networking'
      endpoint,
      data,
      created_at: new Date().toISOString(),
      retries: 0
    };
    queue.push(item);
    this.saveQueue(queue);
    return item;
  },

  remove(id) {
    const queue = this.getQueue().filter(item => item.id !== id);
    this.saveQueue(queue);
  },

  clear() {
    localStorage.removeItem(QUEUE_KEY);
    this.notifyListeners(0);
  },

  count() {
    return this.getQueue().length;
  },

  listeners: [],
  onQueueChange(callback) {
    this.listeners.push(callback);
    callback(this.count());
  },

  notifyListeners(count) {
    this.listeners.forEach(cb => {
      try { cb(count); } catch (e) {}
    });
  },

  /**
   * Rejoue toutes les écritures en attente dès que le réseau revient
   */
  async flush(executor) {
    const queue = this.getQueue();
    if (queue.length === 0) return { processed: 0, failed: 0 };

    let processed = 0;
    let failed = 0;
    const remaining = [];

    for (const item of queue) {
      try {
        await executor(item.endpoint, item.data);
        processed++;
      } catch (err) {
        item.retries = (item.retries || 0) + 1;
        // Après 5 échecs consécutifs, on n'insiste plus
        if (item.retries < 5) {
          remaining.push(item);
        }
        failed++;
      }
    }

    this.saveQueue(remaining);
    return { processed, failed, remaining: remaining.length };
  },

  /**
   * Initialise l'écouteur automatique de reconnexion
   */
  initAutoSync(executor, onSyncSuccess) {
    window.addEventListener('online', async () => {
      console.log('🌐 Réseau rétabli : synchronisation des actions hors-ligne...');
      const result = await this.flush(executor);
      if (result.processed > 0 && typeof onSyncSuccess === 'function') {
        onSyncSuccess(result.processed);
      }
    });
  }
};
