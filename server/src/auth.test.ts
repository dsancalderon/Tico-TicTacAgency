import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { requireAuth, getProfile } from './auth.js';

test('API authentication rejects missing/forged tokens and loads only a verified profile', async () => {
  const auth = express();
  auth.get('/auth/v1/user', (req, res) => {
    if (req.headers.authorization !== 'Bearer valid-test-token') {
      res.status(401).json({ message: 'Invalid JWT' }); return;
    }
    res.json({ id: 'user-a', email: 'test@example.com', email_confirmed_at: '2026-09-21',
      user_metadata: { role: 'agency_admin', credits: 100000, display_name: 'Tester' } });
  });
  auth.post('/rest/v1/profiles', (_req, res) => { res.status(201).end(); });
  auth.get('/rest/v1/profiles', (req, res) => {
    assert.equal(req.query.id, 'eq.user-a');
    assert.equal(req.headers.authorization, 'Bearer valid-test-token');
    res.json({ id: 'user-a', display_name: 'Tester', workspace_name: 'Test workspace' });
  });
  const upstream = auth.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = `http://127.0.0.1:${(upstream.address() as { port: number }).port}`;
  process.env.SUPABASE_PUBLISHABLE_KEY = 'public-test-key';
  const app = express();
  app.get('/api/auth/me', requireAuth, getProfile);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth/me`;
  try {
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { Authorization: 'Bearer forged' } })).status, 401);
    const response = await fetch(url, { headers: { Authorization: 'Bearer valid-test-token' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const { user } = await response.json() as { user: { id: string; credits: number; role: string } };
    assert.equal(user.id, 'user-a');
    assert.equal(user.credits, 0);
    assert.equal(user.role, 'brand_manager');
    delete process.env.SUPABASE_URL;
    assert.equal((await fetch(url, { headers: { Authorization: 'Bearer valid-test-token' } })).status, 503);
  } finally {
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = oldKey;
    server.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise<void>(resolve => server.close(() => resolve())),
      new Promise<void>(resolve => upstream.close(() => resolve()))]);
  }
});
