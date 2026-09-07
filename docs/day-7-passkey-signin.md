# Day 7 — "Sign in with HumanProof": the passkey as the one-tap key (spec)

_Written before the code (AI-attribution proof). HumanProof is a reusable proof-of-human
**trust layer**. Today makes the reuse VISIBLE: verify once, then a single passkey tap signs you
back in as your verified human — no repeat World check. The two demo apps show TWO DIFFERENT
integration patterns for the same layer, with the passkey as the key at each app's auth moment._

## The story (and the honest framing)

**"Verify once, then one passkey tap into any app."** A human proves they're real once (email →
World → passkey bound → ENS name). After that, any app that plugs into HumanProof lets them back in
with a single passkey tap — the returning-user flow — and the app now knows "a real, unique human"
without ever re-running the World check or learning who they are.

**Honesty guardrail (must stay in copy + comments):** in THIS demo the two apps share one
deployment, so the passkey tap re-establishes the session instantly on the same origin. In
production an external app would *redirect to HumanProof* and get the same one-tap sign-in back.
We do **not** claim full cross-domain SSO is built — this is the demo-sized shape of "what plugging
in looks like," and the "For developers" page + this one clean reuse moment carry the pitch.

## Two patterns, one mechanism

The layer is the same; where the auth moment sits is the product decision each app makes.

- **Reviews = gated ACTION (open door).** Anyone enters and browses — an unverified visitor (a plain
  login, or none) is welcome to read. Only **posting** is gated. Clicking "Post" while unverified
  raises the "Sign in with HumanProof" prompt *at that moment*. On camera: "a bot can be here — it
  just can't post."
- **Airdrop = gated ENTRY (the wall).** The claim sits behind a "Sign in with HumanProof" door. Tap
  it → passkey → you're in → claim once (second blocked, keyed to the human).

Both auth moments run the same one-tap passkey sign-in and end in the same real, signed session.

## The mechanism (verified against installed types — @privy-io/react-auth 3.40)

Returning-user passkey login (NOT the onboarding link-passkey):

- `useLoginWithPasskey()` → `{ loginWithPasskey, state }` (confirmed in
  `node_modules/@privy-io/react-auth/dist/dts/index.d.ts`). `loginWithPasskey()` resolves on a valid
  passkey; `state.status` mirrors the link flow (`generating-challenge` / `awaiting-passkey` /
  `submitting-response`). The hook takes `PrivyEvents["login"]` callbacks; `onComplete({ user, … })`
  fires with the authenticated user. This is distinct from onboarding's `useLinkWithPasskey()`.
- After login, `usePrivy().getAccessToken()` returns Privy's access token (a signed JWT). The client
  sends it to our server; the server verifies the signature — the browser cannot forge "who I am."

### The one real problem this solves

To sign someone back in, the server must (a) know *which* Privy account this is — **proven, not
claimed** — and (b) rebuild the exact "verified human" session a World check produces. That session
is keyed on the **salted nullifier hash** (the anonymous fingerprint). But we deliberately never
store the raw nullifier, and the hash is one-way — so we cannot reconstruct the raw-nullifier
session from what the DB holds.

Options considered:

1. Store the raw nullifier keyed by account → **rejected**: breaks the never-store-raw-nullifier
   promise (a hard guardrail across Day 5–6).
2. Trust a client-supplied account id / a client "verified" flag → **rejected**: forgeable; it's
   precisely the client-only fake the brief forbids.
3. **Chosen.** At credential completion, record *which Privy account owns this credential* next to
   the salted hash we already store — nothing new about the person. On passkey login, verify Privy's
   signed token server-side, read the proven account id, look up its salted hash, and mint a fresh
   signed session that carries that hash. Everything downstream already only ever uses the hash, so
   `/attest`, the dedupe, the payout, and the gate are unchanged in behaviour.

## Changes

### 1. Session carries the fingerprint OR the raw nullifier (`lib/session.ts`)

