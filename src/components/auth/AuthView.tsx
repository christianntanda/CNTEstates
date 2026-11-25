import React, { useState, useEffect } from 'react';
import {
  Building2,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Briefcase,
  Globe2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  ArrowRight,
  Languages,
  ShieldAlert,
} from 'lucide-react';
import { useFirebase, type AccountCollisionAlert } from '../../context/FirebaseContext';
import type { FederatedProviderId } from '../../firebase';
import { countryCurrencyCatalogue } from '../../services/currencyService';
import type { Language, UserRole } from '../../types';

const HERO_IMAGE = '/src/assets/images/hero_cntestates_architecture_1795606654189.jpg';

export type AuthMode = 'signin' | 'signup' | 'reset';

interface AuthViewProps {
  initialMode?: AuthMode;
  selectedPlanId?: string;
  redirectNotice?: string;
  onModeChange?: (nextMode: AuthMode) => void;
  onBackToHome: () => void;
  onOpenLegal?: (doc: 'terms' | 'privacy') => void;
  onAuthenticated: () => void;
}

const ACCOUNT_CATEGORIES: { value: UserRole; label: string; summary: string }[] = [
  {
    value: 'org_owner',
    label: 'Organization Owner / Landlord',
    summary: 'Full portfolio, billing, subscription, and tenant administration',
  },
  {
    value: 'property_manager',
    label: 'Property Manager',
    summary: 'Manage buildings, leases, maintenance SLAs, and owner reports',
  },
  {
    value: 'building_manager',
    label: 'Building / Facility Manager',
    summary: 'Oversee building assets, preventive maintenance, and inspections',
  },
  {
    value: 'finance_manager',
    label: 'Finance Manager',
    summary: 'Rent collection, invoicing, arrears tracking, and trust accounting',
  },
  {
    value: 'tenant',
    label: 'Tenant / Resident',
    summary: 'Dedicated resident portal for leases, rent receipts, and service requests',
  },
  {
    value: 'contractor',
    label: 'Contractor / Vendor',
    summary: 'Receive RFQ invitations, submit bids, and complete assigned work orders',
  },
  {
    value: 'technician',
    label: 'Field Technician',
    summary: 'Mobile work-order execution, inspection checklists, and repair logs',
  },
  {
    value: 'auditor',
    label: 'Compliance Auditor',
    summary: 'Read-only access to compliance certificates, financial ledgers, and audit trails',
  },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English (EN)' },
  { value: 'fr', label: 'Français (FR)' },
  { value: 'es', label: 'Español (ES)' },
  { value: 'pt', label: 'Português (PT)' },
];

const FEDERATED_PROVIDERS: {
  id: FederatedProviderId;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'google.com', label: 'Google', shortLabel: 'Google' },
  { id: 'microsoft.com', label: 'Microsoft', shortLabel: 'Microsoft' },
  { id: 'apple.com', label: 'Apple', shortLabel: 'Apple' },
  { id: 'github.com', label: 'GitHub', shortLabel: 'GitHub' },
];

