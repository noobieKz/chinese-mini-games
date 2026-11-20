/**
 * Rồng săn chữ, two players: two dragons on one board, one shared word and shared character
 * pearls. Whoever eats the next character of the word scores it; whoever eats the last one also
 * gets the word bonus. Wrong characters and crashes cost points; a crashed dragon comes back small
 * somewhere free. The referee runs the steps on its own clock; players only send turns.
 */
import { z } from 'zod';
import { wordSchema } from '../../../shared/content';
import { STEP, charsOf, type Dir, type Point } from '../dragon-words/model';
import type { Word } from '../word-garden/vocabulary';
import {
  checkForfeit,
  conclude,
  earliest,
  leave,
  ready,
  resetForRematch,
  seat,
  type BasePlayer,
  type BaseState,
} from './core';

export const DRAGON_COLS = 14;
export const DRAGON_ROWS = 14;
export const EAT_POINTS = 5;
export const WORD_BONUS = 10;
export const MISTAKE_POINTS = 3;
export const CRASH_POINTS = 3;
/** Steps after a respawn in which the dragon passes through everything. */
export const SAFE_STEPS = 8;
const DECOYS = 3;
export const DRAGON_STEP_MS = { slow: 260, normal: 210, fast: 170 } as const;
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const dragonSettingsSchema = z.object({
  speed: z.enum(['slow', 'normal', 'fast']),
  minutes: z.union([z.literal(2), z.literal(3)]),
  label: z.string().trim().min(1).max(80),
});
export type DragonSettings = z.infer<typeof dragonSettingsSchema>;
export const dragonRoomSchema = z.object({
  game: z.literal('dragon'),
  settings: dragonSettingsSchema,
  words: z.array(wordSchema).min(2).max(60),
});
const dirSchema = z.enum(['up', 'down', 'left', 'right']);
export const dragonMessageSchema = z.object({
  type: z.literal('turn'),
  dir: dirSchema,
  /** The step the player was looking at, and whether the head looked past halfway into the next cell. */
  step: z.number().int().min(0),
  late: z.boolean(),
});
export type DragonMessage = z.infer<typeof dragonMessageSchema>;

export type DuelSnake = { body: Point[]; dir: Dir; turns: Dir[]; grow: number; safe: number };
export type DragonPlayer = BasePlayer & { words: number; misses: number; crashes: number };
export type DragonPearl = { id: number; char: string; x: number; y: number };
/** What happened in the last step, for sounds and sparks. */
export type DragonEffect =
  | { kind: 'eat'; by: string; at: Point; char: string }
  | { kind: 'word'; by: string; at: Point; word: Word; points: number }
  | { kind: 'mistake'; by: string; at: Point; char: string }
  | { kind: 'crash'; by: string; at: Point };
export type DragonDuelEvent = { seq: number; kind: 'start' } | { seq: number; kind: 'end' };
export type DragonDuelState = Omit<BaseState, 'players' | 'event'> & {
  game: 'dragon';
  settings: DragonSettings;
  players: DragonPlayer[];
  event: DragonDuelEvent | null;
  cols: number;
  rows: number;
  pool: Word[];
  queue: Word[];
  word: Word;
  progress: number;
  pearls: DragonPearl[];
  nextPearl: number;
  snakes: Record<string, DuelSnake>;
  step: number;
  stepMs: number;
  nextStepAt: number | null;
  effects: DragonEffect[];
};

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const wrap = (state: DragonDuelState, p: Point) => ({
  x: (p.x + state.cols) % state.cols,
  y: (p.y + state.rows) % state.rows,
});
function shuffled<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const allSnakes = (state: DragonDuelState) => Object.values(state.snakes);

/** Cells away from every dragon and from the next few cells in front of each head. */
function freeCells(state: DragonDuelState, gap = 2) {
  const blocked = (p: Point) =>
    allSnakes(state).some((snake) => {
      const head = snake.body[0];
      const ahead = STEP[snake.dir];
      return (
        snake.body.some((s) => same(s, p)) ||
        Math.abs(head.x - p.x) + Math.abs(head.y - p.y) < 3 ||
        [1, 2, 3, 4].some((n) =>
          same(p, wrap(state, { x: head.x + ahead.x * n, y: head.y + ahead.y * n })),
        )
      );
    }) || state.pearls.some((t) => Math.abs(t.x - p.x) + Math.abs(t.y - p.y) < gap);
  const cells: Point[] = [];
  for (let y = 0; y < state.rows; y++)
    for (let x = 0; x < state.cols; x++) if (!blocked({ x, y })) cells.push({ x, y });
  return cells;
}

function place(state: DragonDuelState, chars: string[], random: () => number) {
  for (const char of chars) {
    const cells = freeCells(state);
    const pool = cells.length ? cells : freeCells(state, 0);
    if (!pool.length) return;
    const cell = pool[Math.floor(random() * pool.length)];
    state.pearls.push({ id: state.nextPearl++, char, ...cell });
  }
}

