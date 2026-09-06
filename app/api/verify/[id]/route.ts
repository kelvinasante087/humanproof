import { NextResponse } from "next/server";
import { dbConfigured, getSealByRef } from "@/lib/db";
import { SEAL_EXPLORER } from "@/lib/seal/config";

/**
 * GET /api/verify/[id] — public, read-only lookup for the verify page.
 *
 * Given a seal reference, returns the seal's SAFE fields only: the app it happened in, the action's
 * content hash, the on-chain transaction, and when. Never the nullifier, never anything about who
 * the human is — that's the whole promise. Anyone can call this; it reveals a real, unique human
 * did something, and nothing else.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/verify/[id]">) {
  const { id } = await ctx.params;
  const sealRef = id?.trim();
  if (!sealRef) return NextResponse.json({ error: "Missing seal reference." }, { status: 400 });

  // Before Convex is provisioned there's nothing to read yet — say so plainly rather than 404.
  if (!dbConfigured()) {
    return NextResponse.json(
      { status: "provisioning", error: "Verification store is being provisioned." },
      { status: 503 },
    );
  }

  const seal = await getSealByRef(sealRef);
  if (!seal) return NextResponse.json({ error: "No sealed action found for that reference." }, { status: 404 });

  return NextResponse.json({
    appId: seal.appId,
    contentHash: seal.contentHash,
    txHash: seal.txHash,
    createdAt: seal.createdAt,
    explorer: seal.txHash ? `${SEAL_EXPLORER}/tx/${seal.txHash}` : null,
  });
}
