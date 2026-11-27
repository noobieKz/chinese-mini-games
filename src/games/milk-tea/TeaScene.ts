import Phaser from 'phaser';
import type { Recipe, TopicId } from './orders';

export function mountTeaScene(parent: HTMLElement, initialRecipe: Partial<Recipe>, topic: TopicId) {
  let recipe = initialRecipe;
  let sealed = false;
  let fill = 1;
  let paint: (() => void) | undefined;
  let animate: (() => void) | undefined;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    width: 640,
    height: 290,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: {
      create(this: Phaser.Scene) {
        const g = this.add.graphics();
        const burst = this.add.container(320, 130);
        paint = () => {
          g.clear();
          g.fillStyle(0xf0d2b8);
          g.fillRoundedRect(0, 0, 640, 290, 22);
          g.fillStyle(0xffefd9);
          g.fillRoundedRect(26, 23, 588, 192, 18);
          g.fillStyle(0xf3d6bd);
          for (let y = 58; y < 210; y += 30) {
            g.fillRect(27, y, 586, 1);
            const offset = y % 60 === 28 ? 26 : 0;
            for (let x = 52 + offset; x < 610; x += 52) g.fillRect(x, y, 1, 30);
          }
          g.fillStyle(0xe5a779);
          g.fillRoundedRect(0, 212, 640, 30, 8);
          g.fillStyle(0xc4865d);
          g.fillRect(7, 241, 626, 49);
          g.fillStyle(0x8c5b43, 0.28);
          g.fillEllipse(320, 223, 179, 25);
          g.lineStyle(2, 0xb87757, 0.55);
          g.lineBetween(24, 257, 615, 257);
          g.lineBetween(24, 273, 615, 273);

          if (topic === 'clothes') {
            g.lineStyle(5, 0xd99bae);
            g.lineBetween(78, 68, 562, 68);
            g.lineBetween(92, 68, 92, 208);
            g.lineBetween(548, 68, 548, 208);
            const x = 320;
            const size = [32, 42, 54][recipe.sugar ?? 1];
            g.lineStyle(3, 0xffd9a8);
            g.lineBetween(x, 68, x, 99);
            g.strokeTriangle(x, 92, x - size, 123, x + size, 123);
            if (recipe.drink !== undefined) {
              const color = [0xfce8d4, 0x1a1927, 0x7598e5][recipe.ice ?? 0];
              g.fillStyle(color);
              if (recipe.drink === 1) {
                g.fillRoundedRect(x - size, 120, size * 2, 38, 4);
                g.fillRoundedRect(x - size, 147, size - 4, 61, 4);
                g.fillRoundedRect(x + 4, 147, size - 4, 61, 4);
              } else {
                g.fillRoundedRect(x - size, 119, size * 2, 88, 8);
                const sleeve = recipe.drink === 2 ? 68 : 33;
                g.fillRoundedRect(x - size - 20, 124, 24, sleeve, 7);
                g.fillRoundedRect(x + size - 4, 124, 24, sleeve, 7);
                g.lineStyle(2, 0xc48f82);
                g.lineBetween(x, 135, x, 201);
              }
            }
            return;
          }
          if (topic === 'train') {
            g.fillStyle(0x1c314e);
            g.fillRoundedRect(54, 39, 532, 155, 16);
            g.fillStyle([0x81b2d5, 0xe6ae79, 0x545583][recipe.ice ?? 0]);
            g.fillRoundedRect(65, 49, 510, 104, 12);
            g.fillStyle(0xb8a9dd);
            g.fillRoundedRect(104, 90, 432, 82, 22);
            g.fillStyle([0x5d84bd, 0xa94f70, 0x45888a][recipe.drink ?? 0]);
            g.fillRect(107, 144, 425, 18);
            g.fillStyle(0x29354b);
            for (let x = 126; x < 532; x += 59) g.fillRoundedRect(x, 104, 43, 29, 5);
            g.fillStyle(0x211f31);
            g.fillCircle(156, 174, 12);
            g.fillCircle(482, 174, 12);
            g.fillStyle(0xdbc3ac);
            g.fillRect(65, 186, 510, 6);
            if (recipe.sugar !== undefined) {
              for (let i = 0; i <= recipe.sugar; i++) {
                const x = 272 + i * 36;
                g.fillStyle(0xffdf9d);
                g.fillRoundedRect(x, 203 - i * 3, 57, 29, 5);
                g.fillStyle(0x8c664c);
                g.fillRect(x + 11, 214 - i * 3, 31, 3);
              }
            }
            return;
          }

          if (topic === 'restaurant') {
            g.fillStyle(0xd49b6d);
            g.fillRoundedRect(67, 63, 178, 10, 4);
            g.fillRoundedRect(395, 63, 178, 10, 4);
            for (const [x, tint] of [
              [96, 0xbb6952],
              [156, 0xebba78],
              [466, 0xb4bd88],
              [514, 0xd89c76],
            ]) {
              g.fillStyle(tint);
              g.fillRoundedRect(x, 82, 32, 58, 8);
            }
            g.fillStyle(0xb87c60);
            g.fillEllipse(320, 212, 190, 40);
            const takeaway = recipe.sugar === 1;
            g.fillStyle(takeaway ? 0xedd5a6 : 0xfff5da);
            if (takeaway) g.fillRoundedRect(229, 133, 182, 78, 14);
            else g.fillEllipse(320, 176, 185, 98);
            if (recipe.drink !== undefined) {
              g.fillStyle([0xd9925b, 0xecd498, 0xe7b477][recipe.drink]);
              g.fillEllipse(320, 164, 145, 62);
              g.fillStyle(0xf5ddb0);
              for (let i = 0; i < 6; i++) g.fillEllipse(274 + i * 17, 157 + (i % 2) * 12, 24, 11);
            }
            if (recipe.ice !== undefined && recipe.ice !== 2) {
              g.fillStyle(recipe.ice === 0 ? 0x94a67c : 0xd28163);
              for (const x of [282, 318, 348]) g.fillCircle(x, 155, 5);
            }
            if (recipe.sugar === 2) {
              g.fillStyle(0xcb804f);
              g.fillRoundedRect(412, 142, 46, 40, 7);
              g.fillStyle(0xffe3b2);
              g.fillRect(422, 151, 26, 6);
            }
            return;
          }
          if (topic === 'library') {
            for (const x of [68, 419]) {
              g.fillStyle(0xa87a70);
              g.fillRoundedRect(x, 49, 155, 146, 10);
              g.fillStyle(0xf8e0ca);
              g.fillRoundedRect(x + 9, 58, 137, 128, 6);
              for (const y of [115, 175]) {
                g.fillStyle(0xac8274);
                g.fillRect(x + 9, y, 137, 5);
                for (let i = 0; i < 5; i++) {
                  g.fillStyle([0xaf9ab9, 0xc5a183, 0x96af99, 0xca9288, 0x88a0ae][i]);
                  g.fillRoundedRect(x + 16 + i * 24, y - 34 - (i % 2) * 8, 16, 34 + (i % 2) * 8, 3);
                }
              }
            }
            const books = recipe.ice === undefined ? 1 : recipe.ice + 1;
            for (let i = 0; i < books; i++) {
              const y = 183 - i * 25;
              g.fillStyle([0xa88aaf, 0x679486, 0xc48472][recipe.drink ?? 0]);
              g.fillRoundedRect(252, y, 139, 24, 6);
              g.fillStyle(0xfff1da);
              g.fillRoundedRect(266, y + 5, 122, 14, 3);
            }
            if (recipe.sugar !== undefined) {
              g.fillStyle(0xe1b87c);
              g.fillRoundedRect(363, 192 - books * 25, 52, 35, 5);
              g.fillStyle(0x92634e);
              for (let i = 0; i <= recipe.sugar; i++)
                g.fillRect(374, 202 - books * 25 + i * 6, 29, 2);
            }
            return;
          }

          // A rose valance and open shelves frame the prep area.
          g.fillStyle(0xd9907b);
          g.fillRoundedRect(26, 23, 226, 19, 5);
          g.fillRoundedRect(388, 23, 226, 19, 5);
          g.fillStyle(0xf4baaa);
          g.fillRoundedRect(34, 25, 213, 5, 2);
          g.fillRoundedRect(393, 25, 213, 5, 2);
          g.fillStyle(0xc08868);
          g.fillRoundedRect(79, 123, 149, 7, 4);
          g.fillRoundedRect(435, 123, 126, 7, 4);
          for (const [left, tint] of [
            [92, 0xe09a86],
            [137, 0xabc196],
            [180, 0xe9bc79],
            [451, 0xe9bc79],
            [496, 0xd6a092],
          ]) {
            g.fillStyle(tint);
            g.fillRoundedRect(left, 90, 27, 32, 7);
            g.fillStyle(0xfff4de);
            g.fillRoundedRect(left - 1, 88, 29, 5, 2);
          }

          // Canisters and the order pickup light.
          for (const [x, color] of [
            [105, 0xd99785],
            [159, 0xb6c888],
            [486, 0xe8b97f],
          ]) {
            g.fillStyle(color);
            g.fillRoundedRect(x, 148, 44, 64, 8);
            g.fillStyle(0xf7d7a4);
            g.fillRoundedRect(x - 3, 144, 50, 9, 4);
            g.fillStyle(0xf9eee0, 0.9);
            g.fillRoundedRect(x + 8, 170, 28, 17, 5);
          }
          g.fillStyle(0xffd389, 0.22);
          g.fillTriangle(301, 31, 339, 31, 389, 213);
          g.fillTriangle(301, 31, 251, 213, 389, 213);
          g.fillStyle(0xffdb92);
          g.fillRoundedRect(271, 20, 98, 15, 7);

          const width = [83, 108, 136][recipe.size ?? 1];
          const x = 320 - width / 2;
          const top = [117, 97, 79][recipe.size ?? 1];
          g.fillStyle(0xfffdf7, 0.63);
          g.fillRoundedRect(x, top, width, 222 - top, 20);
          if (recipe.drink !== undefined) {
            g.fillStyle(
              [0xe1a876, 0xa3bd72, 0xf5d276, 0x9dbd79, 0xca9a74, 0xb46458, 0xf0a882, 0xdadc9a][
                recipe.drink
              ],
            );
            const depth = (214 - top - 28) * fill;
            if (depth > 0)
              g.fillRoundedRect(x + 7, 214 - depth, width - 14, depth, Math.min(15, depth / 2));
            if (fill < 1) g.fillRoundedRect(316, 47, 8, 167 - depth, 4);
          }
          const ice = recipe.ice === undefined ? 0 : [3, 1, 0, 5, 0][recipe.ice];
          for (let i = 0; i < ice; i++) {
            g.fillStyle(0xe8f7ff, 0.88);
            g.fillRoundedRect(
              x + 12 + ((i % 3) * (width - 25)) / 3,
              top + 31 + Math.floor(i / 3) * 17,
              17,
              15,
              4,
            );
          }
          if (recipe.ice === 4 && !sealed) {
            g.lineStyle(4, 0xb97859, 0.65);
            for (const offset of [-21, 0, 21]) {
              g.lineBetween(320 + offset, top - 8, 328 + offset, top - 30);
            }
          }
          if (recipe.topping === 6) {
            g.fillStyle(0xffe9d4);
            g.fillRoundedRect(x + 7, top + 24, width - 14, 20, 8);
          } else if (recipe.topping !== undefined && recipe.topping > 0) {
            g.fillStyle([0, 0x4d3243, 0xf0e1c6, 0xf5c170, 0x323041, 0xa14e63][recipe.topping]);
            for (let i = 0; i < 8; i++)
              g.fillCircle(x + 13 + (i * (width - 26)) / 7, 195 + (i % 2) * 9, 5);
          }
          if (recipe.sugar !== undefined) {
            const bars = [5, 3, 0, 2, 4][recipe.sugar];
            g.fillStyle(0x704459);
            g.fillRoundedRect(284, 161, 72, 16, 8);
            g.fillStyle(0xffd989);
            for (let i = 0; i < bars; i++) g.fillCircle(298 + i * 11, 169, 3);
          }
          g.lineStyle(3, 0x95674f, 0.85);
          g.strokeRoundedRect(x, top, width, 222 - top, 20);
          if (sealed) {
            g.lineStyle(7, 0xf8d6bb);
            g.lineBetween(337, top + 3, 360, top - 42);
            g.fillStyle(0xffede5);
            g.fillRoundedRect(x - 6, top - 5, width + 12, 13, 6);
          }
        };
        animate = () => {
          if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          for (let i = 0; i < 10; i++) {
            const dot = this.add.circle(0, 0, 4, i % 2 ? 0xffdc99 : 0xc9f497);
            burst.add(dot);
            const angle = (i / 10) * Math.PI * 2;
            this.tweens.add({
              targets: dot,
              x: Math.cos(angle) * 126,
              y: Math.sin(angle) * 82,
              alpha: 0,
              duration: 460,
              ease: 'Quad.easeOut',
              onComplete: () => dot.destroy(),
            });
          }
        };
        paint();
      },
    },
  });
  return {
    update(next: Partial<Recipe>, closed: boolean, fillRatio = 1) {
      recipe = next;
      sealed = closed;
      fill = fillRatio;
      paint?.();
    },
    celebrate() {
      animate?.();
    },
    destroy() {
      game.destroy(true);
    },
  };
}
