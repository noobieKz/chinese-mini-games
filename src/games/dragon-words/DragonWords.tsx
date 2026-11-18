import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Flame,
  Heart,
  HelpCircle,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import { Select } from '../../components/Select';
import { useGameSound } from '../../audio/useGameSound';
import { AudioSettings } from '../../audio/AudioSettings';
import { dragonAudioProfile } from '../../audio/profiles';
import { useContent, useScope } from '../../content/useContent';
import { ScopePicker } from '../../components/ScopePicker';
import { levelSlug, scopeKey, type Scope } from '../../../shared/content';
import { charsOf, LIVES, type Dir, type DragonSpeed } from './model';
import type { DragonHandle, DragonView } from './DragonScene';
import './dragon.css';

type Settings = { speed: DragonSpeed; pinyin: boolean };
const speedLabel: Record<DragonSpeed, string> = { slow: 'Chậm', normal: 'Vừa', fast: 'Nhanh' };
const keys: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};
/** Portrait boards on phones, landscape on wider screens; fixed for the whole round. */
const boardSize = () =>
  matchMedia('(max-width: 640px)').matches || innerHeight > innerWidth * 1.1
    ? { cols: 12, rows: 15 }
    : { cols: 18, rows: 12 };
const recordKey = (scope: Scope | null, s: Settings) =>
  `hanplay-best-dragon-${scope ? `${levelSlug(scope.level)}-${scopeKey(scope)}` : 'sample'}-${s.speed}`;
const readRecord = (key: string) => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};

