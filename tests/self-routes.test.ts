import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), backend: vi.fn(), account: vi.fn() }));
vi.mock('@selfxyz/core', () => ({
  ATTESTATION_ID: { PASSPORT: 1, BIOMETRIC_ID_CARD: 2 },
  SelfBackendVerifier: class { verify = mocks.verify; }, DefaultConfigStore: class {},
}));
vi.mock('@/lib/backend', () => ({ backendCall: mocks.backend }));
vi.mock('@/lib/account-session', () => ({ provenAccount: mocks.account }));
import { POST as verify } from '@/app/api/self/verify/route';
import { POST as start } from '@/app/api/self/start/route';
import { selfFingerprint } from '@/lib/verification/self';
const request = (body: unknown) => new Request('https://humanproof.example/api/self/verify', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SELF_SCOPE', 'humanproof'); vi.stubEnv('SELF_ENDPOINT', 'https://humanproof.example/api/self/verify');
  vi.stubEnv('HUMANPROOF_NULLIFIER_SALT', 'test-secret'); mocks.backend.mockResolvedValue(null);
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it('logs only a safe failure stage and category, never SDK proof details', async () => {
  const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const error = new Error('private-document-and-proof-data');
  error.name = 'VerifierContractError';
  mocks.verify.mockRejectedValueOnce(error);
  const response = await verify(request({ attestationId: 1, proof: {}, publicSignals: [], userContextData: '00' }));
  expect(await response.json()).toMatchObject({ result: false });
  expect(log).toHaveBeenCalledExactlyOnceWith('Self callback rejected', { stage: 'verification', category: 'VerifierContractError' });
  expect(mocks.backend).not.toHaveBeenCalled();
});
it('never accepts a browser success flag as a proof', async () => {
  expect(await (await verify(request({ success: true, userId: 'victim' }))).json()).toMatchObject({ result: false });
  expect(mocks.backend).not.toHaveBeenCalled();
});
it('binds only the verified identifier and stores only a fingerprint', async () => {
  mocks.verify.mockResolvedValue({ isValidDetails: { isValid: true }, userData: { userIdentifier: 'verified-challenge' }, discloseOutput: { nullifier: '123', name: 'Never stored' } });
  expect(await (await verify(request({ attestationId: '1', proof: {}, publicSignals: [], userContextData: '00', userId: 'attacker' }))).json()).toMatchObject({ result: true });
  expect(mocks.backend).toHaveBeenCalledWith('mutation', 'selfChallenges:complete', { requestId: 'verified-challenge', nullifierHash: selfFingerprint('123'), environment: 'self:mainnet' });
});
it('rejects invalid proofs and failed challenge commits', async () => {
  mocks.verify.mockResolvedValue({ isValidDetails: { isValid: false } });
  const body = { attestationId: 1, proof: {}, publicSignals: [], userContextData: '00' };
  expect(await (await verify(request(body))).json()).toMatchObject({ result: false });
  expect(mocks.backend).not.toHaveBeenCalled();
  mocks.verify.mockResolvedValue({ isValidDetails: { isValid: true }, userData: { userIdentifier: 'expired' }, discloseOutput: { nullifier: '123' } });
  mocks.backend.mockRejectedValue(new Error('expired'));
  expect(await (await verify(request(body))).json()).toMatchObject({ result: false });
});
it('requires login and a public callback before creating a challenge', async () => {
  mocks.account.mockResolvedValue(null);
  expect((await start(request({}))).status).toBe(401);
  mocks.account.mockResolvedValue('account'); vi.stubEnv('SELF_ENDPOINT', 'http://localhost:3000/api/self/verify');
  expect((await start(request({}))).status).toBe(503);
  expect(mocks.backend).not.toHaveBeenCalled();
});
it('normalizes numeric identifiers and rejects zero', () => {
  expect(selfFingerprint('0x7b')).toBe(selfFingerprint('123'));
  expect(selfFingerprint('123')).toBe(BigInt(selfFingerprint('123')).toString());
  expect(() => selfFingerprint('0')).toThrow();
});