Payload grows to `{ n?: string, h?: string, iat, exp }` — `n` = raw nullifier (onboarding, set by
`world/verify`), `h` = salted nullifier hash string (re-login, set by the new endpoint). Exactly one
is present.

- `sealSession(nullifier)` — unchanged (sets `n`).
- `sealSessionFromHash(nullifierHash)` — new; sets `h`.
- `readSession(token)` → `{ nullifier?: string, nullifierHash?: string }` or `null`. Null unless the
  signature verifies, the token is unexpired, AND at least one of `n`/`h` is a non-empty string.
  `lib/session.ts` stays dependency-free (no registrar import) — it just carries the strings.

Consumers resolve the hash the same way in both cases:

- `/api/attest`: `const nh = session.nullifierHash ? BigInt(session.nullifierHash) :
  saltedNullifierHash(session.nullifier!)`. Behaviour identical to today for onboarding sessions.
- `/api/session`: name lookup uses `session.nullifierHash ?? saltedNullifierHash(session.nullifier!)`.
- `/api/ens/claim`: needs the *raw* nullifier to build the humanity voucher → requires
  `session.nullifier`; a re-login session (`h` only) returns 401 there. That's correct: a re-login
  human already holds a credential and never re-claims a name.

### 2. DB records the account link (`convex/schema.ts`, `convex/credentials.ts`, `lib/db.ts`)

- `credentials` gains `privyUserId: v.optional(v.string())` + index `by_privyUser`. No new personal
  data — a Privy DID, opaque, that we already control the mapping for.
- `credentials.record` accepts an optional `privyUserId` and stores it.
- New query `credentials.getByPrivyUser({ privyUserId }) → { nullifierHash, name } | null`.
- `lib/db.ts`: `recordCredential(nullifierHash, name, privyUserId?)`; new
  `getCredentialByPrivyUser(privyUserId)`.

Privacy note (honest): this binds a Privy account to the anonymous fingerprint **server-side only**.
That binding is what makes one-tap reuse possible; it is never exposed, and third-party apps calling
`/attest` still never learn who the human is. The raw nullifier is still never stored.

### 3. Onboarding passes the account id (`name-step.tsx`, `home.tsx`, `ens/claim`)

The claim already sends the embedded-wallet `address`; we add `privyUserId` (the durable Privy DID,
`user.id`). `ens/claim` forwards it to `recordCredential`. Best-effort, like the existing DB mirror.

### 4. Passkey-login endpoint (`app/api/session/login/route.ts`, `lib/privy-auth.ts`)

`POST /api/session/login`, `Authorization: Bearer <privy access token>`.

- `lib/privy-auth.ts`: verify the JWT with `jose` (already installed) against Privy's public JWKS at
  `https://auth.privy.io/api/v1/apps/<appId>/jwks.json`, `issuer: "privy.io"`, `audience: <appId>`.
  `sub` = the proven Privy DID. **No new secret** — JWKS is public, the app id is already present as
  `NEXT_PUBLIC_PRIVY_APP_ID`.
- If the DB isn't provisioned → 503 (provisioning). If the token is missing/invalid → 401.
- Look up the credential by the proven DID:
  - none → 200 `{ verified: false, needsOnboarding: true }` (the wall/prompt routes them to `/`).
  - found → `sealSessionFromHash(nullifierHash)`, set the same locked-down cookie `world/verify`
    uses (httpOnly, secure in prod, sameSite=lax, 1h), return `{ verified: true, name }`.

### 5. Shared session state + one-tap sign-in action (`components/human-session.tsx` + new)

- Lift the session read into a `HumanSessionProvider` (context) so the banner and the gated surfaces
  share one state and can be refreshed after a re-login. `useHumanSession()` reads the context; add
  `refresh()`.
- A small reusable hook/component `useHumanProofSignIn()` that runs the passkey login, POSTs the
  token to `/api/session/login`, then on success `refresh()`es the session; on `needsOnboarding`
  hands back a "go to /" signal. Both demos use it at their own auth moment.

