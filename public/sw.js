// Service Worker - Compagnon de Cérémonie PWA & Web Push
const CACHE_NAME = 'compagnon-v2.2.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon.svg',
  '/billet-invitation-template.png'
];

// Installation & mise en cache des assets essentiels
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activation & nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Stratégie Stale-While-Revalidate ultra-rapide (0ms) pour la navigation et cache pour les assets
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non HTTP(S) (ex: extensions Chrome)
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  const url = new URL(event.request.url);

  // Appels API : réseau direct avec fallback hors-ligne
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: "Mode hors-ligne" }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Ne mettre en cache que les requêtes GET
  if (event.request.method !== 'GET') {
    return;
  }

  // 1. Navigation HTML :
  // IMPORTANT : Ne PAS servir le /index.html grand public aux portails d'administration, hôtesses et superviseur !
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    const isSpecialPortal = url.pathname.startsWith('/login') ||
                            url.pathname.startsWith('/hotesse') ||
                            url.pathname.startsWith('/superviseur') ||
                            url.pathname.startsWith('/supervisueur') ||
                            url.pathname.startsWith('/projecteur');

    if (isSpecialPortal) {
      // Pour les portails régie/hôtesses/superviseur : réseau direct en priorité avec fallback cache
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return networkResponse;
          })
          .catch(() => caches.match(event.request))
      );
      return;
    }

    // Pour l'application invités (dinedegala2026 ou racine)
    const targetFallback = url.pathname.startsWith('/dinedegala2026') ? '/dinedegala2026/index.html' : '/index.html';
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match(targetFallback)))
    );
    return;
  }

  // 2. Assets statiques (JS, CSS, images, fontes) : Cache d'abord avec rafraîchissement
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, copy);
        });
        return networkResponse;
      });
    })
  );
});

// ==========================================
// 🔔 GESTIONNAIRE DE NOTIFICATIONS WEB PUSH
// ==========================================
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = null;

    if (event.data) {
      try {
        payload = event.data.json();
      } catch (e) {
        try {
          payload = { title: "Compagnon de Cérémonie", body: event.data.text() };
        } catch (_) {}
      }
    }

    // Si le push n'a pas de charge utile chiffrée (tickle push), on va chercher la dernière notification active
    if (!payload || !payload.title) {
      try {
        const response = await fetch('/api/push/latest', { cache: 'no-store' });
        if (response.ok) {
          payload = await response.json();
        }
      } catch (err) {
        console.warn('Impossible de récupérer la dernière notification:', err);
      }
    }

    const title = (payload && payload.title) || 'Compagnon de Cérémonie 🎉';
    const options = {
      body: (payload && payload.body) || 'Une animation ou annonce en direct vient d\'avoir lieu !',
      icon: (payload && payload.icon) || '/icon.svg',
      badge: (payload && payload.badge) || '/favicon.svg',
      vibrate: [200, 100, 200, 100, 300],
      tag: (payload && payload.tag) || ('gala-alert-' + Date.now()),
      renotify: true,
      requireInteraction: false,
      data: {
        url: (payload && payload.url) || '/dinedegala2026/'
      },
      actions: [
        { action: 'open', title: '✨ Découvrir' },
        { action: 'dismiss', title: 'Ignorer' }
      ]
    };

    return self.registration.showNotification(title, options);
  })());
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const rawUrl = (event.notification.data && event.notification.data.url) || '/dinedegala2026/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Si une fenêtre sur le même domaine est déjà ouverte, lui donner le focus
    for (const client of windowClients) {
      if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
        if ('navigate' in client) {
          await client.navigate(targetUrl).catch(() => {});
        }
        return client.focus();
      }
    }
    // Sinon ouvrir une nouvelle fenêtre vers l'URL cible
    if (clients.openWindow) {
      return clients.openWindow(targetUrl);
    }
  })());
});
