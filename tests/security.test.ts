/// <reference types="vite/client" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
import { authorized } from "../convex/http";
import { sealSessionFromHash, readSessionForAccount } from "../lib/session";
import { reviewContentHash } from "../lib/demo/reviews";

const modules = import.meta.glob("../convex/**/*.ts");
afterEach(() => vi.unstubAllEnvs());

describe("database authorization and ownership", () => {
  it("rejects missing, wrong, truncated and unconfigured server credentials", () => {
    const secret = "a".repeat(64);
    for (const header of [null, "", "Bearer wrong", `Bearer ${secret.slice(1)}`, `Bearer ${secret}extra`]) expect(authorized(header, secret)).toBe(false);
    expect(authorized(`Bearer ${secret}`, undefined)).toBe(false);
    expect(authorized(`Bearer ${secret}`, secret)).toBe(true);
  });
  it("denies an anonymous HTTP bridge call before dispatch", async () => {
    vi.stubEnv("HUMANPROOF_BACKEND_SECRET", "a".repeat(64));
    const t = convexTest(schema, modules);
    const response = await t.fetch("/server", { method: "POST", body: JSON.stringify({ kind: "mutation", name: "credentials:record", args: { nullifierHash: "123", privyUserId: "attacker", name: "fake.humanproof.eth" } }) });
    expect(response.status).toBe(401);
    expect(await t.query(internal.credentials.getByPrivyUser, { privyUserId: "attacker" })).toBeNull();
  });
  it("prevents account takeover and two human fingerprints on one account", async () => {
    const t = convexTest(schema, modules);
    const original = { nullifierHash: "123", name: "alice.humanproof.eth", privyUserId: "alice", environment: "staging" };
    await t.mutation(internal.credentials.record, original);
    await expect(t.mutation(internal.credentials.linkAccount, { ...original, privyUserId: "attacker" })).rejects.toThrow("HUMAN_ALREADY_BOUND");
    await expect(t.mutation(internal.credentials.record, { ...original, nullifierHash: "456" })).rejects.toThrow("ACCOUNT_ALREADY_BOUND");
    await t.mutation(internal.credentials.record, original);
    expect((await t.query(internal.credentials.getByPrivyUser, { privyUserId: "alice" }))?.nullifierHash).toBe("123");
  });
  it("resumes the original account and refuses another account's partial proof", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.onboarding.saveProof, { privyUserId: "alice", nullifierHash: "123", environment: "staging" });
    await t.mutation(internal.onboarding.prepareName, { privyUserId: "alice", name: "alice.humanproof.eth", address: "0x123", startBlock: "1" });
    await t.mutation(internal.onboarding.saveTransaction, { privyUserId: "alice", txHash: "0xtransaction" });
    await expect(t.mutation(internal.onboarding.saveProof, { privyUserId: "attacker", nullifierHash: "123", environment: "staging" })).rejects.toThrow("HUMAN_ALREADY_BOUND");
    const row = await t.query(internal.onboarding.get, { privyUserId: "alice" });
    expect(row?.name).toBe("alice.humanproof.eth"); expect(row?.txHash).toBe("0xtransaction");
    expect(row).not.toHaveProperty("nullifier");
  });
  it("retains a sent seal when cleanup is attempted", async () => {
    const t = convexTest(schema, modules);
    const args = { dedupeKey: "key", nullifierHash: "123", appId: "reviews", contentHash: "post" };
    const id = await t.mutation(internal.seals.reserve, args);
    await expect(t.mutation(internal.seals.reserve, args)).rejects.toThrow("SEAL_PENDING");
    await t.mutation(internal.seals.sent, { id, txHash: "0xtransaction" });
    await t.mutation(internal.seals.release, { id });
    expect(await t.mutation(internal.seals.reserve, args)).toBe(id);
    await t.mutation(internal.seals.finalize, { id, txHash: "0xtransaction", sealRef: "key" });
    expect((await t.query(internal.seals.getByRef, { sealRef: "key" }))?.txHash).toBe("0xtransaction");
  });
});

