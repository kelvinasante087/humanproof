/**
 * Server-only Convex client. HumanProof's off-chain store keeps only anonymous salted hashes —
 * never the raw nullifier, never personal data. Day-5 usage is all server-side (route handlers),
 * so we talk to Convex over HTTP with ConvexHttpClient and reference functions by name (no
 * dependency on convex/_generated, which only exists after `npx convex dev`).
 *
 * If the Convex URL isn't set yet (before Convex is provisioned), `dbConfigured()` is false and
 * callers degrade gracefully instead of crashing — the site stays green.
 *
 * Production is PINNED to the app's prod Convex deployment (`elated-clownfish-975`) here in code.
 * Why hardcode it: this URL is public (a deployment address, not a secret — it's only ever used
 * server-side here, never sent to the browser), and the Vercel env var for it kept getting tangled
 * across multiple Convex projects, repeatedly pointing the live site at the wrong/empty deployment.
 * Pinning prod in code removes that fragile moving part — the live site can't drift again. To move
 * prod to a different Convex deployment later, change PROD_CONVEX_URL. Local dev is unaffected: it
 * reads `.env.local` (dev deployment `rare-fennec-188`) as before.
 */
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { ConvexError } from "convex/values";

/** The app's production Convex backend (public deployment address; see note above). */
const PROD_CONVEX_URL = "https://elated-clownfish-975.convex.cloud";

const url =
  process.env.NODE_ENV === "production"
    ? PROD_CONVEX_URL
    : (process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL);

/** True once the Convex deployment URL is configured. */
export function dbConfigured(): boolean {
  return Boolean(url);
}