function ProviderIcon({ providerId }: { providerId: FederatedProviderId }) {
  if (providerId === 'google.com') {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
        />
        <path
          fill="#34A853"
          d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
        />
        <path
          fill="#EA4335"
          d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
        />
      </svg>
    );
  }
  if (providerId === 'microsoft.com') {
    return (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21" aria-hidden="true">
        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
      </svg>
    );
  }
  if (providerId === 'apple.com') {
    return (
      <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .5C5.648.5.5 5.648.5 12c0 5.084 3.292 9.397 7.865 10.918.575.106.785-.25.785-.556 0-.274-.01-1-.015-1.962-3.199.695-3.874-1.542-3.874-1.542-.523-1.328-1.277-1.681-1.277-1.681-1.044-.714.079-.699.079-.699 1.154.081 1.762 1.185 1.762 1.185 1.026 1.758 2.692 1.25 3.348.956.104-.743.402-1.25.731-1.538-2.553-.29-5.238-1.277-5.238-5.682 0-1.255.448-2.281 1.184-3.085-.118-.29-.513-1.459.112-3.042 0 0 .966-.309 3.164 1.179a11.01 11.01 0 012.881-.387c.977.004 1.962.132 2.881.387 2.197-1.488 3.162-1.179 3.162-1.179.627 1.583.232 2.752.114 3.042.737.804 1.183 1.83 1.183 3.085 0 4.416-2.689 5.388-5.252 5.673.413.356.781 1.058.781 2.132 0 1.539-.014 2.78-.014 3.158 0 .309.208.668.792.555C20.212 21.393 23.5 17.082 23.5 12 23.5 5.648 18.352.5 12 .5z" />
    </svg>
  );
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'signin',
  selectedPlanId,
  redirectNotice,
  onModeChange,
  onBackToHome,
  onOpenLegal,
  onAuthenticated,
}) => {
  const {
    firebaseUser,
    authLoading,
    authError,
    clearAuthError,
    signInWithFederatedProvider,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    resendVerificationEmail,
    refreshAuthSession,
    linkGoogleProvider,
    signOutUser,
  } = useFirebase();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [accountCategory, setAccountCategory] = useState<UserRole>('org_owner');
  const [operatingCountry, setOperatingCountry] = useState('South Africa');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>('en');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [collisionAlert, setCollisionAlert] = useState<AccountCollisionAlert | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setLocalError(null);
    setInfoMessage(null);
    setCollisionAlert(null);
    clearAuthError();
    if (onModeChange) {
      onModeChange(next);
    }
  };

  const handleFederatedAction = async (providerId: FederatedProviderId) => {
    setLocalError(null);
    setInfoMessage(null);
    setCollisionAlert(null);

    if (mode === 'signup' && (!termsAccepted || !privacyAccepted)) {
      setLocalError(
        'Please accept both the Terms and Conditions and Privacy Policy before registering your CNTEstates account.'
      );
      return;
    }

    const meta =
      mode === 'signup'
        ? {
            fullName: fullName.trim() || undefined,
            organizationName: organizationName.trim() || undefined,
            accountCategory,
            operatingCountry,
            preferredLanguage,
            selectedPlanId,
            termsAccepted,
            privacyAccepted,
          }
        : undefined;

    const res = await signInWithFederatedProvider(providerId, meta);
    if (res.success) {
      onAuthenticated();
    } else if (res.collision) {
      setCollisionAlert(res.collision);
    } else if (res.message && res.code !== 'auth/popup-closed-by-user') {
      setLocalError(res.message);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setInfoMessage(null);
    setCollisionAlert(null);
    if (!email.trim() || !password) {
      setLocalError('Enter both your email address and password.');
      return;
    }
    const res = await signInWithEmail(email, password);
    if (res.success && !res.requiresEmailVerification) {
      onAuthenticated();
    } else if (res.requiresEmailVerification) {
      setInfoMessage(res.message || 'Verify your email address to unlock your workspace.');
    } else if (res.message) {
      setLocalError(res.message);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setInfoMessage(null);
    setCollisionAlert(null);

    if (!fullName.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!organizationName.trim()) {
      setLocalError('Please enter your organization or company name.');
      return;
    }
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setLocalError('Please enter a valid work or personal email address.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      setLocalError('You must accept both the Terms and Conditions and Privacy Policy to register.');
      return;
    }

    const res = await signUpWithEmail({
      fullName: fullName.trim(),
      organizationName: organizationName.trim(),
      accountCategory,
      operatingCountry,
      preferredLanguage,
      selectedPlanId,
      termsAccepted,
      privacyAccepted,
      email: email.trim(),
      password,
    });

    if (res.success && !res.requiresEmailVerification) {
      onAuthenticated();
    } else if (res.requiresEmailVerification) {
      setInfoMessage(res.message || 'Verification email sent. Please verify your email to continue.');
    } else if (res.collision) {
      setCollisionAlert(res.collision);
    } else if (res.message) {
      setLocalError(res.message);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setInfoMessage(null);
    if (!email.trim()) {
      setLocalError('Enter the email address associated with your CNTEstates account.');
      return;
    }
    const res = await sendPasswordReset(email);
    if (res.success) {
      setInfoMessage(res.message || 'Password reset email sent.');
    } else if (res.message) {
      setLocalError(res.message);
    }
  };

  // Unverified Email Gate (preserves strict Firestore email_verified == true requirement)
  if (firebaseUser && !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="text-xs text-slate-400 hover:text-red-300 transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="space-y-2">
            <div className="w-11 h-11 rounded-xl bg-amber-950/60 border border-amber-700/50 text-amber-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Verify your email address</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              CNTEstates enforces verified identity before provisioning your isolated Firestore tenant. We sent a verification link to{' '}
              <span className="text-slate-200 font-medium">{firebaseUser.email}</span>.
            </p>
          </div>

          {(infoMessage || localError || authError) && (
            <div
              className={`rounded-lg p-3 text-xs border ${
                infoMessage
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                  : 'bg-red-950/50 border-red-800 text-red-200'
              }`}
            >
              {infoMessage || localError || authError}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={authLoading}
              onClick={async () => {
                setLocalError(null);
                setInfoMessage(null);
                const res = await refreshAuthSession();
                if (res.success) {
                  onAuthenticated();
                } else if (res.message) {
                  setLocalError(res.message);
                }
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${authLoading ? 'animate-spin' : ''}`} />
              <span>I&apos;ve Verified My Email — Continue</span>
            </button>

            <button
              type="button"
              disabled={authLoading}
              onClick={async () => {
                setLocalError(null);
                setInfoMessage(null);
                const res = await resendVerificationEmail();
                if (res.success) {
                  setInfoMessage(res.message || 'Verification email resent.');
                } else if (res.message) {
                  setLocalError(res.message);
                }
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Resend Verification Email
            </button>

            <button
              type="button"
              disabled={authLoading}
              onClick={async () => {
                setLocalError(null);
                setInfoMessage(null);
                const res = await linkGoogleProvider();
                if (res.success) {
                  onAuthenticated();
                } else if (res.message) {
                  setLocalError(res.message);
                }
              }}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-700 hover:border-emerald-600 text-slate-200 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Verify Instantly by Linking Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 grid grid-cols-1 lg:grid-cols-12">
      {/* Left Architectural Brand Column */}
      <div className="hidden lg:flex lg:col-span-5 relative overflow-hidden bg-slate-900 border-r border-slate-800 flex-col justify-between p-10">
        {!imgFailed && (
          <img
            src={HERO_IMAGE}
            alt="Modern residential and commercial property portfolio"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/45" />

        <div className="relative z-10 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white tracking-tight">CNTEstates</div>
              <div className="text-[11px] text-emerald-400 font-medium">Property Intelligence Platform</div>
            </div>
          </button>

          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <h2 className="text-3xl font-bold text-white leading-tight tracking-tight">
            {mode === 'signup'
              ? 'Launch your isolated property management workspace.'
              : mode === 'reset'
              ? 'Recover access to your CNTEstates account.'
              : 'Welcome back to your estate command center.'}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Every CNTEstates organization operates inside strict cryptographic account boundaries—separating your properties, leases, rent collection, invoices, and maintenance records from all other tenants.
          </p>

          <div className="space-y-3 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Firebase Authentication with Google, Microsoft, Apple, GitHub, and Email/Password</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Strict multi-tenant isolation enforced across database rules, APIs, and UI</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Globe2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Multi-currency invoicing, statutory tax awareness, and 4 languages</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} CNTEstates. Enterprise Real Estate SaaS.
        </div>
      </div>

      {/* Right Authentication Form Column */}
      <div className="lg:col-span-7 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="w-full max-w-lg mx-auto space-y-6">
          {/* Mobile top bar */}
          <div className="flex lg:hidden items-center justify-between pb-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-2 text-white font-bold"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <span>CNTEstates</span>
            </button>
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
          </div>

          {/* Mode Tabs */}
          {mode !== 'reset' && (
            <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  mode === 'signin'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  mode === 'signup'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign Up / Register
              </button>
            </div>
          )}

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {mode === 'signin'
                ? 'Sign in to CNTEstates'
                : mode === 'signup'
                ? 'Create your CNTEstates account'
                : 'Reset your password'}
            </h1>
            <p className="text-sm text-slate-400">
              {mode === 'signin'
                ? 'Authenticate with your verified Firebase identity to access your authorized role dashboard.'
                : mode === 'signup'
                ? selectedPlanId
                  ? `Register your isolated tenant workspace — selected tier: ${selectedPlanId.toUpperCase()}.`
                  : 'Provision your isolated tenant account with role-based access control.'
                : 'Enter your registered email address and we will send a secure password recovery link.'}
            </p>
          </div>

          {redirectNotice && !localError && !authError && !collisionAlert && (
            <div className="rounded-lg bg-slate-900 border border-slate-700 p-3.5 text-xs text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{redirectNotice}</span>
            </div>
          )}

          {/* Account Collision Protection Banner */}
          {collisionAlert && (
            <div className="rounded-lg bg-amber-950/60 border border-amber-700/70 p-4 text-xs text-amber-100 space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-300">
                    Account Collision Protection Triggered ({collisionAlert.attemptedProvider})
                  </p>
                  <p className="leading-relaxed text-amber-100/90">{collisionAlert.message}</p>
                </div>
              </div>
              <div className="pl-6">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold underline"
                >
                  Switch to Sign In with your original provider
                </button>
              </div>
            </div>
          )}

          {(localError || authError) && !collisionAlert && (
            <div className="rounded-lg bg-red-950/60 border border-red-800/80 p-3.5 text-xs text-red-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {infoMessage && (
            <div className="rounded-lg bg-emerald-950/60 border border-emerald-800/80 p-3.5 text-xs text-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Multi-Provider Federated Buttons (Google, Microsoft, Apple, GitHub) */}
          {mode !== 'reset' && (
            <div className="space-y-3">
              {/* Primary Google CTA */}
              <button
                type="button"
                disabled={authLoading}
                onClick={() => void handleFederatedAction('google.com')}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
              >
                <ProviderIcon providerId="google.com" />
                <span>
                  {mode === 'signup' ? 'Continue with Google' : 'Sign in with Google'}
                </span>
              </button>

              {/* Secondary Federated Providers Row: Microsoft, Apple, GitHub */}
              <div className="grid grid-cols-3 gap-2">
                {FEDERATED_PROVIDERS.filter((p) => p.id !== 'google.com').map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    disabled={authLoading}
                    onClick={() => void handleFederatedAction(provider.id)}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-100 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <ProviderIcon providerId={provider.id} />
                    <span>{provider.shortLabel}</span>
                  </button>
                ))}
              </div>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-800" />
                <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                  or continue with email
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label htmlFor="signin-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="signin-password" className="block text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <span>{authLoading ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-xs text-slate-400">
                New to CNTEstates?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Create an account
                </button>
              </p>
            </form>
          )}

          {/* SIGN UP / REGISTER FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleEmailSignUp} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Mokoena"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-org" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Organization / Company Name
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="signup-org"
                      type="text"
                      required
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="Horizon Realty Group"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="signup-role" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Account Role
                  </label>
                  <select
                    id="signup-role"
                    value={accountCategory}
                    onChange={(e) => setAccountCategory(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {ACCOUNT_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="signup-country" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Country
                  </label>
                  <select
                    id="signup-country"
                    value={operatingCountry}
                    onChange={(e) => setOperatingCountry(e.target.value)}
                    className="w-full px-2.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {countryCurrencyCatalogue.map((c) => (
                      <option key={c.country} value={c.country}>
                        {c.country} ({c.defaultCurrency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="signup-language" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Language
                  </label>
                  <div className="relative">
                    <Languages className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="signup-language"
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value as Language)}
                      className="w-full pl-8 pr-2 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                {ACCOUNT_CATEGORIES.find((c) => c.value === accountCategory)?.summary}
              </p>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="signup-password" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Password (min 8 chars)
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="signup-confirm" className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Mandatory Terms & Conditions + Privacy Policy Checkboxes */}
              <div className="space-y-2.5 pt-1 bg-slate-900/70 border border-slate-800 rounded-lg p-3.5">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    I accept the{' '}
                    <a
                      href="/terms"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenLegal?.('terms');
                      }}
                      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-medium"
                    >
                      CNTEstates Terms and Conditions
                    </a>{' '}
                    governing platform usage, subscription billing, and multi-tenant data isolation.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    I have read and accept the{' '}
                    <a
                      href="/privacy"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenLegal?.('privacy');
                      }}
                      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-medium"
                    >
                      CNTEstates Privacy Policy
                    </a>{' '}
                    regarding secure processing of my account and property records.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <span>{authLoading ? 'Creating account...' : 'Create Isolated CNTEstates Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-xs text-slate-400">
                Already have a CNTEstates account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Sign In
                </button>
              </p>
            </form>
          )}

          {/* PASSWORD RESET FORM */}
          {mode === 'reset' && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {authLoading ? 'Sending link...' : 'Send Password Reset Email'}
              </button>

              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Return to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
