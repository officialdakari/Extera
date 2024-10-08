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

document.body.classList.add(configClass, varsClass);
if (navigator.serviceWorker) navigator.serviceWorker.register('/worker.js');
if (navigator.serviceWorker) navigator.serviceWorker.register('/cacher.js');
settings.applyTheme();

// Register Service Worker
if ('serviceWorker' in navigator) {
    const swUrl =
        import.meta.env.MODE === 'production'
            ? `${trimTrailingSlash(import.meta.env.BASE_URL)}/sw.js`
            : `/dev-sw.js?dev-sw`;

    navigator.serviceWorker.register(swUrl);
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'token' && event.data?.responseKey) {
            // Get the token for SW.
            const token = localStorage.getItem('cinny_access_token') ?? undefined;
            event.source!.postMessage({
                responseKey: event.data.responseKey,
                token,
            });
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
