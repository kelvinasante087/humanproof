import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
export const metadata = { title: "HumanProof — For developers", description: "The current same-origin HumanProof action API." };
const example = `// Inside this app, after HumanProof sign-in:
// Use useAuthedFetch() to attach the verified Privy access token.
const response = await authedFetch("/api/attest", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ appId: "reviews", contentHash: actionHash }),
});
// 200: { sealId, txHash, appId, explorer }, including recovered receipts
// 401: sign in / restore the account-bound HumanProof session
// 403: complete the credential or use a registered app ID
// 502 / 503: retry the SAME action to recover a pending receipt`;
export default function DevelopersPage() {
  return <ContentPage title="For developers" intro="A reusable human credential and an action receipt. The demos show two ways to apply the gate.">
    <ContentSection heading="Current integration">
      <p>Proofit allows public reading and ordinary account sign-in; posting requires HumanProof. Airdroppa requires HumanProof to enter and authorizes one PROOF payout per human.</p>
      <p>Both demos share this origin. The action endpoint requires an allowlisted app ID, a verified Privy access token and an account-bound HumanProof session. Separate registered applications can use the identity connection described below; it does not authorize actions.</p>
      <pre className="overflow-x-auto rounded-lg border border-white/15 p-4 text-xs leading-relaxed"><code>{example}</code></pre>
      <p>Proofit publishes through /api/reviews, which seals the canonical product, rating and post text before storing the public post. Different posts about the same product are allowed. Exact retries reuse the receipt.</p>
    </ContentSection>
    <ContentSection heading="Connect a separate application">
      <p>Registered applications can request explicit consent at /authorize using an exact registered redirect, random state and S256 PKCE. Their server redeems the two-minute, single-use code at /api/authorize/exchange. The response confirms a completed credential and shares its public ENS name and an application-scoped subject.</p>
      <p>No clients are enabled by default. The repository includes docs/external-identity.md and examples/identity-client/server.mjs. This is an initial identity connection, not a complete OAuth/OIDC service. Real-credential end-to-end validation is pending. It grants no wallet spending or posting permission; refresh and continuous revocation are not implemented.</p>
    </ContentSection>
    <ContentSection heading="What the receipt proves">
      <p>The authorized HumanProof server records the human fingerprint and action hash on Base Sepolia after checking the credential. A receipt proves that attestation was recorded; it does not establish that a review is truthful or that the humanity check ran on-chain.</p>
    </ContentSection>
    <ContentSection heading="Public receipt discovery"><p>People and agents can query GET /api/receipts without signing in. Filter by app, id or contentHash; limit is capped at 100. The Graph indexes the Base Sepolia contract. Missing or unhealthy infrastructure returns 503.</p><p><Link href="/verify" className="underline">Explore receipts and compare original content</Link>. Content comparison runs in your browser; no document or content upload is required.</p></ContentSection>
    <ContentSection heading="Privacy boundaries">
      <p>The receipt response omits account details, but public chain events use a consistent salted fingerprint across both demos. These events are pseudonymous and linkable. ENS names, wallets and public posts may identify their author. Pairwise identities are not implemented.</p>
      <p>World ID staging is the active demo provider so the browser simulator can complete onboarding. The approved Sandbox configuration remains available for the phone path, and Self remains a deliberate fallback. Provider environments are isolated; cross-provider person deduplication is not established.</p>
    </ContentSection>
  </ContentPage>;
}
