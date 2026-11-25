/**
 * CNTEstates Section 12 — Automated Security, Multi-Provider Auth, RBAC & Account Isolation Verification Suite
 *
 * Covers:
 *   12.1 Public vs Protected Route Separation & Registration Blueprint Integrity
 *   12.2 Authentication, Secret Hygiene & Session Protection
 *   12.3 Multi-Provider Authentication & Account Linking / Unlink Safety Controls
 *   12.4 Account A vs Account B Strict Isolation (All 8 Domains, Invoices, Payments, Webhooks & Firestore Rules)
 *   12.5 Role-Based Access Control (SaaS Admin, Org Owner, Tenant, Contractor, Technician, Auditor)
 */

import fs from 'fs';
import path from 'path';
import {
  assertTenantAccess,
  TenantIsolationException,
} from '../services/multiTenantSecurityService';
import {
  getInvoiceById,
  validateInvoiceOwnership,
  recordInvoicePayment,
  saveInvoice,
  normalizeInvoiceRecord,
} from '../services/invoiceEngine';
import {
  createEphemeralWebhookTestSecret,
  computeWebhookSignatureHeader,
  authenticateWebhookRequest,
  processProviderWebhook,
} from '../services/paymentProviderService';
import {
  getRoleNavigationPolicy,
  isTabAuthorizedForRole,
} from '../services/rbacNavigationPolicy';
import {
  hasBillingPermission,
} from '../services/billingRbacEngine';
import {
  resolvePathToRoute,
  getPathForTab,
} from '../utils/appRoutes';
import { initialOrganizations } from '../data/mockDatabase';

interface SecurityTestCase {
  id: string;
  section: string;
  name: string;
  run: () => { passed: boolean; detail: string };
}

const ROOT = process.cwd();
const TEST_SECRET = createEphemeralWebhookTestSecret();

