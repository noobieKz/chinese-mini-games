import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attempt,
  codePattern,
  COUNTDOWN_MS,
  createDuel,
  createRoomSchema,
  disconnect,
  DUEL_COLS,
  DUEL_SECONDS,
  join,
  makeCode,
  nextDeadline,
  publicState,
  RECONNECT_MS,
  rematch,
  select,
  setReady,
  tick,
  type DuelState,
} from '../src/games/word-garden/duel';
import { findPair, findPath, matches } from '../src/games/word-garden/rules';
import { vocabulary } from '../src/games/word-garden/vocabulary';

const hsk1 = vocabulary.filter((w) => w.level === 'HSK 1');
const settings = { mode: 'meaning', difficulty: 'normal', pairs: 8, label: 'HSK 1' } as const;
/** Two players seated and the countdown already over. */
function started(mode: 'meaning' | 'characters' = 'meaning') {
  const state = createDuel('ABC234', { ...settings, mode }, hsk1);
  join(state, 'p1', 'An', 0);
  join(state, 'p2', 'Bình', 0);
  setReady(state, 'p1', true, 0);
  setReady(state, 'p2', true, 0);
  return { state, now: COUNTDOWN_MS + 1 };
}
const pairOn = (state: DuelState) => {
  const pair = findPair(state.tiles, state.settings.mode, DUEL_COLS, false)!;
  assert.ok(pair, 'a playable pair exists');
  return pair;
};
const wrongPair = (state: DuelState): [number, number] => {
  for (let a = 0; a < state.tiles.length; a++)
    for (let b = a + 1; b < state.tiles.length; b++)
      if (
        !state.tiles[a].removed &&
        !state.tiles[b].removed &&
        !matches(state.tiles[a], state.tiles[b], state.settings.mode, state.tiles, false)
      )
        return [a, b];
  throw new Error('no wrong pair');
};

test('room codes are six unambiguous characters', () => {
  for (let i = 0; i < 50; i++) assert.match(makeCode(), codePattern);
  assert.doesNotMatch('ABC10O', codePattern);
});

test('two seats; the game starts only when both are ready, after a countdown', () => {
  const state = createDuel('ABC234', settings, hsk1);
  assert.equal(state.tiles.length, 16);
  assert.ok(join(state, 'p1', 'An', 0));
  assert.ok(join(state, 'p2', 'Bình', 0));
  assert.equal(join(state, 'p3', 'Chi', 0), null, 'third person cannot sit');
  setReady(state, 'p1', true, 1000);
  assert.equal(state.phase, 'lobby');
  setReady(state, 'p2', true, 1000);
  assert.equal(state.phase, 'playing');
  assert.equal(state.startAt, 1000 + COUNTDOWN_MS);
  assert.equal(state.endsAt, 1000 + COUNTDOWN_MS + DUEL_SECONDS * 1000);
  const [a, b] = pairOn(state);
  attempt(state, 'p1', a, b, 1500);
  assert.equal(state.players[0].score, 0, 'no moves during the countdown');
});

test('a pair matched by one player disappears for both; the slower attempt is "taken"', () => {
  const { state, now } = started();
  const [a, b] = pairOn(state);
  select(state, 'p2', a);
  attempt(state, 'p1', a, b, now);
  assert.equal(state.event?.kind, 'match');
  assert.ok(state.tiles.filter((t) => t.removed).length === 2 || state.event?.kind === 'match');
  assert.deepEqual(
    state.players.map((p) => [p.score, p.matched]),
    [
      [10, 1],
      [0, 0],
    ],
  );
  assert.equal(state.players[1].selected, null, 'the opponent loses a selection on a taken tile');
  attempt(state, 'p2', a, b, now + 50);
  assert.equal(state.event?.kind, 'taken');
  assert.equal(state.players[1].score, 0, 'no penalty for losing the race');
});

test('a wrong pair costs two points, never below zero', () => {
  const { state, now } = started();
  const [a, b] = wrongPair(state);
  attempt(state, 'p1', a, b, now);
  assert.equal(state.event?.kind, 'miss');
  assert.equal(state.players[0].score, 0);
  const [c, d] = pairOn(state);
  attempt(state, 'p1', c, d, now);
  const [e, f] = wrongPair(state);
  attempt(state, 'p1', e, f, now);
  assert.equal(state.players[0].score, 8);
});

test('clearing the board ends the game; the higher score wins and the board stays playable', () => {
  const { state, now } = started('characters');
  let turn = 0;
  while (state.phase === 'playing') {
    const [a, b] = findPair(state.tiles, 'characters', DUEL_COLS, false)!;
    assert.ok(findPath(state.tiles, a, b, DUEL_COLS));
    attempt(state, turn++ % 3 === 2 ? 'p2' : 'p1', a, b, now);
  }
  assert.equal(state.endReason, 'cleared');
  assert.equal(state.winner, 'p1');
  assert.equal(state.players[0].matched + state.players[1].matched, state.total);
});

test('time limit and forfeits are decided by the referee clock', () => {
  const timed = started();
  tick(timed.state, timed.state.endsAt! - 1);
  assert.equal(timed.state.phase, 'playing');
  assert.equal(nextDeadline(timed.state), timed.state.endsAt);
  tick(timed.state, timed.state.endsAt!);
  assert.deepEqual([timed.state.endReason, timed.state.winner], ['time', 'draw']);

  const gone = started();
  disconnect(gone.state, 'p2', gone.now);
  assert.equal(nextDeadline(gone.state), gone.now + RECONNECT_MS);
  tick(gone.state, gone.now + RECONNECT_MS - 1);
  assert.equal(gone.state.phase, 'playing', 'a short drop is forgiven');
  join(gone.state, 'p2', 'Bình', gone.now + 1000);
  tick(gone.state, gone.now + RECONNECT_MS + 1);
  assert.equal(gone.state.phase, 'playing', 'reconnecting keeps the seat');
  disconnect(gone.state, 'p2', gone.now + 2000);
  tick(gone.state, gone.now + 2000 + RECONNECT_MS);
  assert.deepEqual([gone.state.endReason, gone.state.winner], ['forfeit', 'p1']);
});

test('rematch deals a new board with the same settings and resets scores', () => {
  const { state, now } = started();
  const [a, b] = pairOn(state);
  attempt(state, 'p1', a, b, now);
  tick(state, state.endsAt!);
  rematch(state, 'p2');
  assert.equal(state.phase, 'lobby');
  assert.equal(state.round, 2);
  assert.ok(state.tiles.every((t) => !t.removed));
  assert.deepEqual(
    state.players.map((p) => [p.score, p.ready]),
    [
      [0, false],
      [0, false],
    ],
  );
  assert.equal('pool' in publicState(state), false, 'players never receive the word pool');
});

test('room creation validates settings and words', () => {
  assert.equal(createRoomSchema.safeParse({ settings, words: hsk1.slice(0, 6) }).success, true);
  assert.equal(
    createRoomSchema.safeParse({ settings: { ...settings, pairs: 18 }, words: hsk1 }).success,
    false,
  );
  assert.equal(createRoomSchema.safeParse({ settings, words: [] }).success, false);
});

test("players never receive anyone's current selection", () => {
  const { state } = started();
  select(state, 'p1', 0);
  assert.equal(state.players[0].selected, 0, 'the referee may track it');
  const shared = publicState(state);
  for (const player of shared.players) assert.equal('selected' in player, false);
  assert.equal(JSON.stringify(shared).includes('"selected"'), false);
});
