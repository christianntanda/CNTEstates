import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  linkWithPopup,
  linkWithCredential,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
  unlink,
  reload,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  getFederatedAuthProvider,
  type FederatedProviderId,
  OperationType,
  handleFirestoreError,
  sanitizeId,
  sanitizeProviderList,
  VALID_ROLE_CATEGORIES,
  buildFirestoreUserProfile,
  buildFirestoreOrganization,
  buildFirestoreOrganizationMember,
  buildFirestoreProperty,
  buildFirestoreUnit,
  buildFirestoreTicket,
  buildFirestoreInvoice,
  buildFirestoreAuditLog,
} from '../firebase';
import { getCountryCurrencyDefaults } from '../services/currencyService';
import { authenticatedFetch } from '../utils/authFetch';
import type {
  Organization,
  Property,
  Unit,
  ServiceTicket,
  SubscriptionInvoice,
  AuditLog,
  UserRole,
  Language,
} from '../types';

export type CloudSyncStatus = 'disconnected' | 'syncing' | 'synced' | 'error';

export interface RegistrationMetadata {
  fullName: string;
  organizationName: string;
  accountCategory: UserRole;
  operatingCountry: string;
  preferredLanguage?: Language;
  selectedPlanId?: string;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
}

export interface EmailSignUpParams extends RegistrationMetadata {
  email: string;
  password: string;
}

export interface AccountCollisionAlert {
  email?: string;
  attemptedProvider: string;
  message: string;
}

export interface CloudWorkspaceSnapshot {
  organizationId: string;
  organization: Partial<Organization> | null;
  properties: Property[];
  units: Unit[];
  tickets: ServiceTicket[];
  invoices: Partial<SubscriptionInvoice>[];
  auditLogs: AuditLog[];
}

export interface AuthActionResult {
  success: boolean;
  message?: string;
  code?: string;
  requiresEmailVerification?: boolean;
  requiresReauthentication?: boolean;
  collision?: AccountCollisionAlert;
}

interface FirebaseContextType {
  firebaseUser: User | null;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  syncStatus: CloudSyncStatus;
  cloudHydrated: boolean;
  cloudOrgId: string | null;
  cloudSnapshot: CloudWorkspaceSnapshot | null;
  linkedProviders: string[];
  userRoleCategory: UserRole;
  userPreferredLanguage: Language;
  isPlatformAdmin: boolean;
  backendSessionVerified: boolean;
  signInWithFederatedProvider: (
    providerId: FederatedProviderId,
    registrationMeta?: Partial<RegistrationMetadata>
  ) => Promise<AuthActionResult>;
  signInWithGoogle: (registrationMeta?: Partial<RegistrationMetadata>) => Promise<AuthActionResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
  signUpWithEmail: (params: EmailSignUpParams) => Promise<AuthActionResult>;
  sendPasswordReset: (email: string) => Promise<AuthActionResult>;
  resendVerificationEmail: () => Promise<AuthActionResult>;
  refreshAuthSession: () => Promise<AuthActionResult>;
  linkFederatedProvider: (providerId: FederatedProviderId) => Promise<AuthActionResult>;
  linkGoogleProvider: () => Promise<AuthActionResult>;
  linkEmailPasswordProvider: (email: string, password: string) => Promise<AuthActionResult>;
  unlinkAuthProvider: (providerId: string) => Promise<AuthActionResult>;
  reauthenticateWithFederatedProvider: (providerId: FederatedProviderId) => Promise<AuthActionResult>;
  reauthenticateWithPassword: (password: string) => Promise<AuthActionResult>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
  ensureCloudOrganization: (org: Organization) => Promise<string | null>;
  syncOrganizationToCloud: (org: Organization) => Promise<void>;
  syncPropertyToCloud: (prop: Property, isCreate?: boolean) => Promise<void>;
  deletePropertyFromCloud: (propertyId: string) => Promise<void>;
  syncUnitToCloud: (unit: Unit, isCreate?: boolean) => Promise<void>;
  syncTicketToCloud: (ticket: ServiceTicket, isCreate?: boolean) => Promise<void>;
  updateTicketStatusInCloud: (ticketId: string, status: ServiceTicket['status']) => Promise<void>;
  syncInvoiceToCloud: (invoice: SubscriptionInvoice) => Promise<void>;
  appendAuditLogToCloud: (entry: AuditLog) => Promise<void>;
  seedSamplePortfolioToCloud: (params: {
    properties: Property[];
    units: Unit[];
    tickets: ServiceTicket[];
  }) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

const PENDING_REG_STORAGE_KEY = 'cnt_pending_registration_meta';
const BOOTSTRAPPED_ADMIN_EMAIL = 'christian.ntanda@gmail.com';

function getUserDefaultOrgId(uid: string): string {
  return sanitizeId(`org_${uid.slice(0, 40)}`, 'org');
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  'google.com': 'Google',
  'microsoft.com': 'Microsoft',
  'apple.com': 'Apple',
  'github.com': 'GitHub',
  password: 'Email & Password',
};

export function getProviderLabel(providerId: string): string {
  return PROVIDER_DISPLAY_NAMES[providerId] || providerId;
}

function mapFirebaseAuthError(
  err: unknown,
  providerLabel = 'This authentication provider'
): { code: string; message: string; requiresReauthentication?: boolean } {
  const raw = err as { code?: string; message?: string };
  const code = raw?.code || 'auth/unknown';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return { code, message: 'Sign-in popup was closed before completing authentication.' };
    case 'auth/popup-blocked':
      return {
        code,
        message: 'Your browser blocked the sign-in popup. Allow popups for this site and try again.',
      };
    case 'auth/operation-not-allowed':
      return {
        code,
        message: `${providerLabel} is not yet enabled in the Firebase Console for this project. Enable it under Firebase Console → Authentication → Sign-in method, or continue with Google Sign-In.`,
      };
    case 'auth/email-already-in-use':
      return {
        code,
        message:
          'An account already exists with this email address. Sign in with your existing method and link additional providers from Account Security settings.',
      };
    case 'auth/account-exists-with-different-credential':
      return {
        code,
        message:
          'Account collision protection: an account with this email already exists under another sign-in provider. CNTEstates never merges accounts automatically. Sign in with your original verified provider first, then explicitly link this provider inside Account Security.',
      };
    case 'auth/credential-already-in-use':
      return {
        code,
        message:
          'Account collision protection: these credentials are already linked to another CNTEstates account and cannot be merged without ownership verification.',
      };
    case 'auth/provider-already-linked':
      return { code, message: 'This authentication provider is already linked to your account.' };
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return { code, message: 'Invalid email address or password. Please check your credentials and try again.' };
    case 'auth/weak-password':
      return { code, message: 'Password must be at least 8 characters long.' };
    case 'auth/invalid-email':
      return { code, message: 'Please enter a valid email address.' };
    case 'auth/too-many-requests':
      return { code, message: 'Too many attempts. Please wait a moment and try again.' };
    case 'auth/requires-recent-login':
      return {
        code,
        requiresReauthentication: true,
        message:
          'For your security, please re-verify your identity before modifying linked authentication providers.',
      };
    default:
      return { code, message: raw?.message || 'Authentication failed. Please try again.' };
  }
}

