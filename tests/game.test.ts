import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReward, pickReward } from '../server/game';
import { defaultBanks } from '../shared/banks';
const teams = () => [
  { id: 0, name: 'A', gold: 50, shield: false },
  { id: 1, name: 'B', gold: 200, shield: false },
];
test('reward distribution boundaries', () => {
  assert.equal(
    pickReward(() => 0),
    'gold',
  );
  assert.equal(
    pickReward(() => 0.599),
    'gold',
  );
  assert.equal(
    pickReward(() => 0.6),
    'steal',
  );
  assert.equal(
    pickReward(() => 0.85),
    'shield',
  );
});
test('gold is credited to the correct team', () => {
  const t = teams();
  applyReward(t, 0, 'gold');
  assert.equal(t[0].gold, 150);
  assert.equal(t[1].gold, 200);
});
test('steal conserves gold and is capped at 150', () => {
  const t = teams();
  assert.equal(applyReward(t, 0, 'steal', 1).amount, 150);
  assert.deepEqual(
    t.map((t) => t.gold),
    [200, 50],
  );
});
test('steal cannot make balance negative', () => {
  const t = teams();
  t[1].gold = 40;
  assert.equal(applyReward(t, 0, 'steal', 1).amount, 40);
  assert.equal(t[1].gold, 0);
});
test('shield blocks exactly one steal and does not stack', () => {
  const t = teams();
  applyReward(t, 1, 'shield');
  applyReward(t, 1, 'shield');
  assert.equal(applyReward(t, 0, 'steal', 1).blocked, true);
  assert.deepEqual(
    t.map((t) => t.gold),
    [50, 200],
  );
  assert.equal(t[1].shield, false);
  assert.equal(applyReward(t, 0, 'steal', 1).amount, 150);
});
test('self-steal and unknown targets are rejected without mutation', () => {
  const t = teams();
  const before = structuredClone(t);
  assert.throws(() => applyReward(t, 0, 'steal', 0));
  assert.throws(() => applyReward(t, 0, 'steal', 9));
  assert.deepEqual(t, before);
});
test('sample banks have valid, unique questions and exactly four choices', () => {
  for (const bank of defaultBanks) {
    assert.ok(bank.questions.length >= 4);
    assert.equal(new Set(bank.questions.map((q) => q.id)).size, bank.questions.length);
    for (const q of bank.questions) {
      assert.equal(q.options.length, 4);
      assert.ok(q.options[q.answer]);
    }
  }
});
