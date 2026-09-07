import { NextResponse } from "next/server";
import { parseEther, getAddress } from "viem";
import { readBoundSession } from "@/lib/account-session";
import { saltedNullifierHash } from "@/lib/ens/registrar";
import { sealPublicClient, getSealWallet } from "@/lib/seal/config";
import { dbConfigured, recordGasFunding, GasFundingBlockedError } from "@/lib/db";

/**
 * POST /api/airdrop/fund — gas fallback for the airdrop claim.
 *
 * The airdrop's payout is the user's OWN Privy embedded wallet sending claim(), with gas sponsored
 * by Privy. If Privy isn't sponsoring gas on Base Sepolia for this app, an empty embedded wallet
 * can't pay for the claim — so this tops it up with a sliver of Base Sepolia ETH from the treasury,
 * and the user still signs the claim themselves (it stays a real Privy wallet action).
 *
 * Guards: requires a verified-human session (not an open faucet); only tops up a wallet that is
 * actually low; and — the treasury line — records one funded wallet per human so a single session
 * can't spray gas to an endless stream of fresh addresses, with a daily cap as a circuit breaker.
 * The per-human record is atomic in Convex; if that guard can't run, the faucet fails CLOSED (the
 * claim still works when Privy sponsors gas) rather than reopening the drain.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GAS_TOPUP = parseEther("0.0003"); // enough for one claim() on Base Sepolia
const LOW_WATER = parseEther("0.0002"); // only fund wallets below this

export async function POST(request: Request) {
  const bound = await readBoundSession(request);
  if (!bound) {
    return NextResponse.json({ error: "Verify you're human first." }, { status: 401 });
  }
  const { session } = bound;

  let body: { address?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body was not valid JSON." }, { status: 400 });
  }
  const raw = typeof body.address === "string" ? body.address : "";
  let address: `0x${string}`;
  try {
    address = getAddress(raw);
  } catch {
    return NextResponse.json({ error: "Missing or invalid wallet address." }, { status: 400 });
  }

  // Don't spend a human's one-funding allowance on a wallet that already has gas.
  let balance: bigint;
  try {
    balance = await sealPublicClient.getBalance({ address });
  } catch (err) {
    console.error("[airdrop/fund] balance check failed:", err);
    return NextResponse.json({ error: "Could not check the wallet right now." }, { status: 502 });
  }
  if (balance >= LOW_WATER) {
    return NextResponse.json({ funded: false, reason: "already has gas" });
  }

  // Treasury guard: bind this human (from the signed session, never the browser) to one funded
  // wallet, with a daily cap. Fails CLOSED if the guard can't run, so the faucet can't be abused.
  const humanKey = session.nullifierHash ?? saltedNullifierHash(session.nullifier!).toString();
  if (dbConfigured()) {
    try {
      await recordGasFunding(humanKey, address);
    } catch (err) {
      if (err instanceof GasFundingBlockedError) {
        const reason =
          err.reason === "wallet_mismatch"
            ? "This human has already been funded for a different wallet."
            : err.reason === "funding_limit"
              ? "This wallet has already been topped up. Try the claim — it has gas."
              : "The gas faucet has hit its daily limit. Try again later.";
        return NextResponse.json({ error: reason }, { status: 429 });
      }
      // Guard unavailable (e.g. not deployed): fail closed rather than open the faucet.
      console.error("[airdrop/fund] treasury guard unavailable:", err);
      return NextResponse.json(
        { error: "The gas faucet is temporarily unavailable." },
        { status: 503 },
      );
    }
  }

  try {
    const wallet = getSealWallet();
    const txHash = await wallet.sendTransaction({ to: address, value: GAS_TOPUP });
    await sealPublicClient.waitForTransactionReceipt({ hash: txHash });
    return NextResponse.json({ funded: true, txHash });
  } catch (err) {
    console.error("[airdrop/fund] top-up failed:", err);
    return NextResponse.json({ error: "Could not top up gas right now." }, { status: 502 });
  }
}