it("binds cookies to the account and rejects tampering", () => {
  vi.stubEnv("HUMANPROOF_SESSION_SECRET", "test-only-secret");
  const token = sealSessionFromHash("123", "alice");
  expect(readSessionForAccount(token, "alice")?.nullifierHash).toBe("123");
  expect(readSessionForAccount(token, "bob")).toBeNull();
  expect(readSessionForAccount(token + "00", "alice")).toBeNull();
});
it("allows different reviews of the same product while making exact retries deterministic", () => {
  expect(reviewContentHash("coffee", "First impression")).not.toBe(reviewContentHash("coffee", "A week later"));
  expect(reviewContentHash("coffee", "First impression")).toBe(reviewContentHash("coffee", "First impression"));
});

it("publishes only sealed reviews and retains distinct posts across retries", async () => {
  const t = convexTest(schema, modules);
  const post = { itemId: "aurora-headphones", author: "alice.humanproof.eth", stars: 5, body: "First impression", sealId: "first" };
  await expect(t.mutation(internal.reviews.publish, post)).rejects.toThrow("SEALED_POST_REQUIRED");
  for (const [sealId, body] of [["first", "First impression"], ["second", "A week later"]]) {
    const id = await t.mutation(internal.seals.reserve, { dedupeKey: sealId, nullifierHash: "123", appId: "reviews", contentHash: body });
    await t.mutation(internal.seals.finalize, { id, sealRef: sealId, txHash: "0xconfirmed" });
    await t.mutation(internal.reviews.publish, { ...post, sealId, body });
    await t.mutation(internal.reviews.publish, { ...post, sealId, body });
  }
  const rows = await t.query(internal.reviews.list, { itemId: post.itemId });
  expect(rows).toHaveLength(2);
  expect(rows.map(row => row.body)).toEqual(expect.arrayContaining(["First impression", "A week later"]));
  for (const row of rows) { expect(row).not.toHaveProperty("nullifierHash"); expect(row).not.toHaveProperty("privyUserId"); }
});
it("isolates completed credentials and onboarding ownership by World environment", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.credentials.record, { nullifierHash: "123", name: "alice.humanproof.eth", privyUserId: "alice", environment: "staging" });
  await expect(t.mutation(internal.onboarding.saveProof, { nullifierHash: "456", privyUserId: "alice", environment: "staging" })).rejects.toThrow("ACCOUNT_ALREADY_BOUND");
  await t.mutation(internal.onboarding.saveProof, { nullifierHash: "456", privyUserId: "alice", environment: "sandbox" });
  expect((await t.query(internal.onboarding.get, { privyUserId: "alice", environment: "sandbox" }))?.nullifierHash).toBe("456");
  await t.mutation(internal.credentials.record, { nullifierHash: "456", name: "alice-sandbox.humanproof.eth", privyUserId: "alice", environment: "sandbox" });
  expect((await t.query(internal.credentials.getByPrivyUser, { privyUserId: "alice", environment: "staging" }))?.nullifierHash).toBe("123");
  expect((await t.query(internal.credentials.getByPrivyUser, { privyUserId: "alice", environment: "sandbox" }))?.nullifierHash).toBe("456");
  await expect(t.mutation(internal.credentials.record, { nullifierHash: "789", name: "other.humanproof.eth", privyUserId: "alice", environment: "sandbox" })).rejects.toThrow("ACCOUNT_ALREADY_BOUND");
  await expect(t.mutation(internal.credentials.record, { nullifierHash: "456", name: "stolen.humanproof.eth", privyUserId: "attacker", environment: "sandbox" })).rejects.toThrow("HUMAN_ALREADY_BOUND");
});
it("allows retry after confirmed reversion but preserves finalized receipts", async () => {
  const t = convexTest(schema, modules);
  const args = { dedupeKey: "retry", nullifierHash: "123", appId: "reviews", contentHash: "post" };
  const id = await t.mutation(internal.seals.reserve, args);
  await t.mutation(internal.seals.sent, { id, txHash: "0xreverted" });
  await t.mutation(internal.seals.clearReverted, { id });
  expect(await t.mutation(internal.seals.reserve, args)).toBe(id);
  await t.mutation(internal.seals.finalize, { id, txHash: "0xsuccess", sealRef: "retry" });
  await t.mutation(internal.seals.clearReverted, { id });
  expect((await t.query(internal.seals.getByRef, { sealRef: "retry" }))?.txHash).toBe("0xsuccess");
});
