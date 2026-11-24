import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Shield,
  Send,
  Bike,
  UserCheck,
  Zap,
  Wrench,
  MapPin,
  Briefcase,
  ArrowRightLeft,
  CheckCircle2,
  Camera,
  Upload,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import type {
  AdminAccount,
  AdminCategory,
  AdminPermissions,
  BatteryBrand,
  BatterySwapStation,
  BodaJob,
  BusinessListing,
  PassengerProfile,
  RiderProfile,
  Stage,
} from '../../types';

const SUB_COUNTIES = ['Kikyusa', 'Luweero Town Council', 'Kasana', 'Wobulenzi', 'Bamunanika', 'Zirobwe', 'Kamira', 'Kalagala'];

const PhotoUploadControl: React.FC<{
  label: string;
  value: string;
  onChange: (nextVal: string) => void;
  onError?: (msg: string) => void;
}> = ({ label, value, onChange, onError }) => {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 450 * 1024) {
      onError?.('Photo file exceeds 450 KB. Please choose a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const check = storage.validateSafeImageUrl(result);
      if (!check.valid) {
        onError?.(check.error || 'Unsupported photo format.');
        return;
      }
      onChange(check.cleanUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-slate-500" />
          <span>{label}</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer">
            <Upload className="w-3 h-3" />
            <span>Upload Photo</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFile} className="hidden" />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {value ? (
          <img
            src={value}
            alt="Preview"
            className="w-12 h-12 rounded-xl object-cover border border-slate-300 bg-white shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste HTTPS photo URL or upload image file (optional)"
          className="flex-1 p-2 border border-slate-300 rounded-lg bg-white text-xs"
        />
      </div>
    </div>
  );
};

interface ConfirmDeleteModalProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  title,
  description,
  onConfirm,
  onCancel,
  busy,
}) => (
  <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
    <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-rose-200 space-y-4 my-auto mx-auto">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 font-medium">
        This action permanently removes the record from the SQLite database and writes an entry to the security audit log.
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          {busy ? 'Deleting...' : 'Confirm Permanent Delete'}
        </button>
      </div>
    </div>
  </div>
);

