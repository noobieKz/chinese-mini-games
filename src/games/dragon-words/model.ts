import type { Word } from '../word-garden/vocabulary';

/** Pure rules for "Rồng săn chữ": a grid snake that eats character pearls in word order. */
export type Dir = 'up' | 'down' | 'left' | 'right';
export type Point = { x: number; y: number };
export type Pearl = { id: number; char: string; x: number; y: number };
export type DragonSpeed = 'slow' | 'normal' | 'fast';
export type DragonEvent =
  | { kind: 'eat'; at: Point; char: string }
  | { kind: 'word'; at: Point; word: Word; points: number }
  | { kind: 'mistake'; at: Point; char: string }
  | { kind: 'bite'; at: Point }
  | { kind: 'over' };
export type WordResult = { word: Word; done: boolean; mistakes: number };
export type DragonState = {
  cols: number;
  rows: number;
  snake: Point[];
  dir: Dir;
  turns: Dir[];
  grow: number;
  pearls: Pearl[];
  word: Word;
  progress: number;
  wordMistakes: number;
  queue: Word[];
  pool: Word[];
  score: number;
  lives: number;
  combo: number;
  bestCombo: number;
  results: WordResult[];
  stepMs: number;
  phase: 'playing' | 'over';
  events: DragonEvent[];
  nextPearl: number;
  speed: DragonSpeed;
};

export const LIVES = 3;
const DECOYS = 3;
const SPEEDS: Record<DragonSpeed, { start: number; min: number; drop: number }> = {
  slow: { start: 300, min: 160, drop: 6 },
  normal: { start: 230, min: 120, drop: 7 },
  fast: { start: 175, min: 90, drop: 6 },
};
export const STEP: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const charsOf = (word: Word) => [...word.hanzi];
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

function shuffled<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Free cells away from the head and its next few steps, so a pearl never appears under the dragon's nose. */
function freeCells(state: DragonState, taken: Point[]) {
  const head = state.snake[0];
  const ahead = STEP[state.dir];
  const blocked = (p: Point) =>
    state.snake.some((s) => same(s, p)) ||
    taken.some((t) => Math.abs(t.x - p.x) + Math.abs(t.y - p.y) < 2) ||
    Math.abs(head.x - p.x) + Math.abs(head.y - p.y) < 3 ||
    [1, 2, 3, 4].some((n) =>
      same(p, {
        x: (head.x + ahead.x * n + state.cols) % state.cols,
        y: (head.y + ahead.y * n + state.rows) % state.rows,
      }),
    );
  const cells: Point[] = [];
  for (let y = 0; y < state.rows; y++)
    for (let x = 0; x < state.cols; x++) if (!blocked({ x, y })) cells.push({ x, y });
  return cells;
}

function place(state: DragonState, chars: string[], random: () => number) {
  for (const char of chars) {
    const cells = freeCells(state, state.pearls);
    if (!cells.length) return;
    const cell = cells[Math.floor(random() * cells.length)];
    state.pearls.push({ id: state.nextPearl++, char, ...cell });
  }
}

/** The word's characters plus decoys taken from other words of the same set. */
function spawnPearls(state: DragonState, random: () => number) {
  state.pearls = [];
  const own = new Set(charsOf(state.word));
  const others = shuffled(
    [...new Set(state.pool.flatMap(charsOf))].filter((c) => !own.has(c)),
    random,
  );
  place(state, shuffled([...charsOf(state.word), ...others.slice(0, DECOYS)], random), random);
}

function nextWord(state: DragonState, random: () => number) {
  if (!state.queue.length) {
    // Endless: reshuffle, avoiding the same word twice in a row.
    state.queue = shuffled(state.pool, random);
    if (state.queue[0]?.id === state.word.id && state.queue.length > 1)
      state.queue.push(state.queue.shift()!);
  }
  state.word = state.queue.shift()!;
  state.progress = 0;
  state.wordMistakes = 0;
}

