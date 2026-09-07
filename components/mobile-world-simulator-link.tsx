"use client";

import { useEffect } from "react";
import { WORLD_ENV } from "@/lib/world";

const PANEL_SELECTOR = "[data-humanproof-staging-simulator]";
const STYLE_SELECTOR = "style[data-humanproof-staging-style]";

/**
 * IDKit's mobile layout always promotes the production World App handoff, even for a staging
 * request. A staging request can only be completed in World's simulator, so on phone-sized
 * screens we replace the misleading app/QR actions with IDKit's own live simulator connector.
 */
export function MobileWorldSimulatorLink({ open }: { open: boolean }) {
  useEffect(() => {
    if (!open || WORLD_ENV !== "staging") return;

    let stopped = false;
    let timer: number | undefined;
    const touchedRoots = new Set<ShadowRoot>();

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
        if (!root || !handoff || !sourceLink?.href) continue;

        touchedRoots.add(root);

        if (!root.querySelector(STYLE_SELECTOR)) {
          const style = document.createElement("style");
          style.dataset.humanproofStagingStyle = "true";
          style.textContent = `
            ${PANEL_SELECTOR} { display: none; }
            @media (max-width: 1024px) {
              .idkit-deeplink-btn,
              .idkit-handoff-divider,
              .idkit-qr-toggle-btn,
              .idkit-mobile-qr { display: none !important; }
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
          panel.dataset.humanproofStagingSimulator = "true";

          const explanation = document.createElement("p");
          explanation.textContent =
            "This is a staging test. Complete it in the World ID simulator, not the World App.";

          const link = document.createElement("a");
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Open World ID simulator";

          panel.append(explanation, link);
          handoff.prepend(panel);
        }

        const simulatorLink = panel.querySelector<HTMLAnchorElement>("a");
        if (simulatorLink) simulatorLink.href = sourceLink.href;
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
      for (const root of touchedRoots) {
        root.querySelector(PANEL_SELECTOR)?.remove();
        root.querySelector(STYLE_SELECTOR)?.remove();
      }
    };
  }, [open]);

  return null;
}
