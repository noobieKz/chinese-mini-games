import type { Scenario, TopicId } from '../../../shared/lesson-editor';
import { shuffle } from '../word-garden/rules';

export const TEA_TIME = 90_000;
export const TEA_MAX_ORDERS = 27;
export const TEA_DEFAULT_ORDERS = 10;

export const ingredients = {
  drink: [
    { hanzi: '奶茶', label: 'Trà sữa' },
    { hanzi: '绿茶', label: 'Trà xanh' },
    { hanzi: '柠檬茶', label: 'Trà chanh' },
  ],
  ice: [
    { hanzi: '正常冰', label: 'Đá thường' },
    { hanzi: '少冰', label: 'Ít đá' },
    { hanzi: '去冰', label: 'Không đá' },
  ],
  sugar: [
    { hanzi: '全糖', label: 'Đủ đường' },
    { hanzi: '半糖', label: 'Nửa đường' },
    { hanzi: '不加糖', label: 'Không đường' },
  ],
} as const;

export const teaFields = ['size', 'drink', 'topping', 'ice', 'sugar'] as const;
export const teaLabels = {
  size: 'Chọn ly',
  drink: 'Rót trà',
  topping: 'Thêm topping',
  ice: 'Chọn đá hoặc nhiệt độ',
  sugar: 'Chỉnh đường',
};
export const teaChoices = {
  size: [
    { hanzi: '小杯', label: 'Ly nhỏ', pinyin: 'xiǎobēi' },
    { hanzi: '中杯', label: 'Ly vừa', pinyin: 'zhōngbēi' },
    { hanzi: '大杯', label: 'Ly lớn', pinyin: 'dàbēi' },
  ],
  drink: [
    { ...ingredients.drink[0], pinyin: 'nǎichá' },
    { ...ingredients.drink[1], pinyin: 'lǜchá' },
    { ...ingredients.drink[2], pinyin: 'níngméngchá' },
    { hanzi: '抹茶奶茶', label: 'Trà sữa matcha', pinyin: 'mǒchá nǎichá' },
    { hanzi: '乌龙奶茶', label: 'Trà sữa ô long', pinyin: 'wūlóng nǎichá' },
    { hanzi: '红茶', label: 'Hồng trà', pinyin: 'hóngchá' },
    { hanzi: '蜜桃茶', label: 'Trà đào', pinyin: 'mìtáochá' },
    { hanzi: '茉莉花茶', label: 'Trà hoa nhài', pinyin: 'mòlìhuāchá' },
  ],
  topping: [
    { hanzi: '不要配料', label: 'Không topping', pinyin: 'bú yào pèiliào' },
    { hanzi: '加珍珠', label: 'Trân châu đen', pinyin: 'jiā zhēnzhū' },
    { hanzi: '加椰果', label: 'Thạch dừa', pinyin: 'jiā yēguǒ' },
    { hanzi: '加布丁', label: 'Pudding', pinyin: 'jiā bùdīng' },
    { hanzi: '加仙草', label: 'Sương sáo', pinyin: 'jiā xiāncǎo' },
    { hanzi: '加红豆', label: 'Đậu đỏ', pinyin: 'jiā hóngdòu' },
    { hanzi: '加奶盖', label: 'Kem sữa', pinyin: 'jiā nǎigài' },
  ],
  ice: [
    { ...ingredients.ice[0], pinyin: 'zhèngcháng bīng' },
    { ...ingredients.ice[1], pinyin: 'shǎo bīng' },
    { ...ingredients.ice[2], pinyin: 'qù bīng' },
    { hanzi: '多冰', label: 'Nhiều đá', pinyin: 'duō bīng' },
    { hanzi: '要热的', label: 'Uống nóng', pinyin: 'yào rè de' },
  ],
  sugar: [
    { ...ingredients.sugar[0], pinyin: 'quán táng' },
    { ...ingredients.sugar[1], pinyin: 'bàn táng' },
    { ...ingredients.sugar[2], pinyin: 'bù jiā táng' },
    { hanzi: '三分糖', label: '30% đường', pinyin: 'sān fēn táng' },
    { hanzi: '七分糖', label: '70% đường', pinyin: 'qī fēn táng' },
  ],
} as const;

