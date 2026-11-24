import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Smartphone,
  CheckCircle2,
  Share,
  MoreVertical,
  Bell,
  BellOff,
  WifiOff,
  ShieldCheck,
} from 'lucide-react';
import {
  isWebPushSupported,
  getNotificationPermissionState,
  getActivePushSubscription,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  sendTestWebPush,
} from '../../lib/webPushClient';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  canPromptInstall: boolean;
  isInstalled: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  onInstallClick: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  canPromptInstall,
  isInstalled,
  isAndroid,
  isIOS,
  onInstallClick,
}) => {
  const [installing, setInstalling] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setInstallFeedback(null);
    setPushFeedback(null);
    getActivePushSubscription().then((sub) => setPushSubscribed(Boolean(sub)));
  }, [isOpen]);

  if (!isOpen) return null;

  const pushSupported = isWebPushSupported();
  const permission = getNotificationPermissionState();

  const handleInstall = async () => {
    setInstalling(true);
    setInstallFeedback(null);
    const outcome = await onInstallClick();
    setInstalling(false);
    if (outcome === 'accepted') {
      setInstallFeedback('E Boda Connect Luweero is installing on your device.');
    } else if (outcome === 'dismissed') {
      setInstallFeedback('Installation paused. You can install anytime from the menu below.');
    } else {
      setInstallFeedback('Automatic prompt is not active in this browser — follow the 3 quick steps below.');
    }
  };

  const handleTogglePush = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    if (pushSubscribed) {
      await unsubscribeFromWebPush();
      setPushSubscribed(false);
      setPushFeedback('Push alerts disabled on this device.');
    } else {
      const res = await subscribeToWebPush();
      if (res.subscribed) {
        setPushSubscribed(true);
        setPushFeedback('Push alerts enabled! Sending confirmation notification...');
        await sendTestWebPush();
      } else {
        setPushFeedback(res.error || 'Could not enable push alerts.');
      }
    }
    setPushLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header with Brand Emblem */}
        <div className="bg-[#0B192C] text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/eboda-brand-icon.png"
              alt="E Boda Connect Luweero App Icon"
              className="w-12 h-12 rounded-xl border border-amber-400/40 object-cover bg-[#0B192C] shrink-0"
            />
            <div>
              <h3 id="pwa-install-title" className="text-base font-extrabold text-white leading-tight">
                E Boda Connect Luweero
              </h3>
              <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                Installable Android App · Home Screen Ready
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install dialog"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4">
          {/* App Capabilities */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <Smartphone className="w-4 h-4 text-[#0B192C] mx-auto mb-1" />
              <p className="font-bold text-slate-800">Full Screen</p>
              <p className="text-[10px] text-slate-500">Standalone mode</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <WifiOff className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="font-bold text-slate-800">Offline Shell</p>
              <p className="text-[10px] text-slate-500">Syncs when online</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <Bell className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="font-bold text-slate-800">Push Alerts</p>
              <p className="text-[10px] text-slate-500">Jobs &amp; Swaps</p>
            </div>
          </div>

          {isInstalled ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>E Boda Connect Luweero is already installed on this device.</span>
            </div>
          ) : canPromptInstall ? (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{installing ? 'Preparing Android Install...' : 'Install E Boda App Now'}</span>
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
              <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-600" />
                <span>
                  {isIOS
                    ? 'Install on iPhone / iPad (Safari)'
                    : isAndroid
                    ? 'Install on Android Chrome / Edge'
                    : 'Manual Installation Steps'}
                </span>
              </p>

              {isIOS ? (
                <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>
                    Tap the <strong className="inline-flex items-center gap-0.5"><Share className="w-3.5 h-3.5 inline" /> Share</strong> button in Safari.
                  </li>
                  <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                  <li>Confirm the name <strong>E Boda</strong> and tap <strong>Add</strong>.</li>
                </ol>
              ) : (
                <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>
                    Open your browser menu <strong className="inline-flex items-center"><MoreVertical className="w-3.5 h-3.5 inline" /> (top-right corner)</strong> in Chrome or Edge.
                  </li>
                  <li>
                    Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </li>
                  <li>Tap <strong>Install</strong> to place the <strong>E Boda</strong> icon on your Android home screen.</li>
                </ol>
              )}
            </div>
          )}

          {installFeedback && (
            <p className="text-xs font-semibold text-slate-700 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
              {installFeedback}
            </p>
          )}

          {/* Push Notifications Opt-In */}
          <div className="pt-2 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Android Push Notifications</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Receive verified boda jobs, swap station updates &amp; urgent stage alerts.
                </p>
              </div>
              {pushSupported ? (
                <button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={pushLoading}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${
                    pushSubscribed
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#0B192C] hover:bg-slate-800 text-white'
                  }`}
                >
                  {pushSubscribed ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                  <span>{pushLoading ? 'Working...' : pushSubscribed ? 'Enabled' : 'Enable'}</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 font-semibold">Unsupported</span>
              )}
            </div>
            {permission === 'denied' && (
              <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                Notifications are blocked for this site. Tap the lock icon in Chrome&apos;s address bar to allow Notifications.
              </p>
            )}
            {pushFeedback && (
              <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                {pushFeedback}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
