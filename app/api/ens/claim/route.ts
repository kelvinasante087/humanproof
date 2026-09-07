import { NextResponse } from "next/server";
import { readBoundSession } from "@/lib/account-session";
import { claimViaRegistrar, resolveName, saltedNullifierHash, AlreadyClaimedError, NameUnavailableError } from "@/lib/ens/registrar";
import { InvalidEnsNameError, normalizeSubname } from "@/lib/ens/normalize";
import { PARENT_NAME } from "@/lib/ens/config";
import {
  recordCredential,
  linkCredentialAccount,
  dbConfigured,
  AlreadyRecordedError,
} from "@/lib/db";

/**
 * Persist the completed credential, retrying briefly.
 *
 * The on-chain claim has already succeeded by this point, so a store failure must never fail the
 * request. But this record IS what the dashboard reads to show a human their name — a silent
 * single-attempt failure left people staring at a nameless card. So: retry a couple of times, and
 * treat "already recorded" as the success it actually is.
 */
async function recordCredentialBestEffort(
  nullifierHash: string,
  name: string,
  privyUserId?: string,
): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await recordCredential(nullifierHash, name, privyUserId);
      return;
    } catch (err) {
      if (err instanceof AlreadyRecordedError) return;
      if (attempt === 3) {
        console.error("[ens/claim] credential record failed after retries:", err);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }
}

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
  // The verification MUST belong to the account claiming. Without this, a stale cookie from a
  // previous account let this claim fall into the "already claimed" recovery path and rewrite that
  // other person's credential onto this account — a silent account takeover.
  const bound = await readBoundSession(request);
  if (!bound) {
    return NextResponse.json({ error: "Verify you're human first." }, { status: 401 });
  }
  const { session, privyUserId } = bound;
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

  let body: { label?: unknown; address?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body was not valid JSON." }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label : "";
  const address = typeof body.address === "string" ? body.address : "";
  // NOTE: the owning account comes from `bound.privyUserId` above — the token we verified — and is
  // deliberately NOT read from the body. A client-supplied account id here would let anyone attach
  // a credential to someone else's account.
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
      await recordCredentialBestEffort(saltedNullifierHash(nullifier).toString(), name, privyUserId);
    }

    return NextResponse.json({ name, resolved, txHash });
  } catch (err) {
    if (err instanceof InvalidEnsNameError) return NextResponse.json({ error: err.message }, { status: 400 });

    // "Already claimed" is keyed on the HUMAN (the registrar reverts NullifierAlreadyUsed), so this
    // session's World fingerprint IS this human's real, already-registered one. That's not a dead
    // end — it's a returning human. Repair their credential record (link this Privy account to their
    // real fingerprint + name) so "Sign in with HumanProof" remembers them from now on, and treat
    // it as a successful re-sync rather than an error. No re-claim, no new nullifier — their real
    // one is reused; only its salted hash is ever stored.
    if (err instanceof AlreadyClaimedError) {
      if (dbConfigured()) {
        try {
          const { name } = normalizeSubname(label, PARENT_NAME);
          // Confirm this is a name they actually own before recording it. If it resolves to a
          // DIFFERENT wallet, they typed someone else's name — ask for the right one. If it can't
          // be resolved (known ENSv2 resolver flakiness), trust the nullifier (it already proves
          // this human) and record best-effort.
          const resolved = await resolveName(name).catch(() => null);
          if (resolved && resolved.toLowerCase() !== address.toLowerCase()) {
            return NextResponse.json(
              { error: "You've already claimed a name. Enter the exact name you claimed to sign back in." },
              { status: 409 },
            );
          }
          await linkCredentialAccount(saltedNullifierHash(nullifier).toString(), name, privyUserId);
          return NextResponse.json({ name, resolved, resynced: true });
        } catch (linkErr) {
          console.warn("[ens/claim] re-sync link failed:", linkErr);
        }
      }
      // Couldn't re-sync (no store or no account id) — fall back to the honest "already claimed".
      return NextResponse.json({ error: err.message }, { status: 409 });
    }

    if (err instanceof NameUnavailableError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("[ens/claim] on-chain claim failed:", err);
    return NextResponse.json({ error: "Couldn't claim that name right now." }, { status: 500 });
  }
}
