import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Flame,
  HelpCircle,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Swords,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { Select } from '../../components/Select';
import { useGameSound } from '../../audio/useGameSound';
import { AudioSettings } from '../../audio/AudioSettings';
import { fruitAudioProfile } from '../../audio/profiles';
import { FruitRound, type FruitView } from './round';
import type { FruitConfig } from './questions';
import type { FruitHandle } from './FruitScene';
import './fruit.css';

const empty = new FruitRound([], 15).view(0);
export function FruitSlash({ onBack }: { onBack(): void }) {
  const [config, setConfig] = useState<FruitConfig>({ bank: 'hsk1', seconds: 15 });
  const [view, setView] = useState<FruitView>(empty);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [help, setHelp] = useState(false);
  const [soundSettings, setSoundSettings] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'end' | null>(null);
  const [fullscreenError, setFullscreenError] = useState(false);
  const parent = useRef<HTMLDivElement>(null);
  const arena = useRef<FruitHandle | null>(null);
  const labels = useRef<(HTMLButtonElement | null)[]>([]);
  const audio = useGameSound(fruitAudioProfile);
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const playing = view.phase === 'playing' || view.phase === 'feedback';
  const blocked = paused || help || soundSettings || Boolean(confirm);
  const result = view.phase === 'feedback' ? view.results.at(-1) : null;
  useEffect(() => {
    let disposed = false,
      owned: FruitHandle | undefined;
    void import('./FruitScene')
      .then(({ createFruitArena }) => {
        if (disposed || !parent.current) return;
        owned = createFruitArena(
          parent.current,
          (next) => {
            if (!disposed) setView(next);
          },
          (positions) => {
            labels.current.forEach((label) => {
              if (label) {
                label.style.opacity = '0';
                label.style.visibility = 'hidden';
              }
            });
            positions.forEach((position) => {
              const label = labels.current[position.option];
              if (!label) return;
              label.style.left = `${position.x}%`;
              label.style.top = `${position.y}%`;
              label.style.opacity = position.visible ? '1' : '0';
              label.style.visibility = position.visible ? 'visible' : 'hidden';
            });
          },
          (kind) => audioRef.current.play(kind),
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
  }, [blocked, ready]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && playing) setPaused(true);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [playing]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (soundSettings) return;
      if (event.repeat || (event.target as HTMLElement)?.closest('input,select,[role="combobox"]'))
        return;
      if (event.code === 'KeyP' && playing && !help && !confirm) {
        event.preventDefault();
        setPaused((value) => !value);
      }
      if (event.code === 'Escape') {
        if (help) setHelp(false);
        else if (confirm) setConfirm(null);
        else if (playing) setPaused((value) => !value);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [playing, help, confirm, soundSettings]);
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError(true);
    }
  };
  const start = () => {
    setPaused(false);
    setHelp(false);
    setConfirm(null);
    audio.play('click');
    arena.current?.start(config);
  };
  const preview = () => {
    setPaused(false);
    setConfirm(null);
    arena.current?.preview();
  };
  return (
    <div className="fruit-page">
      <header className="fruit-nav">
        <button
          className="fruit-back"
          aria-label="Về thư viện game"
          onClick={() => (playing ? setConfirm('leave') : onBack())}
        >
          <ArrowLeft size={19} />
          <span>Thư viện</span>
        </button>
        <div className="fruit-wordmark">
          <span>切</span>
          <b>
            FRUIT SLASH<small>HANPLAY ARCADE · 词语切切乐</small>
          </b>
        </div>
        <div className="fruit-nav-tools">
          <button
            className="fruit-icon"
            aria-label="Hướng dẫn chém hoa quả"
            onClick={() => setHelp(true)}
          >
            <HelpCircle size={19} />
          </button>
          <button
            className="fruit-icon"
            aria-label="Cài đặt âm thanh"
            onClick={() => setSoundSettings(true)}
          >
            <Settings2 size={19} />
          </button>
          <button
            className="fruit-icon"
            aria-label="Toàn màn hình"
            onClick={() => void fullscreen()}
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </header>
      <main
        className={`fruit-stage phase-${view.phase} ${blocked ? 'is-paused' : ''}`}
        aria-label="Sân chơi chém hoa quả"
      >
        <div className="fruit-engine" ref={parent} aria-hidden="true" />
        <div className="fruit-hud" aria-label="Tiến độ lượt chơi">
          <div className="fruit-score">
            <span>
              <Sparkles size={13} /> ĐIỂM
            </span>
            <strong>{String(view.score).padStart(2, '0')}</strong>
          </div>
          <div className="fruit-round">
            <span>THỬ THÁCH</span>
            <strong>
              {String(Math.min(view.index + 1, view.total || 12)).padStart(2, '0')}
              <small> / {view.total || 12}</small>
            </strong>
          </div>
          <div
            className={`fruit-timer ${view.remaining < 4000 && config.seconds && playing ? 'is-urgent' : ''}`}
          >
            <span>
              <Clock3 size={13} /> {config.seconds ? 'CÒN LẠI' : 'THƯ THẢ'}
            </span>
            <strong>
              {config.seconds ? (playing ? Math.ceil(view.remaining / 1000) : config.seconds) : '∞'}
              <small>{config.seconds ? 's' : ''}</small>
            </strong>
          </div>
        </div>
        {playing && (
          <>
            <section className="fruit-question" key={view.question?.id} aria-live="polite">
              <span>{view.question?.instruction}</span>
              <h1 lang={config.bank === 'collocations' ? 'zh-Hans' : 'vi'}>
                {view.question?.prompt}
              </h1>
              <div className="fruit-time-track">
                <i
                  style={{
                    width: config.seconds
                      ? `${Math.min(100, (view.remaining / (config.seconds * 1000)) * 100)}%`
                      : '100%',
                  }}
                />
              </div>
            </section>
            <div className={`fruit-combo ${view.combo >= 2 ? 'is-active' : ''}`}>
              <Flame size={21} />
              <span>
                COMBO<b>×{view.combo}</b>
              </span>
            </div>
            <div
              className="fruit-answer-labels"
              role="group"
              aria-label="Chém quả có đáp án đúng, hoặc dùng phím 1, 2, 3"
            >
              {view.question?.options.map((option, i) => (
                <button
                  key={`${view.question!.id}-${i}`}
                  ref={(element) => {
                    labels.current[i] = element;
                  }}
                  className={`fruit-answer fruit-answer-${i}`}
                  disabled={view.phase !== 'playing' || blocked}
                  aria-label={`Đáp án ${i + 1}: ${option}`}
                  onClick={(event) => {
                    if (event.detail < 2) arena.current?.choose(view.question!.id, i);
                  }}
                >
                  <kbd>{i + 1}</kbd>
                  <strong lang="zh-Hans">{option}</strong>
                </button>
              ))}
            </div>
          </>
        )}
        {result && !blocked && (
          <div
            className={`fruit-feedback ${result.correct ? 'is-correct' : 'is-wrong'}`}
            key={result.question.id}
            role="status"
          >
            <span>
              {result.correct ? <Sparkles size={19} /> : <Target size={19} />}
              {result.correct
                ? view.combo > 1
                  ? `Liên tiếp ${view.combo} câu!`
                  : 'Chính xác! 漂亮!'
                : result.picked === null
                  ? 'Hết giờ · Ghi nhớ từ này nhé'
                  : 'Chưa đúng · Ghi nhớ từ này nhé'}
            </span>
            <strong lang="zh-Hans">{result.question.hanzi}</strong>
            <b>{result.question.pinyin}</b>
            <p>{result.question.meaning}</p>
          </div>
        )}
        {playing && (
          <footer className="fruit-play-footer">
            <span>
              <Swords size={17} />
              <b>VUỐT QUA QUẢ</b>
              <small>
                hoặc bấm phím <kbd>1</kbd>
                <kbd>2</kbd>
                <kbd>3</kbd>
              </small>
            </span>
            <div>
              <button
                className="fruit-small-button"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? 'Chơi tiếp' : 'Tạm dừng'}
              >
                {paused ? <Play size={17} /> : <Pause size={17} />}
                <span>{paused ? 'Chơi tiếp' : 'Tạm dừng'}</span>
              </button>
              <button className="fruit-small-button" onClick={() => setConfirm('end')}>
                <X size={17} />
                <span>Kết thúc</span>
              </button>
            </div>
          </footer>
        )}
        {!ready && !error && (
          <div className="fruit-overlay">
            <div className="fruit-loading">
              <Swords size={35} />
              <h2>Đang chuẩn bị sân chém…</h2>
              <p>Hoa quả sắp bay lên rồi.</p>
            </div>
          </div>
        )}
        {error && (
          <div className="fruit-overlay">
            <div className="fruit-dialog">
              <h2>Chưa tải được sân chơi</h2>
              <p>Kiểm tra kết nối rồi tải lại trang nhé.</p>
              <button className="fruit-primary" onClick={() => location.reload()}>
                Tải lại
              </button>
            </div>
          </div>
        )}
        {ready && view.phase === 'ready' && !help && (
          <div className="fruit-overlay fruit-intro">
            <div className="fruit-dialog">
              <span className="fruit-eyebrow">RÈN PHẢN XẠ · GHI NHỚ TỪ MỚI</span>
              <div className="fruit-title">
                <span>CHÉM</span>
                <h1>HOA QUẢ</h1>
                <small>词语切切乐</small>
              </div>
              <p className="fruit-intro-copy">
                Đọc câu hỏi. Tìm đáp án.
                <br />
                <b>Vuốt một đường, chém đúng quả!</b>
              </p>
              <div className="fruit-options">
                <div>
                  <label htmlFor="fruit-bank">Bộ thử thách</label>
                  <Select
                    id="fruit-bank"
                    aria-label="Bộ thử thách"
                    value={config.bank}
                    onValueChange={(bank) =>
                      setConfig((value) => ({ ...value, bank: bank as FruitConfig['bank'] }))
                    }
                  >
                    <option value="hsk1">Từ vựng · HSK 1</option>
                    <option value="hsk2">Từ vựng · HSK 2</option>
                    <option value="collocations">Ghép từ · Động từ</option>
                  </Select>
                </div>
                <div>
                  <label htmlFor="fruit-time">Thời gian mỗi câu</label>
                  <Select
                    id="fruit-time"
                    aria-label="Thời gian mỗi câu"
                    value={String(config.seconds)}
                    onValueChange={(seconds) =>
                      setConfig((value) => ({
                        ...value,
                        seconds: Number(seconds) as FruitConfig['seconds'],
                      }))
                    }
                  >
                    <option value="10">10 giây</option>
                    <option value="15">15 giây</option>
                    <option value="20">20 giây</option>
                    <option value="30">30 giây</option>
                    <option value="0">Thư thả · Không giới hạn</option>
                  </Select>
                </div>
              </div>
              <button className="fruit-primary" onClick={start}>
                BẮT ĐẦU CHÉM <Swords size={21} />
              </button>
              <div className="fruit-intro-meta">
                <span>12 câu / lượt</span>
                <i>✦</i>
                <span>Chuột · Cảm ứng · Bàn phím</span>
              </div>
            </div>
          </div>
        )}
        {paused && playing && !help && !confirm && (
          <div className="fruit-overlay">
            <div className="fruit-dialog fruit-compact">
              <Pause size={38} />
              <span className="fruit-eyebrow">NGHỈ TAY MỘT CHÚT</span>
              <h2>Giữ nhịp, rồi chém tiếp.</h2>
              <p>Đồng hồ và hoa quả đã tạm dừng.</p>
              <button className="fruit-primary" onClick={() => setPaused(false)}>
                CHƠI TIẾP <Play size={18} />
              </button>
            </div>
          </div>
        )}
        {help && (
          <div className="fruit-overlay">
            <div className="fruit-dialog fruit-help">
              <button
                className="fruit-dialog-close fruit-icon"
                aria-label="Đóng hướng dẫn"
                onClick={() => setHelp(false)}
              >
                <X size={20} />
              </button>
              <Swords size={32} />
              <h2>Một đường chém, một từ mới.</h2>
              <ol>
                <li>Đọc câu hỏi ở trên. Mỗi quả mang một đáp án ngay bên dưới.</li>
                <li>
                  Giữ chuột rồi kéo, hoặc vuốt qua quả đúng. Có thể chạm trực tiếp quả hoặc dùng
                  phím 1, 2, 3.
                </li>
                <li>
                  Mỗi câu chọn một lần. Đúng +10 điểm, chuỗi đúng cộng thưởng tối đa +8 điểm/câu.
                  Sai −2, điểm không âm.
                </li>
                <li>Quả rơi sẽ bay lên lại. Hết thời gian thì xem đáp án và sang câu tiếp theo.</li>
                <li>Phím P hoặc Escape để tạm dừng. Đổi tab cũng tự tạm dừng.</li>
              </ol>
              <button className="fruit-primary" onClick={() => setHelp(false)}>
                ĐÃ HIỂU <Check size={18} />
              </button>
            </div>
          </div>
        )}
        {confirm && (
          <div className="fruit-overlay">
            <div className="fruit-dialog fruit-compact">
              <h2>{confirm === 'leave' ? 'Rời sân chơi?' : 'Kết thúc lượt này?'}</h2>
              <p>
                {confirm === 'leave'
                  ? 'Tiến độ lượt này sẽ không được giữ lại.'
                  : 'Bạn sẽ xem điểm và các từ đã gặp trong lượt này.'}
              </p>
              <button className="fruit-primary" onClick={() => setConfirm(null)}>
                CHƠI TIẾP <Play size={18} />
              </button>
              <button
                className="fruit-text-button"
                onClick={() => {
                  if (confirm === 'leave') onBack();
                  else {
                    arena.current?.finish();
                    setConfirm(null);
                    setPaused(false);
                  }
                }}
              >
                {confirm === 'leave' ? 'Rời sân chơi' : 'Xem kết quả'}
              </button>
            </div>
          </div>
        )}
        {view.phase === 'finished' && !help && (
          <div className="fruit-overlay">
            <div className="fruit-dialog fruit-results">
              <div className="fruit-medal">
                <Trophy size={35} />
              </div>
              <span className="fruit-eyebrow">MỘT LƯỢT CHƠI, THÊM NHIỀU TỪ MỚI</span>
              <h2>{view.correct >= 10 ? 'Đường chém xuất sắc!' : 'Bạn đã làm tốt lắm!'}</h2>
              <div className="fruit-final-score">
                {view.score}
                <small>ĐIỂM</small>
              </div>
              <div className="fruit-result-stats">
                <span>
                  <b>
                    {view.correct}/{view.results.length}
                  </b>
                  Câu đúng
                </span>
                <span>
                  <b>×{view.bestCombo}</b>Combo cao nhất
                </span>
                <span>
                  <b>{view.results.length}</b>Từ đã gặp
                </span>
              </div>
              <div className="fruit-review" aria-label="Ôn lại từ trong lượt chơi">
                {view.results.map((item) => (
                  <div key={item.question.id}>
                    <span className={item.correct ? 'correct' : ''}>
                      {item.correct ? <Check size={15} /> : <RotateCcw size={15} />}
                    </span>
                    <strong lang="zh-Hans">
                      {item.question.hanzi}
                      <small>{item.question.pinyin}</small>
                    </strong>
                    <b>{item.question.meaning}</b>
                  </div>
                ))}
                {!view.results.length && (
                  <p>Lượt này chưa trả lời câu nào. Sẵn sàng thử lại nhé!</p>
                )}
              </div>
              <button className="fruit-primary" onClick={preview}>
                CHƠI LƯỢT MỚI <ArrowRight size={19} />
              </button>
              <button className="fruit-text-button" onClick={onBack}>
                Về thư viện game
              </button>
            </div>
          </div>
        )}
        {fullscreenError && (
          <div className="fruit-notice" role="status">
            Trình duyệt chưa mở được toàn màn hình.
            <button aria-label="Đóng thông báo" onClick={() => setFullscreenError(false)}>
              <X size={15} />
            </button>
          </div>
        )}
      </main>
      {soundSettings && (
        <AudioSettings
          profile={fruitAudioProfile}
          settings={audio.settings}
          change={audio.change}
          play={audio.play}
          close={() => setSoundSettings(false)}
        />
      )}
    </div>
  );
}
