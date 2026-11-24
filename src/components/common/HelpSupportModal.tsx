import React, { useState } from 'react';
import {
  HelpCircle,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  X,
  Send,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileQuestion,
  ShieldCheck
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { ComplaintReport } from '../../types';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'contact' | 'faq' | 'complaint'>('contact');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Complaint Form State
  const [complainantName, setComplainantName] = useState('Kato Moses');
  const [complainantPhone, setComplainantPhone] = useState('+256 774 912 304');
  const [complaintCategory, setComplaintCategory] = useState<ComplaintReport['category']>('fare_dispute');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintSuccess, setComplaintSuccess] = useState('');

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How do I get my BodaCare Uganda digital QR badge verified?',
      a: 'Go to your Rider Profile, upload your National ID (NIN), Driving Permit (Class A), and Stage Clearance letter. Founder Mukisa Brian and certified stage chairpersons inspect and approve your profile, generating your permanent BCU-LWR-XXXX ID.'
    },
    {
      q: 'Where can I swap my electric boda battery in Luweero?',
      a: 'Open the Battery Swap locator tab to find stations in Kikyusa (Bodawerk), Luweero Town (Zembo), Wobulenzi, Kasana Market, and Bamunanika. You can check ready batteries and reserve or get directions.'
    },
    {
      q: 'How does the Mobile Money subscription payment verification work?',
      a: 'Pay via MTN (0766848865) or Airtel (0731931455) registered to Mukisa Brian. Enter your transaction code in the verification screen. Our system strictly checks for duplicates and prevents fraudulent or repeated transaction numbers.'
    },
    {
      q: 'What happens when I trigger the 1-Tap Emergency SOS?',
      a: 'Your real-time GPS coordinates are transmitted directly to Luweero Central Police Station, Kikyusa Police Post, and your Stage Leader. The system verifies delivery receipt with the SMS telecom gateway before confirming.'
    },
    {
      q: 'Can motorcycle mechanics register their garage on BodaCare?',
      a: 'Yes. Mechanics in Kikyusa, Luweero Town, and Wobulenzi can register their workshops, offer certified maintenance logs, and receive roadside breakdown alerts.'
    }
  ];

  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintSubject.trim() || !complaintDescription.trim()) return;

    setComplaintSubmitting(true);
    setTimeout(() => {
      const newComplaint: ComplaintReport = {
        id: `cmp-${Date.now().toString().slice(-6)}`,
        userId: 'user-kato-moses',
        userName: complainantName,
        userPhone: complainantPhone,
        userRole: 'rider',
        category: complaintCategory,
        subject: complaintSubject,
        description: complaintDescription,
        status: 'open',
        submittedAt: new Date().toISOString()
      };

      storage.submitComplaint(newComplaint);
      setComplaintSubmitting(false);
      setComplaintSuccess('Your complaint has been formally logged and forwarded to Founder Mukisa Brian for review.');
      setTimeout(() => {
        setComplaintSuccess('');
        setComplaintSubject('');
        setComplaintDescription('');
        setActiveTab('contact');
      }, 2000);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0B192C] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">BodaCare Help & Customer Support</h2>
              <p className="text-xs text-slate-300">Operations & Dispute Center • Luweero District</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('contact')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'contact'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Direct Contacts
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'faq'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Frequent Questions
          </button>
          <button
            onClick={() => setActiveTab('complaint')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'complaint'
                ? 'border-amber-500 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            File Formal Complaint
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <h3 className="font-bold text-amber-950 text-sm">Founder & Platform Operations</h3>
                </div>
                <p className="text-slate-700 leading-relaxed mb-3">
                  For immediate assistance, account verification queries, or stage onboarding, reach out directly to <strong>Mukisa Brian</strong>, Founder of BodaCare Uganda.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-800">
                    <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Headquarters: Kikyusa Trading Centre, Luweero District, Uganda</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                    <a href="mailto:bmukisa@bodawerk.co.ug" className="hover:underline font-mono">
                      bmukisa@bodawerk.co.ug
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                  <a
                    href="https://wa.me/256772100240?text=Hello%20Mukisa%20Brian,%20I%20need%20assistance%20with%20BodaCare%20Uganda."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat on WhatsApp</span>
                  </a>
                  <a
                    href="tel:+256772100240"
                    className="py-2.5 px-3 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <Phone className="w-4 h-4 text-amber-300" />
                    <span>Call +256 772 100 240</span>
                  </a>
                </div>
              </div>

              {/* Police Contact */}
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-rose-950">Luweero Central Police Station</h4>
                    <p className="text-rose-700 text-[11px]">Emergency dispatch & criminal reports</p>
                  </div>
                  <a
                    href="tel:999"
                    className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call 999</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-3.5 text-left font-bold text-slate-900 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'complaint' && (
            <div>
              {complaintSuccess ? (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Complaint Lodged</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{complaintSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitComplaint} className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Issue Category</label>
                    <select
                      value={complaintCategory}
                      onChange={(e) => setComplaintCategory(e.target.value as ComplaintReport['category'])}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    >
                      <option value="fare_dispute">Stage or Rider Fare Dispute</option>
                      <option value="payment_issue">Payment Verification Discrepancy</option>
                      <option value="rider_conduct">Rider Conduct or Safety Concern</option>
                      <option value="lost_item">Lost Property or Parcel</option>
                      <option value="app_glitch">App Technical Issue</option>
                      <option value="emergency_delay">Emergency Dispatch Delay</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      placeholder="Brief headline of the issue..."
                      value={complaintSubject}
                      onChange={(e) => setComplaintSubject(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Include names, stage, date, motorcycle number plate, or relevant details..."
                      value={complaintDescription}
                      onChange={(e) => setComplaintDescription(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={complaintSubmitting}
                      className="w-full py-3 bg-[#0B192C] hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                    >
                      <Send className="w-4 h-4 text-amber-300" />
                      <span>{complaintSubmitting ? 'Submitting...' : 'Submit Complaint to Management'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
