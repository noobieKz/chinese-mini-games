import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, GraduationCap, LockKeyhole, RefreshCw } from 'lucide-react';
import type { AuthView } from '../../shared/auth';
import { loadGoogleIdentity } from '../lib/google';
import './entry.css';
export function TeacherLogin({
  auth,
  ready,
  onSignedIn,
}: {
  auth: AuthView;
  ready: boolean;
  onSignedIn: (view: AuthView) => void;
}) {
  const target = useRef<HTMLDivElement>(null);
  const callback = useRef(onSignedIn);
  callback.current = onSignedIn;
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!ready || !auth.clientId) return;
    let cancelled = false;
    let submitting = false;
    void (async () => {
      try {
        const response = await fetch('/api/auth/challenge', {
          method: 'POST',
          credentials: 'same-origin',
        });
        const challenge = await response.json();
        if (!response.ok) throw new Error(challenge.error);
        const google = await loadGoogleIdentity();
        if (cancelled || !target.current) return;
        google.initialize({
          client_id: auth.clientId!,
          nonce: challenge.nonce,
          auto_select: false,
          callback: async (credential) => {
            if (cancelled || submitting) return;
            submitting = true;
            setBusy(true);
            setError('');
            try {
              const result = await fetch('/api/auth/google', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credential),
              });
              const view = await result.json();
              if (!result.ok) throw new Error(view.error);
              if (!cancelled) callback.current(view);
            } catch (e) {
              if (!cancelled) {
                setError((e as Error).message);
                setAttempt((n) => n + 1);
              }
            } finally {
              submitting = false;
              if (!cancelled) setBusy(false);
            }
          },
        });
        target.current.replaceChildren();
        google.renderButton(target.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          width: Math.min(330, target.current.clientWidth),
        });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.clientId, ready, attempt]);
  return (
    <div className="teacher-login">
      <a className="entry-back" href="/">
        <ArrowLeft size={17} />
        Về trang học viên
      </a>
      <section className="teacher-login-card">
        <div className="entry-form-icon">
          <GraduationCap size={30} />
        </div>
        <span className="entry-eyebrow">KHÔNG GIAN GIÁO VIÊN</span>
        <h1>
          Một lớp học thật đáng nhớ
          <br />
          bắt đầu từ thầy cô.
        </h1>
        <p>
          Đăng nhập bằng tài khoản Google đã được cấp quyền để quản lý bộ câu hỏi và tổ chức cuộc
          chơi.
        </p>
        {!ready ? (
          <div className="auth-status">Đang kiểm tra phiên đăng nhập…</div>
        ) : !auth.clientId ? (
          <div className="auth-status">
            Khu giáo viên đang được thiết lập.
            <br />
            Học viên vẫn có thể tham gia phòng từ trang chủ.
          </div>
        ) : (
          <>
            <div ref={target} className={`google-login-target ${busy ? 'auth-busy' : ''}`} />
            {busy && <p className="auth-status">Đang xác minh tài khoản…</p>}
          </>
        )}
        {error && (
          <div className="login-error" role="alert">
            {error}
            <button
              onClick={() => {
                setError('');
                setAttempt((n) => n + 1);
              }}
            >
              <RefreshCw size={15} />
              Thử lại
            </button>
          </div>
        )}
        <div className="teacher-private">
          <LockKeyhole size={15} />
          Chỉ tài khoản trong danh sách cho phép được truy cập.
        </div>
      </section>
    </div>
  );
}
