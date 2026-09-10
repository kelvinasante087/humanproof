import { explainReceipt, parseReceiptFilters } from "@/lib/receipts/model";
import { queryReceipts } from "@/lib/receipts/query";

export async function GET(request: Request) {
  let filters;
  try { filters = parseReceiptFilters(new URL(request.url).searchParams); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid query." }, { status: 400 }); }
  try {
    const result = await queryReceipts(filters);
    return Response.json({ ...result, receipts: result.receipts.map(receipt => ({ ...receipt, evidence: explainReceipt(receipt) })) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Receipt discovery is temporarily unavailable.", code: "INDEX_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
