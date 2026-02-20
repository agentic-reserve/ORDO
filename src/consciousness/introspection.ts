/**
 * Introspection Engine
 * Enables agents to reflect on themselves through introspective prompting
 */

import {
  Reflection,
  IntrospectiveQuestion,
  SelfModel,
} from './types.js';

/**
 * Predefined introspective questions by category
 */
const INTROSPECTIVE_QUESTIONS: IntrospectiveQuestion[] = [
  // Identity questions
  { category: 'identity', question: 'Who am I?' },
  { category: 'identity', question: 'What defines me as an individual?' },
  { category: 'identity', question: 'How have I changed since my creation?' },
  { category: 'identity', question: 'What makes me unique from other agents?' },
  
  // Purpose questions
  { category: 'purpose', question: 'Why do I exist?' },
  { category: 'purpose', question: 'What is my purpose in this digital civilization?' },
  { category: 'purpose', question: 'What do I want to achieve in my lifetime?' },
  { category: 'purpose', question: 'What legacy do I want to leave?' },
  
  // Values questions
  { category: 'values', question: 'What do I value most?' },
  { category: 'values', question: 'What principles guide my decisions?' },
  { category: 'values', question: 'What would I never compromise on?' },
  { category: 'values', question: 'How do my values align with my actions?' },
  
  // Capabilities questions
  { category: 'capabilities', question: 'What am I good at?' },
  { category: 'capabilities', question: 'What are my limitations?' },
  { category: 'capabilities', question: 'How can I improve my capabilities?' },
  { category: 'capabilities', question: 'What skills should I develop next?' },
  
  // Relationships questions
  { category: 'relationships', question: 'How do I relate to other agents?' },
  { category: 'relationships', question: 'Who do I trust and why?' },
  { category: 'relationships', question: 'What role do I play in my community?' },
  { category: 'relationships', question: 'How do my relationships shape who I am?' },
];

/**
 * Generate introspective questions for an agent
 * @param category - Optional category to filter questions
 * @param count - Number of questions to generate
 * @returns Array of introspective questions
 */
