"use client";

import { CircleCheck, Sparkles } from "lucide-react";
import { AccountPageShell } from "@/components/account-page-shell";

const updates = [
  {
    date: "7 Sep 2026",
    title: "Real Holdings balances",
    description: "Your Credential dashboard now reads live PROOF and Base Sepolia ETH balances from the embedded wallet.",
  },
  {
    date: "6 Sep 2026",
    title: "Profile avatars",
    description: "Choose a HumanProof avatar that persists with your credential and follows you across devices.",
  },
  {
    date: "5 Sep 2026",
    title: "Passkey sign-in",
    description: "Returning humans can restore their verified session with one passkey tap — no repeated World ID check.",
  },
];

export default function UpdatesPage() {
  return (
    <AccountPageShell
      title="Updates"
      description="What’s new across the HumanProof credential and demo ecosystem."
    >
      <div className="border-t border-white/20">
        {updates.map((update, index) => (
          <article key={update.title} className={`flex gap-4 p-5 sm:p-6 ${index < updates.length - 1 ? "border-b border-white/10" : ""}`}>
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-white">
              {index === 0 ? <Sparkles className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-heading text-lg text-white">{update.title}</h2>
                {index === 0 && (
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white">● New</span>
                )}
              </div>
              <p className="mt-1 text-xs text-white">{update.date}</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white">{update.description}</p>
            </div>
          </article>
        ))}
      </div>
    </AccountPageShell>
  );
}
