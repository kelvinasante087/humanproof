// Day 4 FLOOR, step 3 — issue a subname <label>.humanproof.eth in our registry, set its
// ETH address record on our resolver, and confirm it resolves via the Universal Resolver.
//
// Run:  node --env-file=.env.local scripts/ens/03-issue-subname.mjs [label] [claimantAddr]
//   defaults: label=alice, claimant=founder wallet (a stand-in "verified human").
//
// The worker signs: it holds ROLE_REGISTRAR on our registry and ROLE_SET_ADDR on our resolver.
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, getAddress, parseAbi, namehash } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ens_normalize } from "@adraffy/ens-normalize";

const RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const account = privateKeyToAccount(process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY);
const dep = JSON.parse(readFileSync(new URL("../../lib/ens/deployments.sepolia.json", import.meta.url))).contracts;
const state = JSON.parse(readFileSync(new URL("../../lib/ens/humanproof.sepolia.json", import.meta.url)));

const REGISTRY = getAddress(state.registry);
const RESOLVER = getAddress(state.resolver);
const UR = getAddress(dep.UniversalResolverV2); // vanity/Managed UR proxies revert ResolverNotFound; V2 resolves (see deployments resolveNote)

const rawLabel = process.argv[2] || "alice";
const claimant = getAddress(process.argv[3] || state.owner);
const label = ens_normalize(rawLabel);                       // whole-label normalize
const name = ens_normalize(`${label}.${state.parentName}`);  // whole-name normalize (rule #1)
const node = namehash(name);
console.log(`issuing ${name}  ->  ${claimant}\n  node ${node}`);

const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

const registryAbi = parseAbi([
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expires) returns (uint256)",
  "function getResolver(string label) view returns (address)",
]);
const resolverAbi = parseAbi(["function setAddr(bytes32 node, address addr_)", "function addr(bytes32 node) view returns (address)"]);

const bit = (n) => 1n << BigInt(n);
const withAdmin = (n) => bit(n) | (bit(n) << 128n);
const SUBNAME_OWNER_ROLES = [12, 16, 20, 24].reduce((a, n) => a | withAdmin(n), 0n); // unregister/renew/set-subregistry/set-resolver
const expiry = BigInt(Math.floor(Date.now() / 1000) + 100 * 365 * 24 * 3600);

async function send(desc, req) { const h = await wallet.writeContract(req); console.log(`${desc}: tx ${h} — waiting...`); const r = await publicClient.waitForTransactionReceipt({ hash: h }); console.log(`${desc}: ${r.status} (gas ${r.gasUsed})`); return r; }

// Idempotent: skip issuance if this subname already has our resolver set.
const existing = await publicClient.readContract({ address: REGISTRY, abi: registryAbi, functionName: "getResolver", args: [label] });
if (existing !== "0x0000000000000000000000000000000000000000" && getAddress(existing) === RESOLVER) {
  console.log(`${name} already issued (resolver set) — skipping register/setAddr`);
} else {
  // 1) register the subname in our registry
  const regSim = await publicClient.simulateContract({ account, address: REGISTRY, abi: registryAbi, functionName: "register", args: [label, claimant, "0x0000000000000000000000000000000000000000", RESOLVER, SUBNAME_OWNER_ROLES, expiry] });
  console.log(`subname tokenId ${regSim.result}`);
  await send("register subname", regSim.request);

  // 2) set the ETH address record on our resolver
  const addrSim = await publicClient.simulateContract({ account, address: RESOLVER, abi: resolverAbi, functionName: "setAddr", args: [node, claimant] });
  await send("setAddr", addrSim.request);
}

// 3a) direct read-back from our resolver (proves the record is stored)
const stored = await publicClient.readContract({ address: RESOLVER, abi: resolverAbi, functionName: "addr", args: [node] });
console.log(`\nresolver.addr(${name}) = ${stored}  ${getAddress(stored) === claimant ? "OK ✓" : "*** MISMATCH ***"}`);

// 3b) end-to-end resolution through UniversalResolverV2 (the real proof)
const resolved = await publicClient.getEnsAddress({ name, universalResolverAddress: UR });
const ok = resolved && getAddress(resolved) === claimant;
console.log(`UniversalResolverV2 resolves ${name} = ${resolved}  ${ok ? "OK ✓" : "*** MISMATCH ***"}`);
if (!ok) process.exit(1);
