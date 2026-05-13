import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        },
        manifest: {
          name: 'Hartmann Hub',
          short_name: 'HHub',
          description: 'Système de Management de la Qualité et de Sécurité Sanitaire - Hartmann Hub',
          theme_color: '#1A0B2E',
          background_color: '#f8fafc',
          display: 'standalone',
          icons: [
            {
              src: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%231A0B2E%22/><text x=%2250%22 y=%2250%22 font-family=%22Arial%22 font-size=%2240%22 fill=%22white%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-weight=%22bold%22>HH</text></svg>',
              sizes: '192x192',
              type: 'image/svg+xml',
            },
            {
              src: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%231A0B2E%22/><text x=%2250%22 y=%2250%22 font-family=%22Arial%22 font-size=%2240%22 fill=%22white%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-weight=%22bold%22>HH</text></svg>',
              sizes: '512x512',
              type: 'image/svg+xml',
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
