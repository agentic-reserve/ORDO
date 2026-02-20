/**
 * Secure Environment Variable Manager
 * 
 * Provides secure access to environment variables with:
 * - Encryption at rest
 * - No logging of sensitive values
 * - Access control
 * - Validation
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Sensitive environment variable keys that should never be logged
 */
const SENSITIVE_KEYS = new Set([
  'OPENROUTER_API_KEY',
  'HELIUS_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'RAILWAY_TOKEN',
  'NPM_TOKEN',
  'CODECOV_TOKEN',
  'SNYK_TOKEN',
  'PRIVATE_KEY',
  'SECRET_KEY',
  'PASSWORD',
  'TOKEN',
  'API_KEY',
]);

/**
 * Check if a key is sensitive
 */
function isSensitiveKey(key: string): boolean {
  const upperKey = key.toUpperCase();
  return Array.from(SENSITIVE_KEYS).some(sensitiveKey => 
    upperKey.includes(sensitiveKey)
  );
}

/**
 * Mask sensitive value for logging
 */
function maskValue(value: string): string {
  if (value.length <= 8) {
    return '***';
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Encryption key derived from master password
 */
let encryptionKey: Buffer | null = null;

/**
 * Initialize encryption key
 */
function initEncryptionKey(): Buffer {
  if (encryptionKey) {
    return encryptionKey;
  }

  const masterPassword = process.env.MASTER_PASSWORD || 'default-dev-password';
  const salt = process.env.ENCRYPTION_SALT || 'default-salt';
  
  encryptionKey = scryptSync(masterPassword, salt, 32);
  return encryptionKey;
}

/**
 * Encrypt a value
 */
export function encrypt(value: string): string {
  const key = initEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a value
 */
export function decrypt(encryptedValue: string): string {
  const key = initEncryptionKey();
  const [ivHex, encrypted] = encryptedValue.split(':');
  
  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted value format');
  }
  
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Environment variable manager
 */
export class EnvManager {
  private static instance: EnvManager;
  private cache: Map<string, string> = new Map();
  private accessLog: Array<{ key: string; timestamp: Date }> = [];

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EnvManager {
    if (!EnvManager.instance) {
      EnvManager.instance = new EnvManager();
    }
    return EnvManager.instance;
  }

  /**
   * Get environment variable
   */
  get(key: string, defaultValue?: string): string {
    // Check cache first
    if (this.cache.has(key)) {
      this.logAccess(key);
      return this.cache.get(key)!;
    }

    // Get from process.env
    let value = process.env[key];

    // Use default if not found
    if (value === undefined) {
      if (defaultValue !== undefined) {
        value = defaultValue;
      } else {
        throw new Error(`Environment variable ${key} is required but not set`);
      }
    }

    // Cache the value
    this.cache.set(key, value);
    this.logAccess(key);

    return value;
  }

  /**
   * Get required environment variable
   */
  getRequired(key: string): string {
    return this.get(key);
  }

  /**
   * Get optional environment variable
   */
  getOptional(key: string, defaultValue: string): string {
    return this.get(key, defaultValue);
  }

  /**
   * Get boolean environment variable
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.get(key, String(defaultValue));
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get number environment variable
   */
  getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key, defaultValue !== undefined ? String(defaultValue) : undefined);
    const num = Number(value);
    
    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
    }
    
    return num;
  }

  /**
   * Get encrypted environment variable
   */
  getEncrypted(key: string): string {
    const encryptedValue = this.get(key);
    return decrypt(encryptedValue);
  }

  /**
   * Set environment variable (for testing)
   */
  set(key: string, value: string): void {
    process.env[key] = value;
    this.cache.set(key, value);
  }

  /**
   * Check if environment variable exists
   */
  has(key: string): boolean {
    return process.env[key] !== undefined;
  }

  /**
   * Get all environment variables (masked)
   */
  getAll(): Record<string, string> {
    const env: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(process.env)) {
      if (isSensitiveKey(key)) {
        env[key] = maskValue(value || '');
      } else {
        env[key] = value || '';
      }
    }
    
    return env;
  }

  /**
   * Validate required environment variables
   */
  validate(requiredKeys: string[]): void {
    const missing: string[] = [];
    
    for (const key of requiredKeys) {
      if (!this.has(key)) {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please check your .env file or environment configuration.`
      );
    }
  }

  /**
   * Log access to environment variable
   */
  private logAccess(key: string): void {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG === 'true') {
      // Never log sensitive keys
      if (!isSensitiveKey(key)) {
        this.accessLog.push({ key, timestamp: new Date() });
      }
    }
  }

  /**
   * Get access log
   */
  getAccessLog(): Array<{ key: string; timestamp: Date }> {
    return [...this.accessLog];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear access log
   */
  clearAccessLog(): void {
    this.accessLog = [];
  }
}

/**
 * Global environment manager instance
 */
export const env = EnvManager.getInstance();

/**
 * Validate required environment variables on module load
 */
const REQUIRED_ENV_VARS = [
  'SOLANA_RPC_URL',
  'OPENROUTER_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
];

// Only validate in production
if (process.env.NODE_ENV === 'production') {
  try {
    env.validate(REQUIRED_ENV_VARS);
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}

/**
 * Prevent logging of sensitive environment variables
 */
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function sanitizeArgs(args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg === 'string') {
      // Check if string contains sensitive patterns
      for (const key of SENSITIVE_KEYS) {
        if (arg.includes(key)) {
          return '[REDACTED]';
        }
      }
    } else if (typeof arg === 'object' && arg !== null) {
      // Sanitize object properties
      const sanitized: any = Array.isArray(arg) ? [] : {};
      for (const [key, value] of Object.entries(arg)) {
        if (isSensitiveKey(key)) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeArgs([value])[0];
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return arg;
  });
}

// Override console methods to prevent logging sensitive data
console.log = (...args: any[]) => {
  originalConsoleLog(...sanitizeArgs(args));
};

console.error = (...args: any[]) => {
  originalConsoleError(...sanitizeArgs(args));
};

console.warn = (...args: any[]) => {
  originalConsoleWarn(...sanitizeArgs(args));
};
