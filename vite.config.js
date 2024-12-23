import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { wasm } from '@rollup/plugin-wasm';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import inject from '@rollup/plugin-inject';
import topLevelAwait from 'vite-plugin-top-level-await';
import buildConfig from './build.config';
import { readFileSync } from 'fs';
import { VitePWA } from 'vite-plugin-pwa';

const copyFiles = {
    targets: [
        {
            src: 'node_modules/@matrix-org/olm/olm.wasm',
            dest: '',
        },
        {
            src: 'node_modules/leaflet/images/layers-2x.png',
            dest: ''
        },
        {
            src: 'node_modules/leaflet/images/layers.png',
            dest: ''
        },
        {
            src: 'node_modules/leaflet/images/marker-icon-2x.png',
            dest: ''
        },
        {
            src: 'node_modules/leaflet/images/marker-icon.png',
            dest: ''
        },
        {
            src: 'node_modules/leaflet/images/marker-shadow.png',
            dest: ''
        },
        {
            src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
            dest: '',
            rename: 'pdf.worker.min.js',
        },
        {
            src: 'netlify.toml',
            dest: '',
        },
        {
            src: 'config.json',
            dest: '',
        },
        {
            src: 'public/manifest.json',
            dest: '',
        },
        {
            src: 'public/res/android',
            dest: 'public/',
        },
        {
            src: 'public/ring.mp3',
            dest: ''
        },
        {
            src: 'public/incoming.mp3',
            dest: ''
        },
        {
            src: 'public/background.png',
            dest: ''
        }
    ],
};

export default defineConfig({
    appType: 'spa',
    publicDir: false,
    base: buildConfig.base,
    server: {
        port: 8080,
        host: '0.0.0.0',
        // https: {
        //     cert: readFileSync('../sslthings/extera.local.crt'),
        //     key: readFileSync('../sslthings/extera.local.key')
        // },
        proxy: {
            "^\\/.*?\\/olm\\.wasm$": {
                target: 'http://localhost:8080',
                rewrite: () => '/olm.wasm'
            }
        }
    },
    plugins: [
        topLevelAwait({
            // The export name of top-level await promise for each chunk module
            promiseExportName: '__tla',
            // The function to generate import names of top-level await promise in each chunk module
            promiseImportName: (i) => `__tla_${i}`,
        }),
        viteStaticCopy(copyFiles),
        vanillaExtractPlugin(),
        wasm(),
        react(),
        VitePWA({
            srcDir: 'src',
            filename: 'sw.ts',
            strategies: 'injectManifest',
            injectRegister: false,
            manifest: false,
            injectManifest: {
                injectionPoint: undefined,
            },
            devOptions: {
                enabled: true,
                type: 'module'
            }
        })
    ],
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
            plugins: [
                // Enable esbuild polyfill plugins
                NodeGlobalsPolyfillPlugin({
                    process: false,
                    buffer: true
                }),
            ],
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        copyPublicDir: false,
        rollupOptions: {
            plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
        },
    },
});
