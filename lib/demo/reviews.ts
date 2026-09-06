/**
 * Demo content for the Reviews showcase app — decided in advance (prep/05_demo_content.md) so the
 * demo shows a believable little world, not "asdf test123".
 *
 * IMPORTANT (honesty): the SEED reviews below are static sample data representing reviews that were
 * already posted by verified humans. They render with the verified styling but are NOT live seals.
 * The review posted LIVE on camera is the real one — it calls /attest and gets a real seal + badge.
 * Nothing here is a stubbed integration claimed as real: seeds are labelled sample data, in the UI
 * copy and here.
 */

export type ReviewItem = {
  id: string;
  name: string;
  blurb: string;
};

export type SeedReview = {
  author: string; // an ENS handle under humanproof.eth
  stars: number; // 1..5
  body: string;
};

/** The three items. Aurora is the primary on-camera item (headphones = fake-review capital). */
export const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "aurora-headphones",
    name: "Aurora Wireless Headphones",
    blurb: "Over-ear, active noise cancelling.",
  },
  {
    id: "kente-roast",
    name: "Kente Roast",
    blurb: "Ghana single-origin coffee, whole bean.",
  },
  {
    id: "nomad-backpack",
    name: "Nomad 30L Backpack",
    blurb: "Carry-on travel backpack.",
  },
];

/** Seed reviews shown as already-posted (verified). Only Aurora has seeds, per the prep. */
export const SEED_REVIEWS: Record<string, SeedReview[]> = {
  "aurora-headphones": [
    {
      author: "ama.humanproof.eth",
      stars: 5,
      body: "Trusted a real review for once. Sound's unreal, and the badge is the only reason I believed it. No fakes here.",
    },
    {
      author: "kofi.humanproof.eth",
      stars: 4,
      body: "Genuinely happy with these. Battery could be better, but it's nice knowing every review here is an actual person.",
    },
  ],
};

/** The appId the Reviews app presents to the /attest layer. */
export const REVIEWS_APP_ID = "reviews";

/** The content string sealed for one review. The /attest route hashes it to a bytes32 on-chain. */
export function reviewContentHash(itemId: string, body: string): string {
  return `${REVIEWS_APP_ID}:${itemId}:${body}`;
}
