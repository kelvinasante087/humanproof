import "server-only";
import { backendCall } from "./backend";
import { VERIFICATION_ENV as WORLD_ENV } from "./verification/config";

export type OnboardingProgress = {
  privyUserId: string; nullifierHash: string; environment: string; verifiedAt: number;
  name?: string; address?: string; txHash?: string; startBlock?: string;
};
export async function getProgress(privyUserId: string) {
  return backendCall<OnboardingProgress | null>("query", "onboarding:get", { privyUserId, environment: WORLD_ENV });
}
export function saveProof(privyUserId: string, nullifierHash: string) {
  return backendCall("mutation", "onboarding:saveProof", { privyUserId, nullifierHash, environment: WORLD_ENV });
}
