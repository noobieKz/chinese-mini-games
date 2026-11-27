import { DurableObject } from 'cloudflare:workers';
import { normalizeHskLevels } from '../shared/content';
import { AuthService, boundedBody, readCookie, sessionCookie } from '../server/auth';
import { createRoomHub, GamePeer, type Room } from '../server/room-hub';
import { codePattern, makeCode } from '../src/games/duel/core';
import baseline from '../content/content.json';
import {
  parsePublishedContent,
  topicIds,
  preparePublication,
  type PublishedContent,
} from '../shared/lesson-editor';
import { sampleBundle } from '../src/content/sample';
import { TEA_MAX_ORDERS } from '../src/games/milk-tea/orders';
import { shuffle } from '../src/games/word-garden/rules';
import { DuelRoom } from './duel-room';

export { DuelRoom };

export type Env = {
  ASSETS: Fetcher;
  CONTENT: KVNamespace;
  DUEL: DurableObjectNamespace<DuelRoom>;
  HUB: DurableObjectNamespace<ClassroomHub>;
  LESSON_ADMIN_USERNAME?: string;
  LESSON_ADMIN_PASSWORD?: string;
  ALLOWED_ORIGINS: string;
};
const publishedKey = 'published-lessons';
const privateJson = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

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
        clientId: '',
        emails: env.LESSON_ADMIN_USERNAME ?? '',
        passwordLogin: {
          username: env.LESSON_ADMIN_USERNAME ?? '',
          password: env.LESSON_ADMIN_PASSWORD ?? '',
        },
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
  private async baseline() {
    const stored = await this.env.CONTENT.get('content', 'json').catch(() => null);
    return parsePublishedContent(stored) ?? parsePublishedContent(baseline) ?? sampleBundle;
  }

  private async published() {
    const stored = await this.ctx.storage.get<PublishedContent>(publishedKey);
    return stored ? normalizeHskLevels(stored) : this.baseline();
  }

  private async editLessons(request: Request) {
    const session = await this.auth.getSession(
      readCookie(request.headers.get('cookie'), sessionCookie),
    );
    if (!session) return privateJson({ error: 'Cần đăng nhập bằng tài khoản giáo viên.' }, 401);
    if (request.method === 'GET') return privateJson(await this.published());
    if (request.method !== 'POST') return privateJson({ error: 'Phương thức không hợp lệ.' }, 405);
    if (
      !this.auth.allowedOrigin(request.headers.get('origin') ?? '') ||
      request.headers.get('x-csrf-token') !== session.csrf
    )
      return privateJson({ error: 'Phiên không hợp lệ. Hãy tải lại trang.' }, 403);
    let payload: { draft?: unknown; publish?: boolean; revision?: string } | null;
    try {
      payload = JSON.parse(await boundedBody(request, 256_000));
    } catch {
      return privateJson({ error: 'Dữ liệu không hợp lệ hoặc quá lớn.' }, 400);
    }
    const now = new Date().toISOString();
    if (payload?.publish !== true) {
      const base = await this.published();
      const result = preparePublication(base, payload?.draft, now);
      return privateJson({
        issues: result.issues,
        warnings: result.warnings,
        revision: base.updatedAt,
      });
    }
    const initial = await this.published();
    return this.ctx.storage.transaction(async (tx) => {
      const stored = await tx.get<PublishedContent>(publishedKey);
      const base = stored ? normalizeHskLevels(stored) : initial;
      if (payload?.revision !== base.updatedAt)
        return privateJson(
          { error: 'Nội dung đã thay đổi. Kiểm tra lại bản nháp trước khi xuất bản.' },
          409,
        );
      const revision = Date.parse(base.updatedAt);
      const publishedAt = new Date(
        Math.max(Date.now(), Number.isFinite(revision) ? revision + 1 : 0),
      ).toISOString();
      const result = preparePublication(base, payload?.draft, publishedAt);
      if (!result.bundle) return privateJson(result, 422);
      if (new TextEncoder().encode(JSON.stringify(result.bundle)).length > 750_000)
        return privateJson({ error: 'Kho nội dung đã đạt giới hạn của bản quản lý này.' }, 413);
      await tx.put(publishedKey, result.bundle);
      return privateJson({ warnings: result.warnings, content: result.bundle });
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/content' && request.method === 'GET')
      return Response.json(await this.published(), { headers: { 'Cache-Control': 'no-cache' } });
    if (url.pathname === '/api/teacher/lessons') return this.editLessons(request);
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
    const course = () => env.HUB.get(env.HUB.idFromName('lesson-management'));
    if (
      pathname === '/api/content' ||
      pathname === '/api/teacher/lessons' ||
      ['/api/auth/session', '/api/auth/password', '/api/auth/logout'].includes(pathname)
    )
      return course().fetch(request);
    // Two-player duels: create a room (POST) and join it by invite code (WebSocket).
    if (pathname === '/api/duel' && request.method === 'POST') {
      let body: string;
      try {
        body = await boundedBody(request, 60_000);
      } catch {
        return Response.json({ error: 'Quá lớn.' }, { status: 413 });
      }
      const requestData = (await new Response(body).json().catch(() => null)) as {
        game?: unknown;
        topic?: unknown;
        orderCount?: unknown;
      } | null;
      if (requestData?.game === 'tea') {
        const { scenarios } = await course()
          .fetch('https://course/api/content')
          .then((r) => r.json<PublishedContent>());
        const topic = topicIds.find((id) => id === (requestData.topic ?? 'tea'));
        if (!topic) return Response.json({ error: 'Tình huống không hợp lệ.' }, { status: 400 });
        body = JSON.stringify({
          game: 'tea',
          topic,
          orderCount: requestData.orderCount,
          scenarios: shuffle((scenarios ?? []).filter((s) => s.topic === topic)).slice(
            0,
            TEA_MAX_ORDERS,
          ),
        });
      }
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
    // The retired classroom endpoints still return 410.
    if (pathname.startsWith('/api/'))
      return Response.json(
        { error: 'Chế độ lớp học và đăng nhập đã ngừng sử dụng.' },
        { status: 410 },
      );
    return env.ASSETS.fetch(request);
  },
};
