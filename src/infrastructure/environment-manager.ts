/**
 * Secure Environment Management
 * 
 * Implements secure storage and access to environment variables with:
 * - Encrypted storage
 * - No logging of sensitive values
 * - Access control to authorized processes only
 */

import crypto from 'crypto';

/**
 * Sensitive environment variable patterns
 */
const SENSITIVE_PATTERNS = [
  /key/i,
  /secret/i,
  /password/i,
  /token/i,
  /api/i,
  /private/i,
  /credential/i,
  /auth/i,
];

/**
 * Environment variable metadata
 */
export interface EnvironmentVariable {
  key: string;
  value: string;
  encrypted: boolean;
  sensitive: boolean;
  lastAccessed?: Date;
  accessCount: number;
}

/**
 * Environment access log entry
 */
export interface AccessLogEntry {
  timestamp: Date;
  key: string;
  processId: number;
  authorized: boolean;
  action: 'read' | 'write' | 'delete';
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
}

/**
 * Default encryption configuration
 */
const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
};

/**
 * Secure Environment Manager
 */
export class EnvironmentManager {
  private variables: Map<string, EnvironmentVariable> = new Map();
  private encryptionKey: Buffer;
  private encryptionConfig: EncryptionConfig;
  private accessLog: AccessLogEntry[] = [];
  private authorizedProcessIds: Set<number> = new Set();

  constructor(
    masterKey?: string,
    config: Partial<EncryptionConfig> = {}
  ) {
    this.encryptionConfig = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
    
    // Generate or use provided encryption key
    if (masterKey) {
      this.encryptionKey = crypto.scryptSync(
        masterKey,
        'salt',
        this.encryptionConfig.keyLength
      );
    } else {
      this.encryptionKey = crypto.randomBytes(this.encryptionConfig.keyLength);
    }

    // Authorize current process
    this.authorizedProcessIds.add(process.pid);
  }

  /**
   * Set environment variable with automatic encryption for sensitive values
   */
  set(key: string, value: string, processId: number = process.pid): void {
    // Check authorization
    if (!this.isAuthorized(processId)) {
      this.logAccess(key, processId, false, 'write');
      throw new Error(`Unauthorized access attempt by process ${processId}`);
    }

    // Determine if variable is sensitive
    const sensitive = this.isSensitive(key);

    // Encrypt if sensitive
    const storedValue = sensitive ? this.encrypt(value) : value;

    // Store variable
    const variable: EnvironmentVariable = {
      key,
      value: storedValue,
      encrypted: sensitive,
      sensitive,
      accessCount: 0,
    };

    this.variables.set(key, variable);
    this.logAccess(key, processId, true, 'write');

    // Set in process.env (encrypted if sensitive)
    process.env[key] = storedValue;
  }

  /**
   * Get environment variable with automatic decryption
   */
  get(key: string, processId: number = process.pid): string | undefined {
    // Check authorization
    if (!this.isAuthorized(processId)) {
      this.logAccess(key, processId, false, 'read');
      throw new Error(`Unauthorized access attempt by process ${processId}`);
    }

    const variable = this.variables.get(key);
    if (!variable) {
      return undefined;
    }

    // Update access metadata
    variable.lastAccessed = new Date();
    variable.accessCount++;

    this.logAccess(key, processId, true, 'read');

    // Decrypt if encrypted
    return variable.encrypted ? this.decrypt(variable.value) : variable.value;
  }

  /**
   * Delete environment variable
   */
  delete(key: string, processId: number = process.pid): boolean {
    // Check authorization
    if (!this.isAuthorized(processId)) {
      this.logAccess(key, processId, false, 'delete');
      throw new Error(`Unauthorized access attempt by process ${processId}`);
    }

    const deleted = this.variables.delete(key);
    if (deleted) {
      delete process.env[key];
      this.logAccess(key, processId, true, 'delete');
    }

    return deleted;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.variables.has(key);
  }

  /**
   * Get all variable keys (safe to log)
   */
  keys(): string[] {
    return Array.from(this.variables.keys());
  }

