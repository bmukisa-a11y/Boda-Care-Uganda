export interface SuperAdminSessionAdmin {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'super_admin';
}

interface SuperAdminSessionState {
  token: string | null;
  expiresAt: string | null;
  admin: SuperAdminSessionAdmin | null;
}

const sessionState: SuperAdminSessionState = {
  token: null,
  expiresAt: null,
  admin: null,
};

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore subscriber errors
    }
  });
}

export function getSuperAdminToken(): string | null {
  if (!sessionState.token || !sessionState.expiresAt) return null;
  if (Date.now() >= new Date(sessionState.expiresAt).getTime()) {
    clearSuperAdminSession();
    return null;
  }
  return sessionState.token;
}

export function getSuperAdminSessionInfo(): {
  unlocked: boolean;
  expiresAt: string | null;
  admin: SuperAdminSessionAdmin | null;
} {
  const token = getSuperAdminToken();
  return {
    unlocked: Boolean(token),
    expiresAt: token ? sessionState.expiresAt : null,
    admin: token ? sessionState.admin : null,
  };
}

export function isSuperAdminUnlocked(): boolean {
  return Boolean(getSuperAdminToken());
}

export function setSuperAdminSession(
  token: string,
  expiresAt: string,
  admin: SuperAdminSessionAdmin
): void {
  sessionState.token = token;
  sessionState.expiresAt = expiresAt;
  sessionState.admin = admin;
  notifyListeners();
}

export function clearSuperAdminSession(): void {
  sessionState.token = null;
  sessionState.expiresAt = null;
  sessionState.admin = null;
  notifyListeners();
}

export function subscribeSuperAdminSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