export type Recipe = { drink: number; ice: number; sugar: number; size?: number; topping?: number };
export const fields = ['drink', 'ice', 'sugar'] as const;

export { topicIds, type TopicId } from '../../../shared/lesson-editor';

export const SCENARIO_GAME_ROUTE = 'tiem-tra-sua';
export const SCENARIO_GAME_NAME = 'Tiệm nhỏ tiếng Trung';

type Choice = { hanzi: string; label: string };
type Topic = {
  name: string;
  category: string;
  labels: Record<(typeof fields)[number], string>;
  choices: Record<(typeof fields)[number], readonly Choice[]>;
  sentence(item: string, detail: string, extra: string): string;
};

export const topics: Record<TopicId, Topic> = {
  tea: {
    name: 'Tiệm trà sữa',
    category: 'Ẩm thực',
    labels: { drink: 'Đồ uống', ice: 'Lượng đá', sugar: 'Lượng đường' },
    choices: ingredients,
    sentence: (drink, ice, sugar) => `一杯${drink}，${ice}，${sugar}。`,
  },
  clothes: {
    name: 'Cửa hàng quần áo',
    category: 'Mua sắm',
    labels: { drink: 'Món đồ', ice: 'Màu sắc', sugar: 'Kích cỡ' },
    choices: {
      drink: [
        { hanzi: '衬衫', label: 'Áo sơ mi' },
        { hanzi: '裤子', label: 'Quần dài' },
        { hanzi: '外套', label: 'Áo khoác' },
      ],
      ice: [
        { hanzi: '白色', label: 'Trắng' },
        { hanzi: '黑色', label: 'Đen' },
        { hanzi: '蓝色', label: 'Xanh dương' },
      ],
      sugar: [
        { hanzi: '小号', label: 'Cỡ nhỏ' },
        { hanzi: '中号', label: 'Cỡ vừa' },
        { hanzi: '大号', label: 'Cỡ lớn' },
      ],
    },
    sentence: (item, color, size) =>
      `我要一${item === '裤子' ? '条' : '件'}${color}的${item}，${size}。`,
  },
  train: {
    name: 'Ga tàu',
    category: 'Đi lại',
    labels: { drink: 'Điểm đến', ice: 'Giờ đi', sugar: 'Số vé' },
    choices: {
      drink: [
        { hanzi: '北京', label: 'Bắc Kinh' },
        { hanzi: '上海', label: 'Thượng Hải' },
        { hanzi: '广州', label: 'Quảng Châu' },
      ],
      ice: [
        { hanzi: '上午九点', label: '9 giờ sáng' },
        { hanzi: '下午两点', label: '2 giờ chiều' },
        { hanzi: '晚上八点', label: '8 giờ tối' },
      ],
      sugar: [
        { hanzi: '一张', label: '1 vé' },
        { hanzi: '两张', label: '2 vé' },
        { hanzi: '三张', label: '3 vé' },
      ],
    },
    sentence: (city, time, count) => `我要${count}${time}去${city}的火车票。`,
  },
  restaurant: {
    name: 'Quán ăn',
    category: 'Ẩm thực',
    labels: { drink: 'Món ăn', ice: 'Cách nêm', sugar: 'Phục vụ' },
    choices: {
      drink: [
        { hanzi: '牛肉面', label: 'Mì bò' },
        { hanzi: '鸡肉饭', label: 'Cơm gà' },
        { hanzi: '饺子', label: 'Sủi cảo' },
      ],
      ice: [
        { hanzi: '不要辣', label: 'Không cay' },
        { hanzi: '少放盐', label: 'Ít muối' },
        { hanzi: '不要香菜', label: 'Không rau mùi' },
      ],
      sugar: [
        { hanzi: '在这儿吃', label: 'Ăn tại quán' },
        { hanzi: '打包带走', label: 'Gói mang đi' },
        { hanzi: '送到家', label: 'Giao đến nhà' },
      ],
    },
    sentence: (food, seasoning, service) => `我要一份${food}，${seasoning}，${service}。`,
  },
  library: {
    name: 'Thư viện',
    category: 'Trường học',
    labels: { drink: 'Loại sách', ice: 'Số lượng', sugar: 'Thời gian mượn' },
    choices: {
      drink: [
        { hanzi: '词典', label: 'Từ điển' },
        { hanzi: '小说', label: 'Tiểu thuyết' },
        { hanzi: '漫画', label: 'Truyện tranh' },
      ],
      ice: [
        { hanzi: '一本', label: '1 cuốn' },
        { hanzi: '两本', label: '2 cuốn' },
        { hanzi: '三本', label: '3 cuốn' },
      ],
      sugar: [
        { hanzi: '三天', label: '3 ngày' },
        { hanzi: '一周', label: '1 tuần' },
        { hanzi: '两周', label: '2 tuần' },
      ],
    },
    sentence: (book, count, term) => `我想借${count}${book}，借${term}。`,
  },
};

