import { onboardingReadiness } from "@/lib/readiness";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await onboardingReadiness(), { headers: { "Cache-Control": "no-store" } });
}
