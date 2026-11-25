/**
 * Phase 0 Payload-First Security TDD Suite for CNTEstates Firestore Rules.
 * Validates the 12 adversarial payloads defined in /security_spec.md against
 * blueprint schema invariants and rule constraints.
 *
 * Run via: npx tsx --test firestore.rules.test.ts (or Vitest/Node test runner).
 */

import fs from 'node:fs';
import path from 'node:path';

interface BlueprintProperty {
  type?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
}

interface BlueprintEntity {
  properties: Record<string, BlueprintProperty>;
  required: string[];
}

interface FirebaseBlueprint {
  entities: Record<string, BlueprintEntity>;
  firestore: Record<string, { schema: { $ref: string }; description: string }>;
}

export interface DirtyDozenCase {
  id: number;
  name: string;
  targetPath: string;
  operation: 'create' | 'update' | 'delete' | 'list';
  expectedDecision: 'DENY';
  payload: Record<string, unknown>;
  reason: string;
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing (Owner Hijack)',
    targetPath: '/organizations/org_attacker',
    operation: 'create',
    expectedDecision: 'DENY',
    payload: {
      id: 'org_attacker',
      ownerId: 'victim_uid_999',
      name: 'Hijacked Estates',
      planId: 'enterprise',
      subscriptionStatus: 'active',
      operatingCountry: 'South Africa',
      baseCurrency: 'ZAR',
      billingCurrency: 'USD',
      monthlySpend: 0,
      renewalDate: '2027-01-01',
    },
    reason: 'incoming().ownerId must equal request.auth.uid',
  },
  {
    id: 2,
    name: 'Cross-Tenant Subcollection Injection',
    targetPath: '/organizations/org_victim/properties/prop_1',
    operation: 'create',
    expectedDecision: 'DENY',
    payload: {
      id: 'prop_1',
      organizationId: 'org_victim',
      ownerId: 'attacker_uid',
      name: 'Injected Tower',
      type: 'commercial',
      address: '10 Evil Rd',
      city: 'Cape Town',
      country: 'South Africa',
      totalBuildings: 1,
      totalUnits: 10,
      occupiedUnits: 0,
      status: 'active',
    },
    reason: 'Parent org owner check isOrgOwner(orgId) rejects cross-tenant writes',
  },
  {
    id: 3,
    name: 'Shadow Field Privilege Escalation',
    targetPath: '/users/user_1',
    operation: 'update',
    expectedDecision: 'DENY',
    payload: {
      displayName: 'Alice',
      isAdmin: true,
      role: 'super_admin',
    },
    reason: 'affectedKeys().hasOnly(...) and keys().hasOnly(...) reject unknown shadow fields',
  },
  {
    id: 4,
    name: 'Email Spoofing on Profile Creation',
    targetPath: '/users/user_1',
    operation: 'create',
    expectedDecision: 'DENY',
    payload: {
      uid: 'user_1',
      displayName: 'Spoofer',
      email: 'christian.ntanda@gmail.com',
      defaultOrganizationId: 'org_1',
      preferredCurrency: 'USD',
      preferredLanguage: 'en',
    },
    reason: 'incoming().email must equal request.auth.token.email',
  },
  {
    id: 5,
    name: 'PII Enumeration Blanket List',
    targetPath: '/users',
    operation: 'list',
    expectedDecision: 'DENY',
    payload: {},
    reason: '/users allow list is restricted strictly to isAdmin()',
  },
  {
    id: 6,
    name: 'Ticket State Shortcutting on Create',
    targetPath: '/organizations/org_1/tickets/tkt_1',
    operation: 'create',
    expectedDecision: 'DENY',
    payload: {
      id: 'tkt_1',
      organizationId: 'org_1',
      ownerId: 'user_1',
      code: 'CBM-99999',
      propertyId: 'prop_1',
      title: 'Instant closed ticket',
      category: 'electrical',
      priority: 'high',
      status: 'closed',
    },
    reason: 'Initial ServiceTicket status must be new, assigned, or in_progress',
  },
  {
    id: 7,
    name: 'Terminal State Reopening (Closed Ticket)',
    targetPath: '/organizations/org_1/tickets/tkt_closed',
    operation: 'update',
    expectedDecision: 'DENY',
    payload: {
      status: 'in_progress',
    },
    reason: 'Closed tickets are locked against non-admin updates',
  },
  {
    id: 8,
    name: 'Settled Invoice Tampering',
    targetPath: '/organizations/org_1/invoices/inv_paid',
    operation: 'update',
    expectedDecision: 'DENY',
    payload: {
      total: 0,
      amountDue: 0,
      invoiceStatus: 'draft',
    },
    reason: 'Paid/void/cancelled invoices are immutable for non-admins',
  },
  {
    id: 9,
    name: 'Value Poisoning (Over-Occupancy & Negative Rent)',
    targetPath: '/organizations/org_1/properties/prop_bad',
    operation: 'create',
    expectedDecision: 'DENY',
    payload: {
      id: 'prop_bad',
      organizationId: 'org_1',
      ownerId: 'user_1',
      name: 'Invalid Counts',
      type: 'residential',
      address: '1 Main',
      city: 'Johannesburg',
      country: 'South Africa',
      totalBuildings: 1,
      totalUnits: 10,
      occupiedUnits: 999,
      status: 'active',
    },
    reason: 'occupiedUnits must be <= totalUnits and numeric fields must be non-negative',
  },
  {
    id: 10,
    name: 'ID Path Traversal Poisoning',
    targetPath: '/organizations/org_1/properties/..%2Fadmin',
    operation: 'create',
    expectedDecision: 'DENY',
    payload: {
      id: '../admin',
      organizationId: 'org_1',
      ownerId: 'user_1',
    },
    reason: 'isValidId enforces ^[a-zA-Z0-9_\\-]+$ with length 1..128',
  },
  {
    id: 11,
    name: 'Audit Timestamp Backdating',
    targetPath: '/organizations/org_1/auditLogs/log_1',
    operation: 'create',
    expectedDecision: 'DENY',
    payload: {
      id: 'log_1',
      organizationId: 'org_1',
      ownerId: 'user_1',
      actorUid: 'user_1',
      actorName: 'User',
      actorRole: 'org_owner',
      action: 'BACKDATE',
      entityType: 'Organization',
      entityId: 'org_1',
      details: 'Forged historical timestamp',
      createdAt: '2020-01-01T00:00:00.000Z',
    },
    reason: 'createdAt must equal server request.time',
  },
  {
    id: 12,
    name: 'Immutable Audit Log Deletion & Admin Registry Self-Grant',
    targetPath: '/admins/attacker_uid',
    operation: 'create',
    expectedDecision: 'DENY',
    payload: {
      uid: 'attacker_uid',
      email: 'attacker@example.com',
    },
    reason: '/admins allows no client writes and /auditLogs forbids update/delete',
  },
];

