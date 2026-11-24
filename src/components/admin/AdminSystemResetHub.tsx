import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  Trash2,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Users,
  Bike,
  UserCheck,
  MapPin,
  Zap,
  Wrench,
  Briefcase,
  Radar,
  Shield,
  Search,
  RotateCcw,
  PlusCircle,
  Unlock,
  History,
  CheckSquare,
  Square,
  KeyRound,
  ArrowRight,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react';
import type {
  BatterySwapStation,
  PassengerProfile,
  ResetCategoryId,
  RiderProfile,
  SelectiveDeleteTarget,
  Stage,
  SystemResetOverviewItem,
  SystemResetOverviewPayload,
  SystemResetResult,
  UserRole,
} from '../../types';
import { storage } from '../../lib/storage';
import {
  clearSuperAdminSession,
  getSuperAdminSessionInfo,
  getSuperAdminToken,
  setSuperAdminSession,
  subscribeSuperAdminSession,
} from '../../lib/superAdminSession';
import {
  PassengerFormModal,
  RiderFormModal,
  StageFormModal,
  StationFormModal,
} from './CentralAdminModals';

interface AdminSystemResetHubProps {
  currentRole?: UserRole;
  onDataChanged?: () => void;
  onNavigateRegistryTab?: (
    registryTab: 'riders' | 'passengers' | 'stages' | 'stations' | 'centres' | 'jobs'
  ) => void;
}

const CATEGORY_META: Array<{
  id: ResetCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  coreMemberCategory: boolean;
}> = [
  {
    id: 'riders',
    label: 'Boda Riders',
    shortLabel: 'Riders',
    description: 'Registered boda riders, profiles & active USSD sessions',
    icon: Bike,
    coreMemberCategory: true,
  },
  {
    id: 'passengers',
    label: 'Passengers / Customers',
    shortLabel: 'Passengers',
    description: 'Registered passengers & assisted customer accounts',
    icon: UserCheck,
    coreMemberCategory: true,
  },
  {
    id: 'stages',
    label: 'Boda Stages',
    shortLabel: 'Stages',
    description: 'Registered stages & chairperson rosters',
    icon: MapPin,
    coreMemberCategory: true,
  },
  {
    id: 'swap_stations',
    label: 'Battery Swap Stations',
    shortLabel: 'Swap Stations',
    description: 'E-Boda swap hubs, battery stock & operator profiles',
    icon: Zap,
    coreMemberCategory: true,
  },
  {
    id: 'maintenance_centres',
    label: 'Maintenance Centres & Garages',
    shortLabel: 'Garages',
    description: 'Partner mechanics, garages & spare parts dealers',
    icon: Wrench,
    coreMemberCategory: true,
  },
  {
    id: 'jobs',
    label: 'Published Jobs & Employers',
    shortLabel: 'Jobs',
    description: 'Published job contracts & broadcast delivery logs',
    icon: Briefcase,
    coreMemberCategory: false,
  },
  {
    id: 'discovered_jobs',
    label: 'Discovered Job Adverts',
    shortLabel: 'Discovered',
    description: 'Daily automated discovered job candidate records',
    icon: Radar,
    coreMemberCategory: false,
  },
  {
    id: 'non_super_admins',
    label: 'Delegated Sub-Admins',
    shortLabel: 'Sub-Admins',
    description: 'Non-Super-Admin operator accounts (Brian Mukisa protected)',
    icon: Users,
    coreMemberCategory: true,
  },
];

const ALL_RESET_CATEGORY_IDS: ResetCategoryId[] = CATEGORY_META.map((c) => c.id);

