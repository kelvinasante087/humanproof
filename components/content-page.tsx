import Link from "next/link";

/**
 * A simple, consistent shell for prose/content pages (How it works, FAQ, Privacy, Terms).
 * Matches the site's black canvas + white type; hierarchy comes from size, weight, and opacity
 * rather than colour, so body copy stays white.
 */
export function ContentPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="w-full bg-black text-white">
      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="text-sm font-medium text-white/60 transition-colors hover:text-white"
        >
          ← Back to home
        </Link>

        <h1 className="font-heading mt-6 text-4xl font-normal tracking-tight sm:text-5xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-5 text-lg leading-relaxed text-white/80">{intro}</p>
        )}
        {updated && (
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-white/40">
            Last updated {updated}
          </p>
        )}

        <div className="mt-12 flex flex-col gap-10">{children}</div>
      </div>
    </main>
  );
}

/** A titled section within a ContentPage. */
export function ContentSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-2xl font-normal tracking-tight">{heading}</h2>
      <div className="flex flex-col gap-3 text-base leading-relaxed text-white/80">
        {children}
      </div>
    </section>
  );
}
