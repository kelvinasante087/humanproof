import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { provenAccount } from '@/lib/account-session';
import { backendCall } from '@/lib/backend';
import { selfConfig } from '@/lib/verification/self';
import { VERIFICATION_ENV, VERIFICATION_PROVIDER } from '@/lib/verification/config';

export async function POST(request: Request) {
  if (VERIFICATION_PROVIDER !== 'self') return NextResponse.json({ error: 'Inactive provider' }, { status: 404 });
  const account = await provenAccount(request);
  if (!account) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 });
  try {
    const config = selfConfig();
    const requestId = randomUUID();
    await backendCall('mutation', 'selfChallenges:create', { requestId, privyUserId: account, environment: VERIFICATION_ENV });
    return NextResponse.json({ ...config, requestId }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Verification is temporarily unavailable. Your account can resume later.' }, { status: 503 });
  }
}
