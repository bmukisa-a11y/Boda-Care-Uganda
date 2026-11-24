import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Briefcase,
  Send,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  Phone,
  Smartphone,
  MessageSquare,
  MessageCircle,
  ShieldCheck,
  Users,
  Search,
  RefreshCw,
  BellOff,
  Server,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Link2,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import {
  BodaJob,
  JobAlertDispatchMode,
  JobBroadcastCampaign,
  JobBroadcastChannel,
  JobBroadcastDelivery,
  JobNotificationDashboardStats,
  MessagingGatewayStatus,
  RiderJobAlertPreferences,
  RiderProfile,
  SmsCampaignRecord,
  SmsDeliveryStatus,
  SmsGatewayStatus,
  SmsRecipientScope,
  Stage,
} from '../../types';
import { storage } from '../../lib/storage';
import { formatUgx } from '../../lib/i18n';
import {
  buildJobDeepLink,
  calculateSmsSegments,
  formatJobSmsTemplate,
  formatJobWhatsAppTemplate,
  validateUgandaPhone,
} from '../../lib/ugandaPhone';

interface AdminJobSmsHubProps {
  adminName?: string;
  onJobsChanged?: (jobs: BodaJob[]) => void;
}

type HubSubTab = 'jobs' | 'dispatch' | 'history' | 'preferences' | 'gateway';

const SUB_COUNTIES = ['Kikyusa', 'Luweero Town Council', 'Wobulenzi', 'Kasana', 'Bamunanika'];
const DEFAULT_DISTRICTS = ['Luweero', 'Nakaseke', 'Nakasongola', 'Wakiso', 'Kampala', 'Mukono'];

const JOB_TYPES: { value: BodaJob['type']; label: string }[] = [
  { value: 'produce_transport', label: 'Agricultural Produce Transport' },
  { value: 'parcel_delivery', label: 'Commercial Parcel & Hardware' },
  { value: 'scheduled_courier', label: 'Medical & Scheduled Courier' },
  { value: 'corporate_boda', label: 'Corporate Staff Transport' },
  { value: 'passenger_contract', label: 'Scheduled Passenger Contract' },
];

const ADMIN_AUTH_HEADERS: Record<string, string> = {
  'x-admin-id': 'admin-founder-mukisa',
  'x-admin-role': 'super_admin',
};

