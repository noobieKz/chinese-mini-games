import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crown, Users, WifiOff } from 'lucide-react';
import { useGameSound } from '../../audio/useGameSound';
import { AudioSettings } from '../../audio/AudioSettings';
import { dragonAudioProfile } from '../../audio/profiles';
import { charsOf, type Dir } from '../dragon-words/model';
import {
  DRAGON_COLS,
  DRAGON_ROWS,
  EAT_POINTS,
  WORD_BONUS,
  type PublicDragonState,
} from './dragon-rules';
import type { DragonDuelHandle, DragonFrame } from './DragonDuelScene';
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
  const stepAt = useRef(0);
  const lastStep = useRef(-1);
  /**
   * Turns sent but not yet seen in a step, so the head shows them at once. `from` is the step at
   * which the turn shows: a late turn (head past halfway) shows one step later, as the referee does.
   */
  const pending = useRef<{ dir: Dir; from: number }[]>([]);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const meP = state?.players.find((p) => p.id === me) ?? null;
  const them = state?.players.find((p) => p.id !== me) ?? null;
  const playing = state?.phase === 'playing';
  const counting = playing && state?.startAt !== null && serverNow < (state?.startAt ?? 0);
  const live = playing && !counting;
  const remaining = state?.endsAt
    ? state.endsAt - serverNow
    : (state?.settings.minutes ?? 2) * 60000;
  const cols = state?.cols ?? DRAGON_COLS,
    rows = state?.rows ?? DRAGON_ROWS;
  const chars = state ? charsOf(state.word) : [];

  useEffect(() => {
    let disposed = false,
      owned: DragonDuelHandle | undefined;
    void Promise.all([import('./DragonDuelScene'), document.fonts.ready]).then(
      ([{ createDragonDuel }]) => {
        if (disposed || !parent.current) return;
        owned = createDragonDuel(
          parent.current,
          { cols: DRAGON_COLS, rows: DRAGON_ROWS },
          (): DragonFrame => {
            const current = stateRef.current;
            if (!current) return { snakes: [], stepAt: 0, stepMs: 1, moving: false };
            return {
              snakes: Object.entries(current.snakes).map(([id, snake]) => ({
                ...snake,
                mine: id === me,
                heading:
                  id === me && pending.current[0] && pending.current[0].from <= current.step
                    ? pending.current[0].dir
                    : snake.dir,
              })),
              stepAt: stepAt.current,
              stepMs: current.stepMs,
              moving:
                current.phase === 'playing' &&
                current.startAt !== null &&
                Date.now() >= stepAt.current &&
                current.step > 0,
            };
          },
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
    // `me` is fixed per room; the frame reads everything else through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    lastStep.current = -1;
    pending.current = [];
  }, [code]);

  // Each referee step: restart the slide, drop turns it applied, play what happened.
  useEffect(() => {
    if (!state || state.step === lastStep.current) return;
    const fresh = state.step > lastStep.current;
    lastStep.current = state.step;
    stepAt.current = Date.now();
    const snake = state.snakes[me];
    const first = pending.current[0];
    if (snake && first && state.step > first.from && snake.dir === first.dir)
      pending.current.shift();
    // Anything the referee did not apply within a few steps was dropped.
    pending.current = pending.current.filter((p) => state.step <= p.from + 3);
    if (!fresh || !arena.current) return;
    for (const effect of state.effects) {
      const mine = effect.by === me;
      const who = mine ? 'Bạn' : (them?.name ?? 'Đối thủ');
      if (effect.kind === 'eat') {
        arena.current.effect('eat', effect.at, mine, `+${EAT_POINTS}`);
        audioRef.current.play(mine ? 'select' : 'click');
      } else if (effect.kind === 'word') {
        arena.current.effect('word', effect.at, mine, `+${WORD_BONUS}`);
        audioRef.current.play(mine ? 'correct' : 'wrong');
        setMessage(
          `${who} hoàn thành ${effect.word.hanzi} · ${effect.word.pinyin} · ${effect.word.meaning}`,
        );
      } else if (effect.kind === 'mistake') {
        arena.current.effect('mistake', effect.at, mine, mine ? '−3' : undefined);
        if (mine) {
          audioRef.current.play('wrong');
          setMessage(`Sai chữ ${effect.char}, −3. Nhìn kỹ thứ tự nhé.`);
        }
      } else if (effect.kind === 'crash') {
        arena.current.effect('crash', effect.at, mine, mine ? '−3' : undefined);
        if (mine) {
          audioRef.current.play('wrong');
          setMessage('Rồng của bạn va phải thân rồng, −3. Hồi sinh ở chỗ trống.');
        } else setMessage(`${who} vừa đâm vào thân rồng!`);
      }
    }
  }, [state, me, them]);

  const steer = (dir: Dir) => {
    const current = stateRef.current;
    const snake = current?.snakes[me];
    if (!current || !snake || current.phase !== 'playing') return;
    if (current.startAt !== null && Date.now() + offset < current.startAt) return;
    const last = pending.current.at(-1)?.dir ?? snake.dir;
    if (dir === last || dir === OPPOSITE[last] || pending.current.length >= 2) return;
    // Past halfway the head already looks like it is in the next cell: turn from there.
    const late = !pending.current.length && Date.now() - stepAt.current >= current.stepMs * 0.5;
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
              state.pearls.map((pearl) => (
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