function spawnPearls(state: DragonDuelState, random: () => number) {
  state.pearls = [];
  const own = new Set(charsOf(state.word));
  const others = shuffled(
    [...new Set(state.pool.flatMap(charsOf))].filter((c) => !own.has(c)),
    random,
  );
  place(state, shuffled([...charsOf(state.word), ...others.slice(0, DECOYS)], random), random);
}

function nextWord(state: DragonDuelState, random: () => number) {
  if (!state.queue.length) {
    state.queue = shuffled(state.pool, random);
    if (state.queue[0]?.id === state.word?.id && state.queue.length > 1)
      state.queue.push(state.queue.shift()!);
  }
  state.word = state.queue.shift()!;
  state.progress = 0;
}

/** The two starting dragons: top-left heading right, bottom-right heading left. */
function startSnakes(state: DragonDuelState) {
  const top = Math.floor(state.rows / 4),
    bottom = state.rows - 1 - top;
  const ids = state.players.map((p) => p.id);
  const starts: DuelSnake[] = [
    {
      body: [2, 1, 0].map((d) => ({ x: 2 + d, y: top })),
      dir: 'right',
      turns: [],
      grow: 0,
      safe: 0,
    },
    {
      body: [0, 1, 2].map((d) => ({ x: state.cols - 5 + d, y: bottom })),
      dir: 'left',
      turns: [],
      grow: 0,
      safe: 0,
    },
  ];
  state.snakes = {};
  ids.forEach((id, i) => (state.snakes[id] = starts[i]));
}

function deal(state: DragonDuelState, random: () => number) {
  state.queue = shuffled(state.pool, random);
  state.word = state.queue.shift()!;
  state.progress = 0;
  state.step = 0;
  state.nextStepAt = null;
  state.effects = [];
  startSnakes(state);
  spawnPearls(state, random);
}

export function createDragonDuel(
  code: string,
  settings: DragonSettings,
  pool: Word[],
  random = Math.random,
): DragonDuelState {
  const state: DragonDuelState = {
    game: 'dragon',
    code,
    settings,
    phase: 'lobby',
    round: 1,
    players: [],
    startAt: null,
    endsAt: null,
    winner: null,
    endReason: null,
    event: null,
    seq: 0,
    cols: DRAGON_COLS,
    rows: DRAGON_ROWS,
    pool,
    queue: [],
    word: pool[0],
    progress: 0,
    pearls: [],
    nextPearl: 1,
    snakes: {},
    step: 0,
    stepMs: DRAGON_STEP_MS[settings.speed],
    nextStepAt: null,
    effects: [],
  };
  deal(state, random);
  return state;
}

export function joinDragon(state: DragonDuelState, id: string, name: string) {
  const player = seat<DragonPlayer>(state, id, name, { words: 0, misses: 0, crashes: 0 });
  // The board in the lobby already shows where each dragon starts.
  if (player && state.phase === 'lobby') startSnakes(state);
  return player;
}
export function leaveDragon(state: DragonDuelState, id: string, now: number) {
  leave(state, id, now);
  if (state.phase === 'lobby') startSnakes(state);
}

export function readyDragon(state: DragonDuelState, id: string, value: boolean, now: number) {
  if (!ready(state, id, value, now)) return;
  startSnakes(state);
  state.endsAt = state.startAt! + state.settings.minutes * 60_000;
  state.nextStepAt = state.startAt! + state.stepMs;
}

/**
 * A turn from a player. As in the one-player game, a press after the head looked halfway into the
 * next cell turns from that next cell: the dragon goes one more cell straight, then turns.
 */
export function steer(state: DragonDuelState, id: string, dir: Dir, step: number, late: boolean) {
  const snake = state.snakes[id];
  if (!snake || state.phase !== 'playing') return;
  const last = snake.turns.at(-1) ?? snake.dir;
  if (dir === last || dir === OPPOSITE[last] || snake.turns.length >= 2) return;
  if (late && step === state.step && !snake.turns.length) snake.turns.push(snake.dir, dir);
  else snake.turns.push(dir);
}

/** A place for a crashed dragon: three free cells in a row, away from the other heads. */
function respawn(state: DragonDuelState, id: string, random: () => number) {
  const others = Object.entries(state.snakes).filter(([other]) => other !== id);
  const options: DuelSnake[] = [];
  for (let y = 0; y < state.rows; y++)
    for (let x = 0; x < state.cols; x++)
      for (const dir of ['right', 'left'] as Dir[]) {
        const back = dir === 'right' ? -1 : 1;
        const body = [0, 1, 2].map((d) => wrap(state, { x: x + back * d, y }));
        const clear = body.every(
          (p) =>
            !state.pearls.some((pearl) => same(pearl, p)) &&
            others.every(
              ([, snake]) =>
                !snake.body.some((s) => same(s, p)) &&
                Math.abs(snake.body[0].x - p.x) + Math.abs(snake.body[0].y - p.y) >= 4,
            ),
        );
        if (clear) options.push({ body, dir, turns: [], grow: 0, safe: SAFE_STEPS });
      }
  const fallback: DuelSnake = {
    body: state.snakes[id].body.slice(0, 1),
    dir: state.snakes[id].dir,
    turns: [],
    grow: 2,
    safe: SAFE_STEPS,
  };
  state.snakes[id] = options.length ? options[Math.floor(random() * options.length)] : fallback;
}

