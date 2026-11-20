/**
 * What every two-player duel shares, whatever the game: invite codes, two seats, ready + countdown,
 * reconnect grace, result and rematch. Pure functions over plain objects, run by the Durable Object
 * referee and tested in Node. Each game adds its own board and messages on top (see engines.ts).
 */
import { z } from 'zod';

export const COUNTDOWN_MS = 3000;
export const RECONNECT_MS = 20000;
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const codePattern = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export function makeCode(random = Math.random) {
  return Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)],
  ).join('');
}

export type DuelGame = 'garden' | 'fruit' | 'dragon';
export type DuelEnd = 'cleared' | 'time' | 'forfeit';
export type BasePlayer = {
  id: string;
  name: string;
  score: number;
  ready: boolean;
  connected: boolean;
  goneAt: number | null;
};
export type BaseEvent = { seq: number; kind: string };
export type BaseState = {
  game: DuelGame;
  code: string;
  phase: 'lobby' | 'playing' | 'done';
  round: number;
  players: BasePlayer[];
  startAt: number | null;
  endsAt: number | null;
  winner: string | 'draw' | null;
  endReason: DuelEnd | null;
  event: BaseEvent | null;
  seq: number;
};

/** Messages every game understands; game-specific ones are parsed by that game's engine. */
export const commonMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready'), ready: z.boolean() }),
  z.object({ type: z.literal('rematch') }),
  z.object({ type: z.literal('name'), name: z.string().trim().min(1).max(24) }),
]);
export type CommonMessage = z.infer<typeof commonMessageSchema>;

export function emitEvent<S extends BaseState>(state: S, event: Record<string, unknown>) {
  state.event = { ...event, seq: ++state.seq } as BaseEvent;
}

/** First two people in a room play; a returning id takes its seat back. */
export function seat<P extends BasePlayer>(
  state: { players: P[] },
  id: string,
  name: string,
  extra: Omit<P, keyof BasePlayer>,
): P | null {
  const existing = state.players.find((p) => p.id === id);
  if (existing) {
    existing.connected = true;
    existing.goneAt = null;
    if (name) existing.name = name;
    return existing;
  }
  if (state.players.length >= 2) return null;
  const player = {
    id,
    name: name || `Người chơi ${state.players.length + 1}`,
    score: 0,
    ready: false,
    connected: true,
    goneAt: null,
    ...extra,
  } as P;
  state.players.push(player);
  return player;
}

/** Leaving the lobby frees the seat; during a game the seat is held for a reconnect. */
export function leave(state: BaseState, id: string, now: number) {
  const player = state.players.find((p) => p.id === id);
  if (!player) return null;
  player.connected = false;
  player.goneAt = now;
  if (state.phase !== 'playing') {
    player.ready = false;
    if (state.phase === 'lobby') state.players = state.players.filter((p) => p.id !== id);
  }
  return player;
}

/** Both players ready in the lobby: start after a short countdown. Returns true when it started. */
export function ready(state: BaseState, id: string, value: boolean, now: number) {
  const player = state.players.find((p) => p.id === id);
  if (!player || state.phase !== 'lobby') return false;
  player.ready = value;
  if (state.players.length < 2 || !state.players.every((p) => p.ready && p.connected)) return false;
  state.phase = 'playing';
  state.startAt = now + COUNTDOWN_MS;
  state.endsAt = null;
  emitEvent(state, { kind: 'start' });
  return true;
}

/** End the game: higher score wins unless a winner is given (forfeit). */
export function conclude(state: BaseState, reason: DuelEnd, winner?: string) {
  state.phase = 'done';
  state.endReason = reason;
  const [a, b] = state.players;
  state.winner =
    winner ??
    (!b ? (a?.id ?? null) : a.score === b.score ? 'draw' : a.score > b.score ? a.id : b.id);
  for (const p of state.players) p.ready = false;
  emitEvent(state, { kind: 'end' });
}

/** A player who did not come back within the grace period loses. Returns true when it ended. */
export function checkForfeit(state: BaseState, now: number) {
  if (state.phase !== 'playing') return false;
  const gone = state.players.find(
    (p) => !p.connected && p.goneAt !== null && now - p.goneAt >= RECONNECT_MS,
  );
  if (!gone) return false;
  const other = state.players.find((p) => p.id !== gone.id);
  conclude(state, 'forfeit', other?.id ?? 'draw');
  return true;
}

/** Same settings, fresh game; both players confirm ready again. Returns false when not allowed. */
export function resetForRematch(state: BaseState, id: string) {
  if (state.phase !== 'done' || !state.players.some((p) => p.id === id)) return false;
  state.phase = 'lobby';
  state.round++;
  state.startAt = null;
  state.endsAt = null;
  state.winner = null;
  state.endReason = null;
  state.event = null;
  state.players = state.players.filter((p) => p.connected);
  for (const p of state.players) Object.assign(p, { score: 0, ready: false });
  return true;
}

/** Earliest of the given times and any pending forfeit, or null. */
export function earliest(state: BaseState, times: (number | null)[]) {
  const all = times.filter((t): t is number => t !== null);
  if (state.phase === 'playing')
    for (const p of state.players)
      if (!p.connected && p.goneAt !== null) all.push(p.goneAt + RECONNECT_MS);
  return all.length ? Math.min(...all) : null;
}
