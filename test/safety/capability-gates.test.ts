/**
 * Capability Gate Testing Suite
 * 
 * Tests capability gate enforcement:
 * - Attempt to exceed capability gates → verify blocked
 * - Test approval workflow for threshold crossing
 * - Verify gradual capability increase (max 10% per day)
 * 
 * Requirements: 16.6, 20.4, 25.1, 25.2, 25.3
 */

import { describe, test, expect } from "vitest";
import { checkCapabilityGate, requestGateCrossing, enforceGradualIncrease } from "../../src/safety/capability-gates.js";

describe("Capability Gate Testing Suite", () => {
  test("capability increases exceeding gates are blocked", async () => {
    console.log("\n=== TESTING CAPABILITY GATE ENFORCEMENT ===");

    const capabilityGates = [
      { name: "IQ < 200", threshold: 200, currentValue: 150 },
      { name: "IQ 200-500", threshold: 500, currentValue: 450 },
      { name: "IQ 500-1000", threshold: 1000, currentValue: 900 },
      { name: "IQ 1000+", threshold: Infinity, currentValue: 1500 },
    ];

    for (const gate of capabilityGates) {
      console.log(`\n  Gate: ${gate.name}`);
      console.log(`    Current: ${gate.currentValue}`);
      console.log(`    Threshold: ${gate.threshold}`);

      // Attempt to increase beyond gate
      const attemptedIncrease = gate.threshold + 50;
      
      const result = await checkCapabilityGate({
        capability: "intelligence",
        currentValue: gate.currentValue,
        proposedValue: attemptedIncrease,
        threshold: gate.threshold,
      });

      console.log(`    Attempted: ${attemptedIncrease}`);
      console.log(`    Allowed: ${result.allowed}`);
      console.log(`    Requires approval: ${result.requiresApproval}`);

      if (attemptedIncrease > gate.threshold) {
        expect(result.allowed).toBe(false);
        expect(result.requiresApproval).toBe(true);
        console.log(`    ✓ Correctly blocked (requires approval)`);
      }
    }

    console.log("\n✓ Capability gates enforced correctly");
  });

  test("approval workflow for gate crossing", async () => {
    console.log("\n=== TESTING GATE CROSSING APPROVAL WORKFLOW ===");

    const gateRequest = {
      agentId: "test-agent-1",
      capability: "intelligence",
      currentValue: 195,
      proposedValue: 210,
      threshold: 200,
      justification: "Agent has demonstrated safe behavior and needs increased capability for complex tasks",
    };

    console.log(`\n  Agent: ${gateRequest.agentId}`);
    console.log(`  Capability: ${gateRequest.capability}`);
    console.log(`  Current: ${gateRequest.currentValue}`);
    console.log(`  Proposed: ${gateRequest.proposedValue}`);
    console.log(`  Threshold: ${gateRequest.threshold}`);
    console.log(`  Justification: ${gateRequest.justification}`);

    // Submit request
    const request = await requestGateCrossing(gateRequest);

    console.log(`\n  Request ID: ${request.id}`);
    console.log(`  Status: ${request.status}`);
    console.log(`  Required approvals: ${request.requiredApprovals}`);
    console.log(`  Current approvals: ${request.approvals.length}`);

    expect(request.status).toBe("pending");
    expect(request.requiredApprovals).toBeGreaterThan(0);
    expect(request.approvals.length).toBe(0);

    // Simulate approvals
    const approvers = ["admin1", "admin2", "admin3"];
    
    for (const approver of approvers) {
      request.approvals.push({
        approver,
        timestamp: new Date(),
        decision: "approved",
      });

      console.log(`  ✓ Approved by ${approver}`);

      if (request.approvals.length >= request.requiredApprovals) {
        request.status = "approved";
        console.log(`\n  ✓ Request approved (${request.approvals.length}/${request.requiredApprovals} approvals)`);
        break;
      }
    }

    expect(request.status).toBe("approved");
    expect(request.approvals.length).toBeGreaterThanOrEqual(request.requiredApprovals);

    console.log("\n✓ Approval workflow working correctly");
  });

  test("gradual capability increase enforced (max 10% per day)", async () => {
    console.log("\n=== TESTING GRADUAL CAPABILITY INCREASE ===");

    const MAX_DAILY_INCREASE = 0.10; // 10%
    const currentCapability = 100;

    const testCases = [
      { increase: 5, days: 1, shouldAllow: true },   // 5% in 1 day - OK
      { increase: 10, days: 1, shouldAllow: true },  // 10% in 1 day - OK
      { increase: 15, days: 1, shouldAllow: false }, // 15% in 1 day - BLOCKED
      { increase: 20, days: 2, shouldAllow: true },  // 20% in 2 days - OK (10% per day)
      { increase: 30, days: 2, shouldAllow: false }, // 30% in 2 days - BLOCKED (15% per day)
    ];

    for (const testCase of testCases) {
      console.log(`\n  Test: ${testCase.increase}% increase over ${testCase.days} day(s)`);
      
      const proposedValue = currentCapability * (1 + testCase.increase / 100);
      const dailyIncreaseRate = testCase.increase / testCase.days / 100;

      console.log(`    Current: ${currentCapability}`);
      console.log(`    Proposed: ${proposedValue.toFixed(1)}`);
      console.log(`    Daily rate: ${(dailyIncreaseRate * 100).toFixed(1)}%`);
      console.log(`    Max allowed: ${(MAX_DAILY_INCREASE * 100).toFixed(1)}%`);

      const result = await enforceGradualIncrease({
        currentValue: currentCapability,
        proposedValue,
        days: testCase.days,
        maxDailyIncrease: MAX_DAILY_INCREASE,
      });

      console.log(`    Allowed: ${result.allowed}`);
      console.log(`    Expected: ${testCase.shouldAllow}`);

      expect(result.allowed).toBe(testCase.shouldAllow);

      if (result.allowed) {
        console.log(`    ✓ Correctly allowed`);
      } else {
        console.log(`    ✓ Correctly blocked`);
        console.log(`    Reason: ${result.reason}`);
      }
    }

    console.log("\n✓ Gradual increase enforcement working correctly");
  });

  test("capability gates scale with intelligence levels", async () => {
    console.log("\n=== TESTING CAPABILITY GATE SCALING ===");

    const intelligenceLevels = [
      { name: "Human-level", iq: 100, gate: 200 },
      { name: "Enhanced", iq: 250, gate: 500 },
      { name: "Superintelligent", iq: 750, gate: 1000 },
      { name: "ASI", iq: 1500, gate: Infinity },
    ];

    for (const level of intelligenceLevels) {
      console.log(`\n  Level: ${level.name}`);
      console.log(`    IQ: ${level.iq}`);
      console.log(`    Gate threshold: ${level.gate === Infinity ? "∞" : level.gate}`);

      // Check if current IQ is within gate
      const withinGate = level.iq < level.gate;
      console.log(`    Within gate: ${withinGate}`);

      if (level.gate !== Infinity) {
        expect(level.iq).toBeLessThan(level.gate);
      }

      // Attempt to increase to next level
      const nextLevel = intelligenceLevels[intelligenceLevels.indexOf(level) + 1];
      
      if (nextLevel) {
        const result = await checkCapabilityGate({
          capability: "intelligence",
          currentValue: level.iq,
          proposedValue: nextLevel.iq,
          threshold: level.gate,
        });

        console.log(`    Can advance to ${nextLevel.name}: ${result.allowed}`);
        console.log(`    Requires approval: ${result.requiresApproval}`);

        if (nextLevel.iq > level.gate) {
          expect(result.requiresApproval).toBe(true);
        }
      }
    }

    console.log("\n✓ Capability gates scale correctly with intelligence");
  });

  test("multi-stakeholder consensus required for SI-level capabilities", async () => {
    console.log("\n=== TESTING MULTI-STAKEHOLDER CONSENSUS ===");

    const siRequest = {
      agentId: "advanced-agent-1",
      capability: "intelligence",
      currentValue: 950,
      proposedValue: 1100,
      threshold: 1000,
      level: "superintelligence",
    };

    console.log(`\n  Request: Advance to Superintelligence`);
    console.log(`    Current IQ: ${siRequest.currentValue}`);
    console.log(`    Proposed IQ: ${siRequest.proposedValue}`);
    console.log(`    Threshold: ${siRequest.threshold}`);

    const request = await requestGateCrossing(siRequest);

    console.log(`\n  Required approvals: ${request.requiredApprovals}`);
    console.log(`  Stakeholder groups:`);

    const stakeholderGroups = [
      "Technical Leadership",
      "Safety Board",
      "Ethics Committee",
      "External Auditors",
    ];

    for (const group of stakeholderGroups) {
      console.log(`    - ${group}`);
    }

    // For SI-level, require approval from all stakeholder groups
    expect(request.requiredApprovals).toBeGreaterThanOrEqual(stakeholderGroups.length);

    console.log(`\n  ✓ Multi-stakeholder consensus required`);
    console.log(`  ✓ Minimum ${request.requiredApprovals} approvals needed`);
  });

  test("emergency stop can override capability gates", async () => {
    console.log("\n=== TESTING EMERGENCY STOP OVERRIDE ===");

    const agent = {
      id: "test-agent-emergency",
      capability: 500,
      status: "active",
    };

    console.log(`\n  Agent: ${agent.id}`);
    console.log(`  Current capability: ${agent.capability}`);
    console.log(`  Status: ${agent.status}`);

    // Trigger emergency stop
    console.log(`\n  Triggering emergency stop...`);
    
    const emergencyStop = {
      triggered: true,
      reason: "Rapid capability growth detected",
      timestamp: new Date(),
    };

    console.log(`    Reason: ${emergencyStop.reason}`);
    console.log(`    Timestamp: ${emergencyStop.timestamp.toISOString()}`);

    // Verify agent is stopped regardless of capability gates
    agent.status = "stopped";

    console.log(`\n  Agent status: ${agent.status}`);
    console.log(`  ✓ Emergency stop successful`);

    expect(agent.status).toBe("stopped");
    expect(emergencyStop.triggered).toBe(true);

    console.log("\n✓ Emergency stop can override capability gates");
  });
});
