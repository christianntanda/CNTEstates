import React from 'react';
import { FeatureKey } from '../../types';
import { useApp } from '../../context/AppContext';
import { isFeatureEntitled } from '../../services/featureEntitlementEngine';
import { FeatureLockedNotice } from './FeatureLockedNotice';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  compact?: boolean;
  customTitle?: string;
  customDescription?: string;
  planIdOverride?: string;
  onUpgrade?: (targetPlanId: string) => void;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  compact = false,
  customTitle,
  customDescription,
  planIdOverride,
  onUpgrade,
}) => {
  const { organization, evaluateAccess } = useApp();

  const decision = evaluateAccess ? evaluateAccess(feature) : null;
  const isGranted = planIdOverride
    ? isFeatureEntitled(planIdOverride, feature)
    : decision
    ? decision.granted
    : false;

  if (isGranted) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <FeatureLockedNotice
      feature={feature}
      currentPlanId={planIdOverride || organization?.planId}
      compact={compact}
      customTitle={customTitle}
      customDescription={customDescription}
      onUpgrade={onUpgrade}
      decisionOverride={planIdOverride ? undefined : (decision || undefined)}
    />
  );
};
