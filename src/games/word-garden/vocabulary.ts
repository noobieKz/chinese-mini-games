export type Word = {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  level: 'HSK 1' | 'HSK 2';
};
export type MatchMode = 'meaning' | 'characters';
export type Difficulty = 'normal' | 'hard';
export const vocabulary: Word[] = [
  ['friend', '朋友', 'péngyou', 'bạn bè', 'HSK 1'],
  ['student', '学生', 'xuésheng', 'học sinh', 'HSK 1'],
  ['teacher', '老师', 'lǎoshī', 'giáo viên', 'HSK 1'],
  ['school', '学校', 'xuéxiào', 'trường học', 'HSK 1'],
  ['china', '中国', 'Zhōngguó', 'Trung Quốc', 'HSK 1'],
  ['computer', '电脑', 'diànnǎo', 'máy tính', 'HSK 1'],
  ['hello', '你好', 'nǐ hǎo', 'xin chào', 'HSK 1'],
  ['thanks', '谢谢', 'xièxie', 'cảm ơn', 'HSK 1'],
  ['tomorrow', '明天', 'míngtiān', 'ngày mai', 'HSK 1'],
  ['today', '今天', 'jīntiān', 'hôm nay', 'HSK 1'],
  ['water', '水果', 'shuǐguǒ', 'trái cây', 'HSK 1'],
  ['weather', '天气', 'tiānqì', 'thời tiết', 'HSK 1'],
  ['hospital', '医院', 'yīyuàn', 'bệnh viện', 'HSK 1'],
  ['shop', '商店', 'shāngdiàn', 'cửa hàng', 'HSK 1'],
  ['movie', '电影', 'diànyǐng', 'phim', 'HSK 1'],
  ['like', '喜欢', 'xǐhuan', 'thích', 'HSK 1'],
  ['beautiful', '漂亮', 'piàoliang', 'xinh đẹp', 'HSK 1'],
  ['yesterday', '昨天', 'zuótiān', 'hôm qua', 'HSK 1'],
  ['happy', '快乐', 'kuàilè', 'vui vẻ', 'HSK 2'],
  ['travel', '旅游', 'lǚyóu', 'du lịch', 'HSK 2'],
  ['exercise', '运动', 'yùndòng', 'vận động', 'HSK 2'],
  ['prepare', '准备', 'zhǔnbèi', 'chuẩn bị', 'HSK 2'],
  ['help', '帮助', 'bāngzhù', 'giúp đỡ', 'HSK 2'],
  ['because', '因为', 'yīnwèi', 'bởi vì', 'HSK 2'],
  ['hope', '希望', 'xīwàng', 'hy vọng', 'HSK 2'],
  ['time', '时间', 'shíjiān', 'thời gian', 'HSK 2'],
  ['morning', '早上', 'zǎoshang', 'buổi sáng', 'HSK 2'],
  ['room', '房间', 'fángjiān', 'căn phòng', 'HSK 2'],
  ['birthday', '生日', 'shēngrì', 'sinh nhật', 'HSK 2'],
  ['together', '一起', 'yìqǐ', 'cùng nhau', 'HSK 2'],
  ['already', '已经', 'yǐjīng', 'đã', 'HSK 2'],
  ['introduce', '介绍', 'jièshào', 'giới thiệu', 'HSK 2'],
  ['question', '问题', 'wèntí', 'câu hỏi', 'HSK 2'],
  ['know', '知道', 'zhīdào', 'biết', 'HSK 2'],
  ['feel', '觉得', 'juéde', 'cảm thấy', 'HSK 2'],
  ['possible', '可以', 'kěyǐ', 'có thể', 'HSK 2'],
].map(([id, hanzi, pinyin, meaning, level]) => ({
  id,
  hanzi,
  pinyin,
  meaning,
  level: level as Word['level'],
}));
