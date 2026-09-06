/**
 * "For Developers" — the one call an outside app makes to plug into the HumanProof layer.
 * Deliberately small: this sells the moat (one integration point, zero identity handling), it is
 * NOT a full SDK. The two demo apps on this site make exactly this call.
 */
export const metadata = {
  title: "HumanProof — For developers",
  description: "Plug the verified-human layer into any app with one call to /attest.",
};

const REQUEST_SNIPPET = `// Your app, when a user takes an action you want gated to a real human:
const res = await fetch("https://<your-humanproof-host>/api/attest", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",              // carries the user's HumanProof session
  body: JSON.stringify({
    appId: "your-app",                 // your app's id (namespaces the action)
    contentHash: "the action, e.g. review:item-42:great product",
  }),
});

// 200  -> { sealId, txHash, appId, explorer }   the action is sealed on-chain
// 401  -> the user isn't a verified human yet    (send them to verify)
// 409  -> this human already did this action      (Sybil / one-per-human)
// 503  -> sealing not configured on that host`;

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
      <code>{children}</code>
    </pre>
  );
}

export default function DevelopersPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">For developers</h1>
        <p className="text-muted-foreground text-sm">
          HumanProof is a reusable proof-of-human trust layer. Your app plugs in with{" "}
          <span className="font-medium">one call</span> — you never build bot defenses again, and
          you never handle anyone&apos;s identity.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          The one call
        </h2>
        <p className="text-sm text-slate-600">
          Send a hash of the action and your app id. The verified human comes from{" "}
          <span className="font-medium">their HumanProof session</span> — not from anything you
          pass. You get back a seal reference and a real on-chain transaction.
        </p>
        <Code>{REQUEST_SNIPPET}</Code>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          What you get back
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-slate-600">
          <li>
            <span className="font-mono text-slate-800">sealId</span> — a public reference. Link it
            as your &quot;verified human&quot; badge; it opens the public verify page.
          </li>
          <li>
            <span className="font-mono text-slate-800">txHash</span> +{" "}
            <span className="font-mono text-slate-800">explorer</span> — the seal anchored on Base,
            checkable by anyone.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-sm font-semibold text-emerald-900">The privacy guarantee</h2>
        <p className="mt-2 text-sm text-emerald-800">
          The response never contains a name, an email, a wallet, or anything about who the human
          is. HumanProof proves a <span className="font-medium">real, unique</span> person acted —
          and forgets who. Each app gets its own unlinkable handle for a person, so no one can
          follow a user from your app to the next.
        </p>
      </section>
    </main>
  );
}
