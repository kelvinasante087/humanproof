# HumanProof — Architecture

HumanProof is a **verified-human layer**: verify once, get a reusable credential, and any app can require it to keep out bots. The demo is a reviews app where only verified humans can post. This document is the build blueprint.

## What it stands on

HumanProof consumes two engines. It does not rebuild them.

- **World ID (Selfie Check)** proves a real, unique human. No Orb required.
- **Sealing engine** anchors attestations onchain on Base, called as an external API.

Everything HumanProof builds is the glue between them: the registration flow, the attest API, and the verify page.

## Config (public identifiers, safe to commit)

- App ID: `app_b9bfc014a67b34d3d17d1184f1118007`
- RP ID: `rp_830cfa817576dbc4`
- Action: `verify-human`
- Signer (public address): `0x29612032e817Ff2617D4467D9bc76AEd50f98966`

Secrets that NEVER go in this repo (kept in a gitignored `.env`):

- the RP signer private key
- the World API key
- the sealing engine API key

## Flow 1 — Registration (mint the credential)

1. User clicks "Verify to join".
2. Frontend runs World ID through IDKit with `action: "verify-human"`. The user completes Selfie Check in the World App.
3. World returns a zero-knowledge proof and a nullifier (an anonymous unique-human id). No personal data.
4. Backend verifies the proof against World, and checks the nullifier is new, so one human equals one credential.
5. Create a device passkey (WebAuthn) bound to this human. One person, one device.
6. Assign a username and mint a pairwise DID: a different DID per app, so there is no cross-app tracking.
7. Anchor the credential through the sealing engine (nullifier, DID, timestamp). Nothing private is stored.

Result: a reusable, privacy-preserving "verified human" credential.

## Flow 2 — Attest (the pluggable API)

One endpoint any app can call.

`POST /attest`
- Input: a verified-human session (the credential) plus a hash of the action's content.
- Backend: confirm the session is a verified human, then seal an attestation: `{ nullifier, contentHash, timestamp, appId }`.
- Output: an attestation id and its onchain reference.

This single endpoint IS the pluggable layer. The review app is simply its first caller.

## Flow 3 — Verify (public)

`GET /verify/:attestationId`
- Returns proof that a verified unique human did this, at this time, from the sealed attestation.
- Reveals no identity and no raw content.
- Stretch: reads from a Graph subgraph that indexes the onchain attestations.

## Showcase — fake-proof reviews

- Posting a review requires the credential. The backend calls `/attest` with a hash of the review, and the review shows a "verified human" badge linking to `/verify`.
- One human, one review per item, enforced through the nullifier and DID.
- A bot with no World ID cannot post at all.

## Data model

- **Onchain (via the seal):** only attestations, nullifier plus content hash plus timestamp. Anonymous.
- **Off-chain (app database):** username, review text, passkey credential, DID mapping.
- **Never stored anywhere:** raw biometrics or personal identity. World returns a proof, not data.

## Tech stack (planned)

- Frontend: Next.js (React), `@worldcoin/idkit`, WebAuthn for passkeys.
- Backend: Next.js API routes, handling World proof verification, attest, and verify.
- Sealing: the engine's API on Base.
- Stretch: a Graph subgraph over the attestations, and a Chainlink function in the verify path.

## Prize targets

- **World** — Selfie Check (real human, abuse prevention).
- **The Graph** — a subgraph over the attestations.
- **Chainlink** — a function in the verify path.
- **Finalist** — a reusable primitive with a clean demo and a "works anywhere" vision.

## Rules we build by

- From scratch. All project code is written during ETHOnline (September 4 to 16).
- Public repo, frequent small commits.
- Secrets live in `.env` only, never committed.
- Demo video: 2 to 4 minutes, 720p or better, real voice, no music.
