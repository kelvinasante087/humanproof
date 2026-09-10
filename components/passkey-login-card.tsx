"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fingerprint, ArrowRight, RefreshCw, KeyRound } from "lucide-react";
import { useHumanProofSignIn } from "@/components/humanproof-signin";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";

export function PasskeyLoginCard() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { signIn, busy, error } = useHumanProofSignIn(true);
  const attempted = useRef(false);

  const handleSignIn = async () => {
    const res = await signIn();
    if (res.ok) {
      toast.success("Signed in with passkey!");
      router.push("/account");
    } else if (res.needsOnboarding) {
      toast.info("No credential found for this passkey. Let's create one!");
      router.push("/");
    }
  };

  // Auto-prompt passkey once ready if not already authenticated
  useEffect(() => {
    if (!ready || authenticated || attempted.current) return;
    attempted.current = true;
    void handleSignIn();
  }, [ready, authenticated]);

  return (
    <div className="w-full max-w-md bg-[#0c0c0e] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl text-center relative z-10">
      <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-6">
        <Fingerprint className="w-7 h-7 text-white" />
      </div>

      <h1 className="font-heading text-2xl sm:text-3xl text-white font-normal mb-2">
        Sign in with Passkey
      </h1>
      <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
        Touch your sensor or glance at Face ID to sign in directly without email.
      </p>

      <button
        onClick={handleSignIn}
        disabled={busy}
        className="w-full bg-white text-black font-semibold text-sm py-3.5 rounded-xl hover:bg-slate-100 active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {busy ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Verifying passkey…</span>
          </>
        ) : (
          <>
            <KeyRound className="w-4 h-4" />
            <span>Sign in with Passkey</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </>
        )}
      </button>

      {error && (
        <p className="text-rose-400 text-xs text-center bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mt-4">
          {error}
        </p>
      )}

      <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <span>No credential yet?</span>
        <Link href="/" className="text-white hover:underline font-medium">
          Get started →
        </Link>
      </div>
    </div>
  );
}
