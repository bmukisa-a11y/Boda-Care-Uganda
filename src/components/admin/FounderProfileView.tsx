import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Save,
  CheckCircle2,
  Globe,
  Camera,
  ShieldCheck,
  Headphones,
  AlertTriangle,
  ExternalLink,
  Award,
} from 'lucide-react';
import { FounderProfile } from '../../types';
import { storage } from '../../lib/storage';
import { translations, Language } from '../../lib/i18n';

interface FounderProfileViewProps {
  lang: Language;
  onProfileUpdated?: (updated: FounderProfile) => void;
}

export const FounderProfileView: React.FC<FounderProfileViewProps> = ({
  lang,
  onProfileUpdated,
}) => {
  const t = translations[lang];
  const [profile, setProfile] = useState<FounderProfile>(() => storage.getFounderProfile());
  const [isSaved, setIsSaved] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(profile.fullName);
  const [title, setTitle] = useState(profile.title);
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [phone, setPhone] = useState(profile.phone);
  const [whatsappNumber, setWhatsappNumber] = useState(profile.whatsappNumber);
  const [email, setEmail] = useState(profile.email);
  const [location, setLocation] = useState(profile.location);
  const [description, setDescription] = useState(profile.description);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl);
  const [supportPhone, setSupportPhone] = useState(profile.supportPhone);
  const [supportEmail, setSupportEmail] = useState(profile.supportEmail);
  const [emergencyHotline, setEmergencyHotline] = useState(profile.emergencyHotline);
  const [website, setWebsite] = useState(profile.website || 'https://bodacare.ug');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FounderProfile = {
      fullName: fullName.trim(),
      title: title.trim(),
      businessName: businessName.trim(),
      phone: phone.trim(),
      whatsappNumber: whatsappNumber.trim(),
      email: email.trim(),
      location: location.trim(),
      description: description.trim(),
      photoUrl: photoUrl.trim(),
      supportPhone: supportPhone.trim(),
      supportEmail: supportEmail.trim(),
      emergencyHotline: emergencyHotline.trim(),
      website: website.trim(),
      updatedAt: new Date().toISOString(),
    };

    storage.saveFounderProfile(updated);
    setProfile(updated);
    setIsSaved(true);
    if (onProfileUpdated) onProfileUpdated(updated);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // WhatsApp link generator
  const cleanWaNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(
    `Hello ${fullName}, I am contacting you regarding BodaCare Uganda platform operations in Luweero.`
  )}`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0B192C] to-[#1E2E42] text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <img
                src={photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt={fullName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0B192C] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">{fullName}</h2>
                <span className="text-[11px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                  Platform Founder & Owner
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {title} · <strong className="text-amber-300">{businessName}</strong>
              </p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{location}</span>
                <span>·</span>
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Direct WhatsApp</span>
            </a>
            <a
              href={`tel:${phone}`}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Call Founder</span>
            </a>
          </div>
        </div>
      </div>

      {isSaved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Founder Profile and Business Settings saved successfully! Audit log created.</span>
        </div>
      )}

      {/* Edit Form Grid */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Founder & Business Details (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Owner & Enterprise Credentials</h3>
            <p className="text-xs text-slate-500">
              Manage your identity, enterprise registration, and public executive details.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Founder Full Name:
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Founder Title / Role:
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Legal Name:
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Business Location:
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Founder Direct Phone (+256):
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official WhatsApp Contact (+256):
              </label>
              <input
                type="tel"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email Address:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Website URL:
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Founder Profile Photograph URL:
            </label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business Mission & Description:
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Save Founder Profile & Settings</span>
            </button>
          </div>
        </div>

        {/* Right Column: Support & Emergency Channels (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-amber-500" />
                <span>Customer Support Channels</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Contacts displayed to riders and passengers in distress.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Support Phone:
                </label>
                <input
                  type="tel"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Support Email:
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Police Hotline:
                </label>
                <input
                  type="text"
                  value={emergencyHotline}
                  onChange={(e) => setEmergencyHotline(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-rose-400 focus:outline-none text-rose-700 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Business Entity Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs">
                BC
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{businessName}</h4>
                <p className="text-[10px] text-slate-400">Luweero District Pilot</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              "Owned and Managed by BodaCare Uganda."
            </p>
            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
              <p>Registered Operator: <strong>{fullName}</strong></p>
              <p>Uganda Data Protection Act 2019 Compliant</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
