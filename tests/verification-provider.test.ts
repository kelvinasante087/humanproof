import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
it('defaults to Self and does not use World environment as credential authority', async () => {
  vi.stubEnv('NEXT_PUBLIC_HUMANPROOF_PROVIDER', 'self');
  vi.stubEnv('NEXT_PUBLIC_SELF_ENV', 'mainnet');
  vi.stubEnv('NEXT_PUBLIC_WORLD_ENV', 'sandbox');
  const config = await import('../lib/verification/config');
  expect(config.VERIFICATION_ENV).toBe('self:mainnet');
  expect(config.VERIFICATION_PROVIDER).toBe('self');
});
it('restores World only through explicit selection and rejects invalid selectors', async () => {
  vi.stubEnv('NEXT_PUBLIC_HUMANPROOF_PROVIDER', 'world');
  vi.stubEnv('NEXT_PUBLIC_WORLD_ENV', 'sandbox');
  expect((await import('../lib/verification/config')).VERIFICATION_ENV).toBe('sandbox');
  vi.resetModules(); vi.stubEnv('NEXT_PUBLIC_HUMANPROOF_PROVIDER', 'anything');
  await expect(import('../lib/verification/config')).rejects.toThrow('Invalid verification provider');
});
it('rejects a World session in the Self flow', async () => {
  vi.stubEnv('HUMANPROOF_SESSION_SECRET', 'test-session-secret');
  vi.stubEnv('NEXT_PUBLIC_HUMANPROOF_PROVIDER', 'world');
  vi.stubEnv('NEXT_PUBLIC_WORLD_ENV', 'sandbox');
  const token = (await import('../lib/session')).sealSessionFromHash('123', 'alice');
  vi.resetModules(); vi.stubEnv('NEXT_PUBLIC_HUMANPROOF_PROVIDER', 'self');
  expect((await import('../lib/session')).readSessionForAccount(token, 'alice')).toBeNull();
});
