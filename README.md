# HumanProof

**The verified-human layer.** Prove that a real, unique human did something, sealed onchain, without storing any personal data.

Built for [ETHOnline 2026](https://ethglobal.com/events/ethonline2026).

## The idea

The internet is drowning in bots, fake accounts, and AI-generated everything. HumanProof is a drop-in layer any app can plug into to guarantee an action was taken by a real, unique human, and to prove it later, without ever exposing who they are.

- **Verify once.** A user proves they are a real, unique human with World ID Selfie Check, binds a device passkey, and gets a reusable credential (a pairwise DID and a username).
- **Attest anything.** Any app calls one endpoint to attest that a verified human performed an action. The attestation is sealed onchain: a salted fingerprint of the human, a content hash of the action, the calling app's id, and a timestamp — never identity, never the content.
- **Verify by anyone.** A public page confirms that a verified unique human did this, at this time, with no identity and no raw content revealed.

## Showcase: fake-proof reviews

The demo app is a reviews product where only verified real humans can post. Every review carries proof it came from a genuine, unique person, so bots and review farms cannot get in, and one human cannot post twice.

## How it works

HumanProof is one primitive any app can call: *"is this a verified, unique human doing this thing — and give me sealed, checkable proof."* Everything below serves that single call.

- **Prove the human — World ID (Selfie Check).** A person proves once that they're a real, unique human. No Orb required. HumanProof reads only the World *nullifier* (the unique-per-person signal) — never a face or a document.
- **Bind the device — passkey (WebAuthn).** A passkey ties that verified human to their device, so signing back in later is one tap, not another verification.
- **Seal the action — natively, on Base Sepolia.** When a verified human acts, the attestation is sealed onchain through `HumanProofAttestations` — a contract written and deployed from scratch during ETHOnline (Base Sepolia, [`0xc4C4Be84f403bA4a15e0161Ff97Ebfff1bEBb71e`](https://sepolia.basescan.org/address/0xc4C4Be84f403bA4a15e0161Ff97Ebfff1bEBb71e)). Each seal records four things and nothing else: a **salted, one-way fingerprint** of the World nullifier, a **content hash** of the action, the **calling app's id**, and a **timestamp**. The raw nullifier, the person's identity, and the action's content never touch the chain. Sealing is worker-gated (only HumanProof's server can write), and a duplicate `(human, action)` reverts `AlreadySealed` — one seal per human per action.
- **Check it — anyone.** A public verify page states, in plain English, that a real, unique human did this, at this time, in this app — with the Base Sepolia transaction linked underneath as the trustless receipt. No name, no identity, nothing about who.

An outside app plugs in with a single request to `/attest` (a content hash of the action + its app id); the verified human comes from their HumanProof session, and the app gets back a seal reference and an on-chain transaction — never anything about who the human is.

## Privacy

Nothing personal is stored. World returns a zero-knowledge proof, not data. Onchain we keep only anonymous attestations. Verify and discard, by design.

Signing in uses an email — a private app account (via Privy) — which is never part of the public proof. A public verification reveals only an anonymous fingerprint, a timestamp, and a content hash. No name, no email, no identity.

## Status

In progress. Building at ETHOnline 2026 (September 4 to 16).

## Disclosure

All application code and smart contracts in this repository were written from scratch during ETHOnline 2026 (September 4 to 16). Sealing is **native**: an attestation contract (`HumanProofAttestations`) we wrote and deployed ourselves on Base Sepolia anchors every proof — it is **not** an external or pre-existing service. (An earlier plan considered calling a separate hosted sealing engine; on inspection it required live device-sensor forensics and couldn't seal a lightweight action attestation, so we built the native contract instead. It remains a possible production backend — noted here as related work, not a dependency.) The plans and specifications that preceded each build are committed in `docs/` as the build record.

## Design

The brand and every screen were designed from scratch during ETHOnline 2026, from a locked direction — a deep-navy credential card, a teal verification mark, and a single indigo action — and finished in Figma. Design assets live in `/design`.

Figma file: _add link_

---

Kelvin Asante · Accra, Ghana
