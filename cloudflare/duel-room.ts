import { DurableObject } from 'cloudflare:workers';
import { commonMessageSchema, type BaseState } from '../src/games/duel/core';
import { engines, roomGameSchema } from '../src/games/duel/engines';

type Seat = { player: string };
/** Rooms nobody touches for this long are wiped. */
const IDLE_MS = 2 * 3600 * 1000;
/** While a game runs, state is written at least this often (steps in between live in memory). */
const SAVE_MS = 2000;
/** The storage alarm only backs up the in-memory timer, in case the object is evicted mid-game. */
const BACKUP_MS = 2000;

/**
 * One duel room = one Durable Object, addressed by its invite code. It is the referee for any of
 * the duel games (engines.ts): holds the board, applies moves in arrival order and broadcasts the
 * result. Deadlines (time limits, next question, the dragons' steps) run on an in-memory timer,
 * with a storage alarm as backup; WebSockets use the hibernation API, so idle rooms cost nothing.
 */
type RoomEnv = Record<string, never>;
export class DuelRoom extends DurableObject<RoomEnv> {
  private state: BaseState | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private alarmAt = 0;
  private savedAt = 0;
  /** The last state sent to players, to skip wake-ups that changed nothing. */
  private sent = '';
  constructor(ctx: DurableObjectState, env: RoomEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<BaseState>('state')) ?? null;
      this.alarmAt = (await ctx.storage.getAlarm()) ?? 0;
    });
  }

  private get engine() {
    return engines[this.state?.game ?? 'garden'];
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/create' && request.method === 'POST') {
      if (this.state) return new Response('exists', { status: 409 });
      const body = await request.json().catch(() => null);
      const kind = roomGameSchema.safeParse(body);
      if (!kind.success)
        return Response.json({ error: 'Thiết lập phòng không hợp lệ.' }, { status: 400 });
      const created = engines[kind.data.game].create(url.searchParams.get('code') ?? '', {
        ...(body as object),
        game: kind.data.game,
      });
      if (typeof created === 'string') return Response.json({ error: created }, { status: 400 });
      this.state = created;
      await this.save();
      await this.schedule();
      return Response.json({ code: this.state.code });
    }
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket')
      return new Response('Expected WebSocket', { status: 426 });
    if (!this.state) return new Response('Không tìm thấy phòng', { status: 404 });
    const player = (url.searchParams.get('player') ?? '').slice(0, 40);
    const name = (url.searchParams.get('name') ?? '').trim().slice(0, 24);
    if (!/^[\w-]{8,40}$/.test(player)) return new Response('Bad player id', { status: 400 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const seat = this.engine.join(this.state, player, name, Date.now());
    if (!seat) {
      server.send(JSON.stringify({ type: 'full' }));
      server.close(4001, 'Phòng đã đủ 2 người');
    } else {
      server.serializeAttachment({ player } satisfies Seat);
      // Close a previous socket of the same player (a second tab or a reconnect).
      for (const ws of this.ctx.getWebSockets())
        if (ws !== server && (ws.deserializeAttachment() as Seat | null)?.player === player)
          ws.close(4002, 'Đã mở ở nơi khác');
      await this.commit();
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const seat = ws.deserializeAttachment() as Seat | null;
    if (!this.state || !seat || typeof message !== 'string' || message.length > 2000) return;
    let data: unknown;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }
    const now = Date.now();
    const state = this.state;
    const engine = this.engine;
    engine.tick(state, now);
    const common = commonMessageSchema.safeParse(data);
    if (common.success) {
      const msg = common.data;
      if (msg.type === 'ready') engine.setReady(state, seat.player, msg.ready, now);
      else if (msg.type === 'rematch') engine.rematch(state, seat.player);
      else {
        const player = state.players.find((p) => p.id === seat.player);
        if (player) player.name = msg.name;
      }
      return this.commit();
    }
    if (engine.handle(state, seat.player, data, now)) await this.commit();
    // A message after an eviction restarts the clock even when nothing is broadcast.
    else if (!this.timer) await this.schedule();
  }

  async webSocketClose(ws: WebSocket) {
    const seat = ws.deserializeAttachment() as Seat | null;
    if (!this.state || !seat) return;
    // Only the player's last open socket counts (a replaced tab closing must not unseat them).
    const stillOpen = this.ctx
      .getWebSockets()
      .some(
        (other) =>
          other !== ws && (other.deserializeAttachment() as Seat | null)?.player === seat.player,
      );
    if (!stillOpen) this.engine.disconnect(this.state, seat.player, Date.now());
    await this.commit();
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }

  async alarm() {
    this.alarmAt = 0;
    if (!this.state) return;
    const now = Date.now();
    const lastSeen = (await this.ctx.storage.get<number>('touched')) ?? 0;
    if (this.ctx.getWebSockets().length === 0 && now - lastSeen >= IDLE_MS) {
      if (this.timer) clearTimeout(this.timer);
      await this.ctx.storage.deleteAll();
      this.state = null;
      return;
    }
    await this.wake();
  }

  /** A deadline is due: let the game advance, then tell everyone. */
  private async wake() {
    this.timer = undefined;
    if (!this.state) return;
    this.engine.tick(this.state, Date.now());
    await this.commit(true);
  }

  private async save() {
    this.savedAt = Date.now();
    await this.ctx.storage.put({ state: this.state, touched: this.savedAt });
  }

  /** Persist (now or soon), broadcast, and schedule the next deadline. */
  private async commit(frequent = false) {
    if (!this.state) return;
    const body = JSON.stringify(this.engine.publicState(this.state));
    // A timer that fired a moment early changes nothing: no message, no write, just wait again.
    if (frequent && body === this.sent) return this.schedule();
    this.sent = body;
    // Steps of a running game are frequent: write them every couple of seconds, not each time.
    if (!frequent || Date.now() - this.savedAt >= SAVE_MS || this.state.phase !== 'playing')
      await this.save();
    const payload = `{"type":"state","now":${Date.now()},"state":${body}}`;
    for (const ws of this.ctx.getWebSockets())
      try {
        ws.send(payload);
      } catch {
        /* closing socket */
      }
    await this.schedule();
  }

  private async schedule() {
    if (!this.state) return;
    const now = Date.now();
    const deadline = this.engine.nextDeadline(this.state);
    if (this.timer) clearTimeout(this.timer);
    this.timer =
      deadline === null
        ? undefined
        : // One millisecond past the deadline, so the wake-up never lands just before it.
          setTimeout(() => void this.wake(), Math.max(1, deadline - now + 1));
    // Backup alarm: early is harmless (it just ticks), late is not. Only rewrite it when needed.
    const backup = deadline === null ? now + IDLE_MS : Math.max(deadline, now + BACKUP_MS);
    if (!this.alarmAt || this.alarmAt <= now || this.alarmAt > backup) {
      this.alarmAt = backup;
      await this.ctx.storage.setAlarm(backup);
    }
  }
}
