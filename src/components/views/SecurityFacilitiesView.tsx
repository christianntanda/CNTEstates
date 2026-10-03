import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../i18n/translations';
import {
  ShieldAlert,
  Sparkles,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Trash2,
  Search,
} from 'lucide-react';

export const SecurityFacilitiesView: React.FC = () => {
  const { securityIncidents, facilityTasks, addSecurityIncident, language } = useApp();
  const [activeTabSub, setActiveTabSub] = useState<'security' | 'facilities'>('security');
  const [showAddIncidentModal, setShowAddIncidentModal] = useState(false);

  // Form state
  const [type, setType] = useState<any>('unauthorized_access');
  const [severity, setSeverity] = useState<any>('medium');
  const [propertyName, setPropertyName] = useState('Metropolitan Skyline Towers');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    addSecurityIncident({
      propertyId: 'prop-1',
      propertyName,
      type,
      severity,
      reportedBy: 'On-Duty Security Desk',
      status: 'investigating',
      description,
      actionTaken: actionTaken || 'Guard dispatched to verify zone perimeter.',
    });

    setShowAddIncidentModal(false);
    setDescription('');
    setActionTaken('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-400" />
            <span>Security Operations & Facilities Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Access control incidents, security patrols, cleaning checklists, and environmental waste operations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setActiveTabSub('security')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTabSub === 'security'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Security Incidents ({securityIncidents.length})
            </button>
            <button
              onClick={() => setActiveTabSub('facilities')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTabSub === 'facilities'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cleaning & Facilities ({facilityTasks.length})
            </button>
          </div>

          {activeTabSub === 'security' && (
            <button
              onClick={() => setShowAddIncidentModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Report Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-view: Security Incidents */}
      {activeTabSub === 'security' && (
        <div className="space-y-4">
          {securityIncidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-xs text-rose-400">[{inc.incidentNumber}]</span>
                  <h3 className="font-bold text-slate-100 text-sm">{inc.type.replace('_', ' ').toUpperCase()}</h3>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                      inc.severity === 'critical' || inc.severity === 'high'
                        ? 'text-rose-400 bg-rose-950 border border-rose-900'
                        : 'text-amber-400 bg-amber-950 border border-amber-900'
                    }`}
                  >
                    Severity: {inc.severity}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-semibold uppercase px-2.5 py-1 rounded self-start sm:self-auto ${
                    inc.status === 'resolved' || inc.status === 'closed'
                      ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900'
                      : 'text-amber-400 bg-amber-950/60 border border-amber-900'
                  }`}
                >
                  {inc.status}
                </span>
              </div>

              <p className="text-xs text-slate-300">{inc.description}</p>

              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 text-xs text-slate-300">
                <strong className="text-emerald-400 block mb-0.5">Intervention & Operational Action:</strong>
                {inc.actionTaken}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2 font-mono">
                <span>Location: {inc.propertyName}</span>
                <span>Reported By: {inc.reportedBy}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-view: Facility & Cleaning Management */}
      {activeTabSub === 'facilities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facilityTasks.map((task) => (
            <div
              key={task.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
                    {task.category}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Cycle: {task.frequency}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100">{task.area}</h3>
                <p className="text-xs text-slate-400">Assigned Team: {task.assignedStaff}</p>

                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Routine Procedure Checklist
                  </div>
                  {task.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Facility: {task.propertyName}</span>
                <span className="text-emerald-400 font-semibold uppercase text-[10px]">{task.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Incident Modal */}
      {showAddIncidentModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Report Security / Safety Incident</span>
            </h3>

            <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Incident Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="unauthorized_access">Unauthorized Access</option>
                    <option value="cctv_alert">CCTV Video Glitch</option>
                    <option value="vandalism">Vandalism / Property Damage</option>
                    <option value="parking_violation">Parking Space Violation</option>
                    <option value="water_leak">Water Ingress / Hazard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Incident Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail exact zone, times, persons or vehicle tags observed..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Immediate Action Taken</label>
                <input
                  type="text"
                  placeholder="e.g. Guard dispatched, access badge suspended"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddIncidentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold shadow-sm"
                >
                  File Incident Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
