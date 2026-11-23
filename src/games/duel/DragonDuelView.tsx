import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crown, Users, WifiOff } from 'lucide-react';
import { useGameSound } from '../../audio/useGameSound';
import { AudioSettings } from '../../audio/AudioSettings';
import { dragonAudioProfile } from '../../audio/profiles';
import { charsOf, type Dir, type Point } from '../dragon-words/model';
import {
  DRAGON_COLS,
  DRAGON_ROWS,
  EAT_POINTS,
  WORD_BONUS,
  type DragonEffect,
  type PublicDragonState,
} from './dragon-rules';
import type { DragonDuelHandle, DragonFrame, DrawnSnake } from './DragonDuelScene';
import { clock, type ViewProps } from './view';

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
/**
 * How late steps reach this device, as the referee's clock sees it: the 90th percentile of recent
 * steps. The opponent is drawn that far (plus a margin) behind, so its next step has nearly always
 * arrived; your own dragon may slide on that far past a cell while it waits for a late step.
 */
const lateness = (samples: number[]) => {
  if (!samples.length) return 60;
  const sorted = [...samples].sort((a, b) => a - b);
  return Math.max(0, sorted[Math.floor(sorted.length * 0.9)]);
};
type Entry = {
  step: number;
  /** Referee time of this step. */
  at: number;
  snakes: PublicDragonState['snakes'];
  pearls: PublicDragonState['pearls'];
  effects: DragonEffect[];
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** The direction of a one-cell move (across the wrapped edge too), or null after a respawn. */
function towards(a: Point, b: Point, cols: number, rows: number): Dir | null {
  let dx = b.x - a.x,
    dy = b.y - a.y;
  if (Math.abs(dx) === cols - 1) dx = -Math.sign(dx);
  if (Math.abs(dy) === rows - 1) dy = -Math.sign(dy);
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  return dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
}

/** Rồng săn chữ for two: two dragons, one shared word and shared pearls. */
export function DragonDuelView({
  state,
  me,
  send,
  serverNow,
  offset,
  code,
  name,
  notice,
  soundOpen,
  closeSound,
}: ViewProps<PublicDragonState>) {
  const parent = useRef<HTMLDivElement>(null);
  const arena = useRef<DragonDuelHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState(
    'Ăn đúng chữ kế tiếp trước đối thủ: +5, chữ cuối thêm +10. Sai chữ hoặc đâm vào thân rồng: −3.',
  );
  const audio = useGameSound(dragonAudioProfile);
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const stateRef = useRef(state);
  stateRef.current = state;
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  /** The last few referee steps, with the referee time each happened, for smooth drawing. */
  const timeline = useRef<Entry[]>([]);
  /** How late recent steps arrived (ms, referee clock), see `lateness`. */
  const arrivals = useRef<number[]>([]);
  /** The step the opponent is drawn at (a little behind the newest). */
  const [shownStep, setShownStep] = useState(-1);
  const shownRef = useRef(-1);
  /**
   * Turns sent but not yet seen in a step, so the head shows them at once. `from` is the step at
   * which the turn shows: a late turn (head past halfway) shows one step later, as the referee does.
   */
  const pending = useRef<{ dir: Dir; from: number }[]>([]);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const meP = state?.players.find((p) => p.id === me) ?? null;
  const them = state?.players.find((p) => p.id !== me) ?? null;
  const themRef = useRef(them);
  themRef.current = them;
  const playing = state?.phase === 'playing';
  const counting = playing && state?.startAt !== null && serverNow < (state?.startAt ?? 0);
  const live = playing && !counting;
  const remaining = state?.endsAt
    ? state.endsAt - serverNow
    : (state?.settings.minutes ?? 2) * 60000;
  const cols = state?.cols ?? DRAGON_COLS,
    rows = state?.rows ?? DRAGON_ROWS;
  const chars = state ? charsOf(state.word) : [];

  /** Sparks, sounds and the message line for one thing that happened on the board. */
  const playEffect = (effect: DragonEffect) => {
    const scene = arena.current;
    if (!scene) return;
    const mine = effect.by === me;
    const who = mine ? 'Bạn' : (themRef.current?.name ?? 'Đối thủ');
    if (effect.kind === 'eat') {
      scene.effect('eat', effect.at, mine, `+${EAT_POINTS}`);
      audioRef.current.play(mine ? 'select' : 'click');
    } else if (effect.kind === 'word') {
      scene.effect('word', effect.at, mine, `+${WORD_BONUS}`);
      audioRef.current.play(mine ? 'correct' : 'wrong');
      setMessage(
        `${who} hoàn thành ${effect.word.hanzi} · ${effect.word.pinyin} · ${effect.word.meaning}`,
      );
    } else if (effect.kind === 'mistake') {
      scene.effect('mistake', effect.at, mine, mine ? '−3' : undefined);
      if (mine) {
        audioRef.current.play('wrong');
        setMessage(`Sai chữ ${effect.char}, −3. Nhìn kỹ thứ tự nhé.`);
      }
    } else {
      scene.effect('crash', effect.at, mine, mine ? '−3' : undefined);
      if (mine) {
        audioRef.current.play('wrong');
        setMessage('Rồng của bạn va phải thân rồng, −3. Hồi sinh ở chỗ trống.');
      } else setMessage(`${who} vừa đâm vào thân rồng!`);
    }
  };
  // Read through a ref from the frame callback, so it always knows who `me` is in this room.
  const play = useRef(playEffect);
  play.current = playEffect;

  /**
   * What to draw this frame. Positions follow the referee's clock, not when messages happen to
   * arrive, so network jitter does not make the dragons stutter:
   * - your dragon is drawn at the referee's present, sliding toward your pending turn, so keys
   *   feel immediate (if the next step is a little late it slides on a bit instead of stopping);
   * - the opponent is drawn a little behind (how late steps usually arrive), between two steps
   *   already received, so its movement and turns are exact and smooth.
   */
  const frame = (): DragonFrame => {
    const current = stateRef.current;
    const steps = timeline.current;
    if (!current) return { snakes: [] };
    const moving = current.phase === 'playing' && steps.length > 0 && current.step > 0;
    if (!moving)
      return {
        snakes: Object.entries(current.snakes).map(([id, snake]) => ({
          ...snake,
          heading: snake.dir,
          mine: id === me,
          t: 0,
        })),
      };
    const now = Date.now() + offsetRef.current;
    const newest = steps[steps.length - 1];
    const late = lateness(arrivals.current);
    const behind = now - clamp(late + 25, 50, 320);
    // A late step: keep sliding the same way instead of stopping (straight on is the usual case).
    const ownReach = 1 + clamp(late / current.stepMs + 0.2, 0.3, 0.9);
    const shown = [...steps].reverse().find((e) => e.at <= behind) ?? steps[0];
    const next = steps.find((e) => e.step === shown.step + 1);
    if (shown.step !== shownRef.current) {
      // The opponent's eats and crashes play when their dragon is drawn reaching that cell.
      for (const entry of steps)
        if (entry.step > shownRef.current && entry.step <= shown.step)
          for (const effect of entry.effects) if (effect.by !== me) play.current(effect);
      shownRef.current = shown.step;
      setShownStep(shown.step);
    }
    const snakes: DrawnSnake[] = [];
    for (const [id, snake] of Object.entries(newest.snakes)) {
      if (id === me) {
        const first = pending.current[0];
        snakes.push({
          ...snake,
          mine: true,
          heading: first && first.from <= newest.step ? first.dir : snake.dir,
          t: clamp((now - newest.at) / current.stepMs, 0, ownReach),
        });
        continue;
      }
      const from = shown.snakes[id] ?? snake;
      const to = next?.snakes[id];
      snakes.push({
        ...from,
        mine: false,
        heading: (to && towards(from.body[0], to.body[0], cols, rows)) || from.dir,
        t: clamp((behind - shown.at) / current.stepMs, 0, to ? 1 : 1.25),
      });
    }
    return { snakes };
  };
  const frameRef = useRef(frame);
  frameRef.current = frame;
  // Dev-only handle for measuring smoothness in the browser; stripped from production builds.
  if (import.meta.env.DEV)
    (window as unknown as { __dragonDuelFrame?: () => DragonFrame }).__dragonDuelFrame = () =>
      frameRef.current();

  useEffect(() => {
    let disposed = false,
      owned: DragonDuelHandle | undefined;
    void Promise.all([import('./DragonDuelScene'), document.fonts.ready]).then(
      ([{ createDragonDuel }]) => {
        if (disposed || !parent.current) return;
        owned = createDragonDuel(
          parent.current,
          { cols: DRAGON_COLS, rows: DRAGON_ROWS },
          () => frameRef.current(),
          () => !disposed && setReady(true),
        );
        arena.current = owned;
      },
    );
    return () => {
      disposed = true;
      arena.current = null;
      owned?.destroy();
    };
  }, []);

  useEffect(() => {
    timeline.current = [];
    arrivals.current = [];
    shownRef.current = -1;
    setShownStep(-1);
    pending.current = [];
  }, [code]);

  // Each referee step joins the timeline; your own eats and crashes play right away.
  useEffect(() => {
    if (!state || state.phase !== 'playing' || state.nextStepAt === null) {
      if (state?.phase === 'lobby') {
        timeline.current = [];
        shownRef.current = -1;
      }
      return;
    }
    const steps = timeline.current;
    if (steps.length && steps[steps.length - 1].step >= state.step) return;
    steps.push({
      step: state.step,
      at: state.nextStepAt - state.stepMs,
      snakes: state.snakes,
      pearls: state.pearls,
      effects: state.effects,
    });
    if (steps.length > 8) steps.shift();
    arrivals.current = [
      ...arrivals.current.slice(-39),
      Date.now() + offsetRef.current - (state.nextStepAt - state.stepMs),
    ];
    for (const effect of state.effects) if (effect.by === me) play.current(effect);
    const snake = state.snakes[me];
    const first = pending.current[0];
    if (snake && first && state.step > first.from && snake.dir === first.dir)
      pending.current.shift();
    // Anything the referee did not apply within a few steps was dropped.
    pending.current = pending.current.filter((p) => state.step <= p.from + 3);
  }, [state, me]);

  /**
   * Pearls as the opponent's dragon is drawn (one it eats vanishes when its head gets there),
   * minus the ones you already ate (your dragon is drawn ahead of the opponent's).
   */
  const shownEntry = timeline.current.find((e) => e.step === shownStep);
  const eatenByMe = shownEntry
    ? timeline.current
        .filter((e) => e.step > shownEntry.step)
        .flatMap((e) => e.effects.filter((x) => x.by === me && x.kind !== 'crash'))
        .map((x) => `${x.at.x},${x.at.y}`)
    : [];
  const pearls = !state
    ? []
    : shownEntry
      ? shownEntry.pearls.filter((p) => !eatenByMe.includes(`${p.x},${p.y}`))
      : state.pearls;

  const steer = (dir: Dir) => {
    const current = stateRef.current;
    const snake = current?.snakes[me];
    if (!current || !snake || current.phase !== 'playing') return;
    const now = Date.now() + offsetRef.current;
    if (current.startAt !== null && now < current.startAt) return;
    const last = pending.current.at(-1)?.dir ?? snake.dir;
    if (dir === last || dir === OPPOSITE[last] || pending.current.length >= 2) return;
    // Past halfway the head already looks like it is in the next cell: turn from there.
    const newest = timeline.current[timeline.current.length - 1];
    const late = !pending.current.length && !!newest && now - newest.at >= current.stepMs * 0.5;
    pending.current.push({ dir, from: late ? current.step + 1 : current.step });
    send({ type: 'turn', dir, step: current.step, late });
  };
  const steerRef = useRef(steer);
  steerRef.current = steer;

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const dir = KEYS[event.code];
      if (!dir || event.repeat) return;
      if ((event.target as HTMLElement)?.closest('input,select,textarea,[role="combobox"]')) return;
      event.preventDefault();
      steerRef.current(dir);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);

  return (
    <main className="garden-main dragon-main duel-dragon">
      <section
        className="dragon-play"
        aria-label="Khu vực đấu"
        style={{ '--ratio': cols / rows } as React.CSSProperties}
      >
        <div className="dragon-hud duel-dragon-hud">
          <div className="duel-me">
            <span>
              <Crown size={13} /> {meP?.name || name || 'BẠN'}
            </span>
            <b>{String(meP?.score ?? 0).padStart(2, '0')}</b>
          </div>
          <div>
            <span>{counting ? 'CHUẨN BỊ' : 'CÒN LẠI'}</span>
            <b className={live && remaining < 30000 ? 'clock-urgent' : ''}>
              {counting ? Math.ceil(((state?.startAt ?? 0) - serverNow) / 1000) : clock(remaining)}
            </b>
          </div>
          <div className="duel-them">
            <span>
              {them && !them.connected ? <WifiOff size={13} /> : <Users size={13} />}{' '}
              {them?.name ?? 'ĐỐI THỦ'}
            </span>
            <b>{them ? String(them.score).padStart(2, '0') : '··'}</b>
          </div>
        </div>

        <div className="dragon-target" aria-live="polite">
          {state && live ? (
            <>
              <div>
                <span className="garden-eyebrow">HAI RỒNG CÙNG GHÉP TỪ NÀY</span>
                <strong>{state.word.meaning}</strong>
                <small>{state.word.pinyin}</small>
              </div>
              <ol className="dragon-slots" aria-label="Tiến độ ghép từ">
                {chars.map((char, i) => (
                  <li key={i} className={i < state.progress ? 'is-filled' : ''} lang="zh-Hans">
                    {i < state.progress ? char : i + 1}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <div>
              <span className="garden-eyebrow">ĐỀ BÀI</span>
              <strong>Nghĩa tiếng Việt hiện ở đây</strong>
              <small>Hai rồng tranh nhau ăn từng chữ Hán theo đúng thứ tự.</small>
            </div>
          )}
        </div>

        <div
          className="dragon-board"
          style={{ aspectRatio: `${cols}/${rows}` }}
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
            swipe.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={() => (swipe.current = null)}
          onPointerCancel={() => (swipe.current = null)}
        >
          <div className="dragon-canvas" ref={parent} aria-hidden="true" />
          <div className="dragon-pearls" aria-hidden="true">
            {state &&
              live &&
              ready &&
              pearls.map((pearl) => (
                <span
                  key={pearl.id}
                  className="dragon-pearl"
                  lang="zh-Hans"
                  style={{
                    left: `${(pearl.x / cols) * 100}%`,
                    top: `${(pearl.y / rows) * 100}%`,
                    width: `${100 / cols}%`,
                    height: `${100 / rows}%`,
                    fontSize: `${48 / cols}cqw`,
                  }}
                >
                  <i>{pearl.char}</i>
                </span>
              ))}
          </div>
        </div>

        <div className="dragon-controls duel-dragon-controls">
          <p className="duel-dragon-message" role="status">
            {notice ?? message}
          </p>
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
                disabled={!live}
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
        </div>
      </section>
      {soundOpen && (
        <AudioSettings
          profile={dragonAudioProfile}
          settings={audio.settings}
          change={audio.change}
          play={audio.play}
          close={closeSound}
        />
      )}
    </main>
  );
}
