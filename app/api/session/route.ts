import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WORLD_SESSION_COOKIE } from "@/app/api/world/verify/route";
import { readSession } from "@/lib/session";

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
  return NextResponse.json({ verified: Boolean(session) });
}
