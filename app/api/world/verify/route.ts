import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORLD_ACTION,
  WORLD_ENV,
  assertPinnedEnvironment,
  extractNullifier,
  WorldEnvironmentMismatchError,
  NullifierNotFoundError,
} from "@/lib/world";

/**
 * Verifies a World Selfie Check proof server-side and, on success, holds the
 * resulting nullifier in a locked-down session cookie.
 *
 * The whole trust boundary lives here:
 *  - Guard #1: reject a proof whose *claimed* environment isn't the one we're
 *    pinned to (staging), before we call anything.
 *  - Forward the proof as-is to World's verify endpoint.
 *  - Require success === true.
 *  - Guard #2: re-check the environment World *echoes back*.
 *  - Trust ONLY the nullifier World returns — never a value the browser sent —
 *    and fail loud if it's absent.
 *
 * Day 2 keeps the nullifier in session ONLY (this cookie). Nothing is written
 * to a database until the ENS step completes the flow (Day 4).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_BASE_URL =
  process.env.WORLD_VERIFY_BASE_URL || "https://developer.world.org";

/** Name of the session cookie that holds the verified nullifier. */
export const WORLD_SESSION_COOKIE = "hp_world_nullifier";

type Json = Record<string, unknown>;

export async function POST(request: Request) {
  const rpId = process.env.WORLD_RP_ID;
  if (!rpId) {
    return NextResponse.json(
      { verified: false, error: "WORLD_RP_ID is not configured." },
      { status: 500 },
    );
  }

  let proof: Json;
  try {
    proof = (await request.json()) as Json;
  } catch {
    return NextResponse.json(
      { verified: false, error: "Request body was not valid JSON." },
      { status: 400 },
    );
  }

  // Guard #1 — pin the environment the proof claims, before trusting anything.
  try {
    assertPinnedEnvironment(proof.environment);
  } catch (err) {
    if (err instanceof WorldEnvironmentMismatchError) {
      return NextResponse.json({ verified: false, error: err.message }, { status: 400 });
    }
    throw err;
  }

  // Forward the proof to World's verify endpoint, unchanged, plus action + env.
  const url = `${VERIFY_BASE_URL}/api/v4/verify/${rpId}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Some verify endpoints require an API key; send it only if we have one.
  if (process.env.WORLD_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.WORLD_API_KEY}`;
  }

  let verifyRes: Response;
  try {
    verifyRes = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...proof, action: WORLD_ACTION, environment: WORLD_ENV }),
    });
  } catch (err) {
    console.error("[world/verify] network error calling World verify:", err);
    return NextResponse.json(
      { verified: false, error: "Could not reach the World verify API." },
      { status: 502 },
    );
  }

  const body: Json = (await verifyRes.json().catch(() => ({}))) as Json;

  if (!verifyRes.ok || body.success !== true) {
    console.warn("[world/verify] World rejected the proof:", verifyRes.status, body);
    return NextResponse.json(
      { verified: false, error: "World did not confirm the proof." },
      { status: 401 },
    );
  }

  // Guard #2 — re-check the environment World echoes back in its response.
  try {
    if (typeof body.environment === "string") assertPinnedEnvironment(body.environment);
  } catch (err) {
    if (err instanceof WorldEnvironmentMismatchError) {
      return NextResponse.json({ verified: false, error: err.message }, { status: 400 });
    }
    throw err;
  }

  // Trust ONLY the nullifier World returned; never grant on a missing one.
  let nullifier: string;
  try {
    nullifier = extractNullifier(body);
  } catch (err) {
    if (err instanceof NullifierNotFoundError) {
      console.error("[world/verify]", err.message, body);
      return NextResponse.json(
        { verified: false, error: "Proof confirmed but no nullifier was returned." },
        { status: 502 },
      );
    }
    throw err;
  }

  // Session-only, locked down: httpOnly (never readable by JS), secure in prod,
  // sameSite. The nullifier is the sensitive bit — it stays server-side.
  const jar = await cookies();
  jar.set(WORLD_SESSION_COOKIE, nullifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  // Browser-safe response: confirmation only. No nullifier-derived value leaves
  // the server (privacy promise: "an anonymous fingerprint, nothing about you").
  return NextResponse.json({ verified: true, environment: WORLD_ENV });
}
