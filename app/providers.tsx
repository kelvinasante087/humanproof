"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";

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
    return <>{children}</>;
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
        defaultChain: base,
        supportedChains: [base],
        appearance: {
          theme: "light",
          accentColor: "#4f46e5",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
