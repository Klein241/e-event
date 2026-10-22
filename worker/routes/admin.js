/**
 * COMPAGNON DE CÉRÉMONIE - Routes Administrateur & Backoffice Régie
 * Toutes les fonctionnalités de gestion en direct prêtes pour la production
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { buildPersonalizedGuestTicketId } from "./events.js";

function isAuthorized(request, env) {
  const adminPin = env.ADMIN_PIN || "7777";
  const authHeader = request.headers.get("Authorization") || "";
  const customHeader = request.headers.get("X-Admin-PIN") || "";

  if (customHeader === adminPin) return true;
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token === adminPin || token.startsWith("admin-")) return true;
  }
  return false;
}

export async function handleAdminRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;
  const adminPin = env.ADMIN_PIN || "7777";

  // 1. Authentification Admin PIN
  if (pathname === "/api/admin/auth" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const pin = String(data.pin || "").trim();

    if (pin === adminPin) {
      return jsonResponse({
        success: true,
        token: `admin-${Date.now()}`,
        event_name: env.EVENT_NAME || "Compagnon de Cérémonie",
        environment: env.ENVIRONMENT || "production",
      });
    }

    return errorResponse("Code PIN administrateur incorrect", 401);
  }

  // Vérification de sécurité obligatoire pour toutes les autres routes /api/admin/*
  if (!isAuthorized(request, env)) {
    return errorResponse("Accès refusé. Veuillez vous authentifier avec le code PIN régie.", 401);
  }

  // 2. Vue d'ensemble (KPIs & Statistiques globales)
  if (pathname === "/api/admin/overview" && method === "GET") {
    if (!db) {
      return jsonResponse({
        stats: {
          guests_count: 48,
          tables_count: 8,
          chat_count: 64,
          prayers_count: 12,
          networking_count: 24,
          push_subscribers_count: 42,
        },
        event: {
          id: "default",
          name: env.EVENT_NAME || "Soirée Royale de Célébration",
          subtitle: "Compagnon Interactif & Régie",
          venue: "Grand Salon Impérial",
          is_active: 1,
        },
        active_quiz: null,
      });
    }

    try {
      const [
        guestsCount,
        tablesCount,
        chatCount,
        prayersCount,
        networkingCount,
        pushCount,
        eventRow,
        activeQuizRow,
      ] = await Promise.all([
        db.prepare("SELECT COUNT(*) as count FROM guests").first().catch(() => ({ count: 0 })),
        db.prepare("SELECT COUNT(DISTINCT table_number) as count FROM guests").first().catch(() => ({ count: 0 })),
        db.prepare("SELECT COUNT(*) as count FROM chat_messages").first().catch(() => ({ count: 0 })),
        db.prepare("SELECT COUNT(*) as count FROM prayer_requests").first().catch(() => ({ count: 0 })),
        db.prepare("SELECT COUNT(*) as count FROM networking_profiles").first().catch(() => ({ count: 0 })),
        db.prepare("SELECT COUNT(*) as count FROM push_subscriptions").first().catch(() => ({ count: 0 })),
        db.prepare("SELECT * FROM events WHERE id = 'default' LIMIT 1").first().catch(() => null),
        db.prepare("SELECT * FROM quiz_questions WHERE status = 'active' LIMIT 1").first().catch(() => null),
      ]);

      return jsonResponse({
        stats: {
          guests_count: guestsCount?.count || 0,
          tables_count: tablesCount?.count || 0,
          chat_count: chatCount?.count || 0,
          prayers_count: prayersCount?.count || 0,
          networking_count: networkingCount?.count || 0,
          push_subscribers_count: pushCount?.count || 0,
        },
        event: {
          id: "default",
          name: eventRow?.name || env.EVENT_NAME || "Compagnon de Cérémonie",
          subtitle: eventRow?.subtitle || "Compagnon Interactif",
          venue: eventRow?.venue || "Salle Principale",
          is_active: eventRow?.is_active !== undefined ? eventRow.is_active : 1,
          direct_feature_enabled: eventRow?.direct_feature_enabled !== undefined && eventRow?.direct_feature_enabled !== null ? Number(eventRow.direct_feature_enabled) : 1,
        },
        active_quiz: activeQuizRow || null,
      });
    } catch (err) {
      return errorResponse("Erreur lors du calcul de la vue d'ensemble", 500, err.message);
    }
  }

  // 3. Mise à jour de l'événement (Nom, Lieu, Sous-titre)
  if (pathname === "/api/admin/event/update" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const name = (data.name || "").trim();
    const subtitle = (data.subtitle || "").trim();
    const venue = (data.venue || "").trim();
    const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;

    if (!name) return errorResponse("Le nom de l'événement est requis");

    if (db) {
      await db.prepare(`
        INSERT INTO events (id, name, subtitle, venue, is_active)
        VALUES ('default', ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          subtitle = excluded.subtitle,
          venue = excluded.venue,
          is_active = excluded.is_active
      `).bind(name, subtitle, venue, isActive).run();
    }

    return jsonResponse({ success: true, message: "Événement mis à jour avec succès" });
  }

  // 4. Liste complète des invités enrichie (CRM complet)
  if (pathname === "/api/admin/guests" && method === "GET") {
    if (!db) return jsonResponse([]);
    const { results } = await db.prepare(`
      SELECT 
        g.id,
        g.event_id,
        g.name,
        g.table_number,
        g.avatar_emoji,
        COALESCE(NULLIF(g.photo_url, ''), np.photo_url, '') as photo_url,
        COALESCE(NULLIF(g.profession, ''), np.profession, '') as profession,
        COALESCE(NULLIF(g.company, ''), np.company, '') as company,
        COALESCE(NULLIF(g.residence_location, ''), '') as residence_location,
        COALESCE(NULLIF(g.phone, ''), np.whatsapp, '') as phone,
        COALESCE(g.has_church, 0) as has_church,
        COALESCE(NULLIF(g.church_name, ''), '') as church_name,
        COALESCE(NULLIF(g.church_duration, ''), '') as church_duration,
        COALESCE(g.invited_by, '') as invited_by,
        COALESCE(g.registration_source, 'direct') as registration_source,
        COALESCE(g.gender, 'M') as gender,
        COALESCE(g.ticket_type, 'seul') as ticket_type,
        COALESCE(g.partner_name, '') as partner_name,
        COALESCE(g.couple_name, '') as couple_name,
        g.role,
        g.created_at,
        g.last_active,
        COALESCE(SUM(qa.points_awarded), 0) as points,
        np.bio as net_bio,
        np.interests_tags,
        np.looking_for,
        np.offering,
        (SELECT COUNT(*) FROM prayer_requests pr WHERE pr.guest_id = g.id) as prayers_count
      FROM guests g
      LEFT JOIN quiz_answers qa ON qa.guest_id = g.id AND qa.is_correct = 1
      LEFT JOIN networking_profiles np ON np.guest_id = g.id
      GROUP BY g.id
      ORDER BY g.created_at DESC
      LIMIT 300
    `).all();

    const guests = results || [];
    for (const guest of guests) {
      if (guest.prayers_count > 0) {
        const prayers = await db.prepare(`
          SELECT id, title, content, target_person, residence_location, has_church, church_name, church_duration, created_at
          FROM prayer_requests
          WHERE guest_id = ?
          ORDER BY created_at DESC
          LIMIT 10
        `).bind(guest.id).all().catch(() => ({ results: [] }));
        guest.prayers_history = prayers.results || [];
      } else {
        guest.prayers_history = [];
      }
    }

    return jsonResponse(guests);
  }


  // 5. Création manuelle d'un invité par l'administrateur (catégorisé 'link')
  if (pathname === "/api/admin/guests" && method === "POST") {
    let data = {};
    try { data = await request.json(); } catch(e) {}

    const name = (data.name || "").trim();
    if (!name) return errorResponse("Le nom et prénom sont obligatoires", 400);

    const gender = (data.gender || "M").toUpperCase().trim();
    const ticketType = (data.ticket_type || "seul").toLowerCase().trim();
    const partnerName = (data.partner_name || "").trim();
    const coupleName = (data.couple_name || "").trim();
    const phone = (data.phone || data.whatsapp || "").trim();
    const rawTable = (data.table_number || "1").trim();
    const cleanTable = rawTable.toUpperCase().replace(/^TABLE\s*/i, '').trim() || 'A';
    const invitedBy = (data.invited_by || "Admin").trim();
    const photoUrl = (data.photo_url || "").trim();
    const avatarEmoji = data.avatar_emoji || (gender === "F" ? "👑" : "🎉");
    const registrationSource = data.registration_source || "link"; // invité par lien ou manuel

    const guestId = (data.id && data.id.trim()) || buildPersonalizedGuestTicketId(name, coupleName, ticketType);

    if (db) {
      await db.prepare(`
        INSERT INTO guests (
          id, event_id, name, table_number, phone, invited_by, registration_source,
          gender, ticket_type, partner_name, couple_name, photo_url,
          avatar_emoji, role, created_at, last_active
        ) VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'invite', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          table_number = excluded.table_number,
          phone = excluded.phone,
          invited_by = excluded.invited_by,
          registration_source = excluded.registration_source,
          gender = excluded.gender,
          ticket_type = excluded.ticket_type,
          partner_name = excluded.partner_name,
          couple_name = excluded.couple_name,
          photo_url = COALESCE(NULLIF(excluded.photo_url, ''), guests.photo_url),
          avatar_emoji = excluded.avatar_emoji,
          last_active = CURRENT_TIMESTAMP
      `).bind(
        guestId, name, cleanTable, phone, invitedBy, registrationSource,
        gender, ticketType, partnerName, coupleName, photoUrl, avatarEmoji
      ).run();
    }

    const createdGuest = {
      id: guestId,
      name,
      table_number: cleanTable,
      phone,
      invited_by: invitedBy,
      registration_source: registrationSource,
      gender,
      ticket_type: ticketType,
      partner_name: partnerName,
      couple_name: coupleName,
      photo_url: photoUrl,
      avatar_emoji: avatarEmoji,
      role: 'invite'
    };

    return jsonResponse({ success: true, guest: createdGuest });
  }

  // 5b. Supprimer un invité
  if (pathname.startsWith("/api/admin/guests/") && method === "DELETE") {
    const id = pathname.replace("/api/admin/guests/", "").trim();
    if (db && id) {
      await db.prepare("DELETE FROM guests WHERE id = ?").bind(id).run();
    }
    return jsonResponse({ success: true, id });
  }

  // 5c. Modifier un invité existant (Correction orthographe, coordonnées, table & migration)
  if (pathname.startsWith("/api/admin/guests/") && method === "PUT") {
    const id = pathname.replace("/api/admin/guests/", "").trim();
    if (!id) return errorResponse("ID invité requis", 400);

    let data = {};
    try { data = await request.json(); } catch(e) {}

    const name = (data.name || "").trim();
    if (!name) return errorResponse("Le nom est obligatoire", 400);

    const gender = (data.gender || "M").toUpperCase().trim();
    const ticketType = (data.ticket_type || "seul").toLowerCase().trim();
    const partnerName = (data.partner_name || "").trim();
    const coupleName = (data.couple_name || "").trim();
    const phone = (data.phone || data.whatsapp || "").trim();
    const rawTable = (data.table_number || "A").trim();
    const cleanTable = rawTable.toUpperCase().replace(/^TABLE\s*/i, '').trim() || 'A';
    const invitedBy = (data.invited_by || "Admin").trim();
    const profession = (data.profession || "").trim();
    const company = (data.company || "").trim();
    const residenceLocation = (data.residence_location || "").trim();

    if (db) {
      await db.prepare(`
        UPDATE guests SET
          name = ?,
          gender = ?,
          ticket_type = ?,
          partner_name = ?,
          couple_name = ?,
          phone = ?,
          table_number = ?,
          invited_by = ?,
          profession = COALESCE(NULLIF(?, ''), profession),
          company = COALESCE(NULLIF(?, ''), company),
          residence_location = COALESCE(NULLIF(?, ''), residence_location),
          last_active = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        name, gender, ticketType, partnerName, coupleName, phone,
        cleanTable, invitedBy, profession, company, residenceLocation, id
      ).run();

      // S'assurer que si la table renseignée (ex: A', B) n'est pas encore déclarée, elle est créée
      try {
        await db.prepare(`
          INSERT OR IGNORE INTO event_tables (id, table_code, capacity)
          VALUES (?, ?, 10)
        `).bind(`tbl-${cleanTable}`, cleanTable).run();
      } catch(e) {}
    }

    return jsonResponse({
      success: true,
      guest: {
        id,
        name,
        gender,
        ticket_type: ticketType,
        partner_name: partnerName,
        couple_name: coupleName,
        phone,
        table_number: cleanTable,
        invited_by: invitedBy,
        profession,
        company,
        residence_location: residenceLocation
      }
    });
  }

  // 5d. Gestion des Tables de l'événement (Ajouter / Lister / Supprimer)
  if (pathname === "/api/admin/tables" && method === "GET") {
    if (!db) return jsonResponse([]);
    try {
      const { results } = await db.prepare(`
        SELECT t.table_code, t.capacity, 
          (SELECT COUNT(*) FROM guests g WHERE g.table_number = t.table_code) as guest_count
        FROM event_tables t
        ORDER BY t.table_code ASC
      `).all();
      return jsonResponse(results || []);
    } catch(e) {
      return jsonResponse([]);
    }
  }

  if (pathname === "/api/admin/tables" && method === "POST") {
    let data = {};
    try { data = await request.json(); } catch(e) {}
    const code = (data.table_code || "").toUpperCase().replace(/^TABLE\s*/i, '').trim();
    if (!code) return errorResponse("Code de table requis", 400);

    if (db) {
      const id = `tbl-${code}`;
      await db.prepare(`
        INSERT INTO event_tables (id, table_code) VALUES (?, ?)
        ON CONFLICT(table_code) DO NOTHING
      `).bind(id, code).run();
    }
    return jsonResponse({ success: true, table_code: code });
  }

  if (pathname.startsWith("/api/admin/tables/") && method === "DELETE") {
    const code = pathname.replace("/api/admin/tables/", "").toUpperCase().trim();
    if (db && code) {
      await db.prepare("DELETE FROM event_tables WHERE table_code = ?").bind(code).run();
    }
    return jsonResponse({ success: true, table_code: code });
  }

  // 5e. Statistiques réelles des clics sur le lien d'invitation (par IP et inscrits réels)
  if (pathname === "/api/admin/invitation-stats" && method === "GET") {
    if (!db) {
      const zeroStats = {
        total_clicks: 0,
        unique_visitors: 0,
        link_registrations: 0,
        conversion_rate: 0,
        last_click_at: null
      };
      return jsonResponse({
        success: true,
        data: zeroStats,
        ...zeroStats
      });
    }

    try {
      const clickStats = await db.prepare(`
        SELECT 
          COUNT(*) as total_clicks,
          COUNT(DISTINCT ip_address) as unique_visitors,
          MAX(created_at) as last_click_at
        FROM invitation_link_clicks
      `).first();

      const regStats = await db.prepare(`
        SELECT COUNT(*) as link_registrations
        FROM guests
        WHERE registration_source = 'link'
      `).first();

      const totalClicks = clickStats?.total_clicks || 0;
      const uniqueVisitors = clickStats?.unique_visitors || 0;
      const linkRegistrations = regStats?.link_registrations || 0;
      const conversionRate = uniqueVisitors > 0 
        ? parseFloat(((linkRegistrations / uniqueVisitors) * 100).toFixed(1))
        : (totalClicks > 0 ? parseFloat(((linkRegistrations / totalClicks) * 100).toFixed(1)) : 0);

      const statsData = {
        total_clicks: totalClicks,
        unique_visitors: uniqueVisitors,
        link_registrations: linkRegistrations,
        conversion_rate: conversionRate,
        last_click_at: clickStats?.last_click_at || null
      };

      return jsonResponse({
        success: true,
        data: statsData,
        ...statsData
      });
    } catch(e) {
      const errStats = {
        total_clicks: 0,
        unique_visitors: 0,
        link_registrations: 0,
        conversion_rate: 0,
        last_click_at: null,
        error: e.message
      };
      return jsonResponse({
        success: false,
        data: errStats,
        ...errStats
      });
    }
  }

  // 6. Gestion du Quiz : Liste de toutes les questions
  if (pathname === "/api/admin/quiz/questions" && method === "GET") {
    if (!db) return jsonResponse([]);
    const { results } = await db.prepare(`
      SELECT q.*, 
        (SELECT COUNT(*) FROM quiz_answers a WHERE a.question_id = q.id) as answers_count,
        (SELECT COUNT(*) FROM quiz_answers a WHERE a.question_id = q.id AND a.is_correct = 1) as correct_count
      FROM quiz_questions q
      ORDER BY q.created_at DESC
      LIMIT 100
    `).all();
    return jsonResponse(results || []);
  }

  // 7. Créer une nouvelle question de Quiz
  if (pathname === "/api/admin/quiz/question/create" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const question = (data.question || "").trim();
    const optionA = (data.option_a || "").trim();
    const optionB = (data.option_b || "").trim();
    const optionC = (data.option_c || "").trim();
    const optionD = (data.option_d || "").trim();
    const correctOption = (data.correct_option || "A").toUpperCase();
    const explanation = (data.explanation || "").trim();
    const duration = parseInt(data.duration_seconds, 10) || 20;
    const points = parseInt(data.points, 10) || 100;
    const launchDirectly = !!data.launch_now;

    if (!question || !optionA || !optionB) {
      return errorResponse("Question et options A et B obligatoires");
    }

    const id = `q-${Date.now()}`;
    const status = launchDirectly ? "active" : "pending";

    if (db) {
      if (launchDirectly) {
        await db.prepare("UPDATE quiz_questions SET status = 'ended' WHERE status = 'active'").run();
      }

      await db.prepare(`
        INSERT INTO quiz_questions (id, event_id, question, option_a, option_b, option_c, option_d, correct_option, explanation, duration_seconds, points, status)
        VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, question, optionA, optionB, optionC, optionD, correctOption, explanation, duration, points, status).run();
    }

    return jsonResponse({ success: true, id, status, message: launchDirectly ? "Question créée et lancée en direct !" : "Question enregistrée dans la banque" });
  }

  // 8. Lancer / Propulser une question en direct
  if (pathname === "/api/admin/quiz/question/launch" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const questionId = data.question_id;

    if (!questionId) return errorResponse("question_id requis");

    if (db) {
      await db.prepare("UPDATE quiz_questions SET status = 'ended' WHERE status = 'active'").run();
      await db.prepare("UPDATE quiz_questions SET status = 'active' WHERE id = ?").bind(questionId).run();
    }

    return jsonResponse({ success: true, message: "Question propulsée en direct sur tous les téléphones !" });
  }

  // 9. Clôturer la question en direct
  if (pathname === "/api/admin/quiz/question/close" && method === "POST") {
    if (db) {
      await db.prepare("UPDATE quiz_questions SET status = 'ended' WHERE status = 'active'").run();
    }
    return jsonResponse({ success: true, message: "Question clôturée" });
  }

  // 10. Supprimer une question de Quiz
  if (pathname.startsWith("/api/admin/quiz/question/") && method === "DELETE") {
    const id = pathname.replace("/api/admin/quiz/question/", "").trim();
    if (db && id) {
      await db.prepare("DELETE FROM quiz_questions WHERE id = ?").bind(id).run();
      await db.prepare("DELETE FROM quiz_answers WHERE question_id = ?").bind(id).run();
    }
    return jsonResponse({ success: true, id });
  }

  // 11. Réinitialiser les scores du Quiz
  if (pathname === "/api/admin/quiz/reset-scores" && method === "POST") {
    if (db) {
      await db.prepare("DELETE FROM quiz_answers").run();
      await db.prepare("UPDATE quiz_questions SET status = 'ended'").run();
    }
    return jsonResponse({ success: true, message: "Scores et réponses réinitialisés avec succès" });
  }

  // 12. Créditer des points manuellement (Bonus Table ou Invité)
  if (pathname === "/api/admin/points/add" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const points = parseInt(data.points, 10) || 50;
    const tableNumber = (data.table_number || "").trim();
    const guestId = (data.guest_id || "").trim();
    const reason = (data.reason || "Bonus Animateur Régie").trim();

    if (db) {
      const id = `bonus-${Date.now()}`;
      await db.prepare(`
        INSERT INTO quiz_answers (id, question_id, guest_id, guest_name, table_number, selected_option, is_correct, points_awarded)
        VALUES (?, 'bonus-host', ?, ?, ?, 'BONUS', 1, ?)
      `).bind(id, guestId || `table-${tableNumber}`, `Bonus Table ${tableNumber}`, tableNumber || "1", points).run();
    }

    return jsonResponse({ success: true, message: `+${points} points attribués (${reason}) !` });
  }

  // 13. Modération Chat : Liste de tous les messages
  if (pathname === "/api/admin/chat" && method === "GET") {
    if (!db) return jsonResponse([]);
    const { results } = await db.prepare(`
      SELECT * FROM chat_messages 
      ORDER BY created_at DESC 
      LIMIT 100
    `).all();
    return jsonResponse(results || []);
  }

  // 14. Modération Chat : Supprimer un message
  if (pathname.startsWith("/api/admin/chat/") && method === "DELETE") {
    const id = pathname.replace("/api/admin/chat/", "").trim();
    if (db && id) {
      await db.prepare("DELETE FROM chat_messages WHERE id = ?").bind(id).run();
    }
    return jsonResponse({ success: true, id });
  }

  // 15. Modération Chat : Publier une annonce officielle
  if (pathname === "/api/admin/chat/announcement" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const message = (data.message || "").trim();
    const authorName = (data.author_name || "👑 Régie Soirée Royale").trim();
    const isPinned = data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : 1;

    if (!message) return errorResponse("Le message de l'annonce est requis");

    const id = `ann-${Date.now()}`;
    if (db) {
      await db.prepare(`
        INSERT INTO chat_messages (id, event_id, guest_id, guest_name, table_number, message, message_type, is_pinned, is_moderated)
        VALUES (?, 'default', 'admin-host', ?, 'Régie', ?, 'announcement', ?, 1)
      `).bind(id, authorName, message, isPinned).run();
    }

    return jsonResponse({ success: true, id, message: "Annonce officielle publiée !" });
  }

  // 16. Espace Prières : Liste complète avec numéros WhatsApp pour suivi
  if (pathname === "/api/admin/prayers" && method === "GET") {
    if (!db) return jsonResponse([]);
    const { results } = await db.prepare(`
      SELECT * FROM prayer_requests 
      ORDER BY created_at DESC 
      LIMIT 150
    `).all();
    return jsonResponse(results || []);
  }

  // 17. Espace Prières : Supprimer une prière
  if (pathname.startsWith("/api/admin/prayers/") && method === "DELETE") {
    const id = pathname.replace("/api/admin/prayers/", "").trim();
    if (db && id) {
      await db.prepare("DELETE FROM prayer_requests WHERE id = ?").bind(id).run();
    }
    return jsonResponse({ success: true, id });
  }

  // 18. Réseautage : Liste complète des profils VIP
  if (pathname === "/api/admin/networking" && method === "GET") {
    if (!db) return jsonResponse([]);
    const { results } = await db.prepare(`
      SELECT * FROM networking_profiles 
      ORDER BY created_at DESC 
      LIMIT 200
    `).all();
    return jsonResponse(results || []);
  }

  // 19. Réseautage : Supprimer un profil
  if (pathname.startsWith("/api/admin/networking/") && method === "DELETE") {
    const id = pathname.replace("/api/admin/networking/", "").trim();
    if (db && id) {
      await db.prepare("DELETE FROM networking_profiles WHERE id = ?").bind(id).run();
    }
    return jsonResponse({ success: true, id });
  }

  // 20. Contrôle Grand Écran Vidéoprojecteur
  if (pathname === "/api/admin/projector/mode" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const mode = data.mode || "home";
    // Mettre à jour l'événement avec le mode actif du projecteur
    if (db) {
      try {
        await db.prepare("ALTER TABLE events ADD COLUMN projector_mode TEXT DEFAULT 'home'").run();
      } catch (_) {}
      await db.prepare("UPDATE events SET projector_mode = ? WHERE id = 'default'").bind(mode).run();
    }
    return jsonResponse({ success: true, mode, message: `Vidéoprojecteur configuré sur : ${mode}` });
  }

  // 21. Purge des données de test
  if (pathname === "/api/admin/purge-test-data" && method === "POST") {
    if (db) {
      await db.prepare("DELETE FROM chat_messages WHERE id LIKE 'demo-%' OR id LIKE 'msg-%'").run();
      await db.prepare("DELETE FROM prayer_requests WHERE id LIKE 'demo-%' OR id LIKE 'pray-%'").run();
      await db.prepare("DELETE FROM quiz_answers").run();
      await db.prepare("UPDATE quiz_questions SET status = 'ended'").run();
    }
    return jsonResponse({ success: true, message: "Données de test purgées avec succès !" });
  }

  // 22. Activer / Désactiver la fonctionnalité "Direct" côté utilisateur
  if (pathname === "/api/admin/feature/toggle-direct" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const enabled = data.enabled ? 1 : 0;
    if (db) {
      try {
        await db.prepare("ALTER TABLE events ADD COLUMN direct_feature_enabled INTEGER DEFAULT 1").run();
      } catch (_) {}
      await db.prepare("UPDATE events SET direct_feature_enabled = ? WHERE id = 'default'").bind(enabled).run();
    }
    return jsonResponse({
      success: true,
      direct_feature_enabled: enabled,
      message: enabled 
        ? "Fonctionnalité Direct activée côté utilisateur 🔴" 
        : "Direct désactivé : Le Programme interactif est désormais actif 📋"
    });
  }

  // 23. Liste des points du programme pour l'administration
  if (pathname === "/api/admin/program" && method === "GET") {
    let items = [];
    let directEnabled = 1;
    if (db) {
      const eventRow = await db.prepare("SELECT direct_feature_enabled FROM events WHERE id = 'default' LIMIT 1").first().catch(() => null);
      if (eventRow && eventRow.direct_feature_enabled !== null && eventRow.direct_feature_enabled !== undefined) {
        directEnabled = Number(eventRow.direct_feature_enabled);
      }
      const { results } = await db.prepare("SELECT * FROM program_items WHERE event_id = 'default' ORDER BY order_index ASC, start_time ASC").all().catch(() => ({ results: [] }));
      items = results || [];
    }
    return jsonResponse({
      direct_feature_enabled: directEnabled,
      items,
    });
  }

  // 24. Créer ou Mettre à jour un point du programme
  if (pathname === "/api/admin/program/item" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const id = data.id || `prog-${Date.now()}`;
    const start_time = (data.start_time || "16:00").trim();
    const end_time = (data.end_time || "17:00").trim();
    const title = (data.title || "").trim();
    const speaker = (data.speaker || "").trim();
    const description = (data.description || "").trim();
    const order_index = parseInt(data.order_index, 10) || 1;

    if (!title) {
      return errorResponse("Le titre du créneau du programme est obligatoire");
    }

    if (db) {
      await db.prepare(`
        INSERT INTO program_items (id, event_id, start_time, end_time, title, speaker, description, order_index)
        VALUES (?, 'default', ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          title = excluded.title,
          speaker = excluded.speaker,
          description = excluded.description,
          order_index = excluded.order_index
      `).bind(id, start_time, end_time, title, speaker, description, order_index).run();
    }

    return jsonResponse({
      success: true,
      item: { id, start_time, end_time, title, speaker, description, order_index },
      message: "Point du programme enregistré !"
    });
  }

  // 25. Supprimer un point du programme
  if (pathname.startsWith("/api/admin/program/item/") && method === "DELETE") {
    const id = pathname.replace("/api/admin/program/item/", "").trim();
    if (db && id) {
      await db.prepare("DELETE FROM program_items WHERE id = ?").bind(id).run();
    }
    return jsonResponse({ success: true, id, message: "Créneau retiré du programme" });
  }

  // 26. Réinitialiser au programme officiel du Dîner de Gala
  if (pathname === "/api/admin/program/reset-default" && method === "POST") {
    if (db) {
      await db.prepare("DELETE FROM program_items WHERE event_id = 'default'").run();
      await db.prepare(`
        INSERT INTO program_items (id, event_id, start_time, end_time, title, speaker, description, order_index)
        VALUES 
        ('prog-1', 'default', '16:00', '17:00', 'Accueil des invités & Cocktail de bienvenue', 'Équipe d''accueil', 'Cocktail de bienvenue et installation conviviale', 1),
        ('prog-2', 'default', '17:00', '17:15', 'Ouverture officielle & Mot de bienvenue', 'Avec remerciement à la salle Le Rocher des Âges', 'Cérémonie d''ouverture et allocution d''accueil', 2),
        ('prog-3', 'default', '17:15', '17:45', 'Prestation artistique & témoignage inspirant', 'Artistes invités', 'Chants, louange et témoignages poignants', 3),
        ('prog-4', 'default', '17:45', '18:05', 'Message principal (20 min)', 'Pasteur KAMZOLES Charly Ingénu', 'Exhortation solennelle et vision d''excellence', 4),
        ('prog-5', 'default', '18:05', '18:20', 'Présentation des ouvrages & Dédicace', 'Pasteur KAMZOLES', 'Présentation spéciale des livres et signatures d''auteurs', 5),
        ('prog-6', 'default', '18:20', '19:15', 'Dîner convivial', 'La table des livres reste ouverte pendant le repas', 'Service du repas gastronomique et échanges fraternels', 6),
        ('prog-7', 'default', '19:15', '19:45', 'Prestation artistique & témoignage', 'Artistes invités', 'Deuxième partie musicale et partages d''impact', 7),
        ('prog-8', 'default', '19:45', '20:30', 'Duo artistique de clôture', 'Artistes invités', 'Prestation finale en duo et bénédiction de clôture', 8)
      `).run();
    }
    return jsonResponse({ success: true, message: "Programme réinitialisé au programme officiel du Gala !" });
  }

  // 27. Régie Publicitaire : Liste de toutes les annonces & statistiques
  if (pathname === "/api/admin/ads" && method === "GET") {
    if (!db) return jsonResponse([]);
    const { results } = await db.prepare("SELECT * FROM ads_sponsors WHERE event_id = 'default' ORDER BY order_index ASC").all().catch(() => ({ results: [] }));
    return jsonResponse(results || []);
  }

  // 28. Régie Publicitaire : Créer ou Mettre à jour une annonce
  if (pathname === "/api/admin/ads/item" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const id = data.id || `ad-${Date.now()}`;
    const title = (data.title || "").trim();
    const brand = (data.brand || "").trim();
    const tagline = (data.tagline || "").trim();
    const description = (data.description || "").trim();
    const image_url = (data.image_url || "").trim();
    const image_data = data.image_data || "";
    const redirect_url = (data.redirect_url || "").trim();
    const theme_color = data.theme_color || "peach";
    const icon_emoji = data.icon_emoji || "🛍️";
    const price_tag = (data.price_tag || "").trim();
    const is_active = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;
    const order_index = parseInt(data.order_index, 10) || 1;

    if (!title) return errorResponse("Le titre de l'annonce ou du produit est requis");

    if (db) {
      await db.prepare(`
        INSERT INTO ads_sponsors (id, event_id, title, brand, tagline, description, image_url, image_data, redirect_url, theme_color, icon_emoji, price_tag, is_active, order_index)
        VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          brand = excluded.brand,
          tagline = excluded.tagline,
          description = excluded.description,
          image_url = excluded.image_url,
          image_data = excluded.image_data,
          redirect_url = excluded.redirect_url,
          theme_color = excluded.theme_color,
          icon_emoji = excluded.icon_emoji,
          price_tag = excluded.price_tag,
          is_active = excluded.is_active,
          order_index = excluded.order_index
      `).bind(id, title, brand, tagline, description, image_url, image_data, redirect_url, theme_color, icon_emoji, price_tag, is_active, order_index).run();
    }

    return jsonResponse({ success: true, message: "Espace publicitaire enregistré avec succès !" });
  }

  // 29. Régie Publicitaire : Supprimer une annonce
  if (pathname.startsWith("/api/admin/ads/item/") && method === "DELETE") {
    const id = pathname.replace("/api/admin/ads/item/", "").trim();
    if (db && id) {
      await db.prepare("DELETE FROM ads_sponsors WHERE id = ?").bind(id).run();
    }
    return jsonResponse({ success: true, id, message: "Annonce retirée." });
  }

  // 30. Régie Publicitaire : Remise à zéro des statistiques
  if (pathname.startsWith("/api/admin/ads/reset-stats/") && method === "POST") {
    const id = pathname.replace("/api/admin/ads/reset-stats/", "").trim();
    if (db && id) {
      await db.prepare("UPDATE ads_sponsors SET views_count = 0, clicks_count = 0 WHERE id = ?").bind(id).run();
    }
    return jsonResponse({ success: true, message: "Statistiques remises à zéro." });
  }

  return null;
}
