"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useHumanSession } from "@/components/human-session";
import { useOnboardingModal } from "@/components/onboarding-modal";

export function AccountGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const { loading, credentialed } = useHumanSession();
  const { openOnboarding } = useOnboardingModal();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  if (!ready || !authenticated || loading) {
    return (
      <main className="min-h-screen w-full bg-black text-white flex items-center justify-center">
        <p className="text-white text-sm">Loading your account…</p>
      </main>
    );
  }

  // Signed in with Privy, but the credential was never finished (they dropped out before claiming
  // a name). Show the way back into the flow instead of a nameless, half-built dashboard. Note the
  // strict `=== false`: an unknown answer (store unreachable) deliberately falls through and lets
  // the account render, so a backend blip never locks a real human out of their own dashboard.
  if (credentialed === false) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-black px-6 text-white">
        <div className="flex max-w-md flex-col gap-4 text-center">
          <h1 className="font-heading text-3xl font-normal tracking-tight">
            Finish setting up your credential
          </h1>
          <p className="text-sm leading-relaxed text-white/70">
            Your account exists, but you haven&apos;t completed your proof-of-human credential yet.
            Pick up where you left off — nothing is final until you claim your name.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={openOnboarding}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-slate-200"
            >
              Continue setup
            </button>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              Back to home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

export function AccountPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <AccountGuard>
      <main className="min-h-screen w-full bg-black text-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:px-12">
          <header className="flex flex-col gap-3">
            <h1 className="font-heading text-4xl font-normal leading-[1.1] tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-white">{description}</p>
          </header>
          {children}
        </div>
      </main>
    </AccountGuard>
  );
}

export function AccountTile({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-b border-white/20 py-6 sm:py-7 ${className}`}>
      {children}
    </section>
  );
}

export function AccountRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex flex-col justify-between gap-2 py-4 text-sm sm:flex-row sm:items-center ${last ? "" : "border-b border-white/10"}`}>
      <span className="text-white">{label}</span>
      <div className="min-w-0 text-left font-medium text-white sm:text-right">{children}</div>
    </div>
  );
}

export function ComingSoon({ children = "Coming soon" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
      {children}
    </span>
  );
}
