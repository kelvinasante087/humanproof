"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { CheckCircle2 } from "lucide-react";
import { AvatarPicker } from "@/components/avatar-context";
import {
  CredentialColorwayPicker,
  credentialColorways,
  type CredentialColorway,
} from "@/components/credential-card";
import { useHumanSession } from "@/components/human-session";
import { AccountPageShell, AccountRow, AccountTile } from "@/components/account-page-shell";

export default function SettingsPage() {
  const { user } = usePrivy();
  const { name } = useHumanSession();
  const [cardColorway, setCardColorway] = useState<CredentialColorway>(() => {
    if (typeof window === "undefined") return "charcoal";
    const saved = window.localStorage.getItem("humanproof-card-colorway");
    return saved && saved in credentialColorways ? (saved as CredentialColorway) : "charcoal";
  });

  const email = typeof user?.email?.address === "string" ? user.email.address : null;
  const wallet = user?.wallet?.address ?? null;
  const hasPasskey = user?.linkedAccounts?.some((account) => account.type === "passkey") ?? false;

  function chooseColorway(colorway: CredentialColorway) {
    setCardColorway(colorway);
    window.localStorage.setItem("humanproof-card-colorway", colorway);
  }

  return (
    <AccountPageShell
      title="Settings"
      description="Personalize your credential and review the account details connected to it."
    >
      <AccountTile>
        <AvatarPicker />
      </AccountTile>

      <AccountTile>
        <CredentialColorwayPicker value={cardColorway} onChange={chooseColorway} />
        <p className="mt-4 text-xs leading-relaxed text-white">
          Card theme is stored on this device and applied to your Credential tab.
        </p>
      </AccountTile>

      <AccountTile>
        <h2 className="font-heading text-lg text-white">Account details</h2>
        <div className="mt-1">
          <AccountRow label="ENS name">{name ?? "Not issued"}</AccountRow>
          <AccountRow label="Email">{email ?? "Not linked"}</AccountRow>
          <AccountRow label="Embedded wallet">
            <span className="break-all font-mono text-xs text-white">{wallet ?? "Preparing wallet…"}</span>
          </AccountRow>
          <AccountRow label="Passkey" last>
            <span className="inline-flex items-center gap-1.5 text-white">
              <CheckCircle2 className="h-4 w-4" /> {hasPasskey ? "Active" : "Not added"}
            </span>
          </AccountRow>
        </div>
      </AccountTile>
    </AccountPageShell>
  );
}
