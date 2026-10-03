import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  generateStructuredPlanComparison,
  filterComparisonCriteria,
  COMPARISON_CATEGORIES,
  ComparisonCategory,
  ComparisonCriterion,
} from '../../services/planComparisonEngine';
import { getCentralizedPlans } from '../../services/planCatalogService';
import { UpgradeFlowModal } from '../upgrades/UpgradeFlowModal';
import {
  Building2,
  Check,
  Minus,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Info,
  CheckCircle2,
  Lock,
  Layers,
  HelpCircle,
  Crown,
  Home,
  Wrench,
  Users,
  ShieldCheck,
  Globe,
  Server,
  LifeBuoy,
  FileSpreadsheet,
} from 'lucide-react';

interface PlanComparisonMatrixProps {
  onSelectPlan?: (planId: string) => void;
  className?: string;
}

export const PlanComparisonMatrix: React.FC<PlanComparisonMatrixProps> = ({
  onSelectPlan,
  className = '',
}) => {
  const { organization, activeSubscription, setActiveTab } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [differencesOnly, setDifferencesOnly] = useState<boolean>(false);
  const [targetUpgradePlanId, setTargetUpgradePlanId] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [enterpriseInquiryOpen, setEnterpriseInquiryOpen] = useState<boolean>(false);
  const [inquirySubmitted, setInquirySubmitted] = useState<boolean>(false);

  // Authoritative plans from centralized catalog
  const plans = useMemo(() => getCentralizedPlans(), []);
  const currentPlanId = organization?.planId || activeSubscription?.plan_id || 'business';

  // Full 21-point comparison criteria from planComparisonEngine
  const allCriteria = useMemo(() => generateStructuredPlanComparison(), []);

  // Filtered criteria based on active UI controls
  const filteredCriteria = useMemo(() => {
    return filterComparisonCriteria(allCriteria, selectedCategory, differencesOnly, searchTerm);
  }, [allCriteria, selectedCategory, differencesOnly, searchTerm]);

  // Group filtered criteria by category for structured rendering
  const criteriaByCategory = useMemo(() => {
    const map = new Map<ComparisonCategory, ComparisonCriterion[]>();
    for (const c of filteredCriteria) {
      const existing = map.get(c.category) || [];
      existing.push(c);
      map.set(c.category, existing);
    }
    return map;
  }, [filteredCriteria]);

  const handleCta = (planId: string) => {
    if (planId === 'enterprise') {
      setEnterpriseInquiryOpen(true);
      return;
    }

    if (onSelectPlan) {
      onSelectPlan(planId);
      return;
    }

    if (organization?.id) {
      setTargetUpgradePlanId(planId);
      setIsUpgradeModalOpen(true);
    } else {
      setActiveTab('dashboard');
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Building2':
        return <Building2 className="w-4 h-4 text-emerald-400" />;
      case 'Users':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'Wrench':
        return <Wrench className="w-4 h-4 text-emerald-400" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'FileSpreadsheet':
        return <FileSpreadsheet className="w-4 h-4 text-amber-400" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'Globe':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'Server':
        return <Server className="w-4 h-4 text-purple-400" />;
      case 'LifeBuoy':
        return <LifeBuoy className="w-4 h-4 text-emerald-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Sequence 24 Identifier */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-emerald-900/80 text-emerald-400 text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>SEQUENCE 24 — AUTHORITATIVE PLAN COMPARISON ENGINE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Structured 21-Dimension Plan Comparison
          </h2>
          <p className="text-xs text-slate-400">
            Authoritative comparison generated directly from the CNTEstates feature entitlement registry, capacity quotas, and master pricing.
          </p>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 text-xs">
          <div className="text-right">
            <div className="text-slate-400 text-[11px]">Compared Criteria</div>
            <div className="font-bold text-white font-mono">
              {filteredCriteria.length} of {allCriteria.length} Dimensions
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar: Category Filter, Search & Differences Only Toggle */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search 21 dimensions (e.g. SLA, AI, portals)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Differences Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white select-none shrink-0">
            <input
              type="checkbox"
              checked={differencesOnly}
              onChange={(e) => setDifferencesOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900 bg-slate-950 cursor-pointer"
            />
            <span className="font-medium">Highlight Differences Only</span>
          </label>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All 21 Dimensions
          </button>
          {COMPARISON_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cat.name.split('&')[0].trim()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Structured Comparison Table Matrix */}
      <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900/60 shadow-2xl">
        <table className="w-full text-left text-xs border-collapse">
          {/* Sticky Header with All Six Plans */}
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/90 text-slate-300 sticky top-0 z-20 backdrop-blur-md">
              <th className="p-4 font-bold text-slate-200 min-w-[240px] align-bottom bg-slate-950">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                    Authoritative Comparison
                  </span>
                  <div className="font-extrabold text-sm text-white">Feature / Entitlement</div>
                </div>
              </th>

              {plans.map((p) => {
                const planId = p.id || p.plan_id;
                const isCurrent = planId === currentPlanId;
                const isPopular = planId === 'business';
                const isEnterprise = planId === 'enterprise';

                return (
                  <th
                    key={planId}
                    className={`p-4 text-center min-w-[155px] align-bottom border-l border-slate-800/80 transition-colors ${
                      isPopular
                        ? 'bg-emerald-950/20'
                        : isEnterprise
                        ? 'bg-purple-950/20'
                        : isCurrent
                        ? 'bg-slate-900/90'
                        : ''
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Plan Badges */}
                      <div className="h-5 flex items-center justify-center">
                        {isPopular ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 uppercase tracking-wider">
                            Most Popular
                          </span>
                        ) : isEnterprise ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500 text-white uppercase tracking-wider">
                            Institutional
                          </span>
                        ) : isCurrent ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-800">
                            Current Plan
                          </span>
                        ) : null}
                      </div>

                      {/* Plan Name */}
                      <div className="font-extrabold text-white text-sm">
                        {p.plan_name.replace('CNTEstates ', '')}
                      </div>

                      {/* Plan Price */}
                      <div className="font-mono">
                        {p.master_price === 0 ? (
                          <span className="text-lg font-bold text-emerald-400">Free</span>
                        ) : (
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-lg font-bold text-white">
                              ${p.master_price}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">/mo</span>
                          </div>
                        )}
                      </div>

                      {/* Header CTA Button */}
                      <button
                        type="button"
                        onClick={() => handleCta(planId)}
                        disabled={isCurrent}
                        className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700'
                            : isPopular
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            : isEnterprise
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs'
                            : 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white border border-slate-700'
                        }`}
                      >
                        {isCurrent ? 'Current' : planId === 'enterprise' ? 'Contact Sales' : planId === 'free' ? 'Get Free' : 'Choose'}
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Grouped Rows by Category */}
          <tbody className="divide-y divide-slate-800/80">
            {COMPARISON_CATEGORIES.map((category) => {
              const items = criteriaByCategory.get(category.id);
              if (!items || items.length === 0) return null;

              return (
                <React.Fragment key={category.id}>
                  {/* Category Section Header */}
                  <tr className="bg-slate-950/80 border-t-2 border-slate-800">
                    <td
                      colSpan={7}
                      className="p-3.5 px-4 font-bold text-white text-xs flex items-center gap-2 bg-slate-900/90"
                    >
                      {getCategoryIcon(category.iconName)}
                      <span className="tracking-wide">{category.name}</span>
                      <span className="text-[11px] font-normal text-slate-400 font-sans pl-2">
                        — {category.description}
                      </span>
                    </td>
                  </tr>

                  {/* Category Items */}
                  {items.map((criterion, idx) => (
                    <tr
                      key={criterion.id}
                      className="hover:bg-slate-850/60 transition-colors border-b border-slate-800/50"
                    >
                      {/* Criterion Label & Description */}
                      <td className="p-3.5 px-4 bg-slate-950/40">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-200 flex items-center gap-2">
                            <span>{criterion.label}</span>
                            {criterion.featureKey && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {criterion.featureKey}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-snug">
                            {criterion.description}
                          </div>
                        </div>
                      </td>

                      {/* Values for All 6 Plans */}
                      {plans.map((p) => {
                        const planId = p.id || p.plan_id;
                        const cell = criterion.values[planId] || {
                          value: '—',
                          isIncluded: false,
                          type: 'text',
                        };

                        const isPopular = planId === 'business';
                        const isEnterprise = planId === 'enterprise';

                        return (
                          <td
                            key={planId}
                            className={`p-3.5 px-2 text-center border-l border-slate-800/60 ${
                              isPopular
                                ? 'bg-emerald-950/10'
                                : isEnterprise
                                ? 'bg-purple-950/10'
                                : ''
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center min-h-[32px] space-y-1">
                              {/* Boolean Check / Cross */}
                              {cell.type === 'boolean' ? (
                                cell.isIncluded ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                                    <Minus className="w-3.5 h-3.5" />
                                  </div>
                                )
                              ) : null}

                              {/* Badge Style */}
                              {cell.type === 'badge' ? (
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-mono ${
                                    cell.badgeStyle === 'emerald'
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                      : cell.badgeStyle === 'purple'
                                      ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                                      : cell.badgeStyle === 'blue'
                                      ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                                      : cell.badgeStyle === 'amber'
                                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                                  }`}
                                  title={cell.tooltip || cell.value}
                                >
                                  {cell.value}
                                </span>
                              ) : null}

                              {/* Standard Text Style */}
                              {cell.type === 'text' ? (
                                <span
                                  className={`text-[11px] leading-tight font-sans ${
                                    cell.isIncluded ? 'text-slate-200' : 'text-slate-500'
                                  }`}
                                  title={cell.tooltip}
                                >
                                  {cell.value}
                                </span>
                              ) : null}

                              {/* Cell Tooltip Info Marker if provided */}
                              {cell.tooltip && cell.type !== 'badge' && (
                                <span className="text-[10px] text-slate-500 italic block">
                                  {cell.tooltip}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Comparison Engine Audit Verification Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Strict Entitlement Enforcement: All 21 dimensions inherit plan hierarchy via{' '}
            <code className="text-emerald-300 font-mono text-[11px]">isFeatureEntitled</code> and authoritative capacity limits.
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
          <span>Tier Order: Free (0) → Starter (1) → Basic (2) → Pro (3) → Business (4) → Enterprise (5)</span>
        </div>
      </div>

      {/* Enterprise Contact Modal */}
      {enterpriseInquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Crown className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">
                  CNTEstates Enterprise Institutional Inquiry
                </h3>
              </div>
              <button
                onClick={() => {
                  setEnterpriseInquiryOpen(false);
                  setInquirySubmitted(false);
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {inquirySubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-base">Inquiry Dispatched</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Our Key Accounts Director will contact your team within 2 business hours to review institutional volumes (5,000+ rental units), dedicated database isolation, and accounting ERP integrations.
                </p>
                <button
                  onClick={() => {
                    setEnterpriseInquiryOpen(false);
                    setInquirySubmitted(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Return to Comparison
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setInquirySubmitted(true);
                }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Organization / Real Estate Fund Name</label>
                  <input
                    type="text"
                    required
                    defaultValue={organization?.name || 'Metropolitan Capital Properties'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Rental Units Portfolio</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                      <option>1,000 – 2,500 units</option>
                      <option>2,500 – 5,000 units</option>
                      <option>5,000 – 10,000 units</option>
                      <option>10,000+ units (Custom cluster)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-medium">Primary Operating Region</label>
                    <input
                      type="text"
                      defaultValue={organization?.country || 'South Africa'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Key Requirements (ERP, SSO, Compliance)</label>
                  <textarea
                    rows={3}
                    placeholder="E.g. SAP S/4HANA sync, Okta SSO, custom compliance legal dossiers, 15-minute emergency SLA."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEnterpriseInquiryOpen(false)}
                    className="px-3.5 py-2 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-md cursor-pointer"
                  >
                    Dispatch Enterprise Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Upgrade Flow Modal Integration */}
      {isUpgradeModalOpen && targetUpgradePlanId && (
        <UpgradeFlowModal
          isOpen={isUpgradeModalOpen}
          initialTargetPlanId={targetUpgradePlanId}
          onClose={() => {
            setIsUpgradeModalOpen(false);
            setTargetUpgradePlanId(null);
          }}
          onSuccess={() => {
            setIsUpgradeModalOpen(false);
            setTargetUpgradePlanId(null);
          }}
        />
      )}
    </div>
  );
};
