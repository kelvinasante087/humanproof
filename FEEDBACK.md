# World Selfie Check — developer feedback (HumanProof)

Living log, written **while** building — not a last-day write-up. World asked builders to
be blunt ("don't be nice, tell us what's bad"), so this is only real friction we actually
hit, filed under the four topics World grades. Never invented.

**Track:** Selfie Check (building in the staging sandbox / Orb simulator).
**Stack:** Next.js 16, `@worldcoin/idkit` 4.2.3, `@worldcoin/idkit-server` 1.1.1.

---

## Time to integrate

- **2026-09-04, Day 2 session start** — Day 1 (Next.js + Privy) already deployed. Began the
  World integration by reading the two installed packages' TypeScript types before writing
  any code.
- **2026-09-04 — server signing works end-to-end.** With the real RP signing key in place,
  `POST /api/world/sign` returns a valid `rp_context` (correct rp_id, fresh nonce, ECDSA
  signature, 5-minute TTL). **What worked well:** the private key worked *as-is with its `0x`
  prefix* — `signRequest` accepted it without any hex-format fiddling, and the default TTL was
  sensible. Credit where due: the server-signing package is clean once you know it exists.
- **2026-09-04 — FULL PIPELINE VERIFIED END-TO-END against World's real staging API.** Signed
  in (Privy) → opened the IDKit widget (`selfieCheckLegacy`, staging) → completed a proof in the
  Worldcoin simulator → our `/api/world/verify` called World's live v4 verify endpoint (real
  ~1s round-trip) → `success: true` → nullifier extracted → session cookie set → UI showed
  "verified human." No phone, no Orb, entirely in-browser. Total time from empty repo to a
  verified nullifier on Day 2: well under a working day (server signing + verify + widget +
  a green run).
- **Caveat, stated honestly:** the simulator offers no *Selfie* credential (see section c), so
  the credential presented was **Orb**, not selfie. So what's proven is the entire integration
  and our pipeline against the real staging verify API; the Selfie-specific credential itself
  still needs the actual Selfie Check sandbox app (pending access) or a real phone in production.
- _(running; each milestone timestamped as we hit it)_

---

## (a) Selfie Check docs & integration flow

- **`selfieCheckLegacy` is a genuinely confusing name.** Nothing about the name says "this is
  Selfie Check." A newcomer reads "legacy" and assumes it's deprecated and to be avoided — the
  opposite of the truth. Had we not been told it maps to Selfie Check, we'd never have guessed.
- **It's a function, not a constant.** `selfieCheckLegacy()` returns a preset object; you pass
  `preset={selfieCheckLegacy()}`. Easy to mis-write as a bare value.
- **It returns World ID *3.0* proofs and requires `allow_legacy_proofs: true`.** The preset's
  own JSDoc says "This preset only returns World ID 3.0 proofs." So Selfie Check yields a v3
  result even though the current SDK and verify endpoint are v4. This coupling (`selfieCheck`
  ⇒ v3 ⇒ must set `allow_legacy_proofs: true`) is not obvious and isn't stated where you
  configure the widget.
- **"Selfie Check is currently in preview. Contact us if you need it enabled."** — this appears
  as a JSDoc note *inside the type*, which is where we first learned the feature is access-gated.
  That gate should be documented in the integration guide, not only discoverable by reading
  `.d.ts` files. (This is the sandbox-access form we still need approved.)
- **rp_context needs a whole second package.** You can't open the widget until a server signs an
  `rp_context`, which lives in a separate package (`@worldcoin/idkit-server`). Reasonable for
  key safety, but the "you need two packages and a server route before anything renders" step
  is a real up-front cost that should be called out loudly at the top of the guide.
- **Field-name mismatch between the two World packages.** `signRequest()` (server) returns
  `{ sig, nonce, createdAt, expiresAt }`, but the client `RpContext` type wants
  `{ signature, nonce, created_at, expires_at }`. So you must rename `sig` → `signature` and
  convert `createdAt`/`expiresAt` (camelCase) → `created_at`/`expires_at` (snake_case) by hand.
  Two first-party packages that are meant to be used together should agree on field names, or
  ship a helper that maps one to the other.

