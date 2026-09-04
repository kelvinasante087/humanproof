# Day 2 — World Selfie Check → verified nullifier (spec)

_Written before building, in plan mode, and committed as our AI-attribution proof.
This is the spec the Day-2 code implements._

## Where this sits in the product

HumanProof is a reusable **proof-of-human trust layer** — not a reviews app, not an
airdrop app. Those are demos that ride on the layer. This step is the layer's first real
input: a person proves once that they are a **real, unique human**, and we come away with a
**nullifier** — an anonymous, per-person fingerprint. Everything downstream (device-bound
credential, ENS name, sealed on-chain actions) keys off that nullifier. It says "a unique
human", never "who".

## The flow

1. **Server signs `rp_context`.** Before the widget can open, a server route uses
   `@worldcoin/idkit-server` `signRequest` with our **server-only** RP signing key and the
   configured action. The signing key never reaches the browser — that's the whole reason
   this is a server route.
2. **Client opens the IDKit widget** with the `selfieCheckLegacy` preset. `selfieCheckLegacy`
   is a naming artifact: it **is** Selfie Check (our track). Desktop→phone hand-off (QR /
   deep-link) is handled by IDKit — no code from us.
3. **Widget returns a proof** to the client, which POSTs it to our own verify route.
4. **Server verifies** by POSTing the proof — forwarded **as-is**, plus `action` and
   `environment` — to `https://developer.world.org/api/v4/verify/{rp_id}`.
5. **Server trusts ONLY the nullifier World returns.** Never a value sent by the client.
6. From here it's ours: nullifier → (Day 3) passkey → (Day 4) ENS name → sealed actions.

Client detail: `handleVerify` → `onSuccess` are split. Throwing inside `handleVerify`
aborts to `onError` and never fires success — so nothing is granted unless our backend
actually confirmed the proof.

## Endpoints & exact field names

- **Verify (v4):** `POST https://developer.world.org/api/v4/verify/{rp_id}`. Forward IDKit's
  response as-is; do not rename fields. `{rp_id}` = `WORLD_RP_ID`.
- **Success:** response `success === true`.
- **The nullifier-field trap (the #1 silent bug):** v4 returns **`nullifier`**, but most
  docs still say **`nullifier_hash`**. Reading the wrong key returns `undefined` *silently* —
  which would make every user look like the same human, or a fresh human every time. So read
  defensively: prefer `nullifier`, fall back to `nullifier_hash`, and also check inside
  `results[]` for a `success:true` entry's nullifier. **Fail loud** if none is present —
  never grant on `undefined`.

## Environment pinning (staging)

- `staging` = the **World Orb simulator** — no Orb, no phone camera. The whole flow runs in
  a browser during development. `production` = real Selfie Check on a phone.
- Same app_id / rp_id / signing key in both; flipping is one env var (`NEXT_PUBLIC_WORLD_ENV`).
- **Pin the environment on the server, twice:** reject a proof whose claimed environment ≠
  `staging`, and re-check the environment the verifier echoes back. Otherwise a simulator
  proof could pass once we're pointed at production.

## Session, not database (yet)

The nullifier is held in **session only** on Day 2 — a server-side cookie that is
`httpOnly` + `secure` + `sameSite` (locked down, since the nullifier is the sensitive bit and
privacy is the whole product). It is **not** written to any database. That happens at the ENS
step (Day 4), where the flow
completes; a drop-off before then leaves no trace and the user can cleanly restart. When we
do persist, it will be a **salted, truncated hash** of the nullifier (privacy promise), never
the raw value.

## Config

Public (safe in repo / `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_WORLD_APP_ID = app_b9bfc014a67b34d3d17d1184f1118007`
- `NEXT_PUBLIC_WORLD_ACTION = verify-human`
- `NEXT_PUBLIC_WORLD_ENV = staging`
- `WORLD_RP_ID = rp_830cfa817576dbc4`

Secret (`.env.local` + Vercel only, never committed, never `NEXT_PUBLIC_`):
- `WORLD_RP_SIGNING_KEY` — the RP signing key.

Note: `app_id` (config) and `rp_id` (verify) are two identifiers for what feels like one
thing; we store both, separately, on purpose.

## Packages

- `@worldcoin/idkit` — React widget (client).
- `@worldcoin/idkit-server` — `signRequest` helper (server, for rp_context).

The exact export names / signatures are verified against the installed package types before
writing code — the notes we planned from are learned facts, not verified source.

## Fallback

If our app isn't approved for the Selfie Check preset yet (separate sandbox-access form),
the widget will reject `selfieCheckLegacy`. Fallback: standard World ID via IDKit, **same
routes and same nullifier handling**, and log the switch in `FEEDBACK.md`. The build stays
real either way.

## Feedback log

`FEEDBACK.md` is a living, dated friction log (25% of the World grade). It is structured
around **World's four graded topics**, not a freeform log, because those four are the rubric:
(a) Selfie Check docs & integration flow, (b) Developer Portal navigation / search /
debugging, (c) Sandbox App states / proofs / test users / errors, (d) what was confusing,
missing, broken, or hard to test — plus a time-to-integrate line. Every snag — the nullifier
rename, the `selfieCheckLegacy` naming, rp_context needing a second package, any docs gap —
is filed under the right heading the moment we hit it, not written up at the end.
