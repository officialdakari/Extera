interface Wallpaper {
    id: string;
    data: string;
}

class WallpaperDB {
    private dbName: string = 'WallpaperDB';
    private storeName: string = 'wallpapers';
    private db: IDBDatabase | null = null;

    constructor() {
        this.init();
    }

    private init() {
        const request = indexedDB.open(this.dbName, 1);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(this.storeName)) {
                db.createObjectStore(this.storeName, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event: Event) => {
            this.db = (event.target as IDBOpenDBRequest).result;
        };

        request.onerror = (event: Event) => {
            console.error('Database error:', (event.target as IDBOpenDBRequest).error);
        };
    }

    setWallpaper(file: Blob): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }

            const id = 'wallpaper';
            const reader = new FileReader();

            reader.onload = () => {
                const data = reader.result as string;
                const transaction = this.db!.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put({ id: id, data: data });

                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(request.error);
            };

            reader.readAsDataURL(file);
        });
    }

    getWallpaper(): Promise<string | null> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get('wallpaper');

            request.onsuccess = (event: Event) => {
                const result = (event.target as IDBRequest).result;
                resolve(result ? result.data : null);
            };

            request.onerror = (event: Event) => {
                reject(request.error);
            };
        });
    }

    removeWallpaper(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('Database not initialized');
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete('wallpaper');

            request.onsuccess = () => resolve();
            request.onerror = (event: Event) => {
                reject(request.error);
            };
        });
    }
}

const wallpaperDB = new WallpaperDB();

export default wallpaperDB;