import { NextResponse } from 'next/server';
import { provenAccount } from '@/lib/account-session';
import { backendCall } from '@/lib/backend';
import { VERIFICATION_ENV, VERIFICATION_PROVIDER } from '@/lib/verification/config';

export async function GET(request: Request) {
  if (VERIFICATION_PROVIDER !== 'self') return NextResponse.json({ error: 'Inactive provider' }, { status: 404 });
  const account = await provenAccount(request);
  if (!account) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 });
  const requestId = new URL(request.url).searchParams.get('requestId');
  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  try {
    const state = await backendCall<{ verified: boolean; expiresAt: number; environment: string } | null>('query', 'selfChallenges:get', { requestId, privyUserId: account });
    if (!state || state.environment !== VERIFICATION_ENV) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    return NextResponse.json({ verified: state.verified, expired: state.expiresAt < Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Unable to check verification. Please retry.' }, { status: 503 }); }
}
