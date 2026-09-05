# Day 5 — Seal + Attest Layer (spec)

_Written before the code (AI-attribution proof). HumanProof is a reusable proof-of-human
**trust layer**; today builds the pluggable `/attest` endpoint that any app calls, and closes
two items carried from Day 4._

## What today delivers

1. **Sign the verification session cookie** (the Day-4 security self-flag). The app's
   "you're verified" gate becomes unforgeable.
2. **Credential DB record** (the deferred piece). On credential completion we persist the
   **salted hash** of the World nullifier — never the raw value — with uniqueness enforced at
   the DB layer.
3. **`/attest`** — the external-facing endpoint. It seals `{ salt(nullifier), contentHash,
   timestamp, appId }` through the founder's **external hosted sealing engine**, one seal per
   human per action.

The sealing engine is pre-existing external infrastructure of the founder's, called as a hosted
API (like World). Disclosed in the README under the from-scratch rule.

---

## 1. Signed session cookie (Day-4 fix)

**Problem.** `app/api/world/verify` stores the raw nullifier as the cookie value, unsigned. It's
`httpOnly` (browser JS can't read it), but a hand-crafted request could present any value and pass
the app gate. The on-chain registrar still holds the real Sybil line, but the app gate must not be
forgeable on its own.

**Fix.** A signed, self-verifying token — `lib/session.ts`, Node `crypto`, no new dependency:

```
token   = base64url(payload) + "." + hex(HMAC_SHA256(secret, base64url(payload)))
payload = JSON { n: <nullifier>, iat: <seconds>, exp: <seconds> }
secret  = HUMANPROOF_SESSION_SECRET   (server-only; never NEXT_PUBLIC_)
```

- `sealSession(nullifier)` → token. Set as the cookie value; cookie flags stay as they are
  (`httpOnly`, `secure` in prod, `sameSite=lax`, `path=/`, 1h).
- `readSession(cookieValue)` → `{ nullifier }` or `null`. Recompute the HMAC, compare with
  `crypto.timingSafeEqual`, reject on bad signature, malformed token, or `exp` in the past.
- `world/verify` sets `sealSession(nullifier)`; `ens/claim` and `attest` read via `readSession`
  and return **401** on `null`.

Result: a forged or unsigned cookie no longer passes. The raw nullifier still lives only in the
signed server-side cookie and never reaches the browser.

---

## 2. Convex store + credential record

Convex mutations are transactional (serializable), so a read-by-index-then-insert inside one
mutation is an atomic check-then-insert — no duplicate races. Day-5 access is **server-only**
through `ConvexHttpClient(NEXT_PUBLIC_CONVEX_URL)` inside route handlers.

**Schema (`convex/schema.ts`).**

- `credentials`: `{ nullifierHash: string, name: string, createdAt: number }`
  — index `by_nullifier` on `nullifierHash`.
- `seals`: `{ dedupeKey: string, nullifierHash: string, appId: string, contentHash: string,
  sealRef?: string, txHash?: string, createdAt: number }`
  — index `by_dedupe` on `dedupeKey`, index `by_nullifier` on `nullifierHash`.

**Mutations.**

- `credentials.record({ nullifierHash, name })` — if a row with that `nullifierHash` exists,
  throw `AlreadyRecorded`; else insert. Called from `ens/claim` **after** a successful on-chain
  claim. (The registrar already enforces one-name-per-human on-chain; this is the matching
  app/DB-layer line the attest layer builds on.)
- `seals.reserve({ dedupeKey, nullifierHash, appId, contentHash })` — if a row with that
  `dedupeKey` exists, throw `AlreadySealed`; else insert a placeholder and return its id.
- `seals.finalize({ id, sealRef, txHash })` — attach the engine's references.
- `seals.release({ id })` — delete the placeholder if the engine call fails, so the human can retry.

`nullifierHash` = `saltedNullifierHash(nullifier)` from `lib/ens/registrar.ts` (reused), stored as
a decimal string. Only the salted hash is ever written — never the raw nullifier.

**Provisioning (founder, one-time).** `npx convex dev` (interactive login) → sets
`NEXT_PUBLIC_CONVEX_URL` locally; on Vercel, `CONVEX_DEPLOY_KEY` + a build command that runs
`convex deploy`.

---

## 3. `/attest` — the pluggable endpoint

`POST /api/attest` (runtime nodejs, force-dynamic).

**Input.** Body `{ contentHash: string, appId: string }`. The human's nullifier comes **only** from
the signed session cookie — never from the body.

**Steps.**
1. `readSession(cookie)` → nullifier, else **401**.
2. Validate `contentHash` and `appId` are non-empty strings, else **400**.
3. `nullifierHash = saltedNullifierHash(nullifier)`;
   `dedupeKey = keccak256("<nullifierHash>|<appId>|<contentHash>")`.
4. `seals.reserve(...)`. `AlreadySealed` ⇒ **409** — one seal per human per action. This enforces
   the "one action per human" rule and guards gas/spam: the duplicate is blocked *before* the
   engine is ever called.
5. Call the sealing engine (`lib/attest.ts`, written against the real pasted contract) with
   `{ nullifierHash, contentHash, timestamp, appId }`, authed by `SEALING_API_URL` +
   `SEALING_API_KEY` (server-only). It returns a seal reference / transaction.
6. Success ⇒ `seals.finalize`; engine failure ⇒ `seals.release` then **502**.

**Output.** `{ sealId, txHash, appId }` — safe references only. The raw nullifier never appears in
any response, and the engine/chain only ever see the salted hash.

**Action granularity.** `dedupeKey` is `(nullifierHash, appId, contentHash)`. This generalizes the
Day-6 demos: a reviews app puts the item id in `contentHash` (one review per item per human); an
airdrop puts a constant action id in `contentHash` (one claim per human per app).

---

## Env changes

Add to `.env.example` + `.env.local` (+ Vercel), secrets never committed, server-only never
`NEXT_PUBLIC_`: `HUMANPROOF_SESSION_SECRET`, `SEALING_API_URL`, `SEALING_API_KEY`,
`NEXT_PUBLIC_CONVEX_URL` (+ `CONVEX_DEPLOY_KEY` on Vercel).

## Scope guards (what we deliberately do NOT do today)

- No `/attest` UI — the demo apps that call it are Day 6. Today is API + verification harness.
- No new finance, no subgraph. One sealing call, one dedupe rule.
- Seal the salted hash, not the raw nullifier — a deliberate privacy choice over the literal brief.

## Acceptance (verify end-to-end)

1. Forged / unsigned cookie → **401** on `/api/attest` and `/api/ens/claim`; a correctly signed
   cookie passes.
2. Valid session + `{ contentHash, appId }` → real `sealRef` / `txHash` from the engine.
3. Same human + appId + contentHash again → **409**.
4. DB holds only the salted hash; no response body or seal payload carries the raw nullifier.
5. `next build` green; the Vercel site stays public.
