"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { OnboardingCard } from "@/components/onboarding-card";
import { X } from "lucide-react";

type ModalContextType = {
  isOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
};

const OnboardingModalContext = createContext<ModalContextType>({
  isOpen: false,
  openOnboarding: () => {},
  closeOnboarding: () => {},
});

export function useOnboardingModal() {
  return useContext(OnboardingModalContext);
}

export function OnboardingModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openOnboarding = () => setIsOpen(true);
  const closeOnboarding = () => setIsOpen(false);

  // Close on Escape key press and prevent background scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOnboarding();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <OnboardingModalContext.Provider value={{ isOpen, openOnboarding, closeOnboarding }}>
      {children}

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-stretch justify-center bg-black/80 p-0 backdrop-blur-md transition-all duration-300 animate-in fade-in sm:items-center sm:p-6">
          {/* Backdrop Click Area */}
          <div className="absolute inset-0" onClick={closeOnboarding} />

          {/* Modal Container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create your HumanProof credential"
            className="relative z-10 h-[100dvh] w-full max-w-4xl overflow-y-auto overscroll-contain bg-[#0c0c0e] shadow-2xl transition-all transform scale-100 animate-in zoom-in-95 duration-200 sm:h-auto sm:max-h-[92dvh] sm:rounded-[2rem]"
          >
            {/* Close Button */}
            <button
              onClick={closeOnboarding}
              className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex h-11 w-11 items-center justify-center border border-white/25 bg-black text-white transition-colors hover:bg-white/10 cursor-pointer sm:absolute sm:right-4 sm:top-4 sm:h-9 sm:w-9 sm:rounded-full sm:bg-white/10"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Onboarding Card */}
            <OnboardingCard onClose={closeOnboarding} />
          </div>
        </div>
      )}
    </OnboardingModalContext.Provider>
  );
}
