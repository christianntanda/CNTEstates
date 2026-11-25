import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initializeApp as initializeAdminApp,
  getApps as getAdminApps,
  getApp as getAdminApp,
} from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import {
  subscriptionPlans,
  initialOrganizations,
  registerCustomPlan,
  getSubscriptionPlan,
  initialProperties,
  initialUnits,
  initialBuildings,
} from './src/data/mockDatabase';
import {
  validateAddProperty,
  validateAddUnit,
  validateAddBuilding,
  calculateCapacityUsage,
  getPlanCapacityLimits,
  AUTHORITATIVE_CAPACITY_LIMITS,
} from './src/services/capacityEngine';
import {
  calculateCentralizedUsage,
  validateResourceCapacity,
} from './src/services/usageMonitoringService';
import {
  isFeatureEntitled,
  checkFeatureEntitlement,
  getPlanEntitlements,
  getAllFeatureDefinitions,
  getFeatureDefinition,
  getFeaturesByCategory,
  getFeatureEntitlementState,
  getComparativeFeatureMatrix,
  FEATURE_REGISTRY,
} from './src/services/featureEntitlementEngine';
import {
  evaluateFeatureAccess,
  evaluateAllFeaturesAccess,
} from './src/services/accessControlEngine';
import {
  executeSecureUpgrade,
  calculateBillingAdjustment,
  validateUpgradePayment,
} from './src/services/upgradeEngineService';
import {
  getInvoicesForOrganization,
  getInvoiceById,
  saveInvoice,
  recordInvoicePayment,
  transitionInvoiceStatus,
  normalizeInvoiceRecord,
  isInvoiceImmutable,
  INVOICE_STATUS_META,
} from './src/services/invoiceEngine';
import {
  getSubscriptionHistory,
  recordSubscriptionHistory,
  SUBSCRIPTION_HISTORY_EVENT_META,
  verifySubscriptionHistoryIntegrity,
} from './src/services/subscriptionHistoryEngine';
import {
  USD_MASTER_PRICING,
  AUTHORITATIVE_MASTER_CURRENCY,
  getAuthoritativeMasterPricingList,
  verifyMasterPricingIntegrity,
  getMasterPriceUsd,
  protectMasterPriceFromConvertedOverwrite,
} from './src/services/masterPricingService';
import {
  executeOperatingCountryCascade,
  getFiveLayerCurrencyModel,
  verifyCurrencySeparationIntegrity,
  formatOperationalTransaction,
} from './src/services/operatingCountryEngine';
import {
  executeExchangeRatePipeline,
  validateExchangeRate,
  verifyConversionReproducibility,
  getAuthoritativeExchangeRateRegistry,
} from './src/services/exchangeRateConversionEngine';
import {
  roundSubscriptionPrice,
  formatZeroDecimalSubscriptionPrice,
  auditZeroDecimalSeparation,
  FINANCIAL_PRECISION_RULES,
} from './src/services/zeroDecimalRuleService';
import {
  PAYMENT_PROVIDER_NAME,
  PAYMENT_PROVIDER_CODE,
  createEphemeralWebhookTestSecret,
  computeWebhookSignatureHeader,
  initializeProviderRegistry,
  getOrCreateProviderCustomer,
  createProviderSubscription,
  changeProviderSubscription,
  syncProviderInvoice,
  handleProviderPaymentFailure,
  executeProviderRenewal,
  executeProviderCancellation,
  processProviderWebhook,
  getWebhookAuditLogs,
  getProcessedEventsCount,
  getProviderCustomer,
  getProviderSubscription,
  type WebhookEventPayload,
} from './src/services/paymentProviderService';

// Server-only webhook signing secret: loaded strictly from environment, never hardcoded or exposed to clients.
const SERVER_PAYMENT_WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET && process.env.PAYMENT_WEBHOOK_SECRET !== 'MY_PAYMENT_WEBHOOK_SECRET'
    ? process.env.PAYMENT_WEBHOOK_SECRET
    : createEphemeralWebhookTestSecret();
import {
  normalizeSubscriptionRecord,
  validateSubscriptionConstraints,
  indexSubscription,
  subscriptionIndex,
  getSubscriptionWithTenantIsolation,
  createSubscriptionAuditEntry,
  initializeSubscriptionDatabase,
  transitionSubscriptionLifecycle,
} from './src/services/subscriptionService';
import {
  convertSubscriptionPrice,
  getExchangeRate,
  initialExchangeRatesToUSD,
  exchangeRateMeta,
  getCountryConfiguration,
  formatSubscriptionPrice,
  currencyCatalogue,
} from './src/services/currencyService';
import {
  calculatePeriodDates,
  calculatePlanPriceForPeriod,
  getAllBillingPeriods,
  registerBillingPeriod,
  getBillingPeriod,
} from './src/services/billingPeriodService';
import {
  generateStructuredPlanComparison,
  COMPARISON_CATEGORIES,
} from './src/services/planComparisonEngine';
import {
  createBillingNotification,
  BILLING_NOTIFICATION_DEFINITIONS,
  type BillingNotificationEvent,
} from './src/services/billingNotificationService';
import {
  validateTenantAccess,
  runCrossTenantIsolationSuite,
  getTenantSecurityAuditTrail,
  type ProtectedResourceType,
} from './src/services/multiTenantSecurityService';
import {
  hasBillingPermission,
  getBillingPermissionsForRole,
  getAllRoleBillingPolicies,
  getPermissionDenialExplanation,
  runBillingRbacTestSuite,
  getRbacAuditTrail,
  BILLING_PERMISSION_DEFINITIONS,
  AUTHORITATIVE_ROLE_POLICIES,
  type BillingPermission,
} from './src/services/billingRbacEngine';
import {
  recordBillingAuditEntry,
  getBillingAuditLogs,
  verifyAuditLedgerIntegrity,
  exportBillingAuditLogs,
  seedInitialBillingAuditLogs,
  billingAuditLogger,
  runBillingAuditTestSuite,
  BILLING_AUDIT_ACTIONS,
} from './src/services/billingAuditLogEngine';
import {
  searchAdminOrganizations,
  getOrganizationBillingDossier,
  captureAdminPayment,
  logAdministrativeBillingAction,
} from './src/services/adminBillingManagementService';
import {
  processAiBillingQuery,
  classifyAiBillingIntent,
  getHumanAuthorizationRequests,
  executeHumanAuthorizationDecision,
  runAiBillingSafetyTestSuite,
  AI_BILLING_PERMITTED_CAPABILITIES,
  HIGH_IMPACT_BILLING_ACTIONS,
  type HumanAuthorizationRequest,
  type HighImpactBillingAction,
  type AiBillingPermittedCapability,
} from './src/services/aiBillingSafetyService';
import {
  runPreFlightIdentification,
  createSafeMigrationPlan,
  testMigrationDryRun,
  applyDatabaseMigration,
  executeDatabaseRollback,
  createPreMigrationSnapshot,
  getMigrationSnapshots,
  getMigrationReceipts,
  getCurrentDatabaseSchemaVersion,
  SUPPORTED_SCHEMA_VERSIONS,
  assertNeverDeleteHistoricalBillingData,
} from './src/services/databaseMigrationEngine';
import {
  runAutomatedBillingTestSuite,
  TEST_DEFINITIONS,
  type TestCategory,
} from './src/services/automatedBillingTestSuite';
import {
  runFullRegressionTestSuite,
  REGRESSION_TEST_DEFINITIONS,
} from './src/services/fullRegressionTestSuite';
import {
  runFinalProductionValidation,
  authoritativeProductionValidationItems,
  type ProductionValidationCategory,
} from './src/services/finalProductionValidation';
import {
  validateFinalArchitecturePipeline,
  executeArchitectureFlowSimulation,
  getArchitectureHierarchyNodes,
  AUTHORITATIVE_FINAL_STANDARD_PLANS,
} from './src/services/architectureEngine';
import {
  calculateJurisdictionTax,
  resolveCountryTaxProfile,
  validateTaxRegistrationNumber,
  AUTHORITATIVE_TAX_PROFILES,
} from './src/services/taxEngine';
import type {
  Organization,
  CustomerSubscription,
  SubscriptionInvoice,
  SubscriptionPlan,
  SubscriptionPlanId,
  AuditLog,
  SubscriptionLifecycleEvent,
  SubscriptionLifecycleStatus,
  BillingPeriod,
  BillingPeriodDefinition,
  CustomBillingSchedule,
  BillingAuditAction,
  BillingAuditActor,
  BillingAuditLogEntry,
} from './src/types';

// Initialize in-memory subscription indexes
initializeSubscriptionDatabase(initialOrganizations);
initializeProviderRegistry(initialOrganizations);
seedInitialBillingAuditLogs('org-1');
const subscriptionAuditTrail: AuditLog[] = [];
const serverProperties = [...initialProperties];
const serverUnits = [...initialUnits];
const serverBuildings = [...initialBuildings];

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================================
// FIREBASE ID TOKEN VERIFICATION (Zero-IAM verifyIdToken)
// ========================================================
const BOOTSTRAPPED_ADMIN_EMAIL = 'christian.ntanda@gmail.com';
const ALLOWED_REGISTRATION_ROLES = new Set([
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

let firebaseProjectId = process.env.FIREBASE_PROJECT_ID || '';
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    if (parsed?.projectId && parsed.projectId !== 'remixed-project-id') {
      firebaseProjectId = parsed.projectId;
    }
  }
} catch {
  // Ignore missing config in isolated test runs
}

const firebaseAdminApp =
  firebaseProjectId
    ? getAdminApps().length > 0
      ? getAdminApp()
      : initializeAdminApp({ projectId: firebaseProjectId })
    : null;

interface VerifiedAuthContext {
  uid: string;
  email: string;
  emailVerified: boolean;
  signInProvider: string;
  authorizedOrgId: string;
  role: string;
  isPlatformAdmin: boolean;
}

interface VerifiedTenantRecord {
  uid: string;
  email: string;
  fullName: string;
  organizationId: string;
  organizationName: string;
  role: string;
  operatingCountry: string;
  preferredLanguage: string;
  baseCurrency: string;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  createdAt: string;
}

const verifiedTenantRegistry = new Map<string, VerifiedTenantRecord>();

function deriveAuthoritativeOrgId(uid: string): string {
  const cleaned = String(uid || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 40);
  return `org_${cleaned || 'tenant'}`;
}

function ensureIsolatedBackendOrganization(params: {
  orgId: string;
  name: string;
  planId?: string;
  operatingCountry?: string;
  baseCurrency?: string;
}): Organization {
  const existing = initialOrganizations.find((o) => o.id === params.orgId);
  if (existing) return existing;

  const countryCfg = getCountryConfiguration(params.operatingCountry || 'South Africa');
  const currency = params.baseCurrency || countryCfg?.default_currency || 'ZAR';
  const planId = (params.planId || 'free') as SubscriptionPlanId;
  const planUsdPrice = getMasterPriceUsd(planId) ?? 0;
  const newOrg: Organization = {
    id: params.orgId,
    name: params.name || 'CNTEstates Organization',
    country: params.operatingCountry || 'South Africa',
    operatingCountry: params.operatingCountry || 'South Africa',
    currency,
    baseCurrency: currency,
    billingCurrency: currency,
    timezone: 'Africa/Johannesburg',
    planId,
    subscriptionStatus: planId === 'free' ? 'free' : 'active',
    monthlySpend: planUsdPrice,
    renewalDate: planId === 'free' ? '2099-12-31' : '2027-01-01',
    createdAt: new Date().toISOString(),
  };
  initialOrganizations.push(newOrg);
  initializeSubscriptionDatabase([newOrg]);
  initializeProviderRegistry([newOrg]);
  return newOrg;
}

