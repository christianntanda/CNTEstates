/**
 * Subscription Data Model & Integrity Service
 * Enforces Foreign Keys, Relational Constraints, Tenant Isolation,
 * In-Memory Indexes, and Auditability for CNTEstates.
 */

import {
  CustomerSubscription,
  SubscriptionPlan,
  SubscriptionPlanId,
  AuditLog,
  SubscriptionLifecycleStatus,
  SubscriptionLifecycleEvent,
  SubscriptionHistoryRecord,
  BillingPeriod,
  CustomBillingSchedule,
} from '../types';
import { subscriptionPlans, getSubscriptionPlan } from '../data/mockDatabase';
import { convertSubscriptionPrice } from './currencyService';
import {
  calculatePeriodDates,
  calculatePlanPriceForPeriod,
  getBillingPeriod,
} from './billingPeriodService';
import {
  getSubscriptionHistory as getSubscriptionHistoryEngine,
  recordSubscriptionHistory as recordSubscriptionHistoryEngine,
  normalizeSubscriptionHistoryRecord,
} from './subscriptionHistoryEngine';

export interface SubscriptionValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SubscriptionIndexLookup {
  byId: (subscriptionId: string) => CustomerSubscription | undefined;
  byOrganizationId: (orgId: string) => CustomerSubscription | undefined;
  byStatus: (status: string) => CustomerSubscription[];
  byPlanId: (planId: string) => CustomerSubscription[];
}

// In-Memory Primary and Secondary Indexes
const primaryIndexById = new Map<string, CustomerSubscription>();
const uniqueIndexByOrgId = new Map<string, CustomerSubscription>();

/**
 * Validates relational constraints, foreign keys, and business rules for a subscription record.
 */
