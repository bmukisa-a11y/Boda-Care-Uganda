import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Search,
  Bike,
  UserCheck,
  Briefcase,
  Zap,
  Wrench,
  MapPin,
  Send,
  Shield,
  Download,
  Plus,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  Ban,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Phone,
  Database,
  Server,
  Clock,
  FileSpreadsheet,
  Radio,
  ArrowRightLeft,
  Lock,
} from 'lucide-react';
import type {
  AdminAccount,
  AdminCategory,
  AuditLog,
  BatterySwapStation,
  BodaJob,
  BusinessListing,
  CentralAnalytics,
  MessagingGatewayStatus,
  NotificationDeliveryRecord,
  PassengerProfile,
  RiderProfile,
  Stage,
} from '../../types';
import { storage } from '../../lib/storage';
import { formatUgx } from '../../lib/i18n';
import {
  AdminAccountFormModal,
  ConfirmDeleteModal,
  MaintenanceCentreFormModal,
  PassengerFormModal,
  QuickJobModal,
  RiderFormModal,
  StageDetailModal,
  StageFormModal,
  StationFormModal,
} from './CentralAdminModals';

type RegistryTab =
  | 'analytics'
  | 'search_export'
  | 'riders'
  | 'passengers'
  | 'jobs'
  | 'stations'
  | 'centres'
  | 'stages'
  | 'messaging_ussd'
  | 'security_audit';

interface CentralAdminRegistryProps {
  initialTab?: RegistryTab;
  onOpenBulkJobSms?: () => void;
  onDataSynced?: () => void;
}

