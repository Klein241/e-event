/**
 * COMPAGNON DE CÉRÉMONIE - Routes Événement & Invités
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { getMockEvent, getMockGuest } from "../utils/mocks.js";

export function buildPersonalizedGuestTicketId(name, coupleName, ticketType) {
  let target = (ticketType === 'couple' && coupleName) ? coupleName : (name || 'invite');
  target = target.replace(/^(m\.|mme|mr|monsieur|madame|docteur|dr|pasteur|couple)\s+/i, '');
  const clean = target
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 24);
  const rand = Math.random().toString(36).substring(2, 6);
  return `billet-${clean || 'invite'}-${rand}`;
}

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

    // 3a-0. Consultation de la liste des tables autorisées
  if (pathname === "/api/tables" && method === "GET") {
    const defaultTables = ['A','D','F','G','H','I','J','K','L','M','O','P','Q','S','T','U','V','W','X','Z'];
    if (!db) return jsonResponse(defaultTables);
    try {
      const { results } = await db.prepare("SELECT table_code FROM event_tables ORDER BY table_code ASC").all();
      const codes = (results || []).map(r => r.table_code.toUpperCase());
      return jsonResponse(codes.length > 0 ? codes : defaultTables);
    } catch(e) {
      return jsonResponse(defaultTables);
    }
  }

  // 3a-00. Suivi réel des clics et visiteurs uniques sur le lien d'invitation (détection IP Cloudflare)
  if (pathname === "/api/invitation-link/track" && method === "POST") {
    if (!db) return jsonResponse({ success: true, tracking: false });

    const clientIp = request.headers.get("CF-Connecting-IP") ||
      request.headers.get("x-real-ip") ||
      (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      "127.0.0.1";
    const userAgent = (request.headers.get("User-Agent") || "").substring(0, 255);
    const referer = (request.headers.get("Referer") || "").substring(0, 255);
    const clickId = `clk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      await db.prepare(`
        INSERT INTO invitation_link_clicks (id, ip_address, user_agent, referer, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(clickId, clientIp, userAgent, referer).run();
      return jsonResponse({ success: true, id: clickId });
    } catch(e) {
      console.warn("Erreur enregistrement clic invitation:", e);
      return jsonResponse({ success: true, error: e.message });
    }
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
    const rawTable = (data.table_number || "").trim();
    const invitedBy = (data.invited_by || "").trim();
    const gender = (data.gender || "M").toUpperCase().trim(); // 'M' or 'F'
    const ticketType = (data.ticket_type || "seul").toLowerCase().trim(); // 'seul' or 'couple'
    const partnerName = (data.partner_name || "").trim();
    const coupleName = (data.couple_name || "").trim();
    const avatarEmoji = data.avatar_emoji || (gender === "F" ? "👑" : "🎉");

    if (!name) {
      return errorResponse("Le nom et prénom sont obligatoires", 400);
    }
    if (!phone) {
      return errorResponse("Le numéro WhatsApp est obligatoire", 400);
    }
    if (!rawTable) {
      return errorResponse("Le numéro de table est obligatoire", 400);
    }
    if (!invitedBy) {
      return errorResponse("Le champ 'Invité par' est obligatoire", 400);
    }
    if (ticketType === "couple") {
      if (!partnerName) {
        return errorResponse("Le nom du conjoint/partenaire est obligatoire pour un billet couple", 400);
      }
      if (!coupleName) {
        return errorResponse("Le nom du couple est obligatoire (ex: Couple LEGRAND)", 400);
      }
    }

    // Normalisation de la table (ex: 'Table A' -> 'A', 'a' -> 'A')
    const cleanTable = rawTable.toUpperCase().replace(/^TABLE\s*/i, '').trim();

    // 1. Validation de base de la table (autorise les tables officielles de base et leurs variantes primes)
    const baseTableLetter = cleanTable.replace(/['’]+/g, '').toUpperCase();
    const defaultTables = ['A','D','F','G','H','I','J','K','L','M','O','P','Q','S','T','U','V','W','X','Z'];
    let validTables = defaultTables;
    if (db) {
      try {
        const { results } = await db.prepare("SELECT table_code FROM event_tables").all();
        if (results && results.length > 0) {
          validTables = results.map(r => r.table_code.toUpperCase().replace(/['’]+/g, ''));
        }
      } catch(e) {}
    }

    if (!validTables.includes(baseTableLetter)) {
      return jsonResponse({
        error: "Table non valide",
        invalid_table: true,
        message: "Non valide, ne stressez pas ! Contactez la personne qui vous invite pour qu'elle vous fournisse votre Numéro de table, puis revenez compléter."
      }, 400);
    }

    // 2. Attribution intelligente avec capacité maximale de 10 places par table
    // (Billet 'seul' = 1 place, Billet 'couple' = 2 places).
    // Si la table de base (ex: A) atteint 10 places, déborde automatiquement vers A' (A prime), puis A'', etc.
    const seatsNeeded = ticketType === "couple" ? 2 : 1;
    let assignedTable = cleanTable;

    if (db) {
      try {
        const { results: existingGuests } = await db.prepare(`
          SELECT table_number, ticket_type
          FROM guests
        `).all();

        // Calculer l'occupation réelle par code de table normalisé
        const occupancyMap = {};
        (existingGuests || []).forEach(g => {
          const t = (g.table_number || '').toUpperCase().replace(/^TABLE\s*/i, '').trim();
          const seats = g.ticket_type === 'couple' ? 2 : 1;
          occupancyMap[t] = (occupancyMap[t] || 0) + seats;
        });

        // Chercher la première variante de table disponible (base, base', base'', etc.)
        let primeCount = 0;
        let candidate = baseTableLetter;
        while (true) {
          const currentOccupancy = occupancyMap[candidate] || 0;
          if (currentOccupancy + seatsNeeded <= 10) {
            assignedTable = candidate;
            break;
          }
          primeCount++;
          candidate = `${baseTableLetter}${Array(primeCount).fill("'").join("")}`;
        }

        // Si une table overflow a été créée (ex: A'), s'assurer qu'elle existe dans event_tables
        try {
          await db.prepare(`
            INSERT OR IGNORE INTO event_tables (id, table_code, capacity)
            VALUES (?, ?, 10)
          `).bind(`tbl-${assignedTable}`, assignedTable).run();
        } catch(e) {}
      } catch (err) {
        console.warn("Erreur calcul débordement table:", err);
      }
    }

    const photoUrl = (data.photo_url || "").trim();

    // 3. Détermination d'un identifiant TOUJOURS UNIQUE pour chaque nouvel inscrit.
    // Si l'ID envoyé existe déjà en base (cas d'un smartphone partagé ou réutilisé),
    // on force la génération d'un NOUVEL identifiant pour ne JAMAIS écraser un invité précédent !
    let guestId = (data.id || "").trim();
    if (!guestId || guestId.startsWith("guest-link-17")) {
      guestId = buildPersonalizedGuestTicketId(name, coupleName, ticketType);
    }
    if (db && guestId) {
      try {
        const existing = await db.prepare("SELECT id FROM guests WHERE id = ?").bind(guestId).first();
        if (existing) {
          guestId = `${guestId}-${Math.random().toString(36).substring(2, 5)}`;
        }
      } catch (e) {
        guestId = buildPersonalizedGuestTicketId(name, coupleName, ticketType);
      }
    } else {
      guestId = buildPersonalizedGuestTicketId(name, coupleName, ticketType);
    }

    const role = (data.role || data.rank || "Invitée de Marque").trim();

    if (db) {
      try {
        await db.prepare(`
          INSERT INTO guests (
            id, event_id, name, table_number, phone, invited_by, registration_source,
            gender, ticket_type, partner_name, couple_name, photo_url,
            avatar_emoji, role, created_at, last_active
          ) VALUES (?, 'default', ?, ?, ?, ?, 'link', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(guestId, name, assignedTable, phone, invitedBy, gender, ticketType, partnerName, coupleName, photoUrl, avatarEmoji, role).run();
      } catch (err) {
        console.error("Erreur insertion invité par lien:", err);
        return errorResponse("Erreur base de données: " + err.message, 500);
      }
    }

    const guestObj = {
      id: guestId,
      name,
      table_number: assignedTable,
      phone,
      invited_by: invitedBy,
      registration_source: 'link',
      gender,
      ticket_type: ticketType,
      partner_name: partnerName,
      couple_name: coupleName,
      photo_url: photoUrl,
      avatar_emoji: avatarEmoji,
      role: role,
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
    const guestId = (url.searchParams.get("id") || "").trim();
    if (!guestId || !db) return jsonResponse({ guest: null, prayers: [], networking: null });

    try {
      // 1. Recherche par identifiant exact
      let guest = await db.prepare("SELECT * FROM guests WHERE id = ?").bind(guestId).first();

      // 2. Si non trouvé par ID exact, recherche intelligente par téléphone, nom exact ou nom approchant
      if (!guest) {
        guest = await db.prepare(`
          SELECT * FROM guests 
          WHERE phone = ? 
             OR LOWER(name) = LOWER(?) 
             OR LOWER(couple_name) = LOWER(?)
             OR id LIKE ?
             OR name LIKE ?
          LIMIT 1
        `).bind(guestId, guestId, guestId, `%${guestId}%`, `%${guestId}%`).first();
      }

      if (!guest) {
        return jsonResponse({ guest: null, prayers: [], networking: null });
      }

      const prayers = await db.prepare("SELECT * FROM prayer_requests WHERE guest_id = ? ORDER BY created_at DESC LIMIT 20").bind(guest.id).all();
      const networking = await db.prepare("SELECT * FROM networking_profiles WHERE guest_id = ?").bind(guest.id).first();

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
