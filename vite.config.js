import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function resolveAllowedOrigins(appUrl) {
    const origins = [
        /^https?:\/\/localhost(:\d+)?$/,
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
        /^https:\/\/.*\.ngrok-free\.app$/,
        /^https:\/\/.*\.ngrok-free\.dev$/,
    ];

    if (!appUrl) {
        return origins;
    }

    try {
        return [new URL(appUrl).origin, ...origins];
    } catch {
        return origins;
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.jsx'],
                refresh: true,
            }),
            react(),
            tailwindcss(),
        ],
        server: {
            cors: {
                origin: resolveAllowedOrigins(env.APP_URL),
            },
            host: '0.0.0.0',
            hmr: {
                host: 'localhost',
            },
            watch: {
                ignored: ['**/storage/framework/views/**'],
            },
        },
    };
});
