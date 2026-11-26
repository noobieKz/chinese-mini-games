import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBundle,
  levelSlug,
  parseBundle,
  parseScopeKey,
  scopeKey,
  selectCollocations,
  selectWords,
  type WordRow,
} from '../shared/content';
import { sampleBundle, sampleCollocationRows, sampleWordRows } from '../src/content/sample';

const row = (n: number, values: Partial<WordRow>): WordRow => ({
  row: n,
  level: 'HSK 1',
  lesson: '1',
  lessonTitle: '',
  hanzi: '你好',
  pinyin: 'nǐ hǎo',
  meaning: 'xin chào',
  ...values,
});

test('the bundled sample is valid, complete and survives a JSON round trip', () => {
  const { issues } = buildBundle(sampleWordRows, sampleCollocationRows);
  assert.deepEqual(issues, []);
  assert.equal(sampleBundle.words.length, 44);
  assert.equal(sampleBundle.collocations.length, 12);
  assert.deepEqual(
    sampleBundle.levels.map((l) => [l.name, l.lessons.length]),
    [
      ['HSK 1', 3],
      ['HSK 2', 3],
      ['Chào hỏi', 1],
    ],
  );
  assert.deepEqual(parseBundle(JSON.parse(JSON.stringify(sampleBundle))), sampleBundle);
  assert.equal(parseBundle({ version: 2 }), null, 'a malformed download is rejected');
});

test('spreadsheet errors name the row and column, and bad rows are skipped', () => {
  const { bundle, issues } = buildBundle([
    row(2, { lessonTitle: 'Chào hỏi' }),
    row(3, { hanzi: '谢谢', pinyin: '' }),
    row(4, { hanzi: 'xie xie', pinyin: 'xièxie' }),
    row(5, { hanzi: '朋友', lesson: 'một' }),
    row(6, { hanzi: '你好', lesson: '2' }),
    row(7, { hanzi: '老师', games: 'rong-san-chu, bay-chim' }),
    row(8, { hanzi: '', pinyin: '', meaning: '' }),
  ]);
  assert.deepEqual(
    bundle.words.map((w) => w.hanzi),
    ['你好'],
  );
  const byRow = Object.fromEntries(issues.map((i) => [i.row, i]));
  assert.match(byRow[3].message, /Pinyin.*trống/);
  assert.match(byRow[4].message, /Chữ Hán.*chữ Hán/);
  assert.match(byRow[5].message, /Bài/);
  assert.equal(
    byRow[6].severity,
    'warning',
    'duplicate in the same level is skipped with a warning',
  );
  assert.match(byRow[7].message, /bay-chim/);
  assert.equal(byRow[8], undefined, 'blank lines are ignored');
});

test('lessons keep their first title and are listed in order', () => {
  const { bundle, issues } = buildBundle([
    row(2, { lesson: '2', lessonTitle: 'Gia đình', hanzi: '爸爸', pinyin: 'bàba', meaning: 'bố' }),
    row(3, { lesson: '1', lessonTitle: 'Chào hỏi' }),
    row(4, { lesson: '2', lessonTitle: 'Nhà tôi', hanzi: '妈妈', pinyin: 'māma', meaning: 'mẹ' }),
  ]);
  assert.deepEqual(bundle.levels[0].lessons, [
    { number: 1, title: 'Chào hỏi' },
    { number: 2, title: 'Gia đình' },
  ]);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'warning');
});

test('scopes pick one lesson, every lesson up to one, or the whole level', () => {
  const pick = (key: string, game: Parameters<typeof selectWords>[2] = 'noi-tu') =>
    selectWords(sampleBundle, parseScopeKey('HSK 1', key), game).length;
  assert.equal(pick('lesson:2'), 6);
  assert.equal(pick('upto:2'), 12);
  assert.equal(pick('all'), 18);
  assert.equal(pick('nonsense'), 18, 'unknown keys fall back to the whole level');
  assert.equal(scopeKey(parseScopeKey('HSK 1', 'upto:3')), 'upto:3');
  assert.equal(selectCollocations(sampleBundle, parseScopeKey('HSK 1', 'lesson:1')).length, 4);
  assert.equal(levelSlug('HSK 1'), 'hsk-1');
  assert.equal(levelSlug('Sơ cấp 2'), 'so-cap-2');
});

test('Ghép chữ only uses two-character words; the Game column limits a word to some games', () => {
  const { bundle } = buildBundle([
    row(2, {}),
    row(3, { hanzi: '茶', pinyin: 'chá', meaning: 'trà' }),
    row(4, { hanzi: '谢谢', pinyin: 'xièxie', meaning: 'cảm ơn', games: 'rong-san-chu' }),
  ]);
  const scope = parseScopeKey('HSK 1', 'all');
  assert.deepEqual(
    selectWords(bundle, scope, 'ghep-chu').map((w) => w.hanzi),
    ['你好'],
  );
  assert.deepEqual(
    selectWords(bundle, scope, 'rong-san-chu').map((w) => w.hanzi),
    ['你好', '茶', '谢谢'],
  );
  assert.deepEqual(
    selectWords(bundle, scope, 'noi-tu').map((w) => w.hanzi),
    ['你好', '茶'],
  );
});
