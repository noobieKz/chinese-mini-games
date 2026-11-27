/**
 * Course content shared by every game, the Cloudflare Worker and the Excel import script:
 * levels → numbered lessons → words, plus verb–noun collocations for Chém hoa quả.
 * Runs in the browser, in the Worker and in Node, so it has no platform imports.
 */
import { z } from 'zod';

export const GAME_IDS = ['ghep-chu', 'noi-tu', 'chem-hoa-qua', 'rong-san-chu'] as const;
export type GameId = (typeof GAME_IDS)[number];

const hanziPattern = /^[㐀-鿿豈-﫿]+$/;
const text = z.string().trim().min(1);

export const wordSchema = z.object({
  id: text,
  level: text,
  lesson: z.number().int().min(1),
  hanzi: text.regex(hanziPattern, 'chỉ được chứa chữ Hán'),
  pinyin: text,
  meaning: text,
  /** Empty: every game. Otherwise only the listed games use the word. */
  games: z.array(z.enum(GAME_IDS)).default([]),
});
export const lessonSchema = z.object({ number: z.number().int().min(1), title: z.string() });
export const levelSchema = z.object({ name: text, lessons: z.array(lessonSchema) });
export const collocationSchema = z.object({
  id: text,
  level: text,
  lesson: z.number().int().min(1),
  noun: text.regex(hanziPattern, 'chỉ được chứa chữ Hán'),
  verb: text.regex(hanziPattern, 'chỉ được chứa chữ Hán'),
  wrong: z.tuple([text, text]),
  pinyin: text,
  meaning: text,
});
export const bundleSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  levels: z.array(levelSchema),
  words: z.array(wordSchema),
  collocations: z.array(collocationSchema),
});
export type ContentWord = z.infer<typeof wordSchema>;
export type ContentLevel = z.infer<typeof levelSchema>;
export type Collocation = z.infer<typeof collocationSchema>;
export type ContentBundle = z.infer<typeof bundleSchema>;

/** One spreadsheet row of the "Từ vựng" sheet, as read from Excel or CSV (all cells as text). */
export type WordRow = {
  row: number;
  level?: string;
  lesson?: string;
  lessonTitle?: string;
  hanzi?: string;
  pinyin?: string;
  meaning?: string;
  games?: string;
};
/** One row of the "Ghép động từ" sheet. */
export type CollocationRow = {
  row: number;
  level?: string;
  lesson?: string;
  noun?: string;
  verb?: string;
  wrong1?: string;
  wrong2?: string;
  pinyin?: string;
  meaning?: string;
};
export type ContentIssue = {
  sheet: string;
  row: number;
  message: string;
  severity: 'error' | 'warning';
};

const clean = (value?: string) => (value ?? '').replace(/\s+/g, ' ').trim();
/** "HSK 1" → "hsk-1", stable for URLs and record keys. */
export const levelSlug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const HSK_LEVELS = Array.from({ length: 9 }, (_, index) => `HSK ${index + 1}`);

export function canonicalHskLevel(name: string) {
  const match = /^hsk[\s-]*([1-9])$/i.exec(name.trim());
  return match ? `HSK ${match[1]}` : null;
}

/** Preserve IDs and lesson membership when an old theme was stored as a level. */
export function normalizeHskLevels<T extends ContentBundle>(bundle: T): T {
  const source = new Map<string, Map<number, string>>();
  for (const { name, lessons } of bundle.levels) {
    source.set(name, new Map(lessons.map(({ number, title }) => [number, title])));
  }
  for (const item of [...bundle.words, ...bundle.collocations]) {
    const lessons = source.get(item.level) ?? new Map<number, string>();
    if (!lessons.has(item.lesson)) lessons.set(item.lesson, '');
    source.set(item.level, lessons);
  }
  const levels = new Map<string, Map<number, string>>();
  const mapping = new Map<string, Map<number, { level: string; lesson: number }>>();
  const ordered = [...source].sort(
    ([a], [b]) => Number(canonicalHskLevel(b) === b) - Number(canonicalHskLevel(a) === a),
  );
  for (const [name, originalLessons] of ordered) {
    const hsk = canonicalHskLevel(name);
    const level = hsk ?? 'HSK 1';
    const lessons = levels.get(level) ?? new Map<number, string>();
    const targets = new Map<number, { level: string; lesson: number }>();
    levels.set(level, lessons);
    mapping.set(name, targets);
    for (const [number, title] of originalLessons) {
      const lesson = hsk && !lessons.has(number) ? number : Math.max(0, ...lessons.keys()) + 1;
      const migratedTitle = hsk
        ? title
        : originalLessons.size === 1
          ? name
          : `${name} · ${title || `Bài ${number}`}`;
      lessons.set(lesson, migratedTitle);
      targets.set(number, { level, lesson });
    }
  }
  const move = <I extends { level: string; lesson: number }>(item: I) => ({
    ...item,
    ...mapping.get(item.level)?.get(item.lesson),
  });
  return {
    ...bundle,
    levels: [...levels]
      .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
      .map(([name, lessons]) => ({
        name,
        lessons: [...lessons]
          .sort(([a], [b]) => a - b)
          .map(([number, title]) => ({ number, title })),
      })),
    words: bundle.words.map(move),
    collocations: bundle.collocations.map(move),
  };
}

