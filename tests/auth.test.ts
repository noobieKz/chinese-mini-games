import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService, MemoryAuthStore, type VerifiedIdentity } from '../server/auth';
const config = {
  clientId: 'google-client-id',
  emails: 'giathe.bk@gmail.com,anhbpt.haui@gmail.com',
  origins: 'http://localhost:5173,https://hanplay-classroom.pages.dev',
};
test('Google nonce, verified email, allowlist and one-use challenges protect login', async () => {
  let identity: VerifiedIdentity = {};
  const auth = new AuthService(config, new MemoryAuthStore(), async () => identity);
  async function attempt(patch: Partial<VerifiedIdentity> = {}) {
    const response = await auth.handle(
      new Request('http://localhost:5173/api/auth/challenge', {
        method: 'POST',
        headers: { Origin: 'http://localhost:5173' },
      }),
    );
    const { nonce } = (await response.json()) as { nonce: string };
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    identity = {
      sub: 'google-user',
      email: 'giathe.bk@gmail.com',
      email_verified: true,
      nonce,
      ...patch,
    };
    const request = new Request('http://localhost:5173/api/auth/google', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential: 'signed-token-test-fixture' }),
    });
    const result = await auth.handle(request.clone());
    return { result, request };
  }
  assert.equal((await attempt({ email_verified: false })).result.status, 401);
  assert.equal((await attempt({ nonce: 'wrong' })).result.status, 401);
  assert.equal((await attempt({ email: 'stranger@gmail.com' })).result.status, 403);
  const { result, request } = await attempt();
  assert.equal(result.status, 200);
  assert.match(result.headers.get('set-cookie')!, /HttpOnly/);
  assert.match(result.headers.get('set-cookie')!, /SameSite=Lax/);
  assert.equal((await auth.handle(request)).status, 401, 'challenge cannot be replayed');
  const cookie = result.headers
    .getSetCookie()
    .find((c) => c.startsWith('hanplay_teacher='))!
    .split(';')[0];
  const view = (await (
    await auth.handle(
      new Request('http://localhost:5173/api/auth/session', { headers: { Cookie: cookie } }),
    )
  ).json()) as { teacher: { email: string }; csrfToken: string };
  assert.equal(view.teacher.email, 'giathe.bk@gmail.com');
  const denied = await auth.handle(
    new Request('http://localhost:5173/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://evil.example', Cookie: cookie, 'X-CSRF-Token': view.csrfToken },
    }),
  );
  assert.equal(denied.status, 403);
  const logout = await auth.handle(
    new Request('http://localhost:5173/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173', Cookie: cookie, 'X-CSRF-Token': view.csrfToken },
    }),
  );
  assert.equal(logout.status, 200);
  assert.equal(await auth.teacher(cookie), null);
});
test('unconfigured auth fails closed, and cross-origin login is denied', async () => {
  const auth = new AuthService({ ...config, clientId: '' }, new MemoryAuthStore());
  assert.equal(
    (
      await auth.handle(
        new Request('http://localhost:5173/api/auth/challenge', {
          method: 'POST',
          headers: { Origin: 'http://localhost:5173' },
        }),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await auth.handle(
        new Request('https://hanplay-classroom.pages.dev/api/auth/google', {
          method: 'POST',
          headers: { Origin: 'https://evil.example' },
        }),
      )
    ).status,
    403,
  );
  assert.equal(await auth.teacher('hanplay_teacher=forged'), null);
});
test('production sets Secure cookies and both configured origins can obtain a challenge', async () => {
  const auth = new AuthService(config, new MemoryAuthStore());
  for (const origin of ['http://localhost:5173', 'https://hanplay-classroom.pages.dev']) {
    const response = await auth.handle(
      new Request(origin + '/api/auth/challenge', { method: 'POST', headers: { Origin: origin } }),
    );
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get('set-cookie')!.includes('; Secure'),
      origin.startsWith('https'),
    );
  }
});
