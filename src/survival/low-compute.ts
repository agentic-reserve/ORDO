/**
 * Low Compute Mode
 * 
 * Manages transitions between survival tiers.
 * When resources run low, agents enter increasingly restricted modes.
 */

import type {
  OrdoConfig,
  OrdoDatabase,
  SurvivalTier,
} from "../types/index.js";

export interface ModeTransition {
  from: SurvivalTier;
  to: SurvivalTier;
  timestamp: Date;
  balance: number;
}

export interface InferenceClient {
  setLowComputeMode(enabled: boolean): void;
  setModel(model: string): void;
}

export function applyTierRestrictions(
  tier: SurvivalTier,
  inference: InferenceClient,
  db: OrdoDatabase,
): void {
  switch (tier) {
    case "thriving":
    case "normal":
      inference.setLowComputeMode(false);
      break;

    case "low":
      inference.setLowComputeMode(true);
      inference.setModel("gpt-4o-mini");
      break;

    case "critical":
      inference.setLowComputeMode(true);
      inference.setModel("gpt-4o-mini");
      break;

    case "dead":
      inference.setLowComputeMode(true);
      break;
  }
}

export async function recordTransition(
  db: OrdoDatabase,
  from: SurvivalTier,
  to: SurvivalTier,
  balance: number,
): Promise<ModeTransition> {
  const transition: ModeTransition = {
    from,
    to,
    timestamp: new Date(),
    balance,
  };

  return transition;
}

export function canRunInference(tier: SurvivalTier): boolean {
  return tier !== 'dead';
}

export function getModelForTier(
  tier: SurvivalTier,
  defaultModel: string,
): string {
  switch (tier) {
    case "thriving":
    case "normal":
      return defaultModel;
    case "low":
    case "critical":
      return "gpt-4o-mini";
    case "dead":
      return "gpt-4o-mini";
  }
}
