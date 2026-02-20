/**
 * Zombie Resource Eliminator for Cost Optimization
 * 
 * Detects and eliminates resources unused for > 24 hours to reduce costs.
 * Tracks cost savings from eliminated resources.
 * 
 * Requirements: 23.2
 * Property: 105 - Zombie Resource Elimination
 */

export interface Resource {
  id: string;
  type: 'compute' | 'storage' | 'network' | 'database';
  name: string;
  costPerHour: number;
  lastUsed: Date;
  status: 'active' | 'zombie' | 'terminated';
  createdAt: Date;
  terminatedAt?: Date;
}

export interface ZombieDetectionConfig {
  unusedThresholdHours: number; // Default: 24
  checkIntervalMinutes: number; // Default: 60
  autoTerminate: boolean; // Default: true
  excludePatterns: string[]; // Resource name patterns to exclude from termination
}

export interface ZombieReport {
  totalZombies: number;
  zombiesByType: Record<string, number>;
  totalCostSavings: number;
  costSavingsPerHour: number;
  detectionTime: Date;
}

export class ZombieResourceEliminator {
  private resources: Map<string, Resource> = new Map();
  private config: ZombieDetectionConfig;
  private totalSavings: number = 0;
  private checkInterval?: NodeJS.Timeout;

  constructor(config?: Partial<ZombieDetectionConfig>) {
    this.config = {
      unusedThresholdHours: 24,
      checkIntervalMinutes: 60,
      autoTerminate: true,
      excludePatterns: [],
      ...config,
    };
  }

  /**
   * Register a resource for monitoring
   */
  registerResource(resource: Omit<Resource, 'status' | 'createdAt'>): Resource {
    const fullResource: Resource = {
      ...resource,
      status: 'active',
      createdAt: new Date(),
    };

    this.resources.set(resource.id, fullResource);
    return fullResource;
  }

  /**
   * Update resource last used timestamp
   */
  updateResourceUsage(resourceId: string): void {
    const resource = this.resources.get(resourceId);
    if (resource && resource.status === 'active') {
      resource.lastUsed = new Date();
    }
  }

  /**
   * Detect zombie resources (unused for > threshold hours)
   */
  detectZombies(): Resource[] {
    const now = new Date();
    const thresholdMs = this.config.unusedThresholdHours * 60 * 60 * 1000;
    const zombies: Resource[] = [];

    for (const resource of this.resources.values()) {
      if (resource.status !== 'active') {
        continue;
      }

      // Check if resource is excluded by pattern
      if (this.isExcluded(resource.name)) {
        continue;
      }

      // Check if unused for > threshold
      const timeSinceLastUse = now.getTime() - resource.lastUsed.getTime();
      if (timeSinceLastUse > thresholdMs) {
        resource.status = 'zombie';
        zombies.push(resource);
      }
    }

    return zombies;
  }

  /**
   * Eliminate zombie resources
   */
  async eliminateZombies(): Promise<ZombieReport> {
    const zombies = this.detectZombies();
    const detectionTime = new Date();

    let totalCostSavings = 0;
    const zombiesByType: Record<string, number> = {};

    for (const zombie of zombies) {
      if (this.config.autoTerminate) {
        await this.terminateResource(zombie.id);
        totalCostSavings += zombie.costPerHour;

        // Track by type
        zombiesByType[zombie.type] = (zombiesByType[zombie.type] || 0) + 1;
      }
    }

    this.totalSavings += totalCostSavings;

    return {
      totalZombies: zombies.length,
      zombiesByType,
      totalCostSavings,
      costSavingsPerHour: totalCostSavings,
      detectionTime,
    };
  }

  /**
   * Terminate a resource
   */
  async terminateResource(resourceId: string): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      throw new Error(`Resource ${resourceId} not found`);
    }

    resource.status = 'terminated';
    resource.terminatedAt = new Date();

    // In production, this would call cloud provider API to actually terminate the resource
    // For now, we just mark it as terminated
  }

  /**
   * Start automatic zombie detection and elimination
   */
  startAutoElimination(): void {
    if (this.checkInterval) {
      return; // Already running
    }

    const intervalMs = this.config.checkIntervalMinutes * 60 * 1000;
    this.checkInterval = setInterval(async () => {
      await this.eliminateZombies();
    }, intervalMs);
  }

  /**
   * Stop automatic zombie detection and elimination
   */
  stopAutoElimination(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * Get all resources
   */
  getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Get active resources
   */
  getActiveResources(): Resource[] {
    return this.getAllResources().filter(r => r.status === 'active');
  }

  /**
   * Get zombie resources
   */
  getZombieResources(): Resource[] {
    return this.getAllResources().filter(r => r.status === 'zombie');
  }

  /**
   * Get terminated resources
   */
  getTerminatedResources(): Resource[] {
    return this.getAllResources().filter(r => r.status === 'terminated');
  }

  /**
   * Get total savings from eliminated zombies
   */
  getTotalSavings(): number {
    return this.totalSavings;
  }

  /**
   * Get resource by ID
   */
  getResource(resourceId: string): Resource | undefined {
    return this.resources.get(resourceId);
  }

  /**
   * Check if resource name matches exclusion patterns
   */
  private isExcluded(resourceName: string): boolean {
    return this.config.excludePatterns.some(pattern => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(resourceName);
      } catch (error) {
        // Invalid regex pattern, treat as literal string match
        return resourceName.includes(pattern);
      }
    });
  }

  /**
   * Calculate potential savings if all current zombies were eliminated
   */
  calculatePotentialSavings(): number {
    const zombies = this.detectZombies();
    return zombies.reduce((sum, z) => sum + z.costPerHour, 0);
  }
}

/**
 * Create a zombie resource eliminator with default configuration
 */
export function createZombieResourceEliminator(
  config?: Partial<ZombieDetectionConfig>
): ZombieResourceEliminator {
  return new ZombieResourceEliminator(config);
}
