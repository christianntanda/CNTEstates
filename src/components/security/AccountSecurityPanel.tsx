import React, { useState } from 'react';
import {
  Shield,
  Link2,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Lock,
  Building2,
  Database,
  Mail,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { useFirebase, getProviderLabel } from '../../context/FirebaseContext';
import { useApp } from '../../context/AppContext';
import type { FederatedProviderId } from '../../firebase';
import {
  initialProperties,
  initialUnits,
  initialServiceTickets,
} from '../../data/mockDatabase';

const FEDERATED_LINK_ROWS: {
  id: FederatedProviderId;
  name: string;
  connectedDesc: string;
  disconnectedDesc: string;
}[] = [
  {
    id: 'google.com',
    name: 'Google',
    connectedDesc: 'Connected · Verified Google identity linked to this CNTEstates account.',
    disconnectedDesc: 'Not linked · Link your Google account for verified one-click sign-in.',
  },
  {
    id: 'microsoft.com',
    name: 'Microsoft',
    connectedDesc: 'Connected · Microsoft 365 / Entra ID linked to this CNTEstates account.',
    disconnectedDesc: 'Not linked · Link your Microsoft work or personal account.',
  },
  {
    id: 'apple.com',
    name: 'Apple',
    connectedDesc: 'Connected · Sign in with Apple linked to this CNTEstates account.',
    disconnectedDesc: 'Not linked · Link your Apple ID to this same tenant identity.',
  },
  {
    id: 'github.com',
    name: 'GitHub',
    connectedDesc: 'Connected · GitHub identity linked to this CNTEstates account.',
    disconnectedDesc: 'Not linked · Link your GitHub account without creating a separate profile.',
  },
];

export const AccountSecurityPanel: React.FC = () => {
  const {
    firebaseUser,
    authLoading,
    linkedProviders,
    cloudOrgId,
    userRoleCategory,
    isPlatformAdmin,
    backendSessionVerified,
    linkFederatedProvider,
    linkEmailPasswordProvider,
    unlinkAuthProvider,
    reauthenticateWithFederatedProvider,
    reauthenticateWithPassword,
    seedSamplePortfolioToCloud,
  } = useFirebase();

  const { properties, addAuditLog } = useApp();

  const [showLinkPasswordForm, setShowLinkPasswordForm] = useState(false);
  const [linkEmail, setLinkEmail] = useState(firebaseUser?.email || '');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkConfirm, setLinkConfirm] = useState('');
  const [showReauthPanel, setShowReauthPanel] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [recentlyReauthenticated, setRecentlyReauthenticated] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'collision';
    text: string;
  } | null>(null);
  const [seeding, setSeeding] = useState(false);

  if (!firebaseUser) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm text-slate-400">
        Sign in to manage multi-provider account linking and tenant isolation settings.
      </div>
    );
  }

  const hasPassword = linkedProviders.includes('password');
  const linkedFederatedIds = FEDERATED_LINK_ROWS.filter((r) =>
    linkedProviders.includes(r.id)
  ).map((r) => r.id);

  const handleLinkFederated = async (providerId: FederatedProviderId) => {
    setStatusMessage(null);
    const res = await linkFederatedProvider(providerId);
    if (res.success) {
      addAuditLog(
        'AUTH_PROVIDER_LINKED',
        'UserIdentity',
        firebaseUser.uid,
        undefined,
        `Linked ${getProviderLabel(providerId)} to verified account ${firebaseUser.uid}`
      );
      setStatusMessage({ type: 'success', text: res.message || `${getProviderLabel(providerId)} linked.` });
    } else if (res.collision) {
      setStatusMessage({ type: 'collision', text: res.collision.message });
    } else {
      if (res.requiresReauthentication) {
        setShowReauthPanel(true);
      }
      setStatusMessage({
        type: 'error',
        text: res.message || `Could not link ${getProviderLabel(providerId)}.`,
      });
    }
  };

  const handleLinkPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    if (linkPassword.length < 8) {
      setStatusMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }
    if (linkPassword !== linkConfirm) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    const res = await linkEmailPasswordProvider(linkEmail || firebaseUser.email || '', linkPassword);
    if (res.success) {
      setShowLinkPasswordForm(false);
      setLinkPassword('');
      setLinkConfirm('');
      addAuditLog(
        'AUTH_PROVIDER_LINKED',
        'UserIdentity',
        firebaseUser.uid,
        undefined,
        `Linked Email & Password credentials to verified account ${firebaseUser.uid}`
      );
      setStatusMessage({ type: 'success', text: res.message || 'Email & Password linked.' });
    } else {
      if (res.requiresReauthentication) {
        setShowReauthPanel(true);
      }
      setStatusMessage({
        type: 'error',
        text: res.message || 'Could not link Email & Password credentials.',
      });
    }
  };

  const handleUnlink = async (providerId: string) => {
    setStatusMessage(null);
    const res = await unlinkAuthProvider(providerId);
    if (res.success) {
      addAuditLog(
        'AUTH_PROVIDER_UNLINKED',
        'UserIdentity',
        firebaseUser.uid,
        getProviderLabel(providerId),
        `Unlinked ${getProviderLabel(providerId)} while preserving active sign-in access`
      );
      setStatusMessage({ type: 'success', text: res.message || 'Provider unlinked.' });
    } else {
      if (res.requiresReauthentication) {
        setShowReauthPanel(true);
      }
      setStatusMessage({
        type: 'error',
        text: res.message || 'Unable to unlink provider.',
      });
    }
  };

  const handleReauthFederated = async (providerId: FederatedProviderId) => {
    setStatusMessage(null);
    const res = await reauthenticateWithFederatedProvider(providerId);
    if (res.success) {
      setRecentlyReauthenticated(true);
      setShowReauthPanel(false);
      setStatusMessage({ type: 'success', text: res.message || 'Identity verified.' });
    } else {
      setStatusMessage({ type: 'error', text: res.message || 'Identity verification failed.' });
    }
  };

  const handleReauthPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    const res = await reauthenticateWithPassword(reauthPassword);
    if (res.success) {
      setRecentlyReauthenticated(true);
      setShowReauthPanel(false);
      setReauthPassword('');
      setStatusMessage({ type: 'success', text: res.message || 'Identity verified.' });
    } else {
      setStatusMessage({ type: 'error', text: res.message || 'Incorrect password.' });
    }
  };

  const handleSeedSamplePortfolio = async () => {
    setSeeding(true);
    setStatusMessage(null);
    try {
      await seedSamplePortfolioToCloud({
        properties: initialProperties.slice(0, 2),
        units: initialUnits.filter((u) => u.propertyId === initialProperties[0]?.id).slice(0, 4),
        tickets: initialServiceTickets.slice(0, 3),
      });
      setStatusMessage({
        type: 'success',
        text: 'Sample properties, units, and service tickets were created strictly inside your isolated Firestore organization.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to populate sample portfolio.',
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          className={`rounded-lg p-3.5 text-xs border flex items-start gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : statusMessage.type === 'collision'
              ? 'bg-amber-950/60 border-amber-700 text-amber-100'
              : 'bg-red-950/60 border-red-800 text-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : statusMessage.type === 'collision' ? (
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Strict Account Isolation Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Verified Identity &amp; Strict Account Isolation</span>
            </h3>
            <p className="text-xs text-slate-400">
              Your workspace is cryptographically bound to your Firebase UID and dedicated Firestore tenant boundary across database rules, APIs, and services.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-emerald-400 whitespace-nowrap">
              {firebaseUser.emailVerified ? 'Verified Account' : 'Verification Pending'}
            </span>
            {backendSessionVerified && (
              <span className="text-[11px] font-medium text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                API Token Verified
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 block">Primary Email</span>
            <span className="text-slate-100 font-medium break-all">{firebaseUser.email}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 block">CNTEstates User UID</span>
            <span className="text-slate-200 font-mono text-[11px] break-all">{firebaseUser.uid}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 block">Isolated Organization ID</span>
            <span className="text-slate-200 font-mono text-[11px] break-all">
              {cloudOrgId || 'Provisioning...'}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 block">Authorized RBAC Role</span>
            <span className="text-emerald-300 font-medium capitalize">
              {isPlatformAdmin ? 'SaaS Platform Admin' : userRoleCategory.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Identity Re-Verification Bar for Sensitive Account Security Changes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sensitive Action Identity Verification</span>
            </h4>
            <p className="text-xs text-slate-400">
              {recentlyReauthenticated
                ? 'Identity freshly verified for this session. Sensitive provider linking and unlinking are unlocked.'
                : 'Before unlinking providers or resolving credential conflicts, confirm ownership of your current session.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowReauthPanel((prev) => !prev)}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-100 flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showReauthPanel ? 'Hide Verification' : 'Re-Verify Identity'}</span>
          </button>
        </div>

        {showReauthPanel && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-3">
            <p className="text-xs text-slate-300">
              Re-authenticate with any provider currently linked to your account:
            </p>
            <div className="flex flex-wrap gap-2">
              {linkedFederatedIds.map((pid) => (
                <button
                  key={pid}
                  type="button"
                  disabled={authLoading}
                  onClick={() => void handleReauthFederated(pid)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Verify with {getProviderLabel(pid)}
                </button>
              ))}
            </div>
            {hasPassword && (
              <form onSubmit={handleReauthPassword} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
                <input
                  type="password"
                  required
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Enter your current password to verify"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 disabled:opacity-50"
                >
                  Verify Password
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Multi-Provider Account Linking (All 5 Providers) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-400" />
              <span>Linked Authentication Providers</span>
            </h3>
            <p className="text-xs text-slate-400">
              Link Google, Microsoft, Apple, GitHub, and Email &amp; Password to your single CNTEstates identity. Your UID, organization boundary, and role permissions remain strictly preserved.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md shrink-0">
            {linkedProviders.length} Linked
          </span>
        </div>

        <div className="divide-y divide-slate-800 border-t border-slate-800">
          {FEDERATED_LINK_ROWS.map((provider) => {
            const isLinked = linkedProviders.includes(provider.id);
            return (
              <div
                key={provider.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <KeyRound
                      className={`w-4 h-4 ${isLinked ? 'text-emerald-400' : 'text-slate-400'}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{provider.name}</p>
                      {isLinked && (
                        <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.5 rounded">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isLinked ? provider.connectedDesc : provider.disconnectedDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isLinked ? (
                    <button
                      type="button"
                      disabled={authLoading || linkedProviders.length <= 1}
                      onClick={() => void handleUnlink(provider.id)}
                      title={
                        linkedProviders.length <= 1
                          ? 'Link another sign-in method before unlinking this provider'
                          : `Unlink ${provider.name}`
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:text-red-300 hover:border-red-800 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Unlink</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={() => void handleLinkFederated(provider.id)}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-100 hover:text-white border border-slate-700 hover:border-emerald-500 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      Link {provider.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Email & Password Provider Row */}
          <div className="py-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <Mail className={`w-4 h-4 ${hasPassword ? 'text-emerald-400' : 'text-slate-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">Email &amp; Password</p>
                    {hasPassword && (
                      <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.5 rounded">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasPassword
                      ? 'Connected · You can sign in using your email address and password.'
                      : 'Not linked · Attach a password credential to this same CNTEstates account.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {hasPassword ? (
                  <button
                    type="button"
                    disabled={authLoading || linkedProviders.length <= 1}
                    onClick={() => void handleUnlink('password')}
                    title={
                      linkedProviders.length <= 1
                        ? 'Link another sign-in provider before unlinking Email & Password'
                        : 'Unlink Email & Password'
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:text-red-300 hover:border-red-800 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Unlink</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLinkPasswordForm((prev) => !prev)}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-100 hover:text-white border border-slate-700 hover:border-emerald-500 text-xs font-semibold transition-colors"
                  >
                    {showLinkPasswordForm ? 'Cancel' : 'Link Email & Password'}
                  </button>
                )}
              </div>
            </div>

            {showLinkPasswordForm && !hasPassword && (
              <form
                onSubmit={handleLinkPasswordSubmit}
                className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Account Email
                    </label>
                    <input
                      type="email"
                      required
                      value={linkEmail}
                      onChange={(e) => setLinkEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      New Password (min 8 chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={linkPassword}
                      onChange={(e) => setLinkPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={linkConfirm}
                      onChange={(e) => setLinkConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{authLoading ? 'Linking...' : 'Save & Link Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Isolated Starter Portfolio Bootstrap (only for org management roles with 0 properties) */}
      {properties.length === 0 &&
        !['tenant', 'contractor', 'technician'].includes(userRoleCategory) && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Your Isolated Cloud Portfolio Is Empty</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-xl">
                Because CNTEstates enforces strict account isolation, new accounts start with zero shared or third-party properties. You can add your own buildings or load private starter sample records scoped exclusively to your organization.
              </p>
            </div>
            <button
              type="button"
              disabled={seeding}
              onClick={() => void handleSeedSamplePortfolio()}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shrink-0 transition-colors disabled:opacity-50"
            >
              <Building2 className="w-4 h-4" />
              <span>{seeding ? 'Creating Sample Data...' : 'Load Private Starter Portfolio'}</span>
            </button>
          </div>
        )}
    </div>
  );
};
