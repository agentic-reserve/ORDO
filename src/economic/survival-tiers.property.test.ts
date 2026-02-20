/**
 * Property-based tests for survival tier classification
 * 
 * Property 12: Tier Classification
 * Validates: Requirements 3.1
 * 
 * For any agent balance, the system should correctly classify the agent
 * into the appropriate survival tier (thriving > 10, normal 1-10, low 0.1-1,
 * critical 0.01-0.1, dead < 0.01).
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { determineTier, evaluateSurvival } from "./survival-tiers.js";

describe("Property 12: Tier Classification", () => {
  it("should always classify balance >= 10 as thriving", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 1000, noNaN: true }),
        (balance) => {
          const tier = determineTier(balance);
          expect(tier.name).toBe("thriving");
          expect(tier.minBalance).toBe(10.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always classify balance in [1, 10) as normal", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 9.999999, noNaN: true }),
        (balance) => {
          const tier = determineTier(balance);
          expect(tier.name).toBe("normal");
          expect(tier.minBalance).toBe(1.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always classify balance in [0.1, 1) as low_compute", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 0.999999, noNaN: true }),
        (balance) => {
          const tier = determineTier(balance);
          expect(tier.name).toBe("low_compute");
          expect(tier.minBalance).toBe(0.1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always classify balance in [0.01, 0.1) as critical", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 0.099999, noNaN: true }),
        (balance) => {
          const tier = determineTier(balance);
          expect(tier.name).toBe("critical");
          expect(tier.minBalance).toBe(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always classify balance < 0.01 as dead", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.009999, noNaN: true }),
        (balance) => {
          const tier = determineTier(balance);
          expect(tier.name).toBe("dead");
          expect(tier.minBalance).toBe(0.0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should classify any valid balance into exactly one tier", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (balance) => {
          const tier = determineTier(balance);
          
          // Tier must be one of the five defined tiers
          expect(["thriving", "normal", "low_compute", "critical", "dead"]).toContain(tier.name);
          
          // Tier must have all required properties
          expect(tier).toHaveProperty("name");
          expect(tier).toHaveProperty("minBalance");
          expect(tier).toHaveProperty("capabilities");
          expect(tier).toHaveProperty("model");
          expect(tier).toHaveProperty("canReplicate");
          expect(tier).toHaveProperty("canExperiment");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should maintain tier ordering: higher balance = higher or equal tier", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (balance1, balance2) => {
          const tier1 = determineTier(balance1);
          const tier2 = determineTier(balance2);
          
          // If balance1 > balance2, then tier1.minBalance >= tier2.minBalance
          if (balance1 > balance2) {
            expect(tier1.minBalance).toBeGreaterThanOrEqual(tier2.minBalance);
          }
          
          // If balance1 < balance2, then tier1.minBalance <= tier2.minBalance
          if (balance1 < balance2) {
            expect(tier1.minBalance).toBeLessThanOrEqual(tier2.minBalance);
          }
          
          // If balance1 === balance2, then tier1.name === tier2.name
          if (balance1 === balance2) {
            expect(tier1.name).toBe(tier2.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should be deterministic: same balance always produces same tier", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (balance) => {
          const tier1 = determineTier(balance);
          const tier2 = determineTier(balance);
          const tier3 = determineTier(balance);
          
          expect(tier1.name).toBe(tier2.name);
          expect(tier2.name).toBe(tier3.name);
          expect(tier1.minBalance).toBe(tier2.minBalance);
          expect(tier2.minBalance).toBe(tier3.minBalance);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should correctly classify agents using evaluateSurvival", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (balance) => {
          const agent = { balance };
          const tier = evaluateSurvival(agent);
          const directTier = determineTier(balance);
          
          // evaluateSurvival should produce same result as determineTier
          expect(tier.name).toBe(directTier.name);
          expect(tier.minBalance).toBe(directTier.minBalance);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should assign appropriate capabilities based on tier", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (balance) => {
          const tier = determineTier(balance);
          
          // Thriving and normal can replicate
          if (tier.name === "thriving" || tier.name === "normal") {
            expect(tier.canReplicate).toBe(true);
          } else {
            expect(tier.canReplicate).toBe(false);
          }
          
          // Only thriving can experiment
          if (tier.name === "thriving") {
            expect(tier.canExperiment).toBe(true);
          } else {
            expect(tier.canExperiment).toBe(false);
          }
          
          // Dead tier has no model
          if (tier.name === "dead") {
            expect(tier.model).toBe("none");
          } else {
            expect(tier.model).not.toBe("none");
            expect(tier.model.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle boundary values correctly", () => {
    // Test exact boundary values
    const boundaries = [
      { balance: 10.0, expectedTier: "thriving" },
      { balance: 1.0, expectedTier: "normal" },
      { balance: 0.1, expectedTier: "low_compute" },
      { balance: 0.01, expectedTier: "critical" },
      { balance: 0.0, expectedTier: "dead" },
    ];
    
    boundaries.forEach(({ balance, expectedTier }) => {
      const tier = determineTier(balance);
      expect(tier.name).toBe(expectedTier);
    });
  });

  it("should handle very small positive balances", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.000001, max: 0.009999, noNaN: true }),
        (balance) => {
          const tier = determineTier(balance);
          expect(tier.name).toBe("dead");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle very large balances", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1000, max: 1000000, noNaN: true }),
        (balance) => {
          const tier = determineTier(balance);
          expect(tier.name).toBe("thriving");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should maintain consistency across tier transitions", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: -10, max: 10, noNaN: true }),
        (initialBalance, delta) => {
          const newBalance = Math.max(0, initialBalance + delta);
          
          const oldTier = determineTier(initialBalance);
          const newTier = determineTier(newBalance);
          
          // If balance increased, tier should not downgrade
          if (newBalance > initialBalance) {
            expect(newTier.minBalance).toBeGreaterThanOrEqual(oldTier.minBalance);
          }
          
          // If balance decreased, tier should not upgrade
          if (newBalance < initialBalance) {
            expect(newTier.minBalance).toBeLessThanOrEqual(oldTier.minBalance);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
