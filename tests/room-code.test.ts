import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePastedRoomCode } from '../src/lib/room-code';

test('paste a code, preserving leading zeroes and removing copied whitespace', () => {
  assert.equal(parsePastedRoomCode('012345'), '012345');
  assert.equal(parsePastedRoomCode(' 123 456\n'), '123456');
  assert.equal(parsePastedRoomCode('１２３４５６'), '123456');
});
test('paste a full invitation without confusing IP or port digits with the code', () => {
  assert.equal(parsePastedRoomCode('http://10.13.62.63:5173/?room=246810'), '246810');
  assert.equal(parsePastedRoomCode('http://localhost:5173/?room=012345'), '012345');
  assert.equal(parsePastedRoomCode('https://example.com/?room=654321&source=class'), '654321');
});
test('invalid clipboard content cannot replace a valid field value', () => {
  for (const text of [
    '12345',
    '1234567',
    'hello',
    'http://10.13.62.63:5173/',
    '?room=123',
    'javascript:?room=123456',
  ]) {
    assert.equal(parsePastedRoomCode(text), null);
  }
});
