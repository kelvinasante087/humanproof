> Historical planning/reference document. Current implementation and limits are recorded in humanproof/README.md and humanproof/docs/day-8-reliability.md (September 8). Earlier one-review limits, pairwise-privacy promises, external sealing plans and assumed Selfie access are superseded.

# Day 6 — Showcase apps + verify page + "For Developers" (spec)

_Written before the code (AI-attribution proof). HumanProof is a reusable proof-of-human
**trust layer**. Today builds four things that all ride on the one public `/attest` layer:
two thin demo apps (reviews, airdrop), a public verify page, and a developer page. The demos
are DEMOS of the layer — never the product. Lead with the layer everywhere._

## Positioning (keep in every screen)

HumanProof is the trust layer. Reviews and Airdrop are two example apps that plug into it to
show the same idea from two angles:

- **Reviews gates the ACTION** — anyone can be present, only a verified human can *post*. Frame:
  **abuse prevention** (fake reviews).
- **Airdrop gates a PAYOUT** — one real human, one claim; a second claim is blocked. Frame:
  **Sybil / abuse prevention** (bot farms draining airdrops).

The block in both is keyed on the **human** (the salted nullifier, via `/attest`'s dedupe),
never on the wallet or the browser — that is the whole point, and the demo must make it visible.

## Prerequisites (founder, one-time — today's seal-dependent parts are dark until both are on)

Verified in the repo at spec time, **both are currently OFF**:

1. **Seal contract not deployed** — `lib/seal/attestations.baseSepolia.json.attestations` is `""`,
   so `/attest` returns 503. The seal/deployer wallet `0x2cAC…dA75` has **0 balance on Base
   Sepolia**. Founder: fund it from a Base Sepolia faucet, then
   `node --env-file=.env.local scripts/seal/01-deploy-attestations.mjs`.
2. **Convex not provisioned** — `NEXT_PUBLIC_CONVEX_URL` is empty, so the dedupe/reserve is
   skipped and the verify page has nothing to read. Founder: `npx convex dev` (interactive login),
   set `NEXT_PUBLIC_CONVEX_URL` locally + `CONVEX_DEPLOY_KEY` on Vercel.

Everything below that is **not** seal-dependent (routing, seed content, the shared-session
recognition, the developer page, all UI) is built now and works immediately; the seal badge,
the airdrop block, and the verify page's live data light up the moment 1 & 2 are on.

---

## Routes (all in this one codebase, all public — no login wall)

- `/` — existing credential onboarding (unchanged today).
- `/reviews` — Reviews demo app.
- `/airdrop` — Airdrop demo app.
- `/verify/[id]` — public verify page for one sealed action.
- `/developers` — the one call an outside app makes.
- A small top nav so a viewer (and the camera) can move between them.

## 1. Shared-session recognition — "Sign in with HumanProof" (demo-sized)

**Goal (the reuse moment):** after acting in one app, the other recognizes the SAME human
WITHOUT re-verifying. On camera: "notice I didn't verify again — the credential carried over."

**Mechanism (already have the spine):** the World-verification session lives in the signed,
httpOnly cookie `hp_world_nullifier` (see `lib/session.ts`), set once at `/`. Because every route
is the same origin, that cookie is present everywhere. We add a read-only endpoint so any page can
ask "is this browser a verified human this session?" without touching the raw nullifier.

- **`GET /api/session`** (nodejs, force-dynamic): `readSession(cookie)` → `{ verified: boolean }`.
  Never returns the nullifier or anything derived from it. That is the entire reuse signal.
- A small client hook `useHumanSession()` calls it and drives a shared **"Signed in with
  HumanProof ✓"** banner shown at the top of BOTH demo apps when verified, with a link back to `/`
  to verify when not. The banner is the visible proof of reuse.

Scope guard: this is the DEMO-sized reuse (shared session on one origin), not a real cross-domain
OAuth provider. The developer page + this one clean reuse moment carry the "Sign in with
HumanProof" story; we do not build a cross-site login system (that's the pitch, not a 9-day build).

## 2. Reviews app (`/reviews`) — gate the action

Ruthlessly thin. No real feed, ratings engine, or profiles.

**Items (from `05_demo_content`):** Aurora Wireless Headphones (primary, on-camera), Kente Roast,
Nomad 30L Backpack. Static data in a local module.

**Seed reviews (static, shown already-posted with the verified badge):** on Aurora Headphones —
`ama.humanproof.eth` ★★★★★ and `kofi.humanproof.eth` ★★★★☆, exact copy from `05_demo_content`.
These are display content (they render the badge styling but are not live seals — honest: they're
labelled as seeded sample data in a code comment, and read as prior verified reviews on screen).

**Posting (the live action):**
- Anyone can read. The "Write a review" box is always visible.
- On submit, if not a verified human this session → inline prompt "Only a verified human can post"
  with a link to `/` to verify. This is the block-vs-allow moment for an unverified user.
- If verified → `POST /api/attest { appId: "reviews", contentHash }` where `contentHash` encodes
  the item + review body (one review per item per human). On 200 → the new review renders with a
  **"Verified human ✓" badge** that links to `/verify/<sealId>`. On 409 → "You've already reviewed
  this item as this human." On 503 (seal not live yet) → a clear "sealing is being provisioned"
  state, so the page stays green pre-prerequisite.
- The live on-camera review is `kelvin.humanproof.eth` ★★★★★ with the `05_demo_content` copy.

## 3. Public verify page (`/verify/[id]`) — the money shot

Reads **live from the seals**, in plain English, then the trustless receipt underneath.

- **`GET /api/verify/[id]`** (nodejs): looks up the seal by its reference via a new Convex query
  `seals:getByRef(sealRef)`. Returns only safe fields: `{ appId, contentHash, txHash, createdAt,
  explorer }`. Never the nullifier, never who. 404 if unknown.
- The page states, plainly: **"A real, unique human did this — at this time. No name, no identity,
  nothing about who they are."** Shows the app it happened in and the time.
- **Underneath, the trustless receipt:** a link to the Base Sepolia attest transaction on the block
  explorer (`sepolia.basescan.org/tx/<txHash>`) — "don't take our word for it; here's the
  on-chain proof."
- Pre-Convex, if the id can't be read yet, the page explains it's provisioning rather than erroring.

New Convex query (mirrors the existing mutation style in `convex/seals.ts`, using a `queryGeneric`
builder added to `convex/functions.ts`):
`seals.getByRef({ sealRef })` → the row's safe fields (by a `by_sealRef` index we add to schema).

## 4. For Developers page (`/developers`) — sells the moat, kept small

The ONE call an outside app makes to plug in. Not an SDK.

- A short "how it works" line: your app calls `/attest` with a content hash of the action + your
  app id; the verified human comes from their HumanProof session; you get back a seal reference and
  an on-chain tx. You never see who the person is.
- One code block — the actual request:
  ```
  await fetch("https://<humanproof>/api/attest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",              // the human's HumanProof session
    body: JSON.stringify({ appId: "your-app", contentHash: "<hash of the action>" }),
  });
  // → { sealId, txHash, appId, explorer }   (never anything about who the human is)
  ```
- The response shape and the privacy guarantee, stated once. That's it.

---

## Env / schema / infra changes today

- **Schema:** add index `by_sealRef` on `seals.sealRef` (for the verify lookup). No new fields; the
  `sealRef` column already exists.
- **`convex/functions.ts`:** export a typed `query` builder (`queryGeneric`) alongside `mutation`.
- **Privy chain:** the payout and seals are on Base **Sepolia**, but `app/providers.tsx` currently
  pins `defaultChain: base` (mainnet). For a real testnet balance change in the embedded wallet the
  provider must include `baseSepolia`. Change deferred to the airdrop step and verified against the
  installed Privy types first.
- No new secrets. `/attest`, `/api/session`, `/api/verify/[id]` are all server routes reusing
  existing config.

## The airdrop payout — flagged, NOT specced blind

The airdrop is a **real Privy financial flow** (the "Best financial flow" qualifier): testnet value
must actually transfer into the verified human's Privy embedded wallet via a Privy wallet action,
with the balance change visible on screen; one claim per human (keyed on the nullifier via
`/attest`), second blocked. This has one genuine design decision — **how the value moves and where
gas comes from** (user's embedded wallet signs a claim vs. a funded treasury transfers in; PROOF as
an ERC-20 on Base Sepolia). I will settle it only AFTER reading Privy's installed types + docs for
the exact wallet-action call — never faking the API surface — and bring the founder the chosen
approach with its trade-off before building. Sequenced last so the seal-independent work ships first.

## Scope guards (protecting the day)

- Mock apps stay ruthlessly thin: block-vs-allow, the payout, the reuse, the verify — nothing more.
- One build, one deploy: all routes in this codebase.
- Never claim a stubbed integration as real. The seed reviews are labelled sample data; the live
  review, the seal, the payout, and the verify page are the real, explainable parts.
- Site stays green + public throughout; every seal-dependent surface degrades cleanly until the two
  prerequisites are on.

## Acceptance (end-to-end, once prerequisites are on)

1. A verified human posts a review → badge shows, action sealed; an unverified visitor is blocked
   from posting.
2. Claim the airdrop once → real testnet payout lands in the Privy wallet (balance changes on
   screen); a second claim is blocked, keyed on the human not the wallet.
3. After acting in one app, the other shows "Signed in with HumanProof ✓" without re-verifying.
4. The verify page shows the plain-English claim + a working on-chain tx link, read from the seal.
5. `next build` green; Vercel site public.

---

## As built (2026-09-06)

All six pieces shipped and building green; every seal-dependent surface degrades cleanly, so the
site stays public before the prerequisites are on.

- **Shared-session recognition.** `GET /api/session` returns `{ verified, name }` from the signed
  World cookie — a boolean plus the claimed ENS name (best-effort, only once Convex is live), never
  the nullifier. `useHumanSession()` + `HumanSessionBanner` render "Signed in with HumanProof as
  <name>" on both demo apps — the visible reuse moment.
- **Reviews (`/reviews`).** Three items (Aurora primary), seed reviews labelled sample data, a live
  post that calls `/attest` (appId `reviews`) and shows a "Verified human" badge linking to the
  verify page. 401 / 409 / 503 states handled.
- **Verify page (`/verify/[id]`).** Server component reads the seal via `seals.getByRef` (new
  `by_sealRef` index), states the plain-English claim, and links the Base Sepolia tx as the receipt.
- **For Developers (`/developers`).** The single `/attest` request, the response, the privacy line.
- **Airdrop (`/airdrop`).** PROOF is a thin ERC-20 (`contracts/ProofToken.sol`, compiles clean,
  1670 bytes) with an open `claim()`; the one-human-one-claim gate is `/attest`'s nullifier dedupe.
  The claim is the user's own Privy embedded wallet sending `claim()` on Base Sepolia via
  `useSendTransaction({ sponsor: true })` (verified against the installed Privy 3.40 types), with a
  treasury gas top-up fallback (`/api/airdrop/fund`) if sponsorship isn't covering the testnet.
  Balance is read live; a second claim / a fresh wallet is refused. Privy now defaults to Base
  Sepolia. Design choice recorded: user-signed + sponsored is the truest "Privy financial flow";
  the token is intentionally thin (scope discipline) with issuer-gated mint noted as the production
  hardening, disclosed in the contract.

**To finish end-to-end (founder, one-time):**
1. Fund the deploy wallet `0x2cAC…dA75` on Base Sepolia (faucet) — this one top-up unblocks BOTH
   the attest contract and the PROOF token.
2. `node --env-file=.env.local scripts/seal/01-deploy-attestations.mjs` (seal) and
   `node --env-file=.env.local scripts/airdrop/01-deploy-proof.mjs` (PROOF token).
3. `npx convex dev` (interactive login) → set `NEXT_PUBLIC_CONVEX_URL` locally + `CONVEX_DEPLOY_KEY`
   on Vercel; redeploy so the deployed contract addresses + Convex URL ship.
4. In the Privy dashboard, enable gas sponsorship for Base Sepolia (optional — the top-up fallback
   covers it otherwise).
5. Record the ugly backup demo video once the above is live.
