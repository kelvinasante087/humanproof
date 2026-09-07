"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy, useSendTransaction } from "@privy-io/react-auth";
import {
  ArrowUpRight,
  Check,
  Coins,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useHumanSession } from "@/components/human-session";
import { useHumanProofSignIn } from "@/components/humanproof-signin";
import { useAuthedFetch } from "@/components/use-authed-fetch";
import {
  AIRDROP_APP_ID,
  CLAIM_CONTENT,
  CLAIM_AMOUNT_DISPLAY,
  PROOF_SYMBOL,
  PROOF_TOKEN,
  BASE_SEPOLIA_ID,
  airdropConfigured,
  claimCalldata,
  proofBalanceOf,
  waitForClaim,
} from "@/lib/airdrop/config";

type Status = "idle" | "claiming" | "done" | "blocked" | "error";

export default function AirdropPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050807] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[480px] w-[480px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -right-40 top-0 h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <header className="relative z-20 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-300/30 bg-emerald-300/10 font-heading text-sm">
              P
            </span>
            <span className="font-heading text-lg">ProofDrop</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-65 sm:inline-flex">
              Base Sepolia
            </span>
            <Link href="/account" className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold">
              My credential
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_520px] lg:items-center lg:py-20">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
            <Sparkles className="h-3.5 w-3.5" />
            ETHGlobal community drop
          </div>
          <h1 className="mt-6 max-w-xl font-heading text-5xl leading-[0.95] tracking-[-0.04em] sm:text-7xl">
            500 PROOF for every real human.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed opacity-60 sm:text-lg">
            A sybil-resistant token distribution powered by HumanProof. One person gets one
            allocation, even across multiple wallets.
          </p>
          <div className="mt-8 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] opacity-35">Allocation</p>
              <p className="mt-1 font-semibold">500 PROOF</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] opacity-35">Network</p>
              <p className="mt-1 font-semibold">Base Sepolia</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] opacity-35">Eligibility</p>
              <p className="mt-1 font-semibold">Verified humans</p>
            </div>
          </div>
        </section>

        <Claim />
      </div>
    </main>
  );
}

function CampaignCard({
  children,
  address,
}: {
  children: React.ReactNode;
  address?: string;
}) {
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[#0b1110] p-1 shadow-[0_32px_100px_rgba(0,0,0,.55)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-400/15 to-transparent" />
      <div className="relative rounded-[24px] border border-white/[0.06] bg-black/25 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-400 font-heading text-lg text-black">
              P
            </span>
            <div>
              <p className="font-heading text-lg leading-none">ETHGlobal</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] opacity-40">PROOF distribution</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
            Live
          </span>
        </div>

        <div className="my-7 border-y border-white/10 py-7">
          <p className="text-xs uppercase tracking-[0.16em] opacity-40">Your allocation</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-heading text-6xl leading-none">{CLAIM_AMOUNT_DISPLAY}</span>
            <span className="pb-1 text-sm font-semibold opacity-55">{PROOF_SYMBOL}</span>
          </div>
        </div>

        {shortAddress && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="flex items-center gap-2 text-xs opacity-55">
              <Wallet className="h-4 w-4" />
              Receiving wallet
            </span>
            <span className="flex items-center gap-2 font-mono text-xs">
              {shortAddress}
              <Copy className="h-3.5 w-3.5 opacity-35" />
            </span>
          </div>
        )}

        {children}
      </div>
    </section>
  );
}

