/**
 * SEQUENCE 07 — CENTRALIZED SUBSCRIPTION CAPACITY ENGINE
 * 
 * Authoritative Limits:
 * Plan          Rental Units        Properties
 * Free          2                   1
 * Starter       5                   1
 * Basic         50                  2
 * Professional  60 per property     5       (Per-property unit limit, NOT an org-wide 60-unit limit)
 * Business      250                 20
 * Enterprise    5,000               Unlimited (Unlimited properties, 5,000 units max)
 *
 * Enforced uniformly on backend and client.
 */

import {
  PlanCapacityLimits,
  CapacityValidationResult,
  CapacityUsage,
  Property,
  Unit,
} from '../types';

export const AUTHORITATIVE_CAPACITY_LIMITS: Record<string, PlanCapacityLimits> = {
  free: {
    planId: 'free',
    planName: 'Free Tier',
    maxProperties: 1,
    maxRentalUnits: 2,
    maxBuildings: 1,
    maxTeamSeats: 1,
    maxStorageGb: 1,
    maxMonthlyAiPrompts: 0,
    unitLimitType: 'organization_wide',
    description: 'Up to 2 rental units • 1 property • 1 building',
  },
  starter: {
    planId: 'starter',
    planName: 'Starter',
    maxProperties: 1,
    maxRentalUnits: 5,
    maxBuildings: 2,
    maxTeamSeats: 2,
    maxStorageGb: 5,
    maxMonthlyAiPrompts: 0,
    unitLimitType: 'organization_wide',
    description: 'Up to 5 rental units • 1 property • 2 buildings',
  },
  basic: {
    planId: 'basic',
    planName: 'CNTEstates Basic',
    maxProperties: 2,
    maxRentalUnits: 50,
    maxBuildings: 4,
    maxTeamSeats: 4,
    maxStorageGb: 15,
    maxMonthlyAiPrompts: 0,
    unitLimitType: 'organization_wide',
    description: 'Up to 50 rental units • Up to 2 properties • 4 buildings',
  },
  professional: {
    planId: 'professional',
    planName: 'CNTEstates Professional',
    maxProperties: 5,
    maxRentalUnits: 300, // 5 properties * 60 units/property max theoretical
    unitLimitType: 'per_property',
    maxUnitsPerProperty: 60,
    maxBuildings: 10,
    maxTeamSeats: 10,
    maxStorageGb: 50,
    maxMonthlyAiPrompts: 250,
    description: 'Up to 60 units per property • Up to 5 properties • 10 buildings',
  },
  business: {
    planId: 'business',
    planName: 'CNTEstates Business / Plus',
    maxProperties: 20,
    maxRentalUnits: 250,
    maxBuildings: 40,
    maxTeamSeats: 25,
    maxStorageGb: 250,
    maxMonthlyAiPrompts: 2500,
    unitLimitType: 'organization_wide',
    description: 'Up to 250 rental units • Up to 20 properties • 40 buildings',
  },
  enterprise: {
    planId: 'enterprise',
    planName: 'CNTEstates Enterprise',
    maxProperties: 'unlimited',
    maxRentalUnits: 5000,
    maxBuildings: 'unlimited',
    maxTeamSeats: 150,
    maxStorageGb: 'unlimited',
    maxMonthlyAiPrompts: 10000,
    unitLimitType: 'organization_wide',
    description: 'Up to 5,000 rental units • Unlimited properties & buildings',
  },
};

/**
 * Returns the authoritative plan capacity limits for any planId.
 */
export function getPlanCapacityLimits(planId: string = 'free'): PlanCapacityLimits {
  const normalizedId = (planId || 'free').toLowerCase();
  return (
    AUTHORITATIVE_CAPACITY_LIMITS[normalizedId] || {
      planId: normalizedId,
      planName: `${planId.toUpperCase()} Custom`,
      maxProperties: 5,
      maxRentalUnits: 100,
      maxBuildings: 10,
      maxTeamSeats: 10,
      maxStorageGb: 50,
      maxMonthlyAiPrompts: 250,
      unitLimitType: 'organization_wide',
      description: 'Custom configuration',
    }
  );
}

