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
    return jsonResponse(event || getMockEvent());
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

  return null;
}