function Claim() {
  const { ready, user } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { verified } = useHumanSession();
  const authedFetch = useAuthedFetch();
  const address = user?.wallet?.address;
  const [balance, setBalance] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [sealId, setSealId] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      setBalance(await proofBalanceOf(address));
    } catch {
      // Balance display is best effort; the claim remains independently available.
    }
  }, [address]);

  useEffect(() => {
    // The balance arrives from the chain asynchronously after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshBalance();
  }, [refreshBalance]);

  async function claim() {
    if (!address) return;
    setStatus("claiming");
    setMessage(null);

    let seal: { sealId?: string; error?: unknown } = {};
    try {
      const response = await authedFetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: AIRDROP_APP_ID, contentHash: CLAIM_CONTENT }),
      });
      seal = await response.json();
      if (response.status === 409) {
        const duplicate = "Already claimed. HumanProof allows one 500 PROOF allocation per human.";
        setStatus("blocked");
        setMessage(duplicate);
        window.alert(duplicate);
        return;
      }
      if (response.status === 401) {
        setStatus("error");
        setMessage("Your HumanProof session needs to be verified again.");
        return;
      }
      if (!response.ok) {
        setStatus("error");
        setMessage(seal.error ? String(seal.error) : "Could not seal this claim.");
        return;
      }
      if (seal.sealId) setSealId(seal.sealId);
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
      return;
    }

    try {
      const transaction = { to: PROOF_TOKEN!, data: claimCalldata(), chainId: BASE_SEPOLIA_ID };
      let hash: `0x${string}`;
      try {
        ({ hash } = await sendTransaction(transaction, { sponsor: true, address }));
      } catch {
        await authedFetch("/api/airdrop/fund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        ({ hash } = await sendTransaction(transaction, { address }));
      }
      await waitForClaim(hash);
      await refreshBalance();
      setStatus("done");
      setMessage(`${CLAIM_AMOUNT_DISPLAY} ${PROOF_SYMBOL} landed in your wallet.`);
    } catch {
      setStatus("error");
      setMessage("Your claim was sealed, but the payout transaction did not complete.");
    }
  }

  if (!ready) {
    return (
      <CampaignCard>
        <div className="h-12 animate-pulse rounded-xl bg-white/[0.06]" />
      </CampaignCard>
    );
  }

  if (!verified) return <SignInWall address={address} />;

  return (
    <CampaignCard address={address}>
      <div className="mb-5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 opacity-50">
          <Coins className="h-4 w-4" />
          Current balance
        </span>
        <span className="font-semibold tabular-nums">{balance ?? "…"} {PROOF_SYMBOL}</span>
      </div>

      {!airdropConfigured() && (
        <div className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs">
          The campaign opens after the PROOF contract is deployed.
        </div>
      )}

      {message && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${status === "done" ? "border-emerald-300/20 bg-emerald-300/10" : status === "blocked" ? "border-amber-300/20 bg-amber-300/10" : "border-rose-300/20 bg-rose-300/10"}`}
          role="status"
        >
          <div className="flex items-start gap-2">
            {status === "done" ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>
              {message}
              {status === "done" && sealId && (
                <>
                  {" "}
                  <Link href={`/verify/${sealId}`} className="font-semibold underline underline-offset-2">
                    View proof
                  </Link>
                </>
              )}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={claim}
        disabled={status === "claiming" || !address || !airdropConfigured()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-5 py-4 text-sm font-bold text-black shadow-[0_12px_35px_rgba(52,211,153,.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "claiming"
          ? "Claiming…"
          : !address
            ? "Preparing wallet…"
            : `Claim ${CLAIM_AMOUNT_DISPLAY} ${PROOF_SYMBOL}`}
        {status !== "claiming" && address && <ArrowUpRight className="h-4 w-4" />}
      </button>

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] opacity-40">
        <ShieldCheck className="h-3.5 w-3.5" />
        The button stays available so repeat claims visibly fail.
      </p>
    </CampaignCard>
  );
}

function SignInWall({ address }: { address?: string }) {
  const { signIn, busy, status, error, passkeyState } = useHumanProofSignIn();

  return (
    <CampaignCard address={address}>
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        <div>
          <p className="text-sm font-semibold">Verified humans only</p>
          <p className="mt-1 text-xs leading-relaxed opacity-50">
            Sign in with your HumanProof passkey. Returning humans do not repeat World ID.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-5 py-4 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-40"
      >
        {busy
          ? passkeyState === "awaiting-passkey"
            ? "Waiting for passkey…"
            : "Signing in…"
          : "Sign in to claim"}
        {!busy && <ExternalLink className="h-4 w-4" />}
      </button>

      {status === "onboarding" && (
        <p className="mt-4 text-center text-xs opacity-65">
          No credential yet? <Link href="/" className="underline">Create one first</Link>.
        </p>
      )}
      {error && <p className="mt-4 text-center text-sm text-rose-300">{error}</p>}
    </CampaignCard>
  );
}
