import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  Gamepad2,
  LayoutGrid,
  Menu,
  Plus,
  Trophy,
  Upload,
  Users,
  X,
  LogOut,
} from 'lucide-react';
import { defaultBanks } from '../shared/banks';
import { bankSchema } from '../shared/schema';
import type { Bank, Reply, RoomView } from '../shared/types';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { GuidePage } from './pages/GuidePage';
import { Modal } from './components/Modal';
import { BankEditor } from './components/BankEditor';
import { request, socket } from './lib/socket';
import { createId } from './lib/id';
import { parsePastedRoomCode } from './lib/room-code';
import type { AuthView } from '../shared/auth';
import { StudentHome } from './pages/StudentHome';
import { TeacherLogin } from './pages/TeacherLogin';

type Page = 'games' | 'banks' | 'guide';

function loadBanks(): Bank[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('hanplay-banks') ?? '[]');
    if (!Array.isArray(stored)) return defaultBanks;
    return [
      ...defaultBanks,
      ...stored.flatMap((value) => {
        const result = bankSchema.safeParse(value);
        return result.success ? [result.data] : [];
      }),
    ];
  } catch {
    return defaultBanks;
  }
}
export default function App() {
  const teacherRoute = location.pathname.startsWith('/teacher');
  const [auth, setAuth] = useState<AuthView>({ teacher: null, clientId: null });
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState<Page>('games');
  const [modal, setModal] = useState<'create' | 'join' | 'rules' | null>(null);
  const [editor, setEditor] = useState<Bank | true | null>(null);
  const [banks, setBanks] = useState<Bank[]>(defaultBanks);
  const [selected, setSelected] = useState('hsk1');
  const [search, setSearch] = useState('');
  const [teamCount, setTeamCount] = useState(3);
  const [duration, setDuration] = useState(5);
  const [code, setCode] = useState(new URLSearchParams(location.search).get('room') ?? '');
  const [name, setName] = useState('');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [mobile, setMobile] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const notify = (message: string) => setNotice(message);
  useEffect(() => {
    setBanks(auth.teacher ? loadBanks() : defaultBanks);
  }, [auth.teacher]);
  useEffect(() => {
    let active = true;
    void fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const view = await response.json();
        if (active) setAuth(view);
      })
      .catch(() => {
        if (active) notify('Chưa kết nối được máy chủ xác thực. Hãy thử tải lại trang.');
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const signedIn = (view: AuthView) => {
    setAuth(view);
    socket.disconnect();
    socket.connect();
  };
  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': auth.csrfToken ?? '' },
      });
      if (!response.ok) throw new Error('Chưa đăng xuất được. Vui lòng thử lại.');
      sessionStorage.removeItem('hanplay-session');
      setAuth({ ...auth, teacher: null, csrfToken: undefined });
      socket.disconnect();
      socket.connect();
    } catch (e) {
      notify((e as Error).message);
    }
  };
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const connect = () => {
      setConnected(true);
      try {
        const saved = JSON.parse(sessionStorage.getItem('hanplay-session') ?? 'null');
        if (saved)
          void request('resume', saved).catch((e) => {
            sessionStorage.removeItem('hanplay-session');
            setRoom(null);
            notify(e.message);
          });
      } catch {
        sessionStorage.removeItem('hanplay-session');
      }
    };
    const update = (value: RoomView) => {
      setRoom(value);
      setNow(Date.now());
      setModal(null);
    };
    const disconnect = () => setConnected(false);
    const authRequired = () => {
      setAuth((current) => ({ ...current, teacher: null, csrfToken: undefined }));
      sessionStorage.removeItem('hanplay-session');
      setRoom((current) => (current?.host ? null : current));
      notify('Phiên giáo viên đã kết thúc. Vui lòng đăng nhập lại.');
    };
    const replaced = () => {
      sessionStorage.removeItem('hanplay-session');
      setRoom(null);
      notify('Phiên chơi đã được mở ở cửa sổ khác.');
    };
    const expired = (expiredCode: string) => {
      try {
        const saved = JSON.parse(sessionStorage.getItem('hanplay-session') ?? 'null');
        if (saved?.code === expiredCode) {
          sessionStorage.removeItem('hanplay-session');
          setRoom(null);
          notify('Phòng đã hết hạn. Hãy tạo phòng mới.');
        }
      } catch {
        /* No active session. */
      }
    };
    socket.on('connect', connect);
    socket.on('disconnect', disconnect);
    socket.on('auth-required', authRequired);
    socket.on('room', update);
    socket.on('replaced', replaced);
    socket.on('room-expired', expired);
    socket.connect();
    if (new URLSearchParams(location.search).has('room')) setModal('join');
    return () => {
      socket.off('connect', connect);
      socket.off('disconnect', disconnect);
      socket.off('auth-required', authRequired);
      socket.off('room', update);
      socket.off('replaced', replaced);
      socket.off('room-expired', expired);
      socket.disconnect();
    };
  }, []);
  useEffect(() => {
    if (room?.status !== 'playing') return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [room?.status]);
  async function action(event: string, payload: unknown = {}, after?: (reply: Reply) => void) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await request(event, payload);
      if (result.token)
        sessionStorage.setItem(
          'hanplay-session',
          JSON.stringify({ code: result.code, token: result.token }),
        );
      after?.(result);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function saveBank(bank: Bank) {
    const custom = banks.filter(
      (b) => !defaultBanks.some((d) => d.id === b.id) && b.id !== bank.id,
    );
    const saved = {
      ...bank,
      id: defaultBanks.some((d) => d.id === bank.id) ? createId() : bank.id,
    };
    try {
      localStorage.setItem('hanplay-banks', JSON.stringify([...custom, saved]));
      setBanks([...defaultBanks, ...custom, saved]);
      setEditor(null);
      notify('Đã lưu bộ câu hỏi. Sẵn sàng cho lớp học!');
    } catch {
      notify('Không đủ dung lượng lưu. Hãy xuất bộ câu hỏi để sao lưu.');
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify('Đã sao chép!');
    } catch {
      notify(`Bạn có thể sao chép: ${text}`);
    }
  }
  function exportBank(bank: Bank) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(bank, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `hanplay-${bank.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importBank(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error();
      const b = JSON.parse(await file.text()) as Bank;
      if (
        typeof b.title !== 'string' ||
        !b.title.trim() ||
        b.title.length > 100 ||
        !Array.isArray(b.questions) ||
        b.questions.length < 4 ||
        b.questions.length > 100 ||
        b.questions.some(
          (q) =>
            typeof q.text !== 'string' ||
            !q.text.trim() ||
            q.text.length > 500 ||
            !Array.isArray(q.options) ||
            q.options.length !== 4 ||
            q.options.some((o) => typeof o !== 'string' || !o.trim() || o.length > 200) ||
            !Number.isInteger(q.answer) ||
            q.answer < 0 ||
            q.answer > 3,
        )
      )
        throw new Error();
      saveBank({
        id: createId(),
        title: b.title,
        description: 'Bộ câu hỏi được nhập từ tệp.',
        level: 'Tùy chỉnh',
        questions: b.questions.map((q) => ({
          ...q,
          id: createId(),
          pinyin: typeof q.pinyin === 'string' ? q.pinyin.slice(0, 200) : '',
        })),
      });
    } catch {
      notify('Tệp chưa hợp lệ. Dùng JSON xuất từ HanPlay, gồm 4–100 câu và 4 đáp án mỗi câu.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }
  const openCreate = (bankId?: string) => {
    if (bankId) setSelected(bankId);
    setModal('create');
  };
  const leave = () =>
    void action('leave', {}, () => {
      sessionStorage.removeItem('hanplay-session');
      setRoom(null);
      setFeedback(null);
      history.replaceState({}, '', location.pathname);
    });
  const seconds = Math.max(0, Math.ceil(((room?.endsAt ?? 0) - now) / 1000));
  if (!room && (!teacherRoute || !auth.teacher))
    return (
      <>
        <div>
          {teacherRoute ? (
            <TeacherLogin auth={auth} ready={authReady} onSignedIn={signedIn} />
          ) : (
            <StudentHome
              code={code}
              setCode={setCode}
              name={name}
              setName={setName}
              busy={busy}
              connected={connected}
              join={() => void action('join', { code, name: name.trim() })}
              notify={notify}
            />
          )}
        </div>
        {notice && (
          <div className="toast entry-toast" role="status">
            <Check size={19} />
            <span>{notice}</span>
            <button
              className="icon-button"
              onClick={() => setNotice('')}
              aria-label="Đóng thông báo"
            >
              <X size={17} />
            </button>
          </div>
        )}
      </>
    );
  return (
    <div className={`app-shell ${room ? 'in-game' : ''}`}>
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <a className="brand" href="/teacher" aria-label="HanPlay trang chủ">
          <span className="brand-mark">
            汉<span>✦</span>
          </span>
          <span>
            han<span>play</span>
            <small>一起玩，一起学</small>
          </span>
        </a>
        <button
          className="mobile-close icon-button"
          onClick={() => setMobile(false)}
          aria-label="Đóng menu"
        >
          <X />
        </button>
        <div className="nav-caption">KHÔNG GIAN LỚP HỌC</div>
        <nav>
          {(
            [
              { id: 'games', label: 'Khám phá game', icon: LayoutGrid },
              { id: 'banks', label: 'Bộ câu hỏi', icon: BookOpen },
              { id: 'guide', label: 'Hướng dẫn', icon: CircleHelp },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setPage(item.id);
                setMobile(false);
              }}
              className={page === item.id ? 'active' : ''}
            >
              <item.icon size={20} />
              {item.label}
              {item.id === 'games' && <span className="nav-count">01</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">✦</div>
          <h3>Học vui. Nhớ lâu.</h3>
          <p>Mỗi ván chơi là một bước gần hơn với tiếng Trung.</p>
          <span>加油，你可以的！</span>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">教</span>
          <div className="teacher-identity">
            <b>{auth.teacher?.name ?? 'Không gian giáo viên'}</b>
            <small title={auth.teacher?.email}>{auth.teacher?.email}</small>
          </div>
          <button
            className="icon-button teacher-logout"
            onClick={() => void logout()}
            aria-label="Đăng xuất"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobile(true)}
              aria-label="Mở menu"
            >
              <Menu />
            </button>
            <span>Không gian lớp học</span>
            <ChevronRight size={14} />
            <b>
              {room
                ? 'Phòng chơi'
                : page === 'games'
                  ? 'Khám phá game'
                  : page === 'banks'
                    ? 'Bộ câu hỏi'
                    : 'Hướng dẫn'}
            </b>
          </div>
          <div className="topbar-actions">
            <span className={`connection ${connected ? 'online' : ''}`}>
              <i />
              {connected ? 'Sẵn sàng kết nối' : 'Đang kết nối…'}
            </span>
            <button
              className="button join-top"
              onClick={() => (room ? notify('Bạn đang ở trong phòng chơi.') : setModal('join'))}
            >
              <Gamepad2 size={17} />
              Tham gia phòng
            </button>
            <span className="profile-avatar">
              H<span />
            </span>
          </div>
        </header>
        <main>
          {room ? (
            <RoomPage
              room={room}
              busy={busy}
              connected={connected}
              feedback={feedback}
              setFeedback={setFeedback}
              seconds={seconds}
              leave={leave}
              action={action}
              copy={copy}
              setConfirmEnd={setConfirmEnd}
              notify={notify}
            />
          ) : (
            <>
              {page === 'games' && (
                <HomePage
                  search={search}
                  setSearch={setSearch}
                  openCreate={openCreate}
                  setEditor={setEditor}
                  setModal={setModal}
                />
              )}
              {page === 'banks' && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">TỦ SÁCH NHỎ · Ý TƯỞNG LỚN</div>
                      <h1>Bộ câu hỏi của bạn</h1>
                      <p>Mang bài học vào cuộc chơi. Bắt đầu với bộ mẫu hoặc tự biên soạn.</p>
                    </div>
                    <button className="button primary" onClick={() => setEditor(true)}>
                      <Plus size={18} />
                      Tạo bộ câu hỏi
                    </button>
                  </div>
                  <div className="bank-tools">
                    <span className="tag">{banks.length} bộ câu hỏi</span>
                    <button className="button secondary" onClick={() => fileRef.current?.click()}>
                      <Upload size={16} />
                      Nhập JSON
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".json,application/json"
                      hidden
                      onChange={(e) => void importBank(e.target.files?.[0])}
                    />
                  </div>
                  <div className="bank-grid">
                    {banks.map((b, i) => (
                      <article className="bank-card" key={b.id}>
                        <div className={`bank-cover cover-${i % 3}`}>
                          <span>{i % 2 ? '食' : '你好'}</span>
                          <span className="tag">{b.level}</span>
                        </div>
                        <div className="bank-content">
                          <h3>{b.title}</h3>
                          <p>{b.description}</p>
                          <span className="muted">{b.questions.length} câu hỏi · Trắc nghiệm</span>
                          <div className="bank-actions">
                            <button className="button primary" onClick={() => openCreate(b.id)}>
                              Sử dụng
                              <ArrowRight size={16} />
                            </button>
                            <button
                              className="icon-button"
                              title="Xem và chỉnh sửa"
                              aria-label={`Chỉnh sửa ${b.title}`}
                              onClick={() => setEditor(b)}
                            >
                              <BookOpen size={18} />
                            </button>
                            <button
                              className="icon-button"
                              title="Xuất JSON"
                              aria-label={`Xuất ${b.title}`}
                              onClick={() => exportBank(b)}
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
              {page === 'guide' && <GuidePage openCreate={openCreate} />}
              <footer className="page-footer">
                <span>
                  <span className="tiny-logo">✦</span> hanplay · Học cùng nhau, vui gấp bội.
                </span>
                <span>
                  用快乐连接每一堂课 <span className="footer-heart">♡</span>
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      {modal === 'create' && (
        <Modal title="Sẵn sàng săn vàng?" onClose={() => setModal(null)}>
          <div className="modal-intro">
            <span>🪙</span>
            <div>
              <b>Cướp vàng · 金币大作战</b>
              <p>Một bộ câu hỏi, một cuộc phiêu lưu của cả lớp.</p>
            </div>
          </div>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void action('create', {
                bank: banks.find((b) => b.id === selected) ?? banks[0],
                teamCount,
                duration,
              });
            }}
          >
            <label>
              Bộ câu hỏi
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {banks.map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.title} · {b.questions.length} câu
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Số đội
                <select value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))}>
                  {[2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} đội
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Thời gian
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {[1, 3, 5, 8, 10, 15].map((n) => (
                    <option key={n} value={n}>
                      {n} phút
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="info-box">
              <Users size={19} />
              <span>Tối đa 60 học viên. Chia đội tự động. Không cần đăng nhập.</span>
            </div>
            <button className="button primary full" disabled={busy || !connected}>
              {busy ? 'Đang tạo phòng…' : 'Tạo phòng chơi'}
              <ArrowRight size={18} />
            </button>
            {!connected && (
              <p className="error" role="alert">
                Đang chờ kết nối máy chủ…
              </p>
            )}
          </form>
        </Modal>
      )}
      {modal === 'join' && (
        <Modal title="Đồng đội đang chờ bạn!" onClose={() => setModal(null)}>
          <div className="join-illustration">
            🙌 <span>一起加油！</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action('join', { code, name: name.trim() });
            }}
          >
            <label>
              Mã phòng
              <input
                autoFocus
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                minLength={6}
                required
                className="room-code-input"
                placeholder="000000"
                value={code}
                aria-describedby="room-paste-hint"
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedCode = parsePastedRoomCode(e.clipboardData.getData('text/plain'));
                  if (pastedCode) setCode(pastedCode);
                  else notify('Hãy dán mã phòng 6 số hoặc liên kết mời có mã phòng hợp lệ.');
                }}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            <p id="room-paste-hint" className="room-paste-hint">
              Bạn có thể dán mã 6 số hoặc cả liên kết mời vào ô trên.
            </p>
            <label>
              Tên của bạn
              <input
                required
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Để đồng đội biết bạn là ai nhé"
              />
            </label>
            <button className="button primary full" disabled={busy || !connected || !name.trim()}>
              {busy ? 'Đang vào phòng…' : 'Vào cuộc chơi'}
              <ArrowRight size={18} />
            </button>
          </form>
        </Modal>
      )}
      {modal === 'rules' && (
        <Modal title="Cướp vàng chơi thế nào?" onClose={() => setModal(null)}>
          <div className="rules-list">
            <p>
              <b>01 · Trả lời câu hỏi</b>
              <span>Mỗi học viên chơi trên điện thoại, vàng cộng vào kho chung của đội.</span>
            </p>
            <p>
              <b>02 · Đúng rồi, mở rương thôi!</b>
              <span>
                Nhận 100 vàng (60%), lượt cướp tối đa 150 vàng (25%) hoặc lá chắn (15%). Lá chắn
                chặn một lượt cướp.
              </span>
            </p>
            <p>
              <b>03 · Cùng đội mình về đích</b>
              <span>
                Hết thời gian, đội nhiều vàng nhất thắng. Mỗi câu chỉ trả lời một lần; nếu sai, xem
                đáp án rồi tiếp tục học nhé!
              </span>
            </p>
          </div>
          <button className="button primary full" onClick={() => setModal('create')}>
            Hiểu rồi, tạo phòng thôi
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {editor && (
        <BankEditor
          bank={editor === true ? undefined : editor}
          onClose={() => setEditor(null)}
          onSave={saveBank}
        />
      )}
      {confirmEnd && (
        <Modal title="Kết thúc cuộc săn vàng?" onClose={() => setConfirmEnd(false)}>
          <p>Ván chơi sẽ dừng cho cả lớp và bảng kết quả được công bố ngay.</p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setConfirmEnd(false)}>
              Chơi tiếp
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void action('finish', {}, () => setConfirmEnd(false))}
            >
              Công bố kết quả
              <Trophy size={17} />
            </button>
          </div>
        </Modal>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={19} />
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="icon-button" aria-label="Đóng thông báo">
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
