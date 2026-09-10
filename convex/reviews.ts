import { mutation, query } from "./functions";
import { v, ConvexError } from "convex/values";
export const list = query({ args: { itemId: v.string() }, handler: async (ctx, { itemId }) => {
  const rows = await ctx.db.query("reviews").withIndex("by_itemId", q => q.eq("itemId", itemId)).order("desc").take(50);
  return rows.map(({ author, stars, body, sealId }) => ({ author, stars, body, sealId }));
} });
export const publish = mutation({ args: { itemId: v.string(), author: v.string(), stars: v.number(), body: v.string(), sealId: v.string() }, handler: async (ctx, args) => {
  const seal = await ctx.db.query("seals").withIndex("by_sealRef", q => q.eq("sealRef", args.sealId)).unique();
  if (!seal || !seal.txHash || seal.appId !== "reviews") throw new ConvexError({ code: "SEALED_POST_REQUIRED" });
  const existing = await ctx.db.query("reviews").withIndex("by_sealId", q => q.eq("sealId", args.sealId)).unique();
  if (!existing) await ctx.db.insert("reviews", { ...args, createdAt: Date.now() });
  return { author: args.author, stars: args.stars, body: args.body, sealId: args.sealId };
} });
