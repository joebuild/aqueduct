// vite.config.js
import {sveltekit} from '@sveltejs/kit/vite';
import path from "path";
import inject from '@rollup/plugin-inject';

const config = {
    plugins: [sveltekit()],

    optimizeDeps: {
        // include: ['@project-serum/anchor', '@solana/web3.js'],
    },

    define: {
        // This makes @project-serum/anchor's process error not happen since it replaces all instances of process.env.ANCHOR_BROWSER with true
        'process.env.ANCHOR_BROWSER': true
    },

    resolve: {
        alias: {
            $icons: path.resolve('src/icons/'),
            $idl: path.resolve('src/idl/'),
            $src: path.resolve('src/'),
            $stores: path.resolve('src/stores/'),
            $utils: path.resolve('src/utils/'),
        },
    },

    build: {
        // ssr: false,
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            plugins: [inject({ Buffer: ['buffer', 'Buffer'] })],
            external: ['@blocto/sdk', '@ledgerhq/hw-transport-webhid', '@solflare-wallet/sdk', '@project-serum/sol-wallet-adapter', '@toruslabs/solana-embed']
        }
    },

};

export default config;
