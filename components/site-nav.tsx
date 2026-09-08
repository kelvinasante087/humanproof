"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Menu, X } from "lucide-react";
import { useOnboardingModal } from "@/components/onboarding-modal";
import { useHumanSession } from "@/components/human-session";

const privyConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

function GuestActions({
  openOnboarding,
  closeMenu,
  mobile = false,
}: {
  openOnboarding: () => void;
  closeMenu?: () => void;
  mobile?: boolean;
}) {
  const start = () => {
    closeMenu?.();
    openOnboarding();
  };

  return (
    <>
      <button
        onClick={start}
        className={mobile
          ? "w-full border-b border-white/10 px-6 py-5 text-left text-base font-semibold text-white transition-colors hover:bg-white/5"
          : "cursor-pointer px-1 py-1 text-white transition-opacity hover:opacity-75"}
      >
        Log in
      </button>
      <button
        onClick={start}
        className={mobile
          ? "w-full border-b border-white/10 px-6 py-5 text-left text-base font-semibold text-white transition-colors hover:bg-white/5"
          : "cursor-pointer rounded-full bg-white px-5 py-2 font-semibold text-black shadow-sm transition-all duration-200 hover:bg-slate-200"}
      >
        Get started
      </button>
    </>
  );
}

function AuthActions({
  openOnboarding,
  closeMenu,
  mobile = false,
}: {
  openOnboarding: () => void;
  closeMenu?: () => void;
  mobile?: boolean;
}) {
  const { ready, authenticated } = usePrivy();
  const { loading, credentialed } = useHumanSession();

  // Do not flash signed-out actions while Privy restores an existing browser session.
  if (!ready) return <span className={mobile ? "block h-16" : "h-9 w-28"} aria-hidden="true" />;

  if (!authenticated) {
    return <GuestActions openOnboarding={openOnboarding} closeMenu={closeMenu} mobile={mobile} />;
  }

  // Signed in but the credential was never finished: send them back into the flow rather than to a
  // dashboard that has nothing to show. An unknown answer falls through to Dashboard (fail open).
  if (!loading && credentialed === false) {
    return (
      <button
        onClick={() => {
          closeMenu?.();
          openOnboarding();
        }}
        className={mobile
          ? "w-full border-b border-white/10 px-6 py-5 text-left text-base font-semibold text-white transition-colors hover:bg-white/5"
          : "cursor-pointer rounded-full bg-white px-5 py-2 font-semibold text-black shadow-sm transition-all duration-200 hover:bg-slate-200"}
      >
        Continue setup
      </button>
    );
  }

  return (
    <Link
      href="/account"
      onClick={closeMenu}
      className={mobile
        ? "block w-full border-b border-white/10 px-6 py-5 text-base font-semibold text-white transition-colors hover:bg-white/5"
        : "border-b border-white/50 px-1 py-2 text-white transition-colors hover:border-white"}
    >
      Dashboard
    </Link>
  );
}

export function SiteNav() {
  const { openOnboarding } = useOnboardingModal();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  if (pathname?.startsWith("/account") || pathname === "/reviews" || pathname === "/airdrop") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black px-5 py-4 text-white sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: SVG Logo */}
        <Link href="/" onClick={() => setMobileOpen(false)} className="group flex items-center gap-2">
          <svg
            viewBox="0 0 73.44 73.44"
            className="h-8 w-8 fill-current text-white transition-transform group-hover:scale-105 sm:h-9 sm:w-9"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M36.72,0C16.44,0,0,16.44,0,36.72s16.44,36.72,36.72,36.72,36.72-16.44,36.72-36.72S57,0,36.72,0ZM31.83,39.27c-.53-.37-1.18-.68-1.97-.84-1.98-.4-4.03.33-5.35,1.89v19.52h-13.11V13.6h13.11v14.96c.91-.23,2.65-.54,4.76-.1.99.21,1.85.53,2.56.89v9.92ZM47.03,59.84h-13.13V13.6h13.13v46.23ZM57.06,48.12c-2.09,0-6.1-.63-7.96-3.14v-6.22c4.37-.03,6.11-1.07,6.11-5.93s-1.74-5.92-6.11-6.02v-13.21h4.26c9.37,0,15.11,5.67,15.11,15.35,0,10.97-3.95,19.17-11.41,19.17Z" />
          </svg>
        </Link>

        {/* Center: Nav Items */}
        <nav className="hidden items-center gap-8 text-sm font-semibold tracking-tight md:flex">
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
        <div className="hidden items-center gap-5 text-sm font-semibold tracking-tight md:flex">
          {privyConfigured ? (
            <AuthActions openOnboarding={openOnboarding} />
          ) : (
            <GuestActions openOnboarding={openOnboarding} />
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-site-menu"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          className="flex h-10 w-10 items-center justify-center border border-white/20 text-white transition-colors hover:bg-white/5 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div
          id="mobile-site-menu"
          className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto overscroll-contain border-t border-white/10 bg-black pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col">
            <Link href="/how-it-works" onClick={() => setMobileOpen(false)} className="border-b border-white/10 px-6 py-5 text-base font-semibold text-white hover:bg-white/5">
              How it works
            </Link>
            <Link href="/developers" onClick={() => setMobileOpen(false)} className="border-b border-white/10 px-6 py-5 text-base font-semibold text-white hover:bg-white/5">
              For developers
            </Link>
            <Link href="/reviews" onClick={() => setMobileOpen(false)} className="border-b border-white/10 px-6 py-5 text-base font-semibold text-white hover:bg-white/5">
              Demos
            </Link>
          </nav>
          <div className="border-t border-white/20">
            {privyConfigured ? (
              <AuthActions openOnboarding={openOnboarding} closeMenu={() => setMobileOpen(false)} mobile />
            ) : (
              <GuestActions openOnboarding={openOnboarding} closeMenu={() => setMobileOpen(false)} mobile />
            )}
          </div>
        </div>
      )}
    </header>
  );
}
