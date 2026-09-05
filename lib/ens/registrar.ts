// Server-side: claim a name THROUGH the on-chain HumanProofRegistrar (the stretch path).
// The issuer signs an EIP-712 humanity voucher; the worker relays registrar.claim(). The
// contract enforces issuer-attestation + one-human-one-name. Import from server code only.
import { getAddress, keccak256, toBytes, parseAbi, ContractFunctionRevertedError } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, getWalletClient, ADDR, PARENT_NAME } from "./config";
import { normalizeSubname } from "./normalize";
import state from "./humanproof.sepolia.json";

const REGISTRAR = getAddress(state.registrar);

const claimAbi = parseAbi([
  "function claim(string label, address claimant, uint256 nullifierHash, uint256 deadline, bytes signature) returns (uint256)",
  "error NullifierAlreadyUsed()",
  "error InvalidSignature()",
  "error VoucherExpired()",
]);

const EIP712_DOMAIN = { name: "HumanProof", version: "1", chainId: 11155111, verifyingContract: REGISTRAR } as const;
const CLAIM_TYPES = {
  Claim: [
    { name: "claimant", type: "address" },
    { name: "labelHash", type: "bytes32" },
    { name: "nullifierHash", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

/** Salted, non-reversible fingerprint of the World nullifier — never the raw value. */
export function saltedNullifierHash(nullifier: string): bigint {
  const salt = process.env.HUMANPROOF_NULLIFIER_SALT;
  if (!salt) throw new Error("HUMANPROOF_NULLIFIER_SALT is not set");
  return BigInt(keccak256(toBytes(`${nullifier}::${salt}`)));
}

function getIssuer() {
  const pk = process.env.HUMANPROOF_ISSUER_PRIVATE_KEY;
  if (!pk) throw new Error("HUMANPROOF_ISSUER_PRIVATE_KEY is not set");
  return privateKeyToAccount(pk as `0x${string}`);
}

/** Thrown when the human behind this nullifier has already claimed a name (on-chain). */
export class AlreadyClaimedError extends Error {
  constructor() { super("You've already claimed your name."); this.name = "AlreadyClaimedError"; }
}
/** Thrown when the chosen label is unavailable. */
export class NameUnavailableError extends Error {
  constructor() { super("That name is taken — try another."); this.name = "NameUnavailableError"; }
}

export type ClaimResult = { name: string; label: string; nullifierHash: string; txHash: string };

/**
 * Claim <rawLabel>.humanproof.eth for `claimantAddr`, gated on-chain by a humanity voucher
 * derived from this session's World `nullifier`.
 */
export async function claimViaRegistrar(rawLabel: string, claimantAddr: string, nullifier: string): Promise<ClaimResult> {
  const claimant = getAddress(claimantAddr);
  const { name, label } = normalizeSubname(rawLabel, PARENT_NAME);
  const nullifierHash = saltedNullifierHash(nullifier);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const signature = await getIssuer().signTypedData({
    domain: EIP712_DOMAIN,
    types: CLAIM_TYPES,
    primaryType: "Claim",
    message: { claimant, labelHash: keccak256(toBytes(label)), nullifierHash, deadline },
  });

  const wallet = getWalletClient();
  try {
    const sim = await publicClient.simulateContract({
      account: wallet.account, address: REGISTRAR, abi: claimAbi, functionName: "claim",
      args: [label, claimant, nullifierHash, deadline, signature],
    });
    const txHash = await wallet.writeContract(sim.request);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { name, label, nullifierHash: nullifierHash.toString(), txHash };
  } catch (err) {
    let reverted: string | undefined;
    if (err instanceof Error) {
      // @ts-expect-error viem error walk
      err.walk?.((e: unknown) => { if (e instanceof ContractFunctionRevertedError) { reverted = e.data?.errorName ?? e.reason; return true; } return false; });
    }
    if (reverted === "NullifierAlreadyUsed") throw new AlreadyClaimedError();
    if (reverted) throw new NameUnavailableError(); // register() inside claim reverts when the label is taken
    throw err;
  }
}

/** Resolve a name through UniversalResolverV2. */
export async function resolveName(name: string): Promise<string | null> {
  return publicClient.getEnsAddress({ name, universalResolverAddress: ADDR.universalResolver });
}
