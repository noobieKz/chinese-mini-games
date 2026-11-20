import { DurableObject } from 'cloudflare:workers';
import { AuthService, DEFAULT_TEACHERS, readCookie, sessionCookie } from '../server/auth';
import { createRoomHub, GamePeer, type Room } from '../server/room-hub';
import { codePattern, makeCode } from '../src/games/duel/core';
import { DuelRoom } from './duel-room';

export { DuelRoom };

export type Env = {
  ASSETS: Fetcher;
  CONTENT: KVNamespace;
  DUEL: DurableObjectNamespace<DuelRoom>;
  HUB: DurableObjectNamespace<ClassroomHub>;
  GOOGLE_CLIENT_ID?: string;
  TEACHER_EMAILS?: string;
  ALLOWED_ORIGINS: string;
};
type Attachment = { id: string; code?: string; sessionToken?: string };
export class ClassroomHub extends DurableObject<Env> {
  private hub = createRoomHub();
  private auth: AuthService;
  /** Storage key → JSON last written, so each message only writes rooms that changed. */
  private saved = new Map<string, string>();
  private alarmAt: number | null | undefined;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.auth = new AuthService(
      {
        clientId: env.GOOGLE_CLIENT_ID ?? '',
        emails: env.TEACHER_EMAILS ?? DEFAULT_TEACHERS,
        origins: env.ALLOWED_ORIGINS,
      },
      {
        get: (key) => ctx.storage.get(key),
        put: (key, value) => ctx.storage.put(key, value),
        delete: (key) => ctx.storage.delete(key),
        take: <T>(key: string) =>
          ctx.storage.transaction(async (tx) => {
            const value = await tx.get<T>(key);
            await tx.delete(key);
            return value;
          }),
      },
    );
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.list<Room>({ prefix: 'room:' });
      for (const [key, room] of saved) this.saved.set(key, JSON.stringify(room));
      this.hub = createRoomHub([...saved.values()]);
      for (const ws of ctx.getWebSockets()) {
        const attachment = ws.deserializeAttachment() as Attachment;
        const peer = this.makePeer(ws, attachment);
        this.hub.connect(peer);
      }
    });
  }
  private makePeer(ws: WebSocket, attachment: Attachment) {
    const peer = new GamePeer(attachment.id, (event, data) => {
      try {
        ws.send(JSON.stringify({ event, data }));
      } catch {
        /* A disconnected client can resume. */
      }
    });
    peer.data.code = attachment.code;
    return peer;
  }
  private async persist() {
    const stale = new Set(this.saved.keys());
    for (const room of this.hub.rooms.values()) {
      const key = 'room:' + room.code;
      const json = JSON.stringify(room);
      stale.delete(key);
      if (this.saved.get(key) === json) continue;
      await this.ctx.storage.put(key, room);
      this.saved.set(key, json);
    }
    if (stale.size) {
      await this.ctx.storage.delete([...stale]);
      for (const key of stale) this.saved.delete(key);
    }
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment() as Attachment;
      const peer = this.hub.peers.get(a.id);
      if (peer && peer.data.code !== a.code) ws.serializeAttachment({ ...a, code: peer.data.code });
    }
    const next = Math.min(
      ...[...this.hub.rooms.values()].map((room) =>
        room.status === 'playing'
          ? Math.min(room.endsAt, room.createdAt + 6 * 3600000)
          : room.createdAt + 6 * 3600000,
      ),
    );
    const wanted = Number.isFinite(next) ? next : null;
    if (wanted === this.alarmAt) return;
    if (wanted === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(Date.now() + 100, wanted));
    this.alarmAt = wanted;
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/auth/'))
      return this.auth.handle(request, (token) => {
        for (const ws of this.ctx.getWebSockets()) {
          const a = ws.deserializeAttachment() as Attachment;
          if (a.sessionToken === token) {
            a.sessionToken = undefined;
            ws.serializeAttachment(a);
            this.hub.peers.get(a.id)?.emit('auth-required');
          }
        }
      });
    if (url.pathname === '/api/health')
      return Response.json({ ok: true, transport: 'websocket', runtime: 'durable-object' });
    if (
      url.pathname !== '/api/socket' ||
      request.headers.get('upgrade')?.toLowerCase() !== 'websocket'
    )
      return new Response('Not found', { status: 404 });
    const origin = request.headers.get('origin');
    if (!origin || !this.auth.allowedOrigin(origin))
      return new Response('Origin not allowed', { status: 403 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const attachment: Attachment = {
      id: crypto.randomUUID(),
      sessionToken: readCookie(request.headers.get('cookie'), sessionCookie),
    };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    this.hub.connect(this.makePeer(server, attachment));
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    return this.ctx.blockConcurrencyWhile(() => this.processMessage(ws, message));
  }
  private async processMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string' || message.length > 100000) {
      ws.close(1009, 'Payload too large');
      return;
    }
    const a = ws.deserializeAttachment() as Attachment;
    const peer = this.hub.peers.get(a.id);
    if (!peer) return;
    try {
      const data = JSON.parse(message);
      if (!Number.isSafeInteger(data.id) || typeof data.event !== 'string') return;
      peer.teacher = (await this.auth.getSession(a.sessionToken))?.teacher ?? null;
      this.hub.tick();
      const reply = this.hub.dispatch(peer, data.event, data.data);
      await this.persist();
      ws.send(JSON.stringify({ id: data.id, reply }));
    } catch {
      try {
        ws.send(JSON.stringify({ error: 'Yêu cầu không hợp lệ.' }));
      } catch {
        /* Closed socket. */
      }
    }
  }
  async webSocketClose(ws: WebSocket) {
    try {
      ws.close(1000, 'Connection closed');
    } catch {
      /* Already closed. */
    }
    const a = ws.deserializeAttachment() as Attachment;
    const peer = this.hub.peers.get(a.id);
    if (peer) this.hub.disconnect(peer);
    await this.persist();
  }
  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }
  async alarm() {
    this.alarmAt = undefined;
    this.hub.tick();
    await this.persist();
  }
}
export default {
  async fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url);
    // Course content uploaded from Excel; games fall back to their bundled sample when it is absent.
    if (pathname === '/api/content' && request.method === 'GET') {
      const content = await env.CONTENT.get('content');
      if (!content) return Response.json({ error: 'Chưa có dữ liệu khóa học.' }, { status: 404 });
      return new Response(content, {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          // Short cache: an upload reaches players within about a minute.
          'cache-control': 'public, max-age=60',
        },
      });
    }
    // Two-player duels: create a room (POST) and join it by invite code (WebSocket).
    if (pathname === '/api/duel' && request.method === 'POST') {
      const body = await request.text();
      if (body.length > 60000) return Response.json({ error: 'Quá lớn.' }, { status: 413 });
      for (let i = 0; i < 5; i++) {
        const code = makeCode();
        const room = env.DUEL.get(env.DUEL.idFromName(code));
        const response = await room.fetch(`https://duel/create?code=${code}`, {
          method: 'POST',
          body,
        });
        if (response.status !== 409) return response;
      }
      return Response.json({ error: 'Không tạo được phòng, thử lại nhé.' }, { status: 503 });
    }
    const duel = pathname.match(/^\/api\/duel\/([A-Z0-9]{6})$/);
    if (duel) {
      if (!codePattern.test(duel[1])) return new Response('Mã phòng không hợp lệ', { status: 400 });
      return env.DUEL.get(env.DUEL.idFromName(duel[1])).fetch(request);
    }
    // Individual games run entirely in the browser. Former auth/room endpoints are retired.
    if (pathname.startsWith('/api/'))
      return Response.json(
        { error: 'Chế độ lớp học và đăng nhập đã ngừng sử dụng.' },
        { status: 410 },
      );
    return env.ASSETS.fetch(request);
  },
};
