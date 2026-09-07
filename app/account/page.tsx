"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useHumanSession } from "@/components/human-session";
import {
  CredentialCard,
  CredentialColorwayPicker,
  credentialColorways,
  type CredentialColorway,
} from "@/components/credential-card";
import { CheckCircle2, ChevronDown, Sparkles, Coins, ArrowUpRight } from "lucide-react";
import { proofBalanceOf, nativeBalanceOf } from "@/lib/airdrop/config";
import { AvatarPicker } from "@/components/avatar-context";

/**
 * The signed-in client home — where a verified human lands after completing (or re-syncing) their
 * credential. This is where account details live; the onboarding modal just confirms success and
 * sends people here. Details come from Privy (email, embedded wallet) + the HumanProof session
 * (ENS name, verified state). Guests are bounced to the landing page.
 */
export default function AccountPage() {
  const { ready, authenticated, user } = usePrivy();
  const { verified, name } = useHumanSession();
  const router = useRouter();
  const [proofBalance, setProofBalance] = useState<string>("0");
  const [ethBalance, setEthBalance] = useState<string>("0.0000");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cardColorway, setCardColorway] = useState<CredentialColorway>(() => {
    if (typeof window === "undefined") return "charcoal";
    const saved = window.localStorage.getItem("humanproof-card-colorway");
    return saved && saved in credentialColorways ? (saved as CredentialColorway) : "charcoal";
  });

  const wallet = user?.wallet?.address;

  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (wallet) {
      proofBalanceOf(wallet)
        .then((b) => setProofBalance(b))
        .catch(() => setProofBalance("0"));
      nativeBalanceOf(wallet)
        .then((b) => setEthBalance(b))
        .catch(() => setEthBalance("0.0000"));
    }
  }, [wallet]);

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
  const hasPasskey = user?.linkedAccounts?.some((a) => a.type === "passkey") ?? false;
  const shortWallet = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "—";

  return (
    <main className="min-h-screen w-full bg-black text-white relative">
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 lg:px-12 py-10 sm:py-14 flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-4xl sm:text-5xl tracking-tight leading-[1.1] text-white font-normal">
            {name ? name : "Your credential"}
          </h1>
          <p className="text-white/80 text-base leading-relaxed max-w-xl">
            You&apos;re a verified, unique human. Your credential works across every app on the
            layer — one passkey tap, no re-verifying.
          </p>
        </div>

        {/* Credential card — the signed-in Verified Human pass */}
        <div className="flex flex-col gap-6">
          <CredentialCard
            name={name}
            wallet={wallet}
            verified={verified}
            colorway={cardColorway}
          />

          {/* Connected Assets & Token Balances */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50">
                Holdings & Tokens
              </span>
              <span className="text-[11px] text-white/40">
                Base Sepolia & Multi-chain
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* PROOF Airdrop / Sybil Pass Token */}
              <div className="p-4 rounded-2xl bg-[#0c0c0e] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-3 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-heading font-semibold text-xs">
                      P
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">PROOF</p>
                      <p className="text-[10px] text-white/50">Human Proof</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-heading text-xl text-white tracking-tight leading-none">
                    {proofBalance} <span className="text-xs font-sans text-white/60">PROOF</span>
                  </p>
                  <p className="text-[10px] text-emerald-400/90 mt-1 font-medium">1 human · 1 allocation</p>
                </div>
              </div>

              {/* ETH */}
              <div className="p-4 rounded-2xl bg-[#0c0c0e] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-3 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-heading font-semibold text-xs">
                      Ξ
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Ethereum</p>
                      <p className="text-[10px] text-white/50">ETH</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-heading text-xl text-white tracking-tight leading-none">
                    {ethBalance} <span className="text-xs font-sans text-white/60">ETH</span>
                  </p>
                  <p className="text-[10px] text-white/40 mt-1">Embedded wallet · Base Sepolia</p>
                </div>
              </div>

              {/* BTC / WBTC */}
              <div className="p-4 rounded-2xl bg-[#0c0c0e] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-3 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-heading font-semibold text-xs">
                      ₿
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Bitcoin</p>
                      <p className="text-[10px] text-white/50">WBTC</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-heading text-xl text-white/50 tracking-tight leading-none">
                    — <span className="text-xs font-sans text-white/40">BTC</span>
                  </p>
                  <p className="text-[10px] text-white/40 mt-1">Multi-chain · coming soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Collapsible Advanced Section (Hairline Divider Style) */}
          <div className="w-full pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="group flex items-center justify-between w-full pb-4 border-b border-white/10 hover:border-white/25 transition-colors cursor-pointer"
              aria-expanded={showAdvanced}
            >
              <span className="font-heading text-sm font-medium tracking-wide text-white/70 group-hover:text-white transition-colors">
                Advanced
              </span>
              <ChevronDown
                className={`w-4 h-4 text-white/50 group-hover:text-white transition-transform duration-300 ${
                  showAdvanced ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {/* Dropdown Content */}
            {showAdvanced && (
              <div className="pt-6 pb-2 flex flex-col gap-6 animate-in fade-in-0 duration-200">
                {/* Profile picture */}
                <div className="pb-6 border-b border-white/10">
                  <AvatarPicker />
                </div>

                {/* Card Colour Theme Customizer */}
                <div className="pb-6 border-b border-white/10">
                  <CredentialColorwayPicker value={cardColorway} onChange={chooseColorway} />
                </div>

                {/* Account & Security Metadata */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 text-sm">
                    <span className="text-white/50">Device bound</span>
                    <span className={`font-medium flex items-center gap-1.5 ${hasPasskey ? "text-emerald-400" : "text-white/40"}`}>
                      <CheckCircle2 className="w-4 h-4" /> {hasPasskey ? "Passkey active" : "No passkey"}
                    </span>
                  </div>
                  {email && (
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 text-sm">
                      <span className="text-white/50">Account</span>
                      <span className="text-white font-medium">{email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">Embedded wallet</span>
                    <span className="text-white font-medium">{wallet ?? shortWallet}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
