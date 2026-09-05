// Server-side ENS v2 config: clients, addresses, ABIs, roles. Reads the worker key
// (SEPOLIA_DEPLOYER_PRIVATE_KEY) — import ONLY from server code (API routes), never client.
import { createPublicClient, createWalletClient, http, getAddress, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import deployments from "./deployments.sepolia.json";
import state from "./humanproof.sepolia.json";

const RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

/** On-chain-verified addresses (see deployments.sepolia.json + FEEDBACK.md). */
export const ADDR = {
  registry: getAddress(state.registry),
  resolver: getAddress(state.resolver),
  // Resolve through UniversalResolverV2 — the vanity/Managed UR proxies revert on this deployment.
  universalResolver: getAddress(deployments.contracts.UniversalResolverV2),
} as const;

export const PARENT_NAME = state.parentName; // "humanproof.eth"
export const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

export const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC) });

/** Worker/deployer wallet client — the operational signer. Server-only. */
export function getWalletClient() {
  const pk = process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("SEPOLIA_DEPLOYER_PRIVATE_KEY is not set");
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({ account, chain: sepolia, transport: http(RPC) });
}

export const registryAbi = parseAbi([
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expires) returns (uint256)",
  "function getResolver(string label) view returns (address)",
]);
export const resolverAbi = parseAbi([
  "function setAddr(bytes32 node, address addr_)",
  "function addr(bytes32 node) view returns (address)",
]);

// Roles granted to a subname owner (RegistryRolesLib): unregister/renew/set-subregistry/set-resolver + admins.
const bit = (n: number) => BigInt(1) << BigInt(n);
const withAdmin = (n: number) => bit(n) | (bit(n) << BigInt(128));
export const SUBNAME_OWNER_ROLES = [12, 16, 20, 24].reduce((a, n) => a | withAdmin(n), BigInt(0));
