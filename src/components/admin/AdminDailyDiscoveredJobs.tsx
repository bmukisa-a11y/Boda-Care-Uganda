import React, { useEffect, useMemo, useState } from 'react';
import {
  Radar,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit3,
  Trash2,
  MessageSquare,
  ExternalLink,
  Building2,
  Globe,
  Clock,
  ShieldAlert,
  FileCheck2,
  Plus,
  Send,
  Phone,
  Search,
  MapPin,
  Copy,
  RotateCcw,
  Sparkles,
  Newspaper,
  Bell,
} from 'lucide-react';
import type {
  BodaJob,
  DiscoveredJobRecord,
  DiscoveredJobStatus,
  DiscoveryDashboardPayload,
  DiscoveryEmployerSummary,
  DiscoveryScheduleConfig,
  DiscoverySource,
  JobAlertDispatchMode,
} from '../../types';
import { storage } from '../../lib/storage';

interface AdminDailyDiscoveredJobsProps {
  onJobPublished?: (job: BodaJob) => void;
}

const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-admin-id': 'admin-founder-mukisa',
  'x-admin-role': 'super_admin',
};

type SubTab = 'queue' | 'employers' | 'sources' | 'automation';
type QueueBucket = DiscoveredJobStatus | 'all';

const STATUS_BADGE: Record<DiscoveredJobStatus, { label: string; cls: string }> = {
  new: { label: 'Newly Discovered', cls: 'bg-sky-100 text-sky-900 border-sky-200' },
  awaiting_verification: { label: 'Awaiting Verification', cls: 'bg-amber-100 text-amber-900 border-amber-200' },
  info_requested: { label: 'More Info Requested', cls: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  verified: { label: 'Verified & Published', cls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  rejected: { label: 'Rejected', cls: 'bg-slate-200 text-slate-700 border-slate-300' },
  suspicious: { label: 'Suspicious / Scam Risk', cls: 'bg-rose-100 text-rose-900 border-rose-200' },
  expired: { label: 'Expired / Closed', cls: 'bg-orange-100 text-orange-900 border-orange-200' },
  duplicate: { label: 'Duplicate Filtered', cls: 'bg-purple-100 text-purple-900 border-purple-200' },
};

export const AdminDailyDiscoveredJobs: React.FC<AdminDailyDiscoveredJobsProps> = ({
  onJobPublished,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('queue');
  const [dashboard, setDashboard] = useState<DiscoveryDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queue filters
  const [bucket, setBucket] = useState<QueueBucket>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<'all' | 'kikyusa' | 'luweero' | 'national'>('all');

  // Action Modals
  const [editingJob, setEditingJob] = useState<DiscoveredJobRecord | null>(null);
  const [approvingJob, setApprovingJob] = useState<DiscoveredJobRecord | null>(null);
  const [approveDispatchMode, setApproveDispatchMode] = useState<JobAlertDispatchMode>('sms_whatsapp');
  const [matchLocation, setMatchLocation] = useState(true);
  const [matchOccupation, setMatchOccupation] = useState(true);
  const [matchQualifications, setMatchQualifications] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  const [infoJob, setInfoJob] = useState<DiscoveredJobRecord | null>(null);
  const [infoNote, setInfoNote] = useState('');
  const [infoChannel, setInfoChannel] = useState<'none' | 'sms' | 'whatsapp'>('none');

  const [rejectJob, setRejectJob] = useState<DiscoveredJobRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [suspiciousJob, setSuspiciousJob] = useState<DiscoveredJobRecord | null>(null);
  const [suspiciousReason, setSuspiciousReason] = useState('');

  // Local newspaper / partner webhook manual submission drawer
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestEmployer, setIngestEmployer] = useState('');
  const [ingestPhone, setIngestPhone] = useState('');
  const [ingestEmail, setIngestEmail] = useState('');
  const [ingestLocation, setIngestLocation] = useState('Kikyusa, Luweero District');
  const [ingestSalary, setIngestSalary] = useState('');
  const [ingestDeadline, setIngestDeadline] = useState('');
  const [ingestUrl, setIngestUrl] = useState('');
  const [ingestQualifications, setIngestQualifications] = useState('');
  const [ingestDesc, setIngestDesc] = useState('');

  // Add Source Form
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSrcName, setNewSrcName] = useState('');
  const [newSrcCategory, setNewSrcCategory] = useState<DiscoverySource['category']>('uganda_job_portal');
  const [newSrcType, setNewSrcType] = useState<DiscoverySource['sourceType']>('rss_feed');
  const [newSrcUrl, setNewSrcUrl] = useState('');
  const [newSrcQuery, setNewSrcQuery] = useState('');
  const [newSrcRobots, setNewSrcRobots] = useState(true);

  // Automation Schedule draft
  const [scheduleDraft, setScheduleDraft] = useState<DiscoveryScheduleConfig | null>(null);
  const [newScanTime, setNewScanTime] = useState('08:30');

  // Employer verification contact modal
  const [inspectEmployer, setInspectEmployer] = useState<DiscoveryEmployerSummary | null>(null);
  const [empPhone, setEmpPhone] = useState('');
  const [empChannel, setEmpChannel] = useState<'sms' | 'whatsapp' | 'status_only'>('whatsapp');
  const [empStatus, setEmpStatus] = useState<DiscoveredJobRecord['employerVerificationStatus']>('confirmed_by_admin');
  const [empRegInfo, setEmpRegInfo] = useState('');
  const [empMsg, setEmpMsg] = useState('');

  const showToastMsg = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/discovery/dashboard', { headers: ADMIN_HEADERS });
      if (!resp.ok) throw new Error('Unable to load Daily Job Discovery dashboard.');
      const data = (await resp.json()) as DiscoveryDashboardPayload;
      setDashboard(data);
      setScheduleDraft(data.schedule);
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Failed to load discovery engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const handleRunScan = async (trigger: 'manual' | 'retry' = 'manual', sourceIds?: string[]) => {
    setScanning(true);
    try {
      const resp = await fetch('/api/discovery/scan', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ trigger, sourceIds }),
      });
      const json = (await resp.json()) as {
        error?: string;
        runReport?: { newJobsDiscovered: number; duplicatesDetected: number; suspiciousFlagged: number; sourcesScanned: number };
        dashboard?: DiscoveryDashboardPayload;
      };
      if (!resp.ok) throw new Error(json.error || 'Discovery scan failed.');
      if (json.dashboard) {
        setDashboard(json.dashboard);
        setScheduleDraft(json.dashboard.schedule);
      }
      const r = json.runReport;
      showToastMsg(
        'success',
        r
          ? `Scan complete: checked ${r.sourcesScanned} source(s), saved ${r.newJobsDiscovered} new job(s), detected ${r.duplicatesDetected} duplicate(s), flagged ${r.suspiciousFlagged} suspicious ad(s).`
          : 'Discovery scan completed.'
      );
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Scan error.');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    setActionBusy(true);
    try {
      const resp = await fetch(`/api/discovery/jobs/${encodeURIComponent(editingJob.id)}`, {
        method: 'PUT',
        headers: ADMIN_HEADERS,
        body: JSON.stringify(editingJob),
      });
      const json = (await resp.json()) as { error?: string; dashboard?: DiscoveryDashboardPayload };
      if (!resp.ok) throw new Error(json.error || 'Failed to save edits.');
      if (json.dashboard) setDashboard(json.dashboard);
      setEditingJob(null);
      showToastMsg('success', 'Job details updated and moved to Awaiting Verification.');
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleApproveAndPublish = async () => {
    if (!approvingJob) return;
    setActionBusy(true);
    try {
      const resp = await fetch(`/api/discovery/jobs/${encodeURIComponent(approvingJob.id)}/approve-publish`, {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          dispatchMode: approveDispatchMode,
          matchCriteria: {
            matchLocation,
            matchOccupation,
            matchQualifications,
          },
        }),
      });
      const json = (await resp.json()) as {
        error?: string;
        publishedJob?: BodaJob;
        matchedRidersCount?: number;
        dashboard?: DiscoveryDashboardPayload;
      };
      if (!resp.ok) throw new Error(json.error || 'Failed to publish job.');
      if (json.dashboard) setDashboard(json.dashboard);
      if (json.publishedJob) {
        storage.saveJob(json.publishedJob);
        onJobPublished?.(json.publishedJob);
      }
      setApprovingJob(null);
      showToastMsg(
        'success',
        `Approved & Published "${json.publishedJob?.title}"! ${
          approveDispatchMode === 'none'
            ? 'No notifications dispatched.'
            : `Matched ${json.matchedRidersCount ?? 0} job seeker(s) via ${approveDispatchMode.replace('_', ' ').toUpperCase()}.`
        }`
      );
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRequestMoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoJob) return;
    setActionBusy(true);
    try {
      const resp = await fetch(`/api/discovery/jobs/${encodeURIComponent(infoJob.id)}/request-info`, {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ note: infoNote, channel: infoChannel }),
      });
      const json = (await resp.json()) as { error?: string; dashboard?: DiscoveryDashboardPayload };
      if (!resp.ok) throw new Error(json.error || 'Failed to request info.');
      if (json.dashboard) setDashboard(json.dashboard);
      setInfoJob(null);
      setInfoNote('');
      showToastMsg('success', 'Requested additional employer verification information.');
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectJob) return;
    setActionBusy(true);
    try {
      const resp = await fetch(`/api/discovery/jobs/${encodeURIComponent(rejectJob.id)}/reject`, {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ reason: rejectReason }),
      });
      const json = (await resp.json()) as { error?: string; dashboard?: DiscoveryDashboardPayload };
      if (!resp.ok) throw new Error(json.error || 'Reject failed.');
      if (json.dashboard) setDashboard(json.dashboard);
      setRejectJob(null);
      setRejectReason('');
      showToastMsg('success', 'Job rejected and excluded from public listings.');
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Reject failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleMarkSuspicious = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspiciousJob) return;
    setActionBusy(true);
    try {
      const resp = await fetch(`/api/discovery/jobs/${encodeURIComponent(suspiciousJob.id)}/mark-suspicious`, {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ reason: suspiciousReason }),
      });
      const json = (await resp.json()) as { error?: string; dashboard?: DiscoveryDashboardPayload };
      if (!resp.ok) throw new Error(json.error || 'Failed to flag.');
      if (json.dashboard) setDashboard(json.dashboard);
      setSuspiciousJob(null);
      setSuspiciousReason('');
      showToastMsg('success', 'Job and employer flagged as Suspicious / Potential Scam.');
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Flag failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDeleteDiscovery = async (job: DiscoveredJobRecord) => {
    setActionBusy(true);
    try {
      const resp = await fetch(`/api/discovery/jobs/${encodeURIComponent(job.id)}`, {
        method: 'DELETE',
        headers: ADMIN_HEADERS,
      });
      const json = (await resp.json()) as { error?: string; dashboard?: DiscoveryDashboardPayload };
      if (!resp.ok) throw new Error(json.error || 'Delete failed.');
      if (json.dashboard) setDashboard(json.dashboard);
      showToastMsg('success', `Deleted discovery record "${job.title}".`);
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmitIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestTitle.trim()) return;
    setActionBusy(true);
    try {
      const resp = await fetch('/api/discovery/ingest', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          items: [
            {
              title: ingestTitle.trim(),
              employerName: ingestEmployer.trim() || undefined,
              employerPhone: ingestPhone.trim() || undefined,
              employerEmail: ingestEmail.trim() || undefined,
              rawLocation: ingestLocation.trim(),
              salaryDisplay: ingestSalary.trim() || undefined,
              deadline: ingestDeadline || undefined,
              originalUrl: ingestUrl.trim() || 'https://bodacare.ug/partner-notice',
              qualifications: ingestQualifications.trim() || undefined,
              description: ingestDesc.trim() || ingestTitle.trim(),
            },
          ],
        }),
      });
      const json = (await resp.json()) as { error?: string; dashboard?: DiscoveryDashboardPayload };
      if (!resp.ok) throw new Error(json.error || 'Ingestion failed.');
      if (json.dashboard) setDashboard(json.dashboard);
      setShowIngestModal(false);
      setIngestTitle('');
      setIngestEmployer('');
      setIngestPhone('');
      setIngestEmail('');
      setIngestSalary('');
      setIngestDeadline('');
      setIngestUrl('');
      setIngestQualifications('');
      setIngestDesc('');
      showToastMsg('success', 'Notice processed through duplicate, scam & Uganda location engine.');
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Ingestion failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrcName.trim() || !newSrcUrl.trim()) return;
    setActionBusy(true);
    try {
      const resp = await fetch('/api/discovery/sources', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          name: newSrcName.trim(),
          category: newSrcCategory,
          sourceType: newSrcType,
          url: newSrcUrl.trim(),
          queryTemplate: newSrcQuery.trim() || undefined,
          respectRobotsTxt: newSrcRobots,
          active: true,
        }),
      });
      const json = (await resp.json()) as { error?: string };
      if (!resp.ok) throw new Error(json.error || 'Failed to add source.');
      setShowAddSource(false);
      setNewSrcName('');
      setNewSrcUrl('');
      setNewSrcQuery('');
      await fetchDashboard();
      showToastMsg('success', 'Recruitment discovery source added.');
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Unable to add source.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleSource = async (src: DiscoverySource) => {
    try {
      const resp = await fetch(`/api/discovery/sources/${encodeURIComponent(src.id)}`, {
        method: 'PUT',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ active: !src.active }),
      });
      if (!resp.ok) throw new Error('Failed to toggle source.');
      await fetchDashboard();
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Toggle failed.');
    }
  };

  const handleTestSource = async (src: DiscoverySource) => {
    try {
      const resp = await fetch(`/api/discovery/sources/${encodeURIComponent(src.id)}/test`, {
        method: 'POST',
        headers: ADMIN_HEADERS,
      });
      const json = (await resp.json()) as {
        status: string;
        sampleCount: number;
        error?: string;
        sampleTitles?: string[];
      };
      await fetchDashboard();
      if (json.status === 'ok') {
        showToastMsg(
          'success',
          `Source "${src.name}" OK — fetched ${json.sampleCount} candidate(s). Sample: ${
            json.sampleTitles?.slice(0, 2).join(' | ') || 'none'
          }`
        );
      } else {
        showToastMsg('error', `Source test (${json.status}): ${json.error || 'No results returned'}`);
      }
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Test fetch failed.');
    }
  };

  const handleDeleteSource = async (src: DiscoverySource) => {
    try {
      await fetch(`/api/discovery/sources/${encodeURIComponent(src.id)}`, {
        method: 'DELETE',
        headers: ADMIN_HEADERS,
      });
      await fetchDashboard();
      showToastMsg('success', `Removed source "${src.name}".`);
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDraft) return;
    setActionBusy(true);
    try {
      const resp = await fetch('/api/discovery/schedule', {
        method: 'PUT',
        headers: ADMIN_HEADERS,
        body: JSON.stringify(scheduleDraft),
      });
      const json = (await resp.json()) as { schedule?: DiscoveryScheduleConfig; error?: string };
      if (!resp.ok) throw new Error(json.error || 'Failed to save schedule.');
      if (json.schedule) {
        setScheduleDraft(json.schedule);
        setDashboard((prev) => (prev ? { ...prev, schedule: json.schedule! } : prev));
      }
      showToastMsg('success', 'Daily scan schedule & Admin notification preferences saved.');
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleEmployerAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectEmployer) return;
    setActionBusy(true);
    try {
      const resp = await fetch('/api/discovery/employers/contact', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          employerName: inspectEmployer.employerName,
          phone: empPhone.trim() || undefined,
          channel: empChannel,
          message: empMsg.trim() || undefined,
          verificationStatus: empStatus,
          registrationInfo: empRegInfo.trim() || undefined,
        }),
      });
      const json = (await resp.json()) as { error?: string; dashboard?: DiscoveryDashboardPayload };
      if (!resp.ok) throw new Error(json.error || 'Employer update failed.');
      if (json.dashboard) setDashboard(json.dashboard);
      setInspectEmployer(null);
      showToastMsg('success', `Updated verification status for ${inspectEmployer.employerName}.`);
    } catch (err) {
      showToastMsg('error', err instanceof Error ? err.message : 'Failed to update employer.');
    } finally {
      setActionBusy(false);
    }
  };

  const filteredJobs = useMemo(() => {
    const list = dashboard?.jobs || [];
    return list.filter((j) => {
      if (bucket !== 'all' && j.status !== bucket) return false;
      if (locationFilter === 'kikyusa' && !`${j.subCounty} ${j.rawLocation}`.toLowerCase().includes('kikyusa')) {
        return false;
      }
      if (locationFilter === 'luweero' && !j.district.toLowerCase().includes('luweero')) {
        return false;
      }
      if (locationFilter === 'national' && j.district.toLowerCase().includes('luweero')) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${j.title} ${j.employerName} ${j.rawLocation} ${j.sourceName} ${j.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dashboard?.jobs, bucket, locationFilter, searchQuery]);

  if (loading && !dashboard) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Loading Automated Daily Job Discovery &amp; Admin Verification Engine...
      </div>
    );
  }

  const counts = dashboard?.counts || {
    all: 0,
    new: 0,
    awaiting_verification: 0,
    info_requested: 0,
    verified: 0,
    rejected: 0,
    suspicious: 0,
    expired: 0,
    duplicate: 0,
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-2xl p-5 shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black uppercase tracking-wide flex items-center gap-1">
                <Radar className="w-3.5 h-3.5" />
                DAILY DISCOVERED JOBS
              </span>
              <span className="text-emerald-400 font-semibold">
                {dashboard?.schedule.automationEnabled
                  ? `Auto-Scan Active (${dashboard.schedule.scanTimes.join(', ')} EAT)`
                  : 'Auto-Scan Paused'}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1.5">
              Automated Daily Job Discovery &amp; Recruitment Verification
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 max-w-3xl">
              Prioritizes Kikyusa &amp; Luweero District, surrounding districts, and Uganda-wide opportunities. Every discovered opportunity requires Super Admin verification before publishing to riders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowIngestModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Newspaper className="w-4 h-4 text-amber-400" />
              <span>Ingest Local / Newspaper Notice</span>
            </button>
            <button
              onClick={() => handleRunScan('manual')}
              disabled={scanning}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning Sources...' : 'Run Discovery Scan Now'}</span>
            </button>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px]">Newly Discovered</span>
            <span className="text-xl font-black text-sky-400">{counts.new}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px]">Awaiting Review</span>
            <span className="text-xl font-black text-amber-400">
              {counts.awaiting_verification + counts.info_requested}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px]">Verified &amp; Published</span>
            <span className="text-xl font-black text-emerald-400">{counts.verified}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px]">Suspicious Blocked</span>
            <span className="text-xl font-black text-rose-400">{counts.suspicious}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px]">Duplicates Filtered</span>
            <span className="text-xl font-black text-purple-400">{counts.duplicate}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <span className="text-slate-400 block text-[11px]">Expired / Rejected</span>
            <span className="text-xl font-black text-slate-300">{counts.expired + counts.rejected}</span>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
          <button
            onClick={() => setSubTab('queue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              subTab === 'queue' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Verification Queue ({counts.all})
          </button>
          <button
            onClick={() => setSubTab('employers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              subTab === 'employers' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Employer Verification ({dashboard?.employers.length || 0})
          </button>
          <button
            onClick={() => setSubTab('sources')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              subTab === 'sources' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Discovery Sources ({dashboard?.sources.length || 0})
          </button>
          <button
            onClick={() => setSubTab('automation')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              subTab === 'automation' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Daily Schedule, Alerts &amp; Reports ({dashboard?.runs.length || 0})
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* SUB-TAB 1: VERIFICATION QUEUE */}
      {subTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          {/* Bucket Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['new', `Newly Discovered (${counts.new})`],
                ['awaiting_verification', `Awaiting Verification (${counts.awaiting_verification})`],
                ['info_requested', `More Info Requested (${counts.info_requested})`],
                ['verified', `Verified (${counts.verified})`],
                ['suspicious', `Suspicious (${counts.suspicious})`],
                ['expired', `Expired (${counts.expired})`],
                ['duplicate', `Duplicates (${counts.duplicate})`],
                ['rejected', `Rejected (${counts.rejected})`],
                ['all', `All (${counts.all})`],
              ] as Array<[QueueBucket, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setBucket(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                  bucket === key
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search & Location Filter */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search job title, employer, source, or district..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value as typeof locationFilter)}
              className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-slate-50"
            >
              <option value="all">All Uganda Locations</option>
              <option value="kikyusa">Kikyusa Priority Zone</option>
              <option value="luweero">Luweero District</option>
              <option value="national">Surrounding &amp; National</option>
            </select>
          </div>

          {/* Jobs List */}
          {filteredJobs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-300 rounded-2xl bg-slate-50 space-y-2">
              <Radar className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                No discovered jobs in this bucket right now.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click &ldquo;Run Discovery Scan Now&rdquo; to fetch fresh Uganda recruitment feeds, or ingest a local Luweero/Kikyusa newspaper notice above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => {
                const badge = STATUS_BADGE[job.status];
                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 text-xs"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              job.locationPriorityScore >= 90
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            <MapPin className="w-3 h-3 inline mr-0.5" />
                            {job.subCounty}, {job.district} (Priority {job.locationPriorityScore})
                          </span>
                          {job.isExpired ? (
                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 text-[11px] font-bold">
                              Closed / Expired
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                              Accepting Applications
                            </span>
                          )}
                          {job.scamScore > 0 && (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 text-[11px] font-bold">
                              Risk Score: {job.scamScore}/100
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900">{job.title}</h4>
                        <p className="text-slate-700 font-semibold flex flex-wrap items-center gap-2">
                          <span>Employer: {job.employerName}</span>
                          <span>·</span>
                          <span className="text-slate-500 font-normal">Source: {job.sourceName}</span>
                          <a
                            href={job.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-700 hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <span>View Original Ad</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </p>
                      </div>

                      <div className="text-left sm:text-right text-[11px] text-slate-500 shrink-0">
                        <div>Discovered: {new Date(job.discoveredAt).toLocaleString()}</div>
                        <div>Deadline: {job.deadline || 'Not specified'}</div>
                        <div className="font-bold text-slate-800 mt-0.5">
                          Pay: {job.salaryDisplay || 'Disclosed upon review'}
                        </div>
                      </div>
                    </div>

                    {/* Extracted Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Employer Contact &amp; Address
                        </span>
                        <p className="text-slate-700 mt-0.5">
                          {job.employerPhone || 'No phone found'} {job.employerEmail ? `· ${job.employerEmail}` : ''}
                        </p>
                        {job.employerAddress && (
                          <p className="text-slate-500 text-[11px]">{job.employerAddress}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Qualifications &amp; Experience
                        </span>
                        <p className="text-slate-700 mt-0.5 line-clamp-2">{job.qualifications}</p>
                        {job.experienceRequirements && (
                          <p className="text-slate-500 text-[11px]">Exp: {job.experienceRequirements}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Job Category &amp; Occupation Tag
                        </span>
                        <p className="text-slate-700 mt-0.5 font-semibold">{job.occupationTag || job.jobCategory}</p>
                        <p className="text-slate-500 text-[11px]">Verification: {job.employerVerificationStatus.replace(/_/g, ' ')}</p>
                      </div>
                    </div>

                    <p className="text-slate-700 leading-relaxed line-clamp-3">{job.description}</p>

                    {/* Warnings: Scam Flags / Incomplete / Duplicate */}
                    {(job.scamFlags.length > 0 || job.incompleteFlags.length > 0 || job.duplicateReason || job.infoRequestNote) && (
                      <div className="space-y-1.5">
                        {job.duplicateReason && (
                          <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-semibold flex items-center gap-1.5">
                            <Copy className="w-3.5 h-3.5 shrink-0" />
                            <span>Duplicate Detection: {job.duplicateReason}</span>
                          </div>
                        )}
                        {job.scamFlags.length > 0 && (
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-semibold flex items-start gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Scam / Risk Alerts: {job.scamFlags.join(' • ')}</span>
                          </div>
                        )}
                        {job.incompleteFlags.length > 0 && (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Missing Info: {job.incompleteFlags.join(' • ')}</span>
                          </div>
                        )}
                        {job.infoRequestNote && (
                          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900">
                            <strong>Admin Info Inquiry:</strong> {job.infoRequestNote}
                          </div>
                        )}
                      </div>
                    )}

                    {/* All 6 Required Admin Controls */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => setApprovingJob(job)}
                        disabled={actionBusy}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>APPROVE AND PUBLISH</span>
                      </button>

                      <button
                        onClick={() => setEditingJob({ ...job })}
                        disabled={actionBusy}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>EDIT JOB DETAILS</span>
                      </button>

                      <button
                        onClick={() => {
                          setInfoJob(job);
                          setInfoNote(
                            `Hello ${job.employerName}, BodaCare Uganda Admin is verifying "${job.title}". Kindly confirm your office location, phone contact, and salary details.`
                          );
                        }}
                        disabled={actionBusy}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>REQUEST MORE INFORMATION</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectJob(job);
                          setRejectReason('');
                        }}
                        disabled={actionBusy}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>REJECT JOB</span>
                      </button>

                      <button
                        onClick={() => {
                          setSuspiciousJob(job);
                          setSuspiciousReason('');
                        }}
                        disabled={actionBusy}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>MARK AS SUSPICIOUS</span>
                      </button>

                      <button
                        onClick={() => handleDeleteDiscovery(job)}
                        disabled={actionBusy}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>DELETE DISCOVERY RECORD</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: EMPLOYER VERIFICATION INSPECTOR */}
      {subTab === 'employers' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Employer Authenticity &amp; Recruitment History Inspector</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Review company registration notes, websites, phone numbers, and past ad history. Contact employers directly to verify authenticity before publishing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(dashboard?.employers || []).map((emp) => (
              <div key={emp.employerKey} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-extrabold text-sm text-slate-900">{emp.employerName}</h5>
                    <p className="text-slate-600">{emp.companyAddress || 'Address pending verification'}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                      emp.verificationStatus === 'confirmed_by_admin'
                        ? 'bg-emerald-100 text-emerald-800'
                        : emp.verificationStatus === 'flagged'
                        ? 'bg-rose-100 text-rose-800'
                        : emp.verificationStatus === 'info_requested'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {emp.verificationStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <p>
                    <strong>Phones:</strong> {emp.contactPhones.join(', ') || 'None extracted'}
                  </p>
                  <p>
                    <strong>Emails:</strong> {emp.contactEmails.join(', ') || 'None extracted'}
                  </p>
                  <p>
                    <strong>Website:</strong>{' '}
                    {emp.officialWebsite ? (
                      <a href={emp.officialWebsite} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">
                        {emp.officialWebsite}
                      </a>
                    ) : (
                      'Not listed'
                    )}
                  </p>
                  <p>
                    <strong>URSB / Reg Info:</strong> {emp.registrationInfo || 'Not yet recorded'}
                  </p>
                  <p>
                    <strong>Sources Seen:</strong> {emp.sourcesSeen.join(', ')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex gap-2 text-[11px] font-bold">
                    <span className="text-slate-700">Ads: {emp.totalDiscoveredAds}</span>
                    <span className="text-emerald-700">Verified: {emp.verifiedPublishedCount}</span>
                    <span className="text-rose-700">Suspicious: {emp.suspiciousCount}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {emp.contactPhones[0] && (
                      <a
                        href={`tel:${emp.contactPhones[0]}`}
                        className="px-2.5 py-1 bg-slate-800 text-white rounded-lg font-bold inline-flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setInspectEmployer(emp);
                        setEmpPhone(emp.contactPhones[0] || '');
                        setEmpStatus(emp.verificationStatus);
                        setEmpRegInfo(emp.registrationInfo || '');
                        setEmpMsg(
                          `Hello ${emp.employerName}, Brian Mukisa (BodaCare Uganda Super Admin) is confirming your vacancy posting for Luweero/Uganda job seekers.`
                        );
                      }}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold cursor-pointer"
                    >
                      Verify / Contact Employer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DISCOVERY SOURCES MANAGER */}
      {subTab === 'sources' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-600" />
                <span>Compliant Public Recruitment Sources</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Supports RSS feeds, JSON recruitment APIs, Schema.org JobPosting career pages, permitted Search APIs, and local newspaper webhooks. Strictly honors robots.txt and never bypasses logins or CAPTCHAs.
              </p>
            </div>
            <button
              onClick={() => setShowAddSource((p) => !p)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Recruitment Source</span>
            </button>
          </div>

          {/* Server Capabilities Readout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-700 block">Google Custom Search API</span>
              <span className={dashboard?.capabilities.googleCustomSearchConfigured ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                {dashboard?.capabilities.googleCustomSearchConfigured
                  ? '✓ Configured in Server Env'
                  : 'Set GOOGLE_CSE_API_KEY & GOOGLE_CSE_CX in .env'}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-700 block">SerpApi Google Jobs</span>
              <span className={dashboard?.capabilities.serpApiConfigured ? 'text-emerald-700 font-bold' : 'text-amber-700'}>
                {dashboard?.capabilities.serpApiConfigured
                  ? '✓ Configured in Server Env'
                  : 'Set SERPAPI_KEY in .env'}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-700 block">Server Extraction Mode</span>
                <span className="text-slate-600">
                  {dashboard?.capabilities.geminiExtractionConfigured
                    ? 'Deterministic + Gemini Structured Enrichment'
                    : 'Deterministic RSS / JSON / Schema.org Extractor'}
                </span>
              </div>
            </div>
          </div>

          {showAddSource && (
            <form onSubmit={handleAddSource} className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3 text-xs">
              <h5 className="font-bold text-slate-900 text-sm">Add New Public Job Source</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Source Name *</label>
                  <input
                    type="text"
                    required
                    value={newSrcName}
                    onChange={(e) => setNewSrcName(e.target.value)}
                    placeholder="e.g. Luweero District Service Commission Careers"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Source Category</label>
                  <select
                    value={newSrcCategory}
                    onChange={(e) => setNewSrcCategory(e.target.value as DiscoverySource['category'])}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="uganda_job_portal">Ugandan Recruitment Portal</option>
                    <option value="company_careers">Company Career Website</option>
                    <option value="ngo_government">NGO / Government Careers</option>
                    <option value="public_social_page">Permitted Public Social Page Feed</option>
                    <option value="search_engine_index">Search Engine Indexed Ads</option>
                    <option value="newspaper_notice">Newspaper Notice Feed</option>
                    <option value="local_business_ad">Local Business Ad Feed</option>
                    <option value="public_feed_api">Public RSS / JSON API</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Technical Adapter</label>
                  <select
                    value={newSrcType}
                    onChange={(e) => setNewSrcType(e.target.value as DiscoverySource['sourceType'])}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="rss_feed">RSS / Atom XML Feed</option>
                    <option value="json_api">Public JSON API</option>
                    <option value="html_careers">HTML Careers / Schema.org JobPosting</option>
                    <option value="search_api">Search Engine Index API</option>
                    <option value="webhook_ingest">Structured Webhook Ingest</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Public Feed or Career URL *</label>
                  <input
                    type="text"
                    required
                    value={newSrcUrl}
                    onChange={(e) => setNewSrcUrl(e.target.value)}
                    placeholder="https://example.ug/careers/rss"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Optional Search Query Template</label>
                  <input
                    type="text"
                    value={newSrcQuery}
                    onChange={(e) => setNewSrcQuery(e.target.value)}
                    placeholder="Used when adapter is search_api"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newSrcRobots}
                    onChange={(e) => setNewSrcRobots(e.target.checked)}
                    className="rounded"
                  />
                  <span>Strictly enforce site robots.txt directives</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSource(false)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionBusy}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold cursor-pointer"
                  >
                    Save Source
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {(dashboard?.sources || []).map((src) => (
              <div
                key={src.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{src.name}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                      {src.sourceType}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        src.lastStatus === 'ok'
                          ? 'bg-emerald-100 text-emerald-800'
                          : src.lastStatus === 'never_run'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {src.lastStatus.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        src.active ? 'bg-sky-100 text-sky-900' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {src.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="font-mono text-slate-600 break-all text-[11px]">{src.url}</p>
                  {src.lastError && <p className="text-rose-700 font-semibold">{src.lastError}</p>}
                  <p className="text-slate-500 text-[11px]">
                    Last Run Found: {src.jobsFoundLastRun} | Total Discovered: {src.totalJobsDiscovered} | Checked:{' '}
                    {src.lastCheckedAt ? new Date(src.lastCheckedAt).toLocaleString() : 'Never'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleTestSource(src)}
                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Test Fetch
                  </button>
                  <button
                    onClick={() => handleToggleSource(src)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    {src.active ? 'Disable' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteSource(src)}
                    className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DAILY AUTOMATION, ADMIN ALERTS & DISCOVERY REPORTS */}
      {subTab === 'automation' && scheduleDraft && (
        <div className="space-y-5">
          <form onSubmit={handleSaveSchedule} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>Daily Background Schedule &amp; Admin Discovery Alerts</span>
                </h4>
                <p className="text-slate-500 mt-0.5">
                  Runs automatically on the BodaCare server in Kampala time (EAT) even when your browser is closed.
                </p>
              </div>
              <button
                type="submit"
                disabled={actionBusy}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
              >
                Save Schedule &amp; Alert Settings
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleDraft.automationEnabled}
                    onChange={(e) => setScheduleDraft({ ...scheduleDraft, automationEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <span>Enable Automated Daily Background Job Scans</span>
                </label>

                <div>
                  <span className="block font-bold text-slate-700 mb-1.5">Configured Daily Scan Times (Africa/Kampala)</span>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {scheduleDraft.scanTimes.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold flex items-center gap-1.5"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() =>
                            setScheduleDraft({
                              ...scheduleDraft,
                              scanTimes: scheduleDraft.scanTimes.filter((x) => x !== t),
                            })
                          }
                          className="text-rose-600 font-black cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={newScanTime}
                      onChange={(e) => setNewScanTime(e.target.value)}
                      className="p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newScanTime && !scheduleDraft.scanTimes.includes(newScanTime)) {
                          setScheduleDraft({
                            ...scheduleDraft,
                            scanTimes: [...scheduleDraft.scanTimes, newScanTime].sort(),
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-bold cursor-pointer"
                    >
                      + Add Time
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Retries Per Failed Source</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={scheduleDraft.maxRetriesPerSource}
                    onChange={(e) =>
                      setScheduleDraft({ ...scheduleDraft, maxRetriesPerSource: Number(e.target.value || 1) })
                    }
                    className="w-28 p-2 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <span>Admin Discovery Alert Channels</span>
                </span>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleDraft.notifyAdminInApp}
                    onChange={(e) => setScheduleDraft({ ...scheduleDraft, notifyAdminInApp: e.target.checked })}
                  />
                  <span>In-App Admin Notification Drawer (Always Recommended)</span>
                </label>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleDraft.notifyAdminSms}
                    onChange={(e) => setScheduleDraft({ ...scheduleDraft, notifyAdminSms: e.target.checked })}
                  />
                  <span>Direct SMS Alert to Admin (Africa&apos;s Talking)</span>
                </label>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleDraft.notifyAdminWhatsapp}
                    onChange={(e) => setScheduleDraft({ ...scheduleDraft, notifyAdminWhatsapp: e.target.checked })}
                  />
                  <span>Direct WhatsApp Alert to Admin (Meta Cloud API)</span>
                </label>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleDraft.notifyOnlyWhenNewFound}
                    onChange={(e) => setScheduleDraft({ ...scheduleDraft, notifyOnlyWhenNewFound: e.target.checked })}
                  />
                  <span>Only alert Admin when 1 or more new opportunities are discovered</span>
                </label>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Admin Alert SMS Phone</label>
                    <input
                      type="tel"
                      value={scheduleDraft.adminNotifyPhone}
                      onChange={(e) => setScheduleDraft({ ...scheduleDraft, adminNotifyPhone: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Admin WhatsApp Phone</label>
                    <input
                      type="tel"
                      value={scheduleDraft.adminNotifyWhatsapp}
                      onChange={(e) => setScheduleDraft({ ...scheduleDraft, adminNotifyWhatsapp: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Daily Discovery Reports */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>Daily Discovery Run Reports</span>
              </h4>
            </div>

            {(dashboard?.runs || []).length === 0 ? (
              <p className="text-slate-500 italic">No discovery scans recorded yet. Click &ldquo;Run Discovery Scan Now&rdquo; above.</p>
            ) : (
              <div className="space-y-3">
                {dashboard!.runs.map((run) => {
                  const failedIds = run.sourceOutcomes.filter((o) => o.status === 'error').map((o) => o.sourceId);
                  return (
                    <div key={run.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{run.id}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 uppercase font-bold text-[10px]">
                            {run.trigger}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              run.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {run.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-slate-500">{new Date(run.startedAt).toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block">Sources</span>
                          <span className="font-black text-slate-800">{run.sourcesScanned}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block">New Saved</span>
                          <span className="font-black text-sky-600">{run.newJobsDiscovered}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block">Duplicates</span>
                          <span className="font-black text-purple-600">{run.duplicatesDetected}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block">Suspicious</span>
                          <span className="font-black text-rose-600">{run.suspiciousFlagged}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block">Expired</span>
                          <span className="font-black text-orange-600">{run.expiredDetected}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block">Awaiting Review</span>
                          <span className="font-black text-amber-600">{run.awaitingApprovalCount}</span>
                        </div>
                      </div>

                      {failedIds.length > 0 && (
                        <div className="flex items-center justify-between bg-rose-50 border border-rose-200 p-2 rounded-lg">
                          <span className="text-rose-800 font-semibold">{run.errorSummary}</span>
                          <button
                            onClick={() => handleRunScan('retry', failedIds)}
                            className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry Failed</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: APPROVE AND PUBLISH + INTELLIGENT JOB SEEKER BROADCAST */}
      {approvingJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs my-auto mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-extrabold text-slate-900">Approve &amp; Publish Verified Job</h4>
                <p className="text-slate-500">
                  {approvingJob.title} — {approvingJob.employerName}
                </p>
              </div>
              <button onClick={() => setApprovingJob(null)} className="text-slate-400 font-bold text-base cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 block">Automatic Job Seeker Matching Filters</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={matchLocation} onChange={(e) => setMatchLocation(e.target.checked)} />
                <span>Match by Preferred Location ({approvingJob.subCounty}, {approvingJob.district})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={matchOccupation} onChange={(e) => setMatchOccupation(e.target.checked)} />
                <span>Match by Occupation / Job Category ({approvingJob.occupationTag || approvingJob.jobCategory})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchQualifications}
                  onChange={(e) => setMatchQualifications(e.target.checked)}
                />
                <span>Match by Rider Qualifications / Bike Eligibility</span>
              </label>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1.5">Notification Dispatch Channel</label>
              <select
                value={approveDispatchMode}
                onChange={(e) => setApproveDispatchMode(e.target.value as JobAlertDispatchMode)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
              >
                <option value="sms_whatsapp">Both SMS &amp; WhatsApp (Recommended)</option>
                <option value="all_channels">All Channels (SMS + WhatsApp + In-App)</option>
                <option value="sms_only">SMS Only (Button-phone friendly)</option>
                <option value="whatsapp_only">WhatsApp Only</option>
                <option value="none">Publish Without Sending Notifications</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setApprovingJob(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveAndPublish}
                disabled={actionBusy}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{actionBusy ? 'Publishing...' : 'Confirm Approve & Publish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT JOB DETAILS */}
      {editingJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-3 text-xs my-auto mx-auto"
          >
            <div className="flex items-start justify-between">
              <h4 className="text-base font-extrabold text-slate-900">Edit Discovered Job Details</h4>
              <button type="button" onClick={() => setEditingJob(null)} className="text-slate-400 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={editingJob.title}
                  onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Employer Name *</label>
                <input
                  type="text"
                  required
                  value={editingJob.employerName}
                  onChange={(e) => setEditingJob({ ...editingJob, employerName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Employer Phone</label>
                <input
                  type="text"
                  value={editingJob.employerPhone || ''}
                  onChange={(e) => setEditingJob({ ...editingJob, employerPhone: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Location (Town / Sub-County, District)</label>
                <input
                  type="text"
                  value={editingJob.rawLocation}
                  onChange={(e) => setEditingJob({ ...editingJob, rawLocation: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Salary / Pay Display</label>
                <input
                  type="text"
                  value={editingJob.salaryDisplay || ''}
                  onChange={(e) => setEditingJob({ ...editingJob, salaryDisplay: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Application Deadline (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={editingJob.deadline || ''}
                  onChange={(e) => setEditingJob({ ...editingJob, deadline: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Qualifications &amp; Requirements</label>
              <input
                type="text"
                value={editingJob.qualifications}
                onChange={(e) => setEditingJob({ ...editingJob, qualifications: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Job Description</label>
              <textarea
                rows={4}
                value={editingJob.description}
                onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingJob(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusy}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl cursor-pointer"
              >
                Save Edited Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: REQUEST MORE INFO */}
      {infoJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <form
            onSubmit={handleRequestMoreInfo}
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-3 text-xs my-auto mx-auto"
          >
            <h4 className="text-base font-extrabold text-slate-900">Request More Employer Information</h4>
            <p className="text-slate-600">{infoJob.title} ({infoJob.employerName})</p>
            <textarea
              rows={3}
              required
              value={infoNote}
              onChange={(e) => setInfoNote(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl"
            />
            <div>
              <label className="block font-bold text-slate-700 mb-1">Send Inquiry to Employer</label>
              <select
                value={infoChannel}
                onChange={(e) => setInfoChannel(e.target.value as typeof infoChannel)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              >
                <option value="none">Record Internal Admin Follow-up Note Only</option>
                <option value="sms" disabled={!infoJob.employerPhone}>
                  Send SMS to {infoJob.employerPhone || '(No phone on record)'}
                </option>
                <option value="whatsapp" disabled={!infoJob.employerPhone}>
                  Send WhatsApp to {infoJob.employerPhone || '(No phone on record)'}
                </option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setInfoJob(null)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">
                Cancel
              </button>
              <button type="submit" disabled={actionBusy} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">
                Send Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: REJECT JOB */}
      {rejectJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <form onSubmit={handleReject} className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 text-xs my-auto mx-auto">
            <h4 className="text-base font-extrabold text-slate-900">Reject Discovered Job</h4>
            <p className="text-slate-600">{rejectJob.title}</p>
            <textarea
              rows={3}
              required
              placeholder="Reason for rejecting this opportunity..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectJob(null)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">
                Cancel
              </button>
              <button type="submit" disabled={actionBusy} className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold">
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: MARK AS SUSPICIOUS */}
      {suspiciousJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <form onSubmit={handleMarkSuspicious} className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 text-xs my-auto mx-auto">
            <h4 className="text-base font-extrabold text-rose-800">Mark Opportunity as Suspicious / Scam Risk</h4>
            <p className="text-slate-600">{suspiciousJob.title} ({suspiciousJob.employerName})</p>
            <textarea
              rows={3}
              required
              placeholder="Specify scam indicator or verification red flag (e.g. requests registration fee)..."
              value={suspiciousReason}
              onChange={(e) => setSuspiciousReason(e.target.value)}
              className="w-full p-2.5 border border-rose-300 rounded-xl"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSuspiciousJob(null)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">
                Cancel
              </button>
              <button type="submit" disabled={actionBusy} className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold">
                Flag as Suspicious
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: INGEST LOCAL NEWSPAPER / PARTNER FEED */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitIngest}
            className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-3 text-xs my-auto mx-auto"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-extrabold text-slate-900">Ingest Local Business / Newspaper Recruitment Notice</h4>
                <p className="text-slate-500">Runs automatically through duplicate, scam, deadline &amp; Kikyusa/Luweero scoring into the Verification Queue.</p>
              </div>
              <button type="button" onClick={() => setShowIngestModal(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Job Title *</label>
                <input required type="text" value={ingestTitle} onChange={(e) => setIngestTitle(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Employer / Business Name</label>
                <input type="text" value={ingestEmployer} onChange={(e) => setIngestEmployer(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Employer Phone</label>
                <input type="tel" value={ingestPhone} onChange={(e) => setIngestPhone(e.target.value)} placeholder="+256 772 ..." className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Employer Email</label>
                <input type="email" value={ingestEmail} onChange={(e) => setIngestEmail(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Location *</label>
                <input required type="text" value={ingestLocation} onChange={(e) => setIngestLocation(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Salary / Pay</label>
                <input type="text" value={ingestSalary} onChange={(e) => setIngestSalary(e.target.value)} placeholder="e.g. UGX 350,000 weekly" className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deadline</label>
                <input type="date" value={ingestDeadline} onChange={(e) => setIngestDeadline(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Original Source URL</label>
                <input type="text" value={ingestUrl} onChange={(e) => setIngestUrl(e.target.value)} placeholder="https://..." className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Qualifications</label>
              <input type="text" value={ingestQualifications} onChange={(e) => setIngestQualifications(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Advertisement Text *</label>
              <textarea required rows={3} value={ingestDesc} onChange={(e) => setIngestDesc(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowIngestModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button>
              <button type="submit" disabled={actionBusy} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold">Submit to Verification Queue</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 7: EMPLOYER VERIFICATION INSPECTOR ACTION */}
      {inspectEmployer && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm">
          <form onSubmit={handleEmployerAction} className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 text-xs my-auto mx-auto">
            <h4 className="text-base font-extrabold text-slate-900">Verify / Contact {inspectEmployer.employerName}</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Employer Status</label>
                <select
                  value={empStatus}
                  onChange={(e) => setEmpStatus(e.target.value as DiscoveredJobRecord['employerVerificationStatus'])}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="confirmed_by_admin">Confirmed Authentic</option>
                  <option value="info_requested">Info Requested</option>
                  <option value="unverified">Unverified</option>
                  <option value="flagged">Flagged Suspicious</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Channel</label>
                <select
                  value={empChannel}
                  onChange={(e) => setEmpChannel(e.target.value as typeof empChannel)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="status_only">Update Status Only</option>
                  <option value="whatsapp">Send WhatsApp Verification</option>
                  <option value="sms">Send SMS Verification</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Employer Phone</label>
              <input type="tel" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg font-mono" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Business Registration / URSB Verification Notes</label>
              <input type="text" value={empRegInfo} onChange={(e) => setEmpRegInfo(e.target.value)} placeholder="e.g. URSB Reg #8002..., Physical Kikyusa Trading Centre office" className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            {empChannel !== 'status_only' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Verification Message</label>
                <textarea rows={3} value={empMsg} onChange={(e) => setEmpMsg(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setInspectEmployer(null)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button>
              <button type="submit" disabled={actionBusy} className="px-4 py-2 bg-sky-600 text-white rounded-xl font-bold">Save Verification</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
