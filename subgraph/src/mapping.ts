import { Sealed } from "../generated/HumanProofAttestations/HumanProofAttestations";
import { Receipt } from "../generated/schema";

export function handleSealed(event: Sealed): void {
  const receipt = new Receipt(event.params.dedupeKey);
  receipt.contentHash = event.params.contentHash;
  receipt.appId = event.params.appId;
  receipt.timestamp = event.params.timestamp;
  receipt.transactionHash = event.transaction.hash;
  receipt.blockNumber = event.block.number;
  // Deliberately do not index the global human fingerprint in the public query surface.
  receipt.save();
}
