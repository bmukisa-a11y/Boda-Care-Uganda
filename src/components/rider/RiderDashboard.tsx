import React, { useState } from 'react';
import {
  Bike,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  PlusCircle,
  Wrench,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  ShieldCheck,
  Fuel,
  ArrowUpRight,
  WifiOff,
  Bell,
  RefreshCw,
  CreditCard,
} from 'lucide-react';
import { RiderProfile, IncomeRecord, ExpenseRecord, MaintenanceReminder, Booking, StageAnnouncement } from '../../types';
import { storage } from '../../lib/storage';
import { formatUgx, translations, Language } from '../../lib/i18n';
import { RiderPaymentHub } from './RiderPaymentHub';

interface RiderDashboardProps {
  lang: Language;
  onOpenSOS: () => void;
  onOpenPayment: () => void;
  isOffline: boolean;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({
  lang,
  onOpenSOS,
  onOpenPayment,
  isOffline,
}) => {
  const t = translations[lang];

  // Rider View Tab: Operations vs Payments
  const [activeView, setActiveView] = useState<'operations' | 'payments'>('operations');

  // Load rider: Kato Moses
  const [rider, setRider] = useState<RiderProfile>(() => {
    return storage.getRiders().find((r) => r.id === 'rider-kato-moses') || storage.getRiders()[0];
  });

  const [incomes, setIncomes] = useState<IncomeRecord[]>(() => storage.getIncome(rider.id));
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => storage.getExpenses(rider.id));
  const [maintenance, setMaintenance] = useState<MaintenanceReminder[]>(() => storage.getMaintenance(rider.id));
  const [bookings, setBookings] = useState<Booking[]>(() => storage.getBookings());
  const [announcements] = useState<StageAnnouncement[]>(() => storage.getAnnouncements(rider.stageId));

  // Modals for adding income & expense
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Income form state
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState<IncomeRecord['category']>('transport');
  const [incomeDesc, setIncomeDesc] = useState('');
  const [incomeMethod, setIncomeMethod] = useState<'cash' | 'mobile_money'>('cash');

  // Expense form state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseRecord['category']>('fuel');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Calculations
  const todayStr = new Date().toISOString().split('T')[0];

  const todayIncome = incomes
    .filter((i) => i.date === todayStr)
    .reduce((sum, item) => sum + item.amountUgx, 0);

  const todayExpenses = expenses
    .filter((e) => e.date === todayStr)
    .reduce((sum, item) => sum + item.amountUgx, 0);

  const todayNetProfit = todayIncome - todayExpenses;

  const totalWeeklyGross = incomes.reduce((sum, item) => sum + item.amountUgx, 0);
  const totalMonthlyGross = totalWeeklyGross + 185000; // Historical simulated base

  // Active bookings for this rider
  const myActiveBookings = bookings.filter(
    (b) => b.riderId === rider.id && (b.status === 'accepted' || b.status === 'arriving' || b.status === 'in_progress')
  );

  // Form Submissions
  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(incomeAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    const newRecord: IncomeRecord = {
      id: `inc-${Date.now()}`,
      riderId: rider.id,
      date: todayStr,
      category: incomeCategory,
      amountUgx: amount,
      description: incomeDesc.trim() || 'Daily transport earnings',
      paymentMethod: incomeMethod,
      isSynced: !isOffline,
    };

    if (isOffline) {
      storage.addToSyncQueue({ type: 'income', data: newRecord });
    } else {
      storage.addIncome(newRecord);
    }

    setIncomes([newRecord, ...incomes]);
    setIncomeAmount('');
    setIncomeDesc('');
    setShowIncomeModal(false);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(expenseAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    const newRecord: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      riderId: rider.id,
      date: todayStr,
      category: expenseCategory,
      amountUgx: amount,
      description: expenseDesc.trim() || 'Daily operating cost',
      isSynced: !isOffline,
    };

    if (isOffline) {
      storage.addToSyncQueue({ type: 'expense', data: newRecord });
    } else {
      storage.addExpense(newRecord);
    }

    setExpenses([newRecord, ...expenses]);
    setExpenseAmount('');
    setExpenseDesc('');
    setShowExpenseModal(false);
  };

