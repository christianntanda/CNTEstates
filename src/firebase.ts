import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  type AuthProvider,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  serverTimestamp,
  type FieldValue,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type {
  Organization,
  Property,
  Unit,
  ServiceTicket,
  SubscriptionInvoice,
  AuditLog,
} from './types';

// Initialize Firebase App (idempotent across module reloads)
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the provisioned named database ID
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Authentication with multi-provider integrations
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');

export type FederatedProviderId = 'google.com' | 'microsoft.com' | 'apple.com' | 'github.com';

export function getFederatedAuthProvider(providerId: FederatedProviderId): AuthProvider {
  switch (providerId) {
    case 'google.com':
      return googleProvider;
    case 'microsoft.com':
      return microsoftProvider;
    case 'apple.com':
      return appleProvider;
    case 'github.com':
      return githubProvider;
  }
}

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

// ============================================================================
// Structured Firestore Error Diagnostics (Mandatory Pattern)
// ============================================================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ============================================================================
// Startup Connectivity Verification
// ============================================================================
async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error(
        'Please check your Firebase configuration. Firestore client is offline.'
      );
    }
    // Permission errors or missing document errors confirm live connectivity to Firestore.
  }
}

void testConnection();

// ============================================================================
// Defensive Schema Sanitizers (Synchronized verbatim with firebase-blueprint.json)
// ============================================================================
const VALID_PLANS = new Set([
  'free',
  'starter',
  'basic',
  'professional',
  'business',
  'enterprise',
]);

const VALID_SUB_STATUSES = new Set([
  'free',
  'trial',
  'active',
  'past_due',
  'payment_failed',
  'suspended',
  'cancelled',
  'expired',
  'pending_activation',
]);

const VALID_PROPERTY_TYPES = new Set([
  'residential',
  'commercial',
  'mixed_use',
  'retail',
  'industrial',
  'student_accommodation',
  'other',
]);

const VALID_PROPERTY_STATUSES = new Set(['active', 'under_renovation', 'development']);

const VALID_UNIT_TYPES = new Set([
  'apartment',
  'penthouse',
  'office_suite',
  'retail_shop',
  'warehouse',
  'studio',
  'parking_bay',
  'storage',
]);

const VALID_UNIT_STATUSES = new Set(['occupied', 'vacant', 'maintenance', 'reserved']);

const VALID_TICKET_CATEGORIES = new Set([
  'electrical',
  'plumbing',
  'hvac',
  'generator',
  'elevator',
  'fire_systems',
  'cctv_security',
  'structural',
  'appliances',
  'cleaning',
  'pest_control',
]);

const VALID_TICKET_PRIORITIES = new Set(['emergency', 'critical', 'high', 'normal', 'low']);

const VALID_TICKET_STATUSES = new Set([
  'new',
  'assigned',
  'in_progress',
  'awaiting_contractor',
  'awaiting_parts',
  'completed',
  'verified',
  'closed',
]);

const VALID_INITIAL_TICKET_STATUSES = new Set(['new', 'assigned', 'in_progress']);

const VALID_BILLING_PERIODS = new Set(['monthly', 'quarterly', 'annual', 'custom']);

const VALID_PAYMENT_STATUSES = new Set([
  'unpaid',
  'paid',
  'partially_paid',
  'failed',
  'refunded',
  'waived',
]);

const VALID_INVOICE_STATUSES = new Set([
  'draft',
  'open',
  'paid',
  'partially_paid',
  'past_due',
  'void',
  'uncollectible',
  'cancelled',
]);

const VALID_LANGUAGES = new Set(['en', 'fr', 'es', 'pt']);

export const VALID_ROLE_CATEGORIES = new Set([
  'org_owner',
  'portfolio_manager',
  'property_manager',
  'building_manager',
  'finance_manager',
  'maintenance_manager',
  'technician',
  'contractor',
  'security_officer',
  'facility_manager',
  'tenant',
  'auditor',
]);

export function sanitizeId(raw: string, fallbackPrefix = 'doc'): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 128);
  return cleaned.length > 0 ? cleaned : `${fallbackPrefix}_${Date.now()}`;
}

export function sanitizeCurrency(raw: string | undefined, fallback = 'USD'): string {
  const upper = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  return /^[A-Z]{3}$/.test(upper) ? upper : fallback;
}

