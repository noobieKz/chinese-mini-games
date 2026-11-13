import type { Bank } from '../../shared/types';
import type { Dispatch, SetStateAction } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Coins,
  Gamepad2,
  Plus,
  Search,
  Swords,
  Users,
  Zap,
} from 'lucide-react';

import { Chest } from '../components/Chest';

export function HomePage({
  search,
  setSearch,
  openCreate,
  setEditor,
  setModal,
}: {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  openCreate: (id?: string) => void;
  setEditor: Dispatch<SetStateAction<Bank | true | null>>;
  setModal: Dispatch<SetStateAction<'create' | 'join' | 'rules' | null>>;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            NI HAO, THẦY CÔ! <span>✺</span>
          </div>
          <h1>Hôm nay, mình chơi gì?</h1>
          <p>Thêm một chút thi đua, thêm thật nhiều hứng thú học tiếng Trung.</p>
        </div>
        <span className="greeting-stamp">
          学<span>HỌC MÀ CHƠI</span>
        </span>
      </div>
      <section className="hero">
        <div className="hero-content">
          <span className="hero-tag">
            <span />
            LỚP HỌC VUI HƠN, KẾT NỐI NHIỀU HƠN
          </span>
          <h2>
            Một lớp học.
            <br />
            Ngàn khoảnh khắc <em>vui.</em>
            <svg viewBox="0 0 210 12" aria-hidden="true">
              <path
                d="M3 9Q100-5 207 6"
                stroke="#F6CF69"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </h2>
          <p>
            Biến từ vựng thành thử thách, biến đồng đội thành động lực.
            <br className="desktop-break" /> Cùng học tiếng Trung theo cách thật khác!
          </p>
          <div className="hero-actions">
            <button className="button yellow" onClick={() => openCreate()}>
              <Plus size={19} />
              Tạo phòng chơi
              <ArrowUpRight size={18} />
            </button>
            <button className="hero-link" onClick={() => setModal('rules')}>
              Khám phá cách chơi
              <ArrowRight size={17} />
            </button>
          </div>
          <div className="hero-foot">
            <span className="mini-avatars">
              <i>林</i>
              <i>安</i>
              <i>明</i>
            </span>
            <span>Cùng nhau chơi · Cùng nhau tiến bộ</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="hero-spark spark-one">✦</span>
          <span className="hero-spark spark-two">✧</span>
          <span className="float-card float-nihao">
            <span>你好 !</span>
            <small>nǐ hǎo · xin chào</small>
          </span>
          <span className="float-card float-gold">
            <Coins size={20} />
            <b>+100</b>
            <small>giỏi quá!</small>
          </span>
          <Chest />
          <span className="art-label">Kho báu kiến thức đang chờ bạn</span>
        </div>
      </section>
      <div className="library-heading">
        <div>
          <h2>
            Góc chơi của lớp mình <span className="count-pill">03</span>
          </h2>
          <p>Chọn một trò chơi. Bắt đầu một hành trình.</p>
        </div>
        <span className="live-pill">
          <i />1 game sẵn sàng
        </span>
      </div>
      <div className="filter-row">
        <div className="filter-tabs">
          <button className={!search ? 'selected' : ''} onClick={() => setSearch('')}>
            Tất cả game
          </button>
          <button className={search === 'cướp' ? 'selected' : ''} onClick={() => setSearch('cướp')}>
            Thi đấu theo đội
          </button>
        </div>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Tìm game"
            placeholder="Tìm trò chơi…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="game-grid">
        {(!search || 'cướp vàng 金币大作战'.includes(search.toLowerCase())) && (
          <article className="game-card featured">
            <div className="game-art gold-art">
              <span className="art-badge">
                <span />
                SẴN SÀNG CHƠI
              </span>
              <span className="art-character">金</span>
              <Chest small />
              <div className="art-bottom">
                <span>金币大作战</span>
                <span>✦</span>
              </div>
            </div>
            <div className="game-content">
              <div className="game-title">
                <h3>Cướp vàng</h3>
                <span className="hot-tag">
                  <Zap size={12} />
                  HOT
                </span>
              </div>
              <p>
                Trả lời thật chuẩn, mở rương thật đã.
                <br />
                Đội nào sẽ làm chủ kho vàng?
              </p>
              <div className="game-meta">
                <span>
                  <Users size={14} />
                  2–4 đội
                </span>
                <span>
                  <Clock3 size={14} />
                  1–15 phút
                </span>
              </div>
              <button className="button primary" onClick={() => openCreate()}>
                Chơi ngay
                <ArrowRight size={17} />
              </button>
            </div>
          </article>
        )}
        {(!search || 'tiếp sức ghép câu'.includes(search.toLowerCase())) && (
          <article className="game-card">
            <div className="game-art mint-art">
              <span className="art-badge upcoming">ĐANG PHÁT TRIỂN</span>
              <div className="word-tiles">
                <span>我</span>
                <span>喜欢</span>
                <span>中文</span>
              </div>
              <div className="tile-line">
                ✦ <span>━━ ━━ ━━</span> ↗
              </div>
              <div className="art-bottom">
                <span>句子接力赛</span>
                <span>↗</span>
              </div>
            </div>
            <div className="game-content">
              <h3>Tiếp sức ghép câu</h3>
              <p>
                Mỗi người một từ, cả đội một câu.
                <br />
                Phối hợp ăn ý, về đích cùng nhau.
              </p>
              <div className="game-meta">
                <span>
                  <Users size={14} />
                  Theo đội
                </span>
                <span>
                  <Swords size={14} />
                  Ngữ pháp
                </span>
              </div>
              <div className="coming-soon">
                <Clock3 size={16} />
                Hẹn lớp mình sớm nhé
              </div>
            </div>
          </article>
        )}
        {(!search || 'ai là gián điệp'.includes(search.toLowerCase())) && (
          <article className="game-card">
            <div className="game-art peach-art">
              <span className="art-badge upcoming">ĐANG PHÁT TRIỂN</span>
              <div className="spy-art">
                <div className="spy-card">
                  苹<small>果</small>
                </div>
                <div className="spy-face">
                  <span>?</span>
                  <i />
                  <b>••</b>
                </div>
                <span className="spy-spark">✦</span>
              </div>
              <div className="art-bottom">
                <span>谁是卧底</span>
                <span>?</span>
              </div>
            </div>
            <div className="game-content">
              <h3>Ai là gián điệp?</h3>
              <p>
                Mô tả khéo, suy luận nhanh.
                <br />
                Ai đang giữ bí mật trong lớp mình?
              </p>
              <div className="game-meta">
                <span>
                  <Users size={14} />
                  Cả lớp
                </span>
                <span>
                  <Gamepad2 size={14} />
                  Luyện nói
                </span>
              </div>
              <div className="coming-soon">
                <Clock3 size={16} />
                Bí mật sắp được bật mí
              </div>
            </div>
          </article>
        )}
        {!['cướp vàng 金币大作战', 'tiếp sức ghép câu', 'ai là gián điệp'].some((s) =>
          s.includes(search.toLowerCase()),
        ) && (
          <div className="empty-state">
            <Search size={32} />
            <h3>Chưa tìm thấy trò chơi</h3>
            <p>Thử “Cướp vàng” hoặc xóa từ khóa nhé.</p>
            <button className="button secondary" onClick={() => setSearch('')}>
              Xem tất cả game
            </button>
          </div>
        )}
      </div>
      <section className="teacher-banner">
        <div className="banner-icon">
          <BookOpen size={24} />
        </div>
        <div>
          <h3>Bài học của bạn. Cuộc chơi của cả lớp.</h3>
          <p>Tạo bộ câu hỏi riêng để mỗi trò chơi đều gắn với bài đang học.</p>
        </div>
        <button onClick={() => setEditor(true)}>
          Tạo bộ câu hỏi
          <ArrowRight size={17} />
        </button>
      </section>
    </>
  );
}
