import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Turbopack doesn't pick up a
  // stray lockfile in a parent directory as the root.
  turbopack: {
    root: __dirname,
  },
  images: {
    // Allow our own trusted SVG brand marks (World ID / ENS / Privy) and the
    // HumanProof logo to be served through next/image. Without this the
    // optimizer returns 400 for SVGs and the <Image> renders blank. The CSP +
    // attachment disposition keep the served SVGs sandboxed.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
