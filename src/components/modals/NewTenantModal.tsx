import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, X, DollarSign, Home, Phone, Mail } from 'lucide-react';

export const NewTenantModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { properties, units, addTenant, currency } = useApp();

  const vacantUnits = units.filter((u) => u.status === 'vacant');
  const availableUnits = vacantUnits.length > 0 ? vacantUnits : units;

  const [name, setName] = useState('');
  const [isCompany, setIsCompany] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idDocumentNumber, setIdDocumentNumber] = useState('');
  const [unitId, setUnitId] = useState(availableUnits[0]?.id || '');
  const [monthlyRent, setMonthlyRent] = useState(availableUnits[0]?.monthlyRent || 2800);
  const [depositAmount, setDepositAmount] = useState(availableUnits[0]?.monthlyRent || 2800);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [occupantsCount, setOccupantsCount] = useState(2);

  const selectedUnit = units.find((u) => u.id === unitId) || units[0];
  const selectedProperty = properties.find((p) => p.id === selectedUnit?.propertyId) || properties[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    addTenant(
      {
        organizationId: 'org-1',
        name,
        isCompany,
        email,
        phone: phone || '+1 (555) 000-0000',
        emergencyContact: {
          name: emergencyName || 'Next of Kin',
          relationship: 'Emergency Contact',
          phone: emergencyPhone || '+1 (555) 111-2222',
        },
        unitId: selectedUnit.id,
        propertyId: selectedProperty.id,
        leaseId: '',
        idDocumentNumber: idDocumentNumber || 'ID-DOC-PENDING',
        occupantsCount: Number(occupantsCount),
        vehicles: [],
        outstandingBalance: 0,
        paymentStatus: 'paid',
        depositHeld: Number(depositAmount),
        rating: 5,
      },
      {
        tenantId: '',
        tenantName: name,
        propertyId: selectedProperty.id,
        propertyName: selectedProperty.name,
        unitId: selectedUnit.id,
        unitNumber: selectedUnit.unitNumber,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        monthlyRent: Number(monthlyRent),
        depositAmount: Number(depositAmount),
        escalationRatePercent: 4.5,
        paymentDueDay: 1,
        status: 'active',
        documents: ['Residential_Tenancy_Agreement.pdf'],
        specialClauses: ['Standard quiet hours apply', 'No unauthorized sub-letting permitted'],
      }
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-base">Register Tenant & Issue Lease</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Entity Classification</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsCompany(false)}
                className={`py-1.5 px-3 rounded-lg border text-center font-medium transition-colors ${
                  !isCompany
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                Individual Resident
              </button>
              <button
                type="button"
                onClick={() => setIsCompany(true)}
                className={`py-1.5 px-3 rounded-lg border text-center font-medium transition-colors ${
                  isCompany
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                Corporate / Entity
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Full Legal Name *</label>
            <input
              type="text"
              required
              placeholder={isCompany ? 'e.g. Acme Innovations Corp.' : 'e.g. Samantha Hayes'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Email *</label>
              <input
                type="email"
                required
                placeholder="tenant@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Mobile Phone *</label>
              <input
                type="text"
                required
                placeholder="+1 (555) 234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Assigned Premises Unit *</label>
            <select
              value={unitId}
              onChange={(e) => {
                setUnitId(e.target.value);
                const matchU = units.find((u) => u.id === e.target.value);
                if (matchU) {
                  setMonthlyRent(matchU.monthlyRent);
                  setDepositAmount(matchU.monthlyRent);
                }
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {availableUnits.map((u) => {
                const p = properties.find((prop) => prop.id === u.propertyId);
                return (
                  <option key={u.id} value={u.id}>
                    {p?.name} - Unit {u.unitNumber} ({u.status})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Agreed Monthly Rent ({currency}) *</label>
              <input
                type="number"
                required
                min="100"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Security Deposit ({currency}) *</label>
              <input
                type="number"
                required
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">ID / Passport / EIN</label>
              <input
                type="text"
                placeholder="ID-994102"
                value={idDocumentNumber}
                onChange={(e) => setIdDocumentNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Occupants Count</label>
              <input
                type="number"
                min="1"
                value={occupantsCount}
                onChange={(e) => setOccupantsCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm"
            >
              Execute Lease & Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
