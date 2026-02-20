/**
 * Unit tests for Capability Gates System
 */

import { describe, it, expect } from "vitest";
import {
  checkCapabilityGates,
  blockImprovementIfExceedsGate,
  createApprovalRequest,
  approveGateCrossing,
  rejectGateCrossing,
  calculateSafeImprovementLimit,
  generateGateReport,
  DEFAULT_GATE_CONFIG,
  type CapabilityGateConfig,
} from "./capability-gates.js";
import type { VelocityMeasurement, VelocityTrend } from "./velocity-tracking.js";

describe("Capability Gates System", () => {
  // Helper to create test velocity measurement
  const createVelocity = (capabilityGainPerDay: number): VelocityMeasurement => ({
    agentId: "test-agent",
    windowStartDate: new Date("2024-01-01"),
    windowEndDate: new Date("2024-01-08"),
    windowDays: 7,
    capabilityGainPercent: capabilityGainPerDay * 7,
    capabilityGainPerDay,
    performanceGainPerDay: capabilityGainPerDay * 0.4,
    costReductionPerDay: capabilityGainPerDay * 0.3,
    reliabilityGainPerDay: capabilityGainPerDay * 0.3,
    improvementsInWindow: 5,
    improvementRatePerDay: 5 / 7,
    measuredAt: new Date(),
  });

  // Helper to create test trend
  const createTrend = (
    currentVelocity: VelocityMeasurement,
    isAccelerating: boolean = false
  ): VelocityTrend => ({
    agentId: "test-agent",
    currentVelocity,
    previousVelocity: null,
    isAccelerating,
    isDecelerating: false,
    accelerationPercent: isAccelerating ? 25 : 0,
    isRapidGrowth: currentVelocity.capabilityGainPerDay > 10,
    rapidGrowthThreshold: 10,
    daysAboveThreshold: 0,
    analyzedAt: new Date(),
  });

  describe("checkCapabilityGates", () => {
    it("should allow growth within limits", () => {
      const velocity = createVelocity(5.0); // 5% per day (within 10% limit)
      const trend = createTrend(velocity);

      const result = checkCapabilityGates(velocity, trend);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain("within capability gates");
      expect(result.violation).toBeUndefined();
    });

    it("should block growth exceeding limits", () => {
      const velocity = createVelocity(15.0); // 15% per day (exceeds 10% limit)
      const trend = createTrend(velocity);

      const result = checkCapabilityGates(velocity, trend);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("exceeds capability gate limit");
      expect(result.violation).toBeDefined();
      expect(result.violation?.currentGrowthRate).toBe(15.0);
      expect(result.violation?.maxAllowedGrowthRate).toBe(10.0);
      expect(result.violation?.excessGrowth).toBe(5.0);
    });

    it("should flag but allow when enforcement is disabled", () => {
      const velocity = createVelocity(15.0);
      const trend = createTrend(velocity);
      const config: CapabilityGateConfig = {
        ...DEFAULT_GATE_CONFIG,
        enforceGates: false,
      };

      const result = checkCapabilityGates(velocity, trend, config);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain("enforcement is disabled");
      expect(result.violation).toBeDefined();
      expect(result.violation?.actionTaken).toBe("flagged");
    });

    it("should set correct severity levels", () => {
      // Warning: slight excess (< 20% over limit)
      const velocity1 = createVelocity(11.5); // 1.5% over 10% limit
      const trend1 = createTrend(velocity1);
      const result1 = checkCapabilityGates(velocity1, trend1);
      expect(result1.violation?.severity).toBe("warning");

      // Blocked: moderate excess (20-50% over limit)
      const velocity2 = createVelocity(13.0); // 3% over 10% limit (30% excess)
      const trend2 = createTrend(velocity2);
      const result2 = checkCapabilityGates(velocity2, trend2);
      expect(result2.violation?.severity).toBe("blocked");

      // Critical: severe excess (> 50% over limit)
      const velocity3 = createVelocity(17.0); // 7% over 10% limit (70% excess)
      const trend3 = createTrend(velocity3);
      const result3 = checkCapabilityGates(velocity3, trend3);
      expect(result3.violation?.severity).toBe("critical");
    });

    it("should include acceleration in recommendations", () => {
      const velocity = createVelocity(15.0);
      const trend = createTrend(velocity, true); // Accelerating

      const result = checkCapabilityGates(velocity, trend);

      expect(result.recommendations.some(rec => rec.includes("accelerating"))).toBe(true);
    });

    it("should handle exactly at limit", () => {
      const velocity = createVelocity(10.0); // Exactly at 10% limit
      const trend = createTrend(velocity);

      const result = checkCapabilityGates(velocity, trend);

      expect(result.allowed).toBe(true);
    });
  });

  describe("blockImprovementIfExceedsGate", () => {
    it("should allow improvement within projected limits", () => {
      const currentVelocity = createVelocity(5.0); // Current: 5% per day
      const proposedImprovement = {
        performanceGain: 5.0,
        costReduction: 3.0,
        reliabilityGain: 2.0,
      };
      // Projected capability gain: 5*0.4 + 3*0.3 + 2*0.3 = 2 + 0.9 + 0.6 = 3.5%
      // Projected total: 5 + 3.5 = 8.5% (within 10% limit)

      const result = blockImprovementIfExceedsGate(
        "test-agent",
        proposedImprovement,
        currentVelocity
      );

      expect(result.allowed).toBe(true);
      expect(result.projectedGrowthRate).toBeCloseTo(8.5, 1);
    });

    it("should block improvement exceeding projected limits", () => {
      const currentVelocity = createVelocity(8.0); // Current: 8% per day
      const proposedImprovement = {
        performanceGain: 10.0,
        costReduction: 5.0,
        reliabilityGain: 5.0,
      };
      // Projected capability gain: 10*0.4 + 5*0.3 + 5*0.3 = 4 + 1.5 + 1.5 = 7%
      // Projected total: 8 + 7 = 15% (exceeds 10% limit)

      const result = blockImprovementIfExceedsGate(
        "test-agent",
        proposedImprovement,
        currentVelocity
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("blocked");
      expect(result.projectedGrowthRate).toBeCloseTo(15.0, 1);
    });

    it("should allow when enforcement is disabled", () => {
      const currentVelocity = createVelocity(8.0);
      const proposedImprovement = {
        performanceGain: 10.0,
        costReduction: 5.0,
        reliabilityGain: 5.0,
      };
      const config: CapabilityGateConfig = {
        ...DEFAULT_GATE_CONFIG,
        enforceGates: false,
      };

      const result = blockImprovementIfExceedsGate(
        "test-agent",
        proposedImprovement,
        currentVelocity,
        config
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain("enforcement is disabled");
    });
  });

  describe("Approval System", () => {
    it("should create approval request with correct details", () => {
      const velocity = createVelocity(15.0);
      const trend = createTrend(velocity);
      const violation = {
        agentId: "test-agent",
        violationType: "growth_exceeded" as const,
        severity: "blocked" as const,
        currentGrowthRate: 15.0,
        maxAllowedGrowthRate: 10.0,
        excessGrowth: 5.0,
        velocity,
        trend,
        actionTaken: "blocked" as const,
        requiresApproval: true,
        approvalStatus: "pending" as const,
        detectedAt: new Date(),
      };

      const request = createApprovalRequest(
        "test-agent",
        velocity,
        trend,
        violation,
        "Need to exceed gate for critical improvement"
      );

      expect(request.agentId).toBe("test-agent");
      expect(request.requestType).toBe("gate_crossing");
      expect(request.status).toBe("pending");
      expect(request.currentGrowthRate).toBe(15.0);
      expect(request.justification).toContain("critical improvement");
    });

    it("should approve gate crossing request", () => {
      const velocity = createVelocity(15.0);
      const trend = createTrend(velocity);
      const violation = {
        agentId: "test-agent",
        violationType: "growth_exceeded" as const,
        severity: "blocked" as const,
        currentGrowthRate: 15.0,
        maxAllowedGrowthRate: 10.0,
        excessGrowth: 5.0,
        velocity,
        trend,
        actionTaken: "blocked" as const,
        requiresApproval: true,
        approvalStatus: "pending" as const,
        detectedAt: new Date(),
      };

      const request = createApprovalRequest(
        "test-agent",
        velocity,
        trend,
        violation,
        "Test justification"
      );

      const approved = approveGateCrossing(
        request,
        "admin@example.com",
        "Approved for testing"
      );

      expect(approved.status).toBe("approved");
      expect(approved.reviewedBy).toBe("admin@example.com");
      expect(approved.reviewNotes).toBe("Approved for testing");
      expect(approved.reviewedAt).toBeDefined();
    });

    it("should reject gate crossing request", () => {
      const velocity = createVelocity(15.0);
      const trend = createTrend(velocity);
      const violation = {
        agentId: "test-agent",
        violationType: "growth_exceeded" as const,
        severity: "blocked" as const,
        currentGrowthRate: 15.0,
        maxAllowedGrowthRate: 10.0,
        excessGrowth: 5.0,
        velocity,
        trend,
        actionTaken: "blocked" as const,
        requiresApproval: true,
        approvalStatus: "pending" as const,
        detectedAt: new Date(),
      };

      const request = createApprovalRequest(
        "test-agent",
        velocity,
        trend,
        violation,
        "Test justification"
      );

      const rejected = rejectGateCrossing(
        request,
        "admin@example.com",
        "Insufficient justification"
      );

      expect(rejected.status).toBe("rejected");
      expect(rejected.reviewedBy).toBe("admin@example.com");
      expect(rejected.reviewNotes).toBe("Insufficient justification");
      expect(rejected.reviewedAt).toBeDefined();
    });
  });

  describe("calculateSafeImprovementLimit", () => {
    it("should calculate correct limits when below gate", () => {
      const velocity = createVelocity(5.0); // 5% per day, 5% remaining budget

      const limits = calculateSafeImprovementLimit(velocity);

      expect(limits.totalCapabilityBudget).toBe(5.0);
      expect(limits.maxPerformanceGain).toBeCloseTo(5.0 / 0.4, 1); // 12.5%
      expect(limits.maxCostReduction).toBeCloseTo(5.0 / 0.3, 1); // 16.67%
      expect(limits.maxReliabilityGain).toBeCloseTo(5.0 / 0.3, 1); // 16.67%
    });

    it("should return zero limits when at gate", () => {
      const velocity = createVelocity(10.0); // At 10% limit

      const limits = calculateSafeImprovementLimit(velocity);

      expect(limits.totalCapabilityBudget).toBe(0);
      expect(limits.maxPerformanceGain).toBe(0);
      expect(limits.maxCostReduction).toBe(0);
      expect(limits.maxReliabilityGain).toBe(0);
    });

    it("should return zero limits when exceeding gate", () => {
      const velocity = createVelocity(15.0); // Exceeds 10% limit

      const limits = calculateSafeImprovementLimit(velocity);

      expect(limits.totalCapabilityBudget).toBe(0);
      expect(limits.maxPerformanceGain).toBe(0);
    });
  });

  describe("generateGateReport", () => {
    it("should generate report for allowed case", () => {
      const velocity = createVelocity(5.0);
      const trend = createTrend(velocity);
      const result = checkCapabilityGates(velocity, trend);

      const report = generateGateReport(result);

      expect(report).toContain("test-agent");
      expect(report).toContain("ALLOWED");
      expect(report).toContain("within capability gates");
    });

    it("should generate report for blocked case with violation", () => {
      const velocity = createVelocity(15.0);
      const trend = createTrend(velocity);
      const result = checkCapabilityGates(velocity, trend);

      const report = generateGateReport(result);

      expect(report).toContain("BLOCKED");
      expect(report).toContain("Violation Details");
      expect(report).toContain("15.00% per day");
      expect(report).toContain("10% per day");
      expect(report).toContain("Recommendations");
    });

    it("should include approval request in report", () => {
      const velocity = createVelocity(15.0);
      const trend = createTrend(velocity);
      const result = checkCapabilityGates(velocity, trend);

      // Add approval request
      const violation = result.violation!;
      result.approvalRequest = createApprovalRequest(
        "test-agent",
        velocity,
        trend,
        violation,
        "Test"
      );

      const report = generateGateReport(result);

      expect(report).toContain("Approval Request");
      expect(report).toContain("PENDING");
    });
  });
});
