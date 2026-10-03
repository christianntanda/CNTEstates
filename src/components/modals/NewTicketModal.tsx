import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TicketPriority } from '../../types';
import { LifeBuoy, X, AlertTriangle, Clock } from 'lucide-react';

export const NewTicketModal: React.FC<{ defaultUnitId?: string; onClose: () => void }> = ({
  defaultUnitId,
  onClose,
}) => {
  const { properties, units, tenants, addServiceTicket } = useApp();

  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [unitId, setUnitId] = useState(defaultUnitId || units[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<any>('plumbing');
  const [priority, setPriority] = useState<TicketPriority>('normal');

  const selectedProp = properties.find((p) => p.id === propertyId);
  const selectedUnit = units.find((u) => u.id === unitId);
  const matchedTenant = tenants.find((t) => t.unitId === unitId);

  // Compute SLA hours
  const getSlaHours = (p: TicketPriority) => {
    switch (p) {
      case 'emergency':
        return 4;
      case 'critical':
        return 8;
      case 'high':
        return 24;
      case 'normal':
        return 72;
      case 'low':
        return 168;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const slaHours = getSlaHours(priority);
    const slaTargetTime = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

    addServiceTicket({
      propertyId,
      propertyName: selectedProp?.name || 'Metropolitan Skyline Towers',
      buildingId: selectedUnit?.buildingId || 'bld-1',
      unitId,
      unitNumber: selectedUnit?.unitNumber || 'Common Area',
      tenantId: matchedTenant?.id || 'sys-op',
      tenantName: matchedTenant?.name || 'Property Operations',
      title,
      description,
      category,
      priority,
      status: 'new',
      slaTargetHours: slaHours,
      slaTargetTime,
      photos: [],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-base">Dispatch Building Service Request</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block text-slate-400 mb-1">Unit / Zone</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unitNumber} ({u.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC / Cooling</option>
                <option value="elevator">Elevators</option>
                <option value="generator">Backup Generator</option>
                <option value="fire_systems">Fire Protection</option>
                <option value="cctv_security">Access / CCTV</option>
                <option value="appliances">Appliances</option>
                <option value="cleaning">Cleaning / Waste</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Priority / Urgency</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="emergency">Emergency (4h SLA)</option>
                <option value="critical">Critical (8h SLA)</option>
                <option value="high">High (24h SLA)</option>
                <option value="normal">Normal (72h SLA)</option>
                <option value="low">Low (7d SLA)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Issue Headline *</label>
            <input
              type="text"
              required
              placeholder="e.g. Water leak under bathroom vanity sink"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Detailed Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Describe symptoms, exact location, when problem started..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm"
            >
              Dispatch Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