export function verifyBlueprintAndRulesCoverage(rootDir: string): {
  passed: boolean;
  checkedCollections: string[];
  errors: string[];
} {
  const errors: string[] = [];
  const blueprintPath = path.join(rootDir, 'firebase-blueprint.json');
  const rulesPath = path.join(rootDir, 'firestore.rules');

  if (!fs.existsSync(blueprintPath)) {
    errors.push('Missing firebase-blueprint.json');
    return { passed: false, checkedCollections: [], errors };
  }
  if (!fs.existsSync(rulesPath)) {
    errors.push('Missing firestore.rules');
    return { passed: false, checkedCollections: [], errors };
  }

  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as FirebaseBlueprint;
  const rulesText = fs.readFileSync(rulesPath, 'utf8');

  const checkedCollections = Object.keys(blueprint.firestore);

  if (!rulesText.includes('match /{document=**}') || !rulesText.includes('allow read, write: if false;')) {
    errors.push('Missing global default-deny catch-all rule');
  }
  if (!rulesText.includes('request.auth.token.email_verified == true')) {
    errors.push('Missing verified email enforcement in isVerifiedUser()');
  }
  if (!rulesText.includes('allow update, delete: if false;')) {
    errors.push('Missing immutable append-only protection for auditLogs');
  }
  if (!rulesText.includes('allow create, update, delete: if false;')) {
    errors.push('Missing client write prohibition on /admins');
  }

  for (const collectionPath of checkedCollections) {
    const normalized = collectionPath.replace(/^\//, '');
    const segments = normalized.split('/');
    const leafCollection = segments[segments.length - 2];
    if (!rulesText.includes(`match /${leafCollection}/`)) {
      errors.push(`Collection ${collectionPath} is missing a match block in firestore.rules`);
    }
  }

  return {
    passed: errors.length === 0,
    checkedCollections,
    errors,
  };
}
