// Client-safe airdrop config. Contains NO secrets — only the public PROOF token address (bundling a
// contract address in client code is fine), the claim amount, the chain, and small read helpers.
// The token address is empty until scripts/airdrop/01-deploy-proof.mjs deploys and fills it.
import { createPublicClient, http, formatUnits, formatEther, encodeFunctionData, parseAbi, getAddress } from "viem";
import { baseSepolia } from "viem/chains";
import state from "./proof.baseSepolia.json";

/** The appId the airdrop presents to /attest. One claim per human is keyed on this + the nullifier. */
export const AIRDROP_APP_ID = "airdrop";

/** Constant content for the single claim action, so the dedupe is one-claim-per-human-per-app. */
export const CLAIM_CONTENT = "airdrop:claim";

/** Human-facing amount, matching the on-chain CLAIM_AMOUNT (500 PROOF). */
export const CLAIM_AMOUNT_DISPLAY = 500;

export const PROOF_SYMBOL = "PROOF";
export const BASE_SEPOLIA_ID = baseSepolia.id; // 84532
export const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";

/** The deployed PROOF token address, or undefined until the deploy script fills it. */
export const PROOF_TOKEN = state.token ? getAddress(state.token) : undefined;

/** True once the airdrop token is deployed and the demo can run live. */
export function airdropConfigured(): boolean {
  return Boolean(PROOF_TOKEN);
}

const proofAbi = parseAbi([
  "function claim()",
  "function balanceOf(address) view returns (uint256)",
]);

/** Calldata for ProofToken.claim() — the transaction the user's embedded wallet sends. */
export function claimCalldata(): `0x${string}` {
  return encodeFunctionData({ abi: proofAbi, functionName: "claim" });
}

const client = createPublicClient({ chain: baseSepolia, transport: http() });

/** Read a wallet's PROOF balance as a whole-number string (e.g. "500"). Returns "0" pre-deploy. */
export async function proofBalanceOf(address: string): Promise<string> {
  if (!PROOF_TOKEN) return "0";
  const raw = await client.readContract({
    address: PROOF_TOKEN,
    abi: proofAbi,
    functionName: "balanceOf",
    args: [getAddress(address)],
  });
  // Trim any fractional dust for display — claims are whole PROOF.
  return formatUnits(raw, 18).replace(/\.0+$/, "");
}

/**
 * Read a wallet's native gas-token (ETH) balance on Base Sepolia, formatted to 4 dp for display
 * (e.g. "0.0500"). Client-safe: reads through the same public Base Sepolia client, no secrets.
 */
export async function nativeBalanceOf(address: string): Promise<string> {
  const raw = await client.getBalance({ address: getAddress(address) });
  return Number(formatEther(raw)).toFixed(4);
}

/** Wait for a claim transaction to confirm on Base Sepolia. */
export async function waitForClaim(hash: `0x${string}`): Promise<void> {
  await client.waitForTransactionReceipt({ hash });
}
