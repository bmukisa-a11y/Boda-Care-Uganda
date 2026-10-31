import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  PlusCircle,
  Smartphone,
  Calendar,
  AlertCircle,
  Info,
} from 'lucide-react';
import { RiderProfile, PaymentSubmission } from '../../types';
import {
  storage,
  OFFICIAL_PAYMENT_DETAILS,
  INITIAL_PLANS,
} from '../../lib/storage';
import { formatUgx, Language } from '../../lib/i18n';

interface RiderPaymentHubProps {
  rider: RiderProfile;
  lang: Language;
  onOpenPaymentModal: () => void;
  onRefreshRider?: () => void;
}

export const RiderPaymentHub: React.FC<RiderPaymentHubProps> = ({
  rider,
  lang,
  onOpenPaymentModal,
  onRefreshRider,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Fetch user's payment submissions
  const submissions: PaymentSubmission[] = storage.getUserSubmissions(rider.id);
  const latestSubmission = submissions[0];

  // Derive current status
  const effectiveStatus =
    rider.subscriptionStatus ||
    (latestSubmission?.status === 'pending'
      ? 'pending_verification'
      : latestSubmission?.status === 'rejected'
      ? 'rejected'
      : rider.subscriptionTier !== 'basic'
      ? 'active'
      : 'none');

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const currentPlan =
    INITIAL_PLANS.find((p) => p.id === rider.subscriptionTier) || INITIAL_PLANS[1];

  return (
    <div className="space-y-6">
      {/* 1. CURRENT SUBSCRIPTION STATUS HERO CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {effectiveStatus === 'pending_verification' && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-950/15 flex items-center justify-center shrink-0">
                  <Clock className="w-7 h-7 text-slate-950 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-950 text-amber-300">
                      Pending Verification
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      Under Review by Mukisa Brian
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-950 mt-1">
                    Payment Verification in Progress
                  </h3>
                  <p className="text-xs text-slate-900/90 mt-0.5 max-w-xl">
                    Your Mobile Money payment details have been submitted. Once administrator{' '}
                    <strong>Mukisa Brian</strong> confirms receipt with telecom records, your
                    account will be automatically activated.
                  </p>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-3 text-xs space-y-1 text-slate-900 border border-amber-300 shrink-0">
                <div className="text-[10px] text-slate-600 uppercase font-bold tracking-wider">
                  Submitted Transaction ID
                </div>
                <div className="font-mono font-black text-sm tracking-wide">
                  {latestSubmission?.normalizedTxId || 'MM-TX-SUBMITTED'}
                </div>
                <div className="text-[11px] text-slate-600">
                  Plan: <strong>{latestSubmission?.planName || currentPlan.name}</strong> (
                  {formatUgx(latestSubmission?.amountUgx || currentPlan.priceUgx)})
                </div>
              </div>
            </div>
          </div>
        )}

        {effectiveStatus === 'active' && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-7 h-7 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-emerald-800">
                      Active & Verified
                    </span>
                    <span className="text-xs text-emerald-200">
                      30-Day Platform Access
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">
                    {currentPlan.name} Subscription
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Your subscription is active and verified. Top search placement, maintenance
                    tracking, and emergency dispatch are unlocked.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <div className="bg-emerald-950/40 border border-emerald-400/30 rounded-xl p-3 text-right">
                  <span className="text-[10px] text-emerald-200 uppercase tracking-wider block">
                    Valid Until:
                  </span>
                  <span className="text-sm font-mono font-bold text-white">
                    {rider.subscriptionExpiry || '2026-11-28'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenPaymentModal}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Renew / Extend Subscription
                </button>
              </div>
            </div>
          </div>
        )}

        {effectiveStatus === 'rejected' && (
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <XCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-rose-800">
                      Verification Rejected
                    </span>
                    <span className="text-xs text-rose-200">Action Required</span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">
                    Payment Verification Rejected
                  </h3>
                  <div className="mt-2 p-3 rounded-xl bg-rose-950/50 border border-rose-400/40 text-xs">
                    <span className="text-rose-300 font-bold block mb-0.5">
                      Administrative Note from Mukisa Brian:
                    </span>
                    <p className="text-white italic">
                      &quot;{rider.rejectionReason || latestSubmission?.adminNotes || 'Transaction details did not match telecom records. Please submit a valid transaction ID.'}&quot;
                    </p>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={onOpenPaymentModal}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Resubmit Valid Payment</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {effectiveStatus === 'none' && (
          <div className="bg-gradient-to-r from-slate-900 to-[#0B192C] text-white p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-7 h-7" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-800 text-amber-300">
                    Free Basic Tier
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">
                    Upgrade to Verified BodaCare Rider
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                    Get the official Verified Badge on the passenger app, access emergency police
                    dispatch, and receive discounts at Luweero garages for only UGX 5,000/month.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-colors cursor-pointer shrink-0"
              >
                Pay via Mobile Money
              </button>
            </div>
          </div>
        )}

        {/* Status Details Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Selected Plan</span>
            <span className="font-bold text-slate-900">{currentPlan.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Monthly Rate</span>
            <span className="font-mono font-bold text-slate-900">
              {currentPlan.priceUgx === 0 ? 'Free' : formatUgx(currentPlan.priceUgx)}/mo
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Verification Authority</span>
            <span className="font-semibold text-slate-900">Mukisa Brian (Founder)</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Expiry Date</span>
            <span className="font-mono font-bold text-slate-900">
              {rider.subscriptionExpiry || 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. OFFICIAL PAYMENT INSTRUCTIONS & RECIPIENT NUMBERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-500" />
              <span>How to Pay BodaCare Uganda via Mobile Money</span>
            </h3>
            <p className="text-xs text-slate-500">
              Send payments exclusively to official administrator Mukisa Brian:
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="px-3.5 py-2 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Submit Payment Verification</span>
          </button>
        </div>

        {/* Numbers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MTN */}
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
                  MTN
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {OFFICIAL_PAYMENT_DETAILS.mtn.provider}
                </span>
              </div>
              <span className="text-[10px] font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                Dial *165#
              </span>
            </div>

            <div className="mt-3">
              <span className="text-slate-500 text-[11px] block">Payment Number:</span>
              <span className="text-xl font-mono font-black text-slate-900 tracking-wider">
                {OFFICIAL_PAYMENT_DETAILS.mtn.number}
              </span>
              <span className="text-xs text-slate-600 block mt-0.5">
                Account Name: <strong>{OFFICIAL_PAYMENT_DETAILS.accountName}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(OFFICIAL_PAYMENT_DETAILS.mtn.number, 'MTN')}
              className="mt-3 w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedType === 'MTN' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Copied 0766848865!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy MTN Number</span>
                </>
              )}
            </button>
          </div>

          {/* Airtel */}
          <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/40 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                  AIR
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {OFFICIAL_PAYMENT_DETAILS.airtel.provider}
                </span>
              </div>
              <span className="text-[10px] font-mono bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-bold">
                Dial *185#
              </span>
            </div>

            <div className="mt-3">
              <span className="text-slate-500 text-[11px] block">Payment Number:</span>
              <span className="text-xl font-mono font-black text-slate-900 tracking-wider">
                {OFFICIAL_PAYMENT_DETAILS.airtel.number}
              </span>
              <span className="text-xs text-slate-600 block mt-0.5">
                Account Name: <strong>{OFFICIAL_PAYMENT_DETAILS.accountName}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(OFFICIAL_PAYMENT_DETAILS.airtel.number, 'Airtel')}
              className="mt-3 w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedType === 'Airtel' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied 0731931455!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Airtel Number</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3 Step Instruction Guide */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-[#0B192C] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="font-bold text-slate-900">Send Mobile Money</p>
              <p className="text-[11px] text-slate-500">
                Transfer the exact subscription fee to Mukisa Brian via MTN or Airtel.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-[#0B192C] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="font-bold text-slate-900">Copy Transaction ID</p>
              <p className="text-[11px] text-slate-500">
                Open your telecom SMS receipt and copy the unique Transaction ID code.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-[#0B192C] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="font-bold text-slate-900">Automatic Activation</p>
              <p className="text-[11px] text-slate-500">
                Submit above. Mukisa Brian approves and your account is instantly activated!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PAYMENT SUBMISSION HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Payment Submission History</h3>
            <p className="text-xs text-slate-500">
              Audit log of all Mobile Money submissions made for this account
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            {submissions.length} submission(s)
          </span>
        </div>

        {submissions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No payment submissions recorded yet. Click &quot;Submit Payment Verification&quot; above
            after sending Mobile Money.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {submissions.map((sub) => (
              <div key={sub.id} className="py-3.5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-md font-black text-[10px] flex items-center justify-center ${
                        sub.network === 'MTN'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {sub.network === 'MTN' ? 'M' : 'A'}
                    </span>
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {sub.normalizedTxId}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        {sub.planName} · {sub.network} MoMo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatUgx(sub.amountUgx)}
                    </span>
                    {sub.status === 'approved' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Approved</span>
                      </span>
                    )}
                    {sub.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>Pending</span>
                      </span>
                    )}
                    {sub.status === 'rejected' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
                  {sub.reviewedBy && (
                    <span>
                      Reviewed by: <strong>{sub.reviewedBy}</strong>
                    </span>
                  )}
                  {sub.reviewedAt && (
                    <span>Reviewed: {new Date(sub.reviewedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {/* Admin Note if Rejected or Approved with comment */}
                {sub.adminNotes && (
                  <div
                    className={`p-2.5 rounded-lg text-xs ${
                      sub.status === 'rejected'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span className="font-bold">Admin Note:</span> {sub.adminNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
