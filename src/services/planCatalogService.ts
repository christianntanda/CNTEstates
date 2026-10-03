/**
 * SEQUENCE 23 — CENTRALIZED SUBSCRIPTION PLAN CATALOG ENGINE
 * 
 * Provides the single source of truth for the public CNTEstates pricing page
 * and subscription tier evaluations.
 * 
 * Guarantees:
 * 1. Zero duplication of pricing data inside frontend components.
 * 2. Displays all 6 authoritative tiers:
 *    • CNTEstates Free
 *    • CNTEstates Starter
 *    • CNTEstates Basic
 *    • CNTEstates Professional
 *    • CNTEstates Business / Plus
 *    • CNTEstates Enterprise
 * 3. Enforces authoritative prices, billing periods, unit capacities, property capacities,
 *    and included features directly from the catalog.
 */

import { SubscriptionPlan, BillingPeriod } from '../types';
import { subscriptionPlans, getSubscriptionPlan } from '../data/mockDatabase';
import { convertSubscriptionPrice } from './currencyService';
import { getMasterPriceUsd } from './masterPricingService';
import { AUTHORITATIVE_CAPACITY_LIMITS } from './capacityEngine';

export interface PlanCapacityDisplay {
  unitCapacityText: string;
  propertyCapacityText: string;
  buildingCapacityText: string;
  unitLimitType: 'organization_wide' | 'per_property';
  rawUnitLimit: number | 'unlimited';
  rawPropertyLimit: number | 'unlimited';
  rawBuildingLimit: number | 'unlimited';
}

export interface PlanPricingDisplay {
  billingPeriod: BillingPeriod;
  masterCurrency: 'USD';
  masterPriceUsd: number;
  periodMasterPriceUsd: number;
  formattedMasterPrice: string;
  isFree: boolean;
  currency: string;
  convertedPrice: number;
  formattedConvertedPrice: string;
  isConverted: boolean;
  exchangeRate: number;
  exchangeRateSource: string;
  discountPercentage: number;
  savingsText?: string;
}

export interface CentralizedPlanPresentation {
  plan: SubscriptionPlan;
  id: string;
  planCode: string;
  planName: string;
  description: string;
  isPopular: boolean;
  isEnterprise: boolean;
  badge?: string;
  pricing: PlanPricingDisplay;
  capacity: PlanCapacityDisplay;
  includedFeatures: string[];
  ctaText: string;
  ctaAction: 'start_free' | 'trial' | 'upgrade' | 'downgrade' | 'current' | 'contact_enterprise';
  disabled: boolean;
}

/**
 * Returns all six authoritative plans from the centralized catalog in canonical tier order.
 */
export function getCentralizedPlans(): SubscriptionPlan[] {
  // Ensure canonical tier sorting: Free -> Starter -> Basic -> Professional -> Business -> Enterprise
  const tierOrder: Record<string, number> = {
    free: 1,
    starter: 2,
    basic: 3,
    professional: 4,
    business: 5,
    enterprise: 6,
  };

  return [...subscriptionPlans].sort((a, b) => {
    const orderA = tierOrder[a.id] || tierOrder[a.plan_id] || 99;
    const orderB = tierOrder[b.id] || tierOrder[b.plan_id] || 99;
    return orderA - orderB;
  });
}

/**
 * Derives display metrics for rental-unit capacity and property capacity.
 */
export function getPlanCapacityDisplay(plan: SubscriptionPlan): PlanCapacityDisplay {
  const planKey = plan.id || plan.plan_id;
  const authoritativeLimit = AUTHORITATIVE_CAPACITY_LIMITS[planKey];

  const rawUnitLimit = authoritativeLimit?.maxRentalUnits ?? plan.max_rental_units ?? plan.unitsLimit;
  const rawPropertyLimit = authoritativeLimit?.maxProperties ?? plan.max_properties ?? plan.propertiesLimit;
  const rawBuildingLimit = authoritativeLimit?.maxBuildings ?? plan.max_buildings ?? 1;
  const unitLimitType = authoritativeLimit?.unitLimitType ?? plan.unit_limit_type ?? 'organization_wide';

  // Format Rental-Unit Capacity
  let unitCapacityText: string;
  if (rawUnitLimit === 'unlimited') {
    unitCapacityText = 'Unlimited rental units';
  } else if (planKey === 'professional' || unitLimitType === 'per_property') {
    unitCapacityText = '60 units / property (300 units max)';
  } else if (rawUnitLimit === 1) {
    unitCapacityText = '1 rental unit';
  } else {
    unitCapacityText = `${rawUnitLimit.toLocaleString()} rental units`;
  }

  // Format Property Capacity
  let propertyCapacityText: string;
  if (rawPropertyLimit === 'unlimited') {
    propertyCapacityText = 'Unlimited properties';
  } else if (rawPropertyLimit === 1) {
    propertyCapacityText = '1 property';
  } else {
    propertyCapacityText = `${rawPropertyLimit} properties`;
  }

  // Format Building Capacity
  let buildingCapacityText: string;
  if (rawBuildingLimit === 'unlimited') {
    buildingCapacityText = 'Unlimited buildings';
  } else if (rawBuildingLimit === 1) {
    buildingCapacityText = '1 building';
  } else {
    buildingCapacityText = `${rawBuildingLimit} buildings`;
  }

  return {
    unitCapacityText,
    propertyCapacityText,
    buildingCapacityText,
    unitLimitType,
    rawUnitLimit,
    rawPropertyLimit,
    rawBuildingLimit,
  };
}

/**
 * Calculates pricing for a given plan, billing period cadence, and target display currency.
 * Zero-decimal rule is strictly enforced on all converted values.
 */
