# Self hosting activation — September 9, 2026

Production deployment `dpl_GB72FZ5KMiCKPoL4ynwvhM9hodDt` is Ready and serves https://humanproof-flame.vercel.app. Node is pinned to 22.x to match the Self SDK's supported engine. Deployment was uploaded from the current working tree; this does not represent a Git push.

The active provider is Self mainnet, scope `humanproof`, callback https://humanproof-flame.vercel.app/api/self/verify. Vercel uses the existing tested `rare-fennec-188` Convex development backend for this hackathon deployment, including the authenticated server bridge and saved progress. It is not a separate production Convex deployment. Existing World configuration remains parked.

Verified against the public domain: signup HTTP 200; callback GET identifies Self mainnet and matching scope; invalid proof returns result=false; inactive World signing returns 404; readiness reports all four account, verification, saved-progress and credential-name checks ready. Vercel alias inspection confirms the Node 22 deployment above.

A real Self proof, passkey binding and name issuance with the user's phone remain the next acceptance test. Infrastructure readiness is not evidence that those user actions completed. The Graph hosted index and replacement Airdroppa payout contract remain separate pending work.
