"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HumanSessionBanner, useHumanSession } from "@/components/human-session";
import { useHumanProofSignIn } from "@/components/humanproof-signin";
import {
  REVIEW_ITEMS,
  SEED_REVIEWS,
  REVIEWS_APP_ID,
  reviewContentHash,
  type SeedReview,
} from "@/lib/demo/reviews";

/** A review that was just posted live — carries the real seal reference for its verify link. */
type PostedReview = SeedReview & { sealId: string };

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-500" aria-label={`${n} out of 5 stars`}>
      {"★".repeat(n)}
      <span className="text-slate-300">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function VerifiedBadge({ sealId }: { sealId?: string }) {
  const badge = (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      ✓ Verified human
    </span>
  );
  // A live-posted review links its badge to the public verify page (the money shot). Seed reviews
  // show the badge styling only.
  return sealId ? (
    <Link href={`/verify/${sealId}`} className="hover:underline">
      {badge}
    </Link>
  ) : (
    badge
  );
}

export default function ReviewsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground text-sm">
          A demo app riding on the HumanProof layer. Anyone can read — but only a verified human
          can post, so the fake-review farms can&apos;t get in. This is the layer used for{" "}
          <span className="font-medium">abuse prevention</span>.
        </p>
      </header>

      <HumanSessionBanner appLabel="Reviews" />

      <div className="flex flex-col gap-5">
        {REVIEW_ITEMS.map((item) => (
          <ItemCard key={item.id} id={item.id} name={item.name} blurb={item.blurb} />
        ))}
      </div>
    </main>
  );
}

function ItemCard({ id, name, blurb }: { id: string; name: string; blurb: string }) {
  const { verified, name: humanName } = useHumanSession();
  const seeds = SEED_REVIEWS[id] ?? [];
  const [posted, setPosted] = useState<PostedReview[]>([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{name}</CardTitle>
        <p className="text-muted-foreground text-sm">{blurb}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          {seeds.length === 0 && posted.length === 0 && (
            <p className="text-muted-foreground text-sm">No reviews yet. Be the first verified human.</p>
          )}
          {seeds.map((r, i) => (
            <ReviewRow key={`seed-${i}`} review={r} />
          ))}
          {posted.map((r, i) => (
            <ReviewRow key={`posted-${i}`} review={r} sealId={r.sealId} />
          ))}
        </div>

        <ReviewForm
          itemId={id}
          verified={verified}
          authorName={humanName}
          onPosted={(r) => setPosted((prev) => [...prev, r])}
        />
      </CardContent>
    </Card>
  );
}

function ReviewRow({ review, sealId }: { review: SeedReview; sealId?: string }) {
  return (
    <div className="flex flex-col gap-1 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs">{review.author}</span>
        <VerifiedBadge sealId={sealId} />
      </div>
      <Stars n={review.stars} />
      <p className="text-sm">{review.body}</p>
    </div>
  );
}

function ReviewForm({
  itemId,
  verified,
  authorName,
  onPosted,
}: {
  itemId: string;
  verified: boolean;
  authorName: string | null;
  onPosted: (r: PostedReview) => void;
}) {
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The passkey sign-in is raised HERE, at the Post moment — the open-door pattern. Anyone can
  // type and read; only sealing the review needs a verified human.
  const { signIn, busy: signingIn, status: signInStatus, error: signInError, passkeyState } =
    useHumanProofSignIn();

  async function doPost(author: string) {
    setPosting(true);
    try {
      const res = await fetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: REVIEWS_APP_ID,
          contentHash: reviewContentHash(itemId, body),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onPosted({ author, stars, body, sealId: data.sealId });
        setBody("");
        setStars(5);
        return;
      }
      if (res.status === 401) setError("Only a verified human can post. Tap “Sign in with HumanProof”.");
      else if (res.status === 409) setError("You've already reviewed this item as this human.");
      else if (res.status === 503) setError("Sealing is being provisioned — try once the layer is live.");
      else setError(data.error || "Couldn't post that review.");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function submit() {
    setError(null);
    // Verified already (from onboarding or the other app) → seal straight away.
    if (verified) {
      await doPost(authorName ?? "you — verified human");
      return;
    }
    // Not verified: one passkey tap re-establishes the verified session, then the SAME post seals.
    const r = await signIn();
    if (!r.ok) return; // needsOnboarding / cancelled / error surfaced below
    await doPost(r.name ?? authorName ?? "you — verified human");
  }

  const busy = posting || signingIn;

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <span className="text-sm font-medium">Write a review</span>
      <div className="flex items-center gap-1 text-lg">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            className={n <= stars ? "text-amber-500" : "text-slate-300"}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Say something real…"
        rows={2}
        className="border-input focus-visible:ring-ring w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
      />
      <Button onClick={submit} disabled={busy || !body.trim()}>
        {posting
          ? "Posting…"
          : signingIn
            ? passkeyState === "awaiting-passkey"
              ? "Waiting for passkey…"
              : "Signing in…"
            : verified
              ? "Post review"
              : "Sign in with HumanProof to post"}
      </Button>
      {!verified && signInStatus !== "onboarding" && (
        <p className="text-muted-foreground text-xs">
          Anyone can read and type — posting seals the review to a real human. One passkey tap signs
          you in; no new verification.
        </p>
      )}
      {signInStatus === "onboarding" && (
        <p className="text-muted-foreground text-xs">
          You don&apos;t have a HumanProof credential yet.{" "}
          <Link href="/" className="underline underline-offset-2">
            Create one
          </Link>{" "}
          — it takes a minute, then you can post.
        </p>
      )}
      {(error || signInError) && (
        <p className="text-destructive text-sm">{error || signInError}</p>
      )}
    </div>
  );
}
