// Independent server-side client. No HumanProof cookies, Privy keys or issuer keys.
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
const provider = process.env.HUMANPROOF_URL || 'http://localhost:3000';
const origin = process.env.CLIENT_ORIGIN || 'http://localhost:3100';
const clientId = process.env.CLIENT_ID || 'identity-example';
const redirectUri = origin + '/callback';
const pending = new Map();
const sessions = new Map();
const random = () => randomBytes(32).toString('base64url');
const digest = value => createHash('sha256').update(value).digest('base64url');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cookie = (name, value, seconds) => `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${seconds}${origin.startsWith('https:') ? '; Secure' : ''}`;
createServer(async (req, res) => {
  const now = Date.now();
  for (const [key, value] of pending) if (value.expires < now) pending.delete(key);
  for (const [key, value] of sessions) if (value.expires < now) sessions.delete(key);
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
  const url = new URL(req.url, origin);
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(p => p.trim().split('=')));
  const redirect = destination => { res.writeHead(302, { Location: destination }); res.end(); };
  try {
    if (req.method === 'POST' && url.pathname === '/connect') {
      if (req.headers.origin !== origin || pending.size >= 1000) throw new Error('Invalid request');
      const state = random(), verifier = random(), browser = random();
      pending.set(browser, { state, verifier, expires: now + 600000 });
      const target = new URL('/authorize', provider);
      target.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state, code_challenge: digest(verifier), code_challenge_method: 'S256' }).toString();
      res.setHeader('Set-Cookie', cookie('hp_pending', browser, 600)); return redirect(target.toString());
    }
    if (req.method === 'GET' && url.pathname === '/callback') {
      const flow = pending.get(cookies.hp_pending);
      if (!flow || url.searchParams.getAll('state').length !== 1 || url.searchParams.get('state') !== flow.state || url.searchParams.getAll('code').length !== 1) throw new Error('Invalid callback');
      pending.delete(cookies.hp_pending);
      const response = await fetch(new URL('/api/authorize/exchange', provider), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId, redirect_uri: redirectUri, code: url.searchParams.get('code'), code_verifier: flow.verifier }), signal: AbortSignal.timeout(15000) });
      const identity = await response.json();
      if (!response.ok || identity.audience !== clientId || identity.verifiedHuman !== true || identity.environment !== (process.env.EXPECTED_ENV || 'self:mainnet') || typeof identity.subject !== 'string') throw new Error('Verification refused');
      const session = random(); sessions.set(session, { identity, expires: now + 300000 });
      res.setHeader('Set-Cookie', [cookie('hp_pending', '', 0), cookie('hp_example', session, 300)]); return redirect('/');
    }
    if (req.method !== 'GET' || url.pathname !== '/') { res.writeHead(404); return res.end('Not found'); }
    const session = sessions.get(cookies.hp_example);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html><head><title>Independent HumanProof client</title></head><body style="font:18px system-ui;max-width:650px;margin:80px auto;padding:20px"><h1>Independent HumanProof client</h1>${session ? `<h2>Verified credential received</h2><p>${escape(session.identity.name)}</p><p>Environment: ${escape(session.identity.environment)}</p><p>This separate server redeemed a single-use code. This example session expires after five minutes.</p>` : '<p>Connect an existing verified HumanProof credential. This example cannot create or bypass one.</p><form method="post" action="/connect"><button>Connect HumanProof</button></form>'}<p>No wallet spending or action authorization is granted.</p></body></html>`);
  } catch { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Connection failed or expired. Return home and start a fresh connection.'); }
}).listen(3100, '127.0.0.1', () => console.log('Identity example listening on http://localhost:3100'));
