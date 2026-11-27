import { z } from 'zod';
import {
  buildBundle,
  bundleSchema,
  canonicalHskLevel,
  normalizeHskLevels,
  GAME_IDS,
  levelSlug,
  MIN_WORDS,
  selectWords,
  wordSchema,
  type ContentBundle,
} from './content';

export const topicIds = ['tea', 'clothes', 'train', 'restaurant', 'library'] as const;
export type TopicId = (typeof topicIds)[number];
export const teaChoiceCounts = { size: 3, drink: 8, topping: 7, ice: 5, sugar: 5 } as const;
const choice = (field: keyof typeof teaChoiceCounts) =>
  z
    .number()
    .int()
    .min(0)
    .max(teaChoiceCounts[field] - 1);
export const answerSchema = z.object({
  drink: choice('drink'),
  ice: choice('ice'),
  sugar: choice('sugar'),
  size: choice('size').optional(),
  topping: choice('topping').optional(),
});
const line = (limit: number) => z.string().trim().min(1).max(limit);
const scenarioFields = z.object({
  topic: z.enum(topicIds),
  hanzi: line(160).regex(/\p{Script=Han}/u, 'Câu cần có chữ Hán.'),
  meaning: line(250),
  answer: answerSchema,
});
export const scenarioSchema = scenarioFields.extend({ id: line(80) });

const wordChangeSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('edit'),
    original: wordSchema,
    values: z.object({
      hanzi: wordSchema.shape.hanzi.max(30),
      pinyin: line(120),
      meaning: line(200),
    }),
  }),
  z.object({
    action: z.literal('remove'),
    original: wordSchema,
    game: z.enum(GAME_IDS).optional(),
  }),
]);

export type WordChange = z.infer<typeof wordChangeSchema>;

const hskName = line(60)
  .transform((value) => canonicalHskLevel(value) ?? value)
  .refine((value) => canonicalHskLevel(value) === value, 'Chọn cấp độ HSK 1–9.');
const newLessonSchema = z.object({
  level: hskName,
  number: z.number().int().min(1).max(999),
  title: line(100),
});

export const lessonDraftSchema = z
  .object({
    newLevels: z.array(hskName).max(9).default([]),
    newLessons: z.array(newLessonSchema).max(300).default([]),
    words: z
      .array(
        z.object({
          level: line(60),
          lesson: z.number().int().min(1).max(999),
          lessonTitle: z.string().trim().max(100),
          hanzi: line(30),
          pinyin: line(120),
          meaning: line(200),
          games: z.array(z.enum(GAME_IDS)).max(GAME_IDS.length),
        }),
      )
      .max(300),
    scenarios: z.array(scenarioFields).max(100),
    wordChanges: z.array(wordChangeSchema).max(300).default([]),
  })
  .refine(
    (draft) =>
      draft.newLevels.length +
        draft.newLessons.length +
        draft.words.length +
        draft.scenarios.length +
        draft.wordChanges.length >
      0,
    'Chưa có nội dung để kiểm tra.',
  );

export type LessonDraft = z.infer<typeof lessonDraftSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type PublishedContent = ContentBundle & { scenarios?: Scenario[] };
const publishedSchema = bundleSchema.extend({ scenarios: z.array(scenarioSchema).optional() });

