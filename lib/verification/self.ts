import 'server-only';
import { createHmac } from 'node:crypto';
import { SELF_ENV, VERIFICATION_PROVIDER, VERIFICATION_ENV } from './config';

export function selfConfig() {
  if (VERIFICATION_PROVIDER !== 'self') throw new Error('Inactive provider');
  const scope = process.env.SELF_SCOPE;
  const endpoint = process.env.SELF_ENDPOINT;
  if (!scope || !endpoint) throw new Error('Self is not configured');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.pathname !== '/api/self/verify' || url.search || url.hash || url.username || url.password || /^(localhost|127\.|\[::1\])/.test(url.hostname)) throw new Error('Self requires a public HTTPS callback');
  return { scope, endpoint, devMode: SELF_ENV === 'testnet' };
}

export function selfFingerprint(nullifier: string) {
  const salt = process.env.HUMANPROOF_NULLIFIER_SALT;
  if (!salt || !/^(0x[0-9a-f]+|[0-9]+)$/i.test(nullifier) || BigInt(nullifier) === BigInt(0)) throw new Error('Invalid proof identifier');
  // Match the canonical decimal uint256 representation used by ENS issuance and storage.
  return BigInt('0x' + createHmac('sha256', salt).update(`${VERIFICATION_ENV}:${BigInt(nullifier).toString()}`).digest('hex')).toString();
}
