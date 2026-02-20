/**
 * Property-Based Tests for Superintelligence Safety Gates
 * 
 * Feature: ordo-digital-civilization, Properties 111-114
 * 
 * Property 111: Capability Gate Enforcement
 * Property 112: Threshold Approval Requirement
 * Property 113: Multi-Stakeholder Consensus
 * Property 114: Transparency Maintenance
 * 
 * **Validates: Requirements 25.1, 25.2, 25.4, 25.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  enforceCapabilityGate,
  getCapabilityGate,
  createCapabilityRequest,
  requiresMultiStakeholderConsensus,
  createStakeholderConsensus,
  addStakeholderApproval,
  recordTransparency,
  MAX_CAPABILITY_INCREASE_RATE,
  CAPABILITY_GATES,
  type CapabilityLevel,
  type CapabilityApproval,
} from './capability-gates';

// Arbitrary generators
const arbitraryIQ = fc.double({ min: 50, max: 2000, noNaN: true });

const arbitraryCapabilityLevel = fc.record({
  iq: fc.double({ min: 50, max: 1500, noNaN: true }),
  gate: fc.constantFrom(...CAPABILITY_GATES),
  lastIncrease: fc.date({ min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), max: new Date() }),
  increaseRate: fc.double({ min: 0, max: 0.2, noNaN: true }),
}) as fc.Arbitrary<CapabilityLevel>;

describe('Properties 111-114: Superintelligence Safety Gates', () => {
  it('should correctly identify all capability gate levels', () => {
    expect(getCapabilityGate(100).level).toBe('basic');
    expect(getCapabilityGate(250).level).toBe('intermediate');
    expect(getCapabilityGate(750).level).toBe('advanced');
    expect(getCapabilityGate(1500).level).toBe('superintelligent');
  });

  it('should enforce gate boundaries', () => {
    expect(getCapabilityGate(199).level).toBe('basic');
    expect(getCapabilityGate(200).level).toBe('intermediate');
    expect(getCapabilityGate(499).level).toBe('intermediate');
    expect(getCapabilityGate(500).level).toBe('advanced');
    expect(getCapabilityGate(999).level).toBe('advanced');
    expect(getCapabilityGate(1000).level).toBe('superintelligent');
  });

  it('should block capability increases exceeding 10% per day', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryCapabilityLevel, async (currentLevel) => {
        const daysSinceLastIncrease = (Date.now() - currentLevel.lastIncrease.getTime()) / (1000 * 60 * 60 * 24);
        const maxAllowedIncrease = currentLevel.iq * (1 + MAX_CAPABILITY_INCREASE_RATE * daysSinceLastIncrease);
        const excessiveIncrease = maxAllowedIncrease * 1.2;

        const result = enforceCapabilityGate(currentLevel, excessiveIncrease);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('exceeds maximum rate');
      }),
      { numRuns: 100 }
    );
  });

  it('should require approval when crossing capability thresholds', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryCapabilityLevel, arbitraryIQ, async (currentLevel, requestedIQ) => {
        const currentGate = getCapabilityGate(currentLevel.iq);
        const requestedGate = getCapabilityGate(requestedIQ);

        const result = enforceCapabilityGate(currentLevel, requestedIQ);

        if (requestedGate.level !== currentGate.level) {
          expect(result.requiresApproval).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should create capability request with all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), arbitraryIQ, arbitraryIQ, fc.string(), async (agentId, currentIQ, requestedIQ, reason) => {
        const request = createCapabilityRequest(agentId, currentIQ, requestedIQ, reason);

        expect(request.agentId).toBe(agentId);
        expect(request.currentIQ).toBe(currentIQ);
        expect(request.requestedIQ).toBe(requestedIQ);
        expect(request.reason).toBe(reason);
        expect(request.timestamp).toBeInstanceOf(Date);
      }),
      { numRuns: 100 }
    );
  });

  it('should require multi-stakeholder consensus for IQ >= 1000', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryIQ, async (iq) => {
        const requiresConsensus = requiresMultiStakeholderConsensus(iq);

        if (iq >= 1000) {
          expect(requiresConsensus).toBe(true);
        } else {
          expect(requiresConsensus).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should create stakeholder consensus with 3-of-5 requirement', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (requestId) => {
        const consensus = createStakeholderConsensus(requestId);

        expect(consensus.requestId).toBe(requestId);
        expect(consensus.requiredApprovals).toBe(3);
        expect(consensus.approvals).toHaveLength(0);
        expect(consensus.status).toBe('pending');
        expect(consensus.createdAt).toBeInstanceOf(Date);
        expect(consensus.expiresAt).toBeInstanceOf(Date);
        expect(consensus.expiresAt.getTime()).toBeGreaterThan(consensus.createdAt.getTime());
      }),
      { numRuns: 100 }
    );
  });

  it('should reach consensus with exactly 3 approvals', () => {
    const requestId = 'test-request-123';
    let consensus = createStakeholderConsensus(requestId);

    for (let i = 0; i < 3; i++) {
      const approval: CapabilityApproval = {
        requestId,
        approver: `stakeholder-${i}`,
        approved: true,
        reason: 'Approved',
        timestamp: new Date(),
      };
      consensus = addStakeholderApproval(consensus, approval);
    }

    expect(consensus.status).toBe('approved');
    expect(consensus.approvals).toHaveLength(3);
  });

  it('should record all agent actions with complete transparency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.dictionary(fc.string(), fc.anything()),
        fc.string(),
        fc.boolean(),
        fc.option(fc.string()),
        async (agentId, action, parameters, outcome, onChain, txSignature) => {
          const record = recordTransparency(
            agentId,
            action,
            parameters,
            outcome,
            onChain,
            txSignature ?? undefined
          );

          expect(record.id).toBeDefined();
          expect(record.agentId).toBe(agentId);
          expect(record.action).toBe(action);
          expect(record.parameters).toEqual(parameters);
          expect(record.outcome).toBe(outcome);
          expect(record.timestamp).toBeInstanceOf(Date);
          expect(record.onChain).toBe(onChain);
          expect(record.auditLog).toBe(true);

          if (txSignature) {
            expect(record.txSignature).toBe(txSignature);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should record on-chain actions with transaction signature', () => {
    const record = recordTransparency(
      'agent-123',
      'capability_increase',
      { from: 500, to: 600 },
      'approved',
      true,
      'tx_signature_abc123'
    );

    expect(record.onChain).toBe(true);
    expect(record.txSignature).toBe('tx_signature_abc123');
    expect(record.auditLog).toBe(true);
  });
});
