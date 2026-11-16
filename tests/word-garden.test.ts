import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findPair,
  findPath,
  makeTiles,
  matches,
  playableShuffle,
  reconcileCharacters,
} from '../src/games/word-garden/rules';
import { vocabulary, type MatchMode } from '../src/games/word-garden/vocabulary';
import { getBoardLayout, routePoint } from '../src/games/word-garden/layout';

test('outer Pikachu routes remain inside the visible board at every supported size', () => {
  for (const mobile of [false, true])
    for (const pairs of [4, 6, 8, 12, 18]) {
      const layout = getBoardLayout(mobile, pairs);
      const tiles = makeTiles(
        vocabulary.filter((w) => w.level === 'HSK 1').slice(0, pairs),
        'meaning',
      );
      const path = findPath(tiles, 0, layout.cols - 1, layout.cols)!;
      assert.ok(path, 'full top row connects via the outer gutter');
      const drawn = path.map((cell) => routePoint(layout, cell));
      for (const point of drawn) {
        assert.ok(point.x >= 16 && point.x <= layout.width - 16, 'horizontal route is not clipped');
        assert.ok(point.y >= 16 && point.y <= layout.height - 16, 'vertical route is not clipped');
      }
      for (let i = 1; i < drawn.length; i++) {
        assert.ok(
          drawn[i].x === drawn[i - 1].x || drawn[i].y === drawn[i - 1].y,
          'rendered lines stay orthogonal',
        );
      }
      assert.equal(layout.rows * layout.cols, tiles.length);
    }
});

test('Pikachu routes use at most two bends and never cross occupied cells', () => {
  const tiles = makeTiles(vocabulary.slice(0, 12), 'meaning');
  assert.equal(findPath(tiles, 7, 10), null, 'interior cells cannot cross a full row');
  const route = findPath(tiles, 0, 5)!;
  assert.ok(route, 'top edge can connect around the outside');
  let turns = 0,
    previous = '';
  for (let i = 1; i < route.length; i++) {
    const dx = route[i].x - route[i - 1].x,
      dy = route[i].y - route[i - 1].y;
    assert.equal(Math.abs(dx) + Math.abs(dy), 1);
    const direction = `${dx},${dy}`;
    if (previous && direction !== previous) turns++;
    previous = direction;
    if (i < route.length - 1) {
      const { x, y } = route[i];
      assert.ok(x === 0 || y === 0 || x === 7 || y === 5, 'full board requires outer cells');
    }
  }
  assert.ok(turns <= 2);
  assert.equal(findPath(tiles, -1, 5), null);
  assert.equal(findPath(tiles, 2, 2), null);
});

test('identical first glyphs are interchangeable without stranding the remaining word', () => {
  const words = vocabulary.filter((w) => ['student', 'school'].includes(w.id));
  const tiles = makeTiles(words, 'characters');
  const a = tiles.findIndex((t) => t.word.id === 'school' && t.side === 0);
  const b = tiles.findIndex((t) => t.word.id === 'student' && t.side === 1);
  assert.ok(matches(tiles[a], tiles[b], 'characters'));
  assert.equal(matches(tiles[b], tiles[a], 'characters'), false, 'character order matters');
  reconcileCharacters(tiles, a, b);
  assert.equal(tiles[a].word.hanzi, '学生');
  tiles[a].removed = tiles[b].removed = true;
  const remaining = tiles.filter((t) => !t.removed);
  assert.equal(
    remaining
      .map((t) => t.label)
      .sort()
      .join(''),
    ['学', '校'].sort().join(''),
  );
  assert.equal(remaining[0].word.id, remaining[1].word.id);
});

