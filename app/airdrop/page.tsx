"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy, useSendTransaction } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HumanSessionBanner, useHumanSession } from "@/components/human-session";
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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">PROOF airdrop</h1>
        <p className="text-muted-foreground text-sm">
          A demo app on the HumanProof layer. One human, one claim — the block is keyed to the{" "}
          <span className="font-medium">person</span>, not the wallet, so bot farms and fresh
          wallets can&apos;t drain it. This is the layer used for{" "}
          <span className="font-medium">Sybil resistance</span>.
        </p>
      </header>

      <HumanSessionBanner appLabel="the airdrop" />

      <Claim />
    </main>
  );
}

function Claim() {
  const { ready, authenticated, user } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { verified } = useHumanSession();

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
      /* balance is best-effort display */
    }
  }, [address]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  async function claim() {
    if (!address) return;
    setStatus("claiming");
    setMessage(null);

    // 1. The one-per-human gate: /attest seals this claim, deduped on the salted nullifier.
    let seal: { sealId?: string } = {};
    try {
      const res = await fetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: AIRDROP_APP_ID, contentHash: CLAIM_CONTENT }),
      });
      seal = await res.json();
      if (res.status === 409) {
        setStatus("blocked");
        setMessage("This human has already claimed. One human, one claim.");
        return;
      }
      if (res.status === 401) {
        setStatus("error");
        setMessage("Verify you're human first ↑");
        return;
      }
      if (res.status === 503) {
        setStatus("error");
        setMessage("Sealing is being provisioned — try once the layer is live.");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setMessage(seal && "error" in seal ? String((seal as { error: unknown }).error) : "Couldn't seal the claim.");
        return;
      }
      if (seal.sealId) setSealId(seal.sealId);
    } catch {
      setStatus("error");
      setMessage("Network error — please try again.");
      return;
    }

    // 2. The payout: the user's OWN embedded wallet sends claim(), gas sponsored by Privy. If
    // sponsorship isn't covering Base Sepolia, top up a sliver of gas and retry — still user-signed.
    try {
      const tx = { to: PROOF_TOKEN!, data: claimCalldata(), chainId: BASE_SEPOLIA_ID };
      let hash: `0x${string}`;
      try {
        ({ hash } = await sendTransaction(tx, { sponsor: true, address }));
      } catch {
        await fetch("/api/airdrop/fund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        ({ hash } = await sendTransaction(tx, { address }));
      }
      await waitForClaim(hash);
      await refreshBalance();
      setStatus("done");
      setMessage(`${CLAIM_AMOUNT_DISPLAY} ${PROOF_SYMBOL} landed in your wallet.`);
    } catch {
      setStatus("error");
      setMessage(
        "The claim was sealed to you, but the payout transaction didn't go through. (Gas or network.)",
      );
    }
  }

  if (!ready) return <p className="text-muted-foreground text-sm">Loading…</p>;

  if (!authenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in to claim</CardTitle>
          <CardDescription>
            The payout lands in your own invisible wallet — created for you when you sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button className="w-full">Go to HumanProof</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim 500 PROOF</CardTitle>
        <CardDescription>One human, one claim. Bots need not apply.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between rounded-lg border bg-slate-50 px-4 py-3">
          <span className="text-muted-foreground text-sm">Your balance</span>
          <span className="text-2xl font-semibold tabular-nums">
            {balance ?? "…"}{" "}
            <span className="text-muted-foreground text-sm font-normal">{PROOF_SYMBOL}</span>
          </span>
        </div>

        {!airdropConfigured() && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            The airdrop goes live once the PROOF token is deployed. The button will work then.
          </p>
        )}

        {status === "blocked" ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {message} A new wallet won&apos;t help — the block is on the human.
          </div>
        ) : status === "done" ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            ✓ {message}
            {sealId && (
              <>
                {" "}
                <Link href={`/verify/${sealId}`} className="font-medium underline underline-offset-2">
                  See the public proof
                </Link>
                .
              </>
            )}
          </div>
        ) : (
          <Button
            onClick={claim}
            disabled={status === "claiming" || !verified || !airdropConfigured()}
          >
            {status === "claiming" ? "Claiming…" : `Claim ${CLAIM_AMOUNT_DISPLAY} ${PROOF_SYMBOL}`}
          </Button>
        )}

        {!verified && status !== "done" && (
          <p className="text-muted-foreground text-xs">
            <Link href="/" className="underline underline-offset-2">
              Verify with HumanProof
            </Link>{" "}
            to claim — the payout is gated to real, unique humans.
          </p>
        )}

        {status === "error" && message && <p className="text-destructive text-sm">{message}</p>}
      </CardContent>
    </Card>
  );
}