### 6. Reviews — prompt at the Post moment (`app/reviews/page.tsx`)

Open door unchanged. On submitting a review while unverified, instead of the passive "verify first"
hint, raise an inline "Sign in with HumanProof" action: credentialed → one passkey tap → the same
submit proceeds and seals; new → link to `/`. Verified users are unaffected.

### 7. Airdrop — the sign-in wall (`app/airdrop/page.tsx`)

Put a "Sign in with HumanProof" wall in front of the claim card for unverified/guest users: tap →
passkey → in (or route to `/` to onboard). Once verified, the existing claim flow (attest gate →
payout → second-claim block) is unchanged.

## Env / secrets / infra

No new secrets. `NEXT_PUBLIC_PRIVY_APP_ID` (already set) is reused server-side to build the JWKS URL
and as the token audience. The only schema change is the optional `privyUserId` column + its index.

## Scope guards

- Do NOT break the working flow: credential creation, `/attest`, the payout, the duplicate-block,
  and the verify page must all still work end-to-end after this.
- The passkey login MUST result in a real signed session the server accepts — never a client-only
  "verified" flag. The existing 401 gate must still reject a forged/absent cookie.
- No cross-domain SSO claim. Demo-sized reuse on one origin; the redirect story stays in copy only.

## Acceptance (verify end-to-end)

1. **Reviews opens for anyone** — an unverified visitor browses and reads freely.
2. Unverified user clicks **Post** → "Sign in with HumanProof" prompt appears at that moment.
3. A credentialed human taps it → passkey prompt → one tap → the review posts and **seals** (badge
   links to the verify page).
4. **Airdrop shows the sign-in wall**; a credentialed human taps in via passkey → claims once; a
   second claim is **blocked**, keyed to the human (not the wallet).
5. A user with **no credential** is routed to onboarding (`/`) from either app's auth moment.
6. A **forged/absent** session is still **401** on `/api/attest` (server-side gate intact).
7. `next build` green; the Vercel site stays public.

---

## As built (2026-09-07)

Shipped and verified; the existing flow is intact and the site stays green + public.

- **Session carries the fingerprint.** A verified session token now holds either the raw nullifier
  (onboarding) or the salted nullifier hash (a passkey re-login). Downstream gating is identical;
  the raw nullifier is still never stored.
- **Account link recorded.** `credentials` gained an optional `privyUserId` (+ `by_privyUser`
  index) written at credential completion — the server-side map from a Privy account to its
  anonymous credential. Nothing new about the person; third-party `/attest` callers still never
  learn who the human is.
- **Passkey sign-in endpoint.** `POST /api/session/login` verifies Privy's access token against
  Privy's public JWKS (proven account, not claimed), looks up the credential, and re-issues the
  same signed verification cookie a World check produces — no repeat World check. No credential →
  `needsOnboarding`; missing/forged token → 401; store not provisioned → 503. No new secret.
- **Reviews = open door.** Anyone browses; clicking Post while unverified raises "Sign in with
  HumanProof" at that moment — one passkey tap, then the same submit seals.
- **Airdrop = the wall.** The claim sits behind a "Sign in with HumanProof" door; one tap in, or a
  route to onboarding; the one-human-one-claim block is unchanged.

**Verified end-to-end (live dev server, seal + Convex provisioned locally):**
- Forged / absent / tampered cookie → **401** on `/api/attest` (the gate is not weakened).
- A valid raw-nullifier session **and** a valid salted-hash (re-login) session both get past the
  gate and **seal (200)** — the re-login shape is a real session the server accepts.
- `/api/session/login` with no token / a garbage bearer → **401** (fails closed; not forgeable).
- `/`, `/reviews`, `/airdrop`, `/developers` all render (200); no runtime errors in the dev log.
- `next build` green; all routes present including `/api/session/login`.

**Honest scope:** demo-sized reuse on one shared origin. In production an external app would
redirect to HumanProof for the same one-tap sign-in; cross-domain SSO is the pitch, not built here.
