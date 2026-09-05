// Day-5 acceptance harness — drives the REAL /api/attest route to prove the signed-cookie gate.
//
// Proves: (1) no cookie -> 401, (2) forged/unsigned cookie -> 401, (3) a validly-signed cookie
// gets PAST the gate (503 if the seal isn't provisioned yet, or 200/409 once it is). The 200 seal
// and 409 duplicate are exercised live once the contract + Convex are provisioned.
//
// Run against a running dev server:
//   node --env-file=.env.local scripts/seal/verify-attest.mjs [baseUrl]
import { createHmac } from "node:crypto";

const BASE = process.argv[2] || "http://localhost:3000";
const COOKIE = "hp_world_nullifier";
const secret = process.env.HUMANPROOF_SESSION_SECRET;
if (!secret) {
  console.error("HUMANPROOF_SESSION_SECRET not set (run with --env-file=.env.local)");
  process.exit(1);
}

// Mint a valid signed session cookie, identical to lib/session.ts sealSession().
function sealSession(nullifier) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ n: nullifier, iat: now, exp: now + 3600 })).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

async function post(cookie) {
  const res = await fetch(`${BASE}/api/attest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: `${COOKIE}=${cookie}` } : {}) },
    body: JSON.stringify({ contentHash: "day5-acceptance-" + Date.now(), appId: "verify-harness" }),
  });
  let body;
  try { body = await res.json(); } catch { body = {}; }
  return { status: res.status, body };
}

const cases = [
  { name: "no cookie", cookie: null, expect: 401 },
  { name: "forged/garbage cookie", cookie: "not-a-signed-token", expect: 401 },
  { name: "tampered signature", cookie: sealSession("0xHUMAN").slice(0, -2) + "00", expect: 401 },
  { name: "valid signed cookie (past the gate)", cookie: sealSession("0xHUMAN_" + Date.now()), expectNot: 401 },
];

let ok = true;
for (const c of cases) {
  const { status, body } = await post(c.cookie);
  const pass = c.expect ? status === c.expect : status !== c.expectNot;
  ok = ok && pass;
  console.log(`${pass ? "PASS" : "FAIL"}  ${c.name.padEnd(34)} -> ${status} ${JSON.stringify(body)}`);
}
console.log(ok ? "\nAll gate checks passed." : "\nSome checks FAILED.");
process.exit(ok ? 0 : 1);
