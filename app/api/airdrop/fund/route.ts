import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseEther, getAddress } from "viem";
import { WORLD_SESSION_COOKIE } from "@/app/api/world/verify/route";
import { readSession } from "@/lib/session";
import { sealPublicClient, getSealWallet } from "@/lib/seal/config";

/**
 * POST /api/airdrop/fund — gas fallback for the airdrop claim.
 *
 * The airdrop's payout is the user's OWN Privy embedded wallet sending claim(), with gas sponsored
 * by Privy. If Privy isn't sponsoring gas on Base Sepolia for this app, an empty embedded wallet
 * can't pay for the claim — so this tops it up with a sliver of Base Sepolia ETH from the treasury,
 * and the user still signs the claim themselves (it stays a real Privy wallet action).
 *
 * Guards: requires a verified-human session (not an open faucet), and only tops up a wallet that is
 * actually low, so repeat calls don't drain the treasury.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GAS_TOPUP = parseEther("0.0003"); // enough for one claim() on Base Sepolia
const LOW_WATER = parseEther("0.0002"); // only fund wallets below this

export async function POST(request: Request) {
  const jar = await cookies();
  const session = readSession(jar.get(WORLD_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Verify you're human first." }, { status: 401 });
  }

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

  try {
    const balance = await sealPublicClient.getBalance({ address });
    if (balance >= LOW_WATER) {
      return NextResponse.json({ funded: false, reason: "already has gas" });
    }
    const wallet = getSealWallet();
    const txHash = await wallet.sendTransaction({ to: address, value: GAS_TOPUP });
    await sealPublicClient.waitForTransactionReceipt({ hash: txHash });
    return NextResponse.json({ funded: true, txHash });
  } catch (err) {
    console.error("[airdrop/fund] top-up failed:", err);
    return NextResponse.json({ error: "Could not top up gas right now." }, { status: 502 });
  }
}
