/**
 * Economic system type definitions
 */

import type { SurvivalTier } from "../types.js";

export interface SurvivalTierConfig {
  name: SurvivalTier;
  minBalance: number;
  capabilities: string;
  model: string;
  canReplicate: boolean;
  canExperiment: boolean;
}
