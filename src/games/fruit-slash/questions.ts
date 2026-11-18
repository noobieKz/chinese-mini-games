import type { Collocation } from '../../../shared/content';
import type { Word } from '../word-garden/vocabulary';
import { shuffle } from '../word-garden/rules';

/** Vocabulary questions (meaning → characters) or verb–noun collocations, from the chosen lessons. */
export type FruitKind = 'words' | 'collocations';
export type FruitQuestion = {
  id: string;
  prompt: string;
  instruction: string;
  options: string[];
  answer: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
};
export type FruitSeconds = 0 | 10 | 15 | 20 | 30;
export type FruitConfig = { kind: FruitKind; seconds: FruitSeconds };
export const ROUND_LENGTH = 12;

/** Up to twelve questions; the two wrong fruits come from the same lessons, so they look plausible. */
export function makeWordQuestions(words: Word[], random = Math.random): FruitQuestion[] {
  if (words.length < 3) return [];
  return shuffle(words, random)
    .slice(0, ROUND_LENGTH)
    .map((word) => {
      const alternatives = shuffle(
        words.filter((other) => other.hanzi !== word.hanzi),
        random,
      ).slice(0, 2);
      const options = shuffle([word.hanzi, ...alternatives.map((other) => other.hanzi)], random);
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
    });
}

export function makeCollocationQuestions(
  items: Collocation[],
  random = Math.random,
): FruitQuestion[] {
  return shuffle(items, random)
    .slice(0, ROUND_LENGTH)
    .map((item) => {
      const options = shuffle([item.verb, ...item.wrong], random);
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
    });
}
