import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const demoApps = ["reviews", "airdrop"] as const;
export type DemoApp = (typeof demoApps)[number];
export const isDemoApp = (value: string): value is DemoApp =>
  demoApps.some((app) => app === value);
export const demoCookie = (app: DemoApp) => `humanproof_demo_${app}`;

function signature(payload: string) {
  const secret = process.env.HUMANPROOF_SESSION_SECRET;
  if (!secret) throw new Error("Session signing is not configured.");
  return createHmac("sha256", secret).update(`demo:${payload}`).digest("hex");
}

export function createDemoSession(app: DemoApp, account: string) {
  const payload = Buffer.from(JSON.stringify({
    app, account, exp: Date.now() + 60 * 60 * 1000,
  })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export async function hasDemoSession(app: DemoApp, account: string) {
  const token = (await cookies()).get(demoCookie(app))?.value;
  if (!token) return false;
  try {
    const [payload, mac, extra] = token.split(".");
    if (!payload || !mac || extra) return false;
    const expected = Buffer.from(signature(payload));
    const supplied = Buffer.from(mac);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.app === app && data.account === account && data.exp > Date.now();
  } catch {
    return false;
  }
}
