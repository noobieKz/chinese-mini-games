/**
 * How smooth is a dragon duel over the network? Two simulated players start a room and one of
 * them records every broadcast for a few seconds: steps per message, server step spacing and
 * arrival jitter.
 *   npx tsx scripts/measure-dragon.ts [baseUrl] [seconds]
 */
import WebSocket from 'ws';
import { vocabulary } from '../src/games/word-garden/vocabulary';
import type { PublicDragonState } from '../src/games/duel/dragon-rules';

const base = process.argv[2] ?? 'http://localhost:8788';
const seconds = Number(process.argv[3] ?? 6);
const wsBase = base.replace(/^http/, 'ws');
const words = vocabulary.filter((w) => w.level === 'HSK 1').slice(0, 20);

const created = await fetch(`${base}/api/duel`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    game: 'dragon',
    settings: { speed: 'normal', minutes: 2, label: 'Đo độ mượt' },
    words,
  }),
});
const { code } = (await created.json()) as { code: string };
type Seen = { at: number; now: number; state: PublicDragonState };
const seen: Seen[] = [];
const open = (id: string, record: boolean) =>
  new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(`${wsBase}/api/duel/${code}?player=${id}&name=${id}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    if (record)
      ws.on('message', (raw) => {
        const msg = JSON.parse(String(raw)) as {
          type: string;
          now: number;
          state: PublicDragonState;
        };
        if (msg.type === 'state') seen.push({ at: Date.now(), now: msg.now, state: msg.state });
      });
  });
const a = await open('measure-player-a', true);
const b = await open('measure-player-b', false);
await new Promise((r) => setTimeout(r, 500));
a.send(JSON.stringify({ type: 'ready', ready: true }));
b.send(JSON.stringify({ type: 'ready', ready: true }));
await new Promise((r) => setTimeout(r, 3500 + seconds * 1000));
a.close();
b.close();

const playing = seen.filter((s) => s.state.phase === 'playing' && s.state.step > 0);
const stepMs = playing[0]?.state.stepMs ?? 0;
const firstOfStep = playing.filter((s, i) => i === 0 || s.state.step !== playing[i - 1].state.step);
const stats = (xs: number[]) => {
  const avg = xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - avg) ** 2, 0) / Math.max(1, xs.length));
  return `avg ${avg.toFixed(0)} sd ${sd.toFixed(0)} min ${Math.min(...xs).toFixed(0)} max ${Math.max(...xs).toFixed(0)}`;
};
const skipped = firstOfStep.slice(1).filter((s, i) => s.state.step - firstOfStep[i].state.step > 1);
console.log(`room ${code}, stepMs ${stepMs}`);
console.log(`messages while playing: ${playing.length}, distinct steps: ${firstOfStep.length}`);
console.log(`messages per step: ${(playing.length / Math.max(1, firstOfStep.length)).toFixed(2)}`);
console.log(`steps skipped (jumped >1): ${skipped.length}`);
console.log(
  `server send gap between steps: ${stats(firstOfStep.slice(1).map((s, i) => s.now - firstOfStep[i].now))}`,
);
console.log(
  `arrival gap between steps:     ${stats(firstOfStep.slice(1).map((s, i) => s.at - firstOfStep[i].at))}`,
);
console.log(
  `one-way delay (local - server, includes clock offset): ${stats(firstOfStep.map((s) => s.at - s.now))}`,
);
process.exit(0);
