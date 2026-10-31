import React, { useState } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  Megaphone,
  ShieldCheck,
  AlertCircle,
  Search,
  DollarSign,
  Download,
} from 'lucide-react';
import { Stage, RiderProfile, StageAnnouncement, StageAttendance } from '../../types';
import { storage } from '../../lib/storage';
import { formatUgx, translations, Language } from '../../lib/i18n';

interface StageLeaderDashboardProps {
  lang: Language;
}

export const StageLeaderDashboard: React.FC<StageLeaderDashboardProps> = ({ lang }) => {
  const t = translations[lang];

  const [stages] = useState<Stage[]>(() => storage.getStages());
  const [selectedStageId, setSelectedStageId] = useState<string>('stage-kikyusa-main');

  const currentStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  const [riders, setRiders] = useState<RiderProfile[]>(() =>
    storage.getRiders().filter((r) => r.stageId === currentStage.id)
  );

  const [announcements, setAnnouncements] = useState<StageAnnouncement[]>(() =>
    storage.getAnnouncements(currentStage.id)
  );

  // Daily attendance state mapping riderId -> status & feePaid
  const [attendance, setAttendance] = useState<Record<string, { status: 'present' | 'absent'; feePaid: boolean }>>(() => {
    const map: Record<string, { status: 'present' | 'absent'; feePaid: boolean }> = {};
    storage.getRiders().filter((r) => r.stageId === currentStage.id).forEach((r, idx) => {
      map[r.id] = {
        status: idx === 2 ? 'absent' : 'present',
        feePaid: idx !== 2,
      };
    });
    return map;
  });

  // Announcement Modal
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'urgent'>('normal');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRiders = riders.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.motorcycleReg.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPresent = Object.values(attendance).filter((a) => a.status === 'present').length;
  const totalWelfareCollected = Object.values(attendance).filter((a) => a.feePaid).length * currentStage.dailyWelfareFeeUgx;

  const toggleAttendanceStatus = (riderId: string) => {
    const current = attendance[riderId] || { status: 'present', feePaid: true };
    const nextStatus = current.status === 'present' ? 'absent' : 'present';
    setAttendance({
      ...attendance,
      [riderId]: {
        ...current,
        status: nextStatus,
        feePaid: nextStatus === 'present' ? current.feePaid : false,
      },
    });
  };

  const toggleWelfarePayment = (riderId: string) => {
    const current = attendance[riderId] || { status: 'present', feePaid: false };
    setAttendance({
      ...attendance,
      [riderId]: {
        ...current,
        feePaid: !current.feePaid,
      },
    });
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    const newAnn: StageAnnouncement = {
      id: `ann-${Date.now()}`,
      stageId: currentStage.id,
      title: annTitle.trim(),
      content: annContent.trim(),
      author: `${currentStage.leaderName} (Chairman)`,
      createdAt: new Date().toISOString(),
      priority: annPriority,
    };

    storage.addAnnouncement(newAnn);
    setAnnouncements(storage.getAnnouncements(currentStage.id));
    setAnnTitle('');
    setAnnContent('');
    setShowAnnounceModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Stage Leader Header */}
      <div className="bg-[#0B192C] text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Boda-Boda Stage Administration Hub
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-300">Luweero District</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">{currentStage.name}</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Stage Leader: <strong>{currentStage.leaderName}</strong> ({currentStage.leaderPhone})
          </p>
        </div>

        {/* Stage Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStageId}
            onChange={(e) => {
              setSelectedStageId(e.target.value);
              const found = stages.find((s) => s.id === e.target.value);
              if (found) {
                setRiders(storage.getRiders().filter((r) => r.stageId === found.id));
                setAnnouncements(storage.getAnnouncements(found.id));
              }
            }}
            className="bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.subCounty})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAnnounceModal(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Post Notice</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Registered Riders</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            {riders.length} Operators
          </p>
          <p className="text-xs text-slate-500 mt-2">All verified with Luweero DPC</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Today's Roll Call</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2 font-mono">
            {totalPresent} Present
          </p>
          <p className="text-xs text-slate-500 mt-2">Active on stage today</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Today's Welfare Fund</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-[#0B192C] mt-2 font-mono">
            {formatUgx(totalWelfareCollected)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Rate: {formatUgx(currentStage.dailyWelfareFeeUgx)}/day</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Monthly Reserve</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            {formatUgx(840000)}
          </p>
          <p className="text-xs text-emerald-600 font-semibold mt-2">Stanbic Luweero Account</p>
        </div>
      </div>

      {/* 3. Riders Roll Call & Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Daily Stage Attendance & Welfare Register
            </h3>
            <p className="text-xs text-slate-500">
              Record daily presence and UGX 1,000 welfare contribution for each rider.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by rider or plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                <th className="py-2.5 px-3">Rider Name</th>
                <th className="py-2.5 px-3">Motorcycle Plate</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Verification</th>
                <th className="py-2.5 px-3 text-center">Attendance</th>
                <th className="py-2.5 px-3 text-center">Welfare Paid</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRiders.map((rider) => {
                const att = attendance[rider.id] || { status: 'present', feePaid: true };
                return (
                  <tr key={rider.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {rider.fullName}
                      <span className="block text-[10px] text-slate-400 font-normal">{rider.phone}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {rider.motorcycleReg}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{rider.motorcycleMakeModel}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggleAttendanceStatus(rider.id)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                          att.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {att.status === 'present' ? 'Present' : 'Absent'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggleWelfarePayment(rider.id)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                          att.feePaid
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {att.feePaid ? 'Paid (UGX 1,000)' : 'Unpaid'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <a
                        href={`tel:${rider.phone}`}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Call
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Stage Announcements Notice Board */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Stage Announcements & Circulars</h3>
          </div>
          <button
            onClick={() => setShowAnnounceModal(true)}
            className="text-xs text-amber-700 font-semibold hover:underline cursor-pointer"
          >
            + New Announcement
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((ann) => (
            <div key={ann.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{ann.title}</span>
                {ann.priority === 'urgent' && (
                  <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded">
                    Urgent Notice
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                <span>By {ann.author}</span>
                <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Create Announcement Modal */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Broadcast Stage Announcement</h3>
            <p className="text-xs text-slate-500 mb-4">
              Sends an alert to all registered riders of {currentStage.name}.
            </p>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traffic Police Crackdown / General Assembly"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority:</label>
                <select
                  value={annPriority}
                  onChange={(e) => setAnnPriority(e.target.value as 'normal' | 'urgent')}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="normal">Normal Announcement</option>
                  <option value="urgent">Urgent Security / Emergency Warning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Type the message for your members..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Broadcast Announcement
                </button>
                <button
                  type="button"
                  onClick={() => setShowAnnounceModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
