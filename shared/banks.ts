import type { Bank } from './types';
const q = (id: number, text: string, options: string[], answer: number, pinyin?: string) => ({
  id: String(id),
  text,
  options,
  answer,
  pinyin,
});
export const defaultBanks: Bank[] = [
  {
    id: 'hsk1',
    title: 'Chào bạn, tiếng Trung!',
    description: 'Làm quen với những từ vựng đầu tiên: chào hỏi, gia đình và cuộc sống.',
    level: 'HSK 1',
    questions: [
      q(1, '“你好” có nghĩa là gì?', ['Xin chào', 'Tạm biệt', 'Cảm ơn', 'Xin lỗi'], 0, 'Nǐ hǎo'),
      q(2, 'Chọn từ có nghĩa là “cảm ơn”', ['再见', '谢谢', '你好', '不客气'], 1),
      q(3, '“老师” là ai?', ['Học sinh', 'Bác sĩ', 'Giáo viên', 'Bạn bè'], 2, 'Lǎoshī'),
      q(4, 'Điền từ: 我 ___ 越南人。', ['是', '有', '在', '去'], 0),
      q(5, '“苹果” là loại quả nào?', ['Cam', 'Chuối', 'Nho', 'Táo'], 3, 'Píngguǒ'),
      q(6, 'Số “八” là bao nhiêu?', ['6', '8', '9', '7'], 1, 'Bā'),
      q(
        7,
        '“我喜欢喝茶。” nghĩa là gì?',
        ['Tôi thích ăn cơm', 'Tôi muốn ngủ', 'Tôi thích uống trà', 'Tôi đi học'],
        2,
      ),
      q(8, 'Chọn pinyin đúng của “学生”', ['xuésheng', 'lǎoshī', 'péngyou', 'xǐhuan'], 0),
      q(9, '“今天” có nghĩa là gì?', ['Hôm qua', 'Ngày mai', 'Hôm nay', 'Buổi tối'], 2, 'Jīntiān'),
      q(
        10,
        'Chọn câu hỏi “Bạn tên là gì?”',
        ['你好吗？', '你叫什么名字？', '你去哪儿？', '你几岁？'],
        1,
      ),
      q(11, 'Lượng từ phù hợp: 一 ___ 书', ['个', '杯', '只', '本'], 3),
      q(12, '“妈妈” là ai?', ['Bố', 'Mẹ', 'Anh trai', 'Em gái'], 1, 'Māma'),
    ],
  },
  {
    id: 'food',
    title: 'Hôm nay ăn gì?',
    description: 'Một vòng khám phá đồ ăn, thức uống và cách gọi món bằng tiếng Trung.',
    level: 'HSK 1–2',
    questions: [
      q(1, '“米饭” nghĩa là gì?', ['Bánh mì', 'Cơm', 'Mì', 'Cháo'], 1, 'Mǐfàn'),
      q(2, 'Chọn từ chỉ “nước”', ['水', '茶', '奶', '酒'], 0),
      q(
        3,
        '“多少钱？” dùng để hỏi gì?',
        ['Ở đâu?', 'Mấy giờ?', 'Bao nhiêu tiền?', 'Có ngon không?'],
        2,
      ),
      q(4, 'Điền từ: 一 ___ 茶', ['本', '只', '张', '杯'], 3),
      q(5, '“面条” là món nào?', ['Mì', 'Cơm', 'Bánh', 'Trứng'], 0),
      q(6, '“好吃” có nghĩa là gì?', ['Đắt', 'Ngon', 'Nóng', 'Đói'], 1),
      q(
        7,
        '“我不吃肉。” nghĩa là gì?',
        ['Tôi không ăn thịt', 'Tôi thích thịt', 'Tôi mua thịt', 'Tôi nấu thịt'],
        0,
      ),
      q(8, 'Chọn từ chỉ “cà phê”', ['牛奶', '果汁', '咖啡', '面包'], 2),
    ],
  },
];
