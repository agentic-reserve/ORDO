/**
 * Resource Allocator with Golden Ratio
 * 
 * Implements resource allocation using the Golden Ratio (φ = 1.618).
 * Sets resource limits = request × φ to provide optimal headroom.
 * 
 * The Golden Ratio appears throughout nature as the optimal proportion
 * for growth and efficiency. Applied here for resource allocation to
 * provide the ideal balance between resource availability and efficiency.
 * 
 * Requirements: 21.5
 * Property 100: Golden Ratio Resource Allocation
 */

/**
 * Golden Ratio (φ) - the divine proportion
 * φ = (1 + √5) / 2 ≈ 1.618033988749895
 */
export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

/**
 * Resource types that can be allocated
 */
export type ResourceType = 'memory' | 'cpu' | 'storage' | 'network';

/**
 * Resource request specifying desired resources
 */
export interface ResourceRequest {
  memory?: number; // In MB
  cpu?: number; // In CPU units (1 = 1 core)
  storage?: number; // In GB
  network?: number; // In Mbps
}

/**
 * Resource allocation with limits based on Golden Ratio
 */
export interface ResourceAllocation {
  memory?: {
    request: number;
    limit: number;
  };
  cpu?: {
    request: number;
    limit: number;
  };
  storage?: {
    request: number;
    limit: number;
  };
  network?: {
    request: number;
    limit: number;
  };
}

/**
 * Configuration for resource allocator
 */
export interface ResourceAllocatorConfig {
  /** Ratio to apply for limits (default: Golden Ratio) */
  limitRatio: number;
  /** Minimum limit multiplier (prevents limits below requests) */
  minLimitRatio: number;
  /** Maximum limit multiplier (prevents excessive allocation) */
  maxLimitRatio: number;
}

/**
 * Default configuration using Golden Ratio
 */
export const DEFAULT_CONFIG: ResourceAllocatorConfig = {
  limitRatio: GOLDEN_RATIO,
  minLimitRatio: 1.0, // Limit must be at least equal to request
  maxLimitRatio: 10.0, // Limit cannot exceed 10x request
};

/**
 * Resource Allocator implementing Golden Ratio allocation
 */
export class ResourceAllocator {
  private config: ResourceAllocatorConfig;

  constructor(config: Partial<ResourceAllocatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Validate configuration
    if (this.config.limitRatio < this.config.minLimitRatio) {
      throw new Error(
        `limitRatio (${this.config.limitRatio}) cannot be less than minLimitRatio (${this.config.minLimitRatio})`
      );
    }
    if (this.config.limitRatio > this.config.maxLimitRatio) {
      throw new Error(
        `limitRatio (${this.config.limitRatio}) cannot exceed maxLimitRatio (${this.config.maxLimitRatio})`
      );
    }
  }

  /**
   * Calculate limit from request using Golden Ratio
   * limit = request × φ
   */
  private calculateLimit(request: number): number {
    const limit = request * this.config.limitRatio;
    
    // Ensure limit is within bounds
    const minLimit = request * this.config.minLimitRatio;
    const maxLimit = request * this.config.maxLimitRatio;
    
    return Math.max(minLimit, Math.min(limit, maxLimit));
  }

  /**
   * Allocate resources based on request
   * Returns allocation with limits set to request × φ
   */
  allocate(request: ResourceRequest): ResourceAllocation {
    const allocation: ResourceAllocation = {};

    if (request.memory !== undefined) {
      if (request.memory < 0) {
        throw new Error('Memory request cannot be negative');
      }
      allocation.memory = {
        request: request.memory,
        limit: this.calculateLimit(request.memory),
      };
    }

    if (request.cpu !== undefined) {
      if (request.cpu < 0) {
        throw new Error('CPU request cannot be negative');
      }
      allocation.cpu = {
        request: request.cpu,
        limit: this.calculateLimit(request.cpu),
      };
    }

    if (request.storage !== undefined) {
      if (request.storage < 0) {
        throw new Error('Storage request cannot be negative');
      }
      allocation.storage = {
        request: request.storage,
        limit: this.calculateLimit(request.storage),
      };
    }

    if (request.network !== undefined) {
      if (request.network < 0) {
        throw new Error('Network request cannot be negative');
      }
      allocation.network = {
        request: request.network,
        limit: this.calculateLimit(request.network),
      };
    }

    return allocation;
  }

  /**
   * Get the limit ratio being used
   */
  getLimitRatio(): number {
    return this.config.limitRatio;
  }

  /**
   * Check if an allocation respects the Golden Ratio
   * Returns true if limit ≈ request × φ (within 0.1% tolerance)
   */
  isGoldenRatioAllocation(request: number, limit: number): boolean {
    if (request === 0) {
      return limit === 0;
    }
    
    const expectedLimit = request * this.config.limitRatio;
    const tolerance = 0.001; // 0.1% tolerance
    const ratio = Math.abs(limit - expectedLimit) / expectedLimit;
    
    return ratio <= tolerance;
  }

  /**
   * Calculate headroom percentage
   * Returns the percentage of extra capacity provided by the limit
   */
  calculateHeadroom(request: number, limit: number): number {
    if (request === 0) {
      return 0;
    }
    return ((limit - request) / request) * 100;
  }

  /**
   * Get configuration
   */
  getConfig(): ResourceAllocatorConfig {
    return { ...this.config };
  }
}

/**
 * Convenience function to allocate resources with Golden Ratio
 */
export function allocateResources(request: ResourceRequest): ResourceAllocation {
  const allocator = new ResourceAllocator();
  return allocator.allocate(request);
}

/**
 * Convenience function to calculate Golden Ratio limit
 */
export function calculateGoldenRatioLimit(request: number): number {
  return request * GOLDEN_RATIO;
}
