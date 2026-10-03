/**
 * SEQUENCE 17 — AUTHORITATIVE USD MASTER PRICING ENGINE
 * 
 * The authoritative subscription-pricing currency is: USD
 * 
 * Master prices:
 * Free         $0
 * Starter      $25/month
 * Basic        $49/month
 * Professional $99/month
 * Business     $249/month
 * Enterprise   $499/month
 * 
 * CORE ARCHITECTURAL INVARIANTS:
 * 1. The USD price is the single source of truth across the platform.
 * 2. Converted currency values (ZAR, EUR, GBP, CAD, etc.) must NEVER overwrite the USD master price.
 * 3. Any attempt to mutate or overwrite the master price with localized or converted values is blocked.
 */

export interface MasterPlanPricing {
  planId: string;
  planName: string;
  cadence: 'monthly';
  usdPrice: number;
  formattedUsd: string;
  isFree: boolean;
  sourceOfTruth: true;
  description: string;
}

export const AUTHORITATIVE_MASTER_CURRENCY = 'USD' as const;

/**
 * Authoritative USD Master Pricing matrix (Source of Truth)
 */
export const USD_MASTER_PRICING: Record<string, MasterPlanPricing> = {
  free: {
    planId: 'free',
    planName: 'Free',
    cadence: 'monthly',
    usdPrice: 0,
    formattedUsd: '$0',
    isFree: true,
    sourceOfTruth: true,
    description: 'Essential property management starter tier for independent landlords',
  },
  starter: {
    planId: 'starter',
    planName: 'Starter',
    cadence: 'monthly',
    usdPrice: 25,
    formattedUsd: '$25/month',
    isFree: false,
    sourceOfTruth: true,
    description: 'Streamlined operational toolkit for emerging landlords',
  },
  basic: {
    planId: 'basic',
    planName: 'Basic',
    cadence: 'monthly',
    usdPrice: 49,
    formattedUsd: '$49/month',
    isFree: false,
    sourceOfTruth: true,
    description: 'Solid operational management for multi-unit properties',
  },
  professional: {
    planId: 'professional',
    planName: 'Professional',
    cadence: 'monthly',
    usdPrice: 99,
    formattedUsd: '$99/month',
    isFree: false,
    sourceOfTruth: true,
    description: 'Full-service tenant and maintenance workflow engine with SLA dispatch',
  },
  business: {
    planId: 'business',
    planName: 'Business',
    cadence: 'monthly',
    usdPrice: 249,
    formattedUsd: '$249/month',
    isFree: false,
    sourceOfTruth: true,
    description: 'Autonomous AI property operations and contractor bidding matrix',
  },
  enterprise: {
    planId: 'enterprise',
    planName: 'Enterprise',
    cadence: 'monthly',
    usdPrice: 499,
    formattedUsd: '$499/month',
    isFree: false,
    sourceOfTruth: true,
    description: 'Enterprise institutional grade infrastructure with custom compliance',
  },
};

/**
 * Retrieves the authoritative USD master price for a plan.
 * Returns the immutable USD source of truth.
 */
export function getMasterPriceUsd(planId: string): number {
  const normalized = (planId || '').toLowerCase().trim();
  const pricing = USD_MASTER_PRICING[normalized];
  if (pricing) return pricing.usdPrice;

  // Fallbacks for standard aliases
  if (normalized.includes('free')) return USD_MASTER_PRICING.free.usdPrice;
  if (normalized.includes('starter')) return USD_MASTER_PRICING.starter.usdPrice;
  if (normalized.includes('basic')) return USD_MASTER_PRICING.basic.usdPrice;
  if (normalized.includes('pro')) return USD_MASTER_PRICING.professional.usdPrice;
  if (normalized.includes('biz') || normalized.includes('business')) return USD_MASTER_PRICING.business.usdPrice;
  if (normalized.includes('ent') || normalized.includes('enterprise')) return USD_MASTER_PRICING.enterprise.usdPrice;

  return 249; // Default business tier
}

/**
 * Returns the human-readable formatted USD master price string.
 * Example: '$25/month', '$0', '$99/month'
 */
export function getFormattedMasterPrice(planId: string): string {
  const normalized = (planId || '').toLowerCase().trim();
  const pricing = USD_MASTER_PRICING[normalized];
  if (pricing) return pricing.formattedUsd;
  const price = getMasterPriceUsd(planId);
  return price === 0 ? '$0' : `$${price}/month`;
}

/**
 * Verifies whether a given USD price matches the authoritative USD master price.
 */
export function isMasterPriceUnaltered(planId: string, currentUsdPrice: number): boolean {
  const expected = getMasterPriceUsd(planId);
  return expected === currentUsdPrice;
}

/**
 * STRICT INVARIANT GUARD:
 * Enforces that converted currency values NEVER overwrite the USD master price.
 * If someone passes a converted price (e.g. 4445 ZAR, 235 EUR), this function
 * strictly returns the authoritative USD master price.
 */
export function protectMasterPriceFromConvertedOverwrite(
  planId: string,
  candidateMasterPrice?: number | null,
  candidateCurrency: string = 'USD'
): { masterPriceUsd: number; overwritePrevented: boolean } {
  const authoritativeUsd = getMasterPriceUsd(planId);

  // If candidate currency is not USD, candidateMasterPrice is potentially a converted value!
  // It must never overwrite the USD master price.
  if (candidateCurrency !== 'USD') {
    return {
      masterPriceUsd: authoritativeUsd,
      overwritePrevented: true,
    };
  }

  // If candidate value is missing or differs from authoritative USD source of truth, enforce USD source of truth
  if (candidateMasterPrice === undefined || candidateMasterPrice === null || candidateMasterPrice !== authoritativeUsd) {
    return {
      masterPriceUsd: authoritativeUsd,
      overwritePrevented: candidateMasterPrice !== undefined && candidateMasterPrice !== null && candidateMasterPrice !== authoritativeUsd,
    };
  }

  return {
    masterPriceUsd: authoritativeUsd,
    overwritePrevented: false,
  };
}

/**
 * Returns the full authoritative master pricing list in tier order.
 */
export function getAuthoritativeMasterPricingList(): MasterPlanPricing[] {
  return [
    USD_MASTER_PRICING.free,
    USD_MASTER_PRICING.starter,
    USD_MASTER_PRICING.basic,
    USD_MASTER_PRICING.professional,
    USD_MASTER_PRICING.business,
    USD_MASTER_PRICING.enterprise,
  ];
}

/**
 * Audits all subscription plans against the Sequence 17 USD Master Pricing source of truth.
 */
export function verifyMasterPricingIntegrity(plans?: Array<{ id: string; master_price?: number; monthly_price?: number }>): {
  verified: boolean;
  discrepancies: string[];
  plansChecked: number;
} {
  const discrepancies: string[] = [];
  const pricingList = getAuthoritativeMasterPricingList();

  if (plans && plans.length > 0) {
    for (const plan of plans) {
      const expected = getMasterPriceUsd(plan.id);
      const actual = plan.master_price ?? plan.monthly_price;
      if (actual !== undefined && actual !== expected) {
        discrepancies.push(
          `Plan '${plan.id}' has price $${actual} but authoritative Sequence 17 USD master price is $${expected}`
        );
      }
    }
  }

  return {
    verified: discrepancies.length === 0,
    discrepancies,
    plansChecked: pricingList.length,
  };
}
