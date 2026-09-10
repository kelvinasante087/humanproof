import { readBoundSession } from "@/lib/account-session";
import { verifiedAccountDetails } from "@/lib/privy-auth";
import { getCredentialByPrivyUser } from "@/lib/db";
import { hasDemoSession } from "@/lib/demo/session";
import { payoutAuthorization } from "@/lib/airdrop/voucher";
import { getAddress } from "viem";

export async function POST(request: Request) {
  const bound = await readBoundSession(request);
  if (!bound || !await hasDemoSession("airdrop", bound.privyUserId)) return Response.json({ error: "Sign in to Airdroppa with HumanProof." }, { status: 401 });
  try {
    const credential = await getCredentialByPrivyUser(bound.privyUserId);
    if (!credential) return Response.json({ error: "Finish your credential first." }, { status: 403 });
    const details = await verifiedAccountDetails(request, bound.privyUserId);
    const body = await request.json();
    const address = typeof body?.address === "string" ? getAddress(body.address) : null;
    if (!address || !details?.wallets.includes(address.toLowerCase())) return Response.json({ error: "Use your own Privy embedded wallet. Refresh your sign-in if needed." }, { status: 403 });
    return Response.json(await payoutAuthorization(credential.nullifierHash, address));
  } catch {
    return Response.json({ error: "The PROOF campaign is temporarily unavailable. Your allocation has not been consumed; retry shortly." }, { status: 503 });
  }
}