export function DragonWords({ onBack }: { onBack(): void }) {
  const content = useContent();
  const { scope, set: setScope, words } = useScope(content?.bundle ?? null, 'rong-san-chu');
  const level = scope?.level ?? '';
  const [settings, setSettings] = useState<Settings>({
    speed: 'normal',
    pinyin: true,
  });
  const [view, setView] = useState<DragonView>(() => ({
    phase: 'ready',
    ...boardSize(),
    score: 0,
    lives: LIVES,
    combo: 0,
    bestCombo: 0,
    word: null,
    progress: 0,
    pearls: [],
    results: [],
    events: [],
  }));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [help, setHelp] = useState(false);
  const [setup, setSetup] = useState(false);
  const [soundSettings, setSoundSettings] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'end' | null>(null);
  const [best, setBest] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const parent = useRef<HTMLDivElement>(null);
  const playArea = useRef<HTMLElement>(null);
  const arena = useRef<DragonHandle | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const audio = useGameSound(dragonAudioProfile);
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const playing = view.phase === 'playing';
  const showIntro = ready && (view.phase === 'ready' || setup);
  const blocked = paused || help || soundSettings || Boolean(confirm) || setup;

  useEffect(() => {
    let disposed = false,
      owned: DragonHandle | undefined;
    void Promise.all([import('./DragonScene'), document.fonts.ready])
      .then(([{ createDragonArena }]) => {
        if (disposed || !parent.current) return;
        owned = createDragonArena(
          parent.current,
          boardSize(),
          (next) => {
            if (disposed) return;
            setView(next);
            for (const event of next.events) {
              if (event.kind === 'eat') audioRef.current.play('select');
              if (event.kind === 'word') audioRef.current.play('correct');
              if (event.kind === 'mistake' || event.kind === 'bite') audioRef.current.play('wrong');
            }
          },
          () => {
            if (!disposed) setReady(true);
          },
        );
        arena.current = owned;
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      arena.current = null;
      owned?.destroy();
    };
  }, []);
  useEffect(() => {
    if (ready) arena.current?.pause(blocked);
  }, [ready, blocked]);
  useEffect(() => setBest(readRecord(recordKey(scope, settings))), [scope, settings]);
  useEffect(() => {
    // Runs once per phase change; settings cannot change while a round is over and unopened.
    if (view.phase !== 'over') return;
    const key = recordKey(scope, settings);
    const previous = readRecord(key);
    const isNew = view.score > previous;
    setNewRecord(isNew);
    if (!isNew) return;
    setBest(view.score);
    try {
      localStorage.setItem(key, String(view.score));
    } catch {
      /* Storage is optional. */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.phase]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && playing) setPaused(true);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [playing]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        soundSettings ||
        (event.target instanceof Element &&
          event.target.closest('[role="combobox"],[role="listbox"]'))
      )
        return;
      const dir = keys[event.code];
      if (dir && playing && !blocked) {
        event.preventDefault();
        arena.current?.turn(dir);
        return;
      }
      if (event.repeat) return;
      if ((event.code === 'KeyP' || event.code === 'Escape') && playing && !help && !confirm) {
        event.preventDefault();
        setPaused((value) => !value);
      } else if (event.code === 'Escape') {
        setHelp(false);
        setConfirm(null);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [playing, blocked, help, confirm, soundSettings]);

  const start = () => {
    const size = boardSize();
    setSetup(false);
    setPaused(false);
    setHelp(false);
    setConfirm(null);
    setNewRecord(false);
    if (words.length < 2) return;
    audio.play('click');
    arena.current?.start({
      words,
      speed: settings.speed,
      ...size,
    });
    // Steering needs the whole board on screen: bring it up when the page header pushed it down.
    const area = playArea.current;
    if (area && area.getBoundingClientRect().bottom > innerHeight)
      area.scrollIntoView({
        block: 'end',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
  };
  const steer = (dir: Dir) => {
    if (playing && !blocked) arena.current?.turn(dir);
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setHelp(true);
    }
  };
  const leave = () => (playing ? setConfirm('leave') : onBack());
  const chars = view.word ? charsOf(view.word) : [];
  const done = view.results.filter((r) => r.done);

  return (
    <div className="garden-page dragon-page">
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
            className="garden-icon"
            aria-label="Toàn màn hình"
            onClick={() => void fullscreen()}
          >
            <Maximize2 size={19} />
          </button>
        </div>
      </header>
      <main className="garden-main dragon-main">
        <div className="garden-title-row">
          <div>
            <div className="garden-eyebrow">
              <Sparkles size={15} /> RỒNG SĂN CHỮ <span>/</span> {level}
            </div>
            <h1>Rồng săn chữ</h1>
            <p>Lượn quanh bàn, ăn đúng chữ theo thứ tự để ghép thành từ.</p>
          </div>
          <div
            className="garden-personal-best"
            title="Kỷ lục của bộ từ và tốc độ đang chọn, lưu trên thiết bị này"
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

        <section
          className="dragon-play"
          aria-label="Khu vực chơi"
          ref={playArea}
          style={{ '--ratio': view.cols / view.rows } as React.CSSProperties}
        >
          <div className="dragon-hud">
            <div>
              <span>ĐIỂM</span>
              <b>{String(view.score).padStart(2, '0')}</b>
            </div>
            <div>
              <span>MẠNG</span>
              <b className="dragon-lives" aria-label={`Còn ${view.lives} mạng`}>
                {Array.from({ length: LIVES }, (_, i) => (
                  <Heart
                    key={i}
                    size={20}
                    className={i < view.lives ? 'is-full' : ''}
                    fill={i < view.lives ? 'currentColor' : 'none'}
                  />
                ))}
              </b>
            </div>
            <div>
              <span>ĐÃ GHÉP</span>
              <b>{done.length}</b>
            </div>
            <div className={view.combo > 1 ? 'is-combo' : ''}>
              <span>
                <Flame size={13} /> CHUỖI
              </span>
              <b>×{view.combo}</b>
            </div>
          </div>

          <div className="dragon-target" aria-live="polite">
            {view.word && playing ? (
              <>
                <div>
                  <span className="garden-eyebrow">GHÉP TỪ NÀY</span>
                  <strong>{view.word.meaning}</strong>
                  {settings.pinyin && <small>{view.word.pinyin}</small>}
                </div>
                <ol className="dragon-slots" aria-label="Tiến độ ghép từ">
                  {chars.map((char, i) => (
                    <li key={i} className={i < view.progress ? 'is-filled' : ''} lang="zh-Hans">
                      {i < view.progress ? char : i + 1}
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div>
                <span className="garden-eyebrow">ĐỀ BÀI</span>
                <strong>Nghĩa tiếng Việt hiện ở đây</strong>
                <small>Rồng ăn từng chữ Hán theo đúng thứ tự.</small>
              </div>
            )}
          </div>

          <div
            className="dragon-board"
            style={{ aspectRatio: `${view.cols}/${view.rows}` }}
            onPointerDown={(event) => {
              swipe.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerMove={(event) => {
              const from = swipe.current;
              if (!from) return;
              const dx = event.clientX - from.x,
                dy = event.clientY - from.y;
              if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
              steer(
                Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up',
              );
              // Keep tracking from here so one long gesture can steer twice.
              swipe.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={() => (swipe.current = null)}
            onPointerCancel={() => (swipe.current = null)}
          >
            <div className="dragon-canvas" ref={parent} aria-hidden="true" />
            <div className="dragon-pearls" aria-hidden="true">
              {playing &&
                view.pearls.map((pearl) => (
                  <span
                    key={pearl.id}
                    className="dragon-pearl"
                    lang="zh-Hans"
                    style={{
                      left: `${(pearl.x / view.cols) * 100}%`,
                      top: `${(pearl.y / view.rows) * 100}%`,
                      width: `${100 / view.cols}%`,
                      height: `${100 / view.rows}%`,
                      fontSize: `${48 / view.cols}cqw`,
                    }}
                  >
                    <i>{pearl.char}</i>
                  </span>
                ))}
            </div>

            {!ready && !error && (
              <div className="garden-overlay">
                <div className="garden-dialog">
                  <h2>Rồng đang thức dậy…</h2>
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
            {showIntro && !help && (
              <div className="garden-overlay">
                <div className="garden-dialog dragon-intro">
                  <div className="garden-dialog-emblem" aria-hidden="true">
                    龙
                  </div>
                  <span className="garden-eyebrow">游龙识字 · ĂN ĐÚNG CHỮ, RỒNG LỚN DẦN</span>
                  <h2>Thả rồng săn chữ</h2>
                  <p>
                    Đề bài cho nghĩa tiếng Việt. Lái rồng ăn từng chữ Hán theo đúng thứ tự, ví dụ{' '}
                    <b lang="zh-Hans">朋 → 友</b> cho “bạn bè”.
                  </p>
                  <div className="dragon-options">
                    {content && scope && (
                      <ScopePicker
                        bundle={content.bundle}
                        game="rong-san-chu"
                        scope={scope}
                        idPrefix="dragon"
                        onChange={setScope}
                      />
                    )}
                    <label htmlFor="dragon-speed">Tốc độ</label>
                    <Select
                      id="dragon-speed"
                      aria-label="Tốc độ"
                      value={settings.speed}
                      onValueChange={(speed) =>
                        setSettings((s) => ({ ...s, speed: speed as DragonSpeed }))
                      }
                    >
                      <option value="slow">Chậm · làm quen</option>
                      <option value="normal">Vừa</option>
                      <option value="fast">Nhanh · thử thách</option>
                    </Select>
                    <label>Gợi ý pinyin</label>
                    <div className="garden-segment">
                      <button
                        aria-pressed={settings.pinyin}
                        onClick={() => setSettings((s) => ({ ...s, pinyin: true }))}
                      >
                        Hiện
                      </button>
                      <button
                        aria-pressed={!settings.pinyin}
                        onClick={() => setSettings((s) => ({ ...s, pinyin: false }))}
                      >
                        Ẩn
                      </button>
                    </div>
                  </div>
                  <button className="garden-primary" onClick={start} disabled={words.length < 2}>
                    Thả rồng <Play size={18} fill="currentColor" />
                  </button>
                  <small>Phím mũi tên / WASD · Vuốt trên bàn · Nút điều hướng</small>
                </div>
              </div>
            )}
            {paused && playing && !help && !confirm && (
              <div className="garden-overlay">
                <div className="garden-dialog">
                  <Pause size={36} />
                  <h2>Rồng nghỉ một chút.</h2>
                  <p>Bàn chơi và điểm được giữ nguyên.</p>
                  <button className="garden-primary" onClick={() => setPaused(false)}>
                    Chơi tiếp <Play size={18} />
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
                  <h2>Cách chơi</h2>
                  <ol>
                    <li>Đọc nghĩa tiếng Việt ở đề bài.</li>
                    <li>Lái rồng ăn từng chữ Hán theo đúng thứ tự để ghép thành từ.</li>
                    <li>Ăn nhầm chữ hoặc cắn vào thân mình: mất 1 mạng. Hết 3 mạng là hết lượt.</li>
                    <li>Ra mép bàn rồng sẽ hiện ở mép bên kia.</li>
                    <li>Mỗi chữ +5 điểm, mỗi từ +10, ghép liền mạch được thưởng thêm.</li>
                    <li>
                      Phím mũi tên / WASD, vuốt trên bàn, hoặc bấm nút điều hướng. P hoặc Esc để tạm
                      dừng.
                    </li>
                  </ol>
                  <button className="garden-primary" onClick={() => setHelp(false)}>
                    Đã hiểu <Check size={18} />
                  </button>
                </div>
              </div>
            )}
            {confirm && (
              <div className="garden-overlay">
                <div className="garden-dialog">
                  <h2>{confirm === 'leave' ? 'Rời lượt chơi này?' : 'Kết thúc lượt chơi?'}</h2>
                  <p>
                    {confirm === 'leave'
                      ? 'Điểm của lượt này sẽ không được giữ lại.'
                      : 'Bạn sẽ xem điểm và các từ đã gặp.'}
                  </p>
                  <button className="garden-primary" onClick={() => setConfirm(null)}>
                    Chơi tiếp
                  </button>
                  <button
                    className="garden-text-button"
                    onClick={() => {
                      if (confirm === 'leave') onBack();
                      else {
                        arena.current?.finish();
                        setConfirm(null);
                        setPaused(false);
                      }
                    }}
                  >
                    {confirm === 'leave' ? 'Rời bàn chơi' : 'Xem kết quả'}
                  </button>
                </div>
              </div>
            )}
            {view.phase === 'over' && !setup && !help && (
              <div className="garden-overlay">
                <div className="garden-dialog dragon-results">
                  <div className="garden-dialog-emblem">
                    <Trophy size={34} />
                  </div>
                  <span className="garden-eyebrow">
                    {newRecord ? 'KỶ LỤC MỚI!' : 'RỒNG ĐÃ VỀ TỔ'}
                  </span>
                  <h2>{view.score} điểm</h2>
                  <div className="dragon-result-stats">
                    <span>
                      <b>{done.length}</b>Từ đã ghép
                    </span>
                    <span>
                      <b>×{view.bestCombo}</b>Chuỗi dài nhất
                    </span>
                    <span>
                      <b>{best}</b>Kỷ lục
                    </span>
                  </div>
                  <div className="dragon-review" aria-label="Ôn lại các từ đã gặp">
                    {view.results.map((r, i) => (
                      <div key={i} className={r.done && !r.mistakes ? 'is-clean' : ''}>
                        <span aria-hidden="true">
                          {r.done ? <Check size={14} /> : <RotateCcw size={14} />}
                        </span>
                        <strong lang="zh-Hans">
                          {r.word.hanzi}
                          <small>{r.word.pinyin}</small>
                        </strong>
                        <b>{r.word.meaning}</b>
                        {(r.mistakes > 0 || !r.done) && (
                          <em>{r.done ? `sai ${r.mistakes} lần` : 'chưa ghép xong'}</em>
                        )}
                      </div>
                    ))}
                    {!view.results.length && <p>Lượt này chưa gặp từ nào. Thử lại nhé!</p>}
                  </div>
                  <button className="garden-primary" onClick={start}>
                    Chơi lại <RotateCcw size={18} />
                  </button>
                  <button className="garden-text-button" onClick={() => setSetup(true)}>
                    Đổi bộ từ hoặc tốc độ
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="dragon-controls">
            <div className="dragon-pad" aria-label="Nút điều hướng">
              {(
                [
                  ['up', ArrowUp, 'Lên'],
                  ['left', ArrowLeft, 'Trái'],
                  ['down', ArrowDown, 'Xuống'],
                  ['right', ArrowRight, 'Phải'],
                ] as const
              ).map(([dir, Icon, label]) => (
                <button
                  key={dir}
                  className={`dragon-pad-${dir}`}
                  aria-label={label}
                  disabled={!playing || blocked}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    steer(dir);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') steer(dir);
                  }}
                >
                  <Icon size={22} />
                </button>
              ))}
            </div>
            <div className="dragon-actions">
              <button
                disabled={!playing}
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? 'Chơi tiếp' : 'Tạm dừng'}
              >
                {paused ? <Play size={18} /> : <Pause size={18} />}
                <span>{paused ? 'Chơi tiếp' : 'Tạm dừng'}</span>
              </button>
              <button disabled={!playing} onClick={() => setConfirm('end')} aria-label="Kết thúc">
                <X size={18} />
                <span>Kết thúc</span>
              </button>
            </div>
          </div>
        </section>
        <footer className="garden-footer">
          <span>HỌC NHẸ NHÀNG. NHỚ TỰ NHIÊN.</span>
          <span>
            Tốc độ {speedLabel[settings.speed].toLowerCase()} · {level} · Không cần tài khoản
          </span>
        </footer>
      </main>
      {soundSettings && (
        <AudioSettings
          profile={dragonAudioProfile}
          settings={audio.settings}
          change={audio.change}
          play={audio.play}
          close={() => setSoundSettings(false)}
        />
      )}
    </div>
  );
}
