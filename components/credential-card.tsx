"use client";

import Image from "next/image";

export const credentialColorways = {
  charcoal: {
    label: "Charcoal",
    background: "linear-gradient(135deg, #303540 0%, #171a21 57%, #090a0e 100%)",
    foreground: "#ffffff",
  },
  cobalt: {
    label: "Cobalt",
    background: "linear-gradient(140deg, #4d98ff 0%, #1764e7 50%, #0d2c78 100%)",
    foreground: "#ffffff",
  },
  amethyst: {
    label: "Amethyst",
    background: "linear-gradient(140deg, #7b21e8 0%, #9a5cf3 48%, #4f10b6 100%)",
    foreground: "#ffffff",
  },
  emerald: {
    label: "Emerald",
    background: "linear-gradient(140deg, #21d8ad 0%, #08a878 52%, #035c48 100%)",
    foreground: "#ffffff",
  },
  opal: {
    label: "Opal",
    background: "linear-gradient(135deg, #f6d8ef 0%, #d8c9ff 48%, #c8f7df 100%)",
    foreground: "#17202b",
  },
} as const;

export type CredentialColorway = keyof typeof credentialColorways;

type CredentialCardProps = {
  name?: string | null;
  wallet?: string | null;
  verified?: boolean;
  credentialType?: string;
  chain?: string;
  colorway?: CredentialColorway;
};

type CredentialColorwayPickerProps = {
  value: CredentialColorway;
  onChange: (value: CredentialColorway) => void;
};

function formatAddress(wallet?: string | null): string {
  if (!wallet) return "0x•••• · •••• · •••• · ••••";
  const hex = wallet.replace(/^0x/i, "");
  return `0x${hex.slice(0, 4)} · ${hex.slice(4, 8)} · ${hex.slice(8, 12)} · ${hex.slice(-4)}`;
}

function CardPattern({ colorway }: { colorway: CredentialColorway }) {
  if (colorway === "charcoal") {
    return (
      <div className="absolute inset-0 overflow-hidden opacity-60" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((ring) => (
          <span
            key={ring}
            className="absolute rounded-full border border-white/[0.08]"
            style={{
              width: `${42 + ring * 17}%`,
              aspectRatio: "1",
              right: `${-12 - ring * 4}%`,
              bottom: `${-34 - ring * 7}%`,
            }}
          />
        ))}
      </div>
    );
  }

  if (colorway === "cobalt") {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 360 226" aria-hidden="true">
        <path fill="#fff" d="M190 0h170v83L296 58l-38 48-68-31z" />
        <path fill="#fff" d="m214 226 51-79 95 18v61z" opacity=".45" />
        <path fill="none" stroke="#fff" strokeWidth="1.2" d="m174 12 63 58-36 63 82 74" />
      </svg>
    );
  }

  if (colorway === "amethyst") {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 360 226" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((line) => (
          <path
            key={line}
            fill="none"
            stroke="#fff"
            strokeWidth="1"
            d={`M-20 ${52 + line * 17} C 60 ${6 + line * 20}, 118 ${124 + line * 8}, 202 ${72 + line * 18} S 310 ${24 + line * 24}, 390 ${67 + line * 19}`}
          />
        ))}
      </svg>
    );
  }

  if (colorway === "emerald") {
    return (
      <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 360 226" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map((line) => (
          <path
            key={`v-${line}`}
            fill="none"
            stroke="#fff"
            d={`M${170 + line * 32} -20 C ${124 + line * 35} 70, ${210 + line * 27} 142, ${150 + line * 39} 250`}
          />
        ))}
        {[0, 1, 2, 3].map((line) => (
          <path
            key={`h-${line}`}
            fill="none"
            stroke="#fff"
            d={`M120 ${54 + line * 42} C 205 ${30 + line * 48}, 286 ${90 + line * 32}, 380 ${52 + line * 42}`}
          />
        ))}
      </svg>
    );
  }

  return (
    <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 360 226" aria-hidden="true">
      {Array.from({ length: 7 }, (_, row) =>
        Array.from({ length: 11 }, (_, col) => (
          <path
            key={`${row}-${col}`}
            stroke="#5a486f"
            strokeWidth="1"
            d={`M${22 + col * 34} ${15 + row * 34}v8m-4-4h8`}
          />
        )),
      )}
    </svg>
  );
}

const providers = [
  { name: "Privy connected", src: "/brands/privy-symbol-white.svg" },
  { name: "World ID verified", src: "/brands/world-symbol-white.svg" },
  { name: "ENS linked", src: "/brands/ens-symbol-white.svg" },
] as const;

