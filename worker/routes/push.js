/**
 * COMPAGNON DE CÉRÉMONIE - Routes API Notifications Web Push
 * Haute fiabilité & compatibilité VAPID RFC 8291 / 8292
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { DEFAULT_VAPID_PUBLIC_KEY, sendWebPush } from "../utils/webpush.js";

function isPushAuthorized(request, data, env) {
  const adminPin = env.ADMIN_PIN || "7777";
  const authHeader = request.headers.get("Authorization") || "";
  const customPin = request.headers.get("X-Admin-PIN") || "";
  const bodyPin = data ? String(data.admin_pin || "").trim() : "";

  if (customPin === adminPin) return true;
  if (bodyPin === adminPin) return true;

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token === adminPin || token.startsWith("admin-")) return true;
  }
  return false;
}

export async function handlePushRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;

  // 1. Clé publique VAPID pour le navigateur
  if (pathname === "/api/push/vapid-public-key" && method === "GET") {
    const publicKey = env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
    return jsonResponse({
      success: true,
      publicKey,
    });
  }

  // 2. Enregistrement d'une souscription push
  if (pathname === "/api/push/subscribe" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const guestId = data.guest_id || null;
    const subscription = data.subscription;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return errorResponse("Souscription invalide (endpoint ou keys manquants)", 400);
    }

    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;
    const userAgent = request.headers.get("User-Agent") || "";
    const id = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (db) {
      try {
        await db.prepare(`
          INSERT INTO push_subscriptions (id, event_id, guest_id, endpoint, p256dh, auth, user_agent, last_used_at)
          VALUES (?, 'default', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(endpoint) DO UPDATE SET
            guest_id = coalesce(excluded.guest_id, push_subscriptions.guest_id),
            p256dh = excluded.p256dh,
            auth = excluded.auth,
            user_agent = excluded.user_agent,
            last_used_at = CURRENT_TIMESTAMP
        `).bind(id, guestId, endpoint, p256dh, auth, userAgent).run();
      } catch (err) {
        console.error("Erreur enregistrement souscription push D1:", err);
      }
    }

    return jsonResponse({
      success: true,
      message: "Souscription aux notifications enregistrée avec succès !",
      guest_id: guestId,
    });
  }

  // 3. Désinscription d'une souscription push
  if (pathname === "/api/push/unsubscribe" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const endpoint = data.endpoint;

    if (endpoint && db) {
      await db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).run().catch(() => {});
    }

    return jsonResponse({ success: true, message: "Souscription révoquée" });
  }

  // 4. Dernière notification active (utilisée par le Service Worker en cas de push direct)
  if (pathname === "/api/push/latest" && method === "GET") {
    if (!db) {
      return jsonResponse({
        id: "mock-push-1",
        title: "Compagnon de Cérémonie",
        body: "Une nouvelle animation vient de démarrer ! 🎉",
        url: "/dinedegala2026/",
        tag: "gala-alert",
        icon: "/icon.svg",
        badge: "/favicon.svg",
        created_at: new Date().toISOString()
      });
    }

    try {
      const latest = await db.prepare(`
        SELECT * FROM push_notifications_log 
        WHERE event_id = 'default' 
        ORDER BY created_at DESC 
        LIMIT 1
      `).first();

      return jsonResponse(latest || {
        title: "Compagnon de Cérémonie",
        body: "Bienvenue à la soirée de gala ! ✨",
        url: "/dinedegala2026/",
        tag: "gala-alert"
      });
    } catch (err) {
      return jsonResponse({
        title: "Compagnon de Cérémonie",
        body: "Bienvenue à la soirée de gala ! ✨",
        url: "/dinedegala2026/",
        tag: "gala-alert"
      });
    }
  }

  // 5. Historique des notifications
  if (pathname === "/api/push/history" && method === "GET") {
    if (!db) return jsonResponse([]);
    try {
      const { results } = await db.prepare(`
        SELECT * FROM push_notifications_log 
        WHERE event_id = 'default' 
        ORDER BY created_at DESC 
        LIMIT 20
      `).all();
      return jsonResponse(results || []);
    } catch (err) {
      return jsonResponse([]);
    }
  }

  // 6. Nombre total d'abonnés Push actifs
  if (pathname === "/api/push/subscribers-count" && method === "GET") {
    if (!db) return jsonResponse({ total: 0 });
    try {
      const row = await db.prepare("SELECT count(*) as total FROM push_subscriptions WHERE event_id = 'default'").first();
      return jsonResponse({ total: row ? Number(row.total) : 0 });
    } catch (err) {
      return jsonResponse({ total: 0 });
    }
  }

  // 7. Diffusion collective (Broadcast) - Organisateur / Régie (Sécurisé par PIN ou Token)
  if (pathname === "/api/push/broadcast" && method === "POST") {
    const data = await request.json().catch(() => ({}));

    if (!isPushAuthorized(request, data, env)) {
      return errorResponse("Non autorisé : Code PIN administrateur invalide ou manquant", 401);
    }

    const title = (data.title || "Alerte Gala").trim();
    const body = (data.body || "Rejoignez l'animation en direct !").trim();
    const url = data.url || "/dinedegala2026/";
    const tag = data.tag || `gala-${Date.now()}`;
    const sentBy = data.sent_by || "admin";
    const logId = `push-${Date.now()}`;

    if (!db) {
      return jsonResponse({
        success: true,
        message: "Notification simulée en mode local (PIN validé)",
        recipients_count: 1
      });
    }

    // 1. Enregistrer dans le journal AVANT l'envoi pour que /api/push/latest soit immédiatement à jour pour les Service Workers
    await db.prepare(`
      INSERT INTO push_notifications_log (id, event_id, title, body, url, tag, sent_by, recipient_count)
      VALUES (?, 'default', ?, ?, ?, ?, ?, 0)
    `).bind(logId, title, body, url, tag, sentBy).run().catch((err) => {
      console.error("Erreur insertion préventive push_notifications_log:", err);
    });

    // 2. Récupérer toutes les souscriptions actives
    const { results: subscriptions } = await db.prepare(`
      SELECT id, endpoint, p256dh, auth, guest_id 
      FROM push_subscriptions 
      WHERE event_id = 'default'
    `).all().catch(() => ({ results: [] }));

    let successCount = 0;
    const expiredEndpoints = [];

    const notificationPayload = { 
      title, 
      body, 
      url, 
      tag, 
      icon: "/icon.svg", 
      badge: "/favicon.svg",
      timestamp: Date.now()
    };

    if (subscriptions && subscriptions.length > 0) {
      const pushPromises = subscriptions.map(async (sub) => {
        try {
          const res = await sendWebPush(sub, notificationPayload, env);
          if (res.ok) successCount++;
          if (res.expired) expiredEndpoints.push(sub.endpoint);
        } catch (e) {
          console.error("Erreur push pour l'endpoint:", sub.endpoint, e);
        }
      });

      await Promise.allSettled(pushPromises);

      // Nettoyer les tokens expirés
      if (expiredEndpoints.length > 0) {
        for (const ep of expiredEndpoints) {
          await db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(ep).run().catch(() => {});
        }
      }
    }

    // 3. Mettre à jour le nombre réel de réceptions réussies
    await db.prepare(`
      UPDATE push_notifications_log SET recipient_count = ? WHERE id = ?
    `).bind(successCount, logId).run().catch(() => {});

    return jsonResponse({
      success: true,
      message: `Notification envoyée à ${successCount} invité(s) actif(s)`,
      recipients_count: successCount,
      subscribers_total: subscriptions ? subscriptions.length : 0,
    });
  }

  // 8. Test direct de notification push vers un appareil
  if (pathname === "/api/push/test" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    if (!isPushAuthorized(request, data, env)) {
      return errorResponse("Non autorisé : Code PIN administrateur requis", 401);
    }
    const endpoint = data.endpoint;
    if (!endpoint) {
      return errorResponse("Endpoint de test manquant", 400);
    }
    const res = await sendWebPush({ endpoint, p256dh: data.p256dh, auth: data.auth }, {
      title: "🧪 Test de Notification Réussi !",
      body: "Votre appareil reçoit parfaitement les alertes officielles.",
      url: "/dinedegala2026/",
      tag: "test-push",
      icon: "/icon.svg",
      badge: "/favicon.svg"
    }, env);

    return jsonResponse({
      success: res.ok,
      status: res.status,
      expired: res.expired,
      error: res.error,
      message: res.ok ? "Notification de test envoyée avec succès !" : `Échec de l'envoi (${res.status}): ${res.error || 'Erreur inconnue'}`
    });
  }

  // 9. Envoi ciblé à un invité ou une table spécifique
  if (pathname === "/api/push/send-to-guest" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const guestId = data.guest_id;
    const title = (data.title || "Message personnel").trim();
    const body = (data.body || "").trim();
    const url = data.url || "/dinedegala2026/";

    if (!guestId || !body) {
      return errorResponse("guest_id et body sont obligatoires", 400);
    }

    if (!db) {
      return jsonResponse({ success: true, message: "Envoi ciblé simulé" });
    }

    const { results: subs } = await db.prepare(`
      SELECT id, endpoint, p256dh, auth 
      FROM push_subscriptions 
      WHERE guest_id = ?
    `).bind(guestId).all().catch(() => ({ results: [] }));

    let sent = 0;
    if (subs && subs.length > 0) {
      for (const sub of subs) {
        const res = await sendWebPush(sub, { title, body, url, icon: "/icon.svg", badge: "/favicon.svg" }, env);
        if (res.ok) sent++;
      }
    }

    return jsonResponse({
      success: true,
      sent_to_devices: sent,
    });
  }

  return null;
}
