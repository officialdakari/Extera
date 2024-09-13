// Establish a cache name
const cacheName = 'MediaCache';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(cacheName));
});

self.addEventListener('fetch', async (event) => {
    // Is this a request for an image?
    if (['/_matrix/client/v1/media', '/_matrix/client/v3/media', '/_matrix/media'].find(x => event.request.url.includes(x))) {
        // Open the cache
        event.respondWith(caches.open(cacheName).then((cache) => {
            // Go to the cache first
            return cache.match(event.request.url).then((cachedResponse) => {
                // Return a cached response if we have one
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Otherwise, hit the network
                return fetch(event.request).then((fetchedResponse) => {
                    // Add the network response to the cache for later visits
                    cache.put(event.request, fetchedResponse.clone());

                    // Return the network response
                    return fetchedResponse;
                });
            });
        }));
    } else {
        return;
    }
});
