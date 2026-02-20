import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ZombieResourceEliminator,
  createZombieResourceEliminator,
} from './zombie-resource-eliminator';

describe('ZombieResourceEliminator', () => {
  let eliminator: ZombieResourceEliminator;

  beforeEach(() => {
    eliminator = createZombieResourceEliminator();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    eliminator.stopAutoElimination();
  });

  describe('registerResource', () => {
    it('should register a new resource', () => {
      const resource = eliminator.registerResource({
        id: 'res-1',
        type: 'compute',
        name: 'test-instance',
        costPerHour: 0.1,
        lastUsed: new Date(),
      });

      expect(resource.status).toBe('active');
      expect(resource.createdAt).toBeDefined();
      expect(eliminator.getResource('res-1')).toBeDefined();
    });
  });

  describe('updateResourceUsage', () => {
    it('should update last used timestamp', () => {
      const resource = eliminator.registerResource({
        id: 'res-1',
        type: 'compute',
        name: 'test-instance',
        costPerHour: 0.1,
        lastUsed: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      });

      const oldLastUsed = resource.lastUsed;

      vi.advanceTimersByTime(1000); // Advance 1 second

      eliminator.updateResourceUsage('res-1');

      const updatedResource = eliminator.getResource('res-1');
      expect(updatedResource?.lastUsed.getTime()).toBeGreaterThan(oldLastUsed.getTime());
    });
  });

  describe('detectZombies', () => {
    it('should detect resources unused for > 24 hours', () => {
      // Create resource last used 25 hours ago
      eliminator.registerResource({
        id: 'zombie-1',
        type: 'compute',
        name: 'old-instance',
        costPerHour: 0.1,
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      // Create resource last used 1 hour ago
      eliminator.registerResource({
        id: 'active-1',
        type: 'compute',
        name: 'new-instance',
        costPerHour: 0.1,
        lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000),
      });

      const zombies = eliminator.detectZombies();

      expect(zombies).toHaveLength(1);
      expect(zombies[0].id).toBe('zombie-1');
      expect(zombies[0].status).toBe('zombie');
    });

    it('should not detect resources matching exclusion patterns', () => {
      const eliminatorWithExclusions = createZombieResourceEliminator({
        excludePatterns: ['^prod-', 'critical'],
      });

      // Create zombie resource with excluded name
      eliminatorWithExclusions.registerResource({
        id: 'zombie-1',
        type: 'compute',
        name: 'prod-database',
        costPerHour: 0.5,
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      // Create zombie resource without excluded name
      eliminatorWithExclusions.registerResource({
        id: 'zombie-2',
        type: 'compute',
        name: 'test-instance',
        costPerHour: 0.1,
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      const zombies = eliminatorWithExclusions.detectZombies();

      expect(zombies).toHaveLength(1);
      expect(zombies[0].id).toBe('zombie-2');
    });

    it('should use custom threshold hours', () => {
      const eliminatorCustom = createZombieResourceEliminator({
        unusedThresholdHours: 12,
      });

      // Create resource last used 13 hours ago
      eliminatorCustom.registerResource({
        id: 'zombie-1',
        type: 'compute',
        name: 'old-instance',
        costPerHour: 0.1,
        lastUsed: new Date(Date.now() - 13 * 60 * 60 * 1000),
      });

      const zombies = eliminatorCustom.detectZombies();

      expect(zombies).toHaveLength(1);
    });
  });

  describe('eliminateZombies', () => {
    it('should eliminate zombie resources and track savings', async () => {
      eliminator.registerResource({
        id: 'zombie-1',
        type: 'compute',
        name: 'old-instance-1',
        costPerHour: 0.1,
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      eliminator.registerResource({
        id: 'zombie-2',
        type: 'storage',
        name: 'old-storage-1',
        costPerHour: 0.05,
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      const report = await eliminator.eliminateZombies();

      expect(report.totalZombies).toBe(2);
      expect(report.zombiesByType.compute).toBe(1);
      expect(report.zombiesByType.storage).toBe(1);
      expect(report.costSavingsPerHour).toBeCloseTo(0.15, 2);
      expect(eliminator.getTotalSavings()).toBeCloseTo(0.15, 2);

      const terminated = eliminator.getTerminatedResources();
      expect(terminated).toHaveLength(2);
    });

    it('should not terminate zombies when autoTerminate is false', async () => {
      const eliminatorNoAuto = createZombieResourceEliminator({
        autoTerminate: false,
      });

      eliminatorNoAuto.registerResource({
        id: 'zombie-1',
        type: 'compute',
        name: 'old-instance',
        costPerHour: 0.1,
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      const report = await eliminatorNoAuto.eliminateZombies();

      expect(report.totalZombies).toBe(1);
      expect(report.costSavingsPerHour).toBe(0);

      const terminated = eliminatorNoAuto.getTerminatedResources();
      expect(terminated).toHaveLength(0);
    });
  });

  describe('terminateResource', () => {
    it('should terminate a resource', async () => {
      const resource = eliminator.registerResource({
        id: 'res-1',
        type: 'compute',
        name: 'test-instance',
        costPerHour: 0.1,
        lastUsed: new Date(),
      });

      await eliminator.terminateResource('res-1');

      const terminated = eliminator.getResource('res-1');
      expect(terminated?.status).toBe('terminated');
      expect(terminated?.terminatedAt).toBeDefined();
    });

    it('should throw error when terminating non-existent resource', async () => {
      await expect(eliminator.terminateResource('non-existent')).rejects.toThrow(
        'Resource non-existent not found'
      );
    });
  });

  describe('getActiveResources', () => {
    it('should return only active resources', async () => {
      eliminator.registerResource({
        id: 'active-1',
        type: 'compute',
        name: 'instance-1',
        costPerHour: 0.1,
        lastUsed: new Date(),
      });

      const zombie = eliminator.registerResource({
        id: 'zombie-1',
        type: 'compute',
        name: 'instance-2',
        costPerHour: 0.1,
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      await eliminator.terminateResource(zombie.id);

      const active = eliminator.getActiveResources();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('active-1');
    });
  });

  describe('calculatePotentialSavings', () => {
    it('should calculate potential savings from current zombies', () => {
      eliminator.registerResource({
        id: 'zombie-1',
        type: 'compute',
        name: 'old-instance-1',
        costPerHour: 0.1,
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      eliminator.registerResource({
        id: 'zombie-2',
        type: 'storage',
        name: 'old-storage-1',
        costPerHour: 0.05,
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      const potentialSavings = eliminator.calculatePotentialSavings();
      expect(potentialSavings).toBeCloseTo(0.15, 2);
    });
  });

  describe('startAutoElimination', () => {
    it('should automatically eliminate zombies at intervals', async () => {
      const eliminatorAuto = createZombieResourceEliminator({
        checkIntervalMinutes: 1,
      });

      eliminatorAuto.registerResource({
        id: 'zombie-1',
        type: 'compute',
        name: 'old-instance',
        costPerHour: 0.1,
        lastUsed: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      eliminatorAuto.startAutoElimination();

      // Advance time by 1 minute
      await vi.advanceTimersByTimeAsync(60 * 1000);

      const terminated = eliminatorAuto.getTerminatedResources();
      expect(terminated.length).toBeGreaterThan(0);

      eliminatorAuto.stopAutoElimination();
    });
  });
});