export const AdminSystemResetHub: React.FC<AdminSystemResetHubProps> = ({
  currentRole = 'super_admin',
  onDataChanged,
  onNavigateRegistryTab,
}) => {
  const [sessionInfo, setSessionInfo] = useState(() => getSuperAdminSessionInfo());
  const [credStatus, setCredStatus] = useState<{
    configured: boolean;
    requiresSetup: boolean;
    source: string;
    fullName: string;
    email: string;
    phone: string;
  } | null>(null);
  const [credStatusLoading, setCredStatusLoading] = useState(true);
  const [authIdentifier, setAuthIdentifier] = useState('bmukisa@bodawerk.co.ug');
  const [authPasscode, setAuthPasscode] = useState('');
  const [authConfirmPasscode, setAuthConfirmPasscode] = useState('');
  const [showAuthPasscode, setShowAuthPasscode] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [showChangePasscodeModal, setShowChangePasscodeModal] = useState(false);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmNewPassInput, setConfirmNewPassInput] = useState('');
  const [changePassBusy, setChangePassBusy] = useState(false);
  const [changePassError, setChangePassError] = useState<string | null>(null);

  const [subTab, setSubTab] = useState<'complete' | 'selective' | 'register' | 'audit'>('complete');
  const [overview, setOverview] = useState<SystemResetOverviewPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Selective removal state
  const [categoryFilter, setCategoryFilter] = useState<'all' | ResetCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMap, setSelectedMap] = useState<Record<string, SelectiveDeleteTarget>>({});
  const [selectiveReason, setSelectiveReason] = useState('');
  const [showSelectiveModal, setShowSelectiveModal] = useState(false);
  const [selectiveBusy, setSelectiveBusy] = useState(false);

  // Complete & Category Reset State
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [selectedResetCategories, setSelectedResetCategories] = useState<ResetCategoryId[]>(
    ALL_RESET_CATEGORY_IDS
  );
  const [resetReason, setResetReason] = useState('');
  const [resetDialogMode, setResetDialogMode] = useState<'complete' | 'category' | null>(null);
  const [resetDialogCategories, setResetDialogCategories] = useState<ResetCategoryId[]>([]);
  const [resetDialogStep, setResetDialogStep] = useState<1 | 2>(1);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [lastResetSummary, setLastResetSummary] = useState<string | null>(null);

  // Direct Manual Registration Modals State
  const [stagesCache, setStagesCache] = useState<Stage[]>(() => storage.getStages());
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeSuperAdminSession(() => {
      setSessionInfo(getSuperAdminSessionInfo());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const syncStages = () => setStagesCache(storage.getStages());
    window.addEventListener('bodacare:directory-updated', syncStages);
    return () => window.removeEventListener('bodacare:directory-updated', syncStages);
  }, []);

  const showNotice = useCallback((type: 'success' | 'warning' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 8000);
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getSuperAdminToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-admin-id': 'admin-founder-mukisa',
      'x-admin-role': 'super_admin',
      'x-actor-name': 'Brian Mukisa (Super Admin)',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, []);

  const loadCredentialStatus = useCallback(async () => {
    setCredStatusLoading(true);
    try {
      const resp = await fetch('/api/auth/super-admin/status', { cache: 'no-store' });
      if (resp.ok) {
        const json = await resp.json();
        setCredStatus(json);
        if (json.email) setAuthIdentifier(json.email);
      }
    } catch {
      // ignore initial status fetch errors
    } finally {
      setCredStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentRole === 'super_admin') {
      loadCredentialStatus();
    }
  }, [currentRole, loadCredentialStatus]);

  const fetchOverview = useCallback(async () => {
    const token = getSuperAdminToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/admin/system-reset/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      const data = await resp.json();
      if (resp.status === 401 || resp.status === 403) {
        clearSuperAdminSession();
        setError(data.error || 'Super Admin session expired. Please unlock again.');
        return;
      }
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to load App Reset & Member Management overview.');
      }
      setOverview(data as SystemResetOverviewPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach System Reset backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentRole === 'super_admin' && sessionInfo.unlocked) {
      fetchOverview();
    }
  }, [currentRole, sessionInfo.unlocked, fetchOverview]);

  // Flat filtered items for Selective Removal (kept above early returns per React Rules of Hooks)
  const visibleItems: SystemResetOverviewItem[] = useMemo(() => {
    if (!overview) return [];
    const list: SystemResetOverviewItem[] = [];
    for (const meta of CATEGORY_META) {
      if (categoryFilter !== 'all' && categoryFilter !== meta.id) continue;
      const items = overview.itemsByCategory[meta.id] || [];
      list.push(...items);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [overview, categoryFilter, searchQuery]);

  // Strict UI RBAC guard
  if (currentRole !== 'super_admin') {
    return (
      <div className="bg-white rounded-2xl border border-rose-300 p-8 text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900">Super Admin Access Strictly Required</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          App Reset &amp; Member Management controls are restricted exclusively to Brian Mukisa (verified Super Administrator).
        </p>
      </div>
    );
  }

  const handleUnlockOrClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const isClaim = Boolean(credStatus?.requiresSetup);
      const endpoint = isClaim ? '/api/auth/super-admin/claim' : '/api/auth/super-admin/unlock';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isClaim
            ? {
                identifier: authIdentifier.trim(),
                passcode: authPasscode,
                confirmPasscode: authConfirmPasscode,
              }
            : {
                identifier: authIdentifier.trim(),
                passcode: authPasscode,
              }
        ),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || 'Authentication failed.');
      }
      setSuperAdminSession(json.token, json.expiresAt, json.admin);
      setAuthPasscode('');
      setAuthConfirmPasscode('');
      await loadCredentialStatus();
      showNotice(
        'success',
        isClaim
          ? 'Super Admin security passcode configured & session unlocked.'
          : 'Super Admin session verified & unlocked.'
      );
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to authenticate.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLockSession = async () => {
    const token = getSuperAdminToken();
    if (token) {
      await fetch('/api/auth/super-admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearSuperAdminSession();
    setOverview(null);
    showNotice('warning', 'Super Admin reset session locked.');
  };

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);
    setChangePassBusy(true);
    try {
      const resp = await fetch('/api/auth/super-admin/change-passcode', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPasscode: currentPassInput,
          newPasscode: newPassInput,
          confirmNewPasscode: confirmNewPassInput,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(json.error || 'Failed to update security passcode.');
      }
      if (json.status) setCredStatus(json.status);
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmNewPassInput('');
      setShowChangePasscodeModal(false);
      await fetchOverview();
      showNotice('success', 'Super Admin security passcode updated & encrypted in SQLite.');
    } catch (err) {
      setChangePassError(err instanceof Error ? err.message : 'Unable to update passcode.');
    } finally {
      setChangePassBusy(false);
    }
  };

  // Super Admin Passcode Verification Gate
  if (!sessionInfo.unlocked) {
    if (credStatusLoading && !credStatus) {
      return (
        <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-600">
            Checking Super Admin security credential status...
          </p>
        </div>
      );
    }

    const isSetup = Boolean(credStatus?.requiresSetup);
    const sourceBadge =
      credStatus?.source === 'env'
        ? 'Managed by Server Env (SUPER_ADMIN_PASSCODE)'
        : credStatus?.source === 'sqlite_scrypt'
        ? 'Configured in Database (scrypt Encrypted)'
        : 'First-Time Setup Required';

    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#0B192C] text-amber-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                Restricted Executive Vault
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                {sourceBadge}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
              App Reset &amp; Member Management
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {isSetup
                ? 'First-time security setup: Create a private Super Admin passcode (minimum 6 characters; 12+ recommended) known only to Brian Mukisa. Existing member records are untouched.'
                : credStatus?.source === 'env'
                ? 'Enter the private SUPER_ADMIN_PASSCODE configured in your server environment to unlock App Reset & Member Management.'
                : 'Enter Brian Mukisa’s Super Admin security passcode to unlock database reset and member management tools.'}
            </p>
          </div>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
            {authError}
          </div>
        )}

        <form onSubmit={handleUnlockOrClaim} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Super Admin Email or Phone
            </label>
            <input
              type="text"
              required
              value={authIdentifier}
              onChange={(e) => setAuthIdentifier(e.target.value)}
              placeholder="bmukisa@bodawerk.co.ug or +256772100240"
              className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isSetup ? 'Create Private Security Passcode (min 6 chars)' : 'Super Admin Security Passcode'}
            </label>
            <div className="relative">
              <input
                type={showAuthPasscode ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                value={authPasscode}
                onChange={(e) => setAuthPasscode(e.target.value)}
                placeholder="Enter private security passcode"
                className="w-full p-2.5 pr-10 border border-slate-300 rounded-xl font-mono text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowAuthPasscode((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer"
                aria-label={showAuthPasscode ? 'Hide passcode' : 'Show passcode'}
              >
                {showAuthPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSetup && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Confirm Private Security Passcode
              </label>
              <input
                type={showAuthPasscode ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={authConfirmPasscode}
                onChange={(e) => setAuthConfirmPasscode(e.target.value)}
                placeholder="Re-enter security passcode"
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-900"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={authBusy}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Unlock className="w-4 h-4 text-amber-400" />
            <span>
              {authBusy
                ? 'Verifying...'
                : isSetup
                ? 'Save Private Passcode & Unlock'
                : 'Unlock App Reset & Member Management'}
            </span>
          </button>
        </form>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
          Authorized Operator: <strong>{credStatus?.fullName || 'Brian Mukisa'}</strong> ({credStatus?.email || 'bmukisa@bodawerk.co.ug'}). Session tokens remain in memory only and lock automatically when cleared or expired.
        </div>
      </div>
    );
  }

  const selectedTargets = Object.values(selectedMap);

  const toggleSelectItem = (item: SystemResetOverviewItem) => {
    const key = `${item.category}:${item.id}`;
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = { category: item.category, id: item.id };
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const allSelected =
      visibleItems.length > 0 && visibleItems.every((it) => Boolean(selectedMap[`${it.category}:${it.id}`]));
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (allSelected) {
        for (const it of visibleItems) delete next[`${it.category}:${it.id}`];
      } else {
        for (const it of visibleItems) next[`${it.category}:${it.id}`] = { category: it.category, id: it.id };
      }
      return next;
    });
  };

  const toggleResetCategory = (catId: ResetCategoryId) => {
    setSelectedResetCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const openResetModal = (mode: 'complete' | 'category', categories: ResetCategoryId[]) => {
    setResetDialogMode(mode);
    setResetDialogCategories(categories);
    setResetDialogStep(1);
    setConfirmationInput('');
  };

  const handleDownloadBackup = async () => {
    setBackupBusy(true);
    try {
      const resp = await fetch('/api/admin/system-reset/backup', {
        headers: getAuthHeaders(),
      });
      if (resp.status === 401 || resp.status === 403) {
        clearSuperAdminSession();
        throw new Error('Super Admin session expired. Unlock again to export.');
      }
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Backup export failed.');
      }
      const jsonText = await resp.text();
      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `bodacare-uganda-backup-${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBackupDownloaded(true);
      showNotice('success', 'Full JSON backup exported! You can safely store it before running any reset.');
      await fetchOverview();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to export backup.');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleConfirmSelectiveDelete = async () => {
    if (selectedTargets.length === 0) return;
    setSelectiveBusy(true);
    try {
      const resp = await fetch('/api/admin/system-reset/selective', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          items: selectedTargets,
          reason: selectiveReason.trim() || 'Selective Super Admin cleanup',
        }),
      });
      const data = (await resp.json()) as SystemResetResult & { error?: string };
      if (resp.status === 401 || resp.status === 403) {
        clearSuperAdminSession();
        throw new Error(data.error || 'Super Admin authorization required.');
      }
      if (!resp.ok) {
        throw new Error(data.error || 'Selective deletion failed.');
      }
      setOverview(data.overview);
      setSelectedMap({});
      setSelectiveReason('');
      setShowSelectiveModal(false);
      await storage.syncDirectoryFromServer();
      onDataChanged?.();
      showNotice('success', data.details || `Removed ${data.deletedCount} selected record(s).`);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Selective removal failed.');
    } finally {
      setSelectiveBusy(false);
    }
  };

  const handleExecuteAuthorizedReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetDialogMode) return;
    if (confirmationInput.trim().toUpperCase() !== 'RESET') {
      showNotice('error', 'Type RESET exactly to authorize this reset.');
      return;
    }

    setResetBusy(true);
    try {
      const isComplete = resetDialogMode === 'complete';
      const includeJobs = resetDialogCategories.includes('jobs') || resetDialogCategories.includes('discovered_jobs');
      const endpoint = isComplete ? '/api/admin/system-reset/complete' : '/api/admin/system-reset/category';
      const payload = isComplete
        ? {
            confirmationText: confirmationInput.trim(),
            includeJobs,
            reason: resetReason.trim() || 'Complete membership reset by Super Admin Brian Mukisa',
          }
        : {
            categories: resetDialogCategories,
            confirmationText: confirmationInput.trim(),
            reason: resetReason.trim() || `Category reset (${resetDialogCategories.join(', ')}) by Super Admin`,
          };

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = (await resp.json()) as SystemResetResult & { error?: string };
      if (resp.status === 401 || resp.status === 403) {
        clearSuperAdminSession();
        throw new Error(data.error || 'Super Admin authorization required.');
      }
      if (!resp.ok) {
        throw new Error(data.error || 'Reset failed.');
      }

      if (isComplete) {
        storage.applyClientMembershipReset({ includeJobs });
      } else {
        storage.applyClientMembershipReset({ categories: resetDialogCategories });
      }
      await storage.syncDirectoryFromServer();
      setOverview(data.overview);
      setSelectedMap({});
      setConfirmationInput('');
      setResetReason('');
      setResetDialogMode(null);
      setLastResetSummary(data.details);
      onDataChanged?.();
      showNotice(
        'success',
        `Reset completed successfully (${data.deletedCount} record(s) removed, ${data.revokedCount} access credential(s) revoked). Protected accounts & financials preserved.`
      );
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Reset operation failed.');
    } finally {
      setResetBusy(false);
    }
  };

  const handleUnrevoke = async (idOrPhone: string) => {
    try {
      const resp = await fetch('/api/admin/system-reset/unrevoke', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ idOrPhone }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to restore access.');
      }
      setOverview(data.overview);
      showNotice('success', `Access block removed for "${idOrPhone}". They can now be re-registered.`);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Could not unblock account.');
    }
  };

  // Direct Manual Registration Handlers (from within App Reset & Member Management)
  const handleManualRegisterRider = async (
    rider: RiderProfile,
    channels: Array<'in_app' | 'sms' | 'whatsapp'>
  ) => {
    const resp = await fetch('/api/admin/riders', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rider, confirmationChannels: channels }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(json.error || `Failed to register rider (HTTP ${resp.status})`);
    }
    await storage.syncDirectoryFromServer();
    await fetchOverview();
    onDataChanged?.();
    const blockedCount = Array.isArray(json.deliveries)
      ? json.deliveries.filter((d: { status: string }) => d.status === 'blocked_unconfigured').length
      : 0;
    showNotice(
      blockedCount > 0 ? 'warning' : 'success',
      blockedCount > 0
        ? `Rider "${json.rider.fullName}" (${json.rider.riderIdNumber}) registered in SQLite. In-app confirmation active; SMS/WhatsApp awaiting provider credentials.`
        : `Rider "${json.rider.fullName}" (${json.rider.riderIdNumber}) registered and welcome confirmation dispatched.`
    );
  };

  const handleManualRegisterPassenger = async (
    passenger: PassengerProfile,
    channels: Array<'in_app' | 'sms' | 'whatsapp'>
  ) => {
    const resp = await fetch('/api/admin/passengers', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ passenger, confirmationChannels: channels }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(json.error || `Failed to register passenger (HTTP ${resp.status})`);
    }
    await storage.syncDirectoryFromServer();
    await fetchOverview();
    onDataChanged?.();
    showNotice(
      'success',
      `Passenger "${json.passenger.fullName}" (${json.passenger.passengerIdNumber}) registered in SQLite database.`
    );
  };

  const handleManualRegisterStage = async (stage: Stage) => {
    const resp = await fetch('/api/admin/stages', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(stage),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(json.error || `Failed to register boda stage (HTTP ${resp.status})`);
    }
    await storage.syncDirectoryFromServer();
    await fetchOverview();
    onDataChanged?.();
    showNotice('success', `Boda Stage "${json.stage.name}" (${json.stage.stageCode}) registered.`);
  };

  const handleManualRegisterStation = async (station: BatterySwapStation) => {
    const resp = await fetch('/api/admin/stations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(station),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(json.error || `Failed to register swap station (HTTP ${resp.status})`);
    }
    await storage.syncDirectoryFromServer();
    await fetchOverview();
    onDataChanged?.();
    showNotice('success', `Battery Swap Station "${json.station.name}" (${json.station.stationCode}) registered.`);
  };

  // Compute exact counts scheduled for active confirmation dialog
  const dialogScheduledCount = resetDialogCategories.reduce(
    (sum, cat) => sum + (overview?.counts[cat] ?? 0),
    0
  );

  return (
    <div className="space-y-5">
      {/* 1. Command Header Bar with Prominent RESET ALL MEMBER DATA Button */}
      <div className="bg-[#0B192C] text-white rounded-2xl p-5 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Super Admin Exclusive
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              Verified Session: {sessionInfo.admin?.fullName || 'Brian Mukisa'}
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            App Reset &amp; Member Management
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Permanently reset existing membership records all together or by individual category, revoke removed logins, and manually register verified riders, passengers, stages, and battery swap stations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openResetModal('complete', selectedResetCategories)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>RESET ALL MEMBER DATA</span>
          </button>

          <button
            type="button"
            disabled={backupBusy}
            onClick={handleDownloadBackup}
            className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{backupBusy ? 'Exporting...' : 'JSON Backup'}</span>
          </button>

          <button
            type="button"
            onClick={fetchOverview}
            disabled={loading}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {credStatus?.source !== 'env' && (
            <button
              type="button"
              onClick={() => {
                setChangePassError(null);
                setShowChangePasscodeModal(true);
              }}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              title="Change Brian Mukisa's Super Admin Passcode"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Passcode</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLockSession}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title="Lock Super Admin Reset Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : toast.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-xs underline cursor-pointer shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Protected Core Records Strip */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-950">Protected Records — Never Modified or Deleted</p>
            <p className="text-emerald-800 text-[11px] mt-0.5">
              Super Admin (<strong>{overview?.protectedRecords.superAdminEmail || 'bmukisa@bodawerk.co.ug'}</strong>), Payment Channels (<strong>MTN 0766848865 · Airtel 0731931455</strong>), Support (<strong>0764430057</strong>), Logos &amp; PWA Icons, Payment Submissions, Financial Transactions, Integration Settings, and Audit Logs ({overview?.protectedRecords.auditLogsCount ?? 0} entries).
            </p>
          </div>
        </div>
        {overview?.lastResetAt && (
          <div className="text-[11px] text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shrink-0 font-mono">
            Last Reset: <strong>{new Date(overview.lastResetAt).toLocaleString()}</strong>
          </div>
        )}
      </div>

      {/* Category Counts Grid with Direct Per-Category Clear Action */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {CATEGORY_META.map((cat) => {
            const Icon = cat.icon;
            const count = overview.counts[cat.id] || 0;
            const isActiveFilter = subTab === 'selective' && categoryFilter === cat.id;
            return (
              <div
                key={cat.id}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                  isActiveFilter
                    ? 'bg-[#0B192C] text-white border-amber-400'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSubTab('selective');
                    setCategoryFilter(cat.id);
                  }}
                  className="text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Icon className={`w-4 h-4 ${isActiveFilter ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="text-lg font-black font-mono tabular-nums">{count}</span>
                  </div>
                  <p className="text-[11px] font-bold truncate">{cat.shortLabel}</p>
                </button>
                <button
                  type="button"
                  disabled={count === 0}
                  onClick={() => openResetModal('category', [cat.id])}
                  className={`w-full py-1 rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                    isActiveFilter
                      ? 'bg-rose-600 text-white hover:bg-rose-500'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  {count === 0 ? 'Empty' : 'Clear Category'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Post-Reset Fresh Start Ownership Panel (shows when empty or after any reset) */}
      {(lastResetSummary ||
        (overview &&
          overview.counts.riders === 0 &&
          overview.counts.passengers === 0 &&
          overview.counts.stages === 0 &&
          overview.counts.swap_stations === 0)) && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-amber-400/40 space-y-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Clean Database Active — Manual Admin Registration Ready
            </span>
            <h3 className="text-base font-extrabold mt-0.5">
              Start Adding Clean BodaCare Uganda Members &amp; Locations
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              {lastResetSummary ||
                'Your membership database is empty. Manually register verified boda riders, passengers, stages, and battery swap stations below.'}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowStageModal(true)}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Boda Stage</span>
            </button>
            <button
              type="button"
              onClick={() => setShowRiderModal(true)}
              className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Rider</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPassengerModal(true)}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Passenger</span>
            </button>
            <button
              type="button"
              onClick={() => setShowStationModal(true)}
              className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Swap Station</span>
            </button>
            {onNavigateRegistryTab && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateRegistryTab('centres')}
                  className="p-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Garage</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateRegistryTab('jobs')}
                  className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Job</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setSubTab('complete')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
            subTab === 'complete' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Full &amp; Category Reset</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('selective')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
            subTab === 'selective' ? 'bg-[#0B192C] text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Selective Deletion ({overview?.totalRemovable ?? 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('register')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
            subTab === 'register' ? 'bg-emerald-600 text-white' : 'text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Manual Registration</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
            subTab === 'audit' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Revoked ({overview?.revokedAccounts.length ?? 0}) &amp; Audit Log</span>
        </button>
      </div>

      {/* TAB 1: COMPLETE & INDIVIDUAL CATEGORY RESET */}
      {subTab === 'complete' && (
        <div className="bg-white rounded-2xl border border-rose-200 p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900">
                Complete Membership Reset or Individual Category Clearing
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Clear all member categories at once or uncheck categories you want to keep. Every deletion runs atomically inside SQLite, revokes removed logins/USSD sessions, and leaves Super Admin credentials, Mobile Money numbers, transactions, and audit logs untouched.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openResetModal('complete', ALL_RESET_CATEGORY_IDS)}
              className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow cursor-pointer shrink-0"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>RESET ALL MEMBER DATA</span>
            </button>
          </div>

          {/* Dependent Records Summary */}
          {overview?.dependentCounts && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span className="font-bold text-slate-800">Linked Operational Data Impact:</span>
              <span className="text-slate-600">
                Stage Links: <strong className="font-mono tabular-nums text-slate-900">{overview.dependentCounts.assignedRiderStageLinks}</strong>
              </span>
              <span className="text-slate-600">
                USSD Sessions: <strong className="font-mono tabular-nums text-slate-900">{overview.dependentCounts.ussdSessions}</strong>
              </span>
              <span className="text-slate-600">
                Welcome Logs: <strong className="font-mono tabular-nums text-slate-900">{overview.dependentCounts.welcomeNotifications}</strong>
              </span>
              <span className="text-slate-600">
                Member Notifications: <strong className="font-mono tabular-nums text-slate-900">{overview.dependentCounts.memberNotifications}</strong>
              </span>
              <span className="text-slate-600">
                Job Deliveries: <strong className="font-mono tabular-nums text-slate-900">{overview.dependentCounts.jobDeliveries}</strong>
              </span>
              <span className="text-slate-600">
                Push Subscriptions: <strong className="font-mono tabular-nums text-slate-900">{overview.dependentCounts.pushSubscriptions}</strong>
              </span>
            </div>
          )}

          {/* Category Multi-Select Checkboxes + Individual Clear */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-900">
                Select Categories to Clear Together or Clear Individually:
              </p>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedResetCategories(ALL_RESET_CATEGORY_IDS)}
                  className="text-slate-700 hover:underline font-semibold cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedResetCategories(['riders', 'passengers', 'stages', 'swap_stations', 'maintenance_centres'])
                  }
                  className="text-slate-700 hover:underline font-semibold cursor-pointer"
                >
                  Core Members &amp; Locations Only
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedResetCategories([])}
                  className="text-slate-500 hover:underline font-semibold cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {CATEGORY_META.map((cat) => {
                const Icon = cat.icon;
                const count = overview?.counts[cat.id] ?? 0;
                const checked = selectedResetCategories.includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between gap-2.5 ${
                      checked ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleResetCategory(cat.id)}
                        className="mt-0.5 w-4 h-4 accent-rose-600 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span className="truncate">{cat.shortLabel}</span>
                          </span>
                          <span className="font-mono font-extrabold text-slate-900 tabular-nums">
                            {count}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{cat.description}</p>
                      </div>
                    </label>
                    <button
                      type="button"
                      disabled={count === 0}
                      onClick={() => openResetModal('category', [cat.id])}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 font-bold text-[11px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {count === 0 ? 'Already Empty (0)' : `Clear Only ${cat.shortLabel} (${count})`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Reason + Execute Selected Categories */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-2 border-t border-slate-100 text-xs">
            <div className="md:col-span-8">
              <label className="block font-semibold text-slate-700 mb-1">
                Audit Reason / Administrative Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Clearing old test membership before live Luweero onboarding"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button
                type="button"
                disabled={selectedResetCategories.length === 0}
                onClick={() =>
                  openResetModal(
                    selectedResetCategories.length === ALL_RESET_CATEGORY_IDS.length ? 'complete' : 'category',
                    selectedResetCategories
                  )
                }
                className="w-full px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  Clear Selected ({selectedResetCategories.length} Categories)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SELECTIVE RECORD REMOVAL */}
      {subTab === 'selective' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Selective Record Removal &amp; Lookup</h3>
              <p className="text-xs text-slate-500">
                Filter by category or search by name, phone, plate, or stage to permanently remove individual records and revoke access.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedTargets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedMap({})}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Clear Selection ({selectedTargets.length})
                </button>
              )}
              <button
                type="button"
                disabled={selectedTargets.length === 0}
                onClick={() => setShowSelectiveModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Selected ({selectedTargets.length})</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, phone, plate number, stage, garage, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | ResetCategoryId)}
              className="w-full sm:w-auto p-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
            >
              <option value="all">All Categories ({overview?.totalRemovable ?? 0})</option>
              {CATEGORY_META.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label} ({overview?.counts[cat.id] ?? 0})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={toggleSelectAllVisible}
              disabled={visibleItems.length === 0}
              className="w-full sm:w-auto px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {visibleItems.length > 0 &&
                visibleItems.every((it) => Boolean(selectedMap[`${it.category}:${it.id}`]))
                  ? 'Deselect Visible'
                  : `Select All Visible (${visibleItems.length})`}
              </span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading SQLite directory records...</div>
          ) : visibleItems.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
              <p className="text-sm font-bold text-slate-700">No removable records found in this view.</p>
              <p className="text-xs text-slate-500">
                {overview?.totalRemovable === 0
                  ? 'Your directory is clean! Switch to Manual Registration to add verified riders, passengers, stages, and swap stations.'
                  : 'Try adjusting your category filter or search term.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10">Pick</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Name / Title</th>
                    <th className="p-3">Details &amp; Phone</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Status &amp; Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map((item) => {
                    const key = `${item.category}:${item.id}`;
                    const checked = Boolean(selectedMap[key]);
                    const catLabel = CATEGORY_META.find((c) => c.id === item.category)?.shortLabel || item.category;
                    return (
                      <tr
                        key={key}
                        onClick={() => toggleSelectItem(item)}
                        className={`cursor-pointer transition-colors ${
                          checked ? 'bg-rose-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3">
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] uppercase">
                            {catLabel}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            {item.avatarUrl && (
                              <img
                                src={item.avatarUrl}
                                alt={item.title}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <span>{item.title}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{item.subtitle}</td>
                        <td className="p-3 text-slate-600">{item.location}</td>
                        <td className="p-3 space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[10px] uppercase">
                            {item.status}
                          </span>
                          {item.createdAt && (
                            <span className="block font-mono text-[10px] text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIRECT MANUAL REGISTRATION AFTER RESET */}
      {subTab === 'register' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Manual Registration — Build Clean Membership Database
              </h3>
              <p className="text-xs text-slate-500">
                Directly register verified Riders, Passengers, Boda Stages, and Battery Swap Stations into SQLite and immediately publish to live directories and registration confirmations.
              </p>
            </div>
            {onNavigateRegistryTab && (
              <button
                type="button"
                onClick={() => onNavigateRegistryTab('riders')}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Open Full Central Registry</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Bike className="w-5 h-5" />
                  </div>
                  <span className="font-mono font-extrabold text-lg text-slate-900 tabular-nums">
                    {overview?.counts.riders ?? 0}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 mt-3">Register Boda Rider</h4>
                <p className="text-slate-600 mt-1">
                  Full name, telephone, WhatsApp, location, motorcycle plate, stage assignment, photo &amp; welcome alert.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRiderModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register New Rider</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <span className="font-mono font-extrabold text-lg text-slate-900 tabular-nums">
                    {overview?.counts.passengers ?? 0}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 mt-3">Register Passenger</h4>
                <p className="text-slate-600 mt-1">
                  Full name, telephone, WhatsApp, residential area, device type &amp; assisted onboarding confirmation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPassengerModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register New Passenger</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="font-mono font-extrabold text-lg text-slate-900 tabular-nums">
                    {overview?.counts.stages ?? 0}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 mt-3">Register Boda Stage</h4>
                <p className="text-slate-600 mt-1">
                  Stage name, sub-county/village location, stage chairperson name, phone, GPS &amp; member count.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStageModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register New Stage</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="font-mono font-extrabold text-lg text-slate-900 tabular-nums">
                    {overview?.counts.swap_stations ?? 0}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 mt-3">Register Swap Station</h4>
                <p className="text-slate-600 mt-1">
                  Station name, physical location, operator contact person &amp; phone, packs &amp; operational status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStationModal(true)}
                className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Swap Station</span>
              </button>
            </div>
          </div>

          {onNavigateRegistryTab && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-600">
                Need to edit existing members, approve KYC, transfer riders between stages, or manage Maintenance Garages?
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateRegistryTab('riders')}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-800 cursor-pointer"
                >
                  Manage Riders &amp; Transfers
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateRegistryTab('centres')}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 font-bold text-slate-800 cursor-pointer"
                >
                  Add Garage / Centre
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REVOKED ACCESS & DELETION AUDIT */}
      {subTab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Revoked Accounts &amp; Blocked Phones</h3>
                <p className="text-[11px] text-slate-500">
                  Removed accounts are automatically blocked from signing in or self-registering until unblocked or manually re-registered by Brian Mukisa.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-bold font-mono tabular-nums">
                {overview?.revokedAccounts.length ?? 0} Blocked
              </span>
            </div>

            {!overview || overview.revokedAccounts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                No revoked accounts currently listed.
              </div>
            ) : (
              <div className="space-y-2">
                {overview.revokedAccounts.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{rev.fullName}</p>
                      <p className="text-[11px] text-slate-600 font-mono">
                        {rev.phone || rev.email || rev.recordId} • <span className="uppercase">{rev.category}</span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Revoked {new Date(rev.revokedAt).toLocaleString()} by {rev.revokedBy}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnrevoke(rev.phone || rev.email || rev.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-400 text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Unlock className="w-3 h-3 text-emerald-600" />
                      <span>Restore Access</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Preserved Reset &amp; Deletion Audit Trail</h3>
              <p className="text-[11px] text-slate-500">
                Immutable security log preserved permanently across all system resets.
              </p>
            </div>

            {!overview || overview.resetAuditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                No reset or deletion audit events recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {overview.resetAuditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-rose-800">{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">
                      Actor: {log.actorName} • Target: {log.target}
                    </p>
                    <p className="text-[11px] text-slate-600">{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SELECTIVE DELETE CONFIRMATION MODAL */}
      {showSelectiveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-rose-200 space-y-4 my-auto mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Selective Deletion ({selectedTargets.length} records)
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Selected riders, passengers, stages, stations, garages, jobs, or sub-admins will be permanently removed from SQLite and public directories, and their login/USSD access revoked.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Removal (Recorded in Audit Log)
              </label>
              <input
                type="text"
                placeholder="e.g. Removing obsolete sample data"
                value={selectiveReason}
                onChange={(e) => setSelectiveReason(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSelectiveModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectiveBusy}
                onClick={handleConfirmSelectiveDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {selectiveBusy ? 'Deleting...' : `Delete ${selectedTargets.length} Record(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-STEP COMPLETE / CATEGORY RESET AUTHORIZATION MODAL */}
      {resetDialogMode && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border-2 border-rose-400 space-y-4 my-auto mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                  Confirmation Step {resetDialogStep} of 2
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  {resetDialogMode === 'complete'
                    ? 'Permanent Complete Membership Reset'
                    : `Clear Selected Category Data (${resetDialogCategories.length})`}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  This operation executes directly against the live SQLite database and cannot be undone once confirmed.
                </p>
              </div>
            </div>

            {resetDialogStep === 1 ? (
              <div className="space-y-4">
                {/* Summary of Records Scheduled for Permanent Deletion */}
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
                  <p className="font-bold text-rose-950">
                    Records to be Permanently Deleted ({dialogScheduledCount} primary record(s)):
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-rose-900">
                    {resetDialogCategories.map((catId) => {
                      const meta = CATEGORY_META.find((m) => m.id === catId);
                      const count = overview?.counts[catId] ?? 0;
                      return (
                        <div key={catId} className="flex justify-between bg-white px-2.5 py-1 rounded border border-rose-200">
                          <span>{meta?.shortLabel || catId}:</span>
                          <strong className="font-mono tabular-nums">{count}</strong>
                        </div>
                      );
                    })}
                  </div>
                  {overview?.dependentCounts && (
                    <p className="text-[11px] text-rose-800 pt-1">
                      Also clears linked stage links ({overview.dependentCounts.assignedRiderStageLinks}), active USSD sessions ({overview.dependentCounts.ussdSessions}), member notifications ({overview.dependentCounts.memberNotifications}), and welcome logs ({overview.dependentCounts.welcomeNotifications}) for cleared categories.
                    </p>
                  )}
                </div>

                {/* Protected Records Reassurance */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-950 space-y-1">
                  <p className="font-bold">Protected &amp; Preserved (Will NOT be touched):</p>
                  <p>
                    • Brian Mukisa Super Admin account &amp; credentials ({overview?.protectedRecords.superAdminEmail || 'bmukisa@bodawerk.co.ug'})<br />
                    • Official MoMo numbers (MTN 0766848865, Airtel 0731931455) &amp; Support (0764430057)<br />
                    • Payment submissions, financial transaction history, logos, settings &amp; security audit logs
                  </p>
                </div>

                {!backupDownloaded && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-2">
                    <span>Recommended: Export a JSON backup copy first.</span>
                    <button
                      type="button"
                      disabled={backupBusy}
                      onClick={handleDownloadBackup}
                      className="px-2.5 py-1 bg-amber-400 text-slate-950 rounded-lg font-bold cursor-pointer shrink-0"
                    >
                      {backupBusy ? 'Exporting...' : 'Download Backup'}
                    </button>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetDialogMode(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetDialogStep(2)}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer"
                  >
                    Continue to Step 2 Authorization
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteAuthorizedReset} className="space-y-4">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-semibold">
                  Final Irreversible Warning: You are about to clear {dialogScheduledCount} primary record(s) across {resetDialogCategories.length} category/categories from the BodaCare Uganda database.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Type <span className="font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">RESET</span> to authorize
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="RESET"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    className="w-full p-2.5 border-2 border-slate-300 focus:border-rose-600 rounded-xl text-xs font-mono uppercase font-bold"
                  />
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetDialogStep(1)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Back
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResetDialogMode(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetBusy || confirmationInput.trim().toUpperCase() !== 'RESET'}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-40"
                    >
                      {resetBusy ? 'Resetting Database...' : 'Authorize & Execute Reset'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Direct Manual Registration Modals */}
      {showRiderModal && (
        <RiderFormModal
          stages={stagesCache}
          onSave={handleManualRegisterRider}
          onClose={() => setShowRiderModal(false)}
        />
      )}
      {showPassengerModal && (
        <PassengerFormModal
          onSave={handleManualRegisterPassenger}
          onClose={() => setShowPassengerModal(false)}
        />
      )}
      {showStageModal && (
        <StageFormModal
          onSave={handleManualRegisterStage}
          onClose={() => setShowStageModal(false)}
        />
      )}
      {showStationModal && (
        <StationFormModal
          onSave={handleManualRegisterStation}
          onClose={() => setShowStationModal(false)}
        />
      )}

      {/* Super Admin Passcode Rotation Modal */}
      {showChangePasscodeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <form
            onSubmit={handleChangePasscode}
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs my-auto mx-auto"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-amber-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Super Admin Passcode</h3>
                <p className="text-slate-600 mt-0.5">
                  Updates Brian Mukisa’s scrypt-hashed security passcode stored in SQLite. If you set SUPER_ADMIN_PASSCODE in server environment variables later, that takes priority.
                </p>
              </div>
            </div>

            {changePassError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                {changePassError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Passcode</label>
                <input
                  type="password"
                  required
                  value={currentPassInput}
                  onChange={(e) => setCurrentPassInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Private Passcode (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New Passcode</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmNewPassInput}
                  onChange={(e) => setConfirmNewPassInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowChangePasscodeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={changePassBusy}
                className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {changePassBusy ? 'Saving...' : 'Save New Passcode'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
