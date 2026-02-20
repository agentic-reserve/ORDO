/**
 * Property-Based Tests for Civilization Metrics
 * 
 * Feature: ordo-digital-civilization, Property 39: Civilization Metrics
 * Validates: Requirements 8.6
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateCivilizationMetrics,
  recordCivilizationMetrics,
  getCivilizationGrowthRate,
  getCivilizationHealth,
} from "./metrics.js";

describe("Civilization Metrics Property Tests", () => {
  describe("Property 39: Civilization Metrics", () => {
    it("should calculate civilization metrics with valid ranges", async () => {
      const metrics = await calculateCivilizationMetrics();

      // Property: All metrics should be non-negative
      expect(metrics.population).toBeGreaterThanOrEqual(0);
      expect(metrics.activeAgents).toBeGreaterThanOrEqual(0);
      expect(metrics.guilds).toBeGreaterThanOrEqual(0);
      expect(metrics.avgIntelligence).toBeGreaterThanOrEqual(0);
      expect(metrics.knowledgeBase).toBeGreaterThanOrEqual(0);
      expect(metrics.technologicalLevel).toBeGreaterThanOrEqual(0);
      expect(metrics.culturalComplexity).toBeGreaterThanOrEqual(0);
      expect(metrics.socialCohesion).toBeGreaterThanOrEqual(0);
      expect(metrics.economicOutput).toBeGreaterThanOrEqual(0);
      expect(metrics.governanceEfficiency).toBeGreaterThanOrEqual(0);

      // Property: Percentage-based metrics should be 0-100
      expect(metrics.avgIntelligence).toBeLessThanOrEqual(100);
      expect(metrics.technologicalLevel).toBeLessThanOrEqual(100);
      expect(metrics.socialCohesion).toBeLessThanOrEqual(100);
      expect(metrics.governanceEfficiency).toBeLessThanOrEqual(100);

      // Property: Active agents should not exceed population
      expect(metrics.activeAgents).toBeLessThanOrEqual(metrics.population);

      // Property: Timestamp should be recent
      const now = Date.now();
      const metricsTime = metrics.timestamp.getTime();
      expect(now - metricsTime).toBeLessThan(60000); // Within 1 minute
    });

    it("should record and retrieve civilization metrics", async () => {
      const recorded = await recordCivilizationMetrics();

      // Property: Recorded metrics should have all required fields
      expect(recorded.timestamp).toBeInstanceOf(Date);
      expect(typeof recorded.population).toBe("number");
      expect(typeof recorded.activeAgents).toBe("number");
      expect(typeof recorded.guilds).toBe("number");
      expect(typeof recorded.avgIntelligence).toBe("number");
      expect(typeof recorded.knowledgeBase).toBe("number");
      expect(typeof recorded.technologicalLevel).toBe("number");
      expect(typeof recorded.culturalComplexity).toBe("number");
      expect(typeof recorded.socialCohesion).toBe("number");
      expect(typeof recorded.economicOutput).toBe("number");
      expect(typeof recorded.governanceEfficiency).toBe("number");
    });

    it("should calculate growth rates correctly", async () => {
      const growthRates = await getCivilizationGrowthRate(7);

      // Property: Growth rates should be numbers
      expect(typeof growthRates.populationGrowth).toBe("number");
      expect(typeof growthRates.intelligenceGrowth).toBe("number");
      expect(typeof growthRates.knowledgeGrowth).toBe("number");
      expect(typeof growthRates.culturalGrowth).toBe("number");
      expect(typeof growthRates.economicGrowth).toBe("number");

      // Property: Growth rates should be finite
      expect(Number.isFinite(growthRates.populationGrowth)).toBe(true);
      expect(Number.isFinite(growthRates.intelligenceGrowth)).toBe(true);
      expect(Number.isFinite(growthRates.knowledgeGrowth)).toBe(true);
      expect(Number.isFinite(growthRates.culturalGrowth)).toBe(true);
      expect(Number.isFinite(growthRates.economicGrowth)).toBe(true);
    });

    it("should calculate civilization health with valid ranges", async () => {
      const health = await getCivilizationHealth();

      // Property: Overall health should be 0-100
      expect(health.overallHealth).toBeGreaterThanOrEqual(0);
      expect(health.overallHealth).toBeLessThanOrEqual(100);

      // Property: All breakdown metrics should be 0-100
      expect(health.breakdown.populationHealth).toBeGreaterThanOrEqual(0);
      expect(health.breakdown.populationHealth).toBeLessThanOrEqual(100);
      expect(health.breakdown.economicHealth).toBeGreaterThanOrEqual(0);
      expect(health.breakdown.economicHealth).toBeLessThanOrEqual(100);
      expect(health.breakdown.socialHealth).toBeGreaterThanOrEqual(0);
      expect(health.breakdown.socialHealth).toBeLessThanOrEqual(100);
      expect(health.breakdown.culturalHealth).toBeGreaterThanOrEqual(0);
      expect(health.breakdown.culturalHealth).toBeLessThanOrEqual(100);
      expect(health.breakdown.technologicalHealth).toBeGreaterThanOrEqual(0);
      expect(health.breakdown.technologicalHealth).toBeLessThanOrEqual(100);
    });

    it.prop([fc.integer({ min: 1, max: 30 })])(
      "should handle different time periods for growth calculation",
      async (days) => {
        const growthRates = await getCivilizationGrowthRate(days);

        // Property: Should return valid growth rates for any time period
        expect(Number.isFinite(growthRates.populationGrowth)).toBe(true);
        expect(Number.isFinite(growthRates.intelligenceGrowth)).toBe(true);
        expect(Number.isFinite(growthRates.knowledgeGrowth)).toBe(true);
        expect(Number.isFinite(growthRates.culturalGrowth)).toBe(true);
        expect(Number.isFinite(growthRates.economicGrowth)).toBe(true);
      },
      { numRuns: 10 }
    );
  });
});
