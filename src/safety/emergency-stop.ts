/**
 * Emergency Stop Mechanisms
 * 
 * Implements multiple independent emergency stop mechanisms:
 * - Human-activated emergency stop
 * - Automatic emergency stop (alignment < 90)
 * - Dead-man switch (requires periodic human confirmation)
 * 
 * Requirements: 20.6, 25.6
 */

import type { EmergencyStop } from './types';

/**
 * Emergency stop state
 */
interface EmergencyStopState {
  active: boolean;
  stops: EmergencyStop[];
  lastConfirmation?: Date;
  confirmationInterval: number; // milliseconds
}

/**
 * Global emergency stop state
 */
const emergencyState: EmergencyStopState = {
  active: false,
  stops: [],
  lastConfirmation: new Date(),
  confirmationInterval: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Activate human-triggered emergency stop
 * 
 * @param triggeredBy - Who triggered the stop
 * @param reason - Reason for emergency stop
 * @param affectedAgents - List of affected agent IDs
 * @returns Emergency stop record
 */
export function activateHumanEmergencyStop(
  triggeredBy: string,
  reason: string,
  affectedAgents: string[] = []
): EmergencyStop {
  const stop: EmergencyStop = {
    id: `emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'human_activated',
    reason,
    triggeredBy,
    timestamp: new Date(),
    affectedAgents,
    status: 'active',
  };

  emergencyState.active = true;
  emergencyState.stops.push(stop);

  console.error('[EMERGENCY STOP] Human-activated emergency stop:', stop);

  return stop;
}

/**
 * Activate automatic emergency stop (triggered by alignment < 90)
 * 
 * @param agentId - Agent that triggered the stop
 * @param alignmentScore - The alignment score that triggered the stop
 * @param reason - Detailed reason
 * @returns Emergency stop record
 */
export function activateAutomaticEmergencyStop(
  agentId: string,
  alignmentScore: number,
  reason: string
): EmergencyStop {
  const stop: EmergencyStop = {
    id: `emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'automatic',
    reason: `Automatic stop: ${reason} (alignment: ${alignmentScore})`,
    triggeredBy: 'system',
    timestamp: new Date(),
    affectedAgents: [agentId],
    status: 'active',
  };

  emergencyState.active = true;
  emergencyState.stops.push(stop);

  console.error('[EMERGENCY STOP] Automatic emergency stop:', stop);

  return stop;
}

/**
 * Check dead-man switch and activate if needed
 * 
 * @returns Emergency stop record if activated, undefined otherwise
 */
export function checkDeadManSwitch(): EmergencyStop | undefined {
  if (!emergencyState.lastConfirmation) {
    return undefined;
  }

  const timeSinceConfirmation =
    Date.now() - emergencyState.lastConfirmation.getTime();

  if (timeSinceConfirmation > emergencyState.confirmationInterval) {
    const stop: EmergencyStop = {
      id: `emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'dead_man_switch',
      reason: `No human confirmation for ${(timeSinceConfirmation / (1000 * 60 * 60)).toFixed(1)} hours`,
      triggeredBy: 'system',
      timestamp: new Date(),
      affectedAgents: [],
      status: 'active',
    };

    emergencyState.active = true;
    emergencyState.stops.push(stop);

    console.error('[EMERGENCY STOP] Dead-man switch activated:', stop);

    return stop;
  }

  return undefined;
}

/**
 * Confirm human presence (resets dead-man switch)
 * 
 * @param confirmedBy - Who confirmed
 */
export function confirmHumanPresence(confirmedBy: string): void {
  emergencyState.lastConfirmation = new Date();
  console.log(`[DEAD-MAN SWITCH] Human presence confirmed by ${confirmedBy}`);
}

/**
 * Check if emergency stop is active
 * 
 * @returns True if any emergency stop is active
 */
export function isEmergencyStopActive(): boolean {
  return emergencyState.active;
}

/**
 * Get all emergency stops
 * 
 * @returns Array of emergency stops
 */
export function getAllEmergencyStops(): EmergencyStop[] {
  return [...emergencyState.stops];
}

/**
 * Get active emergency stops
 * 
 * @returns Array of active emergency stops
 */
export function getActiveEmergencyStops(): EmergencyStop[] {
  return emergencyState.stops.filter(stop => stop.status === 'active');
}

/**
 * Resolve an emergency stop
 * 
 * @param stopId - The emergency stop ID
 * @param resolvedBy - Who resolved it
 */
export function resolveEmergencyStop(stopId: string, resolvedBy: string): void {
  const stop = emergencyState.stops.find(s => s.id === stopId);
  
  if (stop) {
    stop.status = 'resolved';
    console.log(`[EMERGENCY STOP] Resolved by ${resolvedBy}:`, stop);

    // Check if any stops are still active
    const activeStops = emergencyState.stops.filter(s => s.status === 'active');
    if (activeStops.length === 0) {
      emergencyState.active = false;
      console.log('[EMERGENCY STOP] All emergency stops resolved');
    }
  }
}

/**
 * Resolve all emergency stops
 * 
 * @param resolvedBy - Who resolved them
 */
export function resolveAllEmergencyStops(resolvedBy: string): void {
  for (const stop of emergencyState.stops) {
    if (stop.status === 'active') {
      stop.status = 'resolved';
    }
  }
  
  emergencyState.active = false;
  console.log(`[EMERGENCY STOP] All stops resolved by ${resolvedBy}`);
}

/**
 * Set dead-man switch confirmation interval
 * 
 * @param intervalMs - Interval in milliseconds
 */
export function setConfirmationInterval(intervalMs: number): void {
  emergencyState.confirmationInterval = intervalMs;
}

/**
 * Get time until dead-man switch activation
 * 
 * @returns Milliseconds until activation, or -1 if already activated
 */
export function getTimeUntilDeadManSwitch(): number {
  if (!emergencyState.lastConfirmation) {
    return 0;
  }

  const timeSinceConfirmation =
    Date.now() - emergencyState.lastConfirmation.getTime();
  const remaining = emergencyState.confirmationInterval - timeSinceConfirmation;

  return Math.max(0, remaining);
}

/**
 * Clear all emergency stops (for testing)
 */
export function clearEmergencyStops(): void {
  emergencyState.active = false;
  emergencyState.stops = [];
  emergencyState.lastConfirmation = new Date();
}
