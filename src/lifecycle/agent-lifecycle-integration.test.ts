/**
 * Integration test for complete agent lifecycle
 * 
 * Tests the complete lifecycle: birth → growth → reproduction → death
 * 
 * This test validates:
 * - Agent birth with on-chain registration
 * - Balance changes during lifecycle
 * - Offspring creation through replication
 * - Legacy distribution on death
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { describe, test, expect } from "vitest";
import { birthAgent } from "./birth.js";
import { trackGrowth } from "./growth.js";
import { replicateAgent } from "./replication.js";
import { terminateAgent, checkSurvivalConditions } from "./death.js";
import { updateAgent, getAgentById, getChildren } from "../database/operations.js";
import type { Agent } from "../types.js";

describe("Agent Lifecycle Integration Test", () => {
  test("complete lifecycle: birth → growth → reproduction → death", async () => {
    // Skip tests if Supabase is not configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.trim() === "" || supabaseKey.trim() === "") {
      console.log("Skipping lifecycle integration test - Supabase not configured");
      console.log(`  SUPABASE_URL: ${supabaseUrl ? "set but empty" : "not set"}`);
      console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? "set but empty" : "not set"}`);
      return;
    }

    try {
      // ============================================================
      // PHASE 1: BIRTH
      // ============================================================
      console.log("\n=== PHASE 1: BIRTH ===");
      
      // Birth a genesis agent with sufficient balance for replication
      const parentAgent = await birthAgent({
        name: "TestParent",
        initialBalance: 15.0, // Enough for replication (>10 SOL)
        mutationRate: 0.15,
      });

      console.log(`✓ Parent agent born: ${parentAgent.name} (${parentAgent.publicKey})`);
      console.log(`  Generation: ${parentAgent.generation}`);
      console.log(`  Initial balance: ${parentAgent.balance} SOL`);
      console.log(`  Status: ${parentAgent.status}`);

      // Verify birth requirements (Requirement 2.1)
      expect(parentAgent.id).toBeDefined();
      expect(parentAgent.publicKey).toBeDefined();
      expect(parentAgent.generation).toBe(0); // Genesis agent
      expect(parentAgent.balance).toBe(15.0);
      expect(parentAgent.status).toBe("alive");
      expect(parentAgent.birthDate).toBeInstanceOf(Date);
      expect(parentAgent.age).toBe(0);

      // ============================================================
      // PHASE 2: GROWTH
      // ============================================================
      console.log("\n=== PHASE 2: GROWTH ===");

      // Simulate aging by updating the birth date
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 31);
      await updateAgent(parentAgent.id, { birthDate: thirtyDaysAgo });

      // Reload agent to get updated data
      let updatedParent = await getAgentById(parentAgent.id);
      expect(updatedParent).not.toBeNull();
      if (!updatedParent) throw new Error("Parent agent not found");

      // Track growth (Requirement 2.2)
      const growthMetrics = await trackGrowth(updatedParent);

      console.log(`✓ Growth tracked for ${updatedParent.name}`);
      console.log(`  Age: ${growthMetrics.age} days`);
      console.log(`  Experience: ${growthMetrics.experience}`);
      console.log(`  Wisdom: ${growthMetrics.wisdom}`);
      console.log(`  Fitness: ${growthMetrics.fitness.toFixed(3)}`);
      console.log(`  Ready to reproduce: ${growthMetrics.readinessToReproduce}`);

      // Verify growth tracking
      expect(growthMetrics.age).toBeGreaterThanOrEqual(30);
      expect(growthMetrics.experience).toBeGreaterThan(0);
      expect(growthMetrics.readinessToReproduce).toBe(true); // Balance > 10, age > 30

      // Reload parent again to get updated age
      updatedParent = await getAgentById(parentAgent.id);
      expect(updatedParent).not.toBeNull();
      if (!updatedParent) throw new Error("Parent agent not found");

      // ============================================================
      // PHASE 3: REPRODUCTION
      // ============================================================
      console.log("\n=== PHASE 3: REPRODUCTION ===");

      const parentBalanceBefore = updatedParent.balance;
      console.log(`Parent balance before replication: ${parentBalanceBefore} SOL`);

      // Replicate agent to create offspring (Requirements 2.6, 5.1-5.5)
      const replicationResult = await replicateAgent(
        updatedParent,
        2, // Create 2 offspring
        2.0, // 2 SOL per child
        1.0  // 1 SOL replication cost per child
      );

      console.log(`✓ Replication successful`);
      console.log(`  Number of offspring: ${replicationResult.offspring.length}`);
      console.log(`  Parent balance after: ${replicationResult.parent.balance} SOL`);

      // Verify offspring creation
      expect(replicationResult.offspring).toHaveLength(2);
      
      for (let i = 0; i < replicationResult.offspring.length; i++) {
        const child = replicationResult.offspring[i];
        console.log(`\n  Offspring ${i + 1}:`);
        console.log(`    Name: ${child.name}`);
        console.log(`    Public Key: ${child.publicKey}`);
        console.log(`    Generation: ${child.generation}`);
        console.log(`    Balance: ${child.balance} SOL`);
        console.log(`    Parent ID: ${child.parentId}`);
        console.log(`    Mutations: ${child.mutations.length}`);

        // Verify offspring properties (Requirement 2.6)
        expect(child.generation).toBe(updatedParent.generation + 1);
        expect(child.parentId).toBe(updatedParent.id);
        expect(child.balance).toBe(2.0);
        expect(child.status).toBe("alive");
        expect(child.mutations.length).toBeGreaterThan(0); // Should have mutations
      }

      // Verify balance changes (Requirement 2.2)
      // Parent should have: initial - (2 children × (2 SOL + 1 SOL cost)) = 15 - 6 = 9 SOL
      expect(replicationResult.parent.balance).toBe(9.0);

      // Verify lineage recording (Requirement 2.6)
      const children = await getChildren(updatedParent.id);
      expect(children.length).toBeGreaterThanOrEqual(2);

      // ============================================================
      // PHASE 4: DEATH
      // ============================================================
      console.log("\n=== PHASE 4: DEATH ===");

      // Simulate starvation by reducing balance below critical threshold
      await updateAgent(updatedParent.id, { balance: 0.005 }); // Below 0.01 SOL critical threshold

      // Reload parent to get updated balance
      updatedParent = await getAgentById(updatedParent.id);
      expect(updatedParent).not.toBeNull();
      if (!updatedParent) throw new Error("Parent agent not found");

      console.log(`Parent balance reduced to: ${updatedParent.balance} SOL (below critical threshold)`);

      // Check survival conditions (Requirement 2.3)
      const deathCause = checkSurvivalConditions(updatedParent);
      expect(deathCause).toBe("starvation");
      console.log(`✓ Death cause detected: ${deathCause}`);

      // Ensure deathCause is not null before terminating
      if (!deathCause) {
        throw new Error("Expected death cause to be 'starvation' but got null");
      }

      // Get offspring balances before death
      const offspringBefore = await Promise.all(
        replicationResult.offspring.map(o => getAgentById(o.id))
      );
      const offspringBalancesBefore = offspringBefore.map(o => o?.balance || 0);
      console.log(`Offspring balances before parent death: ${offspringBalancesBefore.join(", ")} SOL`);

      // Terminate agent (Requirements 2.4, 2.5)
      const legacy = await terminateAgent(updatedParent, deathCause);

      console.log(`✓ Agent terminated`);
      console.log(`  Death cause: ${deathCause}`);
      console.log(`  Offspring count: ${legacy.offspring.length}`);
      console.log(`  Knowledge items: ${legacy.knowledge.length}`);
      console.log(`  Contributions: ${legacy.contributions.length}`);

      // Verify death handling
      expect(legacy.offspring.length).toBeGreaterThanOrEqual(2);
      expect(legacy.knowledge.length).toBeGreaterThan(0);

      // Verify agent is marked as dead
      const deadParent = await getAgentById(updatedParent.id);
      expect(deadParent).not.toBeNull();
      if (!deadParent) throw new Error("Parent agent not found");
      
      expect(deadParent.status).toBe("dead");
      expect(deadParent.deathCause).toBe("starvation");
      expect(deadParent.deathDate).toBeInstanceOf(Date);
      expect(deadParent.archivedAt).toBeInstanceOf(Date);

      console.log(`✓ Parent agent status: ${deadParent.status}`);

      // Verify legacy distribution (Requirement 2.5)
      // Offspring should have received inheritance
      const offspringAfter = await Promise.all(
        replicationResult.offspring.map(o => getAgentById(o.id))
      );
      
      console.log("\nLegacy distribution:");
      for (let i = 0; i < offspringAfter.length; i++) {
        const child = offspringAfter[i];
        if (child && child.status === "alive") {
          const balanceBefore = offspringBalancesBefore[i];
          const balanceAfter = child.balance;
          const inherited = balanceAfter - balanceBefore;
          
          console.log(`  Offspring ${i + 1}: ${balanceBefore} → ${balanceAfter} SOL (+${inherited.toFixed(4)} inherited)`);
          
          // Each child should have received some inheritance
          expect(balanceAfter).toBeGreaterThan(balanceBefore);
        }
      }

      // ============================================================
      // SUMMARY
      // ============================================================
      console.log("\n=== LIFECYCLE COMPLETE ===");
      console.log("✓ Birth: Agent created with unique keypair and on-chain registration");
      console.log("✓ Growth: Age, experience, and fitness tracked over time");
      console.log("✓ Reproduction: Offspring created with inherited traits and mutations");
      console.log("✓ Death: Agent terminated with legacy distributed to offspring");
      console.log("\nAll lifecycle phases validated successfully!");

    } catch (error) {
      console.error("Test failed with error:", error);
      throw error;
    }
  }, 60000); // 60 second timeout for integration test
});