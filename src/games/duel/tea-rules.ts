import { z } from 'zod';
import { answerSchema, scenarioSchema, type Scenario } from '../../../shared/lesson-editor';
import {
  describeOrder,
  dealOrders,
  isFullOrder,
  matchesOrder,
  TEA_TIME,
  TEA_MAX_ORDERS,
  topicIds,
  topics,
  type TopicId,
  type Order,
} from '../milk-tea/orders';
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

export const teaRoomSchema = z.object({
  game: z.literal('tea'),
  topic: z.enum(topicIds).default('tea'),
  scenarios: z.array(scenarioSchema).max(TEA_MAX_ORDERS).default([]),
  orderCount: z.number().int().min(1).max(TEA_MAX_ORDERS).default(TEA_MAX_ORDERS),
});

export const teaMessageSchema = z.object({
  type: z.literal('serve-tea'),
  order: z
    .number()
    .int()
    .min(0)
    .max(TEA_MAX_ORDERS - 1),
  recipe: answerSchema,
});
export type TeaMessage = z.infer<typeof teaMessageSchema>;
export type TeaPlayer = BasePlayer & {
  served: number;
  misses: number;
  results?: (boolean | null)[];
  feedback: { correct: boolean; hanzi: string; meaning: string; pinyin?: string } | null;
};
export type TeaState = Omit<BaseState, 'players'> & {
  game: 'tea';
  settings: { label: string; topic?: TopicId; orderCount?: number };
  players: TeaPlayer[];
  orders: Order[];
  scenarios?: Scenario[];
};

export function createTea(
  code: string,
  topic: TopicId = 'tea',
  scenarios: Scenario[] = [],
  orderCount = TEA_MAX_ORDERS,
): TeaState {
  return {
    game: 'tea',
    settings: { label: `${topics[topic].name} · ${orderCount} đơn · 90 giây`, topic, orderCount },
    code,
    phase: 'lobby',
    round: 1,
    players: [],
    startAt: null,
    endsAt: null,
    winner: null,
    endReason: null,
    event: null,
    seq: 0,
    orders: dealOrders(topic, scenarios, Math.random, orderCount),
    scenarios,
  };
}

export const joinTea = (s: TeaState, id: string, name: string) =>
  seat<TeaPlayer>(s, id, name, { served: 0, misses: 0, results: [], feedback: null });

export { leave as leaveTea };

export function readyTea(s: TeaState, id: string, value: boolean, now: number) {
  if (ready(s, id, value, now)) s.endsAt = s.startAt! + TEA_TIME;
}

export function tickTea(s: TeaState, now: number) {
  if (s.phase !== 'playing') return;
  if (s.endsAt !== null && now >= s.endsAt) conclude(s, 'time');
  else checkForfeit(s, now);
}

export function serveTea(s: TeaState, id: string, msg: TeaMessage, now: number) {
  tickTea(s, now);
  const player = s.players.find((p) => p.id === id);
  if (
    s.phase !== 'playing' ||
    now < s.startAt! ||
    !player?.connected ||
    player.served !== msg.order
  )
    return false;
  const order = s.orders[player.served];
  if (!order) return false;
  const correct = matchesOrder(order, msg.recipe);
  player.results ??= Array<null>(player.served).fill(null);
  player.results.push(correct);
  player.served++;
  if (correct) player.score++;
  else player.misses++;
  player.feedback = { correct, ...describeOrder(order, s.settings.topic) };
  if (s.players.every((p) => p.served === s.orders.length)) conclude(s, 'cleared');
  return true;
}

export function rematchTea(s: TeaState, id: string) {
  if (!resetForRematch(s, id)) return;
  s.orders = dealOrders(
    s.settings.topic ?? 'tea',
    s.scenarios ?? [],
    Math.random,
    s.settings.orderCount,
  );
  for (const player of s.players)
    Object.assign(player, { served: 0, misses: 0, results: [], feedback: null });
}

export function publicTea(s: TeaState) {
  const { orders, scenarios, ...rest } = s;
  void scenarios;
  return {
    ...rest,
    total: orders.length,
    fullOrders:
      s.phase === 'playing'
        ? s.players
            .filter((player) => isFullOrder(orders[player.served]))
            .map((player) => player.id)
        : [],
    tickets:
      s.phase === 'playing'
        ? Object.fromEntries(
            s.players.flatMap((p) => {
              const order = orders[p.served];
              return order ? [[p.id, describeOrder(order, s.settings.topic).hanzi]] : [];
            }),
          )
        : {},
  };
}
export type PublicTeaState = ReturnType<typeof publicTea>;

export const teaDeadline = (s: TeaState) =>
  s.phase === 'playing' ? earliest(s, [s.endsAt]) : null;
