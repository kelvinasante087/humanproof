import { mutation, query } from "./functions";
import { v, ConvexError } from "convex/values";

/**
 * Record a completed credential: the salted nullifier hash + the issued name. Called after a
 * successful on-chain claim. The read-then-insert runs inside one serializable mutation, so this
 * is an atomic check-then-insert — the DB-layer half of one-human-one-credential (the on-chain
 * registrar enforces the same line on-chain). A repeat human throws ALREADY_RECORDED.
 */
export const record = mutation({
  args: { nullifierHash: v.string(), name: v.string() },
  handler: async (ctx, { nullifierHash, name }) => {
    const existing = await ctx.db
      .query("credentials")
      .withIndex("by_nullifier", (q) => q.eq("nullifierHash", nullifierHash))
      .unique();
    if (existing) throw new ConvexError({ code: "ALREADY_RECORDED" });
    await ctx.db.insert("credentials", { nullifierHash, name, createdAt: Date.now() });
    return { recorded: true };
  },
});

/**
 * Look up the ENS name a verified human claimed, by their salted nullifier hash. Used to name the
 * human in the UI ("Signed in with HumanProof as ama.humanproof.eth"). Returns null if none.
 * Never exposes the nullifier — it's the input, keyed server-side.
 */
export const getByNullifier = query({
  args: { nullifierHash: v.string() },
  handler: async (ctx, { nullifierHash }) => {
    const row = await ctx.db
      .query("credentials")
      .withIndex("by_nullifier", (q) => q.eq("nullifierHash", nullifierHash))
      .unique();
    return row ? { name: row.name } : null;
  },
});
