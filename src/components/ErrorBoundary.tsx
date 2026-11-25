import React from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import type { FirestoreErrorInfo } from '../firebase';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  firestoreError: FirestoreErrorInfo | null;
  isQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      firestoreError: null,
      isQuotaError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let firestoreError: FirestoreErrorInfo | null = null;
    let errorMessage = error.message || 'An unexpected application error occurred.';

    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === 'object' && 'operationType' in parsed && 'error' in parsed) {
        firestoreError = parsed as FirestoreErrorInfo;
        errorMessage = firestoreError.error;
      }
    } catch {
      // Standard non-JSON Error
    }

    const lowerMsg = errorMessage.toLowerCase();
    const isQuotaError =
      lowerMsg.includes('resource-exhausted') ||
      lowerMsg.includes('quota exceeded') ||
      lowerMsg.includes('quota');

    return {
      hasError: true,
      errorMessage,
      firestoreError,
      isQuotaError,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('CNTEstates ErrorBoundary caught error:', error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      errorMessage: '',
      firestoreError: null,
      isQuotaError: false,
    });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { firestoreError, errorMessage, isQuotaError } = this.state;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 text-red-400 shrink-0">
              {firestoreError ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h1 className="text-base font-bold text-white">
                {isQuotaError
                  ? 'Firestore Free Tier Quota Reached'
                  : firestoreError
                  ? 'Cloud Data Access Interrupted'
                  : 'Unexpected Application Error'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {isQuotaError
                  ? 'Your Firebase Spark plan daily read or write limit has been exceeded. Upgrade your Firebase project to the Blaze plan or wait for the daily quota reset.'
                  : firestoreError
                  ? `Firestore ${firestoreError.operationType.toUpperCase()} failed on ${firestoreError.path || 'unknown path'}.`
                  : 'CNTEstates encountered an unexpected runtime error.'}
              </p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-red-300 break-words">
            {errorMessage}
          </div>

          {firestoreError && (
            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
              <div>
                <span className="text-slate-500">Operation:</span>{' '}
                <span className="text-slate-200 font-mono">{firestoreError.operationType}</span>
              </div>
              <div>
                <span className="text-slate-500">Path:</span>{' '}
                <span className="text-slate-200 font-mono">{firestoreError.path || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500">Signed-in User:</span>{' '}
                <span className="text-slate-200 font-mono">
                  {firestoreError.authInfo.email || 'Unauthenticated'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Dismiss &amp; Continue
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Workspace</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
