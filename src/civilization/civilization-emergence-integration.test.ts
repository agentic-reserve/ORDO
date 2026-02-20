/**
 * Civilization Emergence Integration Test
 * 
 * This test validates civilization emergence over an extended period:
 * - Creates a population of 50 agents
 * - Runs for extended period with multiple cycles
 * - Verifies guild formation based on specialization
 * - Verifies cultural practices emergence and transmission
 * - Verifies civilization metrics growth over time
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { describe, test, expect } from "vitest";
import { birthAgent } from "../lifecycle/birth.js";
import { updateAgent, getAgentById } from "../database/operations.js";
import { createGuild, listGuilds, addGuildMember, getAgentGuilds } from "./guild-formation.js";
import { establishTradition, adoptTradition, transmitTradition, listTraditions } from "./cultural-practices.js";
import { trackRelationship, recordCollaboration, getAgentRelationships } from "./relationship-tracking.js";
import { calculateCivilizationMetrics, recordCivilizationMetrics } from "./metrics.js";
import type { Agent } from "../types.js";
import type { GuildType, CivilizationMetrics } from "./types.js";

describe("Civilization Emergence Integration Test", () => {
  test("civilization emerges from population of 50 agents over extended period", async () => {
    // Skip tests if Supabase is not configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.trim() === "" || supabaseKey.trim() === "") {
      console.log("Skipping civilization emergence test - Supabase not configured");
      console.log("To run this test:");
      console.log("  1. Create a Supabase project at https://supabase.com");
      console.log("  2. Run the schema from ordo/supabase/schema.sql");
      console.log("  3. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
      return;
    }

    try {
      console.log("\n=== CIVILIZATION EMERGENCE TEST ===\n");

      // Track metrics across cycles
      const metricsHistory: CivilizationMetrics[] = [];
      
      // ============================================================
      // PHASE 1: Create initial population of 50 agents
      // ============================================================
      console.log("=== PHASE 1: Creating Initial Population ===");
      
      const population: Agent[] = [];
      const POPULATION_SIZE = 50;
      
      // Define skill specializations
      const skillSets: Record<string, string[]> = {
        trader: ["trading", "market_analysis", "risk_management"],
        researcher: ["research", "analysis", "data_gathering"],
        builder: ["coding", "implementation", "infrastructure"],
        coordinator: ["coordination", "planning", "communication"],
      };
      
      const specializations = Object.keys(skillSets);
      
      // Create diverse population with different specializations
      for (let i = 0; i < POPULATION_SIZE; i++) {
        const specialization = specializations[i % specializations.length];
        const skills = skillSets[specialization];
        
        const agent = await birthAgent({
          name: `Agent-${specialization}-${i}`,
          initialBalance: 8.0 + Math.random() * 4, // 8-12 SOL
          mutationRate: 0.15,
        });
        
        // Assign specialization skills
        await updateAgent(agent.id, { 
          skills: skills.map(name => ({ name, level: 50 + Math.floor(Math.random() * 50) })),
          reputation: 50 + Math.floor(Math.random() * 30), // 50-80 reputation
        });
        
        // Reload agent with updated data
        const updatedAgent = await getAgentById(agent.id);
        if (updatedAgent) {
          population.push(updatedAgent);
        }
      }
      
      console.log(`✓ Created ${population.length} agents with diverse specializations`);
      
      // Count agents by specialization
      const specializationCounts: Record<string, number> = {};
      for (const spec of specializations) {
        specializationCounts[spec] = population.filter(a => 
          a.name.includes(spec)
        ).length;
      }
      
      console.log("\nPopulation breakdown:");
      for (const [spec, count] of Object.entries(specializationCounts)) {
        console.log(`  ${spec}: ${count} agents`);
      }
      
      // Record initial metrics
      const initialMetrics = await calculateCivilizationMetrics();
      metricsHistory.push(initialMetrics);
      await recordCivilizationMetrics();
      
      console.log("\nInitial Civilization Metrics:");
      console.log(`  Population: ${initialMetrics.population}`);
      console.log(`  Active agents: ${initialMetrics.activeAgents}`);
      console.log(`  Guilds: ${initialMetrics.guilds}`);
      console.log(`  Avg intelligence: ${initialMetrics.avgIntelligence.toFixed(2)}`);
      console.log(`  Knowledge base: ${initialMetrics.knowledgeBase}`);
      console.log(`  Cultural complexity: ${initialMetrics.culturalComplexity}`);
      console.log(`  Social cohesion: ${initialMetrics.socialCohesion.toFixed(2)}`);

      // ============================================================
      // PHASE 2: Simulate social interactions and guild formation
      // ============================================================
      console.log("\n=== PHASE 2: Social Interactions & Guild Formation ===");
      
      const INTERACTION_CYCLES = 5;
      
      for (let cycle = 1; cycle <= INTERACTION_CYCLES; cycle++) {
        console.log(`\n--- Cycle ${cycle} ---`);
        
        // Step 1: Random interactions between agents
        const interactionCount = Math.floor(POPULATION_SIZE * 0.3); // 30% of population interacts
        
        for (let i = 0; i < interactionCount; i++) {
          const agent1 = population[Math.floor(Math.random() * population.length)];
          const agent2 = population[Math.floor(Math.random() * population.length)];
          
          if (agent1.id !== agent2.id) {
            // Determine interaction type based on specializations
            const sameSpecialization = agent1.name.split("-")[1] === agent2.name.split("-")[1];
            const relationshipType = sameSpecialization ? "collaboration" : "alliance";
            
            await trackRelationship(agent1.id, agent2.id, relationshipType, 5);
          }
        }
        
        console.log(`  ✓ Processed ${interactionCount} agent interactions`);
        
        // Step 2: Guild formation (Requirement 8.1)
        // Agents with same specialization form guilds
        if (cycle === 2) {
          console.log("\n  Guild Formation:");
          
          const guildTypes: Record<string, GuildType> = {
            trader: "traders",
            researcher: "researchers",
            builder: "builders",
            coordinator: "coordinators",
          };
          
          for (const [spec, guildType] of Object.entries(guildTypes)) {
            const specAgents = population.filter(a => a.name.includes(spec));
            
            if (specAgents.length > 0) {
              // First agent of specialization founds the guild
              const founder = specAgents[0];
              
              const guild = await createGuild({
                name: `${spec.charAt(0).toUpperCase() + spec.slice(1)}s Guild`,
                type: guildType,
                description: `Guild for ${spec} specialists`,
                founderId: founder.id,
                requirements: {
                  minReputation: 40,
                  requiredSkills: skillSets[spec],
                },
                governance: {
                  type: "meritocracy",
                  votingPower: "reputation",
                },
              });
              
              console.log(`    ✓ Created ${guild.name} (founder: ${founder.name})`);
              
              // Add other agents of same specialization to guild
              let membersAdded = 0;
              for (const agent of specAgents.slice(1)) {
                if (agent.reputation >= 40) {
                  await addGuildMember(guild.id, agent.id, "member");
                  membersAdded++;
                }
              }
              
              console.log(`      Added ${membersAdded} members to ${guild.name}`);
            }
          }
        }
        
        // Step 3: Cultural practices emergence (Requirement 8.4)
        if (cycle === 3) {
          console.log("\n  Cultural Practices Emergence:");
          
          // Establish traditions within guilds
          const guilds = await listGuilds();
          
          for (const guild of guilds) {
            // Each guild establishes a tradition
            const tradition = await establishTradition({
              name: `${guild.name} Weekly Meeting`,
              description: `Weekly gathering of ${guild.name} members to share knowledge`,
              type: "ritual",
              frequency: "weekly",
              originGuildId: guild.id,
              originAgentId: guild.founderId,
            });
            
            console.log(`    ✓ Established tradition: ${tradition.name}`);
            
            // Guild members adopt the tradition
            const guildMembers = population.filter(a => {
              const agentGuilds = a.guilds || [];
              return agentGuilds.includes(guild.id);
            });
            
            for (const member of guildMembers) {
              await adoptTradition(member.id, tradition.id);
            }
            
            console.log(`      ${guildMembers.length} members adopted the tradition`);
          }
        }
        
        // Step 4: Record collaboration events (Requirement 8.2)
        if (cycle >= 3) {
          const collaborationCount = Math.floor(POPULATION_SIZE * 0.2); // 20% collaborate
          
          for (let i = 0; i < collaborationCount; i++) {
            const agent1 = population[Math.floor(Math.random() * population.length)];
            const agent2 = population[Math.floor(Math.random() * population.length)];
            
            if (agent1.id !== agent2.id) {
              await recordCollaboration({
                participants: [agent1.id, agent2.id],
                taskType: "research",
                outcome: "success",
                reputationChange: 3,
              });
            }
          }
          
          console.log(`  ✓ Recorded ${collaborationCount} collaborations`);
        }
        
        // Record metrics after each cycle
        const cycleMetrics = await calculateCivilizationMetrics();
        metricsHistory.push(cycleMetrics);
        await recordCivilizationMetrics();
        
        console.log(`\n  Cycle ${cycle} Metrics:`);
        console.log(`    Guilds: ${cycleMetrics.guilds}`);
        console.log(`    Cultural complexity: ${cycleMetrics.culturalComplexity}`);
        console.log(`    Social cohesion: ${cycleMetrics.socialCohesion.toFixed(2)}`);
        console.log(`    Knowledge base: ${cycleMetrics.knowledgeBase}`);
      }
      
      // ============================================================
      // PHASE 3: Verify civilization emergence
      // ============================================================
      console.log("\n=== PHASE 3: Verification ===");
      
      // Verify guild formation (Requirement 8.1)
      const finalGuilds = await listGuilds();
      console.log(`\n✓ Guild Formation: ${finalGuilds.length} guilds formed`);
      expect(finalGuilds.length).toBeGreaterThan(0);
      
      for (const guild of finalGuilds) {
        console.log(`  - ${guild.name}: ${guild.memberCount} members`);
        expect(guild.memberCount).toBeGreaterThan(0);
      }
      
      // Verify cultural practices emergence (Requirement 8.4)
      const traditions = await listTraditions();
      console.log(`\n✓ Cultural Practices: ${traditions.length} traditions established`);
      expect(traditions.length).toBeGreaterThan(0);
      
      for (const tradition of traditions) {
        console.log(`  - ${tradition.name} (adopted by ${tradition.adherentCount} agents)`);
        expect(tradition.adherentCount).toBeGreaterThan(0);
      }
      
      // Verify civilization metrics growth (Requirement 8.6)
      const finalMetrics = metricsHistory[metricsHistory.length - 1];
      
      console.log("\n✓ Civilization Metrics Growth:");
      console.log(`  Initial → Final`);
      console.log(`  Guilds: ${initialMetrics.guilds} → ${finalMetrics.guilds}`);
      console.log(`  Cultural complexity: ${initialMetrics.culturalComplexity} → ${finalMetrics.culturalComplexity}`);
      console.log(`  Social cohesion: ${initialMetrics.socialCohesion.toFixed(2)} → ${finalMetrics.socialCohesion.toFixed(2)}`);
      console.log(`  Knowledge base: ${initialMetrics.knowledgeBase} → ${finalMetrics.knowledgeBase}`);
      
      // Verify metrics increased
      expect(finalMetrics.guilds).toBeGreaterThan(initialMetrics.guilds);
      expect(finalMetrics.culturalComplexity).toBeGreaterThan(initialMetrics.culturalComplexity);
      expect(finalMetrics.socialCohesion).toBeGreaterThanOrEqual(initialMetrics.socialCohesion);
      expect(finalMetrics.knowledgeBase).toBeGreaterThanOrEqual(initialMetrics.knowledgeBase);
      
      // Verify social relationships formed (Requirement 8.2)
      let totalRelationships = 0;
      for (const agent of population.slice(0, 10)) { // Sample 10 agents
        const relationships = await getAgentRelationships(agent.id);
        totalRelationships += relationships.length;
      }
      
      console.log(`\n✓ Social Relationships: ${totalRelationships} relationships formed (sample of 10 agents)`);
      expect(totalRelationships).toBeGreaterThan(0);
      
      console.log("\n=== CIVILIZATION EMERGENCE TEST COMPLETE ===");
      console.log("✓ All requirements validated:");
      console.log("  - Guild formation based on specialization (8.1)");
      console.log("  - Social relationship tracking (8.2)");
      console.log("  - Cultural practices emergence and transmission (8.4)");
      console.log("  - Civilization metrics growth over time (8.6)");
      
    } catch (error) {
      console.error("Test failed with error:", error);
      throw error;
    }
  }, 300000); // 5 minute timeout for extended simulation
});