"use client";

import { useCallback } from "react";
import { usePrivy, getIdentityToken } from "@privy-io/react-auth";

/**
 * `fetch`, with proof of WHICH account is calling.
 *
 * Every route that reads the verification session now checks that the session was issued to the
 * account making the request — otherwise a cookie left behind by a previous sign-in speaks for
 * that earlier person. That check needs the caller's Privy access token, so client calls to those
 * routes must go through this wrapper rather than bare `fetch`.
 *
 * The token is short-lived and verified server-side against Privy's public keys; sending it does
 * not expose anything the browser didn't already hold.
 */
export function useAuthedFetch() {
  const { getAccessToken } = usePrivy();

  return useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers);
      try {
        const token = await getAccessToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
        const identity = await getIdentityToken();
        if (identity) headers.set("privy-id-token", identity);
      } catch {
        // No token available (signed out / Privy not ready). Let the request go and be refused
        // server-side rather than failing silently here.
      }
      return fetch(input, { ...init, headers });
    },
    [getAccessToken],
  );
}
