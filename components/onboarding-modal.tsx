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
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          {/* Backdrop Click Area */}
          <div className="absolute inset-0" onClick={closeOnboarding} />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[2rem] shadow-2xl transition-all transform scale-100 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={closeOnboarding}
              className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/15 backdrop-blur-md cursor-pointer"
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
