import { useState } from 'react';
import {
  ArrowRight,
  Expand,
  Gamepad2,
  Keyboard,
  MousePointer2,
  Sparkles,
  Swords,
  User,
  X,
} from 'lucide-react';
import { ArcadeDialog } from './ArcadeDialog';

/** Games with a two-player duel (Solo 2 người); the others show it as coming soon. */
const duelGames = new Set(['ghep-chu', 'noi-tu', 'chem-hoa-qua', 'rong-san-chu']);
const games = [
  {
    route: 'ghep-chu',
    name: 'Ghép chữ thành từ',
    tag: 'GHÉP CHỮ',
    glyph: '学',
    number: '01',
    color: 'jade',
    description: 'Hai chữ Hán. Một từ mới. Tìm đường nối và đánh thức khu vườn.',
    meta: 'Thư thả hoặc tính giờ',
    tiles: ['朋', '友'],
  },
  {
    route: 'noi-tu',
    name: 'Nối từ với nghĩa',
    tag: 'GHI NHỚ',
    glyph: '知',
    number: '02',
    color: 'blue',
    description: 'Kết nối chữ với nghĩa. Mỗi cặp đúng mở ra một khám phá.',
    meta: 'Luyện trí nhớ',
    tiles: ['你好', 'xin chào'],
  },
  {
    route: 'chem-hoa-qua',
    name: 'Chém hoa quả',
    tag: 'PHẢN XẠ',
    glyph: '切',
    number: '03',
    color: 'amber',
    description: 'Đọc thật nhanh. Chém thật chuẩn. Nối combo và bứt phá điểm số.',
    meta: '12 câu mỗi lượt',
    tiles: ['果', '✦'],
  },
  {
    route: 'rong-san-chu',
    name: 'Rồng săn chữ',
    tag: 'PHIÊU LƯU',
    glyph: '龙',
    number: '04',
    color: 'rose',
    description: 'Lái rồng săn từng chữ. Ghép đúng từ để lớn lên và đi xa hơn.',
    meta: '3 mạng · Chơi vô tận',
    tiles: ['龙', '字'],
  },
];

