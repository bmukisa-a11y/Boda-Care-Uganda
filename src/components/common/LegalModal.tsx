import React from 'react';
import { Shield, X, FileText, CheckCircle2 } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab?: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, tab = 'terms' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92dvh] my-auto mx-auto">
        <div className="bg-[#0B192C] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">BodaCare Uganda Legal Terms & Data Protection</h2>
              <p className="text-xs text-slate-300">Registered in Uganda • Luweero District Operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 text-xs text-slate-700 leading-relaxed">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">1. Operational Jurisdiction & Scope</h3>
            <p>
              BodaCare Uganda operates primarily within Kikyusa, Luweero Town, Wobulenzi, and surrounding areas of Luweero District. By registering as a rider, passenger, mechanics shop, or stage leader, you agree to comply with all Uganda Traffic and Road Safety Regulations, local stage bylaws, and BodaCare digital governance standards.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">2. Rider Verification & KYC Requirements</h3>
            <p>
              All motorcycle taxi operators must submit a valid National Identification Number (NIN), Driving Permit (Class A), and Motorcycle Registration document. Platform administrators reserve the strict right to suspend or revoke access to unverified or fraudulent accounts.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">3. Mobile Money Payment Verification Policy</h3>
            <p>
              All subscription, top-up, and registration payments must be made to the official accounts of Mukisa Brian (MTN: 0766848865, Airtel: 0731931455). Transaction IDs are systematically checked for uniqueness. Submission of fraudulent, duplicate, or counterfeit transaction receipts will result in permanent account termination and referral to Luweero Police.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">4. Emergency SOS & Data Transmission</h3>
            <p>
              When the Emergency SOS protocol is triggered, high-accuracy GPS coordinates, rider identification, and motorcycle registration numbers are transmitted to Uganda Police (Luweero Central Police), local stage leaders, and emergency responders. This telemetry is transmitted exclusively for life-safety and rescue operations.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">5. Electric Vehicle & Battery Swapping Safety</h3>
            <p>
              Battery swap station operators and electric boda riders must adhere to manufacturer safety standards. Unauthorized tampering with battery firmware or Anderson connectors is strictly prohibited.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
          >
            I Acknowledge & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
