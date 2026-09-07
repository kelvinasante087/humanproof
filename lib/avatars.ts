/**
 * Pure avatar helpers shared by client and server (no React, no secrets). The ten profile avatars,
 * a deterministic default from a stable seed, and a validator the API route uses to reject anything
 * that isn't one of ours.
 */

export const AVATAR_IDS = [
  "avatar_01", "avatar_02", "avatar_03", "avatar_04", "avatar_05",
  "avatar_06", "avatar_07", "avatar_08", "avatar_09", "avatar_10",
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export const avatarSrc = (id: AvatarId): string => `/avatars/${id}.svg`;

/** True if the string is one of the ten known avatar ids. */
export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === "string" && (AVATAR_IDS as readonly string[]).includes(value);
}

/** Stable, well-distributed index from a seed string → one of the ten avatars. */
export function defaultAvatarFor(seed: string): AvatarId {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return AVATAR_IDS[(h >>> 0) % AVATAR_IDS.length];
}
