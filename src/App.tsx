/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserRole, SubscriptionTier } from './types';
import { Language } from './lib/i18n';
import { storage } from './lib/storage';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { SOSModal } from './components/common/SOSModal';
import { PaymentModal } from './components/common/PaymentModal';
import { AuthModal } from './components/auth/AuthModal';
import { LandingPage } from './components/landing/LandingPage';
import { RiderDashboard } from './components/rider/RiderDashboard';
import { PassengerApp } from './components/passenger/PassengerApp';
import { StageLeaderDashboard } from './components/stage/StageLeaderDashboard';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { JobsPortal } from './components/jobs/JobsPortal';
import { BatterySwapLocator } from './components/swap/BatterySwapLocator';
import { RepairsMaintenanceHub } from './components/repairs/RepairsMaintenanceHub';
import { RiderWalletHub } from './components/wallet/RiderWalletHub';
import { NotificationsDrawer } from './components/common/NotificationsDrawer';
import { HelpSupportModal } from './components/common/HelpSupportModal';
import { LegalModal } from './components/common/LegalModal';
import { PWAInstallModal } from './components/common/PWAInstallModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useOnlineStatus } from './hooks/useOnlineStatus';

const ALLOWED_TABS = new Set([
  'landing',
  'rider',
  'passenger',
  'jobs',
  'swaps',
  'repairs',
  'wallet',
  'stage',
  'admin',
]);

