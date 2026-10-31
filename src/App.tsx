/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { BusinessDirectory } from './components/business/BusinessDirectory';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('rider');
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [lang, setLang] = useState<Language>('en');

  // Check URL query parameters for invite code
  const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('invite') || params.get('code') || '';
    }
    return '';
  });

  // Offline mode simulation state
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(() => storage.getSyncQueue().length);

  // Modals
  const [showSOS, setShowSOS] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAuth, setShowAuth] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('invite') || params.get('code'));
    }
    return false;
  });

  const founder = storage.getFounderProfile();
  const cleanWaNumber = founder.whatsappNumber ? founder.whatsappNumber.replace(/[^0-9]/g, '') : '256772100240';

  // Handle Role Change
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'rider') setActiveTab('rider');
    else if (role === 'passenger') setActiveTab('passenger');
    else if (role === 'stage_leader') setActiveTab('stage');
    else if (role === 'mechanic') setActiveTab('business');
    else if (role === 'super_admin') setActiveTab('admin');
  };

  // Sync offline queue
  const handleSyncQueue = () => {
    const synced = storage.flushSyncQueue();
    setPendingSyncCount(0);
    alert(`Successfully synced ${synced} offline transaction record(s) with BodaCare server.`);
  };

  // Toggle offline simulation
  const handleToggleOffline = () => {
    setIsOffline((prev) => !prev);
  };

  const handleLangToggle = () => {
    setLang((prev) => (prev === 'en' ? 'lg' : 'en'));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 pb-16 lg:pb-0">
      {/* Universal Top Bar adhering to Top Bar Contract */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        lang={lang}
        onLangToggle={handleLangToggle}
        onOpenSOS={() => setShowSOS(true)}
        isOffline={isOffline}
        onToggleOffline={handleToggleOffline}
        pendingSyncCount={pendingSyncCount}
        onSync={handleSyncQueue}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAuth={() => setShowAuth(true)}
      />

      {/* Main Viewport Routing */}
      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingPage
            lang={lang}
            onSelectRole={handleRoleChange}
            onOpenPayment={() => setShowPayment(true)}
            onOpenSOS={() => setShowSOS(true)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'rider' && (
          <RiderDashboard
            lang={lang}
            onOpenSOS={() => setShowSOS(true)}
            onOpenPayment={() => setShowPayment(true)}
            isOffline={isOffline}
          />
        )}

        {activeTab === 'passenger' && (
          <PassengerApp lang={lang} onOpenSOS={() => setShowSOS(true)} />
        )}

        {activeTab === 'stage' && <StageLeaderDashboard lang={lang} />}

        {activeTab === 'business' && <BusinessDirectory lang={lang} />}

        {activeTab === 'admin' && <SuperAdminDashboard lang={lang} />}
      </main>

      {/* Professional Footer */}
      <footer className="bg-[#0B192C] text-slate-400 py-6 border-t border-slate-800 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="font-bold text-white text-sm">
              Owned and Managed by BodaCare Uganda.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Head Office: {founder.location} · Founder: {founder.fullName}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <span className="text-slate-500">Uganda Data Protection & Privacy Act, 2019</span>
            <span>·</span>
            <a
              href={`https://wa.me/${cleanWaNumber}?text=Hello%20BodaCare%20Uganda`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 font-semibold underline"
            >
              WhatsApp Support
            </a>
            <span>·</span>
            <a href={`tel:${founder.supportPhone}`} className="hover:text-white">
              {founder.supportPhone}
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Thumb Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
          // Refresh rider state
        }}
      />

      {/* Phone OTP Login & Registration Modal */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        lang={lang}
        initialInviteCode={inviteCodeFromUrl}
        onLoginSuccess={(role, name, phone) => {
          handleRoleChange(role);
        }}
      />
    </div>
  );
}