function LinkedCredentialIcons({
  privyConnected,
  worldVerified,
  ensLinked,
}: {
  privyConnected: boolean;
  worldVerified: boolean;
  ensLinked: boolean;
}) {
  const providerStates = providers.map((provider, index) => ({
    ...provider,
    active: [privyConnected, worldVerified, ensLinked][index],
  }));

  return (
    <div
      className="absolute right-[6.67%] top-[40.7%] flex w-[28.9%] items-center"
      aria-label={providerStates
        .map((provider) => `${provider.name}: ${provider.active ? "active" : "not connected"}`)
        .join(", ")}
    >
      {providerStates.map((provider, index) => {
        const linkActive = index > 0 && provider.active && providerStates[index - 1].active;
        return (
        <div key={provider.name} className="contents">
          {index > 0 && (
            <span
              className={`${linkActive ? "credential-provider-link-active" : "credential-provider-link-inactive"} -mx-[1px] h-px flex-1`}
              aria-hidden="true"
            />
          )}
          <span
            className={`${provider.active ? "credential-provider-node-active" : "credential-provider-node-inactive"} relative grid aspect-square w-[28%] shrink-0 place-items-center rounded-full border bg-[#11150f]`}
            title={`${provider.name}: ${provider.active ? "active" : "not connected"}`}
          >
            <Image
              src={provider.src}
              alt=""
              width={18}
              height={18}
              className={`${provider.active ? "credential-provider-glyph-active" : "credential-provider-glyph-inactive"} h-[55%] w-[55%] object-contain`}
            />
          </span>
        </div>
        );
      })}
    </div>
  );
}

export function CredentialCard({
  name,
  wallet,
  verified = false,
  credentialType = "VERIFIED HUMAN",
  chain = "ETH",
  colorway = "charcoal",
}: CredentialCardProps) {
  const theme = credentialColorways[colorway];
  const isLight = colorway === "opal";

  return (
    <article
      className="relative aspect-[360/226] w-full max-w-[440px] overflow-hidden rounded-[22px] shadow-[0_24px_70px_rgba(0,0,0,0.38)]"
      style={{ background: theme.background, color: theme.foreground }}
      aria-label={`${credentialType} credential for ${name || "credential holder"}`}
    >
      <CardPattern colorway={colorway} />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/[0.08]" aria-hidden="true" />

      <Image
        src="/humanproof.svg"
        alt="HumanProof"
        width={122}
        height={16}
        priority
        className={`absolute left-[6.67%] top-[11.5%] h-[7.08%] w-[33.77%] object-contain object-left ${isLight ? "" : "invert"}`}
      />

      <span
        className={`absolute right-[6.67%] top-[9.73%] grid min-w-[11.4%] place-items-center rounded-md border px-[2.5%] text-[clamp(7px,2.6vw,10px)] font-semibold tracking-[0.13em] ${isLight ? "border-slate-900/25 bg-white/30" : "border-white/30 bg-black/10"}`}
        style={{ height: "10.62%" }}
      >
        {chain}
      </span>

      <div className="absolute left-[6.67%] top-[42.48%]">
        <p className="text-[clamp(6px,2vw,8px)] font-medium uppercase tracking-[0.24em] opacity-60">Credential</p>
        <h2 className="mt-[1px] text-[clamp(13px,5.2vw,19px)] font-semibold leading-none tracking-[-0.025em]">
          {credentialType}
        </h2>
      </div>

      <LinkedCredentialIcons
        privyConnected={Boolean(wallet)}
        worldVerified={verified}
        ensLinked={Boolean(name && name.toLowerCase().endsWith(".eth"))}
      />

      <p className="absolute left-[6.67%] top-[66.37%] font-mono text-[clamp(7px,2.4vw,9px)] tracking-[0.08em] opacity-75">
        {formatAddress(wallet)}
      </p>

      <div className="absolute bottom-[7.96%] left-[6.67%]">
        <p className="text-[clamp(5px,1.8vw,7px)] font-medium uppercase tracking-[0.24em] opacity-55">Holder</p>
        <p className="mt-[1px] text-[clamp(9px,3.2vw,12px)] font-medium leading-none">{name || "human.eth"}</p>
      </div>

      <div className="absolute bottom-[8.4%] right-[6.67%] flex items-center gap-1.5">
        <span className={`grid h-3.5 w-3.5 place-items-center rounded-full ${verified ? "bg-[#8ef2ce] text-[#10251e]" : "bg-amber-300 text-amber-950"}`}>
          {verified ? (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden="true">
              <path d="m3 6.2 1.8 1.7L9 3.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          ) : (
            <span className="h-1 w-1 rounded-full bg-current" />
          )}
        </span>
        <span className="text-[clamp(6px,2vw,8px)] font-semibold uppercase tracking-[0.16em]">
          {verified ? "Verified" : "Pending"}
        </span>
      </div>
    </article>
  );
}

export function CredentialColorwayPicker({ value, onChange }: CredentialColorwayPickerProps) {
  return (
    <fieldset className="w-full max-w-[440px]">
      <legend className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Card colour</legend>
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Choose credential card colour">
        {(Object.entries(credentialColorways) as [CredentialColorway, (typeof credentialColorways)[CredentialColorway]][]).map(
          ([key, theme]) => {
            const selected = key === value;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={theme.label}
                title={theme.label}
                onClick={() => onChange(key)}
                className={`h-7 w-10 rounded-lg border border-white/15 transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${selected ? "ring-2 ring-emerald-300 ring-offset-2 ring-offset-black" : "opacity-70 hover:opacity-100"}`}
                style={{ background: theme.background }}
              />
            );
          },
        )}
      </div>
    </fieldset>
  );
}
