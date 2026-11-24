import React from 'react';
import {
  AlertTriangle,
  Globe,
  WifiOff,
  RefreshCw,
  ChevronDown,
  UserPlus,
  Bell,
  HelpCircle,
  Download,
} from 'lucide-react';
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
  isBrowserOnline: boolean;
  lastSyncedAt: string | null;
  onToggleOffline: () => void;
  pendingSyncCount: number;
  onSync: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  onOpenSupport?: () => void;
  isPWAInstalled?: boolean;
  onOpenInstall?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  lang,
  onLangToggle,
  onOpenSOS,
  isOffline,
  isBrowserOnline,
  lastSyncedAt,
  onToggleOffline,
  pendingSyncCount,
  onSync,
  activeTab,
  onTabChange,
  onOpenAuth,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onOpenSupport,
  isPWAInstalled = false,
  onOpenInstall,
}) => {
  const t = translations[lang];
  const founder = storage.getFounderProfile();
  const effectiveOffline = isOffline || !isBrowserOnline;
  const formattedSyncTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'initial cache';

  const navLinks = [
    { id: 'landing', label: 'Home' },
    { id: 'rider', label: 'Rider Hub' },
    { id: 'jobs', label: 'Jobs & Freight' },
    { id: 'swaps', label: 'E-Boda Swaps' },
    { id: 'repairs', label: 'Garages & Spares' },
    { id: 'passenger', label: 'Book Ride' },
    ...(currentRole === 'super_admin' ? [{ id: 'admin', label: 'Admin Portal' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B192C] text-white border-b border-slate-800 shadow-md safe-area-pt">
      {/* Top utility alert if offline or sync pending */}
      {effectiveOffline && (
        <div className="bg-amber-500 text-slate-950 px-3 sm:px-4 py-1.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate sm:whitespace-normal">
              Offline ({!isBrowserOnline ? 'No Internet' : t.offline}) · Showing cached shell (Last synced: {formattedSyncTime}). Live jobs &amp; payments wait for connection.
            </span>
          </div>
          {isOffline && isBrowserOnline && (
            <button
              onClick={onToggleOffline}
              className="underline hover:text-white transition-colors cursor-pointer text-xs shrink-0"
            >
              Re-enable Online Mode
            </button>
          )}
        </div>
      )}

      {pendingSyncCount > 0 && !effectiveOffline && (
        <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{pendingSyncCount} action(s) queued offline ready to sync</span>
          </div>
          <button
            onClick={onSync}
            className="px-3 py-1 bg-white text-emerald-800 font-semibold rounded text-xs hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            {t.syncNow}
          </button>
        </div>
      )}

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 min-h-16 py-1.5 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onTabChange('landing')}
          className="flex items-center gap-2 whitespace-nowrap shrink-0 group text-left cursor-pointer min-h-[44px] min-w-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0B192C] border border-amber-400/40 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-amber-300 transition-colors shrink-0">
            <img
              src={founder.logoUrl || '/eboda-brand-icon.png'}
              alt="E Boda Connect Luweero"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span className="truncate max-w-[96px] xs:max-w-none sm:max-w-none">E Boda Connect</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono hidden md:inline">
                Luweero
              </span>
            </span>
            <p className="text-[10px] text-slate-400 hidden sm:block leading-none">
              {founder.businessName} · {founder.location}
            </p>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-4 text-xs font-semibold text-slate-300">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onTabChange(link.id)}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 cursor-pointer ${
                activeTab === link.id
                  ? 'border-amber-400 text-amber-400 font-bold'
                  : 'border-transparent text-slate-300'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Install App Button (shown when not already installed in standalone mode) */}
          {!isPWAInstalled && onOpenInstall && (
            <button
              type="button"
              onClick={onOpenInstall}
              className="min-h-[40px] px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Install E Boda Connect Luweero Android App"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative min-h-[40px] min-w-[38px] sm:min-w-[40px] p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer flex items-center justify-center"
            title="Notifications & Push Alerts"
          >
            <Bell className="w-4 h-4 text-slate-200" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Help & Support */}
          {onOpenSupport && (
            <button
              onClick={onOpenSupport}
              className="min-h-[40px] min-w-[40px] p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer hidden sm:flex items-center justify-center"
              title="Help Centre & Support"
            >
              <HelpCircle className="w-4 h-4 text-slate-300" />
            </button>
          )}

          {/* Account / Register Trigger */}
          <button
            onClick={onOpenAuth}
            className="min-h-[40px] px-2 sm:px-2.5 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sign In or Register New Account"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Account</span>
          </button>

          {/* Bilingual Language Switcher */}
          <button
            onClick={onLangToggle}
            className="min-h-[40px] flex items-center gap-1 px-1.5 sm:px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            title="Switch Language / Kyusa Olulimi"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span className="tracking-wide text-[11px]">{lang === 'en' ? 'LG' : 'EN'}</span>
          </button>

          {/* Role Switcher Menu */}
          <div className="relative group">
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              aria-label="Switch user role"
              className="min-h-[40px] appearance-none bg-slate-800 text-slate-100 text-[11px] sm:text-xs font-medium pl-2 pr-5 sm:pr-6 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer max-w-[88px] sm:max-w-[165px] truncate"
            >
              <option value="rider">Rider: Kato Moses (E-Boda)</option>
              <option value="passenger">Passenger: Babirye Prossy</option>
              <option value="stage_leader">Stage: Chair. Mugisha</option>
              <option value="mechanic">Mechanic: Ssekandi Garage</option>
              <option value="station_operator">Operator: Opio (Swap Hub)</option>
              <option value="employer">Employer: Nsubuga (Coffee)</option>
              <option value="super_admin">Founder: Brian Mukisa (Admin)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Emergency SOS Button */}
          <button
            onClick={onOpenSOS}
            className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
            <span>SOS</span>
          </button>
        </div>
      </div>
    </header>
  );
};

