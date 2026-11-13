import { test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createLocalServer } from '../server/index';
import { AuthService, MemoryAuthStore } from '../server/auth';
import { defaultBanks } from '../shared/banks';
import type { Reply, RoomView } from '../shared/types';

test(
  'WebSocket room lifecycle enforces teacher identity, ownership and revocation',
  { timeout: 20000 },
  async () => {
    const auth = new AuthService(
      {
        clientId: 'test-client',
        emails: 'teacher@example.com,other@example.com',
        origins: 'http://localhost:5173',
      },
      new MemoryAuthStore(),
    );
    const owner = await auth.createSession({
      id: 'teacher-sub',
      email: 'teacher@example.com',
      name: 'Teacher',
    });
    const other = await auth.createSession({
      id: 'other-sub',
      email: 'other@example.com',
      name: 'Other',
    });
    const { http, wss } = createLocalServer(auth);
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    const address = http.address();
    assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    const clients: WebSocket[] = [];
    let sequence = 0;
    const connect = (token?: string) =>
      new Promise<{
        ws: WebSocket;
        send: (event: string, data?: unknown) => Promise<Reply>;
        view?: RoomView;
      }>((resolve, reject) => {
        const ws = new WebSocket(origin.replace('http', 'ws') + '/api/socket', {
          headers: {
            Origin: 'http://localhost:5173',
            ...(token ? { Cookie: `hanplay_teacher=${token}` } : {}),
          },
        });
        clients.push(ws);
        const pending = new Map<number, (reply: Reply) => void>();
        const client: {
          ws: WebSocket;
          send: (event: string, data?: unknown) => Promise<Reply>;
          view?: RoomView;
        } = {
          ws,
          send: (event, data = {}) =>
            new Promise((done) => {
              const id = ++sequence;
              pending.set(id, done);
              ws.send(JSON.stringify({ id, event, data }));
            }),
        };
        ws.on('message', (raw) => {
          const data = JSON.parse(raw.toString());
          if (data.event === 'room') client.view = data.data;
          if (data.id) {
            pending.get(data.id)?.(data.reply);
            pending.delete(data.id);
          }
        });
        ws.on('open', () => resolve(client));
        ws.on('error', reject);
      });
    const waitForView = (
      client: { ws: WebSocket; view?: RoomView },
      predicate: (view: RoomView) => boolean,
    ) =>
      new Promise<void>((resolve, reject) => {
        if (client.view && predicate(client.view)) {
          resolve();
          return;
        }
        const update = () => {
          if (client.view && predicate(client.view)) {
            clearTimeout(timeout);
            client.ws.off('message', update);
            resolve();
          }
        };
        const timeout = setTimeout(() => {
          client.ws.off('message', update);
          reject(new Error('Expected room update did not arrive'));
        }, 3000);
        client.ws.on('message', update);
      });
    try {
      const anon = await connect();
      assert.ok(
        (await anon.send('create', { bank: defaultBanks[0], teamCount: 2, duration: 1 })).error,
        'anonymous cannot create',
      );
      const host = await connect(owner.token);
      const student = await connect();
      const second = await connect();
      const created = await host.send('create', {
        bank: defaultBanks[0],
        teamCount: 2,
        duration: 1,
      });
      assert.match(created.code!, /^\d{6}$/);
      assert.ok(created.token);
      assert.ok((await host.send('start')).error, 'empty room cannot start');
      const joined = await student.send('join', { code: created.code, name: 'An' });
      assert.ok(joined.token);
      await second.send('join', { code: created.code, name: 'Bình' });
      const late = await connect();
      assert.ok(
        (await late.send('join', { code: created.code, name: ' an ' })).error,
        'duplicate online name is rejected',
      );
      await waitForView(student, (view) => view.players.length === 2);
      assert.deepEqual(
        student.view!.players.map((p) => p.team),
        [0, 1],
      );
      assert.equal(student.view!.host, false);
      assert.ok(!JSON.stringify(student.view).includes('hostToken'));
      const otherHost = await connect(other.token);
      assert.ok(
        (await otherHost.send('resume', { code: created.code, token: created.token })).error,
        'allowlisted teacher cannot take another owner room',
      );
      assert.ok(
        (await anon.send('resume', { code: created.code, token: created.token })).error,
        'host token alone cannot grant teacher access',
      );
      assert.ok((await student.send('start')).error);
      assert.ok(!(await host.send('start')).error);
      await waitForView(student, (view) => view.status === 'playing');
      assert.equal(student.view!.status, 'playing');
      assert.equal(typeof student.view!.serverTime, 'number');
      assert.ok(
        !(await late.send('join', { code: created.code, name: 'Cường' })).error,
        'late student can join a running game',
      );
      await waitForView(late, (view) => view.status === 'playing' && !!view.question);
      assert.ok(late.view!.activity.some((line) => line.includes('Cường vào muộn')));
      assert.ok(student.view!.question);
      assert.ok(!('answer' in student.view!.question!));
      assert.ok((await student.send('finish')).error);
      assert.equal((await student.send('answer', { index: 0, option: 0 })).correct, true);
      assert.ok(student.view!.pending);
      assert.ok((await student.send('answer', { index: 0, option: 0 })).error);
      if (student.view!.pending === 'steal')
        assert.ok((await student.send('claim', { target: 0 })).error);
      assert.ok(!(await student.send('claim', { target: 1 })).error);
      assert.ok((await student.send('claim', { target: 1 })).error);
      const restored = await connect();
      assert.ok(
        !(await restored.send('resume', { code: created.code, token: joined.token })).error,
      );
      assert.equal(restored.view!.answered, 1);
      const restoredHost = await connect(owner.token);
      assert.ok(
        !(await restoredHost.send('resume', { code: created.code, token: created.token })).error,
      );
      assert.ok(!(await restoredHost.send('finish')).error);
      await waitForView(restored, (view) => view.status === 'finished');
      assert.equal(restored.view!.status, 'finished');
      assert.ok(
        (await (await connect()).send('join', { code: created.code, name: 'Dũng' })).error,
        'finished game cannot be joined',
      );
      assert.ok((await restored.send('answer', { index: 1, option: 1 })).error);
      const loggedOut = await fetch(origin + '/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `hanplay_teacher=${owner.token}`,
          Origin: 'http://localhost:5173',
          'X-CSRF-Token': owner.session.csrf,
        },
      });
      assert.equal(loggedOut.status, 200);
      assert.ok(
        (await restoredHost.send('create', { bank: defaultBanks[0], teamCount: 2, duration: 1 }))
          .error,
      );
      assert.ok(
        (await restoredHost.send('resume', { code: created.code, token: created.token })).error,
        'logout invalidates old connections',
      );
    } finally {
      clients.forEach((ws) => ws.terminate());
      wss.clients.forEach((ws) => ws.terminate());
      await new Promise<void>((resolve) => http.close(() => resolve()));
    }
  },
);
