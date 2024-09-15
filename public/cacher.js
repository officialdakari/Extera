const cacheName = 'MediaCache';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(cacheName).then(() => {
        console.log('Cache opened');
    }).catch(error => {
        console.error('Error opening cache:', error);
    }));
});

function fetchFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const dbRequest = indexedDB.open("CinnyDB", 1);

        dbRequest.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction("tokens", "readonly");
            const store = transaction.objectStore("tokens");
            const getRequest = store.get(1);

            getRequest.onsuccess = function () {
                if (getRequest.result) {
                    resolve(getRequest.result);
                } else {
                    reject(new Error("No data found"));
                }
            };

            getRequest.onerror = function (error) {
                reject(error);
            };
        };

        dbRequest.onerror = function (error) {
            reject(error);
        };
    });
}

self.addEventListener('fetch', (event) => {
    // Check if the request is for an image
    const isMediaRequest = [
        '/_matrix/client/v1/media',
        '/_matrix/client/v3/media',
        '/_matrix/media'
    ].some(url => event.request.url.includes(url));
    console.debug(`SW !!! Got request to ${event.request.url} it is ${isMediaRequest ? 'Media' : 'not media'}`, event.request);
    if (isMediaRequest) {
        event.respondWith(
            fetchFromIndexedDB().then(({ accessToken }) => {
                return caches.open(cacheName).then((cache) => {
                    // Try to get a cached response
                    return cache.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                            console.log('Returning cached response for:', event.request.url);
                            return cachedResponse;
                        }

                        console.debug(`SW !!! Got a media request ${event.request.url} New headers`, headers, accessToken);

                        // Fetch from network and cache the response
                        return fetch({
                            ...event.request,
                            headers: {
                                ...event.request.headers,
                                Authorization: `Bearer ${accessToken}`
                            }
                        }).then((fetchedResponse) => {
                            if (fetchedResponse && fetchedResponse.ok) {
                                cache.put(event.request, fetchedResponse.clone());
                            }
                            return fetchedResponse;
                        }).catch(error => {
                            console.error('Fetch error:', error);
                            throw error;
                        });
                    });
                });
            }).catch(error => {
                console.error('Error fetching from IndexedDB:', error);
                throw error;
            })
        );
    }
});
