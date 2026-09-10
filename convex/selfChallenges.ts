import { mutation, query } from './functions';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';

export const create = mutation({
  args: { requestId: v.string(), privyUserId: v.string(), environment: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('selfChallenges').withIndex('by_request', q => q.eq('requestId', args.requestId)).unique();
    if (existing) throw new ConvexError({ code: 'CHALLENGE_EXISTS' });
    // Bound storage per account and invalidate prior unfinished QR requests on refresh.
    const previous = await ctx.db.query('selfChallenges').withIndex('by_account', q => q.eq('privyUserId', args.privyUserId)).collect();
    for (const row of previous) await ctx.db.delete(row._id);
    await ctx.db.insert('selfChallenges', { ...args, expiresAt: Date.now() + 15 * 60 * 1000 });
    return null;
  },
});
export const get = query({
  args: { requestId: v.string(), privyUserId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query('selfChallenges').withIndex('by_request', q => q.eq('requestId', args.requestId)).unique();
    if (!row || row.privyUserId !== args.privyUserId) return null;
    return { verified: Boolean(row.completedHash), expiresAt: row.expiresAt, environment: row.environment };
  },
});
export const complete = mutation({
  args: { requestId: v.string(), nullifierHash: v.string(), environment: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query('selfChallenges').withIndex('by_request', q => q.eq('requestId', args.requestId)).unique();
    if (!row || row.environment !== args.environment || row.expiresAt < Date.now()) throw new ConvexError({ code: 'CHALLENGE_EXPIRED' });
    if (row.completedHash) {
      if (row.completedHash !== args.nullifierHash) throw new ConvexError({ code: 'PROOF_MISMATCH' });
      return null;
    }
    await ctx.runMutation(internal.onboarding.saveProof, { privyUserId: row.privyUserId, nullifierHash: args.nullifierHash, environment: row.environment });
    await ctx.db.patch(row._id, { completedHash: args.nullifierHash });
    return null;
  },
});