export function createDragon(
  pool: Word[],
  options: { cols: number; rows: number; speed: DragonSpeed },
  random = Math.random,
): DragonState {
  if (!pool.length) throw new Error('Dragon needs at least one word');
  const queue = shuffled(pool, random);
  const y = Math.floor(options.rows / 2);
  const x = Math.floor(options.cols / 3);
  const state: DragonState = {
    cols: options.cols,
    rows: options.rows,
    snake: [
      { x, y },
      { x: x - 1, y },
      { x: x - 2, y },
    ],
    dir: 'right',
    turns: [],
    grow: 0,
    pearls: [],
    word: queue.shift()!,
    progress: 0,
    wordMistakes: 0,
    queue,
    pool,
    score: 0,
    lives: LIVES,
    combo: 0,
    bestCombo: 0,
    results: [],
    stepMs: SPEEDS[options.speed].start,
    phase: 'playing',
    events: [],
    nextPearl: 1,
    speed: options.speed,
  };
  spawnPearls(state, random);
  return state;
}

/** Buffer up to two turns so quick "down, left" presses between steps both count; no reversing into the neck. */
export function turn(state: DragonState, dir: Dir) {
  const last = state.turns.at(-1) ?? state.dir;
  if (
    state.phase !== 'playing' ||
    dir === last ||
    dir === OPPOSITE[last] ||
    state.turns.length >= 2
  )
    return;
  state.turns.push(dir);
}

/** Returns true when that was the last life. */
function loseLife(state: DragonState) {
  state.lives--;
  state.combo = 0;
  state.wordMistakes++;
  if (state.lives > 0) return false;
  state.phase = 'over';
  state.results.push({ word: state.word, done: false, mistakes: state.wordMistakes });
  state.events.push({ kind: 'over' });
  return true;
}

/** Advance one cell. The board wraps at the edges, so only the dragon's own body is an obstacle. */
export function step(state: DragonState, random = Math.random) {
  state.events = [];
  if (state.phase !== 'playing') return state;
  if (state.turns.length) state.dir = state.turns.shift()!;
  const head = state.snake[0];
  const next = {
    x: (head.x + STEP[state.dir].x + state.cols) % state.cols,
    y: (head.y + STEP[state.dir].y + state.rows) % state.rows,
  };
  // The tail cell is free this step unless the dragon is growing.
  const body = state.grow > 0 ? state.snake : state.snake.slice(0, -1);
  const bitten = body.findIndex((p) => same(p, next));
  state.snake.unshift(next);
  if (state.grow > 0) state.grow--;
  else state.snake.pop();
  if (bitten > 0) {
    // Biting its own body cuts the tail off there (never shorter than head + neck) and costs a life.
    state.snake.length = Math.max(2, bitten + 1);
    state.events.push({ kind: 'bite', at: next });
    if (loseLife(state)) return state;
  }
  const hit = state.pearls.findIndex((p) => same(p, next));
  if (hit < 0) return state;
  const pearl = state.pearls[hit];
  state.pearls.splice(hit, 1);
  const needed = charsOf(state.word)[state.progress];
  if (pearl.char !== needed) {
    state.events.push({ kind: 'mistake', at: next, char: pearl.char });
    // The wrong pearl returns elsewhere so the round stays solvable.
    if (!loseLife(state)) place(state, [pearl.char], random);
    return state;
  }
  state.progress++;
  state.grow++;
  state.score += 5;
  state.events.push({ kind: 'eat', at: next, char: pearl.char });
  if (state.progress < charsOf(state.word).length) return state;
  state.combo++;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const points = 10 + Math.min(state.combo - 1, 4) * 2;
  state.score += points;
  state.results.push({ word: state.word, done: true, mistakes: state.wordMistakes });
  state.events.push({ kind: 'word', at: next, word: state.word, points });
  const speed = SPEEDS[state.speed];
  state.stepMs = Math.max(speed.min, state.stepMs - speed.drop);
  nextWord(state, random);
  spawnPearls(state, random);
  return state;
}
