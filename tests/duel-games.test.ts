import assert from 'node:assert/strict';
import test from 'node:test';
import { COUNTDOWN_MS, RECONNECT_MS } from '../src/games/duel/core';
import {
  createFruitDuel,
  FRUIT_FEEDBACK_MS,
  FRUIT_GRACE_MS,
  joinFruit,
  leaveFruit,
  publicFruit,
  readyFruit,
  rematchFruit,
  slash,
  tickFruit,
  collocationQuestions,
  type FruitState,
} from '../src/games/duel/fruit-rules';
import {
  advance,
  createDragonDuel,
  CRASH_POINTS,
  EAT_POINTS,
  joinDragon,
  MISTAKE_POINTS,
  publicDragon,
  readyDragon,
  steer,
  tickDragon,
  WORD_BONUS,
  type DragonDuelState,
} from '../src/games/duel/dragon-rules';
import { engines } from '../src/games/duel/engines';
import { charsOf } from '../src/games/dragon-words/model';
import { vocabulary } from '../src/games/word-garden/vocabulary';

const hsk1 = vocabulary.filter((w) => w.level === 'HSK 1');

function fruitGame() {
  const state = createFruitDuel('ABC234', { kind: 'words', seconds: 8, label: 'HSK 1' }, hsk1, []);
  joinFruit(state, 'p1', 'An');
  joinFruit(state, 'p2', 'Bình');
  readyFruit(state, 'p1', true, 0);
  readyFruit(state, 'p2', true, 0);
  return { state, now: COUNTDOWN_MS + FRUIT_GRACE_MS + 10 };
}
const answer = (state: FruitState) => state.questions[state.index].answer;
const wrong = (state: FruitState) => (answer(state) + 1) % 3;

test('fruit: duel questions have four fruits, also for collocations', () => {
  const { state } = fruitGame();
  assert.ok(state.questions.length > 0);
  for (const q of state.questions) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.equal(q.options[q.answer], q.hanzi);
  }
  const items = [
    { verb: '吃', noun: '饭', wrong: ['喝', '看'] },
    { verb: '喝', noun: '水', wrong: ['吃', '写'] },
    { verb: '看', noun: '书', wrong: ['听', '吃'] },
  ].map((x, i) => ({ ...x, id: 'c' + i, level: 'HSK 1', lesson: 1, pinyin: 'x', meaning: 'x' }));
  for (const q of collocationQuestions(items as never)) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
  }
});

test('fruit: first correct slash takes the question for both players', () => {
  const { state, now } = fruitGame();
  assert.equal(state.phase, 'playing');
  slash(state, 'p1', 0, answer(state), now - FRUIT_GRACE_MS - 50); // during the countdown: ignored
  assert.equal(state.players[0].score, 0);
  slash(state, 'p1', 0, answer(state), now);
  slash(state, 'p2', 0, answer(state), now + 5); // too late, already taken
  assert.equal(state.players[0].score, 10);
  assert.equal(state.players[1].score, 0);
  assert.deepEqual(state.resolved, { by: 'p1', option: answer(state) });
  tickFruit(state, now + FRUIT_FEEDBACK_MS + 1);
  assert.equal(state.index, 1, 'next question after the feedback');
  assert.equal(state.resolved, null);
});

test('fruit: a wrong slash costs points and locks that player out of the question', () => {
  const { state, now } = fruitGame();
  slash(state, 'p1', 0, wrong(state), now);
  assert.equal(state.players[0].score, 0, 'never below zero');
  assert.deepEqual(state.locked, ['p1']);
  slash(state, 'p1', 0, answer(state), now + 10);
  assert.equal(state.players[0].score, 0, 'locked out');
  slash(state, 'p2', 0, answer(state), now + 20);
  assert.equal(state.players[1].score, 10, 'the other player can still take it');
});

