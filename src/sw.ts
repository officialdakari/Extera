/// <reference lib="WebWorker" />

const cacheName = 'MediaCache';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(cacheName).then(() => {
        console.log('Cache opened');
    }).catch(error => {
        console.error('Error opening cache:', error);
    }));
});

export type { };
declare const self: ServiceWorkerGlobalScope;

async function askForAccessToken(client: Client): Promise<string | undefined> {
    return new Promise((resolve) => {
        const responseKey = Math.random().toString(36);
        const listener = (event: ExtendableMessageEvent) => {
            if (event.data.responseKey !== responseKey) return;
            resolve(event.data.token);
            self.removeEventListener('message', listener);
        };
        self.addEventListener('message', listener);
        client.postMessage({ responseKey, type: 'token' });
    });
}

function fetchConfig(token?: string): RequestInit | undefined {
    if (!token) return undefined;

    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
}

self.addEventListener('fetch', (event: FetchEvent) => {
    const { url, method } = event.request;
    if (method !== 'GET') return;
    if (
        !url.includes('/_matrix/client/v1/media/download') &&
        !url.includes('/_matrix/client/v1/media/thumbnail')
    ) {
        return;
    }
    event.respondWith(
        (async (): Promise<Response> => {
            const cache = await caches.open(cacheName);
            const cachedMedia = await cache.match(url);
            if (cachedMedia) {
                return cachedMedia;
            }
            const client = await self.clients.get(event.clientId);
            let token: string | undefined;
            if (client) token = await askForAccessToken(client);

            const res = await fetch(url, fetchConfig(token));
            
            if (res?.ok) {
                await cache.put(url, res.clone());
            }
            
            return res;
        })()
    );
});