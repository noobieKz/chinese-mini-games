/**
 * Two simulated players against a running Worker (default http://localhost:8788):
 * create a room, join by code, ready up, race for a pair, check both see the same result.
 *   npx tsx scripts/smoke-duel.ts [baseUrl]
 */
import WebSocket from 'ws';
import { findPair } from '../src/games/word-garden/rules';
import { DUEL_COLS, type PublicDuelState } from '../src/games/word-garden/duel';
import { vocabulary } from '../src/games/word-garden/vocabulary';

const base = process.argv[2] ?? 'http://localhost:8788';
const wsBase = base.replace(/^http/, 'ws');
type Message = { type: string; now?: number; state?: PublicDuelState };

function player(code: string, id: string, name: string) {
  const ws = new WebSocket(
    `${wsBase}/api/duel/${code}?player=${id}&name=${encodeURIComponent(name)}`,
    {
      headers: { origin: base },
    },
  );
  let latest: PublicDuelState | null = null;
  const waiters: [(s: PublicDuelState) => boolean, (s: PublicDuelState) => void][] = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw)) as Message;
    if (msg.type !== 'state' || !msg.state) return;
    latest = msg.state;
    for (const w of [...waiters])
      if (w[0](latest)) (waiters.splice(waiters.indexOf(w), 1), w[1](latest));
  });
  return {
    open: new Promise<void>(
      (resolve, reject) => (ws.on('open', () => resolve()), ws.on('error', reject)),
    ),
    send: (data: object) => ws.send(JSON.stringify(data)),
    until: (check: (s: PublicDuelState) => boolean, label: string) =>
      new Promise<PublicDuelState>((resolve, reject) => {
        if (latest && check(latest)) return resolve(latest);
        waiters.push([check, resolve]);
        setTimeout(() => reject(new Error(`timeout: ${label}`)), 8000);
      }),
    close: () => ws.close(),
  };
}

const words = vocabulary.filter((w) => w.level === 'HSK 1');
const created = await fetch(`${base}/api/duel`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    settings: { mode: 'meaning', difficulty: 'normal', pairs: 8, label: 'HSK 1 · thử' },
    words,
  }),
});
const { code } = (await created.json()) as { code: string };
console.log('room', created.status, code);
const a = player(code, 'smoke-player-a', 'An');
const b = player(code, 'smoke-player-b', 'Bình');
await Promise.all([a.open, b.open]);
await a.until((s) => s.players.length === 2, 'both seated');
const third = player(code, 'smoke-player-c', 'Chi');
await third.open.catch(() => undefined);
a.send({ type: 'ready', ready: true });
b.send({ type: 'ready', ready: true });
const started = await b.until((s) => s.phase === 'playing', 'playing');
console.log(
  'playing, countdown ends in',
  started.startAt! - Date.now(),
  'ms; tiles',
  started.tiles.length,
);
await new Promise((r) => setTimeout(r, Math.max(0, started.startAt! - Date.now()) + 100));
const [x, y] = findPair(started.tiles, 'meaning', DUEL_COLS, false)!;
a.send({ type: 'attempt', a: x, b: y }); // usually An wins the race…
b.send({ type: 'attempt', a: x, b: y }); // …Bình's identical attempt arrives second
const afterA = await b.until((s) => s.event?.kind === 'taken', 'taken event');
const [pa, pb] = afterA.players;
console.log(
  'scores',
  pa.name,
  pa.score,
  '|',
  pb.name,
  pb.score,
  '| removed',
  afterA.tiles.filter((t) => t.removed).length,
);
// Over a real network either attempt may arrive first: exactly one player gets the pair.
const scores = [pa.score, pb.score].sort((x, y) => x - y);
if (scores[0] !== 0 || scores[1] !== 10) throw new Error('unexpected scores');
a.close();
const forfeitWait = await b.until(
  (s) => !s.players.find((p) => p.name === 'An')?.connected,
  'An disconnected',
);
console.log(
  'An disconnected, phase',
  forfeitWait.phase,
  '(forfeit after 20 s if An does not return)',
);
b.close();
third.close();
console.log('OK');
process.exit(0);