function readPendingRegistrationMeta(): Partial<RegistrationMetadata> | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REG_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<RegistrationMetadata>;
  } catch {
    return null;
  }
}

function writePendingRegistrationMeta(meta: Partial<RegistrationMetadata> | null): void {
  try {
    if (!meta) {
      sessionStorage.removeItem(PENDING_REG_STORAGE_KEY);
    } else {
      sessionStorage.setItem(PENDING_REG_STORAGE_KEY, JSON.stringify(meta));
    }
  } catch {
    // sessionStorage unavailable
  }
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('disconnected');
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [cloudOrgId, setCloudOrgId] = useState<string | null>(null);
  const [cloudSnapshot, setCloudSnapshot] = useState<CloudWorkspaceSnapshot | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [userRoleCategory, setUserRoleCategory] = useState<UserRole>('org_owner');
  const [userPreferredLanguage, setUserPreferredLanguage] = useState<Language>('en');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [backendSessionVerified, setBackendSessionVerified] = useState(false);
  const [sessionRefreshTick, setSessionRefreshTick] = useState(0);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        setLinkedProviders(sanitizeProviderList(user.providerData.map((p) => p.providerId)));
      } else {
        setLinkedProviders([]);
        setCloudOrgId(null);
        setCloudSnapshot(null);
        setCloudHydrated(false);
        setUserRoleCategory('org_owner');
        setUserPreferredLanguage('en');
        setIsPlatformAdmin(false);
        setBackendSessionVerified(false);
        setSyncStatus('disconnected');
      }
    });
    return () => unsubscribe();
  }, []);

  // Bootstrap user profile + isolated organization + RBAC membership and attach guarded listeners
  useEffect(() => {
    if (!authReady || !firebaseUser) {
      return;
    }

    const providersNow = sanitizeProviderList(firebaseUser.providerData.map((p) => p.providerId));
    setLinkedProviders(providersNow);

    if (!firebaseUser.email || !firebaseUser.emailVerified) {
      setSyncStatus('disconnected');
      setCloudHydrated(false);
      return;
    }

    let cancelled = false;
    const unsubscribers: Unsubscribe[] = [];
    const uid = firebaseUser.uid;
    const defaultOrgId = getUserDefaultOrgId(uid);

    const bootstrapAndSubscribe = async () => {
      setSyncStatus('syncing');
      try {
        // 0. Check platform admin registry (/admins/{uid} or bootstrapped owner email)
        let resolvedIsAdmin =
          firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
        if (!resolvedIsAdmin) {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', uid));
            if (adminSnap.exists()) {
              resolvedIsAdmin = true;
            }
          } catch {
            // Non-admin user without admin doc
          }
        }
        if (!cancelled) {
          setIsPlatformAdmin(resolvedIsAdmin);
        }

        const pendingMeta = readPendingRegistrationMeta();
        const chosenCountry = pendingMeta?.operatingCountry || 'South Africa';
        const countryDefaults = getCountryCurrencyDefaults(chosenCountry);
        const chosenCurrency = countryDefaults?.defaultCurrency || 'ZAR';
        const chosenLanguage: Language =
          pendingMeta?.preferredLanguage && ['en', 'fr', 'es', 'pt'].includes(pendingMeta.preferredLanguage)
            ? pendingMeta.preferredLanguage
            : 'en';
        const chosenRole: UserRole =
          pendingMeta?.accountCategory && VALID_ROLE_CATEGORIES.has(pendingMeta.accountCategory)
            ? pendingMeta.accountCategory
            : 'org_owner';

        // 1. Ensure private /users/{uid} exists (strictly isolated to owner or admin)
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        let activeOrgId = defaultOrgId;
        let resolvedRole: UserRole = resolvedIsAdmin ? 'platform_admin' : chosenRole;
        let resolvedLanguage: Language = chosenLanguage;

        if (!userSnap.exists()) {
          const nowIso = new Date().toISOString();
          const profilePayload = buildFirestoreUserProfile({
            uid,
            displayName: pendingMeta?.fullName || firebaseUser.displayName,
            email: firebaseUser.email!,
            photoURL: firebaseUser.photoURL,
            defaultOrganizationId: defaultOrgId,
            preferredCurrency: chosenCurrency,
            preferredLanguage: chosenLanguage,
            accountCategory: chosenRole,
            linkedProviders: providersNow,
            termsAcceptedAt: pendingMeta?.termsAcceptedAt || nowIso,
            privacyAcceptedAt: pendingMeta?.privacyAcceptedAt || nowIso,
          });
          await setDoc(userRef, profilePayload);
        } else {
          const data = userSnap.data();
          if (typeof data.defaultOrganizationId === 'string' && data.defaultOrganizationId) {
            activeOrgId = sanitizeId(data.defaultOrganizationId, 'org');
          }
          if (!resolvedIsAdmin && typeof data.accountCategory === 'string' && VALID_ROLE_CATEGORIES.has(data.accountCategory)) {
            resolvedRole = data.accountCategory as UserRole;
          }
          if (typeof data.preferredLanguage === 'string' && ['en', 'fr', 'es', 'pt'].includes(data.preferredLanguage)) {
            resolvedLanguage = data.preferredLanguage as Language;
          }
          // Keep linkedProviders synced in Firestore if providers changed
          const storedProviders = Array.isArray(data.linkedProviders) ? data.linkedProviders : [];
          if (
            storedProviders.length !== providersNow.length ||
            providersNow.some((p) => !storedProviders.includes(p))
          ) {
            await updateDoc(userRef, {
              linkedProviders: providersNow,
              updatedAt: serverTimestamp(),
            });
          }
        }

        if (!cancelled) {
          setUserRoleCategory(resolvedRole);
          setUserPreferredLanguage(resolvedLanguage);
        }

        // 2. Ensure isolated /organizations/{activeOrgId} exists for this user
        const orgRef = doc(db, 'organizations', activeOrgId);
        const orgSnap = await getDoc(orgRef);
        if (!orgSnap.exists()) {
          const orgDisplayName =
            pendingMeta?.organizationName?.trim() ||
            `${pendingMeta?.fullName || firebaseUser.displayName || 'My'} Estates Portfolio`;
          const initialPlan = pendingMeta?.selectedPlanId || 'free';
          const initialOrg: Organization = {
            id: activeOrgId,
            name: orgDisplayName,
            planId: initialPlan,
            subscriptionStatus: initialPlan === 'free' ? 'free' : 'active',
            operatingCountry: chosenCountry,
            country: chosenCountry,
            currency: chosenCurrency,
            baseCurrency: chosenCurrency,
            billingCurrency: chosenCurrency,
            timezone: countryDefaults?.timezone || 'Africa/Johannesburg',
            monthlySpend: initialPlan === 'free' ? 0 : 25,
            renewalDate: initialPlan === 'free' ? '2099-12-31' : '2027-01-01',
            createdAt: new Date().toISOString(),
          };
          await setDoc(orgRef, buildFirestoreOrganization(initialOrg, activeOrgId, uid, true));

          // Register the user's explicit membership record inside their organization
          const memberRef = doc(db, 'organizations', activeOrgId, 'members', uid);
          await setDoc(
            memberRef,
            buildFirestoreOrganizationMember({
              uid,
              organizationId: activeOrgId,
              role: chosenRole,
              displayName: pendingMeta?.fullName || firebaseUser.displayName || firebaseUser.email!,
            })
          );
        }

        // 2b. Verify Firebase ID token with Express backend & register isolated tenant context
        try {
          const backendRes = await authenticatedFetch('/api/auth/register-tenant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: pendingMeta?.fullName || firebaseUser.displayName || firebaseUser.email,
              organizationName: pendingMeta?.organizationName,
              accountCategory: resolvedRole,
              operatingCountry: chosenCountry,
              preferredLanguage: resolvedLanguage,
              selectedPlanId: pendingMeta?.selectedPlanId || 'free',
              termsAccepted: pendingMeta?.termsAccepted ?? true,
              privacyAccepted: pendingMeta?.privacyAccepted ?? true,
              termsAcceptedAt: pendingMeta?.termsAcceptedAt,
              privacyAcceptedAt: pendingMeta?.privacyAcceptedAt,
            }),
          });
          if (!cancelled && backendRes.ok) {
            setBackendSessionVerified(true);
          }
        } catch {
          // Backend sync best-effort; Firestore remains authoritative
        }

        // Clear one-time registration metadata once provisioned
        if (pendingMeta) {
          writePendingRegistrationMeta(null);
        }

        if (cancelled) return;
        setCloudOrgId(activeOrgId);
        setCloudSnapshot({
          organizationId: activeOrgId,
          organization: null,
          properties: [],
          units: [],
          tickets: [],
          invoices: [],
          auditLogs: [],
        });

        // 3. Guarded real-time listeners (all list queries strictly filter by ownerId == uid)
        unsubscribers.push(
          onSnapshot(
            orgRef,
            (snap) => {
              if (!snap.exists()) return;
              const d = snap.data();
              setCloudSnapshot((prev) => ({
                organizationId: activeOrgId,
                organization: {
                  id: d.id,
                  name: d.name,
                  planId: d.planId,
                  subscriptionStatus: d.subscriptionStatus,
                  operatingCountry: d.operatingCountry,
                  country: d.operatingCountry || 'South Africa',
                  currency: d.baseCurrency || 'ZAR',
                  baseCurrency: d.baseCurrency,
                  billingCurrency: d.billingCurrency,
                  monthlySpend: d.monthlySpend,
                  renewalDate: d.renewalDate,
                  branding: {
                    companyName: d.name || '',
                    companyAddress: d.companyAddress || '',
                    companyEmail: d.companyEmail || '',
                    companyPhone: d.companyPhone || '',
                    companyWebsite: '',
                    taxRegistrationNumber: d.taxRegistrationNumber || '',
                    businessRegistrationNumber: '',
                  },
                },
                properties: prev?.properties || [],
                units: prev?.units || [],
                tickets: prev?.tickets || [],
                invoices: prev?.invoices || [],
                auditLogs: prev?.auditLogs || [],
              }));
              setCloudHydrated(true);
              setSyncStatus('synced');
            },
            (err) => {
              setSyncStatus('error');
              setAuthError(`Organization sync error: ${err.message}`);
              try {
                handleFirestoreError(err, OperationType.GET, `organizations/${activeOrgId}`);
              } catch {
                // Logged with structured diagnostics
              }
            }
          )
        );

        const propertiesPath = `organizations/${activeOrgId}/properties`;
        unsubscribers.push(
          onSnapshot(
            query(collection(db, propertiesPath), where('ownerId', '==', uid)),
            (snap) => {
              const items: Property[] = snap.docs.map((docSnap) => {
                const d = docSnap.data();
                return {
                  id: d.id || docSnap.id,
                  organizationId: d.organizationId || activeOrgId,
                  name: d.name,
                  type: d.type,
                  address: d.address,
                  city: d.city,
                  region: d.region || '',
                  country: d.country,
                  postalCode: d.postalCode || '',
                  ownerName: d.ownerName || firebaseUser.displayName || 'Owner',
                  managerName: d.managerName || firebaseUser.displayName || 'Manager',
                  description: d.description || '',
                  imageUrl: d.imageUrl || '',
                  yearBuilt: d.yearBuilt || 2022,
                  totalBuildings: d.totalBuildings ?? 1,
                  totalUnits: d.totalUnits ?? 0,
                  occupiedUnits: d.occupiedUnits ?? 0,
                  parkingSpaces: d.parkingSpaces ?? 0,
                  amenities: [],
                  status: d.status || 'active',
                };
              });
              setCloudSnapshot((prev) =>
                prev
                  ? { ...prev, properties: items }
                  : {
                      organizationId: activeOrgId,
                      organization: null,
                      properties: items,
                      units: [],
                      tickets: [],
                      invoices: [],
                      auditLogs: [],
                    }
              );
            },
            (err) => {
              try {
                handleFirestoreError(err, OperationType.LIST, propertiesPath);
              } catch {
                // Logged
              }
            }
          )
        );

        const unitsPath = `organizations/${activeOrgId}/units`;
        unsubscribers.push(
          onSnapshot(
            query(collection(db, unitsPath), where('ownerId', '==', uid)),
            (snap) => {
              const items: Unit[] = snap.docs.map((docSnap) => {
                const d = docSnap.data();
                return {
                  id: d.id || docSnap.id,
                  propertyId: d.propertyId,
                  buildingId: d.buildingId || 'bld-1',
                  unitNumber: d.unitNumber,
                  floor: d.floor ?? 1,
                  type: d.type || 'apartment',
                  squareMeters: d.squareMeters ?? 50,
                  monthlyRent: d.monthlyRent ?? 0,
                  currency: d.currency || 'USD',
                  status: d.status || 'vacant',
                  bedrooms: 1,
                  bathrooms: 1,
                  amenities: [],
                  keyAssetIds: [],
                };
              });
              setCloudSnapshot((prev) => (prev ? { ...prev, units: items } : null));
            },
            (err) => {
              try {
                handleFirestoreError(err, OperationType.LIST, unitsPath);
              } catch {
                // Logged
              }
            }
          )
        );

        const ticketsPath = `organizations/${activeOrgId}/tickets`;
        unsubscribers.push(
          onSnapshot(
            query(collection(db, ticketsPath), where('ownerId', '==', uid)),
            (snap) => {
              const items: ServiceTicket[] = snap.docs.map((docSnap) => {
                const d = docSnap.data();
                const createdIso =
                  d.createdAt && typeof d.createdAt.toDate === 'function'
                    ? d.createdAt.toDate().toISOString()
                    : new Date().toISOString();
                return {
                  id: d.id || docSnap.id,
                  code: d.code,
                  propertyId: d.propertyId,
                  propertyName: d.propertyName || 'Property',
                  buildingId: 'bld-1',
                  unitId: 'unit-1',
                  unitNumber: d.unitNumber || 'Common Area',
                  tenantId: uid,
                  tenantName: firebaseUser.displayName || 'Owner',
                  title: d.title,
                  description: d.description || '',
                  category: d.category || 'electrical',
                  priority: d.priority || 'normal',
                  status: d.status || 'new',
                  createdAt: createdIso,
                  slaTargetHours: 48,
                  slaTargetTime: new Date(Date.now() + 86400000 * 2).toISOString(),
                  slaBreached: false,
                  photos: [],
                };
              });
              setCloudSnapshot((prev) => (prev ? { ...prev, tickets: items } : null));
            },
            (err) => {
              try {
                handleFirestoreError(err, OperationType.LIST, ticketsPath);
              } catch {
                // Logged
              }
            }
          )
        );

        const invoicesPath = `organizations/${activeOrgId}/invoices`;
        unsubscribers.push(
          onSnapshot(
            query(collection(db, invoicesPath), where('ownerId', '==', uid)),
            (snap) => {
              const items: Partial<SubscriptionInvoice>[] = snap.docs.map((docSnap) => {
                const d = docSnap.data();
                return {
                  id: d.id || docSnap.id,
                  invoice_id: d.id || docSnap.id,
                  invoice_number: d.invoiceNumber,
                  organization_id: d.organizationId,
                  plan_id: d.planId,
                  plan_name: d.planName,
                  billing_period: d.billingPeriod,
                  currency: d.currency,
                  billing_currency: d.currency,
                  subtotal: d.subtotal,
                  tax: d.tax,
                  discount: d.discount,
                  total: d.total,
                  billed_amount: d.total,
                  amount_paid: d.amountPaid,
                  amount_due: d.amountDue,
                  payment_status: d.paymentStatus,
                  invoice_status: d.invoiceStatus,
                  status: d.invoiceStatus,
                  payment_method: d.paymentMethod,
                  invoice_date: d.invoiceDate,
                  billing_date: d.invoiceDate,
                  due_date: d.dueDate,
                };
              });
              setCloudSnapshot((prev) => (prev ? { ...prev, invoices: items } : null));
            },
            (err) => {
              try {
                handleFirestoreError(err, OperationType.LIST, invoicesPath);
              } catch {
                // Logged
              }
            }
          )
        );

        const auditLogsPath = `organizations/${activeOrgId}/auditLogs`;
        unsubscribers.push(
          onSnapshot(
            query(collection(db, auditLogsPath), where('ownerId', '==', uid)),
            (snap) => {
              const items: AuditLog[] = snap.docs.map((docSnap) => {
                const d = docSnap.data();
                const ts =
                  d.createdAt && typeof d.createdAt.toDate === 'function'
                    ? d.createdAt.toDate().toISOString()
                    : new Date().toISOString();
                return {
                  id: d.id || docSnap.id,
                  timestamp: ts,
                  userName: d.actorName,
                  userRole: d.actorRole,
                  action: d.action,
                  entityType: d.entityType,
                  entityId: d.entityId,
                  newValue: d.details,
                  ipAddress: 'cloud-firestore',
                };
              });
              items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
              setCloudSnapshot((prev) => (prev ? { ...prev, auditLogs: items } : null));
            },
            (err) => {
              try {
                handleFirestoreError(err, OperationType.LIST, auditLogsPath);
              } catch {
                // Logged
              }
            }
          )
        );
      } catch (err) {
        if (!cancelled) {
          setSyncStatus('error');
          setAuthError(
            err instanceof Error ? err.message : 'Unable to synchronize Firebase workspace.'
          );
          try {
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
          } catch {
            // Structured diagnostic emitted to console
          }
        }
      }
    };

    void bootstrapAndSubscribe();

    return () => {
      cancelled = true;
      unsubscribers.forEach((u) => u());
    };
  }, [authReady, firebaseUser, sessionRefreshTick]);

  const signInWithFederatedProvider = useCallback(
    async (
      providerId: FederatedProviderId,
      registrationMeta?: Partial<RegistrationMetadata>
    ): Promise<AuthActionResult> => {
      setAuthLoading(true);
      setAuthError(null);
      const label = getProviderLabel(providerId);
      if (registrationMeta) {
        const nowIso = new Date().toISOString();
        writePendingRegistrationMeta({
          ...registrationMeta,
          termsAcceptedAt: registrationMeta.termsAccepted ? nowIso : undefined,
          privacyAcceptedAt: registrationMeta.privacyAccepted ? nowIso : undefined,
        });
      }
      try {
        const provider = getFederatedAuthProvider(providerId);
        await signInWithPopup(auth, provider);
        return { success: true };
      } catch (err) {
        writePendingRegistrationMeta(null);
        const mapped = mapFirebaseAuthError(err, label);
        const rawErr = err as { customData?: { email?: string } };
        if (mapped.code !== 'auth/popup-closed-by-user') {
          setAuthError(mapped.message);
        }
        if (
          mapped.code === 'auth/account-exists-with-different-credential' ||
          mapped.code === 'auth/credential-already-in-use'
        ) {
          return {
            success: false,
            code: mapped.code,
            message: mapped.message,
            collision: {
              email: rawErr?.customData?.email,
              attemptedProvider: label,
              message: mapped.message,
            },
          };
        }
        return { success: false, code: mapped.code, message: mapped.message };
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  const signInWithGoogle = useCallback(
    async (registrationMeta?: Partial<RegistrationMetadata>): Promise<AuthActionResult> => {
      return signInWithFederatedProvider('google.com', registrationMeta);
    },
    [signInWithFederatedProvider]
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      setAuthLoading(true);
      setAuthError(null);
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!cred.user.emailVerified) {
          return {
            success: true,
            requiresEmailVerification: true,
            message: 'Please verify your email address before accessing cloud workspace data.',
          };
        }
        return { success: true };
      } catch (err) {
        const mapped = mapFirebaseAuthError(err, 'Email & Password');
        setAuthError(mapped.message);
        return { success: false, code: mapped.code, message: mapped.message };
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  const signUpWithEmail = useCallback(async (params: EmailSignUpParams): Promise<AuthActionResult> => {
    setAuthLoading(true);
    setAuthError(null);

    if (!params.termsAccepted || !params.privacyAccepted) {
      setAuthLoading(false);
      const msg = 'You must accept both the Terms and Conditions and the Privacy Policy to create an account.';
      setAuthError(msg);
      return { success: false, code: 'validation/legal-consent-required', message: msg };
    }

    const cleanEmail = params.email.trim();
    const nowIso = new Date().toISOString();

    // Check whether email is already associated with an existing account (collision guard)
    try {
      const existingMethods = await fetchSignInMethodsForEmail(auth, cleanEmail);
      if (existingMethods && existingMethods.length > 0) {
        const providersText = existingMethods.map(getProviderLabel).join(', ');
        const msg = `An account with ${cleanEmail} already exists via ${providersText}. Sign in with your existing method and link Email & Password inside Account Security to prevent duplicate accounts.`;
        setAuthError(msg);
        setAuthLoading(false);
        return {
          success: false,
          code: 'auth/email-already-in-use',
          message: msg,
          collision: {
            email: cleanEmail,
            attemptedProvider: 'Email & Password',
            message: msg,
          },
        };
      }
    } catch {
      // Email enumeration protection may disable fetchSignInMethodsForEmail; Firebase createUser enforces uniqueness authoritatively
    }

    writePendingRegistrationMeta({
      fullName: params.fullName,
      organizationName: params.organizationName,
      accountCategory: params.accountCategory,
      operatingCountry: params.operatingCountry,
      preferredLanguage: params.preferredLanguage || 'en',
      selectedPlanId: params.selectedPlanId,
      termsAccepted: true,
      privacyAccepted: true,
      termsAcceptedAt: nowIso,
      privacyAcceptedAt: nowIso,
    });

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
      if (params.fullName.trim()) {
        await updateProfile(cred.user, { displayName: params.fullName.trim() });
      }
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // Verification email best-effort
      }
      return {
        success: true,
        requiresEmailVerification: !cred.user.emailVerified,
        message: 'Account created! We sent a verification link to your email address.',
      };
    } catch (err) {
      writePendingRegistrationMeta(null);
      const mapped = mapFirebaseAuthError(err, 'Email & Password');
      setAuthError(mapped.message);
      return { success: false, code: mapped.code, message: mapped.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthActionResult> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return {
        success: true,
        message: 'Password reset instructions have been sent to your email address.',
      };
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      setAuthError(mapped.message);
      return { success: false, code: mapped.code, message: mapped.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const resendVerificationEmail = useCallback(async (): Promise<AuthActionResult> => {
    if (!auth.currentUser) {
      return { success: false, message: 'No active session found.' };
    }
    setAuthLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      return { success: true, message: 'Verification email resent. Please check your inbox.' };
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      setAuthError(mapped.message);
      return { success: false, code: mapped.code, message: mapped.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const refreshAuthSession = useCallback(async (): Promise<AuthActionResult> => {
    if (!auth.currentUser) {
      return { success: false, message: 'No active session found.' };
    }
    setAuthLoading(true);
    try {
      await reload(auth.currentUser);
      await auth.currentUser.getIdToken(true);
      const refreshed = auth.currentUser;
      setFirebaseUser(refreshed);
      setLinkedProviders(sanitizeProviderList(refreshed.providerData.map((p) => p.providerId)));
      setSessionRefreshTick((t) => t + 1);
      if (refreshed.emailVerified) {
        return { success: true, message: 'Email verified! Loading your isolated workspace.' };
      }
      return {
        success: false,
        requiresEmailVerification: true,
        message: 'Your email is not verified yet. Please click the verification link in your inbox.',
      };
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      return { success: false, code: mapped.code, message: mapped.message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const syncLinkedProvidersToFirestore = useCallback(async (user: User) => {
    const updatedList = sanitizeProviderList(user.providerData.map((p) => p.providerId));
    setLinkedProviders(updatedList);
    if (!user.emailVerified) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        linkedProviders: updatedList,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } catch {
        // Logged
      }
    }
  }, []);

  const linkFederatedProvider = useCallback(
    async (providerId: FederatedProviderId): Promise<AuthActionResult> => {
      if (!auth.currentUser) {
        return { success: false, message: 'Sign in first to link an authentication provider.' };
      }
      const label = getProviderLabel(providerId);
      setAuthLoading(true);
      setAuthError(null);
      try {
        const provider = getFederatedAuthProvider(providerId);
        const result = await linkWithPopup(auth.currentUser, provider);
        await reload(result.user);
        await result.user.getIdToken(true);
        setFirebaseUser(auth.currentUser);
        await syncLinkedProvidersToFirestore(result.user);
        setSessionRefreshTick((t) => t + 1);
        return {
          success: true,
          message: `${label} has been linked to your existing CNTEstates account. Your UID, organization, and permissions were preserved.`,
        };
      } catch (err) {
        const mapped = mapFirebaseAuthError(err, label);
        setAuthError(mapped.message);
        const rawErr = err as { customData?: { email?: string } };
        if (
          mapped.code === 'auth/credential-already-in-use' ||
          mapped.code === 'auth/account-exists-with-different-credential'
        ) {
          return {
            success: false,
            code: mapped.code,
            message: mapped.message,
            collision: {
              email: rawErr?.customData?.email,
              attemptedProvider: label,
              message: mapped.message,
            },
          };
        }
        return {
          success: false,
          code: mapped.code,
          requiresReauthentication: mapped.requiresReauthentication,
          message: mapped.message,
        };
      } finally {
        setAuthLoading(false);
      }
    },
    [syncLinkedProvidersToFirestore]
  );

  const linkGoogleProvider = useCallback(async (): Promise<AuthActionResult> => {
    return linkFederatedProvider('google.com');
  }, [linkFederatedProvider]);

  const linkEmailPasswordProvider = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!auth.currentUser) {
        return { success: false, message: 'Sign in first to link Email & Password.' };
      }
      setAuthLoading(true);
      setAuthError(null);
      try {
        const credential = EmailAuthProvider.credential(email.trim(), password);
        const result = await linkWithCredential(auth.currentUser, credential);
        await reload(result.user);
        setFirebaseUser(auth.currentUser);
        await syncLinkedProvidersToFirestore(result.user);
        return {
          success: true,
          message: 'Email & Password sign-in linked to your existing CNTEstates account.',
        };
      } catch (err) {
        const mapped = mapFirebaseAuthError(err, 'Email & Password');
        setAuthError(mapped.message);
        return {
          success: false,
          code: mapped.code,
          requiresReauthentication: mapped.requiresReauthentication,
          message: mapped.message,
        };
      } finally {
        setAuthLoading(false);
      }
    },
    [syncLinkedProvidersToFirestore]
  );

  const unlinkAuthProvider = useCallback(
    async (providerId: string): Promise<AuthActionResult> => {
      if (!auth.currentUser) {
        return { success: false, message: 'Sign in first to manage linked providers.' };
      }
      if (auth.currentUser.providerData.length <= 1) {
        return {
          success: false,
          message: 'You must keep at least one active sign-in method linked to your account.',
        };
      }
      const label = getProviderLabel(providerId);
      setAuthLoading(true);
      setAuthError(null);
      try {
        const updatedUser = await unlink(auth.currentUser, providerId);
        await reload(updatedUser);
        setFirebaseUser(auth.currentUser);
        await syncLinkedProvidersToFirestore(updatedUser);
        return { success: true, message: `${label} unlinked from your CNTEstates account.` };
      } catch (err) {
        const mapped = mapFirebaseAuthError(err, label);
        setAuthError(mapped.message);
        return {
          success: false,
          code: mapped.code,
          requiresReauthentication: mapped.requiresReauthentication,
          message: mapped.message,
        };
      } finally {
        setAuthLoading(false);
      }
    },
    [syncLinkedProvidersToFirestore]
  );

  const reauthenticateWithFederatedProvider = useCallback(
    async (providerId: FederatedProviderId): Promise<AuthActionResult> => {
      if (!auth.currentUser) {
        return { success: false, message: 'No active session to verify.' };
      }
      const label = getProviderLabel(providerId);
      setAuthLoading(true);
      setAuthError(null);
      try {
        const provider = getFederatedAuthProvider(providerId);
        await reauthenticateWithPopup(auth.currentUser, provider);
        await auth.currentUser.getIdToken(true);
        return {
          success: true,
          message: `Identity re-verified via ${label}. You may now complete sensitive account security changes.`,
        };
      } catch (err) {
        const mapped = mapFirebaseAuthError(err, label);
        setAuthError(mapped.message);
        return { success: false, code: mapped.code, message: mapped.message };
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  const reauthenticateWithPassword = useCallback(
    async (password: string): Promise<AuthActionResult> => {
      if (!auth.currentUser || !auth.currentUser.email) {
        return { success: false, message: 'No active email session to verify.' };
      }
      setAuthLoading(true);
      setAuthError(null);
      try {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, password);
        await reauthenticateWithCredential(auth.currentUser, cred);
        await auth.currentUser.getIdToken(true);
        return {
          success: true,
          message: 'Identity re-verified with your password. You may now proceed with sensitive account updates.',
        };
      } catch (err) {
        const mapped = mapFirebaseAuthError(err, 'Email & Password');
        setAuthError(mapped.message);
        return { success: false, code: mapped.code, message: mapped.message };
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  const signOutUser = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    writePendingRegistrationMeta(null);
    try {
      await signOut(auth);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-Out failed.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const ensureCloudOrganization = useCallback(
    async (org: Organization): Promise<string | null> => {
      if (!firebaseUser || !firebaseUser.emailVerified) return null;
      const orgId = cloudOrgId || getUserDefaultOrgId(firebaseUser.uid);
      const path = `organizations/${orgId}`;
      try {
        const ref = doc(db, 'organizations', orgId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, buildFirestoreOrganization(org, orgId, firebaseUser.uid, true));
        }
        return orgId;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    },
    [firebaseUser, cloudOrgId]
  );

  const syncOrganizationToCloud = useCallback(
    async (org: Organization) => {
      if (!firebaseUser || !firebaseUser.emailVerified || !cloudOrgId) return;
      const path = `organizations/${cloudOrgId}`;
      try {
        setSyncStatus('syncing');
        const ref = doc(db, 'organizations', cloudOrgId);
        await updateDoc(ref, buildFirestoreOrganization(org, cloudOrgId, firebaseUser.uid, false));
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [firebaseUser, cloudOrgId]
  );

  const syncPropertyToCloud = useCallback(
    async (prop: Property, isCreate = true) => {
      if (!firebaseUser || !firebaseUser.emailVerified || !cloudOrgId) return;
      const propId = sanitizeId(prop.id, 'prop');
      const path = `organizations/${cloudOrgId}/properties/${propId}`;
      try {
        setSyncStatus('syncing');
        const ref = doc(db, 'organizations', cloudOrgId, 'properties', propId);
        if (isCreate) {
          await setDoc(ref, buildFirestoreProperty({ ...prop, id: propId }, cloudOrgId, firebaseUser.uid, true));
        } else {
          await updateDoc(ref, buildFirestoreProperty({ ...prop, id: propId }, cloudOrgId, firebaseUser.uid, false));
        }
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
        handleFirestoreError(err, isCreate ? OperationType.CREATE : OperationType.UPDATE, path);
      }
    },
    [firebaseUser, cloudOrgId]
  );

  const deletePropertyFromCloud = useCallback(
    async (propertyId: string) => {
      if (!firebaseUser || !firebaseUser.emailVerified || !cloudOrgId) return;
      const propId = sanitizeId(propertyId, 'prop');
      const path = `organizations/${cloudOrgId}/properties/${propId}`;
      try {
        setSyncStatus('syncing');
        await deleteDoc(doc(db, 'organizations', cloudOrgId, 'properties', propId));
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [firebaseUser, cloudOrgId]
  );

  const syncUnitToCloud = useCallback(
    async (unit: Unit, isCreate = true) => {
      if (!firebaseUser || !firebaseUser.emailVerified || !cloudOrgId) return;
      const unitId = sanitizeId(unit.id, 'unit');
      const path = `organizations/${cloudOrgId}/units/${unitId}`;
      try {
        setSyncStatus('syncing');
        const ref = doc(db, 'organizations', cloudOrgId, 'units', unitId);
        if (isCreate) {
          await setDoc(ref, buildFirestoreUnit({ ...unit, id: unitId }, cloudOrgId, firebaseUser.uid, true));
        } else {
          await updateDoc(ref, buildFirestoreUnit({ ...unit, id: unitId }, cloudOrgId, firebaseUser.uid, false));
        }
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
        handleFirestoreError(err, isCreate ? OperationType.CREATE : OperationType.UPDATE, path);
      }
    },
    [firebaseUser, cloudOrgId]
  );

  const syncTicketToCloud = useCallback(
    async (ticket: ServiceTicket, isCreate = true) => {
      if (!firebaseUser || !firebaseUser.emailVerified || !cloudOrgId) return;
      const ticketId = sanitizeId(ticket.id, 'tkt');
      const path = `organizations/${cloudOrgId}/tickets/${ticketId}`;
      try {
        setSyncStatus('syncing');
        const ref = doc(db, 'organizations', cloudOrgId, 'tickets', ticketId);
        if (isCreate) {
          await setDoc(ref, buildFirestoreTicket({ ...ticket, id: ticketId }, cloudOrgId, firebaseUser.uid, true));
        } else {
          await updateDoc(ref, buildFirestoreTicket({ ...ticket, id: ticketId }, cloudOrgId, firebaseUser.uid, false));
        }
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
        handleFirestoreError(err, isCreate ? OperationType.CREATE : OperationType.UPDATE, path);
      }
    },
    [firebaseUser, cloudOrgId]
  );

  const updateTicketStatusInCloud = useCallback(
    async (ticketId: string, status: ServiceTicket['status']) => {
      if (!firebaseUser || !firebaseUser.emailVerified || !cloudOrgId) return;
      const cleanId = sanitizeId(ticketId, 'tkt');
      const path = `organizations/${cloudOrgId}/tickets/${cleanId}`;
      try {
        setSyncStatus('syncing');
        const ref = doc(db, 'organizations', cloudOrgId, 'tickets', cleanId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setSyncStatus('synced');
          return;
        }
        await updateDoc(ref, {
          status,
          updatedAt: serverTimestamp(),
        });
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [firebaseUser, cloudOrgId]
  );

  const syncInvoiceToCloud = useCallback(
    async (invoice: SubscriptionInvoice) => {
      if (!firebaseUser || !firebaseUser.emailVerified || !cloudOrgId) return;
      const invId = sanitizeId(invoice.invoice_id || invoice.id || `sinv_${Date.now()}`, 'sinv');
      const path = `organizations/${cloudOrgId}/invoices/${invId}`;
      try {
        setSyncStatus('syncing');
        const ref = doc(db, 'organizations', cloudOrgId, 'invoices', invId);
        await setDoc(ref, buildFirestoreInvoice(invoice, cloudOrgId, firebaseUser.uid));
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [firebaseUser, cloudOrgId]
  );

  const appendAuditLogToCloud = useCallback(
    async (entry: AuditLog) => {
      if (!firebaseUser || !firebaseUser.emailVerified || !cloudOrgId) return;
      const logId = sanitizeId(entry.id, 'aud');
      const path = `organizations/${cloudOrgId}/auditLogs/${logId}`;
      try {
        const ref = doc(db, 'organizations', cloudOrgId, 'auditLogs', logId);
        await setDoc(ref, buildFirestoreAuditLog({ ...entry, id: logId }, cloudOrgId, firebaseUser.uid, firebaseUser.uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [firebaseUser, cloudOrgId]
  );

  const seedSamplePortfolioToCloud = useCallback(
    async (params: { properties: Property[]; units: Unit[]; tickets: ServiceTicket[] }) => {
      if (!firebaseUser || !firebaseUser.emailVerified || !cloudOrgId) return;
      setSyncStatus('syncing');
      try {
        for (const prop of params.properties) {
          const propId = sanitizeId(`${cloudOrgId}_${prop.id}`, 'prop');
          await setDoc(
            doc(db, 'organizations', cloudOrgId, 'properties', propId),
            buildFirestoreProperty({ ...prop, id: propId, organizationId: cloudOrgId }, cloudOrgId, firebaseUser.uid, true)
          );
        }
        for (const unit of params.units) {
          const unitId = sanitizeId(`${cloudOrgId}_${unit.id}`, 'unit');
          const propId = sanitizeId(`${cloudOrgId}_${unit.propertyId}`, 'prop');
          await setDoc(
            doc(db, 'organizations', cloudOrgId, 'units', unitId),
            buildFirestoreUnit({ ...unit, id: unitId, propertyId: propId }, cloudOrgId, firebaseUser.uid, true)
          );
        }
        for (const ticket of params.tickets) {
          const ticketId = sanitizeId(`${cloudOrgId}_${ticket.id}`, 'tkt');
          const propId = sanitizeId(`${cloudOrgId}_${ticket.propertyId}`, 'prop');
          await setDoc(
            doc(db, 'organizations', cloudOrgId, 'tickets', ticketId),
            buildFirestoreTicket({ ...ticket, id: ticketId, propertyId: propId }, cloudOrgId, firebaseUser.uid, true)
          );
        }
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
        handleFirestoreError(err, OperationType.WRITE, `organizations/${cloudOrgId}`);
      }
    },
    [firebaseUser, cloudOrgId]
  );

  return (
    <FirebaseContext.Provider
      value={{
        firebaseUser,
        authReady,
        authLoading,
        authError,
        syncStatus,
        cloudHydrated,
        cloudOrgId,
        cloudSnapshot,
        linkedProviders,
        userRoleCategory,
        userPreferredLanguage,
        isPlatformAdmin,
        backendSessionVerified,
        signInWithFederatedProvider,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        refreshAuthSession,
        linkFederatedProvider,
        linkGoogleProvider,
        linkEmailPasswordProvider,
        unlinkAuthProvider,
        reauthenticateWithFederatedProvider,
        reauthenticateWithPassword,
        signOutUser,
        clearAuthError,
        ensureCloudOrganization,
        syncOrganizationToCloud,
        syncPropertyToCloud,
        deletePropertyFromCloud,
        syncUnitToCloud,
        syncTicketToCloud,
        updateTicketStatusInCloud,
        syncInvoiceToCloud,
        appendAuditLogToCloud,
        seedSamplePortfolioToCloud,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextType => {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return ctx;
};
