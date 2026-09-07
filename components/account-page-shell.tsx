"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export function AccountGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <main className="min-h-screen w-full bg-black text-white flex items-center justify-center">
        <p className="text-white text-sm">Loading your account…</p>
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
