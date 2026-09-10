# External identity connection

This is a minimal registered-client identity connection, not a complete OAuth/OIDC provider or an external action-signing SDK. Self's unresolved real-phone failure still blocks first-time credential creation. It never substitutes a mock or an email account for a completed credential.

## Registration

Set server-only `HUMANPROOF_CLIENTS` to a JSON array of `{ "id": "identity-example", "name": "Identity example", "redirectUris": ["http://localhost:3100/callback"] }` for local development. Production accepts HTTPS redirects only. No clients are enabled by default. Registration must be explicitly provisioned; there is no open registration endpoint. Configure the same registry in the deployed app. Never register an origin you do not control.

## Protocol

1. The client server generates a random state and PKCE verifier, retains them in a browser-bound server session and redirects to `/authorize?client_id=...&redirect_uri=...&state=...&code_challenge=...&code_challenge_method=S256`.
2. HumanProof displays the registered app name, destination and shared fields. The user must sign in, complete their credential and approve the connection. POST requires same-origin and a Privy-account-bound verified session. No approval is automatic.
3. The registered return URL receives a two-minute random code and the original state. Only its SHA-256 hash is stored. Client, redirect, PKCE challenge, owner and provider environment are bound in the database.
4. The client server checks state against its browser session and POSTs JSON to `/api/authorize/exchange` with `client_id`, `redirect_uri`, `code` and `code_verifier`. Redemption checks the current completed credential and consumes the code atomically.
5. The direct HTTPS response contains audience, client-scoped subject, public ENS name, environment, verifiedHuman and checkedAt. This response is for the redeeming server, not a transferable signed assertion. Do not accept identity JSON supplied by a browser.

Wrong clients, redirects, PKCE verifiers, environments, expired codes and replays fail closed. CORS is intentionally not enabled: redemption belongs on the client server. Codes and identity responses must not be logged or cached.

The ENS name remains public and correlatable even though the subject is client-scoped. No wallet address, Privy account ID, proof or global fingerprint is returned. No spending, posting or payout authority is granted.

## Example

Run `node examples/identity-client/server.mjs` alongside HumanProof development on port 3000, with the local registry above. For a hosted provider set HUMANPROOF_URL, CLIENT_ORIGIN and CLIENT_ID for an HTTPS reverse proxy to this loopback server. The server checks state and audience, retains the PKCE verifier server-side, escapes displayed values and expires its own session after five minutes. EXPECTED_ENV defaults to self:mainnet. Explicitly change it for isolated test-document testing; do not present that as real humanity.

The example uses in-memory sessions and is a development example, not a production session store. It is not end-to-end validated with a real credential yet. Clients must implement their own short session lifetime and logout. Continuous revocation, refresh tokens, signed identity tokens and external protected-action authorization are not implemented. A connection proves credential status at redemption time only.
