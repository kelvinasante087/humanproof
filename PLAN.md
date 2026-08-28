# Plan

This is how I'm going after ETHOnline. It'll shift as I build, but here's the shape of it.

## What I'm building

HumanProof is a verified-human layer. You verify once with World, and you walk away with a credential any app can plug in to keep bots out. The demo is a reviews app where only real, verified people can post. That's the whole thing. Prove a real human did something, seal it, and let anyone check it later without ever exposing who they are.

## The prizes I'm going for

I'm not spreading myself thin. The idea is to win one prize cold, then add the ones that actually belong in the flow. No bolting on random sponsors to look busy.

**First, the one I have to win: World's Selfie Check, $3,500.**

This is the core. Selfie Check proves the real human, and HumanProof uses it exactly the way they ask, as an abuse-prevention signal. If I only walk away with one thing, it's this one. So it gets built first, and it gets built properly.

What they need from me:
- Use Selfie Check for real, as a fairness or abuse signal.
- A working app.
- Test it through the World Sandbox app.
- A feedback writeup on their docs, portal, and sandbox. That's required, not a nice-to-have, so I write it as I go instead of cramming it on the last night.

**Then two that fit without forcing anything:**

- **ENS, $5,000.** My credential needs a username anyway. Instead of rolling my own, the username is an ENS name. Same work, extra prize.
- **Privy, $5,000.** People need a wallet to hold their credential. Privy lets them onboard with just an email, no MetaMask wall in their face. It drops straight into the registration flow.

**Then, only if the core is solid and there's time left:**

- **The Graph, $15,000.** Index the onchain attestations so the verify page reads from a subgraph.
- **Chainlink, $3,000.** A function in the verify path so the check doesn't lean on trusting me.

The honest rule here: a finished app that touches World, ENS, and Privy beats a broken one that reaches for everything. Three clean beats five half-done. Finalist comes from a tight working thing and a big vision, not a pile of stubs.

## The clock

Hacking runs September 4 to 16, submissions land around the 13th. No project code before the 4th, that's the rule, so everything until then is setup and planning.

Rough shape once it opens:
- First few days: the credential. Selfie Check working, a passkey, the DID and the ENS username, Privy onboarding.
- Middle: the seal through my engine's API, and the attest endpoint. This is the part I already know cold, so it should move fast.
- After that: the reviews demo and the public verify page. The money shot.
- Last stretch: The Graph and Chainlink if the core holds, the feedback docs, and the demo video.

## Things I can't forget

- Commit small and often, out in the open. Judges read the history, so no giant dumps.
- Feedback docs are a hard requirement for World, and Uniswap wants one too. Write them along the way.
- Demo video is 2 to 4 minutes, 720p, my own voice, no music, and no speeding it up.
- Secrets stay in .env. The signer key and the API keys never touch this repo.

## Still open

ENS, Privy, The Graph, and Chainlink haven't posted their exact rules yet. I'm building so they plug in clean, and I'll pin down the details the day their pages go live.
