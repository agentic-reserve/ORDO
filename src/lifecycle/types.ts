/**
 * Lifecycle system type definitions
 */

import type { Agent, DeathCause } from "../types.js";

export interface BirthParams {
  name: string;
  parent?: string;
  initialBalance: number;
  mutationRate: number;
}

export interface GrowthMetrics {
  age: number;
  experience: number;
  wisdom: number;
  fitness: number;
  readinessToReproduce: boolean;
}

export interface Legacy {
  knowledge: Record<string, unknown>[];
  offspring: Agent[];
  contributions: string[];
  reputation: number;
  artifacts: Record<string, unknown>[];
}

export interface LifecycleManager {
  birthAgent(params: BirthParams): Promise<Agent>;
  trackGrowth(agent: Agent): Promise<GrowthMetrics>;
  checkSurvival(agent: Agent): Promise<boolean>;
  terminateAgent(agent: Agent, cause: DeathCause): Promise<Legacy>;
  recordLineage(parent: Agent, child: Agent): Promise<void>;
}

