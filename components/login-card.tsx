"use client";

import { useState } from "react";
import { useLoginWithEmail } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Headless email + code sign-in (Privy `useLoginWithEmail`).
 * Two steps: enter email -> enter the 6-digit code sent to the inbox.
 * Chosen over Privy's prebuilt modal so the screen can carry the HumanProof
 * brand look. No password, no seed phrase — the embedded wallet is created
 * invisibly on login (configured in providers.tsx).
 */
export function LoginCard() {
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const status = state.status;
  const codeSent =
    status === "awaiting-code-input" || status === "submitting-code";
  const sending = status === "sending-code";
  const submitting = status === "submitting-code";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in to HumanProof</CardTitle>
        <CardDescription>
          {codeSent
            ? `Enter the code we sent to ${email}.`
            : "We'll email you a one-time code. No password, no wallet setup."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!codeSent ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email) return;
              await sendCode({ email });
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={sending || !email}>
              {sending ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!code) return;
              await loginWithCode({ code });
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting || !code}>
              {submitting ? "Verifying…" : "Verify & continue"}
            </Button>
            <button
              type="button"
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
              onClick={() => {
                setCode("");
                void sendCode({ email });
              }}
            >
              Resend code
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="text-destructive mt-4 text-sm">
            Something went wrong. Please try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
