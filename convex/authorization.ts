import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const issue = internalMutation({
  args: { codeHash: v.string(), clientId: v.string(), redirectUri: v.string(), challenge: v.string(), privyUserId: v.string(), environment: v.string() },
  handler: async (ctx, args) => {
    const credential = await ctx.db.query('credentials').withIndex('by_privyUser_environment', q => q.eq('privyUserId', args.privyUserId).eq('environment', args.environment)).unique();
    if (!credential) throw new Error('CREDENTIAL_REQUIRED');
    const expired = await ctx.db.query('authorizationCodes').withIndex('by_expiry', q => q.lt('expiresAt', Date.now())).take(100);
    for (const row of expired) await ctx.db.delete(row._id);
    await ctx.db.insert('authorizationCodes', { ...args, expiresAt: Date.now() + 120000 });
    return null;
  },
});
export const redeem = internalMutation({
  args: { codeHash: v.string(), clientId: v.string(), redirectUri: v.string(), challenge: v.string(), environment: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query('authorizationCodes').withIndex('by_code', q => q.eq('codeHash', args.codeHash)).unique();
    if (!row || row.expiresAt <= Date.now() || row.clientId !== args.clientId || row.redirectUri !== args.redirectUri || row.challenge !== args.challenge || row.environment !== args.environment) return null;
    const credential = await ctx.db.query('credentials').withIndex('by_privyUser_environment', q => q.eq('privyUserId', row.privyUserId).eq('environment', row.environment)).unique();
    await ctx.db.delete(row._id);
    if (!credential) return null;
    return { fingerprint: credential.nullifierHash, name: credential.name };
  },
});
