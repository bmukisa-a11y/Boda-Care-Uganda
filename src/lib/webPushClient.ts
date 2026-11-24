export type PushPermissionState = NotificationPermission | 'unsupported';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermissionState(): PushPermissionState {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeToWebPush(opts?: {
  userId?: string;
  role?: string;
}): Promise<{ ok: boolean; subscribed: boolean; error?: string }> {
  if (!isWebPushSupported()) {
    return { ok: false, subscribed: false, error: 'Push notifications are not supported on this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        ok: false,
        subscribed: false,
        error:
          permission === 'denied'
            ? 'Notification permission was blocked in browser settings. Enable Notifications in Chrome Site Settings.'
            : 'Notification permission request was dismissed.',
      };
    }

    const keyResp = await fetch('/api/push/vapid-public-key');
    if (!keyResp.ok) {
      return { ok: false, subscribed: false, error: 'Could not reach push notification server.' };
    }
    const keyJson = (await keyResp.json()) as { enabled?: boolean; publicKey?: string };
    if (keyJson.enabled === false) {
      return { ok: false, subscribed: false, error: 'Web Push notifications are currently paused by Administrator.' };
    }
    if (!keyJson.publicKey) {
      return { ok: false, subscribed: false, error: 'Server VAPID public key is unavailable.' };
    }

    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(keyJson.publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });
    }

    const subJson = subscription.toJSON();
    const saveResp = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subJson,
        userId: opts?.userId,
        role: opts?.role,
      }),
    });

    if (!saveResp.ok) {
      const errData = (await saveResp.json().catch(() => ({}))) as { error?: string };
      return { ok: false, subscribed: false, error: errData.error || 'Failed to save push subscription.' };
    }

    return { ok: true, subscribed: true };
  } catch (err) {
    return {
      ok: false,
      subscribed: false,
      error: err instanceof Error ? err.message : 'Unable to enable push notifications.',
    };
  }
}

export async function unsubscribeFromWebPush(): Promise<{ ok: boolean }> {
  const sub = await getActivePushSubscription();
  if (!sub) return { ok: true };
  try {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function sendTestWebPush(userId?: string): Promise<{ ok: boolean; sent?: number; message?: string }> {
  try {
    const resp = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'E Boda Connect Luweero',
        body: 'Alerts active: Verified Boda Jobs, Battery Swaps & Stage Notices ready.',
        url: '/',
        userId,
      }),
    });
    const data = (await resp.json().catch(() => ({}))) as { sent?: number; error?: string };
    if (!resp.ok) return { ok: false, message: data.error || 'Push test failed.' };
    return { ok: true, sent: data.sent || 0 };
  } catch {
    return { ok: false, message: 'Network error sending test push notification.' };
  }
}
