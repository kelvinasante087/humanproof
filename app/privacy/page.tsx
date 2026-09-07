import type { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What HumanProof collects, what it deliberately does not, and the third parties involved. Written for a hackathon demo on a test network.",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy"
      updated="September 2026"
      intro="HumanProof is built so that proving you're human doesn't mean handing over who you are. This page explains what that means in practice."
    >
      <ContentSection heading="This is a demo">
        <p>
          HumanProof is a hackathon project running on a public test network. It is not a production
          service, and you should not treat it as one or submit real sensitive information to it.
        </p>
      </ContentSection>

      <ContentSection heading="What we deliberately don't collect">
        <p>
          We don't ask for or store your legal name, your face, or any government ID. The personhood
          check confirms uniqueness without those. Apps built on HumanProof learn only that you're a
          verified, unique human.
        </p>
      </ContentSection>

      <ContentSection heading="What is processed">
        <p>
          To make the proof reusable, we keep a per-person identifier server-side and a record that
          a given app action came from a verified human. An email address (if you sign in with one)
          and an automatically-created embedded wallet address act as anchors for your credential.
        </p>
      </ContentSection>

      <ContentSection heading="Third parties">
        <p>
          The demo relies on World for the personhood check, Privy for sign-in and the embedded
          wallet, and Convex for backend storage. Interactions are recorded on a public test
          blockchain, which by design is permanent and publicly observable.
        </p>
      </ContentSection>

      <ContentSection heading="Contact">
        <p>
          Questions about this demo can go to the project maintainer via the GitHub repository linked
          in the footer.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
