/**
 * COMPAGNON DE CÉRÉMONIE - Routes Chat en Direct
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { getMockChat } from "../utils/mocks.js";

export async function handleChatRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;

  // 1. Récupération des messages de chat
  if (pathname === "/api/chat" && method === "GET") {
    if (!db) return jsonResponse(getMockChat());
    const { results } = await db.prepare(`
      SELECT * FROM chat_messages 
      WHERE is_moderated = 1 
      ORDER BY is_pinned DESC, created_at DESC 
      LIMIT 60
    `).all();
    return jsonResponse(results.reverse());
  }

  // 2. Envoi de message sur le chat
  if (pathname === "/api/chat" && method === "POST") {
    const data = await request.json();
    const id = `msg-${Date.now()}`;
    const guestId = data.guest_id || "guest-anon";
    const guestName = (data.guest_name || "Anonyme").trim();
    const tableNumber = (data.table_number || "1").trim();
    const message = (data.message || "").trim();
    const messageType = data.message_type || "text";
    const isPinned = data.is_pinned ? 1 : 0;

    if (!message) {
      return errorResponse("Le message ne peut être vide");
    }

    if (db) {
      await db.prepare(`
        INSERT INTO chat_messages (id, event_id, guest_id, guest_name, table_number, message, message_type, is_pinned, is_moderated)
        VALUES (?, 'default', ?, ?, ?, ?, ?, ?, 1)
      `).bind(id, guestId, guestName, tableNumber, message, messageType, isPinned).run();
    }

    return jsonResponse({
      id,
      guest_id: guestId,
      guest_name: guestName,
      table_number: tableNumber,
      message,
      message_type: messageType,
      is_pinned: isPinned,
      created_at: new Date().toISOString(),
    });
  }

  // 3. Réaction emoji à un message
  if (pathname.startsWith("/api/chat/") && pathname.endsWith("/react") && method === "POST") {
    const parts = pathname.split("/");
    const msgId = parts[3];
    const data = await request.json();
    const emoji = data.emoji || "heart";

    if (db) {
      const msg = await db.prepare("SELECT reactions_json FROM chat_messages WHERE id = ?").bind(msgId).first();
      let reactions = { heart: 0, applause: 0, fire: 0, pray: 0 };
      if (msg && msg.reactions_json) {
        try {
          reactions = JSON.parse(msg.reactions_json);
        } catch (e) {}
      }
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      await db.prepare("UPDATE chat_messages SET reactions_json = ? WHERE id = ?")
        .bind(JSON.stringify(reactions), msgId).run();
      return jsonResponse({ success: true, reactions });
    }
    return jsonResponse({ success: true, reactions: { [emoji]: 1 } });
  }

  // 4. Épingler / Désépingler un message (Modération)
  if (pathname.startsWith("/api/chat/") && pathname.endsWith("/pin") && method === "POST") {
    const parts = pathname.split("/");
    const msgId = parts[3];
    const data = await request.json();
    const isPinned = data.is_pinned ? 1 : 0;

    if (db) {
      await db.prepare("UPDATE chat_messages SET is_pinned = ? WHERE id = ?").bind(isPinned, msgId).run();
    }

    return jsonResponse({ success: true, is_pinned: isPinned });
  }

  return null;
}
