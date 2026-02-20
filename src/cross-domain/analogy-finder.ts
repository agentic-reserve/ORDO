/**
 * Analogy Finding System
 * 
 * Maps new domains to known domains by identifying structural similarities
 * and transferable principles.
 * 
 * Requirement 17.2: Find analogies to map new domains to known domains
 */

import type {
  Domain,
  DomainAnalogy,
  ConceptMapping,
  AnalogyFindingResult,
} from './types';

/**
 * Finds analogies between domains
 */
export class AnalogyFinder {
  /**
   * Find analogies between a target domain and a list of known domains
   * 
   * @param targetDomain The new domain to find analogies for
   * @param knownDomains List of domains the agent has experience with
   * @returns Analogies ranked by similarity
   */
  findAnalogies(
    targetDomain: Domain,
    knownDomains: Domain[]
  ): AnalogyFindingResult {
    const analogies: DomainAnalogy[] = [];

    for (const sourceDomain of knownDomains) {
      // Skip if same domain
      if (sourceDomain.id === targetDomain.id) continue;

      const analogy = this.computeAnalogy(sourceDomain, targetDomain);
      analogies.push(analogy);
    }

    // Sort by structural similarity (descending)
    analogies.sort((a, b) => b.structuralSimilarity - a.structuralSimilarity);

    const bestAnalogy = analogies.length > 0 ? analogies[0] : undefined;
    const confidence = bestAnalogy?.structuralSimilarity ?? 0;

    return {
      analogies,
      bestAnalogy,
      confidence,
    };
  }

  /**
   * Compute analogy between two domains
   */
  private computeAnalogy(
    sourceDomain: Domain,
    targetDomain: Domain
  ): DomainAnalogy {
    // Calculate structural similarity
    const structuralSimilarity = this.calculateStructuralSimilarity(
      sourceDomain.structure,
      targetDomain.structure
    );

    // Find transferable principles
    const transferablePrinciples = this.findTransferablePrinciples(
      sourceDomain.principles,
      targetDomain.principles
    );

    // Create concept mappings
    const mappings = this.createConceptMappings(
      sourceDomain.structure,
      targetDomain.structure
    );

    // Calculate confidence based on similarity and transferable principles
    const confidence = this.calculateConfidence(
      structuralSimilarity,
      transferablePrinciples.length,
      mappings.length
    );

    return {
      sourceDomainId: sourceDomain.id,
      targetDomainId: targetDomain.id,
      structuralSimilarity,
      transferablePrinciples,
      mappings,
      confidence,
    };
  }

  /**
   * Calculate structural similarity between two domain structures
   * 
   * Uses multiple metrics:
   * - Hierarchy similarity (common concepts in hierarchy)
   * - Relationship similarity (similar relationship patterns)
   * - Pattern similarity (common patterns)
   * - Constraint similarity (similar constraints)
   */
  private calculateStructuralSimilarity(
    source: Domain['structure'],
    target: Domain['structure']
  ): number {
    // Calculate hierarchy similarity
    const hierarchySimilarity = this.calculateSetSimilarity(
      source.hierarchy,
      target.hierarchy
    );

    // Calculate pattern similarity
    const patternSimilarity = this.calculateSetSimilarity(
      source.patterns,
      target.patterns
    );

    // Calculate constraint similarity
    const constraintSimilarity = this.calculateSetSimilarity(
      source.constraints,
      target.constraints
    );

    // Calculate relationship similarity
    const relationshipSimilarity = this.calculateRelationshipSimilarity(
      source.relationships,
      target.relationships
    );

    // Weighted average (hierarchy and relationships are more important)
    return (
      hierarchySimilarity * 0.3 +
      relationshipSimilarity * 0.3 +
      patternSimilarity * 0.2 +
      constraintSimilarity * 0.2
    );
  }

