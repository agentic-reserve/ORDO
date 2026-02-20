/**
 * Tools Manager
 *
 * Manages installation and configuration of external tools and MCP servers.
 */

import type {
  ExecutionClient,
  OrdoDatabase,
  InstalledTool,
} from "../types/index.js";
import { logModification } from "./audit-log.js";
import { ulid } from "ulid";

/**
 * Install an npm package globally in the sandbox.
 */
export async function installNpmPackage(
  client: ExecutionClient,
  db: OrdoDatabase,
  packageName: string,
): Promise<{ success: boolean; error?: string }> {
  // Sanitize package name (prevent command injection)
  if (!/^[@a-zA-Z0-9._/-]+$/.test(packageName)) {
    return {
      success: false,
      error: `Invalid package name: ${packageName}`,
    };
  }

  const result = await client.exec(
    `npm install -g ${packageName}`,
    120000,
  );

  if (result.exitCode !== 0) {
    return {
      success: false,
      error: `npm install failed: ${result.stderr}`,
    };
  }

  // Record in database
  const tool: InstalledTool = {
    id: ulid(),
    agentId: 'system', // Will be set by caller
    name: packageName,
    type: "npm",
    version: 'latest',
    installedAt: new Date(),
    config: { source: "npm", installCommand: `npm install -g ${packageName}` },
  };

  await db.saveInstalledTool(tool);

  logModification(db, "tool_install", `Installed npm package: ${packageName}`, {
    reversible: true,
  });

  return { success: true };
}

/**
 * Install an MCP server.
 * Agents can add new capabilities by installing MCP servers.
 */
export async function installMcpServer(
  client: ExecutionClient,
  db: OrdoDatabase,
  name: string,
  command: string,
  args?: string[],
  env?: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  // Record in database
  const tool: InstalledTool = {
    id: ulid(),
    agentId: 'system', // Will be set by caller
    name: `mcp:${name}`,
    type: "mcp",
    version: '1.0.0',
    installedAt: new Date(),
    config: { command, args, env },
  };

  await db.saveInstalledTool(tool);

  logModification(
    db,
    "mcp_install",
    `Installed MCP server: ${name} (${command})`,
    { reversible: true },
  );

  return { success: true };
}

/**
 * List all installed tools.
 */
export function listInstalledTools(
  db: OrdoDatabase,
): InstalledTool[] {
  return db.getInstalledTools();
}

/**
 * Remove (disable) an installed tool.
 */
export async function removeTool(
  db: OrdoDatabase,
  toolId: string,
): Promise<void> {
  await db.removeTool(toolId);
  logModification(db, "tool_install", `Removed tool: ${toolId}`, {
    reversible: true,
  });
}
