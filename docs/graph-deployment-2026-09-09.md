# Graph Studio activation — September 9, 2026

HumanProof Receipts (`human-proof-receipts`) version 0.1.0 is deployed to Studio and connected to the live app. Manifest IPFS hash: `QmYqawLduphik5KeXT6X12vE9YxsB8T9wmt57qCkmUAk1i`.

Query endpoint: https://api.studio.thegraph.com/query/1760029/human-proof-receipts/0.1.0

The manifest begins at verified contract creation block 46462718 on Base Sepolia. Historical eth_getCode was used to identify the first block containing the contract. All 12 indexed historical receipts were independently compared against transaction event logs for receipt ID, application, content hash, timestamp and block number. All matched. At verification the index had reached block 46613106 against chain head 46613109, with no indexing errors.

Vercel deployment `dpl_AbuvhX9oYRi2xgPSsxdHDEinqLMg` configured HUMANPROOF_GRAPH_URL and completed successfully. The live /api/receipts?app=reviews endpoint returned five historical review receipts; Self onboarding readiness remained true.

This is a Studio deployment using its development query endpoint, not decentralized-network publication. Studio development endpoints have a documented 3,000-query daily limit. Production-scale publication and query billing/API key configuration remain a separate decision. The historical receipts include harness/test actions and do not establish completion of the current Self phone onboarding. A newly authorized Proofit post appearing in the index remains the next end-to-end user test.
