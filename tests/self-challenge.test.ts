/// <reference types="vite/client" />
import { expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import schema from '../convex/schema';
const modules = import.meta.glob('../convex/**/*.ts');
const create = makeFunctionReference<'mutation'>('selfChallenges:create');
const complete = makeFunctionReference<'mutation'>('selfChallenges:complete');
const get = makeFunctionReference<'query'>('selfChallenges:get');
it('binds completion to a server challenge, preserves retries and blocks expired or unknown requests', async () => {
  const t = convexTest(schema, modules);
  const base = { requestId: 'request-a', privyUserId: 'alice', environment: 'self:mainnet' };
  await t.mutation(create, base);
  expect(await t.query(get, { requestId: 'request-a', privyUserId: 'bob' })).toBeNull();
  await t.mutation(complete, { requestId: 'request-a', environment: 'self:mainnet', nullifierHash: '123' });
  await t.mutation(complete, { requestId: 'request-a', environment: 'self:mainnet', nullifierHash: '123' });
  await expect(t.mutation(complete, { requestId: 'request-a', environment: 'self:mainnet', nullifierHash: '456' })).rejects.toThrow('PROOF_MISMATCH');
  await expect(t.mutation(complete, { requestId: 'unknown', environment: 'self:mainnet', nullifierHash: '123' })).rejects.toThrow('CHALLENGE_EXPIRED');
  await t.mutation(create, { ...base, requestId: 'expired' });
  await t.run(async ctx => { const row = await ctx.db.query('selfChallenges').filter(q => q.eq(q.field('requestId'), 'expired')).first(); await ctx.db.patch(row!._id, { expiresAt: 0 }); });
  await expect(t.mutation(complete, { requestId: 'expired', environment: 'self:mainnet', nullifierHash: '123' })).rejects.toThrow('CHALLENGE_EXPIRED');
});
it('does not let a proof claim a different account or cross environments', async () => {
  const t = convexTest(schema, modules);
  for (const [requestId, privyUserId] of [['a', 'alice'], ['b', 'bob']]) await t.mutation(create, { requestId, privyUserId, environment: 'self:mainnet' });
  await expect(t.mutation(complete, { requestId: 'a', environment: 'self:testnet', nullifierHash: '123' })).rejects.toThrow('CHALLENGE_EXPIRED');
  await t.mutation(complete, { requestId: 'a', environment: 'self:mainnet', nullifierHash: '123' });
  await expect(t.mutation(complete, { requestId: 'b', environment: 'self:mainnet', nullifierHash: '123' })).rejects.toThrow('HUMAN_ALREADY_BOUND');
});
