import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = readFileSync(new URL('../functions/sync-performance/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/, '');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function harness({ user = { id: 'owner', email_confirmed_at: '2026-01-01' }, pages = [], connection = true } = {}) {
  let handler;
  const calls = [], writes = [], filters = [];
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    rpc: async () => ({ data: 'private-meta-token' }),
    from: table => ({
      select() { return this; },
      eq(key, value) { filters.push([key, value]); return this; },
      single: async () => ({ data: connection ? { settings: { isRealToken: true, adAccountId: '123' } } : null }),
      upsert: async rows => { writes.push({ table, rows }); return {}; },
    }),
  };
  vm.runInNewContext(code, {
    createClient: () => client, Deno: { env: { get: () => 'test' }, serve: value => { handler = value; } },
    Request, Response, URL, AbortSignal,
    fetch: async (url, options) => { calls.push({ url, options }); return Response.json(pages.shift() || { data: [] }); },
  });
  return { calls, writes, filters, invoke: (body = { since: '2026-09-01', until: '2026-09-22' }, authorization = 'Bearer test-user-jwt') => handler(new Request('https://local.test', { method: 'POST', headers: authorization ? { Authorization: authorization } : {}, body: JSON.stringify(body) })) };
}
test('rejects missing, anonymous, unconfirmed and invalid sessions without contacting Meta', async () => {
  for (const user of [null, { id: 'x' }, { id: 'x', email_confirmed_at: 'yes', is_anonymous: true }]) {
    const h = harness({ user });
    assert.equal((await h.invoke()).status, 401);
    assert.equal(h.calls.length, 0);
  }
  const h = harness();
  assert.equal((await h.invoke(undefined, '')).status, 401);
  assert.equal((await h.invoke(undefined, 'Basic bad')).status, 401);
  assert.equal(h.calls.length, 0);
});
test('rejects invalid dates and disconnected accounts before contacting Meta', async () => {
  const h = harness();
  for (const body of [{ since: '2026-02-30', until: '2026-03-01' }, { since: '2026-01-01', until: '2026-09-22' }, null]) assert.equal((await h.invoke(body)).status, 400);
  assert.equal((await harness({ connection: false }).invoke()).status, 400);
  assert.equal(h.calls.length, 0);
});
test('binds writes to authenticated owner and configured account; does not follow arbitrary paging URLs', async () => {
  const row = { date_start: '2026-09-01', account_currency: 'USD', spend: '1.25', impressions: '10', clicks: '2' };
  const h = harness({ pages: [{ data: [row], paging: { next: 'https://attacker.test/steal', cursors: { after: 'safe-cursor' } } }, { data: [] }] });
  const response = await h.invoke({ since: '2026-09-01', until: '2026-09-22', user_id: 'victim', account_id: '999' });
  assert.equal(response.status, 200);
  assert.equal(h.writes[0].rows[0].user_id, 'owner');
  assert.equal(h.writes[0].rows[0].account_id, '123');
  assert.ok(h.filters.some(([key, value]) => key === 'user_id' && value === 'owner'));
  assert.equal(h.calls.length, 2);
  for (const call of h.calls) {
    const url = new URL(call.url);
    assert.equal(url.origin, 'https://graph.facebook.com');
    assert.equal(url.pathname, '/v21.0/act_123/insights');
    assert.equal(url.searchParams.has('access_token'), false);
    assert.equal(call.options.redirect, 'error');
  }
  assert.equal((await response.text()).includes('private-meta-token'), false);
});
test('does not persist incomplete pagination or malformed provider metrics', async () => {
  for (const page of [{ data: [], paging: { next: 'https://attacker.test' } }, { data: [{ date_start: '2026-09-01', account_currency: 'USD', spend: -1 }] }]) {
    const h = harness({ pages: [page] });
    assert.equal((await h.invoke()).status, 503);
    assert.equal(h.writes.length, 0);
  }
});
