"use client";

import { useEffect, useRef, useState } from 'react';
import { SelfAppBuilder, SelfQRcodeWrapper, getUniversalLink, type SelfApp } from '@selfxyz/qrcode';
import { useAuthedFetch } from './use-authed-fetch';

export function SelfVerify({ onVerified }: { onVerified: () => Promise<void> }) {
  const authedFetch = useAuthedFetch();
  const [app, setApp] = useState<SelfApp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pollError, setPollError] = useState('');
  const verifiedCallback = useRef(onVerified);
  useEffect(() => { verifiedCallback.current = onVerified; }, [onVerified]);

  useEffect(() => {
    if (!app) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await authedFetch(`/api/self/status?requestId=${encodeURIComponent(app!.userId)}`);
        const data = await response.json();
        if (cancelled) return;
        if (response.status === 404 || response.status === 401) {
          setApp(null);
          setError(response.status === 404 ? 'This request was replaced or is no longer available. Use the newest request, or start again in this tab.' : 'Sign in again to continue verification.');
          return;
        }
        if (!response.ok) throw new Error(data.error || 'Unable to check verification.');
        setPollError('');
        if (data.verified) { await verifiedCallback.current(); return; }
        if (data.expired) { setApp(null); setError('This request expired. Start again to continue.'); return; }
      } catch (e) { if (!cancelled) setPollError(e instanceof Error ? e.message : 'Please retry.'); }
      if (!cancelled) timer = setTimeout(poll, 3000);
    }
    timer = setTimeout(poll, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [app, authedFetch]);

  async function start() {
    setBusy(true); setError(''); setPollError(''); setApp(null);
    try {
      const response = await authedFetch('/api/self/start', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setApp(new SelfAppBuilder({ appName: 'HumanProof', scope: data.scope, endpoint: data.endpoint,
        endpointType: data.devMode ? 'staging_https' : 'https', userId: data.requestId, userIdType: 'uuid',
        devMode: data.devMode, disclosures: { excludedCountries: [], ofac: false },
      }).build());
    } catch (e) { setError(e instanceof Error ? e.message : 'Verification is unavailable.'); }
    finally { setBusy(false); }
  }

  return <div className="flex flex-col gap-4">
    <p className="text-sm leading-relaxed text-white/70">Use Self with a supported passport or identity card to create your HumanProof credential. HumanProof does not request your name, document number, or date of birth.</p>
    {app && <>
      {app.devMode && <p className="text-sm text-amber-200">Test documents only. This creates a separate test credential.</p>}
      <div className="flex justify-center rounded-xl bg-white p-4"><SelfQRcodeWrapper selfApp={app} onSuccess={() => { /* Server polling is the authority. */ }} onError={(data) => {
        const code = typeof data.error_code === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(data.error_code) ? ` (${data.error_code})` : '';
        setError(`Self could not complete verification${code}. Retry in Self, or start a new request here if the issue continues.`);
      }} size={240} /></div>
      <a className="rounded-xl bg-white px-5 py-3 text-center font-semibold text-black" href={getUniversalLink(app)}>Open Self on this phone</a>
      <p className="text-center text-xs text-white/60">Scan with Self on your phone, or open Self above. Your progress is saved after verification.</p>
    </>}
    <button type="button" disabled={busy} onClick={() => void start()} className="rounded-xl border border-white/25 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Preparing verification…' : app ? 'Start a new request' : 'Verify with Self'}</button>
    {(error || pollError) && <p role="alert" className="text-sm text-rose-300">{error || pollError}</p>}
  </div>;
}
