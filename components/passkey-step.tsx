"use client";

import { useState } from "react";
import { usePrivy, useLinkWithPasskey } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

/**
 * Step 3 of the credential: bind a passkey to the already-signed-in user.
 *
 * We use Privy's LINK flow — `useLinkWithPasskey().linkWithPasskey()` — which
 * attaches a passkey to the existing account (created earlier via email). This
 * is deliberately NOT signup/login-with-passkey: the user already exists, we're
 * tying the credential to this device (Windows Hello, or a QR hand-off to a phone).
 *
 * "Device secured" is read off the durable account object, not local state:
 * a bound passkey shows up in `user.linkedAccounts` as an entry with
 * `type === 'passkey'` and a `credentialId`. That survives reloads.
 *
 * The step stays locked until the human-verification step has succeeded this
 * session (`unlocked`), so the card always reads: verify human → add passkey.
 */
export function PasskeyStep({ unlocked }: { unlocked: boolean }) {
  const { user } = usePrivy();
  const { linkWithPasskey, state } = useLinkWithPasskey();
  const [error, setError] = useState<string | null>(null);

  const hasPasskey =
    user?.linkedAccounts?.some((account) => account.type === "passkey") ?? false;

  const busy =
    state.status === "generating-challenge" ||
    state.status === "awaiting-passkey" ||
    state.status === "submitting-response";

  async function addPasskey() {
    setError(null);
    try {
      await linkWithPasskey();
      // On success Privy updates `user`; `hasPasskey` re-renders to the secured
      // state. Nothing else to do here.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't add the passkey. Please try again.",
      );
    }
  }

  // Durable secured state — read from the account, works on reload.
  if (hasPasskey) {
    return (
      <div className="flex flex-col gap-2 border-t pt-4">
        <span className="text-sm font-medium">Device secured</span>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="font-medium">Passkey added ✓</span> — this credential
          is bound to your device. Only you can use it.
        </div>
      </div>
    );
  }

  // Locked until the verify step has passed this session.
  if (!unlocked) {
    return (
      <div className="flex flex-col gap-2 border-t pt-4 opacity-60">
        <span className="text-sm font-medium">Add a passkey</span>
        <p className="text-muted-foreground text-xs">
          Available after you verify you&apos;re human.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <span className="text-sm font-medium">Add a passkey</span>
      <Button onClick={addPasskey} disabled={busy}>
        {state.status === "awaiting-passkey"
          ? "Waiting for passkey…"
          : busy
            ? "Adding…"
            : "Add passkey"}
      </Button>
      <p className="text-muted-foreground text-xs">
        Binds this credential to your device — use Windows Hello, or scan the QR
        to add it from your phone.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
