import Link from "next/link";
import { dbConfigured, getSealByRef } from "@/lib/db";
import { SEAL_EXPLORER } from "@/lib/seal/config";

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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 p-6">
      {children}
    </main>
  );
}

export default async function VerifyPage({ params }: PageProps<"/verify/[id]">) {
  const { id } = await params;
  const sealRef = id?.trim();

  if (!dbConfigured()) {
    return (
      <Shell>
        <div className="w-full rounded-xl border bg-white p-6 text-center">
          <p className="text-sm text-slate-600">
            The verification store is being provisioned. This link will show its proof once the
            layer is live.
          </p>
        </div>
      </Shell>
    );
  }

  const seal = sealRef ? await getSealByRef(sealRef) : null;

  if (!seal) {
    return (
      <Shell>
        <div className="w-full rounded-xl border bg-white p-6 text-center">
          <h1 className="text-lg font-semibold">Nothing sealed here</h1>
          <p className="mt-2 text-sm text-slate-600">
            We couldn&apos;t find a sealed action for that reference.
          </p>
        </div>
      </Shell>
    );
  }

  const when = new Date(seal.createdAt).toUTCString();
  const explorer = seal.txHash ? `${SEAL_EXPLORER}/tx/${seal.txHash}` : null;

  return (
    <Shell>
      <div className="w-full rounded-xl border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          A real, unique human did this.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          This was {appPhrase(seal.appId)}, sealed on{" "}
          <span className="font-medium text-slate-800">{when}</span>. It proves one real, unique
          person did it —{" "}
          <span className="font-medium text-slate-800">
            no name, no face, nothing about who they are
          </span>
          .
        </p>
      </div>

      <div className="w-full rounded-xl border bg-slate-50 p-5">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          The trustless receipt
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Don&apos;t take our word for it. The seal is anchored on Base — anyone can check the
          transaction:
        </p>
        {explorer ? (
          <a
            href={explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block font-mono text-sm break-all text-indigo-600 underline underline-offset-2"
          >
            {seal.txHash}
          </a>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            On-chain transaction is being confirmed.
          </p>
        )}
      </div>

      <Link href="/" className="text-sm text-slate-500 underline underline-offset-2">
        What is HumanProof?
      </Link>
    </Shell>
  );
}
