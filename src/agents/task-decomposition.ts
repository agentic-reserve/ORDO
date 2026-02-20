/**
 * Task decomposition system for multi-agent coordination
 * 
 * Breaks complex tasks into subtasks that can be assigned to specialist agents
 */

import { ulid } from "ulid";
import type { ComplexTask, SubTask, SpecialistRole } from "./coordination-types.js";

/**
 * Decompose a complex task into subtasks
 * 
 * @param task - The complex task to decompose
 * @returns Array of subtasks with dependencies
 */
export async function decomposeTask(task: ComplexTask): Promise<SubTask[]> {
  const subtasks: SubTask[] = [];

  // Analyze task description and requirements to identify subtasks
  const taskAnalysis = analyzeTaskComplexity(task);

  // Generate subtasks based on analysis
  for (const component of taskAnalysis.components) {
    const subtask: SubTask = {
      id: ulid(),
      description: component.description,
      dependencies: component.dependencies,
      assignedRole: component.suggestedRole,
      status: "pending",
    };

    subtasks.push(subtask);
  }

  // Identify dependencies between subtasks
  identifyDependencies(subtasks, taskAnalysis);

  return subtasks;
}

/**
 * Task component identified during analysis
 */
interface TaskComponent {
  description: string;
  dependencies: string[];
  suggestedRole?: SpecialistRole;
  complexity: number;
}

/**
 * Task analysis result
 */
interface TaskAnalysis {
  components: TaskComponent[];
  totalComplexity: number;
  requiresResearch: boolean;
  requiresCoding: boolean;
  requiresTrading: boolean;
  requiresCoordination: boolean;
}

/**
 * Analyze task complexity and identify components
 * 
 * @param task - The complex task to analyze
 * @returns Task analysis with identified components
 */
function analyzeTaskComplexity(task: ComplexTask): TaskAnalysis {
  const components: TaskComponent[] = [];
  let totalComplexity = 0;

  // Keywords that indicate different types of work
  const researchKeywords = ["research", "analyze", "investigate", "study", "explore", "find"];
  const codingKeywords = ["implement", "code", "develop", "build", "create", "program", "write"];
  const tradingKeywords = ["trade", "swap", "buy", "sell", "stake", "lend", "borrow"];
  const coordinationKeywords = ["coordinate", "organize", "manage", "oversee", "integrate"];

  const description = task.description.toLowerCase();
  const requirements = task.requirements.map(r => r.toLowerCase());

  // Detect if task requires research
  const requiresResearch = researchKeywords.some(keyword => 
    description.includes(keyword) || requirements.some(r => r.includes(keyword))
  );

  // Detect if task requires coding
  const requiresCoding = codingKeywords.some(keyword => 
    description.includes(keyword) || requirements.some(r => r.includes(keyword))
  );

  // Detect if task requires trading
  const requiresTrading = tradingKeywords.some(keyword => 
    description.includes(keyword) || requirements.some(r => r.includes(keyword))
  );

  // Detect if task requires coordination
  const requiresCoordination = coordinationKeywords.some(keyword => 
    description.includes(keyword) || requirements.some(r => r.includes(keyword))
  ) || task.requirements.length > 3; // Complex tasks with many requirements need coordination

  // Generate components based on detected needs
  if (requiresResearch) {
    components.push({
      description: `Research and gather information for: ${task.description}`,
      dependencies: [],
      suggestedRole: "researcher",
      complexity: 2,
    });
    totalComplexity += 2;
  }

  if (requiresCoding) {
    const codingDeps = requiresResearch ? [components[0].description] : [];
    components.push({
      description: `Implement solution for: ${task.description}`,
      dependencies: codingDeps,
      suggestedRole: "coder",
      complexity: 3,
    });
    totalComplexity += 3;
  }

  if (requiresTrading) {
    const tradingDeps = requiresResearch ? [components[0].description] : [];
    components.push({
      description: `Execute trading operations for: ${task.description}`,
      dependencies: tradingDeps,
      suggestedRole: "trader",
      complexity: 2,
    });
    totalComplexity += 2;
  }

  // Break down requirements into subtasks
  for (const requirement of task.requirements) {
    const reqComponent: TaskComponent = {
      description: `Complete requirement: ${requirement}`,
      dependencies: [],
      complexity: 1,
    };

    // Determine role based on requirement content
    const reqLower = requirement.toLowerCase();
    if (researchKeywords.some(k => reqLower.includes(k))) {
      reqComponent.suggestedRole = "researcher";
    } else if (codingKeywords.some(k => reqLower.includes(k))) {
      reqComponent.suggestedRole = "coder";
    } else if (tradingKeywords.some(k => reqLower.includes(k))) {
      reqComponent.suggestedRole = "trader";
    }

    components.push(reqComponent);
    totalComplexity += 1;
  }

  // Add coordination component if needed
  if (requiresCoordination || components.length > 3) {
    components.push({
      description: `Coordinate and integrate results for: ${task.description}`,
      dependencies: components.map(c => c.description),
      suggestedRole: "coordinator",
      complexity: 2,
    });
    totalComplexity += 2;
  }

  // If no components were generated, create a single general subtask
  if (components.length === 0) {
    components.push({
      description: task.description,
      dependencies: [],
      complexity: 1,
    });
    totalComplexity = 1;
  }

  return {
    components,
    totalComplexity,
    requiresResearch,
    requiresCoding,
    requiresTrading,
    requiresCoordination,
  };
}

