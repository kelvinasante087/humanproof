"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { AVATAR_IDS, avatarSrc, defaultAvatarFor, isAvatarId, type AvatarId } from "@/lib/avatars";

/**
 * Profile avatars. Every human is assigned one of ten avatars *deterministically* from their stable
 * account id — so the same person always gets the same face, never a shared default. Their chosen
 * avatar is persisted in Convex (keyed server-side by the verified session) via /api/profile/avatar,
 * so it follows them across devices. This context is the single seam the sidebar and picker read
 * from; the deterministic default shows until (and unless) a saved choice loads.
 */

export { AVATAR_IDS, avatarSrc, type AvatarId } from "@/lib/avatars";

type AvatarContextValue = {
  avatarId: AvatarId;
  setAvatarId: (id: AvatarId) => void;
  avatars: readonly AvatarId[];
};

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const { user, authenticated, ready } = usePrivy();
  const seed = user?.id ?? user?.wallet?.address ?? "guest";
  // Remount on account change so state re-seeds to that human's deterministic default, then the
  // saved choice (if any) loads over it — no hydration mismatch, no setState-in-effect.
  return (
    <AvatarProviderInner key={seed} seed={seed} enabled={ready && authenticated}>
      {children}
    </AvatarProviderInner>
  );
}

function AvatarProviderInner({
  seed,
  enabled,
  children,
}: {
  seed: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [avatarId, setAvatarIdState] = useState<AvatarId>(() => defaultAvatarFor(seed));

  // Load the saved avatar from Convex once we know who the human is. setState happens in the async
  // callback (after mount), so the first render stays on the deterministic default.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/profile/avatar")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && isAvatarId(data.avatar)) setAvatarIdState(data.avatar);
      })
      .catch(() => {
        /* keep the deterministic default on any failure */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const setAvatarId = (id: AvatarId) => {
    setAvatarIdState(id); // optimistic — reflect the choice immediately
    if (!enabled) return;
    fetch("/api/profile/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar: id }),
    }).catch(() => {
      /* best-effort; the optimistic value stays for this session */
    });
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

/** The settings control: pick one of the ten avatars. Selection persists to Convex via the context. */
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
