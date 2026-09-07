import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WORLD_SESSION_COOKIE } from "@/app/api/world/verify/route";
import { readSession } from "@/lib/session";
import { saltedNullifierHash } from "@/lib/ens/registrar";
import { dbConfigured, getCredentialName, getCredentialByPrivyUser } from "@/lib/db";
import { verifyPrivyUserId } from "@/lib/privy-auth";

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

export async function GET(request: Request) {
  const jar = await cookies();
  const session = readSession(jar.get(WORLD_SESSION_COOKIE)?.value);

  // Two different questions, deliberately kept apart:
  //   `verified`    — is this browser a verified human RIGHT NOW? (the World session; expires in 1h)
  //   `name` / `credentialed` — WHO is this? (durable identity, tied to their Privy account)
  // Keeping them separate is why the dashboard can still greet you by name an hour later, while
  // still requiring a fresh passkey tap before you can act.
  let name: string | null = null;
  // true/false once the store answered; null when we couldn't ask (store unconfigured or erroring)
  // so the UI fails OPEN rather than locking a real human out over a transient backend blip.
  let credentialed: boolean | null = null;

  if (session) {
    if (dbConfigured()) {
      try {
        // Onboarding sessions carry the raw nullifier (hash it); passkey re-login sessions already
        // carry the salted hash. The name lookup is keyed on that hash in both cases.
        const nullifierHash =
          session.nullifierHash ?? saltedNullifierHash(session.nullifier!).toString();
        name = await getCredentialName(nullifierHash);
        credentialed = name !== null;
      } catch {
        name = null;
        credentialed = null;
      }
    }
    return NextResponse.json({ verified: true, name, credentialed });
  }

  // No live World session. Fall back to the PROVEN Privy account (its access token is verified
  // server-side against Privy's public keys — never a client-supplied id) for identity only. This
  // never grants `verified`: knowing who you are is not the same as proving you're human this
  // session, and every gated action still requires the latter.
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const privyUserId = await verifyPrivyUserId(bearer);
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
  return NextResponse.json({ verified: false, name, credentialed });
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
