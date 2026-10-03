import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../i18n/translations';
import {
  Award,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  FileText,
  FileWarning,
  Printer,
} from 'lucide-react';

export const ComplianceView: React.FC = () => {
  const { complianceCertificates, language, selectedPropertyId, openPrint } = useApp();
  const [jurisdiction, setJurisdiction] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredCertificates = complianceCertificates.filter((c) => {
    const matchesProperty = selectedPropertyId === 'all' || c.propertyId === selectedPropertyId;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesProperty && matchesStatus;
  });

  const getStatusBadge = (status: string, daysLeft: number) => {
    if (status === 'valid') {
      return (
        <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-900 text-[10px] font-semibold uppercase px-2 py-0.5 rounded flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Valid ({daysLeft}d left)</span>
        </span>
      );
    }
    if (status === 'expiring_soon') {
      return (
        <span className="text-amber-400 bg-amber-950/60 border border-amber-900 text-[10px] font-semibold uppercase px-2 py-0.5 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Expiring in {daysLeft}d</span>
        </span>
      );
    }
    return (
      <span className="text-rose-400 bg-rose-950/60 border border-rose-900 text-[10px] font-semibold uppercase px-2 py-0.5 rounded flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        <span>Expired / Action Req.</span>
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-400" />
            <span>Compliance, Certifications & Inspections</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configurable regulatory mandates: Fire safety codes, periodic elevator inspections (Cat 1/5), and liability insurance.
          </p>
        </div>

        {/* Jurisdiction Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Jurisdiction:</label>
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Universal / All Jurisdictions</option>
            <option value="nyc">New York City (FDNY / DOB)</option>
            <option value="florida">State of Florida (DCA)</option>
            <option value="eu">European Union Standards (CE)</option>
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
        {[
          { id: 'all', label: 'All Certificates' },
          { id: 'valid', label: 'Valid' },
          { id: 'expiring_soon', label: 'Expiring Soon' },
          { id: 'expired', label: 'Expired / Renewal Due' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
              statusFilter === tab.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Certificates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCertificates.map((cert) => (
          <div
            key={cert.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-slate-300">
                  {cert.certificateNumber}
                </span>
                {getStatusBadge(cert.status, cert.daysUntilExpiry)}
              </div>

              <h3 className="text-sm font-bold text-slate-100">{cert.title}</h3>

              <div className="text-xs text-slate-400 space-y-1">
                <div>Issuing Authority: <strong className="text-slate-200">{cert.issuingAuthority}</strong></div>
                <div>Property: <span className="text-slate-300">{cert.propertyName}</span></div>
                <div className="capitalize">Category: {cert.category.replace('_', ' ')}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Issued Date</span>
                <span>{formatDate(cert.issueDate, language)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Expiration Date</span>
                  <span className={cert.daysUntilExpiry <= 30 ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                    {formatDate(cert.expiryDate, language)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    openPrint({
                      type: 'compliance_dossier',
                      title: 'Statutory Building Compliance Inspection Dossier',
                      documentNumber: cert.certificateNumber,
                      propertyName: cert.propertyName,
                      date: cert.issueDate,
                      dueDate: cert.expiryDate,
                      sections: [
                        {
                          title: 'Statutory Authority & Certification',
                          items: [
                            { label: 'Certificate Ref #', value: cert.certificateNumber, highlight: true },
                            { label: 'Authority', value: cert.issuingAuthority },
                            { label: 'Classification', value: cert.category.toUpperCase() },
                            { label: 'Status', value: cert.status.toUpperCase() },
                            { label: 'Validity Window', value: `${cert.daysUntilExpiry} days remaining` },
                          ],
                        },
                        {
                          title: 'Statutory Inspection Directives',
                          checklist: [
                            { text: 'Mechanical and electrical systems tested under load', completed: true },
                            { text: 'Life safety and emergency egress clearances verified', completed: true },
                            { text: 'Fire suppression alarms and hydrants tested by municipal inspectors', completed: true },
                            { text: 'Elevator certificates current and registered with regional safety board', completed: true },
                          ],
                          notes: 'Certified compliant with national building regulations and occupational safety mandates.',
                        },
                      ],
                      meta: {
                        generatedBy: 'Central Regulatory & Compliance Registry',
                        signaturesRequired: ['Accredited Municipal Safety Inspector', 'Building Operations Director'],
                      },
                    });
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors cursor-pointer"
                  title="Print official compliance certificate dossier"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
