import React, { useState } from 'react';
import {
  Phone,
  Shield,
  CheckCircle2,
  X,
  Smartphone,
  ArrowRight,
  UserPlus,
  Lock,
  Mail,
  MapPin,
  Tag,
  KeyRound,
  ShieldCheck,
  User,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { PassengerProfile, RiderProfile, UserRole, User as UserType } from '../../types';
import { storage, OFFICIAL_PAYMENT_DETAILS, safeCopyToClipboard } from '../../lib/storage';
import { translations, Language } from '../../lib/i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onLoginSuccess: (role: UserRole, name: string, phone: string) => void;
  initialInviteCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  lang,
  onLoginSuccess,
  initialInviteCode,
}) => {
  const t = translations[lang];

  // Auth Mode: 'signin' | 'register'
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  // Sign In states
  const [signInIdentifier, setSignInIdentifier] = useState('0774912304');
  const [signInPassword, setSignInPassword] = useState('123456');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [generatedOtp, setGeneratedOtp] = useState('123456');
  const [enteredOtp, setEnteredOtp] = useState('123456');
  const [selectedRole, setSelectedRole] = useState<UserRole>('rider');

  // Register states
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('rider');
  const [regLocation, setRegLocation] = useState('Kikyusa, Luweero District');
  const [regInviteCode, setRegInviteCode] = useState(initialInviteCode || '');
  const [regPhotoUrl, setRegPhotoUrl] = useState('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifiedSignIn, setVerifiedSignIn] = useState<{ role: UserRole; name: string; phone: string } | null>(null);

  const handleCopyPaymentNumber = (num: string, network: string) => {
    safeCopyToClipboard(num);
    setCopiedNumber(network);
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  if (!isOpen) return null;

  // Dynamic quick preset accounts derived from live platform records (Super Admin always available)
  const liveRiders = storage.getRiders().filter((r) => r.accountStatus === 'active');
  const livePassengers = storage.getPassengers().filter((p) => !p.accountStatus || p.accountStatus === 'active');
  const liveStages = storage.getStages().filter((s) => !s.operatingStatus || s.operatingStatus === 'active');
  const liveBusinesses = storage.getBusinesses();

  const quickAccounts: Array<{ name: string; role: UserRole; phone: string; title: string }> = [
    { name: 'Brian Mukisa', role: 'super_admin', phone: '+256 772 100 240', title: 'Founder & Super Admin' },
  ];
  if (liveRiders.length > 0) {
    const r = liveRiders[0];
    quickAccounts.push({
      name: r.fullName,
      role: 'rider',
      phone: r.phone,
      title: `Verified Rider (${r.motorcycleReg || 'Boda'})`,
    });
  }
  if (livePassengers.length > 0) {
    const p = livePassengers[0];
    quickAccounts.push({
      name: p.fullName,
      role: 'passenger',
      phone: p.phone,
      title: 'Passenger / Customer',
    });
  }
  if (liveStages.length > 0) {
    const s = liveStages[0];
    quickAccounts.push({
      name: s.leaderName || s.name,
      role: 'stage_leader',
      phone: s.leaderPhone,
      title: s.name,
    });
  }
  if (liveBusinesses.length > 0) {
    const b = liveBusinesses[0];
    quickAccounts.push({
      name: b.ownerName || b.name,
      role: 'mechanic',
      phone: b.phone,
      title: b.name || 'Garage & Spares',
    });
  }

  const handleQuickLogin = async (acc: (typeof quickAccounts)[0]) => {
    setAuthError(null);
    if (acc.role === 'super_admin') {
      onLoginSuccess(acc.role, acc.name, acc.phone);
      onClose();
      return;
    }

    setIsSigningIn(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: acc.phone, role: acc.role }),
      });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = (await resp.json()) as { error?: string; role?: UserRole; fullName?: string; phone?: string };
        if (!resp.ok) {
          setAuthError(data.error || 'Account access denied by administrator.');
          return;
        }
        onLoginSuccess((data.role as UserRole) || acc.role, data.fullName || acc.name, data.phone || acc.phone);
        onClose();
        return;
      }
    } catch {
      // Offline fallback allowed only for live non-revoked cache items
    } finally {
      setIsSigningIn(false);
    }

    onLoginSuccess(acc.role, acc.name, acc.phone);
    onClose();
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const isEmail = signInIdentifier.includes('@');
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: isEmail ? undefined : signInIdentifier.trim(),
          email: isEmail ? signInIdentifier.trim() : undefined,
          role: selectedRole,
        }),
      });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = (await resp.json()) as {
          error?: string;
          role?: UserRole;
          fullName?: string;
          phone?: string;
        };
        if (!resp.ok) {
          setAuthError(data.error || 'Sign-in rejected. Please check your credentials or contact Super Admin.');
          return;
        }
        setVerifiedSignIn({
          role: (data.role as UserRole) || selectedRole,
          name: data.fullName || 'BodaCare Member',
          phone: data.phone || signInIdentifier.trim(),
        });
      }
    } catch {
      setVerifiedSignIn(null);
    } finally {
      setIsSigningIn(false);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setEnteredOtp(code);
    setStep('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifiedSignIn) {
      onLoginSuccess(verifiedSignIn.role, verifiedSignIn.name, verifiedSignIn.phone);
      onClose();
      return;
    }

    const formattedPhone = signInIdentifier.startsWith('+')
      ? signInIdentifier
      : `+256 ${signInIdentifier.replace(/^0/, '')}`;

    const displayName =
      selectedRole === 'super_admin'
        ? 'Brian Mukisa (Founder)'
        : liveRiders[0]?.fullName || 'BodaCare Member';

    onLoginSuccess(selectedRole, displayName, formattedPhone);
    onClose();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) return;
    setAuthError(null);
    setIsRegistering(true);

    try {
      const formattedPhone = regPhone.startsWith('+')
        ? regPhone
        : `+256 ${regPhone.replace(/^0/, '')}`;

      // Verify invite code if provided
      if (regInviteCode.trim()) {
        storage.updateInvitationStatus(regInviteCode.trim(), 'registered', regFullName.trim());
      }

      // Sync with backend SQLite & enforce revocation / RBAC rules
      try {
        const resp = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: regFullName.trim(),
            phone: formattedPhone,
            email: regEmail.trim() || undefined,
            role: regRole,
            location: regLocation.trim(),
            inviteCodeUsed: regInviteCode.trim() || undefined,
            avatarUrl: regPhotoUrl.trim() || undefined,
          }),
        });
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = (await resp.json()) as {
            error?: string;
            role?: string;
            profile?: RiderProfile | PassengerProfile;
          };
          if (!resp.ok) {
            setAuthError(data.error || 'Registration could not be completed.');
            return;
          }
          if (data.role === 'rider' && data.profile) {
            storage.saveRider(data.profile as RiderProfile);
          } else if (data.role === 'passenger' && data.profile) {
            const p = data.profile as PassengerProfile;
            storage.setPassengersCache([p, ...storage.getPassengers().filter((x) => x.id !== p.id)]);
          }
          await storage.syncDirectoryFromServer();
        }
      } catch {
        // Static/offline environments continue registration seamlessly
      }

      // Save to users table
      const newUser: UserType = {
        id: `user-${Date.now()}`,
        phone: formattedPhone,
        fullName: regFullName.trim(),
        email: regEmail.trim() || undefined,
        role: regRole,
        location: regLocation,
        accountType: regRole.replace('_', ' '),
        inviteCodeUsed: regInviteCode.trim() || undefined,
        createdAt: new Date().toISOString().split('T')[0],
        preferredLanguage: lang,
        avatarUrl: regPhotoUrl.trim() || undefined,
        isSuperAdmin: false,
      };

      storage.saveUser(newUser);

      // Add audit log
      storage.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorName: newUser.fullName,
        actorRole: newUser.role,
        action: 'USER_REGISTERED',
        target: `${newUser.role.toUpperCase()} in ${newUser.location}`,
        details: `New account created via phone ${newUser.phone}. Referral code: ${newUser.inviteCodeUsed || 'Direct'}.`,
      });

      onLoginSuccess(regRole, newUser.fullName, newUser.phone);
      onClose();
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="bg-[#0B192C] text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/eboda-brand-icon.png"
              alt="E Boda Connect Luweero"
              className="w-9 h-9 rounded-lg border border-amber-400/40 object-cover shrink-0"
            />
            <div>
              <h3 className="text-base font-bold text-white">E Boda Connect Luweero</h3>
              <p className="text-[11px] text-slate-400">BodaCare Uganda · Account Sign In &amp; Registration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close authentication modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls: Sign In vs Register */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 shrink-0">
          <button
            onClick={() => {
              setAuthMode('signin');
              setStep('credentials');
              setAuthError(null);
            }}
            className={`min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'signin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In to Account
          </button>
          <button
            onClick={() => {
              setAuthMode('register');
              setAuthError(null);
            }}
            className={`min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create New Account
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}
          {/* 1. SIGN IN FLOW */}
          {authMode === 'signin' && (
            <>
              {step === 'credentials' ? (
                <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Role:
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="super_admin">Founder & Super Administrator (Brian Mukisa)</option>
                      <option value="rider">Boda-Boda Operator (Rider)</option>
                      <option value="passenger">Passenger / Customer</option>
                      <option value="stage_leader">Stage Chairperson (Stage Leader)</option>
                      <option value="mechanic">Mechanic / Garage Owner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number or Founder Email:
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={signInIdentifier}
                        onChange={(e) => setSignInIdentifier(e.target.value)}
                        placeholder="0774 912 304 or bmukisa@bodawerk.co.ug"
                        className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Security Password or PIN:
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSigningIn}
                    className="w-full py-2.5 bg-[#0B192C] hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span>{isSigningIn ? 'Checking Account...' : 'Proceed to OTP Verification'}</span>
                  </button>

                  {/* Quick One-Click Demo Role Accounts */}
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                      Instant One-Click Login for Luweero Roles:
                    </p>
                    <div className="space-y-1.5">
                      {quickAccounts.map((acc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleQuickLogin(acc)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 flex items-center justify-between text-left transition-colors cursor-pointer text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{acc.name}</span>
                            <span className="text-[10px] text-slate-500 ml-2">({acc.title})</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                            {acc.role.replace('_', ' ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              ) : (
                /* OTP Verification Step */
                <form onSubmit={handleVerifyOtp} className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Enter Uganda Telecoms OTP</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      SMS sent to <strong className="text-slate-800">{signInIdentifier}</strong>
                    </p>
                  </div>

                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    Demo verification code: <strong className="font-mono text-slate-950 font-bold">{generatedOtp}</strong>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    className="w-36 mx-auto text-center font-mono text-xl tracking-widest font-bold p-2.5 border-2 border-amber-400 rounded-xl focus:outline-none"
                  />

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-colors"
                    >
                      Verify & Access Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('credentials')}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* 2. REGISTRATION FLOW */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {/* OFFICIAL PAYMENT DETAILS NOTICE FOR REGISTRATION */}
              <div className="bg-gradient-to-br from-[#0B192C] to-slate-900 text-white p-3.5 rounded-xl border border-slate-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                      Official Admin Payment Details
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Mukisa Brian</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* MTN */}
                  <div className="bg-slate-800/90 p-2.5 rounded-lg border border-amber-400/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-300">MTN MoMo</span>
                      <span className="text-[9px] text-slate-400 font-mono">*165#</span>
                    </div>
                    <div className="font-mono font-bold text-white text-xs mt-1">
                      {OFFICIAL_PAYMENT_DETAILS.mtn.number}
                    </div>
                    <div className="text-[10px] text-slate-300">Mukisa Brian</div>
                    <button
                      type="button"
                      onClick={() => handleCopyPaymentNumber(OFFICIAL_PAYMENT_DETAILS.mtn.number, 'MTN')}
                      className="mt-1.5 w-full py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedNumber === 'MTN' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-900" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy MTN</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Airtel */}
                  <div className="bg-slate-800/90 p-2.5 rounded-lg border border-rose-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-300">Airtel Money</span>
                      <span className="text-[9px] text-slate-400 font-mono">*185#</span>
                    </div>
                    <div className="font-mono font-bold text-white text-xs mt-1">
                      {OFFICIAL_PAYMENT_DETAILS.airtel.number}
                    </div>
                    <div className="text-[10px] text-slate-300">Mukisa Brian</div>
                    <button
                      type="button"
                      onClick={() => handleCopyPaymentNumber(OFFICIAL_PAYMENT_DETAILS.airtel.number, 'Airtel')}
                      className="mt-1.5 w-full py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedNumber === 'Airtel' ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Airtel</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-300 leading-tight">
                  Subscription memberships are activated by sending payment to <strong>Mukisa Brian</strong> and submitting your telecom transaction ID.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Type (Role):
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  <option value="rider">Boda-Boda Operator (Rider)</option>
                  <option value="passenger">Passenger / Customer</option>
                  <option value="stage_leader">Stage Chairperson (Stage Leader)</option>
                  <option value="mechanic">Mechanic / Spare Parts Dealer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ssebuwufu John"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number (+256):
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0775 889 123"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (Optional):
                  </label>
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location / Sub-County:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kikyusa Trading Centre, Luweero"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Referral / Invitation Code (Optional):
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. BODA-RIDER-7821"
                    value={regInviteCode}
                    onChange={(e) => setRegInviteCode(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Entering an invitation code links you directly to your stage leader or garage.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password or 6-Digit PIN:
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profile Photo URL (Optional):
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={regPhotoUrl}
                  onChange={(e) => setRegPhotoUrl(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-extrabold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isRegistering ? 'Creating Account...' : 'Register Account & Join BodaCare'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
