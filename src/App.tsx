import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Flower2, Gamepad2, Sparkles } from 'lucide-react';
import { FruitSlash } from './games/fruit-slash/FruitSlash';
import { WordGarden } from './games/word-garden/WordGarden';
import type { MatchMode } from './games/word-garden/vocabulary';
import './games/word-garden/garden.css';
const getPage = () => location.pathname + location.search;
const getMode = (path: string): MatchMode | null => {
  const [route, query] = path.split('?');
  if (route === '/games/noi-tu') return 'meaning';
  if (route === '/games/ghep-chu') return 'characters';
  if (route === '/games/pikachu')
    return new URLSearchParams(query).get('mode') === 'meaning' ? 'meaning' : 'characters';
  return null;
};
export default function App() {
  const [path, setPath] = useState(getPage);
  const mode = getMode(path);
  useEffect(() => {
    document.title = path.startsWith('/games/chem-hoa-qua')
      ? 'Chém hoa quả · HanPlay'
      : mode
        ? mode === 'meaning'
          ? 'Nối từ với nghĩa · HanPlay'
          : 'Ghép chữ thành từ · HanPlay'
        : 'HanPlay · Chơi một lượt, nhớ thêm một từ';
  }, [path, mode]);
  useEffect(() => {
    const changed = () => setPath(getPage());
    window.addEventListener('popstate', changed);
    return () => window.removeEventListener('popstate', changed);
  }, []);
  const navigate = (path: string) => {
    history.pushState({}, '', path);
    setPath(path);
    window.scrollTo(0, 0);
  };
  if (path.split('?')[0] === '/games/chem-hoa-qua')
    return <FruitSlash onBack={() => navigate('/games')} />;
  if (mode) return <WordGarden key={mode} mode={mode} onBack={() => navigate('/games')} />;
  return (
    <div className="garden-library">
      <header className="library-nav">
        <a className="garden-brand" href="/games">
          <span>汉</span>hanplay<span className="brand-dot">.</span>
        </a>
        <span>
          <Gamepad2 size={18} /> Góc chơi tiếng Trung
        </span>
        <a href="#games">
          Khám phá game <ArrowRight size={16} />
        </a>
      </header>
      <main>
        <div className="library-hero">
          <div className="library-hero-copy">
            <div className="garden-eyebrow">
              <Flower2 size={16} /> MỖI NGÀY MỘT CHÚT TIẾNG TRUNG
            </div>
            <h1>
              Chơi một lượt.
              <br />
              Nhớ thêm <em>một từ.</em>
            </h1>
            <p>
              Một khu vườn nhỏ cho những từ mới. Chọn trò chơi, thả lỏng và khám phá tiếng Trung
              theo cách của bạn.
            </p>
            <a className="garden-primary" href="#games">
              Hôm nay chơi gì? <ArrowRight size={19} />
            </a>
            <span className="library-meta">Không đăng nhập · Chơi ngay trên điện thoại</span>
          </div>
          <div className="library-art" aria-hidden="true">
            <div className="art-orbit" />
            <span className="art-caption">让学习开花 · LET LEARNING BLOOM</span>
            <div className="art-tile tile-one">
              朋<small>péng</small>
            </div>
            <div className="art-tile tile-two">
              友<small>yǒu</small>
            </div>
            <div className="art-word">
              <Flower2 size={22} />
              <span>
                朋友<b>Một người bạn. Một từ mới.</b>
              </span>
              <Sparkles size={20} />
            </div>
            <span className="art-spark">✦</span>
            <span className="art-leaf">✧</span>
          </div>
        </div>
        <section className="library-games" id="games">
          <div className="library-section-heading">
            <div>
              <span className="garden-eyebrow">CHỌN MỘT NIỀM VUI NHỎ</span>
              <h2>Góc chơi của bạn</h2>
            </div>
            <span>03 trò chơi · HSK 1–2</span>
          </div>
          <div className="library-card-grid">
            <a
              href="/games/ghep-chu"
              onClick={(e) => {
                e.preventDefault();
                navigate('/games/ghep-chu');
              }}
              className="library-game-card"
            >
              <div className="game-card-art characters-art">
                <span>电</span>
                <i>＋</i>
                <span>脑</span>
                <div className="card-art-stars">✧ &nbsp; 电脑 · máy tính &nbsp; ✧</div>
              </div>
              <div className="game-card-copy">
                <span className="garden-eyebrow">PIKACHU · GHÉP CHỮ</span>
                <h3>Ghép chữ thành từ</h3>
                <p>
                  Nối hai chữ thành một từ tiếng Trung. Chơi Bình thường hoặc thử đúng thứ tự ở mức
                  Khó.
                </p>
                <div>
                  <span>
                    <BookOpen size={15} /> HSK 1 · HSK 2
                  </span>
                  <b>
                    Vào chơi <ArrowRight size={17} />
                  </b>
                </div>
              </div>
            </a>
            <a
              href="/games/noi-tu"
              className="library-game-card"
              onClick={(event) => {
                event.preventDefault();
                navigate('/games/noi-tu');
              }}
            >
              <div className="game-card-art meaning-art">
                <span>你好</span>
                <i>↔</i>
                <span>xin chào</span>
                <div className="card-art-stars">✧ &nbsp; Hán tự · ý nghĩa &nbsp; ✧</div>
              </div>
              <div className="game-card-copy">
                <span className="garden-eyebrow">PIKACHU · NỐI NGHĨA</span>
                <h3>Nối từ với nghĩa</h3>
                <p>
                  Tìm cặp từ tiếng Trung và nghĩa tiếng Việt tương ứng. Mỗi đường nối, thêm một từ
                  được nhớ.
                </p>
                <div>
                  <span>
                    <BookOpen size={15} /> HSK 1 · HSK 2
                  </span>
                  <b>
                    Vào chơi <ArrowRight size={17} />
                  </b>
                </div>
              </div>
            </a>
            <a
              href="/games/chem-hoa-qua"
              className="library-game-card"
              onClick={(event) => {
                event.preventDefault();
                navigate('/games/chem-hoa-qua');
              }}
            >
              <div className="fruit-library-art" aria-hidden="true">
                <div className="fruit-token" />
                <div className="fruit-token citrus" />
                <div className="fruit-token melon" />
                <div className="fruit-card-caption">FRUIT SLASH · 词语切切乐</div>
              </div>
              <div className="game-card-copy">
                <span className="garden-eyebrow">PHẢN XẠ · TỪ VỰNG & GHÉP TỪ</span>
                <h3>Chém hoa quả</h3>
                <p>
                  Vuốt qua quả có đáp án đúng. Rèn phản xạ, nối combo và học thêm từ tiếng Trung.
                </p>
                <div>
                  <span>
                    <BookOpen size={15} />
                    HSK 1 · HSK 2 · Ghép từ
                  </span>
                  <b>
                    Vào chơi <ArrowRight size={17} />
                  </b>
                </div>
              </div>
            </a>
          </div>
        </section>
        <footer className="library-footer">
          <a className="garden-brand" href="/games">
            hanplay<span className="brand-dot">.</span>
          </a>
          <span>Học nhẹ nhàng. Nhớ tự nhiên.</span>
          <span>Nội dung mẫu để luyện tập · Điểm lưu trên thiết bị</span>
        </footer>
      </main>
    </div>
  );
}
