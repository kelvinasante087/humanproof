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

- _(pending — needs sandbox access approved; access is gated behind a form, and the only
  in-code hint of that gate is a JSDoc "contact us to enable" note — see (a))_

## (d) What was confusing, missing, broken, or hard to test

- **The nullifier field trap (the big one).** v4 returns the field as `nullifier`, but most docs
  still say `nullifier_hash`. Reading the wrong key returns `undefined` *silently* — which for a
  proof-of-human layer is catastrophic: every user would look like the same human, or a brand
  new human each time, with no error. We wrote a defensive reader that checks `nullifier`, then
  `nullifier_hash`, then `results[]`/`responses[]`, and throws if none is present. A silent
  rename on the single most important field is exactly the kind of thing that needs a migration
  note in bold.
- **Two different shapes both called "the nullifier."** The client widget result puts the
  nullifier inside `responses[].nullifier` (a v3/v4 credential item), while the verify API
  response (per docs) surfaces it at the top level as `nullifier`. Same concept, two locations,
  depending on whether you're looking at the client result or the server verify response — easy
  to conflate and trust the wrong (client-supplied) one.
