/**
 * Real two-character words that can be built from the characters of the sample HSK sets but are not
 * targets of any board. Forming one is correct Chinese, so the game explains it instead of
 * penalising the player. Keep entries common and verified; none may duplicate `vocabulary`.
 */
export type ExtraWord = { hanzi: string; pinyin: string; meaning: string };

export const extraWords: ExtraWord[] = [
  // HSK 1 characters
  ['医生', 'yīshēng', 'bác sĩ'],
  ['天天', 'tiāntiān', 'mỗi ngày'],
  ['中学', 'zhōngxué', 'trường trung học'],
  ['中医', 'zhōngyī', 'Đông y'],
  ['好友', 'hǎoyǒu', 'bạn thân'],
  ['老友', 'lǎoyǒu', 'bạn cũ'],
  ['影院', 'yǐngyuàn', 'rạp chiếu phim'],
  ['学院', 'xuéyuàn', 'học viện'],
  ['医学', 'yīxué', 'y học'],
  ['学医', 'xué yī', 'học ngành y'],
  ['校医', 'xiàoyī', 'y tế trường học'],
  ['师生', 'shīshēng', 'thầy và trò'],
  ['生气', 'shēngqì', 'tức giận'],
  ['天生', 'tiānshēng', 'bẩm sinh'],
  ['欢喜', 'huānxǐ', 'vui mừng'],
  ['好学', 'hàoxué', 'ham học'],
  ['明亮', 'míngliàng', 'sáng sủa'],
  ['天亮', 'tiānliàng', 'trời sáng'],
  ['水电', 'shuǐdiàn', 'điện nước'],
  ['老天', 'lǎotiān', 'ông trời'],
  ['国学', 'guóxué', 'quốc học'],
  // HSK 2 characters
  ['以为', 'yǐwéi', 'tưởng rằng'],
  ['可乐', 'kělè', 'nước cô-ca'],
  ['早日', 'zǎorì', 'sớm ngày'],
  ['一时', 'yìshí', 'nhất thời'],
  ['一早', 'yìzǎo', 'sáng sớm'],
  ['早已', 'zǎoyǐ', 'đã từ lâu'],
  ['已知', 'yǐzhī', 'đã biết'],
  ['上游', 'shàngyóu', 'thượng nguồn'],
  ['一道', 'yídào', 'cùng nhau'],
  ['起动', 'qǐdòng', 'khởi động'],
  ['得知', 'dézhī', 'biết được'],
  ['准时', 'zhǔnshí', 'đúng giờ'],
  ['生动', 'shēngdòng', 'sinh động'],
  ['一生', 'yìshēng', 'cả đời'],
  ['以上', 'yǐshàng', 'trở lên'],
].map(([hanzi, pinyin, meaning]) => ({ hanzi, pinyin, meaning }));
