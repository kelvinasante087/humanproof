// Day 6 — compile + deploy ProofToken (PROOF) to Base Sepolia, the demo airdrop token. Writes the
// deployed address into lib/airdrop/proof.baseSepolia.json, which the airdrop app reads.
//
// Prereqs: the deployer address must hold Base Sepolia test ETH (faucet) — the SAME funding that
// unblocks the attest contract. RPC defaults to the public Base Sepolia endpoint; override SEAL_RPC_URL.
//
// Run:  node --env-file=.env.local scripts/airdrop/01-deploy-proof.mjs
import { readFileSync, writeFileSync } from "node:fs";
import solc from "solc";
import { createPublicClient, createWalletClient, http, getAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const RPC = process.env.SEAL_RPC_URL || baseSepolia.rpcUrls.default.http[0];
const pk = process.env.SEAL_WORKER_PRIVATE_KEY || process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY;
if (!pk) {
  console.error("Missing SEAL_WORKER_PRIVATE_KEY (or SEPOLIA_DEPLOYER_PRIVATE_KEY)");
  process.exit(1);
}
const account = privateKeyToAccount(pk);

const STATE_PATH = new URL("../../lib/airdrop/proof.baseSepolia.json", import.meta.url);
const state = JSON.parse(readFileSync(STATE_PATH));

// --- compile ---
const source = readFileSync(new URL("../../contracts/ProofToken.sol", import.meta.url), "utf8");
const input = {
  language: "Solidity",
  sources: { "ProofToken.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
const errs = (out.errors || []).filter((e) => e.severity === "error");
if (errs.length) {
  console.error("Solc errors:\n" + errs.map((e) => e.formattedMessage).join("\n"));
  process.exit(1);
}
const artifact = out.contracts["ProofToken.sol"]["ProofToken"];
const bytecode = "0x" + artifact.evm.bytecode.object;
console.log(`compiled OK — bytecode ${(bytecode.length - 2) / 2} bytes`);

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

const bal = await publicClient.getBalance({ address: account.address });
console.log(`deployer ${account.address} — balance ${bal} wei on Base Sepolia`);
if (bal === 0n) {
  console.error("Deployer has 0 Base Sepolia ETH. Fund it from a Base Sepolia faucet, then re-run.");
  process.exit(1);
}

if (state.token) {
  console.log(`already deployed at ${state.token} — nothing to do`);
  process.exit(0);
}

const hash = await wallet.deployContract({ abi: artifact.abi, bytecode, args: [] });
console.log(`deploy tx ${hash} — waiting...`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const address = getAddress(receipt.contractAddress);
console.log(`ProofToken deployed ${address} (${receipt.status}, gas ${receipt.gasUsed})`);

state.token = address;
state.deployer = account.address;
writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
console.log("\nstate:", JSON.stringify(state, null, 2));
console.log(`\nExplorer: https://sepolia.basescan.org/address/${address}`);
