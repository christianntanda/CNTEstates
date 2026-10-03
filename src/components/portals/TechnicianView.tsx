import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../i18n/translations';
import {
  Smartphone,
  Wrench,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  Plus,
  Square,
  CheckSquare,
  FileCheck,
  User,
  Phone,
  Camera,
  Signature,
} from 'lucide-react';

export const TechnicianView: React.FC = () => {
  const { workOrders, updateWorkOrderStatus, toggleWorkOrderChecklist, currency, language } = useApp();
  const [timerSeconds, setTimerSeconds] = useState(3840); // 1h 4m
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);

  const activeJob = workOrders[0];

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-5">
      {/* Mobile Terminal Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-slate-100">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-blue-400" />
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-blue-400">
              Field Technician Terminal
            </div>
            <div className="font-semibold text-sm">Carlos Mendez (Tech #04)</div>
          </div>
        </div>

        <span className="font-mono text-xs text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded font-bold">
          ONLINE
        </span>
      </div>

      {activeJob && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-xs text-blue-400">{activeJob.workOrderNumber}</span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded text-blue-400 bg-blue-950 border border-blue-900">
              {activeJob.status}
            </span>
          </div>

          <div>
            <h2 className="text-base font-bold text-white">{activeJob.title}</h2>
            <p className="text-xs text-slate-400 mt-1">{activeJob.description}</p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-300 space-y-1">
            <div>Premises: <strong>{activeJob.propertyName} - Unit {activeJob.unitNumber}</strong></div>
            <div className="flex items-center gap-1 text-slate-400">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>Resident Hotline: +1 (555) 789-0123</span>
            </div>
          </div>

          {/* Real-time Work Timer */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Job Labor Timer
            </span>
            <div className="text-3xl font-extrabold font-mono text-emerald-400">
              {formatTimer(timerSeconds)}
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isTimerRunning ? 'Pause Stopwatch' : 'Resume Timer'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
              Safety & Verification Checklist
            </h3>
            <div className="space-y-2">
              {activeJob.checklist.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleWorkOrderChecklist(activeJob.id, idx)}
                  className="p-3 bg-slate-850 hover:bg-slate-800 rounded-lg border border-slate-700/60 flex items-center gap-3 text-xs text-slate-200 cursor-pointer transition-colors"
                >
                  {item.completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className={item.completed ? 'line-through text-slate-400' : ''}>
                    {item.item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Resident Digital Sign-off */}
          <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-bold">Resident Quality Acceptance:</span>
              {signedSuccess && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Signature Captured</span>
                </span>
              )}
            </div>

            {!signedSuccess ? (
              <button
                onClick={() => setSignedSuccess(true)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-blue-400 border border-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <span>Capture Tenant E-Signature</span>
              </button>
            ) : (
              <div className="p-3 bg-slate-950 rounded-lg border border-emerald-900/60 font-mono text-[11px] text-emerald-400 text-center">
                Signed on Screen: Elena Rostova (Verified {new Date().toLocaleTimeString()})
              </div>
            )}
          </div>

          <button
            onClick={() => updateWorkOrderStatus(activeJob.id, 'completed')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-colors"
          >
            Complete & Close Work Order
          </button>
        </div>
      )}
    </div>
  );
};
