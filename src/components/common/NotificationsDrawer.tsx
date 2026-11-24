import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  X,
  Check,
  CheckCheck,
  Briefcase,
  Zap,
  Wrench,
  AlertOctagon,
  Wallet,
  Clock,
  ExternalLink,
  Send,
} from 'lucide-react';
import { storage } from '../../lib/storage';
import { AppNotification } from '../../types';
import {
  isWebPushSupported,
  getActivePushSubscription,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  sendTestWebPush,
} from '../../lib/webPushClient';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      getActivePushSubscription().then((sub) => setPushSubscribed(Boolean(sub)));
      setPushStatusMsg(null);
    }
  }, [isOpen]);

  const loadNotifications = () => {
    setNotifications(storage.getNotifications());
  };

  if (!isOpen) return null;

  const pushSupported = isWebPushSupported();

  const handleTogglePush = async () => {
    setPushBusy(true);
    setPushStatusMsg(null);
    const curUser = storage.getCurrentUser();
    if (pushSubscribed) {
      await unsubscribeFromWebPush();
      setPushSubscribed(false);
      setPushStatusMsg('Device push alerts turned off.');
    } else {
      const res = await subscribeToWebPush({ userId: curUser?.id, role: curUser?.role });
      if (res.subscribed) {
        setPushSubscribed(true);
        setPushStatusMsg('Android push notifications enabled for jobs, swaps & announcements.');
      } else {
        setPushStatusMsg(res.error || 'Could not enable push alerts.');
      }
    }
    setPushBusy(false);
  };

  const handleSendTestPush = async () => {
    setPushBusy(true);
    const res = await sendTestWebPush();
    setPushBusy(false);
    setPushStatusMsg(
      res.ok
        ? `Sent test notification to ${res.sent || 1} subscribed device(s).`
        : res.message || 'Could not send test push notification.'
    );
  };

  const handleMarkAsRead = (id: string) => {
    storage.markNotificationRead(id);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    storage.markAllNotificationsRead();
    loadNotifications();
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.read : true
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'job':
        return <Briefcase className="w-4 h-4 text-emerald-600" />;
      case 'swap':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'repair':
        return <Wrench className="w-4 h-4 text-sky-600" />;
      case 'sos':
        return <AlertOctagon className="w-4 h-4 text-rose-600" />;
      case 'payment':
        return <Wallet className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md h-[100dvh] shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-[#0B192C] text-white">
          <div className="flex items-center gap-2.5">
            <img
              src="/eboda-brand-icon.png"
              alt="E Boda Connect Luweero"
              className="w-9 h-9 rounded-xl border border-amber-400/40 object-cover shrink-0"
            />
            <div>
              <h3 className="font-bold text-white text-sm">E Boda Alerts &amp; Notifications</h3>
              <p className="text-xs text-slate-300">
                {unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer min-h-[36px]"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Device Push Notification Opt-In Bar */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-900">Android Device Push Alerts</p>
              <p className="text-[11px] text-slate-500">
                Jobs, battery stock, welcome &amp; stage updates
              </p>
            </div>
            {pushSupported ? (
              <div className="flex items-center gap-1.5">
                {pushSubscribed && (
                  <button
                    type="button"
                    onClick={handleSendTestPush}
                    disabled={pushBusy}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Test</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={pushBusy}
                  className={`min-h-[38px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    pushSubscribed
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#0B192C] hover:bg-slate-800 text-white'
                  }`}
                >
                  {pushSubscribed ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                  <span>{pushBusy ? '...' : pushSubscribed ? 'Push On' : 'Enable Push'}</span>
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 font-semibold">Browser Unsupported</span>
            )}
          </div>
          {pushStatusMsg && (
            <p className="text-[11px] text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              {pushStatusMsg}
            </p>
          )}
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-white text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`min-h-[36px] px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`min-h-[36px] px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
              filter === 'unread'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No notifications to display.
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 transition-colors flex items-start justify-between gap-3 ${
                  item.read ? 'bg-white' : 'bg-amber-50/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs text-slate-900">{item.title}</p>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                    <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>

                      {item.actionUrl && onNavigateTab && (
                        <button
                          onClick={() => {
                            onNavigateTab(item.actionUrl!);
                            onClose();
                          }}
                          className="text-sky-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {!item.read && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    title="Mark as read"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-emerald-600 rounded-lg cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
