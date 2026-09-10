import { NextResponse } from "next/server";
import { getAddress, parseAbiItem, parseEventLogs } from "viem";
import { readBoundSession } from "@/lib/account-session";
import { verifiedAccountDetails } from "@/lib/privy-auth";
import { claimViaRegistrar, resolveName, saltedNullifierHash, AlreadyClaimedError, NameUnavailableError } from "@/lib/ens/registrar";
import { InvalidEnsNameError, normalizeSubname } from "@/lib/ens/normalize";
import { PARENT_NAME, publicClient } from "@/lib/ens/config";
import state from "@/lib/ens/humanproof.sepolia.json";
import { recordCredential, getCredentialByPrivyUser, getCredentialName } from "@/lib/db";
import { getProgress, saveProof } from "@/lib/onboarding";
import { backendCall } from "@/lib/backend";
import { recoverLog } from "@/lib/chain-log-recovery";
import { VERIFICATION_ENV as WORLD_ENV } from "@/lib/verification/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const claimedEvent = parseAbiItem("event Claimed(string label, address indexed claimant, uint256 indexed nullifierHash, uint256 tokenId)");

export async function POST(request: Request) {
  const bound = await readBoundSession(request);
  if (!bound) return NextResponse.json({ error: "Sign in and resume verification first." }, { status: 401 });
  const { privyUserId, session } = bound;
  let stage = "credential lookup";
  try {
    const existing = await getCredentialByPrivyUser(privyUserId);
    if (existing) return NextResponse.json({ name: existing.name, resynced: true });
    stage = "account proof";
    const idToken = request.headers.get("privy-id-token");
    if (!idToken && process.env.PRIVY_IDENTITY_TOKENS_ENABLED === "true") {
      return NextResponse.json(
        { error: "Identity verification token is missing. Please refresh your sign-in to continue." },
        { status: 401 },
      );
    }
    const details = await verifiedAccountDetails(request, privyUserId);
    if (!details?.hasPasskey) return NextResponse.json({ error: "Add a passkey first. If you already added one, refresh your sign-in and retry." }, { status: 403 });
    stage = "request parsing";
    const body = await request.json();
    if (!body || typeof body.label !== "string" || typeof body.address !== "string") return NextResponse.json({ error: "Choose your name and wallet." }, { status: 400 });
    stage = "wallet binding";
    const address = getAddress(body.address);
    if (!details.wallets.includes(address.toLowerCase())) return NextResponse.json({ error: "Use your own embedded wallet." }, { status: 403 });
    stage = "name normalization";
    const { name, label } = normalizeSubname(body.label, PARENT_NAME);
    const fingerprint = session.nullifierHash ?? saltedNullifierHash(session.nullifier!).toString();
    stage = "saved progress";
    let progress = await getProgress(privyUserId);
    // Upgrade a still-valid legacy cookie to the durable resume record.
    if (!progress) { await saveProof(privyUserId, fingerprint); progress = await getProgress(privyUserId); }
    if (!progress || progress.nullifierHash !== fingerprint) throw new Error("PROGRESS_MISMATCH");
    stage = "prepare name";
    const startBlock = progress.startBlock ?? (await publicClient.getBlockNumber()).toString();
    await backendCall("mutation", "onboarding:prepareName", { privyUserId, name, address, startBlock, environment: WORLD_ENV });
    progress = await getProgress(privyUserId);
    let txHash = progress?.txHash as `0x${string}` | undefined;
    if (!txHash) {
      stage = "recover transaction";
      // Recover a successful transaction even if its response/database update was interrupted.
      const match = await recoverLog(BigInt(startBlock), await publicClient.getBlockNumber(),
        (fromBlock, toBlock) => publicClient.getLogs({ address: getAddress(state.registrar), event: claimedEvent,
          args: { nullifierHash: BigInt(fingerprint) }, fromBlock, toBlock }),
        log => log.args.label === label && log.args.claimant?.toLowerCase() === address.toLowerCase());
      txHash = match?.transactionHash;
    }
    if (!txHash) {
      stage = "submit ENS transaction";
      const result = await claimViaRegistrar(label, address, BigInt(fingerprint), async hash => {
        await backendCall("mutation", "onboarding:saveTransaction", { privyUserId, txHash: hash, environment: WORLD_ENV });
      });
      txHash = result.txHash as `0x${string}`;
    }
    stage = "wait for ENS transaction";
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60000 });
    if (receipt.status !== "success") {
      await backendCall("mutation", "onboarding:saveTransaction", { privyUserId, reset: true, environment: WORLD_ENV });
      return NextResponse.json({ error: "The name transaction failed. Your verification is saved; choose a name and retry." }, { status: 409 });
    }
    const event = parseEventLogs({ abi: [claimedEvent], logs: receipt.logs }).find(log =>
      log.address.toLowerCase() === state.registrar.toLowerCase() && log.args.label === label &&
      log.args.claimant.toLowerCase() === address.toLowerCase() && log.args.nullifierHash === BigInt(fingerprint));
    if (!event) throw new Error("CLAIM_RECEIPT_MISMATCH");
    // Completion depends on a durable credential record, never just a submitted transaction.
    stage = "record credential";
    await recordCredential(fingerprint, name, privyUserId);
    const resolved = await resolveName(name).catch(() => null);
    return NextResponse.json({ name, resolved, txHash, complete: true });
  } catch (error) {
    const code = error instanceof Error ? error.name : "UnknownError";
    console.error("[ens/claim] failed", { stage, code });
    if (error instanceof AlreadyClaimedError) {
      let existingName: string | null = null;
      try {
        const fingerprint = session.nullifierHash ?? saltedNullifierHash(session.nullifier!).toString();
        existingName = await getCredentialName(fingerprint);
      } catch {
        // Keep the response safe even if the credential lookup is temporarily unavailable.
      }
      return NextResponse.json(
        {
          error: existingName
            ? `This human already has ${existingName}. Sign out and use Sign in with HumanProof to resume that account.`
            : "This human has already claimed an ENS identity. Sign out and use Sign in with HumanProof to resume that account.",
        },
        { status: 409 },
      );
    }
    if (error instanceof InvalidEnsNameError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof NameUnavailableError) {
      await backendCall("mutation", "onboarding:saveTransaction", { privyUserId, reset: true, environment: WORLD_ENV }).catch(() => {});
      return NextResponse.json({ error: "That name is unavailable. Choose another; your verification is saved." }, { status: 409 });
    }
    return NextResponse.json({ error: "Your setup is saved. Retry the same name to check its transaction and finish safely." }, { status: 503 });
  }
}
