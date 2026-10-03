/**
 * Dynamic Billing Period Engine & Architecture
 * Supports current Standard Paid (Monthly), Quarterly, Annual,
 * Enterprise Custom Billing, and dynamically registered future periods.
 * DO NOT hard-code period logic elsewhere.
 */

import {
  BillingPeriod,
  BillingPeriodDefinition,
  CustomBillingSchedule,
  SubscriptionPlan,
} from '../types';

// Runtime Registry of Billing Period Definitions
const billingPeriodRegistry = new Map<string, BillingPeriodDefinition>();

// Standard Initial Configurations
export const standardBillingPeriods: BillingPeriodDefinition[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    shortName: 'mo',
    description: 'Current standard paid billing period with 30-day recurring settlement.',
    months: 1,
    defaultDiscountPercentage: 0,
    isStandardPaid: true, // Designated Standard Paid Period
    isEnterpriseOnly: false,
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    shortName: 'qtr',
    description: 'Billed every 3 months. Includes standard 10% volume commitment discount.',
    months: 3,
    defaultDiscountPercentage: 10,
    isStandardPaid: false,
    isEnterpriseOnly: false,
  },
  {
    id: 'annual',
    name: 'Annual',
    shortName: 'yr',
    description: 'Prepaid 12-month billing with 20% discount and priority SLA allotment.',
    months: 12,
    defaultDiscountPercentage: 20,
    isStandardPaid: false,
    isEnterpriseOnly: false,
  },
  {
    id: 'custom',
    name: 'Enterprise Custom Billing',
    shortName: 'custom',
    description: 'Bespoke enterprise contract terms (multi-year, milestone, custom installments, Net 30/60).',
    months: 0,
    defaultDiscountPercentage: 0,
    isStandardPaid: false,
    isEnterpriseOnly: true,
  },
];

// Seed registry
for (const p of standardBillingPeriods) {
  billingPeriodRegistry.set(p.id, p);
}

/**
 * Registers a new billing period dynamically at runtime.
 * Allows adding future periods (e.g. semi-annual, weekly, multi-year) without modifying engine code.
 */
export function registerBillingPeriod(def: BillingPeriodDefinition): void {
  billingPeriodRegistry.set(def.id, def);
}

/**
 * Retrieves a billing period definition by ID with fallback.
 */
export function getBillingPeriod(periodId: string): BillingPeriodDefinition {
  return (
    billingPeriodRegistry.get(periodId) || {
      id: periodId as BillingPeriod,
      name: periodId.charAt(0).toUpperCase() + periodId.slice(1).replace('_', ' '),
      shortName: periodId.slice(0, 3),
      description: `Configured billing period: ${periodId}`,
      months: 1,
      defaultDiscountPercentage: 0,
      isStandardPaid: false,
    }
  );
}

/**
 * Returns all active registered billing periods.
 */
export function getAllBillingPeriods(): BillingPeriodDefinition[] {
  return Array.from(billingPeriodRegistry.values());
}

/**
 * Calculates start, end, and renewal dates dynamically for ANY billing period or custom schedule.
 */
export function calculatePeriodDates(
  startDate: Date | string,
  periodId: BillingPeriod,
  customSchedule?: CustomBillingSchedule
): { periodStart: string; periodEnd: string; renewalDate: string } {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = new Date(start);

  if (periodId === 'custom' && customSchedule) {
    const { intervalUnit, intervalCount = 1 } = customSchedule;
    if (intervalUnit === 'years') {
      end.setFullYear(end.getFullYear() + intervalCount);
    } else if (intervalUnit === 'days') {
      end.setDate(end.getDate() + intervalCount);
    } else {
      // Default to months
      end.setMonth(end.getMonth() + intervalCount);
    }
  } else {
    const def = getBillingPeriod(periodId);
    const monthsToAdd = def.months > 0 ? def.months : 1;
    end.setMonth(end.getMonth() + monthsToAdd);
  }

  const startIso = start.toISOString().split('T')[0];
  const endIso = end.toISOString().split('T')[0];

  return {
    periodStart: startIso,
    periodEnd: endIso,
    renewalDate: endIso,
  };
}

/**
 * Calculates the authoritative master USD price for any plan under any billing period.
 */
export function calculatePlanPriceForPeriod(
  plan: SubscriptionPlan,
  periodId: BillingPeriod,
  customSchedule?: CustomBillingSchedule
): number {
  // Free tier is always $0
  if (plan.plan_id === 'free' || plan.master_price === 0) {
    return 0;
  }

  // 1. Explicit Enterprise Custom schedule base price
  if (periodId === 'custom' && customSchedule?.customBasePriceUsd !== undefined) {
    return Math.max(0, customSchedule.customBasePriceUsd);
  }

  // 2. Explicit plan period override if specified
  if (plan.period_pricing && plan.period_pricing[periodId] !== undefined) {
    return Math.max(0, plan.period_pricing[periodId]!);
  }

  // 3. Known standard period overrides
  if (periodId === 'monthly') {
    return plan.monthly_price || plan.master_price;
  }

  if (periodId === 'quarterly') {
    if (plan.quarterly_master_price !== undefined) {
      return plan.quarterly_master_price;
    }
    // Standard quarterly: 3 months with 10% discount
    const baseQuarterly = (plan.monthly_price || plan.master_price) * 3;
    return Math.round(baseQuarterly * 0.9);
  }

  if (periodId === 'annual') {
    return plan.annual_master_price;
  }

  // 4. Dynamic calculation for registered future periods
  const def = getBillingPeriod(periodId);
  const baseMonthly = plan.monthly_price || plan.master_price;
  const totalRaw = baseMonthly * (def.months > 0 ? def.months : 1);
  const discounted = totalRaw * (1 - (def.defaultDiscountPercentage || 0) / 100);
  return Math.round(discounted);
}

/**
 * Human-readable cadence formatter
 */
export function formatBillingCadenceLabel(
  periodId: BillingPeriod,
  customSchedule?: CustomBillingSchedule
): string {
  if (periodId === 'custom' && customSchedule) {
    return `Custom (${customSchedule.description || `${customSchedule.intervalCount} ${customSchedule.intervalUnit}`})`;
  }
  const def = getBillingPeriod(periodId);
  return def.name;
}
