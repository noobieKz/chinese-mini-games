/**
 * Chém hoa quả, two players: the same question and the same three fruits for both. The first
 * correct slash takes the question for everyone; a wrong slash costs points and locks that player
 * out of the question. Pure rules for the referee (see core.ts for seats, ready and result).
 */
import { z } from 'zod';
import { collocationSchema, wordSchema } from '../../../shared/content';
import { ROUND_LENGTH, type FruitQuestion } from '../fruit-slash/questions';
import { shuffle } from '../word-garden/rules';
import type { Collocation } from '../../../shared/content';
import type { Word } from '../word-garden/vocabulary';
import {
  checkForfeit,
  conclude,
  earliest,
  emitEvent,
  leave,
  ready,
  resetForRematch,
  seat,
  type BasePlayer,
  type BaseState,
} from './core';

/** Four fruits per question in a duel (the one-player game keeps three). */
export const FRUIT_OPTIONS = 4;
export const FRUIT_POINTS = 10;
export const FRUIT_MISS = 2;
/** Fruits are not sliceable for a moment after a question appears, as in the one-player game. */
export const FRUIT_GRACE_MS = 300;
/** How long the answer stays on screen before the next question. */
export const FRUIT_FEEDBACK_MS = 2200;

export const fruitSettingsSchema = z.object({
  kind: z.enum(['words', 'collocations']),
  seconds: z.union([z.literal(8), z.literal(12)]),
  label: z.string().trim().min(1).max(80),
});
export type FruitSettings = z.infer<typeof fruitSettingsSchema>;
export const fruitRoomSchema = z.object({
  game: z.literal('fruit'),
  settings: fruitSettingsSchema,
  words: z.array(wordSchema).max(60),
  collocations: z.array(collocationSchema).max(40),
});
export const fruitMessageSchema = z.object({
  type: z.literal('slash'),
  question: z.number().int().min(0).max(99),
  option: z
    .number()
    .int()
    .min(0)
    .max(FRUIT_OPTIONS - 1),
});
export type FruitMessage = z.infer<typeof fruitMessageSchema>;

export type FruitPlayer = BasePlayer & { correct: number; misses: number };
export type FruitEvent =
  | { seq: number; kind: 'start' }
  | { seq: number; kind: 'end' }
  | { seq: number; kind: 'win'; by: string; question: number; option: number }
  | { seq: number; kind: 'miss'; by: string; question: number; option: number }
  | { seq: number; kind: 'timeout'; question: number };
export type FruitState = Omit<BaseState, 'players' | 'event'> & {
  game: 'fruit';
  settings: FruitSettings;
  players: FruitPlayer[];
  event: FruitEvent | null;
  words: Word[];
  collocations: Collocation[];
  questions: FruitQuestion[];
  index: number;
  /** When fruits of the current question launch (referee clock). */
  questionAt: number | null;
  questionEnds: number | null;
  /** Players who sliced wrong on the current question. */
  locked: string[];
  /** Set once the current question is over: who took it, or nobody. */
  resolved: { by: string | null; option: number | null } | null;
  nextAt: number | null;
};

/** Meaning → characters, with three wrong words from the same lessons. */
export function wordQuestions(words: Word[], random = Math.random): FruitQuestion[] {
  if (words.length < FRUIT_OPTIONS) return [];
  return shuffle(words, random)
    .slice(0, ROUND_LENGTH)
    .map((word) => {
      const others = shuffle(
        [...new Set(words.map((w) => w.hanzi))].filter((h) => h !== word.hanzi),
        random,
      ).slice(0, FRUIT_OPTIONS - 1);
      const options = shuffle([word.hanzi, ...others], random);
      return {
        id: word.id,
        prompt: word.meaning,
        instruction: 'Chém từ tiếng Trung có nghĩa là',
        options,
        answer: options.indexOf(word.hanzi),
        hanzi: word.hanzi,
        pinyin: word.pinyin,
        meaning: word.meaning,
      };
    })
    .filter((q) => q.options.length === FRUIT_OPTIONS);
}

/** Verb + noun: the sheet gives two wrong verbs; a fourth fruit borrows a verb from another pair. */
export function collocationQuestions(items: Collocation[], random = Math.random): FruitQuestion[] {
  const verbs = [...new Set(items.flatMap((item) => [item.verb, ...item.wrong]))];
  return shuffle(items, random)
    .slice(0, ROUND_LENGTH)
    .map((item) => {
      const taken = new Set([item.verb, ...item.wrong]);
      const extra = shuffle(
        verbs.filter((v) => !taken.has(v)),
        random,
      ).slice(0, FRUIT_OPTIONS - 1 - item.wrong.length);
      const options = shuffle([item.verb, ...item.wrong, ...extra], random);
      return {
        id: item.id,
        prompt: `___ ${item.noun}`,
        instruction: 'Chém động từ ghép đúng vào chỗ trống',
        options,
        answer: options.indexOf(item.verb),
        hanzi: item.verb + item.noun,
        pinyin: item.pinyin,
        meaning: item.meaning,
      };
    })
    .filter((q) => q.options.length === FRUIT_OPTIONS);
}

