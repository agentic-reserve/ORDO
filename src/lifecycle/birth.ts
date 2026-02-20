/**
 * Agent birth module - Create new agents with unique keypairs
 */

import { ulid } from "ulid";
import { Connection, Keypair } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import { generateAgentKeypair } from "../identity/keypair.js";
import { storeKey } from "../identity/storage.js";
import { createAgentRegistryClient } from "../registry/client.js";
import { createAgent, logAgentEvent, getAgentById } from "../database/operations.js";
import { config } from "../config.js";
import type { Agent } from "../types.js";
import type { BirthParams } from "./types.js";

/**
 * Birth an agent - Create new agent with unique keypair
 * 
 * This function:
 * 1. Generates a unique Ed25519 Solana keypair
 * 2. Assigns initial SOL balance and generation number
 * 3. Registers agent on-chain via Agent Registry
 * 4. Stores agent state in Supabase
 * 
 * @param params - Birth parameters
 * @returns The newly created agent
 */
export async function birthAgent(params: BirthParams): Promise<Agent> {
  // 1. Generate unique keypair
  const keypair = generateAgentKeypair();
  const publicKey = keypair.publicKey.toBase58();

  // 2. Determine generation number
  let generation = 0;
  let parentId: string | undefined;

  if (params.parent) {
    const parent = await getAgentById(params.parent);
    if (!parent) {
      throw new Error(`Parent agent not found: ${params.parent}`);
    }
    generation = parent.generation + 1;
    parentId = parent.id;
  }

  // 3. Create agent object
  const agent: Agent = {
    id: ulid(),
    publicKey,
    name: params.name,
    generation,
    parentId,
    childrenIds: [],

    birthDate: new Date(),
    age: 0,
    maxLifespan: config.agent.maxLifespanDays,
    status: "alive",

    balance: params.initialBalance,
    survivalTier: determineSurvivalTier(params.initialBalance),
    totalEarnings: 0,
    totalCosts: 0,

    model: "gpt-3.5-turbo",
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

  // 4. Store private key securely in Supabase
  await storeKey(keypair.secretKey, publicKey);

  // 5. Store agent in database
  const createdAgent = await createAgent(agent);

  // 6. Register agent on-chain (if configured)
  if (config.solana.rpcUrl) {
    try {
      const connection = new Connection(config.solana.rpcUrl, "confirmed");
      const wallet = new Wallet(keypair);
      const registryClient = createAgentRegistryClient(connection, wallet);

      await registryClient.registerAgent(
        keypair,
        params.name,
        `Generation ${generation} agent`,
        "", // agentUri - can be populated later
        [], // services - can be populated later
        false, // x402Support
        generation
      );
    } catch (error) {
      // Log error but don't fail birth if on-chain registration fails
      console.error("Failed to register agent on-chain:", error);
    }
  }

  // 7. Log birth event
  await logAgentEvent(createdAgent.id, "birth", {
    publicKey,
    generation,
    parentId,
    initialBalance: params.initialBalance,
    mutationRate: params.mutationRate,
  });

  return createdAgent;
}

/**
 * Determine survival tier based on balance
 */
function determineSurvivalTier(balance: number): "thriving" | "normal" | "low_compute" | "critical" | "dead" {
  if (balance >= config.economic.survivalTierThriving) {
    return "thriving";
  }
  if (balance >= config.economic.survivalTierNormal) {
    return "normal";
  }
  if (balance >= config.economic.survivalTierLow) {
    return "low_compute";
  }
  if (balance >= config.economic.survivalTierCritical) {
    return "critical";
  }
  return "dead";
}
