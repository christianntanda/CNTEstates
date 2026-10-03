import React from 'react';
import { Check, Lock } from 'lucide-react';
import { FeatureKey } from '../../types';
import { checkFeatureEntitlement } from '../../services/featureEntitlementEngine';

interface FeatureEntitlementBadgeProps {
  feature: FeatureKey;
  currentPlanId?: string;
  showRequiredPlanIfLocked?: boolean;
}

export const FeatureEntitlementBadge: React.FC<FeatureEntitlementBadgeProps> = ({
  feature,
  currentPlanId = 'free',
  showRequiredPlanIfLocked = true,
}) => {
  const result = checkFeatureEntitlement(currentPlanId, feature);

  if (result.entitled) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
        <Check className="w-2.5 h-2.5" />
        <span>Included</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 text-slate-400 border border-slate-700">
      <Lock className="w-2.5 h-2.5 text-amber-400" />
      <span>{showRequiredPlanIfLocked ? result.minRequiredPlanName : 'Locked'}</span>
    </span>
  );
};
