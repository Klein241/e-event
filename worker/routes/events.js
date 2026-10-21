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

  // 3a-bis. Inscription par lien d'invitation publique (2ème édition Gala)
  if (pathname === "/api/guests/invitation-register" && method === "POST") {
    let data = {};
    try {
      data = await request.json();
    } catch (e) {
      return errorResponse("Données invalides", 400);
    }

    const name = (data.name || "").trim();
    const phone = (data.phone || data.whatsapp || "").trim();
    const tableNumber = (data.table_number || "1").trim();
    const invitedBy = (data.invited_by || "").trim();
    const avatarEmoji = data.avatar_emoji || "🎉";

    if (!name) {
      return errorResponse("Le nom et prénom sont obligatoires", 400);
    }
    if (!phone) {
      return errorResponse("Le numéro WhatsApp est obligatoire", 400);
    }
    if (!tableNumber) {
      return errorResponse("Le numéro de table est obligatoire", 400);
    }
    if (!invitedBy) {
      return errorResponse("Le champ 'Invité par' est obligatoire", 400);
    }

    // Identifiant unique haute concurrence (supporte 500+ inscrits sans collision)
    const guestId = data.id || `guest-link-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    if (db) {
      try {
        await db.prepare(`
          INSERT INTO guests (
            id, event_id, name, table_number, phone, invited_by, registration_source, avatar_emoji, role, created_at, last_active
          ) VALUES (?, 'default', ?, ?, ?, ?, 'link', ?, 'invite', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            table_number = excluded.table_number,
            phone = excluded.phone,
            invited_by = excluded.invited_by,
            registration_source = 'link',
            avatar_emoji = excluded.avatar_emoji,
            last_active = CURRENT_TIMESTAMP
        `).bind(guestId, name, tableNumber, phone, invitedBy, avatarEmoji).run();
      } catch (err) {
        console.error("Erreur insertion invité par lien:", err);
        return errorResponse("Erreur base de données: " + err.message, 500);
      }
    }

    const guestObj = {
      id: guestId,
      name,
      table_number: tableNumber,
      phone,
      invited_by: invitedBy,
      registration_source: 'link',
      avatar_emoji: avatarEmoji,
      role: 'invite',
      token: `token-${guestId}`
    };

    return jsonResponse({
      success: true,
      guest: guestObj,
      message: `Bienvenue ${name} ! Votre invitation a été confirmée.`
    });
  }

  // 3b. Mise à jour directe du profil invité (Coordonnées & CRM)
  if (pathname === "/api/guests/profile" && method === "POST") {
    const data = await request.json();
    const guestId = data.id || data.guest_id;
    if (!guestId) return errorResponse("ID invité requis");

    const name = (data.name || "").trim();
    const tableNumber = (data.table_number || "").trim();
    const phone = (data.phone || data.whatsapp || "").trim();
    const profession = (data.profession || "").trim();
    const company = (data.company || "").trim();
    const residenceLocation = (data.residence_location || "").trim();
    const hasChurch = data.has_church !== undefined ? (Number(data.has_church) ? 1 : 0) : null;
    const churchName = (data.church_name || "").trim();

    if (db) {
      try {
        await db.prepare(`
          UPDATE guests SET
            name = CASE WHEN ? != '' THEN ? ELSE name END,
            table_number = CASE WHEN ? != '' THEN ? ELSE table_number END,
            phone = CASE WHEN ? != '' THEN ? ELSE phone END,
            profession = CASE WHEN ? != '' THEN ? ELSE profession END,
            company = CASE WHEN ? != '' THEN ? ELSE company END,
            residence_location = CASE WHEN ? != '' THEN ? ELSE residence_location END,
            has_church = COALESCE(?, has_church),
            church_name = CASE WHEN ? != '' THEN ? ELSE church_name END,
            last_active = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          name, name,
          tableNumber, tableNumber,
          phone, phone,
          profession, profession,
          company, company,
          residenceLocation, residenceLocation,
          hasChurch,
          churchName, churchName,
          guestId
        ).run();
      } catch (err) {
        console.error("Erreur mise à jour profil invité:", err);
      }
    }

    return jsonResponse({ success: true, guest_id: guestId });
  }

  // 3c. Consultation du profil consolidé (Prières, Réseau & Coordonnées)
  if (pathname === "/api/guests/detail" && method === "GET") {
    const url = new URL(request.url);
    const guestId = url.searchParams.get("id");
    if (!guestId || !db) return jsonResponse({ guest: null, prayers: [], networking: null });

    try {
      const guest = await db.prepare("SELECT * FROM guests WHERE id = ?").bind(guestId).first();
      const prayers = await db.prepare("SELECT * FROM prayer_requests WHERE guest_id = ? ORDER BY created_at DESC LIMIT 20").bind(guestId).all();
      const networking = await db.prepare("SELECT * FROM networking_profiles WHERE guest_id = ?").bind(guestId).first();

      return jsonResponse({
        guest: guest || null,
        prayers: prayers.results || [],
        networking: networking || null
      });
    } catch (err) {
      console.error("Erreur récupération détail invité:", err);
      return jsonResponse({ guest: null, prayers: [], networking: null });
    }
  }

  // 4a. Heartbeat & statut de présence invité
  if (pathname === "/api/guests/heartbeat" && method === "POST") {
    let guestId = null;
    try {
      const body = await request.json();
      guestId = body.guest_id || body.id;
    } catch(e) {}

    if (db && guestId) {
      await db.prepare("UPDATE guests SET last_active = CURRENT_TIMESTAMP WHERE id = ?").bind(guestId).run().catch(() => {});
    }

    let onlineCount = 1;
    let totalCount = 1;
    if (db) {
      try {
        const stats = await db.prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN last_active >= datetime('now', '-2 minutes') THEN 1 ELSE 0 END) as online
          FROM guests
        `).first();
        if (stats) {
          totalCount = stats.total || 0;
          onlineCount = stats.online || 0;
        }
      } catch (e) {}
    }

    return jsonResponse({ success: true, online_count: onlineCount, total_count: totalCount });
  }

  // 4b. Liste détaillée des invités connectés et déconnectés (qui étaient connectés)
  if (pathname === "/api/guests/presence" && method === "GET") {
    if (!db) return jsonResponse({ online: [], offline: [], online_count: 0, total_count: 0 });

    try {
      const { results } = await db.prepare(`
        SELECT 
          id, name, table_number, role, avatar_emoji, photo_url, profession, company, last_active,
          CASE WHEN last_active >= datetime('now', '-2 minutes') THEN 1 ELSE 0 END as is_online,
          CAST((strftime('%s', 'now') - strftime('%s', last_active)) AS INTEGER) as seconds_ago
        FROM guests
        ORDER BY is_online DESC, last_active DESC
        LIMIT 150
      `).all();

      const online = [];
      const offline = [];

      (results || []).forEach(g => {
        if (g.is_online === 1) {
          online.push(g);
        } else {
          offline.push(g);
        }
      });

      return jsonResponse({
        online,
        offline,
        online_count: online.length,
        offline_count: offline.length,
        total_count: (results || []).length
      });
    } catch (err) {
      console.error("Erreur présence invités:", err);
      return jsonResponse({ online: [], offline: [], online_count: 0, total_count: 0 });
    }
  }

  // 4c. Liste des invités actifs
  if (pathname === "/api/guests" && method === "GET") {
    if (!db) return jsonResponse([getMockGuest()]);
    const { results } = await db.prepare(`
      SELECT 
        id, name, table_number, role, avatar_emoji, photo_url, profession, company, last_active,
        CASE WHEN last_active >= datetime('now', '-2 minutes') THEN 1 ELSE 0 END as is_online,
        CAST((strftime('%s', 'now') - strftime('%s', last_active)) AS INTEGER) as seconds_ago
      FROM guests 
      ORDER BY is_online DESC, last_active DESC 
      LIMIT 100
    `).all();
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
