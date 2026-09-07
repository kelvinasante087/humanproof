import { mutation } from "./functions";
import { v, ConvexError } from "convex/values";

/**
 * The airdrop gas faucet's treasury guard. Called by `/api/airdrop/fund` BEFORE any treasury ETH is
 * sent, with the human's salted nullifier (derived server-side from the signed session — never from
 * the browser) and the wallet they want topped up.
 *
 * Because a Convex mutation is a serializable transaction, the read-by-index-then-insert below is an
 * atomic check-then-record. It enforces:
 *  - one wallet per human — a second, DIFFERENT address for the same human is rejected, so a single
 *    verified session can't fund an endless stream of fresh wallets;
 *  - a small retry budget for that one wallet (idempotent re-tries of a failed top-up);
 *  - a daily cap on how many distinct humans the treasury will fund (a circuit breaker).
 *
 * On any block it throws a ConvexError with a `code` the route maps to a 429.
 */
const MAX_TOPUPS_PER_HUMAN = 3; // idempotent retries of the same wallet
const DAILY_HUMAN_CAP = 200; // distinct humans funded per UTC day (treasury circuit breaker)

export const recordGasFunding = mutation({
  args: { nullifierHash: v.string(), address: v.string() },
  handler: async (ctx, { nullifierHash, address }) => {
    const now = Date.now();
    const day = Math.floor(now / 86_400_000);
    const wallet = address.toLowerCase();

    const existing = await ctx.db
      .query("gasFundings")
      .withIndex("by_nullifier", (q) => q.eq("nullifierHash", nullifierHash))
      .unique();

    if (existing) {
      if (existing.address !== wallet) {
        // This human already funded a different wallet — the anti-spray line.
        throw new ConvexError({ code: "WALLET_MISMATCH" });
      }
      if (existing.count >= MAX_TOPUPS_PER_HUMAN) {
        throw new ConvexError({ code: "FUNDING_LIMIT" });
      }
      await ctx.db.patch(existing._id, { count: existing.count + 1, updatedAt: now });
      return { allowed: true };
    }

    // A new human: enforce the daily treasury cap before recording.
    const today = await ctx.db
      .query("gasFundings")
      .withIndex("by_day", (q) => q.eq("day", day))
      .collect();
    if (today.length >= DAILY_HUMAN_CAP) {
      throw new ConvexError({ code: "TREASURY_CAP" });
    }

    await ctx.db.insert("gasFundings", {
      nullifierHash,
      address: wallet,
      count: 1,
      day,
      createdAt: now,
      updatedAt: now,
    });
    return { allowed: true };
  },
});
