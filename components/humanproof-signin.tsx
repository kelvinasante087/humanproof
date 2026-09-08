"use client";

import { useCallback, useState } from "react";
import { usePrivy, useLoginWithPasskey } from "@privy-io/react-auth";
import { useHumanSession } from "@/components/human-session";

/**
 * "Sign in with HumanProof" — the one-tap passkey key both demo apps use at their auth moment.
 *
 * This is Privy's RETURNING-USER passkey flow (`useLoginWithPasskey().loginWithPasskey()`),
 * deliberately NOT the onboarding link-passkey. On a successful passkey login we hand Privy's
 * access token to `/api/session/login`, which verifies it server-side, finds this account's
 * existing credential, and re-issues the signed verification session — so the human is now "signed
 * in as a verified human" WITHOUT re-doing the World check. We then refresh the shared session so
 * the banner and any gated action light up at once.
 *
 * The result the caller acts on:
 *  - { ok: true }                    → verified session re-established; proceed with the action.
 *  - { ok: false, needsOnboarding }  → this account has no credential yet; send them to `/`.
 *  - { ok: false }                   → the passkey login failed or was cancelled.
 *
 * Honest framing (same-origin demo): the tap re-establishes the session instantly because the demo
 * apps share one deployment. In production an external app would redirect to HumanProof for the
 * same one-tap sign-in — this is not cross-domain SSO.
 */
export type SignInResult =
  | { ok: true; name?: string | null }
  | { ok: false; needsOnboarding?: boolean };

export type SignInStatus = "idle" | "signing" | "onboarding" | "error";

export function useHumanProofSignIn(requirePasskey = false) {
  const { authenticated, getAccessToken } = usePrivy();
  const { loginWithPasskey, state } = useLoginWithPasskey();
  const { refresh } = useHumanSession();
  const [status, setStatus] = useState<SignInStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (): Promise<SignInResult> => {
    setError(null);
    setStatus("signing");
    try {
      // Demo entry explicitly invokes the returning-user passkey flow even when the shared
      // credential site is authenticated. Other callers can reuse their existing session.
      if (requirePasskey || !authenticated) {
        await loginWithPasskey();
      }

      // 2. Prove that login to our server: verified server-side, never a client claim.
      const token = await getAccessToken();
      if (!token) {
        setStatus("error");
        setError("Couldn't read your passkey session. Please try again.");
        return { ok: false };
      }

      // 3. Ask the server to re-issue the verified session for this account's credential.
      const res = await fetch("/api/session/login", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.verified) {
        await refresh(); // shared session updates → banner + gated surfaces unlock
        setStatus("idle");
        return { ok: true, name: typeof data.name === "string" ? data.name : null };
      }

      if (res.ok && data?.needsOnboarding) {
        setStatus("onboarding");
        return { ok: false, needsOnboarding: true };
      }

      setStatus("error");
      setError(
        res.status === 503
          ? "Sign-in is being provisioned — try once the layer is live."
          : typeof data?.error === "string"
            ? data.error
            : "Couldn't sign you in. Please try again.",
      );
      return { ok: false };
    } catch (err) {
      // A cancelled or failed passkey prompt lands here.
      setStatus("error");
      setError(err instanceof Error ? err.message : "Passkey sign-in was cancelled.");
      return { ok: false };
    }
  }, [authenticated, requirePasskey, loginWithPasskey, getAccessToken, refresh]);

  const busy =
    status === "signing" ||
    state.status === "generating-challenge" ||
    state.status === "awaiting-passkey" ||
    state.status === "submitting-response";

  return { signIn, status, busy, error, passkeyState: state.status };
}
