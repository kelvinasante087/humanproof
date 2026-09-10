import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { provenAccount } from "@/lib/account-session";
import { getProgress } from "@/lib/onboarding";
import { getCredentialByPrivyUser } from "@/lib/db";
import { sealSessionFromHash } from "@/lib/session";
import { HUMAN_SESSION_COOKIE as WORLD_SESSION_COOKIE } from "@/lib/verification/config";

export async function POST(request: Request) {
  const account = await provenAccount(request);
  if (!account) return NextResponse.json({ error: "Sign in to resume." }, { status: 401 });
  try {
    const credential = await getCredentialByPrivyUser(account);
    const progress = credential ? null : await getProgress(account);
    // Incomplete proofs expire after 24 hours. A completed credential remains reusable.
    const validProgress = progress && (Date.now() - progress.verifiedAt < 86400000 || Boolean(progress.name));
    const fingerprint = credential?.nullifierHash ?? (validProgress ? progress.nullifierHash : null);
    if (fingerprint) (await cookies()).set(WORLD_SESSION_COOKIE, sealSessionFromHash(fingerprint, account), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 3600,
    });
    return NextResponse.json({ verified: Boolean(fingerprint), name: credential?.name ?? null,
      pendingName: progress?.name ?? null, credentialed: Boolean(credential) });
  } catch {
    return NextResponse.json({ error: "Your saved progress is temporarily unavailable. Retry to continue." }, { status: 503 });
  }
}
