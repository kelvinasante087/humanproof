> Current update (September 10): World ID staging is the active demo provider so the browser simulator can complete onboarding; approved Sandbox configuration remains preserved for the phone path. Self remains implemented as a parked fallback. The Graph receipt network is implemented locally. See docs/self-integration.md and docs/receipt-network.md; older provider notes below are historical.

# HumanProof architecture — current implementation

The current behavior and privacy limits are documented in [README.md](README.md). Earlier day specifications record historical decisions; they do not override this document.

## Credential lifecycle

Readiness check → Privy account → World verification → durable unfinished setup → linked passkey → ENS name reservation → signed name transaction → confirmed receipt → durable credential.

The unfinished record stores only the salted fingerprint, Privy account identifier, World environment, verification time and optional pending name/wallet/transaction. It survives closing the tab and signing out. A fresh account cannot adopt another account's pending or completed credential. Transient failures show retryable states; a successful transaction is reconciled instead of blindly retried. Recovery never fabricates a name from an unresolved ENS lookup.

Browser API requests use a Privy bearer token plus an HMAC-signed, account-bound session cookie. New cookies contain the salted fingerprint, not the raw nullifier. Session/credential World environments must match the running application. Before creating a credential or authorizing a payout, the server verifies Privy's signed identity token for the linked wallet/passkey.

## Backend boundary

Convex database functions use internal query/mutation registration. An allowlisted HTTP action accepts a server-only bearer secret. The secret is not a browser credential and is never included in function arguments or logs. Next.js derives user identifiers from verified authentication; it does not accept claimed account ownership from request bodies.

Credential uniqueness is enforced transactionally in Convex and by the ENS registrar's humanity-voucher ledger. All account-link operations reject ownership reassignment.

## Two placements of the same credential

Proofit: public read/search and ordinary email accounts; only posting is gated. Multiple posts per product are allowed. Each different post has a different content hash; retrying the same action is idempotent.

Airdroppa: HumanProof gates entry to a 500 PROOF campaign. Issuer-signed EIP-712 vouchers bind a claim identifier to a wallet, chain, token deployment and deadline. The contract marks a claim consumed only when the mint succeeds. Proof sealing follows the payout and can retry independently.

## Evidence and limits

ENS runs on Sepolia; payouts and action attestations run on Base Sepolia. The public verification page reads the stored receipt and links its on-chain transaction. The trusted server attests that it verified World; contracts do not verify a World ZK proof themselves.

Staging simulator reachability is not Selfie Sandbox access. Sandbox access was approved on September 8, but the first end-to-end verification is still pending. Partner checks are readiness snapshots and cannot guarantee the next request.

On-chain human fingerprints are shared across these demo apps and are linkable. Pairwise identities, strict device binding and cross-domain SSO are not built. No face/ID/proof/raw nullifier is stored by HumanProof, but pseudonymous account, name and transaction records are retained.
