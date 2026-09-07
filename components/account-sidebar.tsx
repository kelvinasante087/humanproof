"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useHumanSession } from "@/components/human-session";
import { useAvatar, avatarSrc } from "@/components/avatar-context";
import {
  Search,
  User,
  Fingerprint,
  RotateCcw,
  Puzzle,
  Sparkles,
  ArrowRight,
  LogOut,
  Settings,
  ChevronUp,
  Menu,
  X,
} from "lucide-react";

export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = usePrivy();
  const { name } = useHumanSession();
  const { avatarId } = useAvatar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Your identity here is your claimed HumanProof handle — never your email. Falling back to the
  // email's local part leaked a private sign-in detail into the UI as if it were your name.
  const displayName = name || "Verified Human";

  const credentialItems = [
    {
      label: "Credential",
      href: "/account",
      icon: User,
      active: pathname === "/account",
    },
    {
      label: "Security & Passkeys",
      href: "/account/security",
      icon: Fingerprint,
      active: pathname === "/account/security",
    },
    {
      label: "Activity & Proofs",
      href: "/account/activity",
      icon: RotateCcw,
      active: pathname === "/account/activity",
    },
  ];

  const ecosystemItems = [
    {
      label: "Connected Apps",
      href: "/account/apps",
      icon: Puzzle,
      active: pathname === "/account/apps",
    },
    {
      label: "Updates",
      href: "/account/updates",
      icon: Sparkles,
      active: pathname === "/account/updates",
      badge: "New",
    },
  ];

  const filterItem = (item: { label: string }) =>
    !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase());

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto overscroll-contain bg-black p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white select-none lg:overflow-hidden">
      {/* Top Header & Navigation */}
      <div className="flex flex-col">
        {/* Brand Logo Lockup */}
        <Link
          href="/"
          className="flex items-center gap-2.5 mb-6 px-1 group"
          onClick={() => setMobileOpen(false)}
        >
          <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center p-1 border border-white/20 shrink-0 group-hover:border-white/40 transition-colors">
            <svg
              viewBox="0 0 73.44 73.44"
              className="w-full h-full text-white fill-current"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M36.72,0C16.44,0,0,16.44,0,36.72s16.44,36.72,36.72,36.72,36.72-16.44,36.72-36.72S57,0,36.72,0ZM31.83,39.27c-.53-.37-1.18-.68-1.97-.84-1.98-.4-4.03.33-5.35,1.89v19.52h-13.11V13.6h13.11v14.96c.91-.23,2.65-.54,4.76-.1.99.21,1.85.53,2.56.89v9.92ZM47.03,59.84h-13.13V13.6h13.13v46.23ZM57.06,48.12c-2.09,0-6.1-.63-7.96-3.14v-6.22c4.37-.03,6.11-1.07,6.11-5.93s-1.74-5.92-6.11-6.02v-13.21h4.26c9.37,0,15.11,5.67,15.11,15.35,0,10.97-3.95,19.17-11.41,19.17Z" />
            </svg>
          </div>
          <span className="font-heading text-lg font-medium text-white tracking-wide leading-none translate-y-[3px]">
            HumanProof
          </span>
        </Link>

        {/* Minimalist Search Input */}
        <div className="relative mb-5">
          <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-[52%] pointer-events-none" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111113] border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none transition-colors"
          />
        </div>

        {/* Section 1: Credential Items */}
        <div className="flex flex-col gap-1">
          {credentialItems.filter(filterItem).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 border-l px-3.5 py-2.5 text-xs font-medium transition-all ${
                  item.active
                    ? "border-white text-white font-semibold"
                    : "border-transparent text-white hover:border-white/40"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 text-white" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Minimal Divider */}
        <div className="h-[1px] bg-white/10 my-4 mx-1" />

        {/* Section 2: Ecosystem (Connected Apps, Updates, etc.) */}
        <div className="flex flex-col gap-1">
          {ecosystemItems.filter(filterItem).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between border-l px-3.5 py-2.5 text-xs font-medium transition-all ${
                  item.active
                    ? "border-white text-white font-semibold"
                    : "border-transparent text-white hover:border-white/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 text-white" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-semibold tracking-wider uppercase text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Specifically Designed Developer Card */}
      <div className="mt-auto pt-3 pb-2">
        <Link
          href="/developers"
          onClick={() => setMobileOpen(false)}
          className="group relative block w-full min-h-[96px] rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-black/70 cursor-pointer active:scale-[0.99] flex flex-col justify-end"
        >
          {/* Background Image across entire rectangle - framed nicely */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/developer-card.jpg"
              alt="Developers"
              fill
              sizes="260px"
              priority
              className="object-cover object-[center_25%] group-hover:scale-105 transition-transform duration-500"
            />
            {/* 60% black overlay across the entire image */}
            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors duration-300" />
          </div>

          {/* Content directly on top of the image */}
          <div className="relative z-10 p-3.5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-heading text-sm text-white font-medium tracking-tight leading-none drop-shadow-md">
                Developers
              </span>
              <ArrowRight className="w-4 h-4 text-white/80 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-[11px] text-white/85 font-normal leading-snug drop-shadow-md">
              1-call sybil defense for your dApp.
            </p>
          </div>
        </Link>
      </div>

      {/* Bottom Profile Dock */}
      <div className="pt-4 border-t border-white/10 px-1 relative">
        <button
          type="button"
          onClick={() => setProfileMenuOpen((open) => !open)}
          aria-expanded={profileMenuOpen}
          aria-haspopup="menu"
          className="flex w-full items-center justify-between gap-2 border-l border-transparent p-1.5 text-left transition hover:border-white/40"
        >
          <span className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 bg-white/10 shrink-0">
            <Image
              src={avatarSrc(avatarId)}
              alt="Profile avatar"
              width={28}
              height={28}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xs font-medium text-white truncate max-w-[130px]">
            {displayName}
          </span>
          </span>
          <ChevronUp className={`h-3.5 w-3.5 shrink-0 text-white/35 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} />
        </button>

          {profileMenuOpen && (
            <div role="menu" className="absolute bottom-14 left-1 right-1 bg-black border-y border-white/25 shadow-2xl py-1.5 flex flex-col z-50 animate-in fade-in-0 duration-150 font-sans">
              <Link
                href="/account/settings"
                role="menuitem"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 text-xs text-white transition-colors hover:bg-white/5"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Link>
              <button
                role="menuitem"
                onClick={async () => {
                  setProfileMenuOpen(false);
                  try {
                    await fetch("/api/session", { method: "DELETE" });
                  } finally {
                    await logout();
                    router.replace("/");
                  }
                }}
                className="w-full text-left px-3 py-2.5 text-xs text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black px-5 py-4 text-white lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center p-1 border border-white/20">
            <svg
              viewBox="0 0 73.44 73.44"
              className="w-full h-full text-white fill-current"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M36.72,0C16.44,0,0,16.44,0,36.72s16.44,36.72,36.72,36.72,36.72-16.44,36.72-36.72S57,0,36.72,0ZM31.83,39.27c-.53-.37-1.18-.68-1.97-.84-1.98-.4-4.03.33-5.35,1.89v19.52h-13.11V13.6h13.11v14.96c.91-.23,2.65-.54,4.76-.1.99.21,1.85.53,2.56.89v9.92ZM47.03,59.84h-13.13V13.6h13.13v46.23ZM57.06,48.12c-2.09,0-6.1-.63-7.96-3.14v-6.22c4.37-.03,6.11-1.07,6.11-5.93s-1.74-5.92-6.11-6.02v-13.21h4.26c9.37,0,15.11,5.67,15.11,15.35,0,10.97-3.95,19.17-11.41,19.17Z" />
            </svg>
          </div>
          <span className="font-heading text-base text-white">HumanProof</span>
        </Link>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center border border-white/20 bg-black text-white cursor-pointer"
          aria-label={mobileOpen ? "Close account navigation" : "Open account navigation"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-account-navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div id="mobile-account-navigation" className="fixed inset-0 z-50 flex bg-black/80 backdrop-blur-sm lg:hidden">
          <div className="h-[100dvh] w-[min(18rem,calc(100vw-3rem))] border-r border-white/10 bg-black shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-black select-none lg:flex xl:w-72">
        {sidebarContent}
      </aside>
    </>
  );
}