const extendedTopics = {
  clothes: {
    labels: { size: 'Chất liệu', topping: 'Thanh toán' },
    choices: {
      size: [
        { hanzi: '棉的', label: 'Vải cotton' },
        { hanzi: '麻的', label: 'Vải lanh' },
        { hanzi: '涤纶的', label: 'Vải polyester' },
      ],
      topping: [
        { hanzi: '付现金', label: 'Tiền mặt' },
        { hanzi: '刷卡', label: 'Thẻ' },
        { hanzi: '扫码付款', label: 'Quét mã' },
      ],
    },
    detail: (material: string, payment: string) => `要${material}，我${payment}。`,
  },
  train: {
    labels: { size: 'Hạng ghế', topping: 'Vị trí ghế' },
    choices: {
      size: [
        { hanzi: '二等座', label: 'Hạng hai' },
        { hanzi: '一等座', label: 'Hạng nhất' },
        { hanzi: '商务座', label: 'Hạng thương gia' },
      ],
      topping: [
        { hanzi: '靠窗', label: 'Gần cửa sổ' },
        { hanzi: '靠过道', label: 'Gần lối đi' },
        { hanzi: '座位随便', label: 'Vị trí nào cũng được' },
      ],
    },
    detail: (seatClass: string, seat: string) => `要${seatClass}，${seat}。`,
  },
  restaurant: {
    labels: { size: 'Cỡ phần', topping: 'Món kèm' },
    choices: {
      size: [
        { hanzi: '小份', label: 'Phần nhỏ' },
        { hanzi: '中份', label: 'Phần vừa' },
        { hanzi: '大份', label: 'Phần lớn' },
      ],
      topping: [
        { hanzi: '加一份青菜', label: 'Thêm rau xanh' },
        { hanzi: '加一个鸡蛋', label: 'Thêm trứng' },
        { hanzi: '不用加小菜', label: 'Không cần món kèm' },
      ],
    },
    detail: (portion: string, side: string) => `要${portion}，${side}。`,
  },
  library: {
    labels: { size: 'Ngôn ngữ', topping: 'Định dạng' },
    choices: {
      size: [
        { hanzi: '中文版', label: 'Bản tiếng Trung' },
        { hanzi: '英文版', label: 'Bản tiếng Anh' },
        { hanzi: '越南语版', label: 'Bản tiếng Việt' },
      ],
      topping: [
        { hanzi: '纸质书', label: 'Sách giấy' },
        { hanzi: '电子书', label: 'Sách điện tử' },
        { hanzi: '有声书', label: 'Sách nói' },
      ],
    },
    detail: (language: string, format: string) => `要${language}，要${format}。`,
  },
};

export const scenarioFields = [...fields, 'size', 'topping'] as const;

