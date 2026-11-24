import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  MailCheck,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  WelcomeAccountCategory,
  WelcomeChannel,
  WelcomeDashboardPayload,
  WelcomeNotificationRecord,
  WelcomeSettingsConfig,
} from '../../types';

const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-admin-id': 'admin-founder-mukisa',
  'x-admin-role': 'super_admin',
  'x-actor-name': 'Brian Mukisa (Super Admin)',
};

const TEMPLATE_TOKENS = ['{{name}}', '{{category}}', '{{registrationDate}}', '{{brandName}}', '{{memberId}}', '{{location}}'];

export const AdminWelcomeMessages: React.FC = () => {
  const [dashboard, setDashboard] = useState<WelcomeDashboardPayload | null>(null);
  const [settingsForm, setSettingsForm] = useState<WelcomeSettingsConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Manual Resend State
  const [resendCategory, setResendCategory] = useState<WelcomeAccountCategory>('rider');
  const [resendRecipientId, setResendRecipientId] = useState<string>('');
  const [resendChannels, setResendChannels] = useState<WelcomeChannel[]>(['in_app', 'sms', 'whatsapp']);

  // Log Filters
  const [filterCategory, setFilterCategory] = useState<'all' | WelcomeAccountCategory>('all');
  const [filterChannel, setFilterChannel] = useState<'all' | WelcomeChannel>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const showToast = (type: 'success' | 'warning' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/welcome/dashboard', { headers: ADMIN_HEADERS });
      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok || !contentType.includes('application/json')) {
        throw new Error('Backend unreachable');
      }
      const data = (await resp.json()) as WelcomeDashboardPayload;
      setDashboard(data);
      setSettingsForm(data.settings);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Keep selected resend recipient aligned with chosen category
  useEffect(() => {
    if (!dashboard) return;
    if (resendCategory === 'rider') {
      if (!dashboard.members.riders.some((r) => r.id === resendRecipientId)) {
        setResendRecipientId(dashboard.members.riders[0]?.id || '');
      }
    } else {
      if (!dashboard.members.passengers.some((p) => p.id === resendRecipientId)) {
        setResendRecipientId(dashboard.members.passengers[0]?.id || '');
      }
    }
  }, [dashboard, resendCategory, resendRecipientId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      const resp = await fetch('/api/welcome/settings', {
        method: 'PUT',
        headers: ADMIN_HEADERS,
        body: JSON.stringify(settingsForm),
      });
      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok || !contentType.includes('application/json')) {
        throw new Error('Unable to save Welcome Messaging settings.');
      }
      const json = (await resp.json()) as { dashboard?: WelcomeDashboardPayload; settings?: WelcomeSettingsConfig };
      if (json.dashboard) setDashboard(json.dashboard);
      if (json.settings) setSettingsForm(json.settings);
      showToast('success', 'Welcome message templates & notification channels saved.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResend = async (
    targetId: string,
    targetCategory: WelcomeAccountCategory,
    channelsToUse: WelcomeChannel[]
  ) => {
    if (!targetId) {
      showToast('warning', 'Select a registered member first.');
      return;
    }
    if (channelsToUse.length === 0) {
      showToast('warning', 'Select at least one notification channel (In-App, SMS, or WhatsApp).');
      return;
    }
    setResending(true);
    try {
      const resp = await fetch('/api/welcome/resend', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          recipientId: targetId,
          accountCategory: targetCategory,
          channels: channelsToUse,
        }),
      });
      const contentType = resp.headers.get('content-type') || '';
      const json = contentType.includes('application/json') ? await resp.json() : {};
      if (!resp.ok) {
        throw new Error(json.error || 'Failed to resend welcome message.');
      }
      if (json.dashboard) setDashboard(json.dashboard);
      showToast('success', 'Personalized welcome notification dispatched & logged.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Resend failed.');
    } finally {
      setResending(false);
    }
  };

  const handleRetryFailed = async (recordIds?: string[]) => {
    setRetrying(true);
    try {
      const resp = await fetch('/api/welcome/retry', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify(recordIds ? { recordIds } : {}),
      });
      const contentType = resp.headers.get('content-type') || '';
      const json = contentType.includes('application/json') ? await resp.json() : {};
      if (!resp.ok) {
        throw new Error(json.error || 'No failed or unconfigured records available to retry.');
      }
      if (json.dashboard) setDashboard(json.dashboard);
      showToast('success', `Retried ${json.retriedCount ?? 0} welcome notification(s).`);
    } catch (err) {
      showToast('warning', err instanceof Error ? err.message : 'Retry skipped.');
    } finally {
      setRetrying(false);
    }
  };

  const insertToken = (field: 'riderTemplate' | 'passengerTemplate', token: string) => {
    if (!settingsForm) return;
    setSettingsForm({
      ...settingsForm,
      [field]: `${settingsForm[field]} ${token}`.trim(),
    });
  };

  const toggleResendChannel = (ch: WelcomeChannel) => {
    setResendChannels((prev) => (prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]));
  };

  const renderPreview = (template: string, category: WelcomeAccountCategory) => {
    const sampleDate = new Date().toISOString().split('T')[0];
    return template
      .replace(/\{\{name\}\}/gi, category === 'rider' ? 'Kato Moses' : 'Babirye Prossy')
      .replace(/\{\{category\}\}/gi, category === 'rider' ? 'Rider' : 'Customer / Passenger')
      .replace(/\{\{registrationDate\}\}/gi, sampleDate)
      .replace(/\{\{brandName\}\}/gi, 'BodaCare Uganda')
      .replace(/\{\{memberId\}\}/gi, category === 'rider' ? 'BCU-RDR-1042' : 'BCU-PAS-2081')
      .replace(/\{\{location\}\}/gi, 'Kikyusa, Luweero');
  };

  const renderStatusPill = (rec: WelcomeNotificationRecord) => {
    if (rec.status === 'delivered' || rec.status === 'sent') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
          <CheckCircle2 className="w-3 h-3" />
          {rec.status}
        </span>
      );
    }
    if (rec.status === 'blocked_unconfigured') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 uppercase">
          <AlertTriangle className="w-3 h-3" />
          Awaiting Gateway
        </span>
      );
    }
    if (rec.status === 'pending' || rec.status === 'queued') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 uppercase">
          <Clock className="w-3 h-3" />
          {rec.status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
        <AlertTriangle className="w-3 h-3" />
        {rec.status.replace('_', ' ')}
      </span>
    );
  };

  const records = (dashboard?.records || []).filter((r) => {
    if (filterCategory !== 'all' && r.accountCategory !== filterCategory) return false;
    if (filterChannel !== 'all' && r.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const memberOptions =
    resendCategory === 'rider' ? dashboard?.members.riders || [] : dashboard?.members.passengers || [];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-[#0B192C] to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <MailCheck className="w-4 h-4" />
              <span>Automated Welcome &amp; Registration Messaging</span>
            </div>
            <h3 className="text-lg font-extrabold text-white">Welcome Messages Management</h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Automatically dispatches personalized BodaCare Uganda welcome messages across SMS, WhatsApp, and In-App
              notifications whenever a Rider or Customer registers (self-registration or Admin manual entry).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        {dashboard && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-xs">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
              <span className="text-slate-400 block text-[11px]">Total Welcome Logs</span>
              <span className="text-lg font-extrabold text-white mt-0.5 block">{dashboard.counts.total}</span>
            </div>
            <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-xl p-3">
              <span className="text-emerald-300 block text-[11px]">Sent / Delivered</span>
              <span className="text-lg font-extrabold text-white mt-0.5 block">
                {dashboard.counts.deliveredOrSent}
              </span>
            </div>
            <div className="bg-sky-950/60 border border-sky-700/50 rounded-xl p-3">
              <span className="text-sky-300 block text-[11px]">Pending Queue</span>
              <span className="text-lg font-extrabold text-white mt-0.5 block">{dashboard.counts.pending}</span>
            </div>
            <div className="bg-amber-950/60 border border-amber-700/50 rounded-xl p-3">
              <span className="text-amber-300 block text-[11px]">Failed / Awaiting Gateway</span>
              <span className="text-lg font-extrabold text-white mt-0.5 block">
                {dashboard.counts.failedOrBlocked}
              </span>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : toast.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {!backendOnline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Express Backend Server Required for Welcome Logs</p>
            <p className="mt-0.5">Run the Node server (`npm run dev` or `npm start`) to manage and inspect welcome notifications.</p>
          </div>
        </div>
      )}

      {/* Gateway Unconfigured Notice (Non-crashing) */}
      {dashboard?.gatewayStatus && (!dashboard.gatewayStatus.sms.configured || !dashboard.gatewayStatus.whatsapp.configured) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Graceful Fallback Active for External SMS / WhatsApp</p>
              <p className="text-amber-800 mt-0.5">
                {!dashboard.gatewayStatus.sms.configured ? "SMS (Africa's Talking) is awaiting credentials or paused. " : ''}
                {!dashboard.gatewayStatus.whatsapp.configured ? 'WhatsApp Cloud API is awaiting credentials or paused. ' : ''}
                In-App welcome alerts still deliver immediately, and failed/blocked SMS or WhatsApp records can be retried once configured.
              </p>
            </div>
          </div>
          {dashboard.counts.failedOrBlocked > 0 && (
            <button
              type="button"
              disabled={retrying}
              onClick={() => void handleRetryFailed()}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>Retry All ({dashboard.counts.failedOrBlocked})</span>
            </button>
          )}
        </div>
      )}

      {/* Settings & Templates Form */}
      {settingsForm && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Channel Toggles &amp; Personalized Message Templates</h4>
              <p className="text-xs text-slate-500">
                Enable or disable each channel independently and customize Rider vs Customer welcome wording.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>{savingSettings ? 'Saving...' : 'Save Settings & Templates'}</span>
            </button>
          </div>

          {/* Toggles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <span className="font-bold text-slate-800">Auto-Welcome Master</span>
              <input
                type="checkbox"
                checked={settingsForm.enabled}
                onChange={(e) => setSettingsForm({ ...settingsForm, enabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>SMS Notifications</span>
              </span>
              <input
                type="checkbox"
                checked={settingsForm.smsEnabled}
                onChange={(e) => setSettingsForm({ ...settingsForm, smsEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                <span>WhatsApp Notifications</span>
              </span>
              <input
                type="checkbox"
                checked={settingsForm.whatsappEnabled}
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsappEnabled: e.target.checked })}
                className="w-4 h-4 accent-sky-600 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>In-App Notifications</span>
              </span>
              <input
                type="checkbox"
                checked={settingsForm.inAppEnabled}
                onChange={(e) => setSettingsForm({ ...settingsForm, inAppEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-600 cursor-pointer"
              />
            </label>
          </div>

          {/* Two Template Editors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
            {/* Rider Template */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">Rider Welcome Message Template</span>
                <span className="text-[10px] font-mono text-slate-500">{settingsForm.riderTemplate.length} chars</span>
              </div>
              <textarea
                rows={4}
                required
                value={settingsForm.riderTemplate}
                onChange={(e) => setSettingsForm({ ...settingsForm, riderTemplate: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_TOKENS.map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => insertToken('riderTemplate', tok)}
                    className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-slate-300 rounded font-mono text-[10px] text-slate-700 cursor-pointer"
                  >
                    + {tok}
                  </button>
                ))}
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Live Rider Preview</span>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  {renderPreview(settingsForm.riderTemplate, 'rider')}
                </p>
              </div>
            </div>

            {/* Customer/Passenger Template */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">Customer / Passenger Welcome Template</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {settingsForm.passengerTemplate.length} chars
                </span>
              </div>
              <textarea
                rows={4}
                required
                value={settingsForm.passengerTemplate}
                onChange={(e) => setSettingsForm({ ...settingsForm, passengerTemplate: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_TOKENS.map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => insertToken('passengerTemplate', tok)}
                    className="px-2 py-0.5 bg-white hover:bg-amber-50 border border-slate-300 rounded font-mono text-[10px] text-slate-700 cursor-pointer"
                  >
                    + {tok}
                  </button>
                ))}
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                  Live Customer Preview
                </span>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  {renderPreview(settingsForm.passengerTemplate, 'passenger')}
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Resend Welcome Message Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-600" />
          <span>Send / Resend Welcome Message to Registered Member</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Account Category</label>
            <select
              value={resendCategory}
              onChange={(e) => setResendCategory(e.target.value as WelcomeAccountCategory)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
            >
              <option value="rider">Rider ({dashboard?.members.riders.length || 0})</option>
              <option value="passenger">Customer / Passenger ({dashboard?.members.passengers.length || 0})</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Select Member</label>
            <select
              value={resendRecipientId}
              onChange={(e) => setResendRecipientId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} · {m.phone} ({m.subCounty || m.district || 'Luweero'})
                </option>
              ))}
              {memberOptions.length === 0 && <option value="">No registered members found</option>}
            </select>
          </div>

          <button
            type="button"
            disabled={resending || !resendRecipientId}
            onClick={() => void handleResend(resendRecipientId, resendCategory, resendChannels)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{resending ? 'Sending...' : 'Send Welcome Again'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="font-semibold text-slate-600">Channels for manual resend:</span>
          {(['in_app', 'sms', 'whatsapp'] as WelcomeChannel[]).map((ch) => (
            <label key={ch} className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={resendChannels.includes(ch)}
                onChange={() => toggleResendChannel(ch)}
                className="accent-emerald-600"
              />
              <span>{ch === 'in_app' ? 'In-App Notification' : ch === 'sms' ? 'SMS' : 'WhatsApp'}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Delivery History & Registration Status Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              <span>Welcome Notification Delivery Status &amp; Registration Dates</span>
            </h4>
            <p className="text-xs text-slate-500">
              Duplicate automatic welcomes are blocked automatically; manual resends and failed retries are tracked cleanly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as 'all' | WelcomeAccountCategory)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
            >
              <option value="all">All Categories</option>
              <option value="rider">Riders Only</option>
              <option value="passenger">Customers Only</option>
            </select>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value as 'all' | WelcomeChannel)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
            >
              <option value="all">All Channels</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="in_app">In-App</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="blocked_unconfigured">Awaiting Gateway</option>
              <option value="failed">Failed</option>
            </select>
            <button
              type="button"
              disabled={retrying}
              onClick={() => void handleRetryFailed()}
              className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>Retry Pending/Failed</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Recipient</th>
                <th className="py-3 px-4 font-bold">Category &amp; Source</th>
                <th className="py-3 px-4 font-bold">Registration Date</th>
                <th className="py-3 px-4 font-bold">Channel</th>
                <th className="py-3 px-4 font-bold">Delivery Status</th>
                <th className="py-3 px-4 font-bold">Message Sent</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{rec.recipientName}</div>
                    <div className="font-mono text-[11px] text-slate-500">{rec.recipientPhone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        rec.accountCategory === 'rider'
                          ? 'bg-sky-100 text-sky-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {rec.accountCategory === 'rider' ? 'Rider' : 'Customer'}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {rec.registrationSource === 'self_registration' ? 'Self-Registered' : 'Admin Manual'}
                      {rec.isResend ? ' · Resent' : ''}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                    {rec.registrationDate}
                  </td>
                  <td className="py-3 px-4 uppercase font-bold text-[11px] text-slate-700">{rec.channel}</td>
                  <td className="py-3 px-4">
                    {renderStatusPill(rec)}
                    {rec.errorReason && (
                      <p className="text-[10px] text-slate-500 mt-1 max-w-xs line-clamp-2">{rec.errorReason}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 max-w-sm">
                    <p className="text-[11px] text-slate-700 line-clamp-2">{rec.messageText}</p>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {(rec.status === 'failed' ||
                        rec.status === 'blocked_unconfigured' ||
                        rec.status === 'pending') && (
                        <button
                          type="button"
                          onClick={() => void handleRetryFailed([rec.id])}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-[11px] cursor-pointer"
                        >
                          Retry
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          void handleResend(rec.recipientId, rec.accountCategory, [rec.channel])
                        }
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        Resend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No welcome notification records match the current filters yet. Register a new Rider or Customer to see automated welcome delivery logs here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
