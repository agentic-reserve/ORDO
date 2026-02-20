import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import {
  ZombieResourceEliminator,
  createZombieResourceEliminator,
  Resource,
} from './zombie-resource-eliminator';

/**
 * Property-Based Tests for Zombie Resource Elimination
 * 
 * Feature: ordo-digital-civilization, Property 105: Zombie Resource Elimination
 * **Validates: Requirements 23.2**
 * 
 * Property: For any resource unused for > 24 hours, the system should identify it as zombie
 * and eliminate it to reduce costs.
 */

// Generators for property-based testing

const resourceTypeArb = fc.constantFrom('compute', 'storage', 'network', 'database');

const zombieResourceArb = fc.record({
  id: fc.uuid(),
  type: resourceTypeArb,
  name: fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
  costPerHour: fc.double({ min: 0.01, max: 10, noNaN: true }),
  // Zombie: last used > 24 hours ago
  lastUsed: fc.date({
    min: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    max: new Date(Date.now() - 25 * 60 * 60 * 1000),
  }).filter(d => !isNaN(d.getTime())),
});

const activeResourceArb = fc.record({
  id: fc.uuid(),
  type: resourceTypeArb,
  name: fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
  costPerHour: fc.double({ min: 0.01, max: 10, noNaN: true }),
  // Active: last used < 24 hours ago
  lastUsed: fc.date({
    min: new Date(Date.now() - 23 * 60 * 60 * 1000),
    max: new Date(),
  }).filter(d => !isNaN(d.getTime())),
});

const resourceArb = fc.record({
  id: fc.uuid(),
  type: resourceTypeArb,
  name: fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
  costPerHour: fc.double({ min: 0.01, max: 10, noNaN: true }),
  lastUsed: fc.date({ min: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), max: new Date() }).filter(d => !isNaN(d.getTime())),
});

