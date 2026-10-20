/**
 * COMPAGNON DE CÉRÉMONIE - Routes Prières & Vœux de Bénédiction
 * Supporte la confidentialité privée, le numéro WhatsApp pour suivi pastoral
 * et l'espace "Mes requêtes de prière".
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { getMockPrayers } from "../utils/mocks.js";

export async function handlePrayerRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;

  // 1. "Mes requêtes de prière" (Consultation personnelle de l'invité)
  if (pathname === "/api/prayers/my" && method === "GET") {
    const url = new URL(request.url);
    const guestId = url.searchParams.get("guest_id");
    if (!guestId) return jsonResponse([]);
    if (!db) return jsonResponse(getMockPrayers());

    const { results } = await db.prepare(`
      SELECT * FROM prayer_requests 
      WHERE guest_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `).bind(guestId).all();

    return jsonResponse(results || []);
  }

  // 2. Liste publique des prières et bénédictions (filtre celles marquées publiques ou de grâce)
  if (pathname === "/api/prayers" && method === "GET") {
    if (!db) return jsonResponse(getMockPrayers());
    try {
      const { results } = await db.prepare(`
        SELECT id, event_id, author_name, table_number, is_anonymous, category, title, content, prayer_count, created_at 
        FROM prayer_requests 
        WHERE is_moderated = 1 AND (is_private = 0 OR category = 'benediction' OR category = 'grace')
        ORDER BY created_at DESC 
        LIMIT 40
      `).all();
      return jsonResponse(results || []);
    } catch (_) {
      const { results } = await db.prepare(`
        SELECT id, event_id, author_name, table_number, is_anonymous, category, title, content, prayer_count, created_at 
        FROM prayer_requests 
        WHERE is_moderated = 1
        ORDER BY created_at DESC 
        LIMIT 40
      `).all();
      return jsonResponse(results || []);
    }
  }

  // 3. Déposer un sujet de prière ou une bénédiction
  if (pathname === "/api/prayers" && method === "POST") {
    const data = await request.json();
    const id = `pray-${Date.now()}`;
    const guestId = data.guest_id || "guest-anon";
    const authorName = (data.author_name || "Frère / Sœur").trim();
    const tableNumber = (data.table_number || "").trim();
    const isAnonymous = data.is_anonymous ? 1 : 0;
    const category = data.category || "priere";
    const title = (data.title || "Sujet de prière").trim();
    const content = (data.content || "").trim();
    const whatsapp = (data.whatsapp || "").trim();
    const isPrivate = data.is_private !== undefined ? (data.is_private ? 1 : 0) : 1;

    if (!content) {
      return errorResponse("Le contenu de la prière est obligatoire");
    }

    if (db) {
      try {
        // Tenter d'insérer avec les colonnes complètes (whatsapp, is_private)
        await db.prepare(`
          INSERT INTO prayer_requests (id, event_id, guest_id, author_name, table_number, is_anonymous, category, title, content, whatsapp, is_private, prayer_count, is_moderated)
          VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
        `).bind(id, guestId, authorName, tableNumber, isAnonymous, category, title, content, whatsapp, isPrivate).run();
      } catch (insertErr) {
        // Si les colonnes whatsapp / is_private manquent dans D1, tenter de les ajouter dynamiquement
        try {
          await db.prepare("ALTER TABLE prayer_requests ADD COLUMN whatsapp TEXT").run();
        } catch (_) {}
        try {
          await db.prepare("ALTER TABLE prayer_requests ADD COLUMN is_private INTEGER DEFAULT 1").run();
        } catch (_) {}

        try {
          // Re-tenter après migration
          await db.prepare(`
            INSERT INTO prayer_requests (id, event_id, guest_id, author_name, table_number, is_anonymous, category, title, content, whatsapp, is_private, prayer_count, is_moderated)
            VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
          `).bind(id, guestId, authorName, tableNumber, isAnonymous, category, title, content, whatsapp, isPrivate).run();
        } catch (fallbackErr) {
          // Fallback sur le schéma initial sans whatsapp ni is_private
          const enrichedContent = whatsapp ? `${content}\n(WhatsApp: ${whatsapp})` : content;
          await db.prepare(`
            INSERT INTO prayer_requests (id, event_id, guest_id, author_name, table_number, is_anonymous, category, title, content, prayer_count, is_moderated)
            VALUES (?, 'default', ?, ?, ?, ?, ?, ?, ?, 1, 1)
          `).bind(id, guestId, authorName, tableNumber, isAnonymous, category, title, enrichedContent).run();
        }
      }
    }

    return jsonResponse({
      id,
      author_name: authorName,
      title,
      content,
      category,
      whatsapp,
      is_private: isPrivate,
      prayer_count: 1,
      created_at: new Date().toISOString(),
    });
  }

  // 4. Soutenir dans la prière ("Amen / Je m'associe")
  if (pathname.startsWith("/api/prayers/") && pathname.endsWith("/support") && method === "POST") {
    const parts = pathname.split("/");
    const requestId = parts[3];
    const data = await request.json();
    const guestId = data.guest_id || `guest-${Date.now()}`;
    const id = `supp-${Date.now()}`;

    if (db) {
      try {
        await db.prepare("INSERT INTO prayer_supports (id, request_id, guest_id) VALUES (?, ?, ?)")
          .bind(id, requestId, guestId).run();
        await db.prepare("UPDATE prayer_requests SET prayer_count = prayer_count + 1 WHERE id = ?")
          .bind(requestId).run();
      } catch (e) {
        // Déjà soutenu
      }

      const req = await db.prepare("SELECT prayer_count FROM prayer_requests WHERE id = ?").bind(requestId).first();
      return jsonResponse({ success: true, prayer_count: req ? req.prayer_count : 1 });
    }

    return jsonResponse({ success: true, prayer_count: 5 });
  }

  return null;
}
