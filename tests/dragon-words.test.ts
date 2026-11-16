import assert from 'node:assert/strict';
import test from 'node:test';
import {
  charsOf,
  createDragon,
  LIVES,
  step,
  turn,
  type DragonState,
  type Point,
} from '../src/games/dragon-words/model';
import { vocabulary } from '../src/games/word-garden/vocabulary';

const hsk1 = vocabulary.filter((w) => w.level === 'HSK 1');
const seeded =
  (seed = 7) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
const fresh = () => createDragon(hsk1, { cols: 16, rows: 12, speed: 'normal' }, seeded());
/** Put a pearl directly in front of the head so the next step eats it. */
const pearlAhead = (state: DragonState, char: string) => {
  const head = state.snake[0];
  const at: Point = { x: (head.x + 1) % state.cols, y: head.y };
  state.pearls = state.pearls.filter((p) => p.x !== at.x || p.y !== at.y);
  state.pearls.push({ id: 999, char, ...at });
};

test('pearls hold every character of the word plus decoys, none under the dragon', () => {
  const state = fresh();
  const chars = state.pearls.map((p) => p.char);
  for (const c of charsOf(state.word)) assert.ok(chars.includes(c), `missing ${c}`);
  assert.equal(state.pearls.length, charsOf(state.word).length + 3);
  for (const p of state.pearls)
    assert.ok(!state.snake.some((s) => s.x === p.x && s.y === p.y), 'pearl on the dragon');
  const decoys = chars.filter((c) => !charsOf(state.word).includes(c));
  assert.equal(new Set(decoys).size, decoys.length, 'decoys are distinct');
});

test('eating the characters in order completes the word, grows and speeds up', () => {
  const state = fresh();
  const word = state.word;
  const startMs = state.stepMs;
  const startLength = state.snake.length;
  for (const char of charsOf(word)) {
    pearlAhead(state, char);
    step(state);
  }
  assert.deepEqual(state.results, [{ word, done: true, mistakes: 0 }]);
  assert.equal(state.score, charsOf(word).length * 5 + 10);
  assert.equal(state.combo, 1);
  assert.ok(state.stepMs < startMs, 'faster after a word');
  step(state);
  assert.equal(state.snake.length, startLength + charsOf(word).length, 'one segment per character');
  assert.notEqual(state.word.id, word.id, 'moves on to another word');
});

test('a wrong or out-of-order character costs a life, keeps the pearl in play and resets combo', () => {
  const state = fresh();
  const [first, second] = charsOf(state.word);
  const wrong = second !== first ? second : hsk1.find((w) => !w.hanzi.includes(first))!.hanzi[0];
  state.combo = 3;
  pearlAhead(state, wrong);
  const before = state.pearls.length;
  step(state);
  assert.equal(state.lives, LIVES - 1);
  assert.equal(state.combo, 0);
  assert.equal(state.progress, 0);
  assert.equal(state.pearls.length, before, 'wrong pearl respawned elsewhere');
  assert.ok(state.pearls.some((p) => p.char === wrong));
  assert.ok(state.events.some((e) => e.kind === 'mistake'));
});

test('losing the last life ends the game and lists the unfinished word for review', () => {
  const state = fresh();
  const wrong = hsk1.find((w) => !charsOf(state.word).includes(w.hanzi[0]))!.hanzi[0];
  for (let i = 0; i < LIVES; i++) {
    pearlAhead(state, wrong);
    step(state);
  }
  assert.equal(state.phase, 'over');
  assert.deepEqual(state.results.at(-1), { word: state.word, done: false, mistakes: LIVES });
  const snapshot = JSON.stringify(state.snake);
  step(state);
  assert.equal(JSON.stringify(state.snake), snapshot, 'no movement after game over');
});

test('the board wraps at the edges and the dragon cannot reverse into its neck', () => {
  const state = fresh();
  state.pearls = [];
  state.snake = [
    { x: state.cols - 1, y: 2 },
    { x: state.cols - 2, y: 2 },
    { x: state.cols - 3, y: 2 },
  ];
  turn(state, 'left');
  step(state);
  assert.deepEqual(state.snake[0], { x: 0, y: 2 }, 'wrapped to the left edge, reverse ignored');
  turn(state, 'up');
  turn(state, 'left');
  step(state);
  step(state);
  assert.deepEqual(state.snake[0], { x: state.cols - 1, y: 1 }, 'two buffered turns both apply');
});

test('biting its own body cuts the tail and costs a life instead of ending the game', () => {
  const state = fresh();
  state.pearls = [];
  // A long dragon curled so that turning down runs into its own body.
  state.snake = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 7, y: 6 },
  ];
  state.dir = 'right';
  turn(state, 'down');
  step(state);
  assert.equal(state.lives, LIVES - 1);
  assert.equal(state.phase, 'playing');
  assert.deepEqual(state.snake[0], { x: 5, y: 6 });
  assert.equal(state.snake.length, 4, 'tail from the bitten segment is gone');
  assert.ok(state.events.some((e) => e.kind === 'bite'));
});
