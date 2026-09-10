import { keccak256, toBytes } from "viem";

export type Receipt = { id: string; contentHash: string; appId: string; timestamp: string; transactionHash: string; blockNumber: string };
export type ReceiptFilters = { id?: string; app?: string; contentHash?: string; limit?: number };
export const HASH = /^0x[0-9a-fA-F]{64}$/;
export function parseReceiptFilters(params: URLSearchParams): ReceiptFilters {
  for (const key of params.keys()) {
    if (!["id", "app", "contentHash", "limit"].includes(key) || params.getAll(key).length !== 1) throw new Error("Unsupported or repeated filter.");
  }
  const result: ReceiptFilters = {};
  for (const key of ["id", "contentHash"] as const) {
    const value = params.get(key);
    if (value !== null) {
      if (!HASH.test(value)) throw new Error(`${key} must be a 32-byte hex value.`);
      result[key] = value.toLowerCase();
    }
  }
  const app = params.get("app");
  if (app !== null) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(app)) throw new Error("Invalid application ID.");
    result.app = app;
  }
  const limit = params.get("limit");
  if (limit !== null) {
    if (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100) throw new Error("Limit must be between 1 and 100.");
    result.limit = Number(limit);
  }
  return result;
}

/** Exact UTF-8 payload, keccak256, no whitespace or Unicode normalization. JSON actions
 * must supply their original serialized payload, not just one field such as review text. */
export function canonicalContentHash(content: string): `0x${string}` { return keccak256(toBytes(content)); }

export function explainReceipt(receipt: Receipt, content?: string) {
  const integrity = content === undefined ? "not-checked" : canonicalContentHash(content) === receipt.contentHash.toLowerCase() ? "match" : "mismatch";
  return {
    integrity,
    credentialStatus: "not-recorded" as const,
    explanation: `HumanProof's authorized sealing contract recorded an action for ${receipt.appId} in Base Sepolia block ${receipt.blockNumber}. ${integrity === "match" ? "The supplied payload matches the recorded content hash." : integrity === "mismatch" ? "The supplied payload does not match the recorded content hash." : "No payload was supplied for comparison."} This event does not record verification provider, credential expiry or revocation, or establish that the content is true or human-written.`,
    evidenceUrl: `https://sepolia.basescan.org/tx/${receipt.transactionHash}`,
  };
}
