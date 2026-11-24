import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  Plus,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  FileText,
  Search,
  Filter,
  CreditCard,
  Building,
  Smartphone,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { RiderWallet, WalletTransaction, UserRole } from '../../types';
import { storage } from '../../lib/storage';

interface RiderWalletHubProps {
  currentRole: UserRole;
  riderId?: string;
  onOpenSubscription?: () => void;
}

export const RiderWalletHub: React.FC<RiderWalletHubProps> = ({
  currentRole,
  riderId = 'rider-kato-moses',
  onOpenSubscription
}) => {
  const [wallet, setWallet] = useState<RiderWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [activePeriod, setActivePeriod] = useState<'day' | 'week' | 'month'>('week');
  const [searchTx, setSearchTx] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Top Up Form State
  const [topUpNetwork, setTopUpNetwork] = useState<'MTN' | 'Airtel'>('MTN');
  const [topUpAmount, setTopUpAmount] = useState('20000');
  const [topUpSenderPhone, setTopUpSenderPhone] = useState('0774912304');
  const [topUpTxId, setTopUpTxId] = useState('');
  const [topUpError, setTopUpError] = useState('');
  const [topUpSuccess, setTopUpSuccess] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Withdraw Form State
  const [withdrawAmount, setWithdrawAmount] = useState('30000');
  const [withdrawNetwork, setWithdrawNetwork] = useState<'MTN' | 'Airtel'>('MTN');
  const [withdrawPhone, setWithdrawPhone] = useState('0774912304');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Copy helpers
  const [copiedMtn, setCopiedMtn] = useState(false);
  const [copiedAirtel, setCopiedAirtel] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, [riderId]);

  const loadWalletData = () => {
    const w = storage.getRiderWallet(riderId);
    const txs = storage.getWalletTransactions(riderId);
    setWallet(w);
    setTransactions(txs);
  };

  const handleCopy = (text: string, type: 'mtn' | 'airtel') => {
    storage.safeCopyToClipboard(text);
    if (type === 'mtn') {
      setCopiedMtn(true);
      setTimeout(() => setCopiedMtn(false), 2000);
    } else {
      setCopiedAirtel(true);
      setTimeout(() => setCopiedAirtel(false), 2000);
    }
  };

  // Submit Mobile Money Top Up with Strict Duplicate Transaction ID check
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTopUpError('');
    setTopUpSuccess('');

    const cleanTxId = topUpTxId.trim().toUpperCase();
    if (!cleanTxId) {
      setTopUpError('Transaction ID is required.');
      return;
    }

    const numAmount = Number(topUpAmount);
    if (isNaN(numAmount) || numAmount < 1000) {
      setTopUpError('Minimum top-up amount is UGX 1,000.');
      return;
    }

    setTopUpLoading(true);

    setTimeout(() => {
      // 1. Strict Duplicate Check across entire system
      const isDuplicate = storage.checkDuplicateTxId(cleanTxId);
      if (isDuplicate) {
        setTopUpError('This transaction ID has already been used. Please submit a valid transaction ID.');
        setTopUpLoading(false);
        return;
      }

      // 2. Deposit to wallet
      const res = storage.depositToWallet(
        riderId,
        numAmount,
        topUpNetwork,
        cleanTxId
      );

      if (!res.success) {
        setTopUpError(res.message);
        setTopUpLoading(false);
        return;
      }

      setTopUpSuccess(`UGX ${numAmount.toLocaleString()} successfully credited to your wallet!`);
      loadWalletData();
      setTopUpLoading(false);
      setTimeout(() => {
        setShowTopUpModal(false);
        setTopUpSuccess('');
        setTopUpTxId('');
      }, 1500);
    }, 800);
  };

  // Submit Withdrawal
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    const numAmount = Number(withdrawAmount);
    if (!wallet || numAmount > wallet.availableBalanceUgx) {
      setWithdrawError(`Insufficient wallet balance. You have UGX ${wallet?.availableBalanceUgx.toLocaleString() || 0}.`);
      return;
    }

    if (numAmount < 5000) {
      setWithdrawError('Minimum withdrawal is UGX 5,000.');
      return;
    }

    setWithdrawLoading(true);
    setTimeout(() => {
      const res = storage.deductWallet(
        riderId,
        numAmount,
        'withdrawal',
        `Cash-out to ${withdrawNetwork} (${withdrawPhone})`
      );

      if (!res.success) {
        setWithdrawError(res.message);
        setWithdrawLoading(false);
        return;
      }

      setWithdrawSuccess(`UGX ${numAmount.toLocaleString()} cash-out request sent to ${withdrawPhone}.`);
      loadWalletData();
      setWithdrawLoading(false);
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawSuccess('');
      }, 1500);
    }, 800);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTx.toLowerCase()) ||
      (tx.reference && tx.reference.toLowerCase().includes(searchTx.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || tx.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Calculate Period Summaries
  const calculateSummaries = () => {
    // Current period earnings and expenses
    const periodEarnings = activePeriod === 'day' ? 45000 : activePeriod === 'week' ? 285000 : 1150000;
    const periodExpenses = activePeriod === 'day' ? 12000 : activePeriod === 'week' ? 74000 : 310000;
    const netProfit = periodEarnings - periodExpenses;
    return { periodEarnings, periodExpenses, netProfit };
  };

  const { periodEarnings, periodExpenses, netProfit } = calculateSummaries();

  return (
    <div className="space-y-6">
      {/* Wallet Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold">
              <Wallet className="w-3.5 h-3.5" />
              <span>Module 6 • BodaCare Digital Wallet & Financial Hub</span>
            </div>

            <div>
              <span className="text-xs text-slate-300 font-medium block">Available Balance</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xs font-bold text-amber-400">UGX</span>
                <span className="text-3xl md:text-4xl font-black font-mono tracking-tight">
                  {(wallet?.availableBalanceUgx || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Owner: Kato Moses • ID: <span className="font-mono text-slate-300">BCU-LWR-0421</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowTopUpModal(true)}
              className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-400/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Top-Up (Mobile Money)</span>
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>Cash-Out</span>
            </button>
          </div>
        </div>

        {/* Quick Period Income vs Expense Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span>Gross Income</span>
              <span className="text-[10px] text-emerald-400 font-bold">This {activePeriod}</span>
            </div>
            <p className="text-lg font-bold font-mono text-emerald-400">
              UGX {periodEarnings.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span>Expenses & Fuel</span>
              <span className="text-[10px] text-rose-400 font-bold">This {activePeriod}</span>
            </div>
            <p className="text-lg font-bold font-mono text-rose-400">
              UGX {periodExpenses.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span>Take-Home Profit</span>
              <span className="text-[10px] text-amber-300 font-bold">Net Margin</span>
            </div>
            <p className="text-lg font-bold font-mono text-amber-300">
              UGX {netProfit.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Official Payment Details Card (Always Visible as required) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Official BodaCare Uganda Mobile Money Payment Details
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Account Name: <strong className="text-slate-800">Mukisa Brian</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MTN */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                MTN Mobile Money
              </span>
              <p className="text-base font-extrabold font-mono text-slate-900">0766848865</p>
              <p className="text-xs text-slate-600">Registered: Mukisa Brian</p>
            </div>
            <button
              onClick={() => handleCopy('0766848865', 'mtn')}
              className="px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedMtn ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMtn ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Airtel */}
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                Airtel Money
              </span>
              <p className="text-base font-extrabold font-mono text-slate-900">0731931455</p>
              <p className="text-xs text-slate-600">Registered: Mukisa Brian</p>
            </div>
            <button
              onClick={() => handleCopy('0731931455', 'airtel')}
              className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedAirtel ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAirtel ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Transaction Ledger & Audit Trail</h3>
            <p className="text-xs text-slate-500">
              Verified ledger records with strict duplicate transaction ID rejection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Tx ID or desc..."
                value={searchTx}
                onChange={(e) => setSearchTx(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Types</option>
              <option value="fare">Fares</option>
              <option value="topup">Top-Ups</option>
              <option value="subscription">Subscriptions</option>
              <option value="maintenance">Maintenance</option>
              <option value="withdrawal">Withdrawals</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No transactions matching the criteria.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isCredit = tx.type === 'credit';
              return (
                <div key={tx.id} className="p-4 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCredit
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900 text-xs">{tx.description}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        {tx.reference && (
                          <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            Ref: {tx.reference}
                          </span>
                        )}
                        <span className="capitalize px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {tx.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`font-mono font-bold text-sm ${
                        isCredit ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isCredit ? '+' : '-'} UGX {tx.amountUgx.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Bal: UGX {tx.balanceAfterUgx.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: TOP-UP VIA MOBILE MONEY */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Top-Up BodaCare Wallet</h3>
                  <p className="text-xs text-slate-500">Instant credit upon valid transaction ID verification</p>
                </div>
              </div>
              <button
                onClick={() => setShowTopUpModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Step 1 Instructions with Mukisa Brian Details */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
              <p className="font-bold text-slate-900">Step 1: Send Money to Platform Admin</p>
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200">
                <span className="font-mono text-amber-950">MTN: <strong>0766848865</strong> (Mukisa Brian)</span>
                <button
                  type="button"
                  onClick={() => handleCopy('0766848865', 'mtn')}
                  className="text-amber-800 text-[11px] font-bold underline"
                >
                  Copy
                </button>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 border border-rose-200">
                <span className="font-mono text-rose-950">Airtel: <strong>0731931455</strong> (Mukisa Brian)</span>
                <button
                  type="button"
                  onClick={() => handleCopy('0731931455', 'airtel')}
                  className="text-rose-800 text-[11px] font-bold underline"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Feedback messages */}
            {topUpError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{topUpError}</span>
              </div>
            )}

            {topUpSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{topUpSuccess}</span>
              </div>
            )}

            {/* Step 2 Submission Form */}
            <form onSubmit={handleTopUpSubmit} className="space-y-3.5 text-xs">
              <p className="font-bold text-slate-900">Step 2: Enter Payment Confirmation Details</p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Network</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTopUpNetwork('MTN')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      topUpNetwork === 'MTN'
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    MTN Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopUpNetwork('Airtel')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      topUpNetwork === 'Airtel'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Airtel Money
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Sent (UGX)</label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="500"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Your Registered Phone Number</label>
                <input
                  type="text"
                  required
                  value={topUpSenderPhone}
                  onChange={(e) => setTopUpSenderPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile Money Transaction ID (Required & Strictly Checked)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1928374650 or MP2409..."
                  value={topUpTxId}
                  onChange={(e) => setTopUpTxId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Copy exact transaction code from MTN / Airtel SMS. Duplicates will be rejected.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-md transition-colors cursor-pointer"
                >
                  {topUpLoading ? 'Verifying Transaction...' : 'Submit & Verify Top-Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: WITHDRAWAL / CASH OUT */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Cash-Out to Mobile Money</h3>
                  <p className="text-xs text-slate-500">Withdraw wallet balance to your phone</p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {withdrawError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            {withdrawSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{withdrawSuccess}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Withdrawal Amount (UGX)</label>
                <input
                  type="number"
                  required
                  min="5000"
                  max={wallet?.availableBalanceUgx || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Max available: UGX {(wallet?.availableBalanceUgx || 0).toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destination Phone Number</label>
                <input
                  type="text"
                  required
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition-colors cursor-pointer"
                >
                  {withdrawLoading ? 'Processing...' : 'Confirm Cash-Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
