import Phaser from 'phaser';
import {
  findPair,
  findPath,
  knownExtraWord,
  makeTiles,
  matches,
  matchingWord,
  playableShuffle,
  reconcileCharacters,
  shuffle,
  type Tile,
} from './rules';
import type { Difficulty, MatchMode, Word } from './vocabulary';
import {
  getBoardLayout,
  routePoint,
  STEP_X,
  STEP_Y,
  type BoardLayout,
  type PairCount,
} from './layout';

const DEFAULT_MESSAGE = 'Chọn hai ô tương ứng. Đường nối được rẽ tối đa hai lần.';

export type GardenState = {
  tiles: Tile[];
  selected: number | null;
  score: number;
  matched: number;
  mistakes: number;
  combo: number;
  locked: boolean;
  message: string;
  latest: Word | null;
  hints: number[];
  hintsLeft: number;
  assistsLeft: number;
  total: number;
};
export type GardenHandle = {
  select(index: number): void;
  hint(): void;
  pinyin(): void;
  assist(): void;
  shuffle(): void;
  pause(value: boolean): void;
  resize(mobile: boolean): void;
  restart(config: GardenConfig, animate: boolean): void;
  destroy(): void;
};
export type GardenConfig = {
  words: Word[];
  mode: MatchMode;
  difficulty: Difficulty;
  reducedMotion: boolean;
  mobile: boolean;
  pairs: PairCount;
};

