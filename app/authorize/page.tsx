'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthedFetch } from '@/components/use-authed-fetch';
export default function AuthorizePage() {
  const authedFetch = useAuthedFetch();
  const [app, setApp] = useState<{ name: string; destination: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { let cancelled = false; fetch('/api/authorize' + window.location.search).then(async r => { const data = await r.json(); if (!cancelled) { if (r.ok) setApp(data); else setError(data.error); } }).catch(() => { if (!cancelled) setError('Unable to load this request.'); }); return () => { cancelled = true; }; }, []);
  async function approve() {
    setBusy(true); setError('');
    try { const response = await authedFetch('/api/authorize' + window.location.search, { method: 'POST' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); window.location.assign(data.redirect); }
    catch (e) { setError(e instanceof Error ? e.message : 'Authorization failed.'); setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 text-white">
    <Link href="/">HumanProof</Link><h1 className="text-3xl">Connect your human identity</h1>
    {app && <><p><strong>{app.name}</strong> ({app.destination}) wants confirmation of your verified-human credential and your public ENS name.</p><p>Your name can link this account to your public activity. This does not grant wallet spending permission or permission to post on your behalf.</p><button disabled={busy} onClick={() => void approve()} className="rounded-xl bg-white p-4 text-black disabled:opacity-50">{busy ? 'Connecting…' : 'Approve connection'}</button></>}
    {error && <p role="alert">{error}</p>}<Link href="/login" target="_blank" rel="noreferrer">Sign in to HumanProof in another tab</Link><Link href="/">Cancel</Link>
  </main>;
}
