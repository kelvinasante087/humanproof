"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowBigDown,
  ArrowBigUp,
  BadgeCheck,
  Bell,
  MessageCircle,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { HumanSessionBanner, useHumanSession } from "@/components/human-session";
import { useHumanProofSignIn } from "@/components/humanproof-signin";
import { useAuthedFetch } from "@/components/use-authed-fetch";
import {
  REVIEW_ITEMS,
  SEED_REVIEWS,
  REVIEWS_APP_ID,
  reviewContentHash,
  type SeedReview,
} from "@/lib/demo/reviews";

type PostedReview = SeedReview & { sealId: string };

function Stars({ n }: { n: number }) {
  return (
    <span className="tracking-[0.08em] text-amber-300" aria-label={`${n} out of 5 stars`}>
      {"★".repeat(n)}
      <span className="opacity-25">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function VerifiedBadge({ sealId }: { sealId?: string }) {
  const badge = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
      <BadgeCheck className="h-3 w-3" aria-hidden="true" />
      Verified human
    </span>
  );
  return sealId ? <Link href={`/verify/${sealId}`}>{badge}</Link> : badge;
}

export default function ReviewsPage() {
  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08090b]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ff6a33]">
              <MessageCircle className="h-5 w-5 fill-current" aria-hidden="true" />
            </span>
            <span className="font-heading text-xl">Proofit</span>
          </Link>
          <div className="relative hidden max-w-xl flex-1 sm:block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-45" />
            <div className="rounded-full border border-white/10 bg-white/[0.05] py-2.5 pl-11 pr-4 text-sm opacity-55">
              Search verified conversations
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Bell className="h-5 w-5 opacity-65" aria-hidden="true" />
            <Link href="/account" className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold">
              HumanProof
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[190px_minmax(0,680px)_260px]">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-1 text-sm">
            <Link href="/reviews" className="flex items-center gap-3 rounded-lg bg-white/[0.08] px-3 py-2.5 font-semibold">
              <MessageCircle className="h-4 w-4" /> Popular
            </Link>
            <div className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-40">
              Communities
            </div>
            {["h/producttalk", "h/ghana", "h/tech"].map((community) => (
              <div key={community} className="flex items-center gap-3 rounded-lg px-3 py-2.5 opacity-65">
                <span className="h-5 w-5 rounded-full border border-white/20 bg-white/[0.06]" />
                {community}
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111318]">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-45">h/verifiedreviews</p>
              <h1 className="mt-1 font-heading text-3xl">Real opinions from real people.</h1>
            </div>
            <div className="p-3">
              <HumanSessionBanner appLabel="Proofit" />
            </div>
          </div>

          {REVIEW_ITEMS.map((item, index) => (
            <ItemThread
              key={item.id}
              id={item.id}
              name={item.name}
              blurb={item.blurb}
              score={184 - index * 47}
            />
          ))}
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-20 overflow-hidden rounded-xl border border-white/10 bg-[#111318]">
            <div className="bg-gradient-to-r from-[#ff6a33] to-[#d74620] px-4 py-5">
              <p className="font-heading text-xl">About this community</p>
            </div>
            <div className="space-y-4 p-4 text-sm">
              <p className="leading-relaxed opacity-70">
                Product conversations where every post comes from one unique, verified human.
              </p>
              <div className="flex items-center gap-3 border-y border-white/10 py-3">
                <Users className="h-4 w-4" />
                <div>
                  <p className="font-semibold">12.4k humans</p>
                  <p className="text-xs opacity-45">No bot accounts</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs leading-relaxed opacity-60">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Read freely. Posting requires a reusable HumanProof credential.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ItemThread({
  id,
  name,
  blurb,
  score,
}: {
  id: string;
  name: string;
  blurb: string;
  score: number;
}) {
  const { verified, name: humanName } = useHumanSession();
  const seeds = SEED_REVIEWS[id] ?? [];
  const [posted, setPosted] = useState<PostedReview[]>([]);
  const commentCount = seeds.length + posted.length;

  return (
    <article className="grid grid-cols-[44px_1fr] overflow-hidden rounded-xl border border-white/10 bg-[#111318] transition hover:border-white/20">
      <div className="flex flex-col items-center gap-1 bg-black/20 py-4">
        <button type="button" aria-label="Upvote" className="opacity-55 transition hover:opacity-100">
          <ArrowBigUp className="h-5 w-5" />
        </button>
        <span className="text-xs font-bold tabular-nums">{score}</span>
        <button type="button" aria-label="Downvote" className="opacity-35 transition hover:opacity-100">
          <ArrowBigDown className="h-5 w-5" />
        </button>
      </div>

      <div className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] opacity-45">
          <span className="font-semibold">h/producttalk</span>
          <span>•</span>
          <span>posted by a verified human</span>
        </div>
        <h2 className="mt-2 font-heading text-2xl">{name}</h2>
        <p className="mt-1 text-sm opacity-65">{blurb}</p>

        <div className="mt-5 space-y-4 border-l border-white/10 pl-4">
          {commentCount === 0 && <p className="text-sm opacity-45">No comments yet.</p>}
          {seeds.map((review, index) => (
            <ReviewComment key={`seed-${index}`} review={review} sample />
          ))}
          {posted.map((review) => (
            <ReviewComment key={review.sealId} review={review} sealId={review.sealId} />
          ))}
        </div>

        <details className="group mt-5 border-t border-white/10 pt-4">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-xs font-semibold opacity-70 marker:hidden [&::-webkit-details-marker]:hidden">
            <MessageCircle className="h-4 w-4" />
            {commentCount} {commentCount === 1 ? "comment" : "comments"} · Join the discussion
          </summary>
          <ReviewForm
            itemId={id}
            verified={verified}
            authorName={humanName}
            onPosted={(review) => setPosted((current) => [...current, review])}
          />
        </details>
      </div>
    </article>
  );
}

