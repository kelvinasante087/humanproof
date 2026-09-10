# HumanProof

A reusable verified-human credential, demonstrated through **Proofit** and **Airdroppa**. Built for ETHOnline 2026.

Live demo: https://humanproof-flame.vercel.app

## What the demos show

- **Proofit (`/reviews`)** is a public reviews community. Anyone can read and search, including bots and AI agents. Email sign-in is available without creating a HumanProof credential. Only posting requires a completed HumanProof credential. People may post more than once about the same product; exact request retries reuse their proof receipt.
- **Airdroppa (`/airdrop`)** is a fictional crypto company distributing **500 PROOF** per verified human on Base Sepolia. HumanProof gates entry. The payout contract requires an issuer-signed authorization bound to the recipient, campaign, chain and expiry. It enforces one payout per anonymous human claim identifier. A cancelled transaction does not consume the allocation. A confirmed payout can recover its separately recorded proof without paying again.
- **Public verification (`/verify/:id`)** shows an action receipt and a Base Sepolia explorer link. The chain proves that HumanProof's authorized server recorded the attestation; humanity verification takes place off-chain. `/verify` adds public Graph-backed discovery and local content-integrity checking.

## Onboarding and recovery

Before signup, a readiness check tests account-service connectivity, the active World verification path and its sandbox entitlement, the authenticated credential store and ENS name issuance prerequisites. This is a snapshot, not a guarantee of future availability, passkey device support or a successful phone proof.

After humanity verification, HumanProof stores a salted fingerprint, its provider/environment and the owning Privy account as unfinished setup. It does not store the raw nullifier or proof. Closing the page or signing out does not erase this progress. After signing back in, the server restores the next step. A name reservation and transaction reference make interrupted issuance recoverable. Completion is reported only after a successful on-chain receipt and durable credential record.

**World ID is the active provider.** The live demo is pinned to World staging so the browser simulator can complete the flow. The approved World Sandbox app, RP signing key and verification API configuration remain preserved for the phone path. Self remains implemented as a parked fallback. The iPhone 8 Sandbox app previously crashed during its TestFlight launch, so Sandbox remains a separate acceptance path. See `docs/self-integration.md` and `docs/self-support-2026-09-10.md` for the preserved configurations and evidence.

## Architecture

Next.js 16 / React / TypeScript; Privy email login, embedded wallets and passkeys; World IDKit Selfie Check; parked Self SDK; Convex; The Graph receipt index; ENS v2 on Sepolia; native `HumanProofAttestations` and `ProofToken` contracts on Base Sepolia.

All database functions are internal to Convex. Next.js calls an allowlisted HTTP bridge authenticated with a server-only secret. Browser requests require a verified Privy access token and an account-bound HumanProof cookie. Privy-signed identity tokens prove passkey and embedded-wallet ownership at credential issuance and payout authorization. Account recovery cannot overwrite an existing credential owner.

Current deployment addresses are maintained in `lib/ens/humanproof.sepolia.json`, `lib/seal/attestations.baseSepolia.json` and `lib/airdrop/proof.baseSepolia.json`. The signed-claim payout contract was deployed September 10 on Base Sepolia; the older unrestricted token is recorded as legacy. A real credential-bound payout remains an acceptance test.

## Privacy and boundaries

HumanProof does not receive or store face images, government documents or raw World nullifiers. It does retain account identifiers, salted fingerprints, chosen ENS names, avatars, unfinished setup and action receipts. Privy handles email authentication and wallet accounts.

On-chain attestations expose a consistent salted fingerprint across the demo apps. They are **pseudonymous and linkable**, not pairwise identities or guaranteed anonymity. Public ENS names, wallets, reviews and transaction data can also be linked. Passkeys may sync between a user's devices; this is not a one-physical-device guarantee.

Both demos run on one origin. An initial registered-client identity connection now uses consent, exact redirect allowlists, S256 PKCE and short-lived single-use codes. See `docs/external-identity.md` and its separate-server example. No clients are enabled by default; real-credential end-to-end validation is pending. This is not a full OAuth/OIDC service or external action SDK. Continuous revocation and refresh are not implemented.

## Local setup

1. `npm ci`. Copy `.env.example` to `.env.local` and configure the listed services. Keep all real secrets out of Git.
2. In Privy, enable passkeys, allow the app origin, and enable **User management > Authentication > Advanced > Return user data in an identity token**. Then set `PRIVY_IDENTITY_TOKENS_ENABLED=true` in the app environment.
3. Set a random 32+ character `HUMANPROOF_BACKEND_SECRET` in both Next.js and the matching Convex deployment. The app's `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_URL` and optional `CONVEX_HTTP_URL` must refer to that same deployment.
4. Deploy the Convex functions using `npx convex dev --once` for development or `npx convex deploy` for production. Production and development are separate; updating one does not update the other.
5. Configure Self as described in `docs/self-integration.md`, ENS/seal keys and the Graph index in `docs/receipt-network.md`. `/api/onboarding/readiness` reports safe readiness information.
6. `npm run dev`. Run `npm test`, `npm run lint` and `npm run build` before release.

## Submission and attribution

Application and contract work was developed during ETHOnline. Sealing is native code in this repository, not the previously considered external Chronos-V service. Historical plans remain in `docs/`; `docs/day-8-reliability.md` records the current reliability work.

Code and review used Claude Code and OpenAI Codex, directed by Kelvin Asante. Design work used Google Stitch, Claude and Figma. The actual phone proof, live partner configuration and final deployment must be verified separately from local tests. PROOF is a testnet demonstration token with no monetary value.
