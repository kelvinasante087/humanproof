/**
 * Signed verification session — makes the app's "you're verified" gate unforgeable.
 *
 * The World-verification cookie holds the human's nullifier for the session. Until Day 5 it stored
 * the raw value unsigned: httpOnly kept it out of browser JS, but a hand-crafted request could
 * present any value and pass the app gate. The on-chain registrar still held the real Sybil line,
 * but the app gate itself must not be forgeable. So we wrap the nullifier in an HMAC-signed token:
 * a crafted or unsigned cookie no longer verifies, and the raw nullifier still never leaves the
 * server (the token is only ever set as an httpOnly cookie).
 *
 * Node `crypto` only — no new dependency. Server-only: never import into client code, and never
 * expose HUMANPROOF_SESSION_SECRET with a NEXT_PUBLIC_ prefix.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** How long a verification session stays valid (matches the cookie maxAge). */
const SESSION_TTL_SECONDS = 60 * 60;

type SessionPayload = { n: string; iat: number; exp: number };

function secret(): string {
  const s = process.env.HUMANPROOF_SESSION_SECRET;
  if (!s) throw new Error("HUMANPROOF_SESSION_SECRET is not set");
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadPart: string): string {
  return createHmac("sha256", secret()).update(payloadPart).digest("hex");
}

/**
 * Seal a nullifier into a signed session token: `base64url(payload).hmacHex`.
 * Throws if the signing secret is missing (a server misconfiguration we want loud).
 */
export function sealSession(nullifier: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { n: nullifier, iat: now, exp: now + SESSION_TTL_SECONDS };
  const payloadPart = b64url(JSON.stringify(payload));
  return `${payloadPart}.${sign(payloadPart)}`;
}

/**
 * Verify a session token and return the nullifier it carries, or null if the token is missing,
 * malformed, wrongly signed, or expired. Never throws on bad input — an unverifiable cookie is
 * simply "not verified". Returns null (rather than throwing) when the secret is unset so a
 * misconfigured server fails closed.
 */
export function readSession(token: string | undefined | null): { nullifier: string } | null {
  if (!token || !process.env.HUMANPROOF_SESSION_SECRET) return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadPart = token.slice(0, dot);
  const sigHex = token.slice(dot + 1);

  // Constant-time signature check. Length mismatch fails before timingSafeEqual (which throws on
  // unequal-length buffers).
  const expected = sign(payloadPart);
  const got = Buffer.from(sigHex, "hex");
  const want = Buffer.from(expected, "hex");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload?.n !== "string" || !payload.n) return null;
  if (typeof payload?.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;

  return { nullifier: payload.n };
}
