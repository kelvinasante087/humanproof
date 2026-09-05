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
  { nullifierHash: string; name: string },
  { recorded: boolean }
>("credentials:record");

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
export async function recordCredential(nullifierHash: string, name: string): Promise<void> {
  try {
    await client().mutation(recordCredentialRef, { nullifierHash, name });
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
