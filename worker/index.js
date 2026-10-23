/**
 * COMPAGNON DE CÉRÉMONIE - Cloudflare Worker API & Static Asset Server
 * Architecture modulaire, résiliente et sans fichier monolithique (< 150 lignes)
 */

import { handleOptions, jsonResponse, errorResponse } from "./utils/response.js";
import { handlePushRoutes } from "./routes/push.js";
import { handleEventRoutes } from "./routes/events.js";
import { handleChatRoutes } from "./routes/chat.js";
import { handleGameRoutes } from "./routes/games.js";
import { handleNetworkingRoutes } from "./routes/networking.js";
import { handlePrayerRoutes } from "./routes/prayers.js";
import { handleProjectorRoutes } from "./routes/projector.js";
import { handleAdminRoutes } from "./routes/admin.js";
import { handleHostessRoutes } from "./routes/hostess.js";

// Handler inline pour les routes publicitaires (annonces)
async function handleAdsRoutes(pathname, request, env) {
  const db = env.DB;
  const method = request.method;

  // GET /api/ads - Liste des annonces actives
  if (pathname === "/api/ads" && method === "GET") {
    if (!db) return jsonResponse([]);
    const { results } = await db.prepare(
      "SELECT id, title, brand, tagline, description, image_url, image_data, redirect_url, theme_color, icon_emoji, price_tag, views_count, clicks_count, order_index FROM ads_sponsors WHERE event_id = 'default' AND is_active = 1 ORDER BY order_index ASC"
    ).all().catch(() => ({ results: [] }));
    return jsonResponse(results || []);
  }

  // POST /api/ads/:id/view - Incrément compteur de vues
  const viewMatch = pathname.match(/^\/api\/ads\/([^/]+)\/view$/);
  if (viewMatch && method === "POST") {
    const id = viewMatch[1];
    if (db) await db.prepare("UPDATE ads_sponsors SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?").bind(id).run().catch(() => {});
    return jsonResponse({ success: true });
  }

  // POST /api/ads/:id/click - Incrément compteur de clics
  const clickMatch = pathname.match(/^\/api\/ads\/([^/]+)\/click$/);
  if (clickMatch && method === "POST") {
    const id = clickMatch[1];
    if (db) await db.prepare("UPDATE ads_sponsors SET clicks_count = COALESCE(clicks_count, 0) + 1 WHERE id = ?").bind(id).run().catch(() => {});
    return jsonResponse({ success: true });
  }

  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Pré-vol CORS (OPTIONS)
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    // 1b. Redirection automatique vers le domaine officiel joursderencontre.com
    if (url.hostname.includes("compagnon-de-ceremonie.mynexus.workers.dev") || 
        (url.hostname.endsWith(".workers.dev") && !url.hostname.includes("localhost"))) {
      const canonicalUrl = new URL(request.url);
      canonicalUrl.hostname = "joursderencontre.com";
      canonicalUrl.protocol = "https:";
      return Response.redirect(canonicalUrl.toString(), 301);
    }

    // 1c. Rétrocompatibilité : Redirection des liens gala historiques (?invite= ou ?ticket=) vers /dinedegala2026/
    if (pathname === "/" && (url.searchParams.has("invite") || url.searchParams.has("ticket") || url.searchParams.has("billet"))) {
      const galaRedirectUrl = new URL(request.url);
      galaRedirectUrl.pathname = "/dinedegala2026/";
      return Response.redirect(galaRedirectUrl.toString(), 302);
    }

    // Normalisation du chemin /dinedegala2026 sans slash
    if (pathname === "/dinedegala2026") {
      const slashUrl = new URL(request.url);
      slashUrl.pathname = "/dinedegala2026/";
      return Response.redirect(slashUrl.toString(), 301);
    }

    // Normalisation du chemin /hotesse sans slash
    if (pathname === "/hotesse") {
      const slashUrl = new URL(request.url);
      slashUrl.pathname = "/hotesse/";
      return Response.redirect(slashUrl.toString(), 301);
    }

    // 2. Routage API modulaire
    if (pathname.startsWith("/api/")) {
      try {
        let response = null;

        if (pathname.startsWith("/api/admin")) {
          response = await handleAdminRoutes(pathname, request, env);
        } else if (pathname.startsWith("/api/hostess")) {
          response = await handleHostessRoutes(pathname, request, env);
        } else if (pathname.startsWith("/api/push")) {
          response = await handlePushRoutes(pathname, request, env);
        } else if (pathname.startsWith("/api/chat")) {
          response = await handleChatRoutes(pathname, request, env);
        } else if (pathname.startsWith("/api/games")) {
          response = await handleGameRoutes(pathname, request, env);
        } else if (pathname.startsWith("/api/networking")) {
          response = await handleNetworkingRoutes(pathname, request, env);
        } else if (pathname.startsWith("/api/prayers")) {
          response = await handlePrayerRoutes(pathname, request, env);
        } else if (pathname.startsWith("/api/projector")) {
          response = await handleProjectorRoutes(pathname, request, env);
        } else if (pathname.startsWith("/api/ads")) {
          response = await handleAdsRoutes(pathname, request, env);
        } else {
          // Routes génériques événements / invités / santé
          response = await handleEventRoutes(pathname, request, env);
        }

        if (response) {
          return response;
        }

        return errorResponse("Route API introuvable", 404);
      } catch (err) {
        console.error("Erreur d'exécution API Worker:", err);
        return errorResponse("Erreur interne du serveur", 500, err.message);
      }
    }

    // 3. Servir les fichiers frontend SPA / PWA depuis Cloudflare Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Compagnon de Cérémonie - Worker API en ligne", {
      status: 200,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
    });
  },
};
