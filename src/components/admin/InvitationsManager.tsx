import React, { useState } from 'react';
import {
  UserPlus,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Phone,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  ExternalLink,
  Users,
  TrendingUp,
} from 'lucide-react';
import { PlatformInvitation } from '../../types';
import { storage, safeCopyToClipboard } from '../../lib/storage';
import { translations, Language } from '../../lib/i18n';

interface InvitationsManagerProps {
  lang: Language;
}

export const InvitationsManager: React.FC<InvitationsManagerProps> = ({ lang }) => {
  const t = translations[lang];

  const [invitations, setInvitations] = useState<PlatformInvitation[]>(() => storage.getInvitations());
  const [stages] = useState(() => storage.getStages());

  // Form states for creating a new invitation
  const [targetRole, setTargetRole] = useState<PlatformInvitation['role']>('rider');
  const [targetName, setTargetName] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [targetStage, setTargetStage] = useState('Kikyusa Main Stage');
  const [customNote, setCustomNote] = useState('');

  // UI state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Metrics
  const totalSent = invitations.length;
  const registeredCount = invitations.filter((i) => i.status === 'registered' || i.status === 'approved').length;
  const pendingCount = invitations.filter((i) => i.status === 'pending').length;
  const approvedCount = invitations.filter((i) => i.status === 'approved').length;
  const conversionRate = totalSent > 0 ? Math.round((registeredCount / totalSent) * 100) : 0;

  // Generate unique invite code
  const generateInviteCode = (role: PlatformInvitation['role']) => {
    const prefix = role === 'rider' ? 'RIDER' : role === 'stage_leader' ? 'STAGE' : role === 'mechanic' ? 'MECH' : role === 'delivery' ? 'DELIV' : 'PASS';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `BODA-${prefix}-${randomNum}`;
  };

  const handleCreateInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    const code = generateInviteCode(targetRole);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bodacare.ug';
    const shareUrl = `${origin}/?invite=${code}&role=${targetRole}`;

    const newInvite: PlatformInvitation = {
      id: `inv-${Date.now()}`,
      code,
      role: targetRole,
      targetName: targetName.trim() || undefined,
      targetPhone: targetPhone.trim() || undefined,
      targetStage: targetRole === 'rider' || targetRole === 'stage_leader' ? targetStage : undefined,
      note: customNote.trim() || undefined,
      createdDate: new Date().toISOString().split('T')[0],
      createdBy: 'Brian Mukisa (Founder)',
      status: 'pending',
      shareUrl,
      channel: 'whatsapp',
    };

    storage.createInvitation(newInvite);
    setInvitations(storage.getInvitations());
    setShowCreateModal(false);
    setTargetName('');
    setTargetPhone('');
    setCustomNote('');
  };

  const handleCopy = (code: string, url: string) => {
    safeCopyToClipboard(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const getInviteMessage = (invite: PlatformInvitation) => {
    const roleLabels: Record<PlatformInvitation['role'], string> = {
      rider: 'boda-boda operator',
      passenger: 'passenger',
      stage_leader: 'stage chairperson',
      mechanic: 'motorcycle mechanic / garage owner',
      delivery: 'parcel delivery operator',
      super_admin: 'system administrator',
    };

    return `Hello ${invite.targetName || 'Friend'}, you have been officially invited by Brian Mukisa (Founder) to join BodaCare Uganda as a verified ${roleLabels[invite.role]} in Luweero!\n\nYour Registration Code: ${invite.code}\nJoin here: ${invite.shareUrl}\n\nWebale nnyo! Welcome to modern digital boda operations.`;
  };

  const handleWhatsApp = (invite: PlatformInvitation) => {
    const text = encodeURIComponent(getInviteMessage(invite));
    const cleanPhone = invite.targetPhone ? invite.targetPhone.replace(/[^0-9]/g, '') : '';
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleSms = (invite: PlatformInvitation) => {
    const text = encodeURIComponent(getInviteMessage(invite));
    const cleanPhone = invite.targetPhone ? invite.targetPhone.replace(/[^0-9]/g, '') : '';
    const url = cleanPhone ? `sms:${cleanPhone}?body=${text}` : `sms:?body=${text}`;
    window.location.href = url;
  };

  const handleMarkApproved = (id: string) => {
    storage.updateInvitationStatus(id, 'approved');
    setInvitations(storage.getInvitations());
  };

  const filteredInvitations = invitations.filter((inv) => {
    const matchesSearch =
      inv.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.targetName && inv.targetName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inv.targetPhone && inv.targetPhone.includes(searchQuery)) ||
      (inv.registeredUserName && inv.registeredUserName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Strip */}
      <div className="bg-[#0B192C] text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Referral & Community Growth Engine
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-300">Luweero Expansion</span>
          </div>
          <h2 className="text-xl font-extrabold text-white mt-1">
            Official Invitation & Registration Tracking
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Issue unique codes, dispatch WhatsApp invitations, and track member onboarding progress.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Create New Invitation</span>
        </button>
      </div>

      {/* 2. Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Invites Sent</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">{totalSent}</p>
          <p className="text-[11px] text-slate-400 mt-1">Unique codes issued</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Registered</span>
          <p className="text-2xl font-extrabold text-indigo-700 mt-1 font-mono">{registeredCount}</p>
          <p className="text-[11px] text-indigo-600 mt-1 font-semibold">{conversionRate}% conversion rate</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-300 shadow-sm bg-amber-50/40">
          <span className="text-[11px] font-bold text-amber-800 uppercase">Pending Signup</span>
          <p className="text-2xl font-extrabold text-amber-900 mt-1 font-mono">{pendingCount}</p>
          <p className="text-[11px] text-amber-700 mt-1">Awaiting registration</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-300 shadow-sm bg-emerald-50/40">
          <span className="text-[11px] font-bold text-emerald-800 uppercase">Approved Members</span>
          <p className="text-2xl font-extrabold text-emerald-900 mt-1 font-mono">{approvedCount}</p>
          <p className="text-[11px] text-emerald-700 mt-1 font-semibold">Active in Luweero</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Channels Used</span>
          <p className="text-sm font-bold text-slate-800 mt-2">WhatsApp & SMS</p>
          <p className="text-[11px] text-slate-500 mt-1">Instant direct share</p>
        </div>
      </div>

      {/* 3. Search, Filter & Invitations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Invitations Ledger</h3>
            <p className="text-xs text-slate-500">
              Real invitation records with direct referral links and dispatch actions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search code, name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="registered">Registered</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                <th className="py-2.5 px-3">Referral Code</th>
                <th className="py-2.5 px-3">Target Role</th>
                <th className="py-2.5 px-3">Recipient & Contact</th>
                <th className="py-2.5 px-3">Stage / Location</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Registered User</th>
                <th className="py-2.5 px-3 text-right">Invite Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {inv.code}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">{inv.createdDate}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold capitalize text-slate-800">
                      {inv.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900">{inv.targetName || 'General Invite'}</span>
                    {inv.targetPhone && (
                      <span className="block text-[10px] text-slate-500 font-mono">{inv.targetPhone}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {inv.targetStage || 'Luweero District'}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        inv.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'registered'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {inv.registeredUserName ? (
                      <div>
                        <span className="font-bold text-slate-900">{inv.registeredUserName}</span>
                        <span className="block text-[10px] text-emerald-600 font-medium">Joined {inv.registeredDate}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Not yet registered</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => handleCopy(inv.code, inv.shareUrl)}
                      title="Copy Shareable Link"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedCode === inv.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleWhatsApp(inv)}
                      title="Send via WhatsApp"
                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleSms(inv)}
                      title="Send via SMS"
                      className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    {inv.status === 'registered' && (
                      <button
                        onClick={() => handleMarkApproved(inv.id)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Create Invitation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Issue Official BodaCare Invitation</h3>
            <p className="text-xs text-slate-500 mb-4">
              Generate a tracked invitation code and instant WhatsApp share link.
            </p>

            <form onSubmit={handleCreateInvitation} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Role to Invite:
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as PlatformInvitation['role'])}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  <option value="rider">Boda-Boda Operator (Rider)</option>
                  <option value="stage_leader">Stage Leader / Chairperson</option>
                  <option value="mechanic">Mechanic / Garage Owner</option>
                  <option value="delivery">Parcel Delivery Operator</option>
                  <option value="passenger">Passenger / Customer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Full Name (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ssebuwufu John"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Phone Number (+256):
                </label>
                <input
                  type="tel"
                  placeholder="+256 775 000 000"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              {(targetRole === 'rider' || targetRole === 'stage_leader') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designated Stage:
                  </label>
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  >
                    {stages.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name} ({st.subCounty})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Note (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Met at Kikyusa baraza; owns Bajaj Boxer"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors"
                >
                  Generate Invitation & Share Link
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
