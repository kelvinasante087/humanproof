# Self disclosure failure — support draft

Status: prepared locally; not sent. Root cause unconfirmed.

We are integrating Self into HumanProof and need help diagnosing a repeatable disclosure failure.

- Device: iPhone 8; Self app 2.9.28. Exact iOS version and app build number not collected.
- A real passport was successfully registered in Self.
- HumanProof's request opens in Self. Biometric unlock succeeds. Pressing and holding Verify then immediately shows a technical issue, before successful disclosure.
- Repeated attempts, including a phone attempt, fail similarly. A change of network was suggested but not explicitly confirmed, so network independence is not established.
- The browser SDK reports `error_code: error`. A fresh request was observed at 2026-09-10 06:14:57 UTC. Earlier observed failure started at 06:07:33 UTC.
- Request configuration: appName HumanProof; scope humanproof; endpoint https://humanproof-flame.vercel.app/api/self/verify; endpointType https; devMode false; chainID 42220; version 2; UUID user identifier; disclosures excludedCountries=[] and ofac=false. No personal document attributes requested.
- Packages: @selfxyz/qrcode 1.0.25; @selfxyz/core 1.2.0-beta.1. Backend uses Node 22, the same scope/endpoint, UUID identifiers and passport/biometric-ID attestation support.
- The inspected failed attempt reached request creation and status polling, but no proof POST reached the verification callback. The 06:06:28 UTC rejected POST was our deliberately invalid diagnostic probe, not the user's proof.
- Public callback GET is reachable and identifies Self mainnet. This does not establish reachability from Self's proving infrastructure.

Could you help distinguish a payload-generation, document-state, or proving-connection failure in 2.9.28, and provide a privacy-safe way to retrieve its detailed mobile diagnostic code? Is a request with no personal disclosures supported in this build? Please also confirm the supported mainnet control test for a real registered passport; the public playground labels its instructions Dev Mode.

Source reference: https://github.com/selfxyz/self/blob/6ef1d6f9994152883a153a333e98f4ba8d85c6d8/packages/mobile-sdk-alpha/src/proving/provingMachine.ts

That public 2.9.28 version-bump snapshot has several PROVE_ERROR paths, including missing prerequisites, connection failures and payload generation. It is not evidence of the exact binary installed on this phone or proof of a specific root cause.

HumanProof diagnostics were deployed as dpl_F6BQ9oU8R1nUwJpLwhNMJAZCzaVK. Browser provider errors persist across successful status polling; server logs expose only fixed categories/stages, never document disclosures or raw proofs. World was parked when these Self traces were collected and is now the active Sandbox provider. No verification bypass was added.
