"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useOnboardingModal } from "@/components/onboarding-modal";

const privyConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

function GuestActions({ openOnboarding }: { openOnboarding: () => void }) {
  return (
    <>
      <button
        onClick={openOnboarding}
        className="text-white hover:opacity-75 transition-opacity px-1 py-1 cursor-pointer"
      >
        Log in
      </button>
      <button
        onClick={openOnboarding}
        className="bg-white text-black font-semibold px-5 py-2 rounded-full hover:bg-slate-200 transition-all duration-200 shadow-sm cursor-pointer"
      >
        Get started
      </button>
    </>
  );
}

function AuthActions({ openOnboarding }: { openOnboarding: () => void }) {
  const { ready, authenticated } = usePrivy();

  // Do not flash signed-out actions while Privy restores an existing browser session.
  if (!ready) return <span className="h-9 w-28" aria-hidden="true" />;

  if (!authenticated) return <GuestActions openOnboarding={openOnboarding} />;

  return (
    <Link
      href="/account"
      className="border-b border-white/50 px-1 py-2 text-white transition-colors hover:border-white"
    >
      Dashboard
    </Link>
  );
}

export function SiteNav() {
  const { openOnboarding } = useOnboardingModal();
  const pathname = usePathname();

  if (pathname?.startsWith("/account")) {
    return null;
  }

  return (
    <header className="w-full bg-black text-white border-b border-white/10 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: SVG Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <svg
            viewBox="0 0 73.44 73.44"
            className="h-9 w-9 text-white fill-current transition-transform group-hover:scale-105"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M36.72,0C16.44,0,0,16.44,0,36.72s16.44,36.72,36.72,36.72,36.72-16.44,36.72-36.72S57,0,36.72,0ZM31.83,39.27c-.53-.37-1.18-.68-1.97-.84-1.98-.4-4.03.33-5.35,1.89v19.52h-13.11V13.6h13.11v14.96c.91-.23,2.65-.54,4.76-.1.99.21,1.85.53,2.56.89v9.92ZM47.03,59.84h-13.13V13.6h13.13v46.23ZM57.06,48.12c-2.09,0-6.1-.63-7.96-3.14v-6.22c4.37-.03,6.11-1.07,6.11-5.93s-1.74-5.92-6.11-6.02v-13.21h4.26c9.37,0,15.11,5.67,15.11,15.35,0,10.97-3.95,19.17-11.41,19.17Z" />
          </svg>
        </Link>

        {/* Center: Nav Items */}
        <nav className="flex items-center gap-8 text-sm font-semibold tracking-tight">
          <Link
            href="/how-it-works"
            className="text-white hover:opacity-75 transition-opacity"
          >
            How it works
          </Link>
          <Link
            href="/developers"
            className="text-white hover:opacity-75 transition-opacity"
          >
            For developers
          </Link>
          <Link
            href="/reviews"
            className="text-white hover:opacity-75 transition-opacity"
          >
            Demos
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-5 text-sm font-semibold tracking-tight">
          {privyConfigured ? (
            <AuthActions openOnboarding={openOnboarding} />
          ) : (
            <GuestActions openOnboarding={openOnboarding} />
          )}
        </div>
      </div>
    </header>
  );
}


