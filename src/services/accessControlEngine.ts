/**
 * SEQUENCE 10 — FEATURE ACCESS CONTROL ENGINE
 * 
 * Implements the authoritative 6-stage authorization pipeline:
 * 
 *   User
 *    ↓
 *   Organization
 *    ↓
 *   Subscription
 *    ↓
 *   Plan
 *    ↓
 *   Entitlement
 *    ↓
 *   Access Decision
 * 
 * Key Policy Rules:
 * • If a feature is not included:
 *   - Do not expose a broken interface.
 *   - Explain that the feature is unavailable under the current plan.
 *   - Show the relevant upgrade option.
 * • Do not delete existing data when a feature becomes unavailable.
 *   - All records remain safely retained and preserved.
 */

import {
  UserProfile,
  Organization,
  CustomerSubscription,
  FeatureKey,
  AccessDecision,
  AccessDecisionStage,
  AccessFlowTrace,
  SubscriptionPlanId,
  BillingPermission,
  UserRole,
} from '../types';
import {
  FEATURE_REGISTRY,
  PLAN_TIER_ORDER,
  PLAN_DISPLAY_NAMES,
  isFeatureEntitled,
} from './featureEntitlementEngine';
import { subscriptionPlans } from '../data/mockDatabase';
import {
  hasBillingPermission,
  getPermissionDenialExplanation,
  BILLING_PERMISSION_DEFINITIONS,
} from './billingRbacEngine';

export interface AccessEvaluationContext {
  user?: UserProfile | null;
  organization?: Organization | null;
  subscription?: CustomerSubscription | null;
  featureKey: FeatureKey;
  preservedRecordsCount?: number;
  preservedDataSummary?: string;
  contextData?: {
    rfqs?: any[];
    complianceCertificates?: any[];
    utilityMeters?: any[];
    automationRules?: any[];
    workOrders?: any[];
    leases?: any[];
    properties?: any[];
    units?: any[];
  };
}

/**
 * Returns count and description of preserved records for a specific feature
 * to guarantee users are reassured their data was not wiped during plan changes.
 */
export function getPreservedDataMetrics(
  featureKey: FeatureKey,
  contextData?: AccessEvaluationContext['contextData']
): { count: number; description: string } {
  if (!contextData) {
    return { count: 0, description: 'All historic records remain securely preserved in your tenant database.' };
  }

  switch (featureKey) {
    case 'rfq_management':
    case 'contractor_bidding': {
      const count = contextData.rfqs?.length || 0;
      return {
        count,
        description: count > 0
          ? `${count} RFQ procurement dossier(s) and contractor bids are preserved.`
          : 'All historical RFQ and contractor bidding data remains preserved.',
      };
    }
    case 'compliance_automation':
    case 'custom_compliance': {
      const count = contextData.complianceCertificates?.length || 0;
      return {
        count,
        description: count > 0
          ? `${count} compliance certificate(s) and inspection logs remain safely preserved.`
          : 'All historical compliance records remain preserved.',
      };
    }
    case 'utility_submetering': {
      const count = contextData.utilityMeters?.length || 0;
      return {
        count,
        description: count > 0
          ? `${count} utility sub-meter reading(s) and consumption histories are preserved.`
          : 'All utility meter logs remain safely preserved.',
      };
    }
    case 'sla_automation': {
      const count = contextData.automationRules?.length || 0;
      return {
        count,
        description: count > 0
          ? `${count} SLA automation rule(s) and trigger workflows are preserved.`
          : 'All SLA automation policies remain preserved.',
      };
    }
    case 'work_order_dispatch': {
      const count = contextData.workOrders?.length || 0;
      return {
        count,
        description: count > 0
          ? `${count} dispatched work order record(s) and contractor logs are preserved.`
          : 'All work order records remain preserved.',
      };
    }
    case 'document_vault': {
      const count = contextData.leases?.length || 0;
      return {
        count,
        description: count > 0
          ? `${count} contract document(s) and signed lease files remain safely encrypted in the vault.`
          : 'All vault documents and lease archives remain safely preserved.',
      };
    }
    default:
      return {
        count: 0,
        description: 'All historical data and records remain safely preserved and will become accessible upon upgrading.',
      };
  }
}