## (b) Developer Portal (navigation, search, debugging)

- _(pending — will fill when we work in the portal for the signing key and verify calls)_

## (c) Sandbox App (states, proofs, test users, errors, edge cases)

- **The simulator has no "Selfie" credential — you can't actually test Selfie Check in it.**
  The staging simulator (at `simulator.worldcoin.org`) offers Orb, Secure Document, Document,
  Device, and "Test Invalid Proof" — but nothing for a selfie. So for the Selfie Check track,
  the one credential you most need to exercise is the one the simulator can't produce. We proved
  the whole pipeline with an Orb proof instead; the actual selfie credential appears to require
  the dedicated Selfie Check sandbox app (the pending-access TestFlight/Firebase build) or a
  real phone in production. If the simulator is the sanctioned way to build Selfie Check without
  a phone, it needs a Selfie option.
- **Simulator URL differs from what the prep material implied.** The working simulator is
  `simulator.worldcoin.org` (the widget's own "Use the simulator" link points there), not the
  `simulator.orb.engineer` host we'd noted from reference material. Minor, but it cost a moment
  of "which one is real."
- **The staging simulator did NOT gate on the Selfie Check access form.** Good news worth
  recording: with only the RP signing key (no approved sandbox access), the `selfieCheckLegacy`
  preset still opened in staging and produced a verifiable proof end-to-end. So the access form
  seems to gate production / the dedicated selfie sandbox app, not staging widget testing — but
  that boundary is undocumented, and we only learned it by trying.
- **Access is gated behind a form with no visible status.** Submitting it gives no dashboard
  state, ETA, or acknowledgement, so you can't tell "not approved yet" from "misconfigured."
  A simple "access: pending / approved" indicator in the Developer Portal would remove a lot of
  uncertainty.
- _(repeat-claim / "already verified" behaviour and error codes: to test once the selfie
  credential is reachable — the simulator's Orb path let us complete, but we haven't yet
  exercised the blocked-second-claim path for a selfie nullifier)_

## (d) What was confusing, missing, broken, or hard to test

- **The nullifier field trap (the big one) — CONFIRMED FIRSTHAND, not just from docs.** We
  logged the actual staging v4 verify response (structure only, never the value). It returned:
  `{ success, action, nullifier, created_at, environment, results, message }`. The nullifier was
  present at the top level under **`nullifier`**, and **`nullifier_hash` was `undefined`**. So an
  integrator who follows the many docs that still say `nullifier_hash` gets `undefined` with no
  error — catastrophic for a proof-of-human layer: every user looks like the same human, or a
  brand-new human each time. Our defensive reader (`nullifier` → `nullifier_hash` → `results[]`
  → `responses[]`, throw if none) hit the first path. A silent rename on the single most
  important field needs a bold migration note at the top of the verify docs.
- **The verify response also carries `results[]` AND a top-level `nullifier`.** Both are present,
  which invites reading the wrong one; docs should say which is canonical.
- **Two different shapes both called "the nullifier."** The client widget result puts the
  nullifier inside `responses[].nullifier` (a v3/v4 credential item), while the verify API
  response (per docs) surfaces it at the top level as `nullifier`. Same concept, two locations,
  depending on whether you're looking at the client result or the server verify response — easy
  to conflate and trust the wrong (client-supplied) one.
- **The verify endpoint is not in the SDK, so its exact contract is guesswork until tested.**
  `@worldcoin/idkit` bundles no verify URL and no verify helper — the widget only fetches the
  proof. So the server call to `developer.world.org/api/v4/verify/{rp_id}` is built purely from
  docs/notes: we don't know for sure whether it needs an API key (we send `WORLD_API_KEY` as a
  Bearer token only if present), what the exact success/response body looks like, or how a v3
  Selfie Check proof rides a v4 endpoint. A first-party "verify this proof" helper (like the old
  `verifyCloudProof`) would remove all of this guessing. Flagging now; will confirm the real
  shape at live test and update this entry.

