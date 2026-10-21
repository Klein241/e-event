/**
 * COMPAGNON DE CÉRÉMONIE - Routes Réseautage & Mise en Relation
 * Support profil enrichi, statut de présence (en ligne / hors-ligne), chat privé direct synchrone et realtime
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { getMockNetworking } from "../utils/mocks.js";
import { broadcastChatEvent } from "../utils/websocket.js";

export async function handleNetworkingRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;

  // 1. Liste des profils avec recherche et statut de présence temps réel
  if (pathname === "/api/networking" && method === "GET") {
    const url = new URL(request.url);
    const search = (url.searchParams.get("q") || "").toLowerCase().trim();

    if (!db) return jsonResponse(getMockNetworking());

    try {
      let query = `
        SELECT 
          np.*,
          COALESCE(g.last_active, np.updated_at) as guest_last_active,
          CASE WHEN g.last_active >= datetime('now', '-2 minutes') THEN 1 ELSE 0 END as is_online,
          CAST((strftime('%s', 'now') - strftime('%s', COALESCE(g.last_active, np.updated_at))) AS INTEGER) as seconds_ago
        FROM networking_profiles np
        LEFT JOIN guests g ON np.guest_id = g.id
        WHERE np.event_id = 'default' 
      `;
      const params = [];

      if (search) {
        query += "AND (LOWER(np.full_name) LIKE ? OR LOWER(np.profession) LIKE ? OR LOWER(np.interests_tags) LIKE ? OR LOWER(np.company) LIKE ?) ";
        const s = `%${search}%`;
        params.push(s, s, s, s);
      }

      query += "ORDER BY is_online DESC, np.created_at DESC LIMIT 60";
      const { results } = await db.prepare(query).bind(...params).all();
      return jsonResponse(results || []);
    } catch (err) {
      // Fallback si la jointure échoue
      const { results } = await db.prepare("SELECT * FROM networking_profiles WHERE event_id = 'default' ORDER BY created_at DESC LIMIT 50").all().catch(() => ({ results: [] }));
      return jsonResponse(results || []);
    }
  }

  // 2. Créer ou mettre à jour son profil de réseautage
  if (pathname === "/api/networking/profile" && method === "POST") {
    const data = await request.json();
    const id = data.id || `net-${Date.now()}`;
    const guestId = data.guest_id;
    const fullName = (data.full_name || "").trim();
    const profession = (data.profession || "").trim();
    const company = (data.company || "").trim();
    const bio = (data.bio || "").trim();
    const interestsTags = (data.interests_tags || "").trim();
    const lookingFor = (data.looking_for || "").trim();
    const offering = (data.offering || "").trim();
    const whatsapp = (data.whatsapp || "").trim();
    const linkedin = (data.linkedin || "").trim();
    const tableNumber = (data.table_number || "1").trim();
    const photoUrl = (data.photo_url || "").trim();

    if (!fullName) {
      return errorResponse("Le nom complet est obligatoire");
    }

    if (db) {
      try {
        await db.prepare("ALTER TABLE networking_profiles ADD COLUMN photo_url TEXT").run().catch(() => {});
      } catch (ignored) {}

      try {
        await db.prepare(`
          INSERT INTO networking_profiles (id, event_id, guest_id, full_name, profession, photo_url, company, bio, interests_tags, looking_for, offering, whatsapp, linkedin, table_number, updated_at)
          VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(guest_id) DO UPDATE SET
            full_name = excluded.full_name,
            profession = excluded.profession,
            photo_url = excluded.photo_url,
            company = excluded.company,
            bio = excluded.bio,
            interests_tags = excluded.interests_tags,
            looking_for = excluded.looking_for,
            offering = excluded.offering,
            whatsapp = excluded.whatsapp,
            linkedin = excluded.linkedin,
            table_number = excluded.table_number,
            updated_at = CURRENT_TIMESTAMP
        `).bind(id, guestId, fullName, profession, photoUrl, company, bio, interestsTags, lookingFor, offering, whatsapp, linkedin, tableNumber).run();
      } catch (err) {
        await db.prepare(`
          INSERT INTO networking_profiles (id, event_id, guest_id, full_name, profession, company, bio, interests_tags, looking_for, offering, whatsapp, linkedin, table_number, updated_at)
          VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(guest_id) DO UPDATE SET
            full_name = excluded.full_name,
            profession = excluded.profession,
            company = excluded.company,
            bio = excluded.bio,
            interests_tags = excluded.interests_tags,
            looking_for = excluded.looking_for,
            offering = excluded.offering,
            whatsapp = excluded.whatsapp,
            linkedin = excluded.linkedin,
            table_number = excluded.table_number,
            updated_at = CURRENT_TIMESTAMP
        `).bind(id, guestId, fullName, profession, company, bio, interestsTags, lookingFor, offering, whatsapp, linkedin, tableNumber).run();
      }

      // Synchroniser avec la table guests
      if (guestId) {
        await db.prepare(`
          UPDATE guests SET
            name = CASE WHEN ? != '' THEN ? ELSE name END,
            profession = CASE WHEN ? != '' THEN ? ELSE profession END,
            company = CASE WHEN ? != '' THEN ? ELSE company END,
            photo_url = CASE WHEN ? != '' THEN ? ELSE photo_url END,
            phone = CASE WHEN ? != '' THEN ? ELSE phone END,
            last_active = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(fullName, fullName, profession, profession, company, company, photoUrl, photoUrl, whatsapp, whatsapp, guestId).run().catch(() => {});
      }
    }

    return jsonResponse({ success: true, message: "Profil de réseautage enregistré avec succès !" });
  }

  // 3. Envoyer une salutation / contact icebreaker
  if (pathname === "/api/networking/greet" && method === "POST") {
    const data = await request.json();
    const id = `greet-${Date.now()}`;
    const fromGuestId = data.from_guest_id;
    const fromName = data.from_name || "Un invité";
    const toGuestId = data.to_guest_id;
    const note = (data.note || "Enchanté de vous rencontrer ce soir !").trim();

    if (db) {
      await db.prepare(`
        INSERT INTO networking_greetings (id, from_guest_id, from_name, to_guest_id, note)
        VALUES (?, ?, ?, ?, ?)
      `).bind(id, fromGuestId, fromName, toGuestId, note).run().catch(() => {});
    }

    return jsonResponse({ success: true, message: "Message de contact envoyé !" });
  }

  // 4. Messages privés 1-à-1 réels synchronisés en base D1 et temps réel WebSocket
  if (pathname === "/api/networking/messages" && method === "GET") {
    const url = new URL(request.url);
    const u1 = url.searchParams.get("user1");
    const u2 = url.searchParams.get("user2");
    if (!u1 || !u2 || !db) return jsonResponse([]);

    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS private_messages (
          id TEXT PRIMARY KEY,
          event_id TEXT DEFAULT 'default',
          sender_id TEXT NOT NULL,
          sender_name TEXT NOT NULL,
          recipient_id TEXT NOT NULL,
          recipient_name TEXT,
          message TEXT,
          media_url TEXT,
          message_type TEXT DEFAULT 'text',
          is_deleted INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run().catch(() => {});

      const { results } = await db.prepare(`
        SELECT * FROM private_messages
        WHERE is_deleted = 0
          AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
        ORDER BY created_at ASC
        LIMIT 100
      `).bind(u1, u2, u2, u1).all();

      return jsonResponse(results || []);
    } catch (e) {
      console.error("Erreur lecture private_messages:", e);
      return jsonResponse([]);
    }
  }

  if (pathname === "/api/networking/messages" && method === "POST") {
    const data = await request.json();
    const id = `pmsg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const senderId = data.sender_id;
    const senderName = (data.sender_name || "Invité").trim();
    const recipientId = data.recipient_id;
    const recipientName = (data.recipient_name || "").trim();
    const message = (data.message || "").trim();
    const mediaUrl = data.media_url || null;
    const messageType = data.message_type || (mediaUrl ? 'photo' : 'text');

    if (!message && !mediaUrl) {
      return errorResponse("Le message ou la pièce jointe ne peut être vide");
    }

    if (db) {
      try {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS private_messages (
            id TEXT PRIMARY KEY,
            event_id TEXT DEFAULT 'default',
            sender_id TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            recipient_id TEXT NOT NULL,
            recipient_name TEXT,
            message TEXT,
            media_url TEXT,
            message_type TEXT DEFAULT 'text',
            is_deleted INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run().catch(() => {});

        await db.prepare(`
          INSERT INTO private_messages (id, event_id, sender_id, sender_name, recipient_id, recipient_name, message, media_url, message_type, is_deleted)
          VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, 0)
        `).bind(id, senderId, senderName, recipientId, recipientName, message, mediaUrl, messageType).run();
      } catch (err) {
        console.error("Erreur insertion private_messages:", err);
      }
    }

    const newMsg = {
      id,
      sender_id: senderId,
      sender_name: senderName,
      recipient_id: recipientId,
      recipient_name: recipientName,
      message,
      media_url: mediaUrl,
      message_type: messageType,
      created_at: new Date().toISOString()
    };

    // Diffusion temps réel via WebSocket pour mise à jour instantanée chez le destinataire
    broadcastChatEvent("new_private_message", newMsg);

    return jsonResponse(newMsg);
  }

  // 5. Suppression d'un message privé envoyé
  const deletePrivateMatch = pathname.match(/^\/api\/networking\/messages\/([^/]+)$/) || pathname.match(/^\/api\/networking\/messages\/([^/]+)\/delete$/);
  if (deletePrivateMatch && (method === "DELETE" || method === "POST")) {
    const msgId = deletePrivateMatch[1];
    let senderId = null;
    try {
      const body = await request.json();
      senderId = body.sender_id;
    } catch (e) {}

    if (db) {
      if (senderId) {
        await db.prepare("UPDATE private_messages SET is_deleted = 1 WHERE id = ? AND sender_id = ?").bind(msgId, senderId).run().catch(() => {});
      } else {
        await db.prepare("UPDATE private_messages SET is_deleted = 1 WHERE id = ?").bind(msgId).run().catch(() => {});
      }
    }

    broadcastChatEvent("delete_private_message", { id: msgId });
    return jsonResponse({ success: true, deleted_id: msgId });
  }

  return null;
}
