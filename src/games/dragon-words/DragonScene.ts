import Phaser from 'phaser';
import type { Word } from '../word-garden/vocabulary';
import {
  canTurn,
  createDragon,
  step,
  STEP,
  turn,
  type Dir,
  type DragonEvent,
  type DragonSpeed,
  type DragonState,
  type Pearl,
  type Point,
  type WordResult,
} from './model';

export const CELL = 48;
export type DragonView = {
  phase: 'ready' | 'playing' | 'over';
  cols: number;
  rows: number;
  score: number;
  lives: number;
  combo: number;
  bestCombo: number;
  word: Word | null;
  progress: number;
  pearls: Pearl[];
  results: WordResult[];
  events: DragonEvent[];
};
export type DragonConfig = { words: Word[]; cols: number; rows: number; speed: DragonSpeed };
export type DragonHandle = {
  start(config: DragonConfig): void;
  turn(dir: Dir): void;
  pause(paused: boolean): void;
  finish(): void;
  destroy(): void;
};

const BODY = [0xc8452f, 0xd65a36];
const BELLY = 0xf2c14e;
const HEAD = 0xb3362a;

class DragonScene extends Phaser.Scene {
  private model: DragonState | null = null;
  private lastStep = 0;
  private paused = false;
  private pausedAt: number | null = null;
  private board?: Phaser.GameObjects.Graphics;
  private body?: Phaser.GameObjects.Graphics;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(
    private cols: number,
    private rows: number,
    private changed: (view: DragonView) => void,
    private ready: () => void,
  ) {
    super('dragon-words');
  }
  create() {
    this.board = this.add.graphics().setDepth(0);
    this.body = this.add.graphics().setDepth(10);
    this.drawBoard();
    this.ready();
    this.publish();
  }
  private drawBoard() {
    const g = this.board!;
    const w = this.cols * CELL,
      h = this.rows * CELL;
    g.clear();
    g.fillStyle(0xdce8df).fillRect(0, 0, w, h);
    // Checker of very close greens: enough to read the grid while steering, never louder than the pearls.
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++)
        if ((x + y) % 2) g.fillStyle(0xe9f1eb).fillRect(x * CELL, y * CELL, CELL, CELL);
    g.lineStyle(2, 0xa9c0ae, 0.8).strokeRect(1, 1, w - 2, h - 2);
  }
  start(config: DragonConfig) {
    this.model = createDragon(config.words, config);
    if (config.cols !== this.cols || config.rows !== this.rows) {
      this.cols = config.cols;
      this.rows = config.rows;
      this.scale.setGameSize(this.cols * CELL, this.rows * CELL);
      this.drawBoard();
    }
    this.paused = false;
    this.pausedAt = null;
    this.lastStep = performance.now();
    this.publish();
  }
  /**
   * Turn at the cell the player sees the head in. The head is drawn sliding into the next cell, so
   * past halfway it looks like it is already there: finish that step now, then turn from that cell.
   * Before halfway the head still reads as the current cell, and the turn applies from there.
   */
  turn(dir: Dir) {
    const model = this.model;
    if (!model || this.paused || !canTurn(model, dir)) return;
    const now = performance.now();
    if (!model.turns.length && now - this.lastStep >= model.stepMs * 0.5) this.advance(now, false);
    turn(model, dir);
  }
  pause(paused: boolean) {
    const now = performance.now();
    if (paused && !this.paused) this.pausedAt = now;
    if (!paused && this.paused && this.pausedAt !== null) {
      this.lastStep += now - this.pausedAt;
      this.pausedAt = null;
    }
    this.paused = paused;
  }
  finish() {
    const model = this.model;
    if (!model || model.phase === 'over') return;
    model.phase = 'over';
    if (model.progress > 0 || model.wordMistakes > 0)
      model.results.push({ word: model.word, done: false, mistakes: model.wordMistakes });
    model.events = [];
    this.publish();
  }
  update() {
    const model = this.model;
    const now = performance.now();
    if (model && model.phase === 'playing' && !this.paused && now - this.lastStep >= model.stepMs)
      this.advance(now, true);
    this.drawDragon(now);
  }
  /** One step of the rules. On the beat it keeps the rhythm; an early step (a late turn) restarts it now. */
  private advance(now: number, onBeat: boolean) {
    const model = this.model!;
    step(model);
    // Never try to catch up a backlog after a stall.
    this.lastStep =
      onBeat && now - this.lastStep <= model.stepMs * 2 ? this.lastStep + model.stepMs : now;
    model.events.forEach((event) => this.effect(event));
    this.publish();
  }
  private center(p: Point) {
    return { x: (p.x + 0.5) * CELL, y: (p.y + 0.5) * CELL };
  }
  /**
   * Draw each segment sliding from its cell toward the cell it takes next: the head toward the
   * pending turn (so a key press shows at once), every other segment toward the one in front of it.
   * Drawing ahead of the rules instead of behind them removes a whole step of input lag.
   */
  private segments(now: number) {
    const model = this.model!;
    const t =
      model.phase !== 'playing'
        ? 0
        : Phaser.Math.Clamp(((this.pausedAt ?? now) - this.lastStep) / model.stepMs, 0, 1);
    const heading = STEP[model.turns[0] ?? model.dir];
    return model.snake.map((cur, i) => {
      let dx = heading.x,
        dy = heading.y;
      if (i > 0) {
        dx = model.snake[i - 1].x - cur.x;
        dy = model.snake[i - 1].y - cur.y;
        // Across the wrapped edge the segment in front is one cell away the other way round.
        if (Math.abs(dx) > 1) dx = -Math.sign(dx);
        if (Math.abs(dy) > 1) dy = -Math.sign(dy);
      }
      return { x: (cur.x + 0.5 + dx * t) * CELL, y: (cur.y + 0.5 + dy * t) * CELL };
    });
  }
  private drawDragon(now: number) {
    const g = this.body!;
    g.clear();
    if (!this.model) return;
    const points = this.segments(now);
    const n = points.length;
    const radius = (i: number) => CELL * (0.4 - (0.12 * i) / Math.max(1, n - 1));
    for (let i = n - 1; i > 0; i--) {
      const a = points[i],
        b = points[i - 1];
      if (Math.hypot(a.x - b.x, a.y - b.y) < CELL * 1.5)
        g.lineStyle(radius(i) * 1.6, BODY[0]).lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let i = n - 1; i > 0; i--) {
      const p = points[i];
      g.fillStyle(BODY[i % 2]).fillCircle(p.x, p.y, radius(i));
      g.fillStyle(BELLY, 0.85).fillCircle(p.x, p.y, radius(i) * 0.38);
    }
    const head = points[0];
    // Face the pending turn, like the head's position does.
    const dir = this.model.turns[0] ?? this.model.dir;
    const fx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const fy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    // Gold horns behind the head, pointing away from the direction of travel.
    for (const side of [-1, 1]) {
      const bx = head.x - fx * CELL * 0.28 + fy * side * CELL * 0.22;
      const by = head.y - fy * CELL * 0.28 - fx * side * CELL * 0.22;
      g.fillStyle(BELLY).fillTriangle(
        bx,
        by,
        bx - fx * CELL * 0.28 + fy * side * CELL * 0.14,
        by - fy * CELL * 0.28 - fx * side * CELL * 0.14,
        bx + fy * side * CELL * 0.1,
        by - fx * side * CELL * 0.1,
      );
    }
    g.fillStyle(HEAD).fillCircle(head.x, head.y, CELL * 0.47);
    g.lineStyle(2, BELLY, 0.9).strokeCircle(head.x, head.y, CELL * 0.47);
    for (const side of [-1, 1]) {
      const ex = head.x + fx * CELL * 0.16 + fy * side * CELL * 0.2;
      const ey = head.y + fy * CELL * 0.16 - fx * side * CELL * 0.2;
      g.fillStyle(0xfff6dc).fillCircle(ex, ey, CELL * 0.11);
      g.fillStyle(0x1b1b1b).fillCircle(ex + fx * 2, ey + fy * 2, CELL * 0.055);
    }
  }
  private effect(event: DragonEvent) {
    if (event.kind === 'over') return;
    const { x, y } = this.center(event.at);
    if (event.kind === 'mistake' || event.kind === 'bite') {
      const ring = this.add
        .circle(x, y, CELL * 0.45)
        .setStrokeStyle(4, 0xff8a7a)
        .setDepth(20);
      this.tweens.add({
        targets: ring,
        scale: 1.8,
        alpha: 0,
        duration: 450,
        onComplete: () => ring.destroy(),
      });
      return;
    }
    if (event.kind === 'word') {
      const label = this.add
        .text(x, y - CELL * 0.6, `+${event.points}`, {
          fontFamily: '"Be Vietnam Pro", sans-serif',
          fontSize: '30px',
          fontStyle: 'bold',
          color: '#ffe08a',
          stroke: '#173b33',
          strokeThickness: 5,
          resolution: 2,
        })
        .setOrigin(0.5)
        .setDepth(30);
      this.tweens.add({
        targets: label,
        y: label.y - CELL,
        alpha: 0,
        duration: 900,
        onComplete: () => label.destroy(),
      });
    }
    if (this.reducedMotion) return;
    for (let i = 0; i < (event.kind === 'word' ? 16 : 8); i++) {
      const angle = (i / (event.kind === 'word' ? 16 : 8)) * Math.PI * 2;
      const spark = this.add.circle(x, y, i % 2 ? 3 : 4, i % 3 ? BELLY : 0xfff3c4).setDepth(25);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * CELL * 0.9,
        y: y + Math.sin(angle) * CELL * 0.9,
        alpha: 0,
        scale: 0.2,
        duration: 480,
        onComplete: () => spark.destroy(),
      });
    }
  }
  private publish() {
    const model = this.model;
    this.changed({
      phase: model ? model.phase : 'ready',
      cols: this.cols,
      rows: this.rows,
      score: model?.score ?? 0,
      lives: model?.lives ?? 3,
      combo: model?.combo ?? 0,
      bestCombo: model?.bestCombo ?? 0,
      word: model?.word ?? null,
      progress: model?.progress ?? 0,
      pearls: model ? model.pearls.map((p) => ({ ...p })) : [],
      results: model ? [...model.results] : [],
      events: model ? [...model.events] : [],
    });
  }
}

export function createDragonArena(
  parent: HTMLElement,
  size: { cols: number; rows: number },
  changed: (view: DragonView) => void,
  ready: () => void,
): DragonHandle {
  const scene = new DragonScene(size.cols, size.rows, changed, ready);
  // Dev-only handle for browser checks; Vite strips this branch from production builds.
  if (import.meta.env.DEV) (window as unknown as { __dragon?: unknown }).__dragon = scene;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: size.cols * CELL,
    height: size.rows * CELL,
    transparent: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [scene],
    render: { antialias: true },
    audio: { noAudio: true },
    banner: false,
  });
  return {
    start: (config) => scene.start(config),
    turn: (dir) => scene.turn(dir),
    pause: (value) => scene.pause(value),
    finish: () => scene.finish(),
    destroy: () => game.destroy(true),
  };
}
