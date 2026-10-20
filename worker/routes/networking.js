/**
 * COMPAGNON DE CÉRÉMONIE - Routes Réseautage & Mise en Relation
 */

import { jsonResponse, errorResponse } from "../utils/response.js";
import { getMockNetworking } from "../utils/mocks.js";

export async function handleNetworkingRoutes(pathname, request, env) {
  const method = request.method;
  const db = env.DB;

  // 1. Liste des profils avec recherche
  if (pathname === "/api/networking" && method === "GET") {
    const url = new URL(request.url);
    const search = (url.searchParams.get("q") || "").toLowerCase().trim();

    if (!db) return jsonResponse(getMockNetworking());

    let query = "SELECT * FROM networking_profiles WHERE event_id = 'default' ";
    const params = [];

    if (search) {
      query += "AND (LOWER(full_name) LIKE ? OR LOWER(profession) LIKE ? OR LOWER(interests_tags) LIKE ? OR LOWER(company) LIKE ?) ";
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += "ORDER BY created_at DESC LIMIT 50";
    const { results } = await db.prepare(query).bind(...params).all();
    return jsonResponse(results || []);
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
      // S'assurer que la colonne photo_url existe
      try {
        await db.prepare("ALTER TABLE networking_profiles ADD COLUMN photo_url TEXT").run();
      } catch (ignored) {
        // La colonne existe déjà
      }

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
        // Fallback sans photo_url si ancienne structure
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
      `).bind(id, fromGuestId, fromName, toGuestId, note).run();
    }

    return jsonResponse({ success: true, message: "Message de contact envoyé !" });
  }

  return null;
}
