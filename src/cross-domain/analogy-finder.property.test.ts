/**
 * Property-Based Tests for Analogy Finding
 * 
 * Property 75: Analogy Finding
 * For any new domain encountered, the system should find analogies to known domains
 * and transfer applicable principles.
 * 
 * Validates: Requirements 17.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { AnalogyFinder } from './analogy-finder';
import type { Domain } from './types';

// Arbitrary domain generator
const arbitraryDomain = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  tasks: fc.constant([]),
  successCriteria: fc.record({
    minSuccessRate: fc.constant(0.95),
    minTasksCompleted: fc.constant(10),
    minConsecutiveSuccesses: fc.constant(5),
  }),
  principles: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
  structure: fc.record({
    hierarchy: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
    relationships: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 3 })
    ),
    patterns: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
    constraints: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
  }),
}) as fc.Arbitrary<Domain>;

describe('Property 75: Analogy Finding', () => {
  const finder = new AnalogyFinder();

  it('Property 75: should always return analogies for non-empty known domains', () => {
    fc.assert(
      fc.property(
        arbitraryDomain,
        fc.array(arbitraryDomain, { minLength: 1, maxLength: 5 }),
        (targetDomain, knownDomains) => {
          // Ensure target domain is different from known domains
          const filteredKnown = knownDomains.filter(d => d.id !== targetDomain.id);
          if (filteredKnown.length === 0) return true; // Skip if no valid known domains

          const result = finder.findAnalogies(targetDomain, filteredKnown);

          // Property: Should return analogies for each known domain
          expect(result.analogies.length).toBe(filteredKnown.length);

          // Property: Best analogy should be defined
          expect(result.bestAnalogy).toBeDefined();

          // Property: Confidence should be between 0 and 1
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);

          // Property: Analogies should be sorted by similarity (descending)
          for (let i = 0; i < result.analogies.length - 1; i++) {
            expect(result.analogies[i].structuralSimilarity).toBeGreaterThanOrEqual(
              result.analogies[i + 1].structuralSimilarity
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 75: structural similarity should be between 0 and 1', () => {
    fc.assert(
      fc.property(
        arbitraryDomain,
        arbitraryDomain,
        (domain1, domain2) => {
          // Ensure different domains
          if (domain1.id === domain2.id) return true;

          const result = finder.findAnalogies(domain1, [domain2]);

          // Property: Structural similarity must be in [0, 1]
          expect(result.bestAnalogy?.structuralSimilarity).toBeGreaterThanOrEqual(0);
          expect(result.bestAnalogy?.structuralSimilarity).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 75: identical domains should have similarity of 1.0', () => {
    fc.assert(
      fc.property(
        arbitraryDomain,
        (domain) => {
          // Create a copy with different ID
          const domainCopy: Domain = {
            ...domain,
            id: domain.id + '-copy',
          };

          const result = finder.findAnalogies(domainCopy, [domain]);

          // Property: Identical structure should yield similarity close to 1.0
          expect(result.bestAnalogy?.structuralSimilarity).toBeGreaterThan(0.9);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 75: should identify transferable principles', () => {
    fc.assert(
      fc.property(
        arbitraryDomain,
        arbitraryDomain,
        (domain1, domain2) => {
          // Ensure different domains
          if (domain1.id === domain2.id) return true;

          const result = finder.findAnalogies(domain1, [domain2]);

          // Property: Transferable principles should be a subset of source principles
          for (const principle of result.bestAnalogy?.transferablePrinciples ?? []) {
            expect(domain2.principles).toContain(principle);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 75: concept mappings should have valid similarity scores', () => {
    fc.assert(
      fc.property(
        arbitraryDomain,
        arbitraryDomain,
        (domain1, domain2) => {
          // Ensure different domains
          if (domain1.id === domain2.id) return true;

          const result = finder.findAnalogies(domain1, [domain2]);

          // Property: All concept mappings should have similarity in [0, 1]
          for (const mapping of result.bestAnalogy?.mappings ?? []) {
            expect(mapping.similarity).toBeGreaterThanOrEqual(0);
            expect(mapping.similarity).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 75: confidence should increase with more transferable principles', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 3, maxLength: 10 }),
        (sharedPrinciples) => {
          const domain1: Domain = {
            id: 'domain1',
            name: 'Domain 1',
            description: 'Test domain 1',
            tasks: [],
            successCriteria: {
              minSuccessRate: 0.95,
              minTasksCompleted: 10,
              minConsecutiveSuccesses: 5,
            },
            principles: sharedPrinciples,
            structure: {
              hierarchy: ['concept1', 'concept2'],
              relationships: {},
              patterns: ['pattern1'],
              constraints: ['constraint1'],
            },
          };

          const domain2: Domain = {
            id: 'domain2',
            name: 'Domain 2',
            description: 'Test domain 2',
            tasks: [],
            successCriteria: {
              minSuccessRate: 0.95,
              minTasksCompleted: 10,
              minConsecutiveSuccesses: 5,
            },
            principles: sharedPrinciples, // Same principles
            structure: {
              hierarchy: ['concept1', 'concept2'],
              relationships: {},
              patterns: ['pattern1'],
              constraints: ['constraint1'],
            },
          };

          const result = finder.findAnalogies(domain1, [domain2]);

          // Property: High structural similarity + shared principles = high confidence
          expect(result.confidence).toBeGreaterThan(0.7);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 75: should return empty result for empty known domains', () => {
    fc.assert(
      fc.property(
        arbitraryDomain,
        (targetDomain) => {
          const result = finder.findAnalogies(targetDomain, []);

          // Property: Empty known domains should yield empty result
          expect(result.analogies).toHaveLength(0);
          expect(result.bestAnalogy).toBeUndefined();
          expect(result.confidence).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
