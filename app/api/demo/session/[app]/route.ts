import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readBoundSession } from "@/lib/account-session";
import { createDemoSession, demoCookie, hasDemoSession, isDemoApp } from "@/lib/demo/session";

type Context = { params: Promise<{ app: string }> };
export async function GET(request: Request, context: Context) {
  const { app } = await context.params;
  if (!isDemoApp(app)) return NextResponse.json({ error: "Unknown app" }, { status: 404 });
  const bound = await readBoundSession(request);
  const authenticated = Boolean(bound && await hasDemoSession(app, bound.privyUserId));
  return NextResponse.json({ authenticated, account: authenticated ? bound?.privyUserId : null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: Context) {
  const { app } = await context.params;
  if (!isDemoApp(app)) return NextResponse.json({ error: "Unknown app" }, { status: 404 });
  const bound = await readBoundSession(request);
  if (!bound) return NextResponse.json({ error: "Sign in with HumanProof first." }, { status: 401 });
  (await cookies()).set(demoCookie(app), createDemoSession(app, bound.privyUserId), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 3600,
  });
  return NextResponse.json({ authenticated: true });
}

export async function DELETE(_request: Request, context: Context) {
  const { app } = await context.params;
  if (!isDemoApp(app)) return NextResponse.json({ error: "Unknown app" }, { status: 404 });
  (await cookies()).set(demoCookie(app), "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return NextResponse.json({ authenticated: false });
}
