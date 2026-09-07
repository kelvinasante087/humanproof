import Link from "next/link";
import { dbConfigured, getSealByRef } from "@/lib/db";
import { SEAL_EXPLORER } from "@/lib/seal/config";
import { VerifyActions } from "@/components/verify-actions";

/**
 * Public verify page — the money shot. Anyone with the link sees, in plain English, that a real,
 * unique human did something at a given time, with NO name and NO identity — and underneath, the
 * on-chain transaction as the trustless receipt. Read live from the seal (server component), so
 * this is the real record, not a picture of one.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_LABELS: Record<string, string> = {
  reviews: "a review in a reviews app",
  airdrop: "a one-per-human airdrop claim",
};

function appPhrase(appId: string): string {
  return APP_LABELS[appId] ?? `an action in "${appId}"`;
}

function shortHash(hash: string): string {
  return hash.length > 16 ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : hash;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 p-6">
      {children}
    </main>
  );
}

function Footer() {
  return (
    <Link
      href="/"
      className="text-xs text-white/45 transition-colors hover:text-white"
    >
      Verified by <span className="font-medium text-white/70">HumanProof</span> — the
      proof-of-human layer
    </Link>
  );
}

export default async function VerifyPage({ params }: PageProps<"/verify/[id]">) {
  const { id } = await params;
  const sealRef = id?.trim();

  if (!dbConfigured()) {
    return (
      <Shell>
        <div className="w-full rounded-2xl border border-white/10 bg-[#0c0c0e] p-6 text-center shadow-sm">
          <p className="text-sm text-slate-600">
            The verification store is being provisioned. This link will show its proof once the
            layer is live.
          </p>
        </div>
        <Footer />
      </Shell>
    );
  }

  const seal = sealRef ? await getSealByRef(sealRef) : null;

  if (!seal) {
    return (
      <Shell>
        <div className="w-full rounded-2xl border border-white/10 bg-[#0c0c0e] p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Nothing sealed here</h1>
          <p className="mt-2 text-sm text-slate-600">
            We couldn&apos;t find a sealed action for that reference.
          </p>
        </div>
        <Footer />
      </Shell>
    );
  }

  const when = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(seal.createdAt));
  const explorer = seal.txHash ? `${SEAL_EXPLORER}/tx/${seal.txHash}` : null;

  return (
    <Shell>
      <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-sm">
        {/* Emerald seal header */}
        <div className="flex flex-col items-center gap-3 border-b border-white/10 bg-emerald-500/10 px-8 pt-8 pb-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-3xl text-white shadow-sm">
            ✓
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            A real, unique human did this.
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            No name, no face,{" "}
            <span className="font-medium text-slate-800">nothing about who they are</span> — just
            proof a real person acted.
          </p>
        </div>

        {/* Details */}
        <dl className="divide-y">
          <div className="flex items-center justify-between gap-4 px-8 py-3.5 text-sm">
            <dt className="text-slate-500">What</dt>
            <dd className="text-right font-medium text-slate-800">{appPhrase(seal.appId)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-8 py-3.5 text-sm">
            <dt className="text-slate-500">When</dt>
            <dd className="text-right font-medium text-slate-800">{when} UTC</dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-8 py-3.5 text-sm">
            <dt className="text-slate-500">Network</dt>
            <dd className="text-right font-medium text-slate-800">Base Sepolia</dd>
          </div>
        </dl>

        {/* Receipt */}
        <div className="border-t border-white/10 bg-white/[0.03] px-8 py-6">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            The trustless receipt
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Don&apos;t take our word for it — the seal is anchored on Base, checkable by anyone.
          </p>
          {seal.txHash ? (
            <p className="mt-2 font-mono text-xs break-all text-slate-500">{shortHash(seal.txHash)}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">On-chain transaction is being confirmed.</p>
          )}
          <div className="mt-4">
            <VerifyActions explorer={explorer} />
          </div>
        </div>
      </div>

      <Footer />
    </Shell>
  );
}
