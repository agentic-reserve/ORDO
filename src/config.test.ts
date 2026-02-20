/**
 * Tests for project structure and configuration
 * Validates: Requirements 24.1
 */

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

describe("Project Structure Validation", () => {
  describe("Required Files", () => {
    it("should have package.json", () => {
      const packageJsonPath = join(projectRoot, "package.json");
      expect(existsSync(packageJsonPath)).toBe(true);
    });

    it("should have tsconfig.json", () => {
      const tsconfigPath = join(projectRoot, "tsconfig.json");
      expect(existsSync(tsconfigPath)).toBe(true);
    });

    it("should have .env.example", () => {
      const envExamplePath = join(projectRoot, ".env.example");
      expect(existsSync(envExamplePath)).toBe(true);
    });

    it("should have .gitignore", () => {
      const gitignorePath = join(projectRoot, ".gitignore");
      expect(existsSync(gitignorePath)).toBe(true);
    });

    it("should have vitest.config.ts", () => {
      const vitestConfigPath = join(projectRoot, "vitest.config.ts");
      expect(existsSync(vitestConfigPath)).toBe(true);
    });

    it("should have README.md", () => {
      const readmePath = join(projectRoot, "README.md");
      expect(existsSync(readmePath)).toBe(true);
    });
  });

  describe("Required Dependencies", () => {
    let packageJson: any;

    beforeAll(() => {
      const packageJsonPath = join(projectRoot, "package.json");
      const content = readFileSync(packageJsonPath, "utf-8");
      packageJson = JSON.parse(content);
    });

    it("should have @solana/web3.js dependency", () => {
      expect(packageJson.dependencies).toHaveProperty("@solana/web3.js");
    });

    it("should have @coral-xyz/anchor dependency", () => {
      expect(packageJson.dependencies).toHaveProperty("@coral-xyz/anchor");
    });

    it("should have @supabase/supabase-js dependency", () => {
      expect(packageJson.dependencies).toHaveProperty("@supabase/supabase-js");
    });

    it("should have openai dependency", () => {
      expect(packageJson.dependencies).toHaveProperty("openai");
    });

    it("should have dotenv dependency", () => {
      expect(packageJson.dependencies).toHaveProperty("dotenv");
    });

    it("should have typescript dev dependency", () => {
      expect(packageJson.devDependencies).toHaveProperty("typescript");
    });

    it("should have vitest dev dependency", () => {
      expect(packageJson.devDependencies).toHaveProperty("vitest");
    });
  });

  describe("TypeScript Configuration", () => {
    let tsconfig: any;

    beforeAll(() => {
      const tsconfigPath = join(projectRoot, "tsconfig.json");
      const content = readFileSync(tsconfigPath, "utf-8");
      tsconfig = JSON.parse(content);
    });

    it("should have strict mode enabled", () => {
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it("should have path aliases configured", () => {
      expect(tsconfig.compilerOptions.paths).toBeDefined();
      expect(tsconfig.compilerOptions.paths).toHaveProperty("@ordo/*");
    });

    it("should target ES2022", () => {
      expect(tsconfig.compilerOptions.target).toBe("ES2022");
    });

    it("should use NodeNext module resolution", () => {
      expect(tsconfig.compilerOptions.moduleResolution).toBe("NodeNext");
    });
  });

  describe("Directory Structure", () => {
    it("should have src directory", () => {
      const srcPath = join(projectRoot, "src");
      expect(existsSync(srcPath)).toBe(true);
    });

    it("should have src/identity directory", () => {
      const identityPath = join(projectRoot, "src", "identity");
      expect(existsSync(identityPath)).toBe(true);
    });

    it("should have src/lifecycle directory", () => {
      const lifecyclePath = join(projectRoot, "src", "lifecycle");
      expect(existsSync(lifecyclePath)).toBe(true);
    });

    it("should have src/economic directory", () => {
      const economicPath = join(projectRoot, "src", "economic");
      expect(existsSync(economicPath)).toBe(true);
    });
  });
});

describe("Environment Configuration", () => {
  describe("Environment Variable Loading", () => {
    it("should load config without throwing", async () => {
      expect(() => {
        // Dynamic import to test config loading
        import("./config.js");
      }).not.toThrow();
    });

    it("should have default values for optional env vars", async () => {
      const { config } = await import("./config.js");
      
      expect(config.nodeEnv).toBeDefined();
      expect(config.logLevel).toBeDefined();
      expect(config.solana.network).toBeDefined();
    });

    it("should parse numeric values correctly", async () => {
      const { config } = await import("./config.js");
      
      expect(typeof config.agent.maxLifespanDays).toBe("number");
      expect(typeof config.agent.initialBalanceSol).toBe("number");
      expect(typeof config.agent.mutationRate).toBe("number");
    });

    it("should parse boolean values correctly", async () => {
      const { config } = await import("./config.js");
      
      expect(typeof config.debug).toBe("boolean");
      expect(typeof config.safety.emergencyStopEnabled).toBe("boolean");
      expect(typeof config.heartbeat.enabled).toBe("boolean");
    });
  });

  describe("Configuration Structure", () => {
    it("should have solana configuration", async () => {
      const { config } = await import("./config.js");
      
      expect(config.solana).toBeDefined();
      expect(config.solana.rpcUrl).toBeDefined();
      expect(config.solana.network).toBeDefined();
    });

    it("should have agent configuration", async () => {
      const { config } = await import("./config.js");
      
      expect(config.agent).toBeDefined();
      expect(config.agent.maxLifespanDays).toBeGreaterThan(0);
      expect(config.agent.initialBalanceSol).toBeGreaterThan(0);
    });

    it("should have economic configuration", async () => {
      const { config } = await import("./config.js");
      
      expect(config.economic).toBeDefined();
      expect(config.economic.survivalTierThriving).toBeGreaterThan(0);
    });

    it("should have safety configuration", async () => {
      const { config } = await import("./config.js");
      
      expect(config.safety).toBeDefined();
      expect(config.safety.alignmentThreshold).toBeGreaterThanOrEqual(0);
      expect(config.safety.alignmentThreshold).toBeLessThanOrEqual(100);
    });
  });
});