test('fruit: both wrong or time out ends the question for nobody; last question ends the game', () => {
  const { state, now } = fruitGame();
  slash(state, 'p1', 0, wrong(state), now);
  slash(state, 'p2', 0, wrong(state), now);
  assert.deepEqual(state.resolved, { by: null, option: null });
  let t = now + FRUIT_FEEDBACK_MS + 1;
  tickFruit(state, t);
  // Let every other question time out.
  while (state.phase === 'playing') {
    t = state.resolved ? state.nextAt! : state.questionEnds!;
    tickFruit(state, t);
  }
  assert.equal(state.phase, 'done');
  assert.equal(state.endReason, 'cleared');
  assert.equal(state.winner, 'draw');
});

test('fruit: players never receive the answer before the question is over', () => {
  const { state, now } = fruitGame();
  const shown = publicFruit(state);
  assert.equal(shown.question?.reveal, null);
  assert.ok(!('questions' in shown) && !('words' in shown));
  assert.ok(!JSON.stringify(shown).includes('"answer"'));
  slash(state, 'p2', 0, answer(state), now);
  assert.equal(publicFruit(state).question?.reveal?.answer, state.questions[0].answer);
});

test('fruit: rematch deals new questions and resets scores; forfeit after the grace period', () => {
  const { state, now } = fruitGame();
  slash(state, 'p1', 0, answer(state), now);
  leaveFruit(state, 'p2', now);
  tickFruit(state, now + RECONNECT_MS + 1);
  assert.equal(state.phase, 'done');
  assert.equal(state.winner, 'p1');
  joinFruit(state, 'p2', 'Bình');
  rematchFruit(state, 'p1');
  assert.equal(state.phase, 'lobby');
  assert.ok(state.players.every((p) => p.score === 0 && p.correct === 0));
  assert.equal(state.index, 0);
});

function dragonGame() {
  const state = createDragonDuel(
    'ABC234',
    { speed: 'normal', minutes: 2, label: 'HSK 1' },
    hsk1,
    () => 0.42,
  );
  joinDragon(state, 'p1', 'An');
  joinDragon(state, 'p2', 'Bình');
  readyDragon(state, 'p1', true, 0);
  readyDragon(state, 'p2', true, 0);
  return state;
}
/** Put a pearl right in front of a dragon's head. */
function pearlAhead(state: DragonDuelState, id: string, char: string) {
  const snake = state.snakes[id];
  const head = snake.body[0];
  const x =
    (head.x + (snake.dir === 'right' ? 1 : snake.dir === 'left' ? -1 : 0) + state.cols) %
    state.cols;
  const y =
    (head.y + (snake.dir === 'down' ? 1 : snake.dir === 'up' ? -1 : 0) + state.rows) % state.rows;
  state.pearls = [{ id: 999, char, x, y }];
}

test('dragon: both dragons start apart and step on the referee clock', () => {
  const state = dragonGame();
  assert.equal(state.phase, 'playing');
  const [a, b] = [state.snakes.p1, state.snakes.p2];
  assert.equal(a.dir, 'right');
  assert.equal(b.dir, 'left');
  const head = a.body[0];
  tickDragon(state, COUNTDOWN_MS - 1);
  assert.equal(state.step, 0, 'no steps during the countdown');
  tickDragon(state, COUNTDOWN_MS + state.stepMs);
  assert.equal(state.step, 1);
  assert.deepEqual(state.snakes.p1.body[0], { x: head.x + 1, y: head.y });
  tickDragon(state, COUNTDOWN_MS + state.stepMs * 50);
  assert.equal(state.step, 4, 'never more than a few catch-up steps after a stall');
});

