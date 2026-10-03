import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../i18n/translations';
import {
  Cpu,
  CalendarClock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';

export const MaintenanceAssetsView: React.FC = () => {
  const { assets, preventivePlans, currency, language, selectedPropertyId } = useApp();
  const [activeTabSub, setActiveTabSub] = useState<'assets' | 'preventive'>('assets');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = assets.filter((a) => {
    const matchesProperty = selectedPropertyId === 'all' || a.propertyId === selectedPropertyId;
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProperty && matchesSearch;
  });

  const filteredPlans = preventivePlans.filter((p) => {
    const matchesProperty = selectedPropertyId === 'all' || p.propertyId === selectedPropertyId;
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.assetName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProperty && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-400" />
            <span>Asset Registry & Preventive Maintenance</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track major mechanical assets, serial numbers, warranty terms, and recurring maintenance cycles.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTabSub('assets')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTabSub === 'assets'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Building Assets ({assets.length})
          </button>
          <button
            onClick={() => setActiveTabSub('preventive')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTabSub === 'preventive'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Preventive Plans ({preventivePlans.length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTabSub === 'assets'
                ? 'Search assets by name or serial #...'
                : 'Search preventive maintenance routines...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Sub-view: Assets Directory */}
      {activeTabSub === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 space-y-3 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-2 py-0.5 rounded">
                    {asset.category}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                      asset.operatingStatus === 'optimal'
                        ? 'text-emerald-400 bg-emerald-950/60'
                        : 'text-amber-400 bg-amber-950/60'
                    }`}
                  >
                    {asset.operatingStatus.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100">{asset.name}</h3>

                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div>Model: {asset.modelNumber}</div>
                  <div>Serial: {asset.serialNumber}</div>
                  <div>Location: {asset.location}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-xs space-y-1 text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Installed:</span>
                  <span className="text-slate-200 font-mono">{formatDate(asset.installDate, language)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Warranty To:</span>
                  <span className="text-slate-200 font-mono">{formatDate(asset.warrantyExpiry, language)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Purchase Value:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatCurrency(asset.purchaseCost, currency, language)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-view: Preventive Maintenance Plans */}
      {activeTabSub === 'preventive' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Routine Title</th>
                  <th className="py-3 px-4">Target Asset</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Assigned Service Tech</th>
                  <th className="py-3 px-4">Est. Cost</th>
                  <th className="py-3 px-4">Next Due Date</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPlans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-100">{p.title}</td>
                    <td className="py-3.5 px-4 text-slate-300">{p.assetName}</td>
                    <td className="py-3.5 px-4 uppercase font-semibold text-[11px] text-emerald-400">
                      {p.frequency}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{p.assignedContractorOrTech}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      {formatCurrency(p.estimatedCost, currency, language)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {formatDate(p.nextDueDate, language)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded text-emerald-400 bg-emerald-950/60 border border-emerald-900">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
