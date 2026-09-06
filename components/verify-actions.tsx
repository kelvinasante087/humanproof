"use client";

import { useState } from "react";

/**
 * Receipt actions for the public verify page: open the on-chain proof on Basescan, and copy the
 * shareable link to this proof. Client-only (needs window + clipboard). Kept tiny — the verify page
 * itself stays a server component that reads the seal.
 */
export function VerifyActions({ explorer }: { explorer: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {explorer && (
        <a
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          View the on-chain proof ↗
        </a>
      )}
      <button
        type="button"
        onClick={copyLink}
        className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        {copied ? "Link copied ✓" : "Copy proof link"}
      </button>
    </div>
  );
}
