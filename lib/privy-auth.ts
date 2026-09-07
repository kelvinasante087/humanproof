/**
 * Server-side verification of a Privy access token.
 *
 * "Sign in with HumanProof" hangs on one thing being true: that the browser really is the Privy
 * account it says it is. We never trust a client-supplied account id. Instead the client sends
 * Privy's access token (a JWT it issues on login), and we verify that token's signature here
 * against Privy's PUBLIC keys before believing the account behind it.
 *
 * Privy access tokens are ES256 JWTs: issuer `privy.io`, audience = the Privy app id, subject =
 * the user's DID. Privy publishes the verification keys at a public JWKS endpoint, so this needs
 * NO new secret — the app id we already have (NEXT_PUBLIC_PRIVY_APP_ID) is enough. `jose` (already
 * installed) does the fetch + signature check and caches the key set.
 *
 * Server-only. Returns the proven DID, or null for any token we can't verify (fail closed).
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const PRIVY_ISSUER = "privy.io";

// One cached remote key set per app id (module-level so the keys aren't re-fetched every request).
const jwksByApp = new Map<string, JWTVerifyGetKey>();

function jwksFor(appId: string): JWTVerifyGetKey {
  let jwks = jwksByApp.get(appId);
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`),
    );
    jwksByApp.set(appId, jwks);
  }
  return jwks;
}

/**
 * Verify a Privy access token and return the authenticated user's DID, or null if the token is
 * missing, malformed, wrongly signed, expired, or issued for a different app. Never throws.
 */
export async function verifyPrivyUserId(token: string | undefined | null): Promise<string | null> {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!token || !appId) return null;

  try {
    const { payload } = await jwtVerify(token, jwksFor(appId), {
      issuer: PRIVY_ISSUER,
      audience: appId,
    });
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    // Any verification failure = not authenticated. Fail closed.
    return null;
  }
}
