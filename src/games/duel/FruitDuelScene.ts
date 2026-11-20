import Phaser from 'phaser';
import { fruitColors, paintFruit, paintOrchard } from '../fruit-slash/art';
import { FRUIT_OPTIONS } from './fruit-rules';
import { segmentCircle } from '../fruit-slash/round';
import type { FruitPosition } from '../fruit-slash/FruitScene';
import type { GameSound } from '../../audio/GameAudio';

export type FruitDuelHandle = {
  /** Fruits of a new question, launching at `launchAt` (local Date.now time). */
  question(key: string, launchAt: number): void;
  /** Whether a slash may be sent now (not locked out, question still open). */
  setLive(live: boolean): void;
  /** The question is over: split the winning fruit (or none) and clear the rest. */
  resolve(option: number | null, label: string, good: boolean): void;
  /** This player's wrong slash: split that fruit, the others stay for the opponent. */
  miss(option: number): void;
  clear(): void;
  destroy(): void;
};
const colors = [...fruitColors, 0x9b6bd6];
const lanes = [0.14, 0.38, 0.62, 0.86];

/** The duel's fourth fruit, a plum, in the same style as the three of the one-player game. */
function paintPlum(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 256, 256);
  ctx.save();
  ctx.translate(128, 139);
  ctx.beginPath();
  ctx.ellipse(0, 0, 86, 92, 0.1, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(-30, -37, 5, 15, 20, 125);
  gradient.addColorStop(0, '#e2c4ff');
  gradient.addColorStop(0.5, '#9b6bd6');
  gradient.addColorStop(1, '#4f2a86');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#7a4cb8';
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(4, -88);
  ctx.bezierCurveTo(-20, -20, -16, 40, 6, 92);
  ctx.stroke();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(-35, -37, 19, 35, 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#713f2f';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -84);
  ctx.quadraticCurveTo(-4, -100, 11, -113);
  ctx.stroke();
  ctx.fillStyle = '#79c677';
  ctx.beginPath();
  ctx.moveTo(5, -97);
  ctx.bezierCurveTo(26, -132, 68, -110, 63, -103);
  ctx.bezierCurveTo(43, -82, 23, -81, 5, -97);
  ctx.fill();
  ctx.restore();
}

type Flying = {
  option: number;
  sprite: Phaser.GameObjects.Image;
  delay: number;
  radius: number;
  lane: number;
  x: number;
  y: number;
  exited: boolean;
  gone: boolean;
};

/**
 * Two-player Chém hoa quả renderer: the orchard, three flying fruits per question and the blade.
 * It never decides anything: a slash is reported to the page, which asks the referee.
 */
class FruitDuelScene extends Phaser.Scene {
  private fruits: Flying[] = [];
  private background?: Phaser.GameObjects.Image;
  private bgTexture?: Phaser.Textures.CanvasTexture;
  private blade?: Phaser.GameObjects.Graphics;
  private trail: { x: number; y: number; time: number }[] = [];
  private pressed = false;
  private previous = { x: 0, y: 0 };
  private lastSwingAt = -Infinity;
  private key = '';
  private launchAt = Infinity;
  private waveStartedAt = 0;
  private waveAt = 0;
  private live = false;
  private lockedWaves = false;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(
    private slash: (option: number) => void,
    private positioned: (positions: FruitPosition[]) => void,
    private playSound: (kind: GameSound) => void,
    private ready: () => void,
  ) {
    super('fruit-duel');
  }
  create() {
    for (let kind = 0; kind < FRUIT_OPTIONS; kind++) {
      const texture = this.textures.createCanvas(`duel-fruit-${kind}`, 256, 256)!;
      if (kind < 3) paintFruit(texture.context, kind);
      else paintPlum(texture.context);
      texture.refresh();
    }
    this.bgTexture = this.textures.createCanvas(
      'duel-orchard',
      this.scale.width,
      this.scale.height,
    )!;
    this.background = this.add.image(0, 0, 'duel-orchard').setOrigin(0).setDepth(-20);
    this.blade = this.add.graphics().setDepth(30);
    this.input.on('pointerdown', this.pointerDown, this);
    this.input.on('pointermove', this.pointerMove, this);
    this.input.on('pointerup', () => (this.pressed = false));
    this.input.on('pointerupoutside', () => (this.pressed = false));
    this.input.keyboard?.on('keydown', this.keyDown, this);
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.input.keyboard?.off('keydown', this.keyDown, this);
    });
    this.layout();
    this.ready();
  }
  private layout() {
    const w = this.scale.width,
      h = this.scale.height;
    this.bgTexture!.setSize(w, h);
    paintOrchard(this.bgTexture!.context, w, h);
    this.bgTexture!.refresh();
    this.background!.setDisplaySize(w, h);
    this.clearFruits();
    this.waveAt = 0;
  }
  question(key: string, launchAt: number) {
    if (key === this.key) return;
    this.key = key;
    this.lockedWaves = false;
    this.launchAt = launchAt;
    this.waveAt = launchAt;
    this.clearFruits();
  }
  setLive(live: boolean) {
    this.live = live;
  }
  clear() {
    this.key = '';
    this.launchAt = Infinity;
    this.live = false;
    this.clearFruits();
  }
  private pointerDown(pointer: Phaser.Input.Pointer) {
    this.pressed = true;
    this.previous = { x: pointer.x, y: pointer.y };
    this.trail = [{ ...this.previous, time: Date.now() }];
    this.swing();
    this.hit(pointer.x, pointer.y, pointer.x, pointer.y);
  }
  private pointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.pressed || !pointer.isDown) return;
    if (Math.hypot(pointer.x - this.previous.x, pointer.y - this.previous.y) > 18) this.swing();
    this.trail.push({ x: pointer.x, y: pointer.y, time: Date.now() });
    this.hit(this.previous.x, this.previous.y, pointer.x, pointer.y);
    this.previous = { x: pointer.x, y: pointer.y };
  }
  private keyDown(event: KeyboardEvent) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return;
    const option = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(event.code);
    if (option < 0 || !this.live) return;
    event.preventDefault();
    this.swing();
    this.send(option);
  }
  private swing() {
    const now = Date.now();
    if (now - this.lastSwingAt < 140 || !this.live) return;
    this.lastSwingAt = now;
    this.playSound('swing');
  }
  private hit(ax: number, ay: number, bx: number, by: number) {
    if (!this.live) return;
    const hits = this.fruits
      .filter((f) => !f.exited && !f.gone && f.y < this.scale.height - 25)
      .flatMap((fruit) => {
        const contact = segmentCircle(ax, ay, bx, by, fruit.x, fruit.y, fruit.radius * 0.92);
        return contact === null ? [] : [{ fruit, contact }];
      })
      .sort((a, b) => a.contact - b.contact);
    if (hits[0]) this.send(hits[0].fruit.option);
  }
  /** Report one slash and stop accepting more until the referee answers. */
  private send(option: number) {
    this.live = false;
    this.playSound('slice');
    this.slash(option);
  }
  private spawn(now: number) {
    this.waveStartedAt = now;
    const w = this.scale.width,
      h = this.scale.height;
    // Four fruits share the width, so each is a little smaller than in the one-player game.
    const radius = Math.min(w < 600 ? 38 : 64, w * 0.09);
    this.fruits = lanes.map((lane, option) => ({
      option,
      sprite: this.add
        .image(0, h + 120, `duel-fruit-${option}`)
        .setDisplaySize(radius * 2.55, radius * 2.55)
        .setDepth(5),
      delay: option * 0.1,
      radius,
      lane,
      x: w * lane,
      y: h + 120,
      exited: false,
      gone: false,
    }));
  }
  private clearFruits() {
    this.fruits.forEach((fruit) => fruit.sprite.destroy());
    this.fruits = [];
    this.positioned([]);
  }
  resolve(option: number | null, label: string, good: boolean) {
    const fruit = this.fruits.find((f) => f.option === option && !f.gone);
    const x = fruit?.x ?? this.scale.width / 2,
      y = fruit?.y ?? this.scale.height * 0.6;
    if (fruit) this.split(fruit);
    this.float(x, y, label, good);
    this.live = false;
    this.launchAt = Infinity;
    this.clearFruits();
  }
  miss(option: number) {
    const fruit = this.fruits.find((f) => f.option === option && !f.gone);
    if (!fruit) return;
    this.split(fruit);
    fruit.gone = true;
    fruit.sprite.setVisible(false);
    this.float(fruit.x, fruit.y, '−2', false);
    // Locked out: the remaining fruits (and later waves) fade, they are only for the opponent now.
    this.lockedWaves = true;
  }
  private float(x: number, y: number, text: string, good: boolean) {
    const label = this.add
      .text(x, Math.min(y - 70, this.scale.height * 0.65), text, {
        fontFamily: '"Be Vietnam Pro", sans-serif',
        fontSize: this.scale.width < 600 ? '30px' : '44px',
        fontStyle: 'bold',
        color: good ? '#ffdc84' : '#ffb3a1',
        stroke: '#183b35',
        strokeThickness: 5,
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({
      targets: label,
      y: label.y - 65,
      alpha: 0,
      duration: 1100,
      onComplete: () => label.destroy(),
    });
  }
  private split(fruit: Flying) {
    const color = colors[fruit.option];
    const splash = this.add.ellipse(fruit.x, fruit.y, 20, 15, color, 0.7).setDepth(7);
    this.tweens.add({
      targets: splash,
      scaleX: 6,
      scaleY: 4,
      alpha: 0,
      duration: 550,
      onComplete: () => splash.destroy(),
    });
    for (const side of [-1, 1]) {
      const half = this.add
        .image(fruit.x, fruit.y, `duel-fruit-${fruit.option}`)
        .setDisplaySize(fruit.radius * 2.55, fruit.radius * 2.55)
        .setCrop(side < 0 ? 0 : 128, 0, 128, 256)
        .setDepth(8);
      this.tweens.add({
        targets: half,
        x: half.x + side * 110,
        y: half.y + 150,
        angle: side * 100,
        alpha: 0,
        duration: 850,
        ease: 'Cubic.In',
        onComplete: () => half.destroy(),
      });
    }
    if (this.reducedMotion) return;
    for (let i = 0; i < 15; i++) {
      const particle = this.add
        .circle(fruit.x, fruit.y, 2 + (i % 4), i % 4 ? color : 0xffedb2)
        .setDepth(10);
      const angle = (i * Math.PI * 2) / 15;
      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * (65 + i * 4),
        y: particle.y + Math.sin(angle) * 80 + 40,
        alpha: 0,
        scale: 0,
        duration: 600 + i * 15,
        onComplete: () => particle.destroy(),
      });
    }
  }
  update() {
    const now = Date.now(),
      w = this.scale.width,
      h = this.scale.height;
    this.trail = this.trail.filter((point) => now - point.time < 180).slice(-14);
    this.blade?.clear();
    this.trail.forEach((point, i) => {
      if (!i) return;
      const previous = this.trail[i - 1],
        alpha = i / this.trail.length;
      this.blade!.lineStyle(13 * alpha, 0x9ef2e8, alpha * 0.16).lineBetween(
        previous.x,
        previous.y,
        point.x,
        point.y,
      );
      this.blade!.lineStyle(4 * alpha, 0xfff8d6, alpha).lineBetween(
        previous.x,
        previous.y,
        point.x,
        point.y,
      );
    });
    if (now < this.launchAt) return;
    if (!this.fruits.length && now >= this.waveAt) this.spawn(now);
    const gravity = h * 0.68,
      launch = Math.sqrt(2 * gravity * (h * 0.52));
    this.fruits.forEach((fruit) => {
      const t = (now - this.waveStartedAt) / 1000 - fruit.delay;
      if (t < 0) return;
      fruit.x = w * fruit.lane + Math.sin(t * 1.4 + fruit.option) * Math.min(16, w * 0.018);
      fruit.y = h + fruit.radius - launch * t + (gravity * t * t) / 2;
      fruit.sprite
        .setPosition(fruit.x, fruit.y)
        .setAngle(Math.sin(t * 1.5) * (fruit.option - 1.5) * 16);
      if (t > 1 && fruit.y > h + fruit.radius * 2) fruit.exited = true;
    });
    this.positioned(
      this.fruits.map((fruit) => ({
        option: fruit.option,
        x: (fruit.x / w) * 100,
        y: ((fruit.y + fruit.radius * 1.14) / h) * 100,
        visible:
          !fruit.gone &&
          !fruit.exited &&
          (now - this.waveStartedAt) / 1000 > fruit.delay &&
          fruit.y < h * 0.88 &&
          fruit.y > h * 0.35,
      })),
    );
    if (this.fruits.length && this.fruits.every((f) => f.exited || f.gone)) {
      this.clearFruits();
      this.waveAt = now + 150;
    }
    if (this.lockedWaves) this.fruits.forEach((f) => f.sprite.setAlpha(0.35));
  }
}

export function createFruitDuel(
  parent: HTMLElement,
  slash: (option: number) => void,
  positioned: (positions: FruitPosition[]) => void,
  sound: (kind: GameSound) => void,
  ready: () => void,
): FruitDuelHandle {
  const scene = new FruitDuelScene(slash, positioned, sound, ready);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: '#173c40',
    scale: { mode: Phaser.Scale.RESIZE },
    scene: [scene],
    render: { antialias: true, roundPixels: false },
    audio: { noAudio: true },
    banner: false,
  });
  return {
    question: (key, at) => scene.question(key, at),
    setLive: (live) => scene.setLive(live),
    resolve: (option, label, good) => scene.resolve(option, label, good),
    miss: (option) => scene.miss(option),
    clear: () => scene.clear(),
    destroy: () => game.destroy(true),
  };
}
