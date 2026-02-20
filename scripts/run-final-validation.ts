#!/usr/bin/env tsx

/**
 * Final Validation Runner
 * 
 * This script runs the complete system validation for the Ordo platform.
 * It checks all major systems and provides a comprehensive report.
 */

import { runFinalValidation } from '../src/checkpoints/final-validation.test';

async function main() {
  console.log('🚀 Starting Ordo Platform Final Validation...\n');
  console.log('=' .repeat(80));
  console.log('ORDO DIGITAL CIVILIZATION PLATFORM - FINAL CHECKPOINT');
  console.log('=' .repeat(80));
  console.log();
  
  console.log('Validating all major systems:');
  console.log('  1. Constitutional AI and Safety Systems');
  console.log('  2. Alignment Monitoring and Capability Gates');
  console.log('  3. Infrastructure Optimization with Universal Constants');
  console.log('  4. Multi-Channel Gateway Integration');
  console.log('  5. Cost Optimization and FinOps');
  console.log('  6. Monitoring, Observability, and Heartbeat Daemon');
  console.log('  7. DeFi Integration and Deployment Systems');
  console.log('  8. End-to-End Integration');
  console.log();
  console.log('=' .repeat(80));
  console.log();
  
  try {
    const result = await runFinalValidation();
    
    console.log('📊 VALIDATION RESULTS:\n');
    
    result.results.forEach((r, index) => {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${index + 1}. ${r.system}`);
      console.log(`   ${r.details}`);
      console.log();
    });
    
    console.log('=' .repeat(80));
    
    if (result.passed) {
      console.log('✅ ALL SYSTEMS OPERATIONAL');
      console.log();
      console.log('The Ordo Digital Civilization Platform has passed all validation checks.');
      console.log('All major systems are functioning correctly and ready for deployment.');
      console.log();
      console.log('Next steps:');
      console.log('  1. Run full test suite: npm test');
      console.log('  2. Run property-based tests: npm run test:pbt');
      console.log('  3. Deploy to staging: npm run deploy:staging');
      console.log('  4. Monitor system metrics');
      console.log();
      process.exit(0);
    } else {
      console.log('❌ VALIDATION FAILED');
      console.log();
      console.log('Some systems did not pass validation. Please review the results above.');
      console.log('Fix the failing systems and run validation again.');
      console.log();
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ VALIDATION ERROR:');
    console.error(error);
    console.log();
    console.log('An unexpected error occurred during validation.');
    console.log('Please check the error message above and try again.');
    console.log();
    process.exit(1);
  }
}

main();