export function orderControls(topic: TopicId) {
  if (topic === 'tea') return { fields: teaFields, labels: teaLabels, choices: teaChoices };
  const main = topics[topic];
  const extra = extendedTopics[topic];
  return {
    fields: scenarioFields,
    labels: { ...main.labels, ...extra.labels },
    choices: { ...main.choices, ...extra.choices },
  };
}

export type Order = Recipe & { authored?: { hanzi: string; meaning: string } };

export function dealOrders(
  topic: TopicId,
  scenarios: Scenario[],
  random = Math.random,
  orderCount = TEA_MAX_ORDERS,
): Order[] {
  const authored = shuffle(
    scenarios.filter((item) => item.topic === topic),
    random,
  ).map(({ answer, hanzi, meaning }) => ({ ...answer, authored: { hanzi, meaning } }));
  const existing = new Set(authored.map((order) => order.authored.hanzi));
  const defaults = makeFullOrders(topic, random).filter(
    (order) => !existing.has(describeOrder(order, topic).hanzi),
  );
  return [...authored, ...defaults].slice(0, orderCount);
}

export function makeOrders(random = Math.random, topic: TopicId = 'tea') {
  const { choices } = topics[topic];
  return shuffle(
    choices.drink.flatMap((_, drink) =>
      choices.ice.flatMap((_, ice) => choices.sugar.map((_, sugar) => ({ drink, ice, sugar }))),
    ),
    random,
  );
}

function makeFullOrders(topic: TopicId, random: () => number) {
  const { choices } = orderControls(topic);
  const recipes = choices.size.flatMap((_, size) =>
    choices.drink.flatMap((_, drink) =>
      choices.topping.flatMap((_, topping) =>
        choices.ice.flatMap((_, ice) =>
          choices.sugar.map((_, sugar) => ({ size, drink, topping, ice, sugar })),
        ),
      ),
    ),
  );
  return shuffle(recipes, random);
}

export const isFullOrder = (order?: Recipe) =>
  order !== undefined && order.size !== undefined && order.topping !== undefined;

export function teaVocabulary(recipe: Recipe) {
  return teaFields.flatMap((field) => {
    const index = recipe[field];
    return index === undefined ? [] : [teaChoices[field][index]];
  });
}

export function orderAnswerLabels(order: Recipe, topic: TopicId) {
  const controls = orderControls(topic);
  return controls.fields.flatMap((field) => {
    const index = order[field];
    return index === undefined ? [] : [controls.choices[field][index]?.label ?? ''];
  });
}

export function describeOrder(
  order: Order,
  topic: TopicId = 'tea',
): { hanzi: string; meaning: string; pinyin?: string } {
  if (order.authored) return order.authored;
  if (topic === 'tea' && isFullOrder(order)) {
    const [size, drink, topping, ice, sugar] = teaVocabulary(order);
    return {
      hanzi: `我要一杯${drink.hanzi}，${size.hanzi}，${topping.hanzi}，${ice.hanzi}，${sugar.hanzi}。`,
      meaning: teaVocabulary(order)
        .map(({ label }) => label)
        .join(' · '),
      pinyin: `Wǒ yào yì bēi ${drink.pinyin}, ${size.pinyin}, ${topping.pinyin}, ${ice.pinyin}, ${sugar.pinyin}.`,
    };
  }
  const { choices, sentence } = topics[topic];
  let hanzi = sentence(
    choices.drink[order.drink].hanzi,
    choices.ice[order.ice].hanzi,
    choices.sugar[order.sugar].hanzi,
  );
  if (topic !== 'tea' && order.size !== undefined && order.topping !== undefined) {
    const { choices: extra, detail } = extendedTopics[topic];
    hanzi += detail(extra.size[order.size].hanzi, extra.topping[order.topping].hanzi);
  }
  return { hanzi, meaning: orderAnswerLabels(order, topic).join(' · ') };
}

export function matchesOrder(order: Recipe, recipe: Recipe) {
  return teaFields.every((field) => order[field] === undefined || order[field] === recipe[field]);
}
