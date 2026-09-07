import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about HumanProof — what it is, what it stores, and how the reusable proof-of-human credential works.",
};

export default function FaqPage() {
  return (
    <ContentPage
      title="Frequently asked questions"
      intro="The short version of what HumanProof is and how it treats your identity."
    >
      <ContentSection heading="What is HumanProof?">
        <p>
          A reusable proof-of-human layer. You prove once that you're a real, unique person, and
          any app can then check that fact without you verifying again. See{" "}
          <Link href="/how-it-works" className="underline underline-offset-2 hover:text-white">
            how it works
          </Link>
          .
        </p>
      </ContentSection>

      <ContentSection heading="Do you store my name, face, or ID?">
        <p>
          No. The personhood check confirms you're a unique human without uploading a photo, a
          document, or your legal name. Apps that rely on HumanProof learn only that you're a
          verified human — never who you are.
        </p>
      </ContentSection>

      <ContentSection heading="What stops one person from making many accounts?">
        <p>
          Each proof is tied to a per-person secret, so the same human resolves to the same
          credential. That's what lets the airdrop enforce one claim per person and the reviews app
          keep out review farms — the block is keyed to the person, not the wallet.
        </p>
      </ContentSection>

      <ContentSection heading="Is this on mainnet? Is PROOF worth anything?">
        <p>
          This is a hackathon demo running on a test network. The PROOF token is a demo token with
          no monetary value, and the airdrop exists to show the one-per-human mechanic — not to
          distribute anything of worth.
        </p>
      </ContentSection>

      <ContentSection heading="Can I use HumanProof in my own app?">
        <p>
          That's the idea. The{" "}
          <Link href="/developers" className="underline underline-offset-2 hover:text-white">
            developer page
          </Link>{" "}
          shows how an app asks HumanProof whether a visitor is a verified, unique human.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
