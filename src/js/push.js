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

  async subscribe(guestId = null) {
    if (!this.isSupported()) {
      throw new Error("Les notifications push ne sont pas supportées sur cet appareil.");
    }

    // 1. Demande d'autorisation système
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Autorisation de notification refusée.");
    }

    // 2. Récupération de la clé publique VAPID depuis le Cloudflare Worker
    const keyData = await ApiService.fetchVapidKey();
    if (!keyData || !keyData.publicKey) {
      throw new Error("Clé publique VAPID inaccessible.");
    }

    const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

    // 3. Souscription auprès du push service du navigateur (FCM, Apple, etc.)
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

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
    return subscription;
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
   * Bannière d'incitation tactile optimisée pour soirée de gala
   */
  renderPushPrompt(containerId = "push-prompt-container", delayMs = 5000) {
    const container = document.getElementById(containerId);
    if (!container || !this.isSupported()) return;

    if (Notification.permission === "granted" || localStorage.getItem("compagnon_push_dismissed")) {
      container.innerHTML = "";
      return;
    }

    // Apparaît après un temps (non figé au chargement)
    setTimeout(() => {
      if (Notification.permission === "granted" || localStorage.getItem("compagnon_push_dismissed")) {
        return;
      }

      container.innerHTML = `
        <div class="push-banner-gala animate-fade-in" style="
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.96), rgba(15, 23, 42, 0.98));
          border: 1.5px solid rgba(212, 175, 55, 0.45);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 18px rgba(212, 175, 55, 0.2);
          border-radius: 20px;
          padding: 12px 16px;
          margin: 10px 0 14px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          animation: slideDownBanner 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 38px; height: 38px; border-radius: 50%;
              background: linear-gradient(135deg, #d4af37, #f59e0b);
              display: flex; align-items: center; justify-content: center;
              font-size: 19px; flex-shrink: 0;
              box-shadow: 0 0 12px rgba(212, 175, 55, 0.5);
            ">🔔</div>
            <div>
              <div style="font-weight: 800; font-size: 13.5px; color: #f8fafc; letter-spacing: 0.2px;">
                Alertes en direct de la Soirée
              </div>
              <div style="font-size: 11.5px; color: #94a3b8; line-height: 1.3;">
                Quiz de table, photos VIP & lancements en direct
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-shrink: 0;">
            <button id="btn-activate-push" class="btn-3d btn-3d-glow-cyan" style="
              min-height: 38px;
              padding: 6px 16px;
              font-size: 12.5px;
              width: auto;
              border-radius: 999px;
            ">
              <span>Activer</span>
              <span class="spinner-sunburst" style="width: 13px; height: 13px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </span>
            </button>
            <button id="btn-dismiss-push" style="
              background: transparent;
              color: #94a3b8;
              border: none;
              cursor: pointer;
              font-size: 16px;
              padding: 4px 6px;
            " title="Plus tard">✕</button>
          </div>
        </div>
      `;

      document.getElementById("btn-activate-push")?.addEventListener("click", async () => {
        try {
          await this.subscribe();
          container.innerHTML = `
            <div style="padding: 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 14px; text-align: center; color: #6ee7b7; font-size: 13px; font-weight: 700;">
              ✨ Alertes activées ! Vous serez prévenu au lancement des jeux et animations.
            </div>
          `;
          setTimeout(() => { container.innerHTML = ""; }, 3500);
        } catch (err) {
          alert(err.message);
        }
      });

      document.getElementById("btn-dismiss-push")?.addEventListener("click", () => {
        localStorage.setItem("compagnon_push_dismissed", "true");
        container.innerHTML = "";
      });
    }, delayMs);
  }
};

