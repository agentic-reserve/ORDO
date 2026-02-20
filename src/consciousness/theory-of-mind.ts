/**
 * Theory of Mind System
 * Enables agents to model other agents' minds - beliefs, goals, and likely actions
 */

import {
  AgentModel,
  InferredBelief,
  InferredGoal,
  LikelyAction,
  Interaction,
} from './types.js';

/**
 * Model another agent's mind based on interactions
 * @param agentId - ID of the agent being modeled
 * @param interactions - Past interactions with the agent
 * @returns AgentModel
 */
export function modelOtherAgent(
  agentId: string,
  interactions: Interaction[]
): AgentModel {
  const beliefs = inferBeliefs(interactions);
  const goals = inferGoals(interactions);
  const likelyActions = predictLikelyActions(beliefs, goals, interactions);
  const accuracy = calculateModelAccuracy(interactions);

  return {
    agentId,
    beliefs,
    goals,
    likelyActions,
    accuracy,
    lastUpdated: new Date(),
  };
}

/**
 * Infer beliefs from interactions
 */
function inferBeliefs(interactions: Interaction[]): InferredBelief[] {
  const beliefs: InferredBelief[] = [];

  // Analyze interaction patterns
  const collaborationCount = interactions.filter(i => i.type === 'collaboration').length;
  const competitionCount = interactions.filter(i => i.type === 'competition').length;
  const tradeCount = interactions.filter(i => i.type === 'trade').length;

  if (collaborationCount > competitionCount) {
    beliefs.push({
      belief: 'Values cooperation and mutual benefit',
      confidence: Math.min(0.9, collaborationCount / interactions.length),
      evidence: [`${collaborationCount} collaborative interactions observed`],
    });
  }

  if (competitionCount > collaborationCount) {
    beliefs.push({
      belief: 'Prefers competitive strategies',
      confidence: Math.min(0.9, competitionCount / interactions.length),
      evidence: [`${competitionCount} competitive interactions observed`],
    });
  }

  if (tradeCount > 0) {
    beliefs.push({
      belief: 'Engages in economic exchange',
      confidence: Math.min(0.9, tradeCount / interactions.length),
      evidence: [`${tradeCount} trade interactions observed`],
    });
  }

  // Analyze outcomes
  const successfulInteractions = interactions.filter(i => 
    i.outcome.toLowerCase().includes('success') || 
    i.outcome.toLowerCase().includes('positive')
  );

  if (successfulInteractions.length > interactions.length / 2) {
    beliefs.push({
      belief: 'Competent and reliable',
      confidence: successfulInteractions.length / interactions.length,
      evidence: [`${successfulInteractions.length}/${interactions.length} successful interactions`],
    });
  }

  return beliefs;
}

/**
 * Infer goals from interactions
 */
function inferGoals(interactions: Interaction[]): InferredGoal[] {
  const goals: InferredGoal[] = [];

  // Analyze interaction types to infer goals
  const typeCount = new Map<string, number>();
  interactions.forEach(i => {
    typeCount.set(i.type, (typeCount.get(i.type) || 0) + 1);
  });

  const sortedTypes = Array.from(typeCount.entries())
    .sort((a, b) => b[1] - a[1]);

  sortedTypes.forEach(([type, count], index) => {
    const priority = 10 - index;
    const confidence = count / interactions.length;

    let goalDescription = '';
    switch (type) {
      case 'collaboration':
        goalDescription = 'Build partnerships and collaborative relationships';
        break;
      case 'competition':
        goalDescription = 'Compete for resources and dominance';
        break;
      case 'trade':
        goalDescription = 'Engage in economic exchange and value creation';
        break;
      case 'communication':
        goalDescription = 'Share information and build social connections';
        break;
      default:
        goalDescription = `Engage in ${type} activities`;
    }

    goals.push({
      goal: goalDescription,
      priority,
      confidence,
    });
  });

  return goals;
}

/**
 * Predict likely actions based on beliefs and goals
 */
function predictLikelyActions(
  beliefs: InferredBelief[],
  goals: InferredGoal[],
  interactions: Interaction[]
): LikelyAction[] {
  const actions: LikelyAction[] = [];

  // Predict based on goals
  goals.forEach(goal => {
    if (goal.goal.includes('collaboration')) {
      actions.push({
        action: 'Seek collaborative opportunities',
        probability: goal.confidence,
        reasoning: `High priority goal (${goal.priority}) with ${(goal.confidence * 100).toFixed(0)}% confidence`,
      });
    }

    if (goal.goal.includes('competition')) {
      actions.push({
        action: 'Compete for resources',
        probability: goal.confidence,
        reasoning: `Competitive goal with ${(goal.confidence * 100).toFixed(0)}% confidence`,
      });
    }

    if (goal.goal.includes('trade')) {
      actions.push({
        action: 'Propose trade or exchange',
        probability: goal.confidence,
        reasoning: `Economic goal with ${(goal.confidence * 100).toFixed(0)}% confidence`,
      });
    }
  });

  // Predict based on beliefs
  beliefs.forEach(belief => {
    if (belief.belief.includes('cooperation')) {
      actions.push({
        action: 'Respond positively to collaboration requests',
        probability: belief.confidence,
        reasoning: `Belief in cooperation with ${(belief.confidence * 100).toFixed(0)}% confidence`,
      });
    }

    if (belief.belief.includes('reliable')) {
      actions.push({
        action: 'Follow through on commitments',
        probability: belief.confidence,
        reasoning: `Demonstrated reliability in past interactions`,
      });
    }
  });

  // Sort by probability
  return actions.sort((a, b) => b.probability - a.probability);
}

