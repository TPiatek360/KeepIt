const CACHE_NAME = 'keepit-pro-v6-cache-update';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/pwa-icon.png',
    '/css/style.css',
    '/js/firebase-init.js',
    '/js/utils.js',
    '/js/contexts.js',
    '/js/icons.js',
    '/js/components/ui.js',
    '/js/components/modals.js',
    '/js/components/sidebar.js',
    '/js/components/cards.js',
    '/js/components/editor.js',
    '/js/components/graph-view.js',
    '/js/components/stats-view.js',
    '/js/graph-worker.js',
    '/js/app.js',
    'https://unpkg.com/react@18/umd/react.development.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Force new SW to take over immediately
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control of all clients immediately
});

self.addEventListener('fetch', event => {
    // Network-First Strategy for HTML/Navigation
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request)
                        .then(response => response || caches.match('/')); // Fallback to root
                })
        );
    } else {
        const url = new URL(event.request.url);
        const isLocalAsset = url.origin === self.location.origin && (url.pathname.startsWith('/js/') || url.pathname.startsWith('/css/') || url.pathname === '/index.html');

        if (event.request.method !== 'GET') {
            return event.respondWith(fetch(event.request));
        }

        if (isLocalAsset) {
            // Network-First for local assets
            event.respondWith(
                fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                    }
                    return networkResponse;
                }).catch(() => caches.match(event.request))
            );
        } else {
            // Stale-While-Revalidate for other assets
            event.respondWith(
                caches.match(event.request).then(cachedResponse => {
                    const fetchPromise = fetch(event.request).then(networkResponse => {
                        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                        }
                        return networkResponse;
                    });
                    return cachedResponse || fetchPromise;
                })
            );
        }
    }
});

// --- Web Push and Local Notifications ---

self.addEventListener('push', (event) => {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { notification: { body: event.data.text() } };
        }
    }
    
    const title = data.notification?.title || "KeepIt Pro Reminder";
    const options = {
        body: data.notification?.body || "You have a scheduled reminder.",
        icon: '/pwa-icon.png',
        badge: '/favicon-32x32.png',
        data: {
            noteId: data.data?.noteId || data.noteId
        },
        actions: [
            { action: 'view', title: 'Open Note' }
        ],
        vibrate: [200, 100, 200]
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const noteId = event.notification.data?.noteId;
    if (noteId) {
        const urlToOpen = new URL(`/?note=${noteId}`, self.location.origin).href;
        
        event.waitUntil(
            self.clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((windowClients) => {
                    for (let client of windowClients) {
                        if (client.url === urlToOpen && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    if (self.clients.openWindow) {
                        return self.clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});