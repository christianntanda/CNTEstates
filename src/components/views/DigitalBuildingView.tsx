import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../i18n/translations';
import {
  Building2,
  Layers,
  Home,
  AlertTriangle,
  LifeBuoy,
  Cpu,
  CheckCircle2,
  Clock,
  User,
  Shield,
  Zap,
  ArrowRight,
} from 'lucide-react';

export const DigitalBuildingView: React.FC = () => {
  const {
    t,
    language,
    currency,
    properties,
    buildings,
    units,
    tickets,
    assets,
    tenants,
    setActiveTab,
  } = useApp();

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildings[0]?.id || '');
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId) || buildings[0];
  const buildingProperty = properties.find((p) => p.id === selectedBuilding?.propertyId);

  // Units in this building
  const buildingUnits = units.filter((u) => u.buildingId === selectedBuilding?.id);
  const buildingTickets = tickets.filter(
    (t) => t.buildingId === selectedBuilding?.id || t.propertyId === selectedBuilding?.propertyId
  );
  const buildingAssets = assets.filter((a) => a.buildingId === selectedBuilding?.id);

  // Stats for the selected building
  const totalUnits = buildingUnits.length;
  const occupiedUnits = buildingUnits.filter((u) => u.status === 'occupied').length;
  const vacantUnits = buildingUnits.filter((u) => u.status === 'vacant').length;
  const maintenanceUnits = buildingUnits.filter((u) => u.status === 'maintenance').length;
  const openRequestsCount = buildingTickets.filter((t) => t.status !== 'closed').length;
  const criticalCount = buildingTickets.filter(
    (t) => t.priority === 'emergency' || t.priority === 'critical'
  ).length;

  // Floors array from top down
  const floorsList = Array.from(
    { length: selectedBuilding?.floorsCount || 6 },
    (_, i) => (selectedBuilding?.floorsCount || 6) - i
  );

  const floorUnits = buildingUnits.filter((u) => u.floor === selectedFloor);
  const activeUnit = selectedUnitId ? units.find((u) => u.id === selectedUnitId) : floorUnits[0];
  const activeTenant = activeUnit?.currentTenantId
    ? tenants.find((t) => t.id === activeUnit.currentTenantId)
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Building Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            <span>Digital Building Twin & Spatial Model</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visual operational model: Property → Building → Floor → Unit → Asset → Real-time Services
          </p>
        </div>

        {/* Building Switcher */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Select Building:</label>
          <select
            value={selectedBuildingId}
            onChange={(e) => {
              setSelectedBuildingId(e.target.value);
              setSelectedFloor(1);
              setSelectedUnitId(null);
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.buildingCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Building Header Overview Card */}
      {selectedBuilding && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  {selectedBuilding.buildingCode}
                </span>
                <span className="text-slate-500">·</span>
                <h2 className="text-lg font-bold text-slate-100">{selectedBuilding.name}</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Located at {buildingProperty?.name || 'Property'} · {buildingProperty?.address}
              </p>
            </div>

            {/* Quick Metrics Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-2 rounded-lg">
                <div className="text-slate-400 text-[11px]">Floors</div>
                <div className="text-base font-bold text-slate-100 font-mono">
                  {selectedBuilding.floorsCount}
                </div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-2 rounded-lg">
                <div className="text-slate-400 text-[11px]">Occupancy</div>
                <div className="text-base font-bold text-emerald-400 font-mono">
                  {occupiedUnits} / {totalUnits} (
                  {totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0}%)
                </div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-2 rounded-lg">
                <div className="text-slate-400 text-[11px]">Open Requests</div>
                <div className="text-base font-bold text-slate-100 font-mono">{openRequestsCount}</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-2 rounded-lg">
                <div className="text-slate-400 text-[11px]">Critical Alerts</div>
                <div
                  className={`text-base font-bold font-mono ${
                    criticalCount > 0 ? 'text-rose-400' : 'text-slate-100'
                  }`}
                >
                  {criticalCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spatial Twin: Left Floors Stack, Right Floor Plan & Selected Unit Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Vertical Floor Stack (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Vertical Elevation</span>
            </div>
            <span className="text-[11px] text-slate-400">Select Floor</span>
          </div>

          <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
            {floorsList.map((floorNum) => {
              const fUnits = buildingUnits.filter((u) => u.floor === floorNum);
              const fOccupied = fUnits.filter((u) => u.status === 'occupied').length;
              const fVacant = fUnits.filter((u) => u.status === 'vacant').length;
              const isSelected = selectedFloor === floorNum;

              return (
                <div
                  key={floorNum}
                  onClick={() => {
                    setSelectedFloor(floorNum);
                    setSelectedUnitId(null);
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-sm'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-xs ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {floorNum}F
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Floor {floorNum}</div>
                      <div className="text-[10px] text-slate-400">
                        {fUnits.length} Units · {fOccupied} Occupied
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    {fVacant > 0 && (
                      <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded text-[10px]">
                        {fVacant} Vacant
                      </span>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Floor Layout & Unit Inspector (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Floor Plan Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <span>Floor {selectedFloor} Unit Directory</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({floorUnits.length} configured units)
                </span>
              </h3>
              <span className="text-xs text-slate-400">Click a unit to inspect equipment & tenant</span>
            </div>

            {floorUnits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No units assigned to Floor {selectedFloor} in the current dataset.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {floorUnits.map((u) => {
                  const isUnitSelected = (activeUnit?.id || floorUnits[0]?.id) === u.id;
                  const unitTenant = u.currentTenantId
                    ? tenants.find((t) => t.id === u.currentTenantId)
                    : null;

                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUnitId(u.id)}
                      className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                        isUnitSelected
                          ? 'border-emerald-500 bg-slate-800 shadow-md ring-1 ring-emerald-500/40'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-800/40 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-slate-100">
                          {u.unitNumber}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            u.status === 'occupied'
                              ? 'text-emerald-400 bg-emerald-950/60'
                              : u.status === 'vacant'
                              ? 'text-blue-400 bg-blue-950/60'
                              : 'text-amber-400 bg-amber-950/60'
                          }`}
                        >
                          {u.status}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-300 font-medium truncate">
                        {unitTenant ? unitTenant.name : 'Ready for Lease'}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono border-t border-slate-700/40 pt-1.5">
                        <span>{u.squareMeters} m²</span>
                        <span className="text-slate-200">
                          {formatCurrency(u.monthlyRent, currency, language)}/mo
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unit Deep-Dive Inspection Card */}
          {activeUnit && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                      Unit {activeUnit.unitNumber} Operational Snapshot
                    </h3>
                    <p className="text-xs text-slate-400">
                      Type: {activeUnit.type.replace('_', ' ')} · Floor {activeUnit.floor} · {activeUnit.squareMeters} m²
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('serviceDesk')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition-colors"
                  >
                    View Tickets
                  </button>
                  <button
                    onClick={() => setActiveTab('units')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Edit Unit Specs
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                {/* Current Occupant Details */}
                <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/50 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resident / Occupant Profile</span>
                  </div>
                  {activeTenant ? (
                    <div className="space-y-1 text-slate-300">
                      <div className="font-semibold text-slate-100 text-sm">{activeTenant.name}</div>
                      <div>Contact: {activeTenant.phone} · {activeTenant.email}</div>
                      <div>
                        Arrears / Balance:{' '}
                        <span
                          className={
                            activeTenant.outstandingBalance > 0
                              ? 'text-rose-400 font-bold font-mono'
                              : 'text-emerald-400 font-bold font-mono'
                          }
                        >
                          {formatCurrency(activeTenant.outstandingBalance, currency, language)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Emergency: {activeTenant.emergencyContact.name} ({activeTenant.emergencyContact.phone})
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 py-3">Unit is currently vacant. No active lease agreement.</div>
                  )}
                </div>

                {/* Key Assets in this Unit / Floor */}
                <div className="bg-slate-800/50 p-3.5 rounded-lg border border-slate-700/50 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Connected Equipment & Assets</span>
                  </div>
                  <div className="space-y-1 text-slate-300">
                    {activeUnit.keyAssetIds.length > 0 ? (
                      activeUnit.keyAssetIds.map((aId) => {
                        const assetObj = assets.find((a) => a.id === aId);
                        return (
                          <div key={aId} className="flex items-center justify-between py-1 border-b border-slate-700/40">
                            <span>{assetObj ? assetObj.name : aId}</span>
                            <span className="font-mono text-emerald-400 text-[10px]">Optimal</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-slate-400 py-2">
                        Common equipment (Carrier HVAC branch, digital sub-meter) operational.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
