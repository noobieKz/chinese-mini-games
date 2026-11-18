import { buildBundle, type CollocationRow, type WordRow } from '../../shared/content';

/**
 * Sample lessons bundled with the games. Used when the Cloudflare content cannot be loaded, and as
 * the starting point of the Excel template. The real course content is uploaded with
 * `npm run content -- upload` (see content/README.md).
 */
const words: [
  level: string,
  lesson: number,
  title: string,
  hanzi: string,
  pinyin: string,
  meaning: string,
][] = [
  ['HSK 1', 1, 'Trường lớp & bạn bè', '朋友', 'péngyou', 'bạn bè'],
  ['HSK 1', 1, '', '学生', 'xuésheng', 'học sinh'],
  ['HSK 1', 1, '', '老师', 'lǎoshī', 'giáo viên'],
  ['HSK 1', 1, '', '学校', 'xuéxiào', 'trường học'],
  ['HSK 1', 1, '', '中国', 'Zhōngguó', 'Trung Quốc'],
  ['HSK 1', 1, '', '电脑', 'diànnǎo', 'máy tính'],
  ['HSK 1', 2, 'Chào hỏi & thời gian', '你好', 'nǐ hǎo', 'xin chào'],
  ['HSK 1', 2, '', '谢谢', 'xièxie', 'cảm ơn'],
  ['HSK 1', 2, '', '明天', 'míngtiān', 'ngày mai'],
  ['HSK 1', 2, '', '今天', 'jīntiān', 'hôm nay'],
  ['HSK 1', 2, '', '水果', 'shuǐguǒ', 'trái cây'],
  ['HSK 1', 2, '', '天气', 'tiānqì', 'thời tiết'],
  ['HSK 1', 3, 'Nơi chốn & sở thích', '医院', 'yīyuàn', 'bệnh viện'],
  ['HSK 1', 3, '', '商店', 'shāngdiàn', 'cửa hàng'],
  ['HSK 1', 3, '', '电影', 'diànyǐng', 'phim'],
  ['HSK 1', 3, '', '喜欢', 'xǐhuan', 'thích'],
  ['HSK 1', 3, '', '漂亮', 'piàoliang', 'xinh đẹp'],
  ['HSK 1', 3, '', '昨天', 'zuótiān', 'hôm qua'],
  ['HSK 2', 1, 'Hoạt động & cảm xúc', '快乐', 'kuàilè', 'vui vẻ'],
  ['HSK 2', 1, '', '旅游', 'lǚyóu', 'du lịch'],
  ['HSK 2', 1, '', '运动', 'yùndòng', 'vận động'],
  ['HSK 2', 1, '', '准备', 'zhǔnbèi', 'chuẩn bị'],
  ['HSK 2', 1, '', '帮助', 'bāngzhù', 'giúp đỡ'],
  ['HSK 2', 1, '', '因为', 'yīnwèi', 'bởi vì'],
  ['HSK 2', 2, 'Thời gian & sinh hoạt', '希望', 'xīwàng', 'hy vọng'],
  ['HSK 2', 2, '', '时间', 'shíjiān', 'thời gian'],
  ['HSK 2', 2, '', '早上', 'zǎoshang', 'buổi sáng'],
  ['HSK 2', 2, '', '房间', 'fángjiān', 'căn phòng'],
  ['HSK 2', 2, '', '生日', 'shēngrì', 'sinh nhật'],
  ['HSK 2', 2, '', '一起', 'yìqǐ', 'cùng nhau'],
  ['HSK 2', 3, 'Giao tiếp', '已经', 'yǐjīng', 'đã'],
  ['HSK 2', 3, '', '介绍', 'jièshào', 'giới thiệu'],
  ['HSK 2', 3, '', '问题', 'wèntí', 'câu hỏi'],
  ['HSK 2', 3, '', '知道', 'zhīdào', 'biết'],
  ['HSK 2', 3, '', '觉得', 'juéde', 'cảm thấy'],
  ['HSK 2', 3, '', '可以', 'kěyǐ', 'có thể'],
];
const collocations: [
  lesson: number,
  noun: string,
  verb: string,
  wrong1: string,
  wrong2: string,
  pinyin: string,
  meaning: string,
][] = [
  [1, '篮球', '打', '喝', '读', 'dǎ lánqiú', 'chơi bóng rổ'],
  [1, '足球', '踢', '喝', '写', 'tī zúqiú', 'đá bóng'],
  [1, '电视', '看', '吃', '写', 'kàn diànshì', 'xem tivi'],
  [1, '音乐', '听', '吃', '写', 'tīng yīnyuè', 'nghe nhạc'],
  [2, '汉字', '写', '喝', '踢', 'xiě Hànzì', 'viết chữ Hán'],
  [2, '米饭', '吃', '看', '听', 'chī mǐfàn', 'ăn cơm'],
  [2, '茶', '喝', '写', '踢', 'hē chá', 'uống trà'],
  [2, '电话', '打', '吃', '读', 'dǎ diànhuà', 'gọi điện thoại'],
  [3, '衣服', '穿', '喝', '听', 'chuān yīfu', 'mặc quần áo'],
  [3, '照片', '拍', '喝', '踢', 'pāi zhàopiàn', 'chụp ảnh'],
  [3, '作业', '做', '喝', '踢', 'zuò zuòyè', 'làm bài tập'],
  [3, '房间', '打扫', '喝', '听', 'dǎsǎo fángjiān', 'dọn phòng'],
];

export const sampleWordRows: WordRow[] = words.map(
  ([level, lesson, lessonTitle, hanzi, pinyin, meaning], i) => ({
    row: i + 2,
    level,
    lesson: String(lesson),
    lessonTitle,
    hanzi,
    pinyin,
    meaning,
    games: '',
  }),
);
export const sampleCollocationRows: CollocationRow[] = collocations.map(
  ([lesson, noun, verb, wrong1, wrong2, pinyin, meaning], i) => ({
    row: i + 2,
    level: 'HSK 1',
    lesson: String(lesson),
    noun,
    verb,
    wrong1,
    wrong2,
    pinyin,
    meaning,
  }),
);
export const sampleBundle = buildBundle(
  sampleWordRows,
  sampleCollocationRows,
  '2026-11-18T00:00:00.000Z',
).bundle;
