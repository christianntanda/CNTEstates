import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare,
  Send,
  Bell,
  Megaphone,
  Radio,
  Users,
  CheckCircle2,
  AlertTriangle,
  Mail,
} from 'lucide-react';

export const CommunicationsView: React.FC = () => {
  const { properties, tenants } = useApp();
  const [broadcastChannel, setBroadcastChannel] = useState<'app' | 'sms' | 'email'>('app');
  const [targetProperty, setTargetProperty] = useState('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const [announcements, setAnnouncements] = useState([
    {
      id: 'ann-1',
      title: 'Scheduled Water Valve Upgrades in North Tower',
      message: 'Domestic water service will be temporarily shut off between 10:00 - 13:00 tomorrow for riser maintenance.',
      property: 'Metropolitan Skyline Towers',
      timestamp: 'Yesterday at 15:40',
      type: 'warning',
      channel: 'App & SMS Notice',
    },
    {
      id: 'ann-2',
      title: 'Rooftop Solarium Lounge Private Event Reservation',
      message: 'The solarium lounge will be reserved for a private building event on Saturday evening from 18:00 onwards.',
      property: 'Metropolitan Skyline Towers',
      timestamp: '2 days ago',
      type: 'info',
      channel: 'In-App Bulletin',
    },
  ]);

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;

    setAnnouncements((prev) => [
      {
        id: `ann-${Date.now()}`,
        title: broadcastTitle,
        message: broadcastBody,
        property: targetProperty === 'all' ? 'All Portfolio Complexes' : 'Selected Property',
        timestamp: 'Just now',
        type: isEmergency ? 'emergency' : 'info',
        channel: `Multi-Channel Broadcast (${broadcastChannel.toUpperCase()})`,
      },
      ...prev,
    ]);

    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
    setBroadcastTitle('');
    setBroadcastBody('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-emerald-400" />
          <span>Communications & Multi-Channel Broadcast Center</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Publish building notices, dispatch emergency SMS broadcasts, and communicate directly with residents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Broadcast Composer (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Dispatch Resident Announcement</span>
          </h3>

          <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Target Audience</label>
              <select
                value={targetProperty}
                onChange={(e) => setTargetProperty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Properties ({tenants.length} Active Tenants)</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Delivery Channel</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'app', label: 'In-App' },
                  { id: 'sms', label: 'SMS Blast' },
                  { id: 'email', label: 'Email Digest' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setBroadcastChannel(c.id as any)}
                    className={`py-1.5 px-2 rounded border text-center font-medium transition-colors ${
                      broadcastChannel === c.id
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Notice Headline *</label>
              <input
                type="text"
                required
                placeholder="e.g. Scheduled Fire Alarm Audio Test"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Announcement Body *</label>
              <textarea
                required
                rows={4}
                placeholder="Write the full communication details..."
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="emergencyNotice"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
                className="rounded border-slate-700 text-rose-500 focus:ring-rose-500"
              />
              <label htmlFor="emergencyNotice" className="text-rose-400 font-semibold cursor-pointer">
                High-Priority Emergency Notice (Triggers immediate device push)
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Announcement</span>
            </button>

            {sentSuccess && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Notice successfully transmitted to all registered devices.</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Published Notices Feed (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-emerald-400" />
              <span>Published Portfolio Bulletins</span>
            </h3>
            <span className="text-xs text-slate-400">{announcements.length} active announcements</span>
          </div>

          <div className="space-y-3">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                    {item.type === 'emergency' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>{item.title}</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{item.timestamp}</span>
                </div>

                <p className="text-xs text-slate-300">{item.message}</p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/40 pt-2 font-mono">
                  <span>Target: {item.property}</span>
                  <span className="text-emerald-400">{item.channel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