class GardenScene extends Phaser.Scene {
  private tiles!: Tile[];
  private layout!: BoardLayout;
  private pieces: Phaser.GameObjects.Container[] = [];
  private faces: Phaser.GameObjects.Graphics[] = [];
  private selected: number | null = null;
  private locked = false;
  private paused = false;
  private score = 0;
  private matched = 0;
  private mistakes = 0;
  private combo = 0;
  private latest: Word | null = null;
  private message = DEFAULT_MESSAGE;
  private route?: Phaser.GameObjects.Graphics;
  private hintIndices: number[] = [];
  private hintsLeft = 3;
  private assistsLeft = 1;
  private total!: number;
  private transitionTimers = new Set<ReturnType<typeof setTimeout>>();
  constructor(
    private config: GardenConfig,
    private changed: (state: GardenState) => void,
    private onReady: () => void,
  ) {
    super('word-garden');
    this.deal(config);
  }
  /** Pick the words for a round and lay them out as a board that always has a move. */
  private deal(config: GardenConfig) {
    this.total = Math.min(config.pairs, config.words.length);
    this.layout = getBoardLayout(config.mobile, this.total);
    this.tiles = playableShuffle(
      makeTiles(shuffle(config.words).slice(0, this.total), config.mode),
      config.mode,
      this.layout.cols,
      config.difficulty === 'hard',
    );
  }
  /**
   * New board on the same canvas. Changing options while the intro dialog is open must not tear the
   * game down and show the loading screen again (that flashed the dialog); tiles only animate in
   * when the player asks for a new round.
   */
  restart(config: GardenConfig, animate: boolean) {
    this.transitionTimers.forEach((timer) => clearTimeout(timer));
    this.transitionTimers.clear();
    this.config = config;
    this.deal(config);
    this.selected = null;
    this.locked = false;
    this.score = 0;
    this.matched = 0;
    this.mistakes = 0;
    this.combo = 0;
    this.latest = null;
    this.message = DEFAULT_MESSAGE;
    this.hintIndices = [];
    this.hintsLeft = 3;
    this.assistsLeft = 1;
    this.tweens.killAll();
    this.children.removeAll(true);
    this.pieces = [];
    this.faces = [];
    this.scale.setGameSize(this.layout.width, this.layout.height);
    this.drawGarden();
    this.route = this.add.graphics().setDepth(12);
    this.drawTiles(animate);
    this.publish();
  }
  create() {
    this.events.once('shutdown', () => {
      this.transitionTimers.forEach((timer) => clearTimeout(timer));
      this.transitionTimers.clear();
    });
    this.drawGarden();
    this.route = this.add.graphics().setDepth(12);
    this.drawTiles();
    this.onReady();
    this.publish();
  }
  private center(i: number) {
    return {
      x: this.layout.centerX + (i % this.layout.cols) * STEP_X,
      y: this.layout.centerY + Math.floor(i / this.layout.cols) * STEP_Y,
    };
  }
  private drawGarden() {
    const { width: W, height: H } = this.layout;
    const g = this.add.graphics();
    g.fillStyle(0x193f3b).fillRoundedRect(18, 18, W - 36, H - 28, 38);
    g.fillStyle(0x487d67).fillRoundedRect(18, 12, W - 36, H - 36, 38);
    g.lineStyle(2, 0x91b798, 0.6).strokeRoundedRect(27, 21, W - 54, H - 54, 31);
    g.fillStyle(0x285b50).fillRoundedRect(40, 40, W - 80, H - 80, 24);
    // Corner leaves, pond ripples and fireflies are engine objects, independent of reading surfaces.
    for (const [x, y, sign] of [
      [20, 25, 1],
      [W - 20, H - 40, -1],
      [W - 20, 25, -1],
      [20, H - 40, 1],
    ]) {
      for (let j = 0; j < 4; j++) {
        this.add
          .ellipse(x + sign * j * 14, y + (j % 2 ? 9 : -7), 45, 18, j % 2 ? 0x8cb787 : 0x628e69)
          .setAngle(sign * (j % 2 ? 35 : -25))
          .setDepth(15);
      }
    }
    for (let i = 0; i < 14; i++) {
      const dot = this.add.circle(42 + (i * (W - 84)) / 14, i % 2 ? H - 48 : 34, 2, 0xffe29b, 0.7);
      if (!this.config.reducedMotion)
        this.tweens.add({
          targets: dot,
          alpha: 0.15,
          y: dot.y - 8,
          duration: 1600 + i * 90,
          yoyo: true,
          repeat: -1,
        });
    }
    this.add
      .text(W / 2, H - 46, '✦   一点一滴，每天进步   ✦', {
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: '16px',
        color: '#d8e5ce',
        letterSpacing: 4,
      })
      .setOrigin(0.5);
  }
  private drawTiles(animate = true) {
    this.pieces.forEach((piece) => piece.destroy());
    this.pieces = [];
    this.faces = [];
    this.tiles.forEach((tile, index) => {
      const { x, y } = this.center(index);
      const face = this.add.graphics();
      // Tile text is rendered by the DOM at native display resolution.
      const piece = this.add.container(x, y, [face]).setVisible(!tile.removed);
      this.pieces.push(piece);
      this.faces.push(face);
      this.paint(index);
      if (animate && !this.config.reducedMotion && !tile.removed) {
        piece.setAlpha(0).setY(y + 12);
        this.tweens.add({
          targets: piece,
          y,
          alpha: 1,
          duration: 240,
          delay: index * 12,
          ease: 'Cubic.Out',
        });
      }
    });
  }
  private paint(index: number, error = false) {
    const selected = this.selected === index,
      hint = this.hintIndices.includes(index);
    const g = this.faces[index];
    g.clear();
    g.fillStyle(0x113b32, 0.65).fillRoundedRect(-62, -48, 124, 108, 14);
    g.fillStyle(selected ? 0xd6ad54 : error ? 0xba7972 : 0xc8c7a9).fillRoundedRect(
      -62,
      -54,
      124,
      108,
      14,
    );
    g.fillStyle(selected ? 0xffe4a0 : error ? 0xffe2d9 : 0xfff8e7).fillRoundedRect(
      -62,
      -54,
      124,
      100,
      14,
    );
    g.lineStyle(
      selected || hint ? 4 : 1,
      error ? 0xac554c : selected ? 0xf3c05c : hint ? 0xffdc87 : 0xffeac1,
      1,
    ).strokeRoundedRect(-58, -50, 116, 92, 11);
    g.lineStyle(1, 0xffffff, 0.6).lineBetween(-45, -43, 45, -43);
  }
  select(index: number, assisted = false) {
    if (this.paused || this.locked || this.tiles[index]?.removed) return;
    this.hintIndices.forEach((i) => {
      this.hintIndices = [];
      this.paint(i);
    });
    if (this.selected === index) {
      this.selected = null;
      this.paint(index);
      this.publish();
      return;
    }
    if (this.selected === null) {
      this.selected = index;
      this.paint(index);
      this.publish();
      return;
    }
    const a = this.selected,
      b = index;
    const path =
      matches(
        this.tiles[a],
        this.tiles[b],
        this.config.mode,
        this.tiles,
        this.config.difficulty === 'hard',
      ) && findPath(this.tiles, a, b, this.layout.cols);
    this.locked = true;
    const extra =
      !path &&
      knownExtraWord(
        this.tiles[a],
        this.tiles[b],
        this.config.mode,
        this.config.difficulty === 'hard',
      );
    if (extra) {
      // Correct Chinese that this board does not ask for: explain, keep score and combo.
      this.message = `${extra.hanzi} · ${extra.pinyin} · ${extra.meaning} là từ đúng, nhưng chưa có trong bàn này. Thử ghép từ khác nhé!`;
      this.selected = null;
      this.locked = false;
      this.paint(a);
      this.paint(b);
      this.publish();
      return;
    }
    if (!path) {
      this.mistakes++;
      this.combo = 0;
      this.score = Math.max(0, this.score - 2);
      this.message =
        this.config.mode === 'characters' &&
        this.config.difficulty === 'hard' &&
        matchingWord(this.tiles[b], this.tiles[a], this.tiles)
          ? 'Chọn chữ đầu trước, rồi chọn chữ sau nhé.'
          : 'Chưa nối được. Chọn đúng cặp và kiểm tra đường đi nhé.';
      this.paint(a, true);
      this.paint(b, true);
      this.publish();
      this.after(450, () => {
        this.selected = null;
        this.locked = false;
        this.paint(a);
        this.paint(b);
        this.publish();
      });
      return;
    }
    if (this.config.mode === 'characters')
      reconcileCharacters(this.tiles, a, b, this.config.difficulty === 'hard');
    if (!assisted) this.combo++;
    this.score += assisted ? 0 : 10;
    this.matched++;
    this.latest = this.tiles[a].word;
    this.message = `${assisted ? 'Nối giúp, không cộng điểm.' : 'Chính xác!'} ${this.latest.hanzi} · ${this.latest.pinyin} · ${this.latest.meaning}`;
    const route = this.route!;
    route.clear().lineStyle(12, 0xfbd77d, 0.18).beginPath();
    path.forEach((p, i) => {
      const { x, y } = routePoint(this.layout, p);
      if (!i) route.moveTo(x, y);
      else route.lineTo(x, y);
    });
    route.strokePath();
    route.lineStyle(4, 0xffe5a0, 1).strokePath();
    for (const i of [a, b]) {
      this.paint(i);
      if (!this.config.reducedMotion) {
        this.tweens.add({
          targets: this.pieces[i],
          scale: 1.07,
          alpha: 0,
          duration: 330,
          ease: 'Back.In',
        });
        const { x, y } = this.center(i);
        for (let j = 0; j < 9; j++) {
          const particle = this.add
            .circle(x, y, j % 2 ? 3 : 5, j % 2 ? 0xffdf89 : 0xbad9a3)
            .setDepth(20);
          this.tweens.add({
            targets: particle,
            x: x + Math.cos(j * 0.7) * 90,
            y: y + Math.sin(j * 0.7) * 75,
            alpha: 0,
            scale: 0,
            duration: 600,
            onComplete: () => particle.destroy(),
          });
        }
      }
    }
    this.publish();
    this.after(this.config.reducedMotion ? 100 : 400, () => {
      [a, b].forEach((i) => {
        this.tiles[i].removed = true;
        this.pieces[i].setVisible(false);
      });
      if (route.active) route.clear();
      this.selected = null;
      this.locked = false;
      if (
        this.matched < this.total &&
        !findPair(this.tiles, this.config.mode, this.layout.cols, this.config.difficulty === 'hard')
      )
        this.rearrange('Hết đường nối. Bàn đã tự đảo để bạn chơi tiếp.');
      this.publish();
    });
  }
  hint() {
    if (this.locked || this.paused || this.hintsLeft === 0) return;
    if (this.selected !== null) {
      const old = this.selected;
      this.selected = null;
      this.paint(old);
    }
    const pair = findPair(
      this.tiles,
      this.config.mode,
      this.layout.cols,
      this.config.difficulty === 'hard',
    );
    if (!pair) return;
    this.hintsLeft--;
    this.hintIndices = pair;
    pair.forEach((i) => this.paint(i));
    this.score = Math.max(0, this.score - 3);
    this.message = 'Hai ô có viền vàng nối được với nhau. Gợi ý: −3 điểm.';
    this.publish();
  }
  pinyin() {
    if (this.locked || this.paused) return;
    const pair = findPair(
      this.tiles,
      this.config.mode,
      this.layout.cols,
      this.config.difficulty === 'hard',
    );
    if (!pair) return;
    const [a, b] = pair;
    const word =
      this.config.mode === 'characters'
        ? matchingWord(this.tiles[a], this.tiles[b], this.tiles, this.config.difficulty === 'hard')!
        : this.tiles[a].word;
    this.message = `Pinyin của một cặp nối được: ${word.pinyin}. Hãy tìm từ tương ứng!`;
    this.publish();
  }
  assist() {
    if (this.locked || this.paused || this.assistsLeft === 0) return;
    const pair = findPair(
      this.tiles,
      this.config.mode,
      this.layout.cols,
      this.config.difficulty === 'hard',
    );
    if (!pair) return;
    this.assistsLeft--;
    if (this.selected !== null) {
      const old = this.selected;
      this.selected = null;
      this.paint(old);
    }
    this.select(pair[0]);
    this.select(pair[1], true);
  }
  private after(ms: number, callback: () => void) {
    // Engine frames are throttled in background tabs; input must unlock on wall time.
    const timer = setTimeout(() => {
      this.transitionTimers.delete(timer);
      callback();
    }, ms);
    this.transitionTimers.add(timer);
  }
  rearrange(message = 'Bàn đã đảo. Thử một góc nhìn mới nhé!') {
    if (this.locked || this.paused) return;
    this.selected = null;
    this.hintIndices = [];
    this.tiles = playableShuffle(
      this.tiles,
      this.config.mode,
      this.layout.cols,
      this.config.difficulty === 'hard',
    );
    this.drawTiles();
    this.message = message;
    this.publish();
  }
  pause(value: boolean) {
    this.paused = value;
    if (
      !value &&
      !this.locked &&
      this.matched < this.total &&
      !findPair(this.tiles, this.config.mode, this.layout.cols, this.config.difficulty === 'hard')
    ) {
      this.rearrange('Đã điều chỉnh đường nối. Tiếp tục khám phá nhé!');
      return;
    }
    this.publish();
  }
  resize(mobile: boolean) {
    if (this.config.mobile === mobile) return;
    this.config.mobile = mobile;
    this.layout = getBoardLayout(mobile, this.total);
    this.tweens.killAll();
    this.children.removeAll(true);
    this.scale.setGameSize(this.layout.width, this.layout.height);
    this.drawGarden();
    this.route = this.add.graphics().setDepth(12);
    this.drawTiles();
    if (
      !findPair(
        this.tiles,
        this.config.mode,
        this.layout.cols,
        this.config.difficulty === 'hard',
      ) &&
      this.matched < this.total &&
      !this.locked
    )
      this.rearrange('Đã điều chỉnh bàn chơi cho màn hình của bạn.');
    this.publish();
  }
  private publish() {
    this.changed({
      tiles: this.tiles.map((t) => ({ ...t })),
      selected: this.selected,
      score: this.score,
      matched: this.matched,
      mistakes: this.mistakes,
      combo: this.combo,
      locked: this.locked || this.paused,
      message: this.message,
      latest: this.latest,
      hints: [...this.hintIndices],
      hintsLeft: this.hintsLeft,
      assistsLeft: this.assistsLeft,
      total: this.total,
    });
  }
}

export function createGarden(
  parent: HTMLElement,
  config: GardenConfig,
  changed: (state: GardenState) => void,
  ready: () => void,
): GardenHandle {
  const scene = new GardenScene(config, changed, ready);
  const { width: W, height: H } = getBoardLayout(
    config.mobile,
    Math.min(config.pairs, config.words.length),
  );
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    transparent: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [scene],
    render: { antialias: true, roundPixels: true },
    audio: { noAudio: true },
    banner: false,
  });
  return {
    select: (i) => scene.select(i),
    hint: () => scene.hint(),
    pinyin: () => scene.pinyin(),
    assist: () => scene.assist(),
    shuffle: () => scene.rearrange(),
    pause: (value) => scene.pause(value),
    resize: (mobile) => scene.resize(mobile),
    restart: (config, animate) => scene.restart(config, animate),
    destroy: () => game.destroy(true),
  };
}