export function getPlanPricingDisplay(
  plan: SubscriptionPlan,
  billingPeriod: BillingPeriod = 'monthly',
  targetCurrency: string = 'USD'
): PlanPricingDisplay {
  const isFree = plan.id === 'free' || plan.plan_id === 'free';
  const masterMonthlyUsd = getMasterPriceUsd(plan.id || plan.plan_id);

  let periodMasterPriceUsd: number;
  let discountPercentage = 0;
  let savingsText: string | undefined;

  if (isFree) {
    periodMasterPriceUsd = 0;
  } else if (billingPeriod === 'annual') {
    periodMasterPriceUsd = plan.annual_master_price || Math.round(masterMonthlyUsd * 0.8);
    discountPercentage = 20;
    savingsText = 'Save ~20% with annual commitment';
  } else if (billingPeriod === 'quarterly') {
    periodMasterPriceUsd = plan.quarterly_master_price ? Math.round(plan.quarterly_master_price / 3) : Math.round(masterMonthlyUsd * 0.9);
    discountPercentage = 10;
    savingsText = 'Save 10% with quarterly commitment';
  } else {
    periodMasterPriceUsd = masterMonthlyUsd;
  }

  const formattedMasterPrice = isFree ? '$0' : `$${periodMasterPriceUsd}`;

  // Currency Conversion (guarantees zero decimals via currencyService and zeroDecimalRuleService)
  const conversion = convertSubscriptionPrice(periodMasterPriceUsd, targetCurrency);

  return {
    billingPeriod,
    masterCurrency: 'USD',
    masterPriceUsd: masterMonthlyUsd,
    periodMasterPriceUsd,
    formattedMasterPrice,
    isFree,
    currency: targetCurrency,
    convertedPrice: conversion.convertedPrice,
    formattedConvertedPrice: isFree ? (targetCurrency === 'USD' ? '$0' : '0') : conversion.formattedConvertedPrice,
    isConverted: conversion.isConverted,
    exchangeRate: conversion.exchangeRate,
    exchangeRateSource: conversion.exchangeRateSource,
    discountPercentage,
    savingsText,
  };
}

/**
 * Resolves CTA button text, action, and state based on the user's current subscription.
 */
export function getPlanCtaDetails(
  plan: SubscriptionPlan,
  currentOrgPlanId?: string,
  isLoggedIn: boolean = false
): {
  ctaText: string;
  ctaAction: 'start_free' | 'trial' | 'upgrade' | 'downgrade' | 'current' | 'contact_enterprise';
  disabled: boolean;
} {
  const planId = plan.id || plan.plan_id;
  const isFree = planId === 'free';
  const isEnterprise = planId === 'enterprise';

  if (isLoggedIn && currentOrgPlanId) {
    if (currentOrgPlanId === planId) {
      return {
        ctaText: 'Current Plan',
        ctaAction: 'current',
        disabled: true,
      };
    }

    const tierRank: Record<string, number> = {
      free: 1,
      starter: 2,
      basic: 3,
      professional: 4,
      business: 5,
      enterprise: 6,
    };

    const currentRank = tierRank[currentOrgPlanId] || 1;
    const targetRank = tierRank[planId] || 1;

    if (isEnterprise) {
      return {
        ctaText: 'Contact Enterprise Sales',
        ctaAction: 'contact_enterprise',
        disabled: false,
      };
    }

    if (targetRank > currentRank) {
      return {
        ctaText: `Upgrade to ${plan.plan_name.replace('CNTEstates ', '')}`,
        ctaAction: 'upgrade',
        disabled: false,
      };
    }

    return {
      ctaText: `Downgrade to ${plan.plan_name.replace('CNTEstates ', '')}`,
      ctaAction: 'downgrade',
      disabled: false,
    };
  }

  // Not logged in or guest browsing public pricing page
  if (isEnterprise) {
    return {
      ctaText: 'Contact Enterprise Sales',
      ctaAction: 'contact_enterprise',
      disabled: false,
    };
  }

  if (isFree) {
    return {
      ctaText: 'Get Started Free',
      ctaAction: 'start_free',
      disabled: false,
    };
  }

  return {
    ctaText: 'Start 14-Day Free Trial',
    ctaAction: 'trial',
    disabled: false,
  };
}

/**
 * Assembles the presentation model for all six plans using the centralized plan catalog.
 */
export function getCentralizedPlanPresentations(
  billingPeriod: BillingPeriod = 'monthly',
  targetCurrency: string = 'USD',
  currentOrgPlanId?: string,
  isLoggedIn: boolean = false
): CentralizedPlanPresentation[] {
  const plans = getCentralizedPlans();

  return plans.map((plan) => {
    const planId = plan.id || plan.plan_id;
    const isPopular = planId === 'business';
    const isEnterprise = planId === 'enterprise';
    
    let badge: string | undefined;
    if (isPopular) badge = 'Most Popular';
    else if (isEnterprise) badge = 'Institutional Grade';
    else if (planId === 'professional') badge = 'Best Value for Growing Teams';

    const pricing = getPlanPricingDisplay(plan, billingPeriod, targetCurrency);
    const capacity = getPlanCapacityDisplay(plan);
    const cta = getPlanCtaDetails(plan, currentOrgPlanId, isLoggedIn);

    // Pull included features directly from plan.feature_entitlements or plan.features
    const includedFeatures = plan.feature_entitlements || plan.features || [];

    return {
      plan,
      id: planId,
      planCode: plan.plan_code || planId,
      planName: plan.plan_name,
      description: plan.description,
      isPopular,
      isEnterprise,
      badge,
      pricing,
      capacity,
      includedFeatures,
      ctaText: cta.ctaText,
      ctaAction: cta.ctaAction,
      disabled: cta.disabled,
    };
  });
}
