// Server-side Base Sepolia config for the native seal. Reads the worker key — import ONLY from
// server code (API routes / scripts), never client. The seal worker is the sole authorized sealer
// on HumanProofAttestations; it defaults to the Day-4 deployer key (same throwaway account, just
// funded on Base Sepolia) unless a dedicated SEAL_WORKER_PRIVATE_KEY is set.
import { createPublicClient, createWalletClient, http, getAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import state from "./attestations.baseSepolia.json";

const RPC = process.env.SEAL_RPC_URL || baseSepolia.rpcUrls.default.http[0];

/** The deployed HumanProofAttestations address, or undefined until the deploy script fills it. */
export const ATTESTATIONS = state.attestations ? getAddress(state.attestations) : undefined;

/** Base Sepolia read client. */
export const sealPublicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

/** Worker wallet client — the operational sealer. Server-only. */
export function getSealWallet() {
  const pk = process.env.SEAL_WORKER_PRIVATE_KEY || process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("SEAL_WORKER_PRIVATE_KEY (or SEPOLIA_DEPLOYER_PRIVATE_KEY) is not set");
  const account = privateKeyToAccount(pk as `0x${string}`);
  return createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
}

/** Explorer base for a Base Sepolia transaction. */
export const SEAL_EXPLORER = "https://sepolia.basescan.org";
