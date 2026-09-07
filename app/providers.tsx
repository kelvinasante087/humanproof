"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base, baseSepolia } from "viem/chains";
import { HumanSessionProvider } from "@/components/human-session";

/**
 * Privy wraps the whole app: email login + an embedded wallet created
 * invisibly on first login (no password, no seed phrase). The wallet is an
 * identity anchor on Base, not a spend feature — it stays empty.
 *
 * If the App ID isn't set yet (e.g. first deploy before the Privy dashboard
 * app exists), we render children without the provider so the site still
 * builds and deploys; the UI shows a "connect Privy" notice instead of login.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    // No Privy app yet: still share the HumanProof session state so pages render consistently.
    return <HumanSessionProvider>{children}</HumanSessionProvider>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email"],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          showWalletUIs: false,
        },
        // Base Sepolia is where the seal and the PROOF airdrop live, so the embedded wallet
        // defaults there and the demo payout shows a real testnet balance change. Base (mainnet)
        // stays supported as the identity-anchor chain.
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia, base],
        appearance: {
          theme: "light",
          accentColor: "#4f46e5",
        },
      }}
    >
      {/* Shared "Sign in with HumanProof" session state, available to every route under Privy. */}
      <HumanSessionProvider>{children}</HumanSessionProvider>
    </PrivyProvider>
  );
}
