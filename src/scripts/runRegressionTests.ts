/**
 * SEQUENCE 35 — CLI REGRESSION TEST RUNNER
 * 
 * Executes full platform regression testing across all 28 domains
 * to verify that the billing implementation does not break any existing
 * CNTEstates features.
 */

import { runFullRegressionTestSuite } from '../services/fullRegressionTestSuite';

const domainArg = process.argv[2];

console.log('===============================================================');
console.log('  CNTEstates Full Platform Regression Test Suite (Sequence 35)');
console.log('===============================================================\n');

if (domainArg) {
  console.log(`Filtering for domain: ${domainArg}`);
}

const report = runFullRegressionTestSuite(domainArg);

const reset = '\x1b[0m';
const green = '\x1b[32m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const bold = '\x1b[1m';

console.log(`Suite Run ID:   ${report.suiteId}`);
console.log(`Executed At:    ${report.timestamp}`);
console.log(`Domains Tested: ${report.domainsTested}/28`);
console.log(`Duration:       ${report.totalDurationMs}ms\n`);

report.results.forEach((test, idx) => {
  const symbol = test.passed ? `${green}✓ PASS${reset}` : `${red}✗ FAIL${reset}`;
  console.log(`[${(idx + 1).toString().padStart(2, '0')}/28] ${symbol}  ${bold}${test.id}${reset} — ${cyan}${test.domain}${reset}: ${test.name}`);
  console.log(`       ${yellow}Requirement:${reset} ${test.requirement}`);
  console.log(`       ${cyan}Actual:${reset}      ${test.actual}`);
  if (test.error) {
    console.log(`       ${red}Error:${reset}       ${test.error}`);
  }
});

console.log('\n---------------------------------------------------------------');
if (report.allPassed) {
  console.log(`${bold}${green}ALL ${report.totalTests} REGRESSION TESTS PASSED! ZERO CRITICAL REGRESSIONS FOUND. (100% HEALTHY)${reset}`);
} else {
  console.log(`${bold}${red}${report.failedTests} of ${report.totalTests} REGRESSION TESTS FAILED. PLEASE FIX IDENTIFIED ISSUES.${reset}`);
}
console.log('---------------------------------------------------------------\n');

if (!report.allPassed) {
  process.exit(1);
} else {
  process.exit(0);
}
