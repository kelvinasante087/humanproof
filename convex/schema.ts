import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * HumanProof off-chain store. Account identifiers, names and salted fingerprints are
 * pseudonymous data. Raw World proofs and nullifiers are not persisted.
 *
 * Convex mutations are transactional (serializable), so a read-by-index-then-insert inside one
 * mutation is an atomic check-then-insert. That is what enforces uniqueness at the DB layer
 * (one human = one credential) and one-seal-per-action, with no duplicate races.
 */
export default defineSchema({
  authorizationCodes: defineTable({
    codeHash: v.string(), clientId: v.string(), redirectUri: v.string(), challenge: v.string(),
    privyUserId: v.string(), environment: v.string(), expiresAt: v.number(),
  }).index('by_code', ['codeHash']).index('by_expiry', ['expiresAt']),
  selfChallenges: defineTable({
    requestId: v.string(), privyUserId: v.string(), environment: v.string(),
    expiresAt: v.number(), completedHash: v.optional(v.string()),
  }).index('by_request', ['requestId']).index('by_account', ['privyUserId']),
  // One row per verified human, written when their credential completes (name issued).
  credentials: defineTable({
    nullifierHash: v.string(), // salt(nullifier), decimal string — never the raw value
    name: v.string(),
    createdAt: v.number(),
    // The Privy account (DID) that owns this credential. Recorded so a returning human can sign
    // back in with their passkey (Day 7): we verify their Privy login server-side and look their
    // credential up by this id, then re-issue the verified session — without re-running the World
    // check. It is a pseudonymous account handle; the raw nullifier is still never
    // stored. Optional: older rows (pre-Day-7) and any DB-degraded claim won't have it.
    privyUserId: v.optional(v.string()),
    // The profile avatar this human chose (one of the ten avatar ids, e.g. "avatar_03"). Optional:
    // absent until they pick one, in which case the UI falls back to a deterministic default.
    avatar: v.optional(v.string()),
    environment: v.optional(v.string()),
  })
    .index("by_nullifier", ["nullifierHash"])
    .index("by_privyUser", ["privyUserId"])
    .index("by_nullifier_environment", ["nullifierHash", "environment"])
    .index("by_privyUser_environment", ["privyUserId", "environment"]),

  onboarding: defineTable({
    privyUserId: v.string(), nullifierHash: v.string(), environment: v.string(),
    verifiedAt: v.number(), name: v.optional(v.string()), address: v.optional(v.string()),
    txHash: v.optional(v.string()), startBlock: v.optional(v.string()),
  })
    .index("by_privyUser", ["privyUserId"])
    .index("by_nullifier", ["nullifierHash"])
    .index("by_privyUser_environment", ["privyUserId", "environment"])
    .index("by_nullifier_environment", ["nullifierHash", "environment"]),

  reviews: defineTable({ itemId: v.string(), author: v.string(), stars: v.number(), body: v.string(), sealId: v.string(), createdAt: v.number() })
    .index("by_itemId", ["itemId"]).index("by_sealId", ["sealId"]),

  // One row per sealed action. dedupeKey = hash(nullifierHash | appId | contentHash).
  seals: defineTable({
    dedupeKey: v.string(),
    nullifierHash: v.string(),
    appId: v.string(),
    contentHash: v.string(),
    sealRef: v.optional(v.string()), // filled once the sealing engine returns
    startBlock: v.optional(v.string()),
    txHash: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_dedupe", ["dedupeKey"])
    .index("by_nullifier", ["nullifierHash"])
    .index("by_sealRef", ["sealRef"]), // public verify page looks a seal up by its reference

  // One row per human who has received a gas top-up from the airdrop faucet. This is the treasury
  // guard: a verified human may fund exactly ONE wallet (a few idempotent retries of that same
  // wallet), so a single session can't spray gas to an endless stream of fresh addresses. `day` is a
  // UTC day bucket used to enforce a daily treasury cap (circuit breaker). Keyed on the salted
  // nullifier — the same anonymous fingerprint as `seals`, never the raw value.
  gasFundings: defineTable({
    nullifierHash: v.string(), // salt(nullifier), decimal string
    address: v.string(), // the one wallet this human is allowed to top up (lowercased)
    count: v.number(), // number of top-ups sent to that wallet
    day: v.number(), // floor(createdAt / 86_400_000), UTC day bucket
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_nullifier", ["nullifierHash"])
    .index("by_day", ["day"]),
});
