/**
 * COMPAGNON DE CÉRÉMONIE - Gestionnaire Frontend des Notifications Web Push (VAPID)
 * Compatible iOS Safari PWA (16.4+), Android Chrome/Firefox, Desktop
 */

import { ApiService } from "./api.js";
import { AppState } from "./state.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const PushManagerService = {
  isSupported() {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  },

  getPermissionState() {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission; // 'default', 'granted', 'denied'
  },

  async isSubscribed() {
    if (!this.isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch (e) {
      return false;
    }
  },

  /**
   * Souscription explicite avec demande d'autorisation
   */
  async subscribe(guestId = null) {
    if (!this.isSupported()) {
      throw new Error("Les notifications push ne sont pas supportées sur ce navigateur ou cet appareil.");
    }

    // 1. Demande d'autorisation système (action utilisateur requise)
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Autorisation de notification refusée dans votre navigateur.");
    }

    // 2. Récupération de la clé publique VAPID depuis le Cloudflare Worker
    const keyData = await ApiService.fetchVapidKey();
    if (!keyData || !keyData.publicKey) {
      throw new Error("Clé publique VAPID inaccessible depuis le serveur.");
    }

    const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

    // 3. Récupération du Service Worker actif
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    // Renouvellement propre si clé différente ou souscription existante
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // 4. Enregistrement de la souscription dans Cloudflare D1
    const subJson = subscription.toJSON();
    await ApiService.registerPushSubscription(subJson, guestId || AppState.guest?.id);

    localStorage.setItem("compagnon_push_subscribed", "true");
    localStorage.removeItem("compagnon_push_dismissed");
    console.log("[PushManager] Souscription push enregistrée avec succès !", subscription.endpoint);
    return subscription;
  },

  /**
   * Synchronisation silencieuse si la permission a déjà été accordée par l'utilisateur
   */
  async syncExistingSubscription(guestId = null) {
    if (!this.isSupported() || Notification.permission !== "granted") return;

    try {
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      // Si pas encore de souscription active mais permission accordée, la créer
      if (!subscription) {
        const keyData = await ApiService.fetchVapidKey();
        if (keyData && keyData.publicKey) {
          const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }
      }

      if (subscription) {
        const subJson = subscription.toJSON();
        await ApiService.registerPushSubscription(subJson, guestId || AppState.guest?.id);
        localStorage.setItem("compagnon_push_subscribed", "true");
        console.log("[PushManager] Synchronisation push active confirmée.");
      }
    } catch (err) {
      console.warn("[PushManager] Synchronisation push silencieuse:", err.message);
    }
  },

  async unsubscribe() {
    if (!this.isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await ApiService.unregisterPushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      localStorage.removeItem("compagnon_push_subscribed");
      return true;
    } catch (e) {
      console.error("Erreur lors de la désinscription push:", e);
      return false;
    }
  },

  /**
   * Test de notification push en direct pour cet appareil
   */
  async testNotification() {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await this.subscribe();
    }

    const subJson = subscription.toJSON();
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-PIN': '7777'
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        admin_pin: '7777'
      })
    });

    const data = await res.json();
    return data;
  },

  /**
   * Bannière d'incitation tactile optimisée pour soirée de gala
   */
  renderPushPrompt(containerId = "push-prompt-container", delayMs = 3000) {
    const container = document.getElementById(containerId);
    if (!container || !this.isSupported()) return;

    // Si déjà accordé, synchroniser silencieusement et masquer la bannière
    if (Notification.permission === "granted") {
      this.syncExistingSubscription();
      container.innerHTML = "";
      return;
    }

    if (Notification.permission === "denied" || localStorage.getItem("compagnon_push_dismissed")) {
      container.innerHTML = "";
      return;
    }

    setTimeout(() => {
      if (Notification.permission === "granted" || localStorage.getItem("compagnon_push_dismissed")) {
        return;
      }

      container.innerHTML = `
        <div class="push-banner-gala animate-fade-in" style="
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.98), rgba(15, 23, 42, 0.98));
          border: 1.5px solid rgba(212, 175, 55, 0.65);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 18px rgba(212, 175, 55, 0.35);
          border-radius: 20px;
          padding: 14px 18px;
          margin: 12px 0 16px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          animation: slideDownBanner 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 42px; height: 42px; border-radius: 50%;
              background: linear-gradient(135deg, #d4af37, #f59e0b);
              display: flex; align-items: center; justify-content: center;
              font-size: 21px; flex-shrink: 0;
              box-shadow: 0 0 14px rgba(212, 175, 55, 0.6);
            ">🔔</div>
            <div>
              <div style="font-weight: 800; font-size: 14px; color: #f8fafc; letter-spacing: 0.2px;">
                Alertes & Annonces en Direct
              </div>
              <div style="font-size: 12px; color: #cbd5e1; line-height: 1.35; margin-top: 2px;">
                Recevez les annonces du MC, les quiz et lancements même écran éteint.
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
            <button id="btn-activate-push" class="btn-3d btn-3d-glow-cyan" style="
              min-height: 40px;
              padding: 8px 18px;
              font-size: 13px;
              font-weight: 800;
              width: auto;
              border-radius: 999px;
              background: linear-gradient(135deg, #d4af37, #b45309);
              color: #000;
              border: none;
              cursor: pointer;
            ">
              <span>Activer 🔔</span>
            </button>
            <button id="btn-dismiss-push" style="
              background: transparent;
              color: #94a3b8;
              border: none;
              cursor: pointer;
              font-size: 18px;
              padding: 6px 8px;
            " title="Plus tard">✕</button>
          </div>
        </div>
      `;

      document.getElementById("btn-activate-push")?.addEventListener("click", async () => {
        const btn = document.getElementById("btn-activate-push");
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = "<span>Activation...</span>";
        }
        try {
          await this.subscribe();
          container.innerHTML = `
            <div style="padding: 12px; background: rgba(16, 185, 129, 0.2); border: 1.5px solid #10b981; border-radius: 16px; text-align: center; color: #34d399; font-size: 13.5px; font-weight: 800;">
              ✨ Notifications activées avec succès ! Vous recevrez toutes les alertes de la soirée.
            </div>
          `;
          setTimeout(() => { container.innerHTML = ""; }, 4000);
        } catch (err) {
          alert(`Erreur d'activation : ${err.message}`);
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = "<span>Activer 🔔</span>";
          }
        }
      });

      document.getElementById("btn-dismiss-push")?.addEventListener("click", () => {
        localStorage.setItem("compagnon_push_dismissed", "true");
        container.innerHTML = "";
      });
    }, delayMs);
  }
};
