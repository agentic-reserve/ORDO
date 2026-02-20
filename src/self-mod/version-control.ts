/**
 * Version Control for Modifications
 * 
 * Integrates git for code versioning and tracks modification history.
 */

import type {
  OrdoDatabase,
  ExecutionClient,
  SelfModification,
} from "../types/index.js";
import { logModification } from "./audit-log.js";
import type { ModificationTestResult } from "./test-environment.js";
import { ulid } from "ulid";

export interface ModificationVersion {
  id: string;
  modificationId: string;
  commitHash?: string;
  commitMessage: string;
  timestamp: Date;
  modification: SelfModification;
  testResult?: ModificationTestResult;
  applied: boolean;
  rolledBack: boolean;
  performanceDelta?: {
    speedChange: number;
    costChange: number;
    successRateChange: number;
  };
}

export interface GitCommitMetadata {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  filesChanged: string[];
}

export async function commitModification(
  client: ExecutionClient,
  modification: SelfModification,
  testResult: ModificationTestResult,
): Promise<{ success: boolean; commitHash?: string; error?: string }> {
  try {
    const stageResult = await client.exec("git add -A", 10000);
    if (stageResult.exitCode !== 0) {
      return {
        success: false,
        error: `Failed to stage changes: ${stageResult.stderr}`,
      };
    }

    const commitMessage = formatCommitMessage(modification, testResult);
    const commitResult = await client.exec(
      `git commit -m "${escapeForShell(commitMessage)}"`,
      10000,
    );

    if (commitResult.exitCode !== 0) {
      if (commitResult.stdout.includes("nothing to commit")) {
        return { success: true, commitHash: undefined };
      }
      return {
        success: false,
        error: `Failed to commit: ${commitResult.stderr}`,
      };
    }

    const hashResult = await client.exec("git rev-parse HEAD", 5000);
    if (hashResult.exitCode !== 0) {
      return {
        success: false,
        error: `Failed to get commit hash: ${hashResult.stderr}`,
      };
    }

    return {
      success: true,
      commitHash: hashResult.stdout.trim(),
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Git commit failed: ${err.message}`,
    };
  }
}

function formatCommitMessage(
  modification: SelfModification,
  testResult: ModificationTestResult,
): string {
  const lines: string[] = [];
  lines.push(`[self-mod] ${modification.type}: ${modification.target}`);
  lines.push("");
  lines.push(`Hypothesis: ${modification.hypothesis}`);
  lines.push(`Change: ${modification.change}`);
  lines.push("");
  lines.push(`Test Result: ${testResult.recommendation}`);
  lines.push(`Reasoning: ${testResult.reasoning}`);
  lines.push("");
  const impact = testResult.performanceImpact;
  lines.push("Performance Impact:");
  lines.push(`  Speed: ${impact.speedChange.toFixed(1)}%`);
  lines.push(`  Cost: ${impact.costChange.toFixed(1)}%`);
  lines.push(`  Success Rate: ${impact.successRateChange.toFixed(1)}pp`);
  lines.push("");
  lines.push(`Modification ID: ${testResult.modificationId}`);
  lines.push(`Test Duration: ${testResult.testDurationMs}ms`);
  return lines.join("\n");
}

function escapeForShell(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export async function storeModificationVersion(
  db: OrdoDatabase,
  modification: SelfModification,
  testResult: ModificationTestResult,
  commitHash?: string,
  applied: boolean = false,
): Promise<ModificationVersion> {
  const version: ModificationVersion = {
    id: ulid(),
    modificationId: testResult.modificationId,
    commitHash,
    commitMessage: formatCommitMessage(modification, testResult),
    timestamp: new Date(),
    modification,
    testResult,
    applied,
    rolledBack: false,
    performanceDelta: {
      speedChange: testResult.performanceImpact.speedChange,
      costChange: testResult.performanceImpact.costChange,
      successRateChange: testResult.performanceImpact.successRateChange,
    },
  };

  await db.saveModification(version as any);

  logModification(
    db,
    "code_edit",
    `Versioned modification: ${modification.type} on ${modification.target}`,
    {
      filePath: modification.target,
      diff: commitHash ? `git show ${commitHash}` : undefined,
      reversible: true,
    },
  );

  return version;
}

export async function getModificationVersion(
  db: OrdoDatabase,
  versionId: string,
): Promise<ModificationVersion | null> {
  const mod = await db.getModificationById(versionId);
  return mod as any;
}

export async function getModificationGitLog(
  client: ExecutionClient,
  limit: number = 20,
): Promise<GitCommitMetadata[]> {
  try {
    const logResult = await client.exec(
      `git log --grep="\\[self-mod\\]" -n ${limit} --format="%H|%an|%ai|%s"`,
      10000,
    );

    if (logResult.exitCode !== 0) {
      return [];
    }

    const commits: GitCommitMetadata[] = [];
    const lines = logResult.stdout.trim().split("\n");

    for (const line of lines) {
      if (!line) continue;

      const [hash, author, timestamp, ...messageParts] = line.split("|");
      const message = messageParts.join("|");

      const filesResult = await client.exec(
        `git diff-tree --no-commit-id --name-only -r ${hash}`,
        5000,
      );

      const filesChanged =
        filesResult.exitCode === 0
          ? filesResult.stdout.trim().split("\n").filter(Boolean)
          : [];

      commits.push({
        hash,
        author,
        timestamp: new Date(timestamp),
        message,
        filesChanged,
      });
    }

    return commits;
  } catch {
    return [];
  }
}

export async function tagModification(
  client: ExecutionClient,
  modification: SelfModification,
  version: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const tagName = `mod-${modification.type}-${version}`;
    const tagMessage = `Modification: ${modification.hypothesis}`;

    const tagResult = await client.exec(
      `git tag -a ${tagName} -m "${escapeForShell(tagMessage)}"`,
      10000,
    );

    if (tagResult.exitCode !== 0) {
      return {
        success: false,
        error: `Failed to create tag: ${tagResult.stderr}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Tag creation failed: ${err.message}`,
    };
  }
}

export async function getCommitDiff(
  client: ExecutionClient,
  commitHash: string,
): Promise<{ success: boolean; diff?: string; error?: string }> {
  try {
    const diffResult = await client.exec(`git show ${commitHash}`, 10000);

    if (diffResult.exitCode !== 0) {
      return {
        success: false,
        error: `Failed to get diff: ${diffResult.stderr}`,
      };
    }

    return {
      success: true,
      diff: diffResult.stdout,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to get diff: ${err.message}`,
    };
  }
}

export async function isGitClean(
  client: ExecutionClient,
): Promise<{ clean: boolean; status?: string }> {
  try {
    const statusResult = await client.exec("git status --porcelain", 5000);

    if (statusResult.exitCode !== 0) {
      return { clean: false, status: "Git status check failed" };
    }

    const clean = statusResult.stdout.trim().length === 0;

    return {
      clean,
      status: clean ? "Working tree clean" : statusResult.stdout,
    };
  } catch (err: any) {
    return { clean: false, status: `Git check failed: ${err.message}` };
  }
}
