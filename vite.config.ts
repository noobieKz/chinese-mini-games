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
      const file = resolve('content/content.json');
      if (!existsSync(file)) {
        response.statusCode = 404;
        response.end();
        return;
      }
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(readFileSync(file));
    });
  },
};

export default defineConfig({
  plugins: [react(), localContent],
  build: { outDir: 'dist/client' },
  server: { port: 5173, strictPort: true },
});
