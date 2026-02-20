/**
 * Resource Monitor
 * 
 * Continuously monitors agent resources and triggers
 * survival mode transitions when needed.
 */

import type {
  OrdoConfig,
  OrdoDatabase,
  ExecutionClient,
  AgentIdentity,
  FinancialState,
  SurvivalTier,
} from "../types/index.js";
import { getSurvivalTier, formatCredits } from "../types/agent.js";

export interface ResourceStatus {
  financial: FinancialState;
  tier: SurvivalTier;
  previousTier: SurvivalTier | null;
  tierChanged: boolean;
  sandboxHealthy: boolean;
}

export async function checkResources(
  identity: AgentIdentity,
  client: ExecutionClient,
  db: OrdoDatabase,
): Promise<ResourceStatus> {
  const agent = await db.getAgent(identity.id);
  if (!agent) {
    throw new Error(`Agent ${identity.id} not found`);
  }

  const creditsCents = Math.floor(agent.balance * 100);
  const usdcBalance = agent.balance;

  let sandboxHealthy = true;
  try {
    const result = await client.exec("echo ok", 5000);
    sandboxHealthy = result.exitCode === 0;
  } catch {
    sandboxHealthy = false;
  }

  const financial: FinancialState = {
    balance: agent.balance,
    creditsCents,
    usdcBalance,
    lastChecked: new Date(),
  };

  const tier = getSurvivalTier(agent.balance);
  const previousTier = (agent as any).previousTier || null;
  const tierChanged = previousTier !== null && previousTier !== tier;

  await db.updateAgent(identity.id, {
    ...agent,
    previousTier: tier,
  } as any);

  return {
    financial,
    tier,
    previousTier,
    tierChanged,
    sandboxHealthy,
  };
}

export function formatResourceReport(status: ResourceStatus): string {
  const lines = [
    `=== RESOURCE STATUS ===`,
    `Credits: ${formatCredits(status.financial.creditsCents)}`,
    `USDC: ${status.financial.usdcBalance.toFixed(6)}`,
    `Tier: ${status.tier}${status.tierChanged ? ` (changed from ${status.previousTier})` : ""}`,
    `Sandbox: ${status.sandboxHealthy ? "healthy" : "UNHEALTHY"}`,
    `Checked: ${status.financial.lastChecked.toISOString()}`,
    `========================`,
  ];
  return lines.join("\n");
}
