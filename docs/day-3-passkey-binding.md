# Day 3 — Bind a passkey to the signed-in user (spec)

_Written before building, in plan mode, and committed as our AI-attribution proof.
This is the spec the Day-3 code implements._

## Where this sits in the product

HumanProof is a reusable **proof-of-human trust layer**. The flow so far: a person signs in
(Privy email + invisible embedded wallet), then proves once they're a **real, unique human**
(World Selfie Check → a session-held nullifier). Today's step **binds the credential to this
device**: the user adds a passkey, so the proof isn't just "some session" — it's tied to a
key that only this person, on this device (or their phone), can use.

Reading order in the signed-in card, after today:

> signed in → **verify human** → **add passkey**

Day 4 adds the ENS name after this, and only then writes the nullifier to the DB.

## The exact Privy API (verified against the installed package, not the notes)

Checked against `@privy-io/react-auth@3.40.0` type declarations on 2026-09-04:

- **Hook:** `useLinkWithPasskey()` → `{ linkWithPasskey, state }`.
  - `linkWithPasskey(options?: { name?: string }): Promise<void>` — binds a passkey to the
    **already-authenticated** user. This is the LINK flow, distinct from
    `useSignupWithPasskey` (creates a new account) and `useLoginWithPasskey` (logs a returning
    user in). We want LINK because the user already exists via email.
  - `state: PasskeyFlowState` — a status machine we can drive the UI from:
    `'initial' | 'generating-challenge' | 'awaiting-passkey' | 'submitting-response' | 'done' |
    'error'` (the `error` variant carries an `Error | null`).
  - Privy marks this hook `@experimental`, but it is shipped and fully typed.

- **"Device secured" check (durable):** a bound passkey appears in `user.linkedAccounts` as an
  entry with `type === 'passkey'` and a `credentialId: string`
  (`PasskeyWithMetadata` in the types). If the user has at least one such entry, the device is
  bound. This lives on the Privy **account**, so it survives page reloads — unlike the verify
  state, which is per-session.

- **Provider config:** none required. There is no code-side flag to enable passkey *linking*;
  passkeys are enabled in the **Privy dashboard** for the app. (The optional
  `config.passkeys` block only tunes MFA-unlink behavior and WebAuthn registration hints — not
  needed here.) So `app/providers.tsx` is left unchanged today.

## The flow

1. User is signed in and has completed the verify step **this session**.
2. The card shows an "Add a passkey" step. Before verification it's shown as a locked/upcoming
   step ("available after you verify") so the order is unmistakable.
3. User clicks **Add passkey** → `linkWithPasskey()` runs. The browser's native passkey UI
   opens (Windows Hello, or a QR hand-off to a phone for a cross-device passkey).
4. On success, Privy updates the user object; we read `user.linkedAccounts` for a
   `type === 'passkey'` entry and flip the card to **"Device secured ✓"**.
5. On error/cancel, we show a plain message and let them retry. Nothing else changes.

## State & ordering (how the card enforces the sequence)

- The **verified** signal is lifted out of the verify component up to the signed-in card, via
  an `onVerified` callback. The card owns the order and only unlocks the passkey step once
  verification has succeeded in this session.
- The **secured** signal is read from `user.linkedAccounts` (durable, account-level). If a
  returning user already has a passkey bound, the passkey step shows secured immediately.

## Scope guard (what we deliberately do NOT do today)

- **No database writes.** The nullifier stays in the session cookie only. Persistence is Day 4
  (after the ENS step), so an incomplete flow leaves no trace and the user can cleanly restart.
- **No second passkey library.** We use Privy's native passkey (one implementation).
- **No MFA enrollment.** Linking one passkey is enough to make the device-bound point; MFA
  (`useMfaEnrollment`) is out of scope.

## Verify end-to-end (acceptance)

Sign in with Privy → complete the verify step → click **Add passkey** → create a passkey
(Windows Hello or cross-device QR) → the passkey appears in `user.linkedAccounts` and the card
flips to the secured state. Build stays green; deploy.

**Dashboard prerequisite:** passkeys must be enabled for the app in the Privy dashboard for the
native prompt to fire. The code is correct independent of that toggle.

## Verified (2026-09-05)

Ran the full flow on localhost against the real Privy app: signed in → **Verify you're human**
(World staging simulator) → verified → **Add passkey** → Windows Hello → the card flipped to
"Device secured — Passkey added ✓". The secured state is read from a real
`type === 'passkey'` entry on the user's Privy account, so it's genuine and durable. Nullifier
stayed in the session; no DB write.

Prereqs that had to be set outside the code: enabling the Passkey login method in the Privy
dashboard, and (separately) turning OFF Vercel deployment protection so the live URL is public.
Localhost was used for the passkey test because Privy trusts it by default; the live vercel.app
domain still needs adding to Privy's allowed origins before the passkey works there (a pre-demo
follow-up, not a code change).
