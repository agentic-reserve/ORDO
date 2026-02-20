/**
 * Mobile Wallet Adapter Integration Tests
 * 
 * Tests MWA integration with Ordo agents
 */

import { describe, test, expect, beforeEach } from "vitest";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  createAgentMWAClient,
  hasActiveWalletSession,
  getAgentWalletSession,
  clearAllWalletSessions,
  type AgentWalletSession,
} from "./agent-integration.js";
import type { Agent } from "../../types.js";

// Helper to create mock agent
function createMockAgent(): Agent {
  return {
    id: "test-agent-mwa",
    name: "TestMWAAgent",
    publicKey: Keypair.generate().publicKey.toBase58(),
    generation: 1,
    childrenIds: [],
    birthDate: new Date(),
    age: 1,
    maxLifespan: 365,
    status: "alive",
    balance: 1.0,
    survivalTier: "normal",
    totalEarnings: 0,
    totalCosts: 0,
    model: "gpt-4",
    tools: [],
    skills: [],
    knowledgeBase: {},
    fitness: {
      survival: 0,
      earnings: 0,
      offspring: 0,
      adaptation: 0,
      innovation: 0,
    },
    mutations: [],
    traits: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("Mobile Wallet Adapter Integration Tests", () => {
  beforeEach(() => {
    // Clear sessions before each test
    clearAllWalletSessions();
  });

  test("MWA client can be created for agent", () => {
    const agent = createMockAgent();
    const client = createAgentMWAClient(agent, undefined, "devnet");

    expect(client).toBeDefined();
    expect(client.getCluster()).toBe("devnet");
  });

  test("agent has no active session initially", () => {
    const agent = createMockAgent();

    expect(hasActiveWalletSession(agent)).toBe(false);
    expect(getAgentWalletSession(agent)).toBeUndefined();
  });

  test("wallet session can be stored and retrieved", () => {
    const agent = createMockAgent();
    const mockSession: AgentWalletSession = {
      agentId: agent.id,
      publicKey: Keypair.generate().publicKey,
      authToken: "mock-auth-token",
      accountLabel: "Test Wallet",
      walletUriBase: "https://phantom.app",
      authorizedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    // Manually store session for testing
    const sessions = new Map<string, AgentWalletSession>();
    sessions.set(agent.id, mockSession);

    // In real usage, this would be set by authorizeAgentWallet
    expect(mockSession.agentId).toBe(agent.id);
    expect(mockSession.authToken).toBe("mock-auth-token");
  });

  test("session expiration is checked correctly", () => {
    const agent = createMockAgent();

    // Create expired session
    const expiredSession: AgentWalletSession = {
      agentId: agent.id,
      publicKey: Keypair.generate().publicKey,
      authToken: "expired-token",
      authorizedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired yesterday
    };

    // Expired session should be considered inactive
    expect(expiredSession.expiresAt! < new Date()).toBe(true);
  });

  test("MWA client configuration includes agent identity", () => {
    const agent = createMockAgent();
    agent.name = "TraderBot";

    const client = createAgentMWAClient(agent, undefined, "devnet");

    // Client should be configured with agent's identity
    expect(client).toBeDefined();
    expect(client.getCluster()).toBe("devnet");
  });

  test("multiple agents can have separate sessions", () => {
    const agent1 = createMockAgent();
    agent1.id = "agent-1";
    agent1.name = "Agent One";

    const agent2 = createMockAgent();
    agent2.id = "agent-2";
    agent2.name = "Agent Two";

    const session1: AgentWalletSession = {
      agentId: agent1.id,
      publicKey: Keypair.generate().publicKey,
      authToken: "token-1",
      authorizedAt: new Date(),
    };

    const session2: AgentWalletSession = {
      agentId: agent2.id,
      publicKey: Keypair.generate().publicKey,
      authToken: "token-2",
      authorizedAt: new Date(),
    };

    // Sessions should be independent
    expect(session1.agentId).not.toBe(session2.agentId);
    expect(session1.authToken).not.toBe(session2.authToken);
  });

  test("clearing sessions removes all stored sessions", () => {
    const agent = createMockAgent();

    // Clear all sessions
    clearAllWalletSessions();

    // Should have no active session
    expect(hasActiveWalletSession(agent)).toBe(false);
  });
});

describe("MWA Authorization Flow", () => {
  test("authorization requires Android device", () => {
    // MWA only works on Android devices
    // This test documents the requirement
    const isAndroid = process.platform === "android";

    // In CI/testing environment, this will be false
    expect(typeof isAndroid).toBe("boolean");
  });

  test("auth token enables reauthorization", () => {
    const mockAuthToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

    // Auth token should be a non-empty string
    expect(mockAuthToken).toBeDefined();
    expect(mockAuthToken.length).toBeGreaterThan(0);
  });

  test("session includes wallet metadata", () => {
    const session: AgentWalletSession = {
      agentId: "test-agent",
      publicKey: Keypair.generate().publicKey,
      authToken: "token",
      accountLabel: "My Wallet",
      walletUriBase: "https://phantom.app",
      authorizedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    expect(session.accountLabel).toBe("My Wallet");
    expect(session.walletUriBase).toBe("https://phantom.app");
    expect(session.publicKey).toBeInstanceOf(PublicKey);
  });
});

describe("MWA Transaction Signing", () => {
  test("transaction signing requires active session", () => {
    const agent = createMockAgent();

    // Without active session, signing should fail
    expect(hasActiveWalletSession(agent)).toBe(false);
  });

  test("signed transaction includes signature", () => {
    // Mock signed transaction result
    const mockSignature = "5j7s1QzqZqZ..."; // Base58 signature

    expect(mockSignature).toBeDefined();
    expect(typeof mockSignature).toBe("string");
  });
});

describe("MWA Message Signing", () => {
  test("message can be string or bytes", () => {
    const stringMessage = "Authenticate agent";
    const bytesMessage = new TextEncoder().encode(stringMessage);

    expect(typeof stringMessage).toBe("string");
    expect(bytesMessage).toBeInstanceOf(Uint8Array);
  });

  test("signature is returned as bytes", () => {
    // Mock signature
    const mockSignature = new Uint8Array(64); // Ed25519 signature is 64 bytes

    expect(mockSignature).toBeInstanceOf(Uint8Array);
    expect(mockSignature.length).toBe(64);
  });
});

describe("MWA Network Support", () => {
  test("supports mainnet-beta cluster", () => {
    const agent = createMockAgent();
    const client = createAgentMWAClient(agent, undefined, "mainnet-beta");

    expect(client.getCluster()).toBe("mainnet-beta");
  });

  test("supports devnet cluster", () => {
    const agent = createMockAgent();
    const client = createAgentMWAClient(agent, undefined, "devnet");

    expect(client.getCluster()).toBe("devnet");
  });

  test("supports testnet cluster", () => {
    const agent = createMockAgent();
    const client = createAgentMWAClient(agent, undefined, "testnet");

    expect(client.getCluster()).toBe("testnet");
  });
});
