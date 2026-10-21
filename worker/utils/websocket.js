/**
 * COMPAGNON DE CÉRÉMONIE - WebSocket Realtime Server (Alternative Supabase)
 * Support natif Cloudflare Workers WebSocketPair pour diffusion instantanée 0ms
 */

// Ensemble des sockets actives sur cette instance de Worker
const activeSockets = new Set();

/**
 * Gère l'upgrade HTTP -> WebSocket pour le canal de chat / direct
 */
export function handleChatWebSocket(request) {
  const upgradeHeader = request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Requête WebSocket invalide. En-tête 'Upgrade: websocket' attendu.", { status: 426 });
  }

  // Création de la paire de sockets Cloudflare
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();
  activeSockets.add(server);

  // Écoute des messages entrants
  server.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "ping") {
        server.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
      }
    } catch (e) {
      // Ignorer payload non-JSON
    }
  });

  const cleanup = () => {
    activeSockets.delete(server);
  };

  server.addEventListener("close", cleanup);
  server.addEventListener("error", cleanup);

  // Message d'accueil avec état de connexion
  try {
    server.send(JSON.stringify({
      type: "connected",
      message: "Connecté au flux direct en temps réel Cloudflare WebSocket",
      active_connections: activeSockets.size,
      server_time: new Date().toISOString()
    }));
  } catch (e) {
    cleanup();
  }

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

/**
 * Diffuse un événement à tous les clients WebSocket connectés en temps réel
 * @param {string} type - 'new_message' | 'delete_message' | 'reaction' | 'presence_update' | 'pin_toggle'
 * @param {any} payload - Données de l'événement
 */
export function broadcastChatEvent(type, payload) {
  if (activeSockets.size === 0) return;

  const dataStr = JSON.stringify({
    type,
    payload,
    timestamp: Date.now()
  });

  for (const socket of activeSockets) {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(dataStr);
      }
    } catch (err) {
      activeSockets.delete(socket);
    }
  }
}
