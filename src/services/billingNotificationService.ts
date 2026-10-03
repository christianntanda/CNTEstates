/**
 * SEQUENCE 25 — AUTHORITATIVE BILLING NOTIFICATION ENGINE
 * 
 * Fully integrated with the existing CNTEstates notification system.
 * Supports all 13 mandated billing events:
 * • subscription_activated
 * • invoice_generated
 * • payment_successful
 * • payment_failed
 * • invoice_due
 * • invoice_overdue
 * • subscription_renewed
 * • plan_upgraded
 * • plan_downgraded
 * • subscription_cancelled
 * • subscription_suspended
 * • capacity_approaching
 * • capacity_reached
 * 
 * Enforces authoritative localized message generation across EN, FR, ES, PT.
 */

import { AppNotification, Language } from '../types';
import { translations } from '../i18n/translations';

export type BillingNotificationEvent =
  | 'subscription_activated'
  | 'invoice_generated'
  | 'payment_successful'
  | 'payment_failed'
  | 'invoice_due'
  | 'invoice_overdue'
  | 'subscription_renewed'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'subscription_cancelled'
  | 'subscription_suspended'
  | 'capacity_approaching'
  | 'capacity_reached';

export interface BillingNotificationPayload {
  plan?: string;
  amount?: number | string;
  currency?: string;
  invoiceNumber?: string;
  dueDate?: string;
  quotaType?: 'rental units' | 'properties' | 'buildings' | string;
  used?: number;
  max?: number | string;
  percentage?: number;
  customDetails?: string;
}

export interface BillingNotificationDefinition {
  event: BillingNotificationEvent;
  label: string;
  severity: 'emergency' | 'warning' | 'info' | 'success';
  description: string;
}

export const BILLING_NOTIFICATION_DEFINITIONS: Record<BillingNotificationEvent, BillingNotificationDefinition> = {
  subscription_activated: {
    event: 'subscription_activated',
    label: 'Subscription Activated',
    severity: 'success',
    description: 'Triggered when an organization activates a new paid or free subscription tier.',
  },
  invoice_generated: {
    event: 'invoice_generated',
    label: 'Invoice Generated',
    severity: 'info',
    description: 'Triggered when a recurring or upgrade pro-rata invoice is issued.',
  },
  payment_successful: {
    event: 'payment_successful',
    label: 'Payment Successful',
    severity: 'success',
    description: 'Triggered upon successful settlement of a billing subscription invoice.',
  },
  payment_failed: {
    event: 'payment_failed',
    label: 'Payment Failed',
    severity: 'emergency',
    description: 'Triggered when an automatic card charge or invoice settlement fails.',
  },
  invoice_due: {
    event: 'invoice_due',
    label: 'Invoice Due',
    severity: 'warning',
    description: 'Advance reminder sent before an invoice due date.',
  },
  invoice_overdue: {
    event: 'invoice_overdue',
    label: 'Invoice Overdue',
    severity: 'warning',
    description: 'Urgent notice dispatched when an invoice has passed its settlement date without payment.',
  },
  subscription_renewed: {
    event: 'subscription_renewed',
    label: 'Subscription Renewed',
    severity: 'success',
    description: 'Triggered upon successful periodic renewal of the current active plan.',
  },
  plan_upgraded: {
    event: 'plan_upgraded',
    label: 'Plan Upgraded',
    severity: 'success',
    description: 'Dispatched when an account upgrades to a higher subscription tier with increased capacity.',
  },
  plan_downgraded: {
    event: 'plan_downgraded',
    label: 'Plan Downgraded',
    severity: 'info',
    description: 'Dispatched when an account moves to a lower tier with quota adjustments.',
  },
  subscription_cancelled: {
    event: 'subscription_cancelled',
    label: 'Subscription Cancelled',
    severity: 'warning',
    description: 'Dispatched when cancellation is scheduled at the end of the billing period.',
  },
  subscription_suspended: {
    event: 'subscription_suspended',
    label: 'Subscription Suspended',
    severity: 'emergency',
    description: 'Dispatched when account access is frozen due to persistent payment default or arrears.',
  },
  capacity_approaching: {
    event: 'capacity_approaching',
    label: 'Capacity Approaching',
    severity: 'warning',
    description: 'Triggered when unit, property, or building usage reaches 80% to 95% of plan quota.',
  },
  capacity_reached: {
    event: 'capacity_reached',
    label: 'Capacity Reached',
    severity: 'emergency',
    description: 'Triggered when unit, property, or building limit is 100% full, pausing new asset creation.',
  },
};

