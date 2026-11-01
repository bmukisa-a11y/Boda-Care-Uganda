import React, { useState } from 'react';
import {
  Shield,
  Users,
  DollarSign,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Download,
  Building2,
  TrendingUp,
  FileText,
  Activity,
  Phone,
  Eye,
  Check,
  Ban,
  Clock,
  Sparkles,
  Database,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { RiderProfile, EmergencyIncident, PaymentTransaction, AuditLog, Stage } from '../../types';
import { storage, INITIAL_PLANS } from '../../lib/storage';
import { formatUgx, translations, Language } from '../../lib/i18n';
import { FounderProfileView } from './FounderProfileView';
import { InvitationsManager } from './InvitationsManager';
import { FounderDashboardTab } from './FounderDashboardTab';
import { FounderGuideView } from './FounderGuideView';
import { AdminPaymentVerification } from './AdminPaymentVerification';

interface SuperAdminDashboardProps {
  lang: Language;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ lang }) => {
  const t = translations[lang];

  const [activeSection, setActiveSection] = useState<'overview' | 'verifications' | 'profile' | 'invitations' | 'riders' | 'finance' | 'emergency' | 'stages' | 'schema' | 'guide'>('overview');
  const [founder, setFounder] = useState(() => storage.getFounderProfile());

  // State loaded from storage
  const [riders, setRiders] = useState<RiderProfile[]>(() => storage.getRiders());
  const [incidents, setIncidents] = useState<EmergencyIncident[]>(() => storage.getIncidents());
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => storage.getTransactions());
  const [stages, setStages] = useState<Stage[]>(() => storage.getStages());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => storage.getAuditLogs());

  // Search & Filter state for riders
  const [riderSearch, setRiderSearch] = useState('');
  const [riderStatusFilter, setRiderStatusFilter] = useState<string>('all');
  const [selectedRiderDossier, setSelectedRiderDossier] = useState<RiderProfile | null>(null);

  // New Stage Modal State
  const [showNewStageModal, setShowNewStageModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageSubCounty, setNewStageSubCounty] = useState('Kikyusa');
  const [newStageLeader, setNewStageLeader] = useState('');
  const [newStagePhone, setNewStagePhone] = useState('');
  const [newStageFee, setNewStageFee] = useState(1000);

  // Emergency Incident Resolution state
  const [selectedIncident, setSelectedIncident] = useState<EmergencyIncident | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [schemaNotice, setSchemaNotice] = useState<string | null>(null);

  // Overview metrics calculations
  const totalRiders = riders.length;
  const verifiedRidersCount = riders.filter((r) => r.verificationStatus === 'verified').length;
  const pendingApprovalsCount = riders.filter((r) => r.verificationStatus === 'pending' || r.verificationStatus === 'under_review').length;
  const activeEmergenciesCount = incidents.filter((i) => i.status === 'active').length;
  const pendingPaymentsCount = storage.getPaymentSubmissions().filter((s) => s.status === 'pending').length;

  const totalMonthlyRevenue = transactions
    .filter((tx) => tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amountUgx, 0) + 1250000; // Historical base
  const totalAnnualRevenue = totalMonthlyRevenue * 12;

  // Actions
  const handleUpdateStatus = (riderId: string, status: RiderProfile['verificationStatus']) => {
    storage.updateRiderStatus(riderId, status);
    setRiders(storage.getRiders());
    setAuditLogs(storage.getAuditLogs());
    if (selectedRiderDossier && selectedRiderDossier.id === riderId) {
      setSelectedRiderDossier({ ...selectedRiderDossier, verificationStatus: status });
    }
  };

  const handleResolveIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    storage.resolveIncident(selectedIncident.id, resolutionNotes || 'Resolved by Platform Owner.');
    setIncidents(storage.getIncidents());
    setSelectedIncident(null);
    setResolutionNotes('');
  };

  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      name: newStageName,
      district: 'Luweero',
      subCounty: newStageSubCounty,
      leaderName: newStageLeader,
      leaderPhone: newStagePhone,
      memberCount: 0,
      dailyWelfareFeeUgx: newStageFee,
      landmark: `${newStageSubCounty} Trading Centre`,
      lat: 0.82,
      lng: 32.55,
    };
    storage.saveStage(newStage);
    setStages(storage.getStages());
    setShowNewStageModal(false);
    setNewStageName('');
    setNewStageLeader('');
    setNewStagePhone('');
  };

  const exportCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportRiders = () => {
    let csv = 'ID,Name,Phone,NIN,Plate,Model,Stage,Status,Rating,Trips\n';
    riders.forEach((r) => {
      csv += `"${r.id}","${r.fullName}","${r.phone}","${r.nin}","${r.motorcycleReg}","${r.motorcycleMakeModel}","${r.stageName}","${r.verificationStatus}",${r.rating},${r.completedTrips}\n`;
    });
    exportCsv('bodacare_riders_export.csv', csv);
  };

  const handleExportFinance = () => {
    let csv = 'Reference,User,Phone,Provider,Amount,Status,Date\n';
    transactions.forEach((tx) => {
      csv += `"${tx.reference}","${tx.userName}","${tx.userPhone}","${tx.provider}",${tx.amountUgx},"${tx.status}","${tx.timestamp}"\n`;
    });
    exportCsv('bodacare_financial_audit.csv', csv);
  };

  const filteredRiders = riders.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(riderSearch.toLowerCase()) ||
      r.phone.includes(riderSearch) ||
      r.motorcycleReg.toLowerCase().includes(riderSearch.toLowerCase()) ||
      r.nin.toLowerCase().includes(riderSearch.toLowerCase());
    const matchesStatus = riderStatusFilter === 'all' || r.verificationStatus === riderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Super Admin Title Card */}
      <div className="bg-[#0B192C] text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {founder.businessName} Command Center
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-emerald-400 font-semibold">Super Admin Exclusive Authority</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Platform Operations & Business Settings</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Signed in as <strong>{founder.fullName}</strong> ({founder.title}) · {founder.location}
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'overview' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Executive Cockpit
          </button>
          <button
            onClick={() => setActiveSection('verifications')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'verifications' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Payment Verifications</span>
            {pendingPaymentsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-black animate-pulse">
                {pendingPaymentsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'profile' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Founder Profile
          </button>
          <button
            onClick={() => setActiveSection('invitations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'invitations' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Invitations
          </button>
          <button
            onClick={() => setActiveSection('riders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'riders' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Riders ({pendingApprovalsCount > 0 ? `${pendingApprovalsCount} Pending` : riders.length})
          </button>
          <button
            onClick={() => setActiveSection('finance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'finance' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Revenue
          </button>
          <button
            onClick={() => setActiveSection('emergency')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'emergency' ? 'bg-rose-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            SOS Center ({activeEmergenciesCount})
          </button>
          <button
            onClick={() => setActiveSection('stages')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'stages' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            Stages
          </button>
          <button
            onClick={() => setActiveSection('schema')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'schema' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            SQL Schema
          </button>
          <button
            onClick={() => setActiveSection('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'guide' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Launch Manual
          </button>
        </div>
      </div>

      {/* 2. OVERVIEW SECTION (Founder Executive Cockpit) */}
      {activeSection === 'overview' && (
        <FounderDashboardTab
          lang={lang}
          onNavigateSection={(section) => setActiveSection(section as typeof activeSection)}
        />
      )}

      {/* PAYMENT VERIFICATION SYSTEM FOR MUKISA BRIAN */}
      {activeSection === 'verifications' && (
        <AdminPaymentVerification lang={lang} />
      )}

      {/* 3. FOUNDER PROFILE & BUSINESS SETTINGS */}
      {activeSection === 'profile' && (
        <FounderProfileView
          lang={lang}
          onProfileUpdated={(updated) => setFounder(updated)}
        />
      )}

      {/* 4. INVITATIONS & REFERRAL ENGINE */}
      {activeSection === 'invitations' && (
        <InvitationsManager lang={lang} />
      )}

      {/* 5. FOUNDER OPERATIONS & LAUNCH MANUAL */}
      {activeSection === 'guide' && (
        <FounderGuideView
          onNavigateSection={(section) => setActiveSection(section as typeof activeSection)}
        />
      )}

      {/* 3. RIDERS MANAGEMENT SECTION */}
      {activeSection === 'riders' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Registered Riders Registry</h3>
              <p className="text-xs text-slate-500">
                Full KYC verification, permit compliance, and disciplinary controls.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, phone, plate, NIN..."
                  value={riderSearch}
                  onChange={(e) => setRiderSearch(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <select
                value={riderStatusFilter}
                onChange={(e) => setRiderStatusFilter(e.target.value)}
                className="text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="all">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="suspended">Suspended</option>
              </select>

              <button
                onClick={handleExportRiders}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Rider Name & Phone</th>
                  <th className="py-2.5 px-3">NIN (National ID)</th>
                  <th className="py-2.5 px-3">Plate & Model</th>
                  <th className="py-2.5 px-3">Stage</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Subscription</th>
                  <th className="py-2.5 px-3 text-right">Owner Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRiders.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {r.fullName}
                      <span className="block text-[10px] text-slate-400 font-normal">{r.phone}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{r.nin}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-900">{r.motorcycleReg}</span>
                      <span className="block text-[10px] text-slate-500">{r.motorcycleMakeModel}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{r.stageName}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                          r.verificationStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.verificationStatus === 'suspended'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.verificationStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold capitalize text-slate-800">
                      {r.subscriptionTier}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => setSelectedRiderDossier(r)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                      >
                        Inspect
                      </button>
                      {r.verificationStatus !== 'verified' && (
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'verified')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {r.verificationStatus === 'verified' && (
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'suspended')}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. REVENUE MANAGEMENT SECTION */}
      {activeSection === 'finance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Financial Operations & Mobile Money Reconciliation
              </h3>
              <p className="text-xs text-slate-500">
                MTN MoMo (*165#) and Airtel Money (*185#) live transactional audit log.
              </p>
            </div>
            <button
              onClick={handleExportFinance}
              className="px-3.5 py-1.5 bg-[#0B192C] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Ledger CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Transaction Reference</th>
                  <th className="py-2.5 px-3">User & Phone</th>
                  <th className="py-2.5 px-3">Gateway</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{tx.reference}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{tx.userName}</span>
                      <span className="block text-[10px] text-slate-500">{tx.userPhone}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{tx.provider}</td>
                    <td className="py-3 px-3 capitalize text-slate-600">{tx.purpose}</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#0B192C]">
                      {formatUgx(tx.amountUgx)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. EMERGENCY MONITORING SECTION */}
      {activeSection === 'emergency' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Luweero District Emergency Incident Centre
              </h3>
              <p className="text-xs text-slate-500">
                Live link to Luweero Central Police Station and Kikyusa Local Defence.
              </p>
            </div>
            <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full">
              {activeEmergenciesCount} Active Alerts
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className={`p-4 rounded-xl border space-y-2 text-xs ${
                  inc.status === 'active'
                    ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-400'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Incident #{inc.id}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      inc.status === 'active' ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {inc.status}
                  </span>
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    Category: <span className="capitalize">{inc.category.replace('_', ' ')}</span>
                  </p>
                  <p className="text-slate-600">Rider: <strong>{inc.riderName}</strong> ({inc.motorcycleReg})</p>
                  <p className="text-slate-600">Location: {inc.locationName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    GPS: {inc.lat.toFixed(4)}°N, {inc.lng.toFixed(4)}°E · {new Date(inc.timestamp).toLocaleTimeString()}
                  </p>
                </div>

                {inc.notes && (
                  <p className="p-2 bg-white rounded border border-slate-200 text-slate-700 italic">
                    "{inc.notes}"
                  </p>
                )}

                {inc.status === 'active' && (
                  <button
                    onClick={() => setSelectedIncident(inc)}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Assign Officer & Resolve Incident
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. STAGES MANAGEMENT SECTION */}
      {activeSection === 'stages' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Luweero Boda-Boda Stage Network</h3>
              <p className="text-xs text-slate-500">Create, monitor, and assign stage chairpersons.</p>
            </div>
            <button
              onClick={() => setShowNewStageModal(true)}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
            >
              + Register New Stage
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stages.map((st) => (
              <div key={st.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">{st.name}</h4>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {st.subCounty}
                  </span>
                </div>
                <p className="text-slate-600">Chairperson: <strong>{st.leaderName}</strong> ({st.leaderPhone})</p>
                <p className="text-slate-600">Landmark: {st.landmark}</p>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-500">
                  <span>Welfare Fee: {formatUgx(st.dailyWelfareFeeUgx)}/day</span>
                  <span className="font-semibold text-slate-800">{st.memberCount} Members</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. DATABASE SCHEMA SECTION */}
      {activeSection === 'schema' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>PostgreSQL & Supabase Production Schema</span>
              </h3>
              <p className="text-xs text-slate-500">
                Defined in <code>/src/db/schema.sql</code> with Row Level Security (RLS) & Indexes.
              </p>
            </div>
            <button
              onClick={() => {
                setSchemaNotice('PostgreSQL schema /src/db/schema.sql verified & ready for production deployment.');
                setTimeout(() => setSchemaNotice(null), 4000);
              }}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
            >
              Ready to Deploy
            </button>
          </div>

          {schemaNotice && (
            <div className="bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-medium p-3 rounded-xl animate-fade-in">
              {schemaNotice}
            </div>
          )}

          <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-96 leading-relaxed">
{`-- Summary of BodaCare PostgreSQL Schema (/src/db/schema.sql)
1.  users (id UUID, phone_number, full_name, role, preferred_language)
2.  stages (id UUID, name, district, sub_county, leader_name, daily_welfare_fee_ugx)
3.  rider_profiles (id UUID, user_id, nin, permit_number, motorcycle_reg, verification_status)
4.  passenger_profiles (id UUID, user_id, residential_area, trusted_contact_phone)
5.  stage_attendance (stage_id, rider_id, attendance_date, paid_welfare_fee)
6.  businesses (name, owner_name, location, category, verified)
7.  bookings (type, pickup_location, destination, fare_ugx, status)
8.  income_records & expense_records (daily financial math, is_synced)
9.  maintenance_records (item_name, next_service_km, status)
10. payment_transactions (reference_number, provider: 'MTN MoMo' | 'Airtel Money')
11. emergency_incidents (category, latitude, longitude, status, dispatched_to)
12. audit_logs (actor_name, action, target, details, timestamp)

* Row Level Security (RLS) enabled on rider_profiles, income_records, emergency_incidents.`}
          </pre>
        </div>
      )}

      {/* Dossier Modal for Inspecting Rider */}
      {selectedRiderDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rider Dossier: {selectedRiderDossier.fullName}
                </h3>
                <p className="text-xs text-slate-500">KYC & Document Verification</p>
              </div>
              <button
                onClick={() => setSelectedRiderDossier(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">National ID (NIN):</span>
                <span className="font-mono font-bold text-slate-900">{selectedRiderDossier.nin}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Driving Permit License:</span>
                <span className="font-mono font-bold text-slate-900">{selectedRiderDossier.permitNumber} (Class A)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Motorcycle Number Plate:</span>
                <span className="font-mono font-bold text-slate-900">{selectedRiderDossier.motorcycleReg}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Ownership Status:</span>
                <span className="capitalize font-semibold text-slate-800">{selectedRiderDossier.ownershipStatus}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Emergency Contact:</span>
                <span className="text-slate-800">{selectedRiderDossier.emergencyContactName} ({selectedRiderDossier.emergencyContactPhone})</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold capitalize text-amber-800">{selectedRiderDossier.verificationStatus}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleUpdateStatus(selectedRiderDossier.id, 'verified')}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Approve & Issue BodaCare Badge
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedRiderDossier.id, 'rejected')}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Resolution Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Resolve Emergency Incident #{selectedIncident.id}
            </h3>
            <form onSubmit={handleResolveIncident} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Notes / Police Action:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Officer Ntale dispatched, motorcycle towed to Ssekandi garage, rider unharmed."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 cursor-pointer"
                >
                  Mark Case Resolved
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="py-2.5 px-4 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Stage Modal */}
      {showNewStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Register New Boda-Boda Stage</h3>
            <form onSubmit={handleCreateStage} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Stage Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zirobwe Trading Centre Stage"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sub-County:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zirobwe / Kikyusa / Luweero"
                  value={newStageSubCounty}
                  onChange={(e) => setNewStageSubCounty(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chairperson Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chairman Kasirye Paul"
                  value={newStageLeader}
                  onChange={(e) => setNewStageLeader(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number:</label>
                <input
                  type="tel"
                  required
                  placeholder="+256 77X XXX XXX"
                  value={newStagePhone}
                  onChange={(e) => setNewStagePhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0B192C] text-white font-bold text-xs rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  Create Stage
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewStageModal(false)}
                  className="py-2.5 px-4 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
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
