/**
 * SEQUENCE 36 — CLI PRODUCTION VALIDATION RUNNER
 * 
 * Executes authoritative final production validation confirming:
 * - Subscription (6 plans, pricing, periods, capacity, feature entitlements, lifecycle)
 * - Billing (invoices, history, payment status sync, auditability)
 * - Currency (USD master, country default, formatting, timezone, exchange rate, zero decimal, historical invariance)
 * - Security (tenant isolation, RBAC, backend pricing, webhooks, audit logs)
 * - UX (pricing page, plan comparison, billing dashboard, upgrade, downgrade, invoice history, mobile layout)
 * - Data (existing data, functionality, customers, historical billing intact)
 */

import {
  runFinalProductionValidation,
  ProductionValidationCategory,
} from '../services/finalProductionValidation';

const filterArg = process.argv[2] as ProductionValidationCategory | undefined;

console.log('====================================================================');
console.log('  CNTEstates Final Production Validation Report (Sequence 36)');
console.log('====================================================================\n');

if (filterArg) {
  console.log(`Filtering for category: ${filterArg}\n`);
}

const report = runFinalProductionValidation(filterArg);

const reset = '\x1b[0m';
const green = '\x1b[32m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const bold = '\x1b[1m';

console.log(`Validation Run ID: ${report.validationId}`);
console.log(`Timestamp:         ${report.timestamp}`);
console.log(`Duration:          ${report.totalDurationMs}ms\n`);

console.log(`${bold}Category Breakdown:${reset}`);
for (const [cat, stats] of Object.entries(report.categories)) {
  const statusColor = stats.failed === 0 ? green : red;
  console.log(`  • ${bold}${cat.padEnd(14)}${reset}: ${statusColor}${stats.passed}/${stats.total} Passed${reset}`);
}
console.log('');

report.results.forEach((item, idx) => {
  const symbol = item.passed ? `${green}✓ CONFIRMED${reset}` : `${red}✗ FAILED${reset}`;
  console.log(`[${(idx + 1).toString().padStart(2, '0')}/${report.totalChecks}] ${symbol}  ${bold}${item.id}${reset} — ${cyan}[${item.category}]${reset} ${item.name}`);
  console.log(`       ${yellow}Requirement:${reset} ${item.requirement}`);
  console.log(`       ${cyan}Actual:${reset}      ${item.actual}`);
});

console.log('\n--------------------------------------------------------------------');
if (report.allPassed) {
  console.log(`${bold}${green}ALL ${report.totalChecks} PRODUCTION CRITERIA CONFIRMED! READY FOR FINAL RELEASE. (100% PASS)${reset}`);
} else {
  console.log(`${bold}${red}${report.failedChecks} OF ${report.totalChecks} PRODUCTION CRITERIA FAILED.${reset}`);
}
console.log('--------------------------------------------------------------------\n');

if (!report.allPassed) {
  process.exit(1);
} else {
  process.exit(0);
}
