export type Question = {
  id: string;
  text: string;
  pinyin?: string;
  options: string[];
  answer: number;
};
export type Bank = {
  id: string;
  title: string;
  description: string;
  level: string;
  questions: Question[];
};
export type Team = { id: number; name: string; gold: number; shield: boolean };
export type Player = { id: string; name: string; team: number; online: boolean; correct: number };
export type Reward = 'gold' | 'steal' | 'shield';
export type RoomView = {
  code: string;
  status: 'lobby' | 'playing' | 'finished';
  title: string;
  teams: Team[];
  players: Player[];
  endsAt: number;
  duration: number;
  activity: string[];
  me?: string;
  host: boolean;
  question?: Omit<Question, 'answer'>;
  pending?: Reward;
  answered: number;
  total: number;
};
export type Reply = {
  error?: string;
  token?: string;
  code?: string;
  correct?: boolean;
  correctAnswer?: string;
  reward?: Reward;
  amount?: number;
};