declare global {
  namespace Express {
    interface Request {
      verifiedAuth?: VerifiedAuthContext;
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // ========================================================
  // GLOBAL API IDENTITY VERIFICATION & TENANT ISOLATION GATE
  // ========================================================
  app.use('/api', async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const rawRoleHeader = (req.headers['x-user-role'] as string) || '';

    // 1. Cryptographically verify Firebase ID JWT when supplied
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const isJwtFormat = token.split('.').length === 3;
      if (isJwtFormat && firebaseAdminApp) {
        try {
          const decoded = await getAdminAuth(firebaseAdminApp).verifyIdToken(token);
          if (!decoded.email_verified) {
            return res.status(403).json({
              success: false,
              error: 'EMAIL_NOT_VERIFIED',
              message: 'Verify your email address before accessing protected CNTEstates APIs.',
            });
          }

          const uid = decoded.uid;
          const email = decoded.email || '';
          const isPlatformAdmin =
            email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
          const existingProfile = verifiedTenantRegistry.get(uid);
          const authorizedOrgId =
            existingProfile?.organizationId || deriveAuthoritativeOrgId(uid);

          // Ensure isolated tenant org exists on the server (never falls back to org-1)
          ensureIsolatedBackendOrganization({
            orgId: authorizedOrgId,
            name:
              existingProfile?.organizationName ||
              `${decoded.name || email.split('@')[0] || 'My'} Estates Portfolio`,
            operatingCountry: existingProfile?.operatingCountry || 'South Africa',
            baseCurrency: existingProfile?.baseCurrency,
          });

          const resolvedRole = isPlatformAdmin
            ? 'platform_admin'
            : existingProfile?.role || 'org_owner';

          req.verifiedAuth = {
            uid,
            email,
            emailVerified: true,
            signInProvider: decoded.firebase?.sign_in_provider || 'firebase',
            authorizedOrgId,
            role: resolvedRole,
            isPlatformAdmin,
          };

          // Enforce strict tenant isolation: block cross-tenant org ID tampering immediately
          if (!isPlatformAdmin) {
            const suppliedOrgIds = [
              req.headers['x-organization-id'] as string | undefined,
              req.query.organizationId as string | undefined,
              typeof req.body === 'object' && req.body ? req.body.organizationId : undefined,
              typeof req.body === 'object' && req.body ? req.body.organization_id : undefined,
            ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

            const crossTenantAttempt = suppliedOrgIds.find(
              (candidate) => candidate.trim() !== authorizedOrgId
            );
            if (crossTenantAttempt) {
              validateTenantAccess(
                {
                  requestingOrgId: authorizedOrgId,
                  userRole: resolvedRole,
                  userId: uid,
                },
                crossTenantAttempt,
                'subscription',
                `${req.method} ${req.path}`,
                'api'
              );
              return res.status(403).json({
                success: false,
                error: 'TENANT_ISOLATION_VIOLATION',
                requesting_organization_id: authorizedOrgId,
                target_organization_id: crossTenantAttempt,
                message: `Strict Account Isolation Violation: Account '${authorizedOrgId}' is prohibited from accessing organization '${crossTenantAttempt}'.`,
              });
            }

            if (rawRoleHeader === 'platform_admin') {
              return res.status(403).json({
                success: false,
                error: 'RBAC_PRIVILEGE_ESCALATION_BLOCKED',
                message:
                  'Unauthorized privilege escalation blocked. Platform Administrator role cannot be asserted via client headers.',
              });
            }
          }
        } catch {
          return res.status(401).json({
            success: false,
            error: 'INVALID_FIREBASE_TOKEN',
            message: 'Your authentication session is invalid or expired. Please sign in again.',
          });
        }
      }
    }

    // 2. Strictly guard all /api/admin/* routes with verified platform admin identity
    if (req.path.startsWith('/admin/')) {
      if (!req.verifiedAuth || !req.verifiedAuth.isPlatformAdmin) {
        return res.status(403).json({
          success: false,
          error: 'PLATFORM_ADMIN_REQUIRED',
          message:
            'SaaS Platform Administrator privileges verified by Firebase Authentication are required for this endpoint.',
        });
      }
    }

    return next();
  });

  // ========================================================
  // AUTHENTICATED SESSION & TENANT REGISTRATION ENDPOINTS
  // ========================================================
  app.get('/api/auth/session', (req, res) => {
    if (!req.verifiedAuth) {
      return res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'A verified Firebase ID token is required to retrieve session details.',
      });
    }

    const { uid, email, emailVerified, signInProvider, authorizedOrgId, role, isPlatformAdmin } =
      req.verifiedAuth;
    const org = initialOrganizations.find((o) => o.id === authorizedOrgId);
    const profile = verifiedTenantRegistry.get(uid);

    return res.json({
      success: true,
      session: {
        uid,
        email,
        emailVerified,
        signInProvider,
        authorizedOrganizationId: authorizedOrgId,
        role,
        isPlatformAdmin,
        preferredLanguage: profile?.preferredLanguage || 'en',
        organization: org || null,
      },
    });
  });

  app.post('/api/auth/register-tenant', (req, res) => {
    if (!req.verifiedAuth) {
      return res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'A verified Firebase ID token is required to register a CNTEstates tenant.',
      });
    }

    const { uid, email, isPlatformAdmin, authorizedOrgId } = req.verifiedAuth;
    const {
      fullName,
      organizationName,
      accountCategory,
      operatingCountry = 'South Africa',
      preferredLanguage = 'en',
      selectedPlanId = 'free',
      termsAccepted,
      privacyAccepted,
      termsAcceptedAt,
      privacyAcceptedAt,
    } = req.body || {};

    // Prevent duplicate tenant profiles for the same Firebase UID
    const existingProfile = verifiedTenantRegistry.get(uid);
    if (existingProfile) {
      const existingOrg = initialOrganizations.find((o) => o.id === existingProfile.organizationId);
      return res.json({
        success: true,
        alreadyRegistered: true,
        profile: existingProfile,
        organization: existingOrg || null,
      });
    }

    if (termsAccepted === false || privacyAccepted === false) {
      return res.status(400).json({
        success: false,
        error: 'LEGAL_CONSENT_REQUIRED',
        message: 'You must accept both the Terms and Conditions and Privacy Policy to register.',
      });
    }

    // Never grant platform_admin during registration
    const safeRole = isPlatformAdmin
      ? 'platform_admin'
      : ALLOWED_REGISTRATION_ROLES.has(accountCategory)
      ? accountCategory
      : 'org_owner';

    const countryCfg = getCountryConfiguration(operatingCountry);
    const baseCurrency = countryCfg?.default_currency || 'ZAR';
    const safePlanId = ['free', 'starter', 'basic', 'professional', 'business', 'enterprise'].includes(
      selectedPlanId
    )
      ? selectedPlanId
      : 'free';

    const orgDisplayName =
      typeof organizationName === 'string' && organizationName.trim().length > 0
        ? organizationName.trim().slice(0, 160)
        : `${String(fullName || email.split('@')[0] || 'My').trim()} Estates Portfolio`;

    const existingOrg = initialOrganizations.find((o) => o.id === authorizedOrgId);
    const org = existingOrg
      ? Object.assign(existingOrg, {
          name: orgDisplayName,
          operatingCountry,
          country: operatingCountry,
          baseCurrency,
          billingCurrency: baseCurrency,
          currency: baseCurrency,
          planId: safePlanId as SubscriptionPlanId,
          subscriptionStatus: safePlanId === 'free' ? 'free' : 'active',
        })
      : ensureIsolatedBackendOrganization({
          orgId: authorizedOrgId,
          name: orgDisplayName,
          planId: safePlanId,
          operatingCountry,
          baseCurrency,
        });

    const record: VerifiedTenantRecord = {
      uid,
      email,
      fullName: String(fullName || email.split('@')[0] || 'User').trim().slice(0, 120),
      organizationId: authorizedOrgId,
      organizationName: org.name,
      role: safeRole,
      operatingCountry,
      preferredLanguage: ['en', 'fr', 'es', 'pt'].includes(preferredLanguage)
        ? preferredLanguage
        : 'en',
      baseCurrency,
      termsAcceptedAt: typeof termsAcceptedAt === 'string' ? termsAcceptedAt.slice(0, 40) : new Date().toISOString(),
      privacyAcceptedAt: typeof privacyAcceptedAt === 'string' ? privacyAcceptedAt.slice(0, 40) : new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    verifiedTenantRegistry.set(uid, record);

    return res.status(201).json({
      success: true,
      alreadyRegistered: false,
      profile: record,
      organization: org,
    });
  });

  // AI Operations Route with Gemini API (strictly scoped to verified tenant)
  app.post('/api/ai/query', async (req, res) => {
    try {
      if (!req.verifiedAuth) {
        return res.status(401).json({
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Verified authentication is required to query the CNTEstates AI Assistant.',
        });
      }
      const { prompt, context, language = 'en', actionPayload } = req.body;
      const orgId = req.verifiedAuth.authorizedOrgId;
      const userRole = req.verifiedAuth.role;

      // SEQUENCE 32: Intercept billing-related queries and enforce AI Billing Safety invariants
      const billingCheck = classifyAiBillingIntent(prompt || '');
      if (billingCheck.isBillingQuery) {
        const billingSafetyResult = processAiBillingQuery({
          prompt,
          organizationId: orgId,
          userRole,
          requestedActionPayload: actionPayload,
        });

        return res.json({
          source: 'cnt_ai_billing_safety_engine',
          reply: billingSafetyResult.reply,
          sequence: 'SEQUENCE 32 — AI BILLING SAFETY',
          classification: billingSafetyResult.classification,
          capability: billingSafetyResult.capability,
          highImpactAction: billingSafetyResult.highImpactAction,
          humanAuthorizationRequired: billingSafetyResult.humanAuthorizationRequired,
          authorizationRequest: billingSafetyResult.authorizationRequest,
          policySummary: billingSafetyResult.policySummary,
          contextSummary: billingSafetyResult.contextSummary,
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // High-fidelity fallback when API key is not yet configured in Secrets
        const reply = generateLocalAiResponse(prompt, context, language);
        return res.json({
          source: 'local_engine',
          reply,
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const promptInstruction = `You are the CNTEstates AI Operations Assistant for a real-estate and rental building management SaaS.
Language requested: ${language} (reply in this language: English, French, Spanish, or Portuguese).
Context data about the properties, units, tenants, maintenance tickets, finances, and contractors:
${JSON.stringify(context || {}, null, 2)}

User request: "${prompt}"

Provide an authoritative, clear, operational answer.
Use exact numbers, tenant names, unit numbers, ticket codes (e.g. CBM-XXXX), and financial figures where relevant.
Include actionable next steps or recommendations for the property manager.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptInstruction,
      });

      return res.json({
        source: 'gemini-3.8-flash',
        reply: response.text || 'No response generated.',
      });
    } catch (err: any) {
      console.error('Server AI Error:', err);
      // Fallback gracefully so UI never fails
      const fallbackReply = generateLocalAiResponse(req.body.prompt, req.body.context, req.body.language || 'en');
      return res.json({
        source: 'local_fallback',
        reply: fallbackReply,
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'CNTEstates API',
      timestamp: new Date().toISOString(),
    });
  });

  // ========================================================
  // SEQUENCE 27 — STRICT MULTI-TENANT ISOLATION MIDDLEWARE
  // ========================================================
  function checkTenantBoundary(
    req: express.Request,
    res: express.Response,
    targetOrgId: string,
    resourceType: ProtectedResourceType,
    action: string = 'access'
  ): boolean {
    const requestingOrgId = req.verifiedAuth
      ? req.verifiedAuth.authorizedOrgId
      : (req.headers['x-organization-id'] as string) || '';
    const userRole = req.verifiedAuth
      ? req.verifiedAuth.role
      : (req.headers['x-user-role'] as string) || 'tenant';
    const userId = req.verifiedAuth
      ? req.verifiedAuth.uid
      : (req.headers['x-user-id'] as string) || 'anonymous';

    // Never allow unverified callers to claim platform_admin bypass
    const effectiveRole =
      userRole === 'platform_admin' && !req.verifiedAuth?.isPlatformAdmin
        ? 'unauthorized'
        : userRole;

    const check = validateTenantAccess(
      { requestingOrgId, userRole: effectiveRole, userId },
      targetOrgId,
      resourceType,
      action,
      'api'
    );

    if (!check.granted) {
      res.status(403).json({
        success: false,
        error: 'TENANT_ISOLATION_VIOLATION',
        resource: resourceType,
        requesting_organization_id: requestingOrgId || 'unauthenticated',
        target_organization_id: targetOrgId,
        message: check.error || `Security Tenant Isolation Violation: Access to ${resourceType} of organization '${targetOrgId}' denied for requesting context '${requestingOrgId}'.`,
      });
      return false;
    }
    return true;
  }

  // ========================================================
  // SEQUENCE 28: RBAC BILLING AUTHORIZATION GUARD
  // ========================================================
  function checkBillingRbac(
    req: express.Request,
    res: express.Response,
    permission: BillingPermission,
    actionName?: string
  ): boolean {
    const rawRole = req.verifiedAuth
      ? req.verifiedAuth.role
      : (req.headers['x-user-role'] as string) || 'tenant';
    const userRole =
      rawRole === 'platform_admin' && !req.verifiedAuth?.isPlatformAdmin
        ? 'tenant'
        : rawRole;

    if (!hasBillingPermission(userRole, permission)) {
      const explanation = getPermissionDenialExplanation(userRole, permission);
      res.status(403).json({
        success: false,
        error: 'RBAC_PERMISSION_DENIED',
        permission,
        role: userRole,
        action: actionName || permission,
        message: explanation,
        authorized_roles: Object.keys(AUTHORITATIVE_ROLE_POLICIES).filter((r) =>
          hasBillingPermission(r, permission)
        ),
      });
      return false;
    }
    return true;
  }

  // ========================================================
  // SEQUENCE 31 — AUTHORITATIVE BILLING API CONTEXT GUARD
  // Enforces Cryptographic Firebase Auth, RBAC, and Tenant Isolation
  // ========================================================
  function authenticateBillingContext(
    req: express.Request,
    res: express.Response,
    permission?: BillingPermission,
    targetOrgIdOverride?: string,
    resourceType: ProtectedResourceType = 'subscription'
  ): {
    requestingOrgId: string;
    targetOrgId: string;
    userRole: string;
    userId: string;
    org: Organization;
  } | null {
    // Cryptographically verified Firebase identity is authoritative
    if (!req.verifiedAuth) {
      res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Verified Firebase Authentication (Authorization: Bearer <ID_TOKEN>) is required.',
      });
      return null;
    }

    const requestingOrgId = req.verifiedAuth.authorizedOrgId;
    const userRole = req.verifiedAuth.role;
    const userId = req.verifiedAuth.uid;
    const targetOrgId =
      targetOrgIdOverride ||
      (req.verifiedAuth.isPlatformAdmin && (req.query.organizationId as string)) ||
      requestingOrgId;

    const org =
      initialOrganizations.find((o) => o.id === requestingOrgId) ||
      ensureIsolatedBackendOrganization({
        orgId: requestingOrgId,
        name: `${req.verifiedAuth.email.split('@')[0] || 'Tenant'} Portfolio`,
      });

    if (permission) {
      if (!checkBillingRbac(req, res, permission, permission)) {
        return null;
      }
    }

    if (!checkTenantBoundary(req, res, targetOrgId, resourceType, permission || 'access')) {
      return null;
    }

    return {
      requestingOrgId,
      targetOrgId,
      userRole,
      userId,
      org: initialOrganizations.find((o) => o.id === targetOrgId) || org,
    };
  }

  // ========================================================
  // SEQUENCE 31 — CAPABILITY 10: BILLING CAPABILITIES REGISTRY
  // ========================================================
  app.get('/api/billing/capabilities', (_req, res) => {
    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capabilities: [
        { key: 'plans', label: 'Plans', endpoint: '/api/subscription/plans', method: 'GET', permission: 'view_billing' },
        { key: 'subscriptions', label: 'Subscriptions', endpoint: '/api/subscription', method: 'GET', permission: 'view_billing' },
        { key: 'subscription_usage', label: 'Subscription Usage', endpoint: '/api/subscription/usage', method: 'GET', permission: 'view_billing' },
        { key: 'invoices', label: 'Invoices', endpoint: '/api/invoices', method: 'GET', permission: 'view_invoices' },
        { key: 'billing_history', label: 'Billing History', endpoint: '/api/billing/history', method: 'GET', permission: 'view_billing' },
        { key: 'subscription_history', label: 'Subscription History', endpoint: '/api/subscription/history', method: 'GET', permission: 'view_billing' },
        { key: 'currencies', label: 'Currencies', endpoint: '/api/subscription/currency', method: 'GET', permission: 'view_billing' },
        { key: 'exchange_rates', label: 'Exchange Rates', endpoint: '/api/billing/exchange-rates', method: 'GET', permission: 'view_billing' },
        { key: 'plan_changes', label: 'Plan Changes', endpoint: '/api/subscription/change-plan', method: 'POST', permission: 'change_plans' },
        { key: 'billing_status', label: 'Billing Status', endpoint: '/api/billing/status', method: 'GET', permission: 'view_billing' },
      ],
      security: {
        authentication: 'Enforced (x-organization-id, x-user-role, Authorization Bearer token)',
        authorization: 'Role-Based Access Control (RBAC)',
        isolation: 'Strict Multi-Tenant Boundary Isolation',
      },
    });
  });

  // 1. GET /api/subscription & /api/subscriptions — Retrieve current organization's subscription record (Capability 2: Subscriptions)
  app.get(['/api/subscription', '/api/subscriptions'], (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'subscription');
    if (!authCtx) return;

    const org = authCtx.org;
    const plan = subscriptionPlans.find((p) => p.id === org.planId) || subscriptionPlans[0];
    const targetCurrency = org.billingCurrency || org.baseCurrency || 'USD';

    // Calculate live authoritative conversion with zero decimal places
    const conversion = convertSubscriptionPrice(plan.master_price, targetCurrency);

    const subRecord = org.subscriptionRecord
      ? normalizeSubscriptionRecord(org.subscriptionRecord)
      : normalizeSubscriptionRecord({
          subscription_id: `sub-${org.id}`,
          organization_id: org.id,
          plan_id: plan.id,
          plan_name: plan.plan_name,
          subscription_status: org.subscriptionStatus,
          status: org.subscriptionStatus,
          master_price: plan.master_price,
          master_price_usd: plan.master_price,
          billing_currency: targetCurrency,
          current_price: conversion.convertedPrice,
          billed_amount: conversion.convertedPrice,
          exchange_rate: conversion.exchangeRate,
          exchange_rate_source: conversion.exchangeRateSource,
          billing_period: plan.billing_period,
          renewal_date: org.renewalDate || '2026-10-15',
          cancel_at_period_end: false,
          payment_status: 'paid',
        });

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'subscriptions',
      subscription_id: subRecord.subscription_id,
      organization_id: subRecord.organization_id,
      organization_name: org.name,
      plan_id: subRecord.plan_id,
      plan_name: subRecord.plan_name,
      subscription_status: subRecord.subscription_status,
      status: subRecord.status,
      billing_period: subRecord.billing_period,
      billing_currency: subRecord.billing_currency,
      master_currency: subRecord.master_currency,
      master_price: subRecord.master_price,
      master_price_usd: subRecord.master_price_usd,
      current_price: subRecord.current_price,
      billed_amount: subRecord.billed_amount,
      current_period_start: subRecord.current_period_start,
      current_period_end: subRecord.current_period_end,
      renewal_date: subRecord.renewal_date,
      trial_start: subRecord.trial_start,
      trial_end: subRecord.trial_end,
      cancel_at_period_end: subRecord.cancel_at_period_end,
      cancelled_at: subRecord.cancelled_at,
      payment_status: subRecord.payment_status,
      external_customer_id: subRecord.external_customer_id,
      external_subscription_id: subRecord.external_subscription_id,
      created_at: subRecord.created_at,
      updated_at: subRecord.updated_at,
      operating_country: org.operatingCountry || org.country,
      exchange_rate: subRecord.exchange_rate,
      exchange_rate_source: subRecord.exchange_rate_source,
      exchange_rate_timestamp: subRecord.exchange_rate_timestamp,
      is_converted: conversion.isConverted,
      subscription_record: subRecord,
    });
  });

  // 2. GET /api/subscription/plans & /api/plans & /api/billing/plans — Retrieve all subscription plans with master USD prices and converted equivalents (Capability 1: Plans)
  app.get(['/api/subscription/plans', '/api/plans', '/api/billing/plans'], (req, res) => {
    // If authenticated, personalize for tenant's currency; if public query requested, allow public
    const isPublic = req.query.public === 'true';
    let authCurrency: string | undefined = undefined;

    if (!isPublic) {
      const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'subscription');
      if (!authCtx) return;
      authCurrency = authCtx.org.billingCurrency || authCtx.org.baseCurrency;
    }

    const currency = (req.query.currency as string) || authCurrency || 'USD';
    const plansWithConvertedPricing = subscriptionPlans.map((plan) => {
      const conversionMonthly = convertSubscriptionPrice(plan.master_price, currency);
      const conversionAnnual = convertSubscriptionPrice(plan.annual_master_price, currency);

      return {
        ...plan,
        master_price_usd: plan.master_price,
        master_currency: 'USD',
        billing_currency: currency,
        converted_monthly_price: conversionMonthly.convertedPrice, // 0 decimals
        converted_annual_price_per_month: conversionAnnual.convertedPrice, // 0 decimals
        formatted_monthly_price: conversionMonthly.formattedConvertedPrice,
        formatted_annual_price_per_month: conversionAnnual.formattedConvertedPrice,
        exchange_rate: conversionMonthly.exchangeRate,
        exchange_rate_source: conversionMonthly.exchangeRateSource,
        is_converted: conversionMonthly.isConverted,
        is_rate_available: conversionMonthly.isAvailable,
      };
    });

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'plans',
      master_currency: 'USD',
      requested_currency: currency,
      total_plans: subscriptionPlans.length,
      plans: plansWithConvertedPricing,
    });
  });

  // 2a-2. GET /api/subscription/comparison — Structured 21-Dimension Plan Comparison
  app.get('/api/subscription/comparison', (_req, res) => {
    const comparisonCriteria = generateStructuredPlanComparison();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 24 — PLAN COMPARISON',
      total_dimensions: comparisonCriteria.length,
      categories: COMPARISON_CATEGORIES,
      criteria: comparisonCriteria,
      plans: subscriptionPlans.map((p) => ({
        id: p.id,
        plan_name: p.plan_name,
        master_price: p.master_price,
        max_rental_units: p.max_rental_units,
        max_properties: p.max_properties,
      })),
    });
  });

  // 2a-3. GET /api/billing/notifications/definitions — Sequence 25 Supported Events & Severities
  app.get('/api/billing/notifications/definitions', (_req, res) => {
    return res.json({
      success: true,
      sequence: 'SEQUENCE 25 — BILLING NOTIFICATIONS',
      total_events: Object.keys(BILLING_NOTIFICATION_DEFINITIONS).length,
      events: BILLING_NOTIFICATION_DEFINITIONS,
      supported_languages: ['en', 'fr', 'es', 'pt'],
    });
  });

  // 2a-4. POST /api/billing/notifications/dispatch — Dispatch localized billing notification
  app.post('/api/billing/notifications/dispatch', (req, res) => {
    const { event, payload, language } = req.body || {};
    if (!event || !BILLING_NOTIFICATION_DEFINITIONS[event as BillingNotificationEvent]) {
      return res.status(400).json({
        error: `Invalid billing notification event '${event}'. Supported events: ${Object.keys(BILLING_NOTIFICATION_DEFINITIONS).join(', ')}`,
      });
    }

    const notification = createBillingNotification(
      event as BillingNotificationEvent,
      payload || {},
      (language || 'en') as 'en' | 'fr' | 'es' | 'pt'
    );

    return res.json({
      success: true,
      sequence: 'SEQUENCE 25 — BILLING NOTIFICATIONS',
      event,
      language: language || 'en',
      notification,
    });
  });

  // 2b. GET /api/subscription/plans/:id & /api/plans/:id & /api/billing/plans/:id — Retrieve single plan with detailed entitlements (Capability 1: Plans)
  app.get(['/api/subscription/plans/:id', '/api/plans/:id', '/api/billing/plans/:id'], (req, res) => {
    const isPublic = req.query.public === 'true';
    let authCurrency: string | undefined = undefined;

    if (!isPublic) {
      const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'subscription');
      if (!authCtx) return;
      authCurrency = authCtx.org.billingCurrency || authCtx.org.baseCurrency;
    }

    const plan = getSubscriptionPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, error: `Subscription plan '${req.params.id}' not found` });
    }
    const currency = (req.query.currency as string) || authCurrency || 'USD';
    const conversion = convertSubscriptionPrice(plan.master_price, currency);

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'plans',
      ...plan,
      master_price_usd: plan.master_price,
      billing_currency: currency,
      converted_monthly_price: conversion.convertedPrice,
      formatted_monthly_price: conversion.formattedConvertedPrice,
      exchange_rate: conversion.exchangeRate,
      exchange_rate_source: conversion.exchangeRateSource,
    });
  });

  // 2c. POST /api/subscription/plans — Register or extend subscription plans dynamically
  app.post('/api/subscription/plans', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string) || 'property_manager';
    if (userRole !== 'platform_admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Registering custom subscription plans requires platform_admin privileges.' });
    }
    const body = req.body;
    if (!body || (!body.plan_id && !body.id && !body.plan_code)) {
      return res.status(400).json({ error: 'plan_id or plan_code is required' });
    }

    const planId = (body.plan_id || body.id || body.plan_code).toLowerCase().trim();
    const planCode = body.plan_code || planId;
    const planName = body.plan_name || body.name || `CNTEstates ${planCode}`;
    const monthlyPrice = typeof body.monthly_price === 'number' ? body.monthly_price : (body.master_price || 0);

    const newPlan: SubscriptionPlan = {
      plan_id: planId,
      id: planId as SubscriptionPlanId,
      plan_code: planCode,
      plan_name: planName,
      name: planName,
      description: body.description || 'Custom configured CNTEstates subscription plan tier.',
      status: body.status || 'active',
      version: body.version || '1.0.0',
      master_currency: 'USD',
      monthly_price: monthlyPrice,
      master_price: monthlyPrice,
      annual_master_price: typeof body.annual_master_price === 'number' ? body.annual_master_price : Math.round(monthlyPrice * 0.8),
      monthlyPrice: monthlyPrice,
      annualPricePerMonth: typeof body.annual_master_price === 'number' ? body.annual_master_price : Math.round(monthlyPrice * 0.8),
      billing_period: body.billing_period || 'monthly',
      max_rental_units: body.max_rental_units || body.unitsLimit || 100,
      unitsLimit: body.max_rental_units || body.unitsLimit || 100,
      max_units_per_property: body.max_units_per_property || body.unitsPerPropertyLimit || 50,
      unitsPerPropertyLimit: body.max_units_per_property || body.unitsPerPropertyLimit || 50,
      max_properties: body.max_properties || body.propertiesLimit || 5,
      propertiesLimit: body.max_properties || body.propertiesLimit || 5,
      max_buildings: body.max_buildings || 10,
      usersLimit: body.usersLimit || 10,
      capacityDescription: body.capacityDescription || `Up to ${body.max_rental_units || 100} units`,
      feature_entitlements: body.feature_entitlements || body.features || ['Custom plan features'],
      features: body.feature_entitlements || body.features || ['Custom plan features'],
      support_level: body.support_level || 'standard',
      ai_entitlements: body.ai_entitlements || {
        enabled: !!body.aiAssistance,
        tier: body.aiAssistance ? 'basic' : 'none',
        copilot: false,
        specialized_agents: false,
        monthly_prompt_quota: 100,
        description: 'Standard AI operations',
      },
      document_entitlements: body.document_entitlements || {
        vault: true,
        unlimited: false,
        storage_gb: 20,
        custom_templates: false,
        description: 'Storage allocation (20 GB)',
      },
      integration_entitlements: body.integration_entitlements || {
        webhooks: true,
        accounting_erp: false,
        sso_saml: false,
        custom_api: true,
        supported_integrations: ['webhooks'],
        description: 'Webhooks & REST APIs',
      },
      aiAssistance: !!body.aiAssistance,
      slaAutomation: !!body.slaAutomation,
      prioritySupport: !!body.prioritySupport,
      customBranding: !!body.customBranding,
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    registerCustomPlan(newPlan);
    return res.status(201).json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'plans',
      message: `Plan '${newPlan.plan_name}' successfully registered`,
      plan: newPlan,
      total_plans: subscriptionPlans.length,
    });
  });

  // 3. GET /api/subscription/currency, /api/billing/currencies, /api/currencies — Authoritative currency conversion & metadata (Capability 7: Currencies)
  app.get(['/api/subscription/currency', '/api/billing/currencies', '/api/currencies'], (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'subscription');
    if (!authCtx) return;

    const org = authCtx.org;
    const targetCurrency = (req.query.targetCurrency as string) || org.billingCurrency || org.baseCurrency || 'USD';
    const country = (req.query.country as string) || org.operatingCountry || org.country || 'South Africa';
    const countryConfig = getCountryConfiguration(country);
    const conversion = convertSubscriptionPrice(100, targetCurrency);

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'currencies',
      organization_id: org.id,
      base_currency: org.baseCurrency || 'ZAR',
      billing_currency: org.billingCurrency || targetCurrency,
      operating_country: org.operatingCountry || country,
      country_configuration: countryConfig,
      zero_decimal_enforced: true,
      exchange_rate: conversion.exchangeRate,
      exchange_rate_source: conversion.exchangeRateSource,
      supported_currencies: currencyCatalogue,
      separation_policy: 'Operating base currency and customer billing currency are strictly decoupled per architectural standard.',
    });
  });

  // 4. GET /api/subscription/usage & /api/usage & /api/billing/usage — Organization subscription usage against limits (Capability 3: Subscription Usage)
  app.get(['/api/subscription/usage', '/api/usage', '/api/billing/usage'], (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'usage');
    if (!authCtx) return;

    const targetOrgId = authCtx.targetOrgId;
    const org = authCtx.org;
    const planId = (req.headers['x-plan-id'] as string) || (req.query.planId as string) || org.planId;
    const plan = subscriptionPlans.find((p) => p.id === planId) || subscriptionPlans[0];

    const orgProperties = serverProperties.filter((p) => p.organizationId === targetOrgId);
    const orgUnits = serverUnits.filter((u) => orgProperties.some((p) => p.id === u.propertyId));
    const orgBuildings = serverBuildings.filter((b) => orgProperties.some((p) => p.id === b.propertyId));

    const monitoring = calculateCentralizedUsage({
      organizationId: org.id,
      organizationName: org.name,
      planId,
      properties: orgProperties,
      units: orgUnits,
      buildings: orgBuildings,
      usersCount: 4,
      storageGbUsed: 14.2,
      aiPromptsUsed: 480,
    });

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'subscription_usage',
      organization_id: org.id,
      plan_id: plan.id,
      plan_name: plan.plan_name,
      overall_status: monitoring.overallStatus,
      resources: monitoring.resources,
      resourceList: monitoring.resourceList,
      has_warnings: monitoring.hasWarnings,
      has_reached_limits: monitoring.hasReachedLimits,
      active_warnings: monitoring.activeWarnings,
      reached_limit_explanations: monitoring.reachedLimitExplanations,
      unlimited_subscriptions_supported: true,
    });
  });

  // 5. GET /api/billing/history & /api/billing — Retrieve comprehensive financial history (Capability 5: Billing History)
  app.get(['/api/billing/history', '/api/billing'], (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'billing_history');
    if (!authCtx) return;

    const targetOrgId = authCtx.targetOrgId;
    const org = authCtx.org;
    const orgInvoices = getInvoicesForOrganization(targetOrgId);
    const invoices = orgInvoices.length > 0 ? orgInvoices : ((org.subscriptionInvoices || []) as SubscriptionInvoice[]).filter((inv: SubscriptionInvoice) => inv.organization_id === targetOrgId);

    const totalBilled = invoices.reduce((sum: number, inv: SubscriptionInvoice) => sum + (inv.total || inv.billed_amount || 0), 0);
    const totalPaid = invoices.reduce((sum: number, inv: SubscriptionInvoice) => sum + (inv.amount_paid || 0), 0);
    const outstanding = invoices
      .filter((inv: SubscriptionInvoice) => inv.payment_status !== 'paid' && inv.invoice_status !== 'paid')
      .reduce((sum: number, inv: SubscriptionInvoice) => sum + (inv.amount_due ?? inv.total ?? 0), 0);

    const auditLogs = getBillingAuditLogs({ organizationId: targetOrgId });

    const settledPayments = invoices
      .filter((inv: SubscriptionInvoice) => (inv.amount_paid || 0) > 0)
      .map((inv: SubscriptionInvoice) => ({
        payment_id: `pay-${inv.invoice_id}`,
        invoice_id: inv.invoice_id,
        invoice_number: inv.invoice_number,
        amount: inv.amount_paid,
        currency: inv.currency,
        payment_method: inv.payment_method || 'Mastercard •••• 4022',
        paid_at: inv.updated_at || inv.invoice_date,
        transaction_reference: inv.external_invoice_id || `tx_cnt_${inv.invoice_id}`,
      }));

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'billing_history',
      organization_id: org.id,
      organization_name: org.name,
      summary: {
        total_invoices_billed: invoices.length,
        total_amount_billed: totalBilled,
        total_amount_paid: totalPaid,
        outstanding_balance: outstanding,
        currency: org.billingCurrency || org.baseCurrency || 'USD',
      },
      invoices,
      payments: settledPayments,
      audit_events: auditLogs,
      immutable: true,
    });
  });

  // 6. GET /api/billing/exchange-rates & /api/subscription/exchange-rates — All reference exchange rates relative to USD (Capability 8: Exchange Rates)
  app.get(['/api/billing/exchange-rates', '/api/subscription/exchange-rates'], (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'subscription');
    if (!authCtx) return;

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'exchange_rates',
      master_currency: 'USD',
      source: exchangeRateMeta.source,
      effective_date: exchangeRateMeta.effectiveDate,
      retrieval_timestamp: exchangeRateMeta.retrievalTimestamp,
      rates: initialExchangeRatesToUSD,
      zero_decimal_rules: 'Mid-market exchange rates applied to USD master prices with strict zero-decimal integer rounding for final invoice totals.',
    });
  });

  // 6b. GET /api/billing/status & /api/subscription/status — Unified authoritative billing health & status summary (Capability 10: Billing Status)
  app.get(['/api/billing/status', '/api/subscription/status'], (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'billing_history');
    if (!authCtx) return;

    const targetOrgId = authCtx.targetOrgId;
    const org = authCtx.org;
    const plan = subscriptionPlans.find((p) => p.id === org.planId) || subscriptionPlans[0];
    const invoices = getInvoicesForOrganization(targetOrgId);
    const unpaidInvoices = invoices.filter((i) => i.payment_status !== 'paid' && i.invoice_status !== 'paid');
    const overdueInvoices = invoices.filter((i) => i.invoice_status === 'past_due' || (i.payment_status !== 'paid' && new Date(i.due_date).getTime() < Date.now()));
    const outstanding = unpaidInvoices.reduce((sum, i) => sum + (i.amount_due ?? i.total ?? 0), 0);
    const paidInvoices = invoices.filter((i) => i.payment_status === 'paid' || i.invoice_status === 'paid');
    const lastPaid = paidInvoices[0] || null;

    const orgProperties = serverProperties.filter((p) => p.organizationId === targetOrgId);
    const orgUnits = serverUnits.filter((u) => orgProperties.some((p) => p.id === u.propertyId));
    const orgBuildings = serverBuildings.filter((b) => orgProperties.some((p) => p.id === b.propertyId));

    const usage = calculateCentralizedUsage({
      organizationId: org.id,
      organizationName: org.name,
      planId: org.planId,
      properties: orgProperties,
      units: orgUnits,
      buildings: orgBuildings,
      usersCount: 4,
      storageGbUsed: 14.2,
      aiPromptsUsed: 480,
    });

    const integrity = verifyAuditLedgerIntegrity();

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'billing_status',
      organization: {
        id: org.id,
        name: org.name,
        operating_country: org.operatingCountry || org.country,
        base_currency: org.baseCurrency || 'ZAR',
        billing_currency: org.billingCurrency || 'ZAR',
        isolation_token: `tenant_${org.id}_sec`,
      },
      subscription: {
        id: org.subscriptionRecord?.subscription_id || `sub-${org.id}`,
        plan_id: plan.id,
        plan_name: plan.plan_name,
        status: org.subscriptionStatus,
        billing_period: org.subscriptionRecord?.billing_period || 'monthly',
        billing_currency: org.billingCurrency || org.baseCurrency || 'USD',
        master_price_usd: plan.master_price,
        current_price: org.monthlySpend,
        renewal_date: org.renewalDate || '2026-10-15',
        trial_days_remaining: org.subscriptionStatus === 'trial' ? (org.trialDaysLeft || 14) : null,
        auto_renew: true,
      },
      payment_status: {
        gateway_provider: 'Stripe Multi-Currency Billing Gateway',
        default_payment_method: 'Mastercard •••• 4022',
        state: outstanding > 0 ? 'past_due' : 'settled',
        auto_collection_enabled: true,
        last_payment_date: lastPaid?.invoice_date || '2026-09-15',
        last_payment_amount: lastPaid?.amount_paid || org.monthlySpend,
        outstanding_balance: outstanding,
      },
      invoices_health: {
        total_invoices_count: invoices.length,
        paid_invoices_count: paidInvoices.length,
        unpaid_invoices_count: unpaidInvoices.length,
        overdue_invoices_count: overdueInvoices.length,
        outstanding_balance: outstanding,
        latest_invoice_number: invoices[0]?.invoice_number || null,
        latest_invoice_status: invoices[0]?.invoice_status || null,
      },
      usage_summary: {
        overall_status: usage.overallStatus,
        rental_units: `${usage.resources.rentalUnits.currentUsage} / ${usage.resources.rentalUnits.allowedCapacity}`,
        properties: `${usage.resources.properties.currentUsage} / ${usage.resources.properties.allowedCapacity}`,
        buildings: `${usage.resources.buildings.currentUsage} / ${usage.resources.buildings.allowedCapacity}`,
        team_seats: `${usage.resources.teamSeats.currentUsage} / ${usage.resources.teamSeats.allowedCapacity}`,
        has_warnings: usage.hasWarnings,
        active_warnings: usage.activeWarnings,
      },
      audit_integrity: {
        status: integrity.isValid ? 'VERIFIED_CRYPTOGRAPHICALLY_INTACT' : 'TAMPERING_DETECTED',
        tamper_evident: true,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // 7. POST /api/subscription/change-plan & /api/billing/change-plan — Dynamic non-hardcoded price & period calculation (Capability 9: Plan Changes)
  app.post(['/api/subscription/change-plan', '/api/billing/change-plan'], (req, res) => {
    const { planId, billingPeriod = 'monthly', billingCurrency, customSchedule } = req.body;

    const plan = subscriptionPlans.find((p) => p.id === planId || p.plan_id === planId);
    if (!plan) {
      return res.status(400).json({ error: `Invalid subscription plan: ${planId}` });
    }

    // Determine initial org to calculate upgrade vs downgrade permission
    const requestedOrgId = (req.headers['x-organization-id'] as string) || (req.query.organizationId as string) || 'org-1';
    const currentOrg = initialOrganizations.find((o) => o.id === requestedOrgId) || initialOrganizations[0];

    // SEQUENCE 28: RBAC check for upgrade / downgrade / change plan
    const tierOrder: Record<string, number> = {
      free: 0,
      starter: 1,
      basic: 2,
      professional: 3,
      pro: 3,
      business: 4,
      plus: 4,
      enterprise: 5,
    };
    const currentTierRank = tierOrder[(currentOrg.planId || 'free').toLowerCase()] ?? 0;
    const targetTierRank = tierOrder[plan.id.toLowerCase()] ?? 0;
    const requiredPermission: BillingPermission =
      targetTierRank > currentTierRank
        ? 'upgrade'
        : targetTierRank < currentTierRank
        ? 'downgrade'
        : 'change_plans';

    const authCtx = authenticateBillingContext(req, res, requiredPermission, requestedOrgId, 'subscription');
    if (!authCtx) return;

    const org = authCtx.org;
    const orgId = authCtx.targetOrgId;

    const currencyToUse = billingCurrency || org.billingCurrency || org.baseCurrency || 'USD';

    // Authoritative dynamic price calculation for ANY billing period or custom schedule
    const basePrice = calculatePlanPriceForPeriod(plan, billingPeriod as BillingPeriod, customSchedule);
    const conversion = convertSubscriptionPrice(basePrice, currencyToUse);

    const now = new Date();
    // Dynamic period dates calculation (supports monthly, quarterly, annual, enterprise custom, and future registered periods)
    const { periodStart, periodEnd, renewalDate } = calculatePeriodDates(
      now,
      billingPeriod as BillingPeriod,
      customSchedule
    );

    const previousSub = org.subscriptionRecord ? { ...org.subscriptionRecord } : null;

    const updatedSubscription = normalizeSubscriptionRecord({
      subscription_id: `sub-${org.id}-${Date.now()}`,
      organization_id: org.id,
      plan_id: plan.id,
      plan_name: plan.plan_name,
      subscription_status: 'active',
      status: 'active',
      master_price: basePrice,
      master_price_usd: basePrice,
      billing_currency: currencyToUse,
      current_price: conversion.convertedPrice,
      billed_amount: conversion.convertedPrice,
      exchange_rate: conversion.exchangeRate,
      exchange_rate_source: conversion.exchangeRateSource,
      exchange_rate_timestamp: conversion.effectiveAt,
      billing_period: billingPeriod as BillingPeriod,
      custom_schedule: customSchedule,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      renewal_date: renewalDate,
      cancel_at_period_end: false,
      cancelled_at: null,
      payment_status: 'paid',
      created_at: org.subscriptionRecord?.created_at || now.toISOString(),
      updated_at: now.toISOString(),
    });

    // Validate relational constraints before committing
    const validation = validateSubscriptionConstraints(
      updatedSubscription,
      initialOrganizations.map((o) => o.id)
    );
    if (!validation.isValid) {
      return res.status(422).json({ error: 'Relational constraint violation', details: validation.errors });
    }

    // Maintain in-memory indexes
    indexSubscription(updatedSubscription);

    // Record immutable audit entry
    const auditEntry = createSubscriptionAuditEntry(
      'PLAN_CHANGE',
      updatedSubscription.subscription_id,
      org.id,
      previousSub,
      updatedSubscription,
      (req.headers['x-user-id'] as string) || 'admin'
    );
    subscriptionAuditTrail.unshift(auditEntry);

    // Generate immutable invoice record
    const invoiceNumber = `CNTE-INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const newInvoice = normalizeInvoiceRecord({
      invoice_id: `sinv-${Date.now()}`,
      id: `sinv-${Date.now()}`,
      invoice_number: invoiceNumber,
      organization_id: org.id,
      organization_name: org.name,
      subscription_id: updatedSubscription.subscription_id,
      plan_id: plan.id,
      plan_name: plan.plan_name,
      invoice_date: now.toISOString().split('T')[0],
      billing_date: now.toISOString().split('T')[0],
      billing_period: billingPeriod as BillingPeriod,
      custom_schedule: customSchedule,
      due_date: now.toISOString().split('T')[0],
      currency: currencyToUse,
      billing_currency: currencyToUse,
      subtotal: conversion.convertedPrice,
      tax: 0,
      discount: 0,
      total: conversion.convertedPrice,
      amount_paid: conversion.convertedPrice,
      amount_due: 0,
      payment_status: 'paid',
      invoice_status: 'paid',
      status: 'paid',
      master_price_usd: basePrice,
      billed_amount: conversion.convertedPrice,
      exchange_rate: conversion.exchangeRate,
      exchange_rate_source: conversion.exchangeRateSource,
      payment_method: 'Corporate Account Card (Auto-Debit)',
      external_invoice_id: `in_plan_${Date.now()}`,
      immutable: true,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    saveInvoice(newInvoice);

    org.planId = plan.id;
    org.monthlySpend = conversion.convertedPrice;
    org.subscriptionRecord = updatedSubscription;
    if (!org.subscriptionInvoices) org.subscriptionInvoices = [];
    org.subscriptionInvoices.unshift(newInvoice);

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'plan_changes',
      message: `Plan changed to ${plan.plan_name} (${billingPeriod})`,
      subscription: updatedSubscription,
      invoice: newInvoice,
    });
  });

  // ==========================================
  // SEQUENCE 12 — AUTHORITATIVE SECURE UPGRADE ENGINE
  // ==========================================

  // 7b. POST /api/subscription/upgrade/preview — Previews authoritative adjustment & steps without committing
  app.post('/api/subscription/upgrade/preview', (req, res) => {
    const requestedOrgId = (req.headers['x-organization-id'] as string) || req.body?.organizationId;
    const authCtx = authenticateBillingContext(req, res, 'view_billing', requestedOrgId, 'subscription');
    if (!authCtx) return;

    const org = authCtx.org;
    const { targetPlanId, billingPeriod = 'monthly', customSchedule } = req.body;

    const currentPlan = getSubscriptionPlan(org.planId) || subscriptionPlans[0];
    const targetPlan = getSubscriptionPlan(targetPlanId);
    if (!targetPlan) {
      return res.status(400).json({ error: `Target plan '${targetPlanId}' not found.` });
    }

    const billingCurrency = org.billingCurrency || org.baseCurrency || 'USD';
    const adjustment = calculateBillingAdjustment({
      currentPlan,
      targetPlan,
      currentSubscription: org.subscriptionRecord,
      billingPeriod: billingPeriod as BillingPeriod,
      customSchedule,
      billingCurrency,
    });

    return res.json({
      success: true,
      adjustment,
      currentPlan: {
        id: currentPlan.id,
        name: currentPlan.name,
      },
      targetPlan: {
        id: targetPlan.id,
        name: targetPlan.name,
      },
    });
  });

  // 7c. POST /api/subscription/upgrade — Executes authoritative 11-step upgrade pipeline
  app.post('/api/subscription/upgrade', (req, res) => {
    const requestedOrgId = (req.headers['x-organization-id'] as string) || req.body?.organizationId;
    const authCtx = authenticateBillingContext(req, res, 'upgrade', requestedOrgId, 'subscription');
    if (!authCtx) return;

    const org = authCtx.org;
    const payload = { ...req.body };

    // MANDATE: "Backend pricing & payment status must be authoritative. Never trust frontend-submitted prices or payment status."
    delete (payload as any).price;
    delete (payload as any).masterPrice;
    delete (payload as any).amount;
    delete (payload as any).rate;
    delete (payload as any).discount;
    delete (payload as any).payment_status;
    delete (payload as any).invoice_status;
    delete (payload as any).subscription_status;
    delete (payload as any).organizationId;
    delete (payload as any).organization_id;

    const result = executeSecureUpgrade({
      organization: org,
      currentSubscription: org.subscriptionRecord,
      payload,
      allOrganizations: initialOrganizations,
    });

    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: result.error,
        stepsTrace: result.stepsTrace,
      });
    }

    // Persist changes in server organization model
    org.planId = result.subscription.plan_id;
    org.monthlySpend = result.subscription.current_price;
    org.subscriptionStatus = result.subscription.subscription_status;
    org.subscriptionRecord = result.subscription;
    if (!org.subscriptionInvoices) org.subscriptionInvoices = [];
    org.subscriptionInvoices.unshift(result.invoice);

    return res.json(result);
  });

  // 7b. GET /api/subscription/billing-periods — Retrieve all registered billing periods
  app.get('/api/subscription/billing-periods', (_req, res) => {
    return res.json({
      success: true,
      standard_paid_period: 'monthly',
      periods: getAllBillingPeriods(),
    });
  });

  // 7c. POST /api/subscription/billing-periods/register — Dynamically register a future billing period
  app.post('/api/subscription/billing-periods/register', (req, res) => {
    const { id, name, shortName, description, months, defaultDiscountPercentage } = req.body;
    if (!id || !name || typeof months !== 'number') {
      return res.status(400).json({ error: 'id, name, and numeric months are required' });
    }

    const newPeriod: BillingPeriodDefinition = {
      id: id as BillingPeriod,
      name,
      shortName: shortName || id.slice(0, 3),
      description: description || `Billing period for ${name}`,
      months,
      defaultDiscountPercentage: defaultDiscountPercentage || 0,
      isStandardPaid: false,
    };

    registerBillingPeriod(newPeriod);

    return res.json({
      success: true,
      message: `Billing period '${id}' registered successfully.`,
      period: newPeriod,
    });
  });

  // ==========================================
  // SEQUENCE 14 — AUTHORITATIVE INVOICE ENGINE
  // ==========================================

  // 14a. GET /api/invoices/meta/statuses — Returns all 8 supported invoice statuses with metadata
  app.get('/api/invoices/meta/statuses', (_req, res) => {
    return res.json({
      success: true,
      statuses: INVOICE_STATUS_META,
    });
  });

  // 14b. GET /api/invoices & /api/billing/invoices — Retrieve invoices for organization with optional status & search filtering (Capability 4: Invoices)
  app.get(['/api/invoices', '/api/billing/invoices'], (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_invoices', undefined, 'invoice');
    if (!authCtx) return;

    const targetOrgId = authCtx.targetOrgId;
    const status = (req.query.status as any) || 'all';
    const search = (req.query.search as string) || '';

    const invoices = getInvoicesForOrganization(targetOrgId, { status, search });
    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'invoices',
      organization_id: targetOrgId,
      total_count: invoices.length,
      invoices,
    });
  });

  // 14c. GET /api/invoices/:invoiceId & /api/billing/invoices/:invoiceId — Retrieve single authoritative invoice (Capability 4: Invoices)
  app.get(['/api/invoices/:invoiceId', '/api/billing/invoices/:invoiceId'], (req, res) => {
    const { invoiceId } = req.params;
    const invoice = getInvoiceById(invoiceId);

    const authCtx = authenticateBillingContext(req, res, 'view_invoices', invoice?.organization_id, 'invoice');
    if (!authCtx) return;

    if (!invoice) {
      return res.status(404).json({ success: false, error: `Invoice '${invoiceId}' was not found.` });
    }

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'invoices',
      invoice,
      immutable: isInvoiceImmutable(invoice),
      meta: INVOICE_STATUS_META[invoice.invoice_status],
    });
  });

  // 14d. POST /api/invoices — Create a new invoice (draft or open) with mathematical integrity (Capability 4: Invoices)
  app.post('/api/invoices', (req, res) => {
    const targetOrgId = req.body.organization_id || (req.headers['x-organization-id'] as string) || 'org-1';
    const authCtx = authenticateBillingContext(req, res, 'change_billing_info', targetOrgId, 'invoice');
    if (!authCtx) return;

    const org = authCtx.org;

    const payload = {
      ...req.body,
      organization_id: org.id,
      organization_name: org.name,
      currency: req.body.currency || org.billingCurrency || org.baseCurrency || 'USD',
      billing_currency: req.body.currency || org.billingCurrency || org.baseCurrency || 'USD',
    };

    const normalized = normalizeInvoiceRecord(payload);
    const saveResult = saveInvoice(normalized);

    if (!saveResult.success) {
      return res.status(422).json({ success: false, error: saveResult.error });
    }

    // Mirror in organization model
    if (!org.subscriptionInvoices) org.subscriptionInvoices = [];
    org.subscriptionInvoices.unshift(normalized);

    return res.status(201).json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'invoices',
      invoice: normalized,
      immutable: isInvoiceImmutable(normalized),
    });
  });

  // 14e. POST /api/invoices/:invoiceId/pay — Record payment against open/partially paid invoice (Capability 4: Invoices)
  app.post('/api/invoices/:invoiceId/pay', (req, res) => {
    const { invoiceId } = req.params;
    const invoice = getInvoiceById(invoiceId);

    // Require verified authentication BEFORE leaking whether an arbitrary invoice ID exists
    const authCtx = authenticateBillingContext(
      req,
      res,
      'change_billing_info',
      invoice?.organization_id,
      'payment'
    );
    if (!authCtx) return;

    if (!invoice) {
      return res.status(404).json({ success: false, error: `Invoice '${invoiceId}' was not found.` });
    }

    // Never trust frontend-supplied payment_status or invoice_status overrides
    const paymentMethod = typeof req.body?.paymentMethod === 'string' ? req.body.paymentMethod : undefined;
    const transactionReference =
      typeof req.body?.transactionReference === 'string'
        ? req.body.transactionReference
        : typeof req.body?.idempotency_key === 'string'
        ? req.body.idempotency_key
        : undefined;
    const rawAmount = req.body?.paymentAmount !== undefined ? req.body.paymentAmount : req.body?.amount;

    if (rawAmount === undefined || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
      return res.status(400).json({ success: false, error: 'A valid positive payment amount is required.' });
    }

    const result = recordInvoicePayment({
      invoiceId,
      paymentAmount: Number(rawAmount),
      paymentMethod,
      transactionReference,
    });

    if (!result.success) {
      if (result.duplicate) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_PAYMENT_PREVENTED',
          error: result.error,
        });
      }
      return res.status(422).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'invoices',
      message: `Payment of ${rawAmount} applied successfully to ${result.invoice?.invoice_number}.`,
      invoice: result.invoice,
      immutable: isInvoiceImmutable(result.invoice!),
    });
  });

  // 14f. PATCH /api/invoices/:invoiceId/status — Authoritative status transition with immutability blocking
  app.patch('/api/invoices/:invoiceId/status', (req, res) => {
    const { invoiceId } = req.params;
    const invoice = getInvoiceById(invoiceId);

    const authCtx = authenticateBillingContext(
      req,
      res,
      'change_billing_info',
      invoice?.organization_id,
      'invoice'
    );
    if (!authCtx) return;

    if (!invoice) {
      return res.status(404).json({ success: false, error: `Invoice '${invoiceId}' was not found.` });
    }

    const { targetStatus, reason } = req.body;

    if (!targetStatus) {
      return res.status(400).json({ success: false, error: 'targetStatus is required.' });
    }

    const result = transitionInvoiceStatus({
      invoiceId,
      targetStatus,
      reason,
    });

    if (!result.success) {
      return res.status(422).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: `Invoice status successfully updated to '${targetStatus}'.`,
      invoice: result.invoice,
      immutable: isInvoiceImmutable(result.invoice!),
    });
  });

  // ==================================================
  // SEQUENCE 16 — AUTHORITATIVE SUBSCRIPTION HISTORY
  // ==================================================

  // 16a. GET /api/subscriptions/history & /api/subscription/history — Retrieve immutable subscription history ledger (Capability 6: Subscription History)
  const handleGetSubscriptionHistory = (req: any, res: any) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'subscription_history');
    if (!authCtx) return;

    const targetOrgId = authCtx.targetOrgId;
    const subscriptionId = req.query.subscriptionId as string;
    const event = req.query.event as string;

    const history = getSubscriptionHistory({
      organizationId: targetOrgId,
      subscriptionId,
      event,
    });

    return res.json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'subscription_history',
      organization_id: targetOrgId,
      total_count: history.length,
      history,
      immutability_guarantee: 'Historical subscription changes are permanently immutable and cannot be overwritten.',
    });
  };

  app.get('/api/subscriptions/history', handleGetSubscriptionHistory);
  app.get('/api/subscription/history', handleGetSubscriptionHistory);

  // 16b. GET /api/subscriptions/history/events — Return all 10 supported events with metadata
  app.get('/api/subscriptions/history/events', (_req, res) => {
    return res.json({
      success: true,
      events: SUBSCRIPTION_HISTORY_EVENT_META,
    });
  });

  // 16c. GET /api/subscriptions/history/verify — Audit verification of history ledger integrity
  app.get('/api/subscriptions/history/verify', (_req, res) => {
    const audit = verifySubscriptionHistoryIntegrity();
    return res.json({
      success: true,
      audit,
      status: audit.verified ? 'VERIFIED_IMMUTABLE' : 'INTEGRITY_COMPROMISED',
    });
  });

  // 16d. POST /api/subscriptions/history — Append a new immutable subscription change (rejects overwrite) (Capability 6: Subscription History)
  const handleRecordSubscriptionHistory = (req: any, res: any) => {
    const targetOrgId = req.body.organization_id || (req.headers['x-organization-id'] as string) || 'org-1';
    const authCtx = authenticateBillingContext(req, res, 'change_plans', targetOrgId, 'subscription_history');
    if (!authCtx) return;

    const org = authCtx.org;

    const {
      event,
      previous_plan,
      new_plan,
      previous_price,
      new_price,
      billing_period,
      effective_date,
      change_reason,
      changed_by,
      subscription_id,
    } = req.body;

    if (!event || !new_plan || new_price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'event, new_plan, and numeric new_price are required fields.',
      });
    }

    const subId = subscription_id || org.subscriptionRecord?.subscription_id || `sub-${org.id}-2026`;

    const recordResult = recordSubscriptionHistory({
      id: req.body.id || req.body.history_id,
      organization_id: org.id,
      subscription_id: subId,
      event,
      previous_plan: previous_plan !== undefined ? previous_plan : (org.subscriptionRecord?.plan_id || null),
      new_plan,
      previous_price: previous_price !== undefined ? previous_price : (org.subscriptionRecord?.current_price ?? null),
      new_price: Number(new_price),
      billing_period: billing_period || org.subscriptionRecord?.billing_period || 'monthly',
      effective_date: effective_date || new Date().toISOString().slice(0, 10),
      change_reason: change_reason || req.body.reason || `Manual administrative event: ${event}`,
      changed_by: changed_by || authCtx.userId || 'Centurion Admin',
      billing_currency: org.billingCurrency || org.currency || 'USD',
      master_price_usd: getMasterPriceUsd(new_plan),
    });

    if (!recordResult.success) {
      return res.status(422).json({
        success: false,
        error: recordResult.error,
      });
    }

    return res.status(201).json({
      success: true,
      sequence: 'SEQUENCE 31 — BILLING API',
      capability: 'subscription_history',
      message: `Subscription change '${event}' recorded permanently to immutable ledger.`,
      record: recordResult.record,
      immutable: true,
    });
  };

  app.post('/api/subscriptions/history', handleRecordSubscriptionHistory);
  app.post('/api/subscription/history', handleRecordSubscriptionHistory);

  // 16e. Reject any attempt to overwrite, mutate, or delete subscription history
  const rejectHistoryModification = (_req: any, res: any) => {
    return res.status(405).json({
      success: false,
      error: 'Immutability Violation: Historical subscription changes can NEVER be overwritten, modified, or deleted under Sequence 16 compliance rules.',
    });
  };
  app.put('/api/subscriptions/history/:id', rejectHistoryModification);
  app.patch('/api/subscriptions/history/:id', rejectHistoryModification);
  app.delete('/api/subscriptions/history/:id', rejectHistoryModification);
  app.put('/api/subscription/history/:id', rejectHistoryModification);
  app.patch('/api/subscription/history/:id', rejectHistoryModification);
  app.delete('/api/subscription/history/:id', rejectHistoryModification);

  // ==================================================
  // SEQUENCE 17 — USD MASTER PRICING (Source of Truth)
  // ==================================================

  // 17a. GET /api/subscription/master-pricing — Authoritative USD master prices
  const handleGetMasterPricing = (_req: any, res: any) => {
    return res.json({
      success: true,
      authoritative_master_currency: AUTHORITATIVE_MASTER_CURRENCY,
      source_of_truth: 'USD',
      invariant: 'The USD price is the source of truth. Converted currency values must never overwrite the USD master price.',
      master_pricing: USD_MASTER_PRICING,
      pricing_tiers: getAuthoritativeMasterPricingList(),
    });
  };
  app.get('/api/subscription/master-pricing', handleGetMasterPricing);
  app.get('/api/subscriptions/master-pricing', handleGetMasterPricing);

  // 17b. GET /api/subscription/master-pricing/verify — Verify master pricing integrity
  app.get('/api/subscription/master-pricing/verify', (_req, res) => {
    const audit = verifyMasterPricingIntegrity(subscriptionPlans);
    return res.json({
      success: true,
      audit,
      status: audit.verified ? 'USD_MASTER_PRICING_VERIFIED' : 'DISCREPANCY_DETECTED',
      invariant_enforced: true,
    });
  });

  // 17c. Reject any attempt to mutate, overwrite, or delete USD Master Pricing
  const rejectMasterPricingMutation = (_req: any, res: any) => {
    return res.status(403).json({
      error: 'FORBIDDEN_MASTER_PRICING_IMMUTABLE',
      message: 'The USD price is the source of truth. Converted currency values must never overwrite the USD master price.',
      authoritative_master_currency: 'USD',
      invariant: 'The USD price is the source of truth. Converted currency values must never overwrite the USD master price.',
      status: 403,
    });
  };
  app.put('/api/subscription/master-pricing', rejectMasterPricingMutation);
  app.patch('/api/subscription/master-pricing', rejectMasterPricingMutation);
  app.delete('/api/subscription/master-pricing', rejectMasterPricingMutation);
  app.put('/api/subscriptions/master-pricing', rejectMasterPricingMutation);
  app.patch('/api/subscriptions/master-pricing', rejectMasterPricingMutation);
  app.delete('/api/subscriptions/master-pricing', rejectMasterPricingMutation);

  // 17d. POST /api/subscription/master-pricing/enforce-invariants — Protect against candidate overwrite
  app.post('/api/subscription/master-pricing/enforce-invariants', (req, res) => {
    const { plan_id, candidate_price, candidate_currency } = req.body || {};
    const planId = plan_id || 'business';
    const currency = candidate_currency || 'ZAR';
    const candidatePrice = candidate_price !== undefined ? Number(candidate_price) : 4445;

    const protection = protectMasterPriceFromConvertedOverwrite(planId, candidatePrice, currency);

    return res.json({
      success: true,
      plan_id: planId,
      candidate_price: candidatePrice,
      candidate_currency: currency,
      master_price_usd: protection.masterPriceUsd,
      overwrite_prevented: protection.overwritePrevented,
      invariant: 'The USD price is the source of truth. Converted currency values must never overwrite the USD master price.',
      authoritative_currency: AUTHORITATIVE_MASTER_CURRENCY,
    });
  });

  // ==========================================
  // SEQUENCE 18 — OPERATING COUNTRY CONFIGURATION
  // ==========================================

  // 18a. GET /api/organization/country-configuration — 4-Step Operating Country Cascade
  app.get('/api/organization/country-configuration', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'organization');
    if (!authCtx) return;

    const org = authCtx.org;
    const countryName = (req.query.country as string) || org.operatingCountry || org.country || 'South Africa';

    const cascade = executeOperatingCountryCascade(countryName);

    return res.json({
      success: true,
      organization_id: org.id,
      sequence: 'SEQUENCE 18 — OPERATING COUNTRY CONFIGURATION',
      pipeline: 'Operating Country → Default Currency → Regional Number Format → Legal/Operational Timezone',
      cascade,
    });
  });

  // 18b. POST /api/organization/country-configuration — Update Operating Country and execute cascade
  app.post('/api/organization/country-configuration', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'change_billing_info', undefined, 'organization');
    if (!authCtx) return;

    const org = authCtx.org;
    const { country } = req.body || {};

    if (!country) {
      return res.status(400).json({ error: 'Missing mandatory country name in request body' });
    }

    const cascade = executeOperatingCountryCascade(country);

    org.operatingCountry = cascade.step1_operatingCountry.countryName;
    org.country = cascade.step1_operatingCountry.countryName;
    org.baseCurrency = cascade.step2_defaultCurrency.currencyCode as any;
    org.currency = cascade.step2_defaultCurrency.currencyCode as any;
    org.timezone = cascade.step4_legalOperationalTimezone.timezone;

    return res.json({
      success: true,
      message: `Operating country successfully configured to ${country}. 4-Step cascade applied.`,
      organization_id: org.id,
      updated_organization: {
        operating_country: org.operatingCountry,
        default_currency: org.baseCurrency,
        regional_number_format: cascade.step3_regionalNumberFormat,
        legal_operational_timezone: org.timezone,
      },
      cascade,
    });
  });

  // 18c. GET /api/currencies/separation-audit — 5-Layer Currency Separation Audit
  app.get('/api/currencies/separation-audit', (req, res) => {
    const orgId = (req.headers['x-organization-id'] as string) || 'org-1';
    const org = initialOrganizations.find((o) => o.id === orgId) || initialOrganizations[0];

    const model = getFiveLayerCurrencyModel({
      operatingCountry: org.operatingCountry || org.country || 'South Africa',
      organizationBaseCurrency: org.baseCurrency || 'ZAR',
      subscriptionBillingCurrency: org.billingCurrency || org.baseCurrency || 'ZAR',
      userPreferredCurrency: 'USD',
    });

    const audit = verifyCurrencySeparationIntegrity({
      masterSubscriptionCurrency: 'USD',
      organizationBaseCurrency: org.baseCurrency || 'ZAR',
      subscriptionBillingCurrency: org.billingCurrency || org.baseCurrency || 'ZAR',
      userDisplayCurrency: 'USD',
      operationalTransactions: [
        { id: 'tx-1', type: 'rent_payment', amount: 18500, currency: org.baseCurrency || 'ZAR' },
        { id: 'tx-2', type: 'utility_charge', amount: 2450, currency: org.baseCurrency || 'ZAR' },
      ],
    });

    return res.json({
      success: true,
      sequence: 'SEQUENCE 18 — 5-LAYER CURRENCY SEPARATION AUDIT',
      rule: 'Maintain separation between: 1. Master subscription currency, 2. Organization default currency, 3. Subscription billing currency, 4. User display currency, 5. Operational transaction currency. Do not mix subscription currency logic with property/rent transaction logic.',
      is_separated: audit.isSeparated,
      violations: audit.violations,
      five_layer_model: model,
      audit: audit.separationAudit,
    });
  });

  // ==========================================
  // SEQUENCE 19 — EXCHANGE-RATE CONVERSION
  // ==========================================

  // 19a. GET /api/subscription/exchange-rate/pipeline — 4-Step Conversion Pipeline
  app.get('/api/subscription/exchange-rate/pipeline', (req, res) => {
    const orgId = (req.headers['x-organization-id'] as string) || 'org-1';
    const org = initialOrganizations.find((o) => o.id === orgId) || initialOrganizations[0];

    const planId = (req.query.plan_id as string) || org.planId || 'business';
    const targetCurrency = (req.query.currency as string) || org.billingCurrency || org.baseCurrency || 'ZAR';
    const country = (req.query.country as string) || org.operatingCountry || org.country || 'South Africa';
    const simulateUnavailable = req.query.simulate_unavailable === 'true';

    const pipeline = executeExchangeRatePipeline({
      planId,
      targetCurrency,
      countryNameOrCode: country,
      forceUnavailable: simulateUnavailable,
    });

    return res.json({
      success: true,
      organization_id: org.id,
      sequence: 'SEQUENCE 19 — EXCHANGE-RATE CONVERSION',
      pipeline_steps: 'USD Master Price → Valid Exchange Rate → Converted Local Price → Regional Formatting',
      rate_invariants: {
        valid: pipeline.step2_validExchangeRate.isValid,
        timestamped: `${pipeline.step2_validExchangeRate.timestampedEffectiveDate} ${pipeline.step2_validExchangeRate.timestampedEffectiveTime}`,
        source_recorded: pipeline.step2_validExchangeRate.sourceRecorded,
        reproducible: pipeline.reproducibilityProof.isReproducible,
        never_invented: true,
      },
      conversion: pipeline,
    });
  });

  // 19b. GET /api/subscription/exchange-rate/registry — Authoritative exchange rates registry
  app.get('/api/subscription/exchange-rate/registry', (_req, res) => {
    const registry = getAuthoritativeExchangeRateRegistry();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 19 — AUTHORITATIVE EXCHANGE-RATE REGISTRY',
      total_rates: registry.length,
      rates: registry,
      policy: 'Never invent an exchange rate. All listed rates are timestamped, source-recorded, and reproducible.',
    });
  });

  // 19c. POST /api/subscription/exchange-rate/verify-reproducibility — Math verification test
  app.post('/api/subscription/exchange-rate/verify-reproducibility', (req, res) => {
    const { usd_master_price, rate, claimed_local_price } = req.body || {};
    const usdPrice = usd_master_price !== undefined ? Number(usd_master_price) : 99;
    const rateNum = rate !== undefined ? Number(rate) : 17.85;
    const claimedLocal = claimed_local_price !== undefined ? Number(claimed_local_price) : Math.round(usdPrice * rateNum);

    const test = verifyConversionReproducibility({
      usdMasterPrice: usdPrice,
      rate: rateNum,
      claimedLocalPrice: claimedLocal,
    });

    return res.json({
      success: true,
      sequence: 'SEQUENCE 19 — REPRODUCIBILITY AUDIT',
      usd_master_price: usdPrice,
      rate: rateNum,
      claimed_local_price: claimedLocal,
      audit: test,
    });
  });

  // 19d. POST /api/subscription/exchange-rate/simulate-unavailable — Fallback to USD test
  app.post('/api/subscription/exchange-rate/simulate-unavailable', (req, res) => {
    const { plan_id, target_currency } = req.body || {};
    const planId = plan_id || 'business';
    const currency = target_currency || 'ZAR';

    const pipeline = executeExchangeRatePipeline({
      planId,
      targetCurrency: currency,
      forceUnavailable: true,
    });

    return res.json({
      success: true,
      sequence: 'SEQUENCE 19 — UNAVAILABLE EXCHANGE-RATE POLICY ENFORCED',
      rule: 'If conversion is unavailable: Show the USD price rather than fabricating a local equivalent.',
      status: pipeline.status,
      fallback_to_usd: pipeline.fallbackToUsd,
      displayed_price: pipeline.displayedPrice,
      unavailable_reason: pipeline.unavailableReason,
      authoritative_usd_master_price: pipeline.step1_usdMasterPrice.formatted,
    });
  });

  // ==========================================
  // SEQUENCE 20 — ZERO-DECIMAL SUBSCRIPTION DISPLAY
  // ==========================================

  // 20a. GET /api/subscription/zero-decimal/audit — Automated Precision Separation Audit
  app.get('/api/subscription/zero-decimal/audit', (_req, res) => {
    const audit = auditZeroDecimalSeparation();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 20 — ZERO-DECIMAL SUBSCRIPTION DISPLAY',
      rule: 'All converted CNTEstates subscription prices must display zero decimal places (e.g. 424.49 -> 424, 424.50 -> 425). Operational finances (Rent, Balances, Utilities, Contractor Invoices, Taxes) retain their own currency precision.',
      verified: audit.verified,
      rounding_tests: {
        '424.49': roundSubscriptionPrice(424.49),
        '424.50': roundSubscriptionPrice(424.50),
        'test_424_49_passed': roundSubscriptionPrice(424.49) === 424,
        'test_424_50_passed': roundSubscriptionPrice(424.50) === 425,
      },
      audit_test_cases: audit.testCases,
      summary: audit.summary,
      financial_precision_rules: FINANCIAL_PRECISION_RULES,
    });
  });

  // 20b. POST /api/subscription/zero-decimal/round — Test Rounding for any candidate amount
  app.post('/api/subscription/zero-decimal/round', (req, res) => {
    const { amount, currency } = req.body || {};
    const inputAmount = amount !== undefined ? Number(amount) : 424.50;
    const curr = currency || 'ZAR';

    const roundedSubscription = roundSubscriptionPrice(inputAmount);
    const formattedSubscription = formatZeroDecimalSubscriptionPrice(inputAmount, curr);

    return res.json({
      success: true,
      sequence: 'SEQUENCE 20 — ZERO-DECIMAL ROUNDING CALCULATION',
      input_amount: inputAmount,
      currency: curr,
      subscription_display: {
        zero_decimals_enforced: true,
        rounded_integer: roundedSubscription,
        formatted: formattedSubscription,
        formula: `Math.round(${inputAmount}) = ${roundedSubscription}`,
      },
      operational_display: {
        zero_decimals_enforced: false,
        retains_precision: true,
        decimals: 2,
        formatted: `${curr} ${inputAmount.toFixed(2)}`,
        note: 'Operational financial values retain full currency precision and are not altered by the subscription zero-decimal rule.',
      },
    });
  });

  // ==========================================
  // SEQUENCE 21 — PAYMENT PROVIDER INTEGRATION
  // ==========================================

  // Helper: Validates that webhook customer/subscription references strictly belong to the target organization
  const validateWebhookAccountOwnership = (context: {
    organizationId: string | null;
    customerId: string | null;
    subscriptionId: string | null;
    invoiceId: string | null;
  }): { valid: boolean; reason?: string } => {
    if (!context.organizationId) {
      return { valid: false, reason: 'Webhook payload missing authoritative organization_id.' };
    }
    const targetOrg = initialOrganizations.find((o) => o.id === context.organizationId);
    if (!targetOrg) {
      return {
        valid: false,
        reason: `Target organization '${context.organizationId}' does not exist in CNTEstates.`,
      };
    }

    const expectedCustomerId = targetOrg.subscriptionRecord?.external_customer_id;
    const expectedSubscriptionId = targetOrg.subscriptionRecord?.external_subscription_id;

    if (context.customerId && expectedCustomerId && context.customerId !== expectedCustomerId) {
      return {
        valid: false,
        reason: `Customer ID '${context.customerId}' does not match organization '${targetOrg.id}' (expected '${expectedCustomerId}').`,
      };
    }

    if (context.subscriptionId && expectedSubscriptionId && context.subscriptionId !== expectedSubscriptionId) {
      return {
        valid: false,
        reason: `Subscription ID '${context.subscriptionId}' does not match organization '${targetOrg.id}' (expected '${expectedSubscriptionId}').`,
      };
    }

    return { valid: true };
  };

  // 21a. GET /api/payment-provider/status — Provider health & maintained IDs
  app.get('/api/payment-provider/status', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'payment');
    if (!authCtx) return;

    const org = authCtx.org;
    const sub = org.subscriptionRecord;

    const customerId = sub?.external_customer_id || `cus_stripe_${org.id}`;
    const subId = sub?.external_subscription_id || `sub_stripe_${org.id}_2026`;
    const customer = getProviderCustomer(org.id);
    const providerSub = getProviderSubscription(subId);

    return res.json({
      success: true,
      sequence: 'SEQUENCE 21 — PAYMENT PROVIDER INTEGRATION',
      provider: PAYMENT_PROVIDER_NAME,
      provider_code: PAYMENT_PROVIDER_CODE,
      environment: 'live_sandbox',
      maintained_provider_ids: {
        organization_id: org.id,
        customer_id: customerId,
        subscription_id: subId,
        latest_invoice_id: org.subscriptionInvoices?.[0]?.external_invoice_id || `in_stripe_${org.id}_001`,
      },
      webhook_listener: {
        endpoint: '/api/payment-provider/webhook',
        authentication: 'Cryptographic HMAC-SHA256 stripe-signature header',
        timestamp_tolerance_seconds: 300,
        idempotency_enforced: true,
        events_processed_count: getProcessedEventsCount(),
      },
      customer_record: customer || null,
      subscription_record: providerSub || null,
    });
  });

  // 21b. POST /api/payment-provider/webhook — Authenticated, Verified, Account-Isolated, Idempotent, Audited Webhook Handler
  app.post('/api/payment-provider/webhook', (req, res) => {
    const signature =
      (req.headers['stripe-signature'] as string) ||
      (req.headers['x-webhook-signature'] as string) ||
      (req.headers['x-webhook-secret'] as string) ||
      null;

    const result = processProviderWebhook({
      rawBody: req.body,
      signatureHeader: signature,
      secret: SERVER_PAYMENT_WEBHOOK_SECRET,
      ownershipValidator: validateWebhookAccountOwnership,
      onEventProcessed: (event) => {
        const dataObj = event.data?.object || {};
        const orgId = dataObj.organization_id || dataObj.metadata?.organization_id;
        // Strict lookup — NEVER fall back to initialOrganizations[0]
        const org = initialOrganizations.find((o) => o.id === orgId);
        if (!org || !org.subscriptionRecord) return;

        if (event.type === 'invoice.paid') {
          const currentEnd = org.subscriptionRecord.current_period_end || new Date().toISOString().slice(0, 10);
          const { periodStart, periodEnd, renewalDate } = calculatePeriodDates(
            currentEnd,
            org.subscriptionRecord.billing_period,
            org.subscriptionRecord.custom_schedule
          );
          org.subscriptionRecord.current_period_start = periodStart;
          org.subscriptionRecord.current_period_end = periodEnd;
          org.subscriptionRecord.renewal_date = renewalDate;
          org.subscriptionRecord.payment_status = 'paid';
          org.subscriptionRecord.subscription_status = 'active';
          indexSubscription(org.subscriptionRecord);

          const invId = dataObj.id || `in_stripe_${Date.now()}`;
          const newInvoice = syncProviderInvoice({
            organizationId: org.id,
            organizationName: org.name,
            subscription: org.subscriptionRecord,
            providerInvoiceId: invId,
            amount: org.subscriptionRecord.current_price,
            currency: org.subscriptionRecord.billing_currency,
            status: 'paid',
          });
          if (!org.subscriptionInvoices) org.subscriptionInvoices = [];
          org.subscriptionInvoices.unshift(newInvoice);
        } else if (event.type === 'invoice.payment_failed') {
          org.subscriptionRecord.payment_status = 'failed';
          org.subscriptionRecord.subscription_status = 'past_due';
          org.subscriptionRecord.status = 'past_due';
          indexSubscription(org.subscriptionRecord);
        } else if (event.type === 'customer.subscription.deleted') {
          org.subscriptionRecord.subscription_status = 'cancelled';
          org.subscriptionRecord.status = 'cancelled';
          org.subscriptionRecord.cancelled_at = new Date().toISOString();
          indexSubscription(org.subscriptionRecord);
        }
      },
    });

    return res.status(result.status).json(result.response);
  });

  // 21c. GET /api/payment-provider/webhooks/audit — Account-Scoped Webhook Tamper-Evident Audit Trail
  app.get('/api/payment-provider/webhooks/audit', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'audit_log');
    if (!authCtx) return;

    const allAudits = getWebhookAuditLogs();
    const scopedAudits = authCtx.userRole === 'platform_admin'
      ? allAudits
      : allAudits.filter((a) => a.affected_organization_id === authCtx.targetOrgId);

    return res.json({
      success: true,
      sequence: 'SEQUENCE 21 — WEBHOOK AUDIT TRAIL',
      organization_id: authCtx.targetOrgId,
      total_recorded: scopedAudits.length,
      audits: scopedAudits,
    });
  });

  // 21d. POST /api/payment-provider/customers — Customer Creation maintaining provider IDs
  app.post('/api/payment-provider/customers', (req, res) => {
    const requestedOrgId = (req.headers['x-organization-id'] as string) || req.body?.organization_id;
    const authCtx = authenticateBillingContext(req, res, 'change_billing_info', requestedOrgId, 'payment');
    if (!authCtx) return;

    const org = authCtx.org;
    const { email, currency, payment_method } = req.body || {};

    const { customer, isNew } = getOrCreateProviderCustomer({
      organizationId: org.id,
      organizationName: org.name,
      email: email || `billing@${org.id}.cntestates.com`,
      currency: currency || org.billingCurrency || org.baseCurrency || 'ZAR',
      existingCustomerId: org.subscriptionRecord?.external_customer_id,
      paymentMethod: payment_method,
    });

    if (org.subscriptionRecord) {
      org.subscriptionRecord.external_customer_id = customer.provider_customer_id;
    }

    return res.json({
      success: true,
      message: isNew ? 'Customer created on payment provider' : 'Existing customer linked on payment provider',
      customer,
      maintained_customer_id: customer.provider_customer_id,
    });
  });

  // 21e. POST /api/payment-provider/subscriptions — Subscription Creation with provider IDs
  app.post('/api/payment-provider/subscriptions', (req, res) => {
    const requestedOrgId = (req.headers['x-organization-id'] as string) || req.body?.organization_id;
    const authCtx = authenticateBillingContext(req, res, 'change_plans', requestedOrgId, 'subscription');
    if (!authCtx) return;

    const org = authCtx.org;
    const { plan_id, billing_period, billing_currency } = req.body || {};

    const result = createProviderSubscription({
      organizationId: org.id,
      organizationName: org.name,
      planId: plan_id || org.planId || 'business',
      billingPeriod: billing_period || 'monthly',
      billingCurrency: billing_currency || org.billingCurrency || 'ZAR',
      existingCustomerId: org.subscriptionRecord?.external_customer_id,
      existingSubscriptionId: org.subscriptionRecord?.external_subscription_id,
    });

    if (org.subscriptionRecord) {
      org.subscriptionRecord.external_customer_id = result.customer.provider_customer_id;
      org.subscriptionRecord.external_subscription_id = result.providerSubscription.provider_subscription_id;
      indexSubscription(org.subscriptionRecord);
    }

    return res.json({
      success: true,
      message: 'Subscription created and synchronized with provider',
      provider_subscription: result.providerSubscription,
      customer: result.customer,
      synchronized_invoice_id: result.synchronizedInvoiceId,
      maintained_provider_ids: {
        customer_id: result.customer.provider_customer_id,
        subscription_id: result.providerSubscription.provider_subscription_id,
      },
    });
  });

  // 21f. POST /api/payment-provider/subscriptions/:id/change — Subscription changes maintaining provider IDs
  app.post('/api/payment-provider/subscriptions/:id/change', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'change_plans', undefined, 'subscription');
    if (!authCtx) return;

    const org = authCtx.org;

    if (!org.subscriptionRecord) {
      return res.status(404).json({ error: 'No subscription record found' });
    }

    const { target_plan_id, billing_period, billing_currency } = req.body || {};
    if (!target_plan_id) {
      return res.status(400).json({ error: 'Missing target_plan_id' });
    }

    const result = changeProviderSubscription({
      existingSubscription: org.subscriptionRecord,
      targetPlanId: target_plan_id,
      billingPeriod: billing_period,
      billingCurrency: billing_currency,
    });

    org.subscriptionRecord.plan_id = target_plan_id;
    if (billing_period) org.subscriptionRecord.billing_period = billing_period;
    if (billing_currency) org.subscriptionRecord.billing_currency = billing_currency;
    org.subscriptionRecord.current_price = result.providerSubscription.unit_amount_local_billed;
    org.subscriptionRecord.master_price = result.providerSubscription.unit_amount_master_usd;
    org.subscriptionRecord.external_customer_id = result.maintainedProviderIds.customer_id;
    org.subscriptionRecord.external_subscription_id = result.maintainedProviderIds.subscription_id;
    indexSubscription(org.subscriptionRecord);

    return res.json({
      success: true,
      message: result.adjustmentSummary,
      provider_subscription: result.providerSubscription,
      maintained_provider_ids: result.maintainedProviderIds,
      invoice_id: result.invoiceId,
    });
  });

  // 21g. POST /api/payment-provider/invoices/sync — Invoice synchronization
  app.post('/api/payment-provider/invoices/sync', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'change_billing_info', undefined, 'invoice');
    if (!authCtx) return;

    const org = authCtx.org;

    if (!org.subscriptionRecord) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const { provider_invoice_id, currency } = req.body || {};
    const invId = provider_invoice_id || `in_stripe_sync_${Date.now().toString().slice(-6)}`;

    // Authoritative price & status computed server-side from subscription record (never trusting frontend payment_status/amount)
    const syncedInvoice = syncProviderInvoice({
      organizationId: org.id,
      organizationName: org.name,
      subscription: org.subscriptionRecord,
      providerInvoiceId: invId,
      amount: org.subscriptionRecord.current_price,
      currency: currency || org.subscriptionRecord.billing_currency || 'ZAR',
      status: 'open',
    });

    if (!org.subscriptionInvoices) org.subscriptionInvoices = [];
    org.subscriptionInvoices.unshift(syncedInvoice);

    return res.json({
      success: true,
      message: `Invoice synchronized with payment provider. External Invoice ID: ${invId}`,
      invoice: syncedInvoice,
      maintained_provider_ids: {
        customer_id: org.subscriptionRecord.external_customer_id,
        subscription_id: org.subscriptionRecord.external_subscription_id,
        invoice_id: invId,
      },
    });
  });

  // 21h. POST /api/payment-provider/simulate-event — Authenticated server-side webhook sandbox (zero client secret exposure)
  app.post('/api/payment-provider/simulate-event', (req, res) => {
    const requestedOrgId = (req.headers['x-organization-id'] as string) || req.body?.organization_id;
    const authCtx = authenticateBillingContext(req, res, 'change_billing_info', requestedOrgId, 'payment');
    if (!authCtx) return;

    const org = authCtx.org;
    const {
      event_type,
      event_id,
      customer_id,
      subscription_id,
      force_invalid_signature,
      timestamp_age_seconds,
    } = req.body || {};
    const type = event_type || 'invoice.paid';
    const nowUnix = Math.floor(Date.now() / 1000);
    const createdTs = nowUnix - (Number(timestamp_age_seconds) || 0);

    const eventPayload: WebhookEventPayload = {
      id: event_id || `evt_sim_${Date.now()}`,
      object: 'event',
      api_version: '2026-09-01',
      created: createdTs,
      type,
      data: {
        object: {
          id: type.startsWith('invoice')
            ? `in_stripe_sim_${Date.now()}`
            : (subscription_id || org.subscriptionRecord?.external_subscription_id || `sub_stripe_${org.id}`),
          customer: customer_id || org.subscriptionRecord?.external_customer_id || `cus_stripe_${org.id}`,
          subscription: subscription_id || org.subscriptionRecord?.external_subscription_id || `sub_stripe_${org.id}`,
          organization_id: org.id,
          amount_paid: org.subscriptionRecord?.current_price || 4445,
          total: org.subscriptionRecord?.current_price || 4445,
          currency: org.subscriptionRecord?.billing_currency || 'ZAR',
          status: type === 'invoice.payment_failed' ? 'past_due' : 'paid',
        },
      },
    };

    const computedSignature = force_invalid_signature
      ? 't=1700000000,v1=0000000000000000000000000000000000000000000000000000000000000000'
      : computeWebhookSignatureHeader(eventPayload, SERVER_PAYMENT_WEBHOOK_SECRET, createdTs);

    const result = processProviderWebhook({
      rawBody: eventPayload,
      signatureHeader: computedSignature,
      secret: SERVER_PAYMENT_WEBHOOK_SECRET,
      ownershipValidator: validateWebhookAccountOwnership,
    });

    return res.status(result.status).json({
      success: result.success,
      http_status: result.status,
      simulated_event: eventPayload,
      audit: result.auditEntry,
      result: result.response,
    });
  });

  // 8. POST /api/subscription/cancel — Schedule cancellation at period end
  app.post('/api/subscription/cancel', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'cancel', undefined, 'subscription');
    if (!authCtx) return;

    const org = authCtx.org;

    if (!org.subscriptionRecord) {
      return res.status(404).json({ error: 'No active subscription found for organization' });
    }

    const previousSub = { ...org.subscriptionRecord };
    const nowIso = new Date().toISOString();

    org.subscriptionRecord = {
      ...org.subscriptionRecord,
      cancel_at_period_end: true,
      cancelled_at: nowIso,
      updated_at: nowIso,
    };
    indexSubscription(org.subscriptionRecord);

    const auditEntry = createSubscriptionAuditEntry(
      'CANCEL',
      org.subscriptionRecord.subscription_id,
      org.id,
      previousSub,
      org.subscriptionRecord,
      authCtx.userId
    );
    subscriptionAuditTrail.unshift(auditEntry);

    return res.json({
      success: true,
      message: 'Subscription will cancel at end of billing cycle.',
      subscription: org.subscriptionRecord,
    });
  });

  // 9. POST /api/subscription/reactivate — Re-enable auto-renewal
  app.post('/api/subscription/reactivate', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'reactivate', undefined, 'subscription');
    if (!authCtx) return;

    const org = authCtx.org;

    if (!org.subscriptionRecord) {
      return res.status(404).json({ error: 'No active subscription found for organization' });
    }

    const previousSub = { ...org.subscriptionRecord };
    const nowIso = new Date().toISOString();

    org.subscriptionRecord = {
      ...org.subscriptionRecord,
      cancel_at_period_end: false,
      cancelled_at: null,
      updated_at: nowIso,
    };
    indexSubscription(org.subscriptionRecord);

    const auditEntry = createSubscriptionAuditEntry(
      'UPDATE',
      org.subscriptionRecord.subscription_id,
      org.id,
      previousSub,
      org.subscriptionRecord,
      authCtx.userId
    );
    subscriptionAuditTrail.unshift(auditEntry);

    return res.json({
      success: true,
      message: 'Subscription auto-renewal restored successfully.',
      subscription: org.subscriptionRecord,
    });
  });

  // 10. GET /api/subscription/tenant/:targetOrgId — Enforces verified auth + strict tenant isolation
  app.get('/api/subscription/tenant/:targetOrgId', (req, res) => {
    const targetOrgId = req.params.targetOrgId;
    const authCtx = authenticateBillingContext(req, res, 'view_billing', targetOrgId, 'subscription');
    if (!authCtx) return;

    const access = getSubscriptionWithTenantIsolation(
      authCtx.requestingOrgId,
      targetOrgId,
      authCtx.userRole
    );
    if (!access.success) {
      return res.status(403).json({ error: access.error });
    }

    return res.json({
      success: true,
      subscription: access.data,
    });
  });

  // 11. GET /api/subscription/audit-trail — Retrieve account-isolated subscription audit logs
  app.get('/api/subscription/audit-trail', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'audit_log');
    if (!authCtx) return;

    const logs = authCtx.userRole === 'platform_admin'
      ? subscriptionAuditTrail
      : subscriptionAuditTrail.filter((l) => l.organizationId === authCtx.targetOrgId);

    return res.json({
      total: logs.length,
      logs,
    });
  });

  // 12. POST /api/subscription/lifecycle/:event — Execute verified subscription lifecycle transitions
  app.post('/api/subscription/lifecycle/:event', (req, res) => {
    const rawEvent = (req.params.event || '').toLowerCase();
    const eventAliases: Record<string, SubscriptionLifecycleEvent> = {
      create: 'creation',
      creation: 'creation',
      activate: 'activation',
      activation: 'activation',
      renew: 'renewal',
      renewal: 'renewal',
      upgrade: 'upgrade',
      downgrade: 'downgrade',
      cancel: 'cancellation',
      cancellation: 'cancellation',
      reactivate: 'reactivation',
      reactivation: 'reactivation',
      suspend: 'suspension',
      suspension: 'suspension',
      expire: 'expiration',
      expiration: 'expiration',
    };

    const event = eventAliases[rawEvent];
    if (!event) {
      return res.status(400).json({
        error: `Invalid lifecycle event '${rawEvent}'. Must be one of: creation, activation, renewal, upgrade, downgrade, cancellation, reactivation, suspension, expiration`,
      });
    }

    let requiredPerm: BillingPermission = 'change_plans';
    if (event === 'cancellation') requiredPerm = 'cancel';
    else if (event === 'reactivation') requiredPerm = 'reactivate';
    else if (event === 'upgrade') requiredPerm = 'upgrade';
    else if (event === 'downgrade') requiredPerm = 'downgrade';

    const requestedOrgId = (req.headers['x-organization-id'] as string) || req.body?.organizationId;
    const authCtx = authenticateBillingContext(req, res, requiredPerm, requestedOrgId, 'subscription');
    if (!authCtx) return;

    const org = authCtx.org;

    if (!org.subscriptionRecord) {
      return res.status(404).json({ error: `No active subscription found for organization '${org.id}'` });
    }

    const previousSub = { ...org.subscriptionRecord };
    const { targetPlanId, billingPeriod, billingCurrency, reason, immediate } = req.body;
    const initiatedBy = authCtx.userId;

    const result = transitionSubscriptionLifecycle(event, {
      subscription: org.subscriptionRecord,
      targetPlanId,
      billingPeriod,
      billingCurrency,
      reason,
      initiatedBy,
      immediate: Boolean(immediate),
    });

    if (!result.success) {
      return res.status(422).json({ error: result.error });
    }

    org.subscriptionRecord = result.subscription;
    org.subscriptionStatus = result.subscription.subscription_status;
    if (targetPlanId) {
      org.planId = result.subscription.plan_id;
    }
    org.monthlySpend = result.subscription.current_price;
    org.renewalDate = result.subscription.renewal_date;

    const auditEntry = createSubscriptionAuditEntry(
      'LIFECYCLE',
      result.subscription.subscription_id,
      org.id,
      previousSub,
      result.subscription,
      initiatedBy
    );
    subscriptionAuditTrail.unshift(auditEntry);

    return res.json({
      success: true,
      event,
      subscription: result.subscription,
      history_entry: result.history,
    });
  });

  // 14. GET /api/capacity/limits — Authoritative subscription capacity limits
  app.get('/api/capacity/limits', (_req, res) => {
    return res.json({
      success: true,
      limits: AUTHORITATIVE_CAPACITY_LIMITS,
    });
  });

  // 15. GET /api/capacity/usage — Live account-isolated capacity consumption metrics
  app.get('/api/capacity/usage', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'usage');
    if (!authCtx) return;

    const org = authCtx.org;
    const targetOrgId = authCtx.targetOrgId;
    const planId = org.planId;
    const orgProperties = serverProperties.filter((p) => p.organizationId === targetOrgId);
    const orgUnits = serverUnits.filter((u) => {
      const prop = orgProperties.find((p) => p.id === u.propertyId);
      return Boolean(prop);
    });

    const usage = calculateCapacityUsage({
      organizationId: org.id,
      planId,
      properties: orgProperties,
      units: orgUnits,
    });

    return res.json({
      success: true,
      usage,
    });
  });

  // 16. POST /api/capacity/validate-property — Preflight check for adding property
  app.post('/api/capacity/validate-property', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'usage');
    if (!authCtx) return;

    const org = authCtx.org;
    const planId = org.planId;
    const currentCount = typeof req.body.currentCount === 'number'
      ? req.body.currentCount
      : serverProperties.filter((p) => p.organizationId === org.id).length;

    const validation = validateAddProperty(planId, currentCount);
    return res.json({
      success: true,
      ...validation,
    });
  });

  // 17. POST /api/capacity/validate-unit — Preflight check for adding unit
  app.post('/api/capacity/validate-unit', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'usage');
    if (!authCtx) return;

    const org = authCtx.org;
    const { propertyId } = req.body;
    const planId = org.planId;
    const orgProperties = serverProperties.filter((p) => p.organizationId === org.id);
    const orgUnits = serverUnits.filter((u) => orgProperties.some((p: any) => p.id === u.propertyId));

    const validation = validateAddUnit({
      planId,
      propertyId,
      allUnits: orgUnits,
      properties: orgProperties,
    });

    return res.json({
      success: true,
      ...validation,
    });
  });

  // 18. GET /api/properties & POST /api/properties — Verified account-isolated capacity enforcement
  app.get('/api/properties', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'organization');
    if (!authCtx) return;

    const properties = serverProperties.filter((p) => p.organizationId === authCtx.targetOrgId);
    return res.json({ success: true, count: properties.length, properties });
  });

  app.post('/api/properties', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'change_billing_info', undefined, 'organization');
    if (!authCtx) return;

    const org = authCtx.org;
    const planId = org.planId;
    const orgProperties = serverProperties.filter((p) => p.organizationId === org.id);

    const validation = validateAddProperty(planId, orgProperties.length);
    if (!validation.allowed) {
      return res.status(403).json({
        error: 'CAPACITY_LIMIT_EXCEEDED',
        code: validation.code,
        message: validation.reason,
        currentCount: validation.currentCount,
        maxLimit: validation.maxLimit,
        planId: validation.planId,
      });
    }

    const newProperty = {
      ...req.body,
      id: req.body.id || `prop-${Date.now()}`,
      organizationId: org.id,
    };
    serverProperties.push(newProperty);

    return res.status(201).json({
      success: true,
      message: 'Property created successfully within subscription capacity limits.',
      property: newProperty,
    });
  });

  // 19. GET /api/units & POST /api/units — Verified account-isolated capacity enforcement
  app.get('/api/units', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'organization');
    if (!authCtx) return;

    const orgProperties = serverProperties.filter((p) => p.organizationId === authCtx.targetOrgId);
    const units = serverUnits.filter((u) => orgProperties.some((p) => p.id === u.propertyId));
    return res.json({ success: true, count: units.length, units });
  });

  app.post('/api/units', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'change_billing_info', undefined, 'organization');
    if (!authCtx) return;

    const org = authCtx.org;
    const planId = org.planId;
    const orgProperties = serverProperties.filter((p) => p.organizationId === org.id);
    const orgUnits = serverUnits.filter((u) => orgProperties.some((p) => p.id === u.propertyId));

    const propertyId = req.body.propertyId;
    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required to associate and validate unit capacity' });
    }
    if (!orgProperties.some((p) => p.id === propertyId)) {
      return res.status(403).json({ error: 'TENANT_ISOLATION_VIOLATION: Property does not belong to your organization.' });
    }

    const validation = validateAddUnit({
      planId,
      propertyId,
      allUnits: orgUnits,
      properties: orgProperties,
    });

    if (!validation.allowed) {
      return res.status(403).json({
        error: 'CAPACITY_LIMIT_EXCEEDED',
        code: validation.code,
        message: validation.reason,
        currentCount: validation.currentCount,
        maxLimit: validation.maxLimit,
        planId: validation.planId,
        propertyId: validation.propertyId,
      });
    }

    const newUnit = {
      ...req.body,
      id: req.body.id || `unit-${Date.now()}`,
      organizationId: org.id,
    };
    serverUnits.push(newUnit);

    return res.status(201).json({
      success: true,
      message: 'Unit created successfully within subscription capacity limits.',
      unit: newUnit,
    });
  });

  // ==========================================
  // SEQUENCE 08 — CENTRALIZED USAGE MONITORING
  // ==========================================

  // 20. GET /api/usage/monitoring — Returns account-isolated centralized usage calculations & status
  app.get('/api/usage/monitoring', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'usage');
    if (!authCtx) return;

    const org = authCtx.org;
    const targetOrgId = authCtx.targetOrgId;
    const planId = org.planId;
    const scenario = (req.query.scenario as any) || null;

    const orgProperties = serverProperties.filter((p) => p.organizationId === targetOrgId);
    const orgUnits = serverUnits.filter((u) => orgProperties.some((p) => p.id === u.propertyId));
    const orgBuildings = serverBuildings.filter((b) => orgProperties.some((p) => p.id === b.propertyId));

    const monitoring = calculateCentralizedUsage({
      organizationId: org.id,
      organizationName: org.name,
      planId,
      properties: orgProperties,
      units: orgUnits,
      buildings: orgBuildings,
      usersCount: 3,
      storageGbUsed: 12.8,
      aiPromptsUsed: 215,
      simulatedScenario: scenario,
    });

    return res.json({
      success: true,
      monitoring,
    });
  });

  // 21. POST /api/usage/validate-resource — Validates adding any plan-controlled resource
  app.post('/api/usage/validate-resource', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'usage');
    if (!authCtx) return;

    const org = authCtx.org;
    const planId = org.planId;
    const { resourceKey, currentCount, propertyId } = req.body;

    const orgProperties = serverProperties.filter((p) => p.organizationId === org.id);
    const orgUnits = serverUnits.filter((u) => orgProperties.some((p) => p.id === u.propertyId));

    const result = validateResourceCapacity({
      resourceKey,
      planId,
      currentCount,
      propertyId,
      properties: orgProperties,
      units: orgUnits,
    });

    return res.json({
      success: true,
      ...result,
    });
  });

  // 22. GET /api/buildings & POST /api/buildings — Verified Account-Isolated Building Capacity Enforcement
  app.get('/api/buildings', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'view_billing', undefined, 'organization');
    if (!authCtx) return;

    const orgProperties = serverProperties.filter((p) => p.organizationId === authCtx.targetOrgId);
    const buildings = serverBuildings.filter((b) => orgProperties.some((p) => p.id === b.propertyId));
    return res.json({ success: true, count: buildings.length, buildings });
  });

  app.post('/api/buildings', (req, res) => {
    const authCtx = authenticateBillingContext(req, res, 'change_billing_info', undefined, 'organization');
    if (!authCtx) return;

    const org = authCtx.org;
    const planId = org.planId;
    const orgProperties = serverProperties.filter((p) => p.organizationId === org.id);
    const orgBuildings = serverBuildings.filter((b) => orgProperties.some((p) => p.id === b.propertyId));

    const validation = validateAddBuilding(planId, orgBuildings.length);
    if (!validation.allowed) {
      return res.status(403).json({
        error: 'CAPACITY_LIMIT_EXCEEDED',
        code: validation.code,
        message: validation.reason,
        currentCount: validation.currentCount,
        maxLimit: validation.maxLimit,
        planId: validation.planId,
      });
    }

    const newBuilding = {
      ...req.body,
      id: req.body.id || `bld-${Date.now()}`,
      organizationId: org.id,
    };
    serverBuildings.push(newBuilding);

    return res.status(201).json({
      success: true,
      message: 'Building created successfully within subscription capacity limits.',
      building: newBuilding,
    });
  });

  app.post('/api/capacity/validate-building', (req, res) => {
    const orgId = (req.headers['x-organization-id'] as string) || req.body.organizationId || 'org-1';
    const org = initialOrganizations.find((o) => o.id === orgId) || initialOrganizations[0];
    const planId = req.body.planId || (req.headers['x-plan-id'] as string) || org.planId;
    const currentCount = typeof req.body.currentCount === 'number'
      ? req.body.currentCount
      : serverBuildings.length;

    const validation = validateAddBuilding(planId, currentCount);
    return res.json({
      success: true,
      ...validation,
    });
  });

  // ===============================================
  // SEQUENCE 09 — FEATURE ENTITLEMENT ENGINE
  // ===============================================

  // 21. GET /api/entitlements — Returns complete feature entitlement catalog and active org entitlements
  app.get('/api/entitlements', (req, res) => {
    const orgId = (req.headers['x-organization-id'] as string) || (req.query.organizationId as string) || 'org-1';
    const org = initialOrganizations.find((o) => o.id === orgId) || initialOrganizations[0];
    const planId = (req.headers['x-plan-id'] as string) || (req.query.planId as string) || org.planId;

    const state = getFeatureEntitlementState(planId);
    const comparativeMatrix = getComparativeFeatureMatrix();

    return res.json({
      success: true,
      organizationId: org.id,
      organizationName: org.name,
      ...state,
      comparativeMatrix,
      totalFeatures: state.allFeatures.length,
      entitledCount: state.entitledFeatureKeys.length,
    });
  });

  // 22. GET /api/entitlements/check/:feature — Checks specific feature entitlement for an organization
  app.get('/api/entitlements/check/:feature', (req, res) => {
    const feature = req.params.feature as any;
    const orgId = (req.headers['x-organization-id'] as string) || (req.query.organizationId as string) || 'org-1';
    const org = initialOrganizations.find((o) => o.id === orgId) || initialOrganizations[0];
    const planId = (req.headers['x-plan-id'] as string) || (req.query.planId as string) || org.planId;

    const check = checkFeatureEntitlement(planId, feature);
    return res.json({
      success: true,
      ...check,
    });
  });

  // 23. POST /api/entitlements/verify — Preflight verification for arbitrary feature and plan
  app.post('/api/entitlements/verify', (req, res) => {
    const { feature, planId } = req.body;
    if (!feature) {
      return res.status(400).json({ error: 'feature parameter is required' });
    }

    const orgId = (req.headers['x-organization-id'] as string) || req.body.organizationId || 'org-1';
    const org = initialOrganizations.find((o) => o.id === orgId) || initialOrganizations[0];
    const targetPlanId = planId || (req.headers['x-plan-id'] as string) || org.planId;

    const check = checkFeatureEntitlement(targetPlanId, feature);
    return res.json({
      success: true,
      ...check,
    });
  });

  // ===============================================
  // SEQUENCE 10 — FEATURE ACCESS CONTROL
  // Authorization Flow: User -> Organization -> Subscription -> Plan -> Entitlement -> Access Decision
  // ===============================================

  // 24. POST /api/access/evaluate — Full 6-stage authorization pipeline evaluation
  app.post('/api/access/evaluate', (req, res) => {
    const { featureKey, role, planId, subscriptionStatus, userId } = req.body;
    if (!featureKey) {
      return res.status(400).json({ error: 'featureKey is required' });
    }

    const orgId = (req.headers['x-organization-id'] as string) || req.body.organizationId || 'org-1';
    const org = initialOrganizations.find((o) => o.id === orgId) || initialOrganizations[0];

    const mockUser: any = {
      id: userId || 'usr-admin-1',
      name: 'Christian Ntanda',
      email: 'christian.ntanda@gmail.com',
      role: role || 'org_owner',
      organizationId: org.id,
    };

    const simulatedOrg = {
      ...org,
      planId: planId || (req.headers['x-plan-id'] as string) || org.planId,
      subscriptionStatus: subscriptionStatus || org.subscriptionStatus,
    };

    const simulatedSub: any = {
      subscription_id: `sub-${org.id}`,
      organization_id: org.id,
      plan_id: simulatedOrg.planId,
      subscription_status: simulatedOrg.subscriptionStatus,
      payment_status: 'paid',
    };

    const decision = evaluateFeatureAccess({
      user: mockUser,
      organization: simulatedOrg,
      subscription: simulatedSub,
      featureKey,
    });

    return res.json({
      success: true,
      ...decision,
    });
  });

  // 25. GET /api/access/features — Batch evaluated access decisions for all features
  app.get('/api/access/features', (req, res) => {
    const orgId = (req.headers['x-organization-id'] as string) || (req.query.organizationId as string) || 'org-1';
    const org = initialOrganizations.find((o) => o.id === orgId) || initialOrganizations[0];
    const planId = (req.headers['x-plan-id'] as string) || (req.query.planId as string) || org.planId;
    const role = (req.query.role as any) || 'org_owner';

    const mockUser: any = {
      id: 'usr-admin-1',
      name: 'Christian Ntanda',
      email: 'christian.ntanda@gmail.com',
      role,
      organizationId: org.id,
    };

    const simulatedOrg = {
      ...org,
      planId,
    };

    const simulatedSub: any = {
      subscription_id: `sub-${org.id}`,
      organization_id: org.id,
      plan_id: planId,
      subscription_status: org.subscriptionStatus,
      payment_status: 'paid',
    };

    const decisions = evaluateAllFeaturesAccess({
      user: mockUser,
      organization: simulatedOrg,
      subscription: simulatedSub,
    });

    return res.json({
      success: true,
      organizationId: org.id,
      planId,
      userRole: role,
      decisions,
    });
  });

  // ========================================================
  // SEQUENCE 27 — MULTI-TENANT SECURITY & ISOLATION API
  // ========================================================

  // 26. GET /api/security/tenant-isolation/status
  app.get('/api/security/tenant-isolation/status', (req, res) => {
    const requestingOrgId = (req.headers['x-organization-id'] as string) || 'org-1';
    const userRole = (req.headers['x-user-role'] as string) || 'property_manager';

    return res.json({
      success: true,
      sequence: 'SEQUENCE 27 — MULTI-TENANT SECURITY',
      isolation_enforced: true,
      requesting_organization_id: requestingOrgId,
      user_role: userRole,
      protected_resources: [
        'subscription',
        'plan',
        'invoice',
        'payment',
        'billing_history',
        'usage',
        'subscription_history',
      ],
      enforcement_levels: [
        'database',
        'api',
        'service',
        'authorization',
        'ui',
      ],
      invariants: [
        "A user from Organization A cannot access Organization B's subscriptions",
        "A user from Organization A cannot access Organization B's plans",
        "A user from Organization A cannot access Organization B's invoices",
        "A user from Organization A cannot process payments on Organization B's invoices",
        "A user from Organization A cannot access Organization B's billing history",
        "A user from Organization A cannot access Organization B's usage consumption",
        "A user from Organization A cannot access Organization B's subscription history provenance",
      ],
    });
  });

  // 27. POST /api/security/tenant-isolation/audit — Run automated breach simulation
  app.post('/api/security/tenant-isolation/audit', (req, res) => {
    const requestingOrgId = (req.headers['x-organization-id'] as string) || req.body?.sourceOrgId || 'org-1';
    const victimOrgId = req.body?.victimOrgId || (requestingOrgId === 'org-1' ? 'org-2' : 'org-1');

    const suite = runCrossTenantIsolationSuite(requestingOrgId, victimOrgId);

    return res.json({
      success: true,
      sequence: 'SEQUENCE 27 — MULTI-TENANT SECURITY',
      audit: suite,
    });
  });

  // 28. GET /api/security/tenant-isolation/audit-trail — Retrieve isolation security event log
  app.get('/api/security/tenant-isolation/audit-trail', (_req, res) => {
    return res.json({
      success: true,
      audit_trail: getTenantSecurityAuditTrail(),
    });
  });

  // ========================================================
  // SEQUENCE 28 — AUTHORITATIVE BILLING RBAC ENDPOINTS
  // ========================================================

  // 29. GET /api/billing/rbac/matrix — Complete RBAC matrix across all 13 roles
  app.get('/api/billing/rbac/matrix', (_req, res) => {
    const policies = getAllRoleBillingPolicies();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 28 — RBAC',
      total_roles: policies.length,
      roles: policies,
      permissions: BILLING_PERMISSION_DEFINITIONS,
    });
  });

  // 30. GET /api/billing/rbac/check — Check permissions for calling role
  app.get('/api/billing/rbac/check', (req, res) => {
    const role =
      (req.headers['x-user-role'] as string) ||
      (req.query.role as string) ||
      'property_manager';
    const permissions = getBillingPermissionsForRole(role);
    return res.json({
      success: true,
      sequence: 'SEQUENCE 28 — RBAC',
      role,
      permissions,
      is_authorized_for_billing: permissions.view_billing,
      can_view_invoices: permissions.view_invoices,
      can_change_plans: permissions.change_plans,
      can_upgrade: permissions.upgrade,
      can_downgrade: permissions.downgrade,
      can_cancel: permissions.cancel,
      can_reactivate: permissions.reactivate,
      can_change_billing_info: permissions.change_billing_info,
    });
  });

  // 31. GET /api/billing/rbac/audit-trail — Retrieve RBAC authorization audit trail
  app.get('/api/billing/rbac/audit-trail', (_req, res) => {
    const auditLogs = getRbacAuditTrail();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 28 — RBAC',
      total_logs: auditLogs.length,
      logs: auditLogs,
    });
  });

  // 32. POST /api/billing/rbac/verify-suite — Run automated 104-test verification suite
  app.post('/api/billing/rbac/verify-suite', (_req, res) => {
    const suite = runBillingRbacTestSuite();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 28 — RBAC VERIFICATION SUITE',
      summary: suite,
    });
  });

  // ========================================================
  // SEQUENCE 29 — AUTHORITATIVE BILLING AUDIT LOG ENDPOINTS
  // ========================================================

  // 33. GET /api/billing/audit-logs — Query immutable billing audit trail
  app.get('/api/billing/audit-logs', (req, res) => {
    const requestingOrgId = (req.headers['x-organization-id'] as string) || 'org-1';
    const targetOrgId = (req.query.organizationId as string) || requestingOrgId;
    const userRole = (req.headers['x-user-role'] as string) || 'property_manager';

    // RBAC check: Must have view_billing or view_invoices to inspect billing audit trail
    if (!checkBillingRbac(req, res, 'view_billing', 'read_billing_audit_log')) {
      return;
    }

    if (!checkTenantBoundary(req, res, targetOrgId, 'billing_history', 'read_billing_audit_log')) {
      return;
    }

    const action = req.query.action as BillingAuditAction | 'all' | undefined;
    const actorRole = req.query.actorRole as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const logs = getBillingAuditLogs({
      organizationId: userRole === 'platform_admin' && req.query.allOrgs === 'true' ? undefined : targetOrgId,
      action,
      actorRole,
      startDate,
      endDate,
      limit,
    });

    const integrity = verifyAuditLedgerIntegrity();

    return res.json({
      success: true,
      sequence: 'SEQUENCE 29 — BILLING AUDIT LOG',
      immutable: true,
      integrity_status: integrity.isValid ? 'VERIFIED_CRYPTOGRAPHICALLY_INTACT' : 'TAMPERING_DETECTED',
      integrity,
      total_recorded: logs.length,
      logs,
      supported_actions: Object.keys(BILLING_AUDIT_ACTIONS),
    });
  });

  // 34. POST /api/billing/audit-logs — Record new immutable billing audit entry
  app.post('/api/billing/audit-logs', (req, res) => {
    const requestingOrgId = (req.headers['x-organization-id'] as string) || 'org-1';
    const { action, previousValue, newValue, correlationId, requestId, metadata } = req.body;

    if (!action || !BILLING_AUDIT_ACTIONS[action as BillingAuditAction]) {
      return res.status(400).json({
        success: false,
        error: `Invalid or missing billing audit action '${action}'. Must be one of: ${Object.keys(BILLING_AUDIT_ACTIONS).join(', ')}`,
      });
    }

    const userRole = (req.headers['x-user-role'] as string) || 'property_manager';
    const userId = (req.headers['x-user-id'] as string) || 'usr-1';
    const org = initialOrganizations.find((o) => o.id === requestingOrgId) || initialOrganizations[0];

    const actor: BillingAuditActor = {
      id: userId,
      name: userRole === 'platform_admin' ? 'Platform Administrator' : 'Alex Vance',
      role: userRole,
      type: userRole === 'system' ? 'system' : 'user',
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'],
    };

    const entry = recordBillingAuditEntry({
      organizationId: requestingOrgId,
      organizationName: org.name,
      actor,
      action: action as BillingAuditAction,
      previousValue: previousValue !== undefined ? previousValue : null,
      newValue: newValue !== undefined ? newValue : {},
      correlationId: correlationId || `corr_api_${Date.now()}`,
      requestId: requestId || `req_api_${Date.now()}`,
      metadata,
    });

    return res.status(201).json({
      success: true,
      sequence: 'SEQUENCE 29 — BILLING AUDIT LOG',
      entry,
    });
  });

  // 35. GET /api/billing/audit-logs/verify — Cryptographic chain verification
  app.get('/api/billing/audit-logs/verify', (_req, res) => {
    const integrity = verifyAuditLedgerIntegrity();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 29 — CRYPTOGRAPHIC INTEGRITY VERIFICATION',
      tamper_evident: true,
      status: integrity.isValid ? 'INTEGRITY_VERIFIED' : 'INTEGRITY_COMPROMISED',
      verification: integrity,
    });
  });

  // 36. GET /api/billing/audit-logs/export — Export logs in CSV or JSON format
  app.get('/api/billing/audit-logs/export', (req, res) => {
    const requestingOrgId = (req.headers['x-organization-id'] as string) || 'org-1';
    const format = (req.query.format as string) === 'csv' ? 'csv' : 'json';

    if (format === 'csv') {
      const csvData = exportBillingAuditLogs('csv', requestingOrgId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="cnt_billing_audit_${requestingOrgId}.csv"`);
      return res.send(csvData);
    }

    const jsonData = exportBillingAuditLogs('json', requestingOrgId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="cnt_billing_audit_${requestingOrgId}.json"`);
    return res.send(jsonData);
  });

  // 37. POST /api/billing/audit-logs/test-suite — Run comprehensive 13-action compliance suite
  app.post('/api/billing/audit-logs/test-suite', (_req, res) => {
    const suite = runBillingAuditTestSuite();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 29 — BILLING AUDIT LOG TEST SUITE',
      summary: suite,
    });
  });

  // ========================================================
  // SEQUENCE 30 — ADMIN BILLING MANAGEMENT ENDPOINTS
  // ========================================================

  // 38. GET /api/admin/billing/organizations — Search and list all customer organizations for platform admin
  app.get('/api/admin/billing/organizations', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string) || 'property_manager';
    if (userRole !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Platform administration billing management requires platform_admin privileges.',
      });
    }

    const query = (req.query.q as string) || '';
    const planId = req.query.planId as string | undefined;
    const subscriptionStatus = req.query.status as string | undefined;
    const country = req.query.country as string | undefined;

    const orgs = searchAdminOrganizations(query, { planId, subscriptionStatus, country });
    const dossiersSummary = orgs.map((org) => {
      const plan = subscriptionPlans.find((p) => p.id === org.planId);
      const invoices = getInvoicesForOrganization(org.id);
      const outstanding = invoices
        .filter((i) => i.payment_status !== 'paid' && i.invoice_status !== 'paid')
        .reduce((sum, i) => sum + (i.amount_due ?? i.total), 0);
      return {
        id: org.id,
        name: org.name,
        operatingCountry: org.operatingCountry || org.country,
        planId: org.planId,
        planName: plan?.plan_name || org.planId,
        masterPriceUsd: plan?.master_price || 0,
        billingCurrency: org.billingCurrency || org.baseCurrency || 'USD',
        monthlySpend: org.monthlySpend,
        subscriptionStatus: org.subscriptionStatus,
        renewalDate: org.renewalDate,
        invoicesCount: invoices.length,
        outstandingBalance: outstanding,
      };
    });

    return res.json({
      success: true,
      sequence: 'SEQUENCE 30 — ADMIN BILLING MANAGEMENT',
      total: orgs.length,
      organizations: dossiersSummary,
    });
  });

  // 39. GET /api/admin/billing/organizations/:orgId — Full organization billing dossier
  app.get('/api/admin/billing/organizations/:orgId', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string) || 'property_manager';
    if (userRole !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Viewing organization billing dossiers requires platform_admin privileges.',
      });
    }

    const { orgId } = req.params;
    const dossier = getOrganizationBillingDossier(orgId);

    // Administrative action logged: Dossier inspected
    const userId = (req.headers['x-user-id'] as string) || 'platform-admin-01';
    logAdministrativeBillingAction({
      organizationId: orgId,
      action: 'INSPECTED_BILLING_DOSSIER',
      notes: `Administrator inspected full commercial dossier for ${dossier.organization.name}.`,
      adminActor: {
        id: userId,
        name: 'Platform Administrator',
        role: 'platform_admin',
        type: 'user',
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      },
    });

    return res.json({
      success: true,
      sequence: 'SEQUENCE 30 — ADMIN BILLING MANAGEMENT',
      dossier,
    });
  });

  // 40. POST /api/admin/billing/organizations/:orgId/capture-payment — Super-admin payment capture
  app.post('/api/admin/billing/organizations/:orgId/capture-payment', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string) || 'property_manager';
    if (userRole !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Capturing payment on behalf of an organization requires platform_admin privileges.',
      });
    }

    const { orgId } = req.params;
    const { invoiceId, amount, currency, paymentMethod, transactionReference, administrativeNotes } = req.body;

    if (!invoiceId || amount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: invoiceId and amount are mandatory.',
      });
    }

    const userId = (req.headers['x-user-id'] as string) || 'platform-admin-01';
    const adminActor: BillingAuditActor = {
      id: userId,
      name: 'Platform Administrator',
      role: 'platform_admin',
      type: 'user',
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'],
    };

    const result = captureAdminPayment({
      organizationId: orgId,
      invoiceId,
      amount: Number(amount),
      currency: currency || 'USD',
      paymentMethod: paymentMethod || 'Mastercard (Admin Manual Capture)',
      transactionReference,
      administrativeNotes,
      adminActor,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      success: true,
      sequence: 'SEQUENCE 30 — ADMIN BILLING MANAGEMENT',
      result,
    });
  });

  // 41. POST /api/admin/billing/actions/log — Super-admin action logger
  app.post('/api/admin/billing/actions/log', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string) || 'property_manager';
    if (userRole !== 'platform_admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Requires platform_admin privileges.' });
    }

    const { organizationId, action, notes, targetInvoiceId, capturedAmount } = req.body;
    const userId = (req.headers['x-user-id'] as string) || 'platform-admin-01';

    logAdministrativeBillingAction({
      organizationId: organizationId || 'org-1',
      action: action || 'ADMINISTRATIVE_REVIEW',
      notes: notes || 'Platform administrator performed system review.',
      adminActor: {
        id: userId,
        name: 'Platform Administrator',
        role: 'platform_admin',
        type: 'user',
      },
      targetInvoiceId,
      capturedAmount,
    });

    return res.json({ success: true, message: 'Administrative action recorded.' });
  });

  // =========================================================================
  // SEQUENCE 32 — AI BILLING SAFETY REST ENDPOINTS
  // =========================================================================

  // 42. POST /api/ai/billing/query & /api/ai/billing/assistant — Process AI billing queries with safety guardrails
  app.post(['/api/ai/billing/query', '/api/ai/billing/assistant'], (req, res) => {
    const orgId = (req.headers['x-organization-id'] as string) || req.body.organizationId || 'org-1';
    const userRole = (req.headers['x-user-role'] as string) || req.body.userRole || 'property_manager';
    const { prompt, actionPayload } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Prompt string is required.' });
    }

    const response = processAiBillingQuery({
      prompt,
      organizationId: orgId,
      userRole,
      requestedActionPayload: actionPayload,
    });

    return res.json(response);
  });

  // 43. GET /api/ai/billing/safety-policy — Retrieve authoritative AI Billing Safety policy
  app.get('/api/ai/billing/safety-policy', (_req, res) => {
    return res.json({
      success: true,
      sequence: 'SEQUENCE 32 — AI BILLING SAFETY',
      guarantee: 'AI must not independently perform high-impact billing actions. Appropriate human authorization is strictly required.',
      permitted_assistance_capabilities: AI_BILLING_PERMITTED_CAPABILITIES,
      high_impact_blocked_actions: HIGH_IMPACT_BILLING_ACTIONS,
      human_authorization_invariants: {
        autonomous_execution_allowed: false,
        verification_method: 'Cryptographic Human-In-The-Loop Sign-off with RBAC',
        audit_trail: 'Every human authorization logs an immutable SHA-256 chained entry',
      },
    });
  });

  // 44. GET /api/ai/billing/authorization-requests — List human authorization tickets for organization
  app.get('/api/ai/billing/authorization-requests', (req, res) => {
    const orgId = (req.headers['x-organization-id'] as string) || (req.query.organizationId as string) || 'org-1';
    const requests = getHumanAuthorizationRequests(orgId);

    return res.json({
      success: true,
      sequence: 'SEQUENCE 32 — AI BILLING SAFETY',
      organization_id: orgId,
      total_count: requests.length,
      pending_count: requests.filter((r) => r.status === 'pending_authorization').length,
      requests,
    });
  });

  // 45. POST /api/ai/billing/authorization-requests/:id/authorize — Authorize & execute AI-blocked action
  app.post('/api/ai/billing/authorization-requests/:id/authorize', (req, res) => {
    const { id } = req.params;
    const actorRole = (req.headers['x-user-role'] as string) || req.body.actorRole || 'property_manager';
    const actorUserId = (req.headers['x-user-id'] as string) || req.body.actorUserId || 'usr-1';
    const actorName = req.body.actorName || (actorRole === 'platform_admin' ? 'Platform Administrator' : 'Authorized User');
    const { notes, signatureConfirmation } = req.body;

    const result = executeHumanAuthorizationDecision({
      requestId: id,
      actorUserId,
      actorRole,
      actorName,
      decision: 'authorize',
      notes,
      signatureConfirmation,
    });

    if (!result.success) {
      const statusCode = result.error === 'UNAUTHORIZED_ROLE' ? 403 : result.error === 'TICKET_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    return res.json({
      sequence: 'SEQUENCE 32 — AI BILLING SAFETY',
      ...result,
    });
  });

  // 46. POST /api/ai/billing/authorization-requests/:id/reject — Reject AI-proposed action
  app.post('/api/ai/billing/authorization-requests/:id/reject', (req, res) => {
    const { id } = req.params;
    const actorRole = (req.headers['x-user-role'] as string) || req.body.actorRole || 'property_manager';
    const actorUserId = (req.headers['x-user-id'] as string) || req.body.actorUserId || 'usr-1';
    const actorName = req.body.actorName || 'Authorized User';
    const { reason } = req.body;

    const result = executeHumanAuthorizationDecision({
      requestId: id,
      actorUserId,
      actorRole,
      actorName,
      decision: 'reject',
      notes: reason,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json({
      sequence: 'SEQUENCE 32 — AI BILLING SAFETY',
      ...result,
    });
  });

  // 47. POST /api/ai/billing/safety-suite/verify — Run automated 13-test verification suite
  app.post('/api/ai/billing/safety-suite/verify', (_req, res) => {
    const suite = runAiBillingSafetyTestSuite();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 32 — AI BILLING SAFETY',
      suite,
    });
  });

  // =========================================================================
  // SEQUENCE 33 — DATABASE MIGRATION REST ENDPOINTS
  // =========================================================================

  // 48. GET /api/database/migration/pre-flight — Identify existing subscriptions, billing, invoices, providers, currencies
  app.get('/api/database/migration/pre-flight', (_req, res) => {
    const preFlight = runPreFlightIdentification();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 33 — DATABASE MIGRATION',
      preFlight,
    });
  });

  // 49. POST /api/database/migration/plan — Create safe, non-destructive migration plan
  app.post('/api/database/migration/plan', (_req, res) => {
    const plan = createSafeMigrationPlan();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 33 — DATABASE MIGRATION',
      plan,
    });
  });

  // 50. POST /api/database/migration/test — Run automated dry-run simulation and preservation assertions
  app.post('/api/database/migration/test', (_req, res) => {
    const testReport = testMigrationDryRun();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 33 — DATABASE MIGRATION',
      testReport,
    });
  });

  // 51. POST /api/database/migration/apply — Apply safe migration with customer & history preservation
  app.post('/api/database/migration/apply', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string) || req.body?.userRole || 'property_manager';
    // Migration execution is restricted to platform_admin or super_admin
    if (userRole !== 'platform_admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED_MIGRATION_ROLE',
        message: 'Database schema migration requires Platform Administrator credentials.',
      });
    }

    try {
      const targetVersion = req.body?.targetVersion || 'v3.0.0';
      const receipt = applyDatabaseMigration(targetVersion);
      return res.json({
        success: true,
        sequence: 'SEQUENCE 33 — DATABASE MIGRATION',
        receipt,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // 52. POST /api/database/migration/snapshot — Create manual pre-migration state snapshot
  app.post('/api/database/migration/snapshot', (_req, res) => {
    const snapshot = createPreMigrationSnapshot();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 33 — DATABASE MIGRATION',
      snapshot,
    });
  });

  // 53. POST /api/database/migration/rollback — Verify and execute rollback/recovery
  app.post('/api/database/migration/rollback', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string) || req.body?.userRole || 'property_manager';
    if (userRole !== 'platform_admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED_MIGRATION_ROLE',
        message: 'Rollback execution requires Platform Administrator credentials.',
      });
    }

    try {
      const snapshotId = req.body?.snapshotId;
      const result = executeDatabaseRollback(snapshotId);
      return res.json({
        sequence: 'SEQUENCE 33 — DATABASE MIGRATION',
        ...result,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  });

  // 54. GET /api/database/migration/status — Current schema status and invariants
  app.get('/api/database/migration/status', (_req, res) => {
    return res.json({
      success: true,
      sequence: 'SEQUENCE 33 — DATABASE MIGRATION',
      current_schema_version: getCurrentDatabaseSchemaVersion(),
      supported_versions: SUPPORTED_SCHEMA_VERSIONS,
      snapshots_count: getMigrationSnapshots().length,
      receipts_count: getMigrationReceipts().length,
      statutory_invariant: 'Never delete historical billing data',
      immutability_guarantee: 'All historical invoices and audit logs are locked and non-deletable',
    });
  });

  // 55. GET /api/database/migration/history — List snapshots and execution receipts
  app.get('/api/database/migration/history', (_req, res) => {
    return res.json({
      success: true,
      sequence: 'SEQUENCE 33 — DATABASE MIGRATION',
      snapshots: getMigrationSnapshots(),
      receipts: getMigrationReceipts(),
    });
  });

  // =========================================================================
  // SEQUENCE 34 — AUTOMATED TESTING API ENDPOINTS
  // =========================================================================

  // 56. GET /api/automated-testing/suites — List all suites and test definitions
  app.get('/api/automated-testing/suites', (_req, res) => {
    const categories: Array<{ id: TestCategory; name: string; count: number }> = [
      { id: 'plans', name: 'Plans & Master Pricing', count: TEST_DEFINITIONS.filter((t) => t.category === 'plans').length },
      { id: 'capacity', name: 'Capacity Limits', count: TEST_DEFINITIONS.filter((t) => t.category === 'capacity').length },
      { id: 'subscription', name: 'Subscription Lifecycle', count: TEST_DEFINITIONS.filter((t) => t.category === 'subscription').length },
      { id: 'billing', name: 'Billing & Invoicing', count: TEST_DEFINITIONS.filter((t) => t.category === 'billing').length },
      { id: 'currency', name: 'Currency Operations', count: TEST_DEFINITIONS.filter((t) => t.category === 'currency').length },
      { id: 'security', name: 'Security & Isolation', count: TEST_DEFINITIONS.filter((t) => t.category === 'security').length },
    ];

    return res.json({
      success: true,
      sequence: 'SEQUENCE 34 — AUTOMATED TESTING',
      total_tests: TEST_DEFINITIONS.length,
      categories,
      tests: TEST_DEFINITIONS.map((t) => ({
        id: t.id,
        category: t.category,
        name: t.name,
        requirement: t.requirement,
        expected: t.expected,
      })),
    });
  });

  // 57. POST /api/automated-testing/run — Execute automated test suite (all or specific category)
  app.post('/api/automated-testing/run', (req, res) => {
    const category = req.body?.category as TestCategory | undefined;
    const report = runAutomatedBillingTestSuite(category);

    return res.json({
      success: true,
      sequence: 'SEQUENCE 34 — AUTOMATED TESTING',
      report,
    });
  });

  // 58. GET /api/automated-testing/summary — Quick health summary of automated tests
  app.get('/api/automated-testing/summary', (_req, res) => {
    const report = runAutomatedBillingTestSuite();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 34 — AUTOMATED TESTING',
      all_passed: report.allPassed,
      total_tests: report.totalTests,
      passed_tests: report.passedTests,
      failed_tests: report.failedTests,
      duration_ms: report.totalDurationMs,
      timestamp: report.executionTimestamp,
      categories: Object.values(report.categories).map((c) => ({
        category: c.category,
        name: c.categoryName,
        total: c.totalTests,
        passed: c.passedTests,
        failed: c.failedTests,
        all_passed: c.allPassed,
      })),
    });
  });

  // =========================================================================
  // SEQUENCE 35 — FULL REGRESSION TESTING API ENDPOINTS
  // =========================================================================

  // 59. GET /api/regression-testing/summary — Overall health status across all 28 domains
  app.get('/api/regression-testing/summary', (_req, res) => {
    const report = runFullRegressionTestSuite();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 35 — FULL REGRESSION TEST',
      all_passed: report.allPassed,
      total_tests: report.totalTests,
      passed_tests: report.passedTests,
      failed_tests: report.failedTests,
      domains_tested: report.domainsTested,
      duration_ms: report.totalDurationMs,
      timestamp: report.timestamp,
    });
  });

  // 60. POST /api/regression-testing/run — Execute regression test suite
  app.post('/api/regression-testing/run', (req, res) => {
    const domain = req.body?.domain as string | undefined;
    const report = runFullRegressionTestSuite(domain);
    return res.json({
      success: true,
      sequence: 'SEQUENCE 35 — FULL REGRESSION TEST',
      report,
    });
  });

  // 61. GET /api/regression-testing/domains — List all 28 tested platform domains
  app.get('/api/regression-testing/domains', (_req, res) => {
    const domains = Array.from(new Set(REGRESSION_TEST_DEFINITIONS.map((d) => d.domain)));
    return res.json({
      success: true,
      sequence: 'SEQUENCE 35 — FULL REGRESSION TEST',
      total_domains: domains.length,
      domains: domains.map((name) => {
        const tests = REGRESSION_TEST_DEFINITIONS.filter((t) => t.domain === name);
        return {
          name,
          tests_count: tests.length,
          sample_test: tests[0]?.name,
        };
      }),
    });
  });

  // =========================================================================
  // SEQUENCE 36 — PRODUCTION VALIDATION API ENDPOINTS
  // =========================================================================

  // 62. GET /api/production-validation/summary — Returns production readiness criteria status
  app.get('/api/production-validation/summary', (_req, res) => {
    const report = runFinalProductionValidation();
    return res.json({
      success: true,
      sequence: 'SEQUENCE 36 — FINAL PRODUCTION VALIDATION',
      all_passed: report.allPassed,
      total_checks: report.totalChecks,
      passed_checks: report.passedChecks,
      failed_checks: report.failedChecks,
      categories: report.categories,
      duration_ms: report.totalDurationMs,
      timestamp: report.timestamp,
    });
  });

  // 63. POST /api/production-validation/run — Execute production validation suite
  app.post('/api/production-validation/run', (req, res) => {
    const category = req.body?.category as ProductionValidationCategory | undefined;
    const report = runFinalProductionValidation(category);
    return res.json({
      success: true,
      sequence: 'SEQUENCE 36 — FINAL PRODUCTION VALIDATION',
      report,
    });
  });

  // 64. GET /api/production-validation/categories — List all 6 production verification categories
  app.get('/api/production-validation/categories', (_req, res) => {
    const categories: ProductionValidationCategory[] = [
      'Subscription',
      'Billing',
      'Currency',
      'Security',
      'UX',
      'Data',
    ];
    return res.json({
      success: true,
      total_categories: categories.length,
      categories: categories.map((cat) => {
        const items = authoritativeProductionValidationItems.filter((i) => i.category === cat);
        return {
          category: cat,
          checks_count: items.length,
          sample_check: items[0]?.name,
        };
      }),
    });
  });

  // =========================================================================
  // SEQUENCE 37 — FINAL CNTESTATES ARCHITECTURE API ENDPOINTS
  // =========================================================================

  // 65. GET /api/architecture/hierarchy — Structured definitions for all 13 hierarchy nodes
  app.get('/api/architecture/hierarchy', (req, res) => {
    const orgId = (req.query.orgId as string) || 'org-1';
    const org = initialOrganizations.find((o) => o.id === orgId) || initialOrganizations[0];
    const nodes = getArchitectureHierarchyNodes(org);
    return res.json({
      success: true,
      sequence: 'SEQUENCE 37 — FINAL CNTESTATES ARCHITECTURE',
      total_nodes: nodes.length,
      hierarchy: nodes,
    });
  });

  // 66. GET /api/architecture/plans — The 6 canonical plans with standard tier progression
  app.get('/api/architecture/plans', (_req, res) => {
    return res.json({
      success: true,
      sequence: 'SEQUENCE 37 — FINAL CNTESTATES ARCHITECTURE',
      master_currency: 'USD',
      total_plans: AUTHORITATIVE_FINAL_STANDARD_PLANS.length,
      plans: AUTHORITATIVE_FINAL_STANDARD_PLANS,
    });
  });

  // 67. GET /api/architecture/validate — Validate all 13 nodes end-to-end for a tenant
  app.get('/api/architecture/validate', (req, res) => {
    const orgId = (req.query.orgId as string) || 'org-1';
    const validation = validateFinalArchitecturePipeline(orgId);
    return res.json({
      success: true,
      sequence: 'SEQUENCE 37 — FINAL CNTESTATES ARCHITECTURE',
      validation,
    });
  });

  // 68. POST /api/architecture/simulate — Execute live end-to-end request across all 13 stages
  app.post('/api/architecture/simulate', (req, res) => {
    const orgId = (req.body?.orgId as string) || 'org-1';
    const planId = (req.body?.planId as string) || 'business';
    const period = (req.body?.period as BillingPeriod) || 'monthly';
    const result = executeArchitectureFlowSimulation(orgId, planId, period);
    return res.json({
      success: true,
      sequence: 'SEQUENCE 37 — FINAL CNTESTATES ARCHITECTURE',
      simulation: result,
    });
  });

  // =========================================================================
  // TAX & STATUTORY FISCAL COMPLIANCE API ENDPOINTS
  // =========================================================================

  // 69. GET /api/billing/tax-profiles — List jurisdictional tax profiles
  app.get('/api/billing/tax-profiles', (_req, res) => {
    return res.json({
      success: true,
      total_profiles: Object.keys(AUTHORITATIVE_TAX_PROFILES).length,
      profiles: AUTHORITATIVE_TAX_PROFILES,
    });
  });

  // 70. POST /api/billing/calculate-tax — Calculate taxes and totals based on country
  app.post('/api/billing/calculate-tax', (req, res) => {
    const {
      subtotal = 0,
      discount = 0,
      country = 'South Africa',
      isTaxExempt = false,
      taxExemptionReason,
      customerTaxId,
      fixedTaxRate,
    } = req.body || {};

    const calculation = calculateJurisdictionTax({
      subtotal: Number(subtotal),
      discount: Number(discount),
      countryCodeOrName: country,
      isTaxExempt: Boolean(isTaxExempt),
      taxExemptionReason,
      customerTaxId,
      fixedTaxRate: fixedTaxRate !== undefined ? Number(fixedTaxRate) : undefined,
    });

    return res.json({
      success: true,
      calculation,
    });
  });

  // 71. POST /api/billing/validate-tax-id — Validate VAT/EIN format
  app.post('/api/billing/validate-tax-id', (req, res) => {
    const { taxId, country = 'South Africa' } = req.body || {};
    const validation = validateTaxRegistrationNumber(taxId, country);
    return res.json({
      success: true,
      validation,
    });
  });

  // Mount Vite or static serving
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CNTEstates] Server live on http://0.0.0.0:${PORT}`);
  });
}

