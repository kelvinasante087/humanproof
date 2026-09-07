import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WORLD_SESSION_COOKIE } from "@/app/api/world/verify/route";
import { readSession } from "@/lib/session";
import { saltedNullifierHash } from "@/lib/ens/registrar";
import { dbConfigured, getCredentialName } from "@/lib/db";

/**
 * GET /api/session — the reuse signal behind "Sign in with HumanProof".
 *
 * Any app in this codebase asks one question: is this browser a verified human THIS session?
 * The answer comes from the signed, httpOnly World-verification cookie set once at `/`. Because
 * every route is the same origin, that cookie is already present here — which is exactly why a
 * second app recognizes the same human without re-verifying (the on-camera reuse moment).
 *
 * Privacy: this returns a boolean and nothing else. The raw nullifier stays server-side; nothing
 * derived from it ever reaches the browser.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const session = readSession(jar.get(WORLD_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ verified: false });

  // If the credential store is live, name the human by their claimed ENS name (best-effort — a
  // lookup failure or an unprovisioned store just omits the name; the raw nullifier never leaves).
  let name: string | null = null;
  // Has this human finished their credential? true/false once the store answered; null when we
  // couldn't ask (store unconfigured or erroring) so the UI can fail OPEN rather than lock a real
  // human out of their own account over a transient backend blip.
  let credentialed: boolean | null = null;
  if (dbConfigured()) {
    try {
      // Onboarding sessions carry the raw nullifier (hash it); passkey re-login sessions already
      // carry the salted hash. The name lookup is keyed on that hash in both cases.
      const nullifierHash = session.nullifierHash ?? saltedNullifierHash(session.nullifier!).toString();
      name = await getCredentialName(nullifierHash);
      credentialed = name !== null;
    } catch {
      name = null;
      credentialed = null;
    }
  }
  return NextResponse.json({ verified: true, name, credentialed });
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
