import React from 'react';
import { Shield, AlertTriangle, Globe, UserCheck, Wifi, WifiOff, RefreshCw, ChevronDown, UserPlus, Sparkles } from 'lucide-react';
import { UserRole } from '../../types';
import { storage } from '../../lib/storage';
import { translations, Language } from '../../lib/i18n';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  lang: Language;
  onLangToggle: () => void;
  onOpenSOS: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  pendingSyncCount: number;
  onSync: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  lang,
  onLangToggle,
  onOpenSOS,
  isOffline,
  onToggleOffline,
  pendingSyncCount,
  onSync,
  activeTab,
  onTabChange,
  onOpenAuth,
}) => {
  const t = translations[lang];
  const founder = storage.getFounderProfile();

  const roleLabels: Record<UserRole, string> = {
    rider: t.rider,
    passenger: t.passenger,
    stage_leader: t.stageLeader,
    mechanic: t.mechanic,
    super_admin: t.superAdmin,
  };

  const navLinks = [
    { id: 'landing', label: 'Home' },
    { id: 'rider', label: t.navDashboard },
    { id: 'passenger', label: t.navBookRide },
    { id: 'stage', label: t.navStage },
    { id: 'business', label: t.navDirectory },
    { id: 'admin', label: t.navAdmin },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B192C] text-white border-b border-slate-800 shadow-md">
      {/* Top utility alert if offline or sync pending */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5" />
            <span>{t.offline} - Records saved locally</span>
          </div>
          <button
            onClick={onToggleOffline}
            className="underline hover:text-white transition-colors cursor-pointer text-xs"
          >
            Re-enable Online Mode
          </button>
        </div>
      )}

      {pendingSyncCount > 0 && !isOffline && (
        <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{pendingSyncCount} records waiting to sync from rural offline queue</span>
          </div>
          <button
            onClick={onSync}
            className="px-2.5 py-0.5 bg-white text-emerald-800 font-semibold rounded text-xs hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {t.syncNow}
          </button>
        </div>
      )}

      {/* Main Top Bar adhering to Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark (Single element) */}
        <button
          onClick={() => onTabChange('landing')}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm group-hover:bg-amber-300 transition-colors">
            {founder.logoUrl ? (
              <img src={founder.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
            ) : (
              'BC'
            )}
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              {founder.businessName}
            </span>
            <p className="text-[10px] text-slate-400 hidden sm:block leading-none">
              {founder.location}
            </p>
          </div>
        </button>

        {/* Zone 2: Navigation Links (Single-line prose links) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onTabChange(link.id)}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 cursor-pointer ${
                activeTab === link.id
                  ? 'border-amber-400 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-300'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Action & Controls (SOS + Role Switcher + Lang + Account) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Account / Register Trigger */}
          <button
            onClick={onOpenAuth}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sign In or Register New Account"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Account</span>
          </button>

          {/* Quick Offline Simulator Toggle */}
          <button
            onClick={onToggleOffline}
            title={isOffline ? 'Switch to Online Mode' : 'Simulate Offline Mode (Rural Luweero)'}
            className={`p-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer hidden sm:flex items-center gap-1.5 ${
              isOffline
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isOffline ? 'Offline' : 'Online'}</span>
          </button>

          {/* Bilingual Language Switcher */}
          <button
            onClick={onLangToggle}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            title="Switch Language / Kyusa Olulimi"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span className="tracking-wide">{lang === 'en' ? 'LG' : 'EN'}</span>
          </button>

          {/* Role Switcher Menu */}
          <div className="relative group">
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="appearance-none bg-slate-800 text-slate-100 text-xs font-medium pl-3 pr-8 py-2 rounded-lg border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              <option value="rider">Rider: Kato Moses</option>
              <option value="passenger">Passenger: Babirye Prossy</option>
              <option value="stage_leader">Stage: Chairman Mugisha</option>
              <option value="mechanic">Mechanic: Ssekandi Garage</option>
              <option value="super_admin">Founder: Brian Mukisa (Admin)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Emergency SOS Button (Always Prominent) */}
          <button
            onClick={onOpenSOS}
            className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-amber-200" />
            <span>SOS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