---
---

# ENS v2 — developer feedback (HumanProof)

Second track, same rules: real friction only, logged while building. **Track:** Best Use of
ENSv2 (Sepolia hackathon contracts). **Stack:** viem 2.56, `@adraffy/ens-normalize` 1.11.1.

## (a) Deployments / addresses

- **2026-09-05 — two conflicting ENSv2 Sepolia address sets, and the official docs page has the
  stale one. This is the big one, and it fails silently.** `docs.ens.domains/learn/deployments`
  (heading "Sepolia (ENSv2 Beta)") lists one set — VerifiableFactory `0x10dc…`, ETHRegistrar
  `0xa885…`, MockUSDC `0x768f…`. The `ensdomains/contracts-v2` repo (`main`,
  `contracts/docs/addresses/sepolia.md`) lists a **completely different** set — VerifiableFactory
  `0x118b…`, ETHRegistrar `0xa444…`, MockUSDC `0xd332…`. **Both have live bytecode on Sepolia,**
  so a "does this address have code?" check passes on either — you get no signal you're on the
  wrong one. We only caught it because we read *both* sources. A builder who trusts the official
  docs deployments page (the natural thing to do) builds their whole integration on a set the
  **canonical Universal Resolver proxy no longer points to** — so their names won't resolve, with
  no error anywhere.
- **How we disambiguated (undocumented, on-chain):** the vanity Universal Resolver proxy
  `0xeEeEEEeE…EeEe` is the one address common to both sets. We read its EIP-1967 implementation
  slot on-chain — it currently delegates to `0x6d80F2…` (`ManagedUniversalResolverProxy`), which
  exists **only in the contracts-repo set**. That's what proves the repo set is the live one and
  the docs "Beta" set is stale. A hackathon builder should not have to read a proxy's storage slot
  to find out which of two official address lists actually works.
- **Ask:** publish ONE canonical, dated address list for the hackathon set (ideally on the ENS
  prize page itself), and put a "⚠️ this page is out of date — current addresses here" banner on
  the docs deployments page. Right now the two disagree with no cross-reference.
- **Minor, same root cause:** the docs "Beta" set doesn't even list a `UserRegistryImpl`, which
  you need as the `implementation` arg to `VerifiableFactory.deployProxy` to stand up a subname
  registry. So the published-docs path can't do subnames from its own list; the repo set can.

## (b) Resolution / Universal Resolver

- **2026-09-05 — the "canonical" vanity Universal Resolver proxy reverts; you must call
  `UniversalResolverV2` directly.** After registering the parent and issuing a subname (every link
  verified on-chain: root→eth→parent→subname, resolver set, `addr` record stored), resolving
  `alice.humanproof.eth` through the vanity `UpgradableUniversalResolverProxy` (`0xeEeE…EeEe`) — the
  address every client treats as THE resolver — reverts `ResolverNotFound` (`0x77209fe8`). So does
  `ManagedUniversalResolverProxy`. The plain `UniversalResolverV2` (`0x85edf8…`) resolves the exact
  same name correctly (its `findResolver` returns our resolver; `getEnsAddress` returns the
  address). So on this deployment the upgradable/managed proxy layer isn't wired to a working
  resolver while the underlying V2 contract is. viem's `getEnsAddress` returns `null` (not an error)
  against the broken proxy — a silent dead-end for anyone on defaults. **Ask:** point the vanity
  proxy at the working V2 resolver, or tell hackathon builders to resolve through `UniversalResolverV2`.
- **Positive, credit where due:** once you call the right resolver, ENS v2 resolution "just works."
  Our own PermissionedResolver proxy implemented ENSIP-10 `resolve()` and `supportsInterface`
  correctly with no extra work, and the whole root→TLD→parent→subname walk resolved in a single call.
