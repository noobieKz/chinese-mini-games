import type { MatchMode, Word } from './vocabulary';
export type Tile = { id: number; word: Word; side: 0 | 1; label: string; removed: boolean };
export type Cell = { x: number; y: number };
export const COLS = 6;
export const ROWS = 4;
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeTiles(words: Word[], mode: MatchMode): Tile[] {
  return shuffle(
    words.flatMap((word, i) =>
      ([0, 1] as const).map((side) => ({
        id: i * 2 + side,
        word,
        side,
        removed: false,
        label:
          mode === 'meaning' ? (side === 0 ? word.hanzi : word.meaning) : [...word.hanzi][side],
      })),
    ),
  );
}
export function matchingWord(a: Tile, b: Tile, available: Tile[], ordered = true) {
  return (
    available.find((t) => !t.removed && t.word.hanzi === a.label + b.label)?.word ??
    (!ordered
      ? available.find((t) => !t.removed && t.word.hanzi === b.label + a.label)?.word
      : undefined)
  );
}
export function matches(
  a: Tile,
  b: Tile,
  mode: MatchMode,
  available: Tile[] = [a, b],
  ordered = true,
) {
  if (a.id === b.id) return false;
  if (mode === 'meaning') return a.side !== b.side && a.word.id === b.word.id;
  return Boolean(matchingWord(a, b, available, ordered));
}
/** Visible glyphs are interchangeable regardless of which word/side generated them. */
export function reconcileCharacters(tiles: Tile[], a: number, b: number, ordered = true) {
  const desired = matchingWord(tiles[a], tiles[b], tiles, ordered);
  if (!desired) return;
  if (tiles[a].label + tiles[b].label !== desired.hanzi) [a, b] = [b, a];
  for (const [index, side] of [
    [a, 0],
    [b, 1],
  ] as const) {
    const other = tiles.find((t) => !t.removed && t.side === side && t.word.id === desired.id)!;
    const old = { word: tiles[index].word, side: tiles[index].side };
    tiles[index].word = desired;
    tiles[index].side = side;
    other.word = old.word;
    other.side = old.side;
  }
}
/** Search an empty orthogonal route with at most two bends, including the outer border. */
export function findPath(tiles: Tile[], from: number, to: number, cols = COLS): Cell[] | null {
  const rows = tiles.length / cols;
  if (!tiles[from] || !tiles[to]) return null;
  if (from === to || tiles[from]?.removed || tiles[to]?.removed) return null;
  const start = { x: (from % cols) + 1, y: Math.floor(from / cols) + 1 };
  const end = { x: (to % cols) + 1, y: Math.floor(to / cols) + 1 };
  const directions = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  const queue = [{ ...start, dir: -1, turns: 0, path: [start] }];
  const seen = new Map<string, number>();
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    for (let d = 0; d < 4; d++) {
      const turns = node.turns + (node.dir === -1 || node.dir === d ? 0 : 1);
      if (turns > 2) continue;
      const x = node.x + directions[d][0],
        y = node.y + directions[d][1];
      if (x < 0 || y < 0 || x > cols + 1 || y > rows + 1) continue;
      const path = [...node.path, { x, y }];
      if (x === end.x && y === end.y) return path;
      if (x >= 1 && x <= cols && y >= 1 && y <= rows && !tiles[(y - 1) * cols + x - 1].removed)
        continue;
      const key = `${x},${y},${d}`;
      if ((seen.get(key) ?? 3) <= turns) continue;
      seen.set(key, turns);
      queue.push({ x, y, dir: d, turns, path });
    }
  }
  return null;
}
export function findPair(
  tiles: Tile[],
  mode: MatchMode,
  cols = COLS,
  ordered = true,
): [number, number] | null {
  for (let a = 0; a < tiles.length; a++) {
    if (tiles[a].removed) continue;
    for (let b = 0; b < tiles.length; b++) {
      if (
        !tiles[b].removed &&
        matches(tiles[a], tiles[b], mode, tiles, ordered) &&
        findPath(tiles, a, b, cols)
      )
        return [a, b];
    }
  }
  return null;
}
export function playableShuffle(
  tiles: Tile[],
  mode: MatchMode,
  cols = COLS,
  ordered = true,
): Tile[] {
  const remaining = tiles.filter((t) => !t.removed);
  if (!remaining.length) return tiles;
  for (let i = 0; i < 80; i++) {
    const pool = shuffle(remaining);
    const result = tiles.map((t) => (t.removed ? t : pool.pop()!));
    if (findPair(result, mode, cols, ordered)) return result;
  }
  // Compact into adjacent pairs as a deterministic fallback; never leave an unwinnable board.
  const grouped = remaining.sort((a, b) => a.word.id.localeCompare(b.word.id) || a.side - b.side);
  return [...grouped, ...tiles.filter((t) => t.removed)];
}