/**
 * Identify and set dependencies between subtasks
 * 
 * @param subtasks - Array of subtasks to analyze
 * @param analysis - Task analysis result
 */
function identifyDependencies(subtasks: SubTask[], analysis: TaskAnalysis): void {
  // Create a map of description to subtask ID
  const descriptionToId = new Map<string, string>();
  for (const subtask of subtasks) {
    descriptionToId.set(subtask.description, subtask.id);
  }

  // Update dependencies with actual subtask IDs
  for (const subtask of subtasks) {
    const component = analysis.components.find(c => c.description === subtask.description);
    if (component && component.dependencies.length > 0) {
      subtask.dependencies = component.dependencies
        .map(dep => descriptionToId.get(dep))
        .filter((id): id is string => id !== undefined);
    }
  }

  // Ensure research tasks come first
  const researchTasks = subtasks.filter(st => st.assignedRole === "researcher");
  const nonResearchTasks = subtasks.filter(st => st.assignedRole !== "researcher" && st.assignedRole !== "coordinator");
  
  for (const task of nonResearchTasks) {
    if (researchTasks.length > 0 && !task.dependencies.includes(researchTasks[0].id)) {
      task.dependencies.push(researchTasks[0].id);
    }
  }

  // Ensure coordination tasks come last
  const coordinationTasks = subtasks.filter(st => st.assignedRole === "coordinator");
  for (const coordTask of coordinationTasks) {
    const otherTasks = subtasks.filter(st => st.id !== coordTask.id && st.assignedRole !== "coordinator");
    coordTask.dependencies = otherTasks.map(t => t.id);
  }
}

/**
 * Get subtasks that are ready to execute (all dependencies completed)
 * 
 * @param subtasks - Array of all subtasks
 * @returns Array of subtasks ready to execute
 */
export function getReadySubtasks(subtasks: SubTask[]): SubTask[] {
  return subtasks.filter(subtask => {
    // Must be pending
    if (subtask.status !== "pending") {
      return false;
    }

    // All dependencies must be completed
    const allDepsCompleted = subtask.dependencies.every(depId => {
      const depTask = subtasks.find(st => st.id === depId);
      return depTask?.status === "completed";
    });

    return allDepsCompleted;
  });
}

/**
 * Check if all subtasks are completed
 * 
 * @param subtasks - Array of subtasks
 * @returns True if all subtasks are completed
 */
export function areAllSubtasksCompleted(subtasks: SubTask[]): boolean {
  return subtasks.every(st => st.status === "completed");
}

/**
 * Get subtasks by role
 * 
 * @param subtasks - Array of subtasks
 * @param role - Specialist role to filter by
 * @returns Array of subtasks for the specified role
 */
export function getSubtasksByRole(subtasks: SubTask[], role: SpecialistRole): SubTask[] {
  return subtasks.filter(st => st.assignedRole === role);
}
