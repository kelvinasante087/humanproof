"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Thin top nav so a viewer (and the camera) can move between the layer and its two demo apps.
 * The layer is first and named as the layer; Reviews and Airdrop are labelled "demo" so nobody
 * mistakes a demo for the product.
 */
const LINKS = [
  { href: "/", label: "HumanProof", hint: "the layer" },
  { href: "/reviews", label: "Reviews", hint: "demo" },
  { href: "/airdrop", label: "Airdrop", hint: "demo" },
  { href: "/developers", label: "For developers", hint: null },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full items-center gap-1 border-b bg-white/70 px-4 py-2 text-sm backdrop-blur">
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="font-medium">{link.label}</span>
            {link.hint && (
              <span
                className={`ml-1.5 text-xs ${active ? "text-slate-300" : "text-slate-400"}`}
              >
                {link.hint}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
