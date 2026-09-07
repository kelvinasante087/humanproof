import { OnboardingCard } from "@/components/onboarding-card";

export default function SignupPage() {
  return (
    <main className="min-h-[calc(100vh-73px)] w-full bg-black text-white flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full flex justify-center">
        <OnboardingCard />
      </div>
    </main>
  );
}