/**
 * Execute the 6-stage feature access control pipeline
 */
export function evaluateFeatureAccess(context: AccessEvaluationContext): AccessDecision {
  const { user, organization, subscription, featureKey, contextData } = context;
  const evaluatedAt = new Date().toISOString();

  const definition = FEATURE_REGISTRY[featureKey] || {
    key: featureKey,
    name: featureKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    shortDescription: 'Platform capability',
    detailedDescription: 'Operational platform capability',
    category: 'core_operations' as const,
    categoryName: 'Platform Operations',
    minPlan: 'free' as const,
    minPlanName: 'Free Tier',
    availableInPlans: ['free', 'starter', 'basic', 'professional', 'business', 'enterprise'],
    icon: 'Shield',
    businessValue: 'Standard platform capability',
  };

  const preservedInfo = getPreservedDataMetrics(featureKey, contextData);
  const preservedCount = context.preservedRecordsCount ?? preservedInfo.count;
  const preservedSummary = context.preservedDataSummary ?? preservedInfo.description;

  // Initialize flow trace
  const flowTrace: AccessFlowTrace = {
    user: {
      id: user?.id || 'anonymous_user',
      name: user?.name || 'Anonymous User',
      role: user?.role || 'org_owner',
      organizationId: user?.organizationId || organization?.id || 'unknown_org',
      status: user ? 'authenticated' : 'unauthenticated',
      passed: false,
    },
    organization: {
      id: organization?.id || 'unknown_org',
      name: organization?.name || 'Unknown Organization',
      status: organization ? 'active' : 'missing',
      passed: false,
    },
    subscription: {
      id: subscription?.subscription_id || subscription?.id || `sub-${organization?.id || 'unknown'}`,
      status: subscription?.subscription_status || organization?.subscriptionStatus || 'active',
      planId: subscription?.plan_id || organization?.planId || 'free',
      isUsable: false,
      passed: false,
    },
    plan: {
      id: subscription?.plan_id || organization?.planId || 'free',
      name: PLAN_DISPLAY_NAMES[subscription?.plan_id || organization?.planId || 'free'] || 'Free Tier',
      tierScore: PLAN_TIER_ORDER[subscription?.plan_id || organization?.planId || 'free'] ?? 0,
      passed: false,
    },
    entitlement: {
      featureKey,
      featureName: definition.name,
      minPlan: definition.minPlan,
      minPlanName: definition.minPlanName,
      isIncluded: false,
      passed: false,
    },
    decision: {
      granted: false,
      evaluatedAt,
      reasonCode: 'EVALUATING',
    },
  };

  // Helper to resolve upgrade option
  const resolveUpgradeOption = (minRequiredPlanId: string) => {
    const targetPlan = subscriptionPlans.find((p) => p.id === minRequiredPlanId) || subscriptionPlans[3];
    return {
      targetPlanId: targetPlan.id,
      targetPlanName: targetPlan.plan_name || PLAN_DISPLAY_NAMES[minRequiredPlanId] || minRequiredPlanId,
      monthlyPriceUsd: targetPlan.monthly_price ?? targetPlan.master_price ?? 99,
      upgradeCtaText: `Upgrade to ${PLAN_DISPLAY_NAMES[minRequiredPlanId] || minRequiredPlanId}`,
      featureHighlight: definition.businessValue,
    };
  };

  // ==========================================
  // STAGE 1: USER EVALUATION
  // ==========================================
  if (!user && !organization) {
    flowTrace.user.passed = false;
    flowTrace.decision = {
      granted: false,
      evaluatedAt,
      deniedAtStage: 'user',
      reasonCode: 'USER_UNAUTHENTICATED',
    };
    return {
      granted: false,
      featureKey,
      featureName: definition.name,
      category: definition.category,
      categoryName: definition.categoryName,
      deniedAtStage: 'user',
      reason: 'User session is unauthenticated. Please sign in to verify organization permissions.',
      explanation: `Feature '${definition.name}' is unavailable because no authenticated user was identified.`,
      currentPlanId: 'unknown',
      currentPlanName: 'Unauthenticated',
      dataPreserved: true,
      preservedRecordsCount: preservedCount,
      preservedDataSummary: preservedSummary,
      flowTrace,
    };
  }
  flowTrace.user.passed = true;

  // ==========================================
  // STAGE 2: ORGANIZATION EVALUATION
  // ==========================================
  const activeOrgId = user?.organizationId || organization?.id;
  if (!activeOrgId) {
    flowTrace.organization.passed = false;
    flowTrace.decision = {
      granted: false,
      evaluatedAt,
      deniedAtStage: 'organization',
      reasonCode: 'ORGANIZATION_UNRESOLVED',
    };
    return {
      granted: false,
      featureKey,
      featureName: definition.name,
      category: definition.category,
      categoryName: definition.categoryName,
      deniedAtStage: 'organization',
      reason: 'No active tenant organization is linked to the current session.',
      explanation: `Feature '${definition.name}' is unavailable because the tenant organization could not be resolved.`,
      currentPlanId: 'unknown',
      currentPlanName: 'No Organization',
      dataPreserved: true,
      preservedRecordsCount: preservedCount,
      preservedDataSummary: preservedSummary,
      flowTrace,
    };
  }
  flowTrace.organization.passed = true;

  // ==========================================
  // STAGE 3: SUBSCRIPTION EVALUATION
  // ==========================================
  const subStatus = subscription?.subscription_status || organization?.subscriptionStatus || 'active';
  const isSuspendedOrExpired = subStatus === 'suspended' || subStatus === 'expired' || subStatus === 'cancelled';

  // Core free tier features are permitted even in suspended states to avoid lockout,
  // but paid features require a usable subscription.
  const isPaidFeature = definition.minPlan !== 'free';
  if (isSuspendedOrExpired && isPaidFeature) {
    flowTrace.subscription.passed = false;
    flowTrace.subscription.isUsable = false;
    flowTrace.decision = {
      granted: false,
      evaluatedAt,
      deniedAtStage: 'subscription',
      reasonCode: 'SUBSCRIPTION_INACTIVE',
    };
    return {
      granted: false,
      featureKey,
      featureName: definition.name,
      category: definition.category,
      categoryName: definition.categoryName,
      deniedAtStage: 'subscription',
      reason: `Organization subscription is ${subStatus}. Reactivate subscription to restore access.`,
      explanation: `Feature '${definition.name}' is temporarily unavailable because your organization's subscription is currently ${subStatus}.`,
      currentPlanId: flowTrace.plan.id,
      currentPlanName: flowTrace.plan.name,
      requiredPlanId: definition.minPlan,
      requiredPlanName: definition.minPlanName,
      upgradeOption: resolveUpgradeOption(definition.minPlan),
      dataPreserved: true,
      preservedRecordsCount: preservedCount,
      preservedDataSummary: preservedSummary,
      flowTrace,
    };
  }
  flowTrace.subscription.passed = true;
  flowTrace.subscription.isUsable = true;

  // ==========================================
  // STAGE 4: PLAN EVALUATION
  // ==========================================
  const effectivePlanId = (subscription?.plan_id || organization?.planId || 'free').toLowerCase();
  const currentPlanName = PLAN_DISPLAY_NAMES[effectivePlanId] || effectivePlanId;
  const currentTierScore = PLAN_TIER_ORDER[effectivePlanId] ?? 0;
  flowTrace.plan.id = effectivePlanId;
  flowTrace.plan.name = currentPlanName;
  flowTrace.plan.tierScore = currentTierScore;
  flowTrace.plan.passed = true;

  // ==========================================
  // STAGE 5: ENTITLEMENT EVALUATION
  // ==========================================
  const isEntitled = isFeatureEntitled(effectivePlanId, featureKey);
  flowTrace.entitlement.isIncluded = isEntitled;

  if (!isEntitled) {
    flowTrace.entitlement.passed = false;
    flowTrace.decision = {
      granted: false,
      evaluatedAt,
      deniedAtStage: 'entitlement',
      reasonCode: 'FEATURE_NOT_INCLUDED_IN_PLAN',
    };

    return {
      granted: false,
      featureKey,
      featureName: definition.name,
      category: definition.category,
      categoryName: definition.categoryName,
      deniedAtStage: 'entitlement',
      reason: `'${definition.name}' requires the ${definition.minPlanName} plan or higher (currently on ${currentPlanName}).`,
      explanation: `This feature is unavailable under your current plan (${currentPlanName}).`,
      currentPlanId: effectivePlanId,
      currentPlanName,
      requiredPlanId: definition.minPlan,
      requiredPlanName: definition.minPlanName,
      upgradeOption: resolveUpgradeOption(definition.minPlan),
      dataPreserved: true, // "Do not delete existing data when a feature becomes unavailable."
      preservedRecordsCount: preservedCount,
      preservedDataSummary: preservedSummary,
      flowTrace,
    };
  }

  // ==========================================
  // STAGE 6: ACCESS DECISION (GRANTED)
  // ==========================================
  flowTrace.entitlement.passed = true;
  flowTrace.decision = {
    granted: true,
    evaluatedAt,
    reasonCode: 'ACCESS_GRANTED',
  };

  return {
    granted: true,
    featureKey,
    featureName: definition.name,
    category: definition.category,
    categoryName: definition.categoryName,
    reason: `Access granted under ${currentPlanName} plan.`,
    explanation: `Feature '${definition.name}' is included and active in your ${currentPlanName} subscription.`,
    currentPlanId: effectivePlanId,
    currentPlanName,
    dataPreserved: true,
    preservedRecordsCount: preservedCount,
    preservedDataSummary: preservedSummary,
    flowTrace,
  };
}

