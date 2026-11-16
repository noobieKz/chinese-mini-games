import type { AudioChannel, GameSound } from './GameAudio';

export type AudioProfile = {
  storageKey: string;
  description: string;
  music: { title: string; author: string; source: string; url: string; license?: string };
  controls: { channel: AudioChannel; title: string; description: string; sample?: GameSound }[];
};

export const fruitAudioProfile: AudioProfile = {
  storageKey: 'hanplay.fruit.audio.v1',
  description: 'Nhạc vừa đủ nhẹ. Đường chém thật đã tay.',
  music: {
    title: 'Lotus Pond',
    author: 'BiteMe Games',
    source: 'https://bitemegames.itch.io/chinese-game-music',
    url: '/audio/lotus-pond-loop.mp3',
  },
  controls: [
    { channel: 'music', title: 'Nhạc nền', description: 'Lotus Pond · Đàn tranh và sáo nhẹ' },
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

export const gardenAudioProfile: AudioProfile = {
  storageKey: 'hanplay.garden.audio.v1',
  description: 'Thả lỏng, nối từng cặp và khám phá từ mới.',
  music: {
    title: 'Lotus Pond',
    author: 'BiteMe Games',
    source: 'https://bitemegames.itch.io/chinese-game-music',
    url: '/audio/lotus-pond-loop.mp3',
  },
  controls: [
    {
      channel: 'music',
      title: 'Nhạc nền',
      description: 'Lotus Pond · Đàn tranh và sáo nhẹ nhàng',
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
