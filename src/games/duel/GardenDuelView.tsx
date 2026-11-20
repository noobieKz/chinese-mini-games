import { useEffect, useRef, useState } from 'react';
import { Crown, Link2, Users, Wifi, WifiOff } from 'lucide-react';
import { useGameSound } from '../../audio/useGameSound';
import { AudioSettings } from '../../audio/AudioSettings';
import { gardenAudioProfile } from '../../audio/profiles';
import { STEP_X, STEP_Y } from '../word-garden/layout';
import type { PublicDuelState } from '../word-garden/duel';
import type { DuelSceneHandle } from './DuelScene';
import { duelLayout } from './DuelScene';
import { clock, type ViewProps } from './view';

const tilesKey = (state: PublicDuelState | null) =>
  state ? `${state.round}|${state.tiles.map((t) => t.id + (t.removed ? 'x' : '')).join(',')}` : '';

/** Ghép chữ / Nối nghĩa on one shared board: HUD, board and the line of messages. */
export function GardenDuelView({
  state,
  me,
  send,
  serverNow,
  code,
  name,
  notice,
  connected,
  preview,
  soundOpen,
  closeSound,
}: ViewProps<PublicDuelState> & { preview: { mode: 'characters' | 'meaning'; pairs: number } }) {
  const [message, setMessage] = useState('Chọn hai ô tương ứng trước đối thủ. Đúng +10, sai −2.');
  const [selected, setSelected] = useState<number | null>(null);
  const [redraw, setRedraw] = useState(0);
  const audio = useGameSound(gardenAudioProfile);
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const parent = useRef<HTMLDivElement>(null);
  const board = useRef<DuelSceneHandle | null>(null);
  const [boardReady, setBoardReady] = useState(false);
  const lastSeq = useRef(0);
  const drawnKey = useRef('');
  const animating = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waiting = useRef<number | null>(null);

  const meP = state?.players.find((p) => p.id === me) ?? null;
  const them = state?.players.find((p) => p.id !== me) ?? null;
  const playing = state?.phase === 'playing';
  const counting = playing && state?.startAt !== null && serverNow < (state?.startAt ?? 0);
  const live = playing && !counting;
  const mode = state?.settings.mode ?? preview.mode;
  const total = state ? state.tiles.length / 2 : preview.pairs;
  const layout = duelLayout(Math.max(1, total));
  const remaining = state?.endsAt ? state.endsAt - serverNow : 0;

  // A new room starts from a clean board.
  useEffect(() => {
    lastSeq.current = 0;
    drawnKey.current = '';
    setSelected(null);
  }, [code]);

  // The board renderer is created once the first snapshot tells how many tiles there are.
  const hasTiles = Boolean(state?.tiles.length);
  useEffect(() => {
    if (!hasTiles) return;
    let disposed = false,
      owned: DuelSceneHandle | undefined;
    void import('./DuelScene').then(({ createDuelBoard }) => {
      if (disposed || !parent.current) return;
      owned = createDuelBoard(parent.current, total, () => !disposed && setBoardReady(true));
      board.current = owned;
    });
    return () => {
      disposed = true;
      board.current = null;
      owned?.destroy();
      setBoardReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTiles]);

  // Apply each referee snapshot: play the latest event once, then show the board it describes.
  useEffect(() => {
    if (!state || !boardReady || !board.current) return;
    const scene = board.current;
    const event = state.event;
    if (event && event.seq > lastSeq.current) {
      lastSeq.current = event.seq;
      waiting.current = null;
      const mine = 'by' in event && event.by === me;
      if (event.kind === 'match') {
        scene.match(event.a, event.b, event.path, mine);
        audioRef.current.play(mine ? 'correct' : 'select');
        const who = mine ? 'Bạn' : (them?.name ?? 'Đối thủ');
        setMessage(
          `${who} nối được ${event.word.hanzi} · ${event.word.pinyin} · ${event.word.meaning}${mine ? ' (+10)' : ''}`,
        );
        if (animating.current) clearTimeout(animating.current);
        animating.current = setTimeout(() => {
          animating.current = null;
          drawnKey.current = '';
          setRedraw((n) => n + 1); // draw the board once the line animation is over
        }, 380);
      } else if (event.kind === 'miss' && mine) {
        scene.miss(event.a, event.b);
        audioRef.current.play('wrong');
        setMessage('Chưa nối được: sai cặp hoặc không có đường đi. −2 điểm.');
      } else if (event.kind === 'taken' && mine) {
        setMessage(`Chậm một nhịp! ${them?.name ?? 'Đối thủ'} vừa lấy cặp đó.`);
      } else if (event.kind === 'extra' && mine) {
        setMessage(
          `${event.hanzi} · ${event.pinyin} · ${event.meaning} là từ đúng, nhưng không có trên bàn.`,
        );
      } else if (event.kind === 'start') {
        setMessage('Chọn hai ô tương ứng trước đối thủ. Đúng +10, sai −2.');
      }
    }
    if (!animating.current) {
      const key = tilesKey(state);
      if (key !== drawnKey.current) {
        drawnKey.current = key;
        scene.setTiles(state.tiles);
      }
    }
    scene.mark(selected, null);
  }, [state, boardReady, selected, me, them, redraw]);

  // A selection on a tile that just disappeared is dropped.
  useEffect(() => {
    if (selected !== null && state?.tiles[selected]?.removed) setSelected(null);
  }, [state, selected]);

  const pick = (index: number) => {
    if (!live || !state || state.tiles[index]?.removed) return;
    if (waiting.current && Date.now() - waiting.current < 1500) return;
    audio.play('select');
    // The selection stays on this device: the opponent never sees which tile you picked.
    if (selected === null) setSelected(index);
    else if (selected === index) setSelected(null);
    else {
      waiting.current = Date.now();
      send({ type: 'attempt', a: selected, b: index });
      setSelected(null);
    }
  };

  return (
    <main className="garden-main">
      <div className="garden-layout">
        <section
          className="garden-play-area"
          aria-label="Khu vực đấu"
          style={{ '--board-ratio': layout.width / layout.height } as React.CSSProperties}
        >
          <div className="garden-hud duel-hud">
            <div className="duel-me">
              <span>
                <Crown size={14} /> {meP?.name || name || 'BẠN'}
              </span>
              <b>{String(meP?.score ?? 0).padStart(2, '0')}</b>
            </div>
            <div className="garden-clock">
              <span>{counting ? 'CHUẨN BỊ' : playing ? 'CÒN LẠI' : 'PHÒNG'}</span>
              <b className={live && remaining < 30000 ? 'clock-urgent' : ''}>
                {counting
                  ? Math.ceil(((state?.startAt ?? 0) - serverNow) / 1000)
                  : playing
                    ? clock(remaining)
                    : (code ?? '—')}
              </b>
            </div>
            <div className="duel-them">
              <span>
                {them && !them.connected ? <WifiOff size={14} /> : <Users size={14} />}{' '}
                {them?.name ?? 'ĐỐI THỦ'}
              </span>
              <b>{them ? String(them.score).padStart(2, '0') : '··'}</b>
            </div>
          </div>
          <div
            className="garden-board-wrap"
            style={{ aspectRatio: `${layout.width}/${layout.height}` }}
          >
            <div className="garden-canvas" ref={parent} aria-hidden="true" />
            <div className="garden-tile-grid" role="group" aria-label="Bàn đấu" inert={!live}>
              {state?.tiles.map((tile, i) => (
                <button
                  key={`${state.round}-${tile.id}`}
                  className={`${tile.removed ? 'removed' : ''} ${mode === 'characters' || tile.side === 0 ? 'is-chinese' : 'is-meaning'}`}
                  style={{
                    left: `${((layout.centerX + (i % layout.cols) * STEP_X - 62) / layout.width) * 100}%`,
                    top: `${((layout.centerY + Math.floor(i / layout.cols) * STEP_Y - 54) / layout.height) * 100}%`,
                    width: `${(124 / layout.width) * 100}%`,
                    height: `${(108 / layout.height) * 100}%`,
                    fontSize: `${((mode === 'characters' ? 53 : tile.side === 0 ? 37 : 22) / layout.width) * 100}cqw`,
                  }}
                  aria-label={tile.label}
                  aria-pressed={selected === i}
                  tabIndex={tile.removed ? -1 : 0}
                  disabled={tile.removed || !live}
                  onClick={(e) => e.detail < 2 && pick(i)}
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
          </div>
          <div className="garden-message" role="status">
            <span>
              {!connected ? <WifiOff size={17} /> : code ? <Wifi size={17} /> : <Link2 size={17} />}
            </span>
            <p>{notice ?? message}</p>
          </div>
        </section>
      </div>
      {soundOpen && (
        <AudioSettings
          profile={gardenAudioProfile}
          settings={audio.settings}
          change={audio.change}
          play={audio.play}
          close={closeSound}
        />
      )}
    </main>
  );
}
