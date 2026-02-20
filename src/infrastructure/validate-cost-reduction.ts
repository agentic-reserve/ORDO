#!/usr/bin/env node
/**
 * Cost Reduction Validation CLI
 * 
 * Command-line tool to validate 99.95% cost reduction vs EVM.
 * 
 * Usage:
 *   npm run validate-cost
 *   node dist/infrastructure/validate-cost-reduction.js
 * 
 * Requirements: 23.6
 */

import {
  validateRealisticCostReduction,
  validateCostReduction,
  generateCostReport,
  trackCostMetrics,
  calculateSolanaDailyCost,
  COST_CONSTANTS,
} from './cost-reduction-validator.js';

/**
 * Main validation function
 */
function main() {
  console.log('\n' + '='.repeat(70));
  console.log('ORDO PLATFORM - COST REDUCTION VALIDATION');
  console.log('='.repeat(70) + '\n');
  
  console.log('Target: 99.95% cost reduction vs EVM-based platforms');
  console.log(`Solana Target: $${COST_CONSTANTS.TARGET_SOLANA_COST_PER_AGENT}/agent/day`);
  console.log(`EVM Baseline: $${COST_CONSTANTS.TARGET_EVM_COST_PER_AGENT}/agent/day`);
  console.log('\n' + '-'.repeat(70) + '\n');
  
  // Validate across realistic scenarios
  const realisticValidation = validateRealisticCostReduction();
  
  console.log(realisticValidation.summary);
  console.log('\n' + '-'.repeat(70) + '\n');
  
  // Overall result
  if (realisticValidation.valid) {
    console.log('✓ VALIDATION PASSED');
    console.log('  All activity levels meet the 99.95% cost reduction target.');
    console.log('  Solana is 2000x+ cheaper than EVM for agent operations.');
  } else {
    console.log('✗ VALIDATION FAILED');
    console.log('  Some activity levels do not meet the cost reduction target.');
  }
  
  console.log('\n' + '-'.repeat(70) + '\n');
  
  // Demonstrate cost savings at scale
  console.log('COST SAVINGS AT SCALE\n');
  
  const agentCounts = [10, 100, 1000, 10000];
  
  agentCounts.forEach(count => {
    const metrics = Array.from({ length: count }, (_, i) =>
      trackCostMetrics(`agent-${i}`, calculateSolanaDailyCost())
    );
    
    const report = generateCostReport(metrics);
    
    console.log(`${count.toLocaleString()} Agents:`);
    console.log(`  Daily Cost (Solana): $${(report.avgSolanaCost * count).toFixed(2)}`);
    console.log(`  Daily Cost (EVM): $${(report.avgEVMCost * count).toFixed(2)}`);
    console.log(`  Daily Savings: $${report.totalSavings.toFixed(2)}`);
    console.log(`  Annual Savings: $${(report.totalSavings * 365).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`  Cost Reduction: ${report.avgCostReduction.toFixed(2)}%`);
    console.log('');
  });
  
  console.log('='.repeat(70) + '\n');
  
  // Exit with appropriate code
  process.exit(realisticValidation.valid ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };

