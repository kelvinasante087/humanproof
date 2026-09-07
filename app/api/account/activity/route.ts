import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WORLD_SESSION_COOKIE } from "@/app/api/world/verify/route";
import { readSession } from "@/lib/session";
import { saltedNullifierHash } from "@/lib/ens/registrar";
import { dbConfigured, listSealsByNullifier } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Account-only activity. Identity is derived exclusively from the signed, httpOnly session. */
export async function GET() {
  const jar = await cookies();
  const session = readSession(jar.get(WORLD_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Human verification required." }, { status: 401 });

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
