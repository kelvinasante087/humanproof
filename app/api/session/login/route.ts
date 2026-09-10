import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { HUMAN_SESSION_COOKIE as WORLD_SESSION_COOKIE } from "@/lib/verification/config";
import { sealSessionFromHash } from "@/lib/session";
import { verifyPrivyUserId } from "@/lib/privy-auth";
import { dbConfigured, getCredentialByPrivyUser } from "@/lib/db";

/**
 * POST /api/session/login — "Sign in with HumanProof" via a passkey (the returning-user flow).
 *
 * This is the reuse moment made real: a human who already proved they're a unique human (email →
 * World → passkey → ENS name) taps their passkey and is signed back in as a verified human WITHOUT
 * re-running the World check.
 *
 * How it stays honest (a real re-established session, never a client-only flag):
 *  1. The client sends Privy's access token in the Authorization header. We verify its signature
 *     server-side against Privy's public keys — the browser cannot forge WHICH account it is.
 *  2. We look that proven account up in our store to find its existing credential (the salted
 *     nullifier hash — the anonymous fingerprint). No account link, no credential → no session.
 *  3. We mint the SAME signed, httpOnly verification cookie that a World check produces, carrying
 *     the fingerprint. Every existing gate (/attest, the payout, the duplicate-block) enforces on
 *     that cookie exactly as before. The raw nullifier is never involved on this path.
 *
 * Demo-sized honesty: the demo apps share this one deployment, so the tap re-establishes the
 * session instantly on the same origin. In production an external app would redirect to HumanProof
 * and get the same one-tap sign-in back — we do NOT implement cross-domain SSO here.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Prove the Privy account server-side (never trust a client-supplied id).
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const privyUserId = await verifyPrivyUserId(token);
  if (!privyUserId) {
    return NextResponse.json({ error: "Not a valid passkey session." }, { status: 401 });
  }

  // The credential store is where the account → credential link lives. Until it's provisioned we
  // can't look anyone up, so say so cleanly rather than pretend.
  if (!dbConfigured()) {
    return NextResponse.json({ error: "Sign-in is being provisioned." }, { status: 503 });
  }

  // 2. Find this account's existing credential.
  let credential: { nullifierHash: string; name: string } | null;
  try {
    credential = await getCredentialByPrivyUser(privyUserId);
  } catch (err) {
    console.error("[session/login] credential lookup failed:", err);
    return NextResponse.json({ error: "Couldn't sign you in right now." }, { status: 500 });
  }

  // No credential yet → route them to create one (the onboarding flow). Access is NOT granted.
  if (!credential) {
    return NextResponse.json({ verified: false, needsOnboarding: true });
  }

  // 3. Re-issue the verified session from the fingerprint — same locked-down cookie world/verify
  // sets, so the server-side gate accepts it identically.
  const jar = await cookies();
  // Bound to the account we just proved, so this cookie can never speak for anyone else.
  jar.set(WORLD_SESSION_COOKIE, sealSessionFromHash(credential.nullifierHash, privyUserId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour, matching the World-verification session
  });

  return NextResponse.json({ verified: true, name: credential.name });
}