/**
 * Validates whether an organization can add an additional building structure under its plan.
 */
export function validateAddBuilding(
  planId: string,
  currentBuildingsCount: number
): CapacityValidationResult {
  const limits = getPlanCapacityLimits(planId);

  // Enterprise: unlimited buildings
  if (limits.maxBuildings === 'unlimited') {
    return {
      allowed: true,
      currentCount: currentBuildingsCount,
      maxLimit: 'unlimited',
      planId: limits.planId,
    };
  }

  const maxBldgs = (limits.maxBuildings as number) || 1;
  if (currentBuildingsCount >= maxBldgs) {
    return {
      allowed: false,
      code: 'PROPERTY_LIMIT_REACHED',
      reason: `Plan '${limits.planName}' limit reached: Maximum ${maxBldgs} ${
        maxBldgs === 1 ? 'building' : 'buildings'
      } allowed (currently ${currentBuildingsCount}). Please upgrade to add more buildings.`,
      currentCount: currentBuildingsCount,
      maxLimit: maxBldgs,
      planId: limits.planId,
    };
  }

  return {
    allowed: true,
    currentCount: currentBuildingsCount,
    maxLimit: maxBldgs,
    planId: limits.planId,
  };
}

/**
 * Validates whether an organization can add an additional property under its plan.
 */
export function validateAddProperty(
  planId: string,
  currentPropertiesCount: number
): CapacityValidationResult {
  const limits = getPlanCapacityLimits(planId);

  // Enterprise: unlimited properties
  if (limits.maxProperties === 'unlimited') {
    return {
      allowed: true,
      currentCount: currentPropertiesCount,
      maxLimit: 'unlimited',
      planId: limits.planId,
    };
  }

  const maxProps = limits.maxProperties as number;
  if (currentPropertiesCount >= maxProps) {
    return {
      allowed: false,
      code: 'PROPERTY_LIMIT_REACHED',
      reason: `Plan '${limits.planName}' limit reached: Maximum ${maxProps} ${
        maxProps === 1 ? 'property' : 'properties'
      } allowed (currently ${currentPropertiesCount}). Please upgrade to add more properties.`,
      currentCount: currentPropertiesCount,
      maxLimit: maxProps,
      planId: limits.planId,
    };
  }

  return {
    allowed: true,
    currentCount: currentPropertiesCount,
    maxLimit: maxProps,
    planId: limits.planId,
  };
}

/**
 * Validates whether a unit can be added to an organization/property.
 * CRITICAL RULE FOR PROFESSIONAL:
 * 60 units is a per-property limit, NOT an organization-wide limit.
 */
export function validateAddUnit(params: {
  planId: string;
  propertyId?: string;
  allUnits: Array<{ id?: string; propertyId?: string }>;
  properties?: Array<{ id: string; name?: string }>;
}): CapacityValidationResult {
  const { planId, propertyId, allUnits, properties = [] } = params;
  const limits = getPlanCapacityLimits(planId);

  // 1. Professional Plan: Strict Per-Property Limit of 60 units
  if (limits.unitLimitType === 'per_property') {
    const maxPerProp = limits.maxUnitsPerProperty || 60;

    if (!propertyId) {
      return {
        allowed: false,
        code: 'PER_PROPERTY_UNIT_LIMIT_REACHED',
        reason: `Target propertyId is required to validate unit capacity under the ${limits.planName} plan (60 units per property limit).`,
        currentCount: 0,
        maxLimit: maxPerProp,
        planId: limits.planId,
      };
    }

    const unitsForThisProperty = allUnits.filter((u) => u.propertyId === propertyId).length;
    const propertyObj = properties.find((p) => p.id === propertyId);
    const propName = propertyObj?.name ? `"${propertyObj.name}"` : `Property (${propertyId})`;

    if (unitsForThisProperty >= maxPerProp) {
      return {
        allowed: false,
        code: 'PER_PROPERTY_UNIT_LIMIT_REACHED',
        reason: `${limits.planName} per-property limit reached: ${propName} already has ${unitsForThisProperty} units (maximum ${maxPerProp} units per property allowed).`,
        currentCount: unitsForThisProperty,
        maxLimit: maxPerProp,
        planId: limits.planId,
        propertyId,
      };
    }

    return {
      allowed: true,
      currentCount: unitsForThisProperty,
      maxLimit: maxPerProp,
      planId: limits.planId,
      propertyId,
    };
  }

  // 2. Organization-Wide Limit Plans (Free, Starter, Basic, Business, Enterprise)
  const totalOrgUnits = allUnits.length;
  const maxUnits = limits.maxRentalUnits;

  if (maxUnits !== 'unlimited' && totalOrgUnits >= (maxUnits as number)) {
    return {
      allowed: false,
      code: 'UNIT_LIMIT_REACHED',
      reason: `Plan '${limits.planName}' limit reached: Maximum ${maxUnits} rental units allowed organization-wide (currently ${totalOrgUnits}). Please upgrade your subscription to add more units.`,
      currentCount: totalOrgUnits,
      maxLimit: maxUnits,
      planId: limits.planId,
    };
  }

  return {
    allowed: true,
    currentCount: totalOrgUnits,
    maxLimit: maxUnits,
    planId: limits.planId,
  };
}

