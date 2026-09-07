import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WORLD_SESSION_COOKIE } from "@/app/api/world/verify/route";
import { readSessionForAccount } from "@/lib/session";
import { provenAccount } from "@/lib/account-session";
import { dbConfigured, getCredentialByPrivyUser } from "@/lib/db";

/**
 * GET /api/session — the reuse signal behind "Sign in with HumanProof".
 *
 * Two separate questions, and keeping them apart is a security boundary, not a nicety:
 *
 *   `name` / `credentialed` — WHO is this? Answered ONLY from the Privy account the caller can
 *      prove (its access token is verified against Privy's public keys). Never from the session
 *      cookie: that cookie survives a sign-out, so deriving identity from it handed a second person
 *      signing into the same browser the FIRST person's name and credential.
 *
 *   `verified` — is this browser a verified human right now? The signed World cookie answers, but
 *      only when it was issued to this same proven account. A cookie left behind by another
 *      account is inert.
 *
 * Privacy: the raw nullifier never leaves the server, and nothing derived from it is returned.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const privyUserId = await provenAccount(request);

  // Identity: strictly the proven account's own credential.
  let name: string | null = null;
  // true/false once the store answered; null when we couldn't ask (store unconfigured or erroring)
  // so the UI fails OPEN rather than locking a real human out over a transient backend blip.
  let credentialed: boolean | null = null;
  if (privyUserId && dbConfigured()) {
    try {
      const row = await getCredentialByPrivyUser(privyUserId);
      name = row?.name ?? null;
      credentialed = row !== null;
    } catch {
      name = null;
      credentialed = null;
    }
  }

  // Verification: only a cookie bound to THIS account counts.
  let verified = false;
  if (privyUserId) {
    const jar = await cookies();
    verified =
      readSessionForAccount(jar.get(WORLD_SESSION_COOKIE)?.value, privyUserId) !== null;
  }

  return NextResponse.json({ verified, name, credentialed });
}

/** Clear the reusable HumanProof browser session when the account signs out. */
export async function DELETE() {
  const jar = await cookies();
  jar.set(WORLD_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ signedOut: true });
}
