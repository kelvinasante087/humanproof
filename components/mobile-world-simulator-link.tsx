"use client";

import { useEffect } from "react";
import { WORLD_ENV } from "@/lib/world";

const PANEL_SELECTOR = "[data-humanproof-simulator]";
const STYLE_SELECTOR = "style[data-humanproof-simulator-style]";

/**
 * IDKit's mobile layout promotes the World App handoff. A staging request can only be
 * completed in World's simulator, so on phone-sized screens we replace the misleading
 * app/QR actions with IDKit's own live simulator connector. Sandbox keeps its normal
 * World App controls, but also exposes a clearly labelled staging rehearsal link when
 * the phone app is unavailable. A staging rehearsal is never presented as a Sandbox proof.
 */
export function MobileWorldSimulatorLink({ open }: { open: boolean }) {
  useEffect(() => {
    if (!open || !["staging", "sandbox"].includes(WORLD_ENV)) return;

    let stopped = false;
    let timer: number | undefined;
    const touchedRoots = new Set<ShadowRoot>();
    let floatingPanel: HTMLElement | null = null;

    const configureSandboxLink = (href: string) => {
      if (WORLD_ENV !== "sandbox") return;

      if (!floatingPanel) {
        floatingPanel = document.createElement("aside");
        floatingPanel.dataset.humanproofSandboxSimulator = "true";
        Object.assign(floatingPanel.style, {
          position: "fixed",
          left: "50%",
          bottom: "max(16px, env(safe-area-inset-bottom))",
          transform: "translateX(-50%)",
          zIndex: "2147483647",
          width: "min(460px, calc(100vw - 32px))",
          boxSizing: "border-box",
          padding: "14px 16px",
          border: "1px solid rgba(255,255,255,0.24)",
          borderRadius: "14px",
          background: "#111318",
          color: "#fff",
          boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
          fontFamily: '"PP Mori", Arial, sans-serif',
        });

        const explanation = document.createElement("p");
        explanation.textContent =
          "Sandbox is active. The browser simulator is staging-only and is a rehearsal, not a Sandbox credential.";
        Object.assign(explanation.style, {
          margin: "0 0 10px",
          fontSize: "12px",
          lineHeight: "1.45",
          color: "rgba(255,255,255,0.72)",
        });

        const link = document.createElement("a");
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open simulator rehearsal";
        Object.assign(link.style, {
          display: "inline-flex",
          minHeight: "42px",
          width: "100%",
          boxSizing: "border-box",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "10px",
          background: "#fff",
          color: "#000",
          fontSize: "13px",
          fontWeight: "600",
          textDecoration: "none",
        });
        // IDKit's shadow-host stylesheet can promote its anchor color through
        // a global rule; force readable contrast for this light button.
        link.style.setProperty("color", "#000", "important");
        link.style.setProperty("background", "#fff", "important");

        floatingPanel.append(explanation, link);
        document.body.appendChild(floatingPanel);
      }

      const link = floatingPanel.querySelector<HTMLAnchorElement>("a");
      if (link) link.href = href;
    };

    const configureStagingHandoff = () => {
      let configured = false;
      const hosts = Array.from(
        document.querySelectorAll<HTMLElement>("[data-idkit-shadow-host]"),
      ).reverse();

      for (const host of hosts) {
        const root = host.shadowRoot;
        const handoff = root?.querySelector<HTMLElement>(".idkit-mobile-handoff");
        const sourceLink = root?.querySelector<HTMLAnchorElement>(
          'a[href^="https://simulator.worldcoin.org"]',
        );
        const appLink = root?.querySelector<HTMLAnchorElement>(
          "a.idkit-deeplink-btn",
        );
        const simulatorHref = sourceLink?.href || (appLink?.href
          ? `https://simulator.worldcoin.org?connect_url=${encodeURIComponent(appLink.href)}`
          : "");
        if (!root || !simulatorHref) continue;

        // Sandbox requests keep the IDKit World App controls, but expose the
        // rehearsal link outside IDKit's mobile-only shadow-root container so
        // it remains visible on desktop browsers as well.
        if (WORLD_ENV === "sandbox") {
          configureSandboxLink(simulatorHref);
          configured = true;
          break;
        }

        if (!handoff) continue;

        touchedRoots.add(root);

        if (!root.querySelector(STYLE_SELECTOR)) {
          const style = document.createElement("style");
          style.dataset.humanproofSimulatorStyle = "true";
          style.textContent = `
            ${PANEL_SELECTOR} { display: none; }
            @media (max-width: 1024px) {
              ${WORLD_ENV === "staging" ? `.idkit-deeplink-btn,
              .idkit-handoff-divider,
              .idkit-qr-toggle-btn,
              .idkit-mobile-qr { display: none !important; }` : ""}
              ${PANEL_SELECTOR} {
                display: flex;
                width: 100%;
                flex-direction: column;
                gap: 10px;
                font-family: "PP Mori", Arial, sans-serif;
              }
              ${PANEL_SELECTOR} p {
                margin: 0;
                color: #FFFFFF;
                font-size: 13px;
                line-height: 1.45;
              }
              ${PANEL_SELECTOR} a {
                display: flex;
                min-height: 48px;
                width: 100%;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                border: 1px solid rgba(255, 255, 255, 0.45);
                background: #000000;
                color: #FFFFFF;
                padding: 12px 16px;
                font-size: 14px;
                font-weight: 600;
                text-decoration: none;
              }
            }
          `;
          root.appendChild(style);
        }

        let panel = handoff.querySelector<HTMLElement>(PANEL_SELECTOR);
        if (!panel) {
          panel = document.createElement("div");
          panel.dataset.humanproofSimulator = "true";

          const explanation = document.createElement("p");
          explanation.textContent = WORLD_ENV === "staging"
            ? "This is a staging test. Complete it in the World ID simulator, not the World App."
            : "Sandbox is active. The browser simulator is staging-only and is a rehearsal, not a Sandbox credential.";

          const link = document.createElement("a");
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = WORLD_ENV === "staging"
            ? "Open World ID simulator"
            : "Open simulator rehearsal";

          panel.append(explanation, link);
          handoff.prepend(panel);
        }

        const simulatorLink = panel.querySelector<HTMLAnchorElement>("a");
        if (simulatorLink) simulatorLink.href = simulatorHref;
        configured = true;
        break;
      }

      if (!stopped) {
        timer = window.setTimeout(configureStagingHandoff, configured ? 500 : 150);
      }
    };

    configureStagingHandoff();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      floatingPanel?.remove();
      floatingPanel = null;
      for (const root of touchedRoots) {
        root.querySelector(PANEL_SELECTOR)?.remove();
        root.querySelector(STYLE_SELECTOR)?.remove();
      }
    };
  }, [open]);

  return null;
}
