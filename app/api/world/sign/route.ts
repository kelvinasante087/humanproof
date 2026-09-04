import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit-server";
import { WORLD_ACTION } from "@/lib/world";

/**
 * Signs an `rp_context` so the client can open the World Selfie Check widget.
 *
 * Why this is a server route: the RP signing key must NEVER reach the browser.
 * The client asks this route for a freshly signed context, and only the derived
 * signature/nonce/timestamps cross the wire — never the key itself.
 *
 * We sign with the action bound in (a "uniqueness" proof), so World returns one
 * stable nullifier per human per action — the anchor our trust layer keys off.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const signingKeyHex = process.env.WORLD_RP_SIGNING_KEY;
  const rpId = process.env.WORLD_RP_ID;

  if (!signingKeyHex || !rpId) {
    // Fail loud, not silent — a missing key must never look like a working flow.
    return NextResponse.json(
      {
        error:
          "World signing is not configured. Set WORLD_RP_SIGNING_KEY and WORLD_RP_ID.",
      },
      { status: 500 },
    );
  }

  try {
    const signed = signRequest({ signingKeyHex, action: WORLD_ACTION });

    // Field-name mismatch between the two World packages (logged in FEEDBACK.md):
    //   signRequest -> { sig, nonce, createdAt, expiresAt }   (camelCase, `sig`)
    //   RpContext   -> { signature, nonce, created_at, expires_at }  (snake_case)
    const rp_context = {
      rp_id: rpId,
      nonce: signed.nonce,
      created_at: signed.createdAt,
      expires_at: signed.expiresAt,
      signature: signed.sig,
    };

    return NextResponse.json({ rp_context });
  } catch (err) {
    console.error("[world/sign] failed to sign rp_context:", err);
    return NextResponse.json(
      { error: "Failed to sign the World request context." },
      { status: 500 },
    );
  }
}
