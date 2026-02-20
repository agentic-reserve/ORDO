/**
 * Ordo Execution Client Interface
 * Independent execution abstraction for the Ordo platform
 */

/**
 * Command execution result
 */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

/**
 * File operation result
 */
export interface FileOperationResult {
  success: boolean;
  path: string;
  error?: string;
}

/**
 * Git commit result
 */
export interface GitCommitResult {
  success: boolean;
  commitHash?: string;
  message: string;
  error?: string;
}

/**
 * Execution Client Interface
 * Provides file operations, command execution, and git operations
 */
export interface ExecutionClient {
  // File operations
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<FileOperationResult>;
  deleteFile(path: string): Promise<FileOperationResult>;
  fileExists(path: string): Promise<boolean>;
  listFiles(directory: string): Promise<string[]>;
  getFileSize(path: string): Promise<number>;

  // Command execution
  exec(command: string, timeoutMs?: number): Promise<ExecResult>;
  execInDirectory(command: string, directory: string, timeoutMs?: number): Promise<ExecResult>;

  // Git operations
  gitCommit(message: string, type: string): Promise<GitCommitResult>;
  gitStatus(): Promise<{ modified: string[]; added: string[]; deleted: string[] }>;
  gitDiff(filePath?: string): Promise<string>;
  gitLog(limit?: number): Promise<Array<{ hash: string; message: string; date: Date }>>;
  gitCheckout(branch: string): Promise<{ success: boolean; error?: string }>;
  gitCreateBranch(branchName: string): Promise<{ success: boolean; error?: string }>;

  // Environment operations
  getEnvVar(key: string): string | undefined;
  setEnvVar(key: string, value: string): void;

  // Process operations
  getWorkingDirectory(): string;
  setWorkingDirectory(path: string): void;
}

/**
 * Mock Execution Client for testing
 */
export class MockExecutionClient implements ExecutionClient {
  private files: Map<string, string> = new Map();
  private envVars: Map<string, string> = new Map();
  private workingDir: string = '/mock';

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<FileOperationResult> {
    this.files.set(path, content);
    return { success: true, path };
  }

  async deleteFile(path: string): Promise<FileOperationResult> {
    this.files.delete(path);
    return { success: true, path };
  }

  async fileExists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async listFiles(directory: string): Promise<string[]> {
    return Array.from(this.files.keys()).filter((p) => p.startsWith(directory));
  }

  async getFileSize(path: string): Promise<number> {
    const content = this.files.get(path);
    return content ? Buffer.byteLength(content, 'utf8') : 0;
  }

  async exec(command: string, timeoutMs?: number): Promise<ExecResult> {
    return {
      stdout: `Mock execution of: ${command}`,
      stderr: '',
      exitCode: 0,
      duration: 10,
    };
  }

  async execInDirectory(
    command: string,
    directory: string,
    timeoutMs?: number
  ): Promise<ExecResult> {
    return this.exec(command, timeoutMs);
  }

  async gitCommit(message: string, type: string): Promise<GitCommitResult> {
    return {
      success: true,
      commitHash: `mock-${Date.now()}`,
      message,
    };
  }

  async gitStatus(): Promise<{ modified: string[]; added: string[]; deleted: string[] }> {
    return { modified: [], added: [], deleted: [] };
  }

  async gitDiff(filePath?: string): Promise<string> {
    return 'Mock git diff';
  }

  async gitLog(
    limit?: number
  ): Promise<Array<{ hash: string; message: string; date: Date }>> {
    return [];
  }

  async gitCheckout(branch: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  async gitCreateBranch(branchName: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  getEnvVar(key: string): string | undefined {
    return this.envVars.get(key);
  }

  setEnvVar(key: string, value: string): void {
    this.envVars.set(key, value);
  }

  getWorkingDirectory(): string {
    return this.workingDir;
  }

  setWorkingDirectory(path: string): void {
    this.workingDir = path;
  }
}
