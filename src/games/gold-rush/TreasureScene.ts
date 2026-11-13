import Phaser from 'phaser';
import type { RoomView } from '../../../shared/types';
import { chestArt, coinArt, islandArt, lanternArt, worldArt } from './assets';

const COLORS = [0xf0a36b, 0x79d4bb, 0xeac373, 0xb6a2ed];
const SYMBOLS = ['龙', '竹', '虎', '凤'];
type Base = {
  container: Phaser.GameObjects.Container;
  gold: Phaser.GameObjects.Text;
  shield: Phaser.GameObjects.Arc;
};
export type ArenaHandle = {
  sync: (room: RoomView) => void;
  openChest: (index: number) => void;
  destroy: () => void;
};

/** Presentation only: the server remains authoritative for questions, rewards and gold. */
class TreasureScene extends Phaser.Scene {
  private room: RoomView;
  private bases: Base[] = [];
  private world?: Phaser.GameObjects.Image;
  private chests: Phaser.GameObjects.Image[] = [];
  private chestGlow?: Phaser.GameObjects.Ellipse;
  private chestKey = '';
  private opening = false;
  private ready = false;
  private revealTimers = new Set<ReturnType<typeof setTimeout>>();
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(
    room: RoomView,
    private onChest: () => void,
    private onReady: (scene: TreasureScene) => void,
    private onFailure: () => void,
  ) {
    super('treasure-island');
    this.room = room;
  }
  preload() {
    this.load.once('loaderror', this.onFailure);
    const art: Record<string, string> = {
      world: worldArt,
      island: islandArt,
      chest: chestArt(false),
      'chest-open': chestArt(true),
      coin: coinArt,
      lantern: lanternArt,
    };
    for (const [key, source] of Object.entries(art)) {
      // Phaser's SVG loader decodes base64 as a binary string; XML entities preserve CJK text.
      const ascii = source.replace(/[^\x00-\x7f]/gu, (char) => `&#${char.codePointAt(0)};`);
      this.load.svg(key, `data:image/svg+xml;base64,${btoa(ascii)}`);
    }
  }
  create() {
    if (
      !['world', 'island', 'chest', 'chest-open', 'coin', 'lantern'].every((key) =>
        this.textures.exists(key),
      )
    ) {
      this.onFailure();
      return;
    }
    this.world = this.add.image(0, 0, 'world').setDepth(-10);
    this.createAtmosphere();
    this.createBases();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.revealTimers.forEach((timer) => clearTimeout(timer));
      this.revealTimers.clear();
    });
    this.ready = true;
    this.layout();
    this.sync(this.room);
    this.onReady(this);
  }
  private createAtmosphere() {
    const w = this.scale.width,
      h = this.scale.height;
    for (let i = 0; i < 38; i++) {
      const dot = this.add
        .circle(
          Phaser.Math.Between(0, w),
          Phaser.Math.Between(60, h),
          i % 4 === 0 ? 2 : 1,
          0xffdf95,
          0.2 + Math.random() * 0.5,
        )
        .setDepth(-2);
      if (!this.reducedMotion)
        this.tweens.add({
          targets: dot,
          y: dot.y - 65,
          x: dot.x + 20,
          alpha: 0.05,
          duration: 2500 + i * 137,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
    }
    for (let i = 0; i < 6; i++) {
      const lantern = this.add
        .image(w * (0.09 + i * 0.165), h * (i % 2 ? 0.16 : 0.23), 'lantern')
        .setScale(0.5 + (i % 3) * 0.1)
        .setAlpha(0.6)
        .setDepth(-1);
      if (!this.reducedMotion)
        this.tweens.add({
          targets: lantern,
          y: lantern.y - 16,
          angle: i % 2 ? 5 : -5,
          duration: 3000 + i * 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
    }
  }
  private createBases() {
    for (const team of this.room.teams) {
      const island = this.add.image(0, 0, 'island').setDisplaySize(330, 230);
      const color = COLORS[team.id];
      const pole = this.add.rectangle(-96, -63, 3, 115, 0xc7b889);
      const flag = this.add
        .triangle(-74, -91, 0, 0, 56, 4, 45, 37, color)
        .setStrokeStyle(2, 0xffe9bb, 0.5);
      const emblem = this.add
        .text(-78, -88, SYMBOLS[team.id], {
          fontFamily: 'serif',
          fontSize: '19px',
          color: '#183746',
        })
        .setOrigin(0.5);
      const chest = this.add.image(0, -6, 'chest').setDisplaySize(98, 90);
      const gold = this.add
        .text(0, 80, `${team.gold}`, {
          fontFamily: '"Be Vietnam Pro",sans-serif',
          fontSize: '26px',
          fontStyle: 'bold',
          color: '#ffe1a0',
          stroke: '#102632',
          strokeThickness: 5,
        })
        .setOrigin(0.5);
      const name = this.add
        .text(0, 111, team.name.toUpperCase(), {
          fontFamily: '"Be Vietnam Pro",sans-serif',
          fontSize: '11px',
          letterSpacing: 2,
          color: '#bdd5ce',
          stroke: '#102632',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      const shield = this.add
        .circle(0, -15, 73, 0x8ae6de, 0.08)
        .setStrokeStyle(2, 0x99f0df, 0.8)
        .setVisible(team.shield);
      const visual = this.add.container(0, 0, [
        island,
        pole,
        flag,
        emblem,
        chest,
        shield,
        gold,
        name,
      ]);
      const container = this.add.container(0, 0, [visual]);
      this.bases.push({ container, gold, shield });
      if (!this.reducedMotion)
        this.tweens.add({
          targets: visual,
          y: '-=7',
          duration: 2400 + team.id * 250,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
    }
  }
  private layout() {
    if (!this.world) return;
    const w = this.scale.width,
      h = this.scale.height;
    const width = Math.max(w, h * 1.6);
    this.world.setPosition(w / 2, h / 2).setDisplaySize(width, h);
    this.world.setAlpha(!this.room.host && this.room.status === 'playing' ? 0.25 : 0.85);
    const mobile = w < 700;
    this.bases.forEach((base, i) => {
      const count = this.bases.length;
      const x = mobile
        ? w * (0.16 + (i / (count - 1)) * 0.68)
        : w * (0.16 + (i / (count - 1)) * 0.68);
      const y = mobile ? h * 0.31 : h * 0.75;
      base.container
        .setPosition(x, y)
        .setVisible(!(!this.room.host && this.room.status === 'playing'))
        .setScale(mobile ? Math.min(0.48, w / count / 330) : Math.min(1, w / count / 365));
    });
    this.positionChests();
  }
  sync(next: RoomView) {
    const previous = this.room;
    this.room = next;
    if (!this.ready) return;
    const losses = next.teams.filter(
      (t) => t.gold < (previous.teams.find((p) => p.id === t.id)?.gold ?? t.gold),
    );
    for (const team of next.teams) {
      const base = this.bases[team.id];
      if (!base) continue;
      const old = previous.teams.find((t) => t.id === team.id);
      base.gold.setText(team.gold.toLocaleString('vi-VN'));
      base.shield.setVisible(team.shield);
      if (old && team.gold !== old.gold) {
        const diff = team.gold - old.gold;
        this.floatText(
          base.container.x,
          base.container.y + 15,
          diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`,
          diff > 0 ? '#ffe29e' : '#f1a195',
        );
        if (diff > 0) {
          const source = losses[0];
          const from = source
            ? this.bases[source.id].container
            : { x: this.scale.width / 2, y: this.scale.height * 0.48 };
          this.flyCoins(from.x, from.y, base.container.x, base.container.y);
        }
      }
      if (team.shield && !old?.shield && !this.reducedMotion)
        this.tweens.add({ targets: base.shield, alpha: 0.3, duration: 650, yoyo: true, repeat: 2 });
    }
    const key =
      next.status === 'playing' && !next.host && next.pending
        ? `${next.answered}:${next.pending}`
        : '';
    if (key !== this.chestKey) {
      this.chestKey = key;
      this.opening = false;
      this.clearChests();
      if (key) this.showChests();
    }
    if (next.status === 'finished' && previous.status !== 'finished') this.celebrate();
    this.layout();
  }
  private showChests() {
    this.chestGlow = this.add.ellipse(0, 0, 440, 100, 0xf6d58a, 0.08).setDepth(8);
    for (let i = 0; i < 3; i++) {
      // All input belongs to the DOM controls. Revealing on canvas pointerdown can
      // replace the UI before pointerup and send its click to a new reward button.
      const chest = this.add.image(0, 0, 'chest').setDepth(10);
      this.chests.push(chest);
    }
    this.positionChests();
  }
  private positionChests() {
    const w = this.scale.width,
      h = this.scale.height,
      mobile = w < 700;
    const size = mobile ? Math.min(112, w * 0.29) : 180;
    this.chestGlow?.setPosition(w / 2, mobile ? 452 : h * 0.53);
    this.chests.forEach((chest, i) =>
      chest
        .setPosition(w / 2 + (i - 1) * size * 1.12, mobile ? 440 : h * 0.5)
        .setDisplaySize(size, size * 0.92),
    );
  }
  openChest(index: number) {
    const chest = this.chests[index];
    if (!chest || this.opening) return;
    this.opening = true;
    this.chests.forEach((other, i) => {
      other.disableInteractive();
      if (i !== index) this.tweens.add({ targets: other, alpha: 0.25, duration: 200 });
    });
    let revealed = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => {
      if (revealed || !chest.active) return;
      revealed = true;
      if (watchdog) {
        clearTimeout(watchdog);
        this.revealTimers.delete(watchdog);
      }
      chest.setTexture('chest-open');
      this.flyCoins(chest.x, chest.y, chest.x, chest.y - 100);
      this.onChest();
    };
    if (this.reducedMotion) {
      reveal();
      return;
    }
    // Browsers throttle engine frames in background tabs. Presentation must never block play.
    watchdog = setTimeout(() => {
      if (watchdog) this.revealTimers.delete(watchdog);
      reveal();
    }, 900);
    this.revealTimers.add(watchdog);
    this.tweens.add({
      targets: chest,
      angle: { from: -7, to: 7 },
      duration: 70,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        chest.setAngle(0);
        this.cameras.main.flash(150, 245, 207, 122, false);
        reveal();
      },
    });
  }
  private clearChests() {
    this.chests.forEach((c) => {
      this.tweens.killTweensOf(c);
      c.destroy();
    });
    this.chests = [];
    this.chestGlow?.destroy();
  }
  private floatText(x: number, y: number, text: string, color: string) {
    const label = this.add
      .text(x, y, text, {
        fontFamily: '"Be Vietnam Pro",sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color,
        stroke: '#19313b',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: label,
      y: y - 85,
      alpha: 0,
      duration: this.reducedMotion ? 400 : 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }
  private flyCoins(x: number, y: number, toX: number, toY: number) {
    if (this.reducedMotion) return;
    for (let i = 0; i < 12; i++) {
      const coin = this.add
        .image(x + Phaser.Math.Between(-20, 20), y, 'coin')
        .setScale(0.4)
        .setDepth(20);
      this.tweens.add({
        targets: coin,
        x: toX + Phaser.Math.Between(-25, 25),
        y: toY - 75,
        angle: 360,
        scaleX: 0.1,
        duration: 500,
        delay: i * 45,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (!coin.active) return;
          this.tweens.add({
            targets: coin,
            y: toY,
            alpha: 0,
            scaleX: 0.35,
            duration: 350,
            onComplete: () => coin.destroy(),
          });
        },
      });
    }
  }
  private celebrate() {
    if (this.reducedMotion) return;
    for (let i = 0; i < 55; i++) {
      const spark = this.add
        .rectangle(Math.random() * this.scale.width, -30, 5, 12, COLORS[i % 4])
        .setDepth(40);
      this.tweens.add({
        targets: spark,
        y: this.scale.height + 30,
        x: spark.x + Phaser.Math.Between(-150, 150),
        angle: Phaser.Math.Between(-360, 360),
        duration: 2300 + Math.random() * 2000,
        delay: Math.random() * 1300,
        onComplete: () => spark.destroy(),
      });
    }
  }
}

export function createArena(
  parent: HTMLElement,
  room: RoomView,
  onChest: () => void,
  onReady: (handle: ArenaHandle) => void,
  onFailure: () => void,
): ArenaHandle {
  let scene: TreasureScene;
  const handle: ArenaHandle = {
    sync: (r) => scene.sync(r),
    openChest: (i) => scene.openChest(i),
    destroy: () => game.destroy(true),
  };
  scene = new TreasureScene(room, onChest, () => onReady(handle), onFailure);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0c2937',
    antialias: true,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    scene: [scene],
    render: { roundPixels: false },
    fps: { target: 60 },
    audio: { noAudio: true },
    banner: false,
  });
  return handle;
}
