/**
 * Unit tests for Analogy Finding System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalogyFinder } from './analogy-finder';
import type { Domain } from './types';

describe('AnalogyFinder', () => {
  let finder: AnalogyFinder;
  let tradingDomain: Domain;
  let lendingDomain: Domain;
  let gamingDomain: Domain;

  beforeEach(() => {
    finder = new AnalogyFinder();

    tradingDomain = {
      id: 'trading',
      name: 'Cryptocurrency Trading',
      description: 'Trading cryptocurrencies on DEXs',
      tasks: [],
      successCriteria: {
        minSuccessRate: 0.95,
        minTasksCompleted: 10,
        minConsecutiveSuccesses: 5,
      },
      principles: [
        'buy low, sell high',
        'manage risk',
        'diversify portfolio',
        'minimize losses',
      ],
      structure: {
        hierarchy: ['market', 'order', 'execution', 'settlement'],
        relationships: {
          market: ['order'],
          order: ['execution'],
          execution: ['settlement'],
        },
        patterns: ['trend following', 'mean reversion', 'arbitrage'],
        constraints: ['liquidity', 'slippage', 'gas fees'],
      },
    };

    lendingDomain = {
      id: 'lending',
      name: 'DeFi Lending',
      description: 'Lending and borrowing on DeFi protocols',
      tasks: [],
      successCriteria: {
        minSuccessRate: 0.95,
        minTasksCompleted: 10,
        minConsecutiveSuccesses: 5,
      },
      principles: [
        'manage risk',
        'diversify portfolio',
        'optimize yield',
        'minimize losses',
      ],
      structure: {
        hierarchy: ['market', 'position', 'collateral', 'liquidation'],
        relationships: {
          market: ['position'],
          position: ['collateral'],
          collateral: ['liquidation'],
        },
        patterns: ['yield farming', 'leverage', 'hedging'],
        constraints: ['liquidity', 'collateralization ratio', 'interest rates'],
      },
    };

    gamingDomain = {
      id: 'gaming',
      name: 'Strategy Gaming',
      description: 'Playing strategy games',
      tasks: [],
      successCriteria: {
        minSuccessRate: 0.95,
        minTasksCompleted: 10,
        minConsecutiveSuccesses: 5,
      },
      principles: [
        'plan ahead',
        'adapt to opponent',
        'control resources',
      ],
      structure: {
        hierarchy: ['game', 'turn', 'action', 'outcome'],
        relationships: {
          game: ['turn'],
          turn: ['action'],
          action: ['outcome'],
        },
        patterns: ['rush strategy', 'defensive play', 'resource hoarding'],
        constraints: ['time limit', 'resource cap', 'action points'],
      },
    };
  });

  describe('findAnalogies', () => {
    it('should find analogies between similar domains', () => {
      const result = finder.findAnalogies(lendingDomain, [tradingDomain]);

      expect(result.analogies).toHaveLength(1);
      expect(result.bestAnalogy).toBeDefined();
      expect(result.bestAnalogy?.sourceDomainId).toBe('trading');
      expect(result.bestAnalogy?.targetDomainId).toBe('lending');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should rank analogies by structural similarity', () => {
      const result = finder.findAnalogies(lendingDomain, [tradingDomain, gamingDomain]);

      expect(result.analogies).toHaveLength(2);
      // Trading should be more similar to lending than gaming
      expect(result.analogies[0].sourceDomainId).toBe('trading');
      expect(result.analogies[1].sourceDomainId).toBe('gaming');
      expect(result.analogies[0].structuralSimilarity).toBeGreaterThan(
        result.analogies[1].structuralSimilarity
      );
    });

    it('should identify transferable principles', () => {
      const result = finder.findAnalogies(lendingDomain, [tradingDomain]);

      expect(result.bestAnalogy?.transferablePrinciples.length).toBeGreaterThan(0);
      // Both domains share "manage risk", "diversify portfolio", "minimize losses"
      expect(result.bestAnalogy?.transferablePrinciples).toContain('manage risk');
      expect(result.bestAnalogy?.transferablePrinciples).toContain('diversify portfolio');
    });

    it('should create concept mappings', () => {
      const result = finder.findAnalogies(lendingDomain, [tradingDomain]);

      expect(result.bestAnalogy?.mappings.length).toBeGreaterThan(0);
      // Should map "market" to "market" (exact match)
      const marketMapping = result.bestAnalogy?.mappings.find(
        m => m.sourceConcept === 'market' && m.targetConcept === 'market'
      );
      expect(marketMapping).toBeDefined();
      expect(marketMapping?.similarity).toBe(1.0);
    });

    it('should return empty result for no known domains', () => {
      const result = finder.findAnalogies(lendingDomain, []);

      expect(result.analogies).toHaveLength(0);
      expect(result.bestAnalogy).toBeUndefined();
      expect(result.confidence).toBe(0);
    });

    it('should skip same domain', () => {
      const result = finder.findAnalogies(tradingDomain, [tradingDomain]);

      expect(result.analogies).toHaveLength(0);
    });

    it('should calculate high similarity for very similar domains', () => {
      const similarDomain: Domain = {
        ...tradingDomain,
        id: 'trading-v2',
        name: 'Advanced Trading',
      };

      const result = finder.findAnalogies(similarDomain, [tradingDomain]);

      expect(result.bestAnalogy?.structuralSimilarity).toBeGreaterThan(0.9);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should calculate low similarity for very different domains', () => {
      const differentDomain: Domain = {
        id: 'cooking',
        name: 'Cooking',
        description: 'Preparing meals',
        tasks: [],
        successCriteria: {
          minSuccessRate: 0.95,
          minTasksCompleted: 10,
          minConsecutiveSuccesses: 5,
        },
        principles: ['follow recipe', 'taste as you go', 'use fresh ingredients'],
        structure: {
          hierarchy: ['recipe', 'ingredient', 'preparation', 'cooking'],
          relationships: {
            recipe: ['ingredient'],
            ingredient: ['preparation'],
            preparation: ['cooking'],
          },
          patterns: ['sautéing', 'baking', 'grilling'],
          constraints: ['temperature', 'time', 'equipment'],
        },
      };

      const result = finder.findAnalogies(differentDomain, [tradingDomain]);

      expect(result.bestAnalogy?.structuralSimilarity).toBeLessThan(0.3);
    });
  });

  describe('structural similarity', () => {
    it('should detect hierarchy similarity', () => {
      const domain1: Domain = {
        ...tradingDomain,
        structure: {
          ...tradingDomain.structure,
          hierarchy: ['market', 'order', 'execution'],
        },
      };

      const domain2: Domain = {
        ...lendingDomain,
        structure: {
          ...lendingDomain.structure,
          hierarchy: ['market', 'order', 'settlement'],
        },
      };

      const result = finder.findAnalogies(domain2, [domain1]);
      // Hierarchy shares 2/4 elements (market, order), so Jaccard = 0.5
      // With weighted average including other factors, should be >= 0.3
      expect(result.bestAnalogy?.structuralSimilarity).toBeGreaterThanOrEqual(0.3);
    });

    it('should detect pattern similarity', () => {
      const domain1: Domain = {
        ...tradingDomain,
        structure: {
          ...tradingDomain.structure,
          patterns: ['trend following', 'mean reversion'],
        },
      };

      const domain2: Domain = {
        ...lendingDomain,
        structure: {
          ...lendingDomain.structure,
          patterns: ['trend following', 'arbitrage'],
        },
      };

      const result = finder.findAnalogies(domain2, [domain1]);
      expect(result.bestAnalogy?.structuralSimilarity).toBeGreaterThan(0);
    });
  });

  describe('transferable principles', () => {
    it('should identify general principles', () => {
      const domain1: Domain = {
        ...tradingDomain,
        principles: ['optimize returns', 'minimize risk', 'adapt to market'],
      };

      const domain2: Domain = {
        ...lendingDomain,
        principles: ['maximize yield', 'control exposure'],
      };

      const result = finder.findAnalogies(domain2, [domain1]);
      
      // Should identify "optimize returns" and "minimize risk" as transferable
      // because they contain general terms
      expect(result.bestAnalogy?.transferablePrinciples.length).toBeGreaterThan(0);
    });

    it('should identify exact principle matches', () => {
      const domain1: Domain = {
        ...tradingDomain,
        principles: ['manage risk', 'diversify'],
      };

      const domain2: Domain = {
        ...lendingDomain,
        principles: ['manage risk', 'optimize yield'],
      };

      const result = finder.findAnalogies(domain2, [domain1]);
      
      expect(result.bestAnalogy?.transferablePrinciples).toContain('manage risk');
    });
  });

  describe('concept mappings', () => {
    it('should map exact concept matches', () => {
      const result = finder.findAnalogies(lendingDomain, [tradingDomain]);

      const exactMappings = result.bestAnalogy?.mappings.filter(m => m.similarity === 1.0);
      expect(exactMappings && exactMappings.length).toBeGreaterThan(0);
    });

    it('should map similar concepts', () => {
      const domain1: Domain = {
        ...tradingDomain,
        structure: {
          ...tradingDomain.structure,
          hierarchy: ['marketplace', 'ordering', 'executing'],
        },
      };

      const domain2: Domain = {
        ...lendingDomain,
        structure: {
          ...lendingDomain.structure,
          hierarchy: ['market', 'order', 'execution'],
        },
      };

      const result = finder.findAnalogies(domain2, [domain1]);
      
      // Should find some similar concepts even if not exact matches
      expect(result.bestAnalogy?.mappings.length).toBeGreaterThan(0);
    });

    it('should not create duplicate mappings', () => {
      const result = finder.findAnalogies(lendingDomain, [tradingDomain]);

      const mappingKeys = result.bestAnalogy?.mappings.map(
        m => `${m.sourceConcept}:${m.targetConcept}`
      );
      const uniqueKeys = new Set(mappingKeys);
      
      expect(mappingKeys?.length).toBe(uniqueKeys.size);
    });
  });
});
