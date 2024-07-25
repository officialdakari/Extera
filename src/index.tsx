/* eslint-disable import/first */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { enableMapSet } from 'immer';
import '@fontsource/inter/variable.css';
import 'folds/dist/style.css';
import { configClass, varsClass } from 'folds';

enableMapSet();

import './index.scss';

import settings from './client/state/settings';

import App from './app/pages/App';

document.body.classList.add(configClass, varsClass);
if (navigator.serviceWorker) navigator.serviceWorker.register('/worker.js');
settings.applyTheme();

if (navigator.serviceWorker) {
    const dbRequest = window.indexedDB.open("CinnyDB", 1);

    dbRequest.onupgradeneeded = function (event: any) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("tokens")) {
            db.createObjectStore("tokens", { keyPath: "id" });
        }
    };

    dbRequest.onsuccess = function (event: any) {
        const db = event.target.result;
        const transaction = db.transaction("tokens", "readwrite");
        const store = transaction.objectStore("tokens");

        const data = {
            id: 1,
            baseUrl: localStorage.cinny_hs_base_url,
            accessToken: localStorage.cinny_access_token
        };

        store.put(data);

        transaction.oncomplete = function () {
            console.log("Data saved to IndexedDB.");
        };

        transaction.onerror = function (error: any) {
            console.error("Transaction failed: ", error);
        };
    };

    dbRequest.onerror = function (error) {
        console.error("Error opening database: ", error);
    };
}

const mountApp = () => {
    const rootContainer = document.getElementById('root');

    if (rootContainer === null) {
        console.error('Root container element not found!');
        return;
    }

    const root = createRoot(rootContainer);
    root.render(<App />);
};

mountApp();
