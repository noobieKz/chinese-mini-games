import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Teacher } from '../shared/auth';

export const DEFAULT_TEACHERS = 'giathe.bk@gmail.com,anhbpt.haui@gmail.com';
export type AuthConfig = { clientId: string; emails: string; origins: string };
export interface AuthStore {
  take<T>(key: string): Promise<T | undefined>;
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<unknown>;
}
export class MemoryAuthStore implements AuthStore {
  private values = new Map<string, unknown>();
  async take<T>(key: string) {
    const value = this.values.get(key) as T | undefined;
    this.values.delete(key);
    return value;
  }
  async get<T>(key: string) {
    return this.values.get(key) as T | undefined;
  }
  async put(key: string, value: unknown) {
    this.values.set(key, value);
  }
  async delete(key: string) {
    return this.values.delete(key);
  }
}
type Session = { teacher: Teacher; expires: number; csrf: string };
type Challenge = { nonce: string; expires: number };
export type VerifiedIdentity = JWTPayload & {
  email?: string;
  email_verified?: boolean;
  name?: string;
  nonce?: string;
};
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export async function verifyGoogleToken(
  token: string,
  clientId: string,
): Promise<VerifiedIdentity> {
  const { payload } = await jwtVerify(token, jwks, {
    audience: clientId,
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    algorithms: ['RS256'],
  });
  return payload as VerifiedIdentity;
}
const random = () => crypto.randomUUID() + crypto.randomUUID();
export const sessionCookie = 'hanplay_teacher';
const challengeCookie = 'hanplay_challenge';
export function readCookie(header: string | null, name: string): string | undefined {
  const value = header
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(name + '='))
    ?.slice(name.length + 1);
  return value && /^[a-f0-9-]{72}$/.test(value) ? value : undefined;
}
async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 20000) {
      await reader.cancel();
      throw new Error('Payload too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
function cookie(name: string, value: string, secure: boolean, maxAge: number) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
export class AuthService {
  private allowlist: Set<string>;
  private origins: Set<string>;
  constructor(
    public config: AuthConfig,
    private store: AuthStore,
    private verify = verifyGoogleToken,
  ) {
    this.allowlist = new Set(
      config.emails
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    this.origins = new Set(
      config.origins
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  allowedOrigin(origin: string) {
    return this.origins.has(origin);
  }
  async getSession(token?: string): Promise<Session | null> {
    if (!token || !/^[a-f0-9-]{72}$/.test(token)) return null;
    const session = await this.store.get<Session>('session:' + token);
    if (!session) return null;
    if (session.expires <= Date.now() || !this.allowlist.has(session.teacher.email)) {
      await this.store.delete('session:' + token);
      return null;
    }
    return session;
  }
  async teacher(cookieHeader: string | null) {
    return (await this.getSession(readCookie(cookieHeader, sessionCookie)))?.teacher ?? null;
  }
  /** Server-only: called after verified Google identity. No HTTP bypass endpoint exists. */
  async createSession(teacher: Teacher) {
    if (!this.allowlist.has(teacher.email)) throw new Error('Email không được phép.');
    const token = random();
    const session: Session = { teacher, csrf: random(), expires: Date.now() + 8 * 3600000 };
    await this.store.put('session:' + token, session);
    return { token, session };
  }
  async handle(request: Request, onLogout?: (token: string) => void): Promise<Response> {
    const url = new URL(request.url);
    const secure = url.protocol === 'https:';
    const token = readCookie(request.headers.get('cookie'), sessionCookie);
    if (url.pathname === '/api/auth/session' && request.method === 'GET') {
      const session = await this.getSession(token);
      return json({
        teacher: session?.teacher ?? null,
        clientId: this.config.clientId || null,
        csrfToken: session?.csrf,
      });
    }
    if (url.pathname === '/api/auth/challenge' && request.method === 'POST') {
      if (!this.allowedOrigin(request.headers.get('origin') ?? ''))
        return json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
      if (!this.config.clientId)
        return json({ error: 'Đăng nhập Google chưa được cấu hình.' }, 503);
      const previous = readCookie(request.headers.get('cookie'), challengeCookie);
      if (previous) await this.store.delete('challenge:' + previous);
      const id = random(),
        nonce = random();
      await this.store.put('challenge:' + id, { nonce, expires: Date.now() + 10 * 60000 });
      return json({ nonce }, 200, { 'Set-Cookie': cookie(challengeCookie, id, secure, 600) });
    }
    if (url.pathname === '/api/auth/google' && request.method === 'POST') {
      if (!this.allowedOrigin(request.headers.get('origin') ?? ''))
        return json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
      if (!this.config.clientId)
        return json({ error: 'Đăng nhập Google chưa được cấu hình.' }, 503);
      const id = readCookie(request.headers.get('cookie'), challengeCookie);
      const challenge = id ? await this.store.take<Challenge>('challenge:' + id) : undefined;
      if (!challenge || challenge.expires < Date.now())
        return json({ error: 'Phiên đăng nhập đã hết hạn. Hãy thử lại.' }, 401);
      try {
        const text = await boundedBody(request);
        if (text.length > 20000) throw new Error();
        const data = JSON.parse(text);
        if (typeof data.credential !== 'string') throw new Error();
        const identity = await this.verify(data.credential, this.config.clientId);
        if (
          !identity.sub ||
          !identity.email ||
          identity.email_verified !== true ||
          identity.nonce !== challenge.nonce
        )
          throw new Error();
        const email = identity.email.toLowerCase();
        if (!this.allowlist.has(email))
          return json({ error: 'Tài khoản này chưa được cấp quyền giáo viên.' }, 403);
        const teacher = { id: identity.sub, email, name: identity.name ?? email };
        const created = await this.createSession(teacher);
        if (token) await this.store.delete('session:' + token);
        const headers = new Headers({ 'Cache-Control': 'no-store' });
        headers.append('Set-Cookie', cookie(sessionCookie, created.token, secure, 8 * 3600));
        headers.append('Set-Cookie', cookie(challengeCookie, '', secure, 0));
        return Response.json(
          { teacher, clientId: this.config.clientId, csrfToken: created.session.csrf },
          { headers },
        );
      } catch {
        return json({ error: 'Không xác minh được tài khoản Google. Hãy đăng nhập lại.' }, 401);
      }
    }
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      const session = await this.getSession(token);
      if (
        !this.allowedOrigin(request.headers.get('origin') ?? '') ||
        !session ||
        request.headers.get('x-csrf-token') !== session.csrf
      )
        return json({ error: 'Yêu cầu đăng xuất không hợp lệ.' }, 403);
      await this.store.delete('session:' + token);
      if (token) onLogout?.(token);
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(sessionCookie, '', secure, 0) });
    }
    return json({ error: 'Không tìm thấy API.' }, 404);
  }
}
