import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WORLD_SESSION_COOKIE } from "@/app/api/world/verify/route";
import { readSession } from "@/lib/session";
import { claimViaRegistrar, resolveName, saltedNullifierHash, AlreadyClaimedError, NameUnavailableError } from "@/lib/ens/registrar";
import { InvalidEnsNameError } from "@/lib/ens/normalize";
import { recordCredential, dbConfigured } from "@/lib/db";

/**
 * Claim <name>.humanproof.eth for the signed-in user — THROUGH the on-chain registrar.
 *
 * Gate: the request needs the World-verification session cookie (this session proved a unique
 * human). The raw nullifier held in that cookie never leaves the server — we hash it (salted)
 * into the humanity voucher. The HumanProofRegistrar contract then enforces, on-chain, that the
 * voucher is issuer-signed and that this human hasn't already claimed a name. The name step is
 * only shown after the passkey step, so the flow is verify -> passkey -> claim.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const jar = await cookies();
  const session = readSession(jar.get(WORLD_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Verify you're human first." }, { status: 401 });
  }
  // Claiming a name needs the RAW nullifier (to build the on-chain humanity voucher). A passkey
  // re-login session carries only the salted hash — such a human already holds a credential and
  // never re-claims, so reject cleanly rather than pretend we can build a voucher.
  const nullifier = session.nullifier;
  if (!nullifier) {
    return NextResponse.json(
      { error: "This session can't claim a name. You already have a credential." },
      { status: 401 },
    );
  }

  let body: { label?: unknown; address?: unknown; privyUserId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body was not valid JSON." }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label : "";
  const address = typeof body.address === "string" ? body.address : "";
  // The owning Privy account (DID), recorded so a passkey re-login can find this credential later.
  const privyUserId = typeof body.privyUserId === "string" ? body.privyUserId : undefined;
  if (!label.trim()) return NextResponse.json({ error: "Please choose a name." }, { status: 400 });
  if (!address) return NextResponse.json({ error: "Missing wallet address." }, { status: 400 });

  try {
    const { name, txHash } = await claimViaRegistrar(label, address, nullifier);
    const resolved = await resolveName(name);

    // Credential complete → record the salted nullifier hash (never the raw value) as the
    // DB-layer half of one-human-one-credential. The on-chain registrar already enforced
    // uniqueness, so this is a best-effort mirror: a failed write must not fail the claim the
    // user already paid for on-chain. Skipped cleanly until Convex is provisioned.
    if (dbConfigured()) {
      try {
        await recordCredential(saltedNullifierHash(nullifier).toString(), name, privyUserId);
      } catch (dbErr) {
        console.warn("[ens/claim] credential DB record skipped:", dbErr);
      }
    }

    return NextResponse.json({ name, resolved, txHash });
  } catch (err) {
    if (err instanceof InvalidEnsNameError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof AlreadyClaimedError) return NextResponse.json({ error: err.message }, { status: 409 });
    if (err instanceof NameUnavailableError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("[ens/claim] on-chain claim failed:", err);
    return NextResponse.json({ error: "Couldn't claim that name right now." }, { status: 500 });
  }
}
