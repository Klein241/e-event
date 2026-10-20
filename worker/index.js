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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Pré-vol CORS (OPTIONS)
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    // 2. Routage API modulaire
    if (pathname.startsWith("/api/")) {
      try {
        let response = null;

        if (pathname.startsWith("/api/admin")) {
          response = await handleAdminRoutes(pathname, request, env);
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

    // 3. Servir le Backoffice Administrateur pour /login/admin
    if (pathname === "/login/admin" || pathname === "/login/admin/") {
      if (env.ASSETS) {
        const adminAssetUrl = new URL("/login/admin/index.html", request.url);
        return env.ASSETS.fetch(new Request(adminAssetUrl, request));
      }
    }

    // 4. Servir les fichiers frontend SPA / PWA depuis Cloudflare Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Compagnon de Cérémonie - Worker API en ligne", {
      status: 200,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
    });
  },
};
