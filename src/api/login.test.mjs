import test from 'node:test';
import assert from 'node:assert/strict';
import { signIn, loginErrorMessage } from './login.mjs';

const user = { token: 'valid-token', id: 1, email: 'admin@example.com', name: 'Admin', role: 'ROLE_ADMIN' };
function fixture(data = user) {
  const saved = new Map();
  const requests = [];
  return {
    saved, requests,
    client: { post: async (...args) => { requests.push(args); return { data }; } },
    storage: { setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) },
    email: ' admin@example.com ', password: ' password with spaces ', panel: 'admin',
  };
}
test('admin login preserves profile name and password, trims email, and bounds request time', async () => {
  const f = fixture();
  assert.equal(await signIn(f), '/admin/dashboard');
  assert.equal(JSON.parse(f.saved.get('user')).name, 'Admin');
  assert.equal(f.saved.get('token'), user.token);
  assert.deepEqual(f.requests[0], ['/auth/signin', { email: user.email, passwordHash: f.password, scope: 'ADMIN' }, { timeout: 15000 }]);
});
test('master can enter master panel', async () => {
  const f = { ...fixture({ ...user, role: 'ROLE_MASTER' }), panel: 'master' };
  assert.equal(await signIn(f), '/master/dashboard');
  assert.equal(f.saved.get('token'), user.token);
});
test('master cannot enter admin panel or save a session', async () => {
  const f = { ...fixture({ ...user, role: 'ROLE_MASTER' }), panel: 'admin' };
  await assert.rejects(signIn(f), /Access denied.*Master Administrator credentials cannot access Tenant Admin portal/);
  assert.equal(f.saved.size, 0);
});
test('admin cannot enter master panel or save a session', async () => {
  const f = fixture();
  await assert.rejects(signIn({ ...f, panel: 'master' }), /Access denied.*Master Panel privileges/);
  assert.equal(f.saved.size, 0);
});
test('incomplete responses cannot create sessions', async () => {
  for (const data of [null, {}, { ...user, token: '' }, { ...user, id: null }, { ...user, email: '' }, { ...user, role: 'ROLE_UNKNOWN' }]) {
    const f = fixture(data);
    await assert.rejects(signIn(f), /incomplete login response/);
    assert.equal(f.saved.size, 0);
  }
});
test('failed storage rolls back partial session', async () => {
  const f = fixture();
  f.storage.setItem = (k, v) => { if (k === 'token') throw new Error('Quota'); f.saved.set(k, v); };
  await assert.rejects(signIn(f), /allow browser storage/);
  assert.equal(f.saved.size, 0);
});
test('rejected credentials do not create a session', async () => {
  const f = fixture();
  f.client.post = async () => { throw { response: { status: 401 } }; };
  await assert.rejects(signIn(f));
  assert.equal(f.saved.size, 0);
});
test('timeout, network, server and credential errors have distinct messages', () => {
  assert.match(loginErrorMessage({ code: 'ECONNABORTED' }), /too long/);
  assert.match(loginErrorMessage({ isAxiosError: true }), /Cannot connect/);
  assert.match(loginErrorMessage({ response: { status: 403, data: { message: 'Access denied: Master forbidden' } } }), /Access denied: Master forbidden/);
  assert.match(loginErrorMessage({ response: { status: 500, data: { message: 'internal details' } } }), /try again later/);
  assert.match(loginErrorMessage({ response: { status: 401 } }), /Invalid email or password/);
});
