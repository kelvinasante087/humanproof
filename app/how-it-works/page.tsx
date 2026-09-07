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
      intro="Prove you're a real, unique person once. Reuse that proof everywhere, without ever showing an app your name, face, or documents."
    >
      <ContentSection heading="1 · Prove you're human, once">
        <p>
          You complete a personhood check with World and secure it with a passkey on your
          device — a fingerprint or face scan that never leaves your phone or laptop. No name, no
          photo, and no ID document is uploaded or stored.
        </p>
      </ContentSection>

      <ContentSection heading="2 · Get a reusable credential">
        <p>
          That check mints a HumanProof credential tied to a per-person secret. An embedded wallet
          is created for you automatically as an anchor — there’s nothing to fund and no seed
          phrase to write down.
        </p>
      </ContentSection>

      <ContentSection heading="3 · Reuse it across apps">
        <p>
          When an app asks &ldquo;is this a real, unique human?&rdquo;, HumanProof answers yes or no.
          The app learns that one fact and nothing else — not who you are. Because the proof is
          reusable, you never have to verify again.
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
            PROOF airdrop
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
