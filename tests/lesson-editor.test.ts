import assert from 'node:assert/strict';
import test from 'node:test';
import { preparePublication } from '../shared/lesson-editor';
import type { ContentBundle, ContentWord } from '../shared/content';

const shared: ContentWord = {
  id: 'baseline',
  hanzi: '老师',
  pinyin: 'lǎoshī',
  meaning: 'giáo viên',
  level: 'HSK 1',
  lesson: 1,
  games: [],
};
const base: ContentBundle = {
  version: 1,
  updatedAt: '2025-01-01',
  words: [shared],
  levels: [{ name: shared.level, lessons: [{ number: 1, title: '' }] }],
  collocations: [],
};
const draft = { words: [], scenarios: [] };
const date = '2025-02-01';

test('gỡ từ khỏi một game giữ lại ở các game còn lại', () => {
  const result = preparePublication(
    base,
    {
      ...draft,
      wordChanges: [{ action: 'remove', original: shared, game: 'noi-tu' }],
    },
    date,
  );
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.bundle?.words[0].games, ['ghep-chu', 'chem-hoa-qua', 'rong-san-chu']);
  assert.deepEqual(base.words[0].games, []);
});

test('sửa từ giữ ID và không ghi đè lên phiên bản đã thay đổi', () => {
  const edit = {
    action: 'edit',
    original: shared,
    values: {
      hanzi: shared.hanzi,
      pinyin: shared.pinyin,
      meaning: 'thầy cô',
    },
  };
  const result = preparePublication(base, { ...draft, wordChanges: [edit] }, date);
  assert.equal(result.bundle?.words[0].id, shared.id);
  assert.equal(result.bundle?.words[0].meaning, 'thầy cô');
  assert.equal(
    preparePublication(result.bundle!, { ...draft, wordChanges: [edit] }, date).issues.length,
    1,
  );
});

test('xóa từ dùng chung khỏi kho ở mọi game', () => {
  const result = preparePublication(
    base,
    {
      ...draft,
      wordChanges: [{ action: 'remove', original: shared }],
    },
    date,
  );
  assert.deepEqual(result.bundle?.words, []);
});

test('levels and lessons can be published empty, then receive words', () => {
  const level = preparePublication(base, { ...draft, newLevels: ['hsk3'] }, date);
  assert.deepEqual(level.issues, []);
  assert.deepEqual(level.bundle?.levels.at(-1), { name: 'HSK 3', lessons: [] });
  const lesson = preparePublication(
    level.bundle!,
    {
      ...draft,
      newLessons: [{ level: 'HSK 3', number: 1, title: 'Gia đình' }],
    },
    date,
  );
  assert.deepEqual(lesson.issues, []);
  assert.deepEqual(lesson.bundle?.levels.at(-1)?.lessons, [{ number: 1, title: 'Gia đình' }]);
  const added = preparePublication(
    lesson.bundle!,
    {
      ...draft,
      words: [
        {
          level: 'HSK 3',
          lesson: 1,
          lessonTitle: '',
          hanzi: '家庭',
          pinyin: 'jiātíng',
          meaning: 'gia đình',
          games: ['noi-tu'],
        },
      ],
    },
    date,
  );
  assert.equal(added.bundle?.words.at(-1)?.lesson, 1);
  assert.equal(added.bundle?.levels.at(-1)?.lessons[0].title, 'Gia đình');
  assert.equal(
    preparePublication(
      base,
      {
        ...draft,
        newLessons: [{ level: 'HSK 3', number: 1, title: 'Gia đình' }],
      },
      date,
    ).issues.length,
    1,
  );
});
