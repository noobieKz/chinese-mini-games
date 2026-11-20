import Phaser from 'phaser';
import type { Cell, Tile } from '../word-garden/rules';
import {
  getBoardLayout,
  routePoint,
  STEP_X,
  STEP_Y,
  type BoardLayout,
} from '../word-garden/layout';

/**
 * Board renderer for the two-player duel. Display only: the Durable Object referee owns the tiles;
 * this scene draws them, the two players' selections and the match/miss effects. Kept separate from
 * the single-player GardenScene on purpose, so duel work never changes the one-player game. The
 * garden look is copied from GardenScene.drawGarden/paint.
 */
export type DuelSceneHandle = {
  setTiles(tiles: Tile[]): void;
  mark(mine: number | null, theirs: number | null): void;
  match(a: number, b: number, path: Cell[], mine: boolean): void;
  miss(a: number, b: number): void;
  destroy(): void;
};

/** Duel boards always use the 4-column layout so phone and desktop players see the same grid. */
export const duelLayout = (total: number) => getBoardLayout(true, total);

const MINE = 0x43856b;
const THEIRS = 0xc2566b;

class DuelScene extends Phaser.Scene {
  private tiles: Tile[] = [];
  private layout: BoardLayout;
  private pieces: Phaser.GameObjects.Container[] = [];
  private faces: Phaser.GameObjects.Graphics[] = [];
  private route?: Phaser.GameObjects.Graphics;
  private mine: number | null = null;
  private theirs: number | null = null;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private created = false;
  private pending: Tile[] | null = null;
  constructor(
    private total: number,
    private onReady: () => void,
  ) {
    super('duel-garden');
    this.layout = duelLayout(total);
  }
  create() {
    this.drawGarden();
    this.route = this.add.graphics().setDepth(12);
    this.created = true;
    if (this.pending) this.setTiles(this.pending);
    this.onReady();
  }
  setTiles(tiles: Tile[]) {
    if (!this.created) {
      this.pending = tiles;
      return;
    }
    const total = tiles.length / 2;
    if (total !== this.total || tiles.length !== this.tiles.length) {
      // New board size (a rematch can change the word count): redraw the garden around it.
      this.total = total;
      this.layout = duelLayout(total);
      this.tweens.killAll();
      this.children.removeAll(true);
      this.pieces = [];
      this.faces = [];
      this.scale.setGameSize(this.layout.width, this.layout.height);
      this.drawGarden();
      this.route = this.add.graphics().setDepth(12);
    }
    this.tiles = tiles.map((t) => ({ ...t }));
    this.drawTiles();
  }
  mark(mine: number | null, theirs: number | null) {
    const changed = new Set([this.mine, this.theirs, mine, theirs]);
    this.mine = mine;
    this.theirs = theirs;
    for (const i of changed) if (i !== null && this.faces[i]) this.paint(i);
  }
  match(a: number, b: number, path: Cell[], mine: boolean) {
    const route = this.route;
    if (route?.active) {
      route
        .clear()
        .lineStyle(12, mine ? 0xfbd77d : 0xf3a6b4, 0.2)
        .beginPath();
      path.forEach((p, i) => {
        const { x, y } = routePoint(this.layout, p);
        if (!i) route.moveTo(x, y);
        else route.lineTo(x, y);
      });
      route.strokePath();
      route.lineStyle(4, mine ? 0xffe5a0 : 0xf6b8c4, 1).strokePath();
      this.time.delayedCall(420, () => route.active && route.clear());
    }
    for (const i of [a, b]) {
      const piece = this.pieces[i];
      if (!piece) continue;
      if (this.reducedMotion) {
        piece.setVisible(false);
        continue;
      }
      this.tweens.add({ targets: piece, scale: 1.07, alpha: 0, duration: 330, ease: 'Back.In' });
      const { x, y } = this.center(i);
      for (let j = 0; j < 9; j++) {
        const particle = this.add
          .circle(
            x,
            y,
            j % 2 ? 3 : 5,
            mine ? (j % 2 ? 0xffdf89 : 0xbad9a3) : j % 2 ? 0xf3a6b4 : 0xf7d6dc,
          )
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
  miss(a: number, b: number) {
    for (const i of [a, b]) if (this.faces[i]) this.paint(i, true);
    this.time.delayedCall(450, () => [a, b].forEach((i) => this.faces[i] && this.paint(i)));
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
    g.fillStyle(0xabbfb0).fillRoundedRect(18, 18, W - 36, H - 28, 38);
    g.fillStyle(0xdce8df).fillRoundedRect(18, 12, W - 36, H - 36, 38);
    g.lineStyle(2, 0x91b798, 0.6).strokeRoundedRect(27, 21, W - 54, H - 54, 31);
    g.fillStyle(0xeaf1eb).fillRoundedRect(40, 40, W - 80, H - 80, 24);
    for (const [x, y, sign] of [
      [20, 25, 1],
      [W - 20, H - 40, -1],
      [W - 20, 25, -1],
      [20, H - 40, 1],
    ])
      for (let j = 0; j < 4; j++)
        this.add
          .ellipse(x + sign * j * 14, y + (j % 2 ? 9 : -7), 45, 18, j % 2 ? 0xa8bca3 : 0x91ab95)
          .setAngle(sign * (j % 2 ? 35 : -25))
          .setDepth(15);
    this.add
      .text(W / 2, H - 46, '✦   一点一滴，每天进步   ✦', {
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: '16px',
        color: '#6f8a76',
        letterSpacing: 4,
      })
      .setOrigin(0.5);
  }
  private drawTiles() {
    this.pieces.forEach((piece) => piece.destroy());
    this.pieces = [];
    this.faces = [];
    this.tiles.forEach((tile, index) => {
      const { x, y } = this.center(index);
      const face = this.add.graphics();
      const piece = this.add.container(x, y, [face]).setVisible(!tile.removed);
      this.pieces.push(piece);
      this.faces.push(face);
      this.paint(index);
    });
  }
  /** Same tile look as the single-player board; the opponent's pick gets a rose outline. */
  private paint(index: number, error = false) {
    const mine = this.mine === index,
      theirs = this.theirs === index;
    const g = this.faces[index];
    g.clear();
    g.fillStyle(0x113b32, 0.65).fillRoundedRect(-62, -48, 124, 108, 14);
    g.fillStyle(mine ? MINE : error ? 0xba7972 : theirs ? 0xe7b9c2 : 0xd4dfd6).fillRoundedRect(
      -62,
      -54,
      124,
      108,
      14,
    );
    g.fillStyle(mine ? 0xe5f2e9 : error ? 0xffe2d9 : theirs ? 0xfdf0f3 : 0xffffff).fillRoundedRect(
      -62,
      -54,
      124,
      100,
      14,
    );
    g.lineStyle(
      mine || theirs ? 4 : 1,
      error ? 0xac554c : mine ? MINE : theirs ? THEIRS : 0xe2e9e3,
      1,
    ).strokeRoundedRect(-58, -50, 116, 92, 11);
    g.lineStyle(1, 0xffffff, 0.6).lineBetween(-45, -43, 45, -43);
  }
}

export function createDuelBoard(
  parent: HTMLElement,
  total: number,
  ready: () => void,
): DuelSceneHandle {
  const scene = new DuelScene(total, ready);
  const { width, height } = duelLayout(total);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    transparent: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [scene],
    render: { antialias: true, roundPixels: true },
    audio: { noAudio: true },
    banner: false,
  });
  return {
    setTiles: (tiles) => scene.setTiles(tiles),
    mark: (mine, theirs) => scene.mark(mine, theirs),
    match: (a, b, path, mine) => scene.match(a, b, path, mine),
    miss: (a, b) => scene.miss(a, b),
    destroy: () => game.destroy(true),
  };
}
