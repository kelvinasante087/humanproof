import "server-only";
import { signRequest } from "@worldcoin/idkit-server";
import { parseAbi, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { WORLD_ENV, WORLD_ACTION, WORLD_APP_ID } from "./world";
import { backendCall } from "./backend";
import { publicClient, getWalletClient, ADDR } from "./ens/config";
import ens from "./ens/humanproof.sepolia.json";
import { VERIFICATION_PROVIDER, VERIFICATION_ENV } from './verification/config';
import { selfConfig } from './verification/self';

export type Readiness = { ready: boolean; mode: "simulator" | "selfie" | "self"; checkedAt: string; checks: { name: string; ready: boolean; message: string }[] };
let cached: { until: number; value: Promise<Readiness> } | undefined;
async function check(name: string, fn: () => Promise<void>, failure: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([fn(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 12000); })]);
    return { name, ready: true, message: "Ready" };
  } catch { return { name, ready: false, message: failure }; }
  finally { clearTimeout(timer); }
}
export function onboardingReadiness(): Promise<Readiness> {
  if (cached && cached.until > Date.now()) return cached.value;
  const value = (async (): Promise<Readiness> => {
    const checks = await Promise.all([
      check("Account service", async () => {
        const id = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
        if (!id || process.env.PRIVY_IDENTITY_TOKENS_ENABLED !== "true") throw new Error("not configured");
        const response = await fetch(`https://auth.privy.io/api/v1/apps/${id}/jwks.json`, { signal: AbortSignal.timeout(7000), cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.keys) || !data.keys.length) throw new Error("unavailable");
      }, "Account setup is temporarily unavailable. Please try again later."),
      check("Verification", async () => {
        if (VERIFICATION_PROVIDER === 'self') {
          const config = selfConfig();
          // Reachability is only a preflight; an actual proof can still fail later.
          const response = await fetch(config.endpoint, { signal: AbortSignal.timeout(7000), cache: 'no-store' });
          const data = await response.json();
          if (!response.ok || data.provider !== 'self' || data.environment !== VERIFICATION_ENV || data.scope !== config.scope) throw new Error('Callback unavailable');
          const rpc = await fetch(config.devMode ? 'https://forno.celo-sepolia.celo-testnet.org' : 'https://forno.celo.org', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }), signal: AbortSignal.timeout(7000),
          });
          const chain = await rpc.json();
          if (!rpc.ok || chain.result !== (config.devMode ? '0xaa044c' : '0xa4ec')) throw new Error('Verification network unavailable');
          return;
        }
        if (!WORLD_APP_ID || !process.env.WORLD_RP_ID || !["staging", "sandbox", "production"].includes(WORLD_ENV)) throw new Error("not configured");
        if (WORLD_ENV !== "staging" && process.env.WORLD_SELFIE_ACCESS !== "approved") throw new Error("access pending");
        signRequest({ signingKeyHex: process.env.WORLD_RP_SIGNING_KEY || "", action: WORLD_ACTION });
        // Connectivity only. A successful response is NOT evidence of Selfie entitlement.
        const response = await fetch(WORLD_ENV === "staging" ? "https://simulator.worldcoin.org" : "https://developer.world.org", { signal: AbortSignal.timeout(7000), cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
      }, "HumanProof verification is temporarily unavailable. Please retry later."),
      check("Saved progress", async () => {
        if (!process.env.HUMANPROOF_SESSION_SECRET || !process.env.HUMANPROOF_NULLIFIER_SALT) throw new Error("not configured");
        await backendCall("query", "health", {});
      }, "We cannot safely save your progress right now. Please retry shortly."),
      check("Credential name", async () => {
        const worker = getWalletClient();
        const issuer = privateKeyToAccount(process.env.HUMANPROOF_ISSUER_PRIVATE_KEY as `0x${string}`);
        const [balance, contractIssuer, ...codes] = await Promise.all([
          publicClient.getBalance({ address: worker.account.address }),
          publicClient.readContract({ address: getAddress(ens.registrar), abi: parseAbi(["function issuer() view returns (address)"]), functionName: "issuer" }),
          ...[ADDR.registry, ADDR.resolver].map(address => publicClient.getCode({ address })),
        ]);
        if (balance < BigInt("100000000000000") || contractIssuer.toLowerCase() !== issuer.address.toLowerCase() || codes.some(code => !code || code === "0x")) throw new Error("unavailable");
      }, "Name issuance is temporarily unavailable. Your account can resume when it returns."),
    ]);
    return { ready: checks.every(c => c.ready), mode: VERIFICATION_PROVIDER === 'self' ? 'self' : WORLD_ENV === "staging" ? "simulator" : "selfie", checkedAt: new Date().toISOString(), checks };
  })();
  cached = { until: Date.now() + 15000, value };
  return value;
}
