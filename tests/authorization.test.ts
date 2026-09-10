/// <reference types="vite/client" />
import { afterEach, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import schema from '../convex/schema';
import { authorizationRequest, clientSubject, digest } from '../lib/authorization';
const modules = import.meta.glob('../convex/**/*.ts');
const issue = makeFunctionReference<'mutation'>('authorization:issue');
const redeem = makeFunctionReference<'mutation'>('authorization:redeem');
afterEach(() => vi.unstubAllEnvs());
it('requires exact registered redirects, strong state and S256; separates app subjects', () => {
  vi.stubEnv('HUMANPROOF_CLIENTS', JSON.stringify([{ id: 'reader', name: 'Reader', redirectUris: ['https://reader.example/callback'] }]));
  vi.stubEnv('HUMANPROOF_SESSION_SECRET', 'a'.repeat(40));
  const p = new URLSearchParams({ client_id: 'reader', redirect_uri: 'https://reader.example/callback', state: 's'.repeat(32), code_challenge: digest('v'.repeat(43)), code_challenge_method: 'S256' });
  expect(authorizationRequest(p).id).toBe('reader');
  p.set('redirect_uri', 'https://reader.example/callback/evil'); expect(() => authorizationRequest(p)).toThrow();
  p.set('redirect_uri', 'https://reader.example/callback'); p.set('code_challenge_method', 'plain'); expect(() => authorizationRequest(p)).toThrow();
  expect(clientSubject('reader', 'self:mainnet', '123')).not.toBe(clientSubject('other', 'self:mainnet', '123'));
});
it('refuses unverified accounts and atomically prevents replay, wrong verifier, audience and environment', async () => {
  const t = convexTest(schema, modules);
  const base = { codeHash: 'hash', clientId: 'reader', redirectUri: 'https://reader.example/callback', challenge: 'challenge', privyUserId: 'alice', environment: 'self:mainnet' };
  await expect(t.mutation(issue, base)).rejects.toThrow('CREDENTIAL_REQUIRED');
  await t.run(ctx => ctx.db.insert('credentials', { privyUserId: 'alice', environment: 'self:mainnet', nullifierHash: '123', name: 'alice.humanproof.eth', createdAt: Date.now() }));
  await t.mutation(issue, base);
  const args = { codeHash: base.codeHash, clientId: base.clientId, redirectUri: base.redirectUri, challenge: base.challenge, environment: base.environment };
  for (const wrong of [{ challenge: 'wrong' }, { clientId: 'other' }, { redirectUri: 'https://evil.example' }, { environment: 'self:testnet' }]) expect(await t.mutation(redeem, { ...args, ...wrong })).toBeNull();
  const results = await Promise.all([t.mutation(redeem, args), t.mutation(redeem, args)]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(results.find(Boolean)).toEqual({ fingerprint: '123', name: 'alice.humanproof.eth' });
});
it('rejects expired codes and credentials removed after consent', async () => {
  const t = convexTest(schema, modules);
  const base = { codeHash: 'expired', clientId: 'reader', redirectUri: 'https://reader.example/callback', challenge: 'c', privyUserId: 'alice', environment: 'self:mainnet' };
  const id = await t.run(ctx => ctx.db.insert('credentials', { privyUserId: 'alice', environment: 'self:mainnet', nullifierHash: '123', name: 'alice', createdAt: 0 }));
  await t.run(ctx => ctx.db.insert('authorizationCodes', { ...base, expiresAt: 0 }));
  const args = { codeHash: base.codeHash, clientId: base.clientId, redirectUri: base.redirectUri, challenge: base.challenge, environment: base.environment };
  expect(await t.mutation(redeem, args)).toBeNull();
  await t.mutation(issue, { ...base, codeHash: 'removed' });
  await t.run(ctx => ctx.db.delete(id));
  expect(await t.mutation(redeem, { ...args, codeHash: 'removed' })).toBeNull();
});
