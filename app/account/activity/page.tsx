"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowUpRight, CheckCircle2, Clock3, FileCheck2, Gift } from "lucide-react";
import { AccountPageShell, AccountTile } from "@/components/account-page-shell";
import { BASE_SEPOLIA_EXPLORER, proofBalanceOf } from "@/lib/airdrop/config";

type Seal = {
  sealRef: string;
  appId: string;
  contentHash: string;
  txHash: string | null;
  createdAt: number;
};

function actionTitle(appId: string) {
  if (appId === "reviews") return "Posted a review";
  if (appId === "airdrop") return "Claimed the PROOF airdrop";
  return "Sealed an action";
}

function sourceLabel(appId: string) {
  if (appId === "reviews") return "Reviews";
  if (appId === "airdrop") return "Airdrop";
  return appId;
}

export default function ActivityPage() {
  const { user } = usePrivy();
  const [seals, setSeals] = useState<Seal[]>([]);
  const [activityAvailable, setActivityAvailable] = useState<boolean | null>(null);
  const [proofBalance, setProofBalance] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/activity", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!cancelled) {
          setSeals(response.ok && Array.isArray(data.seals) ? data.seals : []);
          setActivityAvailable(response.ok && data.available !== false);
        }
      })
      .catch(() => {
        if (!cancelled) setActivityAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const address = user?.wallet?.address;
    if (!address) return;
    proofBalanceOf(address)
      .then(setProofBalance)
      .catch(() => setProofBalance(null));
  }, [user?.wallet?.address]);

  const airdropSeal = useMemo(() => seals.find((seal) => seal.appId === "airdrop"), [seals]);
  const hasProof = proofBalance !== null && Number(proofBalance) > 0;
  const claimed = Boolean(airdropSeal) && hasProof;
  const airdropStatus =
    activityAvailable === null
      ? "Checking claim…"
      : activityAvailable === false && proofBalance === null
        ? "Status unavailable"
        : claimed
          ? "Claimed"
          : airdropSeal
            ? "Claim sealed"
            : hasProof
              ? "PROOF detected"
              : "Available";
  const airdropDescription = claimed
    ? "The claim receipt is sealed and PROOF is present in this wallet."
    : airdropSeal
      ? "The claim action is sealed; the payout cannot be confirmed from the available data."
      : hasProof
        ? "This wallet holds PROOF, but HumanProof has no claim receipt for it."
        : "No completed claim is recorded for this human.";

  return (
    <AccountPageShell
      title="Activity & Proofs"
      description="Your verifiable receipts across HumanProof apps. Every item links to a public proof without exposing your identity."
    >
      <div className="border-t border-white/20">
      <AccountTile>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-white">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white">PROOF airdrop</p>
              <h2 className="mt-1 font-heading text-xl text-white">
                {airdropStatus}
              </h2>
              <p className="mt-1 text-sm text-white">
                {airdropDescription}
              </p>
            </div>
          </div>
          {airdropSeal?.txHash ? (
            <a
              href={`${BASE_SEPOLIA_EXPLORER}/tx/${airdropSeal.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border-b border-white/50 py-2 text-xs font-semibold text-white hover:border-white"
            >
              Seal transaction <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : airdropSeal || hasProof ? (
            <span className="text-xs text-white">Transaction reference unavailable</span>
          ) : (
            <Link href="/airdrop" className="inline-flex items-center gap-2 border-b border-white/50 py-2 text-xs font-semibold text-white hover:border-white">
              Open airdrop <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </AccountTile>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white">Sealed activity</h2>
          {seals.length > 0 && <span className="text-xs text-white">{seals.length} receipt{seals.length === 1 ? "" : "s"}</span>}
        </div>

        {activityAvailable === null ? (
          <AccountTile className="text-sm text-white">Loading your proofs…</AccountTile>
        ) : seals.length === 0 ? (
          <AccountTile className="flex flex-col items-center py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center text-white">
              <Clock3 className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-heading text-xl text-white">No proofs yet</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white">
              Actions you take across HumanProof apps — like posting a review or claiming an airdrop — will appear here as verifiable receipts.
            </p>
            {activityAvailable === false && (
              <p className="mt-3 text-xs text-white">Activity storage is temporarily unavailable.</p>
            )}
          </AccountTile>
        ) : (
          <div className="border-t border-white/20">
            {seals.map((seal, index) => (
              <div key={seal.sealRef} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${index < seals.length - 1 ? "border-b border-white/10" : ""}`}>
                <div className="flex min-w-0 gap-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center text-white">
                    <FileCheck2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{actionTitle(seal.appId)}</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white">
                        <CheckCircle2 className="h-3 w-3" /> Sealed
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white">
                      {sourceLabel(seal.appId)} · {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(seal.createdAt))}
                    </p>
                  </div>
                </div>
                <Link href={`/verify/${seal.sealRef}`} className="inline-flex items-center gap-2 border-b border-white/50 py-2 text-xs font-semibold text-white hover:border-white">
                  Verify receipt <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </AccountPageShell>
  );
}
