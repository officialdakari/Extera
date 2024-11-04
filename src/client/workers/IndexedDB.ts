import { IndexedDBStoreWorker } from "matrix-js-sdk/src/indexeddb-worker";

const ctx: Worker = self as any;

const rw = new IndexedDBStoreWorker(ctx.postMessage);

ctx.onmessage = rw.onMessage;