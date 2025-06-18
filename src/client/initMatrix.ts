import EventEmitter from 'events';
import * as sdk from 'matrix-js-sdk';

import { getSecret } from './state/auth';
import { cryptoCallbacks } from './state/secretStorageKeys';
import indexedDBFactory from './workers/IndexedDBFactory';

class InitMatrix extends EventEmitter {
    matrixClient?: sdk.MatrixClient;

    initializing = false;

    async init() {
        if (this.matrixClient || this.initializing) {
            console.warn('Client is already initialized!')
            return;
        }
        this.initializing = true;

        try {
            await this.startClient();
            this.setupSync();
            this.listenEvents();
            this.initializing = false;
        } catch (err) {
            console.error(`Failed to init MatrixClient!`, err);
            this.initializing = false;
            console.log(`now I know why ignoring errors in catch is a bad practice...`);
        }
    }

    async startClient() {
        const indexedDBStore = new sdk.IndexedDBStore({
            indexedDB: global.indexedDB,
            localStorage: global.localStorage,
            dbName: 'web-sync-store',
            workerFactory: indexedDBFactory
        });
        const secret = getSecret();

        if (!secret.accessToken || !secret.baseUrl || !secret.deviceId || !secret.userId) {
            console.error(`Some of secret options are missing.`);
            return;
        }

        this.matrixClient = sdk.createClient({
            baseUrl: secret.baseUrl,
            accessToken: secret.accessToken,
            userId: secret.userId,
            store: indexedDBStore,
            cryptoStore: new sdk.IndexedDBCryptoStore(global.indexedDB, 'crypto-store'),
            deviceId: secret.deviceId,
            timelineSupport: true,
            cryptoCallbacks: cryptoCallbacks as any,
            verificationMethods: [
                'm.sas.v1',
            ],
            fallbackICEServerAllowed: true,
        });

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        globalThis.initMatrix = this;
        this.emit('client_ready');

        await indexedDBStore.startup();

        await this.matrixClient.initRustCrypto();

        await this.matrixClient.startClient({
            lazyLoadMembers: true,
            threadSupport: true,
            initialSyncLimit: 4,
        });

        this.matrixClient.setMaxListeners(50);
    }

    setupSync() {
        const sync = {
            NULL: () => {
                console.log('NULL state');
            },
            SYNCING: () => {
                console.log('SYNCING state');
            },
            PREPARED: (prevState: sdk.SyncState | null) => {
                console.log('PREPARED state');
                console.log('Previous state: ', prevState);
                if (prevState === null) {
                    this.emit('init_loading_finished');
                }
            },
            RECONNECTING: () => {
                console.log('RECONNECTING state');
            },
            CATCHUP: () => {
                console.log('CATCHUP state');
            },
            ERROR: () => {
                console.log('ERROR state');
            },
            STOPPED: () => {
                console.log('STOPPED state');
            },
        };
        this.matrixClient!.on(sdk.ClientEvent.Sync, (state, prevState) => {
            sync[state](prevState);
            console.debug(`OLD STATE: ${prevState} TO NEW STATE: ${state}`);
        });
    }

    listenEvents() {
        this.matrixClient!.on(sdk.HttpApiEvent.SessionLoggedOut, async () => {
            this.matrixClient!.stopClient();
            await this.matrixClient!.clearStores();
            window.localStorage.clear();
            window.location.reload();
        });
    }

    async logout() {
        this.matrixClient!.stopClient();
        try {
            await this.matrixClient!.logout();
        } catch {
            // ignore if failed to logout
        }
        await this.matrixClient!.clearStores();
        window.localStorage.clear();
        window.location.reload();
    }

    clearCacheAndReload() {
        this.matrixClient!.stopClient();
        this.matrixClient!.store.deleteAllData().then(() => {
            window.location.reload();
        });
    }
}

const initMatrix = new InitMatrix();

export default initMatrix;