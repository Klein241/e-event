/**
 * COMPAGNON DE CÉRÉMONIE - Routes Administrateur & Backoffice Régie
 * Toutes les fonctionnalités de gestion en direct prêtes pour la production
 */

import { jsonResponse, errorResponse } from "../utils/response.js";

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
        event: eventRow || {
          id: "default",
          name: env.EVENT_NAME || "Compagnon de Cérémonie",
          subtitle: "Compagnon Interactif",
          venue: "Salle Principale",
          is_active: 1,
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

  // 4. Liste complète des invités
  if (pathname === "/api/admin/guests" && method === "GET") {
    if (!db) return jsonResponse([]);
    const { results } = await db.prepare(`
      SELECT g.*, coalesce(SUM(qa.points_awarded), 0) as points
      FROM guests g
      LEFT JOIN quiz_answers qa ON qa.guest_id = g.id AND qa.is_correct = 1
      GROUP BY g.id
      ORDER BY g.created_at DESC
      LIMIT 200
    `).all();
    return jsonResponse(results || []);
  }

  // 5. Supprimer un invité
  if (pathname.startsWith("/api/admin/guests/") && method === "DELETE") {
    const id = pathname.replace("/api/admin/guests/", "").trim();
    if (db && id) {
      await db.prepare("DELETE FROM guests WHERE id = ?").bind(id).run();
    }
    return jsonResponse({ success: true, id });
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

  return null;
}
