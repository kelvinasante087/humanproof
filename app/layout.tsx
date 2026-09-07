import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SiteNav } from "@/components/site-nav";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "HumanProof — Reusable proof of human",
    template: "%s · HumanProof",
  },
  description:
    "Prove you're a real, unique person once — then reuse it everywhere. No name, no face, nothing stored. Bots can't fake it, and humans never verify twice.",
  applicationName: "HumanProof",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/humanproof.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    siteName: "HumanProof",
    title: "HumanProof — Reusable proof of human",
    description:
      "Prove you're a real, unique person once — then reuse it everywhere. No name, no face, nothing stored.",
  },
  twitter: {
    card: "summary_large_image",
    title: "HumanProof — Reusable proof of human",
    description:
      "Prove you're a real, unique person once — then reuse it everywhere. No name, no face, nothing stored.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-white font-sans">
        <Providers>
          <SiteNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
