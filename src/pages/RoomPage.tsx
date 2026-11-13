import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Coins,
  Copy,
  Crown,
  Maximize,
  Minimize,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  Zap,
} from 'lucide-react';
import type { Reply, RoomView } from '../../shared/types';
import { Arena, type ArenaRef } from '../games/gold-rush/Arena';
import { useGameAudio } from '../games/gold-rush/useGameAudio';
import { StageInputGuard } from '../games/gold-rush/stage-input';
import '../games/gold-rush/game.css';
import '../games/gold-rush/readability.css';

type Props = {
  room: RoomView;
  busy: boolean;
  connected: boolean;
  feedback: { correct: boolean; answer: string } | null;
  setFeedback: Dispatch<SetStateAction<{ correct: boolean; answer: string } | null>>;
  seconds: number;
  leave: () => void;
  action: (event: string, payload?: unknown, after?: (reply: Reply) => void) => Promise<void>;
  copy: (text: string) => Promise<void>;
  setConfirmEnd: Dispatch<SetStateAction<boolean>>;
  notify: (message: string) => void;
};
const symbols = ['龙', '竹', '虎', '凤'];
export function RoomPage({
  room,
  busy,
  connected,
  feedback,
  setFeedback,
  seconds,
  leave,
  action,
  copy,
  setConfirmEnd,
  notify,
}: Props) {
  const arena = useRef<ArenaRef>(null);
  const [openKey, setOpenKey] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const audio = useGameAudio();
  useEffect(() => {
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  const pendingKey = `${room.answered}:${room.pending}`;
  const opened = openKey === pendingKey;
  const inputGuard = useRef(new StageInputGuard());
  const inputStage = `${room.code}:${room.status}:${room.answered}:${room.pending}:${opened}:${feedback ? 'feedback' : 'play'}`;
  inputGuard.current.sync(inputStage, performance.now());
  const me = room.players.find((p) => p.id === room.me);
  const team = room.teams.find((t) => t.id === me?.team);
  const ranked = [...room.teams].sort((a, b) => b.gold - a.gold);
  const winners = ranked.filter((t) => t.gold === ranked[0].gold);
  const reveal = () => {
    setOpenKey(pendingKey);
    audio.play('treasure');
  };
  const open = (index: number) => {
    if (!arena.current?.openChest(index)) reveal();
  };
  const claim = (target?: number) =>
    void action('claim', target === undefined ? {} : { target }, (result) => {
      audio.play('treasure');
      notify(
        result.reward === 'steal'
          ? result.amount
            ? `Cướp thành công! +${result.amount} vàng`
            : 'Đối thủ giữ được vàng. Tiếp tục nào!'
          : result.reward === 'shield'
            ? 'Lá chắn đã bảo vệ kho vàng!'
            : '+100 vàng đã về với đồng đội!',
      );
    });
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      }
    } catch {
      notify('Trình duyệt này chưa hỗ trợ toàn màn hình.');
    }
  };
  return (
    <div
      className={`gold-game state-${room.status} ${room.host ? 'is-host' : 'is-player'} ${room.pending && !feedback ? 'is-treasure' : ''}`}
      onPointerDownCapture={(event) => {
        if ((event.target as Element).closest('.treasure-stage button, .question-scroll button'))
          inputGuard.current.press();
      }}
      onClickCapture={(event) => {
        if (
          (event.target as Element).closest('.treasure-stage button, .question-scroll button') &&
          !inputGuard.current.accept(performance.now(), event.detail)
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <Arena ref={arena} room={room} onChest={reveal} onStatus={setEngineStatus} />
      <div className="game-vignette" />
      <header className="game-hud">
        <div className="hud-left">
          <button className="game-icon" disabled={busy} onClick={leave} aria-label="Rời phòng">
            <ArrowLeft size={20} />
          </button>
          <div className="game-wordmark">
            <span>金</span>
            <div>
              GOLD RUSH<small>金币大作战</small>
            </div>
          </div>
          <i className="hud-divider" />
          <span className="hud-chapter">
            ĐẢO KHO BÁU
            <small>
              {room.status === 'lobby'
                ? 'Chờ cuộc phiêu lưu'
                : room.status === 'finished'
                  ? 'Hoàn thành nhiệm vụ'
                  : 'Cuộc săn đang diễn ra'}
            </small>
          </span>
        </div>
        <div className="hud-right">
          {room.status === 'playing' && (
            <div className={`game-clock ${seconds < 30 ? 'urgent' : ''}`}>
              <Clock3 size={18} />
              <b>
                {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                {String(seconds % 60).padStart(2, '0')}
              </b>
            </div>
          )}
          <button
            className="room-invite"
            onClick={() => void copy(`${location.origin}/?room=${room.code}`)}
            aria-label={`Sao chép liên kết phòng ${room.code}`}
          >
            <span>PHÒNG</span>
            <b>{room.code}</b>
            <Copy size={13} />
          </button>
          <button
            className="game-icon"
            onClick={audio.toggle}
            aria-label={audio.enabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {audio.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="game-icon fullscreen-control"
            onClick={() => void toggleFullscreen()}
            aria-label="Bật tắt toàn màn hình"
          >
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </header>
      <div className="game-connection">
        <i className={connected ? 'connected' : ''} />
        {connected ? 'Đã kết nối' : 'Đang kết nối lại…'}
        <span>✦</span>
        <Users size={12} />
        {room.players.filter((p) => p.online).length} nhà thám hiểm
      </div>
      {room.status === 'lobby' && (
        <>
          <section className="adventure-title">
            <span className="game-kicker">HANPLAY ORIGINAL · CHƯƠNG 01</span>
            <h1>
              CUỘC SĂN
              <br />
              <em>KHO BÁU</em>
            </h1>
            <div className="title-ornament">
              ◆ <i /> 金币大作战 <i /> ◆
            </div>
            <p>
              Tri thức mở rương.
              <br />
              Đồng đội tạo nên huyền thoại.
            </p>
            <div className="adventure-tags">
              <span>
                <Swords size={14} />
                {room.teams.length} đội tranh tài
              </span>
              <span>
                <Clock3 size={14} />
                {room.duration} phút
              </span>
            </div>
          </section>
          <section className="expedition-panel">
            <div className="panel-ornament">✦</div>
            <span className="game-kicker">TẬP HỢP ĐỘI THÁM HIỂM</span>
            <h2>{room.host ? 'Chờ đồng đội xuất phát' : 'Bạn đã có đồng đội!'}</h2>
            <p className="expedition-bank">{room.title}</p>
            <div className="lobby-code">
              <span>MÃ THAM GIA</span>
              <button onClick={() => void copy(room.code)}>
                {room.code}
                <Copy size={17} />
              </button>
            </div>
            <div className="lobby-roster">
              {room.teams.map((t) => (
                <div key={t.id}>
                  <span className={`team-sigil sigil-${t.id}`}>{symbols[t.id]}</span>
                  <div>
                    <b>{t.name}</b>
                    <small>
                      {room.players
                        .filter((p) => p.team === t.id)
                        .map((p) => p.name)
                        .join(' · ') || 'Chờ nhà thám hiểm…'}
                    </small>
                  </div>
                  <span>{room.players.filter((p) => p.team === t.id && p.online).length}</span>
                </div>
              ))}
            </div>
            {room.host ? (
              <button
                className="quest-button"
                disabled={busy || !connected || !room.players.some((p) => p.online)}
                onClick={() => {
                  audio.play('click');
                  void action('start');
                }}
              >
                BẮT ĐẦU PHIÊU LƯU
                <ArrowRight size={18} />
              </button>
            ) : (
              <div className="await-host">
                <i />
                Đang chờ giáo viên bắt đầu
              </div>
            )}
            <p className="lobby-help">
              Mở website trên điện thoại và nhập mã phòng.
              <br />
              Cùng Wi-Fi để tham gia khi chơi trong lớp.
            </p>
          </section>
        </>
      )}
      {room.status === 'playing' && room.host && (
        <section className="host-announcement">
          <span className="game-kicker">TRI THỨC LÀ CHÌA KHÓA</span>
          <h1>
            Kho báu chờ <em>người xứng đáng.</em>
          </h1>
          <p>Trả lời trên điện thoại · Mở rương · Mang vàng về cho đội</p>
          <div className="host-legend">
            <span>
              <Coins size={15} />
              +100 vàng
            </span>
            <span>
              <Swords size={15} />
              Cướp kho báu
            </span>
            <span>
              <Shield size={15} />
              Bảo vệ đồng đội
            </span>
          </div>
        </section>
      )}
      {room.status === 'playing' && !room.host && (
        <>
          <div className="player-team">
            <span className={`team-sigil sigil-${team?.id ?? 0}`}>{symbols[team?.id ?? 0]}</span>
            <div>
              <small>ĐỒNG ĐỘI CỦA BẠN</small>
              <b>{team?.name}</b>
            </div>
            <span className="my-gold">
              <Coins size={17} />
              {team?.gold ?? 0}
            </span>
          </div>
          {room.pending && !feedback ? (
            <section
              key={inputStage}
              className={`treasure-stage ${opened ? 'revealed' : ''}`}
              data-reward={room.pending}
              aria-live="polite"
            >
              <div className="treasure-heading">
                <span className="game-kicker">TRẢ LỜI CHÍNH XÁC · NHẬN CƠ HỘI</span>
                <h2>
                  {!opened
                    ? 'Chọn chiếc rương của bạn'
                    : room.pending === 'gold'
                      ? 'Kho báu đã mở!'
                      : room.pending === 'shield'
                        ? 'Sức mạnh bảo vệ!'
                        : 'Thời cơ đã đến!'}
                </h2>
                <p>
                  {!opened
                    ? 'Một chút may mắn. Một bước tiến cho đồng đội.'
                    : room.pending === 'gold'
                      ? '+100 vàng đang chờ về kho đội bạn.'
                      : room.pending === 'shield'
                        ? 'Chặn một lượt cướp. Lá chắn không cộng dồn.'
                        : 'Chọn kho đối thủ để cướp tối đa 150 vàng.'}
                </p>
              </div>
              {!opened ? (
                <div className="chest-select">
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      disabled={!connected || busy || engineStatus === 'loading'}
                      onClick={() => open(i)}
                      aria-label={`Mở rương ${i + 1}`}
                    >
                      <span>{['I', 'II', 'III'][i]}</span>MỞ RƯƠNG
                    </button>
                  ))}
                </div>
              ) : (
                <div className="reward-actions">
                  <span className="reward-emblem">
                    {room.pending === 'gold' ? (
                      <Coins size={28} />
                    ) : room.pending === 'shield' ? (
                      <Shield size={28} />
                    ) : (
                      <Swords size={28} />
                    )}
                    <strong>
                      {room.pending === 'gold'
                        ? '+100 vàng'
                        : room.pending === 'shield'
                          ? 'Lá chắn bảo vệ'
                          : 'Chọn đội để cướp'}
                    </strong>
                  </span>
                  {room.pending === 'steal' ? (
                    <div className="raid-targets">
                      {room.teams
                        .filter((t) => t.id !== me?.team)
                        .map((t) => (
                          <button
                            disabled={busy || !connected}
                            key={t.id}
                            onClick={() => claim(t.id)}
                          >
                            <span className={`team-sigil sigil-${t.id}`}>{symbols[t.id]}</span>
                            <span>
                              {t.name}
                              <small>
                                {t.gold} vàng {t.shield ? '· có lá chắn' : ''}
                              </small>
                            </span>
                            <Swords size={17} />
                          </button>
                        ))}
                    </div>
                  ) : (
                    <button
                      className="quest-button"
                      disabled={busy || !connected}
                      onClick={() => claim()}
                    >
                      {room.pending === 'gold' ? 'MANG VÀNG VỀ KHO' : 'KÍCH HOẠT LÁ CHẮN'}
                      <ArrowRight size={17} />
                    </button>
                  )}
                </div>
              )}
            </section>
          ) : (
            <section
              key={inputStage}
              className={`question-scroll ${feedback ? 'has-feedback' : ''}`}
              aria-live="polite"
            >
              {feedback ? (
                <div className="answer-feedback">
                  <span className={`feedback-seal ${feedback.correct ? 'correct' : ''}`}>
                    {feedback.correct ? <Check size={34} /> : <Sparkles size={34} />}
                  </span>
                  <span className="game-kicker">
                    {feedback.correct ? 'CHÌA KHÓA ĐÃ THUỘC VỀ BẠN' : 'THÊM MỘT ĐIỀU ĐƯỢC KHÁM PHÁ'}
                  </span>
                  <h2>{feedback.correct ? 'Giỏi lắm, nhà thám hiểm!' : 'Ghi nhớ để đi xa hơn!'}</h2>
                  <p>
                    Đáp án đúng: <b>{feedback.answer}</b>
                  </p>
                  <button className="quest-button" onClick={() => setFeedback(null)}>
                    {feedback.correct ? 'ĐẾN KHO BÁU' : 'THỬ THÁCH TIẾP THEO'}
                    <ArrowRight size={17} />
                  </button>
                </div>
              ) : room.question ? (
                <>
                  <div className="scroll-header">
                    <span>
                      <i />
                      THỬ THÁCH TRI THỨC
                    </span>
                    <b>
                      {String(room.answered + 1).padStart(2, '0')}
                      <small> / {room.total}</small>
                    </b>
                  </div>
                  <div className="quest-progress">
                    <i style={{ width: `${(room.answered / room.total) * 100}%` }} />
                  </div>
                  <h2>{room.question.text}</h2>
                  {room.question.pinyin && <p className="quest-pinyin">{room.question.pinyin}</p>}
                  <div className="quest-answers">
                    {room.question.options.map((option, i) => (
                      <button
                        disabled={busy || !connected}
                        key={i}
                        onClick={() =>
                          void action('answer', { index: room.answered, option: i }, (result) => {
                            audio.play(result.correct ? 'correct' : 'wrong');
                            setFeedback({
                              correct: !!result.correct,
                              answer: result.correctAnswer!,
                            });
                          })
                        }
                      >
                        <span>{'ABCD'[i]}</span>
                        <b>{option}</b>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                  </div>
                  <div className="scroll-foot">
                    <Shield size={12} />
                    Mỗi câu trả lời đúng mở ra một kho báu.
                  </div>
                </>
              ) : (
                <div className="answer-feedback">
                  <span className="feedback-seal correct">
                    <Crown size={35} />
                  </span>
                  <span className="game-kicker">ĐÃ HOÀN THÀNH MỌI THỬ THÁCH</span>
                  <h2>Sứ mệnh của bạn đã hoàn thành!</h2>
                  <p>
                    Đồng đội vẫn đang chiến đấu.
                    <br />
                    Cùng theo dõi kho vàng và cổ vũ nhé!
                  </p>
                </div>
              )}
            </section>
          )}
        </>
      )}
      {room.status === 'finished' && (
        <section className="victory-panel">
          <div className="victory-trophy">
            <Trophy size={49} />
            <i />
            <i />
          </div>
          <span className="game-kicker">HUYỀN THOẠI ĐẢO KHO BÁU</span>
          <h1>{winners.map((t) => t.name).join(' & ')}</h1>
          <p>{winners.length > 1 ? 'CÙNG NHAU CHIẾN THẮNG' : 'ĐÃ CHINH PHỤC KHO BÁU'}</p>
          <div className="victory-gold">
            <Coins size={27} />
            {ranked[0].gold.toLocaleString('vi-VN')}
            <small>VÀNG</small>
          </div>
          <div className="victory-ranking">
            {ranked.map((t, i) => (
              <div key={t.id}>
                <span>{i + 1}</span>
                <span className={`team-sigil sigil-${t.id}`}>{symbols[t.id]}</span>
                <b>{t.name}</b>
                <strong>
                  {t.gold}
                  <Coins size={14} />
                </strong>
              </div>
            ))}
          </div>
          <p className="victory-learning">
            Cả lớp đã chinh phục {room.players.reduce((s, p) => s + p.correct, 0)} câu hỏi.
          </p>
          <button className="quest-button" onClick={leave} disabled={busy}>
            TRỞ VỀ SẢNH CHƠI
            <ArrowRight size={17} />
          </button>
        </section>
      )}
      {room.status === 'playing' && (
        <aside className="live-ranking" aria-label="Bảng vàng trực tiếp">
          <span className="game-kicker">
            <Crown size={13} />
            BẢNG VÀNG
          </span>
          {ranked.map((t, i) => (
            <div key={t.id} className={t.id === me?.team ? 'your-team' : ''}>
              <span className="ranking-position">{i + 1}</span>
              <span className={`team-sigil sigil-${t.id}`}>{symbols[t.id]}</span>
              <span className="ranking-name">
                {t.name}
                {t.shield && <Shield size={12} />}
              </span>
              <b>{t.gold}</b>
            </div>
          ))}
        </aside>
      )}
      <footer className="game-footer">
        <span className="game-footer-brand">
          HANPLAY<span>✦</span>
          <small>HỌC CÙNG NHAU. CHINH PHỤC CÙNG NHAU.</small>
        </span>
        <div className="game-event" aria-live="polite">
          <Zap size={13} />
          {room.activity[0] ?? 'Hành trình ngàn dặm bắt đầu từ một bước chân.'}
        </div>
        {room.host && room.status === 'playing' ? (
          <button onClick={() => setConfirmEnd(true)} disabled={busy}>
            Kết thúc ván
          </button>
        ) : (
          <span className="game-footer-label">
            <Wifi size={12} />
            {room.host ? 'MÀN HÌNH GIÁO VIÊN' : (me?.name ?? 'NHÀ THÁM HIỂM')}
          </span>
        )}
      </footer>
    </div>
  );
}
