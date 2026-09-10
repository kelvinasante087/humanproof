import { expect, it, vi } from "vitest";
import { recoverLog } from "../lib/chain-log-recovery";

it("recovers an older event through bounded, contiguous RPC ranges", async () => {
  const ranges: [bigint, bigint][] = [];
  const event = { block: BigInt(1001), matching: true };
  const result = await recoverLog(BigInt(1), BigInt(3005), async (from, to) => {
    ranges.push([from, to]);
    return from <= event.block && to >= event.block ? [event] : [];
  }, log => log.matching);
  expect(result).toBe(event);
  expect(ranges).toEqual([[BigInt(2006), BigInt(3005)], [BigInt(1006), BigInt(2005)], [BigInt(6), BigInt(1005)]]);
});
it("never treats an RPC error as an absent event that permits another transaction", async () => {
  const fetchLogs = vi.fn().mockRejectedValue(new Error("RPC unavailable"));
  await expect(recoverLog(BigInt(0), BigInt(1), fetchLogs, () => true)).rejects.toThrow("RPC unavailable");
});
