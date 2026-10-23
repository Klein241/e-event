/**
 * COMPAGNON DE CÉRÉMONIE - Routes Hôtesses & Émargement en Salle
 * Gestion autonome des hôtesses, filtrage par tables et validation des entrées en temps réel
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { invalidateAdminCache } from "./admin.js";
import { FALLBACK_GUESTS } from "../cached_guests.js";

let cachedHostessData = null;
let cachedHostessDataTime = 0;

export function invalidateHostessCache() {
  cachedHostessData = null;
  cachedHostessDataTime = 0;
}

export async function handleHostessRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;
  const now = Date.now();

  // 1. GET /api/hostess/guests ou /api/hostess/data - Données complètes pour l'interface hôtesse
  if ((pathname === "/api/hostess/guests" || pathname === "/api/hostess/data") && method === "GET") {
    // Si en cache depuis moins de 8 secondes, retourner le cache
    if (cachedHostessData && (now - cachedHostessDataTime < 8000)) {
      return jsonResponse(cachedHostessData);
    }

    if (!db) {
      return jsonResponse({
        guests: FALLBACK_GUESTS.map(g => ({
          ...g,
          is_arrived: g.is_arrived || 0,
          arrived_at: g.arrived_at || null
        })),
        tables: [],
        hostesses: [],
        stats: { total: FALLBACK_GUESTS.length, arrived: 0, pending: FALLBACK_GUESTS.length, rate: 0 }
      });
    }

    try {
      const [guestsRes, tablesRes, hostessesRes] = await Promise.all([
        db.prepare(`
          SELECT 
            id,
            name,
            table_number,
            avatar_emoji,
            photo_url,
            phone,
            profession,
            company,
            residence_location,
            invited_by,
            registration_source,
            gender,
            ticket_type,
            partner_name,
            couple_name,
            COALESCE(is_arrived, 0) as is_arrived,
            arrived_at,
            COALESCE(is_evangelized, 0) as is_evangelized,
            created_at
          FROM guests
          ORDER BY name ASC
        `).all().catch(() => ({ results: [] })),

        db.prepare(`
          SELECT table_code, capacity
          FROM event_tables
          ORDER BY table_code ASC
        `).all().catch(() => ({ results: [] })),

        db.prepare(`
          SELECT id, name, code, phone, assigned_tables, is_active, created_at
          FROM hostesses
          ORDER BY name ASC
        `).all().catch(() => ({ results: [] }))
      ]);

      let guests = (guestsRes?.results && guestsRes.results.length > 0)
        ? guestsRes.results
        : (cachedHostessData?.guests && cachedHostessData.guests.length > 0)
          ? cachedHostessData.guests
          : FALLBACK_GUESTS.map(g => ({
              ...g,
              is_arrived: g.is_arrived || 0,
              arrived_at: g.arrived_at || null
            }));

      // Calcul ultra-rapide des totaux par table en mémoire (évite le lourd scan Cartesian de D1)
      const tableCounts = {};
      const tableArrived = {};
      guests.forEach(g => {
        const raw = (g.table_number || '1').toUpperCase().replace(/^TABLE\s*/i, '').trim();
        tableCounts[raw] = (tableCounts[raw] || 0) + 1;
        if (Number(g.is_arrived) === 1) {
          tableArrived[raw] = (tableArrived[raw] || 0) + 1;
        }
      });

      const dbTables = tablesRes?.results || [];
      const tablesMap = new Map();
      dbTables.forEach(t => {
        const code = (t.table_code || '').toUpperCase().trim();
        if (code) {
          tablesMap.set(code, {
            table_code: code,
            capacity: t.capacity || 10,
            guest_count: tableCounts[code] || 0,
            arrived_count: tableArrived[code] || 0
          });
        }
      });

      // S'assurer que toutes les tables avec invités sont présentes dans la liste
      Object.keys(tableCounts).forEach(code => {
        if (!tablesMap.has(code)) {
          tablesMap.set(code, {
            table_code: code,
            capacity: 10,
            guest_count: tableCounts[code] || 0,
            arrived_count: tableArrived[code] || 0
          });
        }
      });

      const tables = Array.from(tablesMap.values()).sort((a, b) => {
        return a.table_code.localeCompare(b.table_code, 'fr', { numeric: true });
      });

      const hostesses = hostessesRes?.results || [];

      const total = guests.length;
      const arrived = guests.filter(g => Number(g.is_arrived) === 1).length;
      const pending = total - arrived;
      const rate = total > 0 ? Math.round((arrived / total) * 100) : 0;

      const payload = {
        guests,
        tables,
        hostesses,
        stats: { total, arrived, pending, rate }
      };

      cachedHostessData = payload;
      cachedHostessDataTime = now;
      return jsonResponse(payload);
    } catch (err) {
      console.error("Erreur récupération hôtesse data:", err);
      const fallbackGuests = FALLBACK_GUESTS.map(g => ({
        ...g,
        is_arrived: g.is_arrived || 0,
        arrived_at: g.arrived_at || null
      }));
      return jsonResponse(cachedHostessData || {
        guests: fallbackGuests,
        tables: [],
        hostesses: [],
        stats: { total: fallbackGuests.length, arrived: 0, pending: fallbackGuests.length, rate: 0 }
      });
    }
  }

  // 2. POST /api/hostess/checkin - Valider ou annuler l'entrée d'un invité
  if (pathname === "/api/hostess/checkin" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const guestId = (data.guest_id || "").trim();
    const isArrived = data.is_arrived ? 1 : 0;
    const hostessName = (data.hostess_name || "Hôtesse Accueil").trim();

    if (!guestId) {
      return errorResponse("L'identifiant de l'invité est obligatoire", 400);
    }

    if (db) {
      try {
        await db.prepare(`
          UPDATE guests SET
            is_arrived = ?,
            arrived_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END,
            last_active = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(isArrived, isArrived, guestId).run();
      } catch (err) {
        console.warn("Avertissement enregistrement émargement D1 (fallback mémoire):", err.message);
      }
    }

    // Mettre à jour l'état de l'invité en mémoire dans le snapshot
    const targetGuest = (cachedHostessData?.guests || FALLBACK_GUESTS).find(g => g.id === guestId);
    if (targetGuest) {
      targetGuest.is_arrived = isArrived;
      targetGuest.arrived_at = isArrived ? new Date().toISOString() : null;
    }
    invalidateHostessCache();
    invalidateAdminCache();

    return jsonResponse({
      success: true,
      guest_id: guestId,
      is_arrived: isArrived,
      arrived_at: isArrived ? new Date().toISOString() : null,
      hostess_name: hostessName,
      message: isArrived ? "Invité validé avec succès !" : "Émargement annulé"
    });
  }

  // 3. GET /api/hostess/list - Liste des hôtesses
  if (pathname === "/api/hostess/list" && method === "GET") {
    if (!db) return jsonResponse([]);
    try {
      const { results } = await db.prepare("SELECT * FROM hostesses ORDER BY created_at DESC").all();
      return jsonResponse(results || []);
    } catch (err) {
      return jsonResponse([]);
    }
  }

  // 4. POST /api/hostess/create - Création d'une hôtesse
  if (pathname === "/api/hostess/create" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const name = (data.name || "").trim();
    const phone = (data.phone || "").trim();
    const assignedTables = (data.assigned_tables || "ALL").trim();

    if (!name) return errorResponse("Le nom de l'hôtesse est requis", 400);

    const code = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `hotesse-${Date.now().toString(36)}`;

    const id = `hostess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    if (db) {
      try {
        await db.prepare(`
          INSERT INTO hostesses (id, event_id, name, code, phone, assigned_tables, is_active)
          VALUES (?, 'default', ?, ?, ?, ?, 1)
        `).bind(id, name, code, phone, assignedTables).run();

        invalidateHostessCache();
      } catch (err) {
        return errorResponse("Erreur création hôtesse: " + err.message, 500);
      }
    }

    return jsonResponse({
      success: true,
      hostess: { id, name, code, phone, assigned_tables: assignedTables }
    });
  }

  // 5. DELETE /api/hostess/:id - Suppression d'une hôtesse
  const deleteMatch = pathname.match(/^\/api\/hostess\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const id = deleteMatch[1];
    if (db) {
      await db.prepare("DELETE FROM hostesses WHERE id = ?").bind(id).run().catch(() => {});
      invalidateHostessCache();
    }
    return jsonResponse({ success: true, message: "Hôtesse supprimée" });
  }

  return null;
}
