/**
 * Shared config + pure helpers for the World Selfie Check integration.
 *
 * HumanProof is a proof-of-human TRUST LAYER — this file is where a World
 * verification becomes a nullifier (an anonymous, per-person fingerprint) that
 * the rest of the layer keys off. Nothing here holds a secret: only the public
 * NEXT_PUBLIC_* config and pure functions live here, so it is safe to import
 * from both server routes and client components. The server-only signing key
 * (WORLD_RP_SIGNING_KEY) and rp_id (WORLD_RP_ID) are read inside the route
 * handlers, never here.
 */

export type WorldEnv = "staging" | "production" | "sandbox";

/**
 * The environment we are pinned to. Day 2 is staging-only (the World Orb
 * simulator — no phone/Orb). We default to "staging" so a missing env var can
 * never silently promote us to production.
 */
export const WORLD_ENV: WorldEnv =
  (process.env.NEXT_PUBLIC_WORLD_ENV as WorldEnv) || "staging";

export const WORLD_APP_ID = (process.env.NEXT_PUBLIC_WORLD_APP_ID ||
  "") as `app_${string}`;

export const WORLD_ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION || "verify-human";

/** True only when the public config needed to open the widget is present. */
export const worldConfigured = Boolean(WORLD_APP_ID);

/**
 * Environment pinning (server-side guard #1).
 *
 * A proof carries the environment it was produced in. We reject anything that
 * doesn't match the environment this server is pinned to, so a simulator proof
 * can never be replayed against production (or vice versa). Throws loudly on a
 * mismatch — the caller turns that into a failed verification.
 */
export function assertPinnedEnvironment(claimed: unknown): void {
  if (claimed !== WORLD_ENV) {
    throw new WorldEnvironmentMismatchError(WORLD_ENV, claimed);
  }
}

export class WorldEnvironmentMismatchError extends Error {
  constructor(expected: string, got: unknown) {
    super(
      `World environment mismatch: expected "${expected}", got "${String(got)}".`,
    );
    this.name = "WorldEnvironmentMismatchError";
  }
}

export class NullifierNotFoundError extends Error {
  constructor() {
    super(
      "No nullifier found in the World verify response. " +
        "This is the #1 silent bug: v4 returns `nullifier`, older docs say " +
        "`nullifier_hash`, and some responses nest it under results[]/responses[]. " +
        "Failing loud instead of granting on undefined.",
    );
    this.name = "NullifierNotFoundError";
  }
}

/**
 * Defensively read the nullifier out of the World verify API response.
 *
 * THE TRAP (documented in FEEDBACK.md): World's v4 verify returns the field as
 * `nullifier`, but most docs still say `nullifier_hash`. Reading the wrong key
 * returns `undefined` *silently* — which would make every user look like the
 * same human, or a fresh human every time. On top of that, the Selfie Check
 * preset (`selfieCheckLegacy`) returns World ID 3.0 proofs, whose credential
 * items may surface the nullifier inside a `results[]` / `responses[]` array.
 *
 * We ONLY read from the server's verify response (never a value the browser
 * sent), and we check every known location before giving up. If none is
 * present we throw — we never grant on undefined.
 */
export function extractNullifier(body: unknown): string {
  const b = (body ?? {}) as Record<string, unknown>;

  const pick = (v: unknown): string | undefined =>
    typeof v === "string" && v.length > 0 ? v : undefined;

  // 1. Top-level, v4 name then legacy name.
  const top = pick(b.nullifier) ?? pick(b.nullifier_hash);
  if (top) return top;

  // 2. results[] — a success entry's nullifier (some verify responses nest here).
  const results = Array.isArray(b.results) ? b.results : [];
  for (const item of results) {
    const r = (item ?? {}) as Record<string, unknown>;
    if (r.success === false) continue;
    const n = pick(r.nullifier) ?? pick(r.nullifier_hash);
    if (n) return n;
  }

  // 3. responses[] — credential items (v3/v4 proof responses) carry `nullifier`.
  const responses = Array.isArray(b.responses) ? b.responses : [];
  for (const item of responses) {
    const r = (item ?? {}) as Record<string, unknown>;
    const n = pick(r.nullifier);
    if (n) return n;
  }

  throw new NullifierNotFoundError();
}
