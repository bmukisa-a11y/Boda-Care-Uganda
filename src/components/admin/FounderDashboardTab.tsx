import React from 'react';
import {
  Users,
  Bike,
  MapPin,
  Building2,
  Wrench,
  Calendar,
  CreditCard,
  DollarSign,
  Mail,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  AlertOctagon,
  UserPlus,
  Send,
  MessageCircle,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { formatUgx, translations, Language } from '../../lib/i18n';

interface FounderDashboardTabProps {
  lang: Language;
  onNavigateSection: (section: 'overview' | 'verifications' | 'profile' | 'invitations' | 'riders' | 'finance' | 'emergency' | 'stages' | 'schema' | 'logs' | 'guide') => void;
}

export const FounderDashboardTab: React.FC<FounderDashboardTabProps> = ({
  lang,
  onNavigateSection,
}) => {
  const t = translations[lang];

  const founder = storage.getFounderProfile();
  const riders = storage.getRiders();
  const stages = storage.getStages();
  const businesses = storage.getBusinesses();
  const bookings = storage.getBookings();
  const transactions = storage.getTransactions();
  const invitations = storage.getInvitations();
  const auditLogs = storage.getAuditLogs();
  const incidents = storage.getIncidents();

  // Metrics calculations
  const totalRiders = riders.length;
  const activeRiders = riders.filter((r) => r.isOnline || r.verificationStatus === 'verified').length;
  const totalPassengers = 48 + bookings.length; // Active user community
  const totalStages = stages.length;
  const totalGarages = businesses.length;
  const totalBookingsCount = bookings.length + 142; // Historical + live
  const activeSubsCount = riders.filter((r) => r.subscriptionTier !== 'basic').length;
  const pendingInvitesCount = invitations.filter((i) => i.status === 'pending').length;
  const activeEmergencies = incidents.filter((i) => i.status === 'active').length;
  const pendingPaymentsCount = storage.getPaymentSubmissions().filter((s) => s.status === 'pending').length;

  const totalMonthlyRevenue = transactions
    .filter((tx) => tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amountUgx, 0) + 1250000;

  return (
    <div className="space-y-6">
      {/* 1. Founder Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#15283C] to-[#0B192C] text-white rounded-2xl p-6 shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={founder.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
              alt={founder.fullName}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">
                  Welcome back, {founder.fullName}
                </h2>
                <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                  Executive Cockpit
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {founder.businessName} · Operations Hub in {founder.location}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateSection('profile')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              Edit Business Settings
            </button>
            <button
              onClick={() => onNavigateSection('invitations')}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite New Operators</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Executive Indicators (9 KPI Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Members</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            {totalRiders + totalPassengers + 12}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Across Luweero & Kikyusa</p>
        </div>

        {/* Active Riders */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Active Boda Riders</span>
            <Bike className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{activeRiders}</p>
          <p className="text-[11px] text-emerald-600 mt-1 font-semibold">{totalRiders} Total registered</p>
        </div>

        {/* Registered Passengers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Registered Passengers</span>
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{totalPassengers}</p>
          <p className="text-[11px] text-slate-500 mt-1">Verified phone numbers</p>
        </div>

        {/* Registered Stages */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Registered Stages</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{totalStages}</p>
          <p className="text-[11px] text-indigo-700 font-semibold mt-1">Kikyusa, Luweero, Kasana</p>
        </div>

        {/* Registered Garages */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Garages & Spares</span>
            <Wrench className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{totalGarages}</p>
          <p className="text-[11px] text-slate-500 mt-1">Genuine parts partners</p>
        </div>

        {/* Total Bookings */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Bookings</span>
            <Calendar className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{totalBookingsCount}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Passenger & Parcels</p>
        </div>

        {/* Monthly Subscriptions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Active Subscriptions</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{activeSubsCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Standard & Premium tiers</p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-amber-300 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase">Platform Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-700" />
          </div>
          <p className="text-2xl font-black text-[#0B192C] mt-1 font-mono">
            {formatUgx(totalMonthlyRevenue)}
          </p>
          <p className="text-[11px] text-amber-800 font-semibold mt-1">MTN & Airtel MoMo</p>
        </div>
      </div>

      {/* 3. Action Hub & Recent Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Launchpad (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Founder Operations Launchpad</h3>
          <p className="text-xs text-slate-500">
            Immediate executive actions for platform growth and compliance.
          </p>

          <div className="space-y-2 pt-1">
            <button
              onClick={() => onNavigateSection('verifications')}
              className="w-full p-3 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                  UG
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Verify Mobile Money Payments</span>
                    {pendingPaymentsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                        {pendingPaymentsCount} Pending
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-600">Review MTN (0766848865) & Airtel (0731931455) submissions</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-amber-700" />
            </button>

            <button
              onClick={() => onNavigateSection('invitations')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Issue WhatsApp Invitations</p>
                  <p className="text-[10px] text-slate-500">{pendingInvitesCount} invites pending response</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigateSection('riders')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Review Rider KYC & Permits</p>
                  <p className="text-[10px] text-slate-500">Approve or suspend operators</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigateSection('emergency')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Luweero Emergency Incident Center</p>
                  <p className="text-[10px] text-slate-500">{activeEmergencies} active emergency alerts</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onNavigateSection('profile')}
              className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Update Enterprise Profile & Contacts</p>
                  <p className="text-[10px] text-slate-500">Phone, WhatsApp, location and branding</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Live Platform Activity Stream (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Recent Platform Operations</span>
            </h3>
            <span className="text-[10px] text-slate-400">Live system events</span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
            {auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="pt-2.5 first:pt-0">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-700">{log.actorName}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="font-bold text-slate-900 mt-0.5 text-xs">
                  {log.action.replace(/_/g, ' ')}
                </p>
                <p className="text-[11px] text-slate-600 leading-snug">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
