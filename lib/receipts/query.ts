import "server-only";
import { HASH, type Receipt, type ReceiptFilters } from "./model";

export class ReceiptIndexUnavailable extends Error {
  constructor() { super("HumanProof receipt index is unavailable. Please try again later."); }
}
const QUERY = `query HumanProofReceipts($first: Int!, $where: Receipt_filter!) {
  receipts(first: $first, where: $where, orderBy: timestamp, orderDirection: desc) {
    id contentHash appId timestamp transactionHash blockNumber
  }
  _meta { block { number } hasIndexingErrors }
}`;
function projectReceipt(value: unknown): Receipt {
  if (!value || typeof value !== "object") throw new ReceiptIndexUnavailable();
  const row = value as Record<string, unknown>;
  for (const field of ["id", "contentHash", "transactionHash"]) if (typeof row[field] !== "string" || !HASH.test(row[field])) throw new ReceiptIndexUnavailable();
  for (const field of ["timestamp", "blockNumber"]) if (typeof row[field] !== "string" || !/^\d{1,20}$/.test(row[field])) throw new ReceiptIndexUnavailable();
  if (typeof row.appId !== "string" || row.appId.length > 256) throw new ReceiptIndexUnavailable();
  return { id: row.id as string, contentHash: row.contentHash as string, appId: row.appId, timestamp: row.timestamp as string, transactionHash: row.transactionHash as string, blockNumber: row.blockNumber as string };
}
export async function queryReceipts(filters: ReceiptFilters, options: { endpoint?: string; fetcher?: typeof fetch } = {}) {
  const endpoint = options.endpoint ?? process.env.HUMANPROOF_GRAPH_URL;
  if (!endpoint) throw new ReceiptIndexUnavailable();
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") throw new ReceiptIndexUnavailable();
    const where: Record<string, string> = {};
    if (filters.id) where.id = filters.id;
    if (filters.app) where.appId = filters.app;
    if (filters.contentHash) where.contentHash = filters.contentHash;
    const response = await (options.fetcher ?? fetch)(url.toString(), {
      method: "POST", headers: { "Content-Type": "application/json", ...(process.env.HUMANPROOF_GRAPH_API_KEY ? { Authorization: `Bearer ${process.env.HUMANPROOF_GRAPH_API_KEY}` } : {}) },
      body: JSON.stringify({ query: QUERY, variables: { first: Math.min(100, Math.max(1, filters.limit ?? 20)), where } }),
      signal: AbortSignal.timeout(8000), cache: "no-store", redirect: "error",
    });
    if (!response.ok) throw new ReceiptIndexUnavailable();
    const payload = await response.json();
    if (payload.errors?.length || !Array.isArray(payload.data?.receipts) || payload.data.receipts.length > 100 || payload.data?._meta?.hasIndexingErrors !== false || !Number.isSafeInteger(payload.data?._meta?.block?.number)) throw new ReceiptIndexUnavailable();
    return { receipts: payload.data.receipts.map(projectReceipt) as Receipt[], indexedBlock: payload.data._meta.block.number as number, network: "base-sepolia" as const };
  } catch { throw new ReceiptIndexUnavailable(); }
}
