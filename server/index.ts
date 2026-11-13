import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { AuthService, DEFAULT_TEACHERS, MemoryAuthStore, readCookie, sessionCookie } from './auth';
import { createRoomHub, GamePeer } from './room-hub';

export function createLocalServer(auth?: AuthService) {
  auth ??= new AuthService(
    {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      emails: process.env.TEACHER_EMAILS ?? DEFAULT_TEACHERS,
      origins: process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:3001',
    },
    new MemoryAuthStore(),
  );
  const authentication = auth;
  const app = express();
  const http = createServer(app);
  const hub = createRoomHub();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 100000 });
  const sessions = new Map<string, string | undefined>();
  app.use('/api/auth', async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 20000) {
          res.status(413).end();
          return;
        }
        chunks.push(Buffer.from(chunk));
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
        else if (value) headers.set(name, value);
      }
      const request = new Request(new URL(req.originalUrl, `http://${req.headers.host}`), {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks).toString(),
      });
      const response = await authentication.handle(request, (token) => {
        for (const [id, session] of sessions)
          if (session === token) hub.peers.get(id)?.emit('auth-required');
      });
      res.status(response.status);
      response.headers.forEach((value, name) => {
        if (name !== 'set-cookie') res.setHeader(name, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader('Set-Cookie', cookies);
      res.end(await response.text());
    } catch {
      res.status(500).json({ error: 'Không xử lý được yêu cầu xác thực.' });
    }
  });
  app.get('/api/health', (_req, res) => res.json({ ok: true, transport: 'websocket' }));
  app.use(express.static('dist/client'));
  app.get('/{*path}', (_req, res) => res.sendFile('index.html', { root: 'dist/client' }));
  http.on('upgrade', (request, socket, head) => {
    const origin = request.headers.origin;
    if (
      request.url !== '/api/socket' ||
      (origin &&
        !authentication.allowedOrigin(origin) &&
        origin !== `http://${request.headers.host}`)
    ) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      const peer = new GamePeer(crypto.randomUUID(), (event, data) => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ event, data }));
      });
      const session = readCookie(request.headers.cookie ?? null, sessionCookie);
      sessions.set(peer.id, session);
      hub.connect(peer);
      // Keep async credential checks and game commands in receive order.
      let queue = Promise.resolve();
      ws.on('message', (raw) => {
        queue = queue
          .then(async () => {
            try {
              const message = JSON.parse(raw.toString());
              if (!Number.isSafeInteger(message.id) || typeof message.event !== 'string') return;
              peer.teacher = (await authentication.getSession(session))?.teacher ?? null;
              hub.tick();
              const reply = hub.dispatch(peer, message.event, message.data);
              if (ws.readyState === 1) ws.send(JSON.stringify({ id: message.id, reply }));
            } catch {
              ws.close(1007, 'Invalid message');
            }
          })
          .catch(() => ws.close(1011, 'Server error'));
      });
      ws.on('close', () => {
        hub.disconnect(peer);
        sessions.delete(peer.id);
      });
    });
  });
  const timer = setInterval(() => hub.tick(), 1000).unref();
  http.on('close', () => {
    clearInterval(timer);
    wss.clients.forEach((ws) => ws.terminate());
    wss.close();
  });
  return { http, hub, auth: authentication, wss };
}
