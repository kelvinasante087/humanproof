"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  ChevronDown,
  ExternalLink,
  Gift,
  LogOut,
  MessageSquareText,
  ShieldOff,
} from "lucide-react";
import { AccountPageShell } from "@/components/account-page-shell";

const apps = [
  {
    name: "Reviews",
    description: "HumanProof lets this app recognize you as a verified human without another check.",
    href: "/reviews",
    icon: MessageSquareText,
  },
  {
    name: "Airdrop",
    description: "HumanProof proves one person can make one claim without exposing their identity.",
    href: "/airdrop",
    icon: Gift,
  },
] as const;

export default function ConnectedAppsPage() {
  const { logout } = usePrivy();
  const router = useRouter();

  const signOut = async () => {
    try {
      await fetch("/api/session", { method: "DELETE" });
    } finally {
      await logout();
      router.replace("/");
    }
  };

  return (
    <AccountPageShell
      title="Connected Apps"
      description="Apps currently using your HumanProof credential."
    >
      <div className="border-t border-white/15">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <details key={app.name} className="group border-b border-white/15">
              <summary className="flex cursor-pointer list-none items-center gap-4 py-5 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.04]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="flex-1 font-heading text-xl text-white">{app.name}</h2>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-white/55 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>

              <div className="ml-[3.75rem] pb-6">
                <p className="max-w-xl text-sm leading-relaxed text-white/65">{app.description}</p>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    href={app.href}
                    className="inline-flex items-center gap-2 border-b border-white/45 pb-1 text-xs font-semibold text-white transition hover:border-white"
                  >
                    Open app
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 transition hover:text-white"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    Sign out
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Per-app access controls are not available yet"
                    className="inline-flex cursor-not-allowed items-center gap-2 text-xs font-semibold text-white opacity-35"
                  >
                    <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                    Revoke access
                  </button>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </AccountPageShell>
  );
}
