import React, { useMemo, useState } from 'react';
import {
  Bell,
  Smartphone,
  Phone,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Briefcase,
  MessageSquare,
  BellOff,
  Save,
  User,
  ShieldCheck,
} from 'lucide-react';
import { BodaJob, RiderJobAlertPreferences, RiderProfile } from '../../types';
import { storage } from '../../lib/storage';
import { validateUgandaPhone } from '../../lib/ugandaPhone';

interface RiderJobAlertsCardProps {
  rider: RiderProfile;
  onUpdated?: (updated: RiderProfile) => void;
  compact?: boolean;
}

const JOB_CATEGORY_OPTIONS: { id: BodaJob['type']; label: string; desc: string }[] = [
  { id: 'produce_transport', label: 'Produce & Farm Haulage', desc: 'Coffee, milk cans, maize & matooke runs' },
  { id: 'parcel_delivery', label: 'Commercial Parcels', desc: 'Hardware, shop stock & town deliveries' },
  { id: 'scheduled_courier', label: 'Medical & Clinic Courier', desc: 'Pharmacy & health centre dispatches' },
  { id: 'corporate_boda', label: 'Corporate & NGO Contracts', desc: 'Daily staff or field officer transport' },
  { id: 'passenger_contract', label: 'Scheduled Passenger Trips', desc: 'School & regular commuter contracts' },
];

const DISTRICT_OPTIONS = [
  'Luweero',
  'Nakaseke',
  'Nakasongola',
  'Wakiso',
  'Kampala',
  'Mukono',
  'Masaka',
  'Jinja',
];

const SUB_COUNTY_OPTIONS = [
  'Kikyusa',
  'Luweero Town Council',
  'Wobulenzi',
  'Kasana',
  'Bamunanika',
];

