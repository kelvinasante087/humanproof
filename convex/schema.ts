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
  }).index("by_nullifier", ["nullifierHash"]),

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
    .index("by_nullifier", ["nullifierHash"]),
});
