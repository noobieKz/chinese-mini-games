import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dealOrders,
  describeOrder,
  isFullOrder,
  makeOrders,
  matchesOrder,
  teaChoices,
  TEA_TIME,
} from '../src/games/milk-tea/orders';
import { engines, roomGameSchema } from '../src/games/duel/engines';
import type { TeaState } from '../src/games/duel/tea-rules';

test('milk tea has 27 distinct orders with a translation', () => {
  const orders = makeOrders(() => 0.5);
  assert.equal(new Set(orders.map((order) => describeOrder(order).hanzi)).size, 27);
  assert.deepEqual(describeOrder({ drink: 0, ice: 1, sugar: 2 }), {
    hanzi: '一杯奶茶，少冰，不加糖。',
    meaning: 'Trà sữa · Ít đá · Không đường',
  });
});

test('tea duel validates orders independently and rejects repeated or late submissions', () => {
  assert.equal(roomGameSchema.parse({ game: 'tea' }).game, 'tea');
  const engine = engines.tea;
  const room = engine.create('ABC234', { game: 'tea' }) as TeaState;
  engine.join(room, 'a', 'An', 0);
  engine.join(room, 'b', 'Bình', 0);
  engine.setReady(room, 'a', true, 0);
  engine.setReady(room, 'b', true, 0);
  const start = room.startAt!;
  const order = room.orders[0];
  const answer = { type: 'serve-tea', order: 0, recipe: order };
  assert.equal(engine.handle(room, 'a', answer, start - 1), false);
  assert.equal(engine.handle(room, 'a', answer, start), true);
  assert.equal(engine.handle(room, 'a', answer, start), false);
  assert.equal(
    engine.handle(
      room,
      'b',
      {
        ...answer,
        recipe: { ...order, ice: (order.ice + 1) % 3 },
      },
      start,
    ),
    true,
  );
  assert.deepEqual(
    room.players.map(({ score, served, misses }) => [score, served, misses]),
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
  );
  assert.equal(engine.nextDeadline(room), start + TEA_TIME);
  assert.equal(engine.handle(room, 'a', { ...answer, order: 1 }, start + TEA_TIME), false);
  assert.equal(room.winner, 'a');
  assert.equal(room.endReason, 'time');
  engine.rematch(room, 'a');
  assert.equal(room.phase, 'lobby');
  assert.deepEqual(
    room.players.map(({ score, served, misses }) => [score, served, misses]),
    [
      [0, 0, 0],
      [0, 0, 0],
    ],
  );
});

test('milk tea expanded rounds use all five recipe fields and expose pronunciation', () => {
  const orders = dealOrders('tea', []);
  assert.equal(orders.length, 27);
  assert.ok(orders.every(isFullOrder));
  const order = orders[0];
  assert.equal(matchesOrder(order, order), true);
  assert.equal(
    matchesOrder(order, {
      ...order,
      topping: ((order.topping ?? 0) + 1) % teaChoices.topping.length,
    }),
    false,
  );
  assert.equal(matchesOrder(order, { ...order, size: undefined }), false);
  assert.ok(describeOrder(order).pinyin);
  const legacy = dealOrders('tea', [
    {
      id: 'old',
      topic: 'tea',
      hanzi: '请给我一杯奶茶。',
      meaning: 'Cho tôi một ly trà sữa.',
      answer: { drink: 0, ice: 2, sugar: 1 },
    },
  ])[0];
  assert.equal(isFullOrder(legacy), false);
  assert.equal(matchesOrder(legacy, { drink: 0, ice: 2, sugar: 1 }), true);
});

test('a tea room uses the chosen order count for scoring and rematches', () => {
  const engine = engines.tea;
  const invalid = engine.create('ABC234', { game: 'tea', orderCount: 0 });
  assert.equal(typeof invalid, 'string');
  const room = engine.create('ABC234', { game: 'tea', orderCount: 1 }) as TeaState;
  assert.equal(room.orders.length, 1);
  engine.join(room, 'a', 'An', 0);
  engine.join(room, 'b', 'Bình', 0);
  engine.setReady(room, 'a', true, 0);
  engine.setReady(room, 'b', true, 0);
  const message = { type: 'serve-tea', order: 0, recipe: room.orders[0] };
  assert.equal(engine.handle(room, 'a', message, room.startAt!), true);
  assert.equal(room.phase, 'playing');
  assert.equal(engine.handle(room, 'b', message, room.startAt!), true);
  assert.equal(room.endReason, 'cleared');
  engine.rematch(room, 'a');
  assert.equal(room.phase, 'lobby');
  assert.equal(room.orders.length, 1);
});

test('new reading scenarios load only their own authored questions', () => {
  const scenarios = [
    {
      id: 'restaurant',
      topic: 'restaurant' as const,
      hanzi: '来一份牛肉面，不要辣，在这儿吃。',
      meaning: 'Mì bò, không cay, ăn tại quán.',
      answer: { drink: 0, ice: 0, sugar: 0 },
    },
    {
      id: 'library',
      topic: 'library' as const,
      hanzi: '我想借两本词典，借一周。',
      meaning: 'Mượn hai cuốn từ điển trong một tuần.',
      answer: { drink: 0, ice: 1, sugar: 1 },
    },
  ];
  for (const { topic, hanzi, answer } of scenarios) {
    const room = engines.tea.create('ABC234', {
      game: 'tea',
      topic,
      scenarios,
      orderCount: 4,
    }) as TeaState;
    assert.equal(room.settings.topic, topic);
    assert.equal(room.orders.length, 4);
    assert.equal(describeOrder(room.orders[0], topic).hanzi, hanzi);
    assert.ok(matchesOrder(room.orders[0], answer));
    assert.equal(room.orders.filter((order) => order.authored).length, 1);
  }
});

test('all non-tea topics require five answers on new orders and accept legacy three-field orders', () => {
  for (const topic of ['clothes', 'train', 'restaurant', 'library'] as const) {
    const orders = dealOrders(topic, [], Math.random, 3);
    assert.equal(orders.length, 3);
    for (const order of orders) {
      assert.ok(isFullOrder(order));
      assert.equal(describeOrder(order, topic).meaning.split(' · ').length, 5);
      assert.ok(matchesOrder(order, order));
      assert.equal(matchesOrder(order, { ...order, size: undefined }), false);
      assert.equal(
        matchesOrder(order, { ...order, topping: ((order.topping ?? 0) + 1) % 3 }),
        false,
      );
    }
    const legacy = { drink: 0, ice: 0, sugar: 0 };
    assert.equal(describeOrder(legacy, topic).meaning.split(' · ').length, 3);
    assert.ok(matchesOrder(legacy, legacy));
  }
});
