import { useEffect, useRef, useState } from 'react';
import { Crown, Sparkles, Swords, Target, Users, WifiOff } from 'lucide-react';
import { useGameSound } from '../../audio/useGameSound';
import { AudioSettings } from '../../audio/AudioSettings';
import { fruitAudioProfile } from '../../audio/profiles';
import { FRUIT_GRACE_MS, type PublicFruitState } from './fruit-rules';
import type { FruitDuelHandle } from './FruitDuelScene';
import type { ViewProps } from './view';

/** Chém hoa quả for two: same question, same fruits; first correct slash takes it. */
export function FruitDuelView({
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
}: ViewProps<PublicFruitState>) {
  const parent = useRef<HTMLDivElement>(null);
  const arena = useRef<FruitDuelHandle | null>(null);
  const labels = useRef<(HTMLButtonElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState(
    'Chém quả có đáp án đúng trước đối thủ. Đúng +10, sai −2.',
  );
  const audio = useGameSound(fruitAudioProfile);
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const lastSeq = useRef(0);
  const pending = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const meP = state?.players.find((p) => p.id === me) ?? null;
  const them = state?.players.find((p) => p.id !== me) ?? null;
  const playing = state?.phase === 'playing';
  const question = state?.question ?? null;
  const asking = playing && state.questionAt !== null && serverNow >= state.questionAt;
  const lockedOut = Boolean(state?.locked.includes(me));
  const live =
    asking &&
    !state.resolved &&
    !lockedOut &&
    serverNow >= state.questionAt! + FRUIT_GRACE_MS &&
    serverNow < (state.questionEnds ?? 0);
  const seconds = state?.settings.seconds ?? 8;
  const remaining = state?.questionEnds ? Math.max(0, state.questionEnds - serverNow) : 0;

  useEffect(() => {
    let disposed = false,
      owned: FruitDuelHandle | undefined;
    void import('./FruitDuelScene').then(({ createFruitDuel }) => {
      if (disposed || !parent.current) return;
      owned = createFruitDuel(
        parent.current,
        (option) => {
          const current = stateRef.current;
          if (!current) return;
          pending.current = Date.now();
          send({ type: 'slash', question: current.index, option });
        },
        (positions) => {
          labels.current.forEach((label) => {
            if (label) label.style.visibility = 'hidden';
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
        () => !disposed && setReady(true),
      );
      arena.current = owned;
    });
    return () => {
      disposed = true;
      arena.current = null;
      owned?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new room starts from nothing.
  useEffect(() => {
    lastSeq.current = 0;
    arena.current?.clear();
  }, [code]);

  // Referee events: who took the question, wrong slashes, time-outs.
  useEffect(() => {
    const scene = arena.current;
    if (!state || !ready || !scene) return;
    const event = state.event;
    if (!event || event.seq <= lastSeq.current) return;
    lastSeq.current = event.seq;
    pending.current = 0;
    const who = (id: string) =>
      id === me ? 'Bạn' : (state.players.find((p) => p.id === id)?.name ?? 'Đối thủ');
    if (event.kind === 'start') {
      setMessage('Chém quả có đáp án đúng trước đối thủ. Đúng +10, sai −2.');
    } else if (event.kind === 'win') {
      const mine = event.by === me;
      scene.resolve(event.option, mine ? '+10' : who(event.by), mine);
      audioRef.current.play(mine ? 'correct' : 'wrong');
      setMessage(mine ? 'Chính xác! Bạn lấy câu này.' : `${who(event.by)} chém đúng trước bạn.`);
    } else if (event.kind === 'miss') {
      if (event.by === me) {
        scene.miss(event.option);
        audioRef.current.play('wrong');
        setMessage('Chém sai, −2. Câu này bạn bị khoá, chờ câu sau.');
      } else setMessage(`${who(event.by)} chém hụt! Cơ hội của bạn.`);
      if (state.resolved && state.resolved.by === null) {
        scene.resolve(null, 'Cả hai đều sai', false);
        setMessage('Cả hai đều chém sai câu này.');
      }
    } else if (event.kind === 'timeout') {
      scene.resolve(null, 'Hết giờ', false);
      audioRef.current.play('wrong');
      setMessage('Hết giờ, không ai lấy được câu này.');
    } else if (event.kind === 'end') {
      scene.clear();
    }
  }, [state, ready, me]);

  // Each new question starts with a clean message line.
  const questionKey = state?.phase === 'playing' ? `${state.round}-${state.index}` : '';
  useEffect(() => {
    if (questionKey) setMessage('Chém quả có đáp án đúng trước đối thủ. Đúng +10, sai −2.');
  }, [questionKey]);

  // Launch each question's fruits at the same moment on both screens.
  useEffect(() => {
    const scene = arena.current;
    if (!scene || !ready) return;
    if (!state || state.phase !== 'playing' || state.questionAt === null || state.resolved) {
      if (!state || state.phase !== 'playing') scene.clear();
      return;
    }
    scene.question(`${state.round}-${state.index}`, state.questionAt - offset);
  }, [state, ready, offset]);

  // Slashes are open only while the question is, and one at a time until the referee answers.
  const waiting = pending.current && Date.now() - pending.current < 1500;
  useEffect(() => {
    arena.current?.setLive(Boolean(live) && !waiting);
  });

  const reveal = question?.reveal;
  const resolved = state?.resolved;
  const feedback = playing && resolved && reveal;
  const tookIt = resolved?.by ?? null;

  return (
    <main
      className={`fruit-stage duel-fruit ${playing ? 'phase-playing' : 'phase-ready'}`}
      aria-label="Sân chém hoa quả solo"
    >
      <div className="fruit-engine" ref={parent} aria-hidden="true" />
      <div className="fruit-hud duel-fruit-hud" aria-label="Điểm hai người">
        <div className="fruit-score duel-fruit-me">
          <span>
            <Crown size={13} /> {meP?.name || name || 'BẠN'}
          </span>
          <strong>{String(meP?.score ?? 0).padStart(2, '0')}</strong>
        </div>
        <div className="fruit-round">
          <span>CÂU</span>
          <strong>
            {String(Math.min((state?.index ?? 0) + 1, state?.total || 12)).padStart(2, '0')}
            <small> / {state?.total || 12}</small>
          </strong>
        </div>
        <div className="duel-fruit-them">
          <span>
            {them && !them.connected ? <WifiOff size={13} /> : <Users size={13} />}{' '}
            {them?.name ?? 'ĐỐI THỦ'}
          </span>
          <strong>{them ? String(them.score).padStart(2, '0') : '··'}</strong>
        </div>
      </div>
      {asking && question && !feedback && (
        <section
          className="fruit-question"
          key={`${state.round}-${state.index}`}
          aria-live="polite"
        >
          <span>{question.instruction}</span>
          <h1 lang={/[㐀-鿿]/.test(question.prompt) ? 'zh-Hans' : 'vi'}>{question.prompt}</h1>
          <div className="fruit-time-track">
            <i style={{ width: `${Math.min(100, (remaining / (seconds * 1000)) * 100)}%` }} />
          </div>
        </section>
      )}
      {asking && question && (
        <div
          className={`fruit-answer-labels ${lockedOut ? 'is-locked' : ''}`}
          role="group"
          aria-label="Chém quả có đáp án đúng, hoặc dùng phím 1, 2, 3, 4"
        >
          {question.options.map((option, i) => (
            <button
              key={`${state.round}-${state.index}-${i}`}
              ref={(element) => {
                labels.current[i] = element;
              }}
              className={`fruit-answer fruit-answer-${i}`}
              disabled={!live}
              aria-label={`Đáp án ${i + 1}: ${option}`}
              onClick={(event) => {
                if (event.detail >= 2 || !live || waiting) return;
                pending.current = Date.now();
                audio.play('slice');
                send({ type: 'slash', question: state.index, option: i });
              }}
            >
              <kbd>{i + 1}</kbd>
              <strong lang="zh-Hans">{option}</strong>
            </button>
          ))}
        </div>
      )}
      {feedback && (
        <div
          className={`fruit-feedback ${tookIt === me ? 'is-correct' : 'is-wrong'}`}
          key={`${state.round}-${state.index}`}
          role="status"
        >
          <span>
            {tookIt === me ? <Sparkles size={19} /> : <Target size={19} />}
            {tookIt === me
              ? 'Bạn chém đúng! +10'
              : tookIt
                ? `${them?.name ?? 'Đối thủ'} chém đúng trước`
                : 'Không ai chém đúng · Ghi nhớ từ này nhé'}
          </span>
          <strong lang="zh-Hans">{reveal.hanzi}</strong>
          <b>{reveal.pinyin}</b>
          <p>{reveal.meaning}</p>
        </div>
      )}
      <footer className="fruit-play-footer duel-fruit-footer">
        <span>
          <Swords size={17} />
          <b>{notice ?? message}</b>
          <small>
            Vuốt qua quả hoặc bấm phím <kbd>1</kbd>
            <kbd>2</kbd>
            <kbd>3</kbd>
            <kbd>4</kbd>
          </small>
        </span>
      </footer>
      {soundOpen && (
        <AudioSettings
          profile={fruitAudioProfile}
          settings={audio.settings}
          change={audio.change}
          play={audio.play}
          close={closeSound}
        />
      )}
    </main>
  );
}
