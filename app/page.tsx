"use client";

import Link from "next/link";
import { useOnboardingModal } from "@/components/onboarding-modal";

export default function Page() {
  const { openOnboarding } = useOnboardingModal();

  return (
    <div className="w-full bg-black text-white selection:bg-white selection:text-black">
      {/* 1. Hero Section */}
      <section className="min-h-[calc(100vh-73px)] w-full bg-black text-white relative overflow-hidden flex items-center py-16 px-6 sm:px-10 lg:px-16">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline, Subhead & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1] text-white font-normal">
              Prove you&apos;re human.<br />
              Once.<br />
              Trusted <span className="italic font-normal text-white">everywhere.</span>
            </h1>

            <p className="mt-6 text-white text-base sm:text-lg lg:text-xl font-normal max-w-xl leading-relaxed">
              The reusable proof-of-human layer. One call proves a real, unique
              person — no name, no face, nothing stored. Bots can&apos;t fake it,
              and humans never verify twice.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6">
              <button
                onClick={openOnboarding}
                className="bg-white text-black font-semibold text-sm sm:text-base px-7 py-3.5 rounded-full hover:bg-slate-200 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Prove you&apos;re human</span>
              </button>

              <Link
                href="#products"
                className="text-white hover:opacity-80 font-medium text-sm sm:text-base px-3 py-3 transition-opacity flex items-center gap-1.5 group"
              >
                <span>See how it works</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 flex justify-center items-center relative min-h-[350px]">
          </div>
        </div>
      </section>

      {/* 2. Products Section */}
      <section id="products" className="w-full bg-black text-white py-20 px-6 sm:px-10 lg:px-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          {/* Section Header */}
          <div className="flex flex-col items-start text-left max-w-2xl">
            <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-white font-normal">
              Every product you need.<br />
              Nothing you don&apos;t.
            </h2>
            <p className="mt-5 text-slate-300 text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
              From your first proof-of-human credential to full sybil-proof dApp integration. Built for individuals, developers, and growing ecosystems.
            </p>
          </div>

          {/* Main Full-Width Blue Feature Card (Core App) */}
          <div className="w-full rounded-[2.5rem] bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-8 sm:p-12 text-white relative overflow-hidden flex flex-col justify-between min-h-[420px] sm:min-h-[460px] shadow-2xl border border-white/20 group">
            {/* Background Light Glow Accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
              <div className="max-w-xl flex flex-col gap-4">
                {/* Logo + Product Name */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center p-2 border border-white/30">
                    <svg
                      viewBox="0 0 73.44 73.44"
                      className="w-full h-full text-white fill-current"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M36.72,0C16.44,0,0,16.44,0,36.72s16.44,36.72,36.72,36.72,36.72-16.44,36.72-36.72S57,0,36.72,0ZM31.83,39.27c-.53-.37-1.18-.68-1.97-.84-1.98-.4-4.03.33-5.35,1.89v19.52h-13.11V13.6h13.11v14.96c.91-.23,2.65-.54,4.76-.1.99.21,1.85.53,2.56.89v9.92ZM47.03,59.84h-13.13V13.6h13.13v46.23ZM57.06,48.12c-2.09,0-6.1-.63-7.96-3.14v-6.22c4.37-.03,6.11-1.07,6.11-5.93s-1.74-5.92-6.11-6.02v-13.21h4.26c9.37,0,15.11,5.67,15.11,15.35,0,10.97-3.95,19.17-11.41,19.17Z" />
                    </svg>
                  </div>
                  <span className="font-heading text-3xl sm:text-4xl text-white">
                    Core App
                  </span>
                </div>

                <div className="text-xs sm:text-sm font-medium text-blue-100/90 tracking-wide">
                  $0 / month · No fees
                </div>

                <p className="text-base sm:text-lg text-blue-50/90 font-normal leading-relaxed mt-1">
                  Your everyday account. No minimums, no monthly fees, and a proof-of-human credential that works across 150+ applications with zero markup or identity leakage.
                </p>
              </div>

              {/* Right Mockup Representation */}
              <div className="w-full lg:w-1/2 flex justify-center lg:justify-end items-center relative min-h-[220px]">
                <div className="w-64 sm:w-72 h-44 sm:h-48 rounded-2xl bg-black/40 border border-white/20 backdrop-blur-xl p-4 flex flex-col justify-between shadow-2xl transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold tracking-wider text-slate-300">HUMANPROOF VERIFIED</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="font-mono text-xs text-slate-300">0x9f2a •••• 841b</div>
                  <div className="text-[11px] text-slate-400">Reusable Identity Seal</div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-8 relative z-10">
              <button
                onClick={openOnboarding}
                className="bg-white text-black font-semibold text-sm sm:text-base px-7 py-3 rounded-full hover:bg-slate-100 transition-all duration-200 shadow-md inline-block cursor-pointer"
              >
                Get Core App
              </button>
            </div>
          </div>

          {/* Two Side-by-Side Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Invest / SDK */}
            <div className="rounded-[2.5rem] bg-[#1a1920] border border-white/10 p-8 sm:p-10 flex flex-col justify-between min-h-[380px] relative overflow-hidden group hover:border-white/20 transition-all duration-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                    <span className="font-heading text-lg font-bold text-white">I</span>
                  </div>
                  <span className="font-heading text-2xl sm:text-3xl text-white">
                    Invest
                  </span>
                </div>

                <div className="text-xs sm:text-sm font-medium text-slate-400">
                  $0 / month · No fees
                </div>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed mt-2">
                  Commission-free investing in stocks, ETFs, and crypto. Start with as little as $1 via fractional shares. Set up recurring buys and let auto-rebalancing do the work.
                </p>
              </div>

              <div className="mt-8">
                <button
                  onClick={openOnboarding}
                  className="bg-white text-black font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-slate-200 transition-all duration-200 inline-block shadow-sm cursor-pointer"
                >
                  Get Invest
                </button>
              </div>
            </div>

            {/* Card 2: Business */}
            <div className="rounded-[2.5rem] bg-[#121215] border border-white/10 p-8 sm:p-10 flex flex-col justify-between min-h-[380px] relative overflow-hidden group hover:border-white/20 transition-all duration-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center p-2">
                    <svg
                      viewBox="0 0 73.44 73.44"
                      className="w-full h-full text-black fill-current"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M36.72,0C16.44,0,0,16.44,0,36.72s16.44,36.72,36.72,36.72,36.72-16.44,36.72-36.72S57,0,36.72,0ZM31.83,39.27c-.53-.37-1.18-.68-1.97-.84-1.98-.4-4.03.33-5.35,1.89v19.52h-13.11V13.6h13.11v14.96c.91-.23,2.65-.54,4.76-.1.99.21,1.85.53,2.56.89v9.92ZM47.03,59.84h-13.13V13.6h13.13v46.23ZM57.06,48.12c-2.09,0-6.1-.63-7.96-3.14v-6.22c4.37-.03,6.11-1.07,6.11-5.93s-1.74-5.92-6.11-6.02v-13.21h4.26c9.37,0,15.11,5.67,15.11,15.35,0,10.97-3.95,19.17-11.41,19.17Z" />
                    </svg>
                  </div>
                  <span className="font-heading text-2xl sm:text-3xl text-white">
                    Business
                  </span>
                </div>

                <div className="text-xs sm:text-sm font-medium text-slate-400">
                  $0 / month · No fees
                </div>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed mt-2">
                  Business checking built for founders. Issue team expense cards, set per-card limits, run payroll, and connect 2,000+ tools via API — all from one dashboard.
                </p>
              </div>

              <div className="mt-8">
                <button
                  onClick={openOnboarding}
                  className="bg-[#242329] border border-white/20 text-white font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-white hover:text-black transition-all duration-200 inline-block shadow-sm cursor-pointer"
                >
                  Get Business
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. About Section */}
      <section id="about" className="w-full bg-black text-white py-24 px-6 sm:px-10 lg:px-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column Title */}
          <div className="lg:col-span-4">
            <h2 className="font-heading text-5xl sm:text-6xl text-white font-normal tracking-tight">
              About
            </h2>
          </div>

          {/* Right Column Content */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            {/* Visual Image Banner */}
            <div className="w-full h-72 sm:h-96 rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center p-6 group">
              <div className="absolute inset-0 bg-grid-pattern opacity-30" />
              <div className="flex flex-col items-center gap-3 relative z-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <svg
                    viewBox="0 0 73.44 73.44"
                    className="w-10 h-10 text-white fill-current"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M36.72,0C16.44,0,0,16.44,0,36.72s16.44,36.72,36.72,36.72,36.72-16.44,36.72-36.72S57,0,36.72,0ZM31.83,39.27c-.53-.37-1.18-.68-1.97-.84-1.98-.4-4.03.33-5.35,1.89v19.52h-13.11V13.6h13.11v14.96c.91-.23,2.65-.54,4.76-.1.99.21,1.85.53,2.56.89v9.92ZM47.03,59.84h-13.13V13.6h13.13v46.23ZM57.06,48.12c-2.09,0-6.1-.63-7.96-3.14v-6.22c4.37-.03,6.11-1.07,6.11-5.93s-1.74-5.92-6.11-6.02v-13.21h4.26c9.37,0,15.11,5.67,15.11,15.35,0,10.97-3.95,19.17-11.41,19.17Z" />
                  </svg>
                </div>
                <span className="font-heading text-2xl text-white">HumanProof Layer</span>
              </div>
            </div>

            {/* Statement Headline & Copy */}
            <div className="flex flex-col gap-4 max-w-3xl">
              <h3 className="font-heading text-3xl sm:text-4xl lg:text-5xl text-white font-normal leading-snug tracking-tight">
                Founded on the belief that human verification can be honest.
              </h3>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mt-2">
                Every person deserves a digital presence free from AI impersonation, without handing over their face, identity, or passport to central databases. HumanProof was built to make proof-of-humanity reusable, instant, and zero-knowledge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Full-Width CTA Banner */}
      <section className="w-full bg-black text-white py-16 px-6 sm:px-10 lg:px-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="w-full rounded-[2.5rem] bg-gradient-to-r from-[#0a2347] via-[#08356b] to-[#0a2347] p-10 sm:p-16 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border border-white/15 shadow-2xl">
            {/* Background Glow */}
            <div className="absolute top-1/2 -left-20 -translate-y-1/2 w-96 h-96 bg-blue-400/20 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex flex-col gap-3 relative z-10 max-w-lg">
              <h3 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-white font-normal leading-tight tracking-tight">
                One account.<br />
                <span className="italic font-normal">Everything you need.</span>
              </h3>
              <p className="text-slate-200 text-base sm:text-lg mt-1 font-normal">
                Open your account in 5 minutes.
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-center gap-5 relative z-10">
              <button
                onClick={openOnboarding}
                className="bg-white text-black font-semibold text-base sm:text-lg px-8 py-4 rounded-full hover:bg-slate-100 transition-all duration-200 shadow-xl cursor-pointer"
              >
                Open account
              </button>
              <Link
                href="#products"
                className="text-white hover:text-slate-200 underline underline-offset-4 text-sm font-semibold transition-colors"
              >
                Compare Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="w-full bg-black text-white pt-20 pb-28 px-6 sm:px-10 lg:px-16 border-t border-white/10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-20 text-sm">
            {/* Col 1 */}
            <div className="flex flex-col gap-3">
              <Link href="/" className="text-slate-300 hover:text-white transition-colors font-medium">Home</Link>
              <Link href="#products" className="text-slate-300 hover:text-white transition-colors font-medium">Pricing</Link>
              <Link href="#about" className="text-slate-300 hover:text-white transition-colors font-medium">About</Link>
              <Link href="#products" className="text-slate-300 hover:text-white transition-colors font-medium">Business</Link>
              <Link href="#faq" className="text-slate-300 hover:text-white transition-colors font-medium">FAQ</Link>
            </div>

            {/* Col 2 */}
            <div className="flex flex-col gap-3">
              <Link href="/careers" className="text-slate-300 hover:text-white transition-colors font-medium">Careers</Link>
              <Link href="/press" className="text-slate-300 hover:text-white transition-colors font-medium">Press</Link>
              <Link href="/media" className="text-slate-300 hover:text-white transition-colors font-medium">Media Kit</Link>
              <Link href="/privacy" className="text-slate-300 hover:text-white transition-colors font-medium">Privacy Policy</Link>
              <Link href="/terms" className="text-slate-300 hover:text-white transition-colors font-medium">Terms & Conditions</Link>
            </div>

            {/* Col 3 */}
            <div className="flex flex-col gap-3">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition-colors font-medium">Instagram</a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition-colors font-medium">LinkedIn</a>
              <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition-colors font-medium">TikTok</a>
              <a href="https://x.com" target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition-colors font-medium">Twitter / X</a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition-colors font-medium">GitHub</a>
            </div>

            {/* Col 4 (Copyright & Socials) */}
            <div className="flex flex-col gap-4 items-start md:items-end justify-between">
              <span className="text-slate-400 text-xs font-mono">© 2026 HumanProof, Inc.</span>
              <div className="flex items-center gap-4 text-slate-300">
                <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Giant Outline Watermark Text */}
        <div className="w-full flex justify-center items-end opacity-10 pointer-events-none select-none overflow-hidden mt-12 -mb-20">
          <svg
            id="Layer_2"
            data-name="Layer 2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 684.58 90.1"
            className="w-[120%] h-auto text-white stroke-current stroke-[2] fill-none"
          >
            <g id="Layer_1-2" data-name="Layer 1">
              <g>
                <path d="M41.42,52.31h-17.25v34.5H0V1.7h24.17v38.81h17.25V1.7h24.17v85.11h-24.17v-34.5Z"/>
                <path d="M92.37,90.1c-15.09,0-17.59-11.58-17.59-20.43V26.89h24.17v28.14c0,11.01-.11,13.96,3.75,13.96,2.95,0,7.49-1.7,8.06-17.48v-24.62h25.53v59.92h-25.53v-1.13c0-3.29-.79-5.45,5.11-22.47l-1.02-.34c-5.9,17.02-6.13,19.18-8.4,21.67-3.18,3.52-7.72,5.56-14.07,5.56Z"/>
                <path d="M220.14,23.6c12.6,0,15.09,11.58,15.09,20.43v42.78h-24.17v-28.14c0-11.01.11-13.96-2.95-13.96-2.72,0-5.45,2.5-5.45,13.96v28.14h-24.17v-28.14c0-11.01.11-13.96-3.29-13.96-2.38,0-4.54,1.59-5.11,14.07v28.03h-25.53V26.89h25.53v1.13c0,3.29-.34,6.47-4.43,20.43l.91.34c3.18-11.12,6.13-25.19,20.99-25.19,5.9,0,9.53,2.5,11.8,6.13,2.04,3.29,1.7,8.74-.45,19.18l1.13.11c2.27-11.23,5.9-25.42,20.09-25.42Z"/>
                <path d="M241.92,26.89c6.24-1.82,15.21-3.18,24.17-3.18,17.7,0,35.86,5.33,35.86,23.94v39.15h-25.31c.57-2.95,2.84-14.75,3.4-17.7-.11,0-1.02.11-1.13.11-4.08,14.53-11.46,19.86-19.29,19.86-24.74,0-25.99-43.69,1.13-43.69,7.94,0,13.05,3.63,15.89,8.62-.45-8.96-6.01-12.37-12.6-12.37-5.9,0-12.71,2.72-17.25,6.7l-4.88-21.45ZM276.65,64.12c0-4.43-1.36-7.04-4.99-7.04-8.4,0-9.42,14.18-.79,14.18,2.95,0,5.79-1.59,5.79-7.15Z"/>
                <path d="M353.35,23.6c15.09,0,17.59,11.58,17.59,20.43v42.78h-24.17v-28.14c0-11.01.11-13.96-3.75-13.96-2.95,0-7.49,1.7-8.06-17.48v24.62h-25.53V26.89h25.53v1.13c0,3.29.79,5.45-5.11,22.47l1.02.34c5.9-17.02,6.13-19.18,8.4-21.67,3.18-3.52,7.72-5.56,14.07-5.56Z"/>
                <path d="M379.68,1.7h34.04c17.25,0,27.8,10.44,27.8,28.26,0,20.2-7.26,35.29-20.99,35.29-4.65,0-14.53-1.7-16.23-9.19v30.75h-24.62V1.7ZM403.85,48c9.53.23,13.28-1.25,13.28-10.89s-3.74-11.12-13.28-11.12v22.02Z"/>
                <path d="M487.25,23.94c2.38,0,5.22.34,8.28,1.13l-3.4,20.99c-2.61-.79-4.99-1.25-7.15-1.25-8.17,0-12.94,6.01-13.39,19.41v22.58h-24.17V26.89h24.17v.45c0,2.84-.45,9.3-3.75,19.52l1.02.23c3.29-10.21,4.77-16.57,6.7-18.61,2.72-2.84,6.47-4.54,11.69-4.54Z"/>
                <path d="M531.84,23.6c19.63,0,32.68,13.05,32.68,32.68s-13.05,32.8-32.68,32.8-32.8-13.05-32.8-32.8,13.05-32.68,32.8-32.68ZM531.84,65.25c5.22,0,8.85-3.63,8.85-8.96s-3.63-8.85-8.85-8.85-8.96,3.63-8.96,8.96,3.63,8.96,8.96,8.96Z"/>
                <path d="M603.56,23.6c19.63,0,32.68,13.05,32.68,32.68s-13.05,32.8-32.68,32.8-32.8-13.05-32.8-32.8,13.05-32.68,32.8-32.68ZM603.56,65.25c5.22,0,8.85-3.63,8.85-8.96s-3.63-8.85-8.85-8.85-8.96,3.63-8.96,8.96,3.63,8.96,8.96,8.96Z"/>
                <path d="M646.11,35.18h-5.22v-8.28h5.11c.45-20.77,6.7-26.89,21.22-26.89,4.88,0,10.67.68,17.36,1.7l-5.56,24.28c-3.06-1.59-9.65-3.4-15.66-3.4-4.88,0-9.31,1.13-11.23,4.31h30.98v8.28h-12.82v51.63h-24.17v-51.63Z"/>
              </g>
            </g>
          </svg>
        </div>
      </footer>
    </div>
  );
}






