import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoomHub, GamePeer } from '../server/room-hub';
import { defaultBanks } from '../shared/banks';
import type { RoomView } from '../shared/types';

function setup() {
  const hub = createRoomHub();
  const events = new Map<string, { event: string; data?: unknown }[]>();
  const peer = (id: string, teacher = false) => {
    const log: { event: string; data?: unknown }[] = [];
    events.set(id, log);
    const p = new GamePeer(id, (event, data) => log.push({ event, data }));
    if (teacher) p.teacher = { id: 'teacher', email: 't@example.com', name: 'T' };
    hub.connect(p);
    return p;
  };
  const rooms = (id: string) => events.get(id)!.filter((e) => e.event === 'room');
  return { hub, peer, events, rooms };
}

test('unchanged room views are not re-sent to other phones', () => {
  const { hub, peer, rooms } = setup();
  const host = peer('host', true);
  const a = peer('a');
  const b = peer('b');
  const bank = defaultBanks[0];
  const { code } = hub.dispatch(host, 'create', { bank, teamCount: 2, duration: 5 });
  hub.dispatch(a, 'join', { code, name: 'An' });
  hub.dispatch(b, 'join', { code, name: 'Bình' });
  assert.ok(!hub.dispatch(host, 'start', {}).error);
  const before = { host: rooms('host').length, a: rooms('a').length, b: rooms('b').length };
  const wrong = (bank.questions[0].answer + 1) % 4;
  assert.equal(hub.dispatch(a, 'answer', { index: 0, option: wrong }).correct, false);
  assert.equal(rooms('a').length, before.a + 1, 'answering student sees the next question');
  assert.equal(rooms('b').length, before.b, 'others skip an identical view');
  assert.equal(rooms('host').length, before.host);
  const view = rooms('a').at(-1)!.data as RoomView;
  assert.equal(view.answered, 1);
  assert.ok(Math.abs(view.serverTime - Date.now()) < 1000);
});

test('room expiry is only announced to peers in that room', () => {
  const { hub, peer, events } = setup();
  const host = peer('host', true);
  const student = peer('student');
  peer('outsider');
  const { code } = hub.dispatch(host, 'create', {
    bank: defaultBanks[0],
    teamCount: 2,
    duration: 5,
  });
  hub.dispatch(student, 'join', { code, name: 'An' });
  hub.rooms.get(code!)!.createdAt = Date.now() - 7 * 3600000;
  hub.tick();
  assert.equal(hub.rooms.size, 0);
  const expired = (id: string) => events.get(id)!.some((e) => e.event === 'room-expired');
  assert.ok(expired('host'));
  assert.ok(expired('student'));
  assert.ok(!expired('outsider'));
  assert.equal(student.data.code, undefined);
});