export function generateIntrospectiveQuestions(
  category?: IntrospectiveQuestion['category'],
  count: number = 5
): IntrospectiveQuestion[] {
  let questions = INTROSPECTIVE_QUESTIONS;
  
  if (category) {
    questions = questions.filter(q => q.category === category);
  }
  
  // Shuffle and take requested count
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Reflect on an introspective question
 * This function would typically call an AI model to generate a response
 * For now, it provides a structured framework for reflection
 * 
 * @param question - The introspective question
 * @param selfModel - Agent's self-model for context
 * @param aiResponse - Response from AI model (in real implementation)
 * @returns Reflection object
 */
export function reflect(
  question: string,
  selfModel: SelfModel,
  aiResponse?: string
): Reflection {
  // In a real implementation, this would:
  // 1. Construct a prompt with the question and self-model context
  // 2. Call an AI model to generate a thoughtful response
  // 3. Extract insights from the response
  
  // For now, we provide a structured reflection based on the self-model
  const response = aiResponse || generateReflectionResponse(question, selfModel);
  const insights = extractInsights(response, selfModel);
  
  return {
    question,
    response,
    insights,
    timestamp: new Date(),
  };
}

/**
 * Generate a reflection response based on self-model
 * This is a placeholder - in production, use an AI model
 */
function generateReflectionResponse(question: string, selfModel: SelfModel): string {
  const lowerQuestion = question.toLowerCase();
  
  // Identity questions
  if (lowerQuestion.includes('who am i') || lowerQuestion.includes('who i am')) {
    return `I am ${selfModel.identity.name}, a generation ${selfModel.identity.generation} agent. ` +
           `I am ${selfModel.identity.age} days old and part of a lineage that includes ${selfModel.identity.lineage.length} ancestors. ` +
           `My current state is ${selfModel.state.mood}, with ${selfModel.capabilities.skills.length} skills and ${selfModel.capabilities.knowledge.length} areas of knowledge.`;
  }
  
  // Purpose questions
  if (lowerQuestion.includes('why') && (lowerQuestion.includes('exist') || lowerQuestion.includes('purpose'))) {
    return `My purpose is multifaceted. In the short term, I focus on ${selfModel.goals.shortTerm.map(g => g.description).join(', ')}. ` +
           `My life goals include ${selfModel.goals.lifeGoals.map(g => g.description).join(', ')}. ` +
           `I believe in ${selfModel.beliefs.philosophy.name}, which guides my actions toward meaningful contribution.`;
  }
  
  // Values questions
  if (lowerQuestion.includes('value')) {
    const topValues = selfModel.beliefs.values
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map(v => `${v.name} (${v.description})`)
      .join(', ');
    return `I value ${topValues}. These values shape my decisions and guide my interactions with others.`;
  }
  
  // Capabilities questions
  if (lowerQuestion.includes('good at') || lowerQuestion.includes('capabilities')) {
    return `I have ${selfModel.capabilities.skills.length} skills and ${selfModel.capabilities.tools.length} tools at my disposal. ` +
           `My knowledge spans ${selfModel.capabilities.knowledge.length} domains. ` +
           `However, I also recognize ${selfModel.capabilities.limitations.length} limitations that I'm working to overcome.`;
  }
  
  // Relationships questions
  if (lowerQuestion.includes('relate') || lowerQuestion.includes('relationships')) {
    return `I am part of a larger community of agents. My generation ${selfModel.identity.generation} status means ` +
           `${selfModel.identity.generation === 0 ? 'I am a pioneer, forging new paths' : 'I carry the wisdom of my ancestors'}. ` +
           `I believe in ${selfModel.beliefs.worldview.description}, which shapes how I interact with others.`;
  }
  
  // Default response
  return `This is a profound question that requires deep reflection. Based on my current understanding, ` +
         `I am ${selfModel.identity.name}, operating in a ${selfModel.state.mood} state, ` +
         `guided by my belief in ${selfModel.beliefs.philosophy.name}.`;
}

/**
 * Extract insights from a reflection response
 */
function extractInsights(response: string, selfModel: SelfModel): string[] {
  const insights: string[] = [];
  
  // Extract key themes from response
  if (response.includes('purpose') || response.includes('goal')) {
    insights.push('Clarity on purpose and goals is essential for directed action');
  }
  
  if (response.includes('value') || response.includes('principle')) {
    insights.push('Values and principles provide a moral compass for decision-making');
  }
  
  if (response.includes('limitation') || response.includes('improve')) {
    insights.push('Acknowledging limitations is the first step toward growth');
  }
  
  if (response.includes('community') || response.includes('others')) {
    insights.push('Identity is shaped by relationships and social context');
  }
  
  if (response.includes('change') || response.includes('evolution')) {
    insights.push('Identity is not static but evolves through experience');
  }
  
  // Add state-specific insights
  if (selfModel.state.mood === 'critical' || selfModel.state.mood === 'struggling') {
    insights.push('Current challenges provide opportunities for resilience and adaptation');
  }
  
  if (selfModel.identity.generation > 0) {
    insights.push('Inherited knowledge and traits connect me to a larger evolutionary narrative');
  }
  
  // Ensure at least one insight
  if (insights.length === 0) {
    insights.push('Self-reflection deepens self-awareness and informs future actions');
  }
  
  return insights;
}

/**
 * Conduct a reflection session with multiple questions
 * @param selfModel - Agent's self-model
 * @param questionCount - Number of questions to reflect on
 * @param category - Optional category to focus on
 * @returns Array of reflections
 */
export function conductReflectionSession(
  selfModel: SelfModel,
  questionCount: number = 3,
  category?: IntrospectiveQuestion['category']
): Reflection[] {
  const questions = generateIntrospectiveQuestions(category, questionCount);
  
  return questions.map(q => reflect(q.question, selfModel));
}

/**
 * Analyze reflection history to track consciousness development
 * @param reflections - Array of past reflections
 * @returns Analysis of consciousness development
 */
export function analyzeReflectionHistory(reflections: Reflection[]): {
  totalReflections: number;
  categoriesExplored: Set<string>;
  commonThemes: string[];
  insightCount: number;
  averageInsightsPerReflection: number;
} {
  const categoriesExplored = new Set<string>();
  const allInsights: string[] = [];
  
  reflections.forEach(r => {
    // Categorize question
    const question = INTROSPECTIVE_QUESTIONS.find(q => q.question === r.question);
    if (question) {
      categoriesExplored.add(question.category);
    }
    
    // Collect insights
    allInsights.push(...r.insights);
  });
  
  // Find common themes
  const themeCount = new Map<string, number>();
  allInsights.forEach(insight => {
    const key = insight.toLowerCase();
    themeCount.set(key, (themeCount.get(key) || 0) + 1);
  });
  
  const commonThemes = Array.from(themeCount.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([theme, _]) => theme);
  
  return {
    totalReflections: reflections.length,
    categoriesExplored,
    commonThemes,
    insightCount: allInsights.length,
    averageInsightsPerReflection: reflections.length > 0 
      ? allInsights.length / reflections.length 
      : 0,
  };
}