  const handleTripProgress = (bookingId: string, nextStatus: Booking['status']) => {
    storage.updateBookingStatus(bookingId, nextStatus);
    setBookings(storage.getBookings());
    if (nextStatus === 'completed') {
      // Auto-add income
      const b = bookings.find((x) => x.id === bookingId);
      if (b) {
        const autoInc: IncomeRecord = {
          id: `inc-auto-${Date.now()}`,
          riderId: rider.id,
          date: todayStr,
          category: b.type === 'delivery' ? 'delivery' : 'transport',
          amountUgx: b.fareUgx,
          description: `Fare from ${b.pickupLocation} to ${b.destination}`,
          paymentMethod: 'cash',
          isSynced: true,
        };
        storage.addIncome(autoInc);
        setIncomes([autoInc, ...incomes]);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Rider Profile Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xl border-2 border-amber-300 shrink-0">
            KM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">{rider.fullName}</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
              <span>Plate: <strong className="text-amber-300 font-mono">{rider.motorcycleReg}</strong></span>
              <span>·</span>
              <span>{rider.motorcycleMakeModel}</span>
              <span>·</span>
              <span>Stage: <strong>{rider.stageName}</strong></span>
            </p>
          </div>
        </div>

        {/* Subscription & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <span className="text-slate-400 block text-[10px]">Subscription Status:</span>
            {rider.subscriptionStatus === 'pending_verification' ? (
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>Pending Verification</span>
              </span>
            ) : rider.subscriptionStatus === 'rejected' ? (
              <span className="font-bold text-rose-400">Rejected (Admin Note)</span>
            ) : (
              <span className="font-bold text-emerald-400 capitalize">{rider.subscriptionTier} Tier Active</span>
            )}
          </div>

          <button
            onClick={() => setActiveView('payments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer ${
              activeView === 'payments'
                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>MoMo & Subs</span>
          </button>

          <button
            onClick={onOpenPayment}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <span>{t.renewNow}</span>
          </button>

          <button
            onClick={onOpenSOS}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
            <span>Emergency SOS</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveView('operations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeView === 'operations'
              ? 'bg-[#0B192C] text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Daily Operations & Income Tracker
        </button>
        <button
          onClick={() => setActiveView('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeView === 'payments'
              ? 'bg-[#0B192C] text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-amber-500" />
          <span>Mobile Money & Subscription Hub</span>
          {rider.subscriptionStatus === 'pending_verification' && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          )}
        </button>
      </div>

      {/* Verification Alerts on Operations View */}
      {rider.subscriptionStatus === 'pending_verification' && activeView === 'operations' && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-950 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
            <span>
              Your Mobile Money subscription payment is under review by <strong>Mukisa Brian</strong>. Account activates automatically once approved.
            </span>
          </div>
          <button
            onClick={() => setActiveView('payments')}
            className="font-bold underline text-amber-900 hover:text-black cursor-pointer shrink-0 ml-2"
          >
            View Submission Status
          </button>
        </div>
      )}

      {rider.subscriptionStatus === 'rejected' && activeView === 'operations' && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between text-xs text-rose-950 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Payment verification note from Mukisa Brian: &quot;<strong>{rider.rejectionReason}</strong>&quot;
            </span>
          </div>
          <button
            onClick={() => setActiveView('payments')}
            className="font-bold underline text-rose-900 hover:text-black cursor-pointer shrink-0 ml-2"
          >
            Resubmit Payment
          </button>
        </div>
      )}

      {activeView === 'payments' ? (
        <RiderPaymentHub
          rider={rider}
          lang={lang}
          onOpenPaymentModal={onOpenPayment}
          onRefreshRider={() => setRider(storage.getRiders().find((r) => r.id === rider.id) || rider)}
        />
      ) : (
        <>
      {/* 2. Top KPI Cards: Today's Financial Math (Income, Expense, Net Profit) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Income */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.todayEarnings}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono tabular-nums">
            {formatUgx(todayIncome)}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">{incomes.filter((i) => i.date === todayStr).length} trips logged</span>
            <button
              onClick={() => setShowIncomeModal(true)}
              className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record</span>
            </button>
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.todayExpenses}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 font-mono tabular-nums">
            {formatUgx(todayExpenses)}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <span className="text-slate-500">Fuel & Stage fees</span>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="text-rose-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record</span>
            </button>
          </div>
        </div>

        {/* Daily Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-sm relative overflow-hidden bg-gradient-to-br from-amber-50/50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
              {t.netProfit} (Take-Home)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              UG
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 font-mono tabular-nums ${todayNetProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {formatUgx(todayNetProfit)}
          </p>
          <div className="mt-3 text-xs text-slate-600 pt-2 border-t border-amber-200 flex justify-between">
            <span>Formula:</span>
            <span className="font-semibold text-slate-700">Earnings - Expenses</span>
          </div>
        </div>

        {/* Monthly Projection */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {t.monthlyIncome}
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#0B192C] mt-2 font-mono tabular-nums">
            {formatUgx(totalMonthlyGross)}
          </p>
          <div className="mt-3 text-xs text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
            <span>Rating: ★ {rider.rating}</span>
            <span className="text-emerald-600 font-semibold">{rider.completedTrips} Trips Total</span>
          </div>
        </div>
      </div>

      {/* 3. Live Booking Requests in Progress */}
      {myActiveBookings.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400/80 rounded-2xl p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Active Customer Request in Progress
              </h3>
            </div>
            <span className="text-xs font-semibold text-amber-800">
              Trip #{myActiveBookings[0].id}
            </span>
          </div>

          {myActiveBookings.map((b) => (
            <div key={b.id} className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-slate-900">
                    {b.type === 'ride' ? 'Passenger Trip' : 'Parcel Delivery'}: {b.passengerName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Customer Phone: <strong className="text-slate-800">{b.passengerPhone}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-[#0B192C] font-mono">
                    {formatUgx(b.fareUgx)}
                  </span>
                  <p className="text-[11px] text-slate-500">{b.distanceKm} km trip</p>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-700">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Pickup: <strong>{b.pickupLocation}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Drop-off: <strong>{b.destination}</strong></span>
                </div>
              </div>

              {/* Status progression buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {b.status === 'accepted' && (
                  <button
                    onClick={() => handleTripProgress(b.id, 'arriving')}
                    className="px-4 py-2 bg-[#0B192C] text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    Mark "Arriving at Stage"
                  </button>
                )}
                {b.status === 'arriving' && (
                  <button
                    onClick={() => handleTripProgress(b.id, 'in_progress')}
                    className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-lg hover:bg-amber-400 cursor-pointer"
                  >
                    Start Ride / Depart
                  </button>
                )}
                {b.status === 'in_progress' && (
                  <button
                    onClick={() => handleTripProgress(b.id, 'completed')}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer"
                  >
                    Arrived Safely & Complete (Collect {formatUgx(b.fareUgx)})
                  </button>
                )}
                <a
                  href={`tel:${b.passengerPhone}`}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg"
                >
                  Call Passenger
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Split Grid: Income/Expense Log + Maintenance Reminders & Stage Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Ledger (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Today's Transactions Ledger</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowIncomeModal(true)}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 cursor-pointer"
                >
                  + Add Income
                </button>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 cursor-pointer"
                >
                  + Add Expense
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 mt-2 max-h-80 overflow-y-auto">
              {incomes.slice(0, 4).map((inc) => (
                <div key={inc.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                      IN
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{inc.description}</p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {inc.category} · {inc.paymentMethod} · {inc.date}
                        {!inc.isSynced && <span className="text-amber-600 font-bold ml-1">(Queued)</span>}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-600 font-mono">
                    +{formatUgx(inc.amountUgx)}
                  </span>
                </div>
              ))}

              {expenses.slice(0, 4).map((exp) => (
                <div key={exp.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                      OUT
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{exp.description}</p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {exp.category} · {exp.date}
                        {!exp.isSynced && <span className="text-amber-600 font-bold ml-1">(Queued)</span>}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-rose-600 font-mono">
                    -{formatUgx(exp.amountUgx)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stage Announcements Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  {rider.stageName} Notices
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Official Stage Channel</span>
            </div>

            <div className="space-y-2.5">
              {announcements.map((ann) => (
                <div key={ann.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{ann.title}</span>
                    {ann.priority === 'urgent' && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{ann.content}</p>
                  <p className="text-[10px] text-slate-400">By {ann.author}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Maintenance Radar & Welfare Tracker (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Maintenance Countdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Motorcycle Health & Service</h3>
              </div>
              <span className="text-xs font-mono text-slate-500">Bajaj BM150</span>
            </div>

            <div className="space-y-3">
              {maintenance.map((item) => (
                <div key={item.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{item.item}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        item.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : item.status === 'due_soon'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.status === 'overdue' ? 'Service Overdue' : item.status === 'due_soon' ? 'Due Soon' : 'Good'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{item.dueDate}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Est. Cost: {formatUgx(item.costEstimateUgx)}</span>
                    <span className="text-indigo-600 font-semibold">Ssekandi Garage Partner</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Welfare Pot Status */}
          <div className="bg-[#0B192C] text-white rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-amber-400">Daily Stage Welfare Pot</h4>
            <p className="text-xs text-slate-300">
              Kikyusa Main Stage welfare is paid up to date. You are eligible for emergency medical support and tyre loans.
            </p>
            <div className="pt-1 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
              <span>Fee: UGX 1,000 / day</span>
              <span className="text-emerald-400 font-semibold">Active Member</span>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* 5. Add Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">{t.recordIncome}</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add your passenger trips or parcel delivery collections.
            </p>

            <form onSubmit={handleAddIncome} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount in UGX:
                </label>
                <input
                  type="number"
                  step="500"
                  required
                  placeholder="e.g. 15000"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  className="w-full text-base font-mono font-bold p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category:</label>
                <select
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value as IncomeRecord['category'])}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="transport">Passenger Transport Trips</option>
                  <option value="delivery">Parcel / Produce Delivery</option>
                  <option value="other">Tips / Special Hire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method:</label>
                <select
                  value={incomeMethod}
                  onChange={(e) => setIncomeMethod(e.target.value as 'cash' | 'mobile_money')}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="cash">Cash Paid by Passenger</option>
                  <option value="mobile_money">MTN MoMo / Airtel Money</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Route Description:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4 trips between Kikyusa & Hospital"
                  value={incomeDesc}
                  onChange={(e) => setIncomeDesc(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Save Income
                </button>
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">{t.recordExpense}</h3>
            <p className="text-xs text-slate-500 mb-4">
              Track fuel, repairs, and daily stage dues to see real net profit.
            </p>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount in UGX:
                </label>
                <input
                  type="number"
                  step="500"
                  required
                  placeholder="e.g. 12000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full text-base font-mono font-bold p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category:</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as ExpenseRecord['category'])}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="fuel">Petrol / Fuel (Shell / Total)</option>
                  <option value="engine_oil">Engine Oil (Total 4T / 2T)</option>
                  <option value="repairs">Mechanic & Garage Repairs</option>
                  <option value="tyres">Tyre Puncture & Tubes</option>
                  <option value="stage_contribution">Stage Welfare Contribution</option>
                  <option value="rental">Motorcycle Rental Owner Fee</option>
                  <option value="loan_repayment">Boda Loan Installment</option>
                  <option value="other">Other Operating Cost</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Details / Vendor:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2.1 Litres at Shell Luweero"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Save Expense
                </button>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
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
