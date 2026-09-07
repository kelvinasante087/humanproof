"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Code2, Gift, MessageSquareText } from "lucide-react";
import { AccountPageShell } from "@/components/account-page-shell";
import { useHumanSession } from "@/components/human-session";

const apps = [
  {
    name: "Reviews",
    description: "Only a verified human can post.",
    href: "/reviews",
    icon: MessageSquareText,
  },
  {
    name: "Airdrop",
    description: "One human, one claim.",
    href: "/airdrop",
    icon: Gift,
  },
  {
    name: "Developers / API",
    description: "Add reusable proof-of-human to an app.",
    href: "/developers",
    icon: Code2,
  },
];

export default function ConnectedAppsPage() {
  const { verified } = useHumanSession();

  return (
    <AccountPageShell
      title="Connected Apps"
      description="One credential, many apps. HumanProof lets the ecosystem recognize the same unique human without asking them to verify twice."
    >
      <div className="border-t border-white/20">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <article key={app.name} className="grid gap-5 border-b border-white/20 py-6 sm:grid-cols-[32px_1fr_auto] sm:items-center">
              <div className="flex h-8 w-8 items-center justify-center text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-xl text-white">{app.name}</h2>
                <p className="mt-1 text-sm leading-relaxed text-white">{app.description}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {verified ? "Recognized you — no re-verify" : "Session needs re-verification"}
                </div>
              </div>
              <Link href={app.href} className="inline-flex items-center gap-2 border-b border-white/50 py-2 text-xs font-semibold text-white transition hover:border-white">
                Open <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          );
        })}
      </div>

      <div className="border-b border-white/20 pb-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white">The reuse layer</p>
        <p className="mt-2 max-w-2xl font-heading text-2xl leading-snug text-white">
          Verify once. Sign in with one passkey tap. Carry proof of humanity everywhere.
        </p>
      </div>
    </AccountPageShell>
  );
}
