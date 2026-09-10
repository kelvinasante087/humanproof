import "server-only";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toBytes, parseAbi, encodeFunctionData, zeroAddress } from "viem";
import { PROOF_TOKEN, BASE_SEPOLIA_ID } from "./config";
import { sealPublicClient } from "../seal/config";
import { VERIFICATION_ENV as WORLD_ENV } from "../verification/config";

export const claimAbi = parseAbi([
  "function issuer() view returns (address)",
  "function claimedBy(bytes32) view returns (address)",
  "function claim(bytes32 claimId,uint256 deadline,bytes signature)",
]);
export const claimTypes = { Claim: [
  { name: "claimId", type: "bytes32" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" },
] } as const;
export function claimIdFor(fingerprint: string) {
  return keccak256(toBytes(`airdroppa:proof:1:${WORLD_ENV}:${fingerprint}`));
}
export async function payoutAuthorization(fingerprint: string, recipient: `0x${string}`) {
  if (!PROOF_TOKEN) throw new Error("Payout not configured");
  const key = process.env.HUMANPROOF_ISSUER_PRIVATE_KEY;
  if (!key) throw new Error("Issuer not configured");
  const account = privateKeyToAccount(key as `0x${string}`);
  const issuer = await sealPublicClient.readContract({ address: PROOF_TOKEN, abi: claimAbi, functionName: "issuer" });
  if (issuer.toLowerCase() !== account.address.toLowerCase()) throw new Error("Payout contract is not authorized");
  const claimId = claimIdFor(fingerprint);
  const claimedBy = await sealPublicClient.readContract({ address: PROOF_TOKEN, abi: claimAbi, functionName: "claimedBy", args: [claimId] });
  if (claimedBy !== zeroAddress) return { claimed: true as const, claimId };
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const signature = await account.signTypedData({
    domain: { name: "Airdroppa", version: "1", chainId: BASE_SEPOLIA_ID, verifyingContract: PROOF_TOKEN },
    types: claimTypes, primaryType: "Claim", message: { claimId, recipient, deadline },
  });
  return { claimed: false as const, claimId, to: PROOF_TOKEN, chainId: BASE_SEPOLIA_ID,
    data: encodeFunctionData({ abi: claimAbi, functionName: "claim", args: [claimId, deadline, signature] }) };
}
