/**
 * COMPAGNON DE CÉRÉMONIE - Routes Superviseur & Évangélisation
 * Gestion des notes épinglées, des invités sans billet et des fiches d'évangélisation
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { invalidateAdminCache } from "./admin.js";
import { invalidateHostessCache } from "./hostess.js";
import { FALLBACK_GUESTS } from "../cached_guests.js";

// Cache mémoire court pour la note épinglée (5s)
let cachedPinnedNote = null;
let cachedPinnedNoteTime = 0;

export function invalidatePinnedNoteCache() {
  cachedPinnedNote = null;
  cachedPinnedNoteTime = 0;
}

export async function handleSupervisorRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;
  const now = Date.now();

  // -------------------------------------------------------------
  // 1. GET /api/shared/pinned-note - Note épinglée active
  // -------------------------------------------------------------
  if (pathname === "/api/shared/pinned-note" && method === "GET") {
    if (cachedPinnedNote !== null && (now - cachedPinnedNoteTime < 5000)) {
      return jsonResponse({ note: cachedPinnedNote });
    }

    if (!db) {
      return jsonResponse({ note: cachedPinnedNote });
    }

    try {
      // S'assurer que la table existe
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS pinned_notes (
            id TEXT PRIMARY KEY,
            event_id TEXT NOT NULL DEFAULT 'default',
            content TEXT NOT NULL,
            author TEXT DEFAULT 'Régie Admin',
            target_role TEXT DEFAULT 'ALL',
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run().catch(() => {});

      const note = await db.prepare(
        "SELECT id, content, author, is_active, updated_at FROM pinned_notes WHERE event_id = 'default' AND is_active = 1 ORDER BY updated_at DESC LIMIT 1"
      ).first().catch(() => null);

      cachedPinnedNote = note || null;
      cachedPinnedNoteTime = now;
      return jsonResponse({ note: cachedPinnedNote });
    } catch (err) {
      console.warn("Erreur lecture pinned note:", err);
      return jsonResponse({ note: cachedPinnedNote });
    }
  }

  // -------------------------------------------------------------
  // 2. POST /api/admin/pinned-note - Créer ou mettre à jour la note épinglée
  // -------------------------------------------------------------
  if (pathname === "/api/admin/pinned-note" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const content = (data.content || "").trim();
    const author = (data.author || "Régie Admin").trim();
    const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;

    if (!content && isActive) {
      return errorResponse("Le texte de la note ne peut pas être vide", 400);
    }

    const noteId = `note-${Date.now().toString(36)}`;

    if (db) {
      try {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS pinned_notes (
              id TEXT PRIMARY KEY,
              event_id TEXT NOT NULL DEFAULT 'default',
              content TEXT NOT NULL,
              author TEXT DEFAULT 'Régie Admin',
              target_role TEXT DEFAULT 'ALL',
              is_active INTEGER DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run().catch(() => {});

        // Désactiver les anciennes notes si on en active une nouvelle
        if (isActive) {
          await db.prepare("UPDATE pinned_notes SET is_active = 0 WHERE event_id = 'default'").run().catch(() => {});
        }

        if (content) {
          await db.prepare(`
            INSERT INTO pinned_notes (id, event_id, content, author, is_active, updated_at)
            VALUES (?, 'default', ?, ?, ?, CURRENT_TIMESTAMP)
          `).bind(noteId, content, author, isActive).run();
        }
      } catch (err) {
        console.error("Erreur écriture pinned note D1:", err);
      }
    }

    cachedPinnedNote = isActive && content ? { id: noteId, content, author, is_active: isActive, updated_at: new Date().toISOString() } : null;
    cachedPinnedNoteTime = now;
    invalidateAdminCache();

    return jsonResponse({
      success: true,
      note: cachedPinnedNote,
      message: isActive ? "Note épinglée avec succès !" : "Note masquée"
    });
  }

  // -------------------------------------------------------------
  // 3. DELETE /api/admin/pinned-note - Retirer la note épinglée
  // -------------------------------------------------------------
  if (pathname === "/api/admin/pinned-note" && method === "DELETE") {
    if (db) {
      await db.prepare("UPDATE pinned_notes SET is_active = 0 WHERE event_id = 'default'").run().catch(() => {});
    }
    cachedPinnedNote = null;
    cachedPinnedNoteTime = now;
    invalidateAdminCache();
    return jsonResponse({ success: true, message: "Note retirée" });
  }

  // -------------------------------------------------------------
  // 4. POST /api/hostess/unregistered - Enregistrement d'un invité SANS BILLET par l'hôtesse
  // -------------------------------------------------------------
  if (pathname === "/api/hostess/unregistered" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const name = (data.name || "").trim();
    const gender = (data.gender || "M").toUpperCase().trim(); // 'M' ou 'F'
    const ticketType = (data.ticket_type || "seul").toLowerCase().trim(); // 'seul' ou 'couple'
    const coupleName = (data.couple_name || "").trim();
    const partnerName = (data.partner_name || "").trim();
    const isEvangelized = data.is_evangelized ? 1 : 0;
    const tableNumber = (data.table_number || "1").toUpperCase().replace(/^TABLE\s*/i, "").trim() || "1";
    const phone = (data.phone || "0").trim();
    const residenceLocation = (data.residence_location || "").trim();
    const profession = (data.profession || "").trim();
    const hostessName = (data.hostess_name || "Hôtesse Accueil").trim();

    if (!name) {
      return errorResponse("Le nom de l'invité est obligatoire", 400);
    }

    // Génération identifiant unique propre
    const cleanName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 18) || 'invite';
    const rand = Math.random().toString(36).substring(2, 6);
    const guestId = `billet-sansbillet-${cleanName}-${rand}`;
    const avatarEmoji = gender === 'F' ? '👩' : '👨';

    if (db) {
      try {
        // Garantir que les colonnes complémentaires existent
        await db.prepare("ALTER TABLE guests ADD COLUMN is_evangelized INTEGER DEFAULT 0").run().catch(() => {});
        await db.prepare("ALTER TABLE guests ADD COLUMN evangelized_at DATETIME").run().catch(() => {});
        await db.prepare("ALTER TABLE guests ADD COLUMN evangelized_by TEXT").run().catch(() => {});

        await db.prepare(`
          INSERT INTO guests (
            id, event_id, name, table_number, phone, invited_by,
            registration_source, gender, ticket_type, partner_name, couple_name,
            avatar_emoji, profession, residence_location,
            is_arrived, arrived_at, is_evangelized, evangelized_at, evangelized_by, last_active
          ) VALUES (
            ?, 'default', ?, ?, ?, ?,
            'sans_billet', ?, ?, ?, ?,
            ?, ?, ?,
            1, CURRENT_TIMESTAMP, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, ?, CURRENT_TIMESTAMP
          )
        `).bind(
          guestId,
          name,
          tableNumber,
          phone,
          `Accueil : ${hostessName}`,
          gender,
          ticketType,
          partnerName || null,
          coupleName || null,
          avatarEmoji,
          profession || null,
          residenceLocation || null,
          isEvangelized,
          isEvangelized,
          isEvangelized ? hostessName : null
        ).run();

        // Assurer que la table est déclarée
        await db.prepare("INSERT OR IGNORE INTO event_tables (id, table_code, capacity) VALUES (?, ?, 10)").bind(`tbl-${tableNumber}`, tableNumber).run().catch(() => {});
      } catch (err) {
        console.error("Erreur insertion invité sans billet D1:", err);
        return errorResponse("Erreur enregistrement invité: " + err.message, 500);
      }
    }

    // Mise à jour de la mémoire secours
    const newGuest = {
      id: guestId,
      event_id: "default",
      name,
      table_number: tableNumber,
      phone,
      invited_by: `Accueil : ${hostessName}`,
      registration_source: "sans_billet",
      gender,
      ticket_type: ticketType,
      partner_name: partnerName,
      couple_name: coupleName,
      avatar_emoji: avatarEmoji,
      profession,
      residence_location: residenceLocation,
      is_arrived: 1,
      arrived_at: new Date().toISOString(),
      is_evangelized: isEvangelized,
      evangelized_at: isEvangelized ? new Date().toISOString() : null,
      evangelized_by: isEvangelized ? hostessName : null,
      created_at: new Date().toISOString()
    };

    FALLBACK_GUESTS.unshift(newGuest);
    invalidateHostessCache();
    invalidateAdminCache();

    return jsonResponse({
      success: true,
      guest: newGuest,
      message: `Invité ${name} enregistré avec succès (Sans Billet - Table ${tableNumber}) !`
    });
  }

  // -------------------------------------------------------------
  // 5. GET /api/supervisor/guests - Invités & statut évangélisation pour le superviseur
  // -------------------------------------------------------------
  if (pathname === "/api/supervisor/guests" && method === "GET") {
    if (!db) {
      const sansBilletGuests = FALLBACK_GUESTS.filter(g => g.registration_source === 'sans_billet');
      return jsonResponse({
        guests: FALLBACK_GUESTS,
        sans_billet_count: sansBilletGuests.length,
        evangelized_count: FALLBACK_GUESTS.filter(g => Number(g.is_evangelized) === 1).length,
        pending_count: FALLBACK_GUESTS.filter(g => Number(g.is_evangelized) !== 1).length
      });
    }

    try {
      // S'assurer que les tables et colonnes existent
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS evangelization_records (
            id TEXT PRIMARY KEY,
            event_id TEXT NOT NULL DEFAULT 'default',
            guest_id TEXT NOT NULL,
            full_name TEXT NOT NULL,
            residence_location TEXT,
            attends_church INTEGER DEFAULT 0,
            church_name TEXT,
            church_no_reason TEXT,
            is_baptized INTEGER DEFAULT 0,
            baptism_date TEXT,
            baptism_no_reason TEXT,
            last_church_attended TEXT,
            phone TEXT,
            profession TEXT,
            spiritual_decision TEXT,
            notes TEXT,
            supervisor_name TEXT DEFAULT 'Superviseur',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run().catch(() => {});

      const { results } = await db.prepare(`
        SELECT 
          g.id,
          g.name,
          g.table_number,
          g.avatar_emoji,
          g.photo_url,
          g.phone,
          g.profession,
          g.residence_location,
          g.invited_by,
          g.registration_source,
          g.gender,
          g.ticket_type,
          g.partner_name,
          g.couple_name,
          COALESCE(g.is_arrived, 0) as is_arrived,
          g.arrived_at,
          COALESCE(g.is_evangelized, 0) as is_evangelized,
          g.evangelized_at,
          g.evangelized_by,
          g.created_at,
          er.id as evangelization_record_id,
          er.spiritual_decision,
          er.church_name,
          er.supervisor_name
        FROM guests g
        LEFT JOIN evangelization_records er ON er.guest_id = g.id
        ORDER BY 
          CASE WHEN g.registration_source = 'sans_billet' THEN 0 ELSE 1 END,
          g.created_at DESC
      `).all().catch(() => ({ results: [] }));

      const guests = results || [];
      const arrivedList = guests.filter(g => Number(g.is_arrived) === 1);
      const sansBilletList = guests.filter(g => g.registration_source === 'sans_billet');
      const evangelizedCount = guests.filter(g => Number(g.is_evangelized) === 1).length;
      const pendingCount = guests.length - evangelizedCount;

      return jsonResponse({
        guests,
        stats: {
          total: guests.length,
          arrived: arrivedList.length,
          sans_billet: sansBilletList.length,
          evangelized: evangelizedCount,
          pending: pendingCount
        }
      });
    } catch (err) {
      console.error("Erreur récupération invités superviseur:", err);
      return jsonResponse({
        guests: FALLBACK_GUESTS,
        stats: {
          total: FALLBACK_GUESTS.length,
          sans_billet: FALLBACK_GUESTS.filter(g => g.registration_source === 'sans_billet').length,
          evangelized: 0,
          pending: FALLBACK_GUESTS.length
        }
      });
    }
  }

  // -------------------------------------------------------------
  // 6. GET /api/supervisor/evangelization/:guestId - Fiche d'évangélisation d'un invité
  // -------------------------------------------------------------
  const evangGetMatch = pathname.match(/^\/api\/supervisor\/evangelization\/([^/]+)$/);
  if (evangGetMatch && method === "GET") {
    const guestId = evangGetMatch[1];
    if (!db) return jsonResponse({ record: null });

    try {
      const record = await db.prepare(
        "SELECT * FROM evangelization_records WHERE guest_id = ? ORDER BY created_at DESC LIMIT 1"
      ).bind(guestId).first().catch(() => null);

      return jsonResponse({ record: record || null });
    } catch (err) {
      return jsonResponse({ record: null });
    }
  }

  // -------------------------------------------------------------
  // 7. POST /api/supervisor/evangelization - Enregistrer la Fiche d'Évangélisation
  // -------------------------------------------------------------
  if (pathname === "/api/supervisor/evangelization" && method === "POST") {
    const data = await request.json().catch(() => ({}));
    const guestId = (data.guest_id || "").trim();
    const fullName = (data.full_name || "").trim();
    const residenceLocation = (data.residence_location || "").trim();
    const attendsChurch = data.attends_church ? 1 : 0;
    const churchName = (data.church_name || "").trim();
    const churchNoReason = (data.church_no_reason || "").trim();
    const isBaptized = data.is_baptized ? 1 : 0;
    const baptismDate = (data.baptism_date || "").trim();
    const baptismNoReason = (data.baptism_no_reason || "").trim();
    const lastChurchAttended = (data.last_church_attended || "").trim();
    const phone = (data.phone || "").trim();
    const profession = (data.profession || "").trim();
    const spiritualDecision = (data.spiritual_decision || "acceptation_christ").trim();
    const notes = (data.notes || "").trim();
    const supervisorName = (data.supervisor_name || "Superviseur").trim();

    if (!guestId) {
      return errorResponse("L'identifiant de l'invité (guest_id) est obligatoire", 400);
    }

    const recordId = `evang-${guestId}-${Date.now().toString(36)}`;

    if (db) {
      try {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS evangelization_records (
              id TEXT PRIMARY KEY,
              event_id TEXT NOT NULL DEFAULT 'default',
              guest_id TEXT NOT NULL,
              full_name TEXT NOT NULL,
              residence_location TEXT,
              attends_church INTEGER DEFAULT 0,
              church_name TEXT,
              church_no_reason TEXT,
              is_baptized INTEGER DEFAULT 0,
              baptism_date TEXT,
              baptism_no_reason TEXT,
              last_church_attended TEXT,
              phone TEXT,
              profession TEXT,
              spiritual_decision TEXT,
              notes TEXT,
              supervisor_name TEXT DEFAULT 'Superviseur',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run().catch(() => {});

        // Insérer ou mettre à jour la fiche
        await db.prepare(`
          INSERT INTO evangelization_records (
            id, event_id, guest_id, full_name, residence_location,
            attends_church, church_name, church_no_reason,
            is_baptized, baptism_date, baptism_no_reason,
            last_church_attended, phone, profession,
            spiritual_decision, notes, supervisor_name, updated_at
          ) VALUES (
            ?, 'default', ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, CURRENT_TIMESTAMP
          )
          ON CONFLICT(id) DO UPDATE SET
            residence_location = excluded.residence_location,
            attends_church = excluded.attends_church,
            church_name = excluded.church_name,
            church_no_reason = excluded.church_no_reason,
            is_baptized = excluded.is_baptized,
            baptism_date = excluded.baptism_date,
            baptism_no_reason = excluded.baptism_no_reason,
            last_church_attended = excluded.last_church_attended,
            phone = excluded.phone,
            profession = excluded.profession,
            spiritual_decision = excluded.spiritual_decision,
            notes = excluded.notes,
            supervisor_name = excluded.supervisor_name,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          recordId, guestId, fullName, residenceLocation,
          attendsChurch, churchName, churchNoReason,
          isBaptized, baptismDate, baptismNoReason,
          lastChurchAttended, phone, profession,
          spiritualDecision, notes, supervisorName
        ).run();

        // Mettre à jour l'invité dans la table guests : is_evangelized = 1
        await db.prepare(`
          UPDATE guests SET
            is_evangelized = 1,
            evangelized_at = CURRENT_TIMESTAMP,
            evangelized_by = ?,
            residence_location = COALESCE(NULLIF(?, ''), residence_location),
            phone = COALESCE(NULLIF(?, ''), phone),
            profession = COALESCE(NULLIF(?, ''), profession),
            last_active = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(supervisorName, residenceLocation, phone, profession, guestId).run();

      } catch (err) {
        console.error("Erreur enregistrement fiche évangélisation D1:", err);
        return errorResponse("Erreur enregistrement de la fiche: " + err.message, 500);
      }
    }

    // Mettre à jour dans FALLBACK_GUESTS
    const target = FALLBACK_GUESTS.find(g => g.id === guestId);
    if (target) {
      target.is_evangelized = 1;
      target.evangelized_at = new Date().toISOString();
      target.evangelized_by = supervisorName;
      if (residenceLocation) target.residence_location = residenceLocation;
      if (phone) target.phone = phone;
      if (profession) target.profession = profession;
    }

    invalidateHostessCache();
    invalidateAdminCache();

    return jsonResponse({
      success: true,
      guest_id: guestId,
      record_id: recordId,
      message: `Fiche d'Évangélisation enregistrée pour ${fullName || 'l\'invité'} !`
    });
  }

  return null;
}
