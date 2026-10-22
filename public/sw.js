// Service Worker - Compagnon de Cérémonie PWA & Web Push
const CACHE_NAME = 'compagnon-v2.1.0';
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

  // 1. Navigation HTML : Rendu instantané 0ms depuis le cache, synchronisation silencieuse en arrière-plan (Stale-While-Revalidate)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      caches.match('/index.html').then((cachedIndex) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
            }
            return networkResponse;
          })
          .catch(() => cachedIndex);

        // Si la page HTML est en cache, retour immédiat en 0ms !
        if (cachedIndex) {
          fetchPromise.catch(() => {});
          return cachedIndex;
        }

        // Sinon premier chargement, attendre le réseau
        return fetchPromise;
      })
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
        payload = { title: "Compagnon de Cérémonie", body: event.data.text() };
      }
    }

    // Si le push n'a pas de charge utile chiffrée, on va chercher la dernière notification active
    if (!payload || !payload.title) {
      try {
        const response = await fetch('/api/push/latest');
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
      tag: (payload && payload.tag) || 'gala-alert',
      renotify: true,
      requireInteraction: false,
      data: {
        url: (payload && payload.url) || '/'
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

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si une fenêtre est déjà ouverte, lui donner le focus
      for (const client of windowClients) {
        if (client.url.includes(self.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