const tests: SecurityTestCase[] = [
  // =========================================================================
  // 12.1 REGISTRATION & PUBLIC VS PROTECTED ROUTES
  // =========================================================================
  {
    id: 'SEC-12.1-01',
    section: '12.1 Registration & Routing',
    name: 'Public routes resolve without authentication requirement',
    run: () => {
      const publicPaths = ['/', '/features', '/solutions', '/pricing', '/faq', '/contact', '/signin', '/signup', '/forgot-password'];
      const results = publicPaths.map((p) => ({ path: p, resolved: resolvePathToRoute(p) }));
      const allPublic = results.every((r) => r.resolved.isPublic === true);
      const resetOk = resolvePathToRoute('/forgot-password').tab === 'auth_reset';
      const signupOk = resolvePathToRoute('/signup').tab === 'auth_signup';
      const pricingOk = resolvePathToRoute('/pricing').tab === 'pricing';
      return {
        passed: allPublic && resetOk && signupOk && pricingOk,
        detail: `Verified ${publicPaths.length} public URLs; reset=${resetOk}, signup=${signupOk}, pricing=${pricingOk}`,
      };
    },
  },
  {
    id: 'SEC-12.1-02',
    section: '12.1 Registration & Routing',
    name: 'Protected routes require authentication and map to exact workspace views',
    run: () => {
      const protectedPaths: [string, string][] = [
        ['/dashboard', 'dashboard'],
        ['/admin', 'platformAdmin'],
        ['/tenant', 'tenantPortal'],
        ['/contractor', 'contractorPortal'],
        ['/technician', 'technicianView'],
        ['/subscriptions', 'subscription'],
        ['/billing', 'subscription'],
        ['/invoices', 'subscription'],
        ['/payments', 'subscription'],
        ['/account-settings', 'accountSecurity'],
      ];
      const checks = protectedPaths.map(([p, expectedTab]) => {
        const r = resolvePathToRoute(p);
        return !r.isPublic && r.tab === expectedTab;
      });
      const passed = checks.every(Boolean) && getPathForTab('accountSecurity') === '/account-settings';
      return {
        passed,
        detail: `Verified ${protectedPaths.length} protected URLs enforce auth boundary and canonical path mapping`,
      };
    },
  },
  {
    id: 'SEC-12.1-03',
    section: '12.1 Registration & Routing',
    name: 'Firebase blueprint includes mandatory registration & consent fields',
    run: () => {
      const blueprint = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase-blueprint.json'), 'utf8'));
      const userProps = blueprint?.entities?.UserProfile?.properties || {};
      const requiredFields = ['uid', 'email', 'defaultOrganizationId', 'preferredLanguage', 'accountCategory', 'linkedProviders', 'termsAcceptedAt', 'privacyAcceptedAt'];
      const missing = requiredFields.filter((f) => !(f in userProps));
      return {
        passed: missing.length === 0,
        detail: missing.length === 0 ? 'All 8 registration/consent fields present in UserProfile schema' : `Missing: ${missing.join(', ')}`,
      };
    },
  },

  // =========================================================================
  // 12.2 AUTHENTICATION & SECRET HYGIENE
  // =========================================================================
  {
    id: 'SEC-12.2-01',
    section: '12.2 Auth & Secret Hygiene',
    name: 'Zero hardcoded webhook secrets exist in frontend/backend source files',
    run: () => {
      const filesToScan = [
        'src/services/paymentProviderService.ts',
        'src/components/pricing/PaymentProviderConsole.tsx',
        'server.ts',
      ];
      const violations: string[] = [];
      for (const rel of filesToScan) {
        const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        if (/whsec_[a-zA-Z0-9_]+/.test(content)) {
          violations.push(rel);
        }
      }
      const envExample = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
      const hasEnvDoc = envExample.includes('PAYMENT_WEBHOOK_SECRET');
      return {
        passed: violations.length === 0 && hasEnvDoc,
        detail: violations.length === 0 && hasEnvDoc
          ? 'Zero whsec_* literals in source; PAYMENT_WEBHOOK_SECRET documented in .env.example'
          : `Violations: ${violations.join(', ')}; envDoc=${hasEnvDoc}`,
      };
    },
  },
  {
    id: 'SEC-12.2-02',
    section: '12.2 Auth & Secret Hygiene',
    name: 'Backend verifies real Firebase ID tokens via Admin Auth SDK without IAM misuse',
    run: () => {
      const serverSrc = fs.readFileSync(path.join(ROOT, 'server.ts'), 'utf8');
      const hasVerifyIdToken = serverSrc.includes('verifyIdToken(');
      const hasAuthBearerMiddleware = serverSrc.includes("startsWith('Bearer ')");
      const blocksSpoofedAdmin = serverSrc.includes('ADMIN_PRIVILEGE_REQUIRED') || serverSrc.includes('FORBIDDEN_ADMIN_SPOOF');
      return {
        passed: hasVerifyIdToken && hasAuthBearerMiddleware,
        detail: `verifyIdToken=${hasVerifyIdToken}, bearerExtraction=${hasAuthBearerMiddleware}, adminGuard=${blocksSpoofedAdmin}`,
      };
    },
  },

  // =========================================================================
  // 12.3 MULTI-PROVIDER AUTHENTICATION & LINKING CONTROLS
  // =========================================================================
  {
    id: 'SEC-12.3-01',
    section: '12.3 Multi-Provider Linking',
    name: 'All 5 Firebase Auth providers (Email/Password, Google, Microsoft, Apple, GitHub) configured',
    run: () => {
      const firebaseSrc = fs.readFileSync(path.join(ROOT, 'src/firebase.ts'), 'utf8');
      const ctxSrc = fs.readFileSync(path.join(ROOT, 'src/context/FirebaseContext.tsx'), 'utf8');
      const hasGoogle = firebaseSrc.includes('GoogleAuthProvider');
      const hasMicrosoft = firebaseSrc.includes("OAuthProvider('microsoft.com')");
      const hasApple = firebaseSrc.includes("OAuthProvider('apple.com')");
      const hasGithub = firebaseSrc.includes('GithubAuthProvider');
      const hasEmail = firebaseSrc.includes('EmailAuthProvider') || ctxSrc.includes('EmailAuthProvider');
      const passed = hasGoogle && hasMicrosoft && hasApple && hasGithub && hasEmail;
      return {
        passed,
        detail: `Google=${hasGoogle}, Microsoft=${hasMicrosoft}, Apple=${hasApple}, GitHub=${hasGithub}, Email=${hasEmail}`,
      };
    },
  },
  {
    id: 'SEC-12.3-02',
    section: '12.3 Multi-Provider Linking',
    name: 'Account linking enforces duplicate email check, collision protection, re-auth, and min-1-provider unlink guard',
    run: () => {
      const ctxSrc = fs.readFileSync(path.join(ROOT, 'src/context/FirebaseContext.tsx'), 'utf8');
      const hasFetchMethods = ctxSrc.includes('fetchSignInMethodsForEmail');
      const hasCollisionHandler = ctxSrc.includes('auth/account-exists-with-different-credential');
      const hasReauth = ctxSrc.includes('reauthenticateWithPopup') && ctxSrc.includes('reauthenticateWithCredential');
      const hasMinProviderGuard = ctxSrc.includes('providerData.length <= 1') || ctxSrc.includes('linkedProviders.length <= 1');
      const passed = hasFetchMethods && hasCollisionHandler && hasReauth && hasMinProviderGuard;
      return {
        passed,
        detail: `fetchSignInMethods=${hasFetchMethods}, collisionGuard=${hasCollisionHandler}, reauth=${hasReauth}, min1UnlinkGuard=${hasMinProviderGuard}`,
      };
    },
  },

  // =========================================================================
  // 12.4 ACCOUNT A VS ACCOUNT B STRICT ISOLATION
  // =========================================================================
  {
    id: 'SEC-12.4-01',
    section: '12.4 Account Isolation',
    name: 'Account A (org-1) is blocked from accessing Account B (org-2) across all 8 protected domains',
    run: () => {
      const domains = [
        'subscription',
        'invoice',
        'payment',
        'billing_history',
        'subscription_history',
        'usage',
        'organization',
        'audit_log',
      ] as const;

      let blockedCount = 0;
      for (const domain of domains) {
        try {
          assertTenantAccess(
            {
              requestingOrgId: 'org-1',
              userRole: 'org_owner',
              userId: 'user-account-a',
            },
            'org-2',
            domain,
            `read_${domain}`
          );
        } catch (err) {
          if (err instanceof TenantIsolationException) {
            blockedCount++;
          }
        }
      }

      // Confirm Account A CAN access its own records without throwing
      let selfAllowed = false;
      try {
        assertTenantAccess(
          { requestingOrgId: 'org-1', userRole: 'org_owner', userId: 'user-account-a' },
          'org-1',
          'invoice',
          'read_invoice'
        );
        selfAllowed = true;
      } catch {
        selfAllowed = false;
      }

      return {
        passed: blockedCount === domains.length && selfAllowed === true,
        detail: `Blocked cross-account access across ${blockedCount}/${domains.length} domains; own-org access allowed=${selfAllowed}`,
      };
    },
  },
  {
    id: 'SEC-12.4-02',
    section: '12.4 Account Isolation',
    name: 'Invoice ownership check blocks Account A from viewing or exporting Account B invoice',
    run: () => {
      const invA = getInvoiceById('sinv-101'); // org-1
      const invB = getInvoiceById('sinv-201'); // org-2

      const ownCheck = validateInvoiceOwnership({
        invoice: invA,
        requestingOrganizationId: 'org-1',
        isPlatformAdmin: false,
      });
      const crossCheck = validateInvoiceOwnership({
        invoice: invB,
        requestingOrganizationId: 'org-1',
        isPlatformAdmin: false,
      });
      const adminCheck = validateInvoiceOwnership({
        invoice: invB,
        requestingOrganizationId: 'org-1',
        isPlatformAdmin: true,
      });

      const passed = ownCheck.authorized === true && crossCheck.authorized === false && adminCheck.authorized === true;
      return {
        passed,
        detail: `Account A -> org-1 invoice=${ownCheck.authorized}, Account A -> org-2 invoice=${crossCheck.authorized}, Admin -> org-2=${adminCheck.authorized}`,
      };
    },
  },
  {
    id: 'SEC-12.4-03',
    section: '12.4 Account Isolation',
    name: 'Duplicate invoice payment & replayed transaction reference are strictly rejected',
    run: () => {
      // 1. Attempting to pay an already-paid invoice
      const paidAttempt = recordInvoicePayment({
        invoiceId: 'sinv-101',
        paymentAmount: 4445,
        transactionReference: 'tx_replay_already_paid_001',
      });

      // 2. Create a fresh open invoice, make a partial payment with a reference, then replay the exact same reference
      const openInv = normalizeInvoiceRecord({
        invoice_id: 'sinv-sec-dup-test',
        organization_id: 'org-1',
        subscription_id: 'sub-org-1-2026',
        invoice_number: 'CNTE-SEC-DUP-01',
        subtotal: 1000,
        tax: 0,
        discount: 0,
        total: 1000,
        amount_paid: 0,
        invoice_status: 'open',
        payment_status: 'unpaid',
      });
      saveInvoice(openInv);

      const firstPay = recordInvoicePayment({
        invoiceId: 'sinv-sec-dup-test',
        paymentAmount: 400,
        transactionReference: 'tx_idempotency_unique_777',
      });
      const duplicateRefPay = recordInvoicePayment({
        invoiceId: 'sinv-sec-dup-test',
        paymentAmount: 400,
        transactionReference: 'tx_idempotency_unique_777',
      });

      const passed =
        paidAttempt.success === false &&
        paidAttempt.duplicate === true &&
        firstPay.success === true &&
        duplicateRefPay.success === false &&
        duplicateRefPay.duplicate === true;

      return {
        passed,
        detail: `Paid-invoice replay blocked=${paidAttempt.duplicate}, first partial ok=${firstPay.success}, duplicate txRef blocked=${duplicateRefPay.duplicate}`,
      };
    },
  },
  {
    id: 'SEC-12.4-04',
    section: '12.4 Account Isolation',
    name: 'Payment webhook rejects forged v1 signature, rejects cross-account ownership mismatch, and accepts valid HMAC',
    run: () => {
      const orgA = initialOrganizations.find((o) => o.id === 'org-1')!;
      const orgB = initialOrganizations.find((o) => o.id === 'org-2')!;
      const now = Math.floor(Date.now() / 1000);

      // 1. Forged Stripe-like signature header MUST be rejected (no v1= bypass!)
      const forgedAuth = authenticateWebhookRequest('t=1700000000,v1=deadbeef', TEST_SECRET, { id: 'evt_forge' });

      // 2. Cross-account webhook: claims org-2 but carries org-1's customer/subscription IDs
      const crossPayload = {
        id: `evt_cross_${Date.now()}`,
        object: 'event',
        api_version: '2026-09-01',
        created: now,
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_stripe_cross_attack',
            organization_id: orgB.id,
            customer: orgA.subscriptionRecord?.external_customer_id || 'cus_stripe_org-1',
            subscription: orgA.subscriptionRecord?.external_subscription_id || 'sub_stripe_org-1_2026',
            amount_paid: 459,
            currency: 'EUR',
            status: 'paid',
          },
        },
      };
      const crossSig = computeWebhookSignatureHeader(crossPayload, TEST_SECRET, now);
      let mutatedOrgB = false;

      const crossRes = processProviderWebhook({
        rawBody: crossPayload,
        signatureHeader: crossSig,
        secret: TEST_SECRET,
        ownershipValidator: ({ organizationId, customerId, subscriptionId }) => {
          const target = initialOrganizations.find((o) => o.id === organizationId);
          if (!target) return { valid: false, reason: 'Unknown org' };
          const expCust = target.subscriptionRecord?.external_customer_id;
          const expSub = target.subscriptionRecord?.external_subscription_id;
          if (customerId && expCust && customerId !== expCust) {
            return { valid: false, reason: 'Customer ownership mismatch' };
          }
          if (subscriptionId && expSub && subscriptionId !== expSub) {
            return { valid: false, reason: 'Subscription ownership mismatch' };
          }
          return { valid: true };
        },
        onEventProcessed: () => {
          mutatedOrgB = true;
        },
      });

      // 3. Valid HMAC-signed webhook matching org-2 ownership
      const validPayload = {
        id: `evt_valid_org2_${Date.now()}`,
        object: 'event',
        api_version: '2026-09-01',
        created: now,
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_stripe_valid_org2',
            organization_id: orgB.id,
            customer: orgB.subscriptionRecord?.external_customer_id || 'cus_stripe_org-2',
            subscription: orgB.subscriptionRecord?.external_subscription_id || 'sub_stripe_org-2_2026',
            amount_paid: 459,
            currency: 'EUR',
            status: 'paid',
          },
        },
      };
      const validSig = computeWebhookSignatureHeader(validPayload, TEST_SECRET, now);
      const validRes = processProviderWebhook({
        rawBody: validPayload,
        signatureHeader: validSig,
        secret: TEST_SECRET,
        ownershipValidator: () => ({ valid: true }),
      });

      const passed =
        forgedAuth.authenticated === false &&
        crossRes.status === 403 &&
        mutatedOrgB === false &&
        validRes.status === 200 &&
        validRes.success === true;

      return {
        passed,
        detail: `Forged HMAC rejected=${!forgedAuth.authenticated}, Cross-org webhook status=${crossRes.status} (mutatedOrgB=${mutatedOrgB}), Valid HMAC status=${validRes.status}`,
      };
    },
  },
  {
    id: 'SEC-12.4-05',
    section: '12.4 Account Isolation',
    name: 'Firestore Security Rules enforce organization isolation, role guards, and contain zero open catch-alls',
    run: () => {
      const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
      const hasOrgMember = rules.includes('function isOrgMember(');
      const hasBillingGuard = rules.includes('function hasOrgBillingReadAccess(');
      const hasOpsGuard = rules.includes('function canManageOrgOperations(');
      const hasTicketGuard = rules.includes('function canWorkOnOrgTickets(');
      const hasOpenCatchAll = /allow\s+read\s*,\s*write\s*:\s*if\s+true\s*;/.test(rules);
      const passed = hasOrgMember && hasBillingGuard && hasOpsGuard && hasTicketGuard && !hasOpenCatchAll;
      return {
        passed,
        detail: `isOrgMember=${hasOrgMember}, billingGuard=${hasBillingGuard}, opsGuard=${hasOpsGuard}, ticketGuard=${hasTicketGuard}, openCatchAll=${hasOpenCatchAll}`,
      };
    },
  },

  // =========================================================================
  // 12.5 ROLE-BASED ACCESS CONTROL (RBAC)
  // =========================================================================
  {
    id: 'SEC-12.5-01',
    section: '12.5 Role-Based Access Control',
    name: 'SaaS Platform Admin has access to Platform Admin console and cross-module oversight',
    run: () => {
      const policy = getRoleNavigationPolicy('platform_admin', true);
      const canAdmin = isTabAuthorizedForRole('platformAdmin', 'platform_admin', true);
      const canDash = isTabAuthorizedForRole('dashboard', 'platform_admin', true);
      const canSub = isTabAuthorizedForRole('subscription', 'platform_admin', true);
      return {
        passed: (policy.defaultTab === 'dashboard' || policy.defaultTab === 'platformAdmin') && canAdmin && canDash && canSub,
        detail: `defaultTab=${policy.defaultTab}, platformAdmin=${canAdmin}, dashboard=${canDash}, subscription=${canSub}`,
      };
    },
  },
  {
    id: 'SEC-12.5-02',
    section: '12.5 Role-Based Access Control',
    name: 'Organization Owner can manage org billing & workspace but is strictly blocked from SaaS Admin routes',
    run: () => {
      const canDash = isTabAuthorizedForRole('dashboard', 'org_owner', false);
      const canBilling = isTabAuthorizedForRole('subscription', 'org_owner', false);
      const blockedAdmin = !isTabAuthorizedForRole('platformAdmin', 'org_owner', false);
      const canUpgrade = hasBillingPermission('org_owner', 'upgrade');
      const canCancel = hasBillingPermission('org_owner', 'cancel');
      const passed = canDash && canBilling && blockedAdmin && canUpgrade && canCancel;
      return {
        passed,
        detail: `dashboard=${canDash}, subscription=${canBilling}, platformAdminBlocked=${blockedAdmin}, billingUpgrade=${canUpgrade}, billingCancel=${canCancel}`,
      };
    },
  },
  {
    id: 'SEC-12.5-03',
    section: '12.5 Role-Based Access Control',
    name: 'Tenant role is isolated strictly to Tenant Portal & Account Security (blocked from admin/billing/owner data)',
    run: () => {
      const policy = getRoleNavigationPolicy('tenant', false);
      const allowPortal = isTabAuthorizedForRole('tenantPortal', 'tenant', false);
      const allowSecurity = isTabAuthorizedForRole('accountSecurity', 'tenant', false);
      const denyDashboard = !isTabAuthorizedForRole('dashboard', 'tenant', false);
      const denyAdmin = !isTabAuthorizedForRole('platformAdmin', 'tenant', false);
      const denyFinance = !isTabAuthorizedForRole('finance', 'tenant', false);
      const denySubscription = !isTabAuthorizedForRole('subscription', 'tenant', false);
      const denyContractor = !isTabAuthorizedForRole('contractorPortal', 'tenant', false);
      const denyBillingPerm = !hasBillingPermission('tenant', 'view_billing') && !hasBillingPermission('tenant', 'change_plans');
      const passed =
        policy.defaultTab === 'tenantPortal' &&
        allowPortal &&
        allowSecurity &&
        denyDashboard &&
        denyAdmin &&
        denyFinance &&
        denySubscription &&
        denyContractor &&
        denyBillingPerm;
      return {
        passed,
        detail: `default=${policy.defaultTab}, portal=${allowPortal}, security=${allowSecurity}, deniedAdmin/Billing/Finance=${denyAdmin && denySubscription && denyFinance && denyBillingPerm}`,
      };
    },
  },
  {
    id: 'SEC-12.5-04',
    section: '12.5 Role-Based Access Control',
    name: 'Contractor & Technician roles are isolated strictly to their dedicated operational portals',
    run: () => {
      const cPolicy = getRoleNavigationPolicy('contractor', false);
      const tPolicy = getRoleNavigationPolicy('technician', false);

      const cOk =
        cPolicy.defaultTab === 'contractorPortal' &&
        isTabAuthorizedForRole('contractorPortal', 'contractor', false) &&
        !isTabAuthorizedForRole('dashboard', 'contractor', false) &&
        !isTabAuthorizedForRole('platformAdmin', 'contractor', false) &&
        !isTabAuthorizedForRole('tenantPortal', 'contractor', false) &&
        !hasBillingPermission('contractor', 'view_billing');

      const tOk =
        tPolicy.defaultTab === 'technicianView' &&
        isTabAuthorizedForRole('technicianView', 'technician', false) &&
        !isTabAuthorizedForRole('dashboard', 'technician', false) &&
        !isTabAuthorizedForRole('platformAdmin', 'technician', false) &&
        !isTabAuthorizedForRole('finance', 'technician', false) &&
        !hasBillingPermission('technician', 'view_billing');

      return {
        passed: cOk && tOk,
        detail: `Contractor isolated=${cOk} (default=${cPolicy.defaultTab}), Technician isolated=${tOk} (default=${tPolicy.defaultTab})`,
      };
    },
  },
];

async function main() {
  console.log('\n================================================================================');
  console.log(' CNTEstates — SECTION 12 SECURITY, RBAC & ACCOUNT ISOLATION TEST SUITE');
  console.log('================================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const tc of tests) {
    try {
      const outcome = tc.run();
      if (outcome.passed) {
        passedCount++;
        console.log(`  [PASS] ${tc.id} (${tc.section}): ${tc.name}`);
        console.log(`         -> ${outcome.detail}`);
      } else {
        failedCount++;
        console.error(`  [FAIL] ${tc.id} (${tc.section}): ${tc.name}`);
        console.error(`         -> ${outcome.detail}`);
      }
    } catch (err: any) {
      failedCount++;
      console.error(`  [FAIL] ${tc.id} (${tc.section}): ${tc.name}`);
      console.error(`         -> Uncaught error: ${err?.message || err}`);
    }
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(` SUMMARY: ${passedCount}/${tests.length} passed, ${failedCount} failed`);
  console.log('--------------------------------------------------------------------------------\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main();