/**
 * Replaces `{key}` placeholders in a template string with values from the payload.
 */
function interpolateTemplate(template: string, payload: BillingNotificationPayload): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = (payload as Record<string, unknown>)[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

/**
 * Builds an authoritative localized AppNotification for any of the 13 billing events.
 */
export function createBillingNotification(
  event: BillingNotificationEvent,
  payload: BillingNotificationPayload = {},
  lang: Language = 'en'
): AppNotification {
  const definition = BILLING_NOTIFICATION_DEFINITIONS[event];
  const langKey: Language = (['en', 'fr', 'es', 'pt'].includes(lang) ? lang : 'en') as Language;
  const langDict = translations[langKey] || translations.en;
  const templateObj = langDict.billingNotifications?.[event] || translations.en.billingNotifications[event];

  // Default values for common interpolations
  const safePayload: BillingNotificationPayload = {
    plan: payload.plan || 'CNTEstates Plan',
    amount: payload.amount !== undefined ? payload.amount : '0',
    currency: payload.currency || 'USD',
    invoiceNumber: payload.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    dueDate: payload.dueDate || 'due date',
    quotaType: payload.quotaType || 'rental units',
    used: payload.used !== undefined ? payload.used : 0,
    max: payload.max !== undefined ? payload.max : 'unlimited',
    percentage: payload.percentage !== undefined ? payload.percentage : 100,
    ...payload,
  };

  const title = interpolateTemplate(templateObj.title, safePayload);
  const message = interpolateTemplate(templateObj.message, safePayload);

  return {
    id: `notif-billing-${event}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    message,
    type: definition.severity,
    timestamp: new Date().toISOString(),
    read: false,
    linkTab: 'subscription',
  };
}

/**
 * In-memory historical audit trail of dispatched billing notifications.
 */
const billingNotificationAuditLog: Array<{
  id: string;
  event: BillingNotificationEvent;
  notification: AppNotification;
  dispatchedAt: string;
  language: Language;
  payload: BillingNotificationPayload;
}> = [];

/**
 * Dispatches a billing notification into both the app's notification system and audit log.
 */
export function dispatchBillingNotification(
  event: BillingNotificationEvent,
  payload: BillingNotificationPayload = {},
  lang: Language = 'en',
  onNotificationCreated?: (notif: AppNotification) => void
): AppNotification {
  const notification = createBillingNotification(event, payload, lang);

  billingNotificationAuditLog.unshift({
    id: notification.id,
    event,
    notification,
    dispatchedAt: new Date().toISOString(),
    language: lang,
    payload,
  });

  if (onNotificationCreated) {
    onNotificationCreated(notification);
  }

  return notification;
}

/**
 * Returns the immutable audit log of dispatched billing notifications.
 */
export function getBillingNotificationAuditLog() {
  return [...billingNotificationAuditLog];
}

/**
 * Evaluates portfolio capacity and returns alert notifications if nearing or at quota.
 */
export function evaluateCapacityNotification(
  used: number,
  max: number | 'unlimited',
  quotaType: 'rental units' | 'properties' | 'buildings',
  lang: Language = 'en'
): AppNotification | null {
  if (max === 'unlimited' || max <= 0) return null;

  const percentage = Math.round((used / max) * 100);

  if (used >= max) {
    return createBillingNotification(
      'capacity_reached',
      {
        used,
        max,
        quotaType,
        percentage: Math.min(100, percentage),
      },
      lang
    );
  }

  if (percentage >= 80) {
    return createBillingNotification(
      'capacity_approaching',
      {
        used,
        max,
        quotaType,
        percentage,
      },
      lang
    );
  }

  return null;
}
