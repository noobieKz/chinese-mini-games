import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, Crown, LogIn, Play, RotateCcw, Swords, X } from 'lucide-react';
import { GameTopbar } from '../../arcade/GameTopbar';
import { Select } from '../../components/Select';
import { ScopePicker } from '../../components/ScopePicker';
import { useContent, useScope } from '../../content/useContent';
import { useLeaveWarning } from '../../lib/useLeaveWarning';
import type { GameId } from '../../../shared/content';
import { shuffle } from '../word-garden/rules';
import { codePattern, type DuelGame } from './core';
import type { PublicState } from './engines';
import type { PublicDuelState } from '../word-garden/duel';
import type { PublicFruitState } from './fruit-rules';
import type { PublicDragonState } from './dragon-rules';
import { createRoom, useDuelRoom } from './useDuelRoom';
import { GardenDuelView } from './GardenDuelView';
import { FruitDuelView } from './FruitDuelView';
import { DragonDuelView } from './DragonDuelView';
import './duel.css';

const gameName: Record<GameId, string> = {
  'ghep-chu': 'Ghép chữ thành từ',
  'noi-tu': 'Nối từ với nghĩa',
  'chem-hoa-qua': 'Chém hoa quả',
  'rong-san-chu': 'Rồng săn chữ',
};
const engineOf: Record<GameId, DuelGame> = {
  'ghep-chu': 'garden',
  'noi-tu': 'garden',
  'chem-hoa-qua': 'fruit',
  'rong-san-chu': 'dragon',
};
const isGame = (value: string | null): value is GameId => Boolean(value && value in gameName);
/** Fewest words each game needs to deal a board. */
const minWords: Record<GameId, number> = {
  'ghep-chu': 2,
  'noi-tu': 2,
  'chem-hoa-qua': 4,
  'rong-san-chu': 2,
};
const rules: Record<DuelGame, string[]> = {
  garden: [
    'Hai người cùng một bàn. Cặp ai nối được sẽ biến mất ở cả hai bên.',
    'Nối đúng +10, sai −2. Chậm hơn đối thủ ở cùng một cặp thì không bị trừ.',
    'Ô bạn đang chọn chỉ hiện trên máy của bạn, đối thủ không thấy.',
    'Hết bàn hoặc hết 5 phút: ai nhiều điểm hơn thắng.',
  ],
  fruit: [
    'Hai người cùng một câu hỏi và cùng 4 quả bay lên.',
    'Ai chém đúng trước được +10, quả vỡ ở cả hai bên và sang câu mới.',
    'Chém sai −2 và bị khoá câu đó, đối thủ vẫn được chém tiếp.',
    'Hết 12 câu: ai nhiều điểm hơn thắng. Dùng chuột/ngón tay vuốt, hoặc phím 1–4.',
  ],
  dragon: [
    'Hai rồng trên cùng một bàn, cùng ghép một từ, cùng các viên chữ.',
    'Ai ăn đúng chữ kế tiếp được +5; ăn chữ cuối của từ được thêm +10.',
    'Ăn sai chữ −3. Đâm vào thân rồng (của mình hay đối thủ) −3 và hồi sinh ngắn lại.',
    'Hết giờ: ai nhiều điểm hơn thắng. Rồng của bạn màu đỏ, đối thủ màu xanh.',
  ],
};
const savedName = () => {
  try {
    return localStorage.getItem('hanplay-duel-name') ?? '';
  } catch {
    return '';
  }
};

/**
 * Solo 2 người for every game: create or join a room, the lobby, countdown and result. The board
 * itself is the game's view (GardenDuelView, FruitDuelView, DragonDuelView). Separate from the
 * one-player games, which this page does not touch.
 */