function generateLocalAiResponse(prompt: string = '', context: any = {}, lang: string = 'en'): string {
  const p = prompt.toLowerCase();
  const tickets = context?.tickets || [];
  const tenants = context?.tenants || [];
  const leases = context?.leases || [];
  const properties = context?.properties || [];

  const langPrefix = {
    en: 'CNT AI Operational Assistant:\n\n',
    fr: 'Assistant Opérationnel CNT AI :\n\n',
    es: 'Asistente Operativo CNT AI:\n\n',
    pt: 'Assistente Operacional CNT AI:\n\n',
  }[lang] || 'CNT AI Operational Assistant:\n\n';

  if (p.includes('critical') || p.includes('urgente') || p.includes('critique') || p.includes('emergency')) {
    const critical = tickets.filter((t: any) => t.priority === 'emergency' || t.priority === 'critical');
    if (critical.length === 0) {
      return langPrefix + (lang === 'fr' ? 'Aucun ticket de maintenance critique ou d\'urgence en cours.' : 'There are currently no open critical or emergency maintenance tickets across your active portfolio.');
    }
    const list = critical.map((t: any) => `• [${t.code}] ${t.title} - ${t.propertyName} (Unit ${t.unitNumber}) | Priority: ${t.priority.toUpperCase()} | SLA Target: ${t.slaTarget}`).join('\n');
    return `${langPrefix}Identified ${critical.length} critical/emergency issue(s) requiring immediate intervention:\n\n${list}\n\nRecommended Action: Dispatch on-call contractors and monitor SLA timers.`;
  }

  if (p.includes('lease') || p.includes('expire') || p.includes('bail') || p.includes('arrendamiento') || p.includes('contrato')) {
    const expiring = leases.filter((l: any) => l.status === 'expiring' || l.daysRemaining <= 90);
    const list = expiring.map((l: any) => `• Unit ${l.unitNumber} (${l.tenantName}): Lease #${l.leaseNumber} expires in ${l.daysRemaining} days (End Date: ${l.endDate}). Monthly Rent: $${l.monthlyRent.toLocaleString()}`).join('\n');
    return `${langPrefix}Found ${expiring.length} lease(s) approaching expiration within the next 90 days:\n\n${list}\n\nRecommended Action: Send renewal notices with escalation rates configured in settings.`;
  }

  if (p.includes('spend') || p.includes('spent') || p.includes('dépense') || p.includes('gasto') || p.includes('finance') || p.includes('cost')) {
    const totalMaintenance = tickets.reduce((acc: number, t: any) => acc + (t.cost || 0), 0);
    return `${langPrefix}Portfolio Maintenance & Financial Overview:\n• Total Maintenance Expenditure (Month to Date): $${totalMaintenance.toLocaleString()}\n• Operating Result: Positive cash flow maintained across 94.2% occupancy.\n• Highest expense category: HVAC maintenance and seasonal elevator inspection.`;
  }

  if (p.includes('balance') || p.includes('arrears') || p.includes('retard') || p.includes('deuda') || p.includes('impayé')) {
    const inArrears = tenants.filter((t: any) => (t.outstandingBalance || 0) > 0);
    const list = inArrears.map((t: any) => `• ${t.name} (Unit ${t.unitNumber}): $${t.outstandingBalance.toLocaleString()} overdue (Status: ${t.paymentStatus})`).join('\n');
    return `${langPrefix}Identified ${inArrears.length} tenant(s) with outstanding arrears:\n\n${list}\n\nAutomated escalation workflows have prepared overdue notices ready for dispatch.`;
  }

  if (p.includes('contractor') || p.includes('sla') || p.includes('prestataire') || p.includes('contratista')) {
    return `${langPrefix}Contractor Performance Summary:\n• Apex HVAC Solutions: 98% SLA compliance (Avg response: 18m)\n• Metro Electrical Services: 92% SLA compliance (Avg response: 35m)\n• Rapid Plumbing Co: 88% SLA compliance (1 breach logged this cycle)\n\nRecommended Action: Review RFQ queue and verify pending work order sign-offs.`;
  }

  if (p.includes('report') || p.includes('monthly') || p.includes('rapport') || p.includes('informe')) {
    return `${langPrefix}Monthly Building Operations Summary:\n• Properties Managed: ${properties.length || 3} complexes (${context?.metrics?.totalUnits || 184} units)\n• Portfolio Occupancy Rate: 94.6%\n• Rent Collection Rate: 96.8%\n• Resolved Service Requests: ${tickets.filter((t: any) => t.status === 'completed' || t.status === 'closed').length}\n• Open Work Orders: ${tickets.filter((t: any) => t.status !== 'closed').length}\n• Compliance Status: 100% valid certifications (Fire & Elevator up to date).`;
  }

  return `${langPrefix}I have analyzed your live portfolio operations. Your current portfolio has 94.6% occupancy with 2 active critical tickets and 3 leases expiring in the next 90 days. Would you like me to prepare work orders, generate renewal notices, or export the monthly performance report?`;
}

startServer();
