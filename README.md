# HumanProof

**The verified-human layer.** Prove that a real, unique human did something, sealed onchain, without storing any personal data.

Built for [ETHOnline 2026](https://ethglobal.com/events/ethonline2026).

## The idea

The internet is drowning in bots, fake accounts, and AI-generated everything. HumanProof is a drop-in layer any app can plug into to guarantee an action was taken by a real, unique human, and to prove it later, without ever exposing who they are.

- **Verify once.** A user proves they are a real, unique human with World ID Selfie Check, binds a device passkey, and gets a reusable credential (a pairwise DID and a username).
- **Attest anything.** Any app calls one endpoint to attest that a verified human performed an action. The attestation is sealed onchain: a nullifier, a content hash, and a timestamp.
- **Verify by anyone.** A public page confirms that a verified unique human did this, at this time, with no identity and no raw content revealed.

## Showcase: fake-proof reviews

The demo app is a reviews product where only verified real humans can post. Every review carries proof it came from a genuine, unique person, so bots and review farms cannot get in, and one human cannot post twice.

## How it works

- **World ID (Selfie Check)** proves the real, unique human. No Orb required.
- **Device passkey (WebAuthn)** binds the human to their device, so it is one person on one device.
- **Pairwise DID** gives privacy: a different identifier per app, so there is no cross-app tracking.
- **Sealing engine** anchors each attestation onchain on Base. Only proofs go onchain, never identity or content.

## Privacy

Nothing personal is stored. World returns a zero-knowledge proof, not data. Onchain we keep only anonymous attestations. Verify and discard, by design.

## Status

In progress. Building at ETHOnline 2026 (September 4 to 16).

## Disclosure

HumanProof calls my existing sealing engine as an external hosted API, the same way it calls World or any other third-party service. All application code in this repository is written from scratch during ETHOnline 2026 (September 4 to 16).

---

Kelvin Asante · Accra, Ghana