export const RiderJobAlertsCard: React.FC<RiderJobAlertsCardProps> = ({
  rider,
  onUpdated,
  compact = false,
}) => {
  const stages = useMemo(() => storage.getStages(), []);

  const defaultPrefs: RiderJobAlertPreferences = rider.jobAlertPreferences || {
    enabled: true,
    consentGiven: true,
    preferredChannel: rider.phoneType === 'feature_phone' ? 'sms_only' : 'sms_whatsapp',
    optedOutSms: false,
    jobTypes: ['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda', 'passenger_contract'],
    preferredSubCounties: [rider.subCounty || 'Kikyusa'],
    updatedAt: new Date().toISOString(),
  };

  // Contact & Location Profile Fields
  const [fullName, setFullName] = useState(rider.fullName || '');
  const [phone, setPhone] = useState(rider.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(rider.whatsappNumber || '');
  const [district, setDistrict] = useState(rider.district || 'Luweero');
  const [subCounty, setSubCounty] = useState(rider.subCounty || 'Kikyusa');
  const [village, setVillage] = useState(rider.village || '');
  const [stageId, setStageId] = useState(rider.stageId || stages[0]?.id || '');

  // Notification Channel & Consent Fields
  const [phoneType, setPhoneType] = useState<'smartphone' | 'feature_phone'>(rider.phoneType || 'smartphone');
  const [consentGiven, setConsentGiven] = useState<boolean>(
    defaultPrefs.consentGiven !== false && defaultPrefs.enabled !== false
  );
  const [preferredChannel, setPreferredChannel] = useState<RiderJobAlertPreferences['preferredChannel']>(
    defaultPrefs.preferredChannel || (rider.phoneType === 'feature_phone' ? 'sms_only' : 'sms_whatsapp')
  );
  const [optedOutSms, setOptedOutSms] = useState<boolean>(defaultPrefs.optedOutSms);
  const [optOutReason, setOptOutReason] = useState<string>(defaultPrefs.optOutReason || '');
  const [jobTypes, setJobTypes] = useState<BodaJob['type'][]>(
    defaultPrefs.jobTypes?.length ? defaultPrefs.jobTypes : ['produce_transport', 'parcel_delivery']
  );
  const [preferredSubCounties, setPreferredSubCounties] = useState<string[]>(
    defaultPrefs.preferredSubCounties?.length ? defaultPrefs.preferredSubCounties : ['Kikyusa']
  );
  const [occupation, setOccupation] = useState<string>(defaultPrefs.occupation || 'Boda & Delivery Rider');
  const [qualificationsInput, setQualificationsInput] = useState<string>(
    defaultPrefs.qualifications?.join(', ') || 'Class A Driving Permit, National ID (NIN)'
  );

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const phoneValidation = validateUgandaPhone(phone);
  const whatsappValidation = whatsappNumber.trim() ? validateUgandaPhone(whatsappNumber) : null;

  const toggleJobType = (type: BodaJob['type']) => {
    setJobTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleSubCounty = (sc: string) => {
    setPreferredSubCounties((prev) =>
      prev.includes(sc) ? prev.filter((s) => s !== sc) : [...prev, sc]
    );
  };

  const handlePhoneTypeSwitch = (nextType: 'smartphone' | 'feature_phone') => {
    setPhoneType(nextType);
    if (nextType === 'feature_phone') {
      setPreferredChannel('sms_only');
    } else if (preferredChannel === 'sms_only') {
      setPreferredChannel('sms_whatsapp');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Full name cannot be empty.' });
      return;
    }
    if (!phoneValidation.isValid) {
      setStatusMessage({
        type: 'error',
        text: phoneValidation.reason || 'Please enter a valid 10-digit Ugandan telephone number.',
      });
      return;
    }
    if (whatsappValidation && !whatsappValidation.isValid) {
      setStatusMessage({
        type: 'error',
        text: `WhatsApp number invalid: ${whatsappValidation.reason}`,
      });
      return;
    }

    setSaving(true);
    const chosenStage = stages.find((s) => s.id === stageId);
    const nowIso = new Date().toISOString();
    const resolvedChannel: RiderJobAlertPreferences['preferredChannel'] = !consentGiven
      ? 'none'
      : phoneType === 'feature_phone'
      ? 'sms_only'
      : preferredChannel;

    const payloadPrefs: Partial<RiderJobAlertPreferences> = {
      enabled: consentGiven && resolvedChannel !== 'none',
      consentGiven,
      consentUpdatedAt: nowIso,
      preferredChannel: resolvedChannel,
      optedOutSms: optedOutSms || !consentGiven,
      optOutReason:
        optedOutSms || !consentGiven
          ? optOutReason.trim() || (!consentGiven ? 'Notification consent unchecked by rider' : 'Rider requested SMS opt-out')
          : undefined,
      jobTypes,
      preferredSubCounties,
      occupation: occupation.trim() || undefined,
      qualifications: qualificationsInput
        .split(',')
        .map((q) => q.trim())
        .filter(Boolean),
    };

    const updatedBase: RiderProfile = {
      ...rider,
      fullName: fullName.trim(),
      phone: phoneValidation.normalized,
      whatsappNumber: whatsappValidation?.isValid ? whatsappValidation.normalized : undefined,
      district: district.trim() || rider.district || 'Luweero',
      subCounty: subCounty.trim() || rider.subCounty || 'Kikyusa',
      village: village.trim() || rider.village,
      stageId: chosenStage?.id || rider.stageId,
      stageName: chosenStage?.name || rider.stageName,
      phoneType,
    };
    storage.saveRider(updatedBase);
    const updatedLocal = storage.updateRiderJobPreferences(
      rider.id,
      payloadPrefs,
      phoneType,
      `${fullName.trim()} (Self-Service)`
    );

    let syncedBackend = false;
    let backendError = '';
    try {
      const resp = await fetch(`/api/riders/${encodeURIComponent(rider.id)}/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-name': fullName.trim(),
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phoneValidation.normalized,
          whatsappNumber: whatsappValidation?.isValid ? whatsappValidation.normalized : '',
          district: district.trim() || 'Luweero',
          subCounty: subCounty.trim() || 'Kikyusa',
          village: village.trim(),
          stageId: chosenStage?.id || rider.stageId,
          stageName: chosenStage?.name || rider.stageName,
          phoneType,
          ...payloadPrefs,
        }),
      });
      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.includes('application/json')) {
        syncedBackend = true;
      } else if (contentType.includes('application/json')) {
        const errJson = (await resp.json()) as { error?: string };
        if (errJson.error) backendError = errJson.error;
      }
    } catch {
      // Static deploy preserves local profile changes
    }

    setSaving(false);

    if (backendError) {
      setStatusMessage({ type: 'error', text: backendError });
      return;
    }

    if (updatedLocal && onUpdated) {
      onUpdated(updatedLocal);
    }

    setStatusMessage({
      type: 'success',
      text: syncedBackend
        ? 'Contact details, notification channel, and consent preferences saved and synced to BodaCare server.'
        : 'Contact details, notification channel, and consent preferences saved to your local rider profile.',
    });
  };

  return (
    <form
      onSubmit={handleSave}
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm space-y-5 text-xs ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <span>Rider Contact, WhatsApp &amp; Job Alert Preferences</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Keep your phone number, WhatsApp contact, stage location, and broadcast consent up to date so you never miss matching Luweero jobs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
              phoneValidation.isValid
                ? phoneValidation.network === 'MTN'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {phoneValidation.isValid
              ? `SMS: ${phoneValidation.network} (${phoneValidation.normalized})`
              : 'Invalid Tel Format'}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl font-semibold flex items-center gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. Rider Contact Details & Stage */}
      <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <label className="block font-bold text-slate-800 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-amber-600" />
          <span>1. Rider Contact &amp; Operating Location Details</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Telephone Number (SMS / Calls) *</label>
            <input
              type="tel"
              required
              placeholder="+256 774 912 304"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">WhatsApp Number (if different)</label>
            <input
              type="tel"
              placeholder="Same as telephone if blank"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">District</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
            >
              {DISTRICT_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Primary Sub-County</label>
            <select
              value={subCounty}
              onChange={(e) => setSubCounty(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
            >
              {SUB_COUNTY_OPTIONS.map((sc) => (
                <option key={sc} value={sc}>
                  {sc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Village / Trading Centre</label>
            <input
              type="text"
              placeholder="e.g. Kalagala, Kikyusa Central"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block font-bold text-slate-700 mb-1">Assigned Boda-Boda Stage</label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
            >
              {stages.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.subCounty}, {st.district})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Primary Occupation / Skill Focus</label>
            <input
              type="text"
              placeholder="e.g. Boda & Delivery Rider, Courier"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="sm:col-span-1 lg:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Qualifications &amp; Permits Held (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Class A Driving Permit, National ID, Produce Courier Experience"
              value={qualificationsInput}
              onChange={(e) => setQualificationsInput(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* 2. Phone Type Selection */}
      <div className="space-y-2">
        <label className="block font-bold text-slate-800">2. What type of phone do you carry while riding?</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handlePhoneTypeSwitch('smartphone')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              phoneType === 'smartphone'
                ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Smartphone (WhatsApp, App &amp; SMS)</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Supports WhatsApp job messages, instant in-app alerts, and SMS backup when offline.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handlePhoneTypeSwitch('feature_phone')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              phoneType === 'feature_phone'
                ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Button / Feature Phone (SMS Only)</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Receives plain SMS job alerts directly on MTN or Airtel — zero internet bundle required.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Preferred Notification Channel */}
      <div className="space-y-2">
        <label className="block font-bold text-slate-800">3. Preferred Notification Channel</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(
            [
              { id: 'sms_whatsapp', label: 'Both SMS & WhatsApp', desc: 'Maximum reliability across road networks' },
              { id: 'whatsapp_only', label: 'WhatsApp Only', desc: 'Rich job cards sent to your WhatsApp', smartphoneOnly: true },
              { id: 'sms_only', label: 'Ordinary SMS Only', desc: 'Works even without mobile data' },
              { id: 'auto', label: 'All Channels (SMS + WhatsApp + App)', desc: 'Full automated dispatch across every channel', smartphoneOnly: true },
              { id: 'app_only', label: 'In-App Alerts Only', desc: 'Silent notification badge inside BodaCare', smartphoneOnly: true },
              { id: 'none', label: 'Pause Job Broadcasts', desc: 'Do not send automated job messages' },
            ] as Array<{ id: RiderJobAlertPreferences['preferredChannel']; label: string; desc: string; smartphoneOnly?: boolean }>
          ).map((ch) => {
            const disabled = Boolean(ch.smartphoneOnly && phoneType === 'feature_phone');
            const active = (phoneType === 'feature_phone' && preferredChannel !== 'none' ? 'sms_only' : preferredChannel) === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setPreferredChannel(ch.id);
                  if (ch.id === 'none') {
                    setConsentGiven(false);
                  } else {
                    setConsentGiven(true);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  disabled
                    ? 'opacity-45 bg-slate-100 border-slate-200 cursor-not-allowed'
                    : active
                    ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 cursor-pointer'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer'
                }`}
              >
                <span className="font-bold text-slate-900 block">{ch.label}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">{ch.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Job Types */}
      <div className="space-y-2">
        <label className="block font-bold text-slate-800 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
          <span>4. Job Categories You Want to Receive</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {JOB_CATEGORY_OPTIONS.map((cat) => {
            const active = jobTypes.includes(cat.id);
            return (
              <label
                key={cat.id}
                className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-colors ${
                  active ? 'bg-emerald-50/70 border-emerald-400' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleJobType(cat.id)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">{cat.label}</span>
                  <span className="text-[10px] text-slate-500">{cat.desc}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 5. Preferred Locations */}
      <div className="space-y-2">
        <label className="block font-bold text-slate-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span>5. Preferred Work Sub-Counties</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SUB_COUNTY_OPTIONS.map((sc) => {
            const checked = preferredSubCounties.includes(sc);
            return (
              <button
                key={sc}
                type="button"
                onClick={() => toggleSubCounty(sc)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  checked
                    ? 'bg-[#0B192C] text-amber-400 border-[#0B192C]'
                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {checked ? `✓ ${sc}` : sc}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Explicit Consent & Opt-out Controls */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-start gap-2.5">
          <input
            id={`consent-${rider.id}`}
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => {
              const checked = e.target.checked;
              setConsentGiven(checked);
              if (checked && preferredChannel === 'none') {
                setPreferredChannel(phoneType === 'feature_phone' ? 'sms_only' : 'sms_whatsapp');
              }
            }}
            className="mt-0.5 rounded text-emerald-600"
          />
          <label htmlFor={`consent-${rider.id}`} className="cursor-pointer">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>I consent to receive verified BodaCare job alerts via my selected channel(s)</span>
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              BodaCare Uganda enforces strict duplicate prevention and only sends admin-verified opportunities. You can withdraw consent anytime.
            </span>
          </label>
        </div>

        <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="flex items-center gap-2 font-bold text-rose-700 cursor-pointer">
            <input
              type="checkbox"
              checked={optedOutSms}
              onChange={(e) => setOptedOutSms(e.target.checked)}
              className="rounded text-rose-600"
            />
            <BellOff className="w-3.5 h-3.5 text-rose-600" />
            <span>Opt out of SMS messages only (keep WhatsApp / App if enabled)</span>
          </label>
          <span className="text-[10px] text-slate-500 font-mono">
            Updated: {defaultPrefs.updatedAt ? new Date(defaultPrefs.updatedAt).toLocaleDateString() : 'Just now'}
          </span>
        </div>

        {(optedOutSms || !consentGiven) && (
          <div className="flex items-center gap-2 pt-1">
            <MessageSquare className="w-4 h-4 text-rose-500 shrink-0" />
            <input
              type="text"
              placeholder="Optional reason for opting out or pausing alerts..."
              value={optOutReason}
              onChange={(e) => setOptOutReason(e.target.value)}
              className="w-full p-2 bg-white border border-rose-200 rounded-lg text-xs"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Preferences...' : 'Save Contact & Alert Preferences'}</span>
        </button>
      </div>
    </form>
  );
};
