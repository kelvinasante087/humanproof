/**
 * The single place that answers "is this request a verified human, and is it THIS account?"
 *
 * Why it exists: the World verification cookie outlives a sign-out. Before this, a second person
 * signing into the same browser inherited the first person's verified humanity — their name showed
 * on the dashboard, and the claim-recovery path would rewrite their credential onto the new
 * account. The cookie alone is therefore NOT sufficient authority; it must be checked against the
 * account the caller can actually prove (a Privy access token verified against Privy's public
 * keys). Every route that reads the session must go through here so the rule can't drift.
 *
 * Server-only. Fails closed: no token, no cookie, or a mismatch between them all return null.
 */
import { cookies } from "next/headers";
import { HUMAN_SESSION_COOKIE as WORLD_SESSION_COOKIE } from "@/lib/verification/config";
import { readSessionForAccount, type Session } from "@/lib/session";
import { verifyPrivyUserId } from "@/lib/privy-auth";

export type BoundSession = { session: Session; privyUserId: string };

/** The caller's proven Privy account id, or null when the bearer token is absent/invalid. */
export async function provenAccount(request: Request): Promise<string | null> {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return await verifyPrivyUserId(bearer);
}

/**
 * Resolve the verified session ONLY if it was issued to the account this request proves it is.
 * Returns null for an unauthenticated caller, a missing/expired cookie, or — the case this exists
 * for — a cookie left behind by a different account.
 */
export async function readBoundSession(request: Request): Promise<BoundSession | null> {
  const privyUserId = await provenAccount(request);
  if (!privyUserId) return null;

  const jar = await cookies();
  const session = readSessionForAccount(jar.get(WORLD_SESSION_COOKIE)?.value, privyUserId);
  if (!session) return null;

  return { session, privyUserId };
}

/** The salted fingerprint for a bound session, however the session was issued. */
export function fingerprintOf(session: Session, saltedHash: (n: string) => bigint): string {
  return session.nullifierHash ?? saltedHash(session.nullifier!).toString();
}
