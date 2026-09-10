import { registeredClient, digest, clientSubject } from '@/lib/authorization';
import { backendCall } from '@/lib/backend';
import { VERIFICATION_ENV } from '@/lib/verification/config';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
export async function POST(request: Request) {
  try {
    const raw = await request.text(); if (raw.length > 4096) throw new Error('Oversized');
    const body = JSON.parse(raw);
    if (typeof body.code !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.code) || typeof body.code_verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(body.code_verifier)) throw new Error('Invalid code');
    const client = registeredClient(body.client_id, body.redirect_uri);
    // Validate subject-key availability before consuming the code.
    clientSubject(client.id, VERIFICATION_ENV, 'preflight');
    const identity = await backendCall<{ fingerprint: string; name: string } | null>('mutation', 'authorization:redeem', { codeHash: digest(body.code), clientId: client.id, redirectUri: client.redirectUri, challenge: digest(body.code_verifier), environment: VERIFICATION_ENV });
    if (!identity) throw new Error('Invalid grant');
    return Response.json({ audience: client.id, subject: clientSubject(client.id, VERIFICATION_ENV, identity.fingerprint), name: identity.name, environment: VERIFICATION_ENV, verifiedHuman: true, checkedAt: new Date().toISOString() }, { headers });
  } catch { return Response.json({ error: 'invalid_grant' }, { status: 400, headers }); }
}