describe('Property 105: Zombie Resource Elimination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test.prop([fc.array(zombieResourceArb, { minLength: 1, maxLength: 20 })])(
    'should identify all resources unused for > 24 hours as zombies',
    (zombieResources) => {
      const eliminator = createZombieResourceEliminator();
      
      // Make IDs unique
      const uniqueResources = zombieResources.map((r, i) => ({ ...r, id: `${r.id}-${i}` }));
      
      // Register all zombie resources
      for (const resource of uniqueResources) {
        eliminator.registerResource(resource);
      }

      // Detect zombies
      const detectedZombies = eliminator.detectZombies();

      // All registered resources should be detected as zombies
      expect(detectedZombies.length).toBe(uniqueResources.length);

      // All detected zombies should have status 'zombie'
      for (const zombie of detectedZombies) {
        expect(zombie.status).toBe('zombie');
      }
    }
  );

  test.prop([fc.array(activeResourceArb, { minLength: 1, maxLength: 20 })])(
    'should not identify resources used within 24 hours as zombies',
    (activeResources) => {
      const eliminator = createZombieResourceEliminator();
      const uniqueResources = activeResources.map((r, i) => ({ ...r, id: `${r.id}-${i}` }));
      
      // Register all active resources
      for (const resource of uniqueResources) {
        eliminator.registerResource(resource);
      }

      // Detect zombies
      const detectedZombies = eliminator.detectZombies();

      // No resources should be detected as zombies
      expect(detectedZombies.length).toBe(0);
    }
  );

  test.prop([
    fc.array(zombieResourceArb, { minLength: 1, maxLength: 10 }),
    fc.array(activeResourceArb, { minLength: 1, maxLength: 10 }),
  ])(
    'should correctly distinguish between zombie and active resources',
    (zombieResources, activeResources) => {
      const eliminator = createZombieResourceEliminator();
      const uniqueZombies = zombieResources.map((r, i) => ({ ...r, id: `zombie-${r.id}-${i}` }));
      const uniqueActives = activeResources.map((r, i) => ({ ...r, id: `active-${r.id}-${i}` }));
      
      // Register both zombie and active resources
      for (const resource of uniqueZombies) {
        eliminator.registerResource(resource);
      }
      for (const resource of uniqueActives) {
        eliminator.registerResource(resource);
      }

      // Detect zombies
      const detectedZombies = eliminator.detectZombies();

      // Only zombie resources should be detected
      expect(detectedZombies.length).toBe(uniqueZombies.length);

      // Verify all detected are actually zombies
      const zombieIds = new Set(uniqueZombies.map(r => r.id));
      for (const detected of detectedZombies) {
        expect(zombieIds.has(detected.id)).toBe(true);
      }
    }
  );

  test.prop([fc.array(zombieResourceArb, { minLength: 1, maxLength: 20 })])(
    'should eliminate all detected zombies when autoTerminate is true',
    async (zombieResources) => {
      const eliminator = createZombieResourceEliminator();
      const uniqueResources = zombieResources.map((r, i) => ({ ...r, id: `${r.id}-${i}` }));
      
      // Register all zombie resources
      for (const resource of uniqueResources) {
        eliminator.registerResource(resource);
      }

      // Eliminate zombies
      const report = await eliminator.eliminateZombies();

      // All zombies should be eliminated
      expect(report.totalZombies).toBe(uniqueResources.length);

      // All should be terminated
      const terminated = eliminator.getTerminatedResources();
      expect(terminated.length).toBe(uniqueResources.length);

      // No active resources should remain
      const active = eliminator.getActiveResources();
      expect(active.length).toBe(0);
    }
  );

  test.prop([fc.array(zombieResourceArb, { minLength: 1, maxLength: 20 })])(
    'should calculate correct cost savings from eliminated zombies',
    async (zombieResources) => {
      const eliminator = createZombieResourceEliminator();
      const uniqueResources = zombieResources.map((r, i) => ({ ...r, id: `${r.id}-${i}` }));
      
      // Register all zombie resources
      for (const resource of uniqueResources) {
        eliminator.registerResource(resource);
      }

      // Calculate expected savings
      const expectedSavings = uniqueResources.reduce((sum, r) => sum + r.costPerHour, 0);

      // Eliminate zombies
      const report = await eliminator.eliminateZombies();

      // Cost savings should match sum of zombie costs
      expect(report.costSavingsPerHour).toBeCloseTo(expectedSavings, 2);
      expect(eliminator.getTotalSavings()).toBeCloseTo(expectedSavings, 2);
    }
  );

  test.prop([
    fc.array(zombieResourceArb, { minLength: 1, maxLength: 20 }),
    fc.array(fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)), { minLength: 1, maxLength: 5 }),
  ])(
    'should not eliminate zombies matching exclusion patterns',
    async (zombieResources, exclusionPatterns) => {
      const eliminator = createZombieResourceEliminator({
        excludePatterns: exclusionPatterns,
      });

      const uniqueResources = zombieResources.map((r, i) => ({ ...r, id: `${r.id}-${i}` }));
      
      // Register zombies with names matching exclusion patterns
      const excludedZombies = uniqueResources.slice(0, Math.ceil(uniqueResources.length / 2));
      const includedZombies = uniqueResources.slice(Math.ceil(uniqueResources.length / 2));

      // Modify excluded zombie names to match patterns
      for (let i = 0; i < excludedZombies.length; i++) {
        const pattern = exclusionPatterns[i % exclusionPatterns.length];
        excludedZombies[i].name = pattern + '-resource';
      }

      // Register all zombies
      for (const resource of excludedZombies) {
        eliminator.registerResource(resource);
      }
      for (const resource of includedZombies) {
        eliminator.registerResource(resource);
      }

      // Eliminate zombies
      const report = await eliminator.eliminateZombies();

      // Only non-excluded zombies should be eliminated
      expect(report.totalZombies).toBeLessThanOrEqual(includedZombies.length);
    }
  );

  test.prop([
    fc.array(zombieResourceArb, { minLength: 1, maxLength: 20 }),
    fc.integer({ min: 1, max: 48 }),
  ])(
    'should respect custom threshold hours',
    (resources, thresholdHours) => {
      const eliminator = createZombieResourceEliminator({
        unusedThresholdHours: thresholdHours,
      });

      const uniqueResources = resources.map((r, i) => ({ ...r, id: `${r.id}-${i}` }));
      
      // Register resources
      for (const resource of uniqueResources) {
        eliminator.registerResource(resource);
      }

      // Detect zombies
      const detectedZombies = eliminator.detectZombies();

      // Verify all detected zombies are unused for > threshold
      const thresholdMs = thresholdHours * 60 * 60 * 1000;
      const now = Date.now();

      for (const zombie of detectedZombies) {
        const timeSinceLastUse = now - zombie.lastUsed.getTime();
        expect(timeSinceLastUse).toBeGreaterThan(thresholdMs);
      }
    }
  );

  test.prop([fc.array(zombieResourceArb, { minLength: 1, maxLength: 20 })])(
    'should track zombies by type correctly',
    async (zombieResources) => {
      const eliminator = createZombieResourceEliminator();
      const uniqueResources = zombieResources.map((r, i) => ({ ...r, id: `${r.id}-${i}` }));
      
      // Register all zombie resources
      for (const resource of uniqueResources) {
        eliminator.registerResource(resource);
      }

      // Eliminate zombies
      const report = await eliminator.eliminateZombies();

      // Count zombies by type manually
      const expectedByType: Record<string, number> = {};
      for (const resource of uniqueResources) {
        expectedByType[resource.type] = (expectedByType[resource.type] || 0) + 1;
      }

      // Verify report matches expected counts
      for (const [type, count] of Object.entries(expectedByType)) {
        expect(report.zombiesByType[type]).toBe(count);
      }
    }
  );

  test.prop([fc.array(resourceArb, { minLength: 1, maxLength: 20 })])(
    'should never lose track of registered resources',
    (resources) => {
      const eliminator = createZombieResourceEliminator();
      const uniqueResources = resources.map((r, i) => ({ ...r, id: `${r.id}-${i}` }));
      
      // Register all resources
      for (const resource of uniqueResources) {
        eliminator.registerResource(resource);
      }

      // Get all resources
      const allResources = eliminator.getAllResources();

      // All registered resources should be retrievable
      expect(allResources.length).toBe(uniqueResources.length);

      // Each resource should be retrievable by ID
      for (const resource of uniqueResources) {
        const retrieved = eliminator.getResource(resource.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(resource.id);
      }
    }
  );

  test.prop([fc.array(zombieResourceArb, { minLength: 2, maxLength: 20 })])(
    'should accumulate total savings across multiple elimination cycles',
    async (zombieResources) => {
      const eliminator = createZombieResourceEliminator();
      const uniqueResources = zombieResources.map((r, i) => ({ ...r, id: `${r.id}-${i}` }));
      
      // Split zombies into two batches
      const batch1 = uniqueResources.slice(0, Math.ceil(uniqueResources.length / 2));
      const batch2 = uniqueResources.slice(Math.ceil(uniqueResources.length / 2));

      // Register and eliminate first batch
      for (const resource of batch1) {
        eliminator.registerResource(resource);
      }
      const report1 = await eliminator.eliminateZombies();

      // Register and eliminate second batch
      for (const resource of batch2) {
        eliminator.registerResource(resource);
      }
      const report2 = await eliminator.eliminateZombies();

      // Total savings should be sum of both batches
      const expectedTotal = report1.costSavingsPerHour + report2.costSavingsPerHour;
      expect(eliminator.getTotalSavings()).toBeCloseTo(expectedTotal, 2);
    }
  );
});