export function Lobby({
  navigate,
  notFound = false,
}: {
  navigate(path: string): void;
  notFound?: boolean;
}) {
  const [help, setHelp] = useState(false);
  const [choice, setChoice] = useState<(typeof games)[number] | null>(null);
  const [notice, setNotice] = useState('');
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice('Trình duyệt chưa hỗ trợ toàn màn hình. Bạn vẫn có thể chơi ngay.');
    }
  };
  return (
    <div className="arcade-lobby">
      <div className="lobby-world" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>游</span>
        <span>学</span>
      </div>
      <header className="lobby-topbar">
        <a
          href="/games"
          className="arcade-brand"
          onClick={(event) => {
            event.preventDefault();
            navigate('/games');
          }}
        >
          <img src="/favicon.svg" alt="" />
          <span>
            hanplay<b>ARCADE</b>
          </span>
        </a>
        <span className="lobby-status">
          <i /> SẴN SÀNG CHƠI
        </span>
        <div className="lobby-actions">
          <button className="arcade-icon" onClick={() => setHelp(true)} aria-label="Cách chơi">
            <Gamepad2 size={20} />
          </button>
          <button className="arcade-icon" onClick={fullscreen} aria-label="Toàn màn hình">
            <Expand size={18} />
          </button>
        </div>
      </header>
      <main className="lobby-content">
        <div className="lobby-heading">
          <div>
            <span className="arcade-kicker">
              <Sparkles size={14} /> MỖI LƯỢT CHƠI, MỘT KHÁM PHÁ
            </span>
            <h1>
              {notFound ? (
                'Lạc đường một chút?'
              ) : (
                <>
                  Chọn một game.
                  <br className="lobby-mobile-break" /> <em>Bắt đầu thôi.</em>
                </>
              )}
            </h1>
            <p>
              {notFound
                ? 'Game này chưa có trong sảnh. Chọn một cuộc chơi bên dưới nhé.'
                : 'Tiếng Trung đang chờ bạn ở màn tiếp theo.'}
            </p>
          </div>
          <span className="lobby-chapter">
            CHỌN MÀN CHƠI<span>01 — 04</span>
          </span>
        </div>
        <div className="lobby-games">
          {games.map((game) => (
            <a
              className={`lobby-game theme-${game.color}`}
              href={`/games/${game.route}`}
              key={game.route}
              onClick={(event) => {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                // Every game opens with a mode choice; the one-player page is unchanged.
                setChoice(game);
              }}
            >
              <div className="lobby-game-scene" aria-hidden="true">
                <span className="lobby-game-number">{game.number}</span>
                <div className="lobby-glyph">{game.glyph}</div>
                <div className="lobby-mini-tiles">
                  {game.tiles.map((tile) => (
                    <span key={tile}>{tile}</span>
                  ))}
                </div>
                <i className="lobby-scene-orbit" />
              </div>
              <div className="lobby-game-copy">
                <span className="arcade-kicker">{game.tag}</span>
                <h2>{game.name}</h2>
                <p>{game.description}</p>
                <div className="lobby-game-bottom">
                  <small>{game.meta}</small>
                  <span className="lobby-play">
                    CHƠI <ArrowRight size={18} />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </main>
      <footer className="lobby-footer">
        <span>
          <MousePointer2 size={14} /> Chuột & cảm ứng <i /> <Keyboard size={15} /> Bàn phím
        </span>
        <span>KHÔNG TÀI KHOẢN. VÀO LÀ CHƠI.</span>
        <b>玩中学 · 学中玩</b>
      </footer>
      {notice && (
        <div className="arcade-notice" role="status">
          {notice}
          <button className="arcade-icon" onClick={() => setNotice('')} aria-label="Đóng thông báo">
            <X size={16} />
          </button>
        </div>
      )}
      {choice && (
        <ArcadeDialog title={choice.name} close={() => setChoice(null)}>
          <div className="mode-choice">
            <button
              className="mode-choice-option"
              onClick={() => {
                setChoice(null);
                navigate(`/games/${choice.route}`);
              }}
            >
              <User size={26} />
              <b>1 người</b>
              <span>Chơi một mình, theo nhịp của bạn.</span>
            </button>
            <button
              className="mode-choice-option is-duel"
              disabled={!duelGames.has(choice.route)}
              onClick={() => {
                setChoice(null);
                navigate(`/games/solo?tro=${choice.route}`);
              }}
            >
              <Swords size={26} />
              <b>Solo 2 người</b>
              <span>
                {duelGames.has(choice.route)
                  ? 'Đối kháng trên cùng một bàn. Tạo phòng, gửi mã mời.'
                  : 'Sắp có cho game này.'}
              </span>
            </button>
          </div>
          <button
            className="garden-text-button mode-choice-join"
            onClick={() => {
              setChoice(null);
              navigate('/games/solo');
            }}
          >
            Đã có mã phòng? Vào phòng solo
          </button>
        </ArcadeDialog>
      )}
      {help && (
        <ArcadeDialog title="Sẵn sàng vào cuộc?" close={() => setHelp(false)}>
          <div className="lobby-help">
            <p>Chọn một trong bốn game. Trước mỗi lượt, chọn cấp độ và bài muốn luyện.</p>
            <p>Dùng chuột, cảm ứng hoặc bàn phím. Mỗi game có hướng dẫn riêng ở nút dấu hỏi.</p>
            <p>Điểm cao nhất được lưu trên thiết bị. Rời game sẽ hủy lượt đang chơi.</p>
            <button className="garden-primary" onClick={() => setHelp(false)}>
              VÀO SẢNH <ArrowRight size={18} />
            </button>
          </div>
        </ArcadeDialog>
      )}
    </div>
  );
}
