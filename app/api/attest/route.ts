import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WORLD_SESSION_COOKIE } from "@/app/api/world/verify/route";
import { readSession } from "@/lib/session";
import { saltedNullifierHash } from "@/lib/ens/registrar";
import {
  sealAction,
  sealConfigured,
  toContentHash32,
  attestDedupeKey,
  AlreadySealedOnChainError,
} from "@/lib/attest";
import {
  dbConfigured,
  reserveSeal,
  finalizeSeal,
  releaseSeal,
  AlreadySealedError,
} from "@/lib/db";

/**
 * POST /api/attest — the pluggable layer any app calls.
 *
 * It takes a content hash of the action + the calling app's id, pulls the verified human from the
 * SIGNED session cookie (never from the body), and seals { salt(nullifier), contentHash, timestamp,
 * appId } on Base. One seal per human per action:
 *  1. the DB reserve blocks a duplicate BEFORE any gas is spent (spam/gas guard), and
 *  2. the contract reverts AlreadySealed as the final on-chain backstop.
 *
 * The raw nullifier never leaves the server and never touches the chain — only its salted hash (an
 * anonymous fingerprint) is sealed. The response carries safe references only.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const jar = await cookies();
  const session = readSession(jar.get(WORLD_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Verify you're human first." }, { status: 401 });
  }

  let body: { contentHash?: unknown; appId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body was not valid JSON." }, { status: 400 });
  }

  const contentHash = typeof body.contentHash === "string" ? body.contentHash.trim() : "";
  const appId = typeof body.appId === "string" ? body.appId.trim() : "";
  if (!contentHash) return NextResponse.json({ error: "Missing contentHash." }, { status: 400 });
  if (!appId) return NextResponse.json({ error: "Missing appId." }, { status: 400 });

  if (!sealConfigured()) {
    return NextResponse.json(
      { error: "Sealing is not configured yet." },
      { status: 503 },
    );
  }

  const nullifierHash = saltedNullifierHash(session.nullifier); // bigint — the salted fingerprint
  const contentHash32 = toContentHash32(contentHash);
  const dedupeKey = attestDedupeKey(nullifierHash, contentHash32, appId);

  // 1. Reserve atomically (if the store is live). A duplicate is blocked before we spend gas.
  let reservationId: string | null = null;
  if (dbConfigured()) {
    try {
      reservationId = await reserveSeal({
        dedupeKey,
        nullifierHash: nullifierHash.toString(),
        appId,
        contentHash: contentHash32,
      });
    } catch (err) {
      if (err instanceof AlreadySealedError) {
        return NextResponse.json({ error: "Already sealed for this human." }, { status: 409 });
      }
      console.error("[attest] reserve failed:", err);
      return NextResponse.json({ error: "Could not reserve the seal." }, { status: 500 });
    }
  }

  // 2. Seal on-chain (the contract reverts AlreadySealed as the final backstop).
  try {
    const { sealRef, txHash, explorer } = await sealAction(nullifierHash, contentHash32, appId);
    if (reservationId) await finalizeSeal(reservationId, sealRef, txHash);
    return NextResponse.json({ sealId: sealRef, txHash, appId, explorer });
  } catch (err) {
    if (reservationId) await releaseSeal(reservationId);
    if (err instanceof AlreadySealedOnChainError) {
      return NextResponse.json({ error: "Already sealed for this human." }, { status: 409 });
    }
    console.error("[attest] seal failed:", err);
    return NextResponse.json({ error: "Could not seal the action right now." }, { status: 502 });
  }
}
