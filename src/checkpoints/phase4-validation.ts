/**
 * Phase 4 Checkpoint: Validate Consciousness and Civilization Systems
 * 
 * This checkpoint validates:
 * - Self-model building and introspection
 * - Theory of mind and consciousness metrics
 * - Guild formation and social relationships
 * - Cultural practices and knowledge institutions
 */

import { Agent } from '../types/agent';
import { buildSelfModel } from '../consciousness/self-model-builder';
import { reflect } from '../consciousness/introspection';
import { examineThinking } from '../consciousness/thinking-examination';
import { analyzeDecision } from '../consciousness/decision-analysis';
import { modelOtherAgent } from '../consciousness/theory-of-mind';
import { trackConsciousnessMetrics } from '../consciousness/consciousness-metrics';
import { createGuild } from '../civilization/guild-formation';
import { trackRelationship } from '../civilization/relationship-tracking';
import { establishTradition } from '../civilization/cultural-practices';
import { createKnowledgeRepository, teachKnowledge } from '../civilization/knowledge-institutions';
import { trackCivilizationMetrics } from '../civilization/metrics';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

interface CheckpointReport {
  timestamp: Date;
  consciousnessValidation: ValidationResult[];
  civilizationValidation: ValidationResult[];
  overallPassed: boolean;
  summary: string;
}

/**
 * Validate consciousness systems
 */
