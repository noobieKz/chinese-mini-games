/**
 * The three duel games behind one interface, so the Durable Object referee does not care which
 * game a room plays. Pure; imported by the Worker and by tests.
 */
import { z } from 'zod';
import * as garden from '../word-garden/duel';
import * as fruit from './fruit-rules';
import * as dragon from './dragon-rules';
import type { BasePlayer, BaseState, DuelGame } from './core';

export type Engine = {
  /** A new room from a validated create request, or an error message for the host. */
  create(code: string, body: unknown): BaseState | string;
  join(state: BaseState, id: string, name: string, now: number): BasePlayer | null;
  disconnect(state: BaseState, id: string, now: number): void;
  setReady(state: BaseState, id: string, ready: boolean, now: number): void;
  /** A game message; returns true when everyone should get the new state right away. */
  handle(state: BaseState, id: string, message: unknown, now: number): boolean;
  tick(state: BaseState, now: number): void;
  rematch(state: BaseState, id: string): void;
  publicState(state: BaseState): unknown;
  nextDeadline(state: BaseState): number | null;
};

const asGarden = (s: BaseState) => s as garden.DuelState;
const asFruit = (s: BaseState) => s as fruit.FruitState;
const asDragon = (s: BaseState) => s as dragon.DragonDuelState;

export const engines: Record<DuelGame, Engine> = {
  garden: {
    create(code, body) {
      const parsed = garden.createRoomSchema.safeParse(body);
      if (!parsed.success) return 'Thiết lập phòng không hợp lệ.';
      return garden.createDuel(code, parsed.data.settings, parsed.data.words);
    },
    join: (s, id, name, now) => garden.join(asGarden(s), id, name, now),
    disconnect: (s, id, now) => garden.disconnect(asGarden(s), id, now),
    setReady: (s, id, ready, now) => garden.setReady(asGarden(s), id, ready, now),
    handle(s, id, message, now) {
      const parsed = garden.gardenMessageSchema.safeParse(message);
      if (!parsed.success) return false;
      const msg = parsed.data;
      if (msg.type === 'select') garden.select(asGarden(s), id, msg.index);
      else garden.attempt(asGarden(s), id, msg.a, msg.b, now);
      return true;
    },
    tick: (s, now) => garden.tick(asGarden(s), now),
    rematch: (s, id) => garden.rematch(asGarden(s), id),
    publicState: (s) => garden.publicState(asGarden(s)),
    nextDeadline: (s) => garden.nextDeadline(asGarden(s)),
  },
  fruit: {
    create(code, body) {
      const parsed = fruit.fruitRoomSchema.safeParse(body);
      if (!parsed.success) return 'Thiết lập phòng không hợp lệ.';
      const { settings, words, collocations } = parsed.data;
      const state = fruit.createFruitDuel(code, settings, words, collocations);
      return state.questions.length ? state : 'Bài này chưa đủ từ để chơi.';
    },
    join: (s, id, name) => fruit.joinFruit(asFruit(s), id, name),
    disconnect: (s, id, now) => fruit.leaveFruit(asFruit(s), id, now),
    setReady: (s, id, ready, now) => fruit.readyFruit(asFruit(s), id, ready, now),
    handle(s, id, message, now) {
      const parsed = fruit.fruitMessageSchema.safeParse(message);
      if (!parsed.success) return false;
      fruit.slash(asFruit(s), id, parsed.data.question, parsed.data.option, now);
      return true;
    },
    tick: (s, now) => fruit.tickFruit(asFruit(s), now),
    rematch: (s, id) => fruit.rematchFruit(asFruit(s), id),
    publicState: (s) => fruit.publicFruit(asFruit(s)),
    nextDeadline: (s) => fruit.fruitDeadline(asFruit(s)),
  },
  dragon: {
    create(code, body) {
      const parsed = dragon.dragonRoomSchema.safeParse(body);
      if (!parsed.success) return 'Thiết lập phòng không hợp lệ.';
      return dragon.createDragonDuel(code, parsed.data.settings, parsed.data.words);
    },
    join: (s, id, name) => dragon.joinDragon(asDragon(s), id, name),
    disconnect: (s, id, now) => dragon.leaveDragon(asDragon(s), id, now),
    setReady: (s, id, ready, now) => dragon.readyDragon(asDragon(s), id, ready, now),
    handle(s, id, message) {
      const parsed = dragon.dragonMessageSchema.safeParse(message);
      if (!parsed.success) return false;
      const { dir, step, late } = parsed.data;
      dragon.steer(asDragon(s), id, dir, step, late);
      // Turns show up in the next step's broadcast; no extra message per key press.
      return false;
    },
    tick: (s, now) => dragon.tickDragon(asDragon(s), now),
    rematch: (s, id) => dragon.rematchDragon(asDragon(s), id),
    publicState: (s) => dragon.publicDragon(asDragon(s)),
    nextDeadline: (s) => dragon.dragonDeadline(asDragon(s)),
  },
};

/** Which game a create request is for; requests without `game` are the matching games. */
export const roomGameSchema = z.object({
  game: z.enum(['garden', 'fruit', 'dragon']).default('garden'),
});

/** Every message a client may send, for the client side. */
export type ClientMessage =
  | { type: 'ready'; ready: boolean }
  | { type: 'rematch' }
  | { type: 'name'; name: string }
  | garden.GardenMessage
  | fruit.FruitMessage
  | dragon.DragonMessage;

export type PublicState =
  ({ game: 'garden' } & garden.PublicDuelState) | fruit.PublicFruitState | dragon.PublicDragonState;
