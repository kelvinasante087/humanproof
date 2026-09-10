import { mutation, query } from "./functions";
import { v, ConvexError } from "convex/values";

type QueryCtx = import("./_generated/server").QueryCtx;

async function credentialByNullifier(ctx: QueryCtx, nullifierHash: string, environment: string) {
  const row = await ctx.db.query("credentials")
    .withIndex("by_nullifier_environment", q => q.eq("nullifierHash", nullifierHash).eq("environment", environment))
    .unique();
  if (row || environment !== "staging") return row;
  return (await ctx.db.query("credentials").withIndex("by_nullifier", q => q.eq("nullifierHash", nullifierHash)).collect())
    .find(candidate => candidate.environment === undefined) ?? null;
}

async function credentialByAccount(ctx: QueryCtx, privyUserId: string, environment: string) {
  const row = await ctx.db.query("credentials")
    .withIndex("by_privyUser_environment", q => q.eq("privyUserId", privyUserId).eq("environment", environment))
    .unique();
  if (row || environment !== "staging") return row;
  return (await ctx.db.query("credentials").withIndex("by_privyUser", q => q.eq("privyUserId", privyUserId)).collect())
    .find(candidate => candidate.environment === undefined) ?? null;
}

/**
 * Record a completed credential: the salted nullifier hash + the issued name. Called after a
 * successful on-chain claim. The read-then-insert runs inside one serializable mutation, so this
 * is an atomic check-then-insert — the DB-layer half of one-human-one-credential (the on-chain
 * registrar enforces the same line on-chain). A repeat human throws ALREADY_RECORDED.
 */
async function saveCredential(ctx: import("./_generated/server").MutationCtx, args: {
  nullifierHash: string; name: string; privyUserId?: string; environment?: string;
}) {
  const { nullifierHash, name, privyUserId } = args;
  const environment = args.environment ?? "staging";
  if (!privyUserId) throw new ConvexError({ code: "ACCOUNT_REQUIRED" });
  const existing = await credentialByNullifier(ctx, nullifierHash, environment);
  const account = await credentialByAccount(ctx, privyUserId, environment);
  if (existing && existing.privyUserId !== privyUserId) throw new ConvexError({ code: "HUMAN_ALREADY_BOUND" });
  if (account && account.nullifierHash !== nullifierHash) throw new ConvexError({ code: "ACCOUNT_ALREADY_BOUND" });
  if (existing) {
    if (existing.name !== name) throw new ConvexError({ code: "NAME_MISMATCH" });
    return { recorded: true, linked: true };
  }
  await ctx.db.insert("credentials", { nullifierHash, name, privyUserId, environment, createdAt: Date.now() });
  return { recorded: true, linked: true };
}
const credentialArgs = { nullifierHash: v.string(), name: v.string(), privyUserId: v.optional(v.string()), environment: v.optional(v.string()) };
export const record = mutation({ args: credentialArgs, handler: saveCredential });
export const linkAccount = mutation({ args: credentialArgs, handler: saveCredential });

/**
 * Look up a credential by the Privy account (DID) that owns it. Powers "Sign in with HumanProof":
 * after a returning human's passkey login is verified server-side, we find their existing
 * credential here and re-issue the verified session — no repeat World check. Returns the salted
 * hash (to rebuild the session) + the name (for the banner), or null if this account has no
 * credential yet (the caller then routes them to onboarding). Never exposes the raw nullifier.
 */
export const getByPrivyUser = query({
  args: { privyUserId: v.string(), environment: v.optional(v.string()) },
  handler: async (ctx, { privyUserId, environment = "staging" }) => {
    const row = await credentialByAccount(ctx, privyUserId, environment);
    return row ? { nullifierHash: row.nullifierHash, name: row.name, environment: row.environment ?? "staging" } : null;
  },
});

/**
 * Look up the ENS name a verified human claimed, by their salted nullifier hash. Used to name the
 * human in the UI ("Signed in with HumanProof as ama.humanproof.eth"). Returns null if none.
 * Never exposes the nullifier — it's the input, keyed server-side.
 */
export const getByNullifier = query({
  args: { nullifierHash: v.string(), environment: v.optional(v.string()) },
  handler: async (ctx, { nullifierHash, environment = "staging" }) => {
    const row = await credentialByNullifier(ctx, nullifierHash, environment);
    return row ? { name: row.name } : null;
  },
});

/**
 * Read the profile avatar this human chose, by their salted nullifier hash — or null if they
 * haven't picked one (the UI then shows a deterministic default). Keyed server-side; the nullifier
 * is never exposed.
 */
export const getAvatar = query({
  args: { nullifierHash: v.string(), environment: v.optional(v.string()) },
  handler: async (ctx, { nullifierHash, environment = "staging" }) => {
    const row = await credentialByNullifier(ctx, nullifierHash, environment);
    return { avatar: row?.avatar ?? null };
  },
});

/**
 * Set (or change) this human's profile avatar, keyed by their salted nullifier hash. Patches the
 * existing credential row; a human with no row yet (verified but never recorded) is a no-op rather
 * than an error, so a returning human's avatar just persists once their row exists.
 */
export const setAvatar = mutation({
  args: { nullifierHash: v.string(), avatar: v.string(), environment: v.optional(v.string()) },
  handler: async (ctx, { nullifierHash, avatar, environment = "staging" }) => {
    const row = await credentialByNullifier(ctx, nullifierHash, environment);
    if (!row) return { saved: false };
    await ctx.db.patch(row._id, { avatar });
    return { saved: true };
  },
});
