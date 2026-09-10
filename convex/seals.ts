import { mutation, query } from "./functions";
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
    startBlock: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("seals")
      .withIndex("by_dedupe", (q) => q.eq("dedupeKey", args.dedupeKey))
      .unique();
    if (existing) {
      if (existing.sealRef || existing.txHash) return existing._id;
      if (Date.now() - existing.createdAt < 120000) throw new ConvexError({ code: "SEAL_PENDING" });
      await ctx.db.patch(existing._id, { createdAt: Date.now() });
      return existing._id;
    }
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
    const row = await ctx.db.get(id);
    if (row && !row.sealRef && !row.txHash) await ctx.db.delete(id);
  },
});

export const getByDedupe = query({
  args: { dedupeKey: v.string() },
  handler: (ctx, { dedupeKey }) => ctx.db.query("seals").withIndex("by_dedupe", q => q.eq("dedupeKey", dedupeKey)).unique(),
});
export const sent = mutation({
  args: { id: v.id("seals"), txHash: v.string() },
  handler: async (ctx, { id, txHash }) => { await ctx.db.patch(id, { txHash }); return null; },
});

/**
 * Public read for the verify page. Looks a finalized seal up by its reference and returns ONLY
 * safe fields — the app it happened in, the action's content hash, the on-chain tx, and when.
 * Never the nullifierHash, never anything about who. Returns null if unknown or not yet finalized.
 */
export const getByRef = query({
  args: { sealRef: v.string() },
  handler: async (ctx, { sealRef }) => {
    const row = await ctx.db
      .query("seals")
      .withIndex("by_sealRef", (q) => q.eq("sealRef", sealRef))
      .unique();
    if (!row || !row.sealRef) return null;
    return {
      appId: row.appId,
      contentHash: row.contentHash,
      txHash: row.txHash ?? null,
      createdAt: row.createdAt,
    };
  },
});

/**
 * Server-consumed account history for one anonymous human fingerprint. The Next route derives the
 * fingerprint from the signed World session cookie; it is never accepted from the browser. Keep
 * this bounded so an established account cannot turn into an unbounded dashboard read.
 */
export const listByNullifier = query({
  args: { nullifierHash: v.string() },
  handler: async (ctx, { nullifierHash }) => {
    const rows = await ctx.db
      .query("seals")
      .withIndex("by_nullifier", (q) => q.eq("nullifierHash", nullifierHash))
      .order("desc")
      .take(50);

    return rows
      .filter((row) => Boolean(row.sealRef))
      .map((row) => ({
        sealRef: row.sealRef!,
        appId: row.appId,
        contentHash: row.contentHash,
        txHash: row.txHash ?? null,
        createdAt: row.createdAt,
      }));
  },
});

/** Called by the server only after a confirmed reverted receipt. */
export const clearReverted = mutation({
  args: { id: v.id("seals") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (row && !row.sealRef) await ctx.db.patch(id, { txHash: undefined, createdAt: 0 });
    return null;
  },
});