function deal(state: FruitState) {
  const byCollocation =
    state.settings.kind === 'collocations' ? collocationQuestions(state.collocations) : [];
  state.questions = byCollocation.length ? byCollocation : wordQuestions(state.words);
}

export function createFruitDuel(
  code: string,
  settings: FruitSettings,
  words: Word[],
  collocations: Collocation[],
): FruitState {
  const state: FruitState = {
    game: 'fruit',
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
    words,
    collocations,
    questions: [],
    index: 0,
    questionAt: null,
    questionEnds: null,
    locked: [],
    resolved: null,
    nextAt: null,
  };
  deal(state);
  return state;
}

const emit = (state: FruitState, event: Record<string, unknown>) => emitEvent(state, event);

export function joinFruit(state: FruitState, id: string, name: string) {
  return seat<FruitPlayer>(state, id, name, { correct: 0, misses: 0 });
}
export function leaveFruit(state: FruitState, id: string, now: number) {
  leave(state, id, now);
}

function ask(state: FruitState, index: number, at: number) {
  state.index = index;
  state.questionAt = at;
  state.questionEnds = at + state.settings.seconds * 1000;
  state.locked = [];
  state.resolved = null;
  state.nextAt = null;
}

export function readyFruit(state: FruitState, id: string, value: boolean, now: number) {
  if (ready(state, id, value, now)) ask(state, 0, state.startAt!);
}

function resolve(state: FruitState, by: string | null, option: number | null, now: number) {
  state.resolved = { by, option };
  state.nextAt = now + FRUIT_FEEDBACK_MS;
}

/** One slash. Only the current question counts; the first correct slash takes it. */
export function slash(
  state: FruitState,
  id: string,
  question: number,
  option: number,
  now: number,
) {
  const player = state.players.find((p) => p.id === id);
  if (
    !player ||
    state.phase !== 'playing' ||
    state.questionAt === null ||
    question !== state.index ||
    state.resolved ||
    state.locked.includes(id) ||
    now < state.questionAt + FRUIT_GRACE_MS
  )
    return;
  if (state.questionEnds !== null && now >= state.questionEnds) return tickFruit(state, now);
  const current = state.questions[state.index];
  if (option === current.answer) {
    player.score += FRUIT_POINTS;
    player.correct++;
    emit(state, { kind: 'win', by: id, question, option });
    return resolve(state, id, option, now);
  }
  player.score = Math.max(0, player.score - FRUIT_MISS);
  player.misses++;
  state.locked.push(id);
  emit(state, { kind: 'miss', by: id, question, option });
  // Both players wrong: nobody can take it any more.
  if (state.players.every((p) => state.locked.includes(p.id))) resolve(state, null, null, now);
}

/** The referee's clock: question time-outs, the next question, the end, forfeits. */
export function tickFruit(state: FruitState, now: number) {
  if (state.phase !== 'playing') return;
  if (checkForfeit(state, now)) return;
  if (!state.resolved && state.questionEnds !== null && now >= state.questionEnds) {
    emit(state, { kind: 'timeout', question: state.index });
    resolve(state, null, null, now);
  }
  if (state.resolved && state.nextAt !== null && now >= state.nextAt) {
    if (state.index + 1 >= state.questions.length) return conclude(state, 'cleared');
    ask(state, state.index + 1, now);
  }
}

export function rematchFruit(state: FruitState, id: string) {
  if (!resetForRematch(state, id)) return;
  deal(state);
  Object.assign(state, {
    index: 0,
    questionAt: null,
    questionEnds: null,
    locked: [],
    resolved: null,
    nextAt: null,
  });
  for (const p of state.players) Object.assign(p, { correct: 0, misses: 0 });
}

export function fruitDeadline(state: FruitState) {
  if (state.phase !== 'playing') return null;
  return earliest(state, [state.resolved ? state.nextAt : state.questionEnds]);
}

/**
 * What players receive: the current question without its answer until it is over, and nothing of
 * the questions to come or the word lists.
 */
export function publicFruit(state: FruitState) {
  const { words: _w, collocations: _c, questions, ...rest } = state;
  void _w;
  void _c;
  const q = state.phase === 'lobby' ? null : questions[state.index];
  return {
    ...rest,
    total: questions.length,
    question: q
      ? {
          prompt: q.prompt,
          instruction: q.instruction,
          options: q.options,
          // The answer and the word card only once nobody can still take the question.
          reveal:
            state.resolved || state.phase === 'done'
              ? { answer: q.answer, hanzi: q.hanzi, pinyin: q.pinyin, meaning: q.meaning }
              : null,
        }
      : null,
  };
}
export type PublicFruitState = ReturnType<typeof publicFruit>;