export function preparePublication(base: PublishedContent, draft: unknown, now: string) {
  const parsed = lessonDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map(({ path, message }) => {
        const [group, index] = path;
        return typeof index === 'number'
          ? `${group === 'words' ? 'Từ vựng' : group === 'newLevels' ? 'Cấp độ' : group === 'newLessons' ? 'Bài học' : 'Câu theo chủ đề'} · dòng ${index + 1}: ${message}`
          : message;
      }),
      warnings: [],
    };
  }
  const existing = new Map(base.levels.map((level) => [levelSlug(level.name), level.name]));
  const keyOf = (word: { level: string; lesson: number; hanzi: string }) =>
    `${levelSlug(word.level)}:${word.lesson}:${word.hanzi}`;
  const changed = new Map(base.words.map((word) => [word.id, word]));
  const processed = new Set<string>();
  const editedKeys = new Set<string>();
  const issues: string[] = [];
  for (const { original, ...change } of parsed.data.wordChanges) {
    const current = changed.get(original.id);
    if (
      !current ||
      processed.has(original.id) ||
      JSON.stringify(wordSchema.parse(current)) !== JSON.stringify(original)
    ) {
      issues.push(
        `Từ ${original.hanzi} đã thay đổi. Hãy tải lại danh sách và chọn lại từ cần sửa.`,
      );
      continue;
    }
    processed.add(original.id);
    if (change.action === 'edit') {
      if (
        current.games.length === 1 &&
        current.games[0] === 'ghep-chu' &&
        [...change.values.hanzi].length !== 2
      ) {
        issues.push(`Từ ${change.values.hanzi} cần đúng hai chữ Hán cho game Ghép chữ.`);
        continue;
      }
      const edited = { ...current, ...change.values };
      changed.set(original.id, edited);
      editedKeys.add(keyOf(edited));
      continue;
    }
    const games = current.games.length ? current.games : GAME_IDS;
    if (change.game && !games.includes(change.game)) {
      issues.push(`Từ ${original.hanzi} chưa được dùng trong game đã chọn.`);
      continue;
    }
    const remaining = change.game ? games.filter((game) => game !== change.game) : [];
    if (remaining.length) changed.set(original.id, { ...current, games: remaining });
    else changed.delete(original.id);
  }
  const seen = new Set<string>();
  for (const word of changed.values()) {
    const key = keyOf(word);
    if (seen.has(key) && editedKeys.has(key))
      issues.push(`Từ ${word.hanzi} bị trùng trong ${word.level} · Bài ${word.lesson}.`);
    seen.add(key);
  }
  const words = parsed.data.words.map((word, index) => {
    const canonical = canonicalHskLevel(word.level);
    if (!canonical) issues.push(`Từ vựng · dòng ${index + 1}: Chọn cấp độ HSK 1–9.`);
    const slug = levelSlug(canonical ?? word.level);
    const key = keyOf({
      ...word,
      level: canonical ?? word.level,
      hanzi: word.hanzi.replace(/\s/g, ''),
    });
    if (seen.has(key))
      issues.push(`Từ vựng · dòng ${index + 1}: ${word.hanzi} đã có trong bài này.`);
    seen.add(key);
    if (
      word.games.length === 1 &&
      word.games[0] === 'ghep-chu' &&
      [...word.hanzi.replace(/\s/g, '')].length !== 2
    )
      issues.push(`Từ vựng · dòng ${index + 1}: Ghép chữ yêu cầu từ gồm đúng hai chữ Hán.`);
    const level = existing.get(slug) ?? canonical ?? word.level;
    existing.set(slug, level);
    return {
      ...word,
      level,
      row: index + 1,
      lesson: String(word.lesson),
      games: word.games.join(','),
    };
  });
  const built = buildBundle(words, [], now);
  issues.push(
    ...built.issues
      .filter((issue) => issue.severity === 'error')
      .map((issue) => `Từ vựng · dòng ${issue.row}: ${issue.message}`),
  );
  const keys = new Set(
    (base.scenarios ?? []).map((scenario) => `${scenario.topic}:${scenario.hanzi}`),
  );
  const nextScenarios = parsed.data.scenarios.map((scenario, index) => {
    const key = `${scenario.topic}:${scenario.hanzi}`;
    const { drink, ice, sugar, size, topping } = scenario.answer;
    if ((size === undefined) !== (topping === undefined))
      issues.push(`Câu theo chủ đề · dòng ${index + 1}: Cần điền đủ hai mục bổ sung.`);
    if (scenario.topic !== 'tea' && Math.max(drink, ice, sugar, size ?? 0, topping ?? 0) > 2)
      issues.push(`Câu theo chủ đề · dòng ${index + 1}: Đáp án không thuộc bộ lựa chọn của game.`);
    if (keys.has(key))
      issues.push(`Câu theo chủ đề · dòng ${index + 1}: Câu này đã có trong chủ đề.`);
    keys.add(key);
    return { ...scenario, id: crypto.randomUUID() };
  });
  if (issues.length) return { issues, warnings: [] };

  const levels = new Map(
    base.levels.map((level) => [
      level.name,
      new Map(level.lessons.map((lesson) => [lesson.number, lesson.title])),
    ]),
  );
  for (const level of parsed.data.newLevels) {
    if (levels.has(level)) issues.push(`${level} đã có trong kho.`);
    else levels.set(level, new Map());
  }
  for (const lesson of parsed.data.newLessons) {
    const lessons = levels.get(lesson.level);
    if (!lessons) issues.push(`Chưa có cấp độ ${lesson.level} cho bài ${lesson.title}.`);
    else if (lessons.has(lesson.number)) issues.push(`${lesson.level} đã có Bài ${lesson.number}.`);
    else lessons.set(lesson.number, lesson.title);
  }
  if (issues.length) return { issues, warnings: [] };
  for (const level of built.bundle.levels) {
    const lessons = levels.get(level.name) ?? new Map<number, string>();
    levels.set(level.name, lessons);
    for (const lesson of level.lessons) {
      if (lesson.title || !lessons.has(lesson.number)) lessons.set(lesson.number, lesson.title);
    }
  }
  const bundle: PublishedContent = {
    ...base,
    updatedAt: now,
    levels: [...levels].map(([name, lessons]) => ({
      name,
      lessons: [...lessons].sort(([a], [b]) => a - b).map(([number, title]) => ({ number, title })),
    })),
    words: [
      ...changed.values(),
      ...built.bundle.words.map((word) => ({ ...word, id: crypto.randomUUID() })),
    ],
    scenarios: [...(base.scenarios ?? []), ...nextScenarios],
  };
  const affected = new Map(
    [...built.bundle.words, ...parsed.data.wordChanges.map(({ original }) => original)].map(
      (word) => [`${word.level}:${word.lesson}`, word],
    ),
  );
  const warnings = [...affected.values()].flatMap((word) => {
    const scope = { level: word.level, range: 'lesson' as const, lesson: Number(word.lesson) };
    const names = {
      'ghep-chu': 'Ghép chữ thành từ',
      'noi-tu': 'Nối từ với nghĩa',
      'chem-hoa-qua': 'Chém hoa quả',
      'rong-san-chu': 'Rồng săn chữ',
    };
    return GAME_IDS.flatMap((id) => {
      const count = selectWords(bundle, scope, id).length;
      return (count > 0 || !word.games.length || word.games.includes(id)) && count < MIN_WORDS[id]
        ? [
            `${word.level} · Bài ${word.lesson}: ${names[id]} hiện có ${count}/${MIN_WORDS[id]} từ phù hợp.`,
          ]
        : [];
    });
  });
  return { bundle, issues, warnings };
}

export function parsePublishedContent(input: unknown): PublishedContent | null {
  const base = publishedSchema.safeParse(input);
  return base.success ? normalizeHskLevels(base.data) : null;
}
