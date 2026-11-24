import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  KeyRound,
  MessageSquare,
  Phone,
  Power,
  Radar,
  RefreshCw,
  Server,
  ShieldCheck,
  Sliders,
  Smartphone,
} from 'lucide-react';
import type {
  ExternalServicesConfig,
  IntegrationServiceId,
  IntegrationServiceStatus,
  IntegrationsDashboardPayload,
} from '../../types';
import { storage } from '../../lib/storage';

const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-admin-id': 'admin-founder-mukisa',
  'x-admin-role': 'super_admin',
  'x-actor-name': 'Brian Mukisa (Super Admin)',
};

export const AdminIntegrationsHub: React.FC = () => {
  const [payload, setPayload] = useState<IntegrationsDashboardPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [togglingId, setTogglingId] = useState<IntegrationServiceId | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [showEnvMatrix, setShowEnvMatrix] = useState<boolean>(true);

  const [externalConfig, setExternalConfig] = useState<ExternalServicesConfig>(() => storage.getExternalConfig());

  const showToast = (type: 'success' | 'warning' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/integrations/dashboard', { headers: ADMIN_HEADERS });
      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok || !contentType.includes('application/json')) {
        throw new Error('Backend server API unreachable');
      }
      const data = (await resp.json()) as IntegrationsDashboardPayload;
      setPayload(data);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const handleToggleService = async (service: IntegrationServiceStatus) => {
    setTogglingId(service.id);
    try {
      const resp = await fetch(`/api/integrations/${service.id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ enabled: !service.enabled }),
      });
      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok || !contentType.includes('application/json')) {
        throw new Error('Unable to update integration toggle on server.');
      }
      const json = (await resp.json()) as { dashboard?: IntegrationsDashboardPayload };
      if (json.dashboard) setPayload(json.dashboard);
      showToast(
        !service.enabled ? 'success' : 'warning',
        `${service.name} ${!service.enabled ? 'activated' : 'deactivated'} successfully.`
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to toggle integration.');
    } finally {
      setTogglingId(null);
    }
  };

  const renderStatusBadge = (status: IntegrationServiceStatus['status']) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Active
        </span>
      );
    }
    if (status === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <Power className="w-3 h-3" />
          Inactive
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
        <AlertTriangle className="w-3 h-3" />
        Awaiting Credentials
      </span>
    );
  };

  const renderServiceIcon = (category: IntegrationServiceStatus['category']) => {
    if (category === 'messaging') return <MessageSquare className="w-4 h-4 text-emerald-600" />;
    if (category === 'ussd') return <Smartphone className="w-4 h-4 text-sky-600" />;
    if (category === 'job_discovery') return <Radar className="w-4 h-4 text-indigo-600" />;
    return <Bot className="w-4 h-4 text-amber-600" />;
  };

  const services = payload?.services || [];
  const activeCount = services.filter((s) => s.status === 'active').length;
  const awaitingCount = services.filter((s) => s.status === 'awaiting_credentials').length;
  const inactiveCount = services.filter((s) => s.status === 'inactive').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#0B192C] to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Integration &amp; Server Environment Manager</span>
            </div>
            <h3 className="text-lg font-extrabold text-white">
              Optional API Gateways, Activation Controls &amp; Environment Guide
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              BodaCare Uganda operates cleanly with zero external API keys configured. SMS, WhatsApp, USSD, Google Custom
              Search, SerpApi, and Gemini AI are strictly optional and run gracefully with automatic fallback until you
              add credentials on your server environment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchDashboard()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-xs">
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px]">Essential Runtime Vars</span>
            <span className="text-base font-extrabold text-white mt-0.5 block">2 (Auto-Defaulted)</span>
          </div>
          <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-xl p-3">
            <span className="text-emerald-300 block text-[11px]">Active Services</span>
            <span className="text-base font-extrabold text-white mt-0.5 block">{activeCount}</span>
          </div>
          <div className="bg-amber-950/60 border border-amber-700/50 rounded-xl p-3">
            <span className="text-amber-300 block text-[11px]">Awaiting Credentials</span>
            <span className="text-base font-extrabold text-white mt-0.5 block">{awaitingCount}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-slate-300 block text-[11px]">Paused by Admin</span>
            <span className="text-base font-extrabold text-white mt-0.5 block">{inactiveCount}</span>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : notice.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <Activity className="w-4 h-4 shrink-0" />
          <span>{notice.text}</span>
        </div>
      )}

      {!backendOnline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Node API Server Status Offline in Current Static Preview</p>
            <p className="mt-0.5 text-amber-800">
              Live server environment inspection runs when connected to the Node Express server (`npm run dev` or
              `npm start`). Core BodaCare dashboards continue working offline without crashing.
            </p>
          </div>
        </div>
      )}

      {/* Secret Security Notice */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-950 flex items-start gap-3">
        <KeyRound className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sky-900">Zero-Secret Frontend Security Enforced</p>
          <p className="text-sky-800 mt-0.5 leading-relaxed">
            For platform security, private API keys (<code>AFRICASTALKING_API_KEY</code>,{' '}
            <code>WHATSAPP_ACCESS_TOKEN</code>, <code>GOOGLE_CSE_API_KEY</code>, <code>SERPAPI_KEY</code>,{' '}
            <code>GEMINI_API_KEY</code>) are never typed into browser forms, stored in browser storage, or sent to client
            code. Set credentials strictly in server environment variables (<code>.env</code> or hosting Secrets
            manager), and use the switches below to activate or pause each service anytime.
          </p>
        </div>
      </div>

      {/* Independent Per-Service Activation Cards */}
      {services.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-600" />
            <span>Independent Service Controls (Activate / Deactivate Per Integration)</span>
          </h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 mt-0.5">
                        {renderServiceIcon(svc.category)}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-900">{svc.name}</h5>
                        <p className="text-xs text-slate-600 mt-0.5">{svc.description}</p>
                      </div>
                    </div>
                    {renderStatusBadge(svc.status)}
                  </div>

                  <div
                    className={`p-3 rounded-xl text-xs border ${
                      svc.status === 'active'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : svc.status === 'inactive'
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <p className="font-semibold">{svc.statusMessage}</p>
                    <p className="text-[11px] opacity-90 mt-1">
                      <strong>Graceful Fallback:</strong> {svc.fallbackBehavior}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {svc.envVars.map((ev) => (
                      <span
                        key={ev.name}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                          ev.configured
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span>{ev.configured ? '✓' : '○'}</span>
                        <span>{ev.name}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-slate-500">
                    Admin Toggle: <strong>{svc.enabled ? 'Enabled' : 'Disabled'}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={togglingId === svc.id}
                    onClick={() => void handleToggleService(svc)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                      svc.enabled
                        ? 'bg-slate-100 hover:bg-rose-50 text-slate-800 hover:text-rose-700 border border-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>
                      {togglingId === svc.id
                        ? 'Saving...'
                        : svc.enabled
                        ? 'Deactivate Service'
                        : 'Activate Service'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Essential vs Optional Environment Variables Documentation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Complete Server Environment Variables Reference (Essential vs Optional)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Copy exact variable names into your deployment secrets or server <code>.env</code> file when activating integrations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEnvMatrix((prev) => !prev)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
          >
            {showEnvMatrix ? 'Hide Details' : 'Show All Variables'}
          </button>
        </div>

        {showEnvMatrix && payload && (
          <div className="p-5 space-y-6">
            {/* Essential Runtime Variables */}
            <div className="space-y-2">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                1. Essential / Core Runtime Variables (Auto-Defaulted)
              </h5>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Variable Name</th>
                      <th className="py-2.5 px-3 font-bold">Status</th>
                      <th className="py-2.5 px-3 font-bold">Default</th>
                      <th className="py-2.5 px-3 font-bold">Purpose &amp; Where to Obtain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payload.essentialRuntimeVars.map((ev) => (
                      <tr key={ev.name}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ev.name}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ev.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {ev.configured ? 'Configured' : 'Using Default'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{ev.defaultValue || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          <p>{ev.purpose}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Source: {ev.whereToObtain}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Optional Variables */}
            <div className="space-y-2">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                2. Optional Integration Variables (Not Required to Run or Deploy)
              </h5>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Service</th>
                      <th className="py-2.5 px-3 font-bold">Variable Name</th>
                      <th className="py-2.5 px-3 font-bold">Status</th>
                      <th className="py-2.5 px-3 font-bold">Purpose &amp; Where to Obtain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.flatMap((svc) =>
                      svc.envVars.map((ev) => (
                        <tr key={`${svc.id}-${ev.name}`}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">{svc.name}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {ev.name}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ev.configured
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {ev.configured ? 'Configured' : 'Optional / Unset'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <p>{ev.purpose}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Obtain from: {ev.whereToObtain}</p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Non-Secret Platform Preferences */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          storage.saveExternalConfig(externalConfig);
          showToast('success', 'Non-secret messaging display labels & SOS dispatch preferences saved.');
        }}
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs"
      >
        <div>
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Operational Display &amp; Emergency SOS Preferences (Non-Secret)</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Public labels displayed on rider receipts &amp; emergency SOS routing preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Preferred SMS Provider</label>
            <select
              value={externalConfig.smsProvider}
              onChange={(e) =>
                setExternalConfig({
                  ...externalConfig,
                  smsProvider: e.target.value as ExternalServicesConfig['smsProvider'],
                })
              }
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
            >
              <option value="africastalking">Africa's Talking (Uganda Primary)</option>
              <option value="twilio">Twilio Global Fallback</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Display Sender ID</label>
            <input
              type="text"
              value={externalConfig.smsSenderId}
              onChange={(e) => setExternalConfig({ ...externalConfig, smsSenderId: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold uppercase"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Official Support WhatsApp</label>
            <input
              type="text"
              value={externalConfig.whatsAppBusinessPhone}
              onChange={(e) => setExternalConfig({ ...externalConfig, whatsAppBusinessPhone: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <input
            type="checkbox"
            id="autoDispatchToggle"
            checked={externalConfig.autoDispatchEnabled}
            onChange={(e) => setExternalConfig({ ...externalConfig, autoDispatchEnabled: e.target.checked })}
            className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
          />
          <label htmlFor="autoDispatchToggle" className="text-xs text-emerald-950 font-semibold cursor-pointer">
            Enable Multi-Channel SOS Broadcast when SMS or WhatsApp gateway credentials are active
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white font-bold rounded-xl shadow cursor-pointer transition-colors"
          >
            Save Operational Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
