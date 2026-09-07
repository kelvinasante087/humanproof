import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms for using the HumanProof demo — a hackathon project on a test network, provided as-is with no warranty.",
};

export default function TermsPage() {
  return (
    <ContentPage
      title="Terms"
      updated="September 2026"
      intro="Plain-language terms for a demo. By using HumanProof you accept the points below."
    >
      <ContentSection heading="A demo, provided as-is">
        <p>
          HumanProof is a hackathon project offered for demonstration and testing. It is provided
          &ldquo;as is,&rdquo; without warranties of any kind, and may change, break, or be taken
          down at any time.
        </p>
      </ContentSection>

      <ContentSection heading="Test network, no value">
        <p>
          Everything runs on a public test network. The PROOF token is a demo token with no monetary
          value and is not an investment, security, or offer of anything of worth.
        </p>
      </ContentSection>

      <ContentSection heading="Not financial or legal advice">
        <p>
          Nothing here is financial, investment, or legal advice. Don't rely on this demo for real
          identity, custody, or financial decisions.
        </p>
      </ContentSection>

      <ContentSection heading="Acceptable use">
        <p>
          Don't attempt to abuse, attack, or interfere with the service or other people's use of it.
          We may restrict access to keep the demo working for everyone.
        </p>
      </ContentSection>

      <ContentSection heading="Liability">
        <p>
          To the fullest extent permitted by law, the maintainers are not liable for any loss
          arising from use of this demo.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