function ReviewComment({
  review,
  sealId,
  sample,
}: {
  review: SeedReview;
  sealId?: string;
  sample?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-cyan-400/40 to-violet-500/40 text-[10px] font-bold">
          {review.author.slice(0, 2).toUpperCase()}
        </span>
        <span className="font-mono text-xs font-semibold">{review.author}</span>
        {sample && <span className="text-[9px] uppercase tracking-[0.12em] opacity-35">Sample</span>}
        <VerifiedBadge sealId={sealId} />
      </div>
      <div className="ml-9 mt-2">
        <Stars n={review.stars} />
        <p className="mt-1 text-sm leading-relaxed opacity-80">{review.body}</p>
      </div>
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
  onPosted: (review: PostedReview) => void;
}) {
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, busy: signingIn, status: signInStatus, error: signInError, passkeyState } =
    useHumanProofSignIn();
  const authedFetch = useAuthedFetch();

  async function doPost(author: string) {
    setPosting(true);
    try {
      const response = await authedFetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: REVIEWS_APP_ID,
          contentHash: reviewContentHash(itemId, body),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        onPosted({ author, stars, body, sealId: data.sealId });
        setBody("");
        setStars(5);
        return;
      }
      if (response.status === 401) setError("Only a verified human can post.");
      else if (response.status === 409) setError("You already reviewed this item as this human.");
      else setError(data.error || "Could not post that review.");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function submit() {
    setError(null);
    if (verified) {
      await doPost(authorName ?? "verified-human");
      return;
    }
    const result = await signIn();
    if (result.ok) await doPost(result.name ?? authorName ?? "verified-human");
  }

  const busy = posting || signingIn;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold">Your rating</span>
        <div className="flex gap-1 text-lg">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStars(value)}
              className={value <= stars ? "opacity-100" : "opacity-20"}
              aria-label={`${value} stars`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="What do you really think?"
        rows={3}
        className="w-full resize-none rounded-lg border border-white/10 bg-[#090a0d] px-4 py-3 text-sm outline-none transition focus:border-white/30"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs opacity-45">
          {verified ? "Your HumanProof seal will be attached." : "Sign in once to post as a real human."}
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !body.trim()}
          className="rounded-full bg-[#ff6a33] px-5 py-2.5 text-xs font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {posting
            ? "Posting…"
            : signingIn
              ? passkeyState === "awaiting-passkey"
                ? "Waiting for passkey…"
                : "Signing in…"
              : verified
                ? "Post comment"
                : "Sign in to post"}
        </button>
      </div>
      {signInStatus === "onboarding" && (
        <p className="mt-3 text-xs opacity-65">
          You need a HumanProof credential. <Link href="/" className="underline">Create one</Link>.
        </p>
      )}
      {(error || signInError) && <p className="mt-3 text-sm text-rose-300">{error || signInError}</p>}
    </div>
  );
}
