/**
 * Two simulated players for Chém hoa quả and Rồng săn chữ against a running Worker
 * (default http://localhost:8788): create, join, ready, play a little, check what both see.
 *   npx tsx scripts/smoke-duel-games.ts [baseUrl]
 */
import WebSocket from 'ws';
import { vocabulary } from '../src/games/word-garden/vocabulary';
import type { PublicFruitState } from '../src/games/duel/fruit-rules';
import type { PublicDragonState } from '../src/games/duel/dragon-rules';

const base = process.argv[2] ?? 'http://localhost:8788';
const wsBase = base.replace(/^http/, 'ws');
const words = vocabulary.filter((w) => w.level === 'HSK 1');

function player<S extends { phase: string }>(code: string, id: string, name: string) {
  const ws = new WebSocket(
    `${wsBase}/api/duel/${code}?player=${id}&name=${encodeURIComponent(name)}`,
    { headers: { origin: base } },
  );
  let latest: S | null = null;
  const seen: { at: number; state: S }[] = [];
  const waiters: [(s: S) => boolean, (s: S) => void][] = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw)) as { type: string; state?: S };
    if (msg.type !== 'state' || !msg.state) return;
    latest = msg.state;
    seen.push({ at: Date.now(), state: msg.state });
    for (const w of [...waiters])
      if (w[0](msg.state)) (waiters.splice(waiters.indexOf(w), 1), w[1](msg.state));
  });
  return {
    open: new Promise<void>(
      (resolve, reject) => (ws.on('open', () => resolve()), ws.on('error', reject)),
    ),
    send: (data: object) => ws.send(JSON.stringify(data)),
    seen,
    until: (check: (s: S) => boolean, label: string, ms = 8000) =>
      new Promise<S>((resolve, reject) => {
        if (latest && check(latest)) return resolve(latest);
        waiters.push([check, resolve]);
        setTimeout(() => reject(new Error(`timeout: ${label}`)), ms);
      }),
    close: () => ws.close(),
  };
}

async function create(body: object) {
  const response = await fetch(`${base}/api/duel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { code?: string; error?: string };
  if (!data.code) throw new Error(`create failed: ${response.status} ${data.error}`);
  return data.code;
}

// --- Chém hoa quả ---
{
  const code = await create({
    game: 'fruit',
    settings: { kind: 'words', seconds: 8, label: 'Chém hoa quả · thử' },
    words,
    collocations: [],
  });
  const a = player<PublicFruitState>(code, 'smoke-fruit-a', 'An');
  const b = player<PublicFruitState>(code, 'smoke-fruit-b', 'Bình');
  await Promise.all([a.open, b.open]);
  await a.until((s) => s.players.length === 2, 'both seated');
  a.send({ type: 'ready', ready: true });
  b.send({ type: 'ready', ready: true });
  const started = await b.until((s) => s.phase === 'playing', 'playing');
  if (started.question?.reveal) throw new Error('answer leaked before the question was over');
  if (started.question?.options.length !== 4) throw new Error('expected four fruits');
  await new Promise((r) => setTimeout(r, started.startAt! - Date.now() + 400));
  // Bình slices every fruit until one is right: wrong ones lock Bình out, so An takes the rest.
  a.send({ type: 'slash', question: 0, option: 0 });
  const after = await b.until((s) => s.event?.kind === 'win' || s.locked.length > 0, 'first slash');
  console.log(
    'fruit: first slash ->',
    after.event?.kind,
    'scores',
    after.players.map((p) => `${p.name} ${p.score}`).join(' | '),
  );
  const resolved = await b.until(
    (s) => s.resolved !== null || s.locked.length > 0,
    'resolved or locked',
  );
  if (!resolved.resolved) {
    for (let option = 0; option < 4; option++) b.send({ type: 'slash', question: 0, option });
    const done = await a.until((s) => s.resolved !== null, 'question resolved');
    console.log(
      'fruit: resolved by',
      done.resolved?.by,
      'answer',
      done.question?.reveal?.answer,
      'scores',
      done.players.map((p) => `${p.name} ${p.score}`).join(' | '),
    );
  } else console.log('fruit: An took question 1, answer', resolved.question?.reveal?.answer);
  const next = await a.until((s) => s.index === 1, 'next question', 6000);
  console.log('fruit: next question arrived, reveal hidden again:', next.question?.reveal === null);
  a.close();
  b.close();
}

// --- Rồng săn chữ ---
{
  const code = await create({
    game: 'dragon',
    settings: { speed: 'normal', minutes: 2, label: 'Rồng · thử' },
    words: words.slice(0, 20),
  });
  const a = player<PublicDragonState>(code, 'smoke-dragon-a', 'An');
  const b = player<PublicDragonState>(code, 'smoke-dragon-b', 'Bình');
  await Promise.all([a.open, b.open]);
  await a.until((s) => s.players.length === 2, 'both seated');
  a.send({ type: 'ready', ready: true });
  b.send({ type: 'ready', ready: true });
  const started = await b.until((s) => s.phase === 'playing', 'playing');
  await b.until((s) => s.step >= 3, 'three steps', 8000);
  a.send({ type: 'turn', dir: 'down', step: 3, late: false });
  const turned = await a.until(
    (s) => s.snakes['smoke-dragon-a']?.dir === 'down',
    'turn applied',
    3000,
  );
  const steps = b.seen.filter((x) => x.state.phase === 'playing' && x.state.step > 0);
  const gaps = steps.slice(1).map((x, i) => x.at - steps[i].at);
  const avg = gaps.reduce((s, g) => s + g, 0) / Math.max(1, gaps.length);
  console.log(
    `dragon: step ${turned.step}, stepMs ${started.stepMs}, avg gap between broadcasts ${avg.toFixed(0)} ms over ${gaps.length}`,
  );
  if (JSON.stringify(turned).includes('"turns"')) throw new Error('queued turns leaked');
  console.log(
    'dragon: word',
    turned.word.hanzi,
    'pearls',
    turned.pearls.length,
    'snakes',
    Object.keys(turned.snakes).length,
  );
  a.close();
  b.close();
}
console.log('OK');
process.exit(0);
