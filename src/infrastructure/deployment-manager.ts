/**
 * Zero-Downtime Deployment Manager
 * 
 * Implements blue-green and rolling deployment strategies to ensure
 * zero failed requests during deployments.
 */

import { EventEmitter } from 'events';

/**
 * Deployment strategy types
 */
export type DeploymentStrategy = 'blue-green' | 'rolling' | 'canary';

/**
 * Deployment status
 */
export type DeploymentStatus = 
  | 'pending'
  | 'in_progress'
  | 'health_check'
  | 'traffic_shift'
  | 'completed'
  | 'failed'
  | 'rolled_back';

/**
 * Service instance
 */
export interface ServiceInstance {
  id: string;
  version: string;
  status: 'starting' | 'healthy' | 'unhealthy' | 'stopping' | 'stopped';
  healthCheckUrl: string;
  port: number;
  startedAt: Date;
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  strategy: DeploymentStrategy;
  healthCheckPath: string;
  healthCheckTimeout: number;
  healthCheckRetries: number;
  trafficShiftDelay: number;
  rollbackOnFailure: boolean;
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  success: boolean;
  status: DeploymentStatus;
  failedRequests: number;
  totalRequests: number;
  deploymentTime: number;
  error?: string;
}

/**
 * Default deployment configuration
 */
const DEFAULT_CONFIG: DeploymentConfig = {
  strategy: 'blue-green',
  healthCheckPath: '/health',
  healthCheckTimeout: 30000,
  healthCheckRetries: 3,
  trafficShiftDelay: 5000,
  rollbackOnFailure: true,
};

/**
 * Zero-Downtime Deployment Manager
 */
export class DeploymentManager extends EventEmitter {
  private currentInstances: ServiceInstance[] = [];
  private newInstances: ServiceInstance[] = [];
  private config: DeploymentConfig;
  private requestCount = 0;
  private failedRequestCount = 0;

