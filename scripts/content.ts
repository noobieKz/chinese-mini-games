/**
 * Course content tool: Excel (or CSV) → validated JSON → Cloudflare KV.
 *
 *   npm run content -- template              Write the Excel template (content/mau-tu-vung.xlsx)
 *   npm run content -- check <file.xlsx>     Validate only, list problems by sheet and row
 *   npm run content -- build <file.xlsx>     Validate and write content/content.json
 *   npm run content -- upload                Upload content/content.json to Cloudflare KV (live)
 *
 * Rows with errors are reported; build refuses to write while any error remains, so the live games
 * never receive half-checked data. Warnings (duplicates, two titles for one lesson) do not block.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import ExcelJS from 'exceljs';
import {
  buildBundle,
  GAME_IDS,
  type CollocationRow,
  type ContentIssue,
  type WordRow,
} from '../shared/content';
import { sampleCollocationRows, sampleWordRows } from '../src/content/sample';

const OUT = resolve('content/content.json');
const TEMPLATE = resolve('content/mau-tu-vung.xlsx');
const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const WORD_COLUMNS = {
  level: ['cap do'],
  lesson: ['bai'],
  lessonTitle: ['ten bai'],
  hanzi: ['chu han'],
  pinyin: ['pinyin'],
  meaning: ['nghia'],
  games: ['game'],
} as const;
const COLLOCATION_COLUMNS = {
  level: ['cap do'],
  lesson: ['bai'],
  noun: ['danh tu'],
  verb: ['dong tu dung'],
  wrong1: ['dong tu sai 1'],
  wrong2: ['dong tu sai 2'],
  pinyin: ['pinyin'],
  meaning: ['nghia'],
} as const;

function readSheet<K extends string>(
  sheet: ExcelJS.Worksheet,
  columns: Record<K, readonly string[]>,
): ({ row: number } & Partial<Record<K, string>>)[] {
  const header = sheet.getRow(1);
  const index = {} as Record<K, number>;
  header.eachCell((cell, col) => {
    const name = plain(cell.text);
    for (const [key, names] of Object.entries(columns) as [K, readonly string[]][])
      if (names.includes(name)) index[key] = col;
  });
  const missing = (Object.keys(columns) as K[]).filter(
    (k) => !index[k] && k !== 'games' && k !== 'lessonTitle',
  );
  if (missing.length)
    throw new Error(
      `Trang "${sheet.name}" thiếu cột: ${missing.join(', ')}. Dòng 1 phải là tên cột như file mẫu.`,
    );
  const rows: ({ row: number } & Partial<Record<K, string>>)[] = [];
  sheet.eachRow((row, number) => {
    if (number === 1) return;
    const values = { row: number } as { row: number } & Partial<Record<K, string>>;
    for (const key of Object.keys(index) as K[])
      (values as Record<K, string>)[key] = row.getCell(index[key]).text;
    rows.push(values);
  });
  return rows;
}

async function readWorkbook(file: string) {
  if (!existsSync(file)) throw new Error(`Không tìm thấy file ${file}`);
  const workbook = new ExcelJS.Workbook();
  if (extname(file).toLowerCase() === '.csv') {
    await workbook.csv.readFile(file);
    return {
      words: readSheet(workbook.worksheets[0], WORD_COLUMNS) as WordRow[],
      collocations: [],
    };
  }
  await workbook.xlsx.readFile(file);
  const find = (name: string) => workbook.worksheets.find((s) => plain(s.name) === name);
  const wordSheet = find('tu vung') ?? workbook.worksheets[0];
  const collocationSheet = find('ghep dong tu');
  return {
    words: readSheet(wordSheet, WORD_COLUMNS) as WordRow[],
    collocations: collocationSheet
      ? (readSheet(collocationSheet, COLLOCATION_COLUMNS) as CollocationRow[])
      : [],
  };
}

function report(issues: ContentIssue[]) {
  for (const issue of issues)
    console.log(
      `${issue.severity === 'error' ? 'LỖI ' : 'Lưu ý'}  [${issue.sheet}] dòng ${issue.row}: ${issue.message}`,
    );
  const errors = issues.filter((i) => i.severity === 'error').length;
  console.log(
    errors
      ? `\n${errors} lỗi, ${issues.length - errors} lưu ý. Sửa các dòng LỖI rồi chạy lại.`
      : `\nKhông có lỗi${issues.length ? `, ${issues.length} lưu ý` : ''}.`,
  );
  return errors;
}

async function writeTemplate() {
  const workbook = new ExcelJS.Workbook();
  const style = (sheet: ExcelJS.Worksheet) => {
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  };
  const words = workbook.addWorksheet('Từ vựng');
  words.columns = [
    { header: 'Cấp độ', width: 10 },
    { header: 'Bài', width: 6 },
    { header: 'Tên bài', width: 26 },
    { header: 'Chữ Hán', width: 12 },
    { header: 'Pinyin', width: 16 },
    { header: 'Nghĩa', width: 22 },
    { header: 'Game', width: 24 },
  ];
  for (const r of sampleWordRows)
    words.addRow([r.level, Number(r.lesson), r.lessonTitle, r.hanzi, r.pinyin, r.meaning, r.games]);
  style(words);
  const collocations = workbook.addWorksheet('Ghép động từ');
  collocations.columns = [
    { header: 'Cấp độ', width: 10 },
    { header: 'Bài', width: 6 },
    { header: 'Danh từ', width: 12 },
    { header: 'Động từ đúng', width: 14 },
    { header: 'Động từ sai 1', width: 14 },
    { header: 'Động từ sai 2', width: 14 },
    { header: 'Pinyin', width: 18 },
    { header: 'Nghĩa', width: 22 },
  ];
  for (const r of sampleCollocationRows)
    collocations.addRow([
      r.level,
      Number(r.lesson),
      r.noun,
      r.verb,
      r.wrong1,
      r.wrong2,
      r.pinyin,
      r.meaning,
    ]);
  style(collocations);
  const guide = workbook.addWorksheet('Hướng dẫn');
  guide.columns = [{ width: 110 }];
  [
    'HƯỚNG DẪN NHẬP TỪ VỰNG CHO GAME HANPLAY',
    '',
    'Trang "Từ vựng": mỗi dòng là một từ. Giữ nguyên dòng 1 (tên cột).',
    '• Cấp độ: ví dụ HSK 1. Viết giống nhau cho cùng một cấp độ.',
    '• Bài: số bài trong cấp độ, bắt đầu từ 1.',
    '• Tên bài: chỉ cần ghi ở dòng đầu của mỗi bài, các dòng sau để trống.',
    '• Chữ Hán: chỉ chữ Hán, không dấu cách, không pinyin.',
    '• Pinyin, Nghĩa: bắt buộc.',
    `• Game (không bắt buộc): để trống = dùng ở mọi game. Muốn giới hạn thì ghi mã game, cách nhau bằng dấu phẩy: ${GAME_IDS.join(', ')}.`,
    '• Game "Ghép chữ thành từ" chỉ dùng từ có đúng 2 chữ Hán; các game khác dùng mọi từ.',
    '',
    'Trang "Ghép động từ" (cho Chém hoa quả): mỗi dòng là một cụm động từ + danh từ.',
    '• Động từ đúng và hai động từ sai phải khác nhau. Pinyin, Nghĩa là của cả cụm (ví dụ "dǎ lánqiú", "chơi bóng rổ").',
    '',
    'Mỗi bài nên có ít nhất 3 từ; bài ít từ hơn vẫn chơi được ở chế độ "Ôn đến bài".',
  ].forEach((line) => guide.addRow([line]));
  guide.getRow(1).font = { bold: true, size: 13 };
  mkdirSync(resolve('content'), { recursive: true });
  await workbook.xlsx.writeFile(TEMPLATE);
  console.log(`Đã tạo file mẫu: ${TEMPLATE}`);
}

async function main() {
  const [command, file] = process.argv.slice(2);
  if (command === 'template') return writeTemplate();
  if (command === 'check' || command === 'build') {
    if (!file) throw new Error(`Thiếu đường dẫn file: npm run content -- ${command} <file.xlsx>`);
    const rows = await readWorkbook(resolve(file));
    const { bundle, issues } = buildBundle(rows.words, rows.collocations);
    const errors = report(issues);
    for (const level of bundle.levels)
      console.log(
        `${level.name}: ${level.lessons.length} bài, ${bundle.words.filter((w) => w.level === level.name).length} từ`,
      );
    console.log(`Ghép động từ: ${bundle.collocations.length} cụm`);
    if (errors) process.exitCode = 1;
    else if (command === 'build') {
      mkdirSync(resolve('content'), { recursive: true });
      writeFileSync(OUT, JSON.stringify(bundle, null, 2) + '\n');
      console.log(`Đã ghi ${OUT}. Chạy "npm run content -- upload" để đưa lên Cloudflare.`);
    }
    return;
  }
  if (command === 'upload') {
    if (!existsSync(OUT)) throw new Error('Chưa có content/content.json. Chạy build trước.');
    JSON.parse(readFileSync(OUT, 'utf8'));
    execFileSync(
      'npx',
      [
        'wrangler',
        'kv',
        'key',
        'put',
        'content',
        '--path',
        OUT,
        '--binding',
        'CONTENT',
        '--remote',
      ],
      { stdio: 'inherit', shell: process.platform === 'win32' },
    );
    console.log('Đã tải lên Cloudflare. Game nhận dữ liệu mới trong khoảng 1 phút.');
    return;
  }
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
