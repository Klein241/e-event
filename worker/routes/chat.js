/**
 * COMPAGNON DE CÉRÉMONIE - Routes Chat en Direct
 * Support Realtime WebSocket (Alternative Supabase), pièces jointes, suppression de messages et réactions
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { getMockChat } from "../utils/mocks.js";
import { handleChatWebSocket, broadcastChatEvent } from "../utils/websocket.js";

export async function handleChatRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;

  // 0. WebSocket Realtime Upgrade (/api/chat/ws)
  if (pathname === "/api/chat/ws") {
    return handleChatWebSocket(request);
  }

  // 1. Récupération des messages de chat
  if (pathname === "/api/chat" && method === "GET") {
    if (!db) return jsonResponse(getMockChat());
    const { results } = await db.prepare(`
      SELECT * FROM chat_messages 
      WHERE is_moderated = 1 
      ORDER BY is_pinned DESC, created_at DESC 
      LIMIT 80
    `).all();
    return jsonResponse((results || []).reverse());
  }

  // 2. Envoi de message sur le chat (Texte, Photo compressée, Pièce jointe)
  if (pathname === "/api/chat" && method === "POST") {
    const data = await request.json();
    const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const guestId = data.guest_id || "guest-anon";
    const guestName = (data.guest_name || "Anonyme").trim();
    const tableNumber = (data.table_number || "1").trim();
    const message = (data.message || "").trim();
    const messageType = data.message_type || (data.media_url ? 'photo' : 'text');
    const mediaUrl = data.media_url || null;
    const isPinned = data.is_pinned ? 1 : 0;

    if (!message && !mediaUrl) {
      return errorResponse("Le message ou la pièce jointe ne peut être vide");
    }

    if (db) {
      await db.prepare(`
        INSERT INTO chat_messages (id, event_id, guest_id, guest_name, table_number, message, message_type, media_url, is_pinned, is_moderated)
        VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, 1)
      `).bind(id, guestId, guestName, tableNumber, message, messageType, mediaUrl, isPinned).run();
    }

    const newMsg = {
      id,
      guest_id: guestId,
      guest_name: guestName,
      table_number: tableNumber,
      message,
      message_type: messageType,
      media_url: mediaUrl,
      reactions_json: '{"heart":0,"applause":0,"fire":0,"pray":0}',
      is_pinned: isPinned,
      created_at: new Date().toISOString(),
    };

    // Diffusion instantanée par WebSocket aux clients connectés
    broadcastChatEvent("new_message", newMsg);

    return jsonResponse(newMsg);
  }

  // 3. Suppression d'un message envoyé (Auteur ou Admin)
  const deleteMatch = pathname.match(/^\/api\/chat\/([^/]+)$/) || pathname.match(/^\/api\/chat\/([^/]+)\/delete$/);
  if (deleteMatch && (method === "DELETE" || method === "POST")) {
    const msgId = deleteMatch[1];
    let guestId = null;
    try {
      const body = await request.json();
      guestId = body.guest_id;
    } catch (e) {}

    if (db) {
      if (guestId && guestId !== "admin") {
        await db.prepare("UPDATE chat_messages SET is_moderated = 0 WHERE id = ? AND guest_id = ?")
          .bind(msgId, guestId).run();
      } else {
        await db.prepare("UPDATE chat_messages SET is_moderated = 0 WHERE id = ?")
          .bind(msgId).run();
      }
    }

    // Notification instantanée de suppression à tous les clients
    broadcastChatEvent("delete_message", { id: msgId });

    return jsonResponse({ success: true, deleted_id: msgId });
  }

  // 4. Réaction emoji à un message
  if (pathname.startsWith("/api/chat/") && pathname.endsWith("/react") && method === "POST") {
    const parts = pathname.split("/");
    const msgId = parts[3];
    const data = await request.json();
    const emoji = data.emoji || "heart";

    let reactions = { heart: 0, applause: 0, fire: 0, pray: 0 };
    if (db) {
      const msg = await db.prepare("SELECT reactions_json FROM chat_messages WHERE id = ?").bind(msgId).first();
      if (msg && msg.reactions_json) {
        try {
          reactions = JSON.parse(msg.reactions_json);
        } catch (e) {}
      }
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      await db.prepare("UPDATE chat_messages SET reactions_json = ? WHERE id = ?")
        .bind(JSON.stringify(reactions), msgId).run();
    } else {
      reactions[emoji] = 1;
    }

    // Diffusion temps réel de la réaction
    broadcastChatEvent("reaction", { id: msgId, reactions });

    return jsonResponse({ success: true, reactions });
  }

  // 5. Épingler / Désépingler un message (Modération)
  if (pathname.startsWith("/api/chat/") && pathname.endsWith("/pin") && method === "POST") {
    const parts = pathname.split("/");
    const msgId = parts[3];
    const data = await request.json();
    const isPinned = data.is_pinned ? 1 : 0;

    if (db) {
      await db.prepare("UPDATE chat_messages SET is_pinned = ? WHERE id = ?").bind(isPinned, msgId).run();
    }

    broadcastChatEvent("pin_toggle", { id: msgId, is_pinned: isPinned });

    return jsonResponse({ success: true, is_pinned: isPinned });
  }

  return null;
}