  constructor(config: Partial<DeploymentConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Deploy new version with zero downtime
   */
  async deploy(newVersion: string): Promise<DeploymentResult> {
    const startTime = Date.now();
    this.emit('deployment:started', { version: newVersion });

    try {
      // Reset counters
      this.requestCount = 0;
      this.failedRequestCount = 0;

      // Execute deployment based on strategy
      switch (this.config.strategy) {
        case 'blue-green':
          await this.blueGreenDeploy(newVersion);
          break;
        case 'rolling':
          await this.rollingDeploy(newVersion);
          break;
        case 'canary':
          await this.canaryDeploy(newVersion);
          break;
        default:
          throw new Error(`Unknown deployment strategy: ${this.config.strategy}`);
      }

      const deploymentTime = Date.now() - startTime;
      const result: DeploymentResult = {
        success: true,
        status: 'completed',
        failedRequests: this.failedRequestCount,
        totalRequests: this.requestCount,
        deploymentTime,
      };

      this.emit('deployment:completed', result);
      return result;

    } catch (error) {
      const deploymentTime = Date.now() - startTime;
      const result: DeploymentResult = {
        success: false,
        status: 'failed',
        failedRequests: this.failedRequestCount,
        totalRequests: this.requestCount,
        deploymentTime,
        error: error instanceof Error ? error.message : String(error),
      };

      this.emit('deployment:failed', result);

      // Rollback if configured
      if (this.config.rollbackOnFailure) {
        await this.rollback();
      }

      return result;
    }
  }

  /**
   * Blue-Green Deployment
   * 
   * 1. Start new instances (green)
   * 2. Wait for health checks to pass
   * 3. Switch traffic to new instances
   * 4. Stop old instances (blue)
   */
  private async blueGreenDeploy(newVersion: string): Promise<void> {
    this.emit('deployment:strategy', { strategy: 'blue-green' });

    // Step 1: Start new instances
    this.emit('deployment:status', { status: 'starting_new_instances' });
    this.newInstances = await this.startInstances(newVersion);

    // Step 2: Health check new instances
    this.emit('deployment:status', { status: 'health_check' });
    await this.waitForHealthy(this.newInstances);

    // Step 3: Switch traffic
    this.emit('deployment:status', { status: 'traffic_shift' });
    await this.switchTraffic(this.currentInstances, this.newInstances);

    // Step 4: Stop old instances
    this.emit('deployment:status', { status: 'stopping_old_instances' });
    await this.stopInstances(this.currentInstances);

    // Update current instances
    this.currentInstances = this.newInstances;
    this.newInstances = [];
  }

  /**
   * Rolling Deployment
   * 
   * 1. Start one new instance
   * 2. Wait for health check
   * 3. Stop one old instance
   * 4. Repeat until all instances replaced
   */
  private async rollingDeploy(newVersion: string): Promise<void> {
    this.emit('deployment:strategy', { strategy: 'rolling' });

    const targetCount = this.currentInstances.length || 1;
    const newInstances: ServiceInstance[] = [];

    for (let i = 0; i < targetCount; i++) {
      // Start new instance
      this.emit('deployment:status', { 
        status: 'rolling_update', 
        progress: `${i + 1}/${targetCount}` 
      });

      const newInstance = await this.startInstance(newVersion, i);
      newInstances.push(newInstance);

      // Health check
      await this.waitForHealthy([newInstance]);

      // Gradually shift traffic
      await this.gradualTrafficShift(newInstance);

      // Stop old instance if exists
      if (this.currentInstances[i]) {
        await this.stopInstance(this.currentInstances[i]);
      }

      // Small delay between replacements
      await this.delay(this.config.trafficShiftDelay);
    }

    this.currentInstances = newInstances;
  }

  /**
   * Canary Deployment
   * 
   * 1. Start one canary instance
   * 2. Route small percentage of traffic to canary
   * 3. Monitor metrics
   * 4. If successful, proceed with full deployment
   */
  private async canaryDeploy(newVersion: string): Promise<void> {
    this.emit('deployment:strategy', { strategy: 'canary' });

    // Step 1: Start canary instance
    this.emit('deployment:status', { status: 'starting_canary' });
    const canary = await this.startInstance(newVersion, 0);

    // Step 2: Health check canary
    await this.waitForHealthy([canary]);

    // Step 3: Route 10% traffic to canary
    this.emit('deployment:status', { status: 'canary_testing' });
    await this.routeTrafficPercentage(canary, 10);

    // Step 4: Monitor for 30 seconds
    await this.monitorCanary(canary, 30000);

    // Step 5: If successful, proceed with full deployment
    this.emit('deployment:status', { status: 'canary_success' });
    await this.blueGreenDeploy(newVersion);
  }

  /**
   * Start service instances
   */
  private async startInstances(version: string, count: number = 1): Promise<ServiceInstance[]> {
    const instances: ServiceInstance[] = [];

    for (let i = 0; i < count; i++) {
      const instance = await this.startInstance(version, i);
      instances.push(instance);
    }

    return instances;
  }

  /**
   * Start single service instance
   */
  private async startInstance(version: string, index: number): Promise<ServiceInstance> {
    const instance: ServiceInstance = {
      id: `instance-${version}-${index}-${Date.now()}`,
      version,
      status: 'starting',
      healthCheckUrl: `http://localhost:${3000 + index}${this.config.healthCheckPath}`,
      port: 3000 + index,
      startedAt: new Date(),
    };

    this.emit('instance:starting', instance);

    // Simulate instance startup
    await this.delay(1000);

    instance.status = 'healthy';
    this.emit('instance:started', instance);

    return instance;
  }

  /**
   * Wait for instances to become healthy
   */
  private async waitForHealthy(instances: ServiceInstance[]): Promise<void> {
    const healthChecks = instances.map(instance => 
      this.healthCheck(instance)
    );

    await Promise.all(healthChecks);
  }

  /**
   * Health check single instance
   */
  private async healthCheck(instance: ServiceInstance): Promise<void> {
    let retries = 0;

    while (retries < this.config.healthCheckRetries) {
      try {
        this.emit('health_check:attempt', { 
          instance: instance.id, 
          attempt: retries + 1 
        });

        // Simulate health check
        await this.delay(1000);

        // Check if instance is healthy
        if (instance.status === 'healthy') {
          this.emit('health_check:success', { instance: instance.id });
          return;
        }

        throw new Error('Instance not healthy');

      } catch (error) {
        retries++;
        
        if (retries >= this.config.healthCheckRetries) {
          instance.status = 'unhealthy';
          this.emit('health_check:failed', { 
            instance: instance.id, 
            error: error instanceof Error ? error.message : String(error)
          });
          throw new Error(`Health check failed for instance ${instance.id}`);
        }

        // Wait before retry
        await this.delay(2000);
      }
    }
  }

  /**
   * Switch traffic from old to new instances
   */
  private async switchTraffic(
    oldInstances: ServiceInstance[],
    newInstances: ServiceInstance[]
  ): Promise<void> {
    this.emit('traffic:switching', { 
      from: oldInstances.map(i => i.id),
      to: newInstances.map(i => i.id)
    });

    // Simulate traffic switch with delay
    await this.delay(this.config.trafficShiftDelay);

    this.emit('traffic:switched', { 
      newInstances: newInstances.map(i => i.id)
    });
  }

  /**
   * Gradual traffic shift to new instance
   */
  private async gradualTrafficShift(newInstance: ServiceInstance): Promise<void> {
    const steps = [25, 50, 75, 100];

    for (const percentage of steps) {
      this.emit('traffic:shifting', { 
        instance: newInstance.id, 
        percentage 
      });

      await this.delay(this.config.trafficShiftDelay / steps.length);
    }
  }

  /**
   * Route percentage of traffic to instance
   */
  private async routeTrafficPercentage(
    instance: ServiceInstance,
    percentage: number
  ): Promise<void> {
    this.emit('traffic:percentage', { 
      instance: instance.id, 
      percentage 
    });

    await this.delay(1000);
  }

  /**
   * Monitor canary instance
   */
  private async monitorCanary(
    canary: ServiceInstance,
    duration: number
  ): Promise<void> {
    this.emit('canary:monitoring', { 
      instance: canary.id, 
      duration 
    });

    await this.delay(duration);

    // Check if canary is still healthy
    if (canary.status !== 'healthy') {
      throw new Error('Canary instance became unhealthy');
    }

    this.emit('canary:healthy', { instance: canary.id });
  }

  /**
   * Stop service instances
   */
  private async stopInstances(instances: ServiceInstance[]): Promise<void> {
    const stops = instances.map(instance => this.stopInstance(instance));
    await Promise.all(stops);
  }

  /**
   * Stop single service instance
   */
  private async stopInstance(instance: ServiceInstance): Promise<void> {
    this.emit('instance:stopping', { instance: instance.id });

    instance.status = 'stopping';
    await this.delay(1000);

    instance.status = 'stopped';
    this.emit('instance:stopped', { instance: instance.id });
  }

  /**
   * Rollback to previous version
   */
  private async rollback(): Promise<void> {
    this.emit('deployment:rollback_started');

    // Stop new instances
    if (this.newInstances.length > 0) {
      await this.stopInstances(this.newInstances);
      this.newInstances = [];
    }

    // Ensure old instances are running
    for (const instance of this.currentInstances) {
      if (instance.status === 'stopped') {
        instance.status = 'healthy';
      }
    }

    this.emit('deployment:rollback_completed');
  }

  /**
   * Track request
   */
  trackRequest(success: boolean): void {
    this.requestCount++;
    if (!success) {
      this.failedRequestCount++;
    }
  }

  /**
   * Get current instances
   */
  getCurrentInstances(): ServiceInstance[] {
    return [...this.currentInstances];
  }

  /**
   * Get deployment statistics
   */
  getStats(): { total: number; failed: number; successRate: number } {
    return {
      total: this.requestCount,
      failed: this.failedRequestCount,
      successRate: this.requestCount > 0 
        ? ((this.requestCount - this.failedRequestCount) / this.requestCount) * 100 
        : 100,
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