/**
 * Batch evaluates all features for a user and organization
 */
export function evaluateAllFeaturesAccess(context: Omit<AccessEvaluationContext, 'featureKey'>): Record<FeatureKey, AccessDecision> {
  const result: Record<string, AccessDecision> = {};
  for (const [key] of Object.entries(FEATURE_REGISTRY)) {
    result[key] = evaluateFeatureAccess({
      ...context,
      featureKey: key as FeatureKey,
    });
  }
  return result as Record<FeatureKey, AccessDecision>;
}

/**
 * SEQUENCE 28 — RBAC Access Evaluator
 * Evaluates whether a user role is authorized to perform a specific billing operation
 * using the existing CNTEstates authorization pipeline architecture.
 */
export interface BillingRbacDecision {
  granted: boolean;
  permission: BillingPermission;
  permissionName: string;
  role: string;
  deniedAtStage?: 'user' | 'organization' | 'rbac';
  reason: string;
  explanation: string;
}

export function evaluateBillingRbacAccess(context: {
  user?: UserProfile | null;
  role?: UserRole | string;
  organization?: Organization | null;
  permission: BillingPermission;
}): BillingRbacDecision {
  const evaluatedRole = (context.role || context.user?.role || 'unknown') as UserRole;
  const def = BILLING_PERMISSION_DEFINITIONS[context.permission];
  const permissionName = def?.name || context.permission;

  if (!context.user && !context.role) {
    return {
      granted: false,
      permission: context.permission,
      permissionName,
      role: evaluatedRole,
      deniedAtStage: 'user',
      reason: 'User session is unauthenticated. Please sign in with an authorized role.',
      explanation: `Operation '${permissionName}' is unavailable because no user role was identified.`,
    };
  }

  const isAuthorized = hasBillingPermission(evaluatedRole, context.permission);

  if (!isAuthorized) {
    return {
      granted: false,
      permission: context.permission,
      permissionName,
      role: evaluatedRole,
      deniedAtStage: 'rbac',
      reason: getPermissionDenialExplanation(evaluatedRole, context.permission),
      explanation: `Role '${evaluatedRole}' is not permitted to perform '${permissionName}'.`,
    };
  }

  return {
    granted: true,
    permission: context.permission,
    permissionName,
    role: evaluatedRole,
    reason: `Access granted for '${permissionName}' under role '${evaluatedRole}'.`,
    explanation: `User role '${evaluatedRole}' possesses authorized '${permissionName}' privileges.`,
  };
}

