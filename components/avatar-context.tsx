"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Profile avatars. Every human is assigned one of ten SVG avatars *deterministically* from their
 * stable account id — so the same person always gets the same face, and it's never a fixed default
 * for everyone. They can override it in settings; the choice is remembered per-account in the
 * browser (mirrors how the card colorway is persisted). Move to Convex if cross-device sync is
 * needed later — this context is the single seam the rest of the UI reads from.
 */

export const AVATAR_IDS = [
  "avatar_01", "avatar_02", "avatar_03", "avatar_04", "avatar_05",
  "avatar_06", "avatar_07", "avatar_08", "avatar_09", "avatar_10",
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export const avatarSrc = (id: AvatarId): string => `/avatars/${id}.svg`;

/** Stable, well-distributed index from a seed string → one of the ten avatars. */
export function defaultAvatarFor(seed: string): AvatarId {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return AVATAR_IDS[(h >>> 0) % AVATAR_IDS.length];
}

const storageKey = (seed: string) => `humanproof-avatar:${seed}`;

type AvatarContextValue = {
  avatarId: AvatarId;
  setAvatarId: (id: AvatarId) => void;
  avatars: readonly AvatarId[];
};

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const { user } = usePrivy();
  const seed = user?.id ?? user?.wallet?.address ?? "guest";
  const fallback = useMemo(() => defaultAvatarFor(seed), [seed]);
  const [avatarId, setAvatarIdState] = useState<AvatarId>(fallback);

  // Resolve to the saved choice for this account (or its deterministic default) once we know who
  // the human is — and whenever the account changes.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(storageKey(seed));
    } catch {
      stored = null;
    }
    // Intentional post-mount sync from localStorage (an external store). Server and first client
    // render both use the deterministic default, so this avoids a hydration mismatch by design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvatarIdState(
      stored && (AVATAR_IDS as readonly string[]).includes(stored)
        ? (stored as AvatarId)
        : defaultAvatarFor(seed),
    );
  }, [seed]);

  const setAvatarId = (id: AvatarId) => {
    setAvatarIdState(id);
    try {
      window.localStorage.setItem(storageKey(seed), id);
    } catch {
      // Non-fatal — a private window just won't remember the choice.
    }
  };

  return (
    <AvatarContext.Provider value={{ avatarId, setAvatarId, avatars: AVATAR_IDS }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar(): AvatarContextValue {
  const ctx = useContext(AvatarContext);
  if (!ctx) {
    // Defensive: outside the provider, fall back to a stable guest avatar rather than crash.
    return { avatarId: defaultAvatarFor("guest"), setAvatarId: () => {}, avatars: AVATAR_IDS };
  }
  return ctx;
}

/** The settings control: pick one of the ten avatars. Selection persists via the context. */
export function AvatarPicker() {
  const { avatarId, setAvatarId, avatars } = useAvatar();
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-semibold tracking-wider uppercase text-white/50">
        Profile picture
      </span>
      <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-10">
        {avatars.map((id) => {
          const selected = id === avatarId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setAvatarId(id)}
              aria-pressed={selected}
              aria-label={`Choose ${id.replace("_", " ")}`}
              className={`relative aspect-square overflow-hidden rounded-full border transition-all cursor-pointer ${
                selected
                  ? "border-emerald-400 ring-2 ring-emerald-400/40"
                  : "border-white/15 hover:border-white/40"
              }`}
            >
              <Image
                src={avatarSrc(id)}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
