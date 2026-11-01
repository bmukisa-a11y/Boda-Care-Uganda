import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Copy,
  Check,
  Eye,
  AlertCircle,
  DollarSign,
  Smartphone,
  UserCheck,
  FileText,
  X,
  ExternalLink,
  ChevronRight,
  History,
} from 'lucide-react';
import { PaymentSubmission, PaymentSubmissionStatus } from '../../types';
import { storage, safeCopyToClipboard } from '../../lib/storage';
import { formatUgx, Language } from '../../lib/i18n';

interface AdminPaymentVerificationProps {
  lang: Language;
}

export const AdminPaymentVerification: React.FC<AdminPaymentVerificationProps> = ({ lang }) => {
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>(() =>
    storage.getPaymentSubmissions()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [networkFilter, setNetworkFilter] = useState<string>('all');

  // Copy feedback state
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  // Modal states
  const [selectedScreenshot, setSelectedScreenshot] = useState<PaymentSubmission | null>(null);
  const [rejectingSubmission, setRejectingSubmission] = useState<PaymentSubmission | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [viewingMemberHistory, setViewingMemberHistory] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Calculations
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const approvedCount = submissions.filter((s) => s.status === 'approved').length;
  const rejectedCount = submissions.filter((s) => s.status === 'rejected').length;
  const totalApprovedValue = submissions
    .filter((s) => s.status === 'approved')
    .reduce((sum, s) => sum + s.amountUgx, 0);

  const handleCopyTx = (txId: string) => {
    safeCopyToClipboard(txId);
    setCopiedTxId(txId);
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  const handleApprove = (submission: PaymentSubmission) => {
    const res = storage.approvePayment(submission.id, 'Mukisa Brian');
    if (res.success) {
      setSubmissions(storage.getPaymentSubmissions());
      setActionSuccessMessage(
        `Approved payment ${submission.normalizedTxId} for ${submission.userName}. Subscription automatically activated!`
      );
      setTimeout(() => setActionSuccessMessage(null), 5000);
    }
  };

  const handleOpenReject = (submission: PaymentSubmission) => {
    setRejectingSubmission(submission);
    setRejectionNote(
      'Transaction amount does not match selected tier fee or was not found in telecom merchant statement.'
    );
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingSubmission || !rejectionNote.trim()) return;

    const res = storage.rejectPayment(
      rejectingSubmission.id,
      rejectionNote.trim(),
      'Mukisa Brian'
    );
    if (res.success) {
      setSubmissions(storage.getPaymentSubmissions());
      setActionSuccessMessage(
        `Rejected submission ${rejectingSubmission.normalizedTxId}. Note sent to member.`
      );
      setRejectingSubmission(null);
      setRejectionNote('');
      setTimeout(() => setActionSuccessMessage(null), 5000);
    }
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      sub.userName.toLowerCase().includes(q) ||
      sub.userPhone.includes(q) ||
      sub.normalizedTxId.toLowerCase().includes(q) ||
      sub.transactionId.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesNetwork = networkFilter === 'all' || sub.network === networkFilter;

    return matchesSearch && matchesStatus && matchesNetwork;
  });

  // Member history submissions
  const memberHistorySubmissions = viewingMemberHistory
    ? storage.getUserSubmissions(viewingMemberHistory)
    : [];

  return (
    <div className="space-y-6">
      {/* 1. Header & Authority Banner */}
      <div className="bg-[#0B192C] text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Exclusive Super Admin Authority: Mukisa Brian
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Mobile Money & Subscription Verification Desk
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Cross-verify rider and passenger MoMo transaction IDs against MTN (0766848865) and Airtel
            (0731931455) accounts.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shrink-0">
            <Clock className="w-4 h-4 animate-spin text-slate-950" />
            <span>{pendingCount} Payment(s) Awaiting Your Approval</span>
          </div>
        )}
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Pending Verification
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 font-mono">
            {pendingCount}
          </p>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">Requires admin review</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Approved Payments
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2 font-mono">
            {approvedCount}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">Accounts activated</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Rejected Payments
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-2 font-mono">
            {rejectedCount}
          </p>
          <p className="text-[11px] text-rose-600 font-semibold mt-1">Logged with admin notes</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Verified Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#0B192C] mt-2 font-mono">
            {formatUgx(totalApprovedValue)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Settled subscriptions</p>
        </div>
      </div>

      {/* 3. Search & Filtering Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by member name, phone, or transaction ID..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#0B192C] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>Pending</span>
              {pendingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-slate-950 text-amber-300 text-[10px] flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'approved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Rejected ({rejectedCount})
            </button>

            {/* Network Filter */}
            <select
              value={networkFilter}
              onChange={(e) => setNetworkFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="all">All Networks</option>
              <option value="MTN">MTN MoMo</option>
              <option value="Airtel">Airtel Money</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Payment Submissions ({filteredSubmissions.length})
          </h3>
          <span className="text-xs text-slate-500">
            Click &quot;Approve&quot; to automatically activate account
          </span>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            No payment submissions matched your search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Member Name & Contact</th>
                  <th className="py-3 px-4">Network & Amount</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Payment Time</th>
                  <th className="py-3 px-4">Proof / Screenshot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSubmissions.map((sub) => {
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Member Info */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{sub.userName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{sub.userPhone}</div>
                        <button
                          type="button"
                          onClick={() => setViewingMemberHistory(sub.userId || sub.userPhone)}
                          className="mt-1 text-[10px] text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3 h-3" />
                          <span>View Member History</span>
                        </button>
                      </td>

                      {/* Network & Amount */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-5 h-5 rounded font-black text-[9px] flex items-center justify-center ${
                              sub.network === 'MTN'
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {sub.network === 'MTN' ? 'M' : 'A'}
                          </span>
                          <span className="font-bold text-slate-900">{sub.network} MoMo</span>
                        </div>
                        <div className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                          {formatUgx(sub.amountUgx)}
                        </div>
                        <span className="text-[10px] text-slate-500">{sub.planName}</span>
                      </td>

                      {/* Transaction ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-slate-950 text-sm bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {sub.normalizedTxId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyTx(sub.normalizedTxId)}
                            title="Copy Transaction ID"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {copiedTxId === sub.normalizedTxId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                          ✓ Uniqueness Verified
                        </span>
                      </td>

                      {/* Payment Time */}
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        <div>{sub.paymentDateTime}</div>
                        <div className="text-[10px] text-slate-400">
                          Logged: {new Date(sub.submittedAt).toLocaleTimeString()}
                        </div>
                      </td>

                      {/* Proof / Screenshot */}
                      <td className="py-3 px-4">
                        {sub.screenshotUrl || sub.screenshotName ? (
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshot(sub)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Proof</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No file attached</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {sub.status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-max">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>Pending</span>
                          </span>
                        )}
                        {sub.status === 'approved' && (
                          <div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approved</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              by {sub.reviewedBy || 'Mukisa Brian'}
                            </span>
                          </div>
                        )}
                        {sub.status === 'rejected' && (
                          <div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1 w-max">
                              <XCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </span>
                            {sub.adminNotes && (
                              <p
                                className="text-[10px] text-rose-600 line-clamp-1 max-w-[140px] mt-0.5"
                                title={sub.adminNotes}
                              >
                                {sub.adminNotes}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {sub.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApprove(sub)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReject(sub)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg border border-rose-200 transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : sub.status === 'approved' ? (
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            Active in Ledger
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApprove(sub)}
                            className="px-2.5 py-1 text-[11px] text-slate-600 hover:text-slate-900 underline cursor-pointer"
                          >
                            Re-approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. REJECTION MODAL WITH MANDATORY ADMINISTRATIVE NOTE */}
      {rejectingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-rose-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-200" />
                <h3 className="text-base font-bold">Reject Payment Submission</h3>
              </div>
              <button
                onClick={() => setRejectingSubmission(null)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-5 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1">
                <div>
                  Member: <strong>{rejectingSubmission.userName}</strong> (
                  {rejectingSubmission.userPhone})
                </div>
                <div>
                  Transaction ID:{' '}
                  <strong className="font-mono">{rejectingSubmission.normalizedTxId}</strong>
                </div>
                <div>
                  Amount: <strong>{formatUgx(rejectingSubmission.amountUgx)}</strong> via{' '}
                  {rejectingSubmission.network} MoMo
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Administrative Rejection Note (Visible to Member) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Explain why this payment cannot be approved (e.g. Transaction amount does not match plan fee, Transaction ID was not found on telecom statement)..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  This explanation will appear prominently on the member&apos;s dashboard so they can
                  resubmit with a valid payment.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRejectingSubmission(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. PROOF / SCREENSHOT VIEWER MODAL */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Payment Receipt Proof</h3>
                <p className="text-xs text-amber-300">
                  {selectedScreenshot.userName} · {selectedScreenshot.normalizedTxId}
                </p>
              </div>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Simulated High-Fidelity Receipt Proof */}
              <div className="bg-slate-900 text-amber-300 rounded-2xl p-4 font-mono text-xs border border-amber-400/40 shadow-inner space-y-2">
                <div className="text-center pb-2 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  Official Telecom SMS Dispatch
                </div>
                <p className="text-white">
                  <strong>{selectedScreenshot.network} Mobile Money:</strong> You have transferred{' '}
                  <strong className="text-amber-400">
                    {formatUgx(selectedScreenshot.amountUgx)}
                  </strong>{' '}
                  to <strong>MUKISA BRIAN</strong> (
                  {selectedScreenshot.network === 'MTN' ? '0766848865' : '0731931455'}).
                </p>
                <div className="pt-1 flex justify-between text-slate-400 text-[11px]">
                  <span>Tx ID: {selectedScreenshot.normalizedTxId}</span>
                  <span>{selectedScreenshot.paymentDateTime}</span>
                </div>
              </div>

              {selectedScreenshot.screenshotUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={selectedScreenshot.screenshotUrl}
                    alt="Receipt Screenshot"
                    className="w-full max-h-64 object-cover"
                  />
                </div>
              )}

              <div className="flex gap-2">
                {selectedScreenshot.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApprove(selectedScreenshot);
                      setSelectedScreenshot(null);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Approve Payment Now
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedScreenshot(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MEMBER PAYMENT HISTORY MODAL */}
      {viewingMemberHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold">Member Payment History Audit</h3>
                  <p className="text-xs text-slate-300">Target: {viewingMemberHistory}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingMemberHistory(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {memberHistorySubmissions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No payment submissions found for this member ID.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {memberHistorySubmissions.map((hist) => (
                    <div key={hist.id} className="py-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {hist.normalizedTxId}
                          </span>
                          <span className="text-slate-500">
                            {hist.network} MoMo · {hist.planName}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          {formatUgx(hist.amountUgx)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Submitted: {new Date(hist.submittedAt).toLocaleString()}</span>
                        <span
                          className={`font-bold uppercase ${
                            hist.status === 'approved'
                              ? 'text-emerald-700'
                              : hist.status === 'pending'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          Status: {hist.status}
                        </span>
                      </div>

                      {hist.adminNotes && (
                        <div className="text-[11px] p-2 rounded bg-slate-50 border border-slate-200 text-slate-700">
                          <strong>Admin Note:</strong> {hist.adminNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 text-right">
              <button
                type="button"
                onClick={() => setViewingMemberHistory(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
