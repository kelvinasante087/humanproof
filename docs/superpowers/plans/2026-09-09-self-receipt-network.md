# Self and HumanProof Receipt Network Implementation Plan

**Goal:** Make Self the active humanity provider, retain World behind explicit activation, and build core receipt discovery and integrity verification on The Graph.

**Architecture:** Provider-specific proofs become account-bound HumanProof progress in a provider/environment namespace. Self callbacks consume short-lived, server-created challenges atomically. Public receipt discovery reads a configured Graph index; absent infrastructure is reported unavailable, never replaced by fabricated results.

**Stack:** Next.js, Privy, Self SDK, Convex, ENSv2, Base Sepolia, The Graph.

## Onboarding
- [x] Test provider/environment session isolation and World disabled routes.
- [x] Add provider selection defaulting to Self; retain World configuration and code. Namespace Self records as self:mainnet or self:testnet; preserve legacy World namespaces for deliberate restoration.
- [x] Test challenge ownership, expiry, replay and duplicate-human rejection in Convex.
- [x] Create authenticated start/status routes and a proof-verified public callback. Bind proof userIdentifier to random server challenge; do not trust browser success callbacks. Store no document disclosures or raw proof.
- [x] Add Self QR/deep-link step to existing onboarding without redesigning the other steps. Resume only from server-verified progress.
- [x] Make readiness check only the selected provider. Require a public HTTPS Self callback and matching scope.

## Receipt network
- [x] Create Graph schema, ABI, mapping and deployable manifest for the existing attestation contract.
- [x] Add typed bounded server Graph queries, integrity checks and public API with explicit unavailable states.
- [x] Add HumanProof Verify discovery interface and evidence explanations with no unsupported authorship or revocation claims.
- [x] Connect existing verification surfaces and developer documentation to the receipt network.

## Verification and release
- [x] Run ownership/security tests, lint, app build and Graph codegen/build.
- [ ] Validate browser flow and unavailable behavior; distinguish local tests from live provider proof.
- [x] Document World reactivation and cross-provider duplicate-identity limits.
- [ ] Configure/deploy development backend changes needed for local use. Production release, public callback, Graph deployment and actual phone proof require concrete deployment configuration; do not call these complete based on mocks.

Validation commands: npm test; npm run lint; npm run build; npm --prefix subgraph run codegen; npm --prefix subgraph run build.

Development Convex deployment completed. 33 tests pass; lint, app build and Graph codegen/build pass. Live Self callback, actual phone proof and hosted Graph index remain pending, with setup instructions in docs/self-integration.md and docs/receipt-network.md.
