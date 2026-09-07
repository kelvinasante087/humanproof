import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Website",
  description: "Frontend website",
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
