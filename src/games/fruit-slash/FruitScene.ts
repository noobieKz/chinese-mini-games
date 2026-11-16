import Phaser from 'phaser';
import { fruitColors, paintFruit, paintOrchard } from './art';
import { makeFruitQuestions, type FruitConfig } from './questions';
import { FruitRound, segmentCircle, type FruitResult, type FruitView } from './round';
import type { GameSound } from '../../audio/GameAudio';

export type FruitPosition = { option: number; x: number; y: number; visible: boolean };
export type FruitHandle = {
  start(config: FruitConfig): void;
  choose(questionId: string, option: number): void;
  pause(paused: boolean): void;
  finish(): void;
  preview(): void;
  destroy(): void;
};
type FlyingFruit = {
  option: number;
  sprite: Phaser.GameObjects.Image;
  age: number;
  delay: number;
  radius: number;
  lane: number;
  x: number;
  y: number;
  exited: boolean;
};

class FruitScene extends Phaser.Scene {
  private round: FruitRound | null = null;
  private fruits: FlyingFruit[] = [];
  private background?: Phaser.GameObjects.Image;
  private bgTexture?: Phaser.Textures.CanvasTexture;
  private ambient: Phaser.GameObjects.Container[] = [];
  private blade?: Phaser.GameObjects.Graphics;
  private trail: { x: number; y: number; time: number }[] = [];
  private strokeQuestion = -1;
  private pressed = false;
  private previous = { x: 0, y: 0 };
  private lastSwingAt = -Infinity;
  private waveAt = 0;
  private waveStartedAt = 0;
  private pausedAt: number | null = null;
  private lastPublish = 0;
  private paused = false;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(
    private changed: (view: FruitView) => void,
    private positioned: (positions: FruitPosition[]) => void,
    private playSound: (kind: GameSound) => void,
    private ready: () => void,
  ) {
    super('fruit-slash');
  }
  create() {
    for (let kind = 0; kind < 3; kind++) {
      const texture = this.textures.createCanvas(`fruit-${kind}`, 256, 256)!;
      paintFruit(texture.context, kind);
      texture.refresh();
    }
    this.bgTexture = this.textures.createCanvas('orchard', this.scale.width, this.scale.height)!;
    this.background = this.add.image(0, 0, 'orchard').setOrigin(0).setDepth(-20);
    this.blade = this.add.graphics().setDepth(30);
    for (let i = 0; i < 18; i++) {
      const dot = this.add
        .circle(
          Math.random() * this.scale.width,
          Math.random() * this.scale.height * 0.85,
          i % 3 ? 1 : 2,
          0xffe4a6,
          0.4,
        )
        .setDepth(-10);
      if (!this.reducedMotion)
        this.tweens.add({
          targets: dot,
          y: dot.y - 35,
          alpha: 0.05,
          duration: 2200 + i * 190,
          yoyo: true,
          repeat: -1,
        });
    }
    this.input.on('pointerdown', this.pointerDown, this);
    this.input.on('pointermove', this.pointerMove, this);
    this.input.on('pointerup', this.pointerUp, this);
    this.input.on('pointerupoutside', this.pointerUp, this);
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
    this.ambient.forEach((object) => {
      this.tweens.killTweensOf(object);
      object.destroy();
    });
    this.ambient = [];
    for (let i = 0; i < 3; i++) {
      const fruit = this.add
        .image(0, 0, `fruit-${i}`)
        .setDisplaySize(w < 600 ? 88 : 132, w < 600 ? 88 : 132)
        .setAngle((i - 1) * 18);
      const ring = this.add.ellipse(0, 40, 110, 22, 0xffe09b, 0.06);
      const container = this.add
        .container(w * [0.16, 0.83, 0.66][i], h * [0.54, 0.62, 0.81][i], [ring, fruit])
        .setDepth(-3)
        .setAlpha(i === 2 ? 0.65 : 1);
      this.ambient.push(container);
      if (!this.reducedMotion)
        this.tweens.add({
          targets: container,
          y: container.y - 18,
          angle: i % 2 ? 7 : -7,
          duration: 2500 + i * 400,
          yoyo: true,
          repeat: -1,
        });
    }
    this.ambient.forEach((object) =>
      object.setVisible(!this.round || this.round.phase === 'ready'),
    );
    this.clearFruits();
    this.waveAt = 0;
    this.trail = [];
  }
  start(config: FruitConfig) {
    this.clearFruits();
    this.round = new FruitRound(makeFruitQuestions(config.bank), config.seconds);
    this.paused = false;
    this.pausedAt = null;
    this.pressed = false;
    this.waveAt = 0;
    this.trail = [];
    this.ambient.forEach((object) => object.setVisible(false));
    this.round.start(performance.now());
    this.emit(true);
  }
  preview() {
    this.round = null;
    this.paused = false;
    this.clearFruits();
    this.ambient.forEach((object) => object.setVisible(true));
    this.emit(true);
  }
  pause(paused: boolean) {
    const now = performance.now();
    if (paused && !this.paused) this.pausedAt = now;
    if (!paused && this.paused && this.pausedAt !== null) {
      const elapsed = now - this.pausedAt;
      this.waveStartedAt += elapsed;
      if (this.waveAt > 0) this.waveAt += elapsed;
      this.pausedAt = null;
    }
    this.paused = paused;
    this.round?.pause(paused, performance.now());
    this.pressed = false;
    this.trail = [];
    this.emit(true);
  }
  finish() {
    this.round?.finish();
    this.clearFruits();
    this.emit(true);
  }
  private pointerDown(pointer: Phaser.Input.Pointer) {
    if (this.paused || this.round?.phase !== 'playing') return;
    this.pressed = true;
    this.strokeQuestion = this.round.index;
    this.previous = { x: pointer.x, y: pointer.y };
    this.trail = [{ ...this.previous, time: performance.now() }];
    this.swing();
    this.hit(pointer.x, pointer.y, pointer.x, pointer.y);
  }
  private pointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.pressed || !pointer.isDown || this.paused) return;
    const now = performance.now();
    if (Math.hypot(pointer.x - this.previous.x, pointer.y - this.previous.y) > 18) this.swing();
    this.trail.push({ x: pointer.x, y: pointer.y, time: now });
    if (this.round?.index === this.strokeQuestion)
      this.hit(this.previous.x, this.previous.y, pointer.x, pointer.y);
    this.previous = { x: pointer.x, y: pointer.y };
  }
  private pointerUp() {
    this.pressed = false;
  }
  private keyDown(event: KeyboardEvent) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || this.paused) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return;
    const option = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
    if (option >= 0 && this.round?.phase === 'playing') {
      event.preventDefault();
      if (this.round.accepting(performance.now())) this.swing();
      this.choose(this.round.questions[this.round.index].id, option);
    }
  }
  private swing() {
    const now = performance.now();
    if (now - this.lastSwingAt < 140 || !this.round?.accepting(now)) return;
    this.lastSwingAt = now;
    this.playSound('swing');
  }
  private hit(ax: number, ay: number, bx: number, by: number) {
    if (!this.round || this.round.phase !== 'playing') return;
    const hits = this.fruits
      .filter(
        (fruit) => !fruit.exited && fruit.age >= fruit.delay && fruit.y < this.scale.height - 25,
      )
      .flatMap((fruit) => {
        const contact = segmentCircle(ax, ay, bx, by, fruit.x, fruit.y, fruit.radius * 0.92);
        return contact === null ? [] : [{ fruit, contact }];
      })
      .sort((a, b) => a.contact - b.contact);
    if (hits[0]) this.choose(this.round.questions[this.round.index].id, hits[0].fruit.option);
  }
  choose(questionId: string, option: number) {
    if (!this.round || this.paused) return;
    const result = this.round.answer(questionId, option, performance.now());
    if (!result) return;
    this.presentResult(result);
    this.emit(true);
  }
  private spawn() {
    this.waveStartedAt = performance.now();
    const w = this.scale.width,
      h = this.scale.height;
    const radius = Math.min(w < 600 ? 45 : 72, w * 0.115);
    this.fruits = [0, 1, 2].map((option) => ({
      option,
      sprite: this.add
        .image(0, h + 120, `fruit-${option}`)
        .setDisplaySize(radius * 2.55, radius * 2.55)
        .setDepth(5),
      age: 0,
      delay: option * 0.12,
      radius,
      lane: [0.2, 0.5, 0.8][option],
      x: w * [0.2, 0.5, 0.8][option],
      y: h + 120,
      exited: false,
    }));
  }
  private clearFruits() {
    this.fruits.forEach((fruit) => fruit.sprite.destroy());
    this.fruits = [];
    this.positioned([]);
  }
  private presentResult(result: FruitResult) {
    const fruit = this.fruits.find((item) => item.option === result.picked);
    const x = fruit?.x ?? this.scale.width / 2,
      y = fruit?.y ?? this.scale.height * 0.6;
    if (fruit) this.split(fruit);
    if (result.picked !== null) this.playSound('slice');
    this.playSound(result.correct ? 'correct' : 'wrong');
    const label = this.add
      .text(
        x,
        Math.min(y - 70, this.scale.height * 0.65),
        result.correct ? `+${result.points}` : result.picked === null ? 'Hết giờ' : '−2',
        {
          fontFamily: '"Be Vietnam Pro", sans-serif',
          fontSize: this.scale.width < 600 ? '36px' : '52px',
          fontStyle: 'bold',
          color: result.correct ? '#ffdc84' : '#ffb3a1',
          stroke: '#183b35',
          strokeThickness: 5,
          resolution: 2,
        },
      )
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({
      targets: label,
      y: label.y - 65,
      alpha: 0,
      duration: 1100,
      onComplete: () => label.destroy(),
    });
    this.clearFruits();
  }
  private split(fruit: FlyingFruit) {
    const color = fruitColors[fruit.option];
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
        .image(fruit.x, fruit.y, `fruit-${fruit.option}`)
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
  update(_time: number, _delta: number) {
    const now = performance.now(),
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
    if (!this.round || this.paused) return;
    const before = `${this.round.phase}:${this.round.index}`;
    const result = this.round.tick(now);
    if (result) this.presentResult(result);
    if (before !== `${this.round.phase}:${this.round.index}`) {
      this.clearFruits();
      this.waveAt = 0;
      this.pressed = false;
      if (this.round.phase === 'finished' && !this.reducedMotion) {
        for (let i = 0; i < 45; i++) {
          const confetti = this.add
            .rectangle(Math.random() * w, -20, 5, 12, fruitColors[i % 3])
            .setDepth(20);
          this.tweens.add({
            targets: confetti,
            y: h + 40,
            angle: 300,
            duration: 1700 + i * 20,
            delay: i * 12,
            onComplete: () => confetti.destroy(),
          });
        }
      }
      this.emit(true);
    }
    if (this.round.phase === 'playing') {
      if (!this.fruits.length && now >= this.waveAt) this.spawn();
      const gravity = h * 0.68,
        launch = Math.sqrt(2 * gravity * (h * 0.52));
      this.fruits.forEach((fruit) => {
        fruit.age = (now - this.waveStartedAt) / 1000;
        const t = fruit.age - fruit.delay;
        if (t < 0) return;
        fruit.x = w * fruit.lane + Math.sin(t * 1.4 + fruit.option) * Math.min(22, w * 0.025);
        fruit.y = h + fruit.radius - launch * t + (gravity * t * t) / 2;
        fruit.sprite
          .setPosition(fruit.x, fruit.y)
          .setAngle(Math.sin(t * 1.5) * (fruit.option - 1) * 20);
        if (t > 1 && fruit.y > h + fruit.radius * 2) fruit.exited = true;
      });
      this.positioned(
        this.fruits.map((fruit) => ({
          option: fruit.option,
          x: (fruit.x / w) * 100,
          y: ((fruit.y + fruit.radius * 1.14) / h) * 100,
          visible:
            this.round!.accepting(now) &&
            !fruit.exited &&
            fruit.age > fruit.delay &&
            fruit.y < h * 0.88 &&
            fruit.y > h * 0.35,
        })),
      );
      if (this.fruits.length && this.fruits.every((fruit) => fruit.exited)) {
        this.clearFruits();
        this.waveAt = now + 150;
      }
    }
    this.emit();
  }
  private emit(force = false) {
    const now = performance.now();
    if (!force && now - this.lastPublish < 90) return;
    this.lastPublish = now;
    this.changed(this.round?.view(now) ?? new FruitRound([], 15).view(now));
  }
}

export function createFruitArena(
  parent: HTMLElement,
  changed: (view: FruitView) => void,
  positioned: (positions: FruitPosition[]) => void,
  sound: (kind: GameSound) => void,
  ready: () => void,
): FruitHandle {
  const scene = new FruitScene(changed, positioned, sound, ready);
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
    start: (config) => scene.start(config),
    choose: (id, option) => scene.choose(id, option),
    pause: (value) => scene.pause(value),
    finish: () => scene.finish(),
    preview: () => scene.preview(),
    destroy: () => game.destroy(true),
  };
}
