/**
 * Shared-board duel for the matching games: two players race on ONE board; a pair matched by either
 * player disappears for both. Pure rules, run by the Cloudflare Durable Object (the referee) and
 * tested in Node; clients only render the state and send attempts.
 */
import { z } from 'zod';
import { wordSchema } from '../../../shared/content';
import {
  findPair,
  findPath,
  knownExtraWord,
  makeTiles,
  matches,
  playableShuffle,
  reconcileCharacters,
  shuffle,
  type Cell,
  type Tile,
} from './rules';
import type { Word } from './vocabulary';
import {
  checkForfeit,
  conclude,
  earliest,
  emitEvent,
  leave,
  ready,
  resetForRematch,
  seat,
  type DuelEnd,
} from '../duel/core';
export {
  CODE_ALPHABET,
  codePattern,
  COUNTDOWN_MS,
  makeCode,
  RECONNECT_MS,
  type DuelEnd,
} from '../duel/core';

export const DUEL_COLS = 4; // one layout for phone and desktop players: paths must be identical
export const DUEL_SECONDS = 300;
export const MATCH_POINTS = 10;
export const MISS_POINTS = 2;

export const duelSettingsSchema = z.object({
  mode: z.enum(['characters', 'meaning']),
  difficulty: z.enum(['normal', 'hard']),
  pairs: z.union([z.literal(8), z.literal(12)]),
  /** What the host picked, shown to the guest: "HSK 1 · Bài 2". */
  label: z.string().trim().min(1).max(80),
});
export type DuelSettings = z.infer<typeof duelSettingsSchema>;
export const createRoomSchema = z.object({
  game: z.literal('garden').default('garden'),
  settings: duelSettingsSchema,
  words: z.array(wordSchema).min(2).max(40),
});

/** Board messages of this game (ready / rematch / name are common, see duel/core). */
export const gardenMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('select'), index: z.number().int().min(0).max(63).nullable() }),
  z.object({
    type: z.literal('attempt'),
    a: z.number().int().min(0).max(63),
    b: z.number().int().min(0).max(63),
  }),
]);
export type GardenMessage = z.infer<typeof gardenMessageSchema>;

export type DuelPlayer = {
  id: string;
  name: string;
  score: number;
  matched: number;
  misses: number;
  ready: boolean;
  connected: boolean;
  selected: number | null;
  goneAt: number | null;
};
export type DuelEvent =
  | { seq: number; kind: 'match'; by: string; a: number; b: number; path: Cell[]; word: Word }
  | { seq: number; kind: 'miss'; by: string; a: number; b: number }
  | { seq: number; kind: 'taken'; by: string; a: number; b: number }
  | {
      seq: number;
      kind: 'extra';
      by: string;
      a: number;
      b: number;
      hanzi: string;
      pinyin: string;
      meaning: string;
    }
  | { seq: number; kind: 'shuffle' }
  | { seq: number; kind: 'start' }
  | { seq: number; kind: 'end' };
export type DuelState = {
  game: 'garden';
  code: string;
  settings: DuelSettings;
  pool: Word[];
  tiles: Tile[];
  total: number;
  phase: 'lobby' | 'playing' | 'done';
  round: number;
  players: DuelPlayer[];
  startAt: number | null;
  endsAt: number | null;
  winner: string | 'draw' | null;
  endReason: DuelEnd | null;
  event: DuelEvent | null;
  seq: number;
};

const ordered = (state: DuelState) =>
  state.settings.mode === 'characters' && state.settings.difficulty === 'hard';

function deal(state: DuelState) {
  const mode = state.settings.mode;
  // Ghép chữ needs two-character words; the host already filtered, this keeps the referee honest.
  const usable =
    mode === 'characters' ? state.pool.filter((w) => [...w.hanzi].length === 2) : state.pool;
  state.total = Math.min(state.settings.pairs, usable.length);
  state.tiles = playableShuffle(
    makeTiles(shuffle(usable).slice(0, state.total), mode),
    mode,
    DUEL_COLS,
    ordered(state),
  );
}

export function createDuel(code: string, settings: DuelSettings, pool: Word[]): DuelState {
  const state: DuelState = {
    game: 'garden',
    code,
    settings,
    pool,
    tiles: [],
    total: 0,
    phase: 'lobby',
    round: 1,
    players: [],
    startAt: null,
    endsAt: null,
    winner: null,
    endReason: null,
    event: null,
    seq: 0,
  };
  deal(state);
  return state;
}

