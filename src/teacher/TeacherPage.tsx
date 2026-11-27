import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, BookOpen, LogOut } from 'lucide-react';
import type { AuthView } from '../../shared/auth';
import { GAME_IDS, HSK_LEVELS, type ContentWord, type GameId } from '../../shared/content';
import {
  lessonDraftSchema,
  type TopicId,
  type LessonDraft,
  type PublishedContent,
  type WordChange,
} from '../../shared/lesson-editor';
import { Select } from '../components/Select';
import {
  SCENARIO_GAME_NAME,
  SCENARIO_GAME_ROUTE,
  topics,
  orderControls,
  orderAnswerLabels,
  type Recipe,
} from '../games/milk-tea/orders';
import { TopicPicker } from '../games/milk-tea/TopicPicker';
import './teacher.css';

const gameNames: Record<GameId, string> = {
  'ghep-chu': 'Ghép chữ thành từ',
  'noi-tu': 'Nối từ với nghĩa',
  'chem-hoa-qua': 'Chém hoa quả',
  'rong-san-chu': 'Rồng săn chữ',
};
const blankDraft: LessonDraft = {
  newLevels: [],
  newLessons: [],
  words: [],
  scenarios: [],
  wordChanges: [],
};
const draftKey = (id: string) => `hanplay.lesson-draft.${id}`;
const explanation = (message: unknown) =>
  message instanceof Error ? message.message : 'Có lỗi xảy ra. Hãy thử lại.';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.error ?? data?.issues?.join(' · ') ?? 'Máy chủ chưa sẵn sàng. Hãy thử lại.',
    );
  return data as T;
}

function post(data: unknown, csrf?: string) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    body: JSON.stringify(data),
  };
}

