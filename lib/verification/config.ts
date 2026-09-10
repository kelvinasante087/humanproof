import { WORLD_ENV } from '../world';

export const VERIFICATION_PROVIDER = process.env.NEXT_PUBLIC_HUMANPROOF_PROVIDER || 'self';
if (!['self', 'world'].includes(VERIFICATION_PROVIDER)) throw new Error('Invalid verification provider');
export const SELF_ENV = process.env.NEXT_PUBLIC_SELF_ENV || 'mainnet';
if (!['mainnet', 'testnet'].includes(SELF_ENV)) throw new Error('Invalid Self environment');
// World rows retain their historical namespace; Self can never inherit those records.
export const VERIFICATION_ENV = VERIFICATION_PROVIDER === 'world' ? WORLD_ENV : `self:${SELF_ENV}`;
export const HUMAN_SESSION_COOKIE = 'hp_world_nullifier'; // Keep cookie name for safe sign-out of legacy sessions.
