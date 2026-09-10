import type { Metadata } from "next";
import { ReceiptExplorer } from "@/components/receipt-explorer";

export const metadata: Metadata = { title: "Verify", description: "Discover HumanProof action receipts and compare content against its recorded evidence." };
export default function VerifyPage() {
  return <main className="dark min-h-screen bg-[#09090b] px-5 py-8 text-white">
    <div className="mx-auto max-w-5xl">
      <p className="mb-4 text-sm font-medium uppercase tracking-widest text-neutral-500">Public evidence</p>
      <h1 className="mb-5 font-heading text-4xl font-normal tracking-tight sm:text-6xl">Check the receipt.</h1>
      <p className="mb-10 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">Explore actions recorded by HumanProof. Compare an original payload against its receipt, then inspect the evidence yourself. No account required.</p>
      <ReceiptExplorer />
      <p className="mt-12 max-w-3xl text-sm leading-relaxed text-neutral-500">These receipts come from the HumanProof contract on Base Sepolia, a test network. A recorded action is not proof that its content is true or human-written. Legacy receipts do not identify the verification provider or record credential expiry or revocation.</p>
    </div>
  </main>;
}
