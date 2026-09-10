import { describe, expect, it, vi } from "vitest";
import { canonicalContentHash, explainReceipt, parseReceiptFilters } from "../lib/receipts/model";
import { queryReceipts } from "../lib/receipts/query";

describe("public receipt evidence", () => {
  it("rejects malformed and unbounded filters", () => {
    for (const query of ["limit=101", "limit=-1", "id=broken", "contentHash=0x00", "nullifierHash=1", "app=a&app=b"]) {
      expect(() => parseReceiptFilters(new URLSearchParams(query))).toThrow();
    }
  });
  it("hashes exact UTF-8 content without silently trimming or normalizing", () => {
    expect(canonicalContentHash("hello")).toBe("0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8");
    expect(canonicalContentHash("hello ")).not.toBe(canonicalContentHash("hello"));
  });
  it("distinguishes a content match from credential and truth claims", () => {
    const receipt = { id: `0x${"1".repeat(64)}`, contentHash: canonicalContentHash("original"), appId: "reviews", timestamp: "1780000000", transactionHash: `0x${"2".repeat(64)}`, blockNumber: "40000" };
    expect(explainReceipt(receipt, "original").integrity).toBe("match");
    expect(explainReceipt(receipt, "edited").integrity).toBe("mismatch");
    expect(explainReceipt(receipt).credentialStatus).toBe("not-recorded");
  });
  it("fails explicitly when the index is missing or fails", async () => {
    await expect(queryReceipts({}, { endpoint: "" })).rejects.toThrow("unavailable");
    await expect(queryReceipts({}, { endpoint: "https://example.com", fetcher: vi.fn().mockResolvedValue(new Response("bad", { status: 502 })) })).rejects.toThrow("unavailable");
  });
  it("projects only approved evidence fields and uses Graph variables", async () => {
    const receipt = { id: `0x${"1".repeat(64)}`, contentHash: canonicalContentHash("original"), appId: "reviews", timestamp: "1780000000", transactionHash: `0x${"2".repeat(64)}`, blockNumber: "40000", nullifierHash: "SECRET" };
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: { receipts: [receipt], _meta: { block: { number: 40000 }, hasIndexingErrors: false } } }));
    const result = await queryReceipts({ app: "reviews" }, { endpoint: "https://example.com", fetcher });
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(JSON.stringify(result)).not.toContain("nullifier");
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.variables.where.appId).toBe("reviews");
    expect(body.query).not.toContain("nullifier");
  });
});
