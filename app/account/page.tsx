"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useHumanSession } from "@/components/human-session";
import {
  CredentialCard,
  CredentialColorwayPicker,
  credentialColorways,
  type CredentialColorway,
} from "@/components/credential-card";
import { CheckCircle2, ExternalLink, LogOut, Sparkles } from "lucide-react";

/**
 * The signed-in client home — where a verified human lands after completing (or re-syncing) their
 * credential. This is where account details live; the onboarding modal just confirms success and
 * sends people here. Details come from Privy (email, embedded wallet) + the HumanProof session
 * (ENS name, verified state). Guests are bounced to the landing page.
 */
export default function AccountPage() {
  const { ready, authenticated, user, logout } = usePrivy();
  const { verified, name } = useHumanSession();
  const router = useRouter();
  const [cardColorway, setCardColorway] = useState<CredentialColorway>(() => {
    if (typeof window === "undefined") return "charcoal";
    const saved = window.localStorage.getItem("humanproof-card-colorway");
    return saved && saved in credentialColorways ? (saved as CredentialColorway) : "charcoal";
  });

  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  const chooseColorway = (colorway: CredentialColorway) => {
    setCardColorway(colorway);
    window.localStorage.setItem("humanproof-card-colorway", colorway);
  };

  if (!ready || !authenticated) {
    return (
      <main className="min-h-screen w-full bg-black text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading your account…</p>
      </main>
    );
  }

  const email = typeof user?.email?.address === "string" ? user.email.address : undefined;
  const wallet = user?.wallet?.address;
  const hasPasskey = user?.linkedAccounts?.some((a) => a.type === "passkey") ?? false;
  const shortWallet = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "—";

  return (
    <main className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-teal-500/10 blur-[160px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium tracking-wider uppercase text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Signed in with HumanProof</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight leading-[1.1] text-white font-normal">
            {name ? name : "Your credential"}
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-xl">
            You&apos;re a verified, unique human. Your credential works across every app on the
            layer — one passkey tap, no re-verifying.
          </p>
        </div>

        {/* Credential card — the signed-in Verified Human pass */}
        <div className="flex flex-col gap-5">
          <CredentialCard
            name={name}
            wallet={wallet}
            verified={verified}
            colorway={cardColorway}
          />
          <CredentialColorwayPicker value={cardColorway} onChange={chooseColorway} />

          {/* Secondary details that don't live on the card face */}
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 text-sm">
              <span className="text-slate-400">Device bound</span>
              <span className={`font-medium flex items-center gap-1 ${hasPasskey ? "text-emerald-400" : "text-slate-500"}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {hasPasskey ? "Passkey active" : "No passkey"}
              </span>
            </div>
            {email && (
              <div className="flex items-center justify-between border-b border-white/10 pb-4 text-sm">
                <span className="text-slate-400">Account</span>
                <span className="text-slate-200 font-medium">{email}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Embedded wallet</span>
              <span className="text-slate-200 font-medium">{shortWallet}</span>
            </div>
          </div>
        </div>

        {/* Demo app entries */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium tracking-wider uppercase text-slate-500">Try the layer</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/reviews"
              className="group bg-[#141418] border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-white/25 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-heading text-lg text-white">Reviews</span>
                <span className="text-xs text-slate-400">Only a verified human can post.</span>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </Link>
            <Link
              href="/airdrop"
              className="group bg-[#141418] border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-white/25 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-heading text-lg text-white">Airdrop</span>
                <span className="text-xs text-slate-400">One human, one claim.</span>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </Link>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => logout()}
          className="self-start inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </main>
  );
}
