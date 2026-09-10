# HumanProof receipt network

The Graph indexes HumanProofAttestations on Base Sepolia at `0xc4C4Be84f403bA4a15e0161Ff97Ebfff1bEBb71e`. This is core public evidence infrastructure: humans authorize publication; readers and agents discover and inspect receipts without a HumanProof account.

`subgraph/` contains the exact event ABI, schema, AssemblyScript mapping and manifest. Run `npm ci --prefix subgraph`, `npm --prefix subgraph run codegen`, then `npm --prefix subgraph run build`. The manifest starts from block zero conservatively. Set a verified contract creation block before deployment to avoid scanning unrelated history. Deploy with your Graph Studio project and deploy key; no Graph deployment or key is currently configured by this implementation.

Set server-only `HUMANPROOF_GRAPH_URL` to the deployed HTTPS query endpoint and optionally `HUMANPROOF_GRAPH_API_KEY`. Keep credentials out of public environment variables. `/api/receipts` accepts app, id, contentHash and limit (maximum 100); responses include indexing block metadata. Unconfigured endpoints, Graph errors and indexing errors return 503. Indexing may lag new transactions. This layer does not replace the authenticated write path or block onboarding when receipt discovery is unavailable.

`/verify` offers discovery and exact UTF-8 keccak256 payload comparison in the browser. For Proofit this means the complete canonical serialized review payload, including product, rating and text, not only the visible prose. Whitespace, field order and Unicode matter. Comparison does not upload the payload. The returned explanation is deterministic evidence interpretation, not an AI claim of truth.

The current event exposes a consistent salted fingerprint publicly. The subgraph/API deliberately omit it, but existing chain data remains linkable. Events do not include provider, credential expiry, revocation or direct proof verification. They establish that the authorized HumanProof server recorded an action hash, not that its content is truthful, human-written, or independently verified on-chain. Base Sepolia is a test network. Do not market this legacy event as global cross-provider uniqueness.

Live acceptance requires deploying the index, checking its metadata and matching a known transaction/hash against the explorer, then publishing a new authorized action and observing it appear. Unit tests and a successful Graph build do not establish that this deployment exists.
