import React, { useState } from 'react';
import { AlertOctagon, PhoneCall, MapPin, CheckCircle, Radio, X, Volume2, ShieldAlert } from 'lucide-react';
import { EmergencyIncident } from '../../types';
import { storage } from '../../lib/storage';
import { translations, Language } from '../../lib/i18n';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const SOSModal: React.FC<SOSModalProps> = ({ isOpen, onClose, lang }) => {
  const t = translations[lang];
  const [selectedCategory, setSelectedCategory] = useState<EmergencyIncident['category']>('road_accident');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedIncident, setSubmittedIncident] = useState<EmergencyIncident | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  if (!isOpen) return null;

  // Sound generator using Web Audio API for tactical beacon
  const playSirenBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
      setAudioPlaying(true);
      setTimeout(() => setAudioPlaying(false), 500);
    } catch {
      // Audio not permitted without user gesture or unsupported
    }
  };

  const handleTriggerSOS = () => {
    setIsSubmitting(true);
    playSirenBeep();

    setTimeout(() => {
      // Create emergency record centered around Luweero/Kikyusa coordinates
      const newIncident: EmergencyIncident = {
        id: `sos-${Date.now().toString().slice(-6)}`,
        riderId: 'rider-kato-moses',
        riderName: 'Kato Moses',
        riderPhone: '+256 774 912 304',
        motorcycleReg: 'UFG 421K',
        stageName: 'Kikyusa Main Stage',
        category: selectedCategory,
        timestamp: new Date().toISOString(),
        locationName: 'Luweero-Kikyusa Road, Luweero District',
        lat: 0.8145 + (Math.random() - 0.5) * 0.02,
        lng: 32.6121 + (Math.random() - 0.5) * 0.02,
        status: 'active',
        notes: notes.trim() || 'Immediate response requested via 1-Tap SOS.',
        dispatchedTo: [
          'Luweero Central Police Station (+256 414 610 220)',
          'Kikyusa Police Post Commander',
          'Chairman Mugisha David (Stage Leader)',
          'Nalubega Sarah (+256 779 120 445)',
        ],
      };

      storage.reportEmergency(newIncident);
      setSubmittedIncident(newIncident);
      setIsSubmitting(false);
    }, 800);
  };

  const categories: { id: EmergencyIncident['category']; label: string; desc: string }[] = [
    { id: 'road_accident', label: t.accident, desc: 'Crash involving boda, passenger, or pedestrian' },
    { id: 'motorcycle_theft', label: t.theft, desc: 'Bike snatched or hijack attempt in progress' },
    { id: 'robbery', label: t.robbery, desc: 'Armed mugging, waylaying, or physical threat' },
    { id: 'medical_emergency', label: t.medical, desc: 'Sudden collapse, injury, or severe bleeding' },
    { id: 'mechanical_breakdown', label: t.breakdown, desc: 'Seized engine or tyre burst in isolated area' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-rose-200">
        {/* Header */}
        <div className="bg-rose-700 text-white p-4 sm:p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <AlertOctagon className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">{t.emergencySOS}</h2>
              <p className="text-xs text-rose-100">BodaCare Luweero Emergency Network</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {!submittedIncident ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                <strong>Important Notice:</strong> BodaCare is an emergency dispatch aid. It transmits your GPS coordinates and profile to nearby stage leaders, trusted contacts, and Luweero Police. If in immediate life danger, also call Uganda Police on <strong>999 / 112</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Incident Category:
                </label>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'border-rose-600 bg-rose-50/60 ring-1 ring-rose-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{cat.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cat.desc}</p>
                      </div>
                      <Radio
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          selectedCategory === cat.id ? 'text-rose-600' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Details / Landmark (Optional):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Near Kalagala swamp turnoff, 2 men on unregistered red Bajaj..."
                  rows={2}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
                />
              </div>

              {/* Verified Location Info */}
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                <span>GPS Location: <strong>Luweero-Kikyusa Road (0.8145°N, 32.6121°E)</strong></span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleTriggerSOS}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <AlertOctagon className="w-5 h-5 text-amber-300" />
                  <span>{isSubmitting ? 'Transmitting Alert...' : 'SEND EMERGENCY ALERT NOW'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Confirmation View */
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Emergency Dispatched</h3>
                <p className="text-xs text-slate-500 mt-1">Incident ID: #{submittedIncident.id}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-left space-y-2 text-xs">
                <p className="font-semibold text-slate-900">Alert Broadcasted To:</p>
                <ul className="space-y-1.5 text-slate-600">
                  {submittedIncident.dispatchedTo.map((target, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                      <span>{target}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-500">
                  <span>Timestamp:</span>
                  <span className="font-mono">{new Date(submittedIncident.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Direct call action */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <div className="text-left text-xs">
                  <p className="font-bold text-rose-900">Luweero Central Police</p>
                  <p className="text-rose-700">Toll Free: 999 / 112</p>
                </div>
                <a
                  href="tel:999"
                  className="py-2 px-3 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-rose-700"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call 999</span>
                </a>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 text-white font-medium text-xs rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close Emergency Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
