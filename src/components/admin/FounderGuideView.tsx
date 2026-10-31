import React from 'react';
import {
  CheckCircle2,
  UserPlus,
  Shield,
  MessageCircle,
  Share2,
  Upload,
  Globe,
  Smartphone,
  PhoneCall,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

interface FounderGuideViewProps {
  onNavigateSection: (section: 'overview' | 'profile' | 'invitations' | 'riders' | 'finance' | 'emergency' | 'stages' | 'schema' | 'logs' | 'guide') => void;
}

export const FounderGuideView: React.FC<FounderGuideViewProps> = ({ onNavigateSection }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B192C] text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <h2 className="text-xl font-extrabold text-white">
          BodaCare Uganda — Founder Operations & Launch Manual
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Step-by-step master guide for Brian Mukisa and the executive leadership team to manage BodaCare Uganda, onboard stages, invite operators, and publish the platform.
        </p>
      </div>

      {/* 5 Step Guided Walkthrough */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Owner Account */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">Your Super Admin Account</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your Founder account is permanently provisioned for <strong>Brian Mukisa</strong> with email <strong>bmukisa@bodawerk.co.ug</strong> and phone <strong>+256 772 100 240</strong>.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
            <p>• <strong>Role:</strong> Super Admin (Exclusive highest authority)</p>
            <p>• <strong>Access:</strong> Cannot be claimed by ordinary users</p>
            <p>• <strong>Security:</strong> All operations logged with audit timestamps</p>
          </div>
          <button
            onClick={() => onNavigateSection('profile')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Review Profile Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step 2: Update Contacts & Location */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">Update Business Contacts & WhatsApp</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            In the <strong>Founder Profile</strong> tab, you can update your WhatsApp number, phone, email, and Kikyusa head office details anytime without writing any code.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
            <p>• Updates reflect live in the footer: <em>"Owned and Managed by BodaCare Uganda"</em></p>
            <p>• Generates 1-click WhatsApp buttons for riders and passengers to reach you</p>
            <p>• Sets official emergency dispatch phone for Luweero Police liaison</p>
          </div>
          <button
            onClick={() => onNavigateSection('profile')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Founder Profile Settings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step 3: Inviting First Riders & Stages */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">Invite Your First Operators</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Go to <strong>Invitations</strong> tab to generate unique invitation codes for Boda Riders, Stage Chairmen, Garages, and Delivery Operators.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
            <p>• <strong>WhatsApp:</strong> Click the WhatsApp icon to open a pre-filled invitation message</p>
            <p>• <strong>SMS:</strong> Click SMS to text the invite link across Luweero</p>
            <p>• <strong>Tracking:</strong> See when they register and approve them with 1 click</p>
          </div>
          <button
            onClick={() => onNavigateSection('invitations')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Go to Invitations Manager</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step 4: Verification & KYC */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm">
              4
            </div>
            <h3 className="text-base font-bold text-slate-900">Approve & Inspect KYC Records</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            When a rider registers with your invitation code, their dossier appears under <strong>Riders</strong> for verification.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-700">
            <p>• Verify National ID (NIN) and Class A Driving Permit</p>
            <p>• Confirm stage chairperson sponsorship and motorcycle registration</p>
            <p>• Click <strong>Approve</strong> to issue verified badge and unlock customer bookings</p>
          </div>
          <button
            onClick={() => onNavigateSection('riders')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Review Riders Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step 5: Publishing & Production Deployment */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm">
            5
          </div>
          <h3 className="text-base font-bold text-slate-900">Publishing & Running the Platform in Production</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <p className="font-bold text-slate-900">1. Web & PWA Deployment</p>
            <p>
              The application runs as a responsive progressive web app that installs directly on riders' Android smartphones from Google Chrome (<em>Add to Home Screen</em>).
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <p className="font-bold text-slate-900">2. PostgreSQL / Supabase Schema</p>
            <p>
              The production database script is ready in <code>/src/db/schema.sql</code>. Execute this in your Supabase or Cloud SQL console for enterprise row-level security.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <p className="font-bold text-slate-900">3. Mobile Money Live Keys</p>
            <p>
              Configure MTN MoMo Partner API and Airtel Money Open API credentials in your environment variables to receive subscription revenues directly into your bank float.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
