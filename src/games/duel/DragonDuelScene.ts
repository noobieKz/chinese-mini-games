import Phaser from 'phaser';
import type { Dir, Point } from '../dragon-words/model';
import { STEP } from '../dragon-words/model';

const CELL = 48;
type Palette = { body: [number, number]; belly: number; head: number };
/** Your dragon keeps the red of the one-player game; the opponent's is jade blue. */
const MINE: Palette = { body: [0xc8452f, 0xd65a36], belly: 0xf2c14e, head: 0xb3362a };
const THEIRS: Palette = { body: [0x2f6fa8, 0x3a82bf], belly: 0xa9e2f2, head: 0x23598c };

/** One dragon to draw; `t` is how far (0–1, a little more when a step is late) it has slid on. */
export type DrawnSnake = {
  body: Point[];
  dir: Dir;
  heading: Dir;
  safe: number;
  mine: boolean;
  t: number;
};
export type DragonFrame = { snakes: DrawnSnake[] };
export type DragonDuelHandle = {
  effect(
    kind: 'eat' | 'word' | 'mistake' | 'crash',
    at: Point,
    mine: boolean,
    label?: string,
  ): void;
  destroy(): void;
};

/**
 * Two-player Rồng săn chữ renderer: the board and both dragons, read every frame from the page
 * (`frame`). Movement between referee steps is drawn as a slide, like the one-player game.
 */
class DragonDuelScene extends Phaser.Scene {
  private board?: Phaser.GameObjects.Graphics;
  private bodies?: Phaser.GameObjects.Graphics;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(
    private cols: number,
    private rows: number,
    private frame: () => DragonFrame,
    private ready: () => void,
  ) {
    super('dragon-duel');
  }
  create() {
    this.board = this.add.graphics().setDepth(0);
    this.bodies = this.add.graphics().setDepth(10);
    const g = this.board;
    const w = this.cols * CELL,
      h = this.rows * CELL;
    g.fillStyle(0xdce8df).fillRect(0, 0, w, h);
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++)
        if ((x + y) % 2) g.fillStyle(0xe9f1eb).fillRect(x * CELL, y * CELL, CELL, CELL);
    g.lineStyle(2, 0xa9c0ae, 0.8).strokeRect(1, 1, w - 2, h - 2);
    this.ready();
  }
  update() {
    const frame = this.frame();
    const now = Date.now();
    const g = this.bodies!;
    g.clear();
    // The opponent first, so your own dragon is always drawn on top.
    for (const snake of [...frame.snakes].sort((a, b) => Number(a.mine) - Number(b.mine)))
      this.drawSnake(g, snake, snake.t, now);
  }
  private drawSnake(g: Phaser.GameObjects.Graphics, snake: DrawnSnake, t: number, now: number) {
    const colors = snake.mine ? MINE : THEIRS;
    // A dragon that just came back blinks while it passes through everything.
    const alpha = snake.safe > 0 ? (Math.floor(now / 160) % 2 ? 0.35 : 0.7) : 1;
    const heading = STEP[snake.heading];
    const points = snake.body.map((cur, i) => {
      let dx = heading.x,
        dy = heading.y;
      if (i > 0) {
        dx = snake.body[i - 1].x - cur.x;
        dy = snake.body[i - 1].y - cur.y;
        if (Math.abs(dx) > 1) dx = -Math.sign(dx);
        if (Math.abs(dy) > 1) dy = -Math.sign(dy);
      }
      return { x: (cur.x + 0.5 + dx * t) * CELL, y: (cur.y + 0.5 + dy * t) * CELL };
    });
    const n = points.length;
    const radius = (i: number) => CELL * (0.4 - (0.12 * i) / Math.max(1, n - 1));
    for (let i = n - 1; i > 0; i--) {
      const a = points[i],
        b = points[i - 1];
      if (Math.hypot(a.x - b.x, a.y - b.y) < CELL * 1.5)
        g.lineStyle(radius(i) * 1.6, colors.body[0], alpha).lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let i = n - 1; i > 0; i--) {
      const p = points[i];
      g.fillStyle(colors.body[i % 2], alpha).fillCircle(p.x, p.y, radius(i));
      g.fillStyle(colors.belly, 0.85 * alpha).fillCircle(p.x, p.y, radius(i) * 0.38);
    }
    const head = points[0];
    const fx = snake.heading === 'left' ? -1 : snake.heading === 'right' ? 1 : 0;
    const fy = snake.heading === 'up' ? -1 : snake.heading === 'down' ? 1 : 0;
    for (const side of [-1, 1]) {
      const bx = head.x - fx * CELL * 0.28 + fy * side * CELL * 0.22;
      const by = head.y - fy * CELL * 0.28 - fx * side * CELL * 0.22;
      g.fillStyle(colors.belly, alpha).fillTriangle(
        bx,
        by,
        bx - fx * CELL * 0.28 + fy * side * CELL * 0.14,
        by - fy * CELL * 0.28 - fx * side * CELL * 0.14,
        bx + fy * side * CELL * 0.1,
        by - fx * side * CELL * 0.1,
      );
    }
    g.fillStyle(colors.head, alpha).fillCircle(head.x, head.y, CELL * 0.47);
    g.lineStyle(snake.mine ? 3 : 2, colors.belly, 0.9 * alpha).strokeCircle(
      head.x,
      head.y,
      CELL * 0.47,
    );
    for (const side of [-1, 1]) {
      const ex = head.x + fx * CELL * 0.16 + fy * side * CELL * 0.2;
      const ey = head.y + fy * CELL * 0.16 - fx * side * CELL * 0.2;
      g.fillStyle(0xfff6dc, alpha).fillCircle(ex, ey, CELL * 0.11);
      g.fillStyle(0x1b1b1b, alpha).fillCircle(ex + fx * 2, ey + fy * 2, CELL * 0.055);
    }
  }
  effect(kind: 'eat' | 'word' | 'mistake' | 'crash', at: Point, mine: boolean, label?: string) {
    const x = (at.x + 0.5) * CELL,
      y = (at.y + 0.5) * CELL;
    if (kind === 'mistake' || kind === 'crash') {
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
    }
    if (label) {
      const text = this.add
        .text(x, y - CELL * 0.6, label, {
          fontFamily: '"Be Vietnam Pro", sans-serif',
          fontSize: '28px',
          fontStyle: 'bold',
          color: kind === 'mistake' || kind === 'crash' ? '#ffb3a1' : mine ? '#ffe08a' : '#bfe9ff',
          stroke: '#173b33',
          strokeThickness: 5,
          resolution: 2,
        })
        .setOrigin(0.5)
        .setDepth(30);
      this.tweens.add({
        targets: text,
        y: text.y - CELL,
        alpha: 0,
        duration: 900,
        onComplete: () => text.destroy(),
      });
    }
    if (this.reducedMotion || kind === 'mistake' || kind === 'crash') return;
    const sparks = kind === 'word' ? 16 : 8;
    const color = mine ? MINE.belly : THEIRS.belly;
    for (let i = 0; i < sparks; i++) {
      const angle = (i / sparks) * Math.PI * 2;
      const spark = this.add.circle(x, y, i % 2 ? 3 : 4, i % 3 ? color : 0xfff3c4).setDepth(25);
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
}

export function createDragonDuel(
  parent: HTMLElement,
  size: { cols: number; rows: number },
  frame: () => DragonFrame,
  ready: () => void,
): DragonDuelHandle {
  const scene = new DragonDuelScene(size.cols, size.rows, frame, ready);
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
    effect: (kind, at, mine, label) => scene.effect(kind, at, mine, label),
    destroy: () => game.destroy(true),
  };
}
