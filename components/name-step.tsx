"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PARENT = "humanproof.eth";

/**
 * Step 4 of the credential: claim <name>.humanproof.eth.
 *
 * Shown only after the passkey step (`unlocked` = verified this session AND passkey bound),
 * so the flow reads: verify human -> add passkey -> claim your name. The server route
 * re-checks the World-verification cookie before issuing — the app-level gate.
 */
export function NameStep({ unlocked, address }: { unlocked: boolean; address?: string }) {
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState<{ name: string; resolved: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ens/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't claim that name.");
        return;
      }
      setClaimed({ name: data.name, resolved: data.resolved ?? null });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (claimed) {
    return (
      <div className="flex flex-col gap-2 border-t pt-4">
        <span className="text-sm font-medium">Your name</span>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="font-mono font-medium">{claimed.name}</span> ✓ — issued to your wallet
          and resolving on Sepolia. Your credential is complete.
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex flex-col gap-2 border-t pt-4 opacity-60">
        <span className="text-sm font-medium">Claim your name</span>
        <p className="text-muted-foreground text-xs">Available after you add a passkey.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <span className="text-sm font-medium">Claim your name</span>
      <div className="flex items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="yourname"
          disabled={busy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <span className="text-muted-foreground text-sm whitespace-nowrap">.{PARENT}</span>
      </div>
      <Button onClick={claim} disabled={busy || !label.trim()}>
        {busy ? "Claiming…" : "Claim name"}
      </Button>
      <p className="text-muted-foreground text-xs">
        Only a verified, device-bound human can claim a name. It resolves like any ENS name.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
