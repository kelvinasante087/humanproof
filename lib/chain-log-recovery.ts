/** Search bounded RPC ranges, newest first, without asking a provider for chain history at once. */
export async function recoverLog<T>(
  fromBlock: bigint,
  toBlock: bigint,
  fetchLogs: (from: bigint, to: bigint) => Promise<T[]>,
  matches: (log: T) => boolean,
): Promise<T | undefined> {
  const size = BigInt(1000);
  for (let end = toBlock; end >= fromBlock; end -= size) {
    const start = end - size + BigInt(1) > fromBlock ? end - size + BigInt(1) : fromBlock;
    const match = (await fetchLogs(start, end)).find(matches);
    if (match) return match;
  }
  return undefined;
}
