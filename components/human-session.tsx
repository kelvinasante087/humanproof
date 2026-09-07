"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";

/**
 * The client half of "Sign in with HumanProof". Asks `/api/session` whether this browser is a
 * verified human this session (see app/api/session/route.ts). Both demo apps use it, so acting in
 * one app and then opening the other shows the SAME human already recognized — no re-verify. That
 * shared session IS the demo-sized "Sign in with HumanProof".
 *
 * It lives in a context provider so every surface (the banner, a gated action, a sign-in wall)
 * shares one session state — and so a passkey sign-in can `refresh()` it and light everything up at
 * once, without a page reload.
 */
export type HumanSession = {
  loading: boolean;
  verified: boolean;
  name: string | null;
  /** Re-fetch `/api/session` — call after a passkey sign-in re-issues the verified cookie. */
  refresh: () => Promise<void>;
};

const HumanSessionContext = createContext<HumanSession | null>(null);

export function HumanSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; verified: boolean; name: string | null }>({
    loading: true,
    verified: false,
    name: null,
  });

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/session", { cache: "no-store" });
      const d = await r.json();
      setState({
        loading: false,
        verified: Boolean(d?.verified),
        name: typeof d?.name === "string" ? d.name : null,
      });
    } catch {
      setState({ loading: false, verified: false, name: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <HumanSessionContext.Provider value={{ ...state, refresh }}>
      {children}
    </HumanSessionContext.Provider>
  );
}

/** Read the shared HumanProof session. Must be used under <HumanSessionProvider> (app-wide). */
export function useHumanSession(): HumanSession {
  const ctx = useContext(HumanSessionContext);
  if (!ctx) {
    // Defensive: outside the provider, behave as an unknown/unverified session rather than crash.
    return { loading: false, verified: false, name: null, refresh: async () => {} };
  }
  return ctx;
}

/**
 * The visible reuse banner shown at the top of a demo app. When the human is already verified
 * (carried over from onboarding or the other app), it says so and does NOT ask them to verify
 * again — that's the point to call out on camera. When they aren't, it links back to `/` to verify.
 */
export function HumanSessionBanner({ appLabel }: { appLabel: string }) {
  const { loading, verified, name } = useHumanSession();

  if (loading) {
    return (
      <div className="text-white/60 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
        Checking your HumanProof session…
      </div>
    );
  }

  if (verified) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-white">
        <span aria-hidden>✓</span>
        <span>
          <span className="font-medium">
            Signed in with HumanProof{name ? ` as ${name}` : ""}.
          </span>{" "}
          You&apos;re a verified human — {appLabel} recognized you without asking you to verify
          again.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-white sm:flex-row sm:items-center sm:justify-between">
      <span>You&apos;re here as a guest. Verify once to act as a real human.</span>
      <Link href="/" className="font-medium underline underline-offset-2">
        Verify with HumanProof →
      </Link>
    </div>
  );
}
