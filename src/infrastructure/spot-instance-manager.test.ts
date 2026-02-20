import { describe, it, expect, beforeEach } from 'vitest';
import { SpotInstanceManager, createSpotInstanceManager } from './spot-instance-manager';

describe('SpotInstanceManager', () => {
  let manager: SpotInstanceManager;

  beforeEach(() => {
    manager = createSpotInstanceManager();
  });

  describe('requestSpotInstance', () => {
    it('should create a spot instance with 70%+ savings', async () => {
      const instance = await manager.requestSpotInstance({
        instanceType: 't3.medium',
        region: 'us-east-1',
        maxPricePerHour: 0.05,
        minSavingsPercent: 70,
      });

      expect(instance).toBeDefined();
      expect(instance.id).toMatch(/^spot-/);
      expect(instance.type).toBe('t3.medium');
      expect(instance.region).toBe('us-east-1');
      expect(instance.status).toBe('running');
      expect(instance.savingsPercent).toBeGreaterThanOrEqual(70);
      expect(instance.pricePerHour).toBeLessThan(instance.onDemandPrice);
    });

    it('should throw error if savings below minimum requirement', async () => {
      await expect(
        manager.requestSpotInstance({
          instanceType: 't3.micro',
          region: 'us-east-1',
          maxPricePerHour: 0.001, // Very low max price
          minSavingsPercent: 99, // Unrealistic savings requirement
        })
      ).rejects.toThrow();
    });

    it('should calculate correct savings percentage', async () => {
      const instance = await manager.requestSpotInstance({
        instanceType: 't3.large',
        region: 'us-east-1',
        maxPricePerHour: 0.1,
        minSavingsPercent: 70,
      });

      const expectedSavings =
        ((instance.onDemandPrice - instance.pricePerHour) / instance.onDemandPrice) * 100;
      
      expect(instance.savingsPercent).toBeCloseTo(expectedSavings, 2);
    });
  });

  describe('handleInterruption', () => {
    it('should mark instance as interrupted', async () => {
      const managerNoFailover = createSpotInstanceManager({ autoFailover: false });
      
      const instance = await managerNoFailover.requestSpotInstance({
        instanceType: 't3.medium',
        region: 'us-east-1',
        maxPricePerHour: 0.05,
        minSavingsPercent: 70,
      });

      await managerNoFailover.handleInterruption(instance.id);

      const updatedInstance = managerNoFailover.getInstance(instance.id);
      expect(updatedInstance?.status).toBe('interrupted');
      expect(updatedInstance?.interruptionTime).toBeDefined();
    });

    it('should execute custom interruption handler', async () => {
      const instance = await manager.requestSpotInstance({
        instanceType: 't3.medium',
        region: 'us-east-1',
        maxPricePerHour: 0.05,
        minSavingsPercent: 70,
      });

      let handlerCalled = false;
      manager.registerInterruptionHandler(instance.id, async () => {
        handlerCalled = true;
      });

      await manager.handleInterruption(instance.id);

      expect(handlerCalled).toBe(true);
    });

    it('should auto-failover to new instance when enabled', async () => {
      const managerWithFailover = createSpotInstanceManager({ autoFailover: true });
      
      const instance = await managerWithFailover.requestSpotInstance({
        instanceType: 't3.medium',
        region: 'us-east-1',
        maxPricePerHour: 0.05,
        minSavingsPercent: 70,
      });

      const initialRunningCount = managerWithFailover.getRunningInstances().length;

      await managerWithFailover.handleInterruption(instance.id);

      const finalRunningCount = managerWithFailover.getRunningInstances().length;
      
      // Should have same number of running instances (old terminated, new created)
      expect(finalRunningCount).toBe(initialRunningCount);
      
      const oldInstance = managerWithFailover.getInstance(instance.id);
      expect(oldInstance?.status).toBe('terminated');
    });
  });

  describe('calculateTotalSavings', () => {
    it('should calculate total savings across multiple instances', async () => {
      await manager.requestSpotInstance({
        instanceType: 't3.medium',
        region: 'us-east-1',
        maxPricePerHour: 0.05,
        minSavingsPercent: 70,
      });

      await manager.requestSpotInstance({
        instanceType: 't3.large',
        region: 'us-east-1',
        maxPricePerHour: 0.1,
        minSavingsPercent: 70,
      });

      const { totalSavings, savingsPercent } = manager.calculateTotalSavings();

      expect(totalSavings).toBeGreaterThan(0);
      expect(savingsPercent).toBeGreaterThanOrEqual(70);
    });

    it('should return zero savings when no instances running', () => {
      const { totalSavings, savingsPercent } = manager.calculateTotalSavings();

      expect(totalSavings).toBe(0);
      expect(savingsPercent).toBe(0);
    });
  });

  describe('terminateInstance', () => {
    it('should terminate an instance', async () => {
      const instance = await manager.requestSpotInstance({
        instanceType: 't3.medium',
        region: 'us-east-1',
        maxPricePerHour: 0.05,
        minSavingsPercent: 70,
      });

      await manager.terminateInstance(instance.id);

      const terminatedInstance = manager.getInstance(instance.id);
      expect(terminatedInstance?.status).toBe('terminated');
    });

    it('should throw error when terminating non-existent instance', async () => {
      await expect(manager.terminateInstance('non-existent-id')).rejects.toThrow(
        'Instance non-existent-id not found'
      );
    });
  });

  describe('getRunningInstances', () => {
    it('should return only running instances', async () => {
      const instance1 = await manager.requestSpotInstance({
        instanceType: 't3.medium',
        region: 'us-east-1',
        maxPricePerHour: 0.05,
        minSavingsPercent: 70,
      });

      const instance2 = await manager.requestSpotInstance({
        instanceType: 't3.large',
        region: 'us-east-1',
        maxPricePerHour: 0.1,
        minSavingsPercent: 70,
      });

      await manager.terminateInstance(instance1.id);

      const runningInstances = manager.getRunningInstances();

      expect(runningInstances).toHaveLength(1);
      expect(runningInstances[0].id).toBe(instance2.id);
    });
  });
});
