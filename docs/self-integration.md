# HumanProof verification: World active, Self parked

The current demo deployment uses World ID staging for the humanity step so the browser simulator can complete onboarding. The provider is selected by `NEXT_PUBLIC_HUMANPROOF_PROVIDER=world`; Self routes and configuration remain in the repository as a deliberate fallback and are inactive while this value is `world`.

The account → humanity proof → passkey → name flow stays in place. World Sandbox uses the World ID Selfie Check preset and stores only a salted, provider-scoped fingerprint and account-bound progress. Self requests no name, document number, date of birth or nationality disclosures when it is deliberately restored.

## Restoring Self deliberately

Set `NEXT_PUBLIC_HUMANPROOF_PROVIDER=self`, `NEXT_PUBLIC_SELF_ENV=mainnet`, `SELF_SCOPE=humanproof`, and `SELF_ENDPOINT=https://<your-public-host>/api/self/verify`. The exact endpoint and scope are used both by the QR and backend verifier. A localhost URL cannot receive Self relayer callbacks. HTTPS hosting must be publicly reachable without deployment protection. Keep the same Convex deployment and server secrets on the callback host and onboarding host.

The development Convex challenge schema/functions are deployed. The local application implementation is tested; a public callback, real phone proof and credential issuance are still required before calling Self live. No Self endpoint is silently guessed from request headers. Missing configuration blocks new onboarding safely.

Readiness checks callback identity/configuration, Self's Celo RPC, Privy, saved progress and ENS prerequisites. It is a snapshot: it cannot guarantee a phone app, NFC document, relayer or later transaction succeeds. Failed verification creates no credential. Existing authenticated progress can resume.

For test documents use `NEXT_PUBLIC_SELF_ENV=testnet` on both hosts and rebuild. Test and mainnet proofs, sessions and credentials are isolated. Do not present test-document verification as real humanity verification.

## Verification boundary

An authenticated start creates a random UUID challenge with a 15-minute lifetime. The relayer callback cryptographically verifies scope, endpoint, proof and user-context binding through SelfBackendVerifier. Only its verified UUID selects the account challenge. Completion and saved proof ownership are transactional. Another account cannot reuse the same fingerprint; retries of the same completed challenge are idempotent within its lifetime. A new request invalidates previous requests for that account. Browser callbacks never authorize completion. No raw proof/disclosure is persisted or logged by these routes.

Self's uniqueness domain is not a universal person registry: different documents or providers may not share a nullifier. HumanProof cannot claim global cross-provider deduplication. Do not enable simultaneous interchangeable providers or migrate old World credentials into Self without an explicit linking policy.

## World staging and Sandbox configuration

Keep the World app ID, action, RP ID and server-only signing/API keys together. Set `NEXT_PUBLIC_HUMANPROOF_PROVIDER=world` and `NEXT_PUBLIC_WORLD_ENV=staging` for the browser simulator. Set `NEXT_PUBLIC_WORLD_ENV=sandbox` only for the approved Sandbox phone app. The environment is pinned server-side and records are isolated between staging, Sandbox and production. Self routes stop accepting proofs while World is active. Existing Self data remains saved but is not treated as a World credential. The reported iPhone 8 TestFlight crash remains documented in FEEDBACK.md.

The public receipt network is described in [receipt-network.md](receipt-network.md). The existing Base Sepolia contract does not encode the verification provider, expiry or revocation; receipt explanations must preserve that limitation.
