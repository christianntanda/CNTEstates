import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../i18n/translations';
import {
  Zap,
  Droplets,
  Flame,
  Sun,
  Activity,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

export const UtilitiesView: React.FC = () => {
  const { utilityMeters, tenants, currency, language, selectedPropertyId } = useApp();
  const [filterType, setFilterType] = useState<string>('all');

  const filteredMeters = utilityMeters.filter((m) => {
    const matchesProperty = selectedPropertyId === 'all' || m.propertyId === selectedPropertyId;
    const matchesType = filterType === 'all' || m.type === filterType;
    return matchesProperty && matchesType;
  });

  const getMeterIcon = (type: string) => {
    switch (type) {
      case 'electricity':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'water':
        return <Droplets className="w-4 h-4 text-blue-400" />;
      case 'gas':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'solar':
        return <Sun className="w-4 h-4 text-emerald-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-400" />
            <span>Utilities & Sub-Metering Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Smart sub-metering for Electricity, Water, Gas, and Solar PV. Automated tenant recharge calculation.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
        {[
          { id: 'all', label: 'All Utility Meters' },
          { id: 'electricity', label: 'Electricity' },
          { id: 'water', label: 'Water' },
          { id: 'solar', label: 'Solar Generation' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
              filterType === tab.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Meters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredMeters.map((meter) => {
          const consumption = meter.currentReading - meter.previousReading;
          const tenant = meter.allocatedTenantId ? tenants.find((t) => t.id === meter.allocatedTenantId) : null;

          return (
            <div
              key={meter.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {getMeterIcon(meter.type)}
                    <span>{meter.type}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-emerald-400">{meter.meterNumber}</span>
                </div>

                <div className="text-xs text-slate-300">
                  <div className="font-bold text-slate-100">{meter.propertyName}</div>
                  <div className="text-[11px] text-slate-400">Unit: {meter.unitNumber || 'Main Building Feed'}</div>
                </div>

                {tenant && (
                  <div className="text-[11px] text-slate-400 bg-slate-800/80 p-2 rounded border border-slate-700/60">
                    Billed to: <strong className="text-slate-200">{tenant.name}</strong>
                  </div>
                )}
              </div>

              {/* Consumption & Costs */}
              <div className="pt-3 border-t border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Reading:</span>
                  <span className="text-slate-200">
                    {meter.currentReading} {meter.unitOfMeasure}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Consumption:</span>
                  <span className="text-emerald-400 font-bold">
                    +{consumption} {meter.unitOfMeasure}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>Recharge Total:</span>
                  <span className="text-base font-bold text-slate-100">
                    {formatCurrency(meter.totalCost, currency, language)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
