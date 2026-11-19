import type { AudioChannel, GameSound } from './GameAudio';

export type AudioProfile = {
  storageKey: string;
  description: string;
  music: { title: string; author: string; source: string; url: string; license?: string };
  controls: { channel: AudioChannel; title: string; description: string; sample?: GameSound }[];
};

export const fruitAudioProfile: AudioProfile = {
  storageKey: 'hanplay.fruit.audio.v1',
  description: 'Giai điệu Trung Hoa, beat điện tử rõ nhịp. Chém đúng, nối combo.',
  music: {
    title: 'China-E',
    author: '徐梦圆 · Xu MengYuan',
    source: 'https://www.youtube.com/watch?v=IAMbG8OiExU&t=739s',
    url: '/audio/china-e.mp3',
  },
  controls: [
    {
      channel: 'music',
      title: 'Nhạc nền',
      description: 'China-E · Bản nhạc từ video China EDM đã chọn',
    },
    {
      channel: 'swing',
      title: 'Vung dao',
      description: 'Vút! Vút! · Gió lướt theo đường dao',
      sample: 'swing',
    },
    {
      channel: 'slice',
      title: 'Bổ quả',
      description: 'Tiếng quả vỡ khi chém trúng',
      sample: 'slice',
    },
    {
      channel: 'feedback',
      title: 'Báo đúng / sai',
      description: 'Phân biệt câu đúng và câu sai',
      sample: 'wrong',
    },
  ],
};

export const dragonAudioProfile: AudioProfile = {
  storageKey: 'hanplay.dragon.audio.v1',
  description: 'Beat điện tử giữ nhịp cho rồng lượn. Mỗi viên ngọc đúng một tiếng ngân.',
  music: {
    title: 'China-P',
    author: '徐梦圆 · Xu MengYuan',
    source: 'https://www.youtube.com/watch?v=IAMbG8OiExU&t=2675s',
    url: '/audio/china-p.mp3',
  },
  controls: [
    {
      channel: 'music',
      title: 'Nhạc nền',
      description: 'China-P · Bản nhạc từ video China EDM đã chọn',
    },
    {
      channel: 'selection',
      title: 'Ăn ngọc',
      description: 'Tiếng ngân khi rồng ăn đúng chữ',
      sample: 'select',
    },
    {
      channel: 'feedback',
      title: 'Báo đúng / sai',
      description: 'Ghép xong một từ, hoặc ăn nhầm chữ',
      sample: 'wrong',
    },
  ],
};

export const gardenAudioProfile: AudioProfile = {
  storageKey: 'hanplay.garden.audio.v1',
  description: 'Thả lỏng, nối từng cặp và khám phá từ mới.',
  music: {
    title: 'China-PiPa',
    author: '徐梦圆 · Xu MengYuan',
    source: 'https://www.youtube.com/watch?v=IAMbG8OiExU&t=2890s',
    url: '/audio/china-pipa.mp3',
  },
  controls: [
    {
      channel: 'music',
      title: 'Nhạc nền',
      description: 'China-PiPa · Bản nhạc từ video China EDM đã chọn',
    },
    {
      channel: 'selection',
      title: 'Chọn ô',
      description: 'Tiếng chạm nhẹ khi chọn chữ',
      sample: 'select',
    },
    {
      channel: 'feedback',
      title: 'Báo đúng / sai',
      description: 'Nối đúng vui tai, nối sai dễ nhận biết',
      sample: 'wrong',
    },
  ],
};
