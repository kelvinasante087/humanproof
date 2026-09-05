// Day 4 FLOOR, step 2 — register the parent humanproof.eth on the Sepolia ETH Registrar,
// owned by the FOUNDER wallet, pointed at our registry + resolver in the same call.
//
// Run:  node --env-file=.env.local scripts/ens/02-register-parent.mjs
//
// Commit/reveal: mint MockUSDC (free) -> approve -> makeCommitment -> commit -> wait for
// maturity -> register. The worker signs & pays gas + fee; `owner` is the founder wallet.
// Every state-changing call is simulated first; register is polled via simulate until the
// commitment matures (no wasted gas on "commitment too new").
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createPublicClient, createWalletClient, http, getAddress, parseAbi, formatUnits, decodeEventLog } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const PK = process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY;
if (!PK) { console.error("Missing SEPOLIA_DEPLOYER_PRIVATE_KEY"); process.exit(1); }
const account = privateKeyToAccount(PK);

const depAll = JSON.parse(readFileSync(new URL("../../lib/ens/deployments.sepolia.json", import.meta.url)));
const dep = depAll.contracts;
const REGISTRAR = getAddress(dep.ETHRegistrar);
const USDC = getAddress(dep.MockUSDC);

const STATE_PATH = new URL("../../lib/ens/humanproof.sepolia.json", import.meta.url);
const state = JSON.parse(readFileSync(STATE_PATH));
const saveState = () => writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");

const OWNER = getAddress(state.owner);
const RESOLVER = getAddress(state.resolver);
const REGISTRY = getAddress(state.registry);
const LABEL = "humanproof"; // parent = humanproof.eth
const DURATION = 31536000n; // 1 year
const ZERO32 = "0x" + "0".repeat(64);

const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

const registrarAbi = parseAbi([
  "function isAvailable(string label) view returns (bool)",
  "function getRegisterPrice(string label, uint64 duration, address paymentToken) view returns (uint256 base, uint256 premium)",
  "function makeCommitment(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer) pure returns (bytes32)",
  "function commit(bytes32 commitment)",
  "function register(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer) returns (uint256)",
  "event NameRegistered(uint256 indexed tokenId, string label, address owner, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 indexed referrer, uint256 base, uint256 premium)",
]);
const usdcAbi = parseAbi([
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function send(desc, req) { const h = await wallet.writeContract(req); console.log(`${desc}: tx ${h} — waiting...`); const r = await publicClient.waitForTransactionReceipt({ hash: h }); console.log(`${desc}: ${r.status} (gas ${r.gasUsed})`); return r; }

if (state.parentTokenId) { console.log(`Parent already registered (tokenId ${state.parentTokenId}) — nothing to do.`); process.exit(0); }

const available = await publicClient.readContract({ address: REGISTRAR, abi: registrarAbi, functionName: "isAvailable", args: [LABEL] });
console.log(`isAvailable(${LABEL}) = ${available}`);
if (!available) { console.error(`${LABEL}.eth is not available on this deployment — pick another parent label.`); process.exit(1); }

const [base, premium] = await publicClient.readContract({ address: REGISTRAR, abi: registrarAbi, functionName: "getRegisterPrice", args: [LABEL, DURATION, USDC] });
const total = base + premium;
console.log(`price: ${formatUnits(total, 6)} USDC (base ${base}, premium ${premium})`);

// Mint MockUSDC if short
const bal = await publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: "balanceOf", args: [account.address] });
if (bal < total) {
  const mintAmount = 1000n * 10n ** 6n; // 1000 USDC, freely mintable mock
  const sim = await publicClient.simulateContract({ account, address: USDC, abi: usdcAbi, functionName: "mint", args: [account.address, mintAmount] });
  await send("mint MockUSDC", sim.request);
} else { console.log(`MockUSDC balance ${formatUnits(bal, 6)} — enough`); }

// Approve registrar if needed
const allowance = await publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: "allowance", args: [account.address, REGISTRAR] });
if (allowance < total) {
  const sim = await publicClient.simulateContract({ account, address: USDC, abi: usdcAbi, functionName: "approve", args: [REGISTRAR, 1000n * 10n ** 6n] });
  await send("approve registrar", sim.request);
} else { console.log(`allowance ${formatUnits(allowance, 6)} — enough`); }

// Commit
const secret = ("0x" + randomBytes(32).toString("hex"));
const commitArgs = [LABEL, OWNER, secret, REGISTRY, RESOLVER, DURATION, ZERO32];
const commitment = await publicClient.readContract({ address: REGISTRAR, abi: registrarAbi, functionName: "makeCommitment", args: commitArgs });
console.log(`commitment ${commitment}`);
const commitSim = await publicClient.simulateContract({ account, address: REGISTRAR, abi: registrarAbi, functionName: "commit", args: [commitment] });
await send("commit", commitSim.request);

// Poll register via simulate until the commitment matures
const registerArgs = [LABEL, OWNER, secret, REGISTRY, RESOLVER, DURATION, USDC, ZERO32];
let regSim = null;
for (let i = 0; i < 12; i++) {
  await sleep(i === 0 ? 60000 : 12000); // min commitment age ~60s
  try {
    regSim = await publicClient.simulateContract({ account, address: REGISTRAR, abi: registrarAbi, functionName: "register", args: registerArgs });
    console.log(`register ready after ~${60 + i * 12}s (tokenId ${regSim.result})`);
    break;
  } catch (e) {
    const msg = e.shortMessage || e.message || "";
    if (/insufficient|allowance|balance|NotAvailable|isAvailable|Unauthorized/i.test(msg)) { console.error("register blocked:", msg); process.exit(1); }
    console.log(`  not mature yet (attempt ${i + 1}): ${msg.slice(0, 70)}`);
  }
}
if (!regSim) { console.error("commitment never matured"); process.exit(1); }

const receipt = await send("register", regSim.request);
let tokenId = regSim.result;
for (const log of receipt.logs) {
  try { const d = decodeEventLog({ abi: registrarAbi, data: log.data, topics: log.topics }); if (d.eventName === "NameRegistered") { tokenId = d.args.tokenId; console.log(`NameRegistered: owner=${d.args.owner} subregistry=${d.args.subregistry} resolver=${d.args.resolver}`); } } catch { /* skip */ }
}
state.parentTokenId = tokenId.toString();
state.parentRegisteredTx = receipt.transactionHash;
saveState();

const nowAvail = await publicClient.readContract({ address: REGISTRAR, abi: registrarAbi, functionName: "isAvailable", args: [LABEL] });
console.log(`\n${LABEL}.eth registered. tokenId ${state.parentTokenId}. isAvailable now = ${nowAvail} (should be false).`);
