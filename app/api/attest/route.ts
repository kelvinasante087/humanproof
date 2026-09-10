import { NextResponse } from "next/server";
import { backendCall } from "@/lib/backend";
import { readBoundSession } from "@/lib/account-session";
import { hasDemoSession } from "@/lib/demo/session";
import { getCredentialByPrivyUser } from "@/lib/db";
import { claimIdFor, claimAbi } from "@/lib/airdrop/voucher";
import { PROOF_TOKEN, CLAIM_CONTENT } from "@/lib/airdrop/config";
import { sealPublicClient } from "@/lib/seal/config";
import { zeroAddress } from "viem";
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
  // The verified session must belong to the account making this call — a cookie left behind by a
  // previous account must never seal an action as that other human.
  const bound = await readBoundSession(request);
  if (!bound) {
    return NextResponse.json({ error: "Verify you're human first." }, { status: 401 });
  }
  const { session } = bound;

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
  if (contentHash.length > 12000 || appId.length > 64) return NextResponse.json({ error: "Action is too large." }, { status: 400 });
  const allowedApps = (process.env.HUMANPROOF_ALLOWED_APP_IDS || "reviews,airdrop").split(",");
  if (!allowedApps.includes(appId)) return NextResponse.json({ error: "App is not registered." }, { status: 403 });
  if (appId === "airdrop" && !await hasDemoSession(appId, bound.privyUserId)) {
    return NextResponse.json({ error: "Sign in to this app with HumanProof." }, { status: 401 });
  }

  try {
    const credential = await getCredentialByPrivyUser(bound.privyUserId);
    if (!credential) return NextResponse.json({ error: "Finish your HumanProof credential before posting or claiming." }, { status: 403 });
    const sessionHash = session.nullifierHash ?? saltedNullifierHash(session.nullifier!).toString();
    if (credential.nullifierHash !== sessionHash) return NextResponse.json({ error: "Sign in again to restore your credential." }, { status: 401 });
    if (appId === "airdrop") {
      if (!PROOF_TOKEN || contentHash !== CLAIM_CONTENT) return NextResponse.json({ error: "Invalid campaign action." }, { status: 400 });
      const recipient = await sealPublicClient.readContract({ address: PROOF_TOKEN, abi: claimAbi, functionName: "claimedBy", args: [claimIdFor(credential.nullifierHash)] });
      if (recipient === zeroAddress) return NextResponse.json({ error: "The payout must confirm before its receipt can be sealed." }, { status: 409 });
    }
  } catch { return NextResponse.json({ error: "Could not verify your credential or payout. Retry shortly." }, { status: 503 }); }

  if (!sealConfigured()) {
    return NextResponse.json(
      { error: "Sealing is not configured yet." },
      { status: 503 },
    );
  }

  // The salted fingerprint (bigint). An onboarding session carries the raw nullifier (hash it here);
  // a passkey re-login session carries the already-salted hash directly. Either way, same value.
  const nullifierHash = session.nullifierHash
    ? BigInt(session.nullifierHash)
    : saltedNullifierHash(session.nullifier!);
  const contentHash32 = toContentHash32(contentHash);
  const dedupeKey = attestDedupeKey(nullifierHash, contentHash32, appId);

  // 1. Reserve atomically (if the store is live). A duplicate is blocked before we spend gas.
  let reservationId: string | null = null;
  let pendingTxHash: `0x${string}` | undefined;
  let recoveryStart: bigint | undefined;
  if (dbConfigured()) {
    try {
      const startBlock = (await sealPublicClient.getBlockNumber()).toString();
      reservationId = await reserveSeal({
        dedupeKey,
        nullifierHash: nullifierHash.toString(),
        appId,
        contentHash: contentHash32,
        startBlock,
      });
      const reservation = await backendCall<{ txHash?: `0x${string}`; sealRef?: string; startBlock?: string } | null>("query", "seals:getByDedupe", { dedupeKey });
      if (reservation?.sealRef && reservation.txHash) return NextResponse.json({ sealId: reservation.sealRef, txHash: reservation.txHash, appId, explorer: `https://sepolia.basescan.org/tx/${reservation.txHash}`, replayed: true });
      pendingTxHash = reservation?.txHash;
      recoveryStart = reservation?.startBlock ? BigInt(reservation.startBlock) : undefined;
    } catch (err) {
      if (err instanceof AlreadySealedError) {
        return NextResponse.json({ error: "Already sealed for this human." }, { status: 409 });
      }
      console.error("[attest] reserve failed:", err);
      return NextResponse.json({ error: "This proof is pending or the store is unavailable. Retry shortly to recover its receipt." }, { status: 503 });
    }
  }

  // 2. Seal on-chain (the contract reverts AlreadySealed as the final backstop).
  try {
    const { sealRef, txHash, explorer } = await sealAction(nullifierHash, contentHash32, appId, async hash => {
      if (reservationId) await backendCall("mutation", "seals:sent", { id: reservationId, txHash: hash });
    }, pendingTxHash, recoveryStart);
    if (reservationId) await finalizeSeal(reservationId, sealRef, txHash);
    return NextResponse.json({ sealId: sealRef, txHash, appId, explorer });
  } catch (err) {
    // Only a confirmed revert permits clearing a sent transaction.
    if (err instanceof Error && err.message === "SEAL_REVERTED" && reservationId) {
      await backendCall("mutation", "seals:clearReverted", { id: reservationId }).catch(() => {});
    }
    // Preserve uncertain/pending transaction state. Retrying must reconcile it, not lose it.
    if (err instanceof AlreadySealedOnChainError) {
      return NextResponse.json({ error: "Already sealed for this human." }, { status: 409 });
    }
    console.error("[attest] seal failed:", err);
    return NextResponse.json({ error: "Could not seal the action right now." }, { status: 502 });
  }
}
