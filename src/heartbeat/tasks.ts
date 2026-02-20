/**
 * Built-in Heartbeat Tasks
 *
 * These tasks run on the heartbeat schedule for autonomous agent operations.
 * They execute without user prompts to maintain agent health and operations.
 *
 * Requirements: 14.2, 14.4, 14.6
 */

import type { Agent, OrdoDatabase } from "../types/database.js";

export interface HeartbeatTaskContext {
  agent: Agent;
  db: OrdoDatabase;
  params?: Record<string, any>;
}

export type HeartbeatTaskFn = (ctx: HeartbeatTaskContext) => Promise<void>;

/**
 * Registry of built-in heartbeat tasks.
 */
export const BUILTIN_TASKS: Record<string, HeartbeatTaskFn> = {
  /**
   * Health check - verify agent is operational
   */
  health_check: async (ctx) => {
    const { agent, db } = ctx;
    
    // Check agent status
    if (agent.status !== "alive") {
      console.warn(`[HEARTBEAT] Agent ${agent.id} is not alive`);
      return;
    }

    // Check balance
    if (agent.balance < 0.01) {
      console.warn(`[HEARTBEAT] Agent ${agent.id} has critical balance: ${agent.balance}`);
    }

    // Update last health check timestamp
    await db.updateAgent(agent.id, {
      traits: {
        ...agent.traits,
        lastHealthCheck: new Date().toISOString(),
      },
    });
  },

  /**
   * Metrics report - generate and store agent metrics
   */
  metrics_report: async (ctx) => {
    const { agent, db } = ctx;
    
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Calculate metrics
    const costs = await db.getInferenceCosts(agent.id, dayAgo, now);
    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
    const avgLatency = await db.getAverageLatency(agent.id, dayAgo, now);
    const successRate = await db.getSuccessRate(agent.id, dayAgo, now);

    // Store metrics
    await db.updateAgent(agent.id, {
      traits: {
        ...agent.traits,
        lastMetricsReport: {
          timestamp: now.toISOString(),
          totalCost,
          avgLatency,
          successRate,
        },
      },
    });
  },

  /**
   * Evolution check - check if agent is ready for replication
   */
  evolution_check: async (ctx) => {
    const { agent, db } = ctx;
    
    // Check replication eligibility
    const canReplicate = agent.balance > 10.0 && agent.age > 30;
    
    if (canReplicate && !agent.traits.replicationReady) {
      console.log(`[HEARTBEAT] Agent ${agent.id} is ready for replication`);
      await db.updateAgent(agent.id, {
        traits: {
          ...agent.traits,
          replicationReady: true,
          replicationReadyAt: new Date().toISOString(),
        },
      });
    }
  },

  /**
   * Balance check - monitor agent balance and alert if low
   */
  balance_check: async (ctx) => {
    const { agent, db } = ctx;
    
    const tier = agent.balance >= 10 ? "thriving" :
                 agent.balance >= 1 ? "normal" :
                 agent.balance >= 0.1 ? "low" :
                 agent.balance >= 0.01 ? "critical" : "dead";

    const prevTier = agent.traits.survivalTier;
    
    if (prevTier && prevTier !== tier && (tier === "critical" || tier === "dead")) {
      console.warn(`[HEARTBEAT] Agent ${agent.id} balance dropped to ${tier}: ${agent.balance} SOL`);
    }

    await db.updateAgent(agent.id, {
      traits: {
        ...agent.traits,
        survivalTier: tier,
        lastBalanceCheck: new Date().toISOString(),
      },
    });
  },

  /**
   * Age update - increment agent age
   */
  age_update: async (ctx) => {
    const { agent, db } = ctx;
    
    const ageInDays = Math.floor(
      (Date.now() - agent.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );

    await db.updateAgent(agent.id, {
      age: ageInDays,
    });
  },
};
