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
 * A session token carries exactly ONE of two things:
 *  - `n` — the raw nullifier, set at onboarding by `world/verify` after a live World check.
 *  - `h` — the salted nullifier hash (the anonymous fingerprint), set when a returning human signs
 *    back in with their passkey (Day 7). We never stored the raw nullifier, and the hash is
 *    one-way, so a re-login can only rebuild the session from the fingerprint. Everything the demo
 *    apps do with a session downstream (attest dedupe, name lookup) only ever needs the salted
 *    hash, so both token shapes gate identically. The one exception is `ens/claim`, which needs the
 *    raw nullifier to build the humanity voucher — a re-login (`h`-only) session correctly can't
 *    claim a name, and never needs to (that human already holds a credential).
 *
 * Node `crypto` only — no new dependency. This file stays dependency-free (it just carries
 * strings; callers compute the salted hash). Server-only: never import into client code, and never
 * expose HUMANPROOF_SESSION_SECRET with a NEXT_PUBLIC_ prefix.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** How long a verification session stays valid (matches the cookie maxAge). */
const SESSION_TTL_SECONDS = 60 * 60;

type SessionPayload = { n?: string; h?: string; p?: string; iat: number; exp: number };

/**
 * What a verified session resolves to. Exactly one of the two human identifiers is present, plus
 * `privyUserId` — the account this verification was issued to.
 *
 * That binding is a hard security boundary, not bookkeeping. The cookie outlives a sign-out, so
 * without it a second person signing into the same browser inherited the first person's verified
 * humanity: their name on the dashboard, and — via the claim recovery path — their credential
 * rewritten to the new account. Every consumer MUST check this matches the caller's proven account.
 */
export type Session = { nullifier?: string; nullifierHash?: string; privyUserId?: string };

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
export function sealSession(nullifier: string, privyUserId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    n: nullifier,
    p: privyUserId,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadPart = b64url(JSON.stringify(payload));
  return `${payloadPart}.${sign(payloadPart)}`;
}

/**
 * Seal a session from the salted nullifier hash (the anonymous fingerprint) instead of the raw
 * nullifier. Used when a returning human re-establishes their verified session via a passkey login
 * (Day 7): we look their credential up server-side and mint the same kind of signed cookie, without
 * the raw nullifier ever existing on this path. The gate the server enforces is identical.
 */
export function sealSessionFromHash(nullifierHash: string, privyUserId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    h: nullifierHash,
    p: privyUserId,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadPart = b64url(JSON.stringify(payload));
  return `${payloadPart}.${sign(payloadPart)}`;
}

/**
 * Verify a session token and return the nullifier it carries, or null if the token is missing,
 * malformed, wrongly signed, or expired. Never throws on bad input — an unverifiable cookie is
 * simply "not verified". Returns null (rather than throwing) when the secret is unset so a
 * misconfigured server fails closed.
 */
export function readSession(token: string | undefined | null): Session | null {
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

  if (typeof payload?.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;

  const nullifier = typeof payload?.n === "string" && payload.n ? payload.n : undefined;
  const nullifierHash = typeof payload?.h === "string" && payload.h ? payload.h : undefined;
  const privyUserId = typeof payload?.p === "string" && payload.p ? payload.p : undefined;
  // A token must carry at least one identifier, or it isn't a verified session.
  if (!nullifier && !nullifierHash) return null;
  // Unbound tokens are pre-fix cookies that could hand one person's humanity to another. Refuse
  // them outright — the holder simply re-verifies, which costs a tap and closes the hole.
  if (!privyUserId) return null;

  return { nullifier, nullifierHash, privyUserId };
}

/**
 * Resolve a session ONLY if it was issued to `expectedPrivyUserId`. This is the check every caller
 * should use: it makes a stale cookie from a previous account inert instead of authoritative.
 */
export function readSessionForAccount(
  token: string | undefined | null,
  expectedPrivyUserId: string | null | undefined,
): Session | null {
  const session = readSession(token);
  if (!session) return null;
  if (!expectedPrivyUserId || session.privyUserId !== expectedPrivyUserId) return null;
  return session;
}