export default function App() {
  const { canPromptInstall, isInstalled, isAndroid, isIOS, promptInstall } = usePWAInstall();
  const isBrowserOnline = useOnlineStatus();

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sec = params.get('section');
      const tabParam = params.get('tab');
      if (sec === 'daily_discovered_jobs' || sec === 'welcome_messages' || sec === 'external_config' || tabParam === 'admin') {
        return 'super_admin';
      }
      if (tabParam === 'passenger') {
        return 'passenger';
      }
    }
    return 'rider';
  });

  const [adminInitialSection, setAdminInitialSection] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('section') || undefined;
    }
    return undefined;
  });

  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('jobId') || null;
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('jobId')) return 'jobs';
      const sec = params.get('section');
      if (sec === 'daily_discovered_jobs' || sec === 'welcome_messages' || sec === 'external_config') {
        return 'admin';
      }
      const tabParam = params.get('tab');
      if (tabParam && ALLOWED_TABS.has(tabParam)) {
        return tabParam;
      }
    }
    return 'landing';
  });

  const [lang, setLang] = useState<Language>('en');

  // Check URL query parameters for invite code
  const [inviteCodeFromUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('invite') || params.get('code') || '';
    }
    return '';
  });

  // Offline mode simulation state + live connectivity state
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(() => storage.getSyncQueue().length);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => storage.getLastSyncedAt());
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [showSOS, setShowSOS] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showAuth, setShowAuth] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('invite') || params.get('code'));
    }
    return false;
  });

  const founder = storage.getFounderProfile();
  const cleanWaNumber = founder.whatsappNumber ? founder.whatsappNumber.replace(/[^0-9]/g, '') : '256772100240';
  const [directoryVersion, setDirectoryVersion] = useState(0);

  // Track Android hardware / gesture back button history safely
  const tabHistoryRef = useRef<string[]>([activeTab]);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const modalsRef = useRef({
    showInstall,
    showSOS,
    showPayment,
    showNotifications,
    showHelpSupport,
    showLegal,
    showAuth,
  });
  modalsRef.current = {
    showInstall,
    showSOS,
    showPayment,
    showNotifications,
    showHelpSupport,
    showLegal,
    showAuth,
  };

  const anyModalOpen =
    showInstall || showSOS || showPayment || showNotifications || showHelpSupport || showLegal || showAuth;
  const prevAnyModalOpenRef = useRef(anyModalOpen);

  useEffect(() => {
    if (anyModalOpen && !prevAnyModalOpenRef.current && typeof window !== 'undefined') {
      window.history.pushState({ ebodaModal: true, tab: activeTabRef.current }, '');
    }
    prevAnyModalOpenRef.current = anyModalOpen;
  }, [anyModalOpen]);

  const navigateToTab = useCallback((nextTab: string, pushHistory = true) => {
    if (nextTab === activeTabRef.current) return;
    if (pushHistory && typeof window !== 'undefined') {
      tabHistoryRef.current = [...tabHistoryRef.current.slice(-15), nextTab];
      window.history.pushState({ ebodaTab: nextTab }, '');
    }
    setActiveTab(nextTab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const m = modalsRef.current;
      if (m.showInstall) {
        setShowInstall(false);
        return;
      }
      if (m.showSOS) {
        setShowSOS(false);
        return;
      }
      if (m.showPayment) {
        setShowPayment(false);
        return;
      }
      if (m.showNotifications) {
        setShowNotifications(false);
        return;
      }
      if (m.showHelpSupport) {
        setShowHelpSupport(false);
        return;
      }
      if (m.showLegal) {
        setShowLegal(false);
        return;
      }
      if (m.showAuth) {
        setShowAuth(false);
        return;
      }

      if (tabHistoryRef.current.length > 1) {
        const nextStack = tabHistoryRef.current.slice(0, -1);
        tabHistoryRef.current = nextStack;
        const previousTab = nextStack[nextStack.length - 1] || 'landing';
        setActiveTab(previousTab);
        return;
      }

      if (activeTabRef.current !== 'landing') {
        tabHistoryRef.current = ['landing'];
        setActiveTab('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigateTab = (target: string) => {
    if (target.startsWith('jobs?')) {
      const qIndex = target.indexOf('?');
      const params = new URLSearchParams(target.slice(qIndex + 1));
      const jid = params.get('jobId');
      if (jid) setHighlightedJobId(jid);
      navigateToTab('jobs');
      return;
    }
    if (target.startsWith('admin?')) {
      const qIndex = target.indexOf('?');
      const params = new URLSearchParams(target.slice(qIndex + 1));
      const sec = params.get('section') || undefined;
      setCurrentRole('super_admin');
      setAdminInitialSection(sec);
      navigateToTab('admin');
      return;
    }
    if (target !== 'jobs') {
      setHighlightedJobId(null);
    }
    navigateToTab(target);
  };

  useEffect(() => {
    storage.syncDirectoryFromServer().then((synced) => {
      if (synced) {
        setLastSyncedAt(storage.getLastSyncedAt());
      }
    });
    const handleDirectoryUpdate = () => {
      setDirectoryVersion((v) => v + 1);
      setLastSyncedAt(storage.getLastSyncedAt());
      setPendingSyncCount(storage.getSyncQueue().length);
      const notifs = storage.getNotifications();
      setUnreadNotificationsCount(notifs.filter((n) => !n.read).length);
    };
    window.addEventListener('bodacare:directory-updated', handleDirectoryUpdate);
    return () => window.removeEventListener('bodacare:directory-updated', handleDirectoryUpdate);
  }, []);

  useEffect(() => {
    const notifs = storage.getNotifications();
    setUnreadNotificationsCount(notifs.filter((n) => !n.read).length);
  }, [showNotifications]);

  // Automatic reconnect sync when internet returns
  const wasBrowserOfflineRef = useRef(!isBrowserOnline);
  useEffect(() => {
    if (!isBrowserOnline) {
      wasBrowserOfflineRef.current = true;
      return;
    }
    if (wasBrowserOfflineRef.current && isBrowserOnline) {
      wasBrowserOfflineRef.current = false;
      const queued = storage.getSyncQueue().length;
      let flushed = 0;
      if (queued > 0) {
        flushed = storage.flushSyncQueue();
        setPendingSyncCount(0);
      }
      storage.syncDirectoryFromServer().then((ok) => {
        if (ok) {
          setLastSyncedAt(storage.getLastSyncedAt());
        }
        if (flushed > 0) {
          setToastMessage(`Connection restored — synced ${flushed} queued offline action(s) with E Boda server.`);
        } else if (ok) {
          setToastMessage('Internet connection restored — directory refreshed from E Boda server.');
        }
        setTimeout(() => setToastMessage(null), 4000);
      });
    }
  }, [isBrowserOnline]);

  // Handle Role Change
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'rider') navigateToTab('rider');
    else if (role === 'passenger') navigateToTab('passenger');
    else if (role === 'stage_leader') navigateToTab('stage');
    else if (role === 'mechanic') navigateToTab('repairs');
    else if (role === 'station_operator') navigateToTab('swaps');
    else if (role === 'employer') navigateToTab('jobs');
    else if (role === 'super_admin') navigateToTab('admin');
  };

  // Sync offline queue
  const handleSyncQueue = () => {
    const synced = storage.flushSyncQueue();
    setPendingSyncCount(0);
    storage.syncDirectoryFromServer().then((ok) => {
      if (ok) setLastSyncedAt(storage.getLastSyncedAt());
    });
    setToastMessage(`Successfully synced ${synced} offline transaction record(s) with BodaCare server.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Toggle offline simulation
  const handleToggleOffline = () => {
    setIsOffline((prev) => !prev);
  };

  const handleLangToggle = () => {
    setLang((prev) => (prev === 'en' ? 'lg' : 'en'));
  };

  const effectiveOffline = isOffline || !isBrowserOnline;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 pb-20 lg:pb-0 overflow-x-hidden">
      {/* Universal Top Bar */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        lang={lang}
        onLangToggle={handleLangToggle}
        onOpenSOS={() => setShowSOS(true)}
        isOffline={isOffline}
        isBrowserOnline={isBrowserOnline}
        lastSyncedAt={lastSyncedAt}
        onToggleOffline={handleToggleOffline}
        pendingSyncCount={pendingSyncCount}
        onSync={handleSyncQueue}
        activeTab={activeTab}
        onTabChange={handleNavigateTab}
        onOpenAuth={() => setShowAuth(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenSupport={() => setShowHelpSupport(true)}
        isPWAInstalled={isInstalled}
        onOpenInstall={() => setShowInstall(true)}
      />

      {/* Synchronisation Notification Toast */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs sm:text-sm font-semibold py-2.5 px-4 text-center flex items-center justify-center gap-2 shadow-md animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Viewport Routing Across All 7 Modules */}
      <main key={activeTab} className="flex-1 page-enter overflow-x-hidden">
        {activeTab === 'landing' && (
          <LandingPage
            key={`landing-${directoryVersion}`}
            lang={lang}
            onSelectRole={handleRoleChange}
            onOpenPayment={() => setShowPayment(true)}
            onOpenSOS={() => setShowSOS(true)}
            onNavigateTab={handleNavigateTab}
            isPWAInstalled={isInstalled}
            onOpenInstall={() => setShowInstall(true)}
          />
        )}

        {activeTab === 'rider' && (
          <RiderDashboard
            key={`rider-${directoryVersion}`}
            lang={lang}
            onOpenSOS={() => setShowSOS(true)}
            onOpenPayment={() => setShowPayment(true)}
            isOffline={effectiveOffline}
            lastSyncedAt={lastSyncedAt}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {activeTab === 'jobs' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            <JobsPortal
              key={`jobs-${directoryVersion}`}
              currentRole={currentRole}
              onNavigateTab={handleNavigateTab}
              highlightedJobId={highlightedJobId}
              onClearHighlight={() => setHighlightedJobId(null)}
              isOffline={effectiveOffline}
              lastSyncedAt={lastSyncedAt}
            />
          </div>
        )}

        {activeTab === 'swaps' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            <BatterySwapLocator
              key={`swaps-${directoryVersion}`}
              currentRole={currentRole}
              isOffline={effectiveOffline}
              lastSyncedAt={lastSyncedAt}
            />
          </div>
        )}

        {activeTab === 'repairs' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            <RepairsMaintenanceHub key={`repairs-${directoryVersion}`} currentRole={currentRole} onOpenSOS={() => setShowSOS(true)} />
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            <RiderWalletHub key={`wallet-${directoryVersion}`} currentRole={currentRole} onOpenSubscription={() => setShowPayment(true)} />
          </div>
        )}

        {activeTab === 'passenger' && (
          <PassengerApp
            key={`passenger-${directoryVersion}`}
            lang={lang}
            onOpenSOS={() => setShowSOS(true)}
            isOffline={effectiveOffline}
            lastSyncedAt={lastSyncedAt}
          />
        )}

        {activeTab === 'stage' && <StageLeaderDashboard key={`stage-${directoryVersion}`} lang={lang} />}

        {activeTab === 'admin' && (
          <SuperAdminDashboard currentRole={currentRole} lang={lang} initialSection={adminInitialSection} />
        )}
      </main>

      {/* Professional Footer */}
      <footer className="bg-[#0B192C] text-slate-400 py-6 border-t border-slate-800 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="font-bold text-white text-sm">
              Owned and Managed by BodaCare Uganda (E Boda Connect Luweero).
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Head Office: {founder.location} · Founder & Operations: {founder.fullName}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <button
              onClick={() => setShowLegal(true)}
              className="text-slate-400 hover:text-white underline cursor-pointer"
            >
              Legal Terms & Privacy Act
            </button>
            <span>·</span>
            <button
              onClick={() => setShowHelpSupport(true)}
              className="text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
            >
              Support & Disputes
            </button>
            <span>·</span>
            <a
              href={`https://wa.me/${cleanWaNumber}?text=Hello%20Mukisa%20Brian,%20I%20am%20using%20BodaCare%20Uganda`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              WhatsApp (+256 772 100 240)
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Thumb Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleNavigateTab}
        currentRole={currentRole}
        lang={lang}
      />

      {/* Emergency SOS Modal */}
      <SOSModal
        isOpen={showSOS}
        onClose={() => setShowSOS(false)}
        lang={lang}
      />

      {/* Mobile Money & Subscription Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        lang={lang}
        onSuccess={(tier: SubscriptionTier) => {
          setToastMessage(`Subscription successfully renewed to ${tier} tier!`);
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />

      {/* Phone OTP Login & Registration Modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        lang={lang}
        initialInviteCode={inviteCodeFromUrl}
        onLoginSuccess={(role) => {
          handleRoleChange(role);
        }}
      />

      {/* Notifications Drawer Feed */}
      <NotificationsDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNavigateTab={handleNavigateTab}
      />

      {/* Help & Support Customer Care Modal */}
      <HelpSupportModal
        isOpen={showHelpSupport}
        onClose={() => setShowHelpSupport(false)}
      />

      {/* Legal & Privacy Policy Modal */}
      <LegalModal
        isOpen={showLegal}
        onClose={() => setShowLegal(false)}
      />

      {/* Android PWA Installation & Device Push Modal */}
      <PWAInstallModal
        isOpen={showInstall}
        onClose={() => setShowInstall(false)}
        canPromptInstall={canPromptInstall}
        isInstalled={isInstalled}
        isAndroid={isAndroid}
        isIOS={isIOS}
        onInstallClick={promptInstall}
      />
    </div>
  );
}
