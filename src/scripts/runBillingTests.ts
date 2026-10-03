/**
 * SEQUENCE 34 — CLI TEST RUNNER
 * 
 * Runs the authoritative CNTEstates automated billing tests from the command line
 * and outputs formatted ANSI results and compliance report.
 */

import { runAutomatedBillingTestSuite, TestCategory } from '../services/automatedBillingTestSuite';

const categoryArg = process.argv[2] as TestCategory | undefined;

console.log('===============================================================');
console.log('  CNTEstates Authoritative Automated Billing Test Suite (Seq 34)');
console.log('===============================================================\n');

if (categoryArg) {
  console.log(`Filtering for category: ${categoryArg}`);
}

const report = runAutomatedBillingTestSuite(categoryArg);

const reset = '\x1b[0m';
const green = '\x1b[32m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const bold = '\x1b[1m';

console.log(`Suite Run ID: ${report.suiteId}`);
console.log(`Executed At:  ${report.executionTimestamp}`);
console.log(`Duration:     ${report.totalDurationMs}ms\n`);

for (const [catKey, catSummary] of Object.entries(report.categories)) {
  if (catSummary.totalTests === 0) continue;
  
  const statusColor = catSummary.allPassed ? green : red;
  const statusSymbol = catSummary.allPassed ? '✓' : '✗';

  console.log(`${bold}${cyan}[${catSummary.categoryName.toUpperCase()}]${reset} — ${statusColor}${statusSymbol} ${catSummary.passedTests}/${catSummary.totalTests} Passed${reset} (${catSummary.durationMs}ms)`);
  
  for (const test of catSummary.results) {
    const symbol = test.passed ? `${green}✓ PASS${reset}` : `${red}✗ FAIL${reset}`;
    console.log(`  ${symbol}  ${bold}${test.id}${reset}: ${test.name}`);
    console.log(`      ${yellow}Requirement:${reset} ${test.requirement}`);
    console.log(`      ${cyan}Actual:${reset}      ${test.actual}`);
    if (test.error) {
      console.log(`      ${red}Error:${reset}       ${test.error}`);
    }
  }
  console.log('');
}

console.log('---------------------------------------------------------------');
if (report.allPassed) {
  console.log(`${bold}${green}ALL ${report.totalTests} AUTOMATED TESTS PASSED SUCCESSFULLY! (100% COMPLIANCE)${reset}`);
} else {
  console.log(`${bold}${red}${report.failedTests} of ${report.totalTests} TESTS FAILED. PLEASE REVIEW FAILURES ABOVE.${reset}`);
}
console.log('---------------------------------------------------------------\n');

if (!report.allPassed) {
  process.exit(1);
} else {
  process.exit(0);
}
