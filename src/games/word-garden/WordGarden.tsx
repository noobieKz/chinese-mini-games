import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Flower2,
  HelpCircle,
  Lightbulb,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import { vocabulary, type Difficulty, type MatchMode, type Word } from './vocabulary';
import type { GardenHandle, GardenState } from './GardenScene';
import { Select } from '../../components/Select';
import { getBoardLayout, STEP_X, STEP_Y, type PairCount } from './layout';
import { useGameSound } from '../../audio/useGameSound';
import { AudioSettings } from '../../audio/AudioSettings';
import { gardenAudioProfile } from '../../audio/profiles';

type Props = { mode: MatchMode; onBack(): void };
const SECONDS_PER_PAIR = 20;
/** 240 → "4 phút", 80 → "1 phút 20 giây". */
const durationLabel = (seconds: number) =>
  `${Math.floor(seconds / 60)} phút${seconds % 60 ? ` ${seconds % 60} giây` : ''}`;
const initial: GardenState = {
  tiles: [],
  selected: null,
  score: 0,
  matched: 0,
  mistakes: 0,
  combo: 0,
  locked: true,
  message: 'Đang chuẩn bị vườn chữ…',
  latest: null,
  hints: [],
  hintsLeft: 3,
  assistsLeft: 1,
  total: 0,
};
export function WordGarden({ mode, onBack }: Props) {
  const [level, setLevel] = useState<Word['level']>('HSK 1');
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 540px)').matches);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [pairs, setPairs] = useState<PairCount>(12);
  const [lesson, setLesson] = useState('all');
  const [ended, setEnded] = useState(false);
  const [timed, setTimed] = useState(false);
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [help, setHelp] = useState(false);
  const [soundSettings, setSoundSettings] = useState(false);
  const [exit, setExit] = useState<'leave' | 'restart' | 'end' | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  // Boards smaller than a lesson's word count shrink; the clock scales with the real pair count.
  const totalPairs = Math.min(pairs, lesson === 'all' ? 18 : 6);
  const timeLimit = totalPairs * SECONDS_PER_PAIR;
  const [remaining, setRemaining] = useState(timeLimit);
  const [state, setState] = useState(initial);
  const [collection, setCollection] = useState<Word[]>([]);
  // One record per configuration, so a 4-pair relaxed board never competes with an 18-pair timed one.
  const bestKey = [
    'hanplay-best',
    mode,
    mode === 'characters' ? difficulty : null,
    level.replace(' ', ''),
    lesson,
    totalPairs,
    timed ? 'timed' : 'free',
  ]
    .filter((part) => part !== null)
    .join('-');
  const [best, setBest] = useState(0);
  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(bestKey)) || 0);
    } catch {
      setBest(0);
    }
  }, [bestKey]);
  const parent = useRef<HTMLDivElement>(null);
  const playArea = useRef<HTMLElement>(null);
  const engine = useRef<GardenHandle | null>(null);
  const finished =
    playing &&
    ready &&
    (ended || (state.total > 0 && state.matched === state.total) || (timed && remaining === 0));
  const blocked = !playing || paused || help || soundSettings || Boolean(exit) || finished;
  const boardLayout = getBoardLayout(mobile, state.total || totalPairs);
  const audio = useGameSound(gardenAudioProfile);
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const previous = useRef({ matched: 0, mistakes: 0 });
  useEffect(() => {
    const query = matchMedia('(max-width: 540px)');
    const changed = () => setMobile(query.matches);
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);
  useLayoutEffect(() => {
    let disposed = false;
    let owned: GardenHandle | undefined;
    setReady(false);
    setError(false);
    setState(initial);
    setRemaining(timeLimit);
    setCollection([]);
    previous.current = { matched: 0, mistakes: 0 };
    void Promise.all([import('./GardenScene'), document.fonts.ready])
      .then(([{ createGarden }]) => {
        if (disposed || !parent.current) return;
        owned = createGarden(
          parent.current,
          {
            words: vocabulary
              .filter((w) => w.level === level)
              .filter((_, i) => lesson === 'all' || Math.floor(i / 6) === Number(lesson)),
            pairs,
            difficulty,
            mode,
            mobile,
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          },
          (next) => {
            if (disposed) return;
            setState(next);
            if (next.matched > previous.current.matched && next.latest) {
              setCollection((words) => [...words, next.latest!]);
              audioRef.current.play('correct');
            }
            if (next.mistakes > previous.current.mistakes) audioRef.current.play('wrong');
            previous.current = { matched: next.matched, mistakes: next.mistakes };
          },
          () => {
            if (!disposed) setReady(true);
          },
        );
        engine.current = owned;
        owned.pause(true);
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      engine.current = null;
      owned?.destroy();
    };
  }, [mode, level, round, pairs, lesson, difficulty]);
  useEffect(() => {
    if (ready) engine.current?.resize(mobile);
  }, [mobile, ready]);
  useEffect(() => {
    if (ready) engine.current?.pause(blocked);
  }, [ready, blocked]);
  useEffect(() => {
    if (!playing || blocked || !ready || !timed) return;
    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.floor((now - last) / 1000);
      if (elapsed > 0) {
        setRemaining((value) => Math.max(0, value - elapsed));
        last += elapsed * 1000;
      }
    }, 200);
    return () => clearInterval(interval);
  }, [playing, blocked, ready, timed]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && playing) setPaused(true);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [playing]);
  useEffect(() => {
    if (!finished || state.score <= best) return;
    setBest(state.score);
    try {
      localStorage.setItem(bestKey, String(state.score));
    } catch {
      /* Storage is optional. */
    }
  }, [finished, state.score, best, bestKey]);
  const restart = () => {
    setPlaying(false);
    setEnded(false);
    setPaused(false);
    setExit(null);
    setHelp(false);
    setRound((n) => n + 1);
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setHelp(true);
    }
  };
  const leave = () => (playing && !finished ? setExit('leave') : onBack());
  const startPlaying = () => {
    setPlaying(true);
    audio.play('click');
    // Bring the whole board, its message and tools into view when the page header pushed them down.
    const area = playArea.current;
    if (area && area.getBoundingClientRect().bottom > innerHeight)
      area.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
  };
  return (
    <div className="garden-page">
      <header className="garden-nav">
        <button className="garden-back" aria-label="Về thư viện game" onClick={leave}>
          <ArrowLeft size={19} />
          <span>Thư viện game</span>
        </button>
        <a
          href="/games"
          className="garden-brand"
          onClick={(event) => {
            event.preventDefault();
            leave();
          }}
        >
          <span>汉</span>hanplay<span className="brand-dot">.</span>
        </a>
        <div className="garden-nav-actions">
          <button className="garden-icon" aria-label="Hướng dẫn" onClick={() => setHelp(true)}>
            <HelpCircle size={20} />
          </button>
          <button
            className="garden-icon"
            aria-label="Cài đặt âm thanh"
            onClick={() => setSoundSettings(true)}
          >
            <Volume2 size={20} />
          </button>
          <button
            className="garden-icon fullscreen"
            aria-label="Toàn màn hình"
            onClick={() => void fullscreen()}
          >
            <Maximize2 size={19} />
          </button>
        </div>
      </header>
      <main className="garden-main">
        <div className="garden-title-row">
          <div>
            <div className="garden-eyebrow">
              <Flower2 size={15} /> WORD GARDEN <span>/</span> {level}
            </div>
            <h1>{mode === 'meaning' ? 'Nối từ với nghĩa' : 'Ghép chữ thành từ'}</h1>
            <p>
              {mode === 'meaning'
                ? 'Một từ tiếng Trung. Một ý nghĩa mới được khám phá.'
                : 'Hai chữ nhỏ ghép lại, thêm một từ mới vào khu vườn.'}
            </p>
          </div>
          <div
            className="garden-personal-best"
            title="Kỷ lục của đúng bộ từ, kích thước bàn và chế độ đang chọn, lưu trên thiết bị này"
          >
            <Trophy size={20} />
            <div>
              <small>KỶ LỤC</small>
              <b>
                {best}
                <span> điểm</span>
              </b>
            </div>
          </div>
        </div>
        <div className="garden-layout">
          <section
            className="garden-play-area"
            aria-label="Khu vực chơi"
            ref={playArea}
            style={
              { '--board-ratio': boardLayout.width / boardLayout.height } as React.CSSProperties
            }
          >
            <div className="garden-hud">
              <div>
                <span>
                  <Sparkles size={15} /> ĐIỂM
                </span>
                <b>{state.score.toString().padStart(2, '0')}</b>
              </div>
              <div className="garden-clock">
                <span>
                  <Clock3 size={15} /> {timed ? 'CÒN LẠI' : 'CHẾ ĐỘ'}
                </span>
                <b className={remaining < 30 && timed ? 'clock-urgent' : ''}>
                  {timed
                    ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
                    : 'Thư thả'}
                </b>
              </div>
              <div>
                <span>
                  <Flower2 size={15} /> ĐÃ GHÉP
                </span>
                <b>
                  {state.matched}
                  <small> / {state.total || totalPairs}</small>
                </b>
              </div>
            </div>
            <div
              className="garden-board-wrap"
              style={{ aspectRatio: `${boardLayout.width}/${boardLayout.height}` }}
            >
              <div className="garden-canvas" ref={parent} aria-hidden="true" />
              <div
                className="garden-tile-grid"
                role="group"
                aria-label="Bàn nối chữ"
                inert={blocked || !ready || state.locked}
              >
                {state.tiles.map((tile, i) => (
                  <button
                    key={tile.id}
                    className={`${tile.removed ? 'removed' : ''} ${mode === 'characters' || tile.side === 0 ? 'is-chinese' : 'is-meaning'}`}
                    style={{
                      left: `${((boardLayout.centerX + (i % boardLayout.cols) * STEP_X - 62) / boardLayout.width) * 100}%`,
                      top: `${((boardLayout.centerY + Math.floor(i / boardLayout.cols) * STEP_Y - 54) / boardLayout.height) * 100}%`,
                      width: `${(124 / boardLayout.width) * 100}%`,
                      height: `${(108 / boardLayout.height) * 100}%`,
                      fontSize: `${((mode === 'characters' ? 53 : tile.side === 0 ? 37 : 22) / boardLayout.width) * 100}cqw`,
                    }}
                    aria-label={tile.label}
                    aria-pressed={state.selected === i}
                    aria-description={
                      state.hints.includes(i)
                        ? mode === 'characters' && difficulty === 'hard'
                          ? state.hints[0] === i
                            ? 'Gợi ý: chọn ô này trước.'
                            : 'Gợi ý: chọn ô này tiếp theo.'
                          : 'Gợi ý: nối hai ô này.'
                        : undefined
                    }
                    tabIndex={tile.removed ? -1 : 0}
                    disabled={tile.removed || state.locked || blocked}
                    onClick={(e) => {
                      if (e.detail < 2) {
                        audio.play('select');
                        engine.current?.select(i);
                      }
                    }}
                  >
                    <span
                      className="garden-tile-label"
                      lang={mode === 'characters' || tile.side === 0 ? 'zh-Hans' : 'vi'}
                    >
                      {tile.label}
                    </span>
                  </button>
                ))}
              </div>
              {!ready && !error && (
                <div className="garden-overlay">
                  <div className="garden-dialog">
                    <Flower2 size={40} className="loading-flower" />
                    <h2>Đang gieo những chữ đầu tiên…</h2>
                    <p>Chuẩn bị bàn chơi của bạn.</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="garden-overlay">
                  <div className="garden-dialog">
                    <h2>Chưa tải được bàn chơi</h2>
                    <p>Kiểm tra kết nối rồi thử lại nhé.</p>
                    <button className="garden-primary" onClick={() => location.reload()}>
                      Tải lại
                    </button>
                  </div>
                </div>
              )}
              {ready && !playing && !help && (
                <div className="garden-overlay garden-intro">
                  <div className="garden-dialog">
                    <div className="garden-dialog-emblem">{mode === 'meaning' ? '知' : '学'}</div>
                    <span className="garden-eyebrow">MỖI CẶP ĐÚNG, MỘT ĐIỀU MỚI</span>
                    <h2>Khu vườn đang chờ bạn.</h2>
                    <p>
                      {mode === 'meaning'
                        ? 'Nối từ tiếng Trung với nghĩa tiếng Việt tương ứng.'
                        : difficulty === 'normal'
                          ? 'Chọn hai chữ để tạo thành từ, thứ tự nào cũng được.'
                          : 'Chọn chữ đầu → chữ sau để tạo thành một từ.'}
                      <br />
                      Đường nối đi qua ô trống, được rẽ tối đa hai lần.
                    </p>
                    <div className="garden-example">
                      <span>{mode === 'meaning' ? '朋友' : '朋'}</span>
                      <ArrowRight size={22} />
                      <span>{mode === 'meaning' ? 'bạn bè' : '友'}</span>
                    </div>
                    <button className="garden-primary" onClick={startPlaying}>
                      Vào vườn chơi <Play size={18} fill="currentColor" />
                    </button>
                    <small>
                      {state.total} cặp từ ·{' '}
                      {timed ? durationLabel(timeLimit) : 'Không giới hạn thời gian'}
                    </small>
                  </div>
                </div>
              )}
              {paused && playing && !help && !exit && !finished && (
                <div className="garden-overlay">
                  <div className="garden-dialog">
                    <Pause size={36} />
                    <h2>Nghỉ một chút nhé.</h2>
                    <p>Bàn chơi và thời gian được giữ nguyên.</p>
                    <button className="garden-primary" onClick={() => setPaused(false)}>
                      Chơi tiếp <Play size={18} />
                    </button>
                  </div>
                </div>
              )}
              {finished && (
                <div className="garden-overlay">
                  <div className="garden-dialog">
                    <div className="garden-dialog-emblem">
                      <Trophy size={38} />
                    </div>
                    <span className="garden-eyebrow">
                      {state.total > 0 && state.matched === state.total
                        ? 'KHU VƯỜN ĐÃ NỞ HOA'
                        : 'HẸN BẠN Ở LƯỢT TIẾP THEO'}
                    </span>
                    <h2>
                      {state.total > 0 && state.matched === state.total
                        ? 'Bạn làm tốt lắm!'
                        : ended
                          ? 'Lượt chơi đã kết thúc.'
                          : 'Hết giờ rồi!'}
                    </h2>
                    <p>
                      Đã khám phá {state.matched} từ mới với {state.score} điểm.
                      <br />
                      Xem lại các từ trong sổ tay bên cạnh nhé.
                    </p>
                    <button className="garden-primary" onClick={restart}>
                      Chơi lượt mới <RotateCcw size={18} />
                    </button>
                    <button className="garden-text-button" onClick={onBack}>
                      Về thư viện game
                    </button>
                  </div>
                </div>
              )}
              {help && (
                <div className="garden-overlay">
                  <div className="garden-dialog">
                    <button
                      className="garden-dialog-close garden-icon"
                      aria-label="Đóng hướng dẫn"
                      onClick={() => setHelp(false)}
                    >
                      <X size={20} />
                    </button>
                    <BookOpen size={32} />
                    <h2>Cách chăm vườn chữ</h2>
                    <ol>
                      <li>
                        {mode === 'meaning'
                          ? 'Chọn một từ và nghĩa tương ứng, theo thứ tự tùy ý.'
                          : difficulty === 'normal'
                            ? 'Ghép hai chữ thành từ, không yêu cầu thứ tự chọn.'
                            : 'Chọn đúng chữ đầu, sau đó chữ sau của cùng một từ.'}
                      </li>
                      <li>Nối ngang/dọc qua ô trống, tối đa hai lần rẽ. Được vòng ngoài bàn.</li>
                      <li>Ghép đúng +10 điểm. Sai −2 điểm. Gợi ý −3 điểm.</li>
                      <li>Không có đường nối? Bàn tự đảo, giữ nguyên tiến độ.</li>
                    </ol>
                    <button className="garden-primary" onClick={() => setHelp(false)}>
                      Đã hiểu <Check size={18} />
                    </button>
                  </div>
                </div>
              )}
              {exit && (
                <div className="garden-overlay">
                  <div className="garden-dialog">
                    <h2>
                      {exit === 'restart'
                        ? 'Bắt đầu một lượt mới?'
                        : exit === 'end'
                          ? 'Kết thúc lượt chơi?'
                          : 'Rời lượt chơi này?'}
                    </h2>
                    <p>Lượt đang chơi sẽ kết thúc. Kỷ lục đã lưu vẫn được giữ.</p>
                    <button className="garden-primary" onClick={() => setExit(null)}>
                      Chơi tiếp
                    </button>
                    <button
                      className="garden-text-button"
                      onClick={
                        exit === 'restart'
                          ? restart
                          : exit === 'end'
                            ? () => {
                                setEnded(true);
                                setExit(null);
                              }
                            : onBack
                      }
                    >
                      {exit === 'restart'
                        ? 'Bắt đầu lượt mới'
                        : exit === 'end'
                          ? 'Xem kết quả'
                          : 'Rời bàn chơi'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className={`garden-message ${state.combo > 1 ? 'is-combo' : ''}`} role="status">
              <span>{state.combo > 1 ? <Sparkles size={17} /> : <Lightbulb size={17} />}</span>
              <p>{state.message}</p>
              {state.combo > 1 && <b>×{state.combo}</b>}
            </div>
            <div className="garden-tools">
              <button
                disabled={blocked || !ready || state.locked || state.hintsLeft === 0}
                onClick={() => engine.current?.hint()}
              >
                <Lightbulb size={18} />
                Gợi ý <b>{state.hintsLeft}</b>
              </button>
              <button
                disabled={blocked || !ready || state.locked}
                onClick={() => engine.current?.pinyin()}
                title="Gợi ý pinyin của một cặp nối được (miễn phí)"
              >
                <span className="pinyin-symbol">拼</span> Pinyin
              </button>
              <button
                disabled={blocked || !ready || state.locked || state.assistsLeft === 0}
                onClick={() => engine.current?.assist()}
              >
                <Check size={18} /> Nối giúp <b>{state.assistsLeft}</b>
              </button>
              <button
                disabled={blocked || !ready || state.locked}
                onClick={() => engine.current?.shuffle()}
              >
                <Shuffle size={18} />
                Đảo ô
              </button>
              <button disabled={!playing || finished} onClick={() => setPaused((p) => !p)}>
                {paused ? <Play size={18} /> : <Pause size={18} />}
                {paused ? 'Chơi tiếp' : 'Tạm dừng'}
              </button>
              <button
                disabled={!playing || finished}
                onClick={() => setExit('end')}
                title="Kết thúc lượt và xem kết quả"
              >
                <X size={18} /> Kết thúc
              </button>
            </div>
          </section>
          <aside className="garden-sidebar">
            <section className="garden-options">
              <span className="garden-eyebrow">CHỌN GÓC VƯỜN</span>
              <h2>Chơi theo cách của bạn</h2>
              {mode === 'characters' && (
                <>
                  <label htmlFor="garden-difficulty">Độ khó</label>
                  <Select
                    id="garden-difficulty"
                    aria-label="Độ khó"
                    value={difficulty}
                    disabled={playing}
                    onValueChange={(value) => setDifficulty(value as Difficulty)}
                  >
                    <option value="normal">Bình thường</option>
                    <option value="hard">Khó</option>
                  </Select>
                  <p>
                    {difficulty === 'normal'
                      ? 'Chọn hai chữ theo thứ tự nào cũng được.'
                      : 'Chọn đúng thứ tự chữ trước → chữ sau.'}
                  </p>
                </>
              )}
              <label htmlFor="garden-level">Bộ từ vựng</label>
              <Select
                id="garden-level"
                aria-label="Bộ từ vựng"
                value={level}
                disabled={playing}
                onValueChange={(value) => {
                  setLevel(value as Word['level']);
                  setPlaying(false);
                }}
              >
                <option>HSK 1</option>
                <option>HSK 2</option>
              </Select>
              <label htmlFor="garden-lesson">Bài luyện</label>
              <Select
                id="garden-lesson"
                aria-label="Bài luyện"
                value={lesson}
                disabled={playing}
                onValueChange={setLesson}
              >
                <option value="all">Tổng hợp · 18 từ mẫu</option>
                <option value="0">Nhóm 1 · 6 từ</option>
                <option value="1">Nhóm 2 · 6 từ</option>
                <option value="2">Nhóm 3 · 6 từ</option>
              </Select>
              <label htmlFor="garden-size">Kích thước bàn</label>
              <Select
                id="garden-size"
                aria-label="Kích thước bàn"
                value={String(pairs)}
                disabled={playing}
                onValueChange={(value) => setPairs(Number(value) as PairCount)}
              >
                <option value="4">Làm quen · 4 cặp</option>
                <option value="8">Khởi động · 8 cặp</option>
                <option value="12">Luyện tập · 12 cặp</option>
                <option value="18">Thử thách · 18 cặp</option>
              </Select>
              <label>Chế độ chơi</label>
              <div className="garden-segment">
                <button aria-pressed={!timed} disabled={playing} onClick={() => setTimed(false)}>
                  Thư thả
                </button>
                <button aria-pressed={timed} disabled={playing} onClick={() => setTimed(true)}>
                  {durationLabel(timeLimit)}
                </button>
              </div>
              <p>
                {playing && !finished
                  ? 'Đổi bộ từ và nhịp chơi ở lượt mới.'
                  : 'Không vội. Cứ học theo nhịp của bạn.'}
              </p>
              <button
                className="garden-new-round"
                onClick={() => (playing && !finished ? setExit('restart') : restart())}
              >
                <RotateCcw size={16} /> Chơi lượt mới
              </button>
              <p>
                Đúng +10 · Sai −2 · Gợi ý −3 điểm.
                <br />
                Nối giúp không cộng điểm. Đảo ô miễn phí.
                <br />
                Bài ít từ sẽ tự giảm số cặp.
              </p>
            </section>
            <section className="garden-notebook">
              <div className="notebook-heading">
                <BookOpen size={20} />
                <h2>Sổ tay khám phá</h2>
                <span>{collection.length}</span>
              </div>
              {state.latest ? (
                <div className="garden-latest">
                  <span className="garden-eyebrow">TỪ VỪA GHÉP</span>
                  <strong lang="zh">{state.latest.hanzi}</strong>
                  <span className="garden-pinyin">{state.latest.pinyin}</span>
                  <b>{state.latest.meaning}</b>
                </div>
              ) : (
                <div className="garden-empty">
                  <div>词</div>
                  <p>
                    Mỗi cặp ghép đúng sẽ
                    <br />
                    nở thành một từ ở đây.
                  </p>
                </div>
              )}
              <div className="garden-word-list">
                {collection
                  .slice()
                  .reverse()
                  .map((w) => (
                    <div key={w.id}>
                      <span lang="zh">
                        {w.hanzi}
                        <small>{w.pinyin}</small>
                      </span>
                      <b>{w.meaning}</b>
                      <Check size={14} />
                    </div>
                  ))}
              </div>
            </section>
            <div className="garden-note">
              <Flower2 size={24} />
              <p>
                一点一滴，每天进步<small>Từng chút mỗi ngày, thêm một bước tiến.</small>
              </p>
            </div>
          </aside>
        </div>
        <footer className="garden-footer">
          <span>HỌC NHẸ NHÀNG. NHỚ TỰ NHIÊN.</span>
          <span>Chuột, cảm ứng hoặc Tab + Enter · Không cần tài khoản</span>
        </footer>
      </main>
      {soundSettings && (
        <AudioSettings
          profile={gardenAudioProfile}
          settings={audio.settings}
          change={audio.change}
          play={audio.play}
          close={() => setSoundSettings(false)}
        />
      )}
    </div>
  );
}