/**
 * Calculates real-time capacity consumption metrics for an organization.
 */
export function calculateCapacityUsage(params: {
  organizationId: string;
  planId: string;
  properties: Property[];
  units: Unit[];
}): CapacityUsage {
  const { organizationId, planId, properties, units } = params;
  const limits = getPlanCapacityLimits(planId);

  const totalProperties = properties.length;
  const totalUnits = units.length;

  const maxProperties = limits.maxProperties;
  const propertiesRemaining: number | 'unlimited' =
    maxProperties === 'unlimited'
      ? 'unlimited'
      : Math.max(0, (maxProperties as number) - totalProperties);

  const maxUnits = limits.maxRentalUnits;
  const unitsRemaining: number | 'unlimited' =
    maxUnits === 'unlimited'
      ? 'unlimited'
      : Math.max(0, (maxUnits as number) - totalUnits);

  // Per-property breakdowns (vital for Professional plan and general visibility)
  const unitsByProperty = properties.map((prop) => {
    const propUnits = units.filter((u) => u.propertyId === prop.id).length;
    const maxUnitsAllowed: number | 'unlimited' =
      limits.unitLimitType === 'per_property'
        ? (limits.maxUnitsPerProperty || 60)
        : limits.maxRentalUnits;

    const remaining: number | 'unlimited' =
      maxUnitsAllowed === 'unlimited'
        ? 'unlimited'
        : Math.max(0, (maxUnitsAllowed as number) - propUnits);

    const isExceeded =
      maxUnitsAllowed === 'unlimited' ? false : propUnits >= (maxUnitsAllowed as number);

    return {
      propertyId: prop.id,
      propertyName: prop.name,
      unitCount: propUnits,
      maxUnitsAllowed,
      remainingUnits: remaining,
      isExceeded,
    };
  });

  const isPropertiesExceeded =
    maxProperties !== 'unlimited' && totalProperties >= (maxProperties as number);

  const isUnitsExceeded =
    limits.unitLimitType === 'per_property'
      ? unitsByProperty.some((p) => p.isExceeded)
      : maxUnits !== 'unlimited' && totalUnits >= (maxUnits as number);

  const canAddProperty =
    maxProperties === 'unlimited' || totalProperties < (maxProperties as number);

  return {
    organizationId,
    planId: limits.planId,
    planName: limits.planName,
    totalProperties,
    maxProperties,
    propertiesRemaining,
    totalUnits,
    maxUnits,
    unitsRemaining,
    unitLimitType: limits.unitLimitType,
    maxUnitsPerProperty: limits.maxUnitsPerProperty,
    unitsByProperty,
    isPropertiesExceeded,
    isUnitsExceeded,
    canAddProperty,
  };
}
