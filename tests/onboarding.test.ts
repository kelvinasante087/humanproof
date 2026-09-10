import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ account: vi.fn(), credential: vi.fn(), progress: vi.fn(), set: vi.fn(), health: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/account-session", () => ({ provenAccount: mocks.account }));
vi.mock("@/lib/db", () => ({ getCredentialByPrivyUser: mocks.credential }));
vi.mock("@/lib/onboarding", () => ({ getProgress: mocks.progress }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.set }) }));
vi.mock("@/app/api/world/verify/route", () => ({ WORLD_SESSION_COOKIE: "hp_world_nullifier" }));
vi.mock("@/lib/readiness", () => ({ onboardingReadiness: mocks.health }));
vi.mock("@worldcoin/idkit-server", () => ({ signRequest: mocks.sign }));
import { POST as resume } from "@/app/api/onboarding/resume/route";
import { POST as start } from "@/app/api/world/sign/route";
const request = () => new Request("http://localhost/api/onboarding/resume", { method: "POST" });
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("HUMANPROOF_SESSION_SECRET", "test-secret"); mocks.account.mockResolvedValue("alice"); mocks.credential.mockResolvedValue(null); mocks.progress.mockResolvedValue(null); });
afterEach(() => vi.unstubAllEnvs());
it("requires a proven account before restoring a session", async () => {
  mocks.account.mockResolvedValue(null);
  expect((await resume(request())).status).toBe(401);
  expect(mocks.set).not.toHaveBeenCalled(); expect(mocks.credential).not.toHaveBeenCalled();
});
it("restores saved proof and pending name after interruption", async () => {
  mocks.progress.mockResolvedValue({ privyUserId: "alice", nullifierHash: "123", verifiedAt: Date.now(), name: "alice.humanproof.eth" });
  const response = await resume(request());
  expect(await response.json()).toEqual({ verified: true, name: null, pendingName: "alice.humanproof.eth", credentialed: false });
  expect(mocks.set).toHaveBeenCalledOnce();
  const payload = JSON.parse(Buffer.from(mocks.set.mock.calls[0][1].split(".")[0], "base64url").toString());
  expect(payload).toMatchObject({ h: "123", p: "alice" }); expect(payload).not.toHaveProperty("n");
});
it("does not grant verification when progress expires or the store fails", async () => {
  mocks.progress.mockResolvedValue({ nullifierHash: "123", verifiedAt: Date.now() - 86400001 });
  expect((await (await resume(request())).json()).verified).toBe(false);
  mocks.progress.mockRejectedValue(new Error("offline"));
  expect((await resume(request())).status).toBe(503); expect(mocks.set).not.toHaveBeenCalled();
});
it("restores completed credentials independently of unfinished progress", async () => {
  mocks.credential.mockResolvedValue({ nullifierHash: "123", name: "alice.humanproof.eth" });
  mocks.progress.mockRejectedValue(new Error("offline"));
  expect((await (await resume(request())).json()).credentialed).toBe(true);
  expect(mocks.progress).not.toHaveBeenCalled();
});
it("keeps parked World verification inactive", async () => {
  mocks.health.mockResolvedValue({ ready: false });
  expect((await start(request())).status).toBe(404); expect(mocks.sign).not.toHaveBeenCalled();
  mocks.account.mockResolvedValue(null);
  expect((await start(request())).status).toBe(404);
});
