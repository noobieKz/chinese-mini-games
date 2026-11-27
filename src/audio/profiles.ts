import type { AudioChannel, GameSound } from './GameAudio';

export type AudioProfile = {
  storageKey: string;
  description: string;
  music: { url: string };
  controls: { channel: AudioChannel; title: string; description: string; sample?: GameSound }[];
};

/** Every game plays the same background track: China-P (source and status in public/audio/CREDITS.md). */
const backgroundMusic: AudioProfile['music'] = { url: '/audio/china-p.mp3' };

export const fruitAudioProfile: AudioProfile = {
  storageKey: 'hanplay.fruit.audio.v1',
  description: 'Giai điệu Trung Hoa, beat điện tử rõ nhịp. Chém đúng, nối combo.',
  music: backgroundMusic,
  controls: [
    {
      channel: 'music',
      title: 'Nhạc nền',
      description: 'Bật hoặc tắt nhạc nền',
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
  music: backgroundMusic,
  controls: [
    {
      channel: 'music',
      title: 'Nhạc nền',
      description: 'Bật hoặc tắt nhạc nền',
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
  music: backgroundMusic,
  controls: [
    {
      channel: 'music',
      title: 'Nhạc nền',
      description: 'Bật hoặc tắt nhạc nền',
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
