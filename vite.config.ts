import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(async () => {
  const plugins: any[] = [react(), tailwindcss()];

  try {
    const pwaModule = await import('vite-plugin-pwa');
    const VitePWA = pwaModule.VitePWA;
    if (VitePWA) {
      plugins.push(
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: [
            'icon.svg',
            'icon-maskable.svg',
            'apple-touch-icon.png',
            'pwa-192x192.png',
            'pwa-512x512.png',
            'pwa-maskable-512x512.png',
          ],
          manifest: {
            id: '/',
            name: 'Parnik Belent Agro',
            short_name: 'Parnik',
            description: 'Ýyladyşhana (parnik) üçin gündelik suwaryş, laboratoriýa, drenaž, agronom hasabatlary we oflaýn monitoring ulgamy.',
            theme_color: '#064e3b',
            background_color: '#064e3b',
            display: 'standalone',
            orientation: 'any',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^\/api\/records/,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-records-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              {
                urlPattern: /^\/api\/kriteriyalar/,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-kriteriyalar-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
            ],
          },
          devOptions: {
            enabled: true,
            type: 'module',
          },
        })
      );
    }
  } catch (err) {
    console.warn('vite-plugin-pwa ýüklenmedi, adaty tertipde dowam edilýär.');
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
