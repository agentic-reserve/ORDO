/**
 * MagicBlock Permission System
 * 
 * Implements access control using MagicBlock's Permission Program
 * Program ID: ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';

// MagicBlock Permission Program ID
export const PERMISSION_PROGRAM_ID = new PublicKey(
  process.env.MAGICBLOCK_PERMISSION_PROGRAM_ID || 
  'ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1'
);

/**
 * Permission types for access control
 */
export enum PermissionType {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  ADMIN = 'admin',
}

/**
 * Permission entry for an account
 */
export interface Permission {
  account: PublicKey;
  authority: PublicKey;
  permissionType: PermissionType;
  expiresAt?: Date;
  createdAt: Date;
}

/**
 * Access Control List (ACL) for an account
 */
export interface AccessControlList {
  account: PublicKey;
  owner: PublicKey;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission hook result
 */
export interface PermissionHookResult {
  allowed: boolean;
  reason?: string;
  permission?: Permission;
}

/**
 * MagicBlock Permission Client
 */
export class PermissionClient {
  private connection: Connection;
  private acls: Map<string, AccessControlList>;

  constructor(connection: Connection) {
    this.connection = connection;
    this.acls = new Map();
  }

  /**
   * Create a new ACL for an account
   */
  async createACL(
    account: PublicKey,
    owner: Keypair
  ): Promise<AccessControlList> {
    const acl: AccessControlList = {
      account,
      owner: owner.publicKey,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.acls.set(account.toBase58(), acl);
    return acl;
  }

  /**
   * Grant permission to an authority
   */
  async grantPermission(
    account: PublicKey,
    authority: PublicKey,
    permissionType: PermissionType,
    owner: Keypair,
    expiresAt?: Date
  ): Promise<Permission> {
    const acl = this.acls.get(account.toBase58());
    if (!acl) {
      throw new Error(`ACL not found for account ${account.toBase58()}`);
    }

    if (!acl.owner.equals(owner.publicKey)) {
      throw new Error('Only the owner can grant permissions');
    }

    const permission: Permission = {
      account,
      authority,
      permissionType,
      expiresAt,
      createdAt: new Date(),
    };

    acl.permissions.push(permission);
    acl.updatedAt = new Date();

    return permission;
  }

  /**
   * Revoke permission from an authority
   */
  async revokePermission(
    account: PublicKey,
    authority: PublicKey,
    permissionType: PermissionType,
    owner: Keypair
  ): Promise<void> {
    const acl = this.acls.get(account.toBase58());
    if (!acl) {
      throw new Error(`ACL not found for account ${account.toBase58()}`);
    }

    if (!acl.owner.equals(owner.publicKey)) {
      throw new Error('Only the owner can revoke permissions');
    }

    acl.permissions = acl.permissions.filter(
      (p) =>
        !(
          p.authority.equals(authority) &&
          p.permissionType === permissionType
        )
    );
    acl.updatedAt = new Date();
  }

  /**
   * Check if an authority has permission
   */
  async checkPermission(
    account: PublicKey,
    authority: PublicKey,
    permissionType: PermissionType
  ): Promise<PermissionHookResult> {
    const acl = this.acls.get(account.toBase58());
    if (!acl) {
      return {
        allowed: false,
        reason: 'ACL not found',
      };
    }

    // Owner always has all permissions
    if (acl.owner.equals(authority)) {
      return {
        allowed: true,
        reason: 'Owner has all permissions',
      };
    }

    // Check for specific permission
    const permission = acl.permissions.find(
      (p) =>
        p.authority.equals(authority) &&
        p.permissionType === permissionType
    );

    if (!permission) {
      return {
        allowed: false,
        reason: `No ${permissionType} permission found`,
      };
    }

    // Check expiration
    if (permission.expiresAt && permission.expiresAt < new Date()) {
      return {
        allowed: false,
        reason: 'Permission expired',
      };
    }

    return {
      allowed: true,
      permission,
    };
  }

  /**
   * Get all permissions for an account
   */
  getPermissions(account: PublicKey): Permission[] {
    const acl = this.acls.get(account.toBase58());
    return acl ? [...acl.permissions] : [];
  }

  /**
   * Get ACL for an account
   */
  getACL(account: PublicKey): AccessControlList | undefined {
    return this.acls.get(account.toBase58());
  }

  /**
   * Create permission hook instruction (to be added to your program)
   * This is a placeholder - actual implementation depends on your program structure
   */
  createPermissionHookInstruction(
    account: PublicKey,
    authority: PublicKey,
    permissionType: PermissionType
  ): TransactionInstruction {
    // This would be implemented based on your specific program's instruction format
    // For now, returning a placeholder instruction
    return new TransactionInstruction({
      keys: [
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
        { pubkey: PERMISSION_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: PERMISSION_PROGRAM_ID,
      data: Buffer.from([]), // Would contain serialized permission check data
    });
  }
}

/**
 * Create a permission client
 */
export function createPermissionClient(
  connection: Connection
): PermissionClient {
  return new PermissionClient(connection);
}
