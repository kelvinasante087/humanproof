"use client";

import { useState, type FormEvent } from "react";
import { explainReceipt, type Receipt } from "@/lib/receipts/model";

const inputClass = "w-full rounded-xl border border-neutral-300 bg-transparent px-4 py-3 text-sm dark:border-neutral-700";
export function ReceiptExplorer() {
  const [mode, setMode] = useState("app");
  const [query, setQuery] = useState("");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [indexedBlock, setIndexedBlock] = useState<number>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [payload, setPayload] = useState("");
  const [compare, setCompare] = useState(false);
  async function search(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(""); setReceipts([]); setIndexedBlock(undefined); setSearched(false);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (query.trim()) params.set(mode, query.trim());
      const response = await fetch(`/api/receipts?${params}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Receipt discovery is temporarily unavailable.");
      setReceipts(result.receipts); setIndexedBlock(result.indexedBlock); setSearched(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load receipts."); }
    finally { setLoading(false); }
  }
  return <section aria-label="Receipt discovery">
    <form onSubmit={search} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800 sm:p-7">
      <label htmlFor="receipt-mode" className="mb-2 block text-sm font-medium">Find recorded actions</label>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
        <select id="receipt-mode" value={mode} onChange={event => setMode(event.target.value)} className={inputClass}><option value="app">Application</option><option value="id">Receipt ID</option><option value="contentHash">Content hash</option></select>
        <input aria-label="Receipt search" className={inputClass} value={query} maxLength={66} onChange={event => setQuery(event.target.value)} placeholder={mode === "app" ? "e.g. reviews, or leave blank for recent" : "0x…"} />
        <button disabled={loading} className="rounded-xl bg-neutral-950 px-6 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-950">{loading ? "Searching…" : "Find receipts"}</button>
      </div>
      <details className="mt-5 text-sm"><summary className="cursor-pointer font-medium">Compare a content payload</summary><p className="my-3 text-neutral-500">Paste the exact original payload. JSON actions require the complete serialized JSON, including its field order. Whitespace and Unicode are preserved. Your payload stays in this browser.</p><textarea aria-label="Original content payload" value={payload} onChange={event => { setPayload(event.target.value); setCompare(false); }} maxLength={100000} rows={4} className={inputClass} /><button type="button" onClick={() => setCompare(true)} className="mt-3 rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700">Compare with results</button></details>
    </form>
    <div aria-live="polite" className="mt-6">
      {error && <p role="alert" className="rounded-xl border border-neutral-300 p-5 dark:border-neutral-700">{error} No substitute or sample receipts are shown.</p>}
      {indexedBlock !== undefined && <p className="mb-5 text-sm text-neutral-500">Indexed through Base Sepolia block {indexedBlock.toLocaleString()}. Up to 20 results; narrow the search to find a specific receipt.</p>}
      {searched && receipts.length === 0 && <p>No receipts found in the indexed data. A new action may still be waiting to be indexed.</p>}
      {receipts.map(receipt => {
        const evidence = explainReceipt(receipt, compare ? payload : undefined);
        return <article key={receipt.id} className="mb-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{receipt.appId}</h2><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs dark:bg-neutral-800">{evidence.integrity === "match" ? "Content matches" : evidence.integrity === "mismatch" ? "Content mismatch" : "Action recorded"}</span></div>
          <p className="break-all font-mono text-xs text-neutral-500">{receipt.id}</p>
          <p className="my-4 text-sm leading-relaxed">{evidence.explanation}</p>
          <details className="mb-4 text-sm"><summary className="cursor-pointer">Recorded content hash</summary><p className="mt-2 break-all font-mono text-xs">{receipt.contentHash}</p></details>
          <a href={evidence.evidenceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium underline underline-offset-4">Inspect transaction evidence ↗</a>
        </article>;
      })}
    </div>
  </section>;
}
