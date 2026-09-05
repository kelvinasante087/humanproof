"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginCard } from "@/components/login-card";
import { WorldVerify } from "@/components/world-verify";
import { PasskeyStep } from "@/components/passkey-step";
import { NameStep } from "@/components/name-step";

const privyConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">HumanProof</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Prove a real, unique human did something — sealed onchain, without
          storing any personal data.
        </p>
      </div>

      {privyConfigured ? <AuthPanel /> : <NotConfigured />}
    </main>
  );
}

/** Uses Privy hooks — only mounted when the provider is present. */
function AuthPanel() {
  const { ready, authenticated, user, logout } = usePrivy();
  // Verify is per-session and ephemeral; the card owns the order so the passkey
  // step only unlocks once the human check has passed this session.
  const [verified, setVerified] = useState(false);

  if (!ready) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (!authenticated) {
    return <LoginCard />;
  }

  const walletAddress = user?.wallet?.address;
  const email =
    typeof user?.email?.address === "string" ? user.email.address : undefined;
  const hasPasskey =
    user?.linkedAccounts?.some((account) => account.type === "passkey") ?? false;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>You&apos;re signed in</CardTitle>
        <CardDescription>
          A private app account with an embedded wallet on Base — created for
          you invisibly.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-sm">
          {email && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{email}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Wallet</span>
            <span className="font-mono text-xs break-all">
              {walletAddress ?? "creating…"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <span className="text-sm font-medium">Prove you&apos;re human</span>
          <WorldVerify onVerified={() => setVerified(true)} />
        </div>

        <PasskeyStep unlocked={verified} />

        <NameStep unlocked={verified && hasPasskey} address={walletAddress} />

        <Button variant="outline" onClick={() => logout()}>
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}

/** Shown until NEXT_PUBLIC_PRIVY_APP_ID is set in the environment. */
function NotConfigured() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Almost there</CardTitle>
        <CardDescription>
          Login isn&apos;t wired to a Privy app yet. Set{" "}
          <code className="text-xs">NEXT_PUBLIC_PRIVY_APP_ID</code> and redeploy
          to turn on email sign-in.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
