import { NextResponse } from "next/server";
import { readBoundSession } from "@/lib/account-session";
import { saltedNullifierHash } from "@/lib/ens/registrar";
import { dbConfigured, listSealsByNullifier } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Account-only activity. Identity comes from the signed session AND the caller's proven Privy
 * account — never the cookie alone, so one account can't read another's proof history.
 */
export async function GET(request: Request) {
  const bound = await readBoundSession(request);
  if (!bound) return NextResponse.json({ error: "Human verification required." }, { status: 401 });
  const { session } = bound;

  if (!dbConfigured()) {
    return NextResponse.json({ seals: [], available: false });
  }

  try {
    const nullifierHash =
      session.nullifierHash ?? saltedNullifierHash(session.nullifier!).toString();
    const seals = await listSealsByNullifier(nullifierHash);
    return NextResponse.json({ seals, available: true });
  } catch (error) {
    console.error("[account/activity] read failed:", error);
    return NextResponse.json({ error: "Activity is temporarily unavailable." }, { status: 503 });
  }
}
