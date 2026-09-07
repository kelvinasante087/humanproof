import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * HumanProof off-chain store. We persist only anonymous, non-reversible fingerprints — the
 * salted hash of the World nullifier — never the raw nullifier and never personal data.
 *
 * Convex mutations are transactional (serializable), so a read-by-index-then-insert inside one
 * mutation is an atomic check-then-insert. That is what enforces uniqueness at the DB layer
 * (one human = one credential) and one-seal-per-action, with no duplicate races.
 */
export default defineSchema({
  // One row per verified human, written when their credential completes (name issued).
  credentials: defineTable({
    nullifierHash: v.string(), // salt(nullifier), decimal string — never the raw value
    name: v.string(),
    createdAt: v.number(),
    // The Privy account (DID) that owns this credential. Recorded so a returning human can sign
    // back in with their passkey (Day 7): we verify their Privy login server-side and look their
    // credential up by this id, then re-issue the verified session — without re-running the World
    // check. It's an opaque account handle, not personal data; the raw nullifier is still never
    // stored. Optional: older rows (pre-Day-7) and any DB-degraded claim won't have it.
    privyUserId: v.optional(v.string()),
    // The profile avatar this human chose (one of the ten avatar ids, e.g. "avatar_03"). Optional:
    // absent until they pick one, in which case the UI falls back to a deterministic default.
    avatar: v.optional(v.string()),
  })
    .index("by_nullifier", ["nullifierHash"])
    .index("by_privyUser", ["privyUserId"]),

  // One row per sealed action. dedupeKey = hash(nullifierHash | appId | contentHash).
  seals: defineTable({
    dedupeKey: v.string(),
    nullifierHash: v.string(),
    appId: v.string(),
    contentHash: v.string(),
    sealRef: v.optional(v.string()), // filled once the sealing engine returns
    txHash: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_dedupe", ["dedupeKey"])
    .index("by_nullifier", ["nullifierHash"])
    .index("by_sealRef", ["sealRef"]), // public verify page looks a seal up by its reference
});