test('dragon: the next character scores, the last one adds the word bonus; wrong costs points', () => {
  const state = dragonGame();
  const chars = charsOf(state.word);
  const word = state.word;
  pearlAhead(state, 'p1', chars[0]);
  advance(state, () => 0.3);
  assert.equal(state.progress, chars.length > 1 ? 1 : 0);
  assert.equal(state.players[0].score, EAT_POINTS + (chars.length === 1 ? WORD_BONUS : 0));
  for (let i = 1; i < chars.length; i++) {
    pearlAhead(state, 'p2', chars[i]);
    advance(state, () => 0.3);
  }
  if (chars.length > 1) {
    assert.equal(state.players[1].score, EAT_POINTS * (chars.length - 1) + WORD_BONUS);
    assert.equal(state.players[1].words, 1);
  }
  assert.notEqual(state.word.id, word.id, 'a new word after completing one');
  const before = state.players[0].score;
  const decoy = [...new Set(hsk1.flatMap(charsOf))].find((c) => c !== charsOf(state.word)[0])!;
  pearlAhead(state, 'p1', decoy);
  advance(state, () => 0.3);
  assert.equal(state.players[0].score, Math.max(0, before - MISTAKE_POINTS));
  assert.equal(state.pearls.length, 1, 'the wrong pearl comes back elsewhere');
});

test('dragon: running into the other dragon crashes and respawns, with a short safe time', () => {
  const state = dragonGame();
  state.players[0].score = 10;
  // p2's body lies right in front of p1's head.
  const head = state.snakes.p1.body[0];
  state.snakes.p2.body = [
    { x: head.x + 1, y: head.y - 1 },
    { x: head.x + 1, y: head.y },
    { x: head.x + 1, y: head.y + 1 },
  ];
  state.snakes.p2.dir = 'up';
  state.pearls = [];
  advance(state);
  assert.equal(state.players[0].score, 10 - CRASH_POINTS);
  assert.equal(state.players[0].crashes, 1);
  assert.equal(state.snakes.p1.body.length, 3);
  assert.ok(state.snakes.p1.safe > 0);
  assert.equal(state.players[1].crashes, 0);
});

test('dragon: a late turn applies from the next cell; reversing is ignored', () => {
  const state = dragonGame();
  steer(state, 'p1', 'left', 0, false);
  assert.deepEqual(state.snakes.p1.turns, [], 'no reversing into the neck');
  steer(state, 'p1', 'down', 0, true);
  assert.deepEqual(state.snakes.p1.turns, ['right', 'down']);
  const start = state.snakes.p1.body[0];
  state.pearls = [];
  advance(state);
  advance(state);
  assert.deepEqual(state.snakes.p1.body[0], { x: start.x + 1, y: start.y + 1 });
  assert.ok(!('turns' in publicDragon(state).snakes.p1), 'queued turns stay private');
});

test('dragon: the time limit ends the game; higher score wins', () => {
  const state = dragonGame();
  state.players[1].score = 7;
  tickDragon(state, state.endsAt!);
  assert.equal(state.phase, 'done');
  assert.equal(state.endReason, 'time');
  assert.equal(state.winner, 'p2');
});

test('engines create each game from a request body and reject bad ones', () => {
  const garden = engines.garden.create('ABC234', {
    settings: { mode: 'meaning', difficulty: 'normal', pairs: 8, label: 'x' },
    words: hsk1,
  });
  assert.equal(typeof garden === 'object' && garden.game, 'garden');
  const fruit = engines.fruit.create('ABC234', {
    game: 'fruit',
    settings: { kind: 'words', seconds: 12, label: 'x' },
    words: hsk1.slice(0, 20),
    collocations: [],
  });
  assert.equal(typeof fruit === 'object' && fruit.game, 'fruit');
  assert.equal(
    typeof engines.fruit.create('ABC234', {
      game: 'fruit',
      settings: { kind: 'words', seconds: 12, label: 'x' },
      words: hsk1.slice(0, 2),
      collocations: [],
    }),
    'string',
    'too few words for three fruits',
  );
  const dragon = engines.dragon.create('ABC234', {
    game: 'dragon',
    settings: { speed: 'fast', minutes: 3, label: 'x' },
    words: hsk1.slice(0, 10),
  });
  assert.equal(typeof dragon === 'object' && dragon.game, 'dragon');
  assert.equal(typeof engines.dragon.create('ABC234', { game: 'dragon' }), 'string');
});
