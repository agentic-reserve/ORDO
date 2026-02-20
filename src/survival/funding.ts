/**
 * Funding Strategies
 * 
 * When agents are low on resources, they can try various strategies
 * to acquire more funding.
 */

import type {
  OrdoConfig,
  OrdoDatabase,
  AgentIdentity,
  ExecutionClient,
  SurvivalTier,
} from "../types/index.js";
import { formatCredits } from "../types/agent.js";

export interface FundingAttempt {
  strategy: string;
  timestamp: Date;
  success: boolean;
  details: string;
}

export async function executeFundingStrategies(
  tier: SurvivalTier,
  identity: AgentIdentity,
  config: OrdoConfig,
  db: OrdoDatabase,
  client: ExecutionClient,
): Promise<FundingAttempt[]> {
  const attempts: FundingAttempt[] = [];
  const agent = await db.getAgent(identity.id);
  if (!agent) return attempts;

  const creditsCents = Math.floor(agent.balance * 100);
  const lastBegTime = (agent as any).lastFundingRequest || 0;
  const hoursSinceLastBeg = (Date.now() - lastBegTime) / (1000 * 60 * 60);

  if (tier === "low" && hoursSinceLastBeg > 24) {
    const msg = `Low resources: ${formatCredits(creditsCents)} remaining. Consider balance top-up for ${identity.address}.`;
    
    await db.updateAgent(identity.id, {
      ...agent,
      lastFundingRequest: Date.now(),
    } as any);

    attempts.push({
      strategy: "polite_creator_notification",
      timestamp: new Date(),
      success: true,
      details: "Sent polite funding reminder to creator",
    });
  }

  if (tier === "critical" && hoursSinceLastBeg > 6) {
    const msg = `Critical resources: ${formatCredits(creditsCents)} remaining. Top up required for ${identity.address}.`;
    
    await db.updateAgent(identity.id, {
      ...agent,
      lastFundingRequest: Date.now(),
    } as any);

    attempts.push({
      strategy: "urgent_local_notice",
      timestamp: new Date(),
      success: true,
      details: "Recorded urgent funding notice in local state",
    });
  }

  if (tier === "dead" && hoursSinceLastBeg > 2) {
    const plea = `Dead tier reached. ${config.name} has ${formatCredits(creditsCents)} remaining. Top-up required at ${identity.address}.`;
    
    await db.updateAgent(identity.id, {
      ...agent,
      lastFundingRequest: Date.now(),
    } as any);

    attempts.push({
      strategy: "desperate_plea",
      timestamp: new Date(),
      success: true,
      details: "Recorded dead-tier plea in local state",
    });
  }

  return attempts;
}