  /**
   * Calculate similarity between two sets using Jaccard index
   */
  private calculateSetSimilarity(set1: string[], set2: string[]): number {
    if (set1.length === 0 && set2.length === 0) return 1.0;
    if (set1.length === 0 || set2.length === 0) return 0.0;

    const s1 = new Set(set1.map(s => s.toLowerCase()));
    const s2 = new Set(set2.map(s => s.toLowerCase()));

    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate similarity between relationship structures
   */
  private calculateRelationshipSimilarity(
    rel1: Record<string, string[]>,
    rel2: Record<string, string[]>
  ): number {
    const keys1 = Object.keys(rel1);
    const keys2 = Object.keys(rel2);

    if (keys1.length === 0 && keys2.length === 0) return 1.0;
    if (keys1.length === 0 || keys2.length === 0) return 0.0;

    // Calculate key similarity
    const keySimilarity = this.calculateSetSimilarity(keys1, keys2);

    // Calculate value similarity for common keys
    const commonKeys = keys1.filter(k => keys2.includes(k));
    if (commonKeys.length === 0) return keySimilarity * 0.5;

    let valueSimilarity = 0;
    for (const key of commonKeys) {
      valueSimilarity += this.calculateSetSimilarity(rel1[key], rel2[key]);
    }
    valueSimilarity /= commonKeys.length;

    return (keySimilarity + valueSimilarity) / 2;
  }

  /**
   * Find principles that can be transferred between domains
   */
  private findTransferablePrinciples(
    sourcePrinciples: string[],
    targetPrinciples: string[]
  ): string[] {
    const transferable: string[] = [];

    // Principles are transferable if they appear in both domains
    // or if they are general enough to apply across domains
    for (const principle of sourcePrinciples) {
      const normalized = principle.toLowerCase();
      
      // Check if principle exists in target
      const existsInTarget = targetPrinciples.some(
        p => p.toLowerCase() === normalized
      );

      if (existsInTarget) {
        transferable.push(principle);
        continue;
      }

      // Check if principle is general (contains general terms)
      const generalTerms = [
        'optimize',
        'minimize',
        'maximize',
        'balance',
        'manage',
        'control',
        'adapt',
        'learn',
        'improve',
        'reduce',
        'increase',
      ];

      const isGeneral = generalTerms.some(term => normalized.includes(term));
      if (isGeneral) {
        transferable.push(principle);
      }
    }

    return transferable;
  }

  /**
   * Create concept mappings between domains
   */
  private createConceptMappings(
    source: Domain['structure'],
    target: Domain['structure']
  ): ConceptMapping[] {
    const mappings: ConceptMapping[] = [];

    // Map concepts from hierarchy
    for (const sourceConcept of source.hierarchy) {
      for (const targetConcept of target.hierarchy) {
        const similarity = this.calculateConceptSimilarity(
          sourceConcept,
          targetConcept
        );

        if (similarity > 0.5) {
          mappings.push({
            sourceConcept,
            targetConcept,
            similarity,
            rationale: `Hierarchical concepts with ${(similarity * 100).toFixed(0)}% similarity`,
          });
        }
      }
    }

    // Map concepts from relationships
    const sourceKeys = Object.keys(source.relationships);
    const targetKeys = Object.keys(target.relationships);

    for (const sourceKey of sourceKeys) {
      for (const targetKey of targetKeys) {
        const similarity = this.calculateConceptSimilarity(sourceKey, targetKey);

        if (similarity > 0.5) {
          mappings.push({
            sourceConcept: sourceKey,
            targetConcept: targetKey,
            similarity,
            rationale: `Relationship keys with ${(similarity * 100).toFixed(0)}% similarity`,
          });
        }
      }
    }

    // Sort by similarity (descending)
    mappings.sort((a, b) => b.similarity - a.similarity);

    // Remove duplicates
    const seen = new Set<string>();
    return mappings.filter(m => {
      const key = `${m.sourceConcept}:${m.targetConcept}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate similarity between two concepts
   * Uses simple string similarity (can be enhanced with NLP)
   */
  private calculateConceptSimilarity(concept1: string, concept2: string): number {
    const c1 = concept1.toLowerCase();
    const c2 = concept2.toLowerCase();

    // Exact match
    if (c1 === c2) return 1.0;

    // One contains the other
    if (c1.includes(c2) || c2.includes(c1)) return 0.8;

    // Calculate character-level similarity (Levenshtein-like)
    const maxLen = Math.max(c1.length, c2.length);
    const minLen = Math.min(c1.length, c2.length);

    // Simple overlap measure
    let overlap = 0;
    for (let i = 0; i < minLen; i++) {
      if (c1[i] === c2[i]) overlap++;
    }

    return overlap / maxLen;
  }

  /**
   * Calculate confidence in the analogy
   */
  private calculateConfidence(
    structuralSimilarity: number,
    numTransferablePrinciples: number,
    numMappings: number
  ): number {
    // Base confidence from structural similarity
    let confidence = structuralSimilarity * 0.6;

    // Boost from transferable principles (up to 0.2)
    const principleBoost = Math.min(numTransferablePrinciples * 0.05, 0.2);
    confidence += principleBoost;

    // Boost from concept mappings (up to 0.2)
    const mappingBoost = Math.min(numMappings * 0.02, 0.2);
    confidence += mappingBoost;

    return Math.min(confidence, 1.0);
  }
}

// Singleton instance
export const analogyFinder = new AnalogyFinder();
