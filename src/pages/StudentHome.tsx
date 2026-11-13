import { ArrowRight, Gamepad2, GraduationCap, ShieldCheck } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { Chest } from '../components/Chest';
import { parsePastedRoomCode } from '../lib/room-code';
import './entry.css';
type Props = {
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  busy: boolean;
  connected: boolean;
  join: () => void;
  notify: (message: string) => void;
};
export function StudentHome({
  code,
  setCode,
  name,
  setName,
  busy,
  connected,
  join,
  notify,
}: Props) {
  return (
    <div className="student-home">
      <header className="entry-header">
        <a href="/" className="entry-brand">
          <span>汉</span>han<b>play</b>
        </a>
        <a className="teacher-entry" href="/teacher">
          <GraduationCap size={17} />
          Dành cho giáo viên
        </a>
      </header>
      <main className="student-main">
        <section className="student-welcome">
          <span className="entry-eyebrow">CÙNG HỌC · CÙNG CHƠI · CÙNG CHINH PHỤC</span>
          <h1>
            Đồng đội đang chờ.
            <br />
            <em>Vào cuộc chơi thôi!</em>
          </h1>
          <p>
            Mỗi câu hỏi là một khám phá.
            <br />
            Mang kiến thức tiếng Trung về kho vàng của đội bạn.
          </p>
          <div className="student-art">
            <span className="student-art-word">加油!</span>
            <Chest />
            <span className="student-star">✦</span>
          </div>
          <div className="entry-assurance">
            <ShieldCheck size={17} />
            Không cần tài khoản. Chỉ cần mã phòng từ giáo viên.
          </div>
        </section>
        <section className="student-join">
          <div className="entry-form-icon">
            <Gamepad2 size={26} />
          </div>
          <h2>Sẵn sàng chưa?</h2>
          <p>Nhập mã phòng và tên để gặp đồng đội.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              join();
            }}
          >
            <label>
              Mã phòng
              <input
                autoFocus
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
                maxLength={6}
                minLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = parsePastedRoomCode(e.clipboardData.getData('text/plain'));
                  if (pasted) setCode(pasted);
                  else notify('Hãy dán mã 6 số hoặc liên kết mời hợp lệ.');
                }}
                placeholder="000000"
                className="student-code"
                aria-describedby="student-code-help"
              />
            </label>
            <small id="student-code-help">Dán mã phòng hoặc cả liên kết mời đều được.</small>
            <label>
              Tên của bạn
              <input
                required
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Để đồng đội nhận ra bạn nhé"
                autoComplete="nickname"
              />
            </label>
            <button className="button primary full" disabled={busy || !connected || !name.trim()}>
              {busy ? 'Đang tìm đồng đội…' : 'Vào cuộc chơi'}
              <ArrowRight size={19} />
            </button>
            <span className={`entry-network ${connected ? 'ready' : ''}`}>
              <i />
              {connected ? 'Đã kết nối · Sẵn sàng chơi' : 'Đang kết nối máy chủ…'}
            </span>
          </form>
        </section>
      </main>
      <footer className="entry-footer">
        一起玩，一起学 <span>Học cùng nhau, vui gấp bội.</span>
      </footer>
    </div>
  );
}
