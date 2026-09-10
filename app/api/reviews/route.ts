import { backendCall } from "@/lib/backend";
import { provenAccount } from "@/lib/account-session";
import { getCredentialByPrivyUser } from "@/lib/db";
import { REVIEW_ITEMS, reviewContentHash } from "@/lib/demo/reviews";
import { POST as attest } from "@/app/api/attest/route";

export async function GET(request: Request) {
  const itemId = new URL(request.url).searchParams.get("itemId") || "";
  if (!REVIEW_ITEMS.some(item => item.id === itemId)) return Response.json({ error: "Unknown product" }, { status: 400 });
  try { return Response.json({ reviews: await backendCall("query", "reviews:list", { itemId }) }); }
  catch { return Response.json({ error: "Posts are temporarily unavailable. Please retry." }, { status: 503 }); }
}
export async function POST(request: Request) {
  const account = await provenAccount(request);
  if (!account) return Response.json({ error: "Sign in with HumanProof to post." }, { status: 401 });
  try {
    const credential = await getCredentialByPrivyUser(account);
    if (!credential) return Response.json({ error: "Create your HumanProof credential to post." }, { status: 403 });
    const input = await request.json();
    if (!input || !REVIEW_ITEMS.some(item => item.id === input.itemId) || typeof input.body !== "string" || !input.body.trim() || input.body.length > 5000 || !Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) return Response.json({ error: "Choose a product, rating and a post of up to 5,000 characters." }, { status: 400 });
    const body = input.body.trim();
    const response = await attest(new Request(request.url, { method: "POST", headers: request.headers,
      body: JSON.stringify({ appId: "reviews", contentHash: reviewContentHash(input.itemId, body, input.stars) }) }));
    const receipt = await response.json();
    if (!response.ok) return Response.json(receipt, { status: response.status });
    const review = await backendCall("mutation", "reviews:publish", { itemId: input.itemId, body, stars: input.stars, author: credential.name, sealId: receipt.sealId });
    return Response.json({ review });
  } catch { return Response.json({ error: "Could not finish publishing. Retry the same post to recover its saved proof." }, { status: 503 }); }
}