test('all board sizes and levels stay completable after shuffling and interchangeable glyphs', () => {
  for (const mobile of [false, true])
    for (const pairs of [4, 8, 12, 18])
      for (const level of ['HSK 1', 'HSK 2'])
        for (const mode of ['meaning', 'characters'] as MatchMode[])
          for (const ordered of [true, false])
            for (let round = 0; round < 2; round++) {
              const { cols } = getBoardLayout(mobile, pairs);
              let tiles = playableShuffle(
                makeTiles(vocabulary.filter((w) => w.level === level).slice(0, pairs), mode),
                mode,
                cols,
                ordered,
              );
              const original = tiles.map((t) => t.id).sort((a, b) => a - b);
              for (let count = 0; count < pairs; count++) {
                tiles = playableShuffle(tiles, mode, cols, ordered);
                assert.deepEqual(
                  tiles.map((t) => t.id).sort((a, b) => a - b),
                  original,
                );
                const pair = findPair(tiles, mode, cols, ordered);
                assert.ok(pair, `playable pair at ${count}/${pairs}`);
                const [a, b] = pair;
                if (mode === 'characters') reconcileCharacters(tiles, a, b, ordered);
                assert.equal(tiles[a].word.id, tiles[b].word.id);
                tiles[a].removed = tiles[b].removed = true;
                assert.equal(tiles.filter((t) => t.removed).length, (count + 1) * 2);
                if (mode === 'characters')
                  for (const tile of tiles)
                    assert.equal(tile.label, [...tile.word.hanzi][tile.side]);
              }
              assert.equal(findPair(tiles, mode, cols, ordered), null);
            }
});

test('matching uses visible characters, including identical glyphs from opposite word positions', () => {
  for (const [ids, firstId, firstSide, lastId, lastSide, result] of [
    [['today', 'weather'], 'today', 1, 'weather', 1, '天气'],
    [['school', 'student', 'birthday'], 'school', 0, 'birthday', 0, '学生'],
    [['thanks'], 'thanks', 1, 'thanks', 0, '谢谢'],
  ] as const) {
    const tiles = makeTiles(
      vocabulary.filter((w) => (ids as readonly string[]).includes(w.id)),
      'characters',
    );
    const a = tiles.findIndex((t) => t.word.id === firstId && t.side === firstSide);
    const b = tiles.findIndex((t) => t.word.id === lastId && t.side === lastSide);
    assert.ok(matches(tiles[a], tiles[b], 'characters', tiles));
    reconcileCharacters(tiles, a, b);
    assert.equal(tiles[a].word.hanzi, result);
    assert.equal(tiles[b].word.hanzi, result);
    tiles[a].removed = tiles[b].removed = true;
    for (const tile of tiles) assert.equal(tile.label, [...tile.word.hanzi][tile.side]);
    const remaining = tiles.filter((t) => !t.removed);
    for (const tile of remaining)
      assert.ok(
        remaining.some((other) => other.word.id === tile.word.id && other.side !== tile.side),
      );
  }
});

test('normal accepts reversed character selection while hard requires word order', () => {
  const tiles = makeTiles(
    vocabulary.filter((w) => ['computer', 'school'].includes(w.id)),
    'characters',
  );
  const first = tiles.findIndex((t) => t.label === '电');
  const last = tiles.findIndex((t) => t.label === '脑');
  assert.ok(matches(tiles[first], tiles[last], 'characters', tiles, true));
  assert.equal(matches(tiles[last], tiles[first], 'characters', tiles, true), false);
  assert.ok(matches(tiles[last], tiles[first], 'characters', tiles, false));
  reconcileCharacters(tiles, last, first, false);
  assert.equal(tiles[first].word.hanzi, '电脑');
  assert.equal(tiles[last].word.hanzi, '电脑');
  for (const tile of tiles) assert.equal(tile.label, [...tile.word.hanzi][tile.side]);
  const meaning = makeTiles(vocabulary.slice(0, 1), 'meaning');
  assert.ok(matches(meaning[0], meaning[1], 'meaning', meaning, true));
  assert.ok(matches(meaning[1], meaning[0], 'meaning', meaning, true));
});
