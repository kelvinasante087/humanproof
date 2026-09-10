"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Fingerprint, MessageCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useHumanProofSignIn } from "@/components/humanproof-signin";
import { useAuthedFetch } from "@/components/use-authed-fetch";
import styles from "./demo-access.module.css";

export function DemoAccess({ app, children }: {
  app: "reviews" | "airdrop";
  children: React.ReactNode;
}) {
  const { ready, user } = usePrivy();
  const authedFetch = useAuthedFetch();
  const { signIn, busy, error, status } = useHumanProofSignIn(true);
  const [allowedAccount, setAllowedAccount] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [failure, setFailure] = useState("");
  const [opening, setOpening] = useState(false);
  const account = user?.id;
  const reviews = app === "reviews";
  const check = useCallback(async () => {
    try {
      const response = await authedFetch(`/api/demo/session/${app}`, { cache: "no-store" });
      const data = await response.json();
      setAllowedAccount(response.ok && data.authenticated && typeof data.account === "string" ? data.account : null);
    } catch {
      setAllowedAccount(null);
    } finally {
      setChecking(false);
    }
  }, [app, authedFetch]);
  useEffect(() => {
    if (!ready) return;
    // Session state is updated only after the asynchronous server response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
    const onFocus = () => { void check(); };
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(onFocus, 60000);
    return () => { window.removeEventListener("focus", onFocus); window.clearInterval(interval); };
  }, [ready, account, check]);

  async function enter() {
    setFailure("");
    setOpening(true);
    try {
      const result = await signIn();
      if (!result.ok) return;
      const response = await authedFetch(`/api/demo/session/${app}`, { method: "POST" });
      if (!response.ok) throw new Error("Could not open your app session. Please try again.");
      await check();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Sign-in failed. Please try again.");
    } finally {
      setOpening(false);
    }
  }

  async function leave() {
    setFailure("");
    try {
      const response = await authedFetch(`/api/demo/session/${app}`, { method: "DELETE" });
      if (response.ok) setAllowedAccount(null);
      else setFailure("Could not sign out. Please try again.");
    } catch {
      setFailure("Could not sign out. Please try again.");
    }
  }

  if (account && allowedAccount === account) {
    return <>
      <div className={styles.sessionBar}>
        <span>Signed in to {reviews ? "Proofit" : "Airdroppa"} with HumanProof</span>
        <button onClick={() => void leave()}>Sign out of app</button>
        {failure && <span role="alert">{failure}</span>}
      </div>
      {children}
    </>;
  }

  return (
    <main className={`${styles.landing} ${reviews ? styles.reviews : styles.airdrop}`}>
      <header>
        <Link href={`/${app}`} className={styles.brand}>
          {reviews ? <MessageCircle size={28} /> : <span className={styles.token}>P</span>}
          {reviews ? "proofit" : "Airdroppa"}
        </Link>
        <Link href="/account">Your HumanProof credential <ArrowRight size={15} /></Link>
      </header>
      <div className={styles.content}>
        <section>
          <p className={styles.eyebrow}>{reviews ? "GOOD PRODUCTS. HONEST OPINIONS." : "COMMUNITY REWARDS / BASE SEPOLIA"}</p>
          <h1>{reviews ? "Find your people. Get the real review." : "Your next drop starts here."}</h1>
          <p className={styles.description}>{reviews
            ? "A place to compare notes, share what works, and hear from actual people. Join the conversation with your HumanProof passkey."
            : "Explore the ETHGlobal community demo and claim your 500 PROOF allocation. One human. One claim."}</p>
          <div className={styles.preview} aria-hidden="true">
            {reviews ? <><span>h/verifiedreviews</span><strong>Worth the hype?</strong><p>Headphones, coffee, everyday carry.<br />People with opinions. Not bots with scripts.</p></>
              : <><span>ETHGLOBAL · COMMUNITY DEMO</span><strong>500 <small>PROOF</small></strong><p>Your allocation awaits.<br />Base Sepolia testnet</p></>}
          </div>
        </section>
        <section className={styles.login}>
          <Fingerprint size={35} />
          <h2>{reviews ? "Welcome to Proofit" : "Sign in to Airdroppa"}</h2>
          <p>Use your existing HumanProof passkey to continue.</p>
          <button className={styles.primary} onClick={() => void enter()} disabled={!ready || checking || busy || opening}>
            {!ready || checking ? "Checking session…" : busy || opening ? "Complete your passkey prompt…" : "Sign in with HumanProof"}
            <ArrowRight size={17} />
          </button>
          <p className={styles.device}>Windows Hello, Face ID, Touch ID, or your device PIN—whichever protects your passkey.</p>
          <div className={styles.note}><ShieldCheck size={18} /><span>No repeated verification. No new wallet. Your credential is ready to use.</span></div>
          {(error || failure) && <p role="alert">{failure || error}</p>}
          {status === "onboarding" && <p>This account does not have a HumanProof credential yet.</p>}
          <div className={styles.create}>New to HumanProof? <Link href="/signup">Create a credential</Link></div>
        </section>
      </div>
    </main>
  );
}
