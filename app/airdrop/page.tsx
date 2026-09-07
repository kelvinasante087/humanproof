"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy, useSendTransaction } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HumanSessionBanner, useHumanSession } from "@/components/human-session";
import { useHumanProofSignIn } from "@/components/humanproof-signin";
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
  const { ready, user } = usePrivy();
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

  // The WALL — this app gates ENTRY, not just the action. Until this browser is a verified human,
  // the claim sits behind "Sign in with HumanProof": one passkey tap re-establishes the verified
  // session (no repeat World check), or routes a new user to create a credential first.
  if (!verified) {
    return <SignInWall />;
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
            disabled={status === "claiming" || !address || !airdropConfigured()}
          >
            {status === "claiming"
              ? "Claiming…"
              : !address
                ? "Preparing your wallet…"
                : `Claim ${CLAIM_AMOUNT_DISPLAY} ${PROOF_SYMBOL}`}
          </Button>
        )}

        {status === "error" && message && <p className="text-destructive text-sm">{message}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * The "Sign in with HumanProof" wall — this app's auth moment. A returning credentialed human taps
 * once, the passkey re-establishes their verified session, and the claim card opens. A new user is
 * routed to create a credential first. The gate is real: the claim still enforces server-side
 * (attest → 401 without a valid signed session), so the wall isn't a client-only lock.
 *
 * Honest framing: the demo apps share one deployment, so this tap signs the human in instantly on
 * the same origin. In production an external app would redirect to HumanProof for the same one-tap
 * sign-in — this is not cross-domain SSO.
 */
function SignInWall() {
  const { signIn, busy, status, error, passkeyState } = useHumanProofSignIn();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in with HumanProof</CardTitle>
        <CardDescription>
          This airdrop is for verified, unique humans — one claim each. Tap once with your passkey;
          if you&apos;ve verified before, you&apos;re in instantly, with no repeat check.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button onClick={() => void signIn()} disabled={busy}>
          {busy
            ? passkeyState === "awaiting-passkey"
              ? "Waiting for passkey…"
              : "Signing in…"
            : "Sign in with HumanProof"}
        </Button>

        {status === "onboarding" ? (
          <p className="text-muted-foreground text-sm">
            You don&apos;t have a HumanProof credential yet.{" "}
            <Link href="/" className="font-medium underline underline-offset-2">
              Create one
            </Link>{" "}
            — verify once, then it&apos;s one tap forever.
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Verify once, then one passkey tap into any app on the layer.
          </p>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>
  );
}
