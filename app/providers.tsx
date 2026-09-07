"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base, baseSepolia } from "viem/chains";
import { HumanSessionProvider } from "@/components/human-session";
import { OnboardingModalProvider } from "@/components/onboarding-modal";

import { Toaster } from "sonner";

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
      <HumanSessionProvider>
        <OnboardingModalProvider>
          {children}
          <Toaster theme="dark" position="bottom-right" richColors />
        </OnboardingModalProvider>
      </HumanSessionProvider>
    </PrivyProvider>
  );
}

