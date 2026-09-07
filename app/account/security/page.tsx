"use client";

import Link from "next/link";
import { useState } from "react";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";
import { CheckCircle2, Fingerprint, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { useHumanSession } from "@/components/human-session";
import {
  AccountPageShell,
  AccountRow,
  AccountTile,
  ComingSoon,
} from "@/components/account-page-shell";

export default function SecurityPage() {
  const { user } = usePrivy();
  const { linkPasskey } = useLinkAccount();
  const { verified } = useHumanSession();
  const [linking, setLinking] = useState(false);

  const passkeys = user?.linkedAccounts?.filter((account) => account.type === "passkey") ?? [];
  const hasPasskey = passkeys.length > 0;
  const email = typeof user?.email?.address === "string" ? user.email.address : null;
  const wallet = user?.wallet?.address ?? null;
  const linkedMethods = [hasPasskey ? "Passkey" : null, email ? "Email" : null]
    .filter(Boolean)
    .join(" + ") || "Privy account";

  function addPasskey() {
    setLinking(true);
    linkPasskey({ name: hasPasskey ? "HumanProof device" : "HumanProof passkey" });
    window.setTimeout(() => setLinking(false), 1200);
  }

  return (
    <AccountPageShell
      title="Security & Passkeys"
      description="The security behind your reusable human credential — your sign-in methods, embedded wallet, and World ID state."
    >
      <div className="border-t border-white/20">
        <AccountTile>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center text-white">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-xl text-white">Passkey</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                    {hasPasskey ? "● Active" : "○ None"}
                  </span>
                </div>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-white">
                  Bound to your device via passkey — one tap, no passwords.
                </p>
                {hasPasskey && (
                  <p className="mt-2 text-xs text-white">
                    {passkeys.length} passkey {passkeys.length === 1 ? "device" : "devices"} linked in Privy.
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={addPasskey}
              disabled={linking}
              className="inline-flex shrink-0 items-center justify-center gap-2 border-b border-white/50 px-0 py-2 text-xs font-semibold text-white transition hover:border-white disabled:opacity-50"
            >
              <Smartphone className="h-4 w-4" />
              {linking ? "Opening Privy…" : hasPasskey ? "Add another device" : "Add passkey"}
            </button>
          </div>
        </AccountTile>

        <AccountTile>
          <div className="mb-1 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-white" />
            <h2 className="font-heading text-lg text-white">Account access</h2>
          </div>
          <AccountRow label="Linked sign-in methods">
            {linkedMethods}
          </AccountRow>
          {email && <AccountRow label="Email">{email}</AccountRow>}
          <AccountRow label="Embedded wallet" last>
            <span className="break-all font-mono text-xs text-white">{wallet ?? "Preparing wallet…"}</span>
          </AccountRow>
        </AccountTile>

        <AccountTile>
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg text-white">Humanity</h2>
                  <p className="mt-1 text-sm text-white">World ID proves one unique human without exposing who you are.</p>
                </div>
                {verified ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                    <CheckCircle2 className="h-4 w-4" /> Verified
                  </span>
                ) : (
                  <Link href="/" className="border-b border-white/50 px-0 py-2 text-xs font-semibold text-white hover:border-white">
                    Re-verify World ID
                  </Link>
                )}
              </div>
              {verified && (
                <p className="mt-4 text-xs text-white">
                  If this HumanProof session lapses, return to the landing page to re-verify.
                </p>
              )}
            </div>
          </div>
        </AccountTile>

        <AccountTile className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg text-white">Sign out of all devices</h2>
            <p className="mt-1 text-sm text-white">Revoke every active HumanProof session at once.</p>
          </div>
          <ComingSoon />
        </AccountTile>
      </div>
    </AccountPageShell>
  );
}
