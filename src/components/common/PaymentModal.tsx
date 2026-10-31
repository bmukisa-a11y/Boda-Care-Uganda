import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Upload,
  Clock,
  ArrowRight,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { SubscriptionTier, PaymentSubmission } from '../../types';
import {
  storage,
  INITIAL_PLANS,
  OFFICIAL_PAYMENT_DETAILS,
  normalizeTransactionId,
} from '../../lib/storage';
import { formatUgx, Language } from '../../lib/i18n';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSuccess?: (tier: SubscriptionTier) => void;
  initialPlan?: SubscriptionTier;
  initialName?: string;
  initialPhone?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSuccess,
  initialPlan = 'standard',
  initialName,
  initialPhone,
}) => {
  const currentRider = storage.getRiders()[0]; // Default Kato Moses or current active rider

  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionTier>(initialPlan);
  const [network, setNetwork] = useState<'MTN' | 'Airtel'>('MTN');
  const [fullName, setFullName] = useState(initialName || currentRider?.fullName || 'Kato Moses');
  const [phone, setPhone] = useState(
    initialPhone || currentRider?.phone?.replace('+256 ', '') || '0774912304'
  );
  const [transactionId, setTransactionId] = useState('');
  const [paymentDateTime, setPaymentDateTime] = useState(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;
  });
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [copiedNetwork, setCopiedNetwork] = useState<string | null>(null);

  // Validation & Submission States
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<PaymentSubmission | null>(null);

  if (!isOpen) return null;

  const currentPlan = INITIAL_PLANS.find((p) => p.id === selectedPlanId) || INITIAL_PLANS[1];

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNetwork(type);
    setTimeout(() => setCopiedNetwork(null), 2500);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTransactionChange = (value: string) => {
    setTransactionId(value);
    setValidationError(null);

    // Live preview check if user has finished typing
    const normalized = normalizeTransactionId(value);
    if (normalized.length >= 6) {
      if (storage.isTransactionIdUsed(normalized)) {
        setValidationError(
          'This transaction ID has already been used. Please submit a valid transaction ID.'
        );
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (currentPlan.priceUgx === 0) {
      // Free basic tier auto-activates
      if (onSuccess) onSuccess('basic');
      onClose();
      return;
    }

    const normalized = normalizeTransactionId(transactionId);
    if (!normalized) {
      setValidationError('Mobile Money transaction ID is required.');
      return;
    }

    // Strict uniqueness check across entire application
    if (storage.isTransactionIdUsed(normalized)) {
      setValidationError(
        'This transaction ID has already been used. Please submit a valid transaction ID.'
      );
      return;
    }

    setIsSubmitting(true);

    const formattedPhone = phone.trim().startsWith('+256')
      ? phone.trim()
      : `+256 ${phone.trim().replace(/^0/, '')}`;

    setTimeout(() => {
      const result = storage.submitPayment({
        userId: currentRider?.id || 'user-kato-01',
        userName: fullName.trim(),
        userPhone: formattedPhone,
        network,
        amountUgx: currentPlan.priceUgx,
        transactionId: transactionId.trim(),
        paymentDateTime: paymentDateTime.replace('T', ' '),
        planId: selectedPlanId,
        planName: currentPlan.name,
        screenshotUrl: screenshotUrl || undefined,
        screenshotName: screenshotName || undefined,
      });

      setIsSubmitting(false);

      if (!result.success) {
        setValidationError(
          result.error ||
            'This transaction ID has already been used. Please submit a valid transaction ID.'
        );
        return;
      }

      setSubmittedRecord(result.submission || null);
      if (onSuccess) onSuccess(selectedPlanId);
    }, 700);
  };

  const resetForm = () => {
    setSubmittedRecord(null);
    setTransactionId('');
    setValidationError(null);
    setScreenshotUrl('');
    setScreenshotName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-[#0B192C] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-md">
              UG
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Mobile Money Subscription Payment
              </h2>
              <p className="text-xs text-amber-300 font-medium">
                Official BodaCare Payment & Verification Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {!submittedRecord ? (
            <>
              {/* SECTION 1: OFFICIAL ADMIN PAYMENT DETAILS (Prominently displayed) */}
              <div className="bg-gradient-to-br from-slate-900 to-[#0B192C] text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Official Admin Payment Details
                    </span>
                  </div>
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                    Verified Merchant
                  </span>
                </div>

                <div className="mb-3 text-xs text-slate-300">
                  Account Name:{' '}
                  <strong className="text-white text-sm">
                    {OFFICIAL_PAYMENT_DETAILS.accountName}
                  </strong>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* MTN MOBILE MONEY */}
                  <div className="bg-slate-800/90 rounded-xl p-3 border border-amber-400/40 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                          M
                        </span>
                        <span className="text-xs font-bold text-amber-300">
                          {OFFICIAL_PAYMENT_DETAILS.mtn.provider}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {OFFICIAL_PAYMENT_DETAILS.mtn.dialCode}
                      </span>
                    </div>

                    <p className="text-lg font-black text-white font-mono mt-2 tracking-wider">
                      {OFFICIAL_PAYMENT_DETAILS.mtn.number}
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Name: <strong>{OFFICIAL_PAYMENT_DETAILS.mtn.accountName}</strong>
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(OFFICIAL_PAYMENT_DETAILS.mtn.number, 'MTN')
                      }
                      className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedNetwork === 'MTN' ? (
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

                  {/* AIRTEL MONEY */}
                  <div className="bg-slate-800/90 rounded-xl p-3 border border-rose-500/40 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-rose-600 text-white font-black text-[10px] flex items-center justify-center">
                          A
                        </span>
                        <span className="text-xs font-bold text-rose-300">
                          {OFFICIAL_PAYMENT_DETAILS.airtel.provider}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {OFFICIAL_PAYMENT_DETAILS.airtel.dialCode}
                      </span>
                    </div>

                    <p className="text-lg font-black text-white font-mono mt-2 tracking-wider">
                      {OFFICIAL_PAYMENT_DETAILS.airtel.number}
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Name: <strong>{OFFICIAL_PAYMENT_DETAILS.airtel.accountName}</strong>
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(OFFICIAL_PAYMENT_DETAILS.airtel.number, 'Airtel')
                      }
                      className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedNetwork === 'Airtel' ? (
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

                <div className="mt-3 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Send mobile money directly to <strong>Mukisa Brian</strong>, copy the
                    Transaction ID from your SMS confirmation message, and submit it below for
                    instant verification.
                  </span>
                </div>
              </div>

              {/* SECTION 2: PAYMENT SUBMISSION FORM */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Plan Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
                    1. Select Subscription Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {INITIAL_PLANS.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400 font-bold'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                          }`}
                        >
                          <p className="text-xs text-slate-800">{plan.name}</p>
                          <p className="text-sm font-extrabold text-[#0B192C] font-mono mt-0.5">
                            {plan.priceUgx === 0 ? 'Free' : formatUgx(plan.priceUgx)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Payment Network Selection */}
                {currentPlan.priceUgx > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
                      2. Payment Network Used
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNetwork('MTN')}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          network === 'MTN'
                            ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                            MTN
                          </span>
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-900 block">
                              MTN Mobile Money
                            </span>
                            <span className="text-[10px] text-slate-500">0766848865</span>
                          </div>
                        </div>
                        {network === 'MTN' && (
                          <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setNetwork('Airtel')}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          network === 'Airtel'
                            ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center">
                            AIR
                          </span>
                          <div className="text-left">
                            <span className="text-xs font-bold text-slate-900 block">
                              Airtel Money
                            </span>
                            <span className="text-[10px] text-slate-500">0731931455</span>
                          </div>
                        </div>
                        {network === 'Airtel' && (
                          <CheckCircle2 className="w-4 h-4 text-rose-600" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Full Registered Name & Registered Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Registered Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Kato Moses"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        +256
                      </span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="774 912 304"
                        className="w-full pl-14 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Amount Paid & Payment Date/Time */}
                {currentPlan.priceUgx > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Amount Paid (UGX) <span className="text-rose-500">*</span>
                      </label>
                      <div className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-sm font-mono font-bold text-slate-900">
                        {formatUgx(currentPlan.priceUgx)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Payment Date & Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={paymentDateTime}
                        onChange={(e) => setPaymentDateTime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Mobile Money Transaction ID (REQUIRED) with strict duplicate prevention */}
                {currentPlan.priceUgx > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Mobile Money Transaction ID <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        From MTN / Airtel SMS
                      </span>
                    </div>

                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => handleTransactionChange(e.target.value)}
                      placeholder="e.g. MM982341029 or AT552910381"
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono tracking-wider uppercase font-bold focus:outline-none transition-all ${
                        validationError
                          ? 'border-rose-500 bg-rose-50/50 text-rose-900 ring-2 ring-rose-400'
                          : 'border-slate-300 focus:ring-2 focus:ring-amber-500'
                      }`}
                    />

                    {/* Strict Duplicate Warning Message */}
                    {validationError && (
                      <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">{validationError}</p>
                          <p className="text-[11px] text-rose-700 mt-0.5">
                            Every transaction ID must be unique. Duplicate submissions are strictly
                            blocked across all accounts.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Optional Screenshot Upload */}
                {currentPlan.priceUgx > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Confirmation Screenshot (Optional)
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center hover:bg-slate-50 transition-colors relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {screenshotUrl ? (
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{screenshotName || 'Screenshot attached successfully'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span>Click to attach SMS screenshot or payment receipt</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || Boolean(validationError)}
                    className="w-full py-3.5 bg-[#0B192C] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>
                          {currentPlan.priceUgx === 0
                            ? 'Activate Free Basic Account'
                            : `Submit ${formatUgx(currentPlan.priceUgx)} for Verification`}
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-500 mt-2">
                    Verified directly by Mukisa Brian (Founder & Super Admin). Status will display
                    &quot;Pending Verification&quot; immediately.
                  </p>
                </div>
              </form>
            </>
          ) : (
            /* SUBMISSION CONFIRMATION / PENDING VERIFICATION STATE */
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                  Status: Pending Verification
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  Payment Details Submitted!
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1">
                  Your payment has been logged securely and queued for administrative verification
                  by <strong>Mukisa Brian</strong>.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-left space-y-2.5">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800">BodaCare Uganda</span>
                  <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                    Pending Verification
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-mono font-black text-slate-900 uppercase">
                    {submittedRecord.normalizedTxId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Member:</span>
                  <span className="font-semibold text-slate-800">
                    {submittedRecord.userName} ({submittedRecord.userPhone})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Plan:</span>
                  <span className="font-semibold text-slate-800">{submittedRecord.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Submitted:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatUgx(submittedRecord.amountUgx)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telecom Network:</span>
                  <span className="font-semibold text-slate-800">
                    {submittedRecord.network} Mobile Money
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted At:</span>
                  <span className="font-mono text-slate-600">
                    {new Date(submittedRecord.submittedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Automatic Activation Notice */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-left text-xs text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Automatic Account Activation</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    As soon as Mukisa Brian approves this transaction, your account status will
                    automatically switch to &quot;Active&quot; and your 30-day subscription
                    privileges will be instantly unlocked.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Submit Another Payment
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
