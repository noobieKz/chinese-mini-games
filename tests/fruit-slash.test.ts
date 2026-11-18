import assert from 'node:assert/strict';
import test from 'node:test';
import {
  makeCollocationQuestions,
  makeWordQuestions,
  type FruitQuestion,
} from '../src/games/fruit-slash/questions';
import { sampleBundle } from '../src/content/sample';
import { FruitRound, segmentCircle } from '../src/games/fruit-slash/round';
const fixture: FruitQuestion[] = Array.from({ length: 12 }, (_, index) => ({
  id: `q-${index}`,
  prompt: 'máy tính',
  instruction: 'Chọn từ',
  options: ['电脑', '朋友', '学生'],
  answer: 0,
  hanzi: '电脑',
  pinyin: 'diànnǎo',
  meaning: 'máy tính',
}));

test('one answer per question, transition cooldown and question identity prevent swipe-through', () => {
  const round = new FruitRound(fixture.slice(0, 2), 15);
  round.start(0);
  assert.equal(round.answer('q-0', 0, 200), null);
  assert.ok(round.answer('q-0', 0, 350)?.correct);
  assert.equal(round.answer('q-0', 1, 400), null);
  assert.equal(round.score, 10);
  round.tick(2150);
  assert.equal(round.index, 1);
  assert.equal(round.answer('q-0', 0, 2600), null);
  assert.equal(round.answer('q-1', 0, 2200), null);
  assert.equal(round.answer('q-1', 8, 2600), null);
  assert.ok(round.answer('q-1', 0, 2600)?.correct);
  round.tick(4400);
  assert.equal(round.phase, 'finished');
  assert.equal(round.score, 22);
  assert.equal(round.results.length, 2);
});

test('pause preserves deadlines and prevents input; timeout beats a late swipe', () => {
  const round = new FruitRound(fixture.slice(0, 2), 10);
  round.start(1000);
  round.pause(true, 3000);
  round.tick(90000);
  assert.equal(round.view(90000).remaining, 8000);
  assert.equal(round.answer('q-0', 0, 90000), null);
  round.pause(false, 100000);
  assert.equal(round.view(100000).remaining, 8000);
  const late = round.answer('q-0', 0, 108001)!;
  assert.equal(late.picked, null);
  assert.equal(late.correct, false);
  assert.equal(round.score, 0);
  assert.equal(round.results.length, 1);
});

test('combo reward is capped, wrong answers reset it, and practice has no deadline', () => {
  const round = new FruitRound(fixture, 0);
  round.start(0);
  let now = 1000000;
  for (let index = 0; index < 6; index++) {
    assert.equal(round.answer(`q-${index}`, 0, now)?.points, [10, 12, 14, 16, 18, 18][index]);
    round.tick(now + 1800);
    now += 2200;
  }
  assert.equal(round.answer('q-6', 1, now)?.points, -2);
  round.tick(now + 1800);
  assert.equal(round.combo, 0);
  assert.equal(round.bestCombo, 6);
  assert.equal(round.answer('q-7', 0, now + 2200)?.points, 10);
  round.finish();
  assert.equal(round.answer('q-8', 0, now + 5000), null);
});

test('fast swipes intersect whole swept segments and contact order is measurable', () => {
  assert.equal(segmentCircle(0, 50, 200, 50, 100, 50, 20), 0.4);
  assert.equal(segmentCircle(0, 0, 200, 0, 100, 50, 20), null);
  assert.equal(segmentCircle(100, 50, 100, 50, 100, 50, 20), 0);
  assert.equal(segmentCircle(0, 0, 0, 0, 100, 50, 20), null);
  assert.ok(segmentCircle(0, 0, 400, 0, 100, 0, 30)! < segmentCircle(0, 0, 400, 0, 250, 0, 30)!);
});

test('all challenge banks have twelve unique questions with one valid answer among three options', () => {
  const words = (level: string) => sampleBundle.words.filter((w) => w.level === level);
  for (const questions of [
    makeWordQuestions(words('HSK 1')),
    makeWordQuestions(words('HSK 2')),
    makeCollocationQuestions(sampleBundle.collocations),
  ]) {
    assert.equal(questions.length, 12);
    assert.equal(new Set(questions.map((question) => question.id)).size, 12);
    for (const question of questions) {
      assert.equal(new Set(question.options).size, 3);
      assert.ok(question.options[question.answer]);
      assert.ok(question.hanzi && question.pinyin && question.meaning);
    }
  }
});

test('a single lesson makes a shorter round from its own words; too few words make none', () => {
  const lesson = sampleBundle.words.filter((w) => w.level === 'HSK 1' && w.lesson === 2);
  const questions = makeWordQuestions(lesson);
  assert.equal(questions.length, 6);
  for (const q of questions)
    for (const option of q.options)
      assert.ok(
        lesson.some((w) => w.hanzi === option),
        'distractors come from the same lesson',
      );
  assert.deepEqual(makeWordQuestions(lesson.slice(0, 2)), []);
});
