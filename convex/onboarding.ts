import { mutation, query } from "./functions";
import { v, ConvexError } from "convex/values";

const progressByAccount = (ctx: import("./_generated/server").QueryCtx, privyUserId: string, environment: string) =>
  ctx.db.query("onboarding").withIndex("by_privyUser_environment", q => q.eq("privyUserId", privyUserId).eq("environment", environment)).unique();

export const get = query({ args: { privyUserId: v.string(), environment: v.optional(v.string()) }, handler: (ctx, { privyUserId, environment = "staging" }) =>
  progressByAccount(ctx, privyUserId, environment),
});

export const saveProof = mutation({
  args: { privyUserId: v.string(), nullifierHash: v.string(), environment: v.string() },
  handler: async (ctx, args) => {
    const account = await ctx.db.query("credentials").withIndex("by_privyUser_environment", q => q.eq("privyUserId", args.privyUserId).eq("environment", args.environment)).unique();
    if (account && account.nullifierHash !== args.nullifierHash) throw new ConvexError({ code: "ACCOUNT_ALREADY_BOUND" });
    const owner = await ctx.db.query("credentials").withIndex("by_nullifier_environment", q => q.eq("nullifierHash", args.nullifierHash).eq("environment", args.environment)).unique();
    const pendingOwner = await ctx.db.query("onboarding").withIndex("by_nullifier_environment", q => q.eq("nullifierHash", args.nullifierHash).eq("environment", args.environment)).unique();
    if ((owner && owner.privyUserId !== args.privyUserId) || (pendingOwner && pendingOwner.privyUserId !== args.privyUserId)) {
      throw new ConvexError({ code: "HUMAN_ALREADY_BOUND" });
    }
    const row = await progressByAccount(ctx, args.privyUserId, args.environment);
    if (row && row.nullifierHash !== args.nullifierHash && row.name) throw new ConvexError({ code: "CLAIM_IN_PROGRESS" });
    if (row) await ctx.db.patch(row._id, { ...args, verifiedAt: Date.now() });
    else await ctx.db.insert("onboarding", { ...args, verifiedAt: Date.now() });
    return null;
  },
});

export const prepareName = mutation({
  args: { privyUserId: v.string(), name: v.string(), address: v.string(), startBlock: v.string(), environment: v.optional(v.string()) },
  handler: async (ctx, { privyUserId, name, address, startBlock, environment = "staging" }) => {
    const row = await progressByAccount(ctx, privyUserId, environment);
    if (!row) throw new ConvexError({ code: "VERIFY_FIRST" });
    if (row.name && (row.name !== name || row.address !== address)) throw new ConvexError({ code: "CLAIM_IN_PROGRESS" });
    if (!row.name) await ctx.db.patch(row._id, { name, address, startBlock });
    return null;
  },
});

export const saveTransaction = mutation({
  args: { privyUserId: v.string(), txHash: v.optional(v.string()), reset: v.optional(v.boolean()), environment: v.optional(v.string()) },
  handler: async (ctx, { privyUserId, txHash, reset, environment = "staging" }) => {
    const row = await progressByAccount(ctx, privyUserId, environment);
    if (!row) throw new ConvexError({ code: "VERIFY_FIRST" });
    await ctx.db.patch(row._id, reset ? { txHash: undefined, name: undefined, address: undefined, startBlock: undefined } : { txHash });
    return null;
  },
});
