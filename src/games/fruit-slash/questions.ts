import { vocabulary } from '../word-garden/vocabulary';
import { shuffle } from '../word-garden/rules';

export type FruitBank = 'hsk1' | 'hsk2' | 'collocations';
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
export type FruitConfig = { bank: FruitBank; seconds: 0 | 10 | 15 | 20 | 30 };
const collocations = [
  ['篮球', '打', '喝', '读', '打篮球', 'dǎ lánqiú', 'chơi bóng rổ'],
  ['足球', '踢', '喝', '写', '踢足球', 'tī zúqiú', 'đá bóng'],
  ['电视', '看', '吃', '写', '看电视', 'kàn diànshì', 'xem tivi'],
  ['音乐', '听', '吃', '写', '听音乐', 'tīng yīnyuè', 'nghe nhạc'],
  ['汉字', '写', '喝', '踢', '写汉字', 'xiě Hànzì', 'viết chữ Hán'],
  ['米饭', '吃', '看', '听', '吃米饭', 'chī mǐfàn', 'ăn cơm'],
  ['茶', '喝', '写', '踢', '喝茶', 'hē chá', 'uống trà'],
  ['电话', '打', '吃', '读', '打电话', 'dǎ diànhuà', 'gọi điện thoại'],
  ['衣服', '穿', '喝', '听', '穿衣服', 'chuān yīfu', 'mặc quần áo'],
  ['照片', '拍', '喝', '踢', '拍照片', 'pāi zhàopiàn', 'chụp ảnh'],
  ['作业', '做', '喝', '踢', '做作业', 'zuò zuòyè', 'làm bài tập'],
  ['房间', '打扫', '喝', '听', '打扫房间', 'dǎsǎo fángjiān', 'dọn phòng'],
];

export function makeFruitQuestions(bank: FruitBank): FruitQuestion[] {
  if (bank === 'collocations')
    return shuffle(collocations).map((row, i) => {
      const [noun, verb, wrong1, wrong2, hanzi, pinyin, meaning] = row;
      const options = shuffle([verb, wrong1, wrong2]);
      return {
        id: `collocation-${i}`,
        prompt: `___ ${noun}`,
        instruction: 'Chém động từ ghép đúng vào chỗ trống',
        options,
        answer: options.indexOf(verb),
        hanzi,
        pinyin,
        meaning,
      };
    });
  const words = vocabulary.filter((word) => word.level === (bank === 'hsk1' ? 'HSK 1' : 'HSK 2'));
  return shuffle(words)
    .slice(0, 12)
    .map((word) => {
      const alternatives = shuffle(words.filter((other) => other.id !== word.id)).slice(0, 2);
      const options = shuffle([word.hanzi, ...alternatives.map((other) => other.hanzi)]);
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
