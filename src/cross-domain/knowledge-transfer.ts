/**
 * Knowledge Transfer System
 * 
 * Enables agents to transfer knowledge from source domains to target domains
 * using analogies and measure transfer effectiveness.
 * 
 * Requirement 17.3: Transfer knowledge across domains and measure effectiveness
 */

import type {
  Domain,
  DomainAnalogy,
  KnowledgeTransfer,
  KnowledgeTransferResult,
  DomainMastery,
} from './types';
import { domainMasteryTracker } from './domain-mastery';
import { analogyFinder } from './analogy-finder';

/**
 * Manages knowledge transfer between domains
 */
export class KnowledgeTransferManager {
  private transfers: Map<string, KnowledgeTransfer> = new Map();

  /**
   * Transfer knowledge from source domain to target domain
   * 
   * @param agentId Agent performing the transfer
   * @param sourceDomainId Domain to transfer knowledge from
   * @param targetDomainId Domain to transfer knowledge to
   * @returns Result of the knowledge transfer
   */
  async transferKnowledge(
    agentId: string,
    sourceDomainId: string,
    targetDomainId: string
  ): Promise<KnowledgeTransferResult> {
    // Get domains
    const sourceDomain = domainMasteryTracker.getDomain(sourceDomainId);
    const targetDomain = domainMasteryTracker.getDomain(targetDomainId);

    if (!sourceDomain || !targetDomain) {
      throw new Error('Source or target domain not found');
    }

    // Check if agent has mastered source domain
    const hasMastered = domainMasteryTracker.hasMasteredDomain(agentId, sourceDomainId);
    if (!hasMastered) {
      throw new Error('Agent must master source domain before transferring knowledge');
    }

    // Find analogy between domains
    const analogyResult = analogyFinder.findAnalogies(targetDomain, [sourceDomain]);
    const analogy = analogyResult.bestAnalogy;

    if (!analogy) {
      throw new Error('No analogy found between domains');
    }

    // Get baseline performance in target domain
    const baselinePerformance = this.getBaselinePerformance(agentId, targetDomainId);

    // Create transfer record
    const transfer: KnowledgeTransfer = {
      id: `${agentId}:${sourceDomainId}:${targetDomainId}:${Date.now()}`,
      agentId,
      sourceDomainId,
      targetDomainId,
      analogy,
      transferDate: new Date(),
      effectiveness: 0, // Will be measured later
      principlesApplied: analogy.transferablePrinciples,
    };

    this.transfers.set(transfer.id, transfer);

    // Apply principles from source to target
    const lessonsLearned = this.applyPrinciples(
      sourceDomain,
      targetDomain,
      analogy
    );

    // Measure improvement (simulated - in real system would track actual performance)
    const improvementMeasured = this.measureImprovement(
      agentId,
      targetDomainId,
      baselinePerformance
    );

    // Update transfer effectiveness
    transfer.effectiveness = improvementMeasured;

    const success = improvementMeasured > 0;

    return {
      transfer,
      success,
      improvementMeasured,
      lessonsLearned,
    };
  }

  /**
   * Get baseline performance in target domain
   */
  private getBaselinePerformance(agentId: string, domainId: string): number {
    const mastery = domainMasteryTracker.getMastery(agentId, domainId);
    return mastery?.successRate ?? 0;
  }

  /**
   * Apply principles from source domain to target domain
   */
  private applyPrinciples(
    sourceDomain: Domain,
    targetDomain: Domain,
    analogy: DomainAnalogy
  ): string[] {
    const lessonsLearned: string[] = [];

    // For each transferable principle, create a lesson
    for (const principle of analogy.transferablePrinciples) {
      // Find concept mappings that relate to this principle
      const relevantMappings = analogy.mappings.filter(m =>
        principle.toLowerCase().includes(m.sourceConcept.toLowerCase()) ||
        principle.toLowerCase().includes(m.targetConcept.toLowerCase())
      );

      if (relevantMappings.length > 0) {
        const mapping = relevantMappings[0];
        lessonsLearned.push(
          `Apply "${principle}" from ${sourceDomain.name} to ${targetDomain.name}: ` +
          `"${mapping.sourceConcept}" in source maps to "${mapping.targetConcept}" in target`
        );
      } else {
        lessonsLearned.push(
          `Apply general principle "${principle}" from ${sourceDomain.name} to ${targetDomain.name}`
        );
      }
    }

    // Add lessons from structural similarities
    if (analogy.structuralSimilarity > 0.7) {
      lessonsLearned.push(
        `High structural similarity (${(analogy.structuralSimilarity * 100).toFixed(0)}%) ` +
        `suggests similar problem-solving approaches can be used`
      );
    }

    return lessonsLearned;
  }

  /**
   * Measure improvement in target domain after knowledge transfer
   * 
   * In a real system, this would track actual performance over time.
   * For now, we estimate based on analogy quality.
   */
  private measureImprovement(
    agentId: string,
    targetDomainId: string,
    baselinePerformance: number
  ): number {
    const currentMastery = domainMasteryTracker.getMastery(agentId, targetDomainId);
    const currentPerformance = currentMastery?.successRate ?? 0;

    // Calculate improvement
    const improvement = currentPerformance - baselinePerformance;

    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, improvement));
  }

  /**
   * Get transfer by ID
   */
  getTransfer(transferId: string): KnowledgeTransfer | undefined {
    return this.transfers.get(transferId);
  }

  /**
   * Get all transfers for an agent
   */
  getAgentTransfers(agentId: string): KnowledgeTransfer[] {
    return Array.from(this.transfers.values())
      .filter(t => t.agentId === agentId);
  }

  /**
   * Get transfers from a specific source domain
   */
  getTransfersFromDomain(agentId: string, sourceDomainId: string): KnowledgeTransfer[] {
    return this.getAgentTransfers(agentId)
      .filter(t => t.sourceDomainId === sourceDomainId);
  }

  /**
   * Get transfers to a specific target domain
   */
  getTransfersToDomain(agentId: string, targetDomainId: string): KnowledgeTransfer[] {
    return this.getAgentTransfers(agentId)
      .filter(t => t.targetDomainId === targetDomainId);
  }

  /**
   * Calculate average transfer effectiveness for an agent
   */
  getAverageEffectiveness(agentId: string): number {
    const transfers = this.getAgentTransfers(agentId);
    if (transfers.length === 0) return 0;

    const totalEffectiveness = transfers.reduce((sum, t) => sum + t.effectiveness, 0);
    return totalEffectiveness / transfers.length;
  }

  /**
   * Get most effective transfer for an agent
   */
  getMostEffectiveTransfer(agentId: string): KnowledgeTransfer | undefined {
    const transfers = this.getAgentTransfers(agentId);
    if (transfers.length === 0) return undefined;

    return transfers.reduce((best, current) =>
      current.effectiveness > best.effectiveness ? current : best
    );
  }

  /**
   * Clear all transfers (for testing)
   */
  clear(): void {
    this.transfers.clear();
  }
}

// Singleton instance
export const knowledgeTransferManager = new KnowledgeTransferManager();
