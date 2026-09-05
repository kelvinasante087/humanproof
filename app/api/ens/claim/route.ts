import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WORLD_SESSION_COOKIE } from "@/app/api/world/verify/route";
import { issueSubname, resolveName } from "@/lib/ens/issue";
import { InvalidEnsNameError } from "@/lib/ens/normalize";

/**
 * Claim <name>.humanproof.eth for the signed-in user.
 *
 * App-level gate (the FLOOR's claim condition): the request is only honoured if the
 * World-verification session cookie is present — i.e. this session proved a unique human.
 * The name step is only shown in the UI after the passkey step, so the flow is
 * verify -> passkey -> claim. (The STRETCH moves this gate on-chain into a registrar.)
 *
 * On success the name is issued to the user's wallet and confirmed to resolve on Sepolia.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const jar = await cookies();
  const verified = jar.get(WORLD_SESSION_COOKIE)?.value;
  if (!verified) {
    return NextResponse.json({ error: "Verify you're human first." }, { status: 401 });
  }

  let body: { label?: unknown; address?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body was not valid JSON." }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label : "";
  const address = typeof body.address === "string" ? body.address : "";
  if (!label.trim()) return NextResponse.json({ error: "Please choose a name." }, { status: 400 });
  if (!address) return NextResponse.json({ error: "Missing wallet address." }, { status: 400 });

  try {
    const { name, alreadyIssued } = await issueSubname(label, address);
    const resolved = await resolveName(name);
    return NextResponse.json({ name, resolved, alreadyIssued });
  } catch (err) {
    if (err instanceof InvalidEnsNameError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[ens/claim] issuance failed:", err);
    return NextResponse.json({ error: "Couldn't claim that name — it may be taken." }, { status: 409 });
  }
}