export function sanitizeString(
  raw: string | undefined | null,
  maxLen: number,
  fallback = ''
): string {
  const s = String(raw ?? '').trim();
  if (!s) return fallback.slice(0, maxLen);
  return s.slice(0, maxLen);
}

export function clampNumber(raw: number | undefined, min: number, max: number, fallback = 0): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeProviderList(providers: string[] | undefined): string[] {
  if (!Array.isArray(providers)) return [];
  const unique = Array.from(
    new Set(
      providers
        .map((p) => String(p || '').trim().slice(0, 40))
        .filter((p) => p.length > 0)
    )
  );
  return unique.slice(0, 10);
}

export function buildFirestoreUserProfile(params: {
  uid: string;
  displayName: string | null;
  email: string;
  photoURL: string | null;
  defaultOrganizationId: string;
  preferredCurrency: string;
  preferredLanguage: string;
  accountCategory?: string;
  linkedProviders?: string[];
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
}): Record<string, string | string[] | FieldValue> {
  const payload: Record<string, string | string[] | FieldValue> = {
    uid: sanitizeId(params.uid, 'user'),
    displayName: sanitizeString(params.displayName, 120, params.email.split('@')[0] || 'User'),
    email: sanitizeString(params.email, 254, 'user@example.com'),
    defaultOrganizationId: sanitizeId(params.defaultOrganizationId, 'org'),
    preferredCurrency: sanitizeCurrency(params.preferredCurrency, 'USD'),
    preferredLanguage: VALID_LANGUAGES.has(params.preferredLanguage) ? params.preferredLanguage : 'en',
    accountCategory:
      params.accountCategory && VALID_ROLE_CATEGORIES.has(params.accountCategory)
        ? params.accountCategory
        : 'org_owner',
    linkedProviders: sanitizeProviderList(params.linkedProviders),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (params.photoURL && params.photoURL.trim().length > 0) {
    payload.photoURL = sanitizeString(params.photoURL, 512);
  }
  if (params.termsAcceptedAt && params.termsAcceptedAt.trim().length > 0) {
    payload.termsAcceptedAt = sanitizeString(params.termsAcceptedAt, 40);
  }
  if (params.privacyAcceptedAt && params.privacyAcceptedAt.trim().length > 0) {
    payload.privacyAcceptedAt = sanitizeString(params.privacyAcceptedAt, 40);
  }
  return payload;
}

export function buildFirestoreOrganizationMember(params: {
  uid: string;
  organizationId: string;
  role: string;
  displayName: string;
}): Record<string, string | FieldValue> {
  return {
    uid: sanitizeId(params.uid, 'member'),
    organizationId: sanitizeId(params.organizationId, 'org'),
    role: VALID_ROLE_CATEGORIES.has(params.role) ? params.role : 'org_owner',
    displayName: sanitizeString(params.displayName, 120, 'Member'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildFirestoreOrganization(
  org: Organization,
  orgId: string,
  ownerId: string,
  isCreate: boolean
): Record<string, string | number | FieldValue> {
  const planId = VALID_PLANS.has(org.planId) ? org.planId : 'business';
  const subStatus = VALID_SUB_STATUSES.has(org.subscriptionStatus)
    ? org.subscriptionStatus
    : 'active';

  const base: Record<string, string | number | FieldValue> = {
    name: sanitizeString(org.name, 160, 'CNTEstates Organization'),
    planId,
    subscriptionStatus: subStatus,
    operatingCountry: sanitizeString(org.operatingCountry, 80, 'South Africa'),
    baseCurrency: sanitizeCurrency(org.baseCurrency, 'ZAR'),
    billingCurrency: sanitizeCurrency(org.billingCurrency || org.baseCurrency, 'ZAR'),
    monthlySpend: clampNumber(org.monthlySpend, 0, 10000000, 0),
    renewalDate: sanitizeString(org.renewalDate, 32, '2026-12-31'),
    updatedAt: serverTimestamp(),
  };

  if (org.branding?.companyAddress) {
    base.companyAddress = sanitizeString(org.branding.companyAddress, 300);
  }
  if (org.branding?.companyEmail) {
    base.companyEmail = sanitizeString(org.branding.companyEmail, 254);
  }
  if (org.branding?.companyPhone) {
    base.companyPhone = sanitizeString(org.branding.companyPhone, 40);
  }
  if (org.branding?.taxRegistrationNumber) {
    base.taxRegistrationNumber = sanitizeString(org.branding.taxRegistrationNumber, 64);
  }

  if (isCreate) {
    base.id = sanitizeId(orgId, 'org');
    base.ownerId = sanitizeId(ownerId, 'owner');
    base.createdAt = serverTimestamp();
  }

  return base;
}

export function buildFirestoreProperty(
  prop: Property,
  orgId: string,
  ownerId: string,
  isCreate: boolean
): Record<string, string | number | FieldValue> {
  const totalUnits = clampNumber(prop.totalUnits, 0, 100000, 0);
  const occupiedUnits = clampNumber(prop.occupiedUnits, 0, totalUnits, 0);

  const base: Record<string, string | number | FieldValue> = {
    name: sanitizeString(prop.name, 160, 'Untitled Property'),
    type: VALID_PROPERTY_TYPES.has(prop.type) ? prop.type : 'residential',
    address: sanitizeString(prop.address, 240, 'Unspecified Address'),
    city: sanitizeString(prop.city, 100, 'Johannesburg'),
    country: sanitizeString(prop.country, 100, 'South Africa'),
    totalBuildings: clampNumber(prop.totalBuildings, 0, 10000, 1),
    totalUnits,
    occupiedUnits,
    status: VALID_PROPERTY_STATUSES.has(prop.status) ? prop.status : 'active',
    updatedAt: serverTimestamp(),
  };

  if (prop.region) base.region = sanitizeString(prop.region, 100);
  if (prop.postalCode) base.postalCode = sanitizeString(prop.postalCode, 32);
  if (prop.ownerName) base.ownerName = sanitizeString(prop.ownerName, 120);
  if (prop.managerName) base.managerName = sanitizeString(prop.managerName, 120);
  if (prop.description) base.description = sanitizeString(prop.description, 1000);
  if (prop.imageUrl) base.imageUrl = sanitizeString(prop.imageUrl, 512);
  if (typeof prop.yearBuilt === 'number' && prop.yearBuilt >= 1800 && prop.yearBuilt <= 2200) {
    base.yearBuilt = prop.yearBuilt;
  }
  if (typeof prop.parkingSpaces === 'number' && prop.parkingSpaces >= 0) {
    base.parkingSpaces = clampNumber(prop.parkingSpaces, 0, 100000, 0);
  }

  if (isCreate) {
    base.id = sanitizeId(prop.id, 'prop');
    base.organizationId = sanitizeId(orgId, 'org');
    base.ownerId = sanitizeId(ownerId, 'owner');
    base.createdAt = serverTimestamp();
  }

  return base;
}

export function buildFirestoreUnit(
  unit: Unit,
  orgId: string,
  ownerId: string,
  isCreate: boolean
): Record<string, string | number | FieldValue> {
  const base: Record<string, string | number | FieldValue> = {
    unitNumber: sanitizeString(unit.unitNumber, 40, 'Unit-1'),
    floor: clampNumber(unit.floor, -20, 300, 1),
    type: VALID_UNIT_TYPES.has(unit.type) ? unit.type : 'apartment',
    squareMeters: clampNumber(unit.squareMeters, 0, 1000000, 50),
    monthlyRent: clampNumber(unit.monthlyRent, 0, 100000000, 0),
    currency: sanitizeCurrency(unit.currency, 'USD'),
    status: VALID_UNIT_STATUSES.has(unit.status) ? unit.status : 'vacant',
    updatedAt: serverTimestamp(),
  };

  if (unit.buildingId) {
    base.buildingId = sanitizeId(unit.buildingId, 'bld');
  }

  if (isCreate) {
    base.id = sanitizeId(unit.id, 'unit');
    base.organizationId = sanitizeId(orgId, 'org');
    base.ownerId = sanitizeId(ownerId, 'owner');
    base.propertyId = sanitizeId(unit.propertyId, 'prop');
    base.createdAt = serverTimestamp();
  }

  return base;
}

export function buildFirestoreTicket(
  ticket: ServiceTicket,
  orgId: string,
  ownerId: string,
  isCreate: boolean
): Record<string, string | FieldValue> {
  const status = isCreate
    ? VALID_INITIAL_TICKET_STATUSES.has(ticket.status)
      ? ticket.status
      : 'new'
    : VALID_TICKET_STATUSES.has(ticket.status)
    ? ticket.status
    : 'new';

  const base: Record<string, string | FieldValue> = {
    title: sanitizeString(ticket.title, 160, 'Maintenance Request'),
    category: VALID_TICKET_CATEGORIES.has(ticket.category) ? ticket.category : 'electrical',
    priority: VALID_TICKET_PRIORITIES.has(ticket.priority) ? ticket.priority : 'normal',
    status,
    updatedAt: serverTimestamp(),
  };

  if (ticket.propertyName) base.propertyName = sanitizeString(ticket.propertyName, 160);
  if (ticket.unitNumber) base.unitNumber = sanitizeString(ticket.unitNumber, 40);
  if (ticket.description) base.description = sanitizeString(ticket.description, 2000);

  if (isCreate) {
    base.id = sanitizeId(ticket.id, 'tkt');
    base.organizationId = sanitizeId(orgId, 'org');
    base.ownerId = sanitizeId(ownerId, 'owner');
    base.code = sanitizeString(ticket.code, 40, `CBM-${Date.now()}`);
    base.propertyId = sanitizeId(ticket.propertyId, 'prop');
    base.createdAt = serverTimestamp();
  }

  return base;
}

export function buildFirestoreInvoice(
  inv: SubscriptionInvoice,
  orgId: string,
  ownerId: string
): Record<string, string | number | FieldValue> {
  const invId = sanitizeId(inv.invoice_id || inv.id || `sinv_${Date.now()}`, 'sinv');
  const billingPeriod = VALID_BILLING_PERIODS.has(inv.billing_period)
    ? inv.billing_period
    : 'monthly';
  const paymentStatus = VALID_PAYMENT_STATUSES.has(inv.payment_status)
    ? inv.payment_status
    : 'paid';
  const invoiceStatus = VALID_INVOICE_STATUSES.has(inv.invoice_status || inv.status)
    ? inv.invoice_status || inv.status
    : 'paid';

  return {
    id: invId,
    organizationId: sanitizeId(orgId, 'org'),
    ownerId: sanitizeId(ownerId, 'owner'),
    invoiceNumber: sanitizeString(inv.invoice_number, 64, `CNTE-INV-${Date.now()}`),
    planId: sanitizeString(inv.plan_id, 64, 'business'),
    planName: sanitizeString(inv.plan_name, 120, 'CNTEstates Plan'),
    billingPeriod,
    currency: sanitizeCurrency(inv.billing_currency || inv.currency, 'USD'),
    subtotal: clampNumber(inv.subtotal, 0, 100000000, 0),
    tax: clampNumber(inv.tax, 0, 100000000, 0),
    discount: clampNumber(inv.discount, 0, 100000000, 0),
    total: clampNumber(inv.total ?? inv.billed_amount, 0, 100000000, 0),
    amountPaid: clampNumber(inv.amount_paid, 0, 100000000, 0),
    amountDue: clampNumber(inv.amount_due, 0, 100000000, 0),
    paymentStatus,
    invoiceStatus,
    paymentMethod: sanitizeString(inv.payment_method, 120, 'Corporate Card'),
    invoiceDate: sanitizeString(inv.invoice_date || inv.billing_date, 32, new Date().toISOString().split('T')[0]),
    dueDate: sanitizeString(inv.due_date || inv.invoice_date, 32, new Date().toISOString().split('T')[0]),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildFirestoreAuditLog(
  entry: AuditLog,
  orgId: string,
  ownerId: string,
  actorUid: string
): Record<string, string | FieldValue> {
  const detailsParts = [entry.previousValue ? `From: ${entry.previousValue}` : '', entry.newValue ? `To: ${entry.newValue}` : '']
    .filter(Boolean)
    .join(' | ');

  return {
    id: sanitizeId(entry.id, 'aud'),
    organizationId: sanitizeId(orgId, 'org'),
    ownerId: sanitizeId(ownerId, 'owner'),
    actorUid: sanitizeId(actorUid, 'actor'),
    actorName: sanitizeString(entry.userName, 120, 'User'),
    actorRole: sanitizeString(entry.userRole, 64, 'org_owner'),
    action: sanitizeString(entry.action, 100, 'SYSTEM_EVENT'),
    entityType: sanitizeString(entry.entityType, 80, 'Organization'),
    entityId: sanitizeString(entry.entityId, 128, orgId),
    details: sanitizeString(detailsParts || entry.action, 1000),
    createdAt: serverTimestamp(),
  };
}
