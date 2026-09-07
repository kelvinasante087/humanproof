import { mutation, query } from "./functions";
import { v, ConvexError } from "convex/values";

/**
 * Record a completed credential: the salted nullifier hash + the issued name. Called after a
 * successful on-chain claim. The read-then-insert runs inside one serializable mutation, so this
 * is an atomic check-then-insert — the DB-layer half of one-human-one-credential (the on-chain
 * registrar enforces the same line on-chain). A repeat human throws ALREADY_RECORDED.
 */
export const record = mutation({
  args: { nullifierHash: v.string(), name: v.string(), privyUserId: v.optional(v.string()) },
  handler: async (ctx, { nullifierHash, name, privyUserId }) => {
    const existing = await ctx.db
      .query("credentials")
      .withIndex("by_nullifier", (q) => q.eq("nullifierHash", nullifierHash))
      .unique();
    if (existing) throw new ConvexError({ code: "ALREADY_RECORDED" });
    await ctx.db.insert("credentials", { nullifierHash, name, privyUserId, createdAt: Date.now() });
    return { recorded: true };
  },
});

/**
 * Link a Privy account to an existing (or new) credential — the idempotent recovery path.
 *
 * A human who already claimed their name on-chain can't claim again (the registrar reverts
 * NullifierAlreadyUsed), so the normal record-on-successful-claim never fires for them. That left
 * returning humans with NO db row to be remembered by. This repairs that: keyed on the salted
 * fingerprint, it patches the owning Privy account onto the existing row (or inserts one if the
 * row was never written), so "Sign in with HumanProof" can find them next time. Safe to call more
 * than once. The raw nullifier is never involved — only its salted hash.
 */
export const linkAccount = mutation({
  args: { nullifierHash: v.string(), name: v.string(), privyUserId: v.string() },
  handler: async (ctx, { nullifierHash, name, privyUserId }) => {
    const existing = await ctx.db
      .query("credentials")
      .withIndex("by_nullifier", (q) => q.eq("nullifierHash", nullifierHash))
      .unique();
    if (existing) {
      // Keep the name already on record if there is one; only fill it in when it was missing.
      await ctx.db.patch(existing._id, { privyUserId, name: existing.name || name });
      return { linked: true };
    }
    await ctx.db.insert("credentials", { nullifierHash, name, privyUserId, createdAt: Date.now() });
    return { linked: true };
  },
});

/**
 * Look up a credential by the Privy account (DID) that owns it. Powers "Sign in with HumanProof":
 * after a returning human's passkey login is verified server-side, we find their existing
 * credential here and re-issue the verified session — no repeat World check. Returns the salted
 * hash (to rebuild the session) + the name (for the banner), or null if this account has no
 * credential yet (the caller then routes them to onboarding). Never exposes the raw nullifier.
 */
export const getByPrivyUser = query({
  args: { privyUserId: v.string() },
  handler: async (ctx, { privyUserId }) => {
    const row = await ctx.db
      .query("credentials")
      .withIndex("by_privyUser", (q) => q.eq("privyUserId", privyUserId))
      .unique();
    return row ? { nullifierHash: row.nullifierHash, name: row.name } : null;
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
