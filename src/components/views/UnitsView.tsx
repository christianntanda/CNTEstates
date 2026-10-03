import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UnitType, UnitStatus } from '../../types';
import { formatCurrency } from '../../i18n/translations';
import {
  Home,
  Plus,
  Search,
  Filter,
  Layers,
  User,
  DollarSign,
  Maximize2,
  CheckCircle2,
  Wrench,
  AlertCircle,
  ExternalLink,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';

export const UnitsView: React.FC = () => {
  const {
    units,
    properties,
    buildings,
    tenants,
    currency,
    language,
    addUnit,
    selectedPropertyId,
    setActiveTab,
    capacityUsage,
    usageMonitoring,
    validateUnitAddition,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [unitSubmitError, setUnitSubmitError] = useState<string | null>(null);

  // Add unit state
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [unitNumber, setUnitNumber] = useState('');
  const [floor, setFloor] = useState(1);
  const [type, setType] = useState<UnitType>('apartment');
  const [squareMeters, setSquareMeters] = useState(75);
  const [monthlyRent, setMonthlyRent] = useState(2500);

  const filteredUnits = units.filter((u) => {
    const matchesProperty = selectedPropertyId === 'all' || u.propertyId === selectedPropertyId;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesSearch =
      u.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProperty && matchesStatus && matchesSearch;
  });

  const selectedPropUnits = units.filter((u) => u.propertyId === propertyId).length;
  const unitValidation = validateUnitAddition(propertyId);

  const handleAddUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNumber.trim()) return;
    setUnitSubmitError(null);

    const res = await addUnit({
      propertyId,
      buildingId: buildings.find((b) => b.propertyId === propertyId)?.id || buildings[0]?.id,
      unitNumber,
      floor: Number(floor),
      type,
      squareMeters: Number(squareMeters),
      monthlyRent: Number(monthlyRent),
      currency,
      status: 'vacant',
      amenities: ['Balcony', 'AC'],
      keyAssetIds: [],
    });

    if (res.success) {
      setShowAddUnitModal(false);
      setUnitNumber('');
    } else {
      setUnitSubmitError(res.message || 'Unit capacity limit reached for your plan.');
    }
  };

  const unitMetric = usageMonitoring.resources.rentalUnits;
  const isOrgUnitsReached = unitMetric.isReached;
  const isOrgUnitsApproaching = unitMetric.isApproaching;

  const currentPropertyObj = properties.find((p) => p.id === selectedPropertyId);
  const currentPropertyUnitsCount = selectedPropertyId !== 'all' ? selectedPropUnits : 0;
  const isPropCapReached = capacityUsage.unitLimitType === 'per_property' && selectedPropertyId !== 'all' && currentPropertyUnitsCount >= 60;
  const isPropCapApproaching = capacityUsage.unitLimitType === 'per_property' && selectedPropertyId !== 'all' && currentPropertyUnitsCount >= 48 && currentPropertyUnitsCount < 60;

  const isAnyUnitLimitReached = isOrgUnitsReached || isPropCapReached;
  const isAnyUnitApproaching = !isAnyUnitLimitReached && (isOrgUnitsApproaching || isPropCapApproaching);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* SEQUENCE 08 — Centralized Usage Monitoring Indicator */}
      <div className={`border rounded-xl p-3.5 space-y-2.5 text-xs transition-colors ${
        isAnyUnitLimitReached
          ? 'bg-red-950/40 border-red-700/70 text-red-200'
          : isAnyUnitApproaching
          ? 'bg-amber-950/40 border-amber-600/70 text-amber-200'
          : 'bg-slate-900 border-slate-800 text-slate-300'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-mono">Plan Capacity:</span>
            <span className="font-bold text-slate-100">{usageMonitoring.planName}</span>
            <span className="text-slate-500">•</span>
            
            {/* Prominent format: Rental Units: Current Usage / Allowed Capacity (e.g. 48 / 50) */}
            <div className="inline-flex items-baseline gap-1 font-mono">
              <span className="text-slate-400 font-sans">Rental Units:</span>
              <strong className={`text-sm ${isOrgUnitsReached ? 'text-red-400' : isOrgUnitsApproaching ? 'text-amber-300' : 'text-emerald-400'}`}>
                {unitMetric.displayUsage}
              </strong>
              <span className="text-[10px] text-slate-400 font-sans ml-1">(Current Usage / Allowed Capacity)</span>
            </div>

            {capacityUsage.unitLimitType === 'per_property' && selectedPropertyId !== 'all' && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-sky-300 font-mono">
                  {currentPropertyObj?.name || 'Selected Property'}: <strong>{currentPropertyUnitsCount} / 60</strong>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAnyUnitLimitReached ? (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-red-900 text-red-200 border border-red-700">
                LIMIT REACHED
              </span>
            ) : isAnyUnitApproaching ? (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-900 text-amber-200 border border-amber-700">
                APPROACHING LIMIT ({unitMetric.percentage}%)
              </span>
            ) : (
              <span className="text-[11px] text-emerald-400 font-mono">
                {unitMetric.remaining === 'unlimited' ? 'Unlimited units allowed' : `${unitMetric.remaining} slot(s) free`}
              </span>
            )}

            {(isAnyUnitLimitReached || isAnyUnitApproaching) && (
              <button
                type="button"
                onClick={() => setActiveTab('subscriptions')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
              >
                <span>Upgrade Plan</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Warning Banner */}
        {isAnyUnitApproaching && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-700/50">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              {isPropCapApproaching
                ? `Warning: Approaching per-property limit (${currentPropertyUnitsCount} / 60 units on "${currentPropertyObj?.name}"). Only ${60 - currentPropertyUnitsCount} slot(s) left on this property.`
                : unitMetric.warningMessage}
            </span>
          </div>
        )}

        {/* Dynamic Limit Reached Explanation */}
        {isAnyUnitLimitReached && (
          <div className="flex items-center gap-1.5 text-[11px] text-red-300 bg-red-950/70 p-2 rounded-lg border border-red-700/60">
            <XCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>
              {isPropCapReached
                ? `Property "${currentPropertyObj?.name}" has reached the 60 units per-property maximum on the Professional plan (${currentPropertyUnitsCount} / 60). You cannot create additional units in this property. Units can be added to other properties in your portfolio (up to 5 properties allowed) or upgrade to Enterprise for unlimited per-property capacity.`
                : unitMetric.limitExplanation}
            </span>
          </div>
        )}
      </div>

      {/* Title & Add Unit */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Home className="w-6 h-6 text-emerald-400" />
            <span>Floors & Units Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure residential apartments, commercial suites, retail shops, and storage units.
          </p>
        </div>

        <button
          onClick={() => setShowAddUnitModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Unit</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search unit # (e.g. A-101)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-800/80 rounded-lg text-xs">
          {[
            { id: 'all', label: 'All Units' },
            { id: 'occupied', label: 'Occupied' },
            { id: 'vacant', label: 'Vacant' },
            { id: 'maintenance', label: 'Under Maintenance' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Units Table / Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Unit #</th>
                <th className="py-3 px-4">Property / Building</th>
                <th className="py-3 px-4">Floor & Type</th>
                <th className="py-3 px-4">Size (m²)</th>
                <th className="py-3 px-4">Monthly Rent</th>
                <th className="py-3 px-4">Occupant / Tenant</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredUnits.map((u) => {
                const prop = properties.find((p) => p.id === u.propertyId);
                const tenant = u.currentTenantId ? tenants.find((t) => t.id === u.currentTenantId) : null;

                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">{u.unitNumber}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200 truncate max-w-[180px]">{prop?.name}</div>
                      <div className="text-[11px] text-slate-400">{prop?.city}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200">Floor {u.floor}</div>
                      <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                        {u.type.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{u.squareMeters} m²</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      {formatCurrency(u.monthlyRent, currency, language)}
                    </td>
                    <td className="py-3.5 px-4">
                      {tenant ? (
                        <div
                          onClick={() => setActiveTab('tenants')}
                          className="cursor-pointer hover:underline text-emerald-400 font-medium"
                        >
                          {tenant.name}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No Active Tenant</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          u.status === 'occupied'
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900'
                            : u.status === 'vacant'
                            ? 'text-blue-400 bg-blue-950/60 border border-blue-900'
                            : 'text-amber-400 bg-amber-950/60 border border-amber-900'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveTab('digitalBuilding')}
                        className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Unit Modal */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>Define New Unit</span>
            </h3>

            <form onSubmit={handleAddUnitSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Property</label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Unit Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B-304 or Suite 400"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Floor Level</label>
                  <input
                    type="number"
                    min="1"
                    value={floor}
                    onChange={(e) => setFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Unit Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as UnitType)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="penthouse">Penthouse</option>
                    <option value="office_suite">Office Suite</option>
                    <option value="retail_shop">Retail Shop</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="studio">Studio</option>
                    <option value="storage">Storage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Floor Area (m²)</label>
                  <input
                    type="number"
                    value={squareMeters}
                    onChange={(e) => setSquareMeters(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Monthly Rental Rate ({currency})</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {unitSubmitError && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-lg text-xs flex flex-col gap-1.5">
                  <div className="font-semibold text-red-100 flex items-center gap-1.5">
                    <span>Subscription Quota Limit Reached</span>
                  </div>
                  <p>{unitSubmitError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUnitModal(false);
                      setActiveTab('subscriptions');
                    }}
                    className="self-start text-emerald-400 hover:text-emerald-300 font-semibold underline text-[11px] cursor-pointer"
                  >
                    View & Upgrade Subscription Plans →
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Create Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
