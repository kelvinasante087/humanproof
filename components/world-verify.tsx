"use client";

import { useState } from "react";
import {
  IDKitRequestWidget,
  selfieCheckLegacy,
  type IDKitResult,
  type IDKitErrorCodes,
} from "@worldcoin/idkit";
import { WORLD_APP_ID, WORLD_ACTION, WORLD_ENV } from "@/lib/world";
import { Button } from "@/components/ui/button";

/**
 * The proof-of-human step. After sign-in, the user proves once (via World's
 * Selfie Check) that they're a real, unique human. We come away with a
 * nullifier held server-side in session — the anchor the rest of the layer
 * (credential -> ENS name -> sealed actions) keys off.
 *
 * `selfieCheckLegacy()` IS Selfie Check (a naming artifact) and returns a
 * World ID 3.0 proof, so the widget must run with `allow_legacy_proofs`.
 *
 * The security split: `handleVerify` runs BEFORE `onSuccess`. It POSTs the
 * proof to our server; if the server doesn't confirm it, we THROW, which aborts
 * to `onError` and never fires success. Nothing is granted unless our backend
 * verified the proof against World.
 */

type RpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

type Status = "idle" | "preparing" | "verifying" | "verified" | "error";

export function WorldVerify() {
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Sign an rp_context server-side, then open the widget. The signing key never
  // leaves the server — the client only receives the signed context.
  async function start() {
    setStatus("preparing");
    setMessage(null);
    try {
      const res = await fetch("/api/world/sign", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.rp_context) {
        throw new Error(data?.error || "Could not prepare verification.");
      }
      setRpContext(data.rp_context as RpContext);
      setOpen(true);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not prepare verification.");
    }
  }

  // Runs before onSuccess. Throwing aborts to onError → nothing is granted.
  async function handleVerify(result: IDKitResult) {
    setStatus("verifying");
    const res = await fetch("/api/world/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Verification failed.");
    }
  }

  function handleSuccess() {
    setStatus("verified");
    setOpen(false);
  }

  function handleError(code: IDKitErrorCodes) {
    setStatus("error");
    setMessage(`Verification didn't complete (${String(code)}).`);
    setOpen(false);
  }

  if (status === "verified") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        <span className="font-medium">Verified human ✓</span> — an anonymous proof
        is held for this session. No personal data stored.
      </div>
    );
  }

  const busy = status === "preparing" || status === "verifying";

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={start} disabled={busy}>
        {status === "preparing"
          ? "Preparing…"
          : status === "verifying"
            ? "Verifying…"
            : "Verify you're human"}
      </Button>
      <p className="text-muted-foreground text-xs">
        Opens World Selfie Check. In staging this runs in the browser simulator —
        no phone needed.
      </p>
      {message && <p className="text-destructive text-sm">{message}</p>}

      {rpContext && (
        <IDKitRequestWidget
          app_id={WORLD_APP_ID}
          action={WORLD_ACTION}
          rp_context={rpContext}
          allow_legacy_proofs={true}
          environment={WORLD_ENV}
          preset={selfieCheckLegacy()}
          open={open}
          onOpenChange={setOpen}
          handleVerify={handleVerify}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}
    </div>
  );
}