export const CentralAdminRegistry: React.FC<CentralAdminRegistryProps> = ({
  initialTab = 'analytics',
  onOpenBulkJobSms,
  onDataSynced,
}) => {
  const [tab, setTab] = useState<RegistryTab>(initialTab);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Core SQLite-backed datasets
  const [analytics, setAnalytics] = useState<CentralAnalytics | null>(null);
  const [riders, setRiders] = useState<RiderProfile[]>(() => storage.getRiders());
  const [passengers, setPassengers] = useState<PassengerProfile[]>(() => storage.getPassengers());
  const [jobs, setJobs] = useState<BodaJob[]>(() => storage.getJobs());
  const [stations, setStations] = useState<BatterySwapStation[]>(() => storage.getSwapStations());
  const [centres, setCentres] = useState<BusinessListing[]>(() => storage.getBusinesses());
  const [stages, setStages] = useState<Stage[]>(() => storage.getStages());
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [activeAdminId, setActiveAdminId] = useState<string>('admin-founder-mukisa');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => storage.getAuditLogs());
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationDeliveryRecord[]>([]);
  const [gatewayStatus, setGatewayStatus] = useState<MessagingGatewayStatus | null>(null);

  // Filters & Cross-Category Search
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalCategoryFilter, setGlobalCategoryFilter] = useState<'all' | AdminCategory>('all');
  const [globalLocationFilter, setGlobalLocationFilter] = useState('all');
  const [globalStatusFilter, setGlobalStatusFilter] = useState('all');

  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryStatusFilter, setCategoryStatusFilter] = useState('all');
  const [categoryLocationFilter, setCategoryLocationFilter] = useState('all');

  // Modals & Inspectors
  const [riderModal, setRiderModal] = useState<{ open: boolean; item?: RiderProfile | null }>({ open: false });
  const [passengerModal, setPassengerModal] = useState<{ open: boolean; item?: PassengerProfile | null }>({ open: false });
  const [jobModal, setJobModal] = useState<{ open: boolean; item?: BodaJob | null }>({ open: false });
  const [stationModal, setStationModal] = useState<{ open: boolean; item?: BatterySwapStation | null }>({ open: false });
  const [centreModal, setCentreModal] = useState<{ open: boolean; item?: BusinessListing | null }>({ open: false });
  const [stageModal, setStageModal] = useState<{ open: boolean; item?: Stage | null }>({ open: false });
  const [adminModal, setAdminModal] = useState<{ open: boolean; item?: AdminAccount | null }>({ open: false });
  const [inspectStage, setInspectStage] = useState<Stage | null>(null);
  const [inspectProfile, setInspectProfile] = useState<{ title: string; fields: Array<{ label: string; value: string }> } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    category: AdminCategory | 'admins';
    id: string;
    name: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Announcement Dispatcher State
  const [annTargetGroup, setAnnTargetGroup] = useState<'riders' | 'passengers' | 'stage_riders' | 'location' | 'all_members'>('riders');
  const [annSelectedIds, setAnnSelectedIds] = useState<string[]>([]);
  const [annStageId, setAnnStageId] = useState<string>('');
  const [annLocation, setAnnLocation] = useState<string>('Kikyusa');
  const [annChannels, setAnnChannels] = useState<Array<'in_app' | 'sms' | 'whatsapp'>>(['in_app', 'sms']);
  const [annTitle, setAnnTitle] = useState('BodaCare Uganda Official Update');
  const [annMessage, setAnnMessage] = useState('');
  const [annSending, setAnnSending] = useState(false);

  // USSD Interactive Backend Probe
  const [ussdPhone, setUssdPhone] = useState('+256779441205');
  const [ussdInput, setUssdInput] = useState('');
  const [ussdOutput, setUssdOutput] = useState<string | null>(null);

  const activeAdmin = useMemo(() => {
    return admins.find((a) => a.id === activeAdminId) || admins[0] || null;
  }, [admins, activeAdminId]);

  const hasPerm = useCallback(
    (perm: keyof AdminAccount['permissions']): boolean => {
      if (!activeAdmin) return activeAdminId === 'admin-founder-mukisa';
      if (activeAdmin.status !== 'active') return false;
      if (activeAdmin.role === 'super_admin') return true;
      return Boolean(activeAdmin.permissions[perm]);
    },
    [activeAdmin, activeAdminId]
  );

  const adminHeaders = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      'x-admin-id': activeAdminId || 'admin-founder-mukisa',
      'x-admin-role': activeAdmin?.role || 'super_admin',
      'x-actor-name': activeAdmin?.fullName || 'Brian Mukisa (Super Admin)',
    }),
    [activeAdminId, activeAdmin]
  );

  const showNotice = (type: 'success' | 'warning' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const syncLocalCaches = useCallback(
    (data: {
      riders?: RiderProfile[];
      passengers?: PassengerProfile[];
      jobs?: BodaJob[];
      stations?: BatterySwapStation[];
      centres?: BusinessListing[];
      stages?: Stage[];
    }) => {
      if (data.riders) storage.setRidersCache(data.riders);
      if (data.passengers) storage.setPassengersCache(data.passengers);
      if (data.jobs) storage.setJobsCache(data.jobs);
      if (data.stations) storage.setSwapStationsCache(data.stations);
      if (data.centres) storage.setBusinessesCache(data.centres);
      if (data.stages) storage.setStagesCache(data.stages);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bodacare:directory-updated'));
      }
      onDataSynced?.();
    },
    [onDataSynced]
  );

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/bootstrap', {
        headers: adminHeaders(),
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        if (resp.status === 403) {
          showNotice('error', errJson.error || 'Access denied by RBAC policy.');
          return;
        }
        throw new Error(errJson.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setBackendOnline(true);
      setAnalytics(data.analytics);
      setRiders(data.riders || []);
      setPassengers(data.passengers || []);
      setJobs(data.jobs || []);
      setStations(data.stations || []);
      setCentres(data.centres || []);
      setStages(data.stages || []);
      setAdmins(data.admins || []);
      setAuditLogs(data.auditLogs || []);
      setDeliveryLogs(data.deliveryLogs || []);
      setGatewayStatus(data.gatewayStatus || null);
      if (!annStageId && data.stages?.[0]?.id) setAnnStageId(data.stages[0].id);

      syncLocalCaches({
        riders: data.riders,
        passengers: data.passengers,
        jobs: data.jobs,
        stations: data.stations,
        centres: data.centres,
        stages: data.stages,
      });
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, [adminHeaders, annStageId, syncLocalCaches]);

  useEffect(() => {
    loadBootstrap();
  }, [activeAdminId]);

  const apiMutate = async (url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown) => {
    const resp = await fetch(url, {
      method,
      headers: adminHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(json.error || `Request failed with HTTP ${resp.status}`);
    }
    return json;
  };

  // =========================================================================
  // MUTATION HANDLERS (ALL PERSISTED IN SQLITE WITH AUDIT LOGGING)
  // =========================================================================
  const handleSaveRider = async (rider: RiderProfile, channels: Array<'in_app' | 'sms' | 'whatsapp'>) => {
    const isEdit = riders.some((r) => r.id === rider.id);
    const res = isEdit
      ? await apiMutate(`/api/admin/riders/${rider.id}`, 'PUT', rider)
      : await apiMutate('/api/admin/riders', 'POST', { rider, confirmationChannels: channels });

    await loadBootstrap();
    if (res.deliveries?.length) {
      const blocked = res.deliveries.filter((d: NotificationDeliveryRecord) => d.status === 'blocked_unconfigured' || d.status === 'failed');
      if (blocked.length > 0) {
        showNotice(
          'warning',
          `Rider ${res.rider.fullName} saved to SQLite (${res.rider.riderIdNumber}). ${blocked.length} confirmation channel(s) require API credentials — check Messaging & Gateways.`
        );
        return;
      }
    }
    showNotice('success', `Rider "${res.rider.fullName}" (${res.rider.riderIdNumber}) saved to SQLite registry.`);
  };

  const handleSavePassenger = async (passenger: PassengerProfile, channels: Array<'in_app' | 'sms' | 'whatsapp'>) => {
    const isEdit = passengers.some((p) => p.id === passenger.id);
    const res = isEdit
      ? await apiMutate(`/api/admin/passengers/${passenger.id}`, 'PUT', passenger)
      : await apiMutate('/api/admin/passengers', 'POST', { passenger, confirmationChannels: channels });

    await loadBootstrap();
    if (res.deliveries?.length) {
      const blocked = res.deliveries.filter((d: NotificationDeliveryRecord) => d.status === 'blocked_unconfigured');
      if (blocked.length > 0) {
        showNotice(
          'warning',
          `Passenger ${res.passenger.fullName} (${res.passenger.passengerIdNumber}) saved to SQLite. SMS/WhatsApp confirmation blocked until gateway credentials are configured.`
        );
        return;
      }
    }
    showNotice('success', `Passenger "${res.passenger.fullName}" (${res.passenger.passengerIdNumber}) saved.`);
  };

  const handleSaveJob = async (job: BodaJob) => {
    const isEdit = jobs.some((j) => j.id === job.id);
    if (isEdit) {
      await apiMutate(`/api/jobs/${job.id}`, 'PATCH', job);
    } else {
      await apiMutate('/api/jobs', 'POST', job);
    }
    await loadBootstrap();
    showNotice('success', `Job "${job.title}" saved in SQLite registry.`);
  };

  const handleSaveStation = async (station: BatterySwapStation) => {
    const isEdit = stations.some((s) => s.id === station.id);
    const res = isEdit
      ? await apiMutate(`/api/admin/stations/${station.id}`, 'PUT', station)
      : await apiMutate('/api/admin/stations', 'POST', station);
    await loadBootstrap();
    showNotice('success', `Swap station "${res.station.name}" saved.`);
  };

  const handleSaveCentre = async (centre: BusinessListing) => {
    const isEdit = centres.some((c) => c.id === centre.id);
    const res = isEdit
      ? await apiMutate(`/api/admin/centres/${centre.id}`, 'PUT', centre)
      : await apiMutate('/api/admin/centres', 'POST', centre);
    await loadBootstrap();
    showNotice('success', `Maintenance centre "${res.centre.name}" saved.`);
  };

  const handleSaveStage = async (stage: Stage) => {
    const isEdit = stages.some((s) => s.id === stage.id);
    const res = isEdit
      ? await apiMutate(`/api/admin/stages/${stage.id}`, 'PUT', stage)
      : await apiMutate('/api/admin/stages', 'POST', stage);
    await loadBootstrap();
    showNotice('success', `Boda stage "${res.stage.name}" saved.`);
  };

  const handleTransferRiderStage = async (riderId: string, targetStageId: string) => {
    try {
      const res = await apiMutate(`/api/admin/riders/${riderId}/transfer-stage`, 'POST', { stageId: targetStageId });
      await loadBootstrap();
      if (inspectStage) {
        const refreshed = (res.stages as Stage[])?.find((s) => s.id === inspectStage.id);
        if (refreshed) setInspectStage(refreshed);
      }
      showNotice('success', `Transferred ${res.rider.fullName} to "${res.stage.name}".`);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Transfer failed.');
    }
  };

  const handleSaveAdmin = async (admin: AdminAccount) => {
    await apiMutate('/api/admin/admins', 'POST', admin);
    await loadBootstrap();
    showNotice('success', `Admin account "${admin.fullName}" (${admin.role}) saved.`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteBusy(true);
    try {
      const urlMap: Record<AdminCategory | 'admins', string> = {
        riders: `/api/admin/riders/${deleteConfirm.id}`,
        passengers: `/api/admin/passengers/${deleteConfirm.id}`,
        jobs: `/api/jobs/${deleteConfirm.id}`,
        stations: `/api/admin/stations/${deleteConfirm.id}`,
        centres: `/api/admin/centres/${deleteConfirm.id}`,
        stages: `/api/admin/stages/${deleteConfirm.id}`,
        admins: `/api/admin/admins/${deleteConfirm.id}`,
      };
      await apiMutate(urlMap[deleteConfirm.category], 'DELETE');
      showNotice('success', `Deleted "${deleteConfirm.name}" from SQLite database.`);
      setDeleteConfirm(null);
      await loadBootstrap();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleExportDownload = async (category: 'all' | AdminCategory, format: 'csv' | 'json') => {
    try {
      const resp = await fetch(`/api/admin/export?category=${category}&format=${format}`, {
        headers: adminHeaders(),
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({ error: 'Export denied' }));
        showNotice('error', errJson.error || 'Export failed.');
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bodacare_${category}_registry.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotice('success', `Downloaded ${category.toUpperCase()} report (${format.toUpperCase()}).`);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Unable to export report.');
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (annChannels.length === 0) {
      showNotice('error', 'Select at least one delivery channel (In-App, SMS, or WhatsApp).');
      return;
    }
    setAnnSending(true);
    try {
      const res = await apiMutate('/api/admin/announcements', 'POST', {
        targetGroup: annTargetGroup,
        selectedIds: annSelectedIds,
        stageId: annStageId,
        locationFilter: annLocation,
        channels: annChannels,
        title: annTitle,
        message: annMessage,
      });
      setDeliveryLogs(res.deliveryLogs || []);
      setGatewayStatus(res.gatewayStatus || gatewayStatus);
      await loadBootstrap();
      const sentOrApp = (res.deliveries as NotificationDeliveryRecord[]).filter(
        (d) => d.status === 'sent' || d.status === 'delivered' || d.status === 'in_app_delivered'
      ).length;
      const blocked = (res.deliveries as NotificationDeliveryRecord[]).filter((d) => d.status === 'blocked_unconfigured').length;
      if (blocked > 0) {
        showNotice(
          'warning',
          `Targeted ${res.targetedCount} member(s): ${sentOrApp} delivered in-app, ${blocked} SMS/WhatsApp dispatches blocked because telecom/Meta credentials are unconfigured.`
        );
      } else {
        showNotice('success', `Announcement dispatched to ${res.targetedCount} recipient(s) (${sentOrApp} delivery records confirmed).`);
      }
      setAnnMessage('');
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to dispatch announcement.');
    } finally {
      setAnnSending(false);
    }
  };

  const handleProbeUssd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/ussd/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `probe-${Date.now()}`,
          serviceCode: gatewayStatus?.ussd.serviceCode || '*284*22#',
          phoneNumber: ussdPhone,
          text: ussdInput,
        }),
      });
      const txt = await resp.text();
      setUssdOutput(txt);
    } catch (err) {
      setUssdOutput(`Error calling /api/ussd/callback: ${err instanceof Error ? err.message : 'Offline'}`);
    }
  };

  // =========================================================================
  // UNIFIED CROSS-CATEGORY SEARCH DATASET
  // =========================================================================
  const unifiedRecords = useMemo(() => {
    type UnifiedItem = {
      category: AdminCategory;
      id: string;
      code: string;
      name: string;
      contact: string;
      district: string;
      area: string;
      status: string;
      meta: string;
      updatedAt: string;
    };

    const items: UnifiedItem[] = [
      ...riders.map((r) => ({
        category: 'riders' as const,
        id: r.id,
        code: r.riderIdNumber,
        name: r.fullName,
        contact: r.phone,
        district: r.district || 'Luweero',
        area: `${r.village ? `${r.village}, ` : ''}${r.subCounty || ''}`,
        status: r.accountStatus || (r.verificationStatus === 'suspended' ? 'suspended' : 'active'),
        meta: `${r.motorcycleType.toUpperCase()} · ${r.motorcycleReg} · ${r.stageName} · ${r.phoneType === 'feature_phone' ? 'Button Phone' : 'Smartphone'}`,
        updatedAt: r.updatedAt || r.registrationDate,
      })),
      ...passengers.map((p) => ({
        category: 'passengers' as const,
        id: p.id,
        code: p.passengerIdNumber || p.id,
        name: p.fullName,
        contact: p.phone,
        district: p.district || 'Luweero',
        area: `${p.village ? `${p.village}, ` : ''}${p.subCounty || ''}`,
        status: p.accountStatus || 'active',
        meta: `${p.phoneType === 'feature_phone' ? 'Button Phone' : 'Smartphone'}${p.assistedRegistration ? ' · Assisted' : ''}`,
        updatedAt: p.updatedAt || p.createdAt || '',
      })),
      ...jobs.map((j) => ({
        category: 'jobs' as const,
        id: j.id,
        code: j.jobCode || j.id,
        name: j.title,
        contact: `${j.employerCompany} (${j.employerPhone})`,
        district: j.district || 'Luweero',
        area: `${j.village ? `${j.village}, ` : ''}${j.subCounty}`,
        status: j.status,
        meta: `${formatUgx(j.paymentAmountUgx)} · ${j.adminApproved ? 'Verified' : 'Pending Approval'}`,
        updatedAt: j.updatedAt || j.postedDate,
      })),
      ...stations.map((s) => ({
        category: 'stations' as const,
        id: s.id,
        code: s.stationCode || s.id,
        name: s.name,
        contact: `${s.operatorName} (${s.operatorPhone})`,
        district: s.district || 'Luweero',
        area: `${s.village ? `${s.village}, ` : ''}${s.subCounty}`,
        status: s.status,
        meta: `${s.batteryBrand} · ${s.availableBatteries}/${s.totalBatteries} packs · GPS(${s.lat}, ${s.lng})`,
        updatedAt: s.updatedAt || s.lastStockUpdate,
      })),
      ...centres.map((c) => ({
        category: 'centres' as const,
        id: c.id,
        code: c.centreCode || c.id,
        name: c.name,
        contact: `${c.ownerName} (${c.phone})`,
        district: c.district || 'Luweero',
        area: `${c.village ? `${c.village}, ` : ''}${c.subCounty}`,
        status: c.accountStatus || 'active',
        meta: `${c.category.toUpperCase()} · Bikes:${c.bikeTypesServiced || 'both'} · ${c.verified ? 'Verified' : 'Unverified'}`,
        updatedAt: c.updatedAt || c.createdAt || '',
      })),
      ...stages.map((st) => ({
        category: 'stages' as const,
        id: st.id,
        code: st.stageCode || st.id,
        name: st.name,
        contact: `${st.leaderName} (${st.leaderPhone})`,
        district: st.district,
        area: `${st.village ? `${st.village}, ` : ''}${st.subCounty}`,
        status: st.operatingStatus || 'active',
        meta: `${st.memberCount} members · Welfare ${formatUgx(st.dailyWelfareFeeUgx)}/day`,
        updatedAt: st.updatedAt || st.createdAt || '',
      })),
    ];

    return items.filter((item) => {
      if (globalCategoryFilter !== 'all' && item.category !== globalCategoryFilter) return false;
      if (
        globalLocationFilter !== 'all' &&
        !`${item.district} ${item.area}`.toLowerCase().includes(globalLocationFilter.toLowerCase())
      ) {
        return false;
      }
      if (globalStatusFilter !== 'all' && item.status.toLowerCase() !== globalStatusFilter.toLowerCase()) {
        return false;
      }
      if (globalQuery.trim()) {
        const q = globalQuery.trim().toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.contact.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.area.toLowerCase().includes(q) ||
          item.meta.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [riders, passengers, jobs, stations, centres, stages, globalCategoryFilter, globalLocationFilter, globalStatusFilter, globalQuery]);

  // Duplicate phone audit across riders + passengers
  const duplicatePhoneWarnings = useMemo(() => {
    const map = new Map<string, string[]>();
    const normalize = (p: string) => p.replace(/[^0-9]/g, '').slice(-9);
    riders.forEach((r) => {
      const k = normalize(r.phone);
      if (k) map.set(k, [...(map.get(k) || []), `Rider: ${r.fullName} (${r.riderIdNumber})`]);
    });
    passengers.forEach((p) => {
      const k = normalize(p.phone);
      if (k) map.set(k, [...(map.get(k) || []), `Passenger: ${p.fullName} (${p.passengerIdNumber || p.id})`]);
    });
    return Array.from(map.entries()).filter(([, refs]) => refs.length > 1);
  }, [riders, passengers]);

  const filterLocAndStatus = (area: string, status: string, searchBlob: string) => {
    const q = categoryQuery.trim().toLowerCase();
    const matchQ = !q || searchBlob.toLowerCase().includes(q);
    const matchStatus = categoryStatusFilter === 'all' || status.toLowerCase() === categoryStatusFilter.toLowerCase();
    const matchLoc = categoryLocationFilter === 'all' || area.toLowerCase().includes(categoryLocationFilter.toLowerCase());
    return matchQ && matchStatus && matchLoc;
  };

  return (
    <div className="space-y-5">
      {/* Top Operator & SQLite Backend Status Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-amber-400 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                Centralised Admin Registration &amp; Management System
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  backendOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {backendOnline ? '● SQLite DB Connected' : '○ API Unreachable (Static Mode)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Single source of truth for Riders, Passengers, Jobs, Swap Stations, Maintenance Centres &amp; Boda Stages.
            </p>
          </div>
        </div>

        {/* Active Admin Operator RBAC Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-500 font-semibold">Operator:</span>
            <select
              value={activeAdminId}
              onChange={(e) => setActiveAdminId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {admins.length > 0 ? (
                admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName} ({a.role.replace('_', ' ')})
                  </option>
                ))
              ) : (
                <option value="admin-founder-mukisa">Brian Mukisa (super admin)</option>
              )}
            </select>
          </div>

          <button
            onClick={loadBootstrap}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync DB</span>
          </button>
        </div>
      </div>

      {!backendOnline && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Server API unreachable:</strong> Central SQLite persistence, SMS, WhatsApp, and RBAC enforcement require the Node Express server (<code>server.ts</code>). Local browser caches are read-only fallback previews and are not a substitute for the production SQLite database.
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : toast.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* Sub-Navigation Pills */}
      <div className="flex flex-wrap gap-1.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm text-xs">
        {[
          { id: 'analytics', label: 'Analytics & Locations', icon: LayoutDashboard },
          { id: 'search_export', label: 'Global Search & Export', icon: Search },
          { id: 'riders', label: `Riders (${riders.length})`, icon: Bike },
          { id: 'passengers', label: `Passengers (${passengers.length})`, icon: UserCheck },
          { id: 'jobs', label: `Jobs (${jobs.length})`, icon: Briefcase },
          { id: 'stations', label: `Swap Stations (${stations.length})`, icon: Zap },
          { id: 'centres', label: `Garages & Centres (${centres.length})`, icon: Wrench },
          { id: 'stages', label: `Boda Stages (${stages.length})`, icon: MapPin },
          { id: 'messaging_ussd', label: 'Announcements, SMS, WhatsApp & USSD', icon: Send },
          { id: 'security_audit', label: `Admin Security & Audit (${admins.length})`, icon: Shield },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id as RegistryTab);
                setCategoryQuery('');
                setCategoryStatusFilter('all');
                setCategoryLocationFilter('all');
              }}
              className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                active ? 'bg-[#0B192C] text-amber-400 shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: DASHBOARD ANALYTICS & LOCATION BREAKDOWN                     */}
      {/* =================================================================== */}
      {tab === 'analytics' && analytics && (
        <div className="space-y-5">
          {/* 6 Category KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Boda Riders', total: analytics.totals.riders, sub: `${analytics.ridersByStatus.active} Active · ${analytics.ridersByStatus.suspended} Suspended`, tab: 'riders' as RegistryTab, accent: 'border-amber-300 bg-amber-50/40' },
              { label: 'Passengers', total: analytics.totals.passengers, sub: `${analytics.passengersByStatus.active} Active · ${analytics.passengersByStatus.assistedOrButtonPhone} Button-Phone`, tab: 'passengers' as RegistryTab, accent: 'border-emerald-300 bg-emerald-50/40' },
              { label: 'Jobs Listed', total: analytics.totals.jobs, sub: `${analytics.jobsByStatus.open} Open · ${analytics.jobsByStatus.pendingApproval} Pending`, tab: 'jobs' as RegistryTab, accent: 'border-sky-300 bg-sky-50/40' },
              { label: 'Swap Stations', total: analytics.totals.stations, sub: `${analytics.stationsByStatus.operational} Operational`, tab: 'stations' as RegistryTab, accent: 'border-yellow-300 bg-yellow-50/40' },
              { label: 'Maintenance', total: analytics.totals.centres, sub: `${analytics.centresByStatus.verified} Verified Garages`, tab: 'centres' as RegistryTab, accent: 'border-teal-300 bg-teal-50/40' },
              { label: 'Boda Stages', total: analytics.totals.stages, sub: `${analytics.stagesByStatus.active} Active Stages`, tab: 'stages' as RegistryTab, accent: 'border-indigo-300 bg-indigo-50/40' },
            ].map((card) => (
              <button
                key={card.label}
                onClick={() => setTab(card.tab)}
                className={`p-4 rounded-2xl border text-left hover:shadow-md transition-shadow cursor-pointer bg-white ${card.accent}`}
              >
                <p className="text-[11px] font-bold text-slate-500 uppercase">{card.label}</p>
                <p className="text-2xl font-black text-slate-900 font-mono mt-1">{card.total}</p>
                <p className="text-[11px] text-slate-600 mt-1">{card.sub}</p>
              </button>
            ))}
          </div>

          {/* Fleet & Device Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs">
              <h4 className="font-bold text-slate-900">Rider Fleet Powertrain &amp; Verification</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-600">Electric Bodas (EV):</span><strong className="font-mono">{analytics.ridersByStatus.electric}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Petrol Motorcycles:</span><strong className="font-mono">{analytics.ridersByStatus.petrol}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Verified KYC Riders:</span><strong className="font-mono text-emerald-700">{analytics.ridersByStatus.verified}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Pending / Under Review:</span><strong className="font-mono text-amber-700">{analytics.ridersByStatus.pendingVerification}</strong></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs">
              <h4 className="font-bold text-slate-900">Smartphone vs Button-Phone Inclusivity</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-600">Smartphone Riders:</span><strong className="font-mono">{analytics.ridersByStatus.smartphone}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Button-Phone Riders (SMS/USSD):</span><strong className="font-mono text-indigo-700">{analytics.ridersByStatus.featurePhone}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Assisted / Button-Phone Passengers:</span><strong className="font-mono text-indigo-700">{analytics.passengersByStatus.assistedOrButtonPhone}</strong></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs">
              <h4 className="font-bold text-slate-900">Infrastructure Health</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-600">Stations Operational:</span><strong className="font-mono text-emerald-700">{analytics.stationsByStatus.operational}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Stations Temporarily Closed / Down:</span><strong className="font-mono text-rose-700">{analytics.stationsByStatus.temporarilyClosed + analytics.stationsByStatus.unavailable}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Garages Pending Verification:</span><strong className="font-mono text-amber-700">{analytics.centresByStatus.pendingVerification}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Stages Suspended / Closed:</span><strong className="font-mono text-rose-700">{analytics.stagesByStatus.suspended + analytics.stagesByStatus.closed}</strong></div>
              </div>
            </div>
          </div>

          {/* Location Breakdown Table (Kikyusa, Luweero, Kasana, Wobulenzi, Bamunanika, National) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Luweero District &amp; National Coverage Breakdown</h4>
                <p className="text-xs text-slate-500">Live counts calculated directly from SQLite records across priority service zones.</p>
              </div>
              <button
                onClick={() => handleExportDownload('all', 'csv')}
                className="px-3 py-1.5 bg-[#0B192C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Full Registry CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                    <th className="py-2.5 px-3">Operational Area / Sub-County</th>
                    <th className="py-2.5 px-3">District</th>
                    <th className="py-2.5 px-3">Riders</th>
                    <th className="py-2.5 px-3">Passengers</th>
                    <th className="py-2.5 px-3">Boda Stages</th>
                    <th className="py-2.5 px-3">Swap Stations</th>
                    <th className="py-2.5 px-3">Garages</th>
                    <th className="py-2.5 px-3">Jobs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.locationBreakdown.map((loc) => (
                    <tr key={loc.area} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{loc.area}</td>
                      <td className="py-2.5 px-3 text-slate-600">{loc.district}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{loc.riders}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{loc.passengers}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{loc.stages}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{loc.stations}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{loc.centres}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{loc.jobs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: UNIFIED GLOBAL SEARCH, DUPLICATE CHECK & EXPORTS             */}
      {/* =================================================================== */}
      {tab === 'search_export' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Cross-Category Database Search &amp; Data Export</h4>
              <p className="text-xs text-slate-500">
                Search across Riders, Passengers, Jobs, Battery Swap Stations, Garages, and Stages by Name, Phone, Location, or Unique ID.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleExportDownload(globalCategoryFilter, 'csv')} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button onClick={() => handleExportDownload(globalCategoryFilter, 'json')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {duplicatePhoneWarnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950">
              <strong>Cross-Role Shared Phone Check:</strong> {duplicatePhoneWarnings.length} phone number(s) appear in both Rider and Passenger registries ({duplicatePhoneWarnings.map(([k, refs]) => `${k}: ${refs.join(' & ')}`).join('; ')}). Strict unique constraints block duplicate phone/plate/NIN creation inside each registry.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="relative md:col-span-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder="Search name, +256 phone, Kikyusa, BCU-RDR..., UFG 421K..."
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
            <select value={globalCategoryFilter} onChange={(e) => setGlobalCategoryFilter(e.target.value as 'all' | AdminCategory)} className="p-2 border border-slate-300 rounded-xl bg-white">
              <option value="all">All 6 Categories ({unifiedRecords.length})</option>
              <option value="riders">Boda Riders</option>
              <option value="passengers">Passengers</option>
              <option value="jobs">Jobs</option>
              <option value="stations">Swap Stations</option>
              <option value="centres">Maintenance Centres</option>
              <option value="stages">Boda Stages</option>
            </select>
            <select value={globalLocationFilter} onChange={(e) => setGlobalLocationFilter(e.target.value)} className="p-2 border border-slate-300 rounded-xl bg-white">
              <option value="all">All Locations</option>
              <option value="Kikyusa">Kikyusa</option>
              <option value="Luweero">Luweero Town Council</option>
              <option value="Kasana">Kasana</option>
              <option value="Wobulenzi">Wobulenzi</option>
              <option value="Bamunanika">Bamunanika</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Unique ID</th>
                  <th className="py-2.5 px-3">Name / Title</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unifiedRecords.map((item) => (
                  <tr key={`${item.category}-${item.id}`} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold uppercase text-[10px] text-indigo-700">{item.category}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-800">{item.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-3 text-slate-700">{item.contact}</td>
                    <td className="py-2.5 px-3 text-slate-600">{item.area || item.district}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] uppercase">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{item.meta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: RIDER MANAGEMENT                                             */}
      {/* =================================================================== */}
      {tab === 'riders' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Boda-Boda Riders Management</h4>
              <p className="text-xs text-slate-500">Register smartphone &amp; button-phone riders, assign stages, verify KYC, or suspend accounts.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleExportDownload('riders', 'csv')} className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer">
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              {hasPerm('manageRiders') && (
                <button
                  onClick={() => setRiderModal({ open: true, item: null })}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Rider</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <input value={categoryQuery} onChange={(e) => setCategoryQuery(e.target.value)} placeholder="Search rider name, phone, NIN, plate, BCU ID..." className="flex-1 min-w-[200px] p-2 border border-slate-300 rounded-xl" />
            <select value={categoryLocationFilter} onChange={(e) => setCategoryLocationFilter(e.target.value)} className="p-2 border border-slate-300 rounded-xl bg-white">
              <option value="all">All Locations</option>
              <option value="Kikyusa">Kikyusa</option>
              <option value="Luweero">Luweero</option>
              <option value="Kasana">Kasana</option>
              <option value="Wobulenzi">Wobulenzi</option>
            </select>
            <select value={categoryStatusFilter} onChange={(e) => setCategoryStatusFilter(e.target.value)} className="p-2 border border-slate-300 rounded-xl bg-white">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3">Rider &amp; ID</th>
                  <th className="py-2.5 px-3">Contact &amp; Device</th>
                  <th className="py-2.5 px-3">Bike &amp; Plate</th>
                  <th className="py-2.5 px-3">Stage &amp; Location</th>
                  <th className="py-2.5 px-3">Verification / Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riders
                  .filter((r) =>
                    filterLocAndStatus(
                      `${r.subCounty} ${r.village} ${r.residentialArea}`,
                      r.accountStatus || 'active',
                      `${r.fullName} ${r.phone} ${r.riderIdNumber} ${r.motorcycleReg} ${r.nin} ${r.stageName}`
                    )
                  )
                  .map((r) => {
                    const status = r.accountStatus || 'active';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{r.fullName}</p>
                          <p className="font-mono text-[10px] text-slate-500">{r.riderIdNumber}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-mono text-slate-800">{r.phone}</p>
                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${r.phoneType === 'feature_phone' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>
                            {r.phoneType === 'feature_phone' ? 'Button Phone (SMS/USSD)' : 'Smartphone'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-mono font-bold text-slate-900">{r.motorcycleReg}</p>
                          <p className="text-[11px] text-slate-600">{r.motorcycleType === 'electric' ? '⚡ Electric' : 'Petrol'} · {r.motorcycleMakeModel}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-800">{r.stageName}</p>
                          <p className="text-[11px] text-slate-500">{r.village ? `${r.village}, ` : ''}{r.subCounty}</p>
                        </td>
                        <td className="py-2.5 px-3 space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            KYC: {r.verificationStatus}
                          </span>
                          <span className={`block w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status === 'active' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'}`}>
                            Acct: {status}
                          </span>
                          {r.registrationDate && (
                            <span className="block text-[10px] font-mono text-slate-400">
                              Reg: {r.registrationDate}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() =>
                              setInspectProfile({
                                title: `Rider Dossier — ${r.fullName}`,
                                fields: [
                                  { label: 'Unique Rider ID', value: r.riderIdNumber },
                                  { label: 'Phone / WhatsApp', value: `${r.phone} / ${r.whatsappNumber || 'None'}` },
                                  { label: 'Device Type', value: r.phoneType === 'feature_phone' ? 'Button Phone (SMS/USSD)' : 'Smartphone' },
                                  { label: 'Stage Assigned', value: r.stageName },
                                  { label: 'Location', value: `${r.village || ''} ${r.subCounty}, ${r.district || 'Luweero'}` },
                                  { label: 'Motorcycle', value: `${r.motorcycleReg} (${r.motorcycleType.toUpperCase()}) — ${r.motorcycleMakeModel}` },
                                  { label: 'NIN / Driving Permit', value: `${r.nin || 'N/A'} / ${r.permitNumber || 'N/A'}` },
                                  { label: 'Emergency Next of Kin', value: `${r.emergencyContactName} (${r.emergencyContactPhone})` },
                                  { label: 'Registered / Last Updated', value: `${r.registrationDate} / ${r.updatedAt || '—'}` },
                                ],
                              })
                            }
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                            title="View Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {hasPerm('manageRiders') && (
                            <>
                              <button onClick={() => setRiderModal({ open: true, item: r })} className="p-1.5 bg-sky-50 hover:bg-sky-100 rounded-lg text-sky-800 cursor-pointer" title="Edit Rider">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  const nextStatus = status === 'active' ? 'suspended' : 'active';
                                  await handleSaveRider({ ...r, accountStatus: nextStatus, verificationStatus: nextStatus === 'suspended' ? 'suspended' : 'verified' }, []);
                                }}
                                className={`p-1.5 rounded-lg cursor-pointer ${status === 'active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-800' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'}`}
                                title={status === 'active' ? 'Suspend Account' : 'Activate Account'}
                              >
                                {status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}
                          {hasPerm('deleteRecords') && (
                            <button
                              onClick={() => setDeleteConfirm({ category: 'riders', id: r.id, name: r.fullName })}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-700 cursor-pointer"
                              title="Delete Rider"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: PASSENGER MANAGEMENT                                         */}
      {/* =================================================================== */}
      {tab === 'passengers' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Passengers &amp; Assisted Members Management</h4>
              <p className="text-xs text-slate-500">Manually register passengers (including non-smartphone customers), update details, or suspend accounts.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleExportDownload('passengers', 'csv')} className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer">
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              {hasPerm('managePassengers') && (
                <button
                  onClick={() => setPassengerModal({ open: true, item: null })}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Passenger</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <input value={categoryQuery} onChange={(e) => setCategoryQuery(e.target.value)} placeholder="Search passenger name, phone, BCU-PAS ID..." className="flex-1 min-w-[200px] p-2 border border-slate-300 rounded-xl" />
            <select value={categoryStatusFilter} onChange={(e) => setCategoryStatusFilter(e.target.value)} className="p-2 border border-slate-300 rounded-xl bg-white">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3">Passenger &amp; ID</th>
                  <th className="py-2.5 px-3">Contact &amp; Access</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Trusted Next-of-Kin</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {passengers
                  .filter((p) =>
                    filterLocAndStatus(
                      `${p.subCounty} ${p.village} ${p.district}`,
                      p.accountStatus || 'active',
                      `${p.fullName} ${p.phone} ${p.passengerIdNumber} ${p.residentialArea}`
                    )
                  )
                  .map((p) => {
                    const st = p.accountStatus || 'active';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{p.fullName}</p>
                          <p className="font-mono text-[10px] text-slate-500">{p.passengerIdNumber || p.id}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-mono text-slate-800">{p.phone}</p>
                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${p.phoneType === 'feature_phone' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>
                            {p.phoneType === 'feature_phone' ? 'Button Phone' : 'Smartphone'}{p.assistedRegistration ? ' · Assisted' : ''}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {p.village ? `${p.village}, ` : ''}{p.subCounty || ''}, {p.district || 'Luweero'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {p.trustedContactName} ({p.trustedContactPhone})
                        </td>
                        <td className="py-2.5 px-3 space-y-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${st === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {st}
                          </span>
                          {p.createdAt && (
                            <span className="block text-[10px] font-mono text-slate-400">
                              Reg: {new Date(p.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                          {hasPerm('managePassengers') && (
                            <>
                              <button onClick={() => setPassengerModal({ open: true, item: p })} className="p-1.5 bg-sky-50 hover:bg-sky-100 rounded-lg text-sky-800 cursor-pointer" title="Edit Passenger">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSavePassenger({ ...p, accountStatus: st === 'active' ? 'suspended' : 'active' }, [])}
                                className={`p-1.5 rounded-lg cursor-pointer ${st === 'active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-800' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'}`}
                                title={st === 'active' ? 'Suspend' : 'Activate'}
                              >
                                {st === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}
                          {hasPerm('deleteRecords') && (
                            <button onClick={() => setDeleteConfirm({ category: 'passengers', id: p.id, name: p.fullName })} className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-700 cursor-pointer" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: JOB MANAGEMENT                                               */}
      {/* =================================================================== */}
      {tab === 'jobs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Boda Employment &amp; Delivery Jobs Registry</h4>
              <p className="text-xs text-slate-500">Create, approve, edit, suspend, or remove jobs; use Bulk SMS Hub to alert riders.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onOpenBulkJobSms && (
                <button onClick={onOpenBulkJobSms} className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <Send className="w-3.5 h-3.5" />
                  <span>Open Bulk Job SMS Hub</span>
                </button>
              )}
              {hasPerm('manageJobs') && (
                <button onClick={() => setJobModal({ open: true, item: null })} className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Verified Job</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3">Job &amp; ID</th>
                  <th className="py-2.5 px-3">Employer</th>
                  <th className="py-2.5 px-3">Area &amp; Route</th>
                  <th className="py-2.5 px-3">Pay &amp; Deadline</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900">{j.title}</p>
                      <p className="font-mono text-[10px] text-slate-500">{j.jobCode || j.id} · {j.type.replace('_', ' ')}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-800">{j.employerCompany}</p>
                      <p className="font-mono text-[11px] text-slate-500">{j.employerPhone}</p>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <p>{j.village ? `${j.village}, ` : ''}{j.subCounty}</p>
                      <p className="text-[10px] text-slate-500">{j.pickupLocation} → {j.deliveryLocation}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-mono font-bold text-[#0B192C]">{formatUgx(j.paymentAmountUgx)}</p>
                      <p className="text-[10px] text-slate-500">Due {j.deadline}</p>
                    </td>
                    <td className="py-2.5 px-3 space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${j.adminApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {j.adminApproved ? 'Approved' : 'Unverified'}
                      </span>
                      <span className="block w-fit px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold uppercase">
                        {j.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                      {hasPerm('manageJobs') && (
                        <>
                          <button onClick={() => setJobModal({ open: true, item: j })} className="p-1.5 bg-sky-50 hover:bg-sky-100 rounded-lg text-sky-800 cursor-pointer" title="Edit Job">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSaveJob({ ...j, adminApproved: !j.adminApproved })}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-800 cursor-pointer"
                            title="Toggle Approval"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {hasPerm('deleteRecords') && (
                        <button onClick={() => setDeleteConfirm({ category: 'jobs', id: j.id, name: j.title })} className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-700 cursor-pointer" title="Delete Job">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: ELECTRIC BATTERY SWAP STATIONS                               */}
      {/* =================================================================== */}
      {tab === 'stations' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Electric Battery Swap &amp; Charging Stations</h4>
              <p className="text-xs text-slate-500">Manage station GPS, battery inventory, operating hours, supported packs, and operational availability.</p>
            </div>
            {hasPerm('manageStations') && (
              <button onClick={() => setStationModal({ open: true, item: null })} className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Swap Station</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stations.map((st) => (
              <div key={st.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-500">{st.stationCode || st.id}</span>
                    <h5 className="text-sm font-bold text-slate-900">{st.name}</h5>
                    <p className="text-slate-600">{st.locationName} · {st.subCounty}</p>
                    <p className="text-[10px] font-mono text-slate-500">GPS: {st.lat}, {st.lng}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                      st.status === 'operational' || st.status === 'open'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {st.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center bg-white p-2 rounded-lg border border-slate-200">
                  <div><span className="block text-[10px] text-slate-400">Ready</span><strong className="font-mono text-emerald-700">{st.availableBatteries}/{st.totalBatteries}</strong></div>
                  <div><span className="block text-[10px] text-slate-400">Swap Fee</span><strong className="font-mono">{formatUgx(st.swapFeeUgx)}</strong></div>
                  <div><span className="block text-[10px] text-slate-400">Service</span><strong className="capitalize">{st.servicesOffered || 'both'}</strong></div>
                </div>

                <p className="text-slate-600">
                  <strong>Operator:</strong> {st.operatorName} ({st.operatorPhone}) · <strong>Hours:</strong> {st.operatingHours}
                </p>
                <p className="text-slate-600">
                  <strong>Supported Packs:</strong> {(st.supportedBatteryTypes || [st.batteryBrand]).join(', ')}
                </p>
                {st.lastStockUpdate && (
                  <p className="text-[10px] font-mono text-slate-400">
                    Updated: {new Date(st.lastStockUpdate).toLocaleDateString()}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-1.5 pt-2 border-t border-slate-200">
                  {hasPerm('manageStations') && (
                    <>
                      <button onClick={() => setStationModal({ open: true, item: st })} className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-lg font-bold cursor-pointer">
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          handleSaveStation({
                            ...st,
                            status: st.status === 'operational' || st.status === 'open' ? 'temporarily_closed' : 'operational',
                          })
                        }
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold cursor-pointer"
                      >
                        {st.status === 'operational' || st.status === 'open' ? 'Mark Closed' : 'Set Operational'}
                      </button>
                    </>
                  )}
                  {hasPerm('deleteRecords') && (
                    <button onClick={() => setDeleteConfirm({ category: 'stations', id: st.id, name: st.name })} className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-bold cursor-pointer">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 7: MAINTENANCE CENTRES & GARAGES                                */}
      {/* =================================================================== */}
      {tab === 'centres' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Motorcycle Garages &amp; Maintenance Centres</h4>
              <p className="text-xs text-slate-500">Manage partner garages, supported petrol/electric bikes, services, verification, and suspension controls.</p>
            </div>
            {hasPerm('manageCentres') && (
              <button onClick={() => setCentreModal({ open: true, item: null })} className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Maintenance Centre</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {centres.map((c) => {
              const st = c.accountStatus || 'active';
              return (
                <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-slate-500">{c.centreCode || c.id}</span>
                      <h5 className="text-sm font-bold text-slate-900">{c.name}</h5>
                      <p className="text-slate-600">{c.location} ({c.subCounty})</p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className={`block px-2 py-0.5 rounded font-bold text-[10px] uppercase ${c.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {c.verified ? 'Verified' : 'Unverified'}
                      </span>
                      <span className={`block px-2 py-0.5 rounded font-bold text-[10px] uppercase ${st === 'active' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'}`}>
                        {st}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600"><strong>Contact:</strong> {c.ownerName} ({c.phone}) · <strong>Hours:</strong> {c.operatingHours}</p>
                  <p className="text-slate-600"><strong>Bikes Serviced:</strong> <span className="uppercase font-bold">{c.bikeTypesServiced || 'both'}</span> · Brands: {(c.brandsServiced || []).join(', ') || 'All'}</p>
                  <p className="text-slate-600"><strong>Services:</strong> {c.servicesSummary || c.services.map((s) => s.name).join(', ')}</p>

                  <div className="flex flex-wrap justify-end gap-1.5 pt-2 border-t border-slate-200">
                    {hasPerm('manageCentres') && (
                      <>
                        <button onClick={() => setCentreModal({ open: true, item: c })} className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-lg font-bold cursor-pointer">
                          Edit
                        </button>
                        <button onClick={() => handleSaveCentre({ ...c, verified: !c.verified })} className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg font-bold cursor-pointer">
                          {c.verified ? 'Unverify' : 'Verify'}
                        </button>
                        <button
                          onClick={() => handleSaveCentre({ ...c, accountStatus: st === 'active' ? 'suspended' : 'active' })}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold cursor-pointer"
                        >
                          {st === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </>
                    )}
                    {hasPerm('deleteRecords') && (
                      <button onClick={() => setDeleteConfirm({ category: 'centres', id: c.id, name: c.name })} className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-bold cursor-pointer">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 8: BODA STAGES NETWORK & RIDER TRANSFERS                        */}
      {/* =================================================================== */}
      {tab === 'stages' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Boda-Boda Stages Network &amp; Transfers</h4>
              <p className="text-xs text-slate-500">Manage official boda stages, view assigned riders, transfer riders across stages, or update operating status.</p>
            </div>
            {hasPerm('manageStages') && (
              <button onClick={() => setStageModal({ open: true, item: null })} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                <span>Register New Stage</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stages.map((st) => {
              const assignedCount = riders.filter((r) => r.stageId === st.id).length;
              const status = st.operatingStatus || 'active';
              return (
                <div key={st.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-slate-500">{st.stageCode || st.id}</span>
                      <h5 className="text-sm font-bold text-slate-900">{st.name}</h5>
                      <p className="text-slate-600">{st.village ? `${st.village}, ` : ''}{st.subCounty}, {st.district}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {status}
                    </span>
                  </div>
                  <p className="text-slate-600"><strong>Chairman:</strong> {st.leaderName} ({st.leaderPhone})</p>
                  <p className="text-slate-600"><strong>Landmark:</strong> {st.landmark} · GPS ({st.lat}, {st.lng})</p>
                  <p className="text-slate-700 font-semibold">
                    {assignedCount} Individual Riders Linked · {st.memberCount} Roster Members · Welfare {formatUgx(st.dailyWelfareFeeUgx)}/day
                  </p>
                  {st.createdAt && (
                    <p className="text-[10px] font-mono text-slate-400">
                      Registered: {new Date(st.createdAt).toLocaleDateString()}
                    </p>
                  )}

                  <div className="flex flex-wrap justify-end gap-1.5 pt-2 border-t border-slate-200">
                    <button onClick={() => setInspectStage(st)} className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-lg font-bold flex items-center gap-1 cursor-pointer">
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>View &amp; Transfer Riders</span>
                    </button>
                    {hasPerm('manageStages') && (
                      <>
                        <button onClick={() => setStageModal({ open: true, item: st })} className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-lg font-bold cursor-pointer">
                          Edit
                        </button>
                        <button
                          onClick={() => handleSaveStage({ ...st, operatingStatus: status === 'active' ? 'suspended' : 'active' })}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold cursor-pointer"
                        >
                          {status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </>
                    )}
                    {hasPerm('deleteRecords') && (
                      <button onClick={() => setDeleteConfirm({ category: 'stages', id: st.id, name: st.name })} className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-bold cursor-pointer">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 9: GENUINE ANNOUNCEMENTS, GATEWAY DIAGNOSTICS & USSD FOUNDATION */}
      {/* =================================================================== */}
      {tab === 'messaging_ussd' && (
        <div className="space-y-5">
          {/* Honest Telecom Gateway Diagnostics */}
          {gatewayStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className={`p-4 rounded-2xl border ${gatewayStatus.sms.configured ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> SMS Gateway (Africa's Talking)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${gatewayStatus.sms.configured ? 'bg-emerald-600 text-white' : 'bg-amber-200 text-amber-950'}`}>
                    {gatewayStatus.sms.configured ? gatewayStatus.sms.environment : 'Not Configured'}
                  </span>
                </div>
                {gatewayStatus.sms.balanceText && <p className="mt-1 font-mono font-bold text-emerald-800">Wallet: {gatewayStatus.sms.balanceText}</p>}
                {gatewayStatus.sms.requirementsMissing.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[11px] text-amber-950 list-disc pl-4">
                    {gatewayStatus.sms.requirementsMissing.map((m, idx) => <li key={idx}>{m}</li>)}
                  </ul>
                )}
              </div>

              <div className={`p-4 rounded-2xl border ${gatewayStatus.whatsapp.configured ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="flex items-center gap-1.5"><Server className="w-4 h-4" /> Meta WhatsApp Cloud API</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${gatewayStatus.whatsapp.configured ? 'bg-emerald-600 text-white' : 'bg-amber-200 text-amber-950'}`}>
                    {gatewayStatus.whatsapp.configured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
                {gatewayStatus.whatsapp.requirementsMissing.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[11px] text-amber-950 list-disc pl-4">
                    {gatewayStatus.whatsapp.requirementsMissing.map((m, idx) => <li key={idx}>{m}</li>)}
                  </ul>
                )}
              </div>

              <div className={`p-4 rounded-2xl border ${gatewayStatus.ussd.configured ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-300'}`}>
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="flex items-center gap-1.5"><Radio className="w-4 h-4" /> Non-Smartphone USSD Menu</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${gatewayStatus.ussd.configured ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800'}`}>
                    {gatewayStatus.ussd.configured ? gatewayStatus.ussd.serviceCode : 'Callback Ready'}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-600">Endpoint: {gatewayStatus.ussd.callbackPath}</p>
                {gatewayStatus.ussd.requirementsMissing.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[11px] text-slate-700 list-disc pl-4">
                    {gatewayStatus.ussd.requirementsMissing.map((m, idx) => <li key={idx}>{m}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Targeted Announcement Composer + Live USSD Callback Verifier */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <form onSubmit={handleSendAnnouncement} className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
              <h4 className="text-sm font-bold text-slate-900">Send Targeted Registration / Platform Announcement</h4>
              <p className="text-slate-500">Every SMS/WhatsApp dispatch calls real external APIs and logs per-recipient delivery outcomes in SQLite.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Recipient Group</label>
                  <select value={annTargetGroup} onChange={(e) => setAnnTargetGroup(e.target.value as typeof annTargetGroup)} className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold">
                    <option value="riders">Registered Riders (All or Selected)</option>
                    <option value="passengers">Registered Passengers (All or Selected)</option>
                    <option value="stage_riders">Riders in Selected Stage</option>
                    <option value="location">Members in Selected Location</option>
                    <option value="all_members">All Registered Riders &amp; Passengers</option>
                  </select>
                </div>

                {annTargetGroup === 'stage_riders' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Select Stage</label>
                    <select value={annStageId} onChange={(e) => setAnnStageId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                      {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {annTargetGroup === 'location' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Location / Sub-County</label>
                    <input value={annLocation} onChange={(e) => setAnnLocation(e.target.value)} placeholder="e.g. Kikyusa" className="w-full p-2 border border-slate-300 rounded-lg" />
                  </div>
                )}

                {(annTargetGroup === 'riders' || annTargetGroup === 'passengers') && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Filter Specific Recipients (leave empty for all)</label>
                    <select
                      multiple
                      value={annSelectedIds}
                      onChange={(e) => setAnnSelectedIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                      className="w-full p-1.5 border border-slate-300 rounded-lg h-20"
                    >
                      {(annTargetGroup === 'riders' ? riders : passengers).map((m) => (
                        <option key={m.id} value={m.id}>{m.fullName} ({m.phone})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Channels</label>
                <div className="flex flex-wrap gap-4">
                  {(['in_app', 'sms', 'whatsapp'] as const).map((ch) => (
                    <label key={ch} className="flex items-center gap-1.5 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={annChannels.includes(ch)}
                        onChange={(e) => {
                          if (e.target.checked) setAnnChannels([...annChannels, ch]);
                          else setAnnChannels(annChannels.filter((x) => x !== ch));
                        }}
                      />
                      <span>{ch === 'in_app' ? 'In-App Notification' : ch === 'sms' ? "SMS (Africa's Talking)" : 'WhatsApp Cloud API'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title</label>
                <input required value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Announcement Message *</label>
                <textarea required rows={3} value={annMessage} onChange={(e) => setAnnMessage(e.target.value)} placeholder="Type official announcement for riders or passengers..." className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>

              <button
                type="submit"
                disabled={annSending || !hasPerm('sendNotifications')}
                className="px-5 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{annSending ? 'Dispatching...' : 'Dispatch Multi-Channel Announcement'}</span>
              </button>
            </form>

            {/* Interactive USSD Backend Callback Probe */}
            <form onSubmit={handleProbeUssd} className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Non-Smartphone USSD Backend Verification</span>
              </h4>
              <p className="text-slate-500">
                Tests the live <code>POST /api/ussd/callback</code> webhook directly against SQLite for button-phone members. Shortcode remains unprovisioned externally until <code>USSD_SERVICE_CODE</code> is registered with UCC/MTN/Airtel.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Member MSISDN</label>
                  <input value={ussdPhone} onChange={(e) => setUssdPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Menu Input (&quot;&quot;, 1, 2, 3, 4)</label>
                  <input value={ussdInput} onChange={(e) => setUssdInput(e.target.value)} placeholder="Leave blank for main menu" className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
                </div>
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer">
                Invoke Real /api/ussd/callback
              </button>
              {ussdOutput && (
                <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl whitespace-pre-wrap">
                  {ussdOutput}
                </pre>
              )}
            </form>
          </div>

          {/* Delivery Audit Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Multi-Channel Notification Delivery Log (SQLite)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Channel</th>
                    <th className="py-2 px-3">Recipient</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Provider / Diagnostic Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryLogs.length === 0 ? (
                    <tr><td colSpan={5} className="py-4 text-center text-slate-400">No announcements or registration confirmations logged yet.</td></tr>
                  ) : (
                    deliveryLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="py-2 px-3 font-bold uppercase">{log.channel}</td>
                        <td className="py-2 px-3">{log.recipientName} ({log.recipientPhone})</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.status === 'in_app_delivered' || log.status === 'sent' || log.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'blocked_unconfigured'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{log.errorReason || log.providerMessageId || log.provider}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 10: RBAC ADMIN ACCOUNTS & SECURITY AUDIT LOG                    */}
      {/* =================================================================== */}
      {tab === 'security_audit' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Administrator Role-Based Access Control (RBAC)</h4>
                <p className="text-xs text-slate-500">Super Admin holds unrestricted authority; create or suspend Restricted Admins with granular permissions enforced on every API route.</p>
              </div>
              {hasPerm('manageAdmins') && (
                <button onClick={() => setAdminModal({ open: true, item: null })} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Restricted Admin</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {admins.map((adm) => (
                <div key={adm.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-slate-500">{adm.adminCode}</span>
                      <h5 className="text-sm font-bold text-slate-900">{adm.fullName}</h5>
                      <p className="text-slate-600">{adm.email} · {adm.phone}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className={`block px-2 py-0.5 rounded font-bold text-[10px] uppercase ${adm.role === 'super_admin' ? 'bg-amber-400 text-slate-950' : 'bg-indigo-100 text-indigo-800'}`}>
                        {adm.role.replace('_', ' ')}
                      </span>
                      <span className={`block px-2 py-0.5 rounded font-bold text-[10px] uppercase ${adm.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {adm.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(adm.permissions)
                      .filter(([, allowed]) => allowed)
                      .map(([k]) => (
                        <span key={k} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-700 font-medium">
                          {k}
                        </span>
                      ))}
                  </div>
                  {hasPerm('manageAdmins') && adm.id !== 'admin-founder-mukisa' && (
                    <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-200">
                      <button onClick={() => setAdminModal({ open: true, item: adm })} className="px-2.5 py-1 bg-sky-100 text-sky-900 rounded-lg font-bold cursor-pointer">
                        Edit Permissions
                      </button>
                      <button onClick={() => setDeleteConfirm({ category: 'admins', id: adm.id, name: adm.fullName })} className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold cursor-pointer">
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>Immutable Admin Security &amp; Database Audit Trail</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Actor</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Target</th>
                    <th className="py-2 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className={log.action.includes('BLOCKED') || log.action.includes('DENIED') ? 'bg-rose-50/60' : ''}>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{log.actorName} ({log.actorRole})</td>
                      <td className="py-2 px-3 font-mono font-bold text-[11px] text-slate-900">{log.action}</td>
                      <td className="py-2 px-3 text-slate-700">{log.target}</td>
                      <td className="py-2 px-3 text-slate-600">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALS                                                              */}
      {/* =================================================================== */}
      {riderModal.open && (
        <RiderFormModal
          initial={riderModal.item}
          stages={stages}
          onSave={handleSaveRider}
          onClose={() => setRiderModal({ open: false })}
        />
      )}
      {passengerModal.open && (
        <PassengerFormModal
          initial={passengerModal.item}
          onSave={handleSavePassenger}
          onClose={() => setPassengerModal({ open: false })}
        />
      )}
      {jobModal.open && (
        <QuickJobModal
          initial={jobModal.item}
          onSave={handleSaveJob}
          onClose={() => setJobModal({ open: false })}
        />
      )}
      {stationModal.open && (
        <StationFormModal
          initial={stationModal.item}
          onSave={handleSaveStation}
          onClose={() => setStationModal({ open: false })}
        />
      )}
      {centreModal.open && (
        <MaintenanceCentreFormModal
          initial={centreModal.item}
          onSave={handleSaveCentre}
          onClose={() => setCentreModal({ open: false })}
        />
      )}
      {stageModal.open && (
        <StageFormModal
          initial={stageModal.item}
          onSave={handleSaveStage}
          onClose={() => setStageModal({ open: false })}
        />
      )}
      {adminModal.open && (
        <AdminAccountFormModal
          initial={adminModal.item}
          onSave={handleSaveAdmin}
          onClose={() => setAdminModal({ open: false })}
        />
      )}
      {inspectStage && (
        <StageDetailModal
          stage={inspectStage}
          allStages={stages}
          riders={riders}
          onTransferRider={handleTransferRiderStage}
          onClose={() => setInspectStage(null)}
        />
      )}
      {deleteConfirm && (
        <ConfirmDeleteModal
          title={`Delete ${deleteConfirm.category.slice(0, -1)} record?`}
          description={`Are you sure you want to permanently remove "${deleteConfirm.name}" from the BodaCare Uganda database?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          busy={deleteBusy}
        />
      )}
      {inspectProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-3 my-auto mx-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">{inspectProfile.title}</h3>
              <button onClick={() => setInspectProfile(null)} className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              {inspectProfile.fields.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">{f.label}</span>
                  <span className="font-semibold text-slate-900 text-right">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