  /**
   * Get variable metadata (without sensitive values)
   */
  getMetadata(key: string): Omit<EnvironmentVariable, 'value'> | undefined {
    const variable = this.variables.get(key);
    if (!variable) {
      return undefined;
    }

    return {
      key: variable.key,
      encrypted: variable.encrypted,
      sensitive: variable.sensitive,
      lastAccessed: variable.lastAccessed,
      accessCount: variable.accessCount,
    };
  }

  /**
   * Get all variables metadata (safe to log)
   */
  getAllMetadata(): Array<Omit<EnvironmentVariable, 'value'>> {
    return Array.from(this.variables.values()).map(v => ({
      key: v.key,
      encrypted: v.encrypted,
      sensitive: v.sensitive,
      lastAccessed: v.lastAccessed,
      accessCount: v.accessCount,
    }));
  }

  /**
   * Authorize process to access environment variables
   */
  authorizeProcess(processId: number): void {
    this.authorizedProcessIds.add(processId);
  }

  /**
   * Revoke process authorization
   */
  revokeProcess(processId: number): void {
    this.authorizedProcessIds.delete(processId);
  }

  /**
   * Check if process is authorized
   */
  isAuthorized(processId: number): boolean {
    return this.authorizedProcessIds.has(processId);
  }

  /**
   * Get access log
   */
  getAccessLog(): AccessLogEntry[] {
    return [...this.accessLog];
  }

  /**
   * Get unauthorized access attempts
   */
  getUnauthorizedAttempts(): AccessLogEntry[] {
    return this.accessLog.filter(entry => !entry.authorized);
  }

  /**
   * Clear access log
   */
  clearAccessLog(): void {
    this.accessLog = [];
  }

  /**
   * Export variables to safe format (for logging/debugging)
   * Sensitive values are masked
   */
  toSafeObject(): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, variable] of this.variables) {
      if (variable.sensitive) {
        result[key] = '***REDACTED***';
      } else {
        result[key] = variable.value;
      }
    }

    return result;
  }

  /**
   * Load variables from process.env
   */
  loadFromProcessEnv(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        this.set(key, value);
      }
    }
  }

  /**
   * Encrypt value
   */
  private encrypt(value: string): string {
    const iv = crypto.randomBytes(this.encryptionConfig.ivLength);
    const cipher = crypto.createCipheriv(
      this.encryptionConfig.algorithm,
      this.encryptionKey,
      iv
    );

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = (cipher as any).getAuthTag();

    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt value
   */
  private decrypt(encryptedValue: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      this.encryptionConfig.algorithm,
      this.encryptionKey,
      iv
    );

    (decipher as any).setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Check if key is sensitive
   */
  private isSensitive(key: string): boolean {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
  }

  /**
   * Log access attempt
   */
  private logAccess(
    key: string,
    processId: number,
    authorized: boolean,
    action: 'read' | 'write' | 'delete'
  ): void {
    this.accessLog.push({
      timestamp: new Date(),
      key,
      processId,
      authorized,
      action,
    });
  }

  /**
   * Validate that sensitive values are never logged
   */
  static validateNoSensitiveLogging(logContent: string): boolean {
    // Check if log contains patterns that look like sensitive values
    const suspiciousPatterns = [
      /sk-[a-zA-Z0-9]{32,}/,  // API keys
      /[a-zA-Z0-9]{32,}/,      // Long tokens
      /password\s*[:=]\s*\S+/i,
      /secret\s*[:=]\s*\S+/i,
      /token\s*[:=]\s*\S+/i,
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(logContent));
  }
}

/**
 * Global environment manager instance
 */
let globalInstance: EnvironmentManager | null = null;

/**
 * Get or create global environment manager
 */
export function getEnvironmentManager(masterKey?: string): EnvironmentManager {
  if (!globalInstance) {
    globalInstance = new EnvironmentManager(masterKey);
  }
  return globalInstance;
}

/**
 * Reset global instance (for testing)
 */
export function resetEnvironmentManager(): void {
  globalInstance = null;
}
