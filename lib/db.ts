/**
 * Server-only Convex client. HumanProof's off-chain store keeps only anonymous salted hashes —
 * never the raw nullifier, never personal data. Day-5 usage is all server-side (route handlers),
 * so we talk to Convex over HTTP with ConvexHttpClient and reference functions by name (no
 * dependency on convex/_generated, which only exists after `npx convex dev`).
 *
 * If NEXT_PUBLIC_CONVEX_URL isn't set yet (before the founder provisions Convex), `dbConfigured()`
 * is false and callers degrade gracefully instead of crashing — the site stays green.
 */
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { ConvexError } from "convex/values";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

/** True once the Convex deployment URL is configured. */
export function dbConfigured(): boolean {
  return Boolean(url);
}

function client(): ConvexHttpClient {
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
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

/** Safe, public-facing fields of a sealed action (never the nullifier). */
export type PublicSeal = {
  appId: string;
  contentHash: string;
  txHash: string | null;
  createdAt: number;
};

const getSealByRefRef = makeFunctionReference<
  "query",
  { sealRef: string },
  PublicSeal | null
>("seals:getByRef");

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

/** Pull the structured error code out of a thrown Convex error, however it surfaced. */
function convexCode(err: unknown): string | undefined {
  if (err instanceof ConvexError) {
    const data = err.data as { code?: string } | undefined;
    if (data?.code) return data.code;
  }
  if (err instanceof Error) {
    const m = err.message.match(/ALREADY_(?:RECORDED|SEALED)/);
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

/** Public read for the verify page: a sealed action's safe fields by its reference, or null. */
export async function getSealByRef(sealRef: string): Promise<PublicSeal | null> {
  return await client().query(getSealByRefRef, { sealRef });
}

/** The ENS name this human claimed, by their salted nullifier hash — or null. Best-effort display. */
export async function getCredentialName(nullifierHash: string): Promise<string | null> {
  const row = await client().query(getCredentialByNullifierRef, { nullifierHash });
  return row?.name ?? null;
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
