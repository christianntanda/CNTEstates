import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Property, PropertyType } from '../../types';
import {
  Building2,
  Plus,
  MapPin,
  Home,
  Layers,
  Users,
  CheckCircle2,
  ExternalLink,
  Car,
  Search,
  Filter,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';

export const PropertiesView: React.FC = () => {
  const {
    properties,
    buildings,
    units,
    addProperty,
    setActiveTab,
    setSelectedPropertyId,
    capacityUsage,
    usageMonitoring,
    validatePropertyAddition,
  } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const propMetric = usageMonitoring.resources.properties;
  const isReached = propMetric.isReached;
  const isApproaching = propMetric.isApproaching;

  // Form state for adding property
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('residential');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United States');
  const [totalBuildings, setTotalBuildings] = useState(1);
  const [totalUnits, setTotalUnits] = useState(20);
  const [ownerName, setOwnerName] = useState('Centurion Holdings');
  const [managerName, setManagerName] = useState('Alex Vance');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80'
  );

  const filteredProperties = properties.filter((p) => {
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const propertyValidation = validatePropertyAddition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;
    setSubmitError(null);

    const res = await addProperty({
      organizationId: 'org-1',
      name,
      type,
      address,
      city,
      region: 'State',
      country,
      postalCode: '10001',
      ownerName,
      managerName,
      description: 'Modern managed rental building complex.',
      imageUrl,
      yearBuilt: 2024,
      totalBuildings: Number(totalBuildings),
      totalUnits: Number(totalUnits),
      occupiedUnits: 0,
      parkingSpaces: 25,
      amenities: ['24/7 Security', 'Elevator', 'Intercom'],
      status: 'active',
    });

    if (res.success) {
      setShowAddModal(false);
      setName('');
      setAddress('');
    } else {
      setSubmitError(res.message || 'Capacity limit reached for your plan.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* SEQUENCE 08 — Centralized Usage Monitoring Indicator */}
      <div className={`border rounded-xl p-3.5 space-y-2 text-xs transition-colors ${
        isReached
          ? 'bg-red-950/40 border-red-700/70 text-red-200'
          : isApproaching
          ? 'bg-amber-950/40 border-amber-600/70 text-amber-200'
          : 'bg-slate-900 border-slate-800 text-slate-300'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-mono">Plan Capacity:</span>
            <span className="font-bold text-slate-100">{propMetric.upgradeTargetPlanName ? usageMonitoring.planName : capacityUsage.planName}</span>
            <span className="text-slate-500">•</span>
            <div className="inline-flex items-baseline gap-1 font-mono">
              <span className="text-slate-400 font-sans">Properties:</span>
              <strong className={`text-sm ${isReached ? 'text-red-400' : isApproaching ? 'text-amber-300' : 'text-emerald-400'}`}>
                {propMetric.displayUsage}
              </strong>
              <span className="text-[10px] text-slate-400 font-sans ml-1">(Current Usage / Allowed Capacity)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isReached ? (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-red-900 text-red-200 border border-red-700">
                LIMIT REACHED
              </span>
            ) : isApproaching ? (
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-900 text-amber-200 border border-amber-700">
                APPROACHING LIMIT ({propMetric.percentage}%)
              </span>
            ) : (
              <span className="text-[11px] text-emerald-400 font-mono">
                {propMetric.remaining === 'unlimited' ? 'Unlimited properties allowed' : `${propMetric.remaining} slot(s) free`}
              </span>
            )}

            {(isReached || isApproaching) && (
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

        {/* Dynamic Warning Message */}
        {isApproaching && propMetric.warningMessage && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-700/50">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{propMetric.warningMessage}</span>
          </div>
        )}

        {/* Dynamic Limit Reached Explanation */}
        {isReached && propMetric.limitExplanation && (
          <div className="flex items-center gap-1.5 text-[11px] text-red-300 bg-red-950/70 p-2 rounded-lg border border-red-700/60">
            <XCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{propMetric.limitExplanation}</span>
          </div>
        )}
      </div>

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            <span>Properties & Complexes Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage multi-building complexes, commercial business parks, residential towers and student accommodation.
          </p>
        </div>

        <button
          onClick={() => {
            setSubmitError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Property</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search properties by name or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Segmented Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-800/80 rounded-lg text-xs">
          {[
            { id: 'all', label: 'All Properties' },
            { id: 'residential', label: 'Residential' },
            { id: 'commercial', label: 'Commercial' },
            { id: 'mixed_use', label: 'Mixed-Use' },
            { id: 'student_accommodation', label: 'Student' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 ${
                filterType === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProperties.map((prop) => {
          const propBuildings = buildings.filter((b) => b.propertyId === prop.id);
          const propUnits = units.filter((u) => u.propertyId === prop.id);
          const occupancy = prop.totalUnits > 0 ? Math.round((prop.occupiedUnits / prop.totalUnits) * 100) : 0;

          return (
            <div
              key={prop.id}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all flex flex-col group"
            >
              <div className="relative h-44 w-full bg-slate-800 overflow-hidden">
                <img
                  src={prop.imageUrl}
                  alt={prop.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-xs border border-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  {prop.type.replace('_', ' ')}
                </div>
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-lg font-bold text-white tracking-tight drop-shadow-sm">{prop.name}</h3>
                  <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {prop.address}, {prop.city}, {prop.country}
                    </span>
                  </p>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <p className="text-xs text-slate-400 line-clamp-2">{prop.description}</p>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Buildings</span>
                    <span className="text-sm font-bold text-slate-200">{prop.totalBuildings}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Units</span>
                    <span className="text-sm font-bold text-slate-200">{prop.totalUnits}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Occupancy</span>
                    <span className="text-sm font-bold text-emerald-400">{occupancy}%</span>
                  </div>
                </div>

                {/* Amenities Badges */}
                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
                  {prop.amenities.map((a, i) => (
                    <span key={i} className="text-[11px] text-slate-300">
                      {a} {i < prop.amenities.length - 1 ? '·' : ''}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    Manager: <strong className="text-slate-200">{prop.managerName}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setSelectedPropertyId(prop.id);
                      setActiveTab('units');
                    }}
                    className="flex items-center gap-1 text-xs text-emerald-400 font-semibold hover:underline"
                  >
                    <span>Inspect Units ({propUnits.length})</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Property Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>Register New Rental Property</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Property Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sapphire Horizon Lofts"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Property Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PropertyType)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="mixed_use">Mixed-Use</option>
                    <option value="student_accommodation">Student Housing</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Total Buildings</label>
                  <input
                    type="number"
                    min="1"
                    value={totalBuildings}
                    onChange={(e) => setTotalBuildings(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500 Park Avenue"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="New York"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Units Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Assigned Manager</label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {submitError && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-lg text-xs flex flex-col gap-1.5">
                  <div className="font-semibold text-red-100 flex items-center gap-1.5">
                    <span>Subscription Quota Limit Reached</span>
                  </div>
                  <p>{submitError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setActiveTab('subscriptions');
                    }}
                    className="self-start text-emerald-400 hover:text-emerald-300 font-semibold underline text-[11px] cursor-pointer"
                  >
                    View & Upgrade Subscription Plans →
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Save Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
