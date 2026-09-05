// Day 4 STRETCH — compile + deploy HumanProofRegistrar, then grant it the two on-chain
// permissions it needs: ROLE_REGISTRAR on our registry (to mint subnames) and ROLE_SET_ADDR
// on our resolver (to set the address record). The worker (registry/resolver root) signs the grants.
//
// Run:  node --env-file=.env.local scripts/ens/04-deploy-registrar.mjs
import { readFileSync, writeFileSync } from "node:fs";
import solc from "solc";
import { createPublicClient, createWalletClient, http, getAddress, parseAbi, namehash } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const account = privateKeyToAccount(process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY);
const issuerPk = process.env.HUMANPROOF_ISSUER_PRIVATE_KEY;
if (!issuerPk) { console.error("Missing HUMANPROOF_ISSUER_PRIVATE_KEY"); process.exit(1); }
const issuer = privateKeyToAccount(issuerPk).address;

const STATE_PATH = new URL("../../lib/ens/humanproof.sepolia.json", import.meta.url);
const state = JSON.parse(readFileSync(STATE_PATH));
const REGISTRY = getAddress(state.registry);
const RESOLVER = getAddress(state.resolver);
const parentNode = namehash(state.parentName);

const bit = (n) => 1n << BigInt(n);
const withAdmin = (n) => bit(n) | (bit(n) << 128n);
const SUBNAME_OWNER_ROLES = [12, 16, 20, 24].reduce((a, n) => a | withAdmin(n), 0n);
const ROLE_REGISTRAR = bit(0); // RegistryRolesLib.ROLE_REGISTRAR
const ROLE_SET_ADDR = bit(0);  // PermissionedResolverLib.ROLE_SET_ADDR

// --- compile ---
const source = readFileSync(new URL("../../contracts/HumanProofRegistrar.sol", import.meta.url), "utf8");
const input = { language: "Solidity", sources: { "HumanProofRegistrar.sol": { content: source } }, settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } };
const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errs = (out.errors || []).filter((e) => e.severity === "error");
if (errs.length) { console.error("Solc errors:\n" + errs.map((e) => e.formattedMessage).join("\n")); process.exit(1); }
const artifact = out.contracts["HumanProofRegistrar.sol"]["HumanProofRegistrar"];
const abi = artifact.abi;
const bytecode = "0x" + artifact.evm.bytecode.object;
console.log(`compiled OK — bytecode ${(bytecode.length - 2) / 2} bytes`);

const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });
const saveState = () => writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
async function send(desc, req) { const h = await wallet.writeContract(req); console.log(`${desc}: tx ${h} — waiting...`); const r = await publicClient.waitForTransactionReceipt({ hash: h }); console.log(`${desc}: ${r.status} (gas ${r.gasUsed})`); return r; }

// --- deploy ---
let registrar = state.registrar;
if (!registrar) {
  console.log(`issuer ${issuer}\nparentNode ${parentNode}`);
  const hash = await wallet.deployContract({ abi, bytecode, args: [REGISTRY, RESOLVER, parentNode, issuer, SUBNAME_OWNER_ROLES] });
  console.log(`deploy tx ${hash} — waiting...`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  registrar = getAddress(receipt.contractAddress);
  console.log(`HumanProofRegistrar deployed ${registrar} (${receipt.status}, gas ${receipt.gasUsed})`);
  state.registrar = registrar;
  state.issuer = issuer;
  saveState();
} else { console.log(`registrar already deployed ${registrar}`); }

// --- grant the registrar its two roles (idempotent-ish; logs if already granted) ---
const grantAbi = parseAbi(["function grantRootRoles(uint256 roleBitmap, address account) returns (bool)"]);
for (const [desc, target, role] of [["ROLE_REGISTRAR on registry", REGISTRY, ROLE_REGISTRAR], ["ROLE_SET_ADDR on resolver", RESOLVER, ROLE_SET_ADDR]]) {
  try {
    const sim = await publicClient.simulateContract({ account, address: target, abi: grantAbi, functionName: "grantRootRoles", args: [role, registrar] });
    await send(`grant ${desc}`, sim.request);
  } catch (e) { console.log(`grant ${desc}: ${(e.shortMessage || e.message || "").slice(0, 120)}`); }
}

console.log("\nstate:", JSON.stringify(state, null, 2));
