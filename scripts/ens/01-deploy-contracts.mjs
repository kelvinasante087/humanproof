// Day 4 FLOOR, step 1 — deploy HumanProof's own ENS v2 resolver + subname registry
// as CREATE2 proxies via the VerifiableFactory, on Sepolia.
//
// Run:  node --env-file=.env.local scripts/ens/01-deploy-contracts.mjs
//
// Signer: the worker/deployer key (SEPOLIA_DEPLOYER_PRIVATE_KEY). The worker is the
// operational admin of these two infra contracts. The parent NAME humanproof.eth is
// registered to the founder's wallet in step 2 — this step only stands up infra.
//
// Every address is read from the on-chain-verified lib/ens/deployments.sepolia.json.
// Every call is simulated first (catches reverts before spending gas), per our rule.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  createPublicClient, createWalletClient, http, getAddress, parseAbi,
  encodeFunctionData, decodeEventLog,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const PK = process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY;
if (!PK) { console.error("Missing SEPOLIA_DEPLOYER_PRIVATE_KEY in .env.local"); process.exit(1); }
const account = privateKeyToAccount(PK);

const OWNER = getAddress("0x90281186c99eac22825f60081f19a85e944779c4"); // founder wallet — owns the name
const PARENT = "humanproof.eth";

const dep = JSON.parse(readFileSync(new URL("../../lib/ens/deployments.sepolia.json", import.meta.url))).contracts;
const FACTORY = getAddress(dep.VerifiableFactory);
const RESOLVER_IMPL = getAddress(dep.PermissionedResolverImpl);
const REGISTRY_IMPL = getAddress(dep.UserRegistryImpl);

const STATE_PATH = new URL("../../lib/ens/humanproof.sepolia.json", import.meta.url);
const state = existsSync(STATE_PATH)
  ? JSON.parse(readFileSync(STATE_PATH))
  : { network: "sepolia", chainId: 11155111, worker: account.address, owner: OWNER, parentName: PARENT };
const saveState = () => writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");

const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

// --- role bitmaps (verified from RegistryRolesLib + PermissionedResolverLib) ---
const bit = (n) => 1n << BigInt(n);
const withAdmin = (n) => bit(n) | (bit(n) << 128n); // base role + its <<128 admin
// Resolver: ROLE_SET_ADDR=1<<0, ROLE_SET_TEXT=1<<4
const RESOLVER_ROLES = withAdmin(0) | withAdmin(4);
// Registry: ROLE_REGISTRAR=1<<0, ROLE_UNREGISTER=1<<12, ROLE_RENEW=1<<16, ROLE_SET_SUBREGISTRY=1<<20, ROLE_SET_RESOLVER=1<<24
const REGISTRY_ROLES = [0, 12, 16, 20, 24].reduce((a, n) => a | withAdmin(n), 0n);

const factoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data) returns (address)",
  "event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)",
]);
const resolverInitAbi = parseAbi(["function initialize(address admin, uint256 roleBitmap, bytes[] setters)"]);
const registryInitAbi = parseAbi(["function initialize(address rootAccount, uint256 roleBitmap)"]);

async function deployProxy(label, impl, salt, initData) {
  if (state[label]) { console.log(`${label}: already at ${state[label]} — skipping`); return; }
  const sim = await publicClient.simulateContract({
    account, address: FACTORY, abi: factoryAbi, functionName: "deployProxy", args: [impl, salt, initData],
  });
  console.log(`${label}: predicted ${sim.result}`);
  const hash = await wallet.writeContract(sim.request);
  console.log(`${label}: tx ${hash} — waiting for receipt...`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  let proxy = sim.result;
  for (const log of receipt.logs) {
    try {
      const d = decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics });
      if (d.eventName === "ProxyDeployed") proxy = d.args.proxyAddress;
    } catch { /* not our event */ }
  }
  console.log(`${label}: deployed ${getAddress(proxy)} (status ${receipt.status}, gas ${receipt.gasUsed})`);
  state[label] = getAddress(proxy);
  saveState();
}

console.log("worker/deployer:", account.address);
await deployProxy("resolver", RESOLVER_IMPL, 1n,
  encodeFunctionData({ abi: resolverInitAbi, functionName: "initialize", args: [account.address, RESOLVER_ROLES, []] }));
await deployProxy("registry", REGISTRY_IMPL, 2n,
  encodeFunctionData({ abi: registryInitAbi, functionName: "initialize", args: [account.address, REGISTRY_ROLES] }));

for (const k of ["resolver", "registry"]) {
  const code = await publicClient.getCode({ address: getAddress(state[k]) });
  console.log(`verify ${k}: ${state[k]} ${code && code !== "0x" ? "OK (" + ((code.length - 2) / 2) + "b)" : "*** NO CODE ***"}`);
}
console.log("\nstate:", JSON.stringify(state, null, 2));