export const RiderFormModal: React.FC<{
  initial?: RiderProfile | null;
  stages: Stage[];
  onSave: (rider: RiderProfile, channels: Array<'in_app' | 'sms' | 'whatsapp'>) => Promise<void>;
  onClose: () => void;
}> = ({ initial, stages, onSave, onClose }) => {
  const defaultStage = stages[0];
  const [fullName, setFullName] = useState(initial?.fullName || '');
  const [phone, setPhone] = useState(initial?.phone || '+256 77');
  const [whatsappNumber, setWhatsappNumber] = useState(initial?.whatsappNumber || '');
  const [district, setDistrict] = useState(initial?.district || 'Luweero');
  const [subCounty, setSubCounty] = useState(initial?.subCounty || 'Kikyusa');
  const [village, setVillage] = useState(initial?.village || '');
  const [residentialArea, setResidentialArea] = useState(initial?.residentialArea || '');
  const [stageId, setStageId] = useState(initial?.stageId || defaultStage?.id || '');
  const [motorcycleReg, setMotorcycleReg] = useState(initial?.motorcycleReg || '');
  const [motorcycleType, setMotorcycleType] = useState<'electric' | 'petrol'>(initial?.motorcycleType || 'petrol');
  const [motorcycleMakeModel, setMotorcycleMakeModel] = useState(initial?.motorcycleMakeModel || 'Bajaj Boxer BM150');
  const [batteryModel, setBatteryModel] = useState(initial?.batteryModel || '');
  const [ownershipStatus, setOwnershipStatus] = useState<'owner' | 'rental' | 'loan'>(initial?.ownershipStatus || 'owner');
  const [nin, setNin] = useState(initial?.nin || '');
  const [permitNumber, setPermitNumber] = useState(initial?.permitNumber || '');
  const [emergencyContactName, setEmergencyContactName] = useState(initial?.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(initial?.emergencyContactPhone || '');
  const [phoneType, setPhoneType] = useState<'smartphone' | 'feature_phone'>(initial?.phoneType || 'smartphone');
  const [verificationStatus, setVerificationStatus] = useState<RiderProfile['verificationStatus']>(
    initial?.verificationStatus || 'verified'
  );
  const [accountStatus, setAccountStatus] = useState<NonNullable<RiderProfile['accountStatus']>>(
    initial?.accountStatus || 'active'
  );
  const [sendSms, setSendSms] = useState(!initial);
  const [sendWa, setSendWa] = useState(false);
  const [sendApp, setSendApp] = useState(!initial && phoneType === 'smartphone');
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const photoCheck = storage.validateSafeImageUrl(avatarUrl);
    if (!photoCheck.valid) {
      setErr(photoCheck.error || 'Invalid profile photograph.');
      return;
    }
    setSaving(true);
    try {
      const stage = stages.find((s) => s.id === stageId);
      const payload: RiderProfile = {
        ...(initial || {
          id: `rider-${Date.now()}`,
          userId: `user-rider-${Date.now()}`,
          riderIdNumber: '',
          subscriptionTier: 'basic',
          subscriptionStatus: 'active',
          subscriptionExpiry: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          rating: 5.0,
          completedTrips: 0,
          isOnline: false,
          helmetAvailable: true,
          registrationDate: new Date().toISOString().split('T')[0],
          walletBalanceUgx: 0,
        }),
        avatarUrl: photoCheck.cleanUrl,
        fullName: fullName.trim(),
        phone: phone.trim(),
        whatsappNumber: whatsappNumber.trim() || undefined,
        district: district.trim() || 'Luweero',
        subCounty: subCounty.trim() || 'Kikyusa',
        village: village.trim() || undefined,
        residentialArea: residentialArea.trim() || `${village || subCounty}, ${district}`,
        stageId,
        stageName: stage?.name || initial?.stageName || 'Unassigned Stage',
        motorcycleReg: motorcycleReg.trim().toUpperCase(),
        motorcycleType,
        motorcycleMakeModel: motorcycleMakeModel.trim(),
        batteryModel: motorcycleType === 'electric' ? batteryModel.trim() || 'Bodawerk 48V 50Ah' : undefined,
        ownershipStatus,
        nin: nin.trim().toUpperCase(),
        permitNumber: permitNumber.trim().toUpperCase(),
        emergencyContactName: emergencyContactName.trim() || 'Stage Chairman',
        emergencyContactPhone: emergencyContactPhone.trim() || stage?.leaderPhone || '+256772100240',
        phoneType,
        verificationStatus,
        accountStatus,
      };
      const channels: Array<'in_app' | 'sms' | 'whatsapp'> = [];
      if (!initial) {
        if (sendApp && phoneType === 'smartphone') channels.push('in_app');
        if (sendSms) channels.push('sms');
        if (sendWa) channels.push('whatsapp');
      }
      await onSave(payload, channels);
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to save rider record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-auto mx-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">
              {initial ? `Edit Rider: ${initial.fullName} (${initial.riderIdNumber})` : 'Manually Register New Boda Rider'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <PhotoUploadControl
            label="Rider Profile Photograph"
            value={avatarUrl}
            onChange={setAvatarUrl}
            onError={setErr}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telephone Number *</label>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+256 77X XXX XXX" className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">WhatsApp Number (Optional)</label>
              <input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+256 7XX XXX XXX" className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Device Type *</label>
              <select
                value={phoneType}
                onChange={(e) => {
                  const val = e.target.value as 'smartphone' | 'feature_phone';
                  setPhoneType(val);
                  if (val === 'feature_phone') setSendApp(false);
                }}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
              >
                <option value="smartphone">Smartphone (App + SMS + USSD)</option>
                <option value="feature_phone">Button Phone / Non-Smartphone (SMS + USSD)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">District *</label>
              <input required value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sub-County / Town *</label>
              <select value={subCounty} onChange={(e) => setSubCounty(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                {SUB_COUNTIES.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Village / Trading Centre</label>
              <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="e.g. Kikyusa Central" className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Boda Stage</label>
              <select value={stageId} onChange={(e) => setStageId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold">
                {stages.length === 0 ? (
                  <option value="">Unassigned (Register Stage Later)</option>
                ) : (
                  <>
                    <option value="">Unassigned (Assign Stage Later)</option>
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>{st.name} ({st.subCounty})</option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Residential Area</label>
              <input value={residentialArea} onChange={(e) => setResidentialArea(e.target.value)} placeholder="e.g. Kikyusa Trading Centre" className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Motorcycle Reg Plate *</label>
              <input required value={motorcycleReg} onChange={(e) => setMotorcycleReg(e.target.value)} placeholder="UFG 421K" className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase font-bold" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Powertrain Type *</label>
              <select value={motorcycleType} onChange={(e) => setMotorcycleType(e.target.value as 'electric' | 'petrol')} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold">
                <option value="petrol">Petrol Motorcycle</option>
                <option value="electric">Electric Boda (E-Boda)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bike Make &amp; Model *</label>
              <input required value={motorcycleMakeModel} onChange={(e) => setMotorcycleMakeModel(e.target.value)} placeholder="Bajaj Boxer / Bodawerk E-Boda" className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            {motorcycleType === 'electric' && (
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">EV Battery Pack Model</label>
                <input value={batteryModel} onChange={(e) => setBatteryModel(e.target.value)} placeholder="Bodawerk 48V 50Ah / Zembo 72V" className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
            )}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ownership Status</label>
              <select value={ownershipStatus} onChange={(e) => setOwnershipStatus(e.target.value as 'owner' | 'rental' | 'loan')} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="owner">Owner</option>
                <option value="rental">Rental</option>
                <option value="loan">Loan / Asset Finance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">National ID (NIN)</label>
              <input value={nin} onChange={(e) => setNin(e.target.value)} placeholder="CM91..." className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Driving Permit Number</label>
              <input value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)} placeholder="UG-DL-A-..." className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Verification Status</label>
              <select value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value as RiderProfile['verificationStatus'])} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold">
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Operational Status</label>
              <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value as NonNullable<RiderProfile['accountStatus']>)} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Next of Kin / Emergency Contact</label>
              <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Emergency Phone</label>
              <input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} placeholder="+256 7XX XXX XXX" className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
          </div>

          {!initial && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
              <p className="font-bold text-sky-950 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-700" />
                <span>Send Registration Confirmation Notification</span>
              </p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} />
                  <span>SMS Confirmation (Button-phone &amp; Smartphone)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={sendWa} onChange={(e) => setSendWa(e.target.checked)} />
                  <span>WhatsApp Confirmation</span>
                </label>
                {phoneType === 'smartphone' && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={sendApp} onChange={(e) => setSendApp(e.target.checked)} />
                    <span>In-App Welcome Alert</span>
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50">
              {saving ? 'Saving to SQLite...' : initial ? 'Update Rider Profile' : 'Register Rider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PassengerFormModal: React.FC<{
  initial?: PassengerProfile | null;
  onSave: (passenger: PassengerProfile, channels: Array<'in_app' | 'sms' | 'whatsapp'>) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [fullName, setFullName] = useState(initial?.fullName || '');
  const [phone, setPhone] = useState(initial?.phone || '+256 77');
  const [whatsappNumber, setWhatsappNumber] = useState(initial?.whatsappNumber || '');
  const [district, setDistrict] = useState(initial?.district || 'Luweero');
  const [subCounty, setSubCounty] = useState(initial?.subCounty || 'Luweero Town Council');
  const [village, setVillage] = useState(initial?.village || '');
  const [residentialArea, setResidentialArea] = useState(initial?.residentialArea || '');
  const [trustedContactName, setTrustedContactName] = useState(initial?.trustedContactName || '');
  const [trustedContactPhone, setTrustedContactPhone] = useState(initial?.trustedContactPhone || '');
  const [phoneType, setPhoneType] = useState<'smartphone' | 'feature_phone'>(initial?.phoneType || 'smartphone');
  const [assistedRegistration, setAssistedRegistration] = useState(initial?.assistedRegistration ?? false);
  const [accountStatus, setAccountStatus] = useState<NonNullable<PassengerProfile['accountStatus']>>(initial?.accountStatus || 'active');
  const [verificationStatus, setVerificationStatus] = useState<NonNullable<PassengerProfile['verificationStatus']>>(initial?.verificationStatus || 'verified');
  const [sendSms, setSendSms] = useState(!initial);
  const [sendWa, setSendWa] = useState(false);
  const [sendApp, setSendApp] = useState(!initial && phoneType === 'smartphone');
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const photoCheck = storage.validateSafeImageUrl(avatarUrl);
    if (!photoCheck.valid) {
      setErr(photoCheck.error || 'Invalid profile photograph.');
      return;
    }
    setSaving(true);
    try {
      const payload: PassengerProfile = {
        ...(initial || {
          id: `pass-${Date.now()}`,
          userId: `user-pass-${Date.now()}`,
          passengerIdNumber: '',
          rating: 5.0,
          totalRides: 0,
        }),
        avatarUrl: photoCheck.cleanUrl,
        fullName: fullName.trim(),
        phone: phone.trim(),
        whatsappNumber: whatsappNumber.trim() || undefined,
        district: district.trim() || 'Luweero',
        subCounty: subCounty.trim() || 'Luweero Town Council',
        village: village.trim() || undefined,
        residentialArea: residentialArea.trim() || `${village || subCounty}, ${district}`,
        trustedContactName: trustedContactName.trim() || 'Not specified',
        trustedContactPhone: trustedContactPhone.trim() || '+256772100240',
        phoneType,
        assistedRegistration: phoneType === 'feature_phone' ? true : assistedRegistration,
        accountStatus,
        verificationStatus,
      };
      const channels: Array<'in_app' | 'sms' | 'whatsapp'> = [];
      if (!initial) {
        if (sendApp && phoneType === 'smartphone') channels.push('in_app');
        if (sendSms) channels.push('sms');
        if (sendWa) channels.push('whatsapp');
      }
      await onSave(payload, channels);
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to save passenger.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-auto mx-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              {initial ? `Edit Passenger: ${initial.fullName} (${initial.passengerIdNumber})` : 'Register New Passenger'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {err && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <PhotoUploadControl
            label="Passenger Profile Photograph"
            value={avatarUrl}
            onChange={setAvatarUrl}
            onError={setErr}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telephone Number *</label>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">WhatsApp Number (Optional)</label>
              <input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Device Type *</label>
              <select value={phoneType} onChange={(e) => setPhoneType(e.target.value as 'smartphone' | 'feature_phone')} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold">
                <option value="smartphone">Smartphone</option>
                <option value="feature_phone">Button / Non-Smartphone</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">District *</label>
              <input required value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sub-County / Town *</label>
              <select value={subCounty} onChange={(e) => setSubCounty(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                {SUB_COUNTIES.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Village / Trading Centre</label>
              <input value={village} onChange={(e) => setVillage(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Residential Landmark</label>
              <input value={residentialArea} onChange={(e) => setResidentialArea(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trusted Next-of-Kin Name</label>
              <input value={trustedContactName} onChange={(e) => setTrustedContactName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trusted Next-of-Kin Phone</label>
              <input value={trustedContactPhone} onChange={(e) => setTrustedContactPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
              <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value as NonNullable<PassengerProfile['accountStatus']>)} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Verification Status</label>
              <select value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value as NonNullable<PassengerProfile['verificationStatus']>)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
            <input type="checkbox" checked={assistedRegistration} onChange={(e) => setAssistedRegistration(e.target.checked)} />
            <span className="font-semibold text-amber-950">Assisted / Non-Smartphone Registration (Member calls or dials USSD rather than using app)</span>
          </label>

          {!initial && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
              <p className="font-bold text-sky-950">Send Registration Confirmation</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} />
                  <span>SMS Confirmation</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={sendWa} onChange={(e) => setSendWa(e.target.checked)} />
                  <span>WhatsApp</span>
                </label>
                {phoneType === 'smartphone' && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={sendApp} onChange={(e) => setSendApp(e.target.checked)} />
                    <span>In-App Alert</span>
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50">
              {saving ? 'Saving...' : initial ? 'Update Passenger' : 'Register Passenger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const StationFormModal: React.FC<{
  initial?: BatterySwapStation | null;
  onSave: (station: BatterySwapStation) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name || '');
  const [operatorName, setOperatorName] = useState(initial?.operatorName || '');
  const [operatorPhone, setOperatorPhone] = useState(initial?.operatorPhone || '+256 7');
  const [district, setDistrict] = useState(initial?.district || 'Luweero');
  const [subCounty, setSubCounty] = useState(initial?.subCounty || 'Kikyusa');
  const [village, setVillage] = useState(initial?.village || '');
  const [locationName, setLocationName] = useState(initial?.locationName || '');
  const [lat, setLat] = useState(String(initial?.lat ?? 0.8145));
  const [lng, setLng] = useState(String(initial?.lng ?? 32.6121));
  const [batteryBrand, setBatteryBrand] = useState<BatteryBrand>(initial?.batteryBrand || 'Bodawerk');
  const [supportedTypesText, setSupportedTypesText] = useState(
    initial?.supportedBatteryTypes?.join(', ') || 'Bodawerk 48V 50Ah LiFePO4, Universal 48V'
  );
  const [connectorType, setConnectorType] = useState(initial?.connectorType || 'Chogori 2+1+5 Pin');
  const [totalBatteries, setTotalBatteries] = useState(String(initial?.totalBatteries ?? 20));
  const [availableBatteries, setAvailableBatteries] = useState(String(initial?.availableBatteries ?? 12));
  const [chargingBatteries, setChargingBatteries] = useState(String(initial?.chargingBatteries ?? 8));
  const [swapFeeUgx, setSwapFeeUgx] = useState(String(initial?.swapFeeUgx ?? 3500));
  const [servicesOffered, setServicesOffered] = useState<NonNullable<BatterySwapStation['servicesOffered']>>(
    initial?.servicesOffered || 'both'
  );
  const [operatingHours, setOperatingHours] = useState(initial?.operatingHours || '06:00 AM - 10:00 PM');
  const [powerSource, setPowerSource] = useState<BatterySwapStation['powerSource']>(initial?.powerSource || 'solar_hybrid');
  const [status, setStatus] = useState<BatterySwapStation['status']>(initial?.status || 'operational');
  const [verified, setVerified] = useState(initial?.verified ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const payload: BatterySwapStation = {
        ...(initial || {
          id: `station-${Date.now()}`,
          rating: 4.8,
          amenities: ['24/7 Attendant'],
        }),
        name: name.trim(),
        operatorName: operatorName.trim(),
        operatorPhone: operatorPhone.trim(),
        district: district.trim() || 'Luweero',
        subCounty: subCounty.trim(),
        village: village.trim() || undefined,
        locationName: locationName.trim(),
        lat: Number(lat) || 0.8145,
        lng: Number(lng) || 32.6121,
        batteryBrand,
        supportedBatteryTypes: supportedTypesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        connectorType: connectorType.trim(),
        totalBatteries: Number(totalBatteries) || 0,
        availableBatteries: Number(availableBatteries) || 0,
        chargingBatteries: Number(chargingBatteries) || 0,
        swapFeeUgx: Number(swapFeeUgx) || 3500,
        servicesOffered,
        operatingHours: operatingHours.trim(),
        powerSource,
        status,
        verified,
        lastStockUpdate: new Date().toISOString(),
      };
      await onSave(payload);
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to save station.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-auto mx-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              {initial ? `Edit Swap Station: ${initial.name}` : 'Register New Electric Battery Swap Station'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {err && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Station Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Battery Brand *</label>
              <select value={batteryBrand} onChange={(e) => setBatteryBrand(e.target.value as BatteryBrand)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                {(['Bodawerk', 'Zembo', 'Spiro', 'ARC Ride', 'Universal'] as BatteryBrand[]).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Operator Name *</label>
              <input required value={operatorName} onChange={(e) => setOperatorName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operator Phone *</label>
              <input required value={operatorPhone} onChange={(e) => setOperatorPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">District</label>
              <input required value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sub-County / Town *</label>
              <select value={subCounty} onChange={(e) => setSubCounty(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                {SUB_COUNTIES.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Village / Trading Centre</label>
              <input value={village} onChange={(e) => setVillage(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Physical Location / Landmark *</label>
              <input required value={locationName} onChange={(e) => setLocationName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GPS Latitude *</label>
              <input required type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GPS Longitude *</label>
              <input required type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Packs</label>
              <input type="number" value={totalBatteries} onChange={(e) => setTotalBatteries(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Available Charged</label>
              <input type="number" value={availableBatteries} onChange={(e) => setAvailableBatteries(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Charging Now</label>
              <input type="number" value={chargingBatteries} onChange={(e) => setChargingBatteries(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Swap Fee (UGX)</label>
              <input type="number" value={swapFeeUgx} onChange={(e) => setSwapFeeUgx(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supported Battery Types (comma-separated)</label>
              <input value={supportedTypesText} onChange={(e) => setSupportedTypesText(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Services Offered</label>
              <select value={servicesOffered} onChange={(e) => setServicesOffered(e.target.value as 'swapping' | 'charging' | 'both')} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="both">Battery Swapping &amp; Fast Charging</option>
                <option value="swapping">Battery Swapping Only</option>
                <option value="charging">Direct Plug-In Charging Only</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operating Hours *</label>
              <input required value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Station Operational Status *</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as BatterySwapStation['status'])} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold">
                <option value="operational">Operational</option>
                <option value="temporarily_closed">Temporarily Closed</option>
                <option value="unavailable">Unavailable</option>
                <option value="congested">Congested</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Power Source</label>
              <select value={powerSource} onChange={(e) => setPowerSource(e.target.value as BatterySwapStation['powerSource'])} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="solar_hybrid">Solar + Grid Hybrid</option>
                <option value="solar_only">100% Solar Mini-Grid</option>
                <option value="grid">National Grid (Umeme)</option>
                <option value="generator_backup">Grid + Generator Backup</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Connector Specification</label>
              <input value={connectorType} onChange={(e) => setConnectorType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
          </div>

          <label className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
            <span className="font-semibold text-emerald-950">Verified by BodaCare Technical Team</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer">
              {saving ? 'Saving...' : initial ? 'Save Station Changes' : 'Register Swap Station'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const MaintenanceCentreFormModal: React.FC<{
  initial?: BusinessListing | null;
  onSave: (centre: BusinessListing) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name || '');
  const [ownerName, setOwnerName] = useState(initial?.ownerName || '');
  const [phone, setPhone] = useState(initial?.phone || '+256 7');
  const [category, setCategory] = useState<BusinessListing['category']>(initial?.category || 'garage');
  const [district, setDistrict] = useState(initial?.district || 'Luweero');
  const [subCounty, setSubCounty] = useState(initial?.subCounty || 'Kikyusa');
  const [village, setVillage] = useState(initial?.village || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [lat, setLat] = useState(String(initial?.lat ?? 0.815));
  const [lng, setLng] = useState(String(initial?.lng ?? 32.613));
  const [bikeTypesServiced, setBikeTypesServiced] = useState<'petrol' | 'electric' | 'both'>(
    initial?.bikeTypesServiced || 'both'
  );
  const [brandsText, setBrandsText] = useState(
    initial?.brandsServiced?.join(', ') || 'Bajaj Boxer, TVS HLX, Bodawerk E-Boda'
  );
  const [servicesSummary, setServicesSummary] = useState(
    initial?.servicesSummary || initial?.services?.map((s) => s.name).join(', ') || 'Engine Repair, Tyre Vulcanising, Brake & Chain'
  );
  const [operatingHours, setOperatingHours] = useState(initial?.operatingHours || '07:00 AM - 08:00 PM');
  const [emergencyCallout, setEmergencyCallout] = useState(initial?.emergencyCallout ?? false);
  const [verified, setVerified] = useState(initial?.verified ?? true);
  const [accountStatus, setAccountStatus] = useState<NonNullable<BusinessListing['accountStatus']>>(
    initial?.accountStatus || 'active'
  );
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const photoCheck = storage.validateSafeImageUrl(imageUrl);
    if (!photoCheck.valid) {
      setErr(photoCheck.error || 'Invalid workshop photo.');
      return;
    }
    setSaving(true);
    try {
      const parsedServices = servicesSummary
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ name: s, description: 'Workshop certified service' }));

      const payload: BusinessListing = {
        ...(initial || {
          id: `biz-${Date.now()}`,
          rating: 4.8,
          reviewCount: 0,
          isPromoted: false,
        }),
        imageUrl: photoCheck.cleanUrl || undefined,
        name: name.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        category,
        district: district.trim() || 'Luweero',
        subCounty: subCounty.trim(),
        village: village.trim() || undefined,
        location: location.trim(),
        lat: Number(lat) || 0.815,
        lng: Number(lng) || 32.613,
        bikeTypesServiced,
        brandsServiced: brandsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        servicesSummary: servicesSummary.trim(),
        services: parsedServices.length > 0 ? parsedServices : [{ name: 'General Boda Servicing', description: 'Standard check' }],
        operatingHours: operatingHours.trim(),
        emergencyCallout,
        verified,
        accountStatus,
      };
      await onSave(payload);
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to save maintenance centre.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-auto mx-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900">
              {initial ? `Edit Maintenance Centre: ${initial.name}` : 'Register Motorcycle Garage / Maintenance Centre'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {err && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <PhotoUploadControl
            label="Garage / Mechanic Photo (Optional)"
            value={imageUrl}
            onChange={setImageUrl}
            onError={setErr}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Garage / Centre Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lead Mechanic / Contact Person *</label>
              <input required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Telephone *</label>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Centre Type</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as BusinessListing['category'])} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="garage">Full Motorcycle Garage</option>
                <option value="mechanic">Mobile / Certified Mechanic</option>
                <option value="spares">Genuine Spare Parts Dealer</option>
                <option value="tyres">Tyre Repair &amp; Vulcanising</option>
                <option value="towing">Roadside Rescue &amp; Towing</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">District</label>
              <input required value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sub-County / Town *</label>
              <select value={subCounty} onChange={(e) => setSubCounty(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                {SUB_COUNTIES.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Village / Trading Centre</label>
              <input value={village} onChange={(e) => setVillage(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Physical Address *</label>
              <input required value={location} onChange={(e) => setLocation(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GPS Latitude</label>
              <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GPS Longitude</label>
              <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Motorcycles Serviced *</label>
              <select value={bikeTypesServiced} onChange={(e) => setBikeTypesServiced(e.target.value as 'petrol' | 'electric' | 'both')} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold">
                <option value="both">Both Electric &amp; Petrol Motorcycles</option>
                <option value="petrol">Petrol Motorcycles Only</option>
                <option value="electric">Electric Bodas Only</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operating Hours *</label>
              <input required value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Motorcycle Brands Serviced (comma-separated)</label>
            <input value={brandsText} onChange={(e) => setBrandsText(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Repair Services Offered (comma-separated)</label>
            <input required value={servicesSummary} onChange={(e) => setServicesSummary(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
              <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value as 'active' | 'suspended' | 'deactivated')} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="deactivated">Deactivated</option>
              </select>
            </div>
            <label className="flex items-center gap-2 pt-4 cursor-pointer">
              <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
              <span className="font-semibold">Verified Partner</span>
            </label>
            <label className="flex items-center gap-2 pt-4 cursor-pointer">
              <input type="checkbox" checked={emergencyCallout} onChange={(e) => setEmergencyCallout(e.target.checked)} />
              <span className="font-semibold">24/7 Roadside Callout</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer">
              {saving ? 'Saving...' : initial ? 'Update Centre' : 'Register Centre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const StageFormModal: React.FC<{
  initial?: Stage | null;
  onSave: (stage: Stage) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name || '');
  const [district, setDistrict] = useState(initial?.district || 'Luweero');
  const [subCounty, setSubCounty] = useState(initial?.subCounty || 'Kikyusa');
  const [parish, setParish] = useState(initial?.parish || '');
  const [village, setVillage] = useState(initial?.village || '');
  const [landmark, setLandmark] = useState(initial?.landmark || '');
  const [leaderName, setLeaderName] = useState(initial?.leaderName || '');
  const [leaderPhone, setLeaderPhone] = useState(initial?.leaderPhone || '+256 7');
  const [dailyWelfareFeeUgx, setDailyWelfareFeeUgx] = useState(String(initial?.dailyWelfareFeeUgx ?? 1000));
  const [memberCount, setMemberCount] = useState(String(initial?.memberCount ?? 0));
  const [lat, setLat] = useState(String(initial?.lat ?? 0.8145));
  const [lng, setLng] = useState(String(initial?.lng ?? 32.6121));
  const [servicesText, setServicesText] = useState(
    initial?.servicesAvailable?.join(', ') || 'Passenger Rides, Produce Transport, Parcel Dispatch'
  );
  const [operatingStatus, setOperatingStatus] = useState<NonNullable<Stage['operatingStatus']>>(
    initial?.operatingStatus || 'active'
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const payload: Stage = {
        ...(initial || { id: `stage-${Date.now()}` }),
        name: name.trim(),
        district: district.trim() || 'Luweero',
        subCounty: subCounty.trim(),
        parish: parish.trim() || undefined,
        village: village.trim() || undefined,
        landmark: landmark.trim(),
        leaderName: leaderName.trim(),
        leaderPhone: leaderPhone.trim(),
        dailyWelfareFeeUgx: Number(dailyWelfareFeeUgx) || 1000,
        memberCount: Number(memberCount) || 0,
        lat: Number(lat) || 0.8145,
        lng: Number(lng) || 32.6121,
        servicesAvailable: servicesText.split(',').map((s) => s.trim()).filter(Boolean),
        operatingStatus,
      };
      await onSave(payload);
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to save boda stage.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-auto mx-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              {initial ? `Edit Boda Stage: ${initial.name}` : 'Register New Boda-Boda Stage'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {err && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stage Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operating Status</label>
              <select value={operatingStatus} onChange={(e) => setOperatingStatus(e.target.value as 'active' | 'suspended' | 'closed')} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">District *</label>
              <input required value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sub-County / Town *</label>
              <select value={subCounty} onChange={(e) => setSubCounty(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                {SUB_COUNTIES.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Parish</label>
              <input value={parish} onChange={(e) => setParish(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Village / Trading Centre</label>
              <input value={village} onChange={(e) => setVillage(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Landmark / Location Notes *</label>
              <input required value={landmark} onChange={(e) => setLandmark(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Chairman / Stage Leader *</label>
              <input required value={leaderName} onChange={(e) => setLeaderName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Leader Telephone *</label>
              <input required value={leaderPhone} onChange={(e) => setLeaderPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GPS Latitude</label>
              <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GPS Longitude</label>
              <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reported Member Count</label>
              <input type="number" value={memberCount} onChange={(e) => setMemberCount(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Daily Welfare Fee (UGX)</label>
              <input type="number" value={dailyWelfareFeeUgx} onChange={(e) => setDailyWelfareFeeUgx(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Available Services (comma-separated)</label>
              <input value={servicesText} onChange={(e) => setServicesText(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer">
              {saving ? 'Saving...' : initial ? 'Update Stage' : 'Register Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const StageDetailModal: React.FC<{
  stage: Stage;
  allStages: Stage[];
  riders: RiderProfile[];
  onTransferRider: (riderId: string, targetStageId: string) => Promise<void>;
  onClose: () => void;
}> = ({ stage, allStages, riders, onTransferRider, onClose }) => {
  const stageRiders = riders.filter((r) => r.stageId === stage.id);
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>({});
  const [busyRiderId, setBusyRiderId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-auto mx-auto">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded">
              {stage.stageCode || stage.id}
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">{stage.name}</h3>
            <p className="text-xs text-slate-500">
              {stage.village ? `${stage.village}, ` : ''}{stage.subCounty}, {stage.district} District · GPS ({stage.lat}, {stage.lng})
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
          <p><strong>Chairman:</strong> {stage.leaderName} ({stage.leaderPhone})</p>
          <p><strong>Operating Status:</strong> <span className="uppercase font-bold">{stage.operatingStatus || 'active'}</span></p>
          <p><strong>Landmark:</strong> {stage.landmark}</p>
          <p><strong>Member Count:</strong> {stageRiders.length} in database ({stage.memberCount} registered stage roster)</p>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Assigned Riders at This Stage ({stageRiders.length})
          </h4>
          {stageRiders.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">No individual riders assigned to this stage yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stageRiders.map((r) => {
                const targetId = transferTargets[r.id] || '';
                return (
                  <div key={r.id} className="p-2.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{r.fullName} <span className="font-mono text-[10px] text-slate-500">({r.riderIdNumber})</span></p>
                      <p className="text-[11px] text-slate-600">{r.motorcycleReg} · {r.motorcycleType.toUpperCase()} · {r.phone}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={targetId}
                        onChange={(e) => setTransferTargets({ ...transferTargets, [r.id]: e.target.value })}
                        className="text-[11px] p-1.5 border border-slate-300 rounded-lg bg-slate-50"
                      >
                        <option value="">Transfer to stage...</option>
                        {allStages
                          .filter((other) => other.id !== stage.id)
                          .map((other) => (
                            <option key={other.id} value={other.id}>{other.name}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!targetId || busyRiderId === r.id}
                        onClick={async () => {
                          setBusyRiderId(r.id);
                          try {
                            await onTransferRider(r.id, targetId);
                          } finally {
                            setBusyRiderId(null);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Transfer</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminAccountFormModal: React.FC<{
  initial?: AdminAccount | null;
  onSave: (admin: AdminAccount) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [fullName, setFullName] = useState(initial?.fullName || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [phone, setPhone] = useState(initial?.phone || '+256 7');
  const [role, setRole] = useState<AdminAccount['role']>(initial?.role || 'operations_admin');
  const [status, setStatus] = useState<AdminAccount['status']>(initial?.status || 'active');
  const [perms, setPerms] = useState<AdminPermissions>(
    initial?.permissions || {
      manageRiders: true,
      managePassengers: true,
      manageJobs: true,
      manageStations: true,
      manageCentres: true,
      manageStages: true,
      sendNotifications: false,
      viewAnalytics: true,
      manageAdmins: false,
      deleteRecords: false,
    }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) {
      if (role === 'verifier_admin') {
        setPerms({
          manageRiders: true,
          managePassengers: true,
          manageJobs: false,
          manageStations: true,
          manageCentres: true,
          manageStages: false,
          sendNotifications: false,
          viewAnalytics: true,
          manageAdmins: false,
          deleteRecords: false,
        });
      } else if (role === 'support_admin') {
        setPerms({
          manageRiders: false,
          managePassengers: true,
          manageJobs: false,
          manageStations: false,
          manageCentres: false,
          manageStages: false,
          sendNotifications: true,
          viewAnalytics: true,
          manageAdmins: false,
          deleteRecords: false,
        });
      }
    }
  }, [role, initial]);

  const togglePerm = (key: keyof AdminPermissions) => {
    setPerms({ ...perms, [key]: !perms[key] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const payload: AdminAccount = {
        ...(initial || {
          id: `adm-${Date.now()}`,
          adminCode: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        permissions: perms,
        status,
      };
      await onSave(payload);
      onClose();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to save admin account.');
    } finally {
      setSaving(false);
    }
  };

  const permLabels: Array<{ key: keyof AdminPermissions; label: string }> = [
    { key: 'manageRiders', label: 'Register & Edit Riders' },
    { key: 'managePassengers', label: 'Register & Edit Passengers' },
    { key: 'manageJobs', label: 'Manage & Verify Jobs' },
    { key: 'manageStations', label: 'Manage Swap Stations' },
    { key: 'manageCentres', label: 'Manage Maintenance Centres' },
    { key: 'manageStages', label: 'Manage Stages & Transfers' },
    { key: 'sendNotifications', label: 'Send SMS / WhatsApp Alerts' },
    { key: 'viewAnalytics', label: 'View Analytics & Export' },
    { key: 'deleteRecords', label: 'Delete Database Records' },
    { key: 'manageAdmins', label: 'Manage Admin RBAC Roles' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-auto mx-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              {initial ? `Edit Admin Access: ${initial.fullName}` : 'Add Restricted Administrator Account'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {err && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">{err}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telephone *</label>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Admin Role Level *</label>
              <select value={role} onChange={(e) => setRole(e.target.value as AdminAccount['role'])} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold">
                <option value="operations_admin">Operations Admin (Field &amp; Registry)</option>
                <option value="verifier_admin">Verification Admin (KYC &amp; Stations)</option>
                <option value="support_admin">Support &amp; Dispatch Admin</option>
                <option value="super_admin">Super Admin (Unrestricted)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <p className="font-bold text-slate-900">Granular RBAC Permissions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {permLabels.map((item) => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={role === 'super_admin'}
                    checked={role === 'super_admin' ? true : perms[item.key]}
                    onChange={() => togglePerm(item.key)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'suspended')} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
              <option value="active">Active</option>
              <option value="suspended">Suspended (Access Revoked)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer">
              {saving ? 'Saving...' : 'Save Admin Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const QuickJobModal: React.FC<{
  initial?: BodaJob | null;
  onSave: (job: BodaJob) => Promise<void>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const [title, setTitle] = useState(initial?.title || '');
  const [employerCompany, setEmployerCompany] = useState(initial?.employerCompany || '');
  const [employerName, setEmployerName] = useState(initial?.employerName || '');
  const [employerPhone, setEmployerPhone] = useState(initial?.employerPhone || '+256 7');
  const [type, setType] = useState<BodaJob['type']>(initial?.type || 'produce_transport');
  const [district, setDistrict] = useState(initial?.district || 'Luweero');
  const [subCounty, setSubCounty] = useState(initial?.subCounty || 'Kikyusa');
  const [village, setVillage] = useState(initial?.village || '');
  const [pickupLocation, setPickupLocation] = useState(initial?.pickupLocation || '');
  const [deliveryLocation, setDeliveryLocation] = useState(initial?.deliveryLocation || '');
  const [paymentAmountUgx, setPaymentAmountUgx] = useState(String(initial?.paymentAmountUgx ?? 30000));
  const [deadline, setDeadline] = useState(initial?.deadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [requiredMotorcycleType, setRequiredMotorcycleType] = useState<BodaJob['requiredMotorcycleType']>(initial?.requiredMotorcycleType || 'any');
  const [status, setStatus] = useState<BodaJob['status']>(initial?.status || 'open');
  const [adminApproved, setAdminApproved] = useState(initial?.adminApproved ?? true);
  const [description, setDescription] = useState(initial?.description || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: BodaJob = {
        ...(initial || {
          id: `job-${Date.now()}`,
          employerId: `emp-${Date.now()}`,
          distanceKm: 10,
          paymentFrequency: 'per_trip',
          postedDate: new Date().toISOString().split('T')[0],
          applicationsCount: 0,
        }),
        title: title.trim(),
        employerCompany: employerCompany.trim(),
        employerName: employerName.trim() || employerCompany.trim(),
        employerPhone: employerPhone.trim(),
        type,
        district: district.trim() || 'Luweero',
        subCounty: subCounty.trim(),
        village: village.trim() || undefined,
        pickupLocation: pickupLocation.trim() || `${subCounty} Centre`,
        deliveryLocation: deliveryLocation.trim() || 'Luweero Town',
        paymentAmountUgx: Number(paymentAmountUgx) || 30000,
        deadline,
        requiredMotorcycleType,
        status,
        adminApproved,
        verifiedBy: adminApproved ? 'Super Admin' : undefined,
        verifiedAt: adminApproved ? new Date().toISOString() : undefined,
        description: description.trim() || title.trim(),
      };
      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-auto mx-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">{initial ? 'Edit Boda Job' : 'Create & Verify Boda Job'}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Job Title *</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employer / Business *</label>
              <input required value={employerCompany} onChange={(e) => setEmployerCompany(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employer Phone *</label>
              <input required value={employerPhone} onChange={(e) => setEmployerPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
              <input value={employerName} onChange={(e) => setEmployerName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Job Category</label>
              <select value={type} onChange={(e) => setType(e.target.value as BodaJob['type'])} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="produce_transport">Agricultural Produce</option>
                <option value="parcel_delivery">Parcel &amp; Cargo Delivery</option>
                <option value="scheduled_courier">Scheduled Courier</option>
                <option value="corporate_boda">Corporate Boda Contract</option>
                <option value="passenger_contract">Passenger Transport Contract</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sub-County *</label>
              <select value={subCounty} onChange={(e) => setSubCounty(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                {SUB_COUNTIES.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Village / Area</label>
              <input value={village} onChange={(e) => setVillage(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pickup Point</label>
              <input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Delivery Point</label>
              <input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Salary / Pay (UGX) *</label>
              <input required type="number" value={paymentAmountUgx} onChange={(e) => setPaymentAmountUgx(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deadline *</label>
              <input required type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Required Bike Type</label>
              <select value={requiredMotorcycleType} onChange={(e) => setRequiredMotorcycleType(e.target.value as 'any' | 'electric' | 'petrol')} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="any">Any (Electric or Petrol)</option>
                <option value="electric">Electric Boda Only</option>
                <option value="petrol">Petrol Motorcycle Only</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as BodaJob['status'])} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold">
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="completed">Completed</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Job Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
          </div>

          <label className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer">
            <input type="checkbox" checked={adminApproved} onChange={(e) => setAdminApproved(e.target.checked)} />
            <span className="font-semibold text-emerald-950">Admin Verified &amp; Approved for Publishing / SMS Alerts</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer">
              {saving ? 'Saving...' : 'Save Job Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
