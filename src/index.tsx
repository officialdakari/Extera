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
import getCachedURL from './app/utils/cache';
import { trimTrailingSlash } from './app/utils/common';
import cons from './client/state/cons';

document.body.classList.add(configClass, varsClass);
settings.applyTheme();

// Register Service Worker
if ('serviceWorker' in navigator) {
    const swUrl =
        import.meta.env.MODE === 'production'
            ? `/sw.js`
            : `/dev-sw.js?dev-sw`;

    navigator.serviceWorker.register(swUrl);
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'token' && event.data?.responseKey) {
            // Get the token for SW.
            const token = localStorage.getItem(cons.secretKey.ACCESS_TOKEN) ?? undefined;
            event.source!.postMessage({
                responseKey: event.data.responseKey,
                token,
            });
        } else if (typeof event.data?.log === 'string') {
            console.log(event.data?.log);
        }
    });
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
