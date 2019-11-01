import { DBHelper } from './js/dbhelper';

const cacheRoot = 'restaurant-reviews';
const cacheVersion = 'v9';
const staticCacheName = `${cacheRoot}-${cacheVersion}`;

console.log(`Using sw version ${staticCacheName}...`);

self.addEventListener('install', event => {
    console.log(`Opening cache for sw version ${staticCacheName}...`);
    event.waitUntil(
        caches.open(staticCacheName).then((cache) =>
            cache.addAll([
                '/',
                '/manifest.json',
                'restaurant.html',
                'dist/main.js',
                'dist/restaurant_info.js',
                '/sw.js',
                'css/styles.css',
                'css/styles-sm.css',
                'css/styles-xs.css',
                'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css',
                'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
                'img/1.jpg',
                'img/2.jpg',
                'img/3.jpg',
                'img/4.jpg',
                'img/5.jpg',
                'img/6.jpg',
                'img/7.jpg',
                'img/8.jpg',
                'img/9.jpg',
                'img/10.jpg'
            ]))
            .catch(e => console.log('There was a problem opening the cache...', e)));
});


self.addEventListener('activate', event => {
    console.log(`Activating sw version ${staticCacheName}...`);
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames.filter(cacheName =>
                    cacheName.startsWith(cacheRoot) &&
                    cacheName !== staticCacheName)
                    .map(cacheName => caches.delete(cacheName))
            )
        )
    );
});


self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(response => response || fetch(event.request)));
});


self.addEventListener('sync', event => {
    console.log('[Service Worker] Background Syncing', event);
    if (event.tag === 'sync-new-reviews') {
        console.log('[Service Worker] Synching new posts');
        event.waitUntil(DBHelper.getPendingReviews().then(reviews => {
            reviews.forEach(async ({ createdAt, ...review }) => {
                try {
                    const res = await fetch(`${DBHelper.DATABASE_URL}/reviews/`, {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json'
                        },
                        body: JSON.stringify(review)
                    });

                    if (res.ok) {
                        DBHelper.removePendingReview({ createdAt });
                    }
                } catch (e) {
                    console.log('unable upload review from service worker...', e);
                }
            });
        }));
    }
});