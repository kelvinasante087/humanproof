// The seal seam. Today `sealAction` anchors the attestation on Base (native, from-scratch). It is
// deliberately the ONLY place that knows how a seal is produced, so it can later be swapped to call
// an external engine (e.g. an adapted Chronos-V endpoint) without touching the /attest route.
//
// Only anonymous fingerprints cross this boundary: the salted nullifier hash and a content hash —
// never the raw World nullifier, never the action's content. Server-only.
import {
  keccak256,
  toBytes,
  isHex,
  encodeAbiParameters,
  parseAbi,
  ContractFunctionRevertedError,
  parseAbiItem,
  parseEventLogs,
} from "viem";
import { sealPublicClient, getSealWallet, ATTESTATIONS, SEAL_EXPLORER } from "./seal/config";
import { recoverLog } from "./chain-log-recovery";

const sealAbi = parseAbi([
  "function seal(uint256 nullifierHash, bytes32 contentHash, string appId) returns (bytes32)",
  "function isSealed(bytes32) view returns (bool)",
  "error AlreadySealed()",
  "error NotWorker()",
]);

// 4-byte selector of AlreadySealed(). When a duplicate reverts at the write step (not simulate),
// viem carries the request's stripped ABI and can't decode the custom error by name — so we also
// match the raw selector as a backstop, ensuring a duplicate always maps to 409, never 502.
const ALREADY_SEALED_SELECTOR = "0x423311c0";

/** True once the attestation contract address is configured (post-deploy). */
export function sealConfigured(): boolean {
  return Boolean(ATTESTATIONS);
}

/** Normalize a caller-supplied contentHash to bytes32: a 0x+64hex value passes through untouched;
 * anything else is hashed, so any string an app sends becomes a valid on-chain content hash. */
export function toContentHash32(contentHash: string): `0x${string}` {
  if (isHex(contentHash) && contentHash.length === 66) return contentHash as `0x${string}`;
  return keccak256(toBytes(contentHash));
}

/** Canonical dedupe key for one (human, action). MUST mirror the contract's
 * keccak256(abi.encode(nullifierHash, contentHash, appId)) so the DB key and the on-chain key match. */
export function attestDedupeKey(
  nullifierHash: bigint,
  contentHash32: `0x${string}`,
  appId: string,
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "bytes32" }, { type: "string" }],
      [nullifierHash, contentHash32, appId],
    ),
  );
}

/** Thrown when this (human, action) is already sealed on-chain (the final backstop). */
export class AlreadySealedOnChainError extends Error {
  constructor() {
    super("This action is already sealed.");
    this.name = "AlreadySealedOnChainError";
  }
}

export type SealResult = { sealRef: string; txHash: string; explorer: string };

/**
 * Seal one action on Base Sepolia through HumanProofAttestations. Returns a safe seal reference
 * (the dedupe key — a hash, reveals nothing) and the transaction hash. Reverts are surfaced as
 * typed errors; a duplicate becomes AlreadySealedOnChainError.
 */
export async function sealAction(
  nullifierHash: bigint,
  contentHash32: `0x${string}`,
  appId: string,
  onSent?: (txHash: string) => Promise<void>,
  pendingTxHash?: `0x${string}`,
  recoveryStart?: bigint,
): Promise<SealResult> {
  if (!ATTESTATIONS) throw new Error("Attestations contract is not configured");
  const dedupeKey = attestDedupeKey(nullifierHash, contentHash32, appId);
  if (pendingTxHash) {
    const receipt = await sealPublicClient.waitForTransactionReceipt({ hash: pendingTxHash, timeout: 30000 });
    if (receipt.status !== "success") throw new Error("SEAL_REVERTED");
    const event = parseEventLogs({ abi: [parseAbiItem("event Sealed(bytes32 indexed dedupeKey,uint256 indexed nullifierHash,bytes32 contentHash,string appId,uint256 timestamp)")], logs: receipt.logs }).find(log => log.address.toLowerCase() === ATTESTATIONS?.toLowerCase() && log.args.dedupeKey === dedupeKey);
    if (!event) throw new Error("SEAL_RECEIPT_MISMATCH");
    return { sealRef: dedupeKey, txHash: pendingTxHash, explorer: `${SEAL_EXPLORER}/tx/${pendingTxHash}` };
  }

  // Deterministic duplicate check (read-only, no gas): a reverted duplicate tx doesn't reliably
  // throw at simulate/write and waitForTransactionReceipt resolves even for a reverted tx — so we
  // read the contract's public isSealed getter first. Already sealed ⇒ 409, before any gas.
  const already = await sealPublicClient.readContract({
    address: ATTESTATIONS,
    abi: sealAbi,
    functionName: "isSealed",
    args: [dedupeKey],
  });
  if (already) {
    // Recover a confirmed transaction when the response or database finalization was lost.
    const latest = await sealPublicClient.getBlockNumber();
    // Legacy incomplete rows lack a starting block; search one day of Base blocks for those.
    const from = recoveryStart ?? (latest > BigInt(43200) ? latest - BigInt(43200) : BigInt(0));
    const log = await recoverLog(from, latest, (fromBlock, toBlock) => sealPublicClient.getLogs({ address: ATTESTATIONS,
      event: parseAbiItem("event Sealed(bytes32 indexed dedupeKey,uint256 indexed nullifierHash,bytes32 contentHash,string appId,uint256 timestamp)"),
      args: { dedupeKey }, fromBlock, toBlock }), () => true);
    if (!log) throw new Error("Seal receipt is temporarily unavailable");
    return { sealRef: dedupeKey, txHash: log.transactionHash, explorer: `${SEAL_EXPLORER}/tx/${log.transactionHash}` };
  }

  const wallet = getSealWallet();
  try {
    const sim = await sealPublicClient.simulateContract({
      account: wallet.account,
      address: ATTESTATIONS,
      abi: sealAbi,
      functionName: "seal",
      args: [nullifierHash, contentHash32, appId],
    });
    const txHash = await wallet.writeContract(sim.request);
    await onSent?.(txHash);
    const receipt = await sealPublicClient.waitForTransactionReceipt({ hash: txHash, timeout: 30000 });
    // A reverted receipt here means it was sealed in the tiny window between the read and the write
    // (a race) — still a duplicate.
    if (receipt.status === "reverted") throw new Error("SEAL_REVERTED");
    return { sealRef: dedupeKey, txHash, explorer: `${SEAL_EXPLORER}/tx/${txHash}` };
  } catch (err) {
    if (err instanceof AlreadySealedOnChainError) throw err;
    let reverted: string | undefined;
    if (err instanceof Error) {
      // @ts-expect-error viem error walk
      err.walk?.((e: unknown) => {
        if (e instanceof ContractFunctionRevertedError) {
          reverted = e.data?.errorName ?? e.reason;
          return true;
        }
        return false;
      });
    }
    // Match the decoded error name, or fall back to the raw selector for the undecodable
    // write-revert path — either way a duplicate is a duplicate.
    const raw = err instanceof Error ? err.message : String(err);
    if (reverted === "AlreadySealed" || raw.includes(ALREADY_SEALED_SELECTOR)) {
      throw new AlreadySealedOnChainError();
    }
    throw err;
  }
}
