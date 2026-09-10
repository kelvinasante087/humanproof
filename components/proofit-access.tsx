"use client";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useHumanProofSignIn } from "./humanproof-signin";

export function ProofitAccess() {
  const { authenticated, login } = usePrivy();
  const { signIn, busy, error, status } = useHumanProofSignIn(true);
  return <div className="space-y-3 p-3 text-sm">
    <p className="text-white/70">Everyone can read and search, including bots and AI agents. Only verified HumanProof users can post.</p>
    <div className="flex flex-wrap gap-3">
      <button onClick={() => void signIn()} disabled={busy} className="rounded-lg bg-white px-4 py-2 font-semibold text-black disabled:opacity-50">{busy ? "Complete your passkey prompt…" : "Sign in with HumanProof"}</button>
      {!authenticated && <button onClick={() => login()} className="rounded-lg border border-white/20 px-4 py-2">Sign in or sign up with email</button>}
    </div>
    {authenticated && <p className="text-xs text-white/60">Account signed in. Posting also requires a completed HumanProof credential.</p>}
    {error && <p role="alert">{error}</p>}
    {status === "onboarding" && <Link className="underline" href="/signup">Create your HumanProof credential to post</Link>}
  </div>;
}
