import { NextResponse } from 'next/server';
import { SelfBackendVerifier, DefaultConfigStore, ATTESTATION_ID } from '@selfxyz/core';
import { backendCall } from '@/lib/backend';
import { selfConfig, selfFingerprint } from '@/lib/verification/self';
import { VERIFICATION_ENV, VERIFICATION_PROVIDER } from '@/lib/verification/config';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET() {
  try {
    const config = selfConfig();
    return NextResponse.json({ provider: 'self', environment: VERIFICATION_ENV, scope: config.scope }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Verification unavailable' }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (VERIFICATION_PROVIDER !== 'self') return NextResponse.json({ status: 'error', result: false }, { status: 404 });
  let stage = 'request';
  try {
    const raw = await request.text();
    if (raw.length > 100000) return NextResponse.json({ status: 'error', result: false }, { status: 413 });
    const body = JSON.parse(raw);
    const config = selfConfig();
    body.attestationId = Number(body.attestationId);
    if (![ATTESTATION_ID.PASSPORT, ATTESTATION_ID.BIOMETRIC_ID_CARD].includes(body.attestationId) || !body.proof || !Array.isArray(body.publicSignals) || typeof body.userContextData !== 'string') throw new Error('Invalid proof');
    stage = 'verification';
    const verifier = new SelfBackendVerifier(config.scope, config.endpoint, config.devMode,
      new Map([[ATTESTATION_ID.PASSPORT, true], [ATTESTATION_ID.BIOMETRIC_ID_CARD, true]]),
      new DefaultConfigStore({ excludedCountries: [], ofac: false }), 'uuid');
    const result = await verifier.verify(body.attestationId, body.proof, body.publicSignals, body.userContextData);
    if (!result.isValidDetails.isValid) throw new Error('Invalid proof');
    stage = 'save-progress';
    // Only the cryptographically verified identifier selects the authenticated challenge.
    await backendCall('mutation', 'selfChallenges:complete', {
      requestId: result.userData.userIdentifier,
      nullifierHash: selfFingerprint(result.discloseOutput.nullifier), environment: VERIFICATION_ENV,
    });
    return NextResponse.json({ status: 'success', result: true });
  } catch (error) {
    // Never log document disclosures, proof bodies or identifiers.
    // SDK messages can contain proof data; log only fixed categories and our stage.
    const name = error instanceof Error ? error.name : '';
    const category = ['ConfigMismatchError', 'RegistryContractError', 'VerifierContractError', 'SyntaxError'].includes(name) ? name : 'Rejected';
    console.warn('Self callback rejected', { stage, category });
    return NextResponse.json({ status: 'error', result: false, reason: 'Proof could not be accepted. Start a new verification and retry.' });
  }
}
