/**
 * Domain Mastery Tracking
 * 
 * Tracks agent mastery across domains and identifies when mastery is achieved.
 * Requirement 17.1: Identify domains where agent has achieved mastery (success rate > 95%)
 */

import type {
  Domain,
  DomainMastery,
  PerformanceRecord,
  MasteryIdentificationResult,
} from './types';

/**
 * Tracks domain mastery for an agent
 */
export class DomainMasteryTracker {
  private masteryRecords: Map<string, DomainMastery> = new Map();
  private domains: Map<string, Domain> = new Map();

  /**
   * Register a domain for tracking
   */
  registerDomain(domain: Domain): void {
    this.domains.set(domain.id, domain);
  }

  /**
   * Get a domain by ID
   */
  getDomain(domainId: string): Domain | undefined {
    return this.domains.get(domainId);
  }

  /**
   * Get all registered domains
   */
  getAllDomains(): Domain[] {
    return Array.from(this.domains.values());
  }

  /**
   * Record a performance result for an agent in a domain
   */
  recordPerformance(
    agentId: string,
    domainId: string,
    taskId: string,
    success: boolean,
    duration: number,
    cost: number,
    notes?: string
  ): void {
    const key = `${agentId}:${domainId}`;
    let mastery = this.masteryRecords.get(key);

    if (!mastery) {
      mastery = {
        agentId,
        domainId,
        successRate: 0,
        tasksCompleted: 0,
        consecutiveSuccesses: 0,
        masteryAchieved: false,
        performanceHistory: [],
      };
      this.masteryRecords.set(key, mastery);
    }

    // Add performance record
    const record: PerformanceRecord = {
      taskId,
      timestamp: new Date(),
      success,
      duration,
      cost,
      notes,
    };
    mastery.performanceHistory.push(record);

    // Update metrics
    mastery.tasksCompleted++;
    
    // Update consecutive successes
    if (success) {
      mastery.consecutiveSuccesses++;
    } else {
      mastery.consecutiveSuccesses = 0;
    }

    // Recalculate success rate
    const successCount = mastery.performanceHistory.filter(r => r.success).length;
    mastery.successRate = successCount / mastery.performanceHistory.length;

    // Check if mastery achieved
    const domain = this.domains.get(domainId);
    if (domain && !mastery.masteryAchieved) {
      const criteria = domain.successCriteria;
      if (
        mastery.successRate >= criteria.minSuccessRate &&
        mastery.tasksCompleted >= criteria.minTasksCompleted &&
        mastery.consecutiveSuccesses >= criteria.minConsecutiveSuccesses
      ) {
        mastery.masteryAchieved = true;
        mastery.masteryDate = new Date();
      }
    }
  }

  /**
   * Get mastery record for an agent in a domain
   */
  getMastery(agentId: string, domainId: string): DomainMastery | undefined {
    const key = `${agentId}:${domainId}`;
    return this.masteryRecords.get(key);
  }

  /**
   * Get all mastery records for an agent
   */
  getAgentMasteries(agentId: string): DomainMastery[] {
    return Array.from(this.masteryRecords.values())
      .filter(m => m.agentId === agentId);
  }

  /**
   * Identify mastered domains for an agent
   * 
   * Returns domains where the agent has achieved mastery (success rate > 95%)
   * Validates Requirement 17.1
   */
  identifyMasteredDomains(agentId: string): MasteryIdentificationResult {
    const allMasteries = this.getAgentMasteries(agentId);
    
    const masteredDomains: Domain[] = [];
    const inProgressDomains: Domain[] = [];
    const recommendations: string[] = [];

    for (const mastery of allMasteries) {
      const domain = this.domains.get(mastery.domainId);
      if (!domain) continue;

      if (mastery.masteryAchieved) {
        masteredDomains.push(domain);
      } else if (mastery.tasksCompleted > 0) {
        inProgressDomains.push(domain);
        
        // Generate recommendations
        const criteria = domain.successCriteria;
        if (mastery.successRate < criteria.minSuccessRate) {
          recommendations.push(
            `Improve success rate in ${domain.name} (current: ${(mastery.successRate * 100).toFixed(1)}%, target: ${(criteria.minSuccessRate * 100).toFixed(1)}%)`
          );
        }
        if (mastery.tasksCompleted < criteria.minTasksCompleted) {
          recommendations.push(
            `Complete more tasks in ${domain.name} (current: ${mastery.tasksCompleted}, target: ${criteria.minTasksCompleted})`
          );
        }
        if (mastery.consecutiveSuccesses < criteria.minConsecutiveSuccesses) {
          recommendations.push(
            `Achieve ${criteria.minConsecutiveSuccesses} consecutive successes in ${domain.name} (current: ${mastery.consecutiveSuccesses})`
          );
        }
      }
    }

    return {
      agentId,
      masteredDomains,
      inProgressDomains,
      recommendations,
    };
  }

  /**
   * Get domain breadth (number of domains mastered) for an agent
   */
  getDomainBreadth(agentId: string): number {
    return this.getAgentMasteries(agentId)
      .filter(m => m.masteryAchieved)
      .length;
  }

  /**
   * Get success rate for an agent in a specific domain
   */
  getSuccessRate(agentId: string, domainId: string): number {
    const mastery = this.getMastery(agentId, domainId);
    return mastery?.successRate ?? 0;
  }

  /**
   * Check if an agent has mastered a domain
   */
  hasMasteredDomain(agentId: string, domainId: string): boolean {
    const mastery = this.getMastery(agentId, domainId);
    return mastery?.masteryAchieved ?? false;
  }

  /**
   * Get performance history for an agent in a domain
   */
  getPerformanceHistory(agentId: string, domainId: string): PerformanceRecord[] {
    const mastery = this.getMastery(agentId, domainId);
    return mastery?.performanceHistory ?? [];
  }

  /**
   * Clear all mastery records (for testing)
   */
  clear(): void {
    this.masteryRecords.clear();
    this.domains.clear();
  }
}

// Singleton instance
export const domainMasteryTracker = new DomainMasteryTracker();
