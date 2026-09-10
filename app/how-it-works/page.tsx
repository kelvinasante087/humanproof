import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How HumanProof turns a one-time proof of personhood into a credential you can reuse across apps — without handing over your identity.",
};

export default function HowItWorksPage() {
  return (
    <ContentPage
      title="How it works"
      intro="Create a human credential, then reuse it to post on Proofit and enter Airdroppa."
    >
      <ContentSection heading="1 · Prove you're human, once">
        <p>
          First we check that the required services are available. You sign in, complete the
          configured World check, add a passkey and choose an ENS name. HumanProof does not
          receive your face image. World Selfie Check is active in staging for this browser demo; the approved Sandbox app remains available for the phone path.
        </p>
      </ContentSection>

      <ContentSection heading="2 · Get a reusable credential">
        <p>
          Your credential links the verified fingerprint to your account and chosen ENS name.
          Privy creates an embedded wallet. If you leave midway, sign back into the same account
          to resume. A credential is complete only after its name transaction and saved record succeed.
        </p>
      </ContentSection>

      <ContentSection heading="3 · Reuse it across apps">
        <p>
          A returning account restores its credential without repeating the World step in the
          same environment. Proofit gates posting; Airdroppa gates entry and one payout. Public
          names and chain records can be linked. Passkeys may sync across your devices.
        </p>
      </ContentSection>

      <ContentSection heading="See it working">
        <p>
          Two demo apps ride on the same proof: a{" "}
          <Link href="/reviews" className="underline underline-offset-2 hover:text-white">
            Reviews app
          </Link>{" "}
          where only verified humans can post (keeping out fake-review farms), and a{" "}
          <Link href="/airdrop" className="underline underline-offset-2 hover:text-white">
            Airdroppa PROOF campaign
          </Link>{" "}
          where each person can claim once (keeping out bot farms). Verify in one, and the other
          already recognises you.
        </p>
        <p className="text-sm text-white/60">
          This is a hackathon demo running on a test network. Tokens have no monetary value.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