/**
 * Build a validated bundle from spreadsheet rows. Rows with errors are skipped and reported, so one
 * typo never blocks the whole upload; the caller decides whether errors should stop the import.
 */
export function buildBundle(
  wordRows: WordRow[],
  collocationRows: CollocationRow[] = [],
  updatedAt = new Date().toISOString(),
) {
  const issues: ContentIssue[] = [];
  const levels = new Map<string, Map<number, string>>();
  const words: ContentWord[] = [];
  const seen = new Map<string, number>();
  const lessonNumber = (sheet: string, row: number, value?: string) => {
    const number = Number(clean(value));
    if (!Number.isInteger(number) || number < 1) {
      issues.push({
        sheet,
        row,
        severity: 'error',
        message: `Cột "Bài" phải là số nguyên từ 1 (đang là "${clean(value)}").`,
      });
      return null;
    }
    return number;
  };
  for (const raw of wordRows) {
    const sheet = 'Từ vựng';
    if (!clean(raw.hanzi) && !clean(raw.meaning) && !clean(raw.pinyin)) continue; // blank line
    const level = clean(raw.level);
    const lesson = lessonNumber(sheet, raw.row, raw.lesson);
    const games = clean(raw.games)
      .split(/[,;]/)
      .map((g) => g.trim().toLowerCase())
      .filter(Boolean);
    const unknownGame = games.find((g) => !(GAME_IDS as readonly string[]).includes(g));
    if (unknownGame)
      issues.push({
        sheet,
        row: raw.row,
        severity: 'error',
        message: `Cột "Game" có "${unknownGame}" không hợp lệ. Dùng: ${GAME_IDS.join(', ')} hoặc để trống.`,
      });
    if (lesson === null || unknownGame) continue;
    const parsed = wordSchema.safeParse({
      id: `${levelSlug(level)}-${lesson}-${clean(raw.hanzi)}`,
      level,
      lesson,
      hanzi: clean(raw.hanzi).replace(/\s/g, ''),
      pinyin: clean(raw.pinyin),
      meaning: clean(raw.meaning),
      games,
    });
    if (!parsed.success) {
      const field: Record<string, string> = {
        level: 'Cấp độ',
        hanzi: 'Chữ Hán',
        pinyin: 'Pinyin',
        meaning: 'Nghĩa',
      };
      for (const issue of parsed.error.issues)
        issues.push({
          sheet,
          row: raw.row,
          severity: 'error',
          message: `Cột "${field[String(issue.path[0])] ?? issue.path[0]}": ${issue.code === 'too_small' ? 'đang để trống' : issue.message}.`,
        });
      continue;
    }
    const word = parsed.data;
    const key = `${word.level}|${word.lesson}|${word.hanzi}`;
    if (seen.has(key)) {
      issues.push({
        sheet,
        row: raw.row,
        severity: 'warning',
        message: `${word.hanzi} đã có ở dòng ${seen.get(key)} cùng bài; bỏ qua dòng này.`,
      });
      continue;
    }
    seen.set(key, raw.row);
    const lessons = levels.get(level) ?? new Map<number, string>();
    levels.set(level, lessons);
    const title = clean(raw.lessonTitle);
    const known = lessons.get(lesson);
    if (known === undefined || (!known && title)) lessons.set(lesson, title);
    else if (title && known && title !== known)
      issues.push({
        sheet,
        row: raw.row,
        severity: 'warning',
        message: `Bài ${lesson} (${level}) có hai tên: "${known}" và "${title}"; dùng "${known}".`,
      });
    words.push(word);
  }

  const collocations: Collocation[] = [];
  for (const raw of collocationRows) {
    const sheet = 'Ghép động từ';
    if (!clean(raw.noun) && !clean(raw.verb)) continue;
    const lesson = lessonNumber(sheet, raw.row, raw.lesson);
    if (lesson === null) continue;
    const verb = clean(raw.verb),
      wrong: [string, string] = [clean(raw.wrong1), clean(raw.wrong2)];
    if (new Set([verb, ...wrong]).size < 3) {
      issues.push({
        sheet,
        row: raw.row,
        severity: 'error',
        message: 'Động từ đúng và hai động từ sai phải khác nhau.',
      });
      continue;
    }
    const parsed = collocationSchema.safeParse({
      id: `cl-${levelSlug(clean(raw.level))}-${lesson}-${verb}${clean(raw.noun)}`,
      level: clean(raw.level),
      lesson,
      noun: clean(raw.noun),
      verb,
      wrong,
      pinyin: clean(raw.pinyin),
      meaning: clean(raw.meaning),
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        issues.push({
          sheet,
          row: raw.row,
          severity: 'error',
          message: `Cột ${String(issue.path[0])}: ${issue.code === 'too_small' ? 'đang để trống' : issue.message}.`,
        });
      continue;
    }
    collocations.push(parsed.data);
  }

  const bundle: ContentBundle = {
    version: 1,
    updatedAt,
    levels: [...levels].map(([name, lessons]) => ({
      name,
      lessons: [...lessons].sort(([a], [b]) => a - b).map(([number, title]) => ({ number, title })),
    })),
    words,
    collocations,
  };
  return { bundle, issues };
}

/** Accept a downloaded bundle only when it matches the schema; otherwise the game keeps its sample. */
export function parseBundle(data: unknown): ContentBundle | null {
  const result = bundleSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * What the player picked: a whole level, one lesson, or every lesson up to one (review).
 * Encoded as "all", "lesson:3" or "upto:3" for selects and links.
 */
export type Scope =
  { level: string; range: 'all' } | { level: string; range: 'lesson' | 'upto'; lesson: number };
export const scopeKey = (scope: Scope) =>
  scope.range === 'all' ? 'all' : `${scope.range}:${scope.lesson}`;
export function parseScopeKey(level: string, key: string): Scope {
  const [range, value] = key.split(':');
  const lesson = Number(value);
  return (range === 'lesson' || range === 'upto') && Number.isInteger(lesson) && lesson > 0
    ? { level, range, lesson }
    : { level, range: 'all' };
}

/** Words a game may use: 2-character words only for Ghép chữ, and the optional per-game filter. */
export function usableWords(bundle: ContentBundle, game: GameId) {
  return bundle.words.filter(
    (w) =>
      (!w.games.length || w.games.includes(game)) &&
      (game !== 'ghep-chu' || [...w.hanzi].length === 2),
  );
}
export function selectWords(bundle: ContentBundle, scope: Scope, game: GameId) {
  const seen = new Set<string>();
  return usableWords(bundle, game).filter((w) => {
    const included =
      w.level === scope.level &&
      (scope.range === 'all' ||
        (scope.range === 'lesson' ? w.lesson === scope.lesson : w.lesson <= scope.lesson));
    if (!included || seen.has(w.hanzi)) return false;
    seen.add(w.hanzi);
    return true;
  });
}
export function selectCollocations(bundle: ContentBundle, scope: Scope) {
  return bundle.collocations.filter(
    (c) =>
      c.level === scope.level &&
      (scope.range === 'all' ||
        (scope.range === 'lesson' ? c.lesson === scope.lesson : c.lesson <= scope.lesson)),
  );
}
/** Smallest word count each game can build a round from. */
export const MIN_WORDS: Record<GameId, number> = {
  'ghep-chu': 2,
  'noi-tu': 2,
  'chem-hoa-qua': 3,
  'rong-san-chu': 2,
};