/** Advance both dragons one cell at the same time. */
export function advance(state: DragonDuelState, random = Math.random) {
  state.effects = [];
  state.step++;
  const ids = state.players.map((p) => p.id).filter((id) => state.snakes[id]);
  // Alternate who is served first when both reach a pearl in the same step.
  if (state.step % 2 === 0) ids.reverse();
  for (const id of ids) {
    const snake = state.snakes[id];
    if (snake.turns.length) snake.dir = snake.turns.shift()!;
    const head = snake.body[0];
    snake.body.unshift(
      wrap(state, { x: head.x + STEP[snake.dir].x, y: head.y + STEP[snake.dir].y }),
    );
    if (snake.grow > 0) snake.grow--;
    else snake.body.pop();
  }
  // A head inside any solid body (its own or the other's) crashes; heads meeting crash both.
  const crashed = ids.filter((id) => {
    const snake = state.snakes[id];
    if (snake.safe > 0) return false;
    const head = snake.body[0];
    return ids.some((other) => {
      const body = state.snakes[other];
      if (other !== id && body.safe > 0) return false;
      return body.body.some((p, i) => (other === id ? i > 0 : true) && same(p, head));
    });
  });
  for (const id of crashed) {
    const player = state.players.find((p) => p.id === id)!;
    player.score = Math.max(0, player.score - CRASH_POINTS);
    player.crashes++;
    state.effects.push({ kind: 'crash', by: id, at: state.snakes[id].body[0] });
    respawn(state, id, random);
  }
  for (const id of ids) {
    if (crashed.includes(id)) continue;
    const snake = state.snakes[id];
    const player = state.players.find((p) => p.id === id)!;
    const head = snake.body[0];
    const hit = state.pearls.findIndex((p) => same(p, head));
    if (hit < 0) continue;
    const pearl = state.pearls[hit];
    state.pearls.splice(hit, 1);
    if (pearl.char !== charsOf(state.word)[state.progress]) {
      player.score = Math.max(0, player.score - MISTAKE_POINTS);
      player.misses++;
      state.effects.push({ kind: 'mistake', by: id, at: head, char: pearl.char });
      place(state, [pearl.char], random);
      continue;
    }
    state.progress++;
    snake.grow++;
    player.score += EAT_POINTS;
    state.effects.push({ kind: 'eat', by: id, at: head, char: pearl.char });
    if (state.progress < charsOf(state.word).length) continue;
    player.score += WORD_BONUS;
    player.words++;
    state.effects.push({ kind: 'word', by: id, at: head, word: state.word, points: WORD_BONUS });
    nextWord(state, random);
    spawnPearls(state, random);
  }
  for (const id of ids) if (state.snakes[id].safe > 0) state.snakes[id].safe--;
}

/** The referee's clock: steps that are due (never a long backlog), the time limit, forfeits. */
export function tickDragon(state: DragonDuelState, now: number, random = Math.random) {
  if (state.phase !== 'playing') return;
  if (checkForfeit(state, now)) return;
  let steps = 0;
  while (state.nextStepAt !== null && now >= state.nextStepAt && steps < 3) {
    if (state.endsAt !== null && state.nextStepAt >= state.endsAt) break;
    advance(state, random);
    state.nextStepAt += state.stepMs;
    steps++;
  }
  if (state.nextStepAt !== null && now >= state.nextStepAt) state.nextStepAt = now + state.stepMs;
  if (state.endsAt !== null && now >= state.endsAt) conclude(state, 'time');
}

export function rematchDragon(state: DragonDuelState, id: string, random = Math.random) {
  if (!resetForRematch(state, id)) return;
  deal(state, random);
  for (const p of state.players) Object.assign(p, { words: 0, misses: 0, crashes: 0 });
}

export function dragonDeadline(state: DragonDuelState) {
  if (state.phase !== 'playing') return null;
  return earliest(state, [state.endsAt, state.nextStepAt]);
}

/** What players receive: no word lists, and nobody's queued turns. */
export function publicDragon(state: DragonDuelState) {
  const { pool: _pool, queue: _queue, snakes, ...rest } = state;
  void _pool;
  void _queue;
  return {
    ...rest,
    snakes: Object.fromEntries(
      Object.entries(snakes).map(([id, { turns: _turns, ...snake }]) => (void _turns, [id, snake])),
    ),
  };
}
export type PublicDragonState = ReturnType<typeof publicDragon>;