/** Omit over each member of the union, so `kind` still selects the right fields. */
type EventInput = DuelEvent extends infer E
  ? E extends DuelEvent
    ? Omit<E, 'seq'>
    : never
  : never;
const emit = (state: DuelState, event: EventInput) => emitEvent(state, event);

/** First two people in a room play; a returning id takes its seat back. */
export function join(state: DuelState, id: string, name: string, now: number) {
  void now;
  return seat<DuelPlayer>(state, id, name, { matched: 0, misses: 0, selected: null });
}

export function disconnect(state: DuelState, id: string, now: number) {
  const player = leave(state, id, now);
  if (player) (player as DuelPlayer).selected = null;
}

/** Both players ready in the lobby: start after a short countdown, with a fixed end time. */
export function setReady(state: DuelState, id: string, value: boolean, now: number) {
  if (ready(state, id, value, now)) state.endsAt = state.startAt! + DUEL_SECONDS * 1000;
}

export function select(state: DuelState, id: string, index: number | null) {
  const player = state.players.find((p) => p.id === id);
  if (!player || state.phase !== 'playing') return;
  player.selected =
    index !== null && state.tiles[index] && !state.tiles[index].removed ? index : null;
}

function finish(state: DuelState, reason: DuelEnd, winner?: string) {
  conclude(state, reason, winner);
  for (const p of state.players) p.selected = null;
}

/**
 * One player picks two tiles. First valid attempt wins the pair for that player; a pair the other
 * player already took is "taken" (no penalty). A real word outside the board costs nothing.
 */
export function attempt(state: DuelState, id: string, a: number, b: number, now: number) {
  const player = state.players.find((p) => p.id === id);
  if (!player || state.phase !== 'playing' || state.startAt === null || now < state.startAt) return;
  if (state.endsAt !== null && now >= state.endsAt) return finish(state, 'time');
  const tileA = state.tiles[a],
    tileB = state.tiles[b];
  if (!tileA || !tileB || a === b) return;
  player.selected = null;
  if (tileA.removed || tileB.removed) return emit(state, { kind: 'taken', by: id, a, b });
  const mode = state.settings.mode;
  const path =
    matches(tileA, tileB, mode, state.tiles, ordered(state)) &&
    findPath(state.tiles, a, b, DUEL_COLS);
  if (!path) {
    const extra = knownExtraWord(tileA, tileB, mode, ordered(state));
    if (extra) return emit(state, { kind: 'extra', by: id, a, b, ...extra });
    player.score = Math.max(0, player.score - MISS_POINTS);
    player.misses++;
    return emit(state, { kind: 'miss', by: id, a, b });
  }
  if (mode === 'characters') reconcileCharacters(state.tiles, a, b, ordered(state));
  const word = state.tiles[a].word;
  tileA.removed = true;
  tileB.removed = true;
  player.score += MATCH_POINTS;
  player.matched++;
  for (const p of state.players) if (p.selected === a || p.selected === b) p.selected = null;
  emit(state, { kind: 'match', by: id, a, b, path, word });
  if (state.tiles.every((t) => t.removed)) return finish(state, 'cleared');
  if (!findPair(state.tiles, mode, DUEL_COLS, ordered(state))) {
    state.tiles = playableShuffle(state.tiles, mode, DUEL_COLS, ordered(state));
    for (const p of state.players) p.selected = null;
    // The match event is already sent with this state; the client re-reads tiles from the snapshot.
  }
}

/** Called by the referee's clock: time limit, and players who did not come back. */
export function tick(state: DuelState, now: number) {
  if (state.phase !== 'playing') return;
  if (state.endsAt !== null && now >= state.endsAt) return finish(state, 'time');
  if (checkForfeit(state, now)) for (const p of state.players) p.selected = null;
}

/** Same settings, new board; both players confirm ready again. */
export function rematch(state: DuelState, id: string) {
  if (!resetForRematch(state, id)) return;
  deal(state);
  for (const p of state.players) Object.assign(p, { matched: 0, misses: 0, selected: null });
}

/**
 * What players receive: everything except the word pool and each player's current selection, so
 * nobody can see (or read from the network) which tile the opponent is about to play.
 */
export function publicState(state: DuelState) {
  const { pool: _pool, ...rest } = state;
  void _pool;
  return {
    ...rest,
    players: rest.players.map(({ selected: _selected, ...player }) => (void _selected, player)),
  };
}
export type PublicDuelState = ReturnType<typeof publicState>;

/** Next time the referee must wake: time limit or a pending forfeit. */
export function nextDeadline(state: DuelState) {
  return state.phase === 'playing' ? earliest(state, [state.endsAt]) : null;
}
