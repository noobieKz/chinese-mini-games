import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * In development /api/content serves content/content.json (built from Excel with
 * `npm run content -- build`), so new lessons can be checked locally before they are uploaded.
 * Without the file the games use their bundled sample, as in production when KV is empty.
 */
const localContent: Plugin = {
  name: 'hanplay-local-content',
  configureServer(server) {
    server.middlewares.use('/api/content', (_request, response) => {
      void (async () => {
        try {
          const live = await fetch('http://127.0.0.1:8788/api/content', {
            signal: AbortSignal.timeout(1500),
          });
          if (live.ok) {
            response.setHeader('content-type', 'application/json; charset=utf-8');
            response.setHeader('cache-control', 'no-cache');
            response.end(await live.text());
            return;
          }
        } catch {
          // Vite remains usable without the local Worker.
        }
        const file = resolve('content/content.json');
        if (!existsSync(file)) {
          response.statusCode = 404;
          response.end();
          return;
        }
        response.setHeader('content-type', 'application/json; charset=utf-8');
        response.end(readFileSync(file));
      })();
    });
  },
};

export default defineConfig({
  plugins: [react(), localContent],
  build: { outDir: 'dist/client' },
  server: {
    port: 5173,
    strictPort: true,
    // Duel rooms are Durable Objects: in development they run under `wrangler dev` on 8788.
    proxy: {
      '/api/duel': { target: 'http://127.0.0.1:8788', ws: true },
      '/api/auth': 'http://127.0.0.1:8788',
      '/api/teacher': 'http://127.0.0.1:8788',
    },
  },
});