export function TeacherPage() {
  const [auth, setAuth] = useState<AuthView | null>(null);
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<AuthView>('/api/auth/session', { signal: controller.signal })
      .then(setAuth)
      .catch((e) => {
        if (!controller.signal.aborted) setError(explanation(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true);
      });
    return () => controller.abort();
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<AuthView>('/api/auth/password', post({ username, password }));
      setAuth(result);
      setPassword('');
    } catch (e) {
      setError(explanation(e));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setError('');
    setBusy(true);
    try {
      await api('/api/auth/logout', post({}, auth?.csrfToken));
      setAuth(null);
    } catch (e) {
      setError(explanation(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="teacher-workspace">
      <header className="teacher-top">
        <a href="/games">
          <ArrowLeft size={18} /> Về sảnh game
        </a>
        {auth?.teacher && (
          <button className="teacher-secondary" onClick={() => void logout()} disabled={busy}>
            <LogOut size={17} /> Đăng xuất
          </button>
        )}
      </header>
      <div className="teacher-title">
        <BookOpen aria-hidden="true" size={29} />
        <h1>Quản lý bài học</h1>
      </div>
      {error && (
        <p role="alert" className="teacher-error">
          {error}
        </p>
      )}
      {!ready ? (
        <p role="status">Đang kiểm tra phiên đăng nhập…</p>
      ) : auth?.teacher && auth.csrfToken ? (
        <LessonEditor key={auth.teacher.id} userId={auth.teacher.id} csrf={auth.csrfToken} />
      ) : (
        <form className="teacher-card teacher-login-form" onSubmit={(e) => void login(e)}>
          <h2>Đăng nhập</h2>
          <label>
            Tên người dùng
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="teacher-primary" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      )}
    </main>
  );
}

type Preview = { issues: string[]; warnings: string[]; revision: string };
type LessonEntry = LessonDraft['newLessons'][number];
type WordDraft = LessonDraft['words'][number];
type ScenarioDraft = LessonDraft['scenarios'][number];

function LessonEditor({ userId, csrf }: { userId: string; csrf: string }) {
  const [draft, setDraft] = useState<LessonDraft>(() => {
    try {
      const saved = lessonDraftSchema.safeParse(
        JSON.parse(localStorage.getItem(draftKey(userId)) ?? 'null'),
      );
      return saved.success ? saved.data : blankDraft;
    } catch {
      return blankDraft;
    }
  });
  const [published, setPublished] = useState<PublishedContent | null>(null);
  const [scope, setScope] = useState('');
  const scenarioGame = scope === SCENARIO_GAME_ROUTE;
  const vocabularyGame = GAME_IDS.find((id) => id === scope);
  const [topic, setTopic] = useState<TopicId | ''>('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const count =
    draft.newLevels.length +
    draft.newLessons.length +
    draft.words.length +
    draft.scenarios.length +
    draft.wordChanges.length;
  const path = '/api/teacher/lessons';

  useEffect(() => {
    const controller = new AbortController();
    api<PublishedContent>(path, { signal: controller.signal })
      .then(setPublished)
      .catch((e) => {
        if (!controller.signal.aborted) setError(explanation(e));
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(userId), JSON.stringify(draft));
    } catch {
      /* Browser storage is optional. */
    }
  }, [draft, userId]);

  const changeDraft = (next: LessonDraft) => {
    if (
      next.newLessons.length > 300 ||
      next.words.length > 300 ||
      next.scenarios.length > 100 ||
      next.wordChanges.length > 300
    ) {
      setError('Bản nháp đã đạt giới hạn. Hãy xuất bản theo nhiều đợt.');
      return;
    }
    setDraft(next);
    setPreview(null);
    setMessage('');
    setError('');
  };

  const submit = async (publish: boolean) => {
    setError('');
    setMessage('');
    setBusy(true);
    if (!publish) setPreview(null);
    try {
      const request = post({ draft, publish, revision: preview?.revision }, csrf);
      if (publish) {
        const result = await api<{ content: PublishedContent }>(path, request);
        setPublished(result.content);
        changeDraft(blankDraft);
        setMessage(`Đã xuất bản ${count} mục. Học viên sẽ thấy khi mở lại game.`);
      } else {
        setPreview(await api<Preview>(path, request));
      }
    } catch (e) {
      setPreview(null);
      setError(explanation(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {published && (
        <p className="teacher-summary">
          Đã xuất bản <strong>{published.words.length}</strong> từ và{' '}
          <strong>{published.scenarios?.length ?? 0}</strong> câu do giáo viên soạn.
        </p>
      )}
      <fieldset className="teacher-editor" disabled={busy}>
        <section className="teacher-card">
          <div className="teacher-fields">
            <div className="teacher-select-field">
              <label htmlFor="teacher-game">1. Game</label>
              <Select
                id="teacher-game"
                aria-label="1. Game"
                value={scope}
                onValueChange={(value) => {
                  setScope(value);
                  setTopic('');
                }}
              >
                <option value="" disabled>
                  Chọn game
                </option>
                {GAME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {gameNames[id]}
                  </option>
                ))}
                <option value={SCENARIO_GAME_ROUTE}>{SCENARIO_GAME_NAME}</option>
              </Select>
            </div>
            {scenarioGame && (
              <TopicPicker id="teacher-topic" label="2. Chủ đề" value={topic} onChange={setTopic} />
            )}
          </div>
        </section>
        {scenarioGame && topic && (
          <ScenarioForm
            key={topic}
            topic={topic}
            published={published}
            onAdd={(scenario) =>
              changeDraft({ ...draft, scenarios: [...draft.scenarios, scenario] })
            }
          />
        )}
        {vocabularyGame && (
          <VocabularyEditor
            key={vocabularyGame}
            game={vocabularyGame}
            published={published}
            pending={draft.wordChanges}
            newLevels={draft.newLevels}
            newLessons={draft.newLessons}
            onAddLevel={(level) =>
              changeDraft({ ...draft, newLevels: [...draft.newLevels, level] })
            }
            onAddLesson={(lesson) =>
              changeDraft({ ...draft, newLessons: [...draft.newLessons, lesson] })
            }
            onAdd={(words) => changeDraft({ ...draft, words: [...draft.words, ...words] })}
            onChange={(change) =>
              changeDraft({ ...draft, wordChanges: [...draft.wordChanges, change] })
            }
          />
        )}
        <section className="teacher-card">
          <h2>
            Bản nháp <span className="teacher-count">{count}</span>
          </h2>
          {count === 0 && <p>Thêm cấp độ, bài học, từ hoặc câu để xem trước khi xuất bản.</p>}
          {draft.newLevels.map((level) => (
            <div key={level} className="teacher-draft-row">
              <strong>Thêm cấp độ · {level}</strong>
              <button
                className="teacher-secondary"
                disabled={
                  draft.newLessons.some((lesson) => lesson.level === level) ||
                  draft.words.some((word) => word.level === level)
                }
                onClick={() =>
                  changeDraft({
                    ...draft,
                    newLevels: draft.newLevels.filter((name) => name !== level),
                  })
                }
              >
                Bỏ cấp độ
              </button>
            </div>
          ))}
          {draft.newLessons.map((lesson) => (
            <div key={`${lesson.level}:${lesson.number}`} className="teacher-draft-row">
              <strong>
                {lesson.level} · Bài {lesson.number} · {lesson.title}
              </strong>
              <button
                className="teacher-secondary"
                disabled={draft.words.some(
                  (word) => word.level === lesson.level && word.lesson === lesson.number,
                )}
                onClick={() =>
                  changeDraft({
                    ...draft,
                    newLessons: draft.newLessons.filter((item) => item !== lesson),
                  })
                }
              >
                Bỏ bài
              </button>
            </div>
          ))}
          {draft.words.map((row, i) => (
            <div className="teacher-draft-row" key={`word-${i}`}>
              <div>
                <strong lang="zh-Hans">{row.hanzi}</strong> · {row.pinyin} · {row.meaning}
                <small>
                  {row.level} · Bài {row.lesson}
                  {row.lessonTitle && ` · ${row.lessonTitle}`}
                </small>
                <small>
                  {row.games.length
                    ? row.games.map((game) => gameNames[game]).join(' · ')
                    : 'Dùng chung cho mọi game từ vựng'}
                </small>
              </div>
              <button
                className="teacher-secondary"
                onClick={() =>
                  changeDraft({ ...draft, words: draft.words.filter((_, index) => index !== i) })
                }
              >
                Bỏ từ
              </button>
            </div>
          ))}
          {draft.wordChanges.map((change) => (
            <div className="teacher-draft-row" key={change.original.id}>
              <div>
                <strong>{change.action === 'edit' ? 'Sửa từ' : 'Gỡ từ'}</strong>{' '}
                <span lang="zh-Hans">{change.original.hanzi}</span>
                {change.action === 'edit' && (
                  <>
                    {' '}
                    → <span lang="zh-Hans">{change.values.hanzi}</span> · {change.values.pinyin} ·{' '}
                    {change.values.meaning}
                  </>
                )}
                {change.action === 'remove' && change.game && <> · {gameNames[change.game]}</>}
              </div>
              <button
                className="teacher-secondary"
                onClick={() =>
                  changeDraft({
                    ...draft,
                    wordChanges: draft.wordChanges.filter(
                      (item) => item.original.id !== change.original.id,
                    ),
                  })
                }
              >
                Bỏ thay đổi
              </button>
            </div>
          ))}
          {draft.scenarios.map((row, i) => (
            <div className="teacher-draft-row" key={`scenario-${i}`}>
              <div>
                <strong lang="zh-Hans">{row.hanzi}</strong> · {row.meaning}
                <small>
                  {topics[row.topic].name} · {orderAnswerLabels(row.answer, row.topic).join(' · ')}
                </small>
              </div>
              <button
                className="teacher-secondary"
                onClick={() =>
                  changeDraft({
                    ...draft,
                    scenarios: draft.scenarios.filter((_, index) => index !== i),
                  })
                }
              >
                Bỏ câu
              </button>
            </div>
          ))}
          {preview && (
            <div role="status" className="teacher-review">
              <strong>
                {preview.issues.length ? 'Cần sửa trước khi xuất bản' : 'Bản nháp đã qua kiểm tra'}
              </strong>
              {(preview.issues.length > 0 || preview.warnings.length > 0) && (
                <ul>
                  {[...preview.issues, ...preview.warnings].map((entry, i) => (
                    <li key={i}>{entry}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {message && <p role="status">{message}</p>}
          {error && (
            <p role="alert" className="teacher-error">
              {error}
            </p>
          )}
          <div className="teacher-actions">
            <button
              className="teacher-secondary"
              disabled={!count}
              onClick={() => void submit(false)}
            >
              Kiểm tra bản nháp
            </button>
            <button
              className="teacher-primary"
              disabled={!preview || preview.issues.length > 0}
              onClick={() => void submit(true)}
            >
              Xuất bản
            </button>
          </div>
        </section>
      </fieldset>
    </>
  );
}

function VocabularyEditor({
  game,
  published,
  pending,
  newLevels,
  newLessons,
  onAddLevel,
  onAddLesson,
  onAdd,
  onChange,
}: {
  game: GameId;
  published: PublishedContent | null;
  pending: WordChange[];
  newLevels: string[];
  newLessons: LessonEntry[];
  onAddLevel(name: string): void;
  onAddLesson(lesson: LessonEntry): void;
  onAdd(words: WordDraft[]): void;
  onChange(change: WordChange): void;
}) {
  const [levelChoice, setLevelChoice] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [query, setQuery] = useState('');
  const [lessonChoice, setLessonChoice] = useState('all');
  const [editing, setEditing] = useState<ContentWord | null>(null);
  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const levels = [
    ...new Set([...(published?.levels ?? []).map((item) => item.name), ...newLevels]),
  ].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const level = levels.includes(levelChoice) ? levelChoice : '';
  const availableHsk = HSK_LEVELS.filter((name) => !levels.includes(name));
  const lessons = [
    ...(published?.levels.find((item) => item.name === level)?.lessons ?? []),
    ...newLessons.filter((item) => item.level === level),
  ].sort((a, b) => a.number - b.number);
  const lesson = lessons.find((item) => String(item.number) === lessonChoice);
  const nextLesson = (lessons.at(-1)?.number ?? 0) + 1;
  const selected = new Map(pending.map((change) => [change.original.id, change]));
  const words = (published?.words ?? []).filter((word) => {
    if (word.level !== level || (lesson && word.lesson !== lesson.number)) return false;
    return (
      word.games.includes(game) ||
      (!word.games.length && (game !== 'ghep-chu' || [...word.hanzi].length === 2))
    );
  });
  const search = query.trim().toLowerCase();
  const visible = words.filter((word) =>
    [word.hanzi, word.pinyin, word.meaning, String(word.lesson)].some((value) =>
      value.toLowerCase().includes(search),
    ),
  );
  const changeLevel = (next: string) => {
    setLevelChoice(next);
    setNewLevel('');
    setQuery('');
    setLessonChoice('all');
    setAddingLesson(false);
    setLessonTitle('');
    setEditing(null);
  };
  const remove = (word: ContentWord) => {
    setEditing(null);
    onChange({ action: 'remove', original: word, game });
  };
  return (
    <>
      <section className="teacher-card">
        <h2>Kho từ vựng</h2>
        <div className="teacher-fields">
          <div className="teacher-select-field">
            <label htmlFor="teacher-level">2. Cấp độ</label>
            <Select
              id="teacher-level"
              aria-label="2. Cấp độ"
              disabled={!published}
              value={levelChoice === 'new' ? '' : levelChoice}
              onValueChange={changeLevel}
            >
              <option value="" disabled>
                Chọn cấp độ
              </option>
              {levels.map((name) => (
                <option key={name} value={name}>
                  {newLevels.includes(name) ? `${name} · Bản nháp` : name}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            className="teacher-secondary teacher-level-action"
            disabled={!published || (!availableHsk.length && levelChoice !== 'new')}
            aria-expanded={levelChoice === 'new'}
            onClick={() => changeLevel(levelChoice === 'new' ? '' : 'new')}
          >
            {levelChoice === 'new' ? 'Hủy thêm cấp độ' : '+ Thêm cấp độ mới'}
          </button>
        </div>
        {levelChoice === 'new' && (
          <div className="teacher-select-field">
            <label htmlFor="teacher-new-level">Cấp độ HSK mới</label>
            <Select
              id="teacher-new-level"
              aria-label="Cấp độ HSK mới"
              value={newLevel}
              onValueChange={setNewLevel}
            >
              <option value="" disabled>
                Chọn cấp độ HSK
              </option>
              {availableHsk.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
            <button
              className="teacher-secondary teacher-level-action"
              type="button"
              disabled={!newLevel}
              onClick={() => {
                onAddLevel(newLevel);
                changeLevel(newLevel);
              }}
            >
              Thêm cấp độ vào bản nháp
            </button>
          </div>
        )}
        {level && (
          <>
            <div className="teacher-fields">
              <div className="teacher-select-field">
                <label htmlFor="teacher-lesson">3. Bài học</label>
                <Select
                  id="teacher-lesson"
                  aria-label="3. Bài học"
                  value={lesson ? lessonChoice : 'all'}
                  onValueChange={(value) => {
                    setLessonChoice(value);
                    setEditing(null);
                  }}
                >
                  <option value="all">Tất cả bài học</option>
                  {lessons.map((item) => (
                    <option key={item.number} value={String(item.number)}>
                      {`Bài ${item.number}${item.title ? ` · ${item.title}` : ''}`}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                className="teacher-secondary teacher-level-action"
                type="button"
                disabled={nextLesson > 999}
                aria-expanded={addingLesson}
                onClick={() => {
                  setAddingLesson((value) => !value);
                  setLessonTitle('');
                }}
              >
                {addingLesson ? 'Hủy thêm bài' : '+ Thêm bài học'}
              </button>
            </div>
            {addingLesson && (
              <form
                className="teacher-fields"
                onSubmit={(event) => {
                  event.preventDefault();
                  const title = lessonTitle.trim();
                  if (!title) return;
                  onAddLesson({ level, number: nextLesson, title });
                  setLessonChoice(String(nextLesson));
                  setAddingLesson(false);
                  setLessonTitle('');
                  setEditing(null);
                }}
              >
                <label>
                  Tên bài học
                  <input
                    required
                    maxLength={100}
                    value={lessonTitle}
                    onChange={(event) => setLessonTitle(event.target.value)}
                  />
                </label>
                <button className="teacher-secondary teacher-level-action">
                  Thêm Bài {nextLesson} vào bản nháp
                </button>
              </form>
            )}
            <h3>
              Từ vựng · {level}
              {lesson && ` · Bài ${lesson.number}${lesson.title ? ` · ${lesson.title}` : ''}`}
            </h3>
            {words.length > 0 && (
              <label>
                Tìm từ
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Chữ Hán, pinyin, nghĩa hoặc số bài"
                />
              </label>
            )}
            <p>
              {words.length === 0
                ? 'Cấp độ này chưa có từ trong bộ đã chọn.'
                : `${visible.length}/${words.length} từ đã xuất bản`}
            </p>
            {visible.length > 0 && (
              <div className="teacher-word-list">
                {visible.map((word) => {
                  const change = selected.get(word.id);
                  const value = change?.action === 'edit' ? change.values : word;
                  return editing?.id === word.id ? (
                    <EditWord
                      key={word.id}
                      word={word}
                      cancel={() => setEditing(null)}
                      save={(values) => {
                        onChange({ action: 'edit', original: word, values });
                        setEditing(null);
                      }}
                    />
                  ) : (
                    <div key={word.id} className="teacher-draft-row">
                      <div>
                        <strong lang="zh-Hans">{value.hanzi}</strong> · {value.pinyin} ·{' '}
                        {value.meaning}
                        <small>
                          Bài {word.lesson}
                          {lessons.find((item) => item.number === word.lesson)?.title
                            ? ` · ${lessons.find((item) => item.number === word.lesson)?.title}`
                            : ''}
                          {word.games.length === 0 ? ' · Dùng chung' : ''}
                          {change &&
                            (change.action === 'edit' ? ' · Chờ xuất bản bản sửa' : ' · Chờ gỡ')}
                        </small>
                      </div>
                      <div className="teacher-actions">
                        <button
                          className="teacher-secondary"
                          disabled={Boolean(change)}
                          onClick={() => setEditing(word)}
                        >
                          Sửa
                        </button>
                        <button
                          className="teacher-secondary"
                          disabled={Boolean(change)}
                          onClick={() => remove(word)}
                        >
                          Gỡ khỏi game
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
      {level && !lesson && <p>Chọn hoặc thêm bài học để nhập từ vựng.</p>}
      {level && lesson && (
        <WordForm
          key={`${level}:${lessonChoice}`}
          level={level}
          targetLesson={lesson}
          game={game}
          onAdd={onAdd}
        />
      )}
    </>
  );
}

function EditWord({
  word,
  save,
  cancel,
}: {
  word: ContentWord;
  save(values: Pick<ContentWord, 'hanzi' | 'pinyin' | 'meaning'>): void;
  cancel(): void;
}) {
  const [values, setValues] = useState({
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    meaning: word.meaning,
  });
  return (
    <form
      className="teacher-word-edit"
      onSubmit={(event) => {
        event.preventDefault();
        save(values);
      }}
    >
      <div className="teacher-fields">
        <label>
          Chữ Hán
          <input
            required
            maxLength={30}
            value={values.hanzi}
            onChange={(event) => setValues({ ...values, hanzi: event.target.value })}
          />
        </label>
        <label>
          Pinyin
          <input
            required
            maxLength={120}
            value={values.pinyin}
            onChange={(event) => setValues({ ...values, pinyin: event.target.value })}
          />
        </label>
        <label>
          Nghĩa tiếng Việt
          <input
            required
            maxLength={200}
            value={values.meaning}
            onChange={(event) => setValues({ ...values, meaning: event.target.value })}
          />
        </label>
      </div>
      {word.games.length !== 1 && <small>Bản sửa sẽ áp dụng cho mọi game đang dùng từ này.</small>}
      <div className="teacher-actions">
        <button className="teacher-primary">Lưu vào bản nháp</button>
        <button type="button" className="teacher-secondary" onClick={cancel}>
          Hủy
        </button>
      </div>
    </form>
  );
}

function WordForm({
  level,
  targetLesson,
  game,
  onAdd,
}: {
  level: string;
  targetLesson: { number: number; title: string };
  game: GameId;
  onAdd(words: WordDraft[]): void;
}) {
  const [hanzi, setHanzi] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [meaning, setMeaning] = useState('');
  const [bulk, setBulk] = useState(false);
  const [paste, setPaste] = useState('');
  const [error, setError] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const lines = bulk
      ? paste
          .trim()
          .split(/\r?\n/)
          .filter((row) => row.trim())
          .map((row) => row.split('\t').map((cell) => cell.trim()))
      : [[hanzi.trim(), pinyin.trim(), meaning.trim()]];
    if (lines.length > 300) return setError('Mỗi lần dán tối đa 300 dòng.');
    const bad = lines.findIndex((row) => row.length !== 3 || row.some((cell) => !cell));
    if (bad !== -1) return setError(`Dòng ${bad + 1} cần đủ 3 cột gồm chữ Hán, pinyin và nghĩa.`);
    onAdd(
      lines.map(([hanzi, pinyin, meaning]) => ({
        level,
        lesson: targetLesson.number,
        lessonTitle: '',
        hanzi,
        pinyin,
        meaning,
        games: [game],
      })),
    );
    setHanzi('');
    setPinyin('');
    setMeaning('');
    setPaste('');
  };
  return (
    <form className="teacher-card" onSubmit={submit}>
      <h2>
        Thêm từ · {gameNames[game]} · {level}
        {` · Bài ${targetLesson.number}`}
      </h2>
      {game === 'ghep-chu' && <p>Nhập từ gồm đúng hai chữ Hán.</p>}
      <div className="teacher-switch" aria-label="Cách nhập">
        <button type="button" aria-pressed={!bulk} onClick={() => setBulk(false)}>
          Nhập một từ
        </button>
        <button type="button" aria-pressed={bulk} onClick={() => setBulk(true)}>
          Dán từ Excel
        </button>
      </div>
      {bulk ? (
        <label>
          Dán ba cột từ Excel theo thứ tự chữ Hán, pinyin, nghĩa. Bỏ dòng tiêu đề.
          <textarea
            required
            rows={5}
            value={paste}
            placeholder={'你好\tnǐ hǎo\txin chào'}
            onChange={(e) => setPaste(e.target.value)}
          />
        </label>
      ) : (
        <div className="teacher-fields">
          <label>
            Chữ Hán
            <input
              required
              maxLength={30}
              value={hanzi}
              onChange={(e) => setHanzi(e.target.value)}
            />
          </label>
          <label>
            Pinyin
            <input
              required
              maxLength={120}
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
            />
          </label>
          <label>
            Nghĩa tiếng Việt
            <input
              required
              maxLength={200}
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
            />
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className="teacher-error">
          {error}
        </p>
      )}
      <button className="teacher-primary">Thêm vào bản nháp</button>
    </form>
  );
}

function ScenarioForm({
  topic,
  published,
  onAdd,
}: {
  topic: TopicId;
  published: PublishedContent | null;
  onAdd(scenario: ScenarioDraft): void;
}) {
  const { name } = topics[topic];
  const { fields, labels, choices } = orderControls(topic);
  const publishedOrders = (published?.scenarios ?? []).filter((entry) => entry.topic === topic);
  const [showPublished, setShowPublished] = useState(false);
  const [hanzi, setHanzi] = useState('');
  const [meaning, setMeaning] = useState('');
  const [selected, setSelected] = useState<Partial<Recipe>>({});
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { drink, ice, sugar, size, topping } = selected;
    if (
      drink === undefined ||
      ice === undefined ||
      sugar === undefined ||
      size === undefined ||
      topping === undefined
    )
      return;
    onAdd({
      topic,
      hanzi: hanzi.trim(),
      meaning: meaning.trim(),
      answer: { drink, ice, sugar, size, topping },
    });
    setHanzi('');
    setMeaning('');
    setSelected({});
  };
  return (
    <>
      <section className="teacher-card">
        <button
          type="button"
          className="teacher-secondary"
          aria-expanded={showPublished}
          onClick={() => setShowPublished((value) => !value)}
        >
          {showPublished ? 'Ẩn câu đã xuất bản' : `Xem câu đã xuất bản (${publishedOrders.length})`}
        </button>
        {showPublished &&
          (publishedOrders.length ? (
            <div className="teacher-word-list">
              {publishedOrders.map((entry) => (
                <div key={entry.id} className="teacher-draft-row">
                  <div>
                    <strong lang="zh-Hans">{entry.hanzi}</strong>
                    <small>{entry.meaning}</small>
                    <small>{orderAnswerLabels(entry.answer, topic).join(' · ')}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Chưa có câu do giáo viên xuất bản cho game này.</p>
          ))}
      </section>
      <form className="teacher-card" onSubmit={submit}>
        <h2>3. Thêm câu · {name}</h2>
        <label>
          Câu tiếng Trung
          <input
            required
            maxLength={160}
            value={hanzi}
            onChange={(e) => setHanzi(e.target.value)}
          />
        </label>
        <label>
          Nghĩa tiếng Việt
          <input
            required
            maxLength={250}
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
          />
        </label>
        <div className="teacher-fields">
          {fields.map((field) => {
            const label = labels[field];
            const options = choices[field];
            return (
              <div key={field} className="teacher-select-field">
                <label htmlFor={`teacher-answer-${field}`}>{label}</label>
                <Select
                  id={`teacher-answer-${field}`}
                  aria-label={label}
                  required
                  value={selected[field] === undefined ? '' : String(selected[field])}
                  onValueChange={(value) =>
                    setSelected((previous) => ({ ...previous, [field]: Number(value) }))
                  }
                >
                  <option value="">Chọn đáp án đúng</option>
                  {options.map((choice, index) => (
                    <option key={choice.hanzi} value={String(index)}>
                      {choice.label}
                    </option>
                  ))}
                </Select>
              </div>
            );
          })}
        </div>
        <button className="teacher-primary">Thêm vào bản nháp</button>
      </form>
    </>
  );
}
