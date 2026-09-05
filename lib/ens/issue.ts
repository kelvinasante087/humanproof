// Server-side subname issuance — the exact flow proven in scripts/ens/03, callable per user.
// The worker signs: register <label>.humanproof.eth in our registry, then set its addr record.
import { getAddress, namehash, isAddress } from "viem";
import {
  publicClient, getWalletClient, ADDR, PARENT_NAME, ZERO_ADDR,
  registryAbi, resolverAbi, SUBNAME_OWNER_ROLES,
} from "./config";
import { normalizeSubname, InvalidEnsNameError } from "./normalize";

const FAR_FUTURE = () => BigInt(Math.floor(Date.now() / 1000) + 100 * 365 * 24 * 3600);

export type IssueResult = { name: string; label: string; owner: string; alreadyIssued: boolean };

/** Issue <rawLabel>.humanproof.eth to ownerAddr. Idempotent for the same owner. */
export async function issueSubname(rawLabel: string, ownerAddr: string): Promise<IssueResult> {
  if (!isAddress(ownerAddr)) throw new InvalidEnsNameError("A valid wallet address is required.");
  const owner = getAddress(ownerAddr);
  const { name, label } = normalizeSubname(rawLabel, PARENT_NAME);
  const node = namehash(name);

  // If already issued to this same owner, treat as success (idempotent re-claim).
  const existingResolver = await publicClient.readContract({ address: ADDR.registry, abi: registryAbi, functionName: "getResolver", args: [label] });
  if (existingResolver !== ZERO_ADDR && getAddress(existingResolver) === ADDR.resolver) {
    const current = await publicClient.readContract({ address: ADDR.resolver, abi: resolverAbi, functionName: "addr", args: [node] });
    if (isAddress(current) && getAddress(current) === owner) return { name, label, owner, alreadyIssued: true };
    throw new InvalidEnsNameError("That name is already taken.");
  }

  const wallet = getWalletClient();
  const account = wallet.account;

  const regSim = await publicClient.simulateContract({ account, address: ADDR.registry, abi: registryAbi, functionName: "register", args: [label, owner, ZERO_ADDR, ADDR.resolver, SUBNAME_OWNER_ROLES, FAR_FUTURE()] });
  const regHash = await wallet.writeContract(regSim.request);
  await publicClient.waitForTransactionReceipt({ hash: regHash });

  const addrSim = await publicClient.simulateContract({ account, address: ADDR.resolver, abi: resolverAbi, functionName: "setAddr", args: [node, owner] });
  const addrHash = await wallet.writeContract(addrSim.request);
  await publicClient.waitForTransactionReceipt({ hash: addrHash });

  return { name, label, owner, alreadyIssued: false };
}

/** Resolve a name through UniversalResolverV2 (the working resolver on this deployment). */
export async function resolveName(name: string): Promise<string | null> {
  return publicClient.getEnsAddress({ name, universalResolverAddress: ADDR.universalResolver });
}
