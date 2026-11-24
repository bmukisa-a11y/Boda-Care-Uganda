import React, { useState } from 'react';
import {
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Bike,
  CreditCard,
  FileText,
  Phone,
  MapPin,
  CheckCircle2,
  X,
  Upload,
  Calendar,
  AlertTriangle,
  QrCode,
  Award,
  Zap,
  Clock,
} from 'lucide-react';
import { RiderProfile, VerificationStatus } from '../../types';
import { storage } from '../../lib/storage';
import { translations, Language } from '../../lib/i18n';
import { RiderJobAlertsCard } from './RiderJobAlertsCard';

interface RiderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  rider: RiderProfile;
  lang?: Language;
  onRiderUpdated?: (updated: RiderProfile) => void;
  onProfileUpdated?: (updated: RiderProfile) => void;
}

export const RiderProfileModal: React.FC<RiderProfileModalProps> = ({
  isOpen,
  onClose,
  rider,
  lang = 'en',
  onRiderUpdated,
  onProfileUpdated,
}) => {
  const t = translations[lang];

  const handleUpdate = (updated: RiderProfile) => {
    if (onRiderUpdated) onRiderUpdated(updated);
    if (onProfileUpdated) onProfileUpdated(updated);
  };

  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'id_badge' | 'job_alerts'>('profile');

  // Form editable state
  const [fullName, setFullName] = useState(rider.fullName);
  const [phone, setPhone] = useState(rider.phone);
  const [residentialArea, setResidentialArea] = useState(rider.residentialArea);
  const [motorcycleReg, setMotorcycleReg] = useState(rider.motorcycleReg);
  const [motorcycleMakeModel, setMotorcycleMakeModel] = useState(rider.motorcycleMakeModel);
  const [motorcycleType, setMotorcycleType] = useState<'electric' | 'petrol'>(rider.motorcycleType || 'electric');
  const [batteryModel, setBatteryModel] = useState(rider.batteryModel || 'Bodawerk 48V 50Ah');
  const [emergencyContactName, setEmergencyContactName] = useState(rider.emergencyContactName);
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(rider.emergencyContactPhone);

  // Document URLs
  const [ninDoc, setNinDoc] = useState(rider.ninDocumentUrl || '');
  const [permitDoc, setPermitDoc] = useState(rider.permitDocumentUrl || '');
  const [stageLetterDoc, setStageLetterDoc] = useState(rider.stageLetterUrl || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RiderProfile = {
      ...rider,
      fullName: fullName.trim(),
      phone: phone.trim(),
      residentialArea: residentialArea.trim(),
      motorcycleReg: motorcycleReg.trim().toUpperCase(),
      motorcycleMakeModel: motorcycleMakeModel.trim(),
      motorcycleType,
      batteryModel: motorcycleType === 'electric' ? batteryModel.trim() : undefined,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      ninDocumentUrl: ninDoc || undefined,
      permitDocumentUrl: permitDoc || undefined,
      stageLetterUrl: stageLetterDoc || undefined,
    };

    storage.saveRider(updated);
    handleUpdate(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const statusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Official Rider</span>
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Documents Under Review</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Verification Rejected</span>
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-600" />
            <span>Account Suspended</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Pending Documents</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#0B192C] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative">
              <img
                src={rider.avatarUrl}
                alt={rider.fullName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-lg"
              />
              {rider.motorcycleType === 'electric' && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-lg shadow" title="Electric E-Boda">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-extrabold tracking-tight text-white">{rider.fullName}</h2>
                {statusBadge(rider.verificationStatus)}
              </div>
              <p className="text-xs text-slate-300 font-mono flex items-center gap-2">
                <span>Rider ID: <strong className="text-amber-400">{rider.riderIdNumber || 'BCU-LWR-0421'}</strong></span>
                <span>•</span>
                <span>Stage: {rider.stageName}</span>
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Profile & Bike Details
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Verification Documents
            </button>
            <button
              onClick={() => setActiveTab('id_badge')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'id_badge'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Official Digital Badge
            </button>
            <button
              onClick={() => setActiveTab('job_alerts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'job_alerts'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              SMS &amp; Job Alerts
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {saveSuccess && (
            <div className="mb-4 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Rider profile details updated successfully!</span>
            </div>
          )}

          {/* Rejection Warning Banner */}
          {rider.verificationStatus === 'rejected' && rider.rejectionReason && (
            <div className="mb-4 bg-rose-50 text-rose-800 border border-rose-200 text-xs p-3.5 rounded-xl space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Verification Feedback from Brian Mukisa (Admin):</span>
              </p>
              <p className="text-rose-700 leading-relaxed">{rider.rejectionReason}</p>
              <p className="text-[11px] text-rose-500 pt-1">
                Please update your details or re-upload clear photos below to request re-evaluation.
              </p>
            </div>
          )}

          {/* TAB 1: PROFILE & BIKE DETAILS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Phone Number (+256)</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">National ID NIN (Immutable)</label>
                  <input
                    type="text"
                    disabled
                    value={rider.nin}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Driving Permit License No.</label>
                  <input
                    type="text"
                    disabled
                    value={rider.permitNumber}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Residential Residence in Luweero</label>
                  <input
                    type="text"
                    value={residentialArea}
                    onChange={(e) => setResidentialArea(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Motorcycle Number Plate</label>
                  <input
                    type="text"
                    required
                    value={motorcycleReg}
                    onChange={(e) => setMotorcycleReg(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none font-mono uppercase font-bold"
                  />
                </div>
              </div>

              {/* Powertrain / Bike Specification */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-amber-600" />
                    <span>Powertrain & Motorcycle Technology</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMotorcycleType('electric')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        motorcycleType === 'electric'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      Electric E-Boda
                    </button>
                    <button
                      type="button"
                      onClick={() => setMotorcycleType('petrol')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        motorcycleType === 'petrol'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      Petrol Engine
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Motorcycle Make & Model</label>
                    <input
                      type="text"
                      value={motorcycleMakeModel}
                      onChange={(e) => setMotorcycleMakeModel(e.target.value)}
                      placeholder="e.g. Bodawerk E-Boda, Bajaj Boxer BM150, TVS HLX"
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  {motorcycleType === 'electric' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Battery Pack Specification</label>
                      <input
                        type="text"
                        value={batteryModel}
                        onChange={(e) => setBatteryModel(e.target.value)}
                        placeholder="e.g. Bodawerk 48V 50Ah LiFePO4"
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Next-of-Kin Name</label>
                  <input
                    type="text"
                    required
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: VERIFICATION DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Clear identification documents protect riders and passengers across Luweero District. Uploaded copies are reviewed exclusively by Mukisa Brian and certified stage inspectors.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* National ID Document */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">National ID (NIN)</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">CM91...4L</span>
                  </div>
                  {ninDoc ? (
                    <img src={ninDoc} alt="National ID" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                  ) : (
                    <div className="w-full h-28 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Upload className="w-6 h-6 mb-1 text-slate-300" />
                      <span>Upload Clear Front Photo</span>
                    </div>
                  )}
                  <input
                    type="url"
                    placeholder="Paste image URL or ID proof link"
                    value={ninDoc}
                    onChange={(e) => setNinDoc(e.target.value)}
                    className="w-full text-[11px] p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                {/* Driving Permit Class A */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Class A Driving Permit</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">UG-DL-A</span>
                  </div>
                  {permitDoc ? (
                    <img src={permitDoc} alt="Driving Permit" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                  ) : (
                    <div className="w-full h-28 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Upload className="w-6 h-6 mb-1 text-slate-300" />
                      <span>Upload Permit Photo</span>
                    </div>
                  )}
                  <input
                    type="url"
                    placeholder="Paste image URL or permit proof link"
                    value={permitDoc}
                    onChange={(e) => setPermitDoc(e.target.value)}
                    className="w-full text-[11px] p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                {/* Stage Chairman Clearance */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Stage Clearance Letter</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">Official Seal</span>
                  </div>
                  {stageLetterDoc ? (
                    <img src={stageLetterDoc} alt="Stage Clearance Letter" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                  ) : (
                    <div className="w-full h-28 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Upload className="w-6 h-6 mb-1 text-slate-300" />
                      <span>Chairman Endorsement</span>
                    </div>
                  )}
                  <input
                    type="url"
                    placeholder="Paste clearance letter photo link"
                    value={stageLetterDoc}
                    onChange={(e) => setStageLetterDoc(e.target.value)}
                    className="w-full text-[11px] p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  Submit Documents for Verification
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: OFFICIAL DIGITAL ID BADGE */}
          {activeTab === 'id_badge' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-5">
              {/* Virtual ID Card */}
              <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-[#0B192C] via-slate-900 to-[#102A43] text-white p-5 border-2 border-amber-400 shadow-2xl relative overflow-hidden">
                {/* Background watermarks */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm">
                      BC
                    </div>
                    <div>
                      <p className="font-extrabold text-xs tracking-tight">BODACARE UGANDA</p>
                      <p className="text-[9px] text-amber-400 font-semibold">Official Rider Identity Pass</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                    ACTIVE
                  </span>
                </div>

                <div className="flex gap-4 items-center my-4">
                  <img
                    src={rider.avatarUrl}
                    alt={rider.fullName}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
                  />
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-white leading-tight">{rider.fullName}</h3>
                    <p className="text-[11px] font-mono text-amber-300 font-bold">{rider.riderIdNumber || 'BCU-LWR-0421'}</p>
                    <p className="text-[11px] text-slate-300">Bike: <strong className="font-mono text-white">{rider.motorcycleReg}</strong></p>
                    <p className="text-[10px] text-slate-400">{rider.stageName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] font-mono mb-3">
                  <div>
                    <span className="text-slate-400 block">NIN</span>
                    <span className="font-bold text-white">{rider.nin}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">PERMIT (CLASS A)</span>
                    <span className="font-bold text-white">{rider.permitNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">POWERTRAIN</span>
                    <span className="font-bold text-emerald-400 uppercase">{rider.motorcycleType || 'ELECTRIC'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">SUBSCRIPTION</span>
                    <span className="font-bold text-amber-400 uppercase">{rider.subscriptionTier}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
                  <span>Authorized by Founder Mukisa Brian</span>
                  <span className="font-mono text-slate-500">Kikyusa, Luweero</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center max-w-sm">
                Riders can present this digital QR verification badge at checkpoints, passenger pickup points, and participating battery swap stations.
              </p>
            </div>
          )}

          {/* TAB 4: JOB ALERTS & PHONE TYPE PREFERENCES */}
          {activeTab === 'job_alerts' && (
            <RiderJobAlertsCard
              rider={rider}
              compact
              onUpdated={(updated) => handleUpdate(updated)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