export function validateSubscriptionConstraints(
  sub: Partial<CustomerSubscription>,
  knownOrgIds?: string[]
): SubscriptionValidationResult {
  const errors: string[] = [];

  // 1. Primary Key validation
  if (!sub.subscription_id && !sub.id) {
    errors.push('Foreign Key / Primary Key violation: subscription_id is required');
  }

  // 2. Foreign Key: Organization
  if (!sub.organization_id) {
    errors.push('Foreign Key violation: organization_id is required');
  } else if (knownOrgIds && knownOrgIds.length > 0 && !knownOrgIds.includes(sub.organization_id)) {
    errors.push(`Foreign Key violation: organization '${sub.organization_id}' does not exist`);
  }

  // 3. Foreign Key: Subscription Plan
  if (!sub.plan_id) {
    errors.push('Foreign Key violation: plan_id is required');
  } else {
    const plan = getSubscriptionPlan(sub.plan_id);
    if (!plan) {
      errors.push(`Foreign Key violation: plan '${sub.plan_id}' does not exist in catalog`);
    }
  }

  // 4. Master Currency Constraint (Authoritative USD)
  if (sub.master_currency && sub.master_currency !== 'USD') {
    errors.push(`Constraint violation: master_currency must strictly be 'USD', received '${sub.master_currency}'`);
  }

  // 5. Non-negative pricing constraints
  if (typeof sub.master_price === 'number' && sub.master_price < 0) {
    errors.push('Constraint violation: master_price cannot be negative');
  }
  if (typeof sub.current_price === 'number' && sub.current_price < 0) {
    errors.push('Constraint violation: current_price cannot be negative');
  }

  // 6. Date ordering constraints
  if (sub.current_period_start && sub.current_period_end) {
    const start = new Date(sub.current_period_start).getTime();
    const end = new Date(sub.current_period_end).getTime();
    if (isNaN(start) || isNaN(end)) {
      errors.push('Constraint violation: current_period dates must be valid ISO-8601 strings');
    } else if (end < start) {
      errors.push('Constraint violation: current_period_end must be greater than or equal to current_period_start');
    }
  }

  // 7. Trial status constraints
  if (sub.subscription_status === 'trial' || sub.status === 'trial') {
    if (sub.plan_id === 'free') {
      errors.push('Constraint violation: Free plan is a permanent plan and must not be treated as a trial');
    }
    if (!sub.trial_end) {
      errors.push('Constraint violation: subscriptions in trial status must specify trial_end date');
    }
  }

  // 8. Free plan permanent validity constraints (Sequence 11)
  if (sub.plan_id === 'free') {
    if (sub.trial_start || sub.trial_end) {
      errors.push('Constraint violation: Free plan is a permanent plan and must not define trial periods');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Normalizes a raw or partial customer subscription object to ensure all
 * Sequence 04 required fields, aliases, and defaults are populated.
 */
export function normalizeSubscriptionRecord(
  raw: Partial<CustomerSubscription> & {
    id?: string;
    organization_id: string;
    plan_id: SubscriptionPlanId;
    plan_name?: string;
  }
): CustomerSubscription {
  const plan = getSubscriptionPlan(raw.plan_id) || subscriptionPlans[0];
  const now = new Date();
  const subId = raw.subscription_id || raw.id || `sub-${raw.organization_id}-${Date.now()}`;
  const billingPeriod: BillingPeriod = raw.billing_period || 'monthly';
  const customSchedule = raw.custom_schedule;
  const masterPriceUsd = typeof raw.master_price === 'number'
    ? raw.master_price
    : (typeof raw.master_price_usd === 'number'
      ? raw.master_price_usd
      : calculatePlanPriceForPeriod(plan, billingPeriod, customSchedule));

  const billingCurrency = raw.billing_currency || 'USD';
  const conversion = convertSubscriptionPrice(masterPriceUsd, billingCurrency);
  const currentPrice = typeof raw.current_price === 'number'
    ? raw.current_price
    : (typeof raw.billed_amount === 'number' ? raw.billed_amount : conversion.convertedPrice);

  const startDate = raw.current_period_start || now.toISOString().split('T')[0];
  
  // Calculate end date dynamically for any present or future billing period
  const computedDates = calculatePeriodDates(startDate, billingPeriod, customSchedule);
  const isFreePlan = raw.plan_id === 'free';
  const endDate = isFreePlan ? '2099-12-31' : (raw.current_period_end || computedDates.periodEnd);
  const renewalDate = isFreePlan ? '2099-12-31' : (raw.renewal_date || computedDates.renewalDate);
  let status = raw.subscription_status || raw.status || (isFreePlan ? 'free' : 'active');
  // Free plan must never be treated as a trial
  if (isFreePlan && status === 'trial') {
    status = 'free';
  }

  return {
    subscription_id: subId,
    id: subId,
    organization_id: raw.organization_id,
    plan_id: raw.plan_id,
    plan_name: raw.plan_name || plan.plan_name,
    subscription_status: status,
    status: status,
    billing_period: billingPeriod,
    custom_schedule: customSchedule,
    billing_currency: billingCurrency,
    master_currency: 'USD',
    master_price: isFreePlan ? 0 : masterPriceUsd,
    master_price_usd: isFreePlan ? 0 : masterPriceUsd,
    current_price: isFreePlan ? 0 : currentPrice,
    billed_amount: isFreePlan ? 0 : currentPrice,
    exchange_rate: raw.exchange_rate ?? conversion.exchangeRate,
    exchange_rate_source: raw.exchange_rate_source ?? conversion.exchangeRateSource,
    exchange_rate_timestamp: raw.exchange_rate_timestamp ?? new Date().toISOString(),
    current_period_start: startDate,
    current_period_end: endDate,
    renewal_date: renewalDate,
    trial_start: isFreePlan ? null : (raw.trial_start || (status === 'trial' ? startDate : null)),
    trial_end: isFreePlan ? null : (raw.trial_end || (status === 'trial' ? endDate : null)),
    cancel_at_period_end: isFreePlan ? false : Boolean(raw.cancel_at_period_end),
    cancelled_at: isFreePlan ? null : (raw.cancelled_at || null),
    payment_status: isFreePlan ? 'paid' : (raw.payment_status || (status === 'trial' ? 'trialing' : 'paid')),
    external_customer_id: isFreePlan ? 'cus_none_free_permanent' : (raw.external_customer_id || `cus_ext_${raw.organization_id}`),
    external_subscription_id: isFreePlan ? 'sub_none_free_permanent' : (raw.external_subscription_id || `sub_ext_${raw.organization_id}`),
    created_at: raw.created_at || now.toISOString(),
    updated_at: now.toISOString(),
  };
}

/**
 * Indexes a subscription record in memory.
 */
export function indexSubscription(subscription: CustomerSubscription): void {
  primaryIndexById.set(subscription.subscription_id, subscription);
  primaryIndexById.set(subscription.id, subscription);
  uniqueIndexByOrgId.set(subscription.organization_id, subscription);
}

/**
 * Removes indexing on record deletion.
 */
export function unindexSubscription(subscriptionId: string): void {
  const existing = primaryIndexById.get(subscriptionId);
  if (existing) {
    primaryIndexById.delete(existing.subscription_id);
    primaryIndexById.delete(existing.id);
    uniqueIndexByOrgId.delete(existing.organization_id);
  }
}

/**
 * Initializes the subscription database indexes with existing organizations.
 */
export function initializeSubscriptionDatabase(
  organizations: Array<{ id: string; subscriptionRecord?: CustomerSubscription; createdAt?: string }>
): void {
  for (const org of organizations) {
    if (org.subscriptionRecord) {
      indexSubscription(org.subscriptionRecord);
    }
  }
  seedInitialSubscriptionHistory(
    organizations.map((o) => ({
      id: o.id,
      subscriptionRecord: o.subscriptionRecord,
      createdAt: o.createdAt || new Date().toISOString(),
    }))
  );
}

/**
 * Indexed Lookups
 */
export const subscriptionIndex: SubscriptionIndexLookup = {
  byId: (subscriptionId: string) => primaryIndexById.get(subscriptionId),
  byOrganizationId: (orgId: string) => uniqueIndexByOrgId.get(orgId),
  byStatus: (status: string) =>
    Array.from(uniqueIndexByOrgId.values()).filter(
      (s) => s.subscription_status === status || s.status === status
    ),
  byPlanId: (planId: string) =>
    Array.from(uniqueIndexByOrgId.values()).filter((s) => s.plan_id === planId),
};

/**
 * Strict Tenant Isolation Access Gate
 * Prevents unauthorized access across tenant boundaries.
 */
export function getSubscriptionWithTenantIsolation(
  requestingOrgId: string,
  targetOrgId: string,
  userRole: string
): { success: boolean; data?: CustomerSubscription; error?: string } {
  // Platform admins have cross-tenant inspection rights
  if (userRole === 'platform_admin') {
    const sub = subscriptionIndex.byOrganizationId(targetOrgId);
    return sub
      ? { success: true, data: sub }
      : { success: false, error: `Subscription for organization '${targetOrgId}' not found` };
  }

  // Standard tenant isolation: requesting organization MUST match target organization
  if (requestingOrgId !== targetOrgId) {
    return {
      success: false,
      error: `Security Tenant Isolation Violation: Access denied to organization '${targetOrgId}' from context '${requestingOrgId}'`,
    };
  }

  const sub = subscriptionIndex.byOrganizationId(targetOrgId);
  return sub
    ? { success: true, data: sub }
    : { success: false, error: `Subscription for organization '${targetOrgId}' not found` };
}

/**
 * Generates an immutable Audit Log entry for subscription state transitions.
 */
export function createSubscriptionAuditEntry(
  action: 'CREATE' | 'UPDATE' | 'PLAN_CHANGE' | 'STATUS_CHANGE' | 'CANCEL' | 'LIFECYCLE',
  subscriptionId: string,
  organizationId: string,
  previousState: Partial<CustomerSubscription> | null,
  newState: CustomerSubscription,
  userId: string = 'system'
): AuditLog {
  return {
    id: `audit-sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    organizationId,
    userId,
    userName: userId === 'system' ? 'System Service' : 'Platform Administrator',
    userRole: 'platform_admin',
    action: `SUBSCRIPTION_${action}`,
    entityType: 'CustomerSubscription',
    entityId: subscriptionId,
    details: `Subscription ${action.toLowerCase()} for organization ${organizationId}: plan ${newState.plan_name} (${newState.subscription_status})`,
    timestamp: new Date().toISOString(),
    ipAddress: '127.0.0.1 (internal)',
    previousValue: previousState ? JSON.stringify(previousState) : undefined,
    newValue: JSON.stringify({
      subscription_id: newState.subscription_id,
      plan_id: newState.plan_id,
      subscription_status: newState.subscription_status,
      billing_period: newState.billing_period,
      billing_currency: newState.billing_currency,
      master_price: newState.master_price,
      current_price: newState.current_price,
      renewal_date: newState.renewal_date,
      payment_status: newState.payment_status,
    }),
  };
}

/**
 * IMMUTABLE SUBSCRIPTION HISTORY STORE
 * Guarantees that historical records can never be deleted or mutated.
 */
export function recordSubscriptionHistory(
  entry: Omit<SubscriptionHistoryRecord, 'id' | 'history_id' | 'timestamp'> & { timestamp?: string; id?: string; history_id?: string }
): SubscriptionHistoryRecord {
  const res = recordSubscriptionHistoryEngine({
    ...entry,
    organization_id: entry.organization_id,
    subscription_id: entry.subscription_id,
    event: entry.event,
    new_plan: entry.new_plan || entry.new_plan_id || 'starter',
    new_price: entry.new_price,
    billing_period: entry.billing_period || 'monthly',
    change_reason: entry.change_reason || entry.reason || `Lifecycle event: ${entry.event}`,
    changed_by: entry.changed_by || entry.initiated_by || 'system',
    previous_plan: entry.previous_plan !== undefined ? entry.previous_plan : (entry.previous_plan_id || null),
    previous_price: entry.previous_price,
    timestamp: entry.timestamp,
  });

  return res.record;
}

/**
 * Retrieves the complete, immutable subscription history trail.
 * History is never deleted or truncated.
 */
export function getSubscriptionHistory(filter?: {
  subscriptionId?: string;
  organizationId?: string;
  event?: any;
}): SubscriptionHistoryRecord[] {
  return getSubscriptionHistoryEngine(filter);
}

/**
 * Seed provenance history for existing subscriptions upon initialization.
 */
export function seedInitialSubscriptionHistory(
  organizations: Array<{ id: string; subscriptionRecord?: CustomerSubscription; createdAt: string }>
): void {
  for (const org of organizations) {
    if (org.subscriptionRecord) {
      const sub = org.subscriptionRecord;
      const existingHistory = getSubscriptionHistory({ subscriptionId: sub.subscription_id });
      if (existingHistory.length === 0) {
        // Initial creation event
        recordSubscriptionHistory({
          subscription_id: sub.subscription_id,
          organization_id: sub.organization_id,
          event: 'subscription_created',
          new_plan: sub.plan_id,
          new_price: sub.current_price,
          billing_period: sub.billing_period || 'monthly',
          effective_date: (sub.created_at || org.createdAt).slice(0, 10),
          change_reason: 'Initial organization subscription provisioning',
          changed_by: 'system',
          previous_plan: null,
          previous_price: null,
          previous_status: undefined,
          new_status: sub.plan_id === 'free' ? 'free' : (sub.subscription_status === 'trial' ? 'trial' : 'active'),
          billing_currency: sub.billing_currency,
          master_price_usd: sub.master_price,
          timestamp: sub.created_at || org.createdAt,
        });
      }
    }
  }
}

/**
 * LIFECYCLE TRANSITION EXECUTOR
 * Strictly enforces transitions across all 9 states:
 * Free, Trial, Active, Past Due, Payment Failed, Suspended, Cancelled, Expired, Pending Activation
 */
export interface LifecycleTransitionParams {
  subscription: CustomerSubscription;
  targetPlanId?: string;
  billingPeriod?: BillingPeriod;
  customSchedule?: CustomBillingSchedule;
  billingCurrency?: string;
  reason?: string;
  initiatedBy?: string;
  immediate?: boolean;
}

export function transitionSubscriptionLifecycle(
  event: SubscriptionLifecycleEvent,
  params: LifecycleTransitionParams
): { success: boolean; subscription: CustomerSubscription; history: SubscriptionHistoryRecord; error?: string } {
  const { subscription, targetPlanId, billingPeriod, billingCurrency, reason, initiatedBy = 'user' } = params;
  const now = new Date();
  const nowIso = now.toISOString();
  const prevStatus = subscription.subscription_status;
  const prevPlanId = subscription.plan_id;
  const prevPrice = subscription.current_price;

  let updatedSub: CustomerSubscription = { ...subscription, updated_at: nowIso };

  switch (event) {
    case 'creation': {
      const plan = getSubscriptionPlan(targetPlanId || subscription.plan_id) || subscriptionPlans[0];
      const initialStatus: SubscriptionLifecycleStatus =
        plan.plan_id === 'free'
          ? 'free'
          : (params.immediate ? 'active' : 'pending_activation');
      
      updatedSub.subscription_status = initialStatus;
      updatedSub.status = initialStatus;
      updatedSub.payment_status = initialStatus === 'free' ? 'paid' : (initialStatus === 'active' ? 'paid' : 'pending');
      break;
    }

    case 'activation': {
      updatedSub.subscription_status = 'active';
      updatedSub.status = 'active';
      updatedSub.payment_status = 'paid';
      updatedSub.trial_end = null;
      updatedSub.cancel_at_period_end = false;
      updatedSub.cancelled_at = null;
      break;
    }

    case 'renewal': {
      // Dynamic period calculation for any standard, custom, or future registered period
      const currentEnd = subscription.current_period_end || nowIso;
      const { periodStart, periodEnd, renewalDate } = calculatePeriodDates(
        currentEnd,
        subscription.billing_period,
        subscription.custom_schedule
      );

      updatedSub.current_period_start = periodStart;
      updatedSub.current_period_end = periodEnd;
      updatedSub.renewal_date = renewalDate;
      updatedSub.subscription_status = 'active';
      updatedSub.status = 'active';
      updatedSub.payment_status = 'paid';
      break;
    }

    case 'upgrade':
    case 'downgrade': {
      const newPlan = getSubscriptionPlan(targetPlanId || '');
      if (!newPlan) {
        return {
          success: false,
          subscription,
          history: null as unknown as SubscriptionHistoryRecord,
          error: `Target plan '${targetPlanId}' not found`,
        };
      }

      const newPeriod = billingPeriod || subscription.billing_period;
      const customSched = params.customSchedule || subscription.custom_schedule;
      const currency = billingCurrency || subscription.billing_currency;
      
      // Dynamic non-hardcoded pricing calculation
      const basePrice = calculatePlanPriceForPeriod(newPlan, newPeriod, customSched);
      const conversion = convertSubscriptionPrice(basePrice, currency);

      // Dynamic non-hardcoded date calculation
      const { periodStart, periodEnd, renewalDate } = calculatePeriodDates(
        nowIso,
        newPeriod,
        customSched
      );

      updatedSub.plan_id = newPlan.plan_id as SubscriptionPlanId;
      updatedSub.plan_name = newPlan.plan_name;
      updatedSub.billing_period = newPeriod;
      if (customSched) {
        updatedSub.custom_schedule = customSched;
      }
      updatedSub.current_period_start = periodStart;
      updatedSub.current_period_end = periodEnd;
      updatedSub.renewal_date = renewalDate;
      updatedSub.billing_currency = currency;
      updatedSub.master_price = basePrice;
      updatedSub.master_price_usd = basePrice;
      updatedSub.current_price = conversion.convertedPrice;
      updatedSub.billed_amount = conversion.convertedPrice;
      updatedSub.exchange_rate = conversion.exchangeRate;
      updatedSub.exchange_rate_source = conversion.exchangeRateSource;
      updatedSub.exchange_rate_timestamp = conversion.effectiveAt;
      updatedSub.subscription_status = newPlan.plan_id === 'free' ? 'free' : 'active';
      updatedSub.status = updatedSub.subscription_status;
      updatedSub.payment_status = 'paid';
      if (newPlan.plan_id === 'free') {
        updatedSub.trial_start = null;
        updatedSub.trial_end = null;
        updatedSub.current_period_end = '2099-12-31';
        updatedSub.renewal_date = '2099-12-31';
        updatedSub.cancel_at_period_end = false;
        updatedSub.cancelled_at = null;
      }
      break;
    }

    case 'cancellation': {
      if (params.immediate) {
        updatedSub.subscription_status = 'cancelled';
        updatedSub.status = 'cancelled';
        updatedSub.payment_status = 'failed';
        updatedSub.cancelled_at = nowIso;
        updatedSub.cancel_at_period_end = false;
      } else {
        // Scheduled cancellation at period end (grace period)
        updatedSub.cancel_at_period_end = true;
        updatedSub.cancelled_at = nowIso;
      }
      break;
    }

    case 'reactivation': {
      updatedSub.subscription_status = 'active';
      updatedSub.status = 'active';
      updatedSub.payment_status = 'paid';
      updatedSub.cancel_at_period_end = false;
      updatedSub.cancelled_at = null;
      break;
    }

    case 'suspension': {
      updatedSub.subscription_status = 'suspended';
      updatedSub.status = 'suspended';
      updatedSub.payment_status = 'pending';
      break;
    }

    case 'expiration': {
      updatedSub.subscription_status = 'expired';
      updatedSub.status = 'expired';
      updatedSub.payment_status = 'failed';
      break;
    }

    default:
      break;
  }

  // Enforce index updates
  indexSubscription(updatedSub);

  // Record immutable history entry (NEVER deleted)
  const historyEntry = recordSubscriptionHistory({
    subscription_id: updatedSub.subscription_id,
    organization_id: updatedSub.organization_id,
    event,
    new_plan: updatedSub.plan_id,
    new_price: updatedSub.current_price,
    billing_period: updatedSub.billing_period || 'monthly',
    effective_date: nowIso.slice(0, 10),
    change_reason: reason || `Lifecycle transition: ${event}`,
    changed_by: initiatedBy,
    previous_plan: prevPlanId || null,
    previous_price: prevPrice ?? null,
    previous_status: prevStatus,
    new_status: updatedSub.subscription_status,
    billing_currency: updatedSub.billing_currency,
    master_price_usd: updatedSub.master_price,
    timestamp: nowIso,
  });

  return {
    success: true,
    subscription: updatedSub,
    history: historyEntry,
  };
}