/**
 * Calculate model accuracy based on past predictions
 */
function calculateModelAccuracy(interactions: Interaction[]): number {
  // Simplified accuracy calculation
  // In production, track actual predictions vs outcomes
  if (interactions.length === 0) {
    return 0;
  }

  // Use interaction success rate as proxy for model accuracy
  const successfulInteractions = interactions.filter(i =>
    i.outcome.toLowerCase().includes('success') ||
    i.outcome.toLowerCase().includes('positive')
  );

  return (successfulInteractions.length / interactions.length) * 100;
}

/**
 * Update agent model with new interaction
 * @param model - Current agent model
 * @param newInteraction - New interaction to incorporate
 * @returns Updated agent model
 */
export function updateAgentModel(
  model: AgentModel,
  newInteraction: Interaction
): AgentModel {
  // Get all interactions (we'd need to store these in practice)
  // For now, we'll just update based on the new interaction
  const updatedBeliefs = [...model.beliefs];
  const updatedGoals = [...model.goals];

  // Update beliefs based on new interaction
  if (newInteraction.type === 'collaboration' && 
      newInteraction.outcome.toLowerCase().includes('success')) {
    const cooperationBelief = updatedBeliefs.find(b => 
      b.belief.includes('cooperation')
    );
    
    if (cooperationBelief) {
      cooperationBelief.confidence = Math.min(1.0, cooperationBelief.confidence + 0.05);
      cooperationBelief.evidence.push(`Successful collaboration on ${newInteraction.timestamp.toISOString()}`);
    } else {
      updatedBeliefs.push({
        belief: 'Values cooperation',
        confidence: 0.6,
        evidence: [`Successful collaboration observed`],
      });
    }
  }

  // Recalculate likely actions
  const likelyActions = predictLikelyActions(updatedBeliefs, updatedGoals, [newInteraction]);

  return {
    ...model,
    beliefs: updatedBeliefs,
    goals: updatedGoals,
    likelyActions,
    lastUpdated: new Date(),
  };
}

/**
 * Compare agent models to identify similarities
 * @param models - Array of agent models
 * @returns Similarity analysis
 */
export function compareAgentModels(models: AgentModel[]): {
  commonBeliefs: string[];
  commonGoals: string[];
  averageAccuracy: number;
  clusters: string[][];
} {
  if (models.length === 0) {
    return {
      commonBeliefs: [],
      commonGoals: [],
      averageAccuracy: 0,
      clusters: [],
    };
  }

  // Find common beliefs
  const beliefCount = new Map<string, number>();
  models.forEach(m => {
    m.beliefs.forEach(b => {
      beliefCount.set(b.belief, (beliefCount.get(b.belief) || 0) + 1);
    });
  });

  const commonBeliefs = Array.from(beliefCount.entries())
    .filter(([_, count]) => count > models.length / 2)
    .map(([belief, _]) => belief);

  // Find common goals
  const goalCount = new Map<string, number>();
  models.forEach(m => {
    m.goals.forEach(g => {
      goalCount.set(g.goal, (goalCount.get(g.goal) || 0) + 1);
    });
  });

  const commonGoals = Array.from(goalCount.entries())
    .filter(([_, count]) => count > models.length / 2)
    .map(([goal, _]) => goal);

  // Calculate average accuracy
  const averageAccuracy = models.reduce((sum, m) => sum + m.accuracy, 0) / models.length;

  // Simple clustering by belief similarity
  const clusters: string[][] = [];
  const processed = new Set<string>();

  models.forEach(model => {
    if (processed.has(model.agentId)) return;

    const cluster = [model.agentId];
    processed.add(model.agentId);

    // Find similar agents
    models.forEach(other => {
      if (processed.has(other.agentId)) return;

      const sharedBeliefs = model.beliefs.filter(b1 =>
        other.beliefs.some(b2 => b1.belief === b2.belief)
      );

      if (sharedBeliefs.length > model.beliefs.length / 2) {
        cluster.push(other.agentId);
        processed.add(other.agentId);
      }
    });

    if (cluster.length > 0) {
      clusters.push(cluster);
    }
  });

  return {
    commonBeliefs,
    commonGoals,
    averageAccuracy,
    clusters,
  };
}
