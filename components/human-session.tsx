"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * The client half of "Sign in with HumanProof". Asks `/api/session` whether this browser is a
 * verified human this session (see app/api/session/route.ts). Both demo apps use it, so acting in
 * one app and then opening the other shows the SAME human already recognized — no re-verify. That
 * shared session IS the demo-sized "Sign in with HumanProof".
 */
export type HumanSession = { loading: boolean; verified: boolean };

export function useHumanSession(): HumanSession {
  const [state, setState] = useState<HumanSession>({ loading: true, verified: false });

  useEffect(() => {
    let live = true;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (live) setState({ loading: false, verified: Boolean(d?.verified) });
      })
      .catch(() => {
        if (live) setState({ loading: false, verified: false });
      });
    return () => {
      live = false;
    };
  }, []);

  return state;
}

/**
 * The visible reuse banner shown at the top of a demo app. When the human is already verified
 * (carried over from onboarding or the other app), it says so and does NOT ask them to verify
 * again — that's the point to call out on camera. When they aren't, it links back to `/` to verify.
 */
export function HumanSessionBanner({ appLabel }: { appLabel: string }) {
  const { loading, verified } = useHumanSession();

  if (loading) {
    return (
      <div className="text-muted-foreground rounded-lg border bg-white/60 px-4 py-3 text-sm">
        Checking your HumanProof session…
      </div>
    );
  }

  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <span aria-hidden>✓</span>
        <span>
          <span className="font-medium">Signed in with HumanProof.</span> You&apos;re a verified
          human — {appLabel} recognized you without asking you to verify again.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <span>You&apos;re here as a guest. Verify once to act as a real human.</span>
      <Link href="/" className="font-medium underline underline-offset-2">
        Verify with HumanProof →
      </Link>
    </div>
  );
}
