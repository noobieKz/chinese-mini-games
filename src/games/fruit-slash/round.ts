import type { FruitQuestion } from './questions';

export type FruitResult = {
  question: FruitQuestion;
  picked: number | null;
  correct: boolean;
  points: number;
};
export type FruitView = {
  phase: 'ready' | 'playing' | 'feedback' | 'finished';
  index: number;
  total: number;
  score: number;
  combo: number;
  bestCombo: number;
  correct: number;
  remaining: number;
  question: FruitQuestion | null;
  results: FruitResult[];
  paused: boolean;
};
export class FruitRound {
  phase: FruitView['phase'] = 'ready';
  index = 0;
  score = 0;
  combo = 0;
  bestCombo = 0;
  results: FruitResult[] = [];
  private deadline = Infinity;
  private feedbackUntil = Infinity;
  private acceptAt = 0;
  private pausedAt: number | null = null;
  constructor(
    readonly questions: FruitQuestion[],
    readonly seconds: number,
  ) {}
  start(now: number) {
    if (this.phase !== 'ready') return;
    if (!this.questions.length) {
      this.phase = 'finished';
      return;
    }
    this.beginQuestion(now);
  }
  private beginQuestion(now: number) {
    this.phase = 'playing';
    this.acceptAt = now + 300;
    this.deadline = this.seconds ? now + this.seconds * 1000 : Infinity;
  }
  accepting(now: number) {
    return (
      this.phase === 'playing' &&
      this.pausedAt === null &&
      now >= this.acceptAt &&
      now < this.deadline
    );
  }
  answer(questionId: string, picked: number, now: number): FruitResult | null {
    const question = this.questions[this.index];
    if (
      this.pausedAt !== null ||
      this.phase !== 'playing' ||
      !question ||
      question.id !== questionId ||
      now < this.acceptAt ||
      !Number.isInteger(picked) ||
      picked < 0 ||
      picked >= question.options.length
    )
      return null;
    if (now >= this.deadline) return this.resolve(null, now);
    return this.resolve(picked, now);
  }
  private resolve(picked: number | null, now: number) {
    const question = this.questions[this.index];
    const correct = picked === question.answer;
    this.combo = correct ? this.combo + 1 : 0;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const points = correct ? 10 + Math.min(this.combo - 1, 4) * 2 : picked === null ? 0 : -2;
    this.score = Math.max(0, this.score + points);
    const result = { question, picked, correct, points };
    this.results.push(result);
    this.phase = 'feedback';
    this.feedbackUntil = now + 1800;
    return result;
  }
  tick(now: number): FruitResult | null {
    if (this.pausedAt !== null) return null;
    if (this.phase === 'playing' && now >= this.deadline) return this.resolve(null, now);
    if (this.phase === 'feedback' && now >= this.feedbackUntil) {
      this.index++;
      if (this.index === this.questions.length) this.phase = 'finished';
      else this.beginQuestion(now);
    }
    return null;
  }
  pause(paused: boolean, now: number) {
    if (paused && this.pausedAt === null) this.pausedAt = now;
    else if (!paused && this.pausedAt !== null) {
      const elapsed = now - this.pausedAt;
      this.deadline += elapsed;
      this.feedbackUntil += elapsed;
      this.acceptAt += elapsed;
      this.pausedAt = null;
    }
  }
  finish() {
    this.phase = 'finished';
    this.pausedAt = null;
  }
  view(now: number): FruitView {
    return {
      phase: this.phase,
      index: this.index,
      total: this.questions.length,
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      correct: this.results.filter((result) => result.correct).length,
      remaining: this.seconds ? Math.max(0, this.deadline - (this.pausedAt ?? now)) : Infinity,
      question: this.questions[this.index] ?? null,
      results: [...this.results],
      paused: this.pausedAt !== null,
    };
  }
}

/** Earliest contact of a swept blade segment with a fruit, avoiding missed fast swipes. */
export function segmentCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  radius: number,
): number | null {
  const dx = bx - ax,
    dy = by - ay,
    ox = ax - cx,
    oy = ay - cy;
  if (ox * ox + oy * oy <= radius * radius) return 0;
  const a = dx * dx + dy * dy;
  if (!a) return null;
  const b = 2 * (ox * dx + oy * dy),
    c = ox * ox + oy * oy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
