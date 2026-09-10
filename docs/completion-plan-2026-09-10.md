# HumanProof completion plan

HumanProof combines reusable humanity verification, Privy account/wallet/passkey ownership, an ENS identity and Graph-indexed action receipts. Prize targets are Graph, Privy and ENS. These integrations do not replace personhood verification.

## Findings and concrete repairs

- Real Self disclosure is still blocked before the callback. A live mainnet request reaches the phone, then fails after approval with generic `error`. Backend reachability and SDK format checks do not prove the relayer can reach us or the phone can produce the proof. World ID Sandbox is now the active provider while we retry the approved Sandbox path. Do not substitute email, a wallet, a mock document or an administrator flag for a verified human.
- Browser error persistence and privacy-safe callback diagnostics are deployed. The next external evidence needed is a Self support trace or a successful control disclosure using a real document. Repeated identical attempts are not additional validation.
- The issuer-authorized PROOF contract was deployed September 10 at 0x2d2560682ae2E84BB61c7329b2C647092E40f22A, Base Sepolia block 46637098. Preserve the old address as legacy. Production must be rebuilt to use the replacement. A real credential-bound claim remains an acceptance test.
- Graph receipt discovery is deployed. Historic receipts demonstrate indexing, not completion of the current Self onboarding flow.
- Privy ownership is checked using signed tokens. ENS issuance is account-bound and recoverable. A live Self-to-passkey-to-name run remains required.
- Both demo applications currently share an origin. An initial external identity connection is now implemented; see docs/external-identity.md. Client registration and real-credential end-to-end validation remain outstanding. It is not an external action SDK or full OAuth/OIDC service.

## Required end-to-end acceptance

1. A real proof completes, storing only its provider-scoped fingerprint and account-bound progress.
2. Closing and resuming setup preserves progress. A different account cannot take it over.
3. Bind a passkey and issue the ENS name to the authenticated embedded wallet.
4. Publish a Proofit review; an unverified account is rejected. Distinct posts remain permitted.
5. Reuse the credential in Airdroppa; the owned wallet receives 500 PROOF. Repeat claims fail without additional minting.
6. Query the new action through Graph and compare its content hash with the original.

## External application integration

Implement a registered-client authorization-code flow with exact redirect allowlists, PKCE, state/nonce, short-lived single-use codes, explicit user consent and server-side redemption. Audience-bind credentials and action requests; never copy HumanProof's cookies to another domain or hand out a general signing key. Add revocation/expiry semantics and negative tests before calling this portable authentication. Begin with one separate example app to validate the actual boundary.

## Sponsor value and demonstration

- Privy: demonstrate account recovery, wallet ownership and returning-user passkey access.
- ENS: demonstrate a readable identity resolving to its wallet; retain explicit testnet naming.
- Graph: demonstrate permissionless receipt discovery, content integrity and the failed-claim contrast. A receipt proves an authorized attestation, not the truth or unaided human authorship of content.

Finish the real proof and claim journey before adding another integration. Record the successful path and enforcement failures. Publish the tested source and reproducible setup with an accurate work/AI attribution statement. Do not label unfinished external SSO or phone verification complete.
