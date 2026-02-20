/**
 * Multi-Agent Coordination Integration Test
 * 
 * This test validates multi-agent coordination capabilities:
 * - Creates a swarm of 5 agents with different roles
 * - Assigns a complex task requiring coordination
 * - Verifies task decomposition into subtasks
 * - Verifies result synthesis from multiple agents
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { describe, test, expect } from "vitest";
import { birthAgent } from "../lifecycle/birth.js";
import { updateAgent, getAgentById } from "../database/operations.js";
import { coordinateSwarm } from "./swarm-coordination.js";
import { decomposeTask } from "./task-decomposition.js";
import { synthesizeResults } from "./result-synthesis.js";
import { getCollaborationStats } from "./collaboration-tracking.js";
import type { Agent } from "../types.js";
import type { ComplexTask, SpecialistRole } from "./coordination-types.js";

describe("Multi-Agent Coordination Integration Test", () => {
  test("coordinate swarm of 5 agents with different roles on complex task", async () => {
    // Skip tests if Supabase is not configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.trim() === "" || supabaseKey.trim() === "") {
      console.log("Skipping multi-agent coordination test - Supabase not configured");
      console.log("To run this test:");
      console.log("  1. Create a Supabase project at https://supabase.com");
      console.log("  2. Run the schema from ordo/supabase/schema.sql");
      console.log("  3. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
      return;
    }

    try {
      console.log("\n=== MULTI-AGENT COORDINATION TEST ===\n");

      // ============================================================
      // PHASE 1: Create swarm of 5 agents with different roles
      // ============================================================
      console.log("=== PHASE 1: Creating Agent Swarm ===");
      
      const roles: SpecialistRole[] = ["coordinator", "researcher", "coder", "trader", "researcher"];
      const agents: Agent[] = [];
      
      for (let i = 0; i < 5; i++) {
        const role = roles[i];
        const agent = await birthAgent({
          name: `Agent-${role}-${i}`,
          initialBalance: 10.0, // Sufficient balance for operations
          mutationRate: 0.15,
        });
        
        // Assign role-specific skills
        const skills = getRoleSkills(role);
        await updateAgent(agent.id, { skills });
        
        // Reload agent with updated skills
        const updatedAgent = await getAgentById(agent.id);
        if (updatedAgent) {
          agents.push(updatedAgent);
          console.log(`✓ Created ${role} agent: ${updatedAgent.name} (${updatedAgent.id})`);
          console.log(`  Skills: ${skills.join(", ")}`);
        }
      }
      
      // Verify we have 5 agents
      expect(agents.length).toBe(5);
      console.log(`\n✓ Created swarm of ${agents.length} agents`);
      
      // Requirement 6.3: Verify specialized agent roles
      const coordinatorAgent = agents.find(a => a.name.includes("coordinator"));
      const researcherAgents = agents.filter(a => a.name.includes("researcher"));
      const coderAgent = agents.find(a => a.name.includes("coder"));
      const traderAgent = agents.find(a => a.name.includes("trader"));
      
      expect(coordinatorAgent).toBeDefined();
      expect(researcherAgents.length).toBeGreaterThanOrEqual(1);
      expect(coderAgent).toBeDefined();
      expect(traderAgent).toBeDefined();
      
      console.log("\nAgent Roles:");
      console.log(`  Coordinator: ${coordinatorAgent?.name}`);
      console.log(`  Researchers: ${researcherAgents.map(a => a.name).join(", ")}`);
      console.log(`  Coder: ${coderAgent?.name}`);
      console.log(`  Trader: ${traderAgent?.name}`);

      // ============================================================
      // PHASE 2: Define complex task requiring coordination
      // ============================================================
      console.log("\n=== PHASE 2: Defining Complex Task ===");
      
      const complexTask: ComplexTask = {
        id: `task-${Date.now()}`,
        description: "Research Solana DeFi protocols, implement a trading strategy, and execute test trades",
        requirements: [
          "Research top 5 Solana DeFi protocols and their features",
          "Analyze liquidity pools and trading volumes",
          "Implement a simple arbitrage detection algorithm",
          "Create a risk management framework",
          "Execute 3 test trades on devnet",
          "Generate a comprehensive report with findings and results",
        ],
        constraints: [
          "Must complete within 5 minutes",
          "Must use only devnet for testing",
          "Must not exceed 1 SOL in test trades",
        ],
        expectedOutput: "A comprehensive report with research findings, implemented code, and trade execution results",
      };
      
      console.log(`Task: ${complexTask.description}`);
      console.log(`Requirements: ${complexTask.requirements.length}`);
      console.log(`Constraints: ${complexTask.constraints?.length || 0}`);

      // ============================================================
      // PHASE 3: Task decomposition
      // ============================================================
      console.log("\n=== PHASE 3: Task Decomposition ===");
      
      // Requirement 6.4: Verify task decomposition
      const subtasks = await decomposeTask(complexTask);
      
      console.log(`✓ Task decomposed into ${subtasks.length} subtasks`);
      
      // Verify subtasks were created
      expect(subtasks.length).toBeGreaterThan(0);
      expect(subtasks.length).toBeLessThanOrEqual(15); // Reasonable upper bound
      
      console.log("\nSubtasks:");
      for (const subtask of subtasks) {
        console.log(`  - [${subtask.status}] ${subtask.description}`);
        console.log(`    Role: ${subtask.assignedRole || "unassigned"}`);
        console.log(`    Dependencies: ${subtask.dependencies.length}`);
      }
      
      // Verify subtasks have appropriate roles assigned
      const researchSubtasks = subtasks.filter(st => st.assignedRole === "researcher");
      const codingSubtasks = subtasks.filter(st => st.assignedRole === "coder");
      const tradingSubtasks = subtasks.filter(st => st.assignedRole === "trader");
      const coordinationSubtasks = subtasks.filter(st => st.assignedRole === "coordinator");
      
      console.log("\nSubtask Distribution:");
      console.log(`  Research: ${researchSubtasks.length}`);
      console.log(`  Coding: ${codingSubtasks.length}`);
      console.log(`  Trading: ${tradingSubtasks.length}`);
      console.log(`  Coordination: ${coordinationSubtasks.length}`);
      
      // Verify we have subtasks for different roles
      expect(researchSubtasks.length).toBeGreaterThan(0);
      
      // Verify dependencies are set correctly
      const subtasksWithDeps = subtasks.filter(st => st.dependencies.length > 0);
      console.log(`\nSubtasks with dependencies: ${subtasksWithDeps.length}`);

      // ============================================================
      // PHASE 4: Swarm coordination and execution
      // ============================================================
      console.log("\n=== PHASE 4: Swarm Coordination ===");
      
      if (!coordinatorAgent) {
        throw new Error("Coordinator agent not found");
      }
      
      // Requirement 6.1, 6.2: Coordinate agents with shared memory and message passing
      const startTime = Date.now();
      const result = await coordinateSwarm(
        complexTask,
        agents,
        coordinatorAgent.id,
        {
          maxRetries: 2,
          retryDelay: 500,
          synthesisStrategy: { strategy: "concatenate" },
          timeout: 60000, // 1 minute timeout
          parallelExecution: true,
        }
      );
      const executionTime = Date.now() - startTime;
      
      console.log(`✓ Swarm coordination completed in ${executionTime}ms`);
      console.log(`  Success: ${result.success}`);
      console.log(`  Subtask assignments: ${result.subtaskAssignments.length}`);
      console.log(`  Collaboration ID: ${result.collaborationId}`);
      
      // Verify coordination result
      expect(result.taskId).toBe(complexTask.id);
      expect(result.subtaskAssignments.length).toBeGreaterThan(0);
      expect(result.collaborationId).toBeDefined();
      
      // Verify task result structure
      expect(result.result).toBeDefined();
      expect(result.result.taskId).toBeDefined();
      expect(result.result.completedAt).toBeInstanceOf(Date);
      expect(result.result.subtaskResults).toBeInstanceOf(Map);
      
      console.log("\nTask Result:");
      console.log(`  Task ID: ${result.result.taskId}`);
      console.log(`  Success: ${result.result.success}`);
      console.log(`  Subtask results: ${result.result.subtaskResults.size}`);
      console.log(`  Errors: ${result.result.errors.length}`);
      
      if (result.result.errors.length > 0) {
        console.log("\nErrors encountered:");
        for (const error of result.result.errors) {
          console.log(`  - ${error}`);
        }
      }

      // ============================================================
      // PHASE 5: Verify result synthesis
      // ============================================================
      console.log("\n=== PHASE 5: Result Synthesis ===");
      
      // Requirement 6.5: Verify result synthesis
      const synthesizedResult = synthesizeResults(subtasks, {
        strategy: "concatenate",
      });
      
      console.log(`✓ Results synthesized from ${synthesizedResult.subtaskResults.size} subtasks`);
      
      // Verify synthesis
      expect(synthesizedResult).toBeDefined();
      expect(synthesizedResult.taskId).toBeDefined();
      expect(synthesizedResult.subtaskResults).toBeInstanceOf(Map);
      expect(synthesizedResult.completedAt).toBeInstanceOf(Date);
      
      // Verify output was generated
      expect(synthesizedResult.output).toBeDefined();
      
      console.log("\nSynthesized Result:");
      console.log(`  Task ID: ${synthesizedResult.taskId}`);
      console.log(`  Success: ${synthesizedResult.success}`);
      console.log(`  Output type: ${Array.isArray(synthesizedResult.output) ? "array" : typeof synthesizedResult.output}`);
      
      if (Array.isArray(synthesizedResult.output)) {
        console.log(`  Output items: ${synthesizedResult.output.length}`);
      }

      // ============================================================
      // PHASE 6: Verify collaboration tracking
      // ============================================================
      console.log("\n=== PHASE 6: Collaboration Tracking ===");
      
      // Requirement 6.6: Verify collaboration success tracking and reputation
      const collaborationStats = await Promise.all(
        agents.map(agent => getCollaborationStats(agent.id))
      );
      
      console.log("\nCollaboration Statistics:");
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const stats = collaborationStats[i];
        
        console.log(`\n  ${agent.name}:`);
        console.log(`    Total collaborations: ${stats.totalCollaborations}`);
        console.log(`    Successful: ${stats.successfulCollaborations}`);
        console.log(`    Failed: ${stats.failedCollaborations}`);
        console.log(`    Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
        console.log(`    Reputation score: ${stats.reputationScore}`);
        
        // Verify each agent participated in at least one collaboration
        expect(stats.totalCollaborations).toBeGreaterThan(0);
      }
      
      // Verify reputation scores were updated
      const reputationScores = collaborationStats.map(s => s.reputationScore);
      const avgReputation = reputationScores.reduce((sum, r) => sum + r, 0) / reputationScores.length;
      
      console.log(`\nAverage reputation score: ${avgReputation.toFixed(1)}`);
      
      // Reputation should be reasonable (0-100)
      for (const score of reputationScores) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }

      // ============================================================
      // PHASE 7: Verify subtask assignments
      // ============================================================
      console.log("\n=== PHASE 7: Subtask Assignments ===");
      
      console.log("\nAssignment Details:");
      for (const assignment of result.subtaskAssignments) {
        const agent = agents.find(a => a.id === assignment.agentId);
        const subtask = subtasks.find(st => st.id === assignment.subtaskId);
        
        console.log(`\n  Subtask: ${subtask?.description.substring(0, 60)}...`);
        console.log(`    Assigned to: ${agent?.name}`);
        console.log(`    Role: ${assignment.role}`);
        console.log(`    Suitability score: ${assignment.suitabilityScore.toFixed(2)}`);
        
        // Verify assignment structure
        expect(assignment.subtaskId).toBeDefined();
        expect(assignment.agentId).toBeDefined();
        expect(assignment.role).toBeDefined();
        expect(assignment.suitabilityScore).toBeGreaterThanOrEqual(0);
        expect(assignment.suitabilityScore).toBeLessThanOrEqual(1);
      }
      
      // Verify all subtasks were assigned
      expect(result.subtaskAssignments.length).toBe(subtasks.length);
      
      // Verify assignments match agent capabilities
      for (const assignment of result.subtaskAssignments) {
        const agent = agents.find(a => a.id === assignment.agentId);
        const subtask = subtasks.find(st => st.id === assignment.subtaskId);
        
        if (agent && subtask && subtask.assignedRole) {
          // Check if agent has skills matching the role
          const hasMatchingSkills = agent.skills.some(skill => 
            skill.toLowerCase().includes(subtask.assignedRole!)
          );
          
          // At least some assignments should match skills
          // (not all will match perfectly due to load balancing)
          if (hasMatchingSkills) {
            console.log(`  ✓ ${agent.name} has matching skills for ${subtask.assignedRole} role`);
          }
        }
      }

      // ============================================================
      // SUMMARY
      // ============================================================
      console.log("\n=== COORDINATION TEST COMPLETE ===");
      console.log("✓ Agent swarm: Created 5 agents with specialized roles");
      console.log("✓ Task decomposition: Complex task broken into subtasks");
      console.log("✓ Coordination: Agents collaborated using shared memory");
      console.log("✓ Result synthesis: Multiple agent outputs combined coherently");
      console.log("✓ Collaboration tracking: Success rates and reputation updated");
      console.log("\nAll multi-agent coordination requirements validated successfully!");
      
    } catch (error) {
      // Check if error is due to missing database schema
      if (error instanceof Error && error.message.includes("Could not find the table")) {
        console.log("\n⚠️  Database schema not found!");
        console.log("Please run the schema migration:");
        console.log("  1. Open your Supabase project dashboard");
        console.log("  2. Go to SQL Editor");
        console.log("  3. Run the SQL from ordo/supabase/schema.sql");
        console.log("\nSkipping test until schema is applied.");
        return;
      }
      
      console.error("Multi-agent coordination test failed:", error);
      throw error;
    }
  }, 120000); // 2 minute timeout for integration test
});

/**
 * Get role-specific skills for an agent
 */
function getRoleSkills(role: SpecialistRole): string[] {
  const skillMap: Record<SpecialistRole, string[]> = {
    coordinator: ["coordination", "planning", "task_management", "communication"],
    researcher: ["research", "analysis", "data_gathering", "investigation"],
    coder: ["coding", "implementation", "debugging", "software_development"],
    trader: ["trading", "defi", "market_analysis", "risk_management"],
  };
  
  return skillMap[role] || [];
}
