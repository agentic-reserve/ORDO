/**
 * Script to fix missing .js extensions in imports
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  // cross-domain
  'src/cross-domain/analogy-finder.ts',
  'src/cross-domain/domain-mastery.ts',
  'src/cross-domain/index.ts',
  'src/cross-domain/knowledge-transfer.ts',
  'src/cross-domain/meta-learning.ts',
  'src/cross-domain/performance-tracker.ts',
  
  // safety
  'src/safety/alignment-scoring.ts',
  'src/safety/anomaly-detection.ts',
  'src/safety/audit-log.ts',
  'src/safety/capability-gates.ts',
  'src/safety/constitution.ts',
  'src/safety/deception-detection.ts',
  'src/safety/emergency-stop.ts',
  'src/safety/index.ts',
  'src/safety/misalignment-blocking.ts',
  'src/safety/multi-sig.ts',
  'src/safety/prompt-injection.ts',
  'src/safety/violation-detector.ts',
];

function fixImports(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Fix relative imports without .js extension
  const patterns = [
    { from: /from ['"]\.\/types['"]/g, to: "from './types.js'" },
    { from: /from ['"]\.\/planner['"]/g, to: "from './planner.js'" },
    { from: /from ['"]\.\/simulator['"]/g, to: "from './simulator.js'" },
    { from: /from ['"]\.\/evaluator['"]/g, to: "from './evaluator.js'" },
    { from: /from ['"]\.\/forecaster['"]/g, to: "from './forecaster.js'" },
    { from: /from ['"]\.\/accuracy-tracker['"]/g, to: "from './accuracy-tracker.js'" },
    { from: /from ['"]\.\/strategy-adjuster['"]/g, to: "from './strategy-adjuster.js'" },
    { from: /from ['"]\.\/domain-mastery['"]/g, to: "from './domain-mastery.js'" },
    { from: /from ['"]\.\/analogy-finder['"]/g, to: "from './analogy-finder.js'" },
    { from: /from ['"]\.\/knowledge-transfer['"]/g, to: "from './knowledge-transfer.js'" },
    { from: /from ['"]\.\/alignment-scoring['"]/g, to: "from './alignment-scoring.js'" },
    { from: /from ['"]\.\/constitution['"]/g, to: "from './constitution.js'" },
    { from: /from ['"]\.\/anomaly-detection['"]/g, to: "from './anomaly-detection.js'" },
    { from: /from ['"]\.\/deception-detection['"]/g, to: "from './deception-detection.js'" },
    { from: /from ['"]\.\/multi-sig['"]/g, to: "from './multi-sig.js'" },
    { from: /from ['"]\.\/audit-log['"]/g, to: "from './audit-log.js'" },
    { from: /from ['"]\.\/emergency-stop['"]/g, to: "from './emergency-stop.js'" },
    { from: /from ['"]\.\/capability-gates['"]/g, to: "from './capability-gates.js'" },
    { from: /from ['"]\.\/prompt-injection['"]/g, to: "from './prompt-injection.js'" },
    { from: /from ['"]\.\/violation-detector['"]/g, to: "from './violation-detector.js'" },
  ];
  
  patterns.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
    }
  });
  
  // Fix export * from
  const exportPatterns = [
    { from: /export \* from ['"]\.\/types['"]/g, to: "export * from './types.js'" },
  ];
  
  exportPatterns.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Fixed ${filePath}`);
  } else {
    console.log(`- No changes needed for ${filePath}`);
  }
}

console.log('Fixing import statements...\n');
filesToFix.forEach(fixImports);
console.log('\nDone!');
