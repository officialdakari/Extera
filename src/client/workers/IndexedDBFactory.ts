const indexedDBFactory = (options?: WorkerOptions | undefined) => {
    console.log(`factory `, options, new URL("./IndexedDB.ts", import.meta.url).href);
    return new Worker(
        new URL("./IndexedDB.ts", import.meta.url),
        {
            type: 'module'
        }
    );
};

export default indexedDBFactory;