export function DuelPage({ onBack }: { onBack(): void }) {
  const query = new URLSearchParams(location.search);
  const [code, setCode] = useState(() => {
    const ma = (query.get('ma') ?? '').toUpperCase();
    return codePattern.test(ma) ? ma : null;
  });
  const [game, setGame] = useState<GameId>(() => {
    const tro = query.get('tro');
    return isGame(tro) ? tro : 'ghep-chu';
  });
  const [name, setName] = useState(savedName);
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [pairs, setPairs] = useState<8 | 12>(8);
  const [difficulty, setDifficulty] = useState<'normal' | 'hard'>('normal');
  const [fruitKind, setFruitKind] = useState<'words' | 'collocations'>('words');
  const [fruitSeconds, setFruitSeconds] = useState<8 | 12>(8);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [minutes, setMinutes] = useState<2 | 3>(2);
  const [creating, setCreating] = useState(false);
  const [problem, setProblem] = useState('');
  const [copied, setCopied] = useState(false);
  const [help, setHelp] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const content = useContent();
  const { scope, set: setScope, words, collocations } = useScope(content?.bundle ?? null, game);
  const { state, status, offset, send, me } = useDuelRoom(code, name);

  const kind: DuelGame = state?.game ?? engineOf[game];
  const serverNow = now + offset;
  const meP = state?.players.find((p) => p.id === me) ?? null;
  const them = state?.players.find((p) => p.id !== me) ?? null;
  const playing = state?.phase === 'playing';
  const counting = playing && state?.startAt !== null && serverNow < (state?.startAt ?? 0);
  const canCreate =
    game === 'chem-hoa-qua'
      ? words.length >= minWords[game] || (fruitKind === 'collocations' && collocations.length > 0)
      : words.length >= minWords[game];
  useLeaveWarning(Boolean(playing), () => undefined);

  useEffect(() => {
    try {
      localStorage.setItem('hanplay-duel-name', name);
    } catch {
      /* optional */
    }
  }, [name]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);
  // Keep the invite code (and the chosen game) in the address bar.
  useEffect(() => {
    const next = new URLSearchParams(location.search);
    // In a room the code decides the game; the chosen game only matters on the create form.
    if (code) next.set('ma', code);
    else next.delete('ma');
    if (code) next.delete('tro');
    else next.set('tro', game);
    history.replaceState(history.state, '', `${location.pathname}?${next}`);
  }, [code, game]);

  const create = async () => {
    if (!scope || !canCreate) return;
    setCreating(true);
    setProblem('');
    const lesson =
      scope.range === 'all'
        ? 'Tổng hợp'
        : scope.range === 'lesson'
          ? `Bài ${scope.lesson}`
          : `Ôn bài 1–${scope.lesson}`;
    const label = `${gameName[game]} · ${scope.level} · ${lesson}`;
    const body =
      kind === 'garden'
        ? {
            game: 'garden',
            settings: {
              mode: game === 'noi-tu' ? 'meaning' : 'characters',
              difficulty: game === 'noi-tu' ? 'normal' : difficulty,
              pairs,
              label,
            },
            words: shuffle(words).slice(0, 36),
          }
        : kind === 'fruit'
          ? {
              game: 'fruit',
              settings: { kind: fruitKind, seconds: fruitSeconds, label },
              words: shuffle(words).slice(0, 60),
              collocations: shuffle(collocations).slice(0, 40),
            }
          : {
              game: 'dragon',
              settings: { speed, minutes, label },
              words: shuffle(words).slice(0, 60),
            };
    try {
      setCode(await createRoom(body));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Không tạo được phòng.');
    } finally {
      setCreating(false);
    }
  };
  const join = () => {
    const value = joinCode.trim().toUpperCase();
    if (!codePattern.test(value)) return setProblem('Mã phòng gồm 6 ký tự, ví dụ 5KAJEU.');
    setProblem('');
    setCode(value);
  };
  const leaveRoom = () => setCode(null);
  const back = () => {
    if (
      playing &&
      !window.confirm('Rời trận đấu? Nếu không quay lại trong 20 giây, đối thủ thắng.')
    )
      return;
    onBack();
  };
  const link = code ? `${location.origin}/games/solo?ma=${code}` : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setProblem('Trình duyệt chặn sao chép. Hãy gửi mã phòng cho bạn của bạn.');
    }
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* not supported */
    }
  };

  const notice =
    status === 'reconnecting'
      ? 'Mất kết nối, đang nối lại…'
      : them && !them.connected && playing
        ? `${them.name} vừa mất kết nối. Nếu không quay lại trong 20 giây, bạn thắng.`
        : null;
  const viewProps = {
    me,
    send,
    serverNow,
    offset,
    code,
    name,
    notice,
    connected: status !== 'reconnecting',
    soundOpen,
    closeSound: () => setSoundOpen(false),
  };
  const resultTitle = !state
    ? ''
    : state.winner === 'draw'
      ? 'Hòa!'
      : state.winner === me
        ? 'Bạn thắng!'
        : 'Đối thủ thắng';
  const reasonText =
    state?.endReason === 'cleared'
      ? state.game === 'fruit'
        ? 'Hết câu hỏi.'
        : 'Bàn đã sạch.'
      : state?.endReason === 'time'
        ? 'Hết giờ.'
        : state?.endReason === 'forfeit'
          ? 'Một người đã rời trận.'
          : '';
  const stats = (state: PublicState, id: string) => {
    if (state.game === 'garden') {
      const p = state.players.find((x) => x.id === id)!;
      return `${p.matched} cặp · ${p.misses} lần sai`;
    }
    if (state.game === 'fruit') {
      const p = state.players.find((x) => x.id === id)!;
      return `${p.correct} câu đúng · ${p.misses} lần sai`;
    }
    const p = state.players.find((x) => x.id === id)!;
    return `${p.words} từ · ${p.misses} chữ sai · ${p.crashes} lần va`;
  };

  return (
    <div
      className={`${kind === 'fruit' ? 'fruit-page' : 'garden-page'} ${kind === 'dragon' ? 'dragon-page' : ''} duel-page`}
    >
      <GameTopbar
        title="Solo 2 người"
        subtitle={state?.settings.label ?? gameName[game]}
        onBack={back}
        onHelp={() => setHelp(true)}
        onSound={() => setSoundOpen(true)}
        onFullscreen={() => void fullscreen()}
      />
      {kind === 'garden' ? (
        <GardenDuelView
          {...viewProps}
          state={state?.game === 'garden' ? (state as PublicDuelState) : null}
          preview={{ mode: game === 'noi-tu' ? 'meaning' : 'characters', pairs }}
        />
      ) : kind === 'fruit' ? (
        <FruitDuelView
          {...viewProps}
          state={state?.game === 'fruit' ? (state as PublicFruitState) : null}
        />
      ) : (
        <DragonDuelView
          {...viewProps}
          state={state?.game === 'dragon' ? (state as PublicDragonState) : null}
        />
      )}

      {!code && !help && (
        <div className="garden-overlay">
          <div className="garden-dialog duel-setup">
            <header className="duel-head">
              <span className="duel-badge" aria-hidden="true">
                <Swords size={22} />
              </span>
              <div>
                <span className="garden-eyebrow">ĐỐI KHÁNG TRÊN CÙNG MỘT BÀN</span>
                <h2>Solo 2 người</h2>
              </div>
            </header>
            <p className="duel-lead">
              Hai người tranh nhau trên cùng một bàn chơi. Ai nhiều điểm hơn thắng.
            </p>
            <div className="duel-field">
              <label htmlFor="duel-name">Tên của bạn</label>
              <input
                id="duel-name"
                className="duel-input"
                value={name}
                maxLength={24}
                placeholder="Ví dụ: Minh"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="duel-tabs" role="tablist" aria-label="Tạo hoặc vào phòng">
              <button
                role="tab"
                aria-selected={tab === 'create'}
                onClick={() => (setTab('create'), setProblem(''))}
              >
                <Swords size={16} /> Tạo phòng
              </button>
              <button
                role="tab"
                aria-selected={tab === 'join'}
                onClick={() => (setTab('join'), setProblem(''))}
              >
                <LogIn size={16} /> Vào phòng
              </button>
            </div>
            {/* Both panels share one grid cell, so switching tabs never resizes the dialog. */}
            <div className="duel-panels">
              <div
                className={`duel-panel${tab === 'create' ? '' : ' is-hidden'}`}
                role="tabpanel"
                inert={tab !== 'create'}
              >
                <div className="duel-fields">
                  <div>
                    <label htmlFor="duel-game">Trò chơi</label>
                    <Select
                      id="duel-game"
                      aria-label="Trò chơi"
                      value={game}
                      onValueChange={(value) => setGame(value as GameId)}
                    >
                      <option value="ghep-chu">Ghép chữ thành từ</option>
                      <option value="noi-tu">Nối từ với nghĩa</option>
                      <option value="chem-hoa-qua">Chém hoa quả</option>
                      <option value="rong-san-chu">Rồng săn chữ</option>
                    </Select>
                  </div>
                  {content && scope && (
                    <ScopePicker
                      bundle={content.bundle}
                      game={game}
                      scope={scope}
                      idPrefix="duel"
                      wrapFields
                      onChange={setScope}
                    />
                  )}
                  {kind === 'garden' && (
                    <>
                      <div>
                        <label htmlFor="duel-pairs">Kích thước bàn</label>
                        <Select
                          id="duel-pairs"
                          aria-label="Kích thước bàn"
                          value={String(pairs)}
                          onValueChange={(value) => setPairs(Number(value) as 8 | 12)}
                        >
                          <option value="8">8 cặp · nhanh</option>
                          <option value="12">12 cặp · dài hơi</option>
                        </Select>
                      </div>
                      {/* Always present (locked for Nối nghĩa) so the dialog keeps its size. */}
                      <div>
                        <label htmlFor="duel-difficulty">Độ khó</label>
                        <Select
                          id="duel-difficulty"
                          aria-label="Độ khó"
                          value={game === 'ghep-chu' ? difficulty : 'normal'}
                          disabled={game !== 'ghep-chu'}
                          onValueChange={(value) => setDifficulty(value as 'normal' | 'hard')}
                        >
                          <option value="normal">Bình thường</option>
                          <option value="hard">Khó · đúng thứ tự</option>
                        </Select>
                      </div>
                    </>
                  )}
                  {kind === 'fruit' && (
                    <>
                      <div>
                        <label htmlFor="duel-fruit-kind">Nội dung</label>
                        <Select
                          id="duel-fruit-kind"
                          aria-label="Nội dung"
                          value={collocations.length ? fruitKind : 'words'}
                          onValueChange={(value) => setFruitKind(value as 'words' | 'collocations')}
                        >
                          <option value="words">Từ vựng</option>
                          <option value="collocations" disabled={!collocations.length}>
                            Cụm động từ
                          </option>
                        </Select>
                      </div>
                      <div>
                        <label htmlFor="duel-fruit-seconds">Thời gian mỗi câu</label>
                        <Select
                          id="duel-fruit-seconds"
                          aria-label="Thời gian mỗi câu"
                          value={String(fruitSeconds)}
                          onValueChange={(value) => setFruitSeconds(Number(value) as 8 | 12)}
                        >
                          <option value="8">8 giây · nhanh tay</option>
                          <option value="12">12 giây · thong thả</option>
                        </Select>
                      </div>
                    </>
                  )}
                  {kind === 'dragon' && (
                    <>
                      <div>
                        <label htmlFor="duel-speed">Tốc độ</label>
                        <Select
                          id="duel-speed"
                          aria-label="Tốc độ"
                          value={speed}
                          onValueChange={(value) => setSpeed(value as 'slow' | 'normal' | 'fast')}
                        >
                          <option value="slow">Chậm · làm quen</option>
                          <option value="normal">Vừa</option>
                          <option value="fast">Nhanh · thử thách</option>
                        </Select>
                      </div>
                      <div>
                        <label htmlFor="duel-minutes">Thời lượng</label>
                        <Select
                          id="duel-minutes"
                          aria-label="Thời lượng"
                          value={String(minutes)}
                          onValueChange={(value) => setMinutes(Number(value) as 2 | 3)}
                        >
                          <option value="2">2 phút</option>
                          <option value="3">3 phút</option>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
                <button
                  className="garden-primary duel-cta"
                  onClick={() => void create()}
                  disabled={creating || !canCreate}
                >
                  {creating ? 'Đang tạo phòng…' : 'Tạo phòng & lấy mã mời'}
                  <ArrowRight size={18} />
                </button>
              </div>
              <div
                className={`duel-panel duel-join${tab === 'join' ? '' : ' is-hidden'}`}
                role="tabpanel"
                inert={tab !== 'join'}
              >
                <label htmlFor="duel-code">Nhập mã 6 ký tự bạn của bạn gửi</label>
                <input
                  id="duel-code"
                  className="duel-input duel-code-input"
                  value={joinCode}
                  maxLength={6}
                  placeholder="5KAJEU"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && join()}
                />
                <button
                  className="garden-primary duel-cta"
                  onClick={join}
                  disabled={joinCode.trim().length !== 6}
                >
                  Vào phòng <LogIn size={18} />
                </button>
              </div>
            </div>
            {problem && <p className="duel-problem">{problem}</p>}
          </div>
        </div>
      )}

      {code && (status === 'full' || status === 'missing') && (
        <div className="garden-overlay">
          <div className="garden-dialog">
            <h2>{status === 'full' ? 'Phòng đã đủ 2 người' : 'Không tìm thấy phòng'}</h2>
            <p>
              {status === 'full'
                ? 'Trận này đã có đủ người chơi. Tạo phòng mới để solo nhé.'
                : `Mã ${code} không còn hoặc đã hết hạn.`}
            </p>
            <button className="garden-primary" onClick={leaveRoom}>
              Tạo hoặc vào phòng khác
            </button>
          </div>
        </div>
      )}

      {code && state?.phase === 'lobby' && status !== 'full' && !help && (
        <div className="garden-overlay">
          <div className="garden-dialog duel-lobby">
            <span className="garden-eyebrow">MÃ PHÒNG · GỬI CHO BẠN CÙNG CHƠI</span>
            <div className="duel-code-row">
              <div className="duel-code" aria-label={`Mã phòng ${code}`}>
                {code}
              </div>
              <button className="duel-copy" onClick={() => void copy()}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Đã chép link' : 'Chép link mời'}</span>
              </button>
            </div>
            <p className="duel-label">{state.settings.label}</p>
            <div className="duel-seats">
              {[0, 1].map((seat) => {
                const player = state.players[seat];
                if (!player)
                  return (
                    <div key={seat} className="duel-seat is-empty">
                      <span className="duel-avatar" aria-hidden="true">
                        ?
                      </span>
                      <div>
                        <b>Đang chờ đối thủ…</b>
                        <small>Gửi mã hoặc link cho bạn</small>
                      </div>
                    </div>
                  );
                return (
                  <div
                    key={seat}
                    className={`duel-seat${player.ready ? ' is-ready' : ''}${player.id === me ? ' is-me' : ''}`}
                  >
                    <span className="duel-avatar" aria-hidden="true">
                      {[...player.name.trim()][0]?.toUpperCase() ?? '?'}
                    </span>
                    <div>
                      <b>
                        {player.name}
                        {player.id === me && <em> (bạn)</em>}
                      </b>
                      <small>
                        {player.ready && <Check size={12} />}
                        {player.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Guests arriving from a link set their name here; it is sent when they leave the field. */}
            <div className="duel-field duel-lobby-name">
              <label htmlFor="duel-lobby-name">Tên của bạn</label>
              <input
                id="duel-lobby-name"
                className="duel-input"
                value={name}
                maxLength={24}
                placeholder="Ví dụ: Minh"
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name.trim() && send({ type: 'name', name: name.trim() })}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
            </div>
            <button
              className={`garden-primary duel-cta${meP?.ready ? ' is-undo' : ''}`}
              disabled={!meP}
              onClick={() => send({ type: 'ready', ready: !meP?.ready })}
            >
              {meP?.ready ? 'Huỷ sẵn sàng' : 'Sẵn sàng'} <Play size={18} />
            </button>
            <small className="duel-note">Bắt đầu khi cả hai sẵn sàng · nhiều điểm hơn thắng</small>
            <button className="garden-text-button" onClick={leaveRoom}>
              Rời phòng
            </button>
          </div>
        </div>
      )}

      {code && counting && (
        <div className="garden-overlay duel-countdown" aria-live="assertive">
          <b>{Math.ceil(((state?.startAt ?? 0) - serverNow) / 1000)}</b>
        </div>
      )}

      {code && state?.phase === 'done' && !help && (
        <div className="garden-overlay">
          <div className="garden-dialog">
            <div className="garden-dialog-emblem">
              <Crown size={32} />
            </div>
            <span className="garden-eyebrow">{reasonText.toUpperCase()}</span>
            <h2>{resultTitle}</h2>
            <div className="duel-result">
              {state.players.map((p) => (
                <div key={p.id} className={state.winner === p.id ? 'is-winner' : ''}>
                  <span>{p.id === me ? `${p.name} (bạn)` : p.name}</span>
                  <b>{p.score}</b>
                  <small>{stats(state, p.id)}</small>
                </div>
              ))}
            </div>
            <button className="garden-primary" onClick={() => send({ type: 'rematch' })}>
              Đấu lại <RotateCcw size={18} />
            </button>
            <button className="garden-text-button" onClick={leaveRoom}>
              Tạo phòng khác
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
            <h2>Luật solo · {state ? state.settings.label.split(' · ')[0] : gameName[game]}</h2>
            <ol>
              {rules[kind].map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
              <li>Mất mạng thì vào lại trong 20 giây để giữ trận.</li>
            </ol>
            <button className="garden-primary" onClick={() => setHelp(false)}>
              Đã hiểu <Check size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
