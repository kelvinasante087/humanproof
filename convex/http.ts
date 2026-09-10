import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, convexToJson } from "convex/values";

const queries = {
  'selfChallenges:get': internal.selfChallenges.get,
  "credentials:getByNullifier": internal.credentials.getByNullifier,
  "credentials:getByPrivyUser": internal.credentials.getByPrivyUser,
  "credentials:getAvatar": internal.credentials.getAvatar,
  "seals:getByRef": internal.seals.getByRef,
  "seals:listByNullifier": internal.seals.listByNullifier,
  "seals:getByDedupe": internal.seals.getByDedupe,
  "onboarding:get": internal.onboarding.get,
  "reviews:list": internal.reviews.list,
};
const mutations = {
  'authorization:issue': internal.authorization.issue,
  'authorization:redeem': internal.authorization.redeem,
  'selfChallenges:create': internal.selfChallenges.create,
  'selfChallenges:complete': internal.selfChallenges.complete,
  "credentials:record": internal.credentials.record,
  "credentials:linkAccount": internal.credentials.linkAccount,
  "credentials:setAvatar": internal.credentials.setAvatar,
  "seals:reserve": internal.seals.reserve,
  "seals:finalize": internal.seals.finalize,
  "seals:release": internal.seals.release,
  "seals:sent": internal.seals.sent,
  "seals:clearReverted": internal.seals.clearReverted,
  "airdrop:recordGasFunding": internal.airdrop.recordGasFunding,
  "onboarding:saveProof": internal.onboarding.saveProof,
  "onboarding:prepareName": internal.onboarding.prepareName,
  "onboarding:saveTransaction": internal.onboarding.saveTransaction,
  "reviews:publish": internal.reviews.publish,
};

export function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !header) return false;
  const expected = `Bearer ${secret}`;
  let diff = header.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (header.charCodeAt(i) || 0);
  return diff === 0;
}

const http = httpRouter();
http.route({ path: "/server", method: "POST", handler: httpAction(async (ctx, request) => {
  if (!authorized(request.headers.get("authorization"), process.env.HUMANPROOF_BACKEND_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || typeof body.name !== "string" || !body.args || typeof body.args !== "object" || Array.isArray(body.args)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    if (body.name === "health") return Response.json({ value: { ready: true } });
    let value;
    if (body.kind === "query" && Object.hasOwn(queries, body.name)) {
      value = await ctx.runQuery(queries[body.name as keyof typeof queries], body.args);
    } else if (body.kind === "mutation" && Object.hasOwn(mutations, body.name)) {
      value = await ctx.runMutation(mutations[body.name as keyof typeof mutations], body.args);
    } else return Response.json({ error: "Unknown operation" }, { status: 400 });
    return Response.json({ value: convexToJson(value) });
  } catch (error) {
    const code = error instanceof ConvexError ? error.data : { code: "STORE_UNAVAILABLE" };
    return Response.json({ error: code }, { status: 409 });
  }
}) });
export default http;
