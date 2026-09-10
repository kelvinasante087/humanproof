import { randomBytes } from 'node:crypto';
import { authorizationRequest, digest } from '@/lib/authorization';
import { readBoundSession } from '@/lib/account-session';
import { backendCall } from '@/lib/backend';
import { VERIFICATION_ENV } from '@/lib/verification/config';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
export async function GET(request: Request) {
  try { const config = authorizationRequest(new URL(request.url).searchParams); return Response.json({ name: config.name, destination: new URL(config.redirectUri).origin }, { headers }); }
  catch { return Response.json({ error: 'This application or authorization request is not registered.' }, { status: 400, headers }); }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403, headers });
  const bound = await readBoundSession(request);
  if (!bound) return Response.json({ error: 'Sign in and complete your HumanProof credential, then return here.' }, { status: 401, headers });
  try {
    const config = authorizationRequest(new URL(request.url).searchParams);
    const code = randomBytes(32).toString('base64url');
    await backendCall('mutation', 'authorization:issue', { codeHash: digest(code), clientId: config.id, redirectUri: config.redirectUri, challenge: config.challenge, privyUserId: bound.privyUserId, environment: VERIFICATION_ENV });
    const redirect = new URL(config.redirectUri); redirect.searchParams.set('code', code); redirect.searchParams.set('state', config.state);
    return Response.json({ redirect: redirect.toString() }, { headers });
  } catch { return Response.json({ error: 'Authorization unavailable. A completed credential and registered application are required.' }, { status: 400, headers }); }
}
