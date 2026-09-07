"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePrivy, useLoginWithEmail, useLinkWithPasskey, useCreateWallet } from "@privy-io/react-auth";
import {
  IDKitRequestWidget,
  selfieCheckLegacy,
  type IDKitResult,
  type IDKitErrorCodes,
} from "@worldcoin/idkit";
import { WORLD_APP_ID, WORLD_ACTION, WORLD_ENV } from "@/lib/world";
import { MobileWorldSimulatorLink } from "@/components/mobile-world-simulator-link";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  ShieldCheck,
  Fingerprint,
  AtSign,
  ArrowRight,
  Mail,
  RefreshCw,
} from "lucide-react";

const ONBOARDING_IMAGES = [
  {
    src: "/images/human-sunset.jpg",
    alt: "HumanProof Artwork 1",
    caption: "One human · Proven once",
  },
  {
    src: "/images/human-moon.jpg",
    alt: "HumanProof Artwork 2",
    caption: "Zero knowledge · Full privacy",
  },
  {
    src: "/images/human-beanie.jpg",
    alt: "HumanProof Artwork 3",
    caption: "Trusted across 150+ dApps",
  },
];

type RpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

export function OnboardingCard({ onClose }: { onClose?: () => void } = {}) {
  const { ready, authenticated, user } = usePrivy();
  const { sendCode, loginWithCode, state: emailState } = useLoginWithEmail();
  const { linkWithPasskey, state: passkeyState } = useLinkWithPasskey();
  const { createWallet } = useCreateWallet();
  const router = useRouter();

  // Leave onboarding for the signed-in home (account details live there, not in this modal).
  function goToDashboard() {
    onClose?.();
    router.push("/account");
  }

  // Visual Image Carousel
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Step 1 State: Email & OTP
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  // Step 2 State: World ID
  const [worldVerified, setWorldVerified] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [worldWidgetOpen, setWorldWidgetOpen] = useState(false);
  const [worldStatus, setWorldStatus] = useState<"idle" | "preparing" | "verifying" | "error">("idle");
  const [worldError, setWorldError] = useState<string | null>(null);

  // Step 3 State: Passkey
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // Step 4 State: ENS Name
  const [ensLabel, setEnsLabel] = useState("");
  const [claimingEns, setClaimingEns] = useState(false);
  const [claimedEns, setClaimedEns] = useState<string | null>(null);
  const [ensError, setEnsError] = useState<string | null>(null);

  // Wallet
  const [walletError, setWalletError] = useState<string | null>(null);
  const attemptedWallet = useRef(false);

  // Cycle illustrations
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImgIndex((prev) => (prev + 1) % ONBOARDING_IMAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Check existing session status on mount
  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.verified) setWorldVerified(true);
        if (data?.name) setClaimedEns(data.name);
      })
      .catch(() => {});
  }, []);

  const walletAddress = user?.wallet?.address;
  const hasPasskey = user?.linkedAccounts?.some((account) => account.type === "passkey") ?? false;

  // Auto-create embedded wallet upon authentication
  useEffect(() => {
    if (!ready || !authenticated || walletAddress || attemptedWallet.current) return;
    attemptedWallet.current = true;
    createWallet().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/already (has|exists)/i.test(msg)) {
        setWalletError("Couldn't create your wallet. Refresh to retry.");
      }
    });
  }, [ready, authenticated, walletAddress, createWallet]);

  // Determine current active flow step (1 to 5)
  const currentStep = !authenticated
    ? 1
    : !worldVerified
    ? 2
    : !hasPasskey
    ? 3
    : !claimedEns
    ? 4
    : 5;

  // Trigger celebration confetti when Step 5 is reached
  useEffect(() => {
    if (currentStep === 5) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ffffff", "#2dd4bf", "#60a5fa", "#a78bfa"],
        disableForReducedMotion: true,
      });
      toast.success("Credential successfully minted on-chain!");
    }
  }, [currentStep]);

  // Email status flags
  const status = emailState.status;
  const codeSent = status === "awaiting-code-input" || status === "submitting-code";
  const sendingCode = status === "sending-code";
  const submittingCode = status === "submitting-code";

  // World ID Handlers
  async function startWorldVerification() {
    setWorldStatus("preparing");
    setWorldError(null);
    try {
      const res = await fetch("/api/world/sign", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.rp_context) {
        throw new Error(data?.error || "Could not prepare verification context.");
      }
      setRpContext(data.rp_context as RpContext);
      setWorldWidgetOpen(true);
      setWorldStatus("idle");
    } catch (err) {
      setWorldStatus("error");
      const msg = err instanceof Error ? err.message : "Could not prepare verification.";
      setWorldError(msg);
      toast.error(msg);
    }
  }

  async function handleWorldVerify(result: IDKitResult) {
    setWorldStatus("verifying");
    const res = await fetch("/api/world/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Verification failed.");
    }
  }

  function handleWorldSuccess() {
    setWorldVerified(true);
    setWorldWidgetOpen(false);
    setWorldStatus("idle");
    toast.success("Zero-knowledge human proof verified!");
  }

  function handleWorldError(code: IDKitErrorCodes) {
    setWorldStatus("error");
    const msg = `Verification didn't complete (${String(code)}).`;
    setWorldError(msg);
    setWorldWidgetOpen(false);
    toast.error(msg);
  }

  // Passkey Handler
  async function handleAddPasskey() {
    setPasskeyError(null);
    try {
      await linkWithPasskey();
      toast.success("Device passkey successfully bound!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't add passkey. Please try again.";
      setPasskeyError(msg);
      toast.error(msg);
    }
  }

  // ENS Claim Handler
  async function handleClaimEns(e: React.FormEvent) {
    e.preventDefault();
    if (!ensLabel.trim() || !walletAddress) return;
    setEnsError(null);
    setClaimingEns(true);
    try {
      const res = await fetch("/api/ens/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: ensLabel.trim(),
          address: walletAddress,
          privyUserId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Couldn't claim that name.";
        setEnsError(msg);
        toast.error(msg);
        return;
      }
      setClaimedEns(data.name || `${ensLabel.trim()}.humanproof.eth`);
    } catch {
      const msg = "Network error while claiming your ENS handle.";
      setEnsError(msg);
      toast.error(msg);
    } finally {
      setClaimingEns(false);
    }
  }

  const passkeyBusy =
    passkeyState.status === "generating-challenge" ||
    passkeyState.status === "awaiting-passkey" ||
    passkeyState.status === "submitting-response";

  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 overflow-hidden bg-[#0c0c0e] shadow-2xl sm:min-h-0 sm:rounded-[2rem] sm:border sm:border-white/10 md:min-h-[580px] md:max-w-4xl md:grid-cols-2 md:mx-auto">
      {/* Left Column: Artwork & Brand Visual */}
      <div className="relative hidden min-h-[580px] flex-col justify-between overflow-hidden border-r border-white/10 bg-black p-10 md:flex">
        {/* Background Artwork with Cross-Fade */}
        {ONBOARDING_IMAGES.map((img, idx) => (
          <div
            key={img.src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === activeImgIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center transition-transform duration-1000"
              priority={idx === 0}
            />
          </div>
        ))}

        {/* Dark Vignette Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/70 pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center p-1 border border-white/20 shrink-0">
            <svg
              viewBox="0 0 73.44 73.44"
              className="w-full h-full text-white fill-current"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M36.72,0C16.44,0,0,16.44,0,36.72s16.44,36.72,36.72,36.72,36.72-16.44,36.72-36.72S57,0,36.72,0ZM31.83,39.27c-.53-.37-1.18-.68-1.97-.84-1.98-.4-4.03.33-5.35,1.89v19.52h-13.11V13.6h13.11v14.96c.91-.23,2.65-.54,4.76-.1.99.21,1.85.53,2.56.89v9.92ZM47.03,59.84h-13.13V13.6h13.13v46.23ZM57.06,48.12c-2.09,0-6.1-.63-7.96-3.14v-6.22c4.37-.03,6.11-1.07,6.11-5.93s-1.74-5.92-6.11-6.02v-13.21h4.26c9.37,0,15.11,5.67,15.11,15.35,0,10.97-3.95,19.17-11.41,19.17Z" />
            </svg>
          </div>
          <span className="font-heading text-lg font-medium text-white tracking-wide drop-shadow-md leading-none translate-y-[3px]">
            HumanProof
          </span>
        </div>

        {/* Bottom Tagline & Dots */}
        <div className="relative z-10 flex flex-col gap-3">
          <div className="text-sm font-medium text-white drop-shadow-md">
            {ONBOARDING_IMAGES[activeImgIndex].caption}
          </div>
          <div className="flex items-center gap-1.5">
            {ONBOARDING_IMAGES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImgIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === activeImgIndex ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`View image ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Progressive Step Flow */}
      <div className="flex min-h-[100dvh] flex-col justify-between bg-[#0c0c0e] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] text-white sm:min-h-[580px] sm:p-10">
        {/* Top Stepper Bar with Symmetrical Alignment */}
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4 sm:mb-8 sm:pb-5">
          {/* Symmetrical Step Indicators */}
            <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start">
            {[
              { num: 1, label: "Account" },
              { num: 2, label: "World ID" },
              { num: 3, label: "Passkey" },
              { num: 4, label: "ENS Name" },
            ].map((s, idx) => {
              const isCompleted = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div key={s.num} className="flex min-w-0 items-center">
                  {/* Step Circle with Perfect Optical Centering */}
                  <div
                    className={`flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                        : isCurrent
                        ? "bg-white text-black font-bold ring-4 ring-white/20 shadow-md scale-105"
                        : "bg-[#16161a] text-slate-500 border border-white/10"
                    }`}
                  >
                    <span className="leading-none flex items-center justify-center -translate-y-[0.5px]">
                      {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : s.num}
                    </span>
                  </div>

                  {/* Connector Line - Exactly Centered Between Circles */}
                  {idx < 3 && (
                    <div className="mx-1.5 h-px w-4 shrink-0 self-center overflow-hidden bg-white/15 min-[360px]:w-6 sm:mx-2 sm:w-8">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          currentStep > s.num ? "w-full bg-emerald-400" : "w-0 bg-transparent"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Animated Step Views with Spaced Typography */}
        <div className="my-auto flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {/* STEP 1: Privy Authentication */}
            {currentStep === 1 && (
              <motion.div
                key={codeSent ? "step-1-code" : "step-1-email"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-col text-left"
              >
                {/* Spaced-Out Header */}
                <div className="mb-6 sm:mb-8">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium tracking-wider uppercase text-slate-400 mb-8">
                    <Mail className="w-3.5 h-3.5 text-slate-300" />
                    <span>Step 1 of 4 · Authentication</span>
                  </div>
                  <h2 className="font-heading text-3xl sm:text-4xl text-white font-normal tracking-tight leading-[1.18] mb-3">
                    {!codeSent ? "Join HumanProof" : "Check your email"}
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed max-w-md">
                    {!codeSent
                      ? "Prove you're human once without storing any personal data."
                      : `We sent a 6-digit verification code to ${email}`}
                  </p>
                </div>

                {!codeSent ? (
                  /* 1A: Email Input */
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!email) return;
                      await sendCode({ email });
                      toast.success(`Verification code sent to ${email}`);
                    }}
                    className="flex flex-col gap-4 mt-2"
                  >
                    <div className="flex flex-col gap-2">
                      <label htmlFor="email" className="text-xs font-medium text-slate-300">
                        Email address
                      </label>
                      <input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-[#16161a] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-white/40 focus:ring-1 focus:ring-white/20 focus:outline-none transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sendingCode || !email}
                      className="w-full bg-white text-black font-semibold text-sm py-3.5 rounded-xl hover:bg-slate-100 active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
                    >
                      {sendingCode ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Sending code…
                        </>
                      ) : (
                        <>
                          <span>Continue with Email</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* 1B: OTP Code Input */
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!code) return;
                      await loginWithCode({ code });
                    }}
                    className="flex flex-col gap-4 mt-2"
                  >
                    <div className="flex flex-col gap-2">
                      <label htmlFor="code" className="text-xs font-medium text-slate-300">
                        6-digit Verification Code
                      </label>
                      <input
                        id="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                        autoFocus
                        className="w-full bg-[#16161a] border border-white/10 rounded-xl px-4 py-3.5 text-sm text-center text-white tracking-[0.35em] font-medium placeholder:text-slate-500 focus:border-white/40 focus:ring-1 focus:ring-white/20 focus:outline-none transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingCode || !code}
                      className="w-full bg-white text-black font-semibold text-sm py-3.5 rounded-xl hover:bg-slate-100 active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
                    >
                      {submittingCode ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Verifying code…
                        </>
                      ) : (
                        <>
                          <span>Verify & Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
                      <button
                        type="button"
                        className="hover:text-white underline underline-offset-4 cursor-pointer"
                        onClick={() => {
                          setCode("");
                          void sendCode({ email });
                          toast.success("Code resent!");
                        }}
                      >
                        Resend code
                      </button>
                      <button
                        type="button"
                        className="hover:text-white underline underline-offset-4 cursor-pointer"
                        onClick={() => setCode("")}
                      >
                        Use another email
                      </button>
                    </div>
                  </form>
                )}

                {status === "error" && (
                  <p className="text-rose-400 text-xs text-center bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mt-4">
                    Invalid code or network issue. Please check and retry.
                  </p>
                )}
              </motion.div>
            )}

            {/* STEP 2: World ID Selfie Check */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-col text-left"
              >
                <div className="mb-8">
                  <div className="mb-5 inline-flex items-center gap-2 border-y border-white/20 px-0 py-2 text-[11px] font-medium uppercase tracking-wider text-white sm:mb-8 sm:rounded-full sm:border sm:px-3.5 sm:py-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Step 2 of 4 · Proof of Human</span>
                  </div>
                  <h2 className="font-heading mb-3 text-[2rem] font-normal leading-[1.08] tracking-tight text-white sm:text-4xl sm:leading-[1.18]">
                    World ID Selfie Check
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed max-w-md">
                    Verify you&apos;re a real, unique human once. Zero-knowledge proof — no photos, face, or biometrics are ever stored.
                  </p>
                </div>

                {/* Wallet Info Badge */}
                <div className="bg-[#141418] border border-white/10 rounded-xl p-3.5 flex items-center justify-between text-xs mb-4">
                  <span className="text-slate-400">Embedded Wallet:</span>
                  <span className="text-slate-200 font-medium">
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : walletError || "provisioned"}
                  </span>
                </div>

                {/* Verification Trigger Button */}
                <button
                  onClick={startWorldVerification}
                  disabled={worldStatus === "preparing" || worldStatus === "verifying"}
                  className="w-full bg-white text-black font-semibold text-sm py-3.5 rounded-xl hover:bg-slate-100 active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {worldStatus === "preparing" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Preparing World ID…
                    </>
                  ) : worldStatus === "verifying" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verifying proof…
                    </>
                  ) : (
                    <>
                      <span>Verify with World ID</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 leading-relaxed text-center mt-3">
                  Uses World ID 3.0 Selfie Check. In staging mode, runs via browser simulator.
                </p>

                {worldError && (
                  <p className="text-rose-400 text-xs text-center bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mt-3">
                    {worldError}
                  </p>
                )}

                {/* Hidden / Managed IDKit Request Widget */}
                {rpContext && (
                  <>
                    <IDKitRequestWidget
                      app_id={WORLD_APP_ID}
                      action={WORLD_ACTION}
                      rp_context={rpContext}
                      allow_legacy_proofs={true}
                      environment={WORLD_ENV}
                      preset={selfieCheckLegacy()}
                      open={worldWidgetOpen}
                      onOpenChange={setWorldWidgetOpen}
                      handleVerify={handleWorldVerify}
                      onSuccess={handleWorldSuccess}
                      onError={handleWorldError}
                    />
                    <MobileWorldSimulatorLink open={worldWidgetOpen} />
                  </>
                )}
              </motion.div>
            )}

            {/* STEP 3: Passkey Device Binding */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-col text-left"
              >
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-[11px] font-medium tracking-wider uppercase text-teal-400 mb-8">
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>Step 3 of 4 · Device Security</span>
                  </div>
                  <h2 className="font-heading text-3xl sm:text-4xl text-white font-normal tracking-tight leading-[1.18] mb-3">
                    Bind Device Passkey
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed max-w-md">
                    Tie your verified human credential directly to this device with Touch ID, Face ID, or Windows Hello.
                  </p>
                </div>

                <div className="bg-[#141418] border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <span className="text-white font-medium block">Proof-of-Humanity Confirmed</span>
                    <span className="text-slate-400">Zero-knowledge proof registered for this session.</span>
                  </div>
                </div>

                <button
                  onClick={handleAddPasskey}
                  disabled={passkeyBusy}
                  className="w-full bg-white text-black font-semibold text-sm py-3.5 rounded-xl hover:bg-slate-100 active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {passkeyBusy ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Adding Passkey…
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>Add Device Passkey</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 text-center mt-3">
                  One human, one device. Prevents credential sharing or automated bot attacks.
                </p>

                {passkeyError && (
                  <p className="text-rose-400 text-xs text-center bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mt-3">
                    {passkeyError}
                  </p>
                )}
              </motion.div>
            )}

            {/* STEP 4: Claim ENS Name */}
            {currentStep === 4 && (
              <motion.form
                key="step-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                onSubmit={handleClaimEns}
                className="flex flex-col text-left"
              >
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-medium tracking-wider uppercase text-indigo-400 mb-8">
                    <AtSign className="w-3.5 h-3.5" />
                    <span>Step 4 of 4 · Identity</span>
                  </div>
                  <h2 className="font-heading text-3xl sm:text-4xl text-white font-normal tracking-tight leading-[1.18] mb-3">
                    Claim your ENS Name
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed max-w-md">
                    Choose your human handle. Issued on-chain to your embedded wallet with a private pairwise DID.
                  </p>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  <label htmlFor="ens" className="text-xs font-medium text-slate-300">
                    Handle
                  </label>
                  <div className="flex items-center bg-[#16161a] border border-white/10 rounded-xl px-4 py-3.5 focus-within:border-white/40 focus-within:ring-1 focus-within:ring-white/20 transition-all">
                    <input
                      id="ens"
                      type="text"
                      placeholder="username"
                      value={ensLabel}
                      onChange={(e) => setEnsLabel(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      required
                      disabled={claimingEns}
                      autoFocus
                      className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap pl-1">
                      .humanproof.eth
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={claimingEns || !ensLabel.trim()}
                  className="w-full bg-white text-black font-semibold text-sm py-3.5 rounded-xl hover:bg-slate-100 active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {claimingEns ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Minting on-chain…
                    </>
                  ) : (
                    <>
                      <span>Claim & Complete Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {ensError && (
                  <p className="text-rose-400 text-xs text-center bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 mt-3">
                    {ensError}
                  </p>
                )}
              </motion.form>
            )}

            {/* STEP 5: Credential Complete */}
            {currentStep === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col text-left"
              >
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium tracking-wider uppercase text-emerald-400 mb-8">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Credential Ready</span>
                  </div>
                  <h2 className="font-heading text-3xl sm:text-4xl text-white font-normal tracking-tight leading-[1.18] mb-3">
                    You&apos;re Verified
                  </h2>
                  <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed max-w-md">
                    {claimedEns ? (
                      <>
                        <span className="font-mono text-white">{claimedEns}</span> is yours — your
                        proof-of-human credential is active and anchored on-chain.
                      </>
                    ) : (
                      "Your proof-of-human credential is active and anchored on-chain."
                    )}
                  </p>
                </div>

                {/* Straight to the signed-in home — account details live there, not in this modal. */}
                <button
                  type="button"
                  onClick={goToDashboard}
                  className="w-full bg-white text-black font-semibold text-sm py-3.5 rounded-xl hover:bg-slate-100 active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Go to your dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={goToDashboard}
                  className="mt-3 w-full text-slate-400 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Note */}
        <div className="text-[11px] text-slate-500 text-center pt-6 border-t border-white/5">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-slate-400 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-slate-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
