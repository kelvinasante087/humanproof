"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { base, baseSepolia } from "viem/chains";
import { HumanSessionProvider } from "@/components/human-session";
import { OnboardingModalProvider } from "@/components/onboarding-modal";

import { Toaster } from "sonner";

/**
 * Runs INSIDE PrivyProvider so it can hand the session provider a way to prove which Privy account
 * this browser is. That's what keeps your identity (and your name) on screen after the short-lived
 * World verification session expires.
 */
function PrivyBoundHumanSession({ children }: { children: React.ReactNode }) {
  const { getAccessToken, ready, authenticated, user } = usePrivy();
  // Re-ask `/api/session` whenever the Privy auth state settles or switches account — the very
  // first fetch often lands before Privy is ready, when no token exists yet.
  const authKey = `${ready}:${authenticated}:${user?.id ?? ""}`;
  return (
    <HumanSessionProvider getAccessToken={getAccessToken} authKey={authKey}>
      {children}
    </HumanSessionProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <HumanSessionProvider>
        <OnboardingModalProvider>
          {children}
          <Toaster theme="dark" position="bottom-right" richColors />
        </OnboardingModalProvider>
      </HumanSessionProvider>
    );
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
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia, base],
        appearance: {
          theme: "dark",
          accentColor: "#2dd4bf",
        },
      }}
    >
      <PrivyBoundHumanSession>
        <OnboardingModalProvider>
          {children}
          <Toaster theme="dark" position="bottom-right" richColors />
        </OnboardingModalProvider>
      </PrivyBoundHumanSession>
    </PrivyProvider>
  );
}

