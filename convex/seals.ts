import { mutation } from "./functions";
import { v, ConvexError } from "convex/values";

/**
 * Reserve a seal for one action, atomically. dedupeKey = hash(nullifierHash | appId | contentHash).
 * If a row with that key already exists, this human already sealed this action → throw
 * ALREADY_SEALED (the caller turns that into 409). The reservation is placed BEFORE the sealing
 * engine is called, so a duplicate never spends gas. Returns the reservation id.
 */
export const reserve = mutation({
  args: {
    dedupeKey: v.string(),
    nullifierHash: v.string(),
    appId: v.string(),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("seals")
      .withIndex("by_dedupe", (q) => q.eq("dedupeKey", args.dedupeKey))
      .unique();
    if (existing) throw new ConvexError({ code: "ALREADY_SEALED" });
    return await ctx.db.insert("seals", { ...args, createdAt: Date.now() });
  },
});

/** Attach the sealing engine's references once the seal succeeds. */
export const finalize = mutation({
  args: { id: v.id("seals"), sealRef: v.string(), txHash: v.optional(v.string()) },
  handler: async (ctx, { id, sealRef, txHash }) => {
    await ctx.db.patch(id, { sealRef, txHash });
  },
});

/** Roll back a reservation if the sealing engine call fails, so the human can retry. */
export const release = mutation({
  args: { id: v.id("seals") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
