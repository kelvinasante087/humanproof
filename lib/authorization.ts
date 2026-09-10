import 'server-only';
import { createHash, createHmac } from 'node:crypto';

export const digest = (value: string) => createHash('sha256').update(value).digest('base64url');
export function registeredClient(clientId: string, redirectUri: string) {
  const entries: unknown = JSON.parse(process.env.HUMANPROOF_CLIENTS || '[]');
  if (!Array.isArray(entries)) throw new Error('Invalid client registry');
  const client = entries.find(c => c && c.id === clientId && typeof c.name === 'string' && Array.isArray(c.redirectUris) && c.redirectUris.includes(redirectUri));
  if (!client) throw new Error('Unregistered application or redirect');
  const uri = new URL(redirectUri);
  if (uri.username || uri.password || uri.hash || (uri.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && uri.protocol === 'http:' && uri.hostname === 'localhost'))) throw new Error('Invalid redirect');
  if (uri.searchParams.has('code') || uri.searchParams.has('state')) throw new Error('Reserved redirect parameters');
  return { id: clientId, name: client.name as string, redirectUri };
}
export function authorizationRequest(params: URLSearchParams) {
  for (const key of ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method']) if (params.getAll(key).length !== 1) throw new Error('Invalid authorization request');
  const client = registeredClient(params.get('client_id')!, params.get('redirect_uri')!);
  const state = params.get('state')!;
  const challenge = params.get('code_challenge')!;
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || params.get('code_challenge_method') !== 'S256') throw new Error('State and S256 PKCE are required');
  return { ...client, state, challenge };
}
export function clientSubject(clientId: string, environment: string, fingerprint: string) {
  const secret = process.env.HUMANPROOF_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('Authorization unavailable');
  return createHmac('sha256', secret).update(JSON.stringify(['external-subject-v1', clientId, environment, fingerprint])).digest('base64url');
}
