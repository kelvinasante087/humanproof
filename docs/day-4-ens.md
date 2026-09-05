# Day 4 — ENS v2 subnames gated on proof-of-humanity (spec)

_Written before building, in plan mode, and committed as our AI-attribution proof.
Every contract, function signature, and address below was verified against the live
ENS v2 docs (docs.ens.domains/ensv2 + /learn/deployments, read 2026-09-05). Addresses are
treated as **discovered, pending on-chain verification** — the deploy script confirms each has
bytecode and answers the expected calls before anything relies on it. We do not blindly hardcode
(ENS correctness rule #5)._

## Where this sits in the product

HumanProof is a reusable **proof-of-human trust layer** — never a name service; the ENS name is
the portable handle a verified human carries. Flow so far: sign in (Privy email + invisible
embedded wallet) → prove unique human (World Selfie Check → a session-held nullifier) → bind the
device (passkey). Today adds the **name**, and completes the credential.

Reading order in the signed-in card, after today:

> signed in → verify human → add passkey → **claim your name** → credential complete

Only once the name is issued do we persist the credential (salted nullifier). A drop-off before
that point leaves no trace, so the user can cleanly restart.

## Why ENS v2 on Sepolia (settled at the ENS workshop, Kevin @ ENS Labs)

Build on the ENS v2 **hackathon-stable Sepolia** contract set — the intended sandbox, judged for
"Best Use of ENSv2." No mainnet name, no cost. The parent `humanproof.eth` lives on this Sepolia
v2 deployment; we do not own (or need) a mainnet name.

## The verified ENS v2 setup (Sepolia beta)

Discovered contracts (docs.ens.domains/learn/deployments#sepolia-ensv2-beta, 2026-09-05 — the
deploy script re-verifies each on-chain before use):

| Contract | Role in our build |
|---|---|
| `VerifiableFactory` | Deploys our resolver + subname registry as CREATE2 proxies |
| `RootRegistry`, `ETHRegistry` | The registry tree (root → .eth) |
| `ETHRegistrar` | Registers `.eth` names (commit/reveal; paid in MockUSDC) |
| `StandardRentPriceOracle` | Registration pricing |
| `PermissionedResolverImpl` | Resolver implementation our proxy delegates to |
| `UniversalResolver` / `UpgradableUniversalResolverProxy` | Resolution entry point we read through |
| `MockUSDC` | Freely mintable registration-fee token (`mint(to, amount)`, 6 decimals) |

Verified APIs (signatures from the v2 docs; exact ABIs re-confirmed on-chain / from the verified
source before the code path runs):

- **Factory:** `deployProxy(address implementation, uint256 salt, bytes data) → address proxy`
  (CREATE2; `outerSalt = keccak256(abi.encode(msg.sender, salt))`; emits `ProxyDeployed`). `data`
  is the implementation's `initialize(...)` calldata.
- **ETH Registrar (commit/reveal):**
  `makeCommitment(label, owner, secret, subregistry, resolver, duration, referrer)` →
  `commit(bytes32)` → wait `MIN_COMMITMENT_AGE` (~60s) →
  `register(label, owner, secret, subregistry, resolver, duration, paymentToken, referrer) → tokenId`.
  Price via `getRegisterPrice(label, duration, paymentToken)`; `approve` the registrar for MockUSDC first.
- **Registry (PermissionedRegistry):**
  `register(string label, address owner, IRegistry subregistry, address resolver, uint256 roleBitmap, uint64 expiry) → tokenId`,
  `setSubregistry(id, registry)`, `setResolver(id, resolver)`, `getSubregistry(label)`,
  `grantRootRoles(roleBitmap, account)`. Roles: `ROLE_REGISTRAR = 1<<0`, `ROLE_RENEW = 1<<16`,
  `ROLE_SET_SUBREGISTRY = 1<<20`, `ROLE_SET_RESOLVER = 1<<24`; admin variant = `role << 128`.
- **Resolver (PermissionedResolver):** `setAddr`, `setText`, `multicall`.

## FLOOR — a subname that resolves, gated at the app level (commit this first)

One-time setup (viem scripts; the Sepolia deployer key in `.env.local` signs; nothing hardcoded):

1. Mint MockUSDC to the deployer; `approve` the ETH Registrar.
2. Register the parent **`humanproof.eth`** (commit → wait ~60s → register). If it is already taken
   on the shared testnet, fall back to a nearby parent (e.g. `humanproof-hp.eth`) and record which.
3. Deploy our **resolver** proxy (VerifiableFactory → PermissionedResolverImpl).
4. Deploy our **subname registry** proxy (VerifiableFactory → registry impl); point the parent at it
   via `setSubregistry` on the ETH Registry.

Per-user issuance (server-side, on demand):

5. Issue `<name>.humanproof.eth` — `register` the normalized label in our registry to the user's
   Privy wallet address, set its resolver, and set the `addr` record so it resolves.
6. **Confirm resolution** through the Universal Resolver: resolve `<name>.humanproof.eth` → the
   user's address; forward-verify the result.

**App-level gate (the floor's claim condition):** the server route that issues a name requires the
World session (nullifier present = verified this session) **and** a signed-in Privy user with a
bound passkey. No verified, device-bound session → no name. Legit v2, tells the story, minimal Solidity.

## STRETCH — move the gate on-chain (`HumanProofRegistrar`)

Make **proof-of-humanity the on-chain claim condition**, honestly. The World nullifier is verified
off-chain (World's API); to gate on-chain we bridge it with a signed attestation, not a faked proof:

- After a successful World verify + passkey, our server (an **issuer** holding a server-only signing
  key) signs an **EIP-712 "humanity voucher"**: `{ claimant, label, nullifierHash, expiry }`.
- `HumanProofRegistrar.register(label, owner, resolver, duration, voucher, signature)` enforces:
  1. recovered signer **is** the trusted issuer (set at deploy);
  2. `owner == msg.sender` (voucher can't be replayed for another address);
  3. `usedNullifier[nullifierHash] == false`, then marks it used → **on-chain one-human-one-name**;
  4. voucher not expired;
  then calls `REGISTRY.register(label, owner, 0, resolver, roleBitmap, expiry)` on our subname registry.
- Grant the registrar `ROLE_REGISTRAR` on our subname registry (`grantRootRoles`) and **revoke our
  own**, so names can be minted **only** through the registrar — i.e. only with a valid humanity
  voucher for an unused nullifier. "Only a verified unique human can claim a name," enforced by the contract.

**Honesty line (README + judges):** the contract enforces issuer-attested humanity + on-chain
uniqueness; the humanity attestation itself is World's, verified off-chain. No on-chain World proof
is faked. This is the standout ENS v2 angle (a registrar with a custom claim condition) and it is
native to what HumanProof already does.

**Toolchain:** the registrar is one Solidity file importing a **minimal vendored** `IRegistry`
interface + role constants (not the whole ENS package). Compiled with `solc` (solc-js) and deployed
with viem — no Foundry/Hardhat install. The source is identical to what a framework would compile;
only the harness differs.

## The six ENS correctness rules (baked in from the first line)

1. **Normalize the whole dotted name** with `@adraffy/ens-normalize` — never `toLowerCase`, never
   label-by-label. Exact export verified against the installed package before use.
2. **Forward-verify** any reverse lookup (viem does this by default).
3. **viem 2.56** (≥ 2.35), CCIP-Read left on.
4. **Resolution origin:** production ENS resolves from mainnet; the hackathon v2 set is
   **Sepolia-native**, so we resolve through the **Sepolia** Universal Resolver (chainId 11155111).
   Noted honestly as a sandbox deviation, not an oversight.
5. **No blind hardcoded addresses** — read from the deployments page, verify on-chain in the script.
6. **Don't gate on a `.eth` suffix** — check for a `.` and resolve.

## Credential completion (the last step today)

Only after the name is issued, persist **`salt(nullifier)`** — a keyed hash with a server-side salt,
never the raw nullifier. **DB decision (open, decided when we reach it):** Convex per the master
plan — Day 5 leans on its serializable mutations for atomic uniqueness — but it needs a Convex
project + deploy. Alternative: a minimal durable store now, Convex on Day 5. Note: the stretch
registrar **already** stores the salted nullifier hash on-chain for uniqueness; the DB write is the
app-side record Day 5's API-layer uniqueness builds on.

## Scope guards (what we deliberately do NOT do today)

- No mainnet anything. No subgraph enumeration (list from our own records if ever needed).
- Registrar stays **one** contract, **one** claim condition. No subname pricing (free to the human),
  no renewals UI, no ZK on-chain verification of the World proof (the voucher is the honest bridge).
- One issuer key. Deployer + issuer keys live in `.env.local` / Vercel only, never `NEXT_PUBLIC_`,
  never committed.

## Acceptance (verify end-to-end)

A verified, passkey-bound user claims `<name>.humanproof.eth`; the claim is gated on proof-of-humanity
(app-level for the floor, the on-chain registrar for the stretch); it **resolves on Sepolia** through
the Universal Resolver; the salted nullifier is persisted. Build stays green; site stays public.

---

## As built (2026-09-05) — verified on Sepolia

Both the floor and the stretch shipped, verified on-chain and through the running app.

**Deployed** (owner = founder wallet `0x9028…c4`; operational signer = worker `0x2cAC…75`):
- Parent name **`humanproof.eth`** — registered to the founder wallet, pointed at our registry + resolver.
- Subname registry (UserRegistry proxy): `0x40fF7015340d41B00c838826037fE47dB9B57bE8`
- Resolver (PermissionedResolver proxy): `0x1FA237087fd16e3C340F7577D59e8D614a6106e7`
- **`HumanProofRegistrar`**: `0x18489F37F6dE05AFa970A427cF3652281cFc8d4c` (issuer `0x0dCD…a711`)
- Live ENS v2 set + our addresses recorded in `lib/ens/deployments.sepolia.json` and `humanproof.sepolia.json`.

**Floor — verified:** subname issued to the user's wallet, resolves end-to-end through
UniversalResolverV2. `/api/ens/claim` gated on the World cookie (no cookie → 401).

**Stretch — verified on-chain:** `HumanProofRegistrar.claim` mints only against an issuer-signed
EIP-712 humanity voucher for an unused nullifier. Proven live: (1) valid voucher → mints + resolves;
(2) reused nullifier → reverts `NullifierAlreadyUsed`; (3) non-issuer signature → reverts
`InvalidSignature`. The live app claims through the registrar; a returning human gets 409 "already claimed".

**Honesty note:** World's Selfie Check is the humanity check (off-chain). The contract enforces the
issuer attestation + on-chain uniqueness — no World proof is faked on-chain.

**Two ENS traps, caught by verifying on-chain (logged in FEEDBACK.md):** the docs deployments page
lists a stale address set; and the canonical vanity Universal Resolver proxy reverts while
UniversalResolverV2 resolves correctly.

**Deferred:** the app-side DB record of the salted nullifier (Day 5 — the on-chain used-nullifier
ledger already persists it for uniqueness). Live-site claiming needs the worker + issuer keys added to
Vercel (server-only env) — a pre-demo step.