export const AdminJobSmsHub: React.FC<AdminJobSmsHubProps> = ({
  adminName = 'Brian Mukisa (Super Admin)',
  onJobsChanged,
}) => {
  const [subTab, setSubTab] = useState<HubSubTab>('jobs');

  // Core Data
  const [jobs, setJobs] = useState<BodaJob[]>(() => storage.getJobs());
  const [riders, setRiders] = useState<RiderProfile[]>(() => storage.getRiders());
  const [stages] = useState<Stage[]>(() => storage.getStages());
  const [campaigns, setCampaigns] = useState<SmsCampaignRecord[]>(() => storage.getSmsCampaigns());

  // Advanced Multi-Channel Broadcast State
  const [dashboardStats, setDashboardStats] = useState<JobNotificationDashboardStats | null>(null);
  const [broadcasts, setBroadcasts] = useState<JobBroadcastCampaign[]>([]);
  const [deliveries, setDeliveries] = useState<JobBroadcastDelivery[]>([]);
  const [combinedGateway, setCombinedGateway] = useState<MessagingGatewayStatus | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<SmsGatewayStatus | null>(null);
  const [loadingGateway, setLoadingGateway] = useState(false);

  // Delivery Log Filters & Retry State
  const [deliveryJobFilter, setDeliveryJobFilter] = useState<string>('all');
  const [deliveryChannelFilter, setDeliveryChannelFilter] = useState<'all' | JobBroadcastChannel>('all');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<'all' | SmsDeliveryStatus>('all');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [retryingTarget, setRetryingTarget] = useState<string | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Job Filters
  const [jobFilter, setJobFilter] = useState<'all' | 'verified' | 'unverified' | 'expired'>('all');
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Create / Edit Job Form State
  const [formTitle, setFormTitle] = useState('');
  const [formEmployerName, setFormEmployerName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmployerPhone, setFormEmployerPhone] = useState('+256 772 ');
  const [formDistrict, setFormDistrict] = useState('Luweero');
  const [formSubCounty, setFormSubCounty] = useState('Kikyusa');
  const [formVillage, setFormVillage] = useState('Kikyusa Central');
  const [formPickup, setFormPickup] = useState('');
  const [formDelivery, setFormDelivery] = useState('');
  const [formDistance, setFormDistance] = useState('12');
  const [formType, setFormType] = useState<BodaJob['type']>('produce_transport');
  const [formPayAmount, setFormPayAmount] = useState('30000');
  const [formSalaryDisplay, setFormSalaryDisplay] = useState('');
  const [formFrequency, setFormFrequency] = useState<BodaJob['paymentFrequency']>('per_trip');
  const [formBikeReq, setFormBikeReq] = useState<BodaJob['requiredMotorcycleType']>('any');
  const [formDeadline, setFormDeadline] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [formDescription, setFormDescription] = useState('');
  const [formRequirements, setFormRequirements] = useState(
    'Valid Class A driving permit, helmet, and verified BodaCare Rider ID.'
  );
  const [formInstructions, setFormInstructions] = useState(
    'Apply inside BodaCare app or call the employer directly quoting your BodaCare Rider ID.'
  );
  const [formVerifyNow, setFormVerifyNow] = useState(true);
  const [formAutoAlertMode, setFormAutoAlertMode] = useState<JobAlertDispatchMode>('sms_whatsapp');
  const [formAutoScope, setFormAutoScope] = useState<SmsRecipientScope>('kikyusa');
  const [jobFeedback, setJobFeedback] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(
    null
  );

  // Broadcast Console State
  const verifiedJobs = useMemo(
    () => jobs.filter((j) => j.adminApproved && j.status === 'open'),
    [jobs]
  );
  const [selectedJobId, setSelectedJobId] = useState<string>(() => verifiedJobs[0]?.id || jobs[0]?.id || '');
  const [dispatchMode, setDispatchMode] = useState<JobAlertDispatchMode>('sms_whatsapp');
  const [recipientScope, setRecipientScope] = useState<SmsRecipientScope>('all');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(['Luweero']);
  const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [selectedRiderIds, setSelectedRiderIds] = useState<string[]>([]);
  const [riderPickerSearch, setRiderPickerSearch] = useState('');
  const [customSmsMessage, setCustomSmsMessage] = useState('');
  const [customWhatsappMessage, setCustomWhatsappMessage] = useState('');
  const [previewRiderId, setPreviewRiderId] = useState<string>(() => riders[0]?.id || '');
  const [respectJobTypeFilter, setRespectJobTypeFilter] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{
    broadcast?: JobBroadcastCampaign;
    backendReachable: boolean;
    message: string;
    hasUnconfiguredWarning: boolean;
  } | null>(null);

  // Legacy Campaign Expandable State
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  // Preferences Search & Filter
  const [prefSearch, setPrefSearch] = useState('');
  const [prefFilterType, setPrefFilterType] = useState<
    'all' | 'smartphone' | 'feature_phone' | 'opted_out' | 'whatsapp_ready'
  >('all');

  const todayStr = new Date().toISOString().split('T')[0];
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://bodacare.ug';

  const isJobExpired = (job: BodaJob) => Boolean(job.deadline && job.deadline < todayStr);

  const syncJobsState = (nextJobs: BodaJob[]) => {
    setJobs(nextJobs);
    if (onJobsChanged) onJobsChanged(nextJobs);
  };

  // Sync riders + fetch unified Job Notification Dashboard & Gateway Status
  const fetchGatewayAndDashboardState = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingGateway(true);
    try {
      await fetch('/api/riders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riders: storage.getRiders() }),
      }).catch(() => {});

      const dashResp = await fetch('/api/job-notifications/dashboard', {
        headers: ADMIN_AUTH_HEADERS,
      });
      const dashCt = dashResp.headers.get('content-type') || '';
      if (dashResp.ok && dashCt.includes('application/json')) {
        const dashJson = (await dashResp.json()) as {
          stats: JobNotificationDashboardStats;
          broadcasts: JobBroadcastCampaign[];
          deliveries: JobBroadcastDelivery[];
          gatewayStatus: MessagingGatewayStatus;
        };
        setDashboardStats(dashJson.stats);
        setBroadcasts(dashJson.broadcasts || []);
        setDeliveries(dashJson.deliveries || []);
        if (dashJson.gatewayStatus) {
          setCombinedGateway(dashJson.gatewayStatus);
          setGatewayStatus({ ...dashJson.gatewayStatus.sms, backendReachable: true });
        }
      } else {
        const statusResp = await fetch('/api/sms/status');
        const ct = statusResp.headers.get('content-type') || '';
        if (statusResp.ok && ct.includes('application/json')) {
          const data = (await statusResp.json()) as SmsGatewayStatus;
          setGatewayStatus({ ...data, backendReachable: true });
        } else {
          setGatewayStatus({
            configured: false,
            provider: 'africastalking',
            environment: 'unconfigured',
            usernameConfigured: false,
            apiKeyConfigured: false,
            senderId: 'BODACARE',
            senderIdApproved: false,
            balanceText: null,
            balanceCurrency: null,
            balanceAmount: null,
            costPerSmsUgx: 35,
            requirementsMissing: [
              'Full-stack Express messaging API (/api/job-notifications/dashboard) unreachable in static preview.',
            ],
            checkedAt: new Date().toISOString(),
            backendReachable: false,
          });
        }
      }

      const campResp = await fetch('/api/sms/campaigns', {
        headers: ADMIN_AUTH_HEADERS,
      });
      const campCt = campResp.headers.get('content-type') || '';
      if (campResp.ok && campCt.includes('application/json')) {
        const campJson = (await campResp.json()) as { campaigns?: SmsCampaignRecord[] };
        if (Array.isArray(campJson.campaigns) && campJson.campaigns.length > 0) {
          const local = storage.getSmsCampaigns();
          const mergedMap = new Map<string, SmsCampaignRecord>();
          campJson.campaigns.forEach((c) => mergedMap.set(c.id, c));
          local.forEach((c) => {
            if (!mergedMap.has(c.id)) mergedMap.set(c.id, c);
          });
          setCampaigns(
            Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
            )
          );
        }
      }
    } catch {
      setGatewayStatus({
        configured: false,
        provider: 'africastalking',
        environment: 'unconfigured',
        usernameConfigured: false,
        apiKeyConfigured: false,
        senderId: 'BODACARE',
        senderIdApproved: false,
        balanceText: null,
        balanceCurrency: null,
        balanceAmount: null,
        costPerSmsUgx: 35,
        requirementsMissing: [
          'Backend messaging server is unreachable on this static deployment.',
        ],
        checkedAt: new Date().toISOString(),
        backendReachable: false,
      });
    } finally {
      if (!quiet) setLoadingGateway(false);
    }
  }, []);

  useEffect(() => {
    void fetchGatewayAndDashboardState();
  }, [fetchGatewayAndDashboardState]);

  // Poll dashboard cleanly when any broadcast is still processing in background worker
  useEffect(() => {
    const hasActiveQueue = broadcasts.some(
      (b) => b.queueState === 'queued' || b.queueState === 'processing'
    );
    if (!hasActiveQueue) return;

    const timer = setInterval(() => {
      void fetchGatewayAndDashboardState(true);
    }, 1500);
    return () => clearInterval(timer);
  }, [broadcasts, fetchGatewayAndDashboardState]);

  // Selected Job & Auto-Updating Message Templates
  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) || null, [jobs, selectedJobId]);

  useEffect(() => {
    if (selectedJob) {
      setCustomSmsMessage(formatJobSmsTemplate(selectedJob, appOrigin));
      setCustomWhatsappMessage(formatJobWhatsAppTemplate(selectedJob, '[Rider Name]', appOrigin));
    }
  }, [
    selectedJobId,
    selectedJob?.title,
    selectedJob?.description,
    selectedJob?.employerPhone,
    selectedJob?.deadline,
    selectedJob?.paymentAmountUgx,
    appOrigin,
  ]);

  // Dynamic Villages & Districts from riders + defaults
  const allDistricts = useMemo(() => {
    const set = new Set<string>(DEFAULT_DISTRICTS);
    riders.forEach((r) => {
      if (r.district?.trim()) set.add(r.district.trim());
    });
    return Array.from(set);
  }, [riders]);

  const allVillages = useMemo(() => {
    const set = new Set<string>([
      'Kikyusa Central',
      'Kalagala',
      'Kasana West',
      'Luweero Central',
      'Wobulenzi East',
    ]);
    riders.forEach((r) => {
      if (r.village?.trim()) set.add(r.village.trim());
    });
    return Array.from(set);
  }, [riders]);

  // Resolve targeted riders client-side for live preview & cost check
  const resolveTargets = (
    scope: SmsRecipientScope,
    opts?: { districts?: string[]; villages?: string[]; stageIds?: string[]; riderIds?: string[] }
  ): { matched: RiderProfile[]; scopeDetails: string } => {
    if (scope === 'all') {
      return { matched: riders, scopeDetails: `All registered riders (${riders.length})` };
    }
    if (scope === 'districts') {
      const ds = opts?.districts ?? selectedDistricts;
      const set = new Set(ds.map((d) => d.trim().toLowerCase()));
      const matched = riders.filter((r) => set.has((r.district || 'Luweero').trim().toLowerCase()));
      return { matched, scopeDetails: `Districts: ${ds.join(', ') || 'None selected'}` };
    }
    if (scope === 'kikyusa') {
      const matched = riders.filter(
        (r) =>
          r.subCounty?.toLowerCase().includes('kikyusa') ||
          r.stageName?.toLowerCase().includes('kikyusa') ||
          r.residentialArea?.toLowerCase().includes('kikyusa') ||
          r.village?.toLowerCase().includes('kikyusa')
      );
      return { matched, scopeDetails: 'Riders in Kikyusa' };
    }
    if (scope === 'luweero') {
      const matched = riders.filter(
        (r) =>
          r.subCounty?.toLowerCase().includes('luweero') ||
          r.subCounty?.toLowerCase().includes('kasana') ||
          r.stageName?.toLowerCase().includes('luweero') ||
          r.stageName?.toLowerCase().includes('kasana') ||
          r.residentialArea?.toLowerCase().includes('luweero')
      );
      return { matched, scopeDetails: 'Riders in Luweero Town & Kasana' };
    }
    if (scope === 'villages') {
      const vs = opts?.villages ?? selectedVillages;
      const set = new Set(vs.map((v) => v.toLowerCase()));
      const matched = riders.filter((r) => set.has((r.village || '').trim().toLowerCase()));
      return { matched, scopeDetails: `Villages: ${vs.join(', ') || 'None selected'}` };
    }
    if (scope === 'stages') {
      const sids = opts?.stageIds ?? selectedStageIds;
      const set = new Set(sids);
      const matched = riders.filter((r) => set.has(r.stageId));
      const stageNames = stages.filter((s) => set.has(s.id)).map((s) => s.name);
      return { matched, scopeDetails: `Stages: ${stageNames.join(', ') || 'None selected'}` };
    }
    const rids = opts?.riderIds ?? selectedRiderIds;
    const idSet = new Set(rids);
    const matched = riders.filter((r) => idSet.has(r.id));
    return { matched, scopeDetails: `Individually selected (${matched.length})` };
  };

  // Pre-Dispatch Channel, Consent, Duplicate & Cost Preview
  const previewStats = useMemo(() => {
    const { matched, scopeDetails } = resolveTargets(recipientScope);
    const seg = calculateSmsSegments(customSmsMessage);
    const costPerSeg = gatewayStatus?.costPerSmsUgx || 35;

    const wantsSmsMode = ['sms_only', 'sms_whatsapp', 'both', 'all_channels'].includes(dispatchMode);
    const wantsWaMode = ['whatsapp_only', 'sms_whatsapp', 'all_channels'].includes(dispatchMode);
    const wantsAppMode = ['app_only', 'both', 'all_channels'].includes(dispatchMode);

    let consentedCount = 0;
    let smsEligible = 0;
    let whatsappEligible = 0;
    let appEligible = 0;
    let featurePhoneCount = 0;
    let smartphoneCount = 0;
    let mtnCount = 0;
    let airtelCount = 0;
    let invalidCount = 0;
    let optedOutCount = 0;
    let filteredCategoryCount = 0;
    let duplicateWarningCount = 0;

    for (const r of matched) {
      const phoneType = r.phoneType || 'smartphone';
      if (phoneType === 'feature_phone') featurePhoneCount++;
      else smartphoneCount++;

      const prefs = r.jobAlertPreferences || {
        enabled: true,
        consentGiven: true,
        preferredChannel: phoneType === 'feature_phone' ? 'sms_only' : 'auto',
        optedOutSms: false,
        jobTypes: [],
        preferredSubCounties: [],
        updatedAt: '',
      };

      const hasConsent = prefs.enabled !== false && prefs.consentGiven !== false && prefs.preferredChannel !== 'none';
      const matchesJobType =
        !respectJobTypeFilter || !selectedJob || !prefs.jobTypes?.length || prefs.jobTypes.includes(selectedJob.type);

      if (!hasConsent) {
        optedOutCount++;
        continue;
      }
      consentedCount++;

      if (!matchesJobType) {
        filteredCategoryCount++;
        continue;
      }

      const smsCheck = validateUgandaPhone(r.phone);
      const waCheck = validateUgandaPhone(r.whatsappNumber || r.phone);

      // Check existing non-failed deliveries in SQLite ledger for duplicate guard preview
      const alreadySms = selectedJob
        ? deliveries.some(
            (d) =>
              d.jobId === selectedJob.id &&
              d.riderId === r.id &&
              d.channel === 'sms' &&
              ['pending', 'queued', 'sent', 'delivered'].includes(d.status)
          )
        : false;
      const alreadyWa = selectedJob
        ? deliveries.some(
            (d) =>
              d.jobId === selectedJob.id &&
              d.riderId === r.id &&
              d.channel === 'whatsapp' &&
              ['pending', 'queued', 'sent', 'delivered'].includes(d.status)
          )
        : false;

      if (wantsAppMode && phoneType === 'smartphone' && !['sms_only', 'whatsapp_only', 'sms_whatsapp'].includes(prefs.preferredChannel)) {
        appEligible++;
      }

      if (wantsSmsMode) {
        if (prefs.optedOutSms) {
          optedOutCount++;
        } else if (alreadySms) {
          duplicateWarningCount++;
        } else if (prefs.preferredChannel !== 'whatsapp_only' && prefs.preferredChannel !== 'app_only') {
          if (!smsCheck.isValid) invalidCount++;
          else {
            smsEligible++;
            if (smsCheck.network === 'MTN') mtnCount++;
            else if (smsCheck.network === 'Airtel') airtelCount++;
          }
        }
      }

      if (wantsWaMode) {
        if (alreadyWa) {
          duplicateWarningCount++;
        } else if (prefs.preferredChannel !== 'sms_only' && prefs.preferredChannel !== 'app_only') {
          if (!waCheck.isValid) invalidCount++;
          else whatsappEligible++;
        }
      }
    }

    const estimatedCostUgx = smsEligible * Math.max(1, seg.segments) * costPerSeg;

    return {
      matchedCount: matched.length,
      matchedRiders: matched,
      scopeDetails,
      seg,
      consentedCount,
      smsEligible,
      whatsappEligible,
      appEligible,
      featurePhoneCount,
      smartphoneCount,
      mtnCount,
      airtelCount,
      invalidCount,
      optedOutCount,
      filteredCategoryCount,
      duplicateWarningCount,
      estimatedCostUgx,
      costPerSeg,
    };
  }, [
    riders,
    recipientScope,
    selectedDistricts,
    selectedVillages,
    selectedStageIds,
    selectedRiderIds,
    customSmsMessage,
    dispatchMode,
    respectJobTypeFilter,
    selectedJob,
    gatewayStatus,
    deliveries,
  ]);

  const previewSampleRider = useMemo(() => {
    return (
      riders.find((r) => r.id === previewRiderId) ||
      previewStats.matchedRiders[0] ||
      riders[0]
    );
  }, [riders, previewRiderId, previewStats.matchedRiders]);

  const renderedWhatsappPreview = useMemo(() => {
    const name = previewSampleRider?.fullName || 'Kato Moses';
    if (customWhatsappMessage.trim()) {
      return customWhatsappMessage.replace(/\[Rider Name\]/g, name);
    }
    return selectedJob ? formatJobWhatsAppTemplate(selectedJob, name, appOrigin) : '';
  }, [customWhatsappMessage, previewSampleRider, selectedJob, appOrigin]);

  // Execute Multi-Channel Broadcast via SQLite Queue
  const executeBroadcast = async (
    targetJob: BodaJob,
    mode: JobAlertDispatchMode,
    scope: SmsRecipientScope,
    opts?: {
      districtsOverride?: string[];
      smsOverride?: string;
      whatsappOverride?: string;
    }
  ) => {
    setDispatching(true);
    setBroadcastFeedback(null);

    const smsText = (opts?.smsOverride || customSmsMessage || formatJobSmsTemplate(targetJob, appOrigin)).trim();
    const waText = (opts?.whatsappOverride || customWhatsappMessage || formatJobWhatsAppTemplate(targetJob, '[Rider Name]', appOrigin)).trim();
    const { matched } = resolveTargets(scope, { districts: opts?.districtsOverride });
    const matchedIds = matched.map((m) => m.id);

    // Deliver local in-app notifications immediately if in_app is part of mode
    if (mode === 'app_only' || mode === 'both' || mode === 'all_channels') {
      storage.dispatchInAppJobNotifications(targetJob, matchedIds, mode);
    }

    if (mode === 'none') {
      setBroadcastFeedback({
        backendReachable: true,
        hasUnconfiguredWarning: false,
        message: 'Job published cleanly without broadcasting SMS, WhatsApp, or App alerts.',
      });
      setDispatching(false);
      return;
    }

    try {
      const resp = await fetch('/api/job-notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-name': adminName,
          ...ADMIN_AUTH_HEADERS,
        },
        body: JSON.stringify({
          job: targetJob,
          dispatchMode: mode,
          recipientScope: scope,
          selectedDistricts: opts?.districtsOverride ?? selectedDistricts,
          selectedVillages,
          selectedStageIds,
          selectedRiderIds,
          customSmsMessage: smsText,
          customWhatsappMessage: waText,
          adminName,
          respectJobTypeFilter,
          ridersSnapshot: storage.getRiders(),
        }),
      });

      const ct = resp.headers.get('content-type') || '';
      if (resp.ok && ct.includes('application/json')) {
        const data = (await resp.json()) as {
          success: boolean;
          queued: boolean;
          broadcast?: JobBroadcastCampaign;
          stats?: JobNotificationDashboardStats;
          gatewayStatus?: MessagingGatewayStatus;
        };

        if (data.stats) setDashboardStats(data.stats);
        if (data.gatewayStatus) {
          setCombinedGateway(data.gatewayStatus);
          setGatewayStatus({ ...data.gatewayStatus.sms, backendReachable: true });
        }

        const smsNotReady = Boolean(
          ['sms_only', 'sms_whatsapp', 'both', 'all_channels'].includes(mode) &&
            !data.gatewayStatus?.sms?.configured
        );
        const waNotReady = Boolean(
          ['whatsapp_only', 'sms_whatsapp', 'all_channels'].includes(mode) &&
            !data.gatewayStatus?.whatsapp?.configured
        );

        setBroadcastFeedback({
          broadcast: data.broadcast,
          backendReachable: true,
          hasUnconfiguredWarning: smsNotReady || waNotReady,
          message: data.broadcast
            ? `Broadcast ${data.broadcast.id} queued (${data.broadcast.totalTargetedRiders} riders targeted, ${data.broadcast.skippedDuplicateCount} duplicate guards enforced).`
            : 'Broadcast processed.',
        });

        await fetchGatewayAndDashboardState(true);
        setTimeout(() => void fetchGatewayAndDashboardState(true), 600);
        setDispatching(false);
        return;
      }
    } catch {
      // Fallback below if static host cannot reach Express backend
    }

    setBroadcastFeedback({
      backendReachable: false,
      hasUnconfiguredWarning: true,
      message:
        'Backend Broadcast Queue (/api/job-notifications/broadcast) is unreachable in static-only preview. No external SMS or WhatsApp messages were simulated.',
    });
    setDispatching(false);
  };

  // Retry Individual Delivery Row or Broadcast Failures
  const handleRetryDeliveries = async (params: { deliveryIds?: string[]; broadcastId?: string; label: string }) => {
    const targetKey = params.broadcastId || params.deliveryIds?.[0] || 'all';
    setRetryingTarget(targetKey);
    setRetryFeedback(null);
    try {
      const resp = await fetch('/api/job-notifications/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-name': adminName,
          ...ADMIN_AUTH_HEADERS,
        },
        body: JSON.stringify({
          deliveryIds: params.deliveryIds,
          broadcastId: params.broadcastId,
        }),
      });
      const json = (await resp.json()) as { success?: boolean; requeuedCount?: number; error?: string };
      if (!resp.ok) {
        setRetryFeedback({ type: 'error', text: json.error || `Retry failed for ${params.label}.` });
      } else {
        setRetryFeedback({
          type: 'success',
          text: `Re-queued ${json.requeuedCount ?? 0} notification(s) for ${params.label}. Refreshing delivery states...`,
        });
        await fetchGatewayAndDashboardState(true);
        setTimeout(() => void fetchGatewayAndDashboardState(true), 800);
      }
    } catch {
      setRetryFeedback({ type: 'error', text: 'Unable to reach /api/job-notifications/retry endpoint.' });
    } finally {
      setRetryingTarget(null);
    }
  };

  // Save or Update Job
  const resetJobForm = () => {
    setEditingJobId(null);
    setFormTitle('');
    setFormEmployerName('');
    setFormCompany('');
    setFormEmployerPhone('+256 772 ');
    setFormDistrict('Luweero');
    setFormSubCounty('Kikyusa');
    setFormVillage('Kikyusa Central');
    setFormPickup('');
    setFormDelivery('');
    setFormDistance('12');
    setFormType('produce_transport');
    setFormPayAmount('30000');
    setFormSalaryDisplay('');
    setFormFrequency('per_trip');
    setFormBikeReq('any');
    setFormDeadline(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setFormDescription('');
    setFormRequirements('Valid Class A driving permit, helmet, and verified BodaCare Rider ID.');
    setFormInstructions('Apply inside BodaCare app or call the employer directly quoting your BodaCare Rider ID.');
    setFormVerifyNow(true);
    setFormAutoAlertMode('sms_whatsapp');
  };

  const openEditJob = (job: BodaJob) => {
    setEditingJobId(job.id);
    setFormTitle(job.title);
    setFormEmployerName(job.employerName);
    setFormCompany(job.employerCompany);
    setFormEmployerPhone(job.employerPhone);
    setFormDistrict(job.district || 'Luweero');
    setFormSubCounty(job.subCounty);
    setFormVillage(job.village || '');
    setFormPickup(job.pickupLocation);
    setFormDelivery(job.deliveryLocation);
    setFormDistance(String(job.distanceKm || 10));
    setFormType(job.type);
    setFormPayAmount(String(job.paymentAmountUgx));
    setFormSalaryDisplay(job.salaryDisplay || '');
    setFormFrequency(job.paymentFrequency);
    setFormBikeReq(job.requiredMotorcycleType);
    setFormDeadline(job.deadline);
    setFormDescription(job.description);
    setFormRequirements(job.requirements || '');
    setFormInstructions(job.applicationInstructions || '');
    setFormVerifyNow(job.adminApproved);
    setFormAutoAlertMode('none');
    setShowJobForm(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const pay = parseInt(formPayAmount, 10);
    if (!formTitle.trim() || !formEmployerPhone.trim() || isNaN(pay) || pay <= 0) {
      setJobFeedback({ type: 'error', text: 'Please fill in job title, valid employer phone, and UGX payment amount.' });
      return;
    }

    const existing = editingJobId ? jobs.find((j) => j.id === editingJobId) : undefined;
    const nowIso = new Date().toISOString();

    const savedJob: BodaJob = {
      id: existing?.id || `job-${Date.now()}`,
      employerId: existing?.employerId || 'emp-admin-created',
      employerName: formEmployerName.trim() || 'Verified Employer',
      employerPhone: formEmployerPhone.trim(),
      employerCompany: formCompany.trim() || formEmployerName.trim() || 'Luweero Employer',
      title: formTitle.trim(),
      type: formType,
      description: formDescription.trim(),
      pickupLocation: formPickup.trim() || `${formVillage}, ${formSubCounty}`,
      deliveryLocation: formDelivery.trim() || formSubCounty,
      district: formDistrict.trim() || 'Luweero',
      subCounty: formSubCounty,
      village: formVillage.trim() || undefined,
      distanceKm: parseFloat(formDistance) || 10,
      paymentAmountUgx: pay,
      salaryDisplay: formSalaryDisplay.trim() || undefined,
      paymentFrequency: formFrequency,
      requiredMotorcycleType: formBikeReq,
      status: existing?.status || 'open',
      postedDate: existing?.postedDate || nowIso.split('T')[0],
      deadline: formDeadline,
      applicationsCount: existing?.applicationsCount ?? 0,
      adminApproved: formVerifyNow,
      verifiedBy: formVerifyNow ? adminName : undefined,
      verifiedAt: formVerifyNow ? existing?.verifiedAt || nowIso : undefined,
      requirements: formRequirements.trim() || undefined,
      applicationInstructions: formInstructions.trim() || undefined,
      notificationMode: formVerifyNow ? formAutoAlertMode : 'none',
    };

    storage.saveJob(savedJob);
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedJob),
    }).catch(() => {});

    const updatedList = storage.getJobs();
    syncJobsState(updatedList);
    setSelectedJobId(savedJob.id);

    const smsDraft = formatJobSmsTemplate(savedJob, appOrigin);
    const waDraft = formatJobWhatsAppTemplate(savedJob, '[Rider Name]', appOrigin);

    if (formVerifyNow && formAutoAlertMode !== 'none') {
      setShowJobForm(false);
      setRecipientScope(formAutoScope);
      setDispatchMode(formAutoAlertMode);
      setCustomSmsMessage(smsDraft);
      setCustomWhatsappMessage(waDraft);
      setSubTab('dispatch');
      await executeBroadcast(savedJob, formAutoAlertMode, formAutoScope, {
        smsOverride: smsDraft,
        whatsappOverride: waDraft,
      });
      resetJobForm();
      return;
    }

    setJobFeedback({
      type: 'success',
      text: editingJobId
        ? 'Job opportunity updated successfully.'
        : formVerifyNow
        ? 'Verified job saved without broadcasting notifications yet.'
        : 'Job saved as unverified draft pending verification.',
    });
    setShowJobForm(false);
    resetJobForm();
  };

  const handleRemoveExpiredJobs = async () => {
    const expired = jobs.filter((j) => isJobExpired(j));
    if (expired.length === 0) return;
    if (!confirm(`Remove ${expired.length} expired job(s) whose application deadline has passed?`)) return;

    for (const j of expired) {
      storage.deleteJob(j.id);
      await fetch(`/api/jobs/${encodeURIComponent(j.id)}`, {
        method: 'DELETE',
        headers: ADMIN_AUTH_HEADERS,
      }).catch(() => {});
    }
    syncJobsState(storage.getJobs());
    setJobFeedback({ type: 'success', text: `Removed ${expired.length} expired job listing(s).` });
  };

  const handleToggleVerifyJob = async (job: BodaJob) => {
    const next = !job.adminApproved;
    storage.verifyJob(job.id, next, adminName);
    await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...ADMIN_AUTH_HEADERS },
      body: JSON.stringify({
        adminApproved: next,
        verifiedBy: next ? adminName : undefined,
        verifiedAt: next ? new Date().toISOString() : undefined,
      }),
    }).catch(() => {});
    syncJobsState(storage.getJobs());
  };

  const handleAdminPrefUpdate = async (
    rider: RiderProfile,
    updates: {
      phoneType?: 'smartphone' | 'feature_phone';
      preferredChannel?: RiderJobAlertPreferences['preferredChannel'];
      consentGiven?: boolean;
      optedOutSms?: boolean;
      village?: string;
      subCounty?: string;
      district?: string;
    }
  ) => {
    if (updates.village !== undefined || updates.subCounty !== undefined || updates.district !== undefined) {
      storage.saveRider({
        ...rider,
        village: updates.village ?? rider.village,
        subCounty: updates.subCounty ?? rider.subCounty,
        district: updates.district ?? rider.district,
      });
    }

    storage.updateRiderJobPreferences(
      rider.id,
      {
        consentGiven: updates.consentGiven ?? rider.jobAlertPreferences?.consentGiven,
        enabled: updates.consentGiven !== undefined ? updates.consentGiven : rider.jobAlertPreferences?.enabled,
        optedOutSms: updates.optedOutSms ?? rider.jobAlertPreferences?.optedOutSms,
        preferredChannel:
          updates.preferredChannel ||
          (updates.phoneType === 'feature_phone'
            ? 'sms_only'
            : rider.jobAlertPreferences?.preferredChannel === 'sms_only' && updates.phoneType === 'smartphone'
            ? 'sms_whatsapp'
            : rider.jobAlertPreferences?.preferredChannel),
      },
      updates.phoneType,
      adminName
    );
    setRiders(storage.getRiders());

    await fetch(`/api/riders/${encodeURIComponent(rider.id)}/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-name': adminName,
        ...ADMIN_AUTH_HEADERS,
      },
      body: JSON.stringify(updates),
    }).catch(() => {});
  };

  // Filtered jobs & delivery rows
  const displayedJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (jobFilter === 'verified') return j.adminApproved && !isJobExpired(j);
      if (jobFilter === 'unverified') return !j.adminApproved;
      if (jobFilter === 'expired') return isJobExpired(j);
      return true;
    });
  }, [jobs, jobFilter]);

  const expiredCount = useMemo(() => jobs.filter((j) => isJobExpired(j)).length, [jobs]);

  const filteredDeliveries = useMemo(() => {
    const q = deliverySearch.trim().toLowerCase();
    return deliveries.filter((d) => {
      if (deliveryJobFilter !== 'all' && d.jobId !== deliveryJobFilter) return false;
      if (deliveryChannelFilter !== 'all' && d.channel !== deliveryChannelFilter) return false;
      if (deliveryStatusFilter !== 'all' && d.status !== deliveryStatusFilter) return false;
      if (
        q &&
        !d.riderName.toLowerCase().includes(q) &&
        !d.targetPhone.toLowerCase().includes(q) &&
        !d.jobTitle.toLowerCase().includes(q) &&
        !(d.errorReason || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [deliveries, deliveryJobFilter, deliveryChannelFilter, deliveryStatusFilter, deliverySearch]);

  const filteredPrefRiders = useMemo(() => {
    return riders.filter((r) => {
      const q = prefSearch.toLowerCase();
      const matchesSearch =
        !q ||
        r.fullName.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        (r.whatsappNumber || '').includes(q) ||
        (r.district || '').toLowerCase().includes(q) ||
        (r.village || '').toLowerCase().includes(q) ||
        r.stageName.toLowerCase().includes(q);
      const isFeature = (r.phoneType || 'smartphone') === 'feature_phone';
      const isOptedOut =
        Boolean(r.jobAlertPreferences?.optedOutSms) || r.jobAlertPreferences?.consentGiven === false;
      const hasWa = !isFeature && validateUgandaPhone(r.whatsappNumber || r.phone).isValid;

      if (prefFilterType === 'smartphone') return matchesSearch && !isFeature;
      if (prefFilterType === 'feature_phone') return matchesSearch && isFeature;
      if (prefFilterType === 'opted_out') return matchesSearch && isOptedOut;
      if (prefFilterType === 'whatsapp_ready') return matchesSearch && hasWa;
      return matchesSearch;
    });
  }, [riders, prefSearch, prefFilterType]);

  // Status badge helper
  const renderDeliveryStatusBadge = (status: SmsDeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'sent':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'pending':
      case 'queued':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'skipped_duplicate':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'opted_out':
      case 'skipped_preference':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Hub Header & Multi-Channel Status Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                <ShieldCheck className="w-3 h-3" />
                <span>Super Admin Exclusive</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Automated SMS + WhatsApp Business Cloud + Smartphone In-App Broadcasting
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-500" />
              <span>Advanced Job Notification &amp; Broadcasting System</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setSubTab('gateway')}
              className={`px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                gatewayStatus?.configured
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>SMS: {gatewayStatus?.configured ? 'Ready' : 'Setup Needed'}</span>
              </div>
              <span className="text-[10px] opacity-80 block">
                {gatewayStatus?.balanceText || 'Africa\'s Talking UG'}
              </span>
            </button>

            <button
              onClick={() => setSubTab('gateway')}
              className={`px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                combinedGateway?.whatsapp?.configured
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp: {combinedGateway?.whatsapp?.configured ? 'Ready' : 'Setup Needed'}</span>
              </div>
              <span className="text-[10px] opacity-80 block">
                Meta Cloud API ({combinedGateway?.whatsapp?.apiVersion || 'v21.0'})
              </span>
            </button>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSubTab('jobs')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'jobs'
                ? 'bg-[#0B192C] text-amber-400 shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>1. Jobs &amp; Auto-Publish ({jobs.length})</span>
          </button>

          <button
            onClick={() => setSubTab('dispatch')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'dispatch'
                ? 'bg-[#0B192C] text-amber-400 shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>2. Broadcast Console</span>
          </button>

          <button
            onClick={() => setSubTab('history')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'history'
                ? 'bg-[#0B192C] text-amber-400 shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>
              3. Notification Dashboard &amp; Logs ({dashboardStats?.totalBroadcasts ?? broadcasts.length})
            </span>
          </button>

          <button
            onClick={() => setSubTab('preferences')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'preferences'
                ? 'bg-[#0B192C] text-amber-400 shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>4. Rider Contacts &amp; Consent ({riders.length})</span>
          </button>

          <button
            onClick={() => setSubTab('gateway')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'gateway'
                ? 'bg-[#0B192C] text-amber-400 shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>5. SMS &amp; WhatsApp Gateways</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: ADMIN JOB MANAGEMENT & AUTO-BROADCAST PUBLISH              */}
      {/* ===================================================================== */}
      {subTab === 'jobs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'verified', 'unverified', 'expired'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setJobFilter(f)}
                  className={`px-3 py-1.5 rounded-lg font-bold capitalize cursor-pointer ${
                    jobFilter === f ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f} {f === 'expired' && expiredCount > 0 ? `(${expiredCount})` : ''}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {expiredCount > 0 && (
                <button
                  onClick={handleRemoveExpiredJobs}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Expired ({expiredCount})</span>
                </button>
              )}

              <button
                onClick={() => {
                  resetJobForm();
                  setShowJobForm((prev) => !prev);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{showJobForm ? 'Hide Job Form' : 'Create & Publish Job'}</span>
              </button>
            </div>
          </div>

          {jobFeedback && (
            <div
              className={`p-3 rounded-xl font-semibold flex items-center justify-between gap-2 ${
                jobFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <span>{jobFeedback.text}</span>
              <button onClick={() => setJobFeedback(null)} className="text-xs underline cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Create / Edit Job Modal/Panel */}
          {showJobForm && (
            <form
              onSubmit={handleSaveJob}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900">
                  {editingJobId ? 'Edit Job Opportunity' : 'Create & Verify New Boda Job Opportunity'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowJobForm(false);
                    resetJobForm();
                  }}
                  className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daily Fresh Milk Delivery — Kikyusa to Luweero"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Job Category *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as BodaJob['type'])}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  >
                    {JOB_TYPES.map((jt) => (
                      <option key={jt.value} value={jt.value}>
                        {jt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employer / Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nsubuga Henry"
                    value={formEmployerName}
                    onChange={(e) => setFormEmployerName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company / Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kikyusa Coffee Cooperative"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employer Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+256 772 000 000"
                    value={formEmployerPhone}
                    onChange={(e) => setFormEmployerPhone(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">District *</label>
                  <select
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  >
                    {allDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sub-County *</label>
                  <select
                    value={formSubCounty}
                    onChange={(e) => setFormSubCounty(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  >
                    {SUB_COUNTIES.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Village / Trading Centre</label>
                  <input
                    type="text"
                    placeholder="e.g. Kalagala, Kikyusa Central"
                    value={formVillage}
                    onChange={(e) => setFormVillage(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Application Deadline *</label>
                  <input
                    type="date"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pickup Point</label>
                  <input
                    type="text"
                    placeholder="e.g. Kikyusa Main Stage"
                    value={formPickup}
                    onChange={(e) => setFormPickup(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delivery / Work Destination</label>
                  <input
                    type="text"
                    placeholder="e.g. Luweero Central Market"
                    value={formDelivery}
                    onChange={(e) => setFormDelivery(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Salary / Pay (UGX) *</label>
                    <input
                      type="number"
                      required
                      value={formPayAmount}
                      onChange={(e) => setFormPayAmount(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pay Cycle</label>
                    <select
                      value={formFrequency}
                      onChange={(e) => setFormFrequency(e.target.value as BodaJob['paymentFrequency'])}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                    >
                      <option value="per_trip">Per Trip</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="one_time">One-Time</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Salary Display Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UGX 140,000/week + fuel allowance"
                    value={formSalaryDisplay}
                    onChange={(e) => setFormSalaryDisplay(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Motorcycle Type Requirement</label>
                  <select
                    value={formBikeReq}
                    onChange={(e) => setFormBikeReq(e.target.value as BodaJob['requiredMotorcycleType'])}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  >
                    <option value="any">Any Verified Motorcycle (Electric or Petrol)</option>
                    <option value="electric">Electric E-Boda Only</option>
                    <option value="petrol">Petrol Motorcycle Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Job Description *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe route, cargo, shift hours..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Application Requirements</label>
                  <textarea
                    rows={2}
                    placeholder="Permits, carrier, helmet, experience..."
                    value={formRequirements}
                    onChange={(e) => setFormRequirements(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Application Instructions (Included for Riders)</label>
                <input
                  type="text"
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              {/* Admin Notification Selection Panel (on Publish) */}
              <div className="p-4 rounded-xl bg-white border border-amber-300 space-y-3">
                <label className="flex items-center gap-2 font-extrabold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formVerifyNow}
                    onChange={(e) => setFormVerifyNow(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Verify Employer &amp; Approve Job Opportunity for Publishing</span>
                </label>

                {formVerifyNow && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <p className="font-bold text-slate-800">
                      Automatic Broadcast Channel Selection (on Publish):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'sms_whatsapp', label: 'Both SMS & WhatsApp', sub: 'Full carrier SMS + personalized WhatsApp cards' },
                          { id: 'sms_only', label: 'SMS only', sub: 'Direct MTN/Airtel SMS for all phones' },
                          { id: 'whatsapp_only', label: 'WhatsApp only', sub: 'Personalized WhatsApp Business alert' },
                          { id: 'all_channels', label: 'SMS, WhatsApp & App Alerts', sub: 'Every channel + in-app deep link' },
                          { id: 'app_only', label: 'In-App Notifications Only', sub: 'Smartphone app feed notifications only' },
                          { id: 'none', label: 'No notification', sub: 'Publish silently without broadcasting' },
                        ] as const
                      ).map((opt) => (
                        <label
                          key={opt.id}
                          className={`p-2.5 rounded-xl border cursor-pointer ${
                            formAutoAlertMode === opt.id
                              ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <input
                              type="radio"
                              name="autoAlertMode"
                              checked={formAutoAlertMode === opt.id}
                              onChange={() => setFormAutoAlertMode(opt.id)}
                            />
                            <span>{opt.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block pl-5 mt-0.5">{opt.sub}</span>
                        </label>
                      ))}
                    </div>

                    {formAutoAlertMode !== 'none' && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="font-bold text-slate-700">Target Riders:</span>
                        {(
                          [
                            { id: 'all', label: 'All Registered Riders' },
                            { id: 'kikyusa', label: 'Riders in Kikyusa' },
                            { id: 'luweero', label: 'Riders in Luweero' },
                            { id: 'districts', label: 'Selected Districts' },
                          ] as const
                        ).map((sc) => (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() => setFormAutoScope(sc.id)}
                            className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                              formAutoScope === sc.id
                                ? 'bg-[#0B192C] text-amber-400'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sc.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJobForm(false);
                    resetJobForm();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow cursor-pointer"
                >
                  {editingJobId
                    ? 'Save Job Updates'
                    : formVerifyNow && formAutoAlertMode !== 'none'
                    ? 'Publish Verified Job & Auto-Broadcast'
                    : 'Save Job Opportunity'}
                </button>
              </div>
            </form>
          )}

          {/* Jobs List */}
          <div className="divide-y divide-slate-100">
            {displayedJobs.length === 0 ? (
              <div className="py-10 text-center text-slate-400">No jobs in this filter view.</div>
            ) : (
              displayedJobs.map((job) => {
                const expired = isJobExpired(job);
                const apps = storage.getJobApplications(job.id);
                return (
                  <div key={job.id} className="py-4 space-y-2.5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm">{job.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              job.adminApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {job.adminApproved ? '✓ Verified' : 'Unverified'}
                          </span>
                          {expired && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 uppercase">
                              Expired ({job.deadline})
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                            {job.village ? `${job.village}, ` : ''}
                            {job.subCounty} · {job.district || 'Luweero'}
                          </span>
                        </div>

                        <p className="text-slate-600">
                          <strong>{job.employerCompany}</strong> ({job.employerName}) •{' '}
                          <span className="font-mono font-semibold text-slate-800">{job.employerPhone}</span> • Pay:{' '}
                          <strong className="text-emerald-700 font-mono">
                            {job.salaryDisplay || `${formatUgx(job.paymentAmountUgx)} (${job.paymentFrequency.replace('_', ' ')})`}
                          </strong>
                        </p>

                        <p className="text-slate-500">{job.description}</p>
                        {job.requirements && (
                          <p className="text-[11px] text-slate-600">
                            <strong>Requirements:</strong> {job.requirements}
                          </p>
                        )}
                        {job.applicationInstructions && (
                          <p className="text-[11px] text-slate-600">
                            <strong>How to Apply:</strong> {job.applicationInstructions}
                          </p>
                        )}
                        {job.lastAlertSentAt && (
                          <p className="text-[10px] text-sky-700 font-semibold">
                            Last broadcast: {new Date(job.lastAlertSentAt).toLocaleString()} ({job.notificationMode})
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleVerifyJob(job)}
                          className={`px-2.5 py-1.5 rounded-lg font-bold cursor-pointer ${
                            job.adminApproved
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500'
                          }`}
                        >
                          {job.adminApproved ? 'Unverify' : 'Verify Job'}
                        </button>

                        {job.adminApproved && (
                          <button
                            onClick={() => {
                              setSelectedJobId(job.id);
                              setCustomSmsMessage(formatJobSmsTemplate(job, appOrigin));
                              setCustomWhatsappMessage(formatJobWhatsAppTemplate(job, '[Rider Name]', appOrigin));
                              setSubTab('dispatch');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Broadcast Alert</span>
                          </button>
                        )}

                        <button
                          onClick={() => openEditJob(job)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Edit Job"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            storage.updateJobStatus(job.id, job.status === 'open' ? 'completed' : 'open');
                            syncJobsState(storage.getJobs());
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                        >
                          {job.status === 'open' ? 'Close' : 'Reopen'}
                        </button>

                        <button
                          onClick={() => {
                            if (confirm('Delete this job opportunity?')) {
                              storage.deleteJob(job.id);
                              fetch(`/api/jobs/${encodeURIComponent(job.id)}`, {
                                method: 'DELETE',
                                headers: ADMIN_AUTH_HEADERS,
                              }).catch(() => {});
                              syncJobsState(storage.getJobs());
                            }
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Remove Job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {apps.length > 0 && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-slate-700">
                          Rider Applications ({apps.length})
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {apps.map((app) => (
                            <div
                              key={app.id}
                              className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-900">{app.riderName}</span>{' '}
                                <span className="text-slate-500 font-mono">({app.riderPhone})</span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                                {app.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: MULTI-CHANNEL JOB BROADCAST CONSOLE                        */}
      {/* ===================================================================== */}
      {subTab === 'dispatch' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left 2 cols: Job, Scope, Channel & Dual Templates */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  Automated Job Notification &amp; Broadcast Console
                </h4>
                <p className="text-slate-500">
                  Queued background dispatch across Africa&apos;s Talking SMS, Meta WhatsApp Cloud API, and BodaCare In-App feed with duplicate prevention.
                </p>
              </div>
            </div>

            {/* 1. Select Verified Job */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">1. Select Verified Job Opportunity</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id} disabled={!j.adminApproved}>
                    {j.adminApproved ? '✓ ' : '[UNVERIFIED] '}
                    {j.title} — {j.subCounty} ({formatUgx(j.paymentAmountUgx)})
                  </option>
                ))}
              </select>
              {selectedJob && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                  <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Direct Job Link included in alerts:</span>
                  <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-slate-800">
                    {buildJobDeepLink(selectedJob.id, appOrigin)}
                  </code>
                </div>
              )}
              {selectedJob && !selectedJob.adminApproved && (
                <p className="text-rose-600 font-bold">
                  This job must be verified in Tab 1 before broadcasting to riders.
                </p>
              )}
            </div>

            {/* 2. Recipient Group Selection */}
            <div className="space-y-2.5">
              <label className="block font-bold text-slate-800">2. Select Target Registered Riders</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'all', label: 'All Registered Riders' },
                    { id: 'districts', label: 'Selected Districts' },
                    { id: 'kikyusa', label: 'Riders in Kikyusa' },
                    { id: 'luweero', label: 'Riders in Luweero' },
                    { id: 'villages', label: 'Selected Villages' },
                    { id: 'stages', label: 'Selected Boda Stages' },
                    { id: 'individual', label: 'Individual Riders' },
                  ] as const
                ).map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setRecipientScope(sc.id)}
                    className={`p-2.5 rounded-xl border font-bold text-left transition-all cursor-pointer ${
                      recipientScope === sc.id
                        ? 'bg-[#0B192C] text-amber-400 border-[#0B192C] shadow'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              {recipientScope === 'districts' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 block">Select Target Districts:</span>
                  <div className="flex flex-wrap gap-2">
                    {allDistricts.map((d) => {
                      const active = selectedDistricts.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setSelectedDistricts((prev) =>
                              active ? prev.filter((x) => x !== d) : [...prev, d]
                            )
                          }
                          className={`px-3 py-1 rounded-lg font-bold border cursor-pointer ${
                            active
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {active ? `✓ ${d}` : d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {recipientScope === 'villages' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 block">Select Target Villages:</span>
                  <div className="flex flex-wrap gap-2">
                    {allVillages.map((v) => {
                      const active = selectedVillages.includes(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() =>
                            setSelectedVillages((prev) =>
                              active ? prev.filter((x) => x !== v) : [...prev, v]
                            )
                          }
                          className={`px-3 py-1 rounded-lg font-bold border cursor-pointer ${
                            active
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {active ? `✓ ${v}` : v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {recipientScope === 'stages' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 block">Select Target Boda Stages:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stages.map((st) => {
                      const active = selectedStageIds.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                            active ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() =>
                              setSelectedStageIds((prev) =>
                                active ? prev.filter((x) => x !== st.id) : [...prev, st.id]
                              )
                            }
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{st.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {st.subCounty}, {st.district}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {recipientScope === 'individual' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-700">Pick Individual Riders:</span>
                    <input
                      type="text"
                      placeholder="Filter rider name or phone..."
                      value={riderPickerSearch}
                      onChange={(e) => setRiderPickerSearch(e.target.value)}
                      className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs w-52"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {riders
                      .filter(
                        (r) =>
                          r.fullName.toLowerCase().includes(riderPickerSearch.toLowerCase()) ||
                          r.phone.includes(riderPickerSearch)
                      )
                      .map((r) => {
                        const checked = selectedRiderIds.includes(r.id);
                        const ph = validateUgandaPhone(r.phone);
                        return (
                          <label
                            key={r.id}
                            className={`p-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer ${
                              checked ? 'bg-amber-50 border-amber-400' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedRiderIds((prev) =>
                                    checked ? prev.filter((x) => x !== r.id) : [...prev, r.id]
                                  )
                                }
                              />
                              <div>
                                <span className="font-bold text-slate-900 block">{r.fullName}</span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {r.phone} · {r.whatsappNumber ? `WA ${r.whatsappNumber}` : r.phoneType === 'feature_phone' ? 'Button Phone' : 'Smartphone'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {ph.network}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Admin Notification Controls (Channel Selection) */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-800">3. Admin Notification Channel Selection</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(
                  [
                    { id: 'sms_only', label: 'SMS only', desc: 'Africa\'s Talking MTN & Airtel SMS' },
                    { id: 'whatsapp_only', label: 'WhatsApp only', desc: 'Meta Cloud API WhatsApp alert' },
                    { id: 'sms_whatsapp', label: 'Both SMS & WhatsApp', desc: 'Direct SMS + WhatsApp card' },
                    { id: 'all_channels', label: 'SMS, WhatsApp & In-App', desc: 'Full omnichannel coverage' },
                    { id: 'app_only', label: 'In-App Notifications Only', desc: 'Instant app notification drawer' },
                    { id: 'none', label: 'No notification (Silent)', desc: 'Save without broadcasting' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDispatchMode(m.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      dispatchMode === m.id
                        ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <p className="font-bold text-slate-900">{m.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-slate-700 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={respectJobTypeFilter}
                  onChange={(e) => setRespectJobTypeFilter(e.target.checked)}
                />
                <span>
                  Enforce rider category preferences, channel opt-outs, notification consent, &amp; duplicate guards
                </span>
              </label>
            </div>

            {/* 4. Exact SMS & Personalized WhatsApp Message Preview / Editors */}
            {dispatchMode !== 'app_only' && dispatchMode !== 'none' && (
              <div className="space-y-4">
                {['sms_only', 'sms_whatsapp', 'both', 'all_channels'].includes(dispatchMode) && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                        <span>4A. SMS Message Template (Plain-Text)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-600">
                          {previewStats.seg.length} chars · {previewStats.seg.segments} segment(s) · {previewStats.seg.encoding}
                        </span>
                        {selectedJob && (
                          <button
                            type="button"
                            onClick={() => setCustomSmsMessage(formatJobSmsTemplate(selectedJob, appOrigin))}
                            className="text-[10px] underline text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Reset Template
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      rows={6}
                      value={customSmsMessage}
                      onChange={(e) => setCustomSmsMessage(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                )}

                {['whatsapp_only', 'sms_whatsapp', 'all_channels'].includes(dispatchMode) && (
                  <div className="space-y-2 p-4 rounded-xl bg-emerald-50/40 border border-emerald-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="font-bold text-slate-900 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>4B. WhatsApp Message Template (Personalized with [Rider Name])</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={previewRiderId}
                          onChange={(e) => setPreviewRiderId(e.target.value)}
                          className="p-1 bg-white border border-slate-300 rounded-lg text-[11px]"
                        >
                          {riders.map((r) => (
                            <option key={r.id} value={r.id}>
                              Preview as: {r.fullName}
                            </option>
                          ))}
                        </select>
                        {selectedJob && (
                          <button
                            type="button"
                            onClick={() =>
                              setCustomWhatsappMessage(
                                formatJobWhatsAppTemplate(selectedJob, '[Rider Name]', appOrigin)
                              )
                            }
                            className="text-[10px] underline text-emerald-700 hover:text-emerald-950 cursor-pointer"
                          >
                            Reset Template
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Editable Template ([Rider Name] auto-replaced per rider)
                        </span>
                        <textarea
                          rows={10}
                          value={customWhatsappMessage}
                          onChange={(e) => setCustomWhatsappMessage(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                          Live WhatsApp Preview ({previewSampleRider?.fullName || 'Sample Rider'})
                        </span>
                        <pre className="p-3 bg-white border border-emerald-200 rounded-xl text-[11px] font-sans whitespace-pre-wrap text-slate-800 leading-relaxed">
                          {renderedWhatsappPreview}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Pre-Broadcast Validation, Duplicate Check & Queue Trigger */}
          <div className="space-y-4">
            <div className="bg-[#0B192C] text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
                  Pre-Broadcast Audience &amp; Guardrail Check
                </span>
                <h4 className="text-base font-extrabold mt-0.5">Confirm Before Broadcasting</h4>
              </div>

              <div className="space-y-2 text-xs bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Targeted Scope:</span>
                  <span className="font-bold text-white text-right">{previewStats.scopeDetails}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Consented Riders in Scope:</span>
                  <span className="font-bold text-emerald-400">
                    {previewStats.consentedCount} / {previewStats.matchedCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SMS Queue Eligible:</span>
                  <span className="font-bold text-amber-400">
                    {previewStats.smsEligible} ({previewStats.mtnCount} MTN, {previewStats.airtelCount} Airtel)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">WhatsApp Queue Eligible:</span>
                  <span className="font-bold text-emerald-400">{previewStats.whatsappEligible} riders</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">In-App Smartphone Alerts:</span>
                  <span className="font-bold text-sky-400">{previewStats.appEligible} riders</span>
                </div>
                {previewStats.duplicateWarningCount > 0 && (
                  <div className="flex justify-between text-indigo-300">
                    <span>Duplicate Guard Will Skip:</span>
                    <span className="font-bold">{previewStats.duplicateWarningCount} already sent</span>
                  </div>
                )}
                {previewStats.invalidCount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Invalid Phone Numbers:</span>
                    <span className="font-bold">{previewStats.invalidCount} flagged</span>
                  </div>
                )}
                {previewStats.optedOutCount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Opted-Out / No Consent:</span>
                    <span className="font-bold">{previewStats.optedOutCount} excluded</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-slate-300 font-bold">Estimated SMS Cost:</span>
                  <span className="text-lg font-mono font-black text-amber-400">
                    {['app_only', 'whatsapp_only', 'none'].includes(dispatchMode)
                      ? 'UGX 0'
                      : formatUgx(previewStats.estimatedCostUgx)}
                  </span>
                </div>
              </div>

              {dispatchMode !== 'none' &&
                dispatchMode !== 'app_only' &&
                (!gatewayStatus?.configured || !combinedGateway?.whatsapp?.configured) && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-[11px] space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>External Gateway Credentials Check</span>
                    </p>
                    <p>
                      Any unconfigured channel (Africa&apos;s Talking SMS or Meta WhatsApp Cloud API) will honestly log deliveries as{' '}
                      <code className="font-mono">blocked_unconfigured</code> in the queue rather than simulating delivery.
                    </p>
                  </div>
                )}

              <button
                type="button"
                disabled={
                  dispatching ||
                  !selectedJob ||
                  !selectedJob.adminApproved ||
                  (dispatchMode !== 'none' && previewStats.matchedCount === 0)
                }
                onClick={() =>
                  selectedJob &&
                  executeBroadcast(selectedJob, dispatchMode, recipientScope, {
                    smsOverride: customSmsMessage,
                    whatsappOverride: customWhatsappMessage,
                  })
                }
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {dispatching
                    ? 'Enqueuing Broadcast...'
                    : dispatchMode === 'none'
                    ? 'Confirm Publish Without Notification'
                    : 'Confirm & Broadcast Job Alert'}
                </span>
              </button>
            </div>

            {broadcastFeedback && (
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  broadcastFeedback.hasUnconfiguredWarning || !broadcastFeedback.backendReachable
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}
              >
                <div className="flex items-start gap-2">
                  {broadcastFeedback.hasUnconfiguredWarning || !broadcastFeedback.backendReachable ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h5 className="font-extrabold text-sm">
                      {broadcastFeedback.broadcast
                        ? `Broadcast Queue State: ${broadcastFeedback.broadcast.queueState.toUpperCase()}`
                        : 'Broadcast Status'}
                    </h5>
                    <p className="text-xs">{broadcastFeedback.message}</p>
                    <button
                      type="button"
                      onClick={() => setSubTab('history')}
                      className="text-xs font-bold underline cursor-pointer text-slate-900"
                    >
                      Open Notification Dashboard &amp; Delivery Ledger →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: ADMIN NOTIFICATION MANAGEMENT DASHBOARD & RETRY LOGS       */}
      {/* ===================================================================== */}
      {subTab === 'history' && (
        <div className="space-y-4">
          {/* 6 Core Dashboard KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Registered Riders</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {dashboardStats?.totalRegisteredRiders ?? riders.length}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold">
                {dashboardStats?.consentedRidersCount ?? riders.length} consented
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total SMS Sent</span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {dashboardStats?.totalSmsSent ?? 0}
              </p>
              <span className="text-[10px] text-slate-500">Africa&apos;s Talking UG</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total WhatsApp Sent</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {dashboardStats?.totalWhatsappSent ?? 0}
              </p>
              <span className="text-[10px] text-slate-500">
                {dashboardStats?.whatsappEnabledRidersCount ?? 0} smartphone WA ready
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Successfully Delivered</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {dashboardStats?.successfullyDelivered ?? 0}
              </p>
              <span className="text-[10px] text-slate-500">
                Includes {dashboardStats?.totalInAppSent ?? 0} in-app
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Failed / Blocked</span>
              <p className="text-2xl font-black text-rose-600 mt-1">
                {dashboardStats?.failedOrBlocked ?? 0}
              </p>
              <span className="text-[10px] text-indigo-600 font-semibold">
                {dashboardStats?.skippedDuplicates ?? 0} duplicates prevented
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Pending in Queue</span>
              <p className="text-2xl font-black text-sky-600 mt-1">
                {dashboardStats?.pendingInQueue ?? 0}
              </p>
              <span className="text-[10px] text-slate-500">Background worker</span>
            </div>
          </div>

          {retryFeedback && (
            <div
              className={`p-3 rounded-xl border font-semibold flex items-center justify-between gap-2 ${
                retryFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span>{retryFeedback.text}</span>
              <button onClick={() => setRetryFeedback(null)} className="underline text-xs cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* Broadcast Queue Summary Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Broadcast Batches &amp; Background Delivery Queue
                </h4>
                <p className="text-[11px] text-slate-500">
                  Linked directly to verified job listings, timestamps, and duplicate prevention audits.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(dashboardStats?.failedOrBlocked ?? 0) > 0 && (
                  <button
                    onClick={() => handleRetryDeliveries({ label: 'all failed/blocked notifications' })}
                    disabled={retryingTarget === 'all'}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry All Failed</span>
                  </button>
                )}
                <button
                  onClick={() => void fetchGatewayAndDashboardState()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingGateway ? 'animate-spin' : ''}`} />
                  <span>Refresh Status</span>
                </button>
              </div>
            </div>

            {broadcasts.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                No omnichannel broadcasts dispatched yet. Use Tab 2 (Broadcast Console) to send job alerts.
              </div>
            ) : (
              <div className="space-y-2.5">
                {broadcasts.map((b) => {
                  const totalFail = b.smsFailedCount + b.whatsappFailedCount;
                  return (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{b.jobTitle}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              b.queueState === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}
                          >
                            {b.queueState}
                          </span>
                          {b.channels.map((ch) => (
                            <span
                              key={ch}
                              className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold uppercase"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {b.employerCompany} · Sent by <strong>{b.sentByAdminName}</strong> ·{' '}
                          {new Date(b.sentAt).toLocaleString()} · Scope: <strong>{b.scopeDetails}</strong>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <div className="text-[11px] font-mono bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                          SMS {b.smsSentCount + b.smsDeliveredCount}/{b.smsSentCount + b.smsDeliveredCount + b.smsFailedCount + b.smsPendingCount} ·{' '}
                          WA {b.whatsappSentCount + b.whatsappDeliveredCount}/{b.whatsappSentCount + b.whatsappDeliveredCount + b.whatsappFailedCount + b.whatsappPendingCount} ·{' '}
                          App {b.appNotifSentCount} · DupSkip {b.skippedDuplicateCount}
                        </div>

                        {totalFail > 0 && (
                          <button
                            onClick={() =>
                              handleRetryDeliveries({
                                broadcastId: b.id,
                                label: `${b.jobTitle} (${totalFail} failed)`,
                              })
                            }
                            disabled={retryingTarget === b.id}
                            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry Failed ({totalFail})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filterable Per-Rider Delivery Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Per-Rider Notification Delivery Ledger ({filteredDeliveries.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Audit delivery outcomes per channel, provider message IDs, webhook confirmations, and retry blocked items.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search rider, phone, job..."
                    value={deliverySearch}
                    onChange={(e) => setDeliverySearch(e.target.value)}
                    className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <select
                  value={deliveryJobFilter}
                  onChange={(e) => setDeliveryJobFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs max-w-[180px]"
                >
                  <option value="all">All Jobs</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>

                <select
                  value={deliveryChannelFilter}
                  onChange={(e) => setDeliveryChannelFilter(e.target.value as typeof deliveryChannelFilter)}
                  className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="all">All Channels</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="in_app">In-App</option>
                </select>

                <select
                  value={deliveryStatusFilter}
                  onChange={(e) => setDeliveryStatusFilter(e.target.value as typeof deliveryStatusFilter)}
                  className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="delivered">Delivered</option>
                  <option value="sent">Sent to Gateway</option>
                  <option value="pending">Pending Queue</option>
                  <option value="blocked_unconfigured">Blocked (Unconfigured)</option>
                  <option value="failed">Failed</option>
                  <option value="skipped_duplicate">Skipped Duplicate</option>
                  <option value="opted_out">Opted Out / No Consent</option>
                  <option value="skipped_preference">Skipped Preference</option>
                  <option value="invalid_number">Invalid Number</option>
                </select>
              </div>
            </div>

            {filteredDeliveries.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                No delivery log rows match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">Job Linked</th>
                      <th className="py-2.5 px-3">Rider &amp; Phone</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Status &amp; Details</th>
                      <th className="py-2.5 px-3 text-right">Retries / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDeliveries.slice(0, 100).map((d) => {
                      const canRetry =
                        d.status === 'failed' ||
                        d.status === 'blocked_unconfigured' ||
                        d.status === 'invalid_number';
                      return (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono">
                            {new Date(d.updatedAt || d.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 max-w-[180px]">
                            <span className="font-bold text-slate-900 block truncate">{d.jobTitle}</span>
                            <span className="text-[10px] text-slate-400 font-mono">/?jobId={d.jobId}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block">{d.riderName}</span>
                            <span className="font-mono text-slate-500">
                              {d.targetPhone || 'Missing'} ({d.network})
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold uppercase">
                              {d.channel.replace('_', ' ')}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">{d.provider}</span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[260px]">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border font-bold uppercase ${renderDeliveryStatusBadge(
                                d.status
                              )}`}
                            >
                              {d.status.replace('_', ' ')}
                            </span>
                            {d.providerMessageId && (
                              <span className="block text-[10px] font-mono text-emerald-700 mt-0.5 truncate">
                                ID: {d.providerMessageId}
                              </span>
                            )}
                            {d.errorReason && (
                              <span className="block text-[10px] text-rose-700 mt-0.5">
                                {d.errorReason}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-mono text-slate-500">#{d.retryCount}</span>
                              {canRetry && (
                                <button
                                  type="button"
                                  disabled={retryingTarget === d.id}
                                  onClick={() =>
                                    handleRetryDeliveries({
                                      deliveryIds: [d.id],
                                      label: `${d.riderName} (${d.channel.toUpperCase()})`,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Retry</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Preserved Legacy SMS Audit Log */}
          {campaigns.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900">
                Historical Single-Channel SMS Campaigns ({campaigns.length})
              </h4>
              <div className="space-y-2.5">
                {campaigns.map((camp) => {
                  const isOpen = expandedCampaignId === camp.id;
                  return (
                    <div key={camp.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-extrabold text-slate-900">{camp.jobTitle}</span>
                          <p className="text-[11px] text-slate-500">
                            {new Date(camp.sentAt).toLocaleString()} · Scope: {camp.scopeDetails} · App:{' '}
                            {camp.appNotificationsSentCount} · SMS Sent: {camp.smsSentCount} · Failed:{' '}
                            {camp.smsFailedCount}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpandedCampaignId(isOpen ? null : camp.id)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 cursor-pointer self-start"
                        >
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                      {isOpen && (
                        <div className="text-[11px] font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                          {camp.messageText}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 4: RIDER CONTACT DETAILS, CHANNELS & CONSENT CONTROL          */}
      {/* ===================================================================== */}
      {subTab === 'preferences' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                Rider Contact Details, Notification Channels &amp; Consent Registry
              </h4>
              <p className="text-slate-500">
                Inspect each rider&apos;s Telephone, WhatsApp Number, District/Stage, Preferred Channel, and Broadcast Consent without duplicating accounts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search rider, WhatsApp, district..."
                  value={prefSearch}
                  onChange={(e) => setPrefSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
              <select
                value={prefFilterType}
                onChange={(e) => setPrefFilterType(e.target.value as typeof prefFilterType)}
                className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="all">All Riders ({riders.length})</option>
                <option value="whatsapp_ready">WhatsApp Ready</option>
                <option value="smartphone">Smartphones</option>
                <option value="feature_phone">Button / Feature Phones</option>
                <option value="opted_out">Opted Out / Consent Revoked</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-2.5 px-3">Rider &amp; Telephone / WhatsApp</th>
                  <th className="py-2.5 px-3">District / Village / Stage</th>
                  <th className="py-2.5 px-3">Device Type</th>
                  <th className="py-2.5 px-3">Preferred Channel</th>
                  <th className="py-2.5 px-3">Consent &amp; Opt-Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPrefRiders.map((r) => {
                  const ph = validateUgandaPhone(r.phone);
                  const waPh = validateUgandaPhone(r.whatsappNumber || r.phone);
                  const isFeature = (r.phoneType || 'smartphone') === 'feature_phone';
                  const hasConsent =
                    r.jobAlertPreferences?.consentGiven !== false && r.jobAlertPreferences?.enabled !== false;
                  const optedOutSms = Boolean(r.jobAlertPreferences?.optedOutSms);
                  const prefCh =
                    r.jobAlertPreferences?.preferredChannel || (isFeature ? 'sms_only' : 'sms_whatsapp');

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{r.fullName}</span>
                        <span className="font-mono text-[11px] text-slate-600 block">
                          Tel: {ph.normalized || r.phone} ({ph.network})
                        </span>
                        <span className="font-mono text-[10px] text-emerald-700 block">
                          WA: {r.whatsappNumber || (isFeature ? 'None (Button phone)' : waPh.normalized || r.phone)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">
                          {r.district || 'Luweero'} · {r.village || 'Unassigned'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {r.stageName} ({r.subCounty || 'Luweero'})
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleAdminPrefUpdate(r, { phoneType: 'smartphone' })}
                            className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer ${
                              !isFeature ? 'bg-emerald-600 text-white' : 'text-slate-600'
                            }`}
                          >
                            <Smartphone className="w-3 h-3" />
                            <span>Smart</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdminPrefUpdate(r, { phoneType: 'feature_phone' })}
                            className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer ${
                              isFeature ? 'bg-amber-500 text-slate-950' : 'text-slate-600'
                            }`}
                          >
                            <Phone className="w-3 h-3" />
                            <span>Button</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={prefCh}
                          onChange={(e) =>
                            handleAdminPrefUpdate(r, {
                              preferredChannel: e.target.value as RiderJobAlertPreferences['preferredChannel'],
                            })
                          }
                          className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-semibold"
                        >
                          <option value="sms_whatsapp">SMS &amp; WhatsApp</option>
                          <option value="whatsapp_only">WhatsApp Only</option>
                          <option value="sms_only">SMS Only</option>
                          <option value="auto">Smart Auto (All)</option>
                          <option value="both">App &amp; SMS</option>
                          <option value="app_only">In-App Only</option>
                          <option value="none">Paused</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 space-y-1">
                        <button
                          type="button"
                          onClick={() => handleAdminPrefUpdate(r, { consentGiven: !hasConsent })}
                          className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer flex items-center gap-1 text-[11px] ${
                            hasConsent
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {hasConsent ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                          <span>{hasConsent ? 'Consent Granted' : 'Consent Revoked'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminPrefUpdate(r, { optedOutSms: !optedOutSms })}
                          className={`px-2.5 py-0.5 rounded font-semibold cursor-pointer text-[10px] ${
                            optedOutSms ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:underline'
                          }`}
                        >
                          {optedOutSms ? 'SMS Opted-Out (Undo)' : 'SMS Active'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 5: SMS + META WHATSAPP GATEWAY MONITOR                        */}
      {/* ===================================================================== */}
      {subTab === 'gateway' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  Integrated Messaging Gateways (Africa&apos;s Talking SMS &amp; Meta WhatsApp Business Cloud API)
                </h4>
                <p className="text-slate-500">
                  Real server-side delivery checks with carrier DLR webhooks and WhatsApp delivery receipts. Never simulates delivery when credentials are missing.
                </p>
              </div>
              <button
                onClick={() => void fetchGatewayAndDashboardState()}
                disabled={loadingGateway}
                className="px-3.5 py-2 rounded-xl bg-[#0B192C] text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingGateway ? 'animate-spin' : ''}`} />
                <span>Check Live Gateways</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Africa's Talking SMS Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-600" />
                    <h5 className="font-extrabold text-sm text-slate-900">
                      1. Africa&apos;s Talking Uganda SMS Gateway
                    </h5>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      gatewayStatus?.configured
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {gatewayStatus?.configured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Environment &amp; Sender ID</span>
                    <strong className="font-mono text-slate-900">
                      {gatewayStatus?.environment || 'unconfigured'} · {gatewayStatus?.senderId || 'BODACARE'}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">SMS Wallet Balance</span>
                    <strong className="font-mono text-slate-900">
                      {gatewayStatus?.balanceText || 'Unavailable'}
                    </strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600">
                  SMS Delivery Report (DLR) Webhook:{' '}
                  <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono">
                    POST /api/sms/dlr
                  </code>
                </p>

                {gatewayStatus && gatewayStatus.requirementsMissing.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    {gatewayStatus.requirementsMissing.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Meta WhatsApp Business Cloud API Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-600" />
                    <h5 className="font-extrabold text-sm text-slate-900">
                      2. Meta WhatsApp Business Cloud API
                    </h5>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      combinedGateway?.whatsapp?.configured
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {combinedGateway?.whatsapp?.configured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Graph API Version</span>
                    <strong className="font-mono text-slate-900">
                      {combinedGateway?.whatsapp?.apiVersion || 'v21.0'}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Token &amp; Phone ID</span>
                    <strong className="font-mono text-slate-900">
                      {combinedGateway?.whatsapp?.accessTokenConfigured &&
                      combinedGateway?.whatsapp?.businessPhoneIdConfigured
                        ? 'Present on Server'
                        : 'Missing in .env'}
                    </strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600">
                  WhatsApp Cloud Webhook URL:{' '}
                  <code className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono">
                    GET / POST /api/whatsapp/webhook
                  </code>
                </p>

                {combinedGateway?.whatsapp?.requirementsMissing &&
                  combinedGateway.whatsapp.requirementsMissing.length > 0 && (
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      {combinedGateway.whatsapp.requirementsMissing.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