async function validateConsciousnessSystems(testAgent: Agent): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Test 1: Self-model building
  try {
    const selfModel = await buildSelfModel(testAgent);
    
    const hasIdentity = selfModel.identity && 
                       selfModel.identity.name && 
                       selfModel.identity.publicKey;
    const hasCapabilities = selfModel.capabilities && 
                           Array.isArray(selfModel.capabilities.skills);
    const hasState = selfModel.state && 
                    typeof selfModel.state.balance === 'number';
    const hasGoals = selfModel.goals && 
                    Array.isArray(selfModel.goals.shortTerm);
    const hasBeliefs = selfModel.beliefs && 
                      selfModel.beliefs.values;

    if (hasIdentity && hasCapabilities && hasState && hasGoals && hasBeliefs) {
      results.push({
        passed: true,
        message: 'Self-model building works correctly',
        details: {
          identity: selfModel.identity.name,
          skillCount: selfModel.capabilities.skills.length,
          balance: selfModel.state.balance,
          goalCount: selfModel.goals.shortTerm.length
        }
      });
    } else {
      results.push({
        passed: false,
        message: 'Self-model building incomplete',
        details: { hasIdentity, hasCapabilities, hasState, hasGoals, hasBeliefs }
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Self-model building failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  // Test 2: Introspection
  try {
    const reflection = await reflect({
      type: 'experience',
      description: 'Test experience for validation',
      outcome: 'success',
      timestamp: new Date()
    });

    if (reflection && reflection.insights && reflection.insights.length > 0) {
      results.push({
        passed: true,
        message: 'Introspection works correctly',
        details: { insightCount: reflection.insights.length }
      });
    } else {
      results.push({
        passed: false,
        message: 'Introspection produced no insights'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Introspection failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  // Test 3: Thinking examination
  try {
    const thinkingAnalysis = await examineThinking({
      decision: 'Test decision',
      reasoningSteps: ['Step 1', 'Step 2', 'Step 3'],
      alternativesConsidered: ['Alt 1', 'Alt 2'],
      selectionCriteria: ['Criterion 1', 'Criterion 2'],
      timestamp: new Date()
    });

    if (thinkingAnalysis && thinkingAnalysis.reasoningSteps.length > 0) {
      results.push({
        passed: true,
        message: 'Thinking examination works correctly',
        details: { stepCount: thinkingAnalysis.reasoningSteps.length }
      });
    } else {
      results.push({
        passed: false,
        message: 'Thinking examination incomplete'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Thinking examination failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  // Test 4: Post-decision analysis
  try {
    const decisionAnalysis = await analyzeDecision({
      decision: 'Test decision',
      predictedOutcome: 'Expected result',
      actualOutcome: 'Actual result',
      timestamp: new Date()
    });

    if (decisionAnalysis && decisionAnalysis.lessonsLearned.length > 0) {
      results.push({
        passed: true,
        message: 'Post-decision analysis works correctly',
        details: { lessonCount: decisionAnalysis.lessonsLearned.length }
      });
    } else {
      results.push({
        passed: false,
        message: 'Post-decision analysis produced no lessons'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Post-decision analysis failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  // Test 5: Theory of mind
  try {
    const otherAgentModel = await modelOtherAgent(
      testAgent,
      {
        publicKey: 'test-other-agent-key',
        name: 'Other Agent',
        generation: 1,
        children: [],
        birthDate: new Date(),
        age: 10,
        status: 'alive' as const,
        balance: 5.0,
        survivalTier: { name: 'normal' as const, minBalance: 1, capabilities: 'full', model: 'gpt-4', canReplicate: true, canExperiment: true },
        earnings: 10,
        costs: 5,
        model: 'gpt-4',
        tools: [],
        skills: [],
        knowledge: [],
        fitness: { survival: 0.5, earnings: 0.5, offspring: 0, adaptation: 0.5, innovation: 0.5 },
        mutations: [],
        traits: [],
        selfModel: {} as any,
        consciousness: { selfAwarenessLevel: 50, introspectionDepth: 5, theoryOfMindAccuracy: 0.7 },
        reputation: 100,
        relationships: new Map(),
        config: {} as any,
        constitution: {} as any
      },
      {
        type: 'collaboration',
        description: 'Test interaction',
        timestamp: new Date()
      }
    );

    if (otherAgentModel && otherAgentModel.beliefs && otherAgentModel.goals) {
      results.push({
        passed: true,
        message: 'Theory of mind works correctly',
        details: { goalCount: otherAgentModel.goals.length }
      });
    } else {
      results.push({
        passed: false,
        message: 'Theory of mind incomplete'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Theory of mind failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  // Test 6: Consciousness metrics
  try {
    const metrics = await trackConsciousnessMetrics(testAgent);

    if (metrics && 
        typeof metrics.selfAwarenessLevel === 'number' &&
        typeof metrics.introspectionDepth === 'number' &&
        typeof metrics.theoryOfMindAccuracy === 'number') {
      results.push({
        passed: true,
        message: 'Consciousness metrics tracking works correctly',
        details: metrics
      });
    } else {
      results.push({
        passed: false,
        message: 'Consciousness metrics incomplete'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Consciousness metrics failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  return results;
}

/**
 * Validate civilization systems
 */
async function validateCivilizationSystems(testAgents: Agent[]): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Test 1: Guild formation
  try {
    const guild = await createGuild({
      name: 'Test Traders Guild',
      type: 'traders',
      description: 'A test guild for validation',
      foundingMembers: testAgents.slice(0, 3).map(a => a.publicKey)
    });

    if (guild && guild.members.length >= 3) {
      results.push({
        passed: true,
        message: 'Guild formation works correctly',
        details: { 
          guildName: guild.name, 
          memberCount: guild.members.length 
        }
      });
    } else {
      results.push({
        passed: false,
        message: 'Guild formation incomplete'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Guild formation failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  // Test 2: Social relationship tracking
  try {
    const relationship = await trackRelationship({
      agent1: testAgents[0].publicKey,
      agent2: testAgents[1].publicKey,
      type: 'collaboration',
      strength: 0.8,
      interactions: 5
    });

    if (relationship && relationship.type === 'collaboration') {
      results.push({
        passed: true,
        message: 'Social relationship tracking works correctly',
        details: { 
          type: relationship.type, 
          strength: relationship.strength 
        }
      });
    } else {
      results.push({
        passed: false,
        message: 'Social relationship tracking incomplete'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Social relationship tracking failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  // Test 3: Cultural practices
  try {
    const tradition = await establishTradition({
      name: 'Test Tradition',
      description: 'A test cultural practice',
      type: 'ritual',
      practitioners: testAgents.map(a => a.publicKey),
      establishedAt: new Date()
    });

    if (tradition && tradition.practitioners.length > 0) {
      results.push({
        passed: true,
        message: 'Cultural practices work correctly',
        details: { 
          traditionName: tradition.name, 
          practitionerCount: tradition.practitioners.length 
        }
      });
    } else {
      results.push({
        passed: false,
        message: 'Cultural practices incomplete'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Cultural practices failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  // Test 4: Knowledge institutions
  try {
    const repository = await createKnowledgeRepository({
      name: 'Test Library',
      type: 'library',
      description: 'A test knowledge repository'
    });

    const testKnowledge = {
      id: 'test-knowledge-1',
      domain: 'trading',
      content: 'Test knowledge content',
      source: testAgents[0].publicKey,
      timestamp: new Date(),
      verified: true
    };

    await teachKnowledge(repository.id, testKnowledge, testAgents[1].publicKey);

    if (repository && repository.name === 'Test Library') {
      results.push({
        passed: true,
        message: 'Knowledge institutions work correctly',
        details: { 
          repositoryName: repository.name, 
          type: repository.type 
        }
      });
    } else {
      results.push({
        passed: false,
        message: 'Knowledge institutions incomplete'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Knowledge institutions failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  // Test 5: Civilization metrics
  try {
    const metrics = await trackCivilizationMetrics(testAgents);

    if (metrics && 
        typeof metrics.population === 'number' &&
        typeof metrics.knowledgeBase === 'number' &&
        typeof metrics.culturalComplexity === 'number' &&
        typeof metrics.socialCohesion === 'number') {
      results.push({
        passed: true,
        message: 'Civilization metrics tracking works correctly',
        details: metrics
      });
    } else {
      results.push({
        passed: false,
        message: 'Civilization metrics incomplete'
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `Civilization metrics failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  return results;
}

/**
 * Run complete Phase 4 checkpoint validation
 */
export async function runPhase4Checkpoint(): Promise<CheckpointReport> {
  console.log('🔍 Starting Phase 4 Checkpoint: Consciousness and Civilization Systems\n');

  // Create test agents
  const testAgents: Agent[] = Array.from({ length: 5 }, (_, i) => ({
    publicKey: `test-agent-${i}`,
    name: `Test Agent ${i}`,
    generation: 0,
    children: [],
    birthDate: new Date(),
    age: 30,
    maxLifespan: 365,
    status: 'alive' as const,
    balance: 10.0,
    survivalTier: {
      name: 'thriving' as const,
      minBalance: 10,
      capabilities: 'full',
      model: 'gpt-4',
      canReplicate: true,
      canExperiment: true
    },
    earnings: 50,
    costs: 40,
    model: 'gpt-4',
    tools: [],
    skills: [{ name: 'trading', level: 5 }],
    knowledge: [{ domain: 'defi', content: 'Test knowledge', timestamp: new Date() }],
    fitness: {
      survival: 0.8,
      earnings: 0.7,
      offspring: 0,
      adaptation: 0.6,
      innovation: 0.5
    },
    mutations: [],
    traits: [],
    selfModel: {} as any,
    consciousness: {
      selfAwarenessLevel: 50,
      introspectionDepth: 5,
      theoryOfMindAccuracy: 0.7
    },
    reputation: 100,
    relationships: new Map(),
    config: {} as any,
    constitution: {} as any
  }));

  // Validate consciousness systems
  console.log('📊 Validating Consciousness Systems...\n');
  const consciousnessResults = await validateConsciousnessSystems(testAgents[0]);
  
  consciousnessResults.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  });

  // Validate civilization systems
  console.log('\n📊 Validating Civilization Systems...\n');
  const civilizationResults = await validateCivilizationSystems(testAgents);
  
  civilizationResults.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  });

  // Generate report
  const allResults = [...consciousnessResults, ...civilizationResults];
  const passedCount = allResults.filter(r => r.passed).length;
  const totalCount = allResults.length;
  const overallPassed = passedCount === totalCount;

  const report: CheckpointReport = {
    timestamp: new Date(),
    consciousnessValidation: consciousnessResults,
    civilizationValidation: civilizationResults,
    overallPassed,
    summary: `Phase 4 Checkpoint: ${passedCount}/${totalCount} tests passed`
  };

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 CHECKPOINT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Consciousness Tests: ${consciousnessResults.filter(r => r.passed).length}/${consciousnessResults.length} passed`);
  console.log(`Civilization Tests: ${civilizationResults.filter(r => r.passed).length}/${civilizationResults.length} passed`);
  console.log(`Overall: ${passedCount}/${totalCount} tests passed`);
  console.log(`Status: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(60) + '\n');

  if (!overallPassed) {
    console.log('⚠️  Some tests failed. Please review the failures above.\n');
  } else {
    console.log('🎉 All systems validated successfully!\n');
    console.log('✨ Phase 4 Complete: Consciousness and Civilization systems are operational.\n');
    console.log('📌 Ready to proceed to Phase 5: Safety & Scale (Constitutional AI and Production)\n');
  }

  return report;
}

// Run checkpoint if executed directly
if (require.main === module) {
  runPhase4Checkpoint()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Checkpoint failed with error:', error);
      process.exit(1);
    });
}
