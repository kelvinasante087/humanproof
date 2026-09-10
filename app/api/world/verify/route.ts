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
import { sealSessionFromHash } from "@/lib/session";
import { saltedNullifierHash } from "@/lib/ens/registrar";
import { saveProof } from "@/lib/onboarding";
import { verifyPrivyUserId } from "@/lib/privy-auth";
import { VERIFICATION_PROVIDER } from '@/lib/verification/config';

/** Verify the pinned World environment, save account-bound progress and issue a hash-only cookie. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_BASE_URL =
  process.env.WORLD_VERIFY_BASE_URL || "https://developer.world.org";

/** Name of the session cookie that holds the verified nullifier. */
export const WORLD_SESSION_COOKIE = "hp_world_nullifier";

type Json = Record<string, unknown>;

export async function POST(request: Request) {
  if (VERIFICATION_PROVIDER !== 'world') return NextResponse.json({ error: 'This verification provider is inactive.' }, { status: 404 });
  const rpId = process.env.WORLD_RP_ID;
  if (!rpId) {
    return NextResponse.json(
      { verified: false, error: "WORLD_RP_ID is not configured." },
      { status: 500 },
    );
  }

  // A verification is issued TO an account. Without this the resulting cookie is bearer authority
  // for whoever holds the browser next — which is exactly how one person ended up signed in as
  // another. Prove the account first, then bind the session to it.
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const privyUserId = await verifyPrivyUserId(bearer);
  if (!privyUserId) {
    return NextResponse.json(
      { verified: false, error: "Sign in before verifying your humanity." },
      { status: 401 },
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
      signal: AbortSignal.timeout(20000),
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
    // Keep proof/nullifier data out of logs, but retain the verifier's safe
    // diagnostic fields so a simulator/configuration failure is actionable.
    const candidateCode =
      typeof body.error_code === "string"
        ? body.error_code
        : typeof body.code === "string"
          ? body.code
          : undefined;
    const safeCode = candidateCode && /^[A-Za-z0-9_.-]{1,64}$/.test(candidateCode)
      ? candidateCode
      : "unspecified";
    console.warn("[world/verify] World rejected proof", {
      status: verifyRes.status,
      code: safeCode,
      responseKeys: Object.keys(body).slice(0, 20),
    });
    let userMsg = "World rejected this proof. Start a fresh request and try again.";
    if (safeCode === "max_verifications_reached") {
      userMsg = "This World ID has already completed verification.";
    } else if (safeCode === "invalid_action") {
      userMsg = "World action mismatch. Please refresh and try again.";
    } else if (safeCode === "expired") {
      userMsg = "This verification session expired. Please scan and verify again.";
    } else if (safeCode !== "unspecified") {
      userMsg = `World rejected this proof (${safeCode}). Start a fresh request and try again.`;
    }
    return NextResponse.json(
      {
        verified: false,
        error: userMsg,
      },
      { status: 401 },
    );
  }

  // Guard #2 — re-check the environment World echoes back in its response.
  try {
    assertPinnedEnvironment(body.environment);
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
      console.error("[world/verify]", err.message);
      return NextResponse.json(
        { verified: false, error: "Proof confirmed but no nullifier was returned." },
        { status: 502 },
      );
    }
    throw err;
  }

  // Persist the salted fingerprint before issuing a reusable session. Never persist raw proof data.
  const fingerprint = saltedNullifierHash(nullifier).toString();
  try {
    await saveProof(privyUserId, fingerprint);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("HUMAN_ALREADY_BOUND")) {
      return NextResponse.json(
        {
          verified: false,
          error:
            "This World ID is already linked to a HumanProof account. Sign out and use your HumanProof passkey to resume that account.",
        },
        { status: 409 },
      );
    }
    if (message.includes("ACCOUNT_ALREADY_BOUND")) {
      return NextResponse.json(
        {
          verified: false,
          error:
            "This HumanProof account is already linked to a different human proof. Sign out and resume the original account.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        verified: false,
        error:
          "Could not save verification progress. Retry with the account that originally completed HumanProof.",
      },
      { status: 409 },
    );
  }
  const jar = await cookies();
  jar.set(WORLD_SESSION_COOKIE, sealSessionFromHash(fingerprint, privyUserId), {
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
