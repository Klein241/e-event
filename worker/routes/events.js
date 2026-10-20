/**
 * COMPAGNON DE CÉRÉMONIE - Routes Événement & Invités
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { getMockEvent, getMockGuest } from "../utils/mocks.js";

export async function handleEventRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;

  // 1. Santé
  if (pathname === "/api/health") {
    return jsonResponse({
      status: "ok",
      app: "Compagnon de Cérémonie",
      time: new Date().toISOString(),
    });
  }

  // 2. Événement actif
  if (pathname === "/api/event" && method === "GET") {
    if (!db) return jsonResponse(getMockEvent());
    const event = await db.prepare("SELECT * FROM events WHERE is_active = 1 LIMIT 1").first();
    const eventData = event || getMockEvent();
    return jsonResponse({
      ...eventData,
      direct_feature_enabled: eventData.direct_feature_enabled !== undefined ? Number(eventData.direct_feature_enabled) : 1,
    });
  }

  // 2bis. Programme de la cérémonie & Statut de la fonctionnalité Direct
  if (pathname === "/api/program" && method === "GET") {
    let directEnabled = 1;
    let items = [];

    if (db) {
      try {
        const eventRow = await db.prepare("SELECT direct_feature_enabled FROM events WHERE id = 'default' LIMIT 1").first();
        if (eventRow && eventRow.direct_feature_enabled !== null && eventRow.direct_feature_enabled !== undefined) {
          directEnabled = Number(eventRow.direct_feature_enabled);
        }

        const { results } = await db.prepare("SELECT * FROM program_items WHERE event_id = 'default' ORDER BY order_index ASC, start_time ASC").all();
        items = results || [];
      } catch (err) {
        console.error("Erreur lecture programme:", err);
      }
    }

    return jsonResponse({
      direct_feature_enabled: directEnabled,
      items,
      server_time: new Date().toISOString(),
    });
  }

  // 3. Inscription / Onboarding Invité (15 secondes)
  if (pathname === "/api/guests/join" && method === "POST") {
    const data = await request.json();
    const guestId = data.id || `guest-${Date.now()}`;
    const name = (data.name || "Invité").trim();
    const tableNumber = (data.table_number || "1").trim();
    const avatarEmoji = data.avatar_emoji || "🎉";
    const role = data.role || "invite";

    if (!name) {
      return errorResponse("Le nom de l'invité est obligatoire");
    }

    if (db) {
      await db.prepare(`
        INSERT INTO guests (id, event_id, name, table_number, avatar_emoji, role, last_active)
        VALUES (?, 'default', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET 
          name = excluded.name, 
          table_number = excluded.table_number, 
          avatar_emoji = excluded.avatar_emoji,
          last_active = CURRENT_TIMESTAMP
      `).bind(guestId, name, tableNumber, avatarEmoji, role).run();
    }

    return jsonResponse({
      id: guestId,
      name,
      table_number: tableNumber,
      avatar_emoji: avatarEmoji,
      role,
      token: `token-${guestId}`,
    });
  }

  // 4. Liste des invités actifs
  if (pathname === "/api/guests" && method === "GET") {
    if (!db) return jsonResponse([getMockGuest()]);
    const { results } = await db.prepare("SELECT * FROM guests ORDER BY last_active DESC LIMIT 100").all();
    return jsonResponse(results || []);
  }

  // 5. Espaces Publicitaires & Vitrine Sponsors
  if (pathname === "/api/ads" && method === "GET") {
    if (!db) return jsonResponse([]);
    try {
      const { results } = await db.prepare("SELECT * FROM ads_sponsors WHERE is_active = 1 ORDER BY order_index ASC").all();
      if (results && results.length > 0) {
        db.prepare("UPDATE ads_sponsors SET views_count = views_count + 1 WHERE is_active = 1").run().catch(() => {});
      }
      return jsonResponse(results || []);
    } catch (err) {
      console.error("Erreur chargement annonces:", err);
      return jsonResponse([]);
    }
  }

  // 6. Clic / Interaction sur une annonce
  if (pathname.startsWith("/api/ads/") && pathname.endsWith("/click") && method === "POST") {
    const adId = pathname.replace("/api/ads/", "").replace("/click", "").trim();
    if (db && adId) {
      try {
        await db.prepare("UPDATE ads_sponsors SET clicks_count = clicks_count + 1 WHERE id = ?").bind(adId).run();
      } catch (_) {}
    }
    return jsonResponse({ success: true, id: adId });
  }

  return null;
}
