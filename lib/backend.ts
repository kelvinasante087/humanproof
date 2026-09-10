import "server-only";
import { getFunctionName, type FunctionReference, type FunctionArgs, type FunctionReturnType } from "convex/server";
import { jsonToConvex } from "convex/values";

export function backendUrl() {
  const cloud = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  return process.env.CONVEX_HTTP_URL || cloud?.replace(/\.convex\.cloud\/?$/, ".convex.site");
}

export async function backendCall<T>(kind: "query" | "mutation", name: string, args: object): Promise<T> {
  const url = backendUrl();
  const secret = process.env.HUMANPROOF_BACKEND_SECRET;
  if (!url || !secret || secret.length < 32) throw new Error("Backend is not configured");
  const response = await fetch(`${url}/server`, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(12000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ kind, name, args }),
  });
  const data = await response.json();
  if (!response.ok) {
    const code = typeof data?.error?.code === "string" ? data.error.code : "STORE_UNAVAILABLE";
    throw new Error(code);
  }
  return jsonToConvex(data.value) as T;
}

export const backend = {
  query<T extends FunctionReference<"query">>(ref: T, args: FunctionArgs<T>): Promise<FunctionReturnType<T>> {
    return backendCall("query", getFunctionName(ref), args);
  },
  mutation<T extends FunctionReference<"mutation">>(ref: T, args: FunctionArgs<T>): Promise<FunctionReturnType<T>> {
    return backendCall("mutation", getFunctionName(ref), args);
  },
};
