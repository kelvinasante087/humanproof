# September 8: security, resumable onboarding and demo scope

Authorized by Kelvin: fix the audit issues, investigate partner readiness and interrupted onboarding, keep Proofit readable by everyone with verified-human posting only, rename the payout company Airdroppa, and reconcile the documentation.

## Implementation

- Private Convex database functions behind an allowlisted, authenticated server HTTP bridge.
- Account ownership cannot be overwritten during recovery. Save a verified fingerprint and name reservation; resume from server state and verify actual chain receipts. Never persist raw World proofs or nullifiers.
- Check required onboarding services before starting. Simulator health does not prove Selfie sandbox approval. Device prompts, transient outages and transactions still need retry/recovery. Airdrop health must not prevent credential creation.
- Proofit: public reading/searching, ordinary Privy account access, HumanProof required only to post. Multiple posts per product allowed; identical retries share the same attestation.
- Airdroppa: issuer-signed, wallet-bound, one-human-per-campaign claims of 500 PROOF on Base Sepolia. Cancellation does not consume eligibility; recover independently failed attestations.
- Keep staging, Sandbox and production sessions/credentials separate. Sandbox access is approved; its first full Selfie verification is pending.
- Update current documentation and submission claims; preserve historical specifications as history.

## Acceptance

Anonymous database access fails; relinking fails; interrupted onboarding resumes; failed checks never grant credentials; changed reviews are allowed; forged/direct/replayed payouts fail; cancelled payouts can retry. Run lint, types, build, security tests and browser checks. Report deployment and real Selfie/passkey verification separately.

## Verified September 8

- `npm test`: 18 passing tests, including local EVM payout execution, ownership protection, stored review retries, interrupted onboarding, expiration, dependency failure and paged chain recovery.
- `npm run lint` and `npm run build`: passed, including Next.js TypeScript checking.
- Development Convex `rare-fennec-188`: updated with the private functions and authenticated HTTP bridge. The matching secret is configured in development and local Next.js. Anonymous bridge calls return 401; authenticated health returns 200; the old public credential query is rejected.
- Local production build: `/reviews`, `/airdrop`, `/signup`, `/developers` and `/privacy` return 200. Anonymous protected actions return 401. Public review retrieval returns 200.
- Browser: Proofit is readable without sign-in, ordinary email sign-in opens Privy's login dialog, sample posts have no verified badge, Airdroppa gates entry, and signup pauses when readiness fails.
- Development readiness: all four checks passed again at 06:40 UTC on September 9 in `sandbox` Selfie mode, including the account service, approved World configuration, credential storage and ENS prerequisites. After Kelvin signed in to Privy, **Return user data in an identity token** was enabled for app `cmtheon5b07sk0cl1ab9pw6vm` and independently confirmed on a fresh dashboard page. Local `PRIVY_IDENTITY_TOKENS_ENABLED=true` is configured. Email and passkey login were already enabled. Actual user-token contents and the authenticated issuance flow still need a HumanProof app sign-in; dashboard configuration and readiness are not that end-to-end test.
- Environment isolation regression: the same Privy account may keep separate staging and Sandbox credentials/progress. Ownership and nullifier uniqueness remain enforced within each environment. Convex development gained compound account/environment and nullifier/environment indexes. The full suite remains 18/18 passing; lint, production build and `git diff --check` pass. A 390×844 browser check of `/signup` showed the original HumanProof onboarding language with zero console errors. Partner health runs silently before account creation; the UI shows only a short HumanProof availability error when a required check fails.

## Release still required

No production application/backend release, replacement token deployment, Git commit or push was performed in this pass. The older deployed token remains unrestricted; the new app's claim authorization rejects that incompatible contract instead of issuing a payout voucher. These local changes do not secure the old public deployment until released.

1. The correct Privy app now has **User management > Authentication > Advanced > Return user data in an identity token** enabled and persisted. Local readiness uses `PRIVY_IDENTITY_TOKENS_ENABLED=true`; set the same flag in the production application environment during release. Confirm an actual signed-in client receives a valid identity token containing its linked passkey and embedded wallet. The app flag alone is not evidence of the dashboard setting or that authenticated flow.
2. Provision a matching server bridge secret in the production Next.js and Convex environments. Verify production points to `elated-clownfish-975`, not the development deployment. Coordinate the private-function backend and app rollout: an old app cannot call the new private functions, and the new app cannot use a backend without the bridge.
3. Deploy the replacement Base Sepolia token with `node --env-file=.env.local scripts/airdrop/01-deploy-proof.mjs --replace`. Verify its issuer, deployment receipt and signed-claim behavior. The script preserves the legacy token address and updates the app's deployment JSON. Rebuild the app with that address before releasing.
4. Validate the production readiness response, actual passkey and linked-wallet ownership, then an authorized name claim, post/reload, payout and receipt retry. Do not invent completed humans or seed forged production credentials for testing.
5. World approved the iOS Sandbox app on September 8. Install it through TestFlight and test the full flow on the phone. Keep simulator rehearsal explicitly labelled. Staging, Sandbox and production records are queried by environment; one Privy account may complete each independently, while ownership replacement inside an environment remains rejected.

## Recovery boundaries

New seal reservations retain their starting block and sent transaction reference. Recovery checks successful receipts and searches RPC logs in 1,000-block ranges. A confirmed reverted seal permits retry; uncertain transactions remain reserved. Legacy incomplete seal rows without a transaction or starting block search one day of Base history and may require manual reconciliation if older. Historical credentials created before these protections also require review before being relied on in a real-person demo.

World's current verification response reference: https://docs.world.org/world-id/reference/api . Privy identity-token setup: https://docs.privy.io/user-management/users/identity-tokens . A healthy provider homepage is connectivity evidence, not proof of account entitlement.
