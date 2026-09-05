// Day 4 STRETCH — prove the on-chain gate. With an issuer-signed humanity voucher:
//   (1) a valid claim mints <label>.humanproof.eth and it resolves;
//   (2) reusing the same human's nullifier reverts NullifierAlreadyUsed;
//   (3) a voucher NOT signed by the issuer reverts InvalidSignature.
// Fresh labels/nullifiers per run, so it's safely re-runnable.
//
// Run:  node --env-file=.env.local scripts/ens/05-test-registrar.mjs
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, getAddress, parseAbi, keccak256, toBytes, ContractFunctionRevertedError } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ens_normalize } from "@adraffy/ens-normalize";

const RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const worker = privateKeyToAccount(process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY);
const issuerAcc = privateKeyToAccount(process.env.HUMANPROOF_ISSUER_PRIVATE_KEY);
const state = JSON.parse(readFileSync(new URL("../../lib/ens/humanproof.sepolia.json", import.meta.url)));
const dep = JSON.parse(readFileSync(new URL("../../lib/ens/deployments.sepolia.json", import.meta.url))).contracts;
const REGISTRAR = getAddress(state.registrar);
const UR = getAddress(dep.UniversalResolverV2);

const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wallet = createWalletClient({ account: worker, chain: sepolia, transport: http(RPC) });
const claimAbi = parseAbi([
  "function claim(string label, address claimant, uint256 nullifierHash, uint256 deadline, bytes signature) returns (uint256)",
  "function usedNullifier(uint256) view returns (bool)",
  "error NullifierAlreadyUsed()",
  "error InvalidSignature()",
  "error VoucherExpired()",
]);

const domain = { name: "HumanProof", version: "1", chainId: 11155111, verifyingContract: REGISTRAR };
const types = { Claim: [{ name: "claimant", type: "address" }, { name: "labelHash", type: "bytes32" }, { name: "nullifierHash", type: "uint256" }, { name: "deadline", type: "uint256" }] };
function revertName(e) {
  let name;
  try { e.walk?.((err) => { if (err instanceof ContractFunctionRevertedError) { name = err.data?.errorName ?? err.reason; return true; } return false; }); } catch { /* ignore */ }
  return name;
}
const sign = (signer, label, claimant, nullifierHash, deadline) =>
  signer.signTypedData({ domain, types, primaryType: "Claim", message: { claimant, labelHash: keccak256(toBytes(label)), nullifierHash, deadline } });

const claimant = getAddress(state.owner);
const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
const rid = Date.now().toString(36);
const L1 = ens_normalize("t" + rid + "a"), L2 = ens_normalize("t" + rid + "b"), L3 = ens_normalize("t" + rid + "c");
const N1 = BigInt(keccak256(toBytes(rid + "-n1"))), N2 = BigInt(keccak256(toBytes(rid + "-n2")));

// (1) valid claim -> mint + resolve
const sig1 = await sign(issuerAcc, L1, claimant, N1, deadline);
const sim1 = await publicClient.simulateContract({ account: worker, address: REGISTRAR, abi: claimAbi, functionName: "claim", args: [L1, claimant, N1, deadline, sig1] });
const r1 = await publicClient.waitForTransactionReceipt({ hash: await wallet.writeContract(sim1.request) });
console.log(`(1) valid claim ${L1}.humanproof.eth: ${r1.status} (gas ${r1.gasUsed})`);
const resolved = await publicClient.getEnsAddress({ name: `${L1}.${state.parentName}`, universalResolverAddress: UR });
console.log(`    resolves = ${resolved}  ${resolved && getAddress(resolved) === claimant ? "OK ✓" : "*** MISMATCH ***"}`);
console.log(`    usedNullifier(N1) = ${await publicClient.readContract({ address: REGISTRAR, abi: claimAbi, functionName: "usedNullifier", args: [N1] })} (expect true)`);

// (2) reuse the SAME nullifier for a different name -> NullifierAlreadyUsed
const sig2 = await sign(issuerAcc, L2, claimant, N1, deadline);
try {
  await publicClient.simulateContract({ account: worker, address: REGISTRAR, abi: claimAbi, functionName: "claim", args: [L2, claimant, N1, deadline, sig2] });
  console.log("(2) GATE FAIL: reused nullifier did NOT revert");
} catch (e) { console.log(`(2) reuse nullifier -> ${revertName(e) === "NullifierAlreadyUsed" ? "NullifierAlreadyUsed ✓ (one human, one name)" : "reverted (" + (revertName(e) || "unknown") + ")"}`); }

// (3) voucher signed by the WRONG key (worker, not issuer) -> InvalidSignature
const badSig = await sign(worker, L3, claimant, N2, deadline);
try {
  await publicClient.simulateContract({ account: worker, address: REGISTRAR, abi: claimAbi, functionName: "claim", args: [L3, claimant, N2, deadline, badSig] });
  console.log("(3) GATE FAIL: non-issuer signature did NOT revert");
} catch (e) { console.log(`(3) non-issuer signature -> ${revertName(e) === "InvalidSignature" ? "InvalidSignature ✓ (only our attestation counts)" : "reverted (" + (revertName(e) || "unknown") + ")"}`); }
