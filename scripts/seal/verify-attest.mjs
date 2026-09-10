// Read-only authentication rejection smoke test. Real authorized actions are covered by npm test.
const base = process.argv[2] || "http://localhost:3000";
for (const cookie of [undefined, "not-a-signed-token"]) {
  const response = await fetch(`${base}/api/attest`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: `hp_world_nullifier=${cookie}` } : {}) },
    body: JSON.stringify({ appId: "reviews", contentHash: "auth-smoke" }),
  });
  if (response.status !== 401) throw new Error(`Expected 401, received ${response.status}`);
  console.log(`PASS: ${cookie ? "forged cookie" : "anonymous request"} rejected`);
}