function client(): ConvexHttpClient {
  if (!url) throw new Error("CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

const recordCredentialRef = makeFunctionReference<
  "mutation",
  { nullifierHash: string; name: string; privyUserId?: string },
  { recorded: boolean }
>("credentials:record");

const getCredentialByNullifierRef = makeFunctionReference<
  "query",
  { nullifierHash: string },
  { name: string } | null
>("credentials:getByNullifier");

const getAvatarRef = makeFunctionReference<
  "query",
  { nullifierHash: string },
  { avatar: string | null }
>("credentials:getAvatar");

const setAvatarRef = makeFunctionReference<
  "mutation",
  { nullifierHash: string; avatar: string },
  { saved: boolean }
>("credentials:setAvatar");

const getCredentialByPrivyUserRef = makeFunctionReference<
  "query",
  { privyUserId: string },
  { nullifierHash: string; name: string } | null
>("credentials:getByPrivyUser");

const linkCredentialAccountRef = makeFunctionReference<
  "mutation",
  { nullifierHash: string; name: string; privyUserId: string },
  { linked: boolean }
>("credentials:linkAccount");

const reserveSealRef = makeFunctionReference<
  "mutation",
  { dedupeKey: string; nullifierHash: string; appId: string; contentHash: string },
  string
>("seals:reserve");

const finalizeSealRef = makeFunctionReference<
  "mutation",
  { id: string; sealRef: string; txHash?: string },
  null
>("seals:finalize");

const releaseSealRef = makeFunctionReference<"mutation", { id: string }, null>("seals:release");

const recordGasFundingRef = makeFunctionReference<
  "mutation",
  { nullifierHash: string; address: string },
  { allowed: boolean }
>("airdrop:recordGasFunding");

/** Safe, public-facing fields of a sealed action (never the nullifier). */
export type PublicSeal = {
  appId: string;
  contentHash: string;
  txHash: string | null;
  createdAt: number;
};

/** Safe fields used by the signed-in activity feed. */
export type AccountSeal = PublicSeal & { sealRef: string };

const getSealByRefRef = makeFunctionReference<
  "query",
  { sealRef: string },
  PublicSeal | null
>("seals:getByRef");

const listSealsByNullifierRef = makeFunctionReference<
  "query",
  { nullifierHash: string },
  AccountSeal[]
>("seals:listByNullifier");

/** This human already has a credential recorded (DB-layer uniqueness). */
export class AlreadyRecordedError extends Error {
  constructor() {
    super("ALREADY_RECORDED");
    this.name = "AlreadyRecordedError";
  }
}
/** This human already sealed this exact action (one seal per human per action). */
export class AlreadySealedError extends Error {
  constructor() {
    super("ALREADY_SEALED");
    this.name = "AlreadySealedError";
  }
}

/** The airdrop gas faucet declined to fund this request (treasury guard). Carries the reason. */
export type GasFundingBlockReason = "wallet_mismatch" | "funding_limit" | "treasury_cap";
export class GasFundingBlockedError extends Error {
  reason: GasFundingBlockReason;
  constructor(reason: GasFundingBlockReason) {
    super("GAS_FUNDING_BLOCKED");
    this.reason = reason;
    this.name = "GasFundingBlockedError";
  }
}

/** Pull the structured error code out of a thrown Convex error, however it surfaced. */
function convexCode(err: unknown): string | undefined {
  if (err instanceof ConvexError) {
    const data = err.data as { code?: string } | undefined;
    if (data?.code) return data.code;
  }
  if (err instanceof Error) {
    const m = err.message.match(/ALREADY_(?:RECORDED|SEALED)|WALLET_MISMATCH|FUNDING_LIMIT|TREASURY_CAP/);
    if (m) return m[0];
  }
  return undefined;
}

/** Record a completed credential. Throws AlreadyRecordedError if this human already has one. */
export async function recordCredential(
  nullifierHash: string,
  name: string,
  privyUserId?: string,
): Promise<void> {
  try {
    await client().mutation(recordCredentialRef, { nullifierHash, name, privyUserId });
  } catch (err) {
    if (convexCode(err) === "ALREADY_RECORDED") throw new AlreadyRecordedError();
    throw err;
  }
}

/** Atomically reserve a seal. Throws AlreadySealedError on a duplicate action. Returns the id. */
export async function reserveSeal(args: {
  dedupeKey: string;
  nullifierHash: string;
  appId: string;
  contentHash: string;
}): Promise<string> {
  try {
    return await client().mutation(reserveSealRef, args);
  } catch (err) {
    if (convexCode(err) === "ALREADY_SEALED") throw new AlreadySealedError();
    throw err;
  }
}

/** Attach the sealing engine's references to a reserved seal. */
export async function finalizeSeal(id: string, sealRef: string, txHash?: string): Promise<void> {
  await client().mutation(finalizeSealRef, { id, sealRef, txHash });
}

/** Roll back a reservation if the seal never completed (best-effort). */
export async function releaseSeal(id: string): Promise<void> {
  try {
    await client().mutation(releaseSealRef, { id });
  } catch {
    // best-effort rollback; a stale reservation only blocks a re-attempt of the same action
  }
}

/**
 * Treasury guard for the airdrop gas faucet: atomically record that this human is being funded, or
 * throw. Resolves on success; throws GasFundingBlockedError when the guard declines (a different
 * wallet, too many retries, or the daily treasury cap). Any other throw (e.g. the function isn't
 * deployed yet) propagates so the caller can fail closed rather than open the faucet.
 */
export async function recordGasFunding(nullifierHash: string, address: string): Promise<void> {
  try {
    await client().mutation(recordGasFundingRef, { nullifierHash, address });
  } catch (err) {
    switch (convexCode(err)) {
      case "WALLET_MISMATCH":
        throw new GasFundingBlockedError("wallet_mismatch");
      case "FUNDING_LIMIT":
        throw new GasFundingBlockedError("funding_limit");
      case "TREASURY_CAP":
        throw new GasFundingBlockedError("treasury_cap");
      default:
        throw err;
    }
  }
}

/** Public read for the verify page: a sealed action's safe fields by its reference, or null. */
export async function getSealByRef(sealRef: string): Promise<PublicSeal | null> {
  return await client().query(getSealByRefRef, { sealRef });
}

/** Finalized seals belonging to the signed-in human, newest first. */
export async function listSealsByNullifier(nullifierHash: string): Promise<AccountSeal[]> {
  return await client().query(listSealsByNullifierRef, { nullifierHash });
}

/** The ENS name this human claimed, by their salted nullifier hash — or null. Best-effort display. */
export async function getCredentialName(nullifierHash: string): Promise<string | null> {
  const row = await client().query(getCredentialByNullifierRef, { nullifierHash });
  return row?.name ?? null;
}

/** The profile avatar this human chose, by their salted nullifier hash — or null if unset. */
export async function getCredentialAvatar(nullifierHash: string): Promise<string | null> {
  const { avatar } = await client().query(getAvatarRef, { nullifierHash });
  return avatar;
}

/** Persist this human's chosen avatar, keyed by their salted nullifier hash. */
export async function setCredentialAvatar(nullifierHash: string, avatar: string): Promise<boolean> {
  const { saved } = await client().mutation(setAvatarRef, { nullifierHash, avatar });
  return saved;
}

/**
 * The credential owned by a Privy account (DID) — its salted hash + name, or null if none. Used by
 * the passkey sign-in endpoint to rebuild the verified session for a returning human. Never exposes
 * the raw nullifier (it isn't stored).
 */
export async function getCredentialByPrivyUser(
  privyUserId: string,
): Promise<{ nullifierHash: string; name: string } | null> {
  return await client().query(getCredentialByPrivyUserRef, { privyUserId });
}

/**
 * Idempotent recovery: link a Privy account to its credential (patching an existing row or
 * inserting one), so a human who already claimed on-chain still becomes remembered. Best-effort;
 * only the salted hash is stored.
 */
export async function linkCredentialAccount(
  nullifierHash: string,
  name: string,
  privyUserId: string,
): Promise<void> {
  await client().mutation(linkCredentialAccountRef, { nullifierHash, name, privyUserId });
}
