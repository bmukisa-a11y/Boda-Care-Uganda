import 'dotenv/config';
import crypto from 'crypto';
import http from 'http';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as webpush from 'web-push';
import {
  validateUgandaPhone,
  calculateSmsSegments,
  formatJobSmsTemplate,
  formatJobWhatsAppTemplate,
  buildJobDeepLink,
} from './src/lib/ugandaPhone.ts';
import {
  getDb,
  listRiders,
  getRiderById,
  upsertRiderRecord,
  deleteRiderRecord,
  listPassengers,
  upsertPassengerRecord,
  deletePassengerRecord,
  listJobs,
  upsertJobRecord,
  deleteJobRecord,
  listSwapStations,
  upsertStationRecord,
  deleteStationRecord,
  listMaintenanceCentres,
  upsertMaintenanceCentreRecord,
  deleteMaintenanceCentreRecord,
  listStages,
  upsertStageRecord,
  deleteStageRecord,
  assignRiderToStage,
  listAdminAccounts,
  getAdminById,
  upsertAdminAccount,
  deleteAdminAccount,
  insertAuditLog,
  listAuditLogs,
  insertNotification,
  listNotifications,
  insertDeliveryLog,
  listDeliveryLogs,
  saveSmsCampaignRecord,
  listSmsCampaigns,
  computeCentralAnalytics,
  normalizePhoneKey,
  upsertJobBroadcastRecord,
  getJobBroadcastById,
  listJobBroadcasts,
  hasExistingJobNotification,
  upsertJobDeliveryRecord,
  getJobDeliveryById,
  listJobDeliveries,
  recomputeJobBroadcastCounts,
  updateJobDeliveryByProviderId,
  getJobNotificationDashboardStats,
  listDiscoverySources,
  getDiscoverySourceById,
  upsertDiscoverySource,
  deleteDiscoverySource,
  listDiscoveredJobs,
  getDiscoveredJobById,
  upsertDiscoveredJob,
  deleteDiscoveredJob,
  getDiscoveryScheduleConfig,
  saveDiscoveryScheduleConfig,
  listDiscoveryRuns,
  computeDiscoveryCounts,
  computeDiscoveryEmployers,
  generateRecordCode,
  listIntegrationToggles,
  getIntegrationToggle,
  setIntegrationToggle,
  getWelcomeSettings,
  saveWelcomeSettings,
  hasInitialWelcomeSent,
  upsertWelcomeNotification,
  getWelcomeNotificationById,
  listWelcomeNotifications,
  getSystemMeta,
  isAccountRevoked,
  unrevokeByPhoneOrEmail,
  deleteEntityWithCleanup,
  buildMembershipBackupSnapshot,
  buildSystemResetOverview,
  performCategoryReset,
  performCompleteMembershipReset,
  getSuperAdminCredentialStatus,
  saveSuperAdminPasscodeHash,
  verifySuperAdminPasscode,
  upsertPushSubscription,
  listPushSubscriptions,
  deletePushSubscription,
  getOrPersistVapidKeys,
} from './src/db/sqliteDb.ts';
import {
  analyzeScamAndCompleteness,
  buildContentHash,
  computeUgandaLocationDetails,
  fetchFromDiscoverySource,
  getSourceOrDefault,
  normalizeAndPersistCandidates,
  runDiscoveryPipeline,
  startDiscoveryScheduler,
  type AdminDiscoveryNotifierFn,
  type RawDiscoveredCandidate,
} from './src/services/jobDiscoveryEngine.ts';
import type {
  AdminAccount,
  AdminPermissions,
  BatterySwapStation,
  BodaJob,
  BusinessListing,
  DiscoveredJobRecord,
  DiscoveryScheduleConfig,
  DiscoverySource,
  IntegrationEnvVarMeta,
  IntegrationServiceId,
  IntegrationServiceStatus,
  IntegrationsDashboardPayload,
  JobAlertDispatchMode,
  JobBroadcastCampaign,
  JobBroadcastChannel,
  JobBroadcastDelivery,
  MessagingGatewayStatus,
  NotificationDeliveryRecord,
  PassengerProfile,
  RiderProfile,
  SmsCampaignRecord,
  SmsDeliveryStatus,
  SmsGatewayStatus,
  SmsRecipientDelivery,
  SmsRecipientScope,
  Stage,
  ResetCategoryId,
  SelectiveDeleteTarget,
  WelcomeAccountCategory,
  WelcomeChannel,
  WelcomeDashboardPayload,
  WelcomeNotificationRecord,
  WelcomeSettingsConfig,
} from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

// Extend Express Request with authenticated admin operator context
interface AdminRequest extends Request {
  adminOperator?: AdminAccount;
}

function getSmsConfigFromEnv() {
  const username = (process.env.AFRICASTALKING_USERNAME || '').trim();
  const apiKey = (process.env.AFRICASTALKING_API_KEY || '').trim();
  const senderId = (process.env.AFRICASTALKING_SENDER_ID || 'BODACARE').trim();
  const senderIdApproved = process.env.AFRICASTALKING_SENDER_APPROVED === 'true';
  const envMode =
    process.env.AFRICASTALKING_ENV === 'production' || (username && username.toLowerCase() !== 'sandbox')
      ? ('production' as const)
      : username
      ? ('sandbox' as const)
      : ('unconfigured' as const);

  const usernameConfigured = Boolean(username && !username.startsWith('MY_'));
  const apiKeyConfigured = Boolean(apiKey && !apiKey.startsWith('MY_'));
  const smsAdminEnabled = getIntegrationToggle('africastalking_sms');
  const configured = smsAdminEnabled && usernameConfigured && apiKeyConfigured;
  const costPerSmsUgx = Number(process.env.SMS_COST_PER_SEGMENT_UGX || 35);

  const requirementsMissing: string[] = [];
  if (!smsAdminEnabled) {
    requirementsMissing.push("Africa's Talking SMS service is currently deactivated by Administrator in Integrations Settings.");
  }
  if (!usernameConfigured) {
    requirementsMissing.push('AFRICASTALKING_USERNAME not set in server environment variables (.env).');
  }
  if (!apiKeyConfigured) {
    requirementsMissing.push('AFRICASTALKING_API_KEY not set in server environment variables (.env).');
  }
  if (!senderIdApproved) {
    requirementsMissing.push(
      `Alphanumeric Sender ID "${senderId}" requires UCC / Africa's Talking approval (set AFRICASTALKING_SENDER_APPROVED=true once approved).`
    );
  }
  if (!usernameConfigured || !apiKeyConfigured) {
    requirementsMissing.push(
      "Active funded Africa's Talking SMS wallet required (MTN Uganda & Airtel Uganda termination costs ~UGX 35/SMS)."
    );
  }

  return {
    username,
    apiKey,
    senderId,
    senderIdApproved,
    envMode,
    usernameConfigured,
    apiKeyConfigured,
    smsAdminEnabled,
    configured,
    costPerSmsUgx,
    requirementsMissing,
  };
}

function getWhatsAppConfigFromEnv() {
  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const apiVersion = (process.env.WHATSAPP_API_VERSION || 'v21.0').trim();

  const waAdminEnabled = getIntegrationToggle('whatsapp_cloud');
  const accessTokenConfigured = Boolean(accessToken && !accessToken.startsWith('MY_'));
  const businessPhoneIdConfigured = Boolean(phoneNumberId && !phoneNumberId.startsWith('MY_'));
  const configured = waAdminEnabled && accessTokenConfigured && businessPhoneIdConfigured;

  const requirementsMissing: string[] = [];
  if (!waAdminEnabled) {
    requirementsMissing.push('WhatsApp Business Cloud API is currently deactivated by Administrator in Integrations Settings.');
  }
  if (!businessPhoneIdConfigured) {
    requirementsMissing.push('WHATSAPP_PHONE_NUMBER_ID not set in server environment (.env).');
  }
  if (!accessTokenConfigured) {
    requirementsMissing.push('WHATSAPP_ACCESS_TOKEN not set in server environment (.env).');
  }
  if (!businessPhoneIdConfigured || !accessTokenConfigured) {
    requirementsMissing.push('Verified Meta WhatsApp Business Cloud API app + approved templates required for automated WhatsApp delivery.');
  }

  return {
    configured,
    waAdminEnabled,
    provider: 'meta_cloud_api' as const,
    businessPhoneIdConfigured,
    accessTokenConfigured,
    accessToken,
    phoneNumberId,
    apiVersion,
    requirementsMissing,
  };
}

function getUssdConfigFromEnv() {
  const serviceCode = (process.env.USSD_SERVICE_CODE || '').trim();
  const ussdAdminEnabled = getIntegrationToggle('ussd_gateway');
  const configured = ussdAdminEnabled && Boolean(serviceCode && !serviceCode.startsWith('MY_'));
  const requirementsMissing: string[] = [];
  if (!ussdAdminEnabled) {
    requirementsMissing.push('USSD Gateway service is currently deactivated by Administrator in Integrations Settings.');
  }
  if (!serviceCode || serviceCode.startsWith('MY_')) {
    requirementsMissing.push('Dedicated UCC / Africa\'s Talking USSD Service Code (e.g. *284*...#) not yet provisioned (USSD_SERVICE_CODE env var).');
    requirementsMissing.push('Webhook callback route POST /api/ussd/callback is implemented and ready once the telecom shortcode is pointed to this server.');
  }
  return {
    configured,
    ussdAdminEnabled,
    serviceCode: configured ? serviceCode : 'Unprovisioned (Awaiting Telecom Shortcode)',
    callbackPath: '/api/ussd/callback',
    requirementsMissing,
  };
}

async function fetchGatewayStatus(): Promise<SmsGatewayStatus> {
  const cfg = getSmsConfigFromEnv();
  let balanceText: string | null = null;
  let balanceCurrency: string | null = null;
  let balanceAmount: number | null = null;
  const missing = [...cfg.requirementsMissing];

  if (cfg.configured) {
    const baseUrl =
      cfg.envMode === 'sandbox'
        ? 'https://api.sandbox.africastalking.com'
        : 'https://api.africastalking.com';
    try {
      const resp = await fetch(`${baseUrl}/version1/user?username=${encodeURIComponent(cfg.username)}`, {
        method: 'GET',
        headers: {
          apiKey: cfg.apiKey,
          Accept: 'application/json',
        },
      });
      if (resp.ok) {
        const json = (await resp.json()) as { UserData?: { balance?: string } };
        balanceText = json.UserData?.balance || null;
        if (balanceText) {
          const parts = balanceText.trim().split(/\s+/);
          balanceCurrency = parts[0] || null;
          balanceAmount = parseFloat(parts[1] || '0');
          if (!isNaN(balanceAmount) && balanceAmount <= 0) {
            missing.push(`Africa's Talking account balance is ${balanceText}. Top up wallet before sending bulk SMS.`);
          }
        }
      } else {
        missing.push(`Africa's Talking API returned HTTP ${resp.status} when verifying balance.`);
      }
    } catch (err) {
      missing.push(
        `Unable to reach Africa's Talking API to check balance: ${err instanceof Error ? err.message : 'Network error'}`
      );
    }
  }

  return {
    configured: cfg.configured,
    provider: 'africastalking',
    environment: cfg.envMode,
    usernameConfigured: cfg.usernameConfigured,
    apiKeyConfigured: cfg.apiKeyConfigured,
    senderId: cfg.senderId,
    senderIdApproved: cfg.senderIdApproved,
    balanceText,
    balanceCurrency,
    balanceAmount,
    costPerSmsUgx: cfg.costPerSmsUgx,
    requirementsMissing: missing,
    checkedAt: new Date().toISOString(),
    backendReachable: true,
  };
}

async function fetchCombinedMessagingStatus(): Promise<MessagingGatewayStatus> {
  const sms = await fetchGatewayStatus();
  const wa = getWhatsAppConfigFromEnv();
  const ussd = getUssdConfigFromEnv();
  return {
    sms,
    whatsapp: {
      configured: wa.configured,
      provider: wa.provider,
      businessPhoneIdConfigured: wa.businessPhoneIdConfigured,
      accessTokenConfigured: wa.accessTokenConfigured,
      apiVersion: wa.apiVersion,
      requirementsMissing: wa.requirementsMissing,
    },
    ussd,
    checkedAt: new Date().toISOString(),
  };
}

function getWebPushRuntime() {
  const enabled = getIntegrationToggle('web_push');
  const keys = getOrPersistVapidKeys(() => webpush.generateVAPIDKeys());
  const subject = (process.env.VAPID_SUBJECT || 'mailto:bmukisa@bodawerk.co.ug').trim();
  return { enabled, subject, ...keys };
}

async function sendWebPushToSubscribers(
  payload: { title: string; body: string; url?: string; tag?: string },
  filter?: { userId?: string; role?: string }
): Promise<{ sent: number; failed: number; removedExpired: number }> {
  const runtime = getWebPushRuntime();
  if (!runtime.enabled) return { sent: 0, failed: 0, removedExpired: 0 };

  const allSubs = listPushSubscriptions();
  if (allSubs.length === 0) return { sent: 0, failed: 0, removedExpired: 0 };

  const targets =
    filter?.userId || filter?.role
      ? allSubs.filter(
          (s) =>
            (!filter.userId || s.userId === filter.userId || !s.userId || filter.userId === 'all') &&
            (!filter.role || s.role === filter.role || !s.role)
        )
      : allSubs;

  if (targets.length === 0) return { sent: 0, failed: 0, removedExpired: 0 };

  webpush.setVapidDetails(runtime.subject, runtime.publicKey, runtime.privateKey);
  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag || 'eboda-alert',
    icon: '/pwa-192x192.png',
    badge: '/pwa-maskable-512x512.png',
  });

  let sent = 0;
  let failed = 0;
  let removedExpired = 0;

  await Promise.allSettled(
    targets.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          deletePushSubscription(sub.endpoint);
          removedExpired++;
        } else {
          failed++;
        }
      }
    })
  );

  return { sent, failed, removedExpired };
}

/**
 * Genuine multi-channel notification dispatcher (SMS, WhatsApp Business Cloud API, In-App + Web Push).
 * Never fakes SMS or WhatsApp sends: if telecom/Meta credentials are absent or rejected,
 * logs the exact blocked/failed state and missing requirements transparently.
 */
async function dispatchMultiChannelMessage(params: {
  channels: Array<'in_app' | 'sms' | 'whatsapp'>;
  recipientId: string;
  recipientName: string;
  phone: string;
  whatsappNumber?: string;
  category: string;
  title: string;
  message: string;
  sentBy: string;
}): Promise<NotificationDeliveryRecord[]> {
  const nowIso = new Date().toISOString();
  const results: NotificationDeliveryRecord[] = [];
  const phoneCheck = validateUgandaPhone(params.phone || '');
  const waCheck = validateUgandaPhone(params.whatsappNumber || params.phone || '');

  // 1. In-App Notification (Real SQLite persistence) + Android Web Push
  if (params.channels.includes('in_app')) {
    insertNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: params.recipientId,
      title: params.title,
      message: params.message,
      timestamp: nowIso,
      read: false,
      type: 'system',
    });
    void sendWebPushToSubscribers(
      {
        title: params.title,
        body: params.message,
        url: '/',
        tag: `eboda-${params.category}`,
      },
      { userId: params.recipientId }
    );
    const rec: NotificationDeliveryRecord = {
      id: `del-app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      channel: 'in_app',
      recipientId: params.recipientId,
      recipientName: params.recipientName,
      recipientPhone: phoneCheck.normalized || params.phone,
      category: params.category,
      message: params.message,
      provider: 'BodaCare SQLite In-App Store',
      status: 'in_app_delivered',
      sentBy: params.sentBy,
      createdAt: nowIso,
    };
    insertDeliveryLog(rec);
    results.push(rec);
  }

  // 2. Real SMS via Africa's Talking
  if (params.channels.includes('sms')) {
    const smsCfg = getSmsConfigFromEnv();
    if (!phoneCheck.isValid) {
      const rec: NotificationDeliveryRecord = {
        id: `del-sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        channel: 'sms',
        recipientId: params.recipientId,
        recipientName: params.recipientName,
        recipientPhone: params.phone,
        category: params.category,
        message: params.message,
        provider: "Africa's Talking Uganda",
        status: 'failed',
        errorReason: phoneCheck.reason || 'Invalid Uganda phone number',
        sentBy: params.sentBy,
        createdAt: nowIso,
      };
      insertDeliveryLog(rec);
      results.push(rec);
    } else if (!smsCfg.configured) {
      const rec: NotificationDeliveryRecord = {
        id: `del-sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        channel: 'sms',
        recipientId: params.recipientId,
        recipientName: params.recipientName,
        recipientPhone: phoneCheck.normalized,
        category: params.category,
        message: params.message,
        provider: "Africa's Talking Uganda",
        status: 'blocked_unconfigured',
        errorReason: smsCfg.requirementsMissing.join(' '),
        sentBy: params.sentBy,
        createdAt: nowIso,
      };
      insertDeliveryLog(rec);
      results.push(rec);
    } else {
      const baseUrl =
        smsCfg.envMode === 'sandbox'
          ? 'https://api.sandbox.africastalking.com'
          : 'https://api.africastalking.com';
      const bodyParams = new URLSearchParams();
      bodyParams.append('username', smsCfg.username);
      bodyParams.append('to', phoneCheck.normalized);
      bodyParams.append('message', params.message);
      if (smsCfg.senderId && smsCfg.senderIdApproved) {
        bodyParams.append('from', smsCfg.senderId);
      }

      try {
        const atRes = await fetch(`${baseUrl}/version1/messaging`, {
          method: 'POST',
          headers: {
            apiKey: smsCfg.apiKey,
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyParams.toString(),
        });
        const raw = await atRes.text();
        if (!atRes.ok) {
          const rec: NotificationDeliveryRecord = {
            id: `del-sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            channel: 'sms',
            recipientId: params.recipientId,
            recipientName: params.recipientName,
            recipientPhone: phoneCheck.normalized,
            category: params.category,
            message: params.message,
            provider: "Africa's Talking Uganda",
            status: 'failed',
            errorReason: `HTTP ${atRes.status}: ${raw}`,
            sentBy: params.sentBy,
            createdAt: nowIso,
          };
          insertDeliveryLog(rec);
          results.push(rec);
        } else {
          const parsed = JSON.parse(raw) as {
            SMSMessageData?: {
              Recipients?: Array<{ status: string; statusCode: number; messageId: string }>;
            };
          };
          const first = parsed.SMSMessageData?.Recipients?.[0];
          const ok = first && (first.statusCode === 100 || first.statusCode === 101 || first.statusCode === 102);
          const rec: NotificationDeliveryRecord = {
            id: `del-sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            channel: 'sms',
            recipientId: params.recipientId,
            recipientName: params.recipientName,
            recipientPhone: phoneCheck.normalized,
            category: params.category,
            message: params.message,
            provider: "Africa's Talking Uganda",
            providerMessageId: first?.messageId,
            status: ok ? 'sent' : 'failed',
            errorReason: ok ? undefined : first ? `${first.status} (${first.statusCode})` : 'Unacknowledged by SMS gateway',
            sentBy: params.sentBy,
            createdAt: nowIso,
          };
          insertDeliveryLog(rec);
          results.push(rec);
        }
      } catch (err) {
        const rec: NotificationDeliveryRecord = {
          id: `del-sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          channel: 'sms',
          recipientId: params.recipientId,
          recipientName: params.recipientName,
          recipientPhone: phoneCheck.normalized,
          category: params.category,
          message: params.message,
          provider: "Africa's Talking Uganda",
          status: 'failed',
          errorReason: err instanceof Error ? err.message : 'Network error calling Africa\'s Talking',
          sentBy: params.sentBy,
          createdAt: nowIso,
        };
        insertDeliveryLog(rec);
        results.push(rec);
      }
    }
  }

  // 3. Real WhatsApp via Meta WhatsApp Business Cloud API
  if (params.channels.includes('whatsapp')) {
    const waCfg = getWhatsAppConfigFromEnv();
    const targetWaPhone = waCheck.normalized;
    if (!waCheck.isValid) {
      const rec: NotificationDeliveryRecord = {
        id: `del-wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        channel: 'whatsapp',
        recipientId: params.recipientId,
        recipientName: params.recipientName,
        recipientPhone: params.whatsappNumber || params.phone,
        category: params.category,
        message: params.message,
        provider: 'Meta WhatsApp Cloud API',
        status: 'failed',
        errorReason: waCheck.reason || 'Invalid WhatsApp mobile number',
        sentBy: params.sentBy,
        createdAt: nowIso,
      };
      insertDeliveryLog(rec);
      results.push(rec);
    } else if (!waCfg.configured) {
      const rec: NotificationDeliveryRecord = {
        id: `del-wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        channel: 'whatsapp',
        recipientId: params.recipientId,
        recipientName: params.recipientName,
        recipientPhone: targetWaPhone,
        category: params.category,
        message: params.message,
        provider: 'Meta WhatsApp Cloud API',
        status: 'blocked_unconfigured',
        errorReason: waCfg.requirementsMissing.join(' '),
        sentBy: params.sentBy,
        createdAt: nowIso,
      };
      insertDeliveryLog(rec);
      results.push(rec);
    } else {
      try {
        const waResp = await fetch(
          `https://graph.facebook.com/${waCfg.apiVersion}/${waCfg.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${waCfg.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: targetWaPhone.replace(/^\+/, ''),
              type: 'text',
              text: { preview_url: false, body: params.message },
            }),
          }
        );
        const waRaw = await waResp.text();
        if (!waResp.ok) {
          const rec: NotificationDeliveryRecord = {
            id: `del-wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            channel: 'whatsapp',
            recipientId: params.recipientId,
            recipientName: params.recipientName,
            recipientPhone: targetWaPhone,
            category: params.category,
            message: params.message,
            provider: 'Meta WhatsApp Cloud API',
            status: 'failed',
            errorReason: `Meta Graph HTTP ${waResp.status}: ${waRaw}`,
            sentBy: params.sentBy,
            createdAt: nowIso,
          };
          insertDeliveryLog(rec);
          results.push(rec);
        } else {
          const parsed = JSON.parse(waRaw) as { messages?: Array<{ id: string }> };
          const rec: NotificationDeliveryRecord = {
            id: `del-wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            channel: 'whatsapp',
            recipientId: params.recipientId,
            recipientName: params.recipientName,
            recipientPhone: targetWaPhone,
            category: params.category,
            message: params.message,
            provider: 'Meta WhatsApp Cloud API',
            providerMessageId: parsed.messages?.[0]?.id,
            status: 'sent',
            sentBy: params.sentBy,
            createdAt: nowIso,
          };
          insertDeliveryLog(rec);
          results.push(rec);
        }
      } catch (err) {
        const rec: NotificationDeliveryRecord = {
          id: `del-wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          channel: 'whatsapp',
          recipientId: params.recipientId,
          recipientName: params.recipientName,
          recipientPhone: targetWaPhone,
          category: params.category,
          message: params.message,
          provider: 'Meta WhatsApp Cloud API',
          status: 'failed',
          errorReason: err instanceof Error ? err.message : 'Network error calling Meta Cloud API',
          sentBy: params.sentBy,
          createdAt: nowIso,
        };
        insertDeliveryLog(rec);
        results.push(rec);
      }
    }
  }

  return results;
}

function resolveTargetRiders(
  riders: RiderProfile[],
  scope: SmsRecipientScope,
  options: {
    selectedDistricts?: string[];
    selectedVillages?: string[];
    selectedStageIds?: string[];
    selectedRiderIds?: string[];
  }
): { matched: RiderProfile[]; scopeDetails: string } {
  if (scope === 'all') {
    return { matched: riders, scopeDetails: `All registered riders (${riders.length})` };
  }
  if (scope === 'districts') {
    const distSet = new Set((options.selectedDistricts || []).map((d) => d.trim().toLowerCase()).filter(Boolean));
    const matched = riders.filter((r) => distSet.has((r.district || 'Luweero').trim().toLowerCase()));
    return {
      matched,
      scopeDetails: `Selected districts: ${(options.selectedDistricts || []).join(', ') || 'None'}`,
    };
  }
  if (scope === 'kikyusa') {
    const matched = riders.filter(
      (r) =>
        r.subCounty?.toLowerCase().includes('kikyusa') ||
        r.stageName?.toLowerCase().includes('kikyusa') ||
        r.residentialArea?.toLowerCase().includes('kikyusa') ||
        r.village?.toLowerCase().includes('kikyusa')
    );
    return { matched, scopeDetails: 'Riders operating in Kikyusa' };
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
    return { matched, scopeDetails: 'Riders operating in Luweero Town & Kasana' };
  }
  if (scope === 'villages') {
    const set = new Set((options.selectedVillages || []).map((v) => v.trim().toLowerCase()));
    const matched = riders.filter((r) => set.has((r.village || '').trim().toLowerCase()));
    return {
      matched,
      scopeDetails: `Selected villages: ${(options.selectedVillages || []).join(', ') || 'None'}`,
    };
  }
  if (scope === 'stages') {
    const set = new Set(options.selectedStageIds || []);
    const matched = riders.filter((r) => set.has(r.stageId));
    const names = Array.from(new Set(matched.map((m) => m.stageName)));
    return {
      matched,
      scopeDetails: `Selected stages: ${names.join(', ') || (options.selectedStageIds || []).join(', ') || 'None'}`,
    };
  }
  const idSet = new Set(options.selectedRiderIds || []);
  const matched = riders.filter((r) => idSet.has(r.id));
  return { matched, scopeDetails: `Individually selected (${matched.length} rider(s))` };
}

function resolveAppOrigin(req: Request): string {
  const envUrl = (process.env.APP_URL || '').trim();
  if (envUrl && !envUrl.startsWith('MY_')) {
    return envUrl.replace(/\/+$/, '');
  }
  const host = req.get('host');
  if (host) {
    return `${req.protocol}://${host}`.replace(/\/+$/, '');
  }
  return 'https://bodacare.ug';
}

function resolveChannelsFromDispatchMode(mode: JobAlertDispatchMode): JobBroadcastChannel[] {
  switch (mode) {
    case 'sms_only':
      return ['sms'];
    case 'whatsapp_only':
      return ['whatsapp'];
    case 'sms_whatsapp':
      return ['sms', 'whatsapp'];
    case 'app_only':
      return ['in_app'];
    case 'both':
      return ['sms', 'in_app'];
    case 'all_channels':
      return ['sms', 'whatsapp', 'in_app'];
    case 'none':
    default:
      return [];
  }
}

async function sendRealSmsViaGateway(normalizedPhone: string, message: string): Promise<{
  status: SmsDeliveryStatus;
  providerMessageId?: string;
  costUgx: number;
  errorReason?: string;
}> {
  const cfg = getSmsConfigFromEnv();
  const seg = calculateSmsSegments(message);

  if (!cfg.configured) {
    return {
      status: 'blocked_unconfigured',
      costUgx: 0,
      errorReason: cfg.requirementsMissing.join(' '),
    };
  }

  const baseUrl =
    cfg.envMode === 'sandbox'
      ? 'https://api.sandbox.africastalking.com'
      : 'https://api.africastalking.com';

  const bodyParams = new URLSearchParams();
  bodyParams.append('username', cfg.username);
  bodyParams.append('to', normalizedPhone);
  bodyParams.append('message', message);
  if (cfg.senderId && cfg.senderIdApproved) {
    bodyParams.append('from', cfg.senderId);
  }

  try {
    const resp = await fetch(`${baseUrl}/version1/messaging`, {
      method: 'POST',
      headers: {
        apiKey: cfg.apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });
    const raw = await resp.text();
    if (!resp.ok) {
      return {
        status: 'failed',
        costUgx: 0,
        errorReason: `Africa's Talking HTTP ${resp.status}: ${raw}`,
      };
    }

    const parsed = JSON.parse(raw) as {
      SMSMessageData?: {
        Message?: string;
        Recipients?: Array<{ status: string; statusCode: number; messageId: string; cost?: string }>;
      };
    };
    const first = parsed.SMSMessageData?.Recipients?.[0];
    const ok = Boolean(first && (first.statusCode === 100 || first.statusCode === 101 || first.statusCode === 102));
    const parsedCost = parseFloat((first?.cost || '0').replace(/[^0-9.]/g, '')) || 0;

    return {
      status: ok ? 'sent' : 'failed',
      providerMessageId: first?.messageId,
      costUgx: ok ? parsedCost || Math.max(1, seg.segments) * cfg.costPerSmsUgx : 0,
      errorReason: ok
        ? undefined
        : first
        ? `${first.status} (Code ${first.statusCode})`
        : parsed.SMSMessageData?.Message || 'Unacknowledged by SMS gateway',
    };
  } catch (err) {
    return {
      status: 'failed',
      costUgx: 0,
      errorReason: err instanceof Error ? err.message : "Network error calling Africa's Talking API",
    };
  }
}

async function sendRealWhatsAppViaGateway(normalizedPhone: string, message: string): Promise<{
  status: SmsDeliveryStatus;
  providerMessageId?: string;
  errorReason?: string;
}> {
  const waCfg = getWhatsAppConfigFromEnv();
  if (!waCfg.configured) {
    return {
      status: 'blocked_unconfigured',
      errorReason: waCfg.requirementsMissing.join(' '),
    };
  }

  try {
    const waResp = await fetch(
      `https://graph.facebook.com/${waCfg.apiVersion}/${waCfg.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${waCfg.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedPhone.replace(/^\+/, ''),
          type: 'text',
          text: { preview_url: true, body: message },
        }),
      }
    );
    const raw = await waResp.text();
    if (!waResp.ok) {
      return {
        status: 'failed',
        errorReason: `Meta Cloud API HTTP ${waResp.status}: ${raw}`,
      };
    }

    const parsed = JSON.parse(raw) as { messages?: Array<{ id: string }> };
    return {
      status: 'sent',
      providerMessageId: parsed.messages?.[0]?.id,
    };
  } catch (err) {
    return {
      status: 'failed',
      errorReason: err instanceof Error ? err.message : 'Network error calling Meta WhatsApp Cloud API',
    };
  }
}

const activeQueueBroadcasts = new Set<string>();

async function processBroadcastQueueAsync(broadcastId: string, sentBy: string): Promise<void> {
  if (activeQueueBroadcasts.has(broadcastId)) return;
  activeQueueBroadcasts.add(broadcastId);

  try {
    const campaign = getJobBroadcastById(broadcastId);
    if (!campaign) return;

    upsertJobBroadcastRecord({ ...campaign, queueState: 'processing' });

    const pendingRows = listJobDeliveries({ broadcastId, limit: 2000 }).filter(
      (d) => d.status === 'pending' || d.status === 'queued'
    );

    const BATCH_SIZE = 5;
    for (let i = 0; i < pendingRows.length; i += BATCH_SIZE) {
      const batch = pendingRows.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (item) => {
          const attemptIso = new Date().toISOString();

          if (item.channel === 'sms') {
            const result = await sendRealSmsViaGateway(item.targetPhone, item.messageText);
            upsertJobDeliveryRecord({
              ...item,
              status: result.status,
              providerMessageId: result.providerMessageId,
              costUgx: result.costUgx,
              errorReason: result.errorReason,
              lastAttemptAt: attemptIso,
              updatedAt: attemptIso,
            });
            insertDeliveryLog({
              id: `log-${item.id}-${Date.now()}`,
              channel: 'sms',
              recipientId: item.riderId,
              recipientName: item.riderName,
              recipientPhone: item.targetPhone,
              category: `job_alert:${item.jobId}`,
              message: item.messageText,
              provider: item.provider,
              providerMessageId: result.providerMessageId,
              status:
                result.status === 'sent'
                  ? 'sent'
                  : result.status === 'blocked_unconfigured'
                  ? 'blocked_unconfigured'
                  : 'failed',
              errorReason: result.errorReason,
              sentBy,
              createdAt: attemptIso,
            });
          } else if (item.channel === 'whatsapp') {
            const result = await sendRealWhatsAppViaGateway(item.targetPhone, item.messageText);
            upsertJobDeliveryRecord({
              ...item,
              status: result.status,
              providerMessageId: result.providerMessageId,
              errorReason: result.errorReason,
              lastAttemptAt: attemptIso,
              updatedAt: attemptIso,
            });
            insertDeliveryLog({
              id: `log-${item.id}-${Date.now()}`,
              channel: 'whatsapp',
              recipientId: item.riderId,
              recipientName: item.riderName,
              recipientPhone: item.targetPhone,
              category: `job_alert:${item.jobId}`,
              message: item.messageText,
              provider: item.provider,
              providerMessageId: result.providerMessageId,
              status:
                result.status === 'sent'
                  ? 'sent'
                  : result.status === 'blocked_unconfigured'
                  ? 'blocked_unconfigured'
                  : 'failed',
              errorReason: result.errorReason,
              sentBy,
              createdAt: attemptIso,
            });
          }
        })
      );
      recomputeJobBroadcastCounts(broadcastId);
    }

    recomputeJobBroadcastCounts(broadcastId);
  } finally {
    activeQueueBroadcasts.delete(broadcastId);
  }
}

async function enqueueJobSeekerBroadcast(params: {
  job: BodaJob;
  dispatchMode: JobAlertDispatchMode;
  matchedRiders: RiderProfile[];
  recipientScope: SmsRecipientScope;
  scopeDetails: string;
  appOrigin: string;
  sentBy: string;
  adminOperatorId?: string;
  customSmsMessage?: string;
  customWhatsappMessage?: string;
  respectJobTypeFilter?: boolean;
}): Promise<{
  queued: boolean;
  broadcast?: JobBroadcastCampaign;
  deliveries: JobBroadcastDelivery[];
}> {
  const {
    job,
    dispatchMode,
    matchedRiders,
    recipientScope,
    scopeDetails,
    appOrigin,
    sentBy,
    adminOperatorId,
    customSmsMessage,
    customWhatsappMessage,
    respectJobTypeFilter = true,
  } = params;

  const jobLink = buildJobDeepLink(job.id, appOrigin);
  const nowIso = new Date().toISOString();

  upsertJobRecord(
    {
      ...job,
      notificationMode: dispatchMode,
      lastAlertSentAt: dispatchMode === 'none' ? job.lastAlertSentAt : nowIso,
    },
    true
  );

  const channels = resolveChannelsFromDispatchMode(dispatchMode);
  if (channels.length === 0) {
    return { queued: false, deliveries: [] };
  }

  const broadcastId = `bcast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const smsBaseTemplate = (customSmsMessage || formatJobSmsTemplate(job, appOrigin)).trim();
  const smsSeg = calculateSmsSegments(smsBaseTemplate);
  const smsCfg = getSmsConfigFromEnv();

  let estimatedSmsCount = 0;
  const queuedDeliveries: JobBroadcastDelivery[] = [];

  for (const rider of matchedRiders) {
    const phoneType = rider.phoneType || 'smartphone';
    const prefs = rider.jobAlertPreferences || {
      enabled: true,
      consentGiven: true,
      preferredChannel: phoneType === 'feature_phone' ? 'sms_only' : 'auto',
      optedOutSms: false,
      jobTypes: ['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda', 'passenger_contract'],
      preferredSubCounties: [],
      updatedAt: nowIso,
    };

    const hasConsent = prefs.enabled !== false && prefs.consentGiven !== false && prefs.preferredChannel !== 'none';
    const matchesJobType = !respectJobTypeFilter || !prefs.jobTypes?.length || prefs.jobTypes.includes(job.type);

    for (const channel of channels) {
      const deliveryId = `jdel-${broadcastId}-${rider.id}-${channel}`;
      const rawTargetPhone = channel === 'whatsapp' ? rider.whatsappNumber || rider.phone : rider.phone;
      const phoneCheck = validateUgandaPhone(rawTargetPhone || '');

      const personalizeText = (template: string) => template.replace(/\[Rider Name\]/g, rider.fullName);

      const msgText =
        channel === 'sms'
          ? personalizeText(smsBaseTemplate)
          : channel === 'whatsapp'
          ? customWhatsappMessage?.trim()
            ? personalizeText(customWhatsappMessage.trim())
            : formatJobWhatsAppTemplate(job, rider.fullName, appOrigin)
          : `Job: ${job.title} — ${job.employerCompany} (${job.subCounty}). Pay: ${
              job.salaryDisplay || `UGX ${job.paymentAmountUgx.toLocaleString()}`
            }. Deadline: ${job.deadline}. Tel: ${job.employerPhone}. Link: ${jobLink}`;

      const providerLabel =
        channel === 'sms'
          ? "Africa's Talking Uganda"
          : channel === 'whatsapp'
          ? 'Meta WhatsApp Cloud API'
          : 'BodaCare SQLite In-App Feed';

      if (hasExistingJobNotification(job.id, rider.id, channel)) {
        const dupRec = upsertJobDeliveryRecord({
          id: deliveryId,
          broadcastId,
          jobId: job.id,
          jobTitle: job.title,
          riderId: rider.id,
          riderName: rider.fullName,
          channel,
          targetPhone: phoneCheck.normalized || rawTargetPhone || '',
          network: phoneCheck.network,
          messageText: msgText,
          status: 'skipped_duplicate',
          provider: providerLabel,
          errorReason: `Duplicate guard: "${job.title}" already queued/sent to ${rider.fullName} on ${channel.toUpperCase()}.`,
          costUgx: 0,
          retryCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        queuedDeliveries.push(dupRec);
        continue;
      }

      if (!hasConsent || !matchesJobType) {
        const skipRec = upsertJobDeliveryRecord({
          id: deliveryId,
          broadcastId,
          jobId: job.id,
          jobTitle: job.title,
          riderId: rider.id,
          riderName: rider.fullName,
          channel,
          targetPhone: phoneCheck.normalized || rawTargetPhone || '',
          network: phoneCheck.network,
          messageText: msgText,
          status: !hasConsent ? 'opted_out' : 'skipped_preference',
          provider: providerLabel,
          errorReason: !hasConsent
            ? 'Rider has not granted or revoked notification consent.'
            : `Job type (${job.type}) filtered out by rider preferences.`,
          costUgx: 0,
          retryCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        queuedDeliveries.push(skipRec);
        continue;
      }

      if (channel === 'sms' && (prefs.optedOutSms || prefs.preferredChannel === 'whatsapp_only' || prefs.preferredChannel === 'app_only')) {
        const prefSkip = upsertJobDeliveryRecord({
          id: deliveryId,
          broadcastId,
          jobId: job.id,
          jobTitle: job.title,
          riderId: rider.id,
          riderName: rider.fullName,
          channel,
          targetPhone: phoneCheck.normalized || rawTargetPhone || '',
          network: phoneCheck.network,
          messageText: msgText,
          status: prefs.optedOutSms ? 'opted_out' : 'skipped_preference',
          provider: providerLabel,
          errorReason: prefs.optedOutSms
            ? 'Rider opted out of SMS notifications.'
            : `Rider prefers ${prefs.preferredChannel.replace('_', ' ')} notifications.`,
          costUgx: 0,
          retryCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        queuedDeliveries.push(prefSkip);
        continue;
      }

      if (channel === 'whatsapp' && (prefs.preferredChannel === 'sms_only' || prefs.preferredChannel === 'app_only')) {
        const prefSkip = upsertJobDeliveryRecord({
          id: deliveryId,
          broadcastId,
          jobId: job.id,
          jobTitle: job.title,
          riderId: rider.id,
          riderName: rider.fullName,
          channel,
          targetPhone: phoneCheck.normalized || rawTargetPhone || '',
          network: phoneCheck.network,
          messageText: msgText,
          status: 'skipped_preference',
          provider: providerLabel,
          errorReason: `Rider prefers ${prefs.preferredChannel.replace('_', ' ')} notifications.`,
          costUgx: 0,
          retryCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        queuedDeliveries.push(prefSkip);
        continue;
      }

      if (channel === 'in_app') {
        if (phoneType === 'feature_phone' || prefs.preferredChannel === 'sms_only' || prefs.preferredChannel === 'whatsapp_only' || prefs.preferredChannel === 'sms_whatsapp') {
          const prefSkip = upsertJobDeliveryRecord({
            id: deliveryId,
            broadcastId,
            jobId: job.id,
            jobTitle: job.title,
            riderId: rider.id,
            riderName: rider.fullName,
            channel,
            targetPhone: phoneCheck.normalized || rawTargetPhone || '',
            network: phoneCheck.network,
            messageText: msgText,
            status: 'skipped_preference',
            provider: providerLabel,
            errorReason: phoneType === 'feature_phone' ? 'Feature-phone rider uses SMS/USSD rather than app notifications.' : `Rider prefers ${prefs.preferredChannel}.`,
            costUgx: 0,
            retryCount: 0,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
          queuedDeliveries.push(prefSkip);
          continue;
        }

        insertNotification({
          id: `notif-job-${job.id}-${rider.id}-${Date.now()}`,
          userId: rider.id,
          title: `New Job Alert: ${job.title}`,
          message: msgText,
          timestamp: nowIso,
          read: false,
          type: 'job',
          actionUrl: `jobs?jobId=${job.id}`,
        });

        const appDel = upsertJobDeliveryRecord({
          id: deliveryId,
          broadcastId,
          jobId: job.id,
          jobTitle: job.title,
          riderId: rider.id,
          riderName: rider.fullName,
          channel: 'in_app',
          targetPhone: phoneCheck.normalized || rawTargetPhone || '',
          network: phoneCheck.network,
          messageText: msgText,
          status: 'delivered',
          provider: providerLabel,
          costUgx: 0,
          retryCount: 0,
          lastAttemptAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        queuedDeliveries.push(appDel);
        continue;
      }

      if (!phoneCheck.isValid) {
        const badPhone = upsertJobDeliveryRecord({
          id: deliveryId,
          broadcastId,
          jobId: job.id,
          jobTitle: job.title,
          riderId: rider.id,
          riderName: rider.fullName,
          channel,
          targetPhone: rawTargetPhone || '',
          network: 'Invalid',
          messageText: msgText,
          status: 'invalid_number',
          provider: providerLabel,
          errorReason: phoneCheck.reason || `Invalid Ugandan phone number for ${channel}`,
          costUgx: 0,
          retryCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        queuedDeliveries.push(badPhone);
        continue;
      }

      if (channel === 'sms') estimatedSmsCount++;

      const pendingRow = upsertJobDeliveryRecord({
        id: deliveryId,
        broadcastId,
        jobId: job.id,
        jobTitle: job.title,
        riderId: rider.id,
        riderName: rider.fullName,
        channel,
        targetPhone: phoneCheck.normalized,
        network: phoneCheck.network,
        messageText: msgText,
        status: 'pending',
        provider: providerLabel,
        costUgx: 0,
        retryCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      queuedDeliveries.push(pendingRow);
    }
  }

  const broadcast: JobBroadcastCampaign = {
    id: broadcastId,
    jobId: job.id,
    jobTitle: job.title,
    employerCompany: job.employerCompany,
    jobLink,
    channels,
    dispatchMode,
    recipientScope,
    scopeDetails,
    queueState: 'queued',
    sentByAdminName: sentBy,
    sentAt: nowIso,
    totalTargetedRiders: matchedRiders.length,
    smsPendingCount: queuedDeliveries.filter((d) => d.channel === 'sms' && d.status === 'pending').length,
    smsSentCount: 0,
    smsDeliveredCount: 0,
    smsFailedCount: 0,
    whatsappPendingCount: queuedDeliveries.filter((d) => d.channel === 'whatsapp' && d.status === 'pending').length,
    whatsappSentCount: 0,
    whatsappDeliveredCount: 0,
    whatsappFailedCount: 0,
    appNotifSentCount: queuedDeliveries.filter((d) => d.channel === 'in_app' && d.status === 'delivered').length,
    skippedDuplicateCount: queuedDeliveries.filter((d) => d.status === 'skipped_duplicate').length,
    skippedPreferenceCount: queuedDeliveries.filter((d) => d.status === 'skipped_preference' || d.status === 'opted_out').length,
    invalidPhoneCount: queuedDeliveries.filter((d) => d.status === 'invalid_number').length,
    estimatedSmsCostUgx: estimatedSmsCount * Math.max(1, smsSeg.segments) * smsCfg.costPerSmsUgx,
    actualSmsCostUgx: 0,
  };

  upsertJobBroadcastRecord(broadcast);

  insertAuditLog({
    actorId: adminOperatorId,
    actorName: sentBy,
    actorRole: 'super_admin',
    action: 'JOB_BROADCAST_ENQUEUED',
    category: 'jobs',
    targetId: job.id,
    targetLabel: `${job.title} (${matchedRiders.length} riders)`,
    details: `Enqueued broadcast ${broadcastId} via [${channels.join(', ')}]. SMS queued: ${broadcast.smsPendingCount}, WhatsApp queued: ${broadcast.whatsappPendingCount}, App delivered: ${broadcast.appNotifSentCount}, Duplicate guards skipped: ${broadcast.skippedDuplicateCount}.`,
  });

  setImmediate(() => {
    void processBroadcastQueueAsync(broadcastId, sentBy);
    void sendWebPushToSubscribers({
      title: `New Boda Job: ${job.title}`,
      body: `${job.employerCompany} · ${job.subCounty} · UGX ${Number(job.paymentAmountUgx || 0).toLocaleString()}`,
      url: `/?jobId=${encodeURIComponent(job.id)}`,
      tag: `job-broadcast-${job.id}`,
    });
  });

  return { queued: true, broadcast, deliveries: queuedDeliveries };
}

const notifyAdminOnJobDiscovery: AdminDiscoveryNotifierFn = async ({ runReport, newlySavedJobs, schedule }) => {
  const outcomes: Array<{ channel: string; status: string; target: string }> = [];
  const count = newlySavedJobs.length;
  const nowIso = new Date().toISOString();
  const baseUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '') || 'http://localhost:3000';
  const dashboardLink = `${baseUrl}/?section=daily_discovered_jobs`;

  const summaryItems = newlySavedJobs
    .slice(0, 3)
    .map((j) => `${j.title} — ${j.employerName} (${j.subCounty}, ${j.district})`)
    .join('; ');

  const title =
    count > 0
      ? `Daily Job Discovery: ${count} New Opportunity(ies) Found`
      : `Daily Job Discovery Scan Completed (0 New)`;

  const shortMsg =
    count > 0
      ? `BodaCare Alert: ${count} new job(s) discovered (${summaryItems}). Review & approve: ${dashboardLink}`
      : `BodaCare Discovery: Daily scan checked ${runReport.sourcesScanned} source(s) with 0 new ads. Link: ${dashboardLink}`;

  if (schedule.notifyAdminInApp) {
    insertNotification({
      id: `notif-disc-${runReport.id}`,
      userId: 'admin-founder-mukisa',
      title,
      message: `${shortMsg} | Duplicates blocked: ${runReport.duplicatesDetected} | Suspicious flagged: ${runReport.suspiciousFlagged}.`,
      timestamp: nowIso,
      read: false,
      type: 'job',
      actionUrl: 'admin?section=daily_discovered_jobs',
    });
    outcomes.push({ channel: 'in_app', status: 'delivered', target: 'admin-founder-mukisa' });
  }

  const smsPhoneCheck = validateUgandaPhone(schedule.adminNotifyPhone || '+256772100240');
  if (schedule.notifyAdminSms && smsPhoneCheck.isValid) {
    const smsRes = await sendRealSmsViaGateway(smsPhoneCheck.normalized, shortMsg.slice(0, 300));
    insertDeliveryLog({
      id: `del-disc-sms-${Date.now()}`,
      channel: 'sms',
      recipientId: 'admin-founder-mukisa',
      recipientName: 'Brian Mukisa (Super Admin)',
      recipientPhone: smsPhoneCheck.normalized,
      category: `discovery_alert:${runReport.id}`,
      message: shortMsg.slice(0, 300),
      provider: "Africa's Talking Uganda",
      providerMessageId: smsRes.providerMessageId,
      status:
        smsRes.status === 'sent'
          ? 'sent'
          : smsRes.status === 'blocked_unconfigured'
          ? 'blocked_unconfigured'
          : 'failed',
      errorReason: smsRes.errorReason,
      sentBy: 'Automated Discovery Engine',
      createdAt: nowIso,
    });
    outcomes.push({ channel: 'sms', status: smsRes.status, target: smsPhoneCheck.normalized });
  }

  const waPhoneCheck = validateUgandaPhone(schedule.adminNotifyWhatsapp || schedule.adminNotifyPhone || '+256772100240');
  if (schedule.notifyAdminWhatsapp && waPhoneCheck.isValid) {
    const waText =
      `*BODACARE DAILY JOB DISCOVERY ALERT*\n` +
      `New Jobs Found: *${count}*\n` +
      `Suspicious Flagged: ${runReport.suspiciousFlagged} | Duplicates: ${runReport.duplicatesDetected}\n` +
      (summaryItems ? `Top Matches: ${summaryItems}\n` : '') +
      `Review in Dashboard: ${dashboardLink}`;
    const waRes = await sendRealWhatsAppViaGateway(waPhoneCheck.normalized, waText);
    insertDeliveryLog({
      id: `del-disc-wa-${Date.now()}`,
      channel: 'whatsapp',
      recipientId: 'admin-founder-mukisa',
      recipientName: 'Brian Mukisa (Super Admin)',
      recipientPhone: waPhoneCheck.normalized,
      category: `discovery_alert:${runReport.id}`,
      message: waText,
      provider: 'Meta WhatsApp Cloud API',
      providerMessageId: waRes.providerMessageId,
      status:
        waRes.status === 'sent'
          ? 'sent'
          : waRes.status === 'blocked_unconfigured'
          ? 'blocked_unconfigured'
          : 'failed',
      errorReason: waRes.errorReason,
      sentBy: 'Automated Discovery Engine',
      createdAt: nowIso,
    });
    outcomes.push({ channel: 'whatsapp', status: waRes.status, target: waPhoneCheck.normalized });
  }

  return outcomes;
};

function sanitizeImageUrl(raw?: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.length > 750000) {
    throw new Error('Uploaded image exceeds maximum allowed size (~500KB). Please choose a smaller photo.');
  }
  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    return trimmed;
  }
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }
  throw new Error('Invalid photo format. Only HTTPS/HTTP URLs or PNG/JPG/WEBP/GIF images are permitted.');
}

/**
 * RBAC Authorization Middleware
 * Validates admin account status and granular permission flags in SQLite `admin_accounts`.
 */
const SUPER_ADMIN_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_SECRET = (process.env.SESSION_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');
const revokedSuperAdminTokens = new Set<string>();

interface SuperAdminTokenPayload {
  sub: string;
  role: 'super_admin';
  name: string;
  email: string;
  iat: number;
  exp: number;
  jti: string;
}

function signSuperAdminToken(admin: AdminAccount): { token: string; expiresAt: string } {
  const now = Date.now();
  const exp = now + SUPER_ADMIN_TOKEN_TTL_MS;
  const payload: SuperAdminTokenPayload = {
    sub: admin.id,
    role: 'super_admin',
    name: admin.fullName,
    email: admin.email,
    iat: now,
    exp,
    jti: crypto.randomBytes(12).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  return {
    token: `${payloadB64}.${sig}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

function verifySuperAdminBearerToken(authHeader?: string): {
  valid: boolean;
  reason?: string;
  rawToken?: string;
  payload?: SuperAdminTokenPayload;
  admin?: AdminAccount;
} {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, reason: 'Missing Super Admin Bearer token.' };
  }
  const rawToken = authHeader.slice(7).trim();
  if (!rawToken || revokedSuperAdminTokens.has(rawToken)) {
    return { valid: false, reason: 'Super Admin session expired or locked.' };
  }
  const parts = rawToken.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed authentication token.' };
  }
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) {
    return { valid: false, reason: 'Malformed authentication token.' };
  }
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest();
  let providedSig: Buffer;
  try {
    providedSig = Buffer.from(sigB64, 'base64url');
  } catch {
    return { valid: false, reason: 'Invalid token encoding.' };
  }
  if (expectedSig.length !== providedSig.length || !crypto.timingSafeEqual(expectedSig, providedSig)) {
    return { valid: false, reason: 'Invalid Super Admin token signature.' };
  }

  let payload: SuperAdminTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SuperAdminTokenPayload;
  } catch {
    return { valid: false, reason: 'Corrupted token payload.' };
  }

  if (!payload || payload.role !== 'super_admin' || payload.sub !== 'admin-founder-mukisa') {
    return { valid: false, reason: 'Token does not belong to verified Super Admin.' };
  }
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
    return { valid: false, reason: 'Super Admin session expired. Unlock again to continue.' };
  }

  const admin = getAdminById(payload.sub);
  if (!admin || admin.status !== 'active' || admin.role !== 'super_admin') {
    return { valid: false, reason: 'Super Admin account inactive or unavailable.' };
  }

  return { valid: true, rawToken, payload, admin };
}

function isBrianMukisaIdentifier(identifier?: string): boolean {
  const clean = (identifier || '').trim().toLowerCase();
  if (!clean) return false;
  const sa = getAdminById('admin-founder-mukisa');
  const saEmail = (sa?.email || 'bmukisa@bodawerk.co.ug').toLowerCase();
  const cleanDigits = clean.replace(/[^0-9]/g, '').slice(-9);
  const saDigits = (sa?.phone || '+256772100240').replace(/[^0-9]/g, '').slice(-9);
  return clean === saEmail || (cleanDigits.length >= 9 && cleanDigits === saDigits) || clean === 'admin-founder-mukisa';
}

function requireAdminPermission(requiredPermission?: keyof AdminPermissions) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    const authCheck = verifySuperAdminBearerToken(req.header('authorization'));
    if (authCheck.valid && authCheck.admin) {
      req.adminOperator = authCheck.admin;
      next();
      return;
    }

    const adminIdHeader = (req.header('x-admin-id') || '').trim();
    const roleHeader = (req.header('x-admin-role') || '').trim();
    const actorNameHeader = (req.header('x-actor-name') || '').trim();

    let operator: AdminAccount | null = null;
    if (adminIdHeader) {
      operator = getAdminById(adminIdHeader);
    } else if (roleHeader === 'super_admin') {
      operator = getAdminById('admin-founder-mukisa');
    }

    if (!operator || operator.status !== 'active' || (roleHeader && operator.role !== roleHeader && operator.role !== 'super_admin')) {
      insertAuditLog({
        actorId: adminIdHeader || 'anonymous',
        actorName: actorNameHeader || 'Unauthorized Caller',
        actorRole: roleHeader || 'guest',
        action: 'UNAUTHORIZED_ADMIN_ACCESS_BLOCKED',
        category: 'security',
        targetLabel: `${req.method} ${req.path}`,
        details: `Blocked access attempt (adminId=${adminIdHeader || 'none'}, role=${roleHeader || 'none'}).`,
      });
      res.status(403).json({
        error: 'Forbidden: Valid active BodaCare Uganda Administrator authorization is required.',
      });
      return;
    }

    if (operator.role !== 'super_admin' && requiredPermission && !operator.permissions[requiredPermission]) {
      insertAuditLog({
        actorId: operator.id,
        actorName: operator.fullName,
        actorRole: operator.role,
        action: 'RBAC_PERMISSION_DENIED',
        category: 'security',
        targetLabel: `${req.method} ${req.path}`,
        details: `Restricted admin "${operator.fullName}" (${operator.role}) attempted action requiring "${requiredPermission}".`,
      });
      res.status(403).json({
        error: `Forbidden: Your admin role (${operator.role}) does not have permission "${requiredPermission}".`,
      });
      return;
    }

    req.adminOperator = operator;
    next();
  };
}

/**
 * Strict Super Admin Middleware (Cryptographic Bearer Token Verification)
 * Rejects spoofed headers; only verified Brian Mukisa sessions holding a valid HMAC-SHA256 Bearer token pass.
 */
function requireSuperAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization');
  const verification = verifySuperAdminBearerToken(authHeader);

  if (!verification.valid || !verification.admin) {
    const adminIdHeader = (req.header('x-admin-id') || '').trim();
    const roleHeader = (req.header('x-admin-role') || '').trim();
    const actorNameHeader = (req.header('x-actor-name') || '').trim();
    insertAuditLog({
      actorId: adminIdHeader || 'anonymous',
      actorName: actorNameHeader || 'Unauthorized Caller',
      actorRole: roleHeader || 'guest',
      action: 'UNAUTHORIZED_SUPER_ADMIN_ACTION_BLOCKED',
      category: 'security',
      targetLabel: `${req.method} ${req.path}`,
      details: `Blocked unauthenticated or non-Super-Admin reset/system attempt (${verification.reason || 'no valid Bearer token'}, claimedRole=${roleHeader || 'none'}).`,
    });
    const statusCode = !authHeader ? 401 : 403;
    res.status(statusCode).json({
      error:
        verification.reason ||
        'Unauthorized: Only Brian Mukisa (verified Super Administrator session) may access App Reset & Member Management.',
    });
    return;
  }

  req.adminOperator = verification.admin;
  next();
}

function escapeCsvCell(val: unknown): string {
  const str = String(val ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

export function createApiApp(options: { enableScheduler?: boolean } = {}): express.Express {
  const app = express();
  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Normalize Netlify Function proxy path (`/.netlify/functions/api/...` -> `/api/...`)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.url.startsWith('/.netlify/functions/api')) {
      const stripped = req.url.slice('/.netlify/functions/api'.length);
      if (!stripped || stripped === '/') {
        req.url = '/api';
      } else if (stripped.startsWith('/api/') || stripped === '/api') {
        req.url = stripped;
      } else {
        req.url = `/api${stripped.startsWith('/') ? stripped : `/${stripped}`}`;
      }
    }
    next();
  });

  // Ensure SQLite DB schema & baseline seed initialized immediately
  getDb();

  // Start Automated Daily Job Discovery Engine background scheduler only in persistent server mode
  if (options.enableScheduler !== false) {
    startDiscoveryScheduler(notifyAdminOnJobDiscovery);
  }

  // =========================================================================
  // 1. MESSAGING GATEWAY & USSD STATUS ENDPOINTS
  // =========================================================================
  app.get('/api/sms/status', async (_req: Request, res: Response) => {
    const status = await fetchGatewayStatus();
    res.json(status);
  });

  app.get('/api/messaging/status', async (_req: Request, res: Response) => {
    const combined = await fetchCombinedMessagingStatus();
    res.json(combined);
  });

  // =========================================================================
  // 2. PUBLIC / APP SYNC ROUTES (PRESERVING EXISTING FUNCTIONALITY)
  // =========================================================================
  app.get('/api/riders', (_req: Request, res: Response) => {
    res.json({ riders: listRiders() });
  });

  app.post('/api/riders/sync', (req: Request, res: Response) => {
    const incoming = Array.isArray(req.body?.riders) ? (req.body.riders as RiderProfile[]) : [];
    const existing = listRiders();
    for (const r of incoming) {
      if (!r || !r.id) continue;
      const normPhone = normalizePhoneKey(r.phone);
      const match = existing.find(
        (x) => x.id === r.id || (normPhone && normalizePhoneKey(x.phone) === normPhone)
      );
      if (match) {
        upsertRiderRecord({ ...match, ...r, id: match.id }, true);
      } else {
        try {
          upsertRiderRecord(r, false);
        } catch {
          // ignore duplicate during background sync
        }
      }
    }
    res.json({ riders: listRiders() });
  });

  app.patch('/api/riders/:id/preferences', (req: Request, res: Response) => {
    const rider = getRiderById(req.params.id);
    if (!rider) {
      res.status(404).json({ error: 'Rider account not found.' });
      return;
    }

    const actorRole = req.header('x-admin-role') || 'rider';
    const actorName = req.header('x-actor-name') || rider.fullName;
    const body = req.body || {};

    if (typeof body.phone === 'string' && body.phone.trim()) {
      const check = validateUgandaPhone(body.phone.trim());
      if (!check.isValid) {
        res.status(400).json({ error: check.reason || 'Invalid primary Ugandan telephone number.' });
        return;
      }
    }

    if (typeof body.whatsappNumber === 'string' && body.whatsappNumber.trim()) {
      const waCheck = validateUgandaPhone(body.whatsappNumber.trim());
      if (!waCheck.isValid) {
        res.status(400).json({ error: waCheck.reason || 'Invalid WhatsApp Ugandan mobile number.' });
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const nextConsent = body.consentGiven ?? rider.jobAlertPreferences?.consentGiven ?? true;
    const nextEnabled = body.enabled ?? (nextConsent && (body.preferredChannel ?? rider.jobAlertPreferences?.preferredChannel) !== 'none');

    const updatedPrefs = {
      enabled: Boolean(nextEnabled),
      consentGiven: Boolean(nextConsent),
      consentUpdatedAt: body.consentGiven !== undefined ? nowIso : rider.jobAlertPreferences?.consentUpdatedAt || nowIso,
      preferredChannel: body.preferredChannel ?? rider.jobAlertPreferences?.preferredChannel ?? 'auto',
      optedOutSms: body.optedOutSms ?? (nextConsent === false ? true : rider.jobAlertPreferences?.optedOutSms ?? false),
      optedOutAt:
        body.optedOutSms === true || nextConsent === false
          ? nowIso
          : body.optedOutSms === false
          ? undefined
          : rider.jobAlertPreferences?.optedOutAt,
      optOutReason:
        body.optedOutSms === false ? undefined : body.optOutReason ?? rider.jobAlertPreferences?.optOutReason,
      jobTypes: Array.isArray(body.jobTypes)
        ? body.jobTypes
        : rider.jobAlertPreferences?.jobTypes || ['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda', 'passenger_contract'],
      preferredSubCounties: Array.isArray(body.preferredSubCounties)
        ? body.preferredSubCounties
        : rider.jobAlertPreferences?.preferredSubCounties || ['Kikyusa', 'Luweero Town Council'],
      occupation:
        typeof body.occupation === 'string'
          ? body.occupation.trim() || undefined
          : rider.jobAlertPreferences?.occupation,
      qualifications: Array.isArray(body.qualifications)
        ? body.qualifications.map((q: unknown) => String(q).trim()).filter(Boolean)
        : rider.jobAlertPreferences?.qualifications || [],
      updatedAt: nowIso,
    };

    try {
      const saved = upsertRiderRecord(
        {
          ...rider,
          fullName: typeof body.fullName === 'string' && body.fullName.trim() ? body.fullName.trim() : rider.fullName,
          phone: typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : rider.phone,
          whatsappNumber:
            typeof body.whatsappNumber === 'string'
              ? body.whatsappNumber.trim() || undefined
              : rider.whatsappNumber,
          phoneType: body.phoneType === 'smartphone' || body.phoneType === 'feature_phone' ? body.phoneType : rider.phoneType || 'smartphone',
          district: typeof body.district === 'string' && body.district.trim() ? body.district.trim() : rider.district,
          village: typeof body.village === 'string' && body.village.trim() ? body.village.trim() : rider.village,
          subCounty: typeof body.subCounty === 'string' && body.subCounty.trim() ? body.subCounty.trim() : rider.subCounty,
          stageId: typeof body.stageId === 'string' && body.stageId.trim() ? body.stageId.trim() : rider.stageId,
          stageName: typeof body.stageName === 'string' && body.stageName.trim() ? body.stageName.trim() : rider.stageName,
          jobAlertPreferences: updatedPrefs,
        },
        false
      );

      insertAuditLog({
        actorName,
        actorRole: actorRole === 'super_admin' ? 'super_admin' : 'rider',
        action: 'RIDER_JOB_PREFERENCES_UPDATED',
        category: 'riders',
        targetId: saved.id,
        targetLabel: `${saved.fullName} (${saved.phone})`,
        details: `Channel: ${updatedPrefs.preferredChannel}, Consent: ${updatedPrefs.consentGiven}, SMS OptOut: ${updatedPrefs.optedOutSms}, District: ${saved.district}, Stage: ${saved.stageName}`,
      });

      res.json({ rider: saved });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to update rider preferences.' });
    }
  });

  app.get('/api/jobs', (_req: Request, res: Response) => {
    res.json({ jobs: listJobs() });
  });

  app.post('/api/jobs', (req: Request, res: Response) => {
    const job = req.body as BodaJob;
    if (!job || !job.title || !job.employerPhone) {
      res.status(400).json({ error: 'Job title and employer phone number are required.' });
      return;
    }
    const saved = upsertJobRecord(job);
    res.json({ job: saved });
  });

  app.patch('/api/jobs/:id', requireAdminPermission('manageJobs'), (req: AdminRequest, res: Response) => {
    const all = listJobs();
    const existing = all.find((j) => j.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    const saved = upsertJobRecord({ ...existing, ...req.body, id: existing.id });
    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: req.adminOperator?.fullName || 'Admin',
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'JOB_UPDATED',
      category: 'jobs',
      targetId: saved.id,
      targetLabel: saved.title,
      details: `Status: ${saved.status}, Verified: ${saved.adminApproved}`,
    });
    res.json({ job: saved });
  });

  app.delete('/api/jobs/:id', requireAdminPermission('deleteRecords'), (req: AdminRequest, res: Response) => {
    const deleted = deleteJobRecord(req.params.id);
    if (deleted) {
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'JOB_DELETED',
        category: 'jobs',
        targetId: req.params.id,
        targetLabel: req.params.id,
        details: 'Job listing permanently deleted from SQLite registry.',
      });
    }
    res.json({ deleted });
  });

  // =========================================================================
  // 3. ADVANCED JOB NOTIFICATION & MULTI-CHANNEL BROADCASTING SYSTEM
  // =========================================================================
  app.get('/api/job-notifications/dashboard', requireAdminPermission('viewAnalytics'), async (req: AdminRequest, res: Response) => {
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const channel = typeof req.query.channel === 'string' ? req.query.channel : undefined;

    res.json({
      stats: getJobNotificationDashboardStats(),
      broadcasts: listJobBroadcasts(),
      deliveries: listJobDeliveries({ jobId, status, channel, limit: 350 }),
      gatewayStatus: await fetchCombinedMessagingStatus(),
    });
  });

  app.post('/api/job-notifications/broadcast', requireAdminPermission('sendNotifications'), async (req: AdminRequest, res: Response) => {
    const {
      job,
      dispatchMode,
      recipientScope,
      selectedDistricts,
      selectedVillages,
      selectedStageIds,
      selectedRiderIds,
      customSmsMessage,
      customWhatsappMessage,
      adminName,
      respectJobTypeFilter = true,
      ridersSnapshot,
    } = req.body as {
      job: BodaJob;
      dispatchMode: JobAlertDispatchMode;
      recipientScope: SmsRecipientScope;
      selectedDistricts?: string[];
      selectedVillages?: string[];
      selectedStageIds?: string[];
      selectedRiderIds?: string[];
      customSmsMessage?: string;
      customWhatsappMessage?: string;
      adminName?: string;
      respectJobTypeFilter?: boolean;
      ridersSnapshot?: RiderProfile[];
    };

    if (!job || !job.id || !job.title) {
      res.status(400).json({ error: 'Valid verified job payload is required.' });
      return;
    }
    if (!job.adminApproved) {
      res.status(400).json({ error: 'Job must be verified by an administrator before broadcasting alerts.' });
      return;
    }

    if (Array.isArray(ridersSnapshot)) {
      for (const r of ridersSnapshot) {
        if (!r?.id) continue;
        try {
          upsertRiderRecord(r, true);
        } catch {
          // preserve existing record if phone/plate conflict during background cache merge
        }
      }
    }

    const appOrigin = resolveAppOrigin(req);
    const sentBy = adminName || req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)';

    if (dispatchMode === 'none') {
      upsertJobRecord({ ...job, notificationMode: 'none' }, true);
      res.json({
        success: true,
        queued: false,
        message: 'Job published without broadcasting notifications.',
        stats: getJobNotificationDashboardStats(),
      });
      return;
    }

    const allRiders = listRiders();
    const { matched, scopeDetails } = resolveTargetRiders(allRiders, recipientScope, {
      selectedDistricts,
      selectedVillages,
      selectedStageIds,
      selectedRiderIds,
    });

    const result = await enqueueJobSeekerBroadcast({
      job,
      dispatchMode,
      matchedRiders: matched,
      recipientScope,
      scopeDetails,
      appOrigin,
      sentBy,
      adminOperatorId: req.adminOperator?.id,
      customSmsMessage,
      customWhatsappMessage,
      respectJobTypeFilter,
    });

    res.json({
      success: true,
      queued: result.queued,
      broadcast: result.broadcast,
      deliveries: result.deliveries,
      stats: getJobNotificationDashboardStats(),
      gatewayStatus: await fetchCombinedMessagingStatus(),
    });
  });

  app.post('/api/job-notifications/retry', requireAdminPermission('sendNotifications'), async (req: AdminRequest, res: Response) => {
    const { deliveryIds, broadcastId } = req.body as {
      deliveryIds?: string[];
      broadcastId?: string;
    };

    const retryCandidates: JobBroadcastDelivery[] = [];
    if (Array.isArray(deliveryIds) && deliveryIds.length > 0) {
      for (const did of deliveryIds) {
        const d = getJobDeliveryById(did);
        if (d && (d.status === 'failed' || d.status === 'blocked_unconfigured' || d.status === 'invalid_number')) {
          retryCandidates.push(d);
        }
      }
    } else if (broadcastId) {
      const list = listJobDeliveries({ broadcastId, limit: 2000 });
      for (const d of list) {
        if (d.status === 'failed' || d.status === 'blocked_unconfigured' || d.status === 'invalid_number') {
          retryCandidates.push(d);
        }
      }
    } else {
      const all = listJobDeliveries({ limit: 1000 });
      for (const d of all) {
        if (d.status === 'failed' || d.status === 'blocked_unconfigured') {
          retryCandidates.push(d);
        }
      }
    }

    if (retryCandidates.length === 0) {
      res.status(400).json({ error: 'No failed or blocked notifications matched for retry.' });
      return;
    }

    const touchedBroadcasts = new Set<string>();
    const nowIso = new Date().toISOString();
    const riders = listRiders();

    let requeuedCount = 0;
    for (const del of retryCandidates) {
      const freshRider = riders.find((r) => r.id === del.riderId);
      const rawPhone =
        del.channel === 'whatsapp'
          ? freshRider?.whatsappNumber || freshRider?.phone || del.targetPhone
          : freshRider?.phone || del.targetPhone;
      const check = validateUgandaPhone(rawPhone || '');

      if (!check.isValid) {
        upsertJobDeliveryRecord({
          ...del,
          targetPhone: rawPhone || del.targetPhone,
          network: 'Invalid',
          status: 'invalid_number',
          errorReason: check.reason || 'Phone number remains invalid upon retry.',
          retryCount: del.retryCount + 1,
          lastAttemptAt: nowIso,
          updatedAt: nowIso,
        });
      } else {
        upsertJobDeliveryRecord({
          ...del,
          targetPhone: check.normalized,
          network: check.network,
          status: 'pending',
          errorReason: undefined,
          retryCount: del.retryCount + 1,
          updatedAt: nowIso,
        });
        requeuedCount++;
      }
      touchedBroadcasts.add(del.broadcastId);
    }

    const sentBy = req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)';
    for (const bid of touchedBroadcasts) {
      recomputeJobBroadcastCounts(bid);
      setImmediate(() => {
        void processBroadcastQueueAsync(bid, sentBy);
      });
    }

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: sentBy,
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'JOB_NOTIFICATIONS_RETRIED',
      category: 'jobs',
      targetLabel: `${retryCandidates.length} delivery attempt(s)`,
      details: `Re-queued ${requeuedCount} failed/blocked job notifications across ${touchedBroadcasts.size} broadcast(s).`,
    });

    res.json({
      success: true,
      requeuedCount,
      touchedBroadcastIds: Array.from(touchedBroadcasts),
      stats: getJobNotificationDashboardStats(),
    });
  });

  app.post('/api/sms/send-job-alert', requireAdminPermission('sendNotifications'), async (req: AdminRequest, res: Response) => {
    const {
      job,
      dispatchMode,
      recipientScope,
      selectedDistricts,
      selectedVillages,
      selectedStageIds,
      selectedRiderIds,
      customMessage,
      adminName,
      respectJobTypeFilter = true,
      ridersSnapshot,
    } = req.body as {
      job: BodaJob;
      dispatchMode: JobAlertDispatchMode;
      recipientScope: SmsRecipientScope;
      selectedDistricts?: string[];
      selectedVillages?: string[];
      selectedStageIds?: string[];
      selectedRiderIds?: string[];
      customMessage?: string;
      adminName?: string;
      respectJobTypeFilter?: boolean;
      ridersSnapshot?: RiderProfile[];
    };

    if (!job || !job.id || !job.title) {
      res.status(400).json({ error: 'Valid verified job payload is required.' });
      return;
    }
    if (!job.adminApproved) {
      res.status(400).json({ error: 'Job must be verified by an administrator before broadcasting alerts.' });
      return;
    }

    if (Array.isArray(ridersSnapshot)) {
      for (const r of ridersSnapshot) {
        if (!r?.id) continue;
        try {
          upsertRiderRecord(r, true);
        } catch {
          // ignore
        }
      }
    }

    upsertJobRecord(job, true);

    if (dispatchMode === 'none') {
      res.json({
        success: true,
        gatewayConfigured: getSmsConfigFromEnv().configured,
        smsBlocked: false,
        message: 'Job saved without sending notifications.',
      });
      return;
    }

    const appOrigin = resolveAppOrigin(req);
    const riders = listRiders();
    const { matched, scopeDetails } = resolveTargetRiders(riders, recipientScope, {
      selectedDistricts,
      selectedVillages,
      selectedStageIds,
      selectedRiderIds,
    });

    const smsText = (customMessage || formatJobSmsTemplate(job, appOrigin)).trim();
    const segInfo = calculateSmsSegments(smsText);
    const cfg = getSmsConfigFromEnv();
    const nowIso = new Date().toISOString();

    const deliveries: SmsRecipientDelivery[] = [];
    const smsQueue: { rider: RiderProfile; normalizedPhone: string; network: 'MTN' | 'Airtel' | 'Other' }[] = [];
    let appNotificationsSentCount = 0;
    let invalidPhoneCount = 0;
    let optedOutSkippedCount = 0;

    for (const rider of matched) {
      const phoneType = rider.phoneType || 'smartphone';
      const prefs = rider.jobAlertPreferences || {
        enabled: true,
        consentGiven: true,
        preferredChannel: phoneType === 'feature_phone' ? 'sms_only' : 'auto',
        optedOutSms: false,
        jobTypes: ['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda', 'passenger_contract'],
        preferredSubCounties: [],
        updatedAt: nowIso,
      };

      const hasConsent = prefs.enabled !== false && prefs.consentGiven !== false && prefs.preferredChannel !== 'none';
      const matchesJobType = !respectJobTypeFilter || !prefs.jobTypes?.length || prefs.jobTypes.includes(job.type);
      const phoneCheck = validateUgandaPhone(rider.phone);

      let wantsApp = false;
      let wantsSms = false;

      if (dispatchMode === 'app_only') {
        wantsApp = phoneType === 'smartphone' && hasConsent && prefs.preferredChannel !== 'sms_only' && matchesJobType;
      } else if (dispatchMode === 'sms_only' || dispatchMode === 'sms_whatsapp') {
        wantsSms = hasConsent && !prefs.optedOutSms && matchesJobType && !hasExistingJobNotification(job.id, rider.id, 'sms');
      } else if (dispatchMode === 'both' || dispatchMode === 'all_channels') {
        wantsApp = phoneType === 'smartphone' && hasConsent && prefs.preferredChannel !== 'sms_only' && matchesJobType;
        wantsSms =
          hasConsent &&
          !prefs.optedOutSms &&
          matchesJobType &&
          !hasExistingJobNotification(job.id, rider.id, 'sms') &&
          (phoneType === 'feature_phone' || prefs.preferredChannel === 'both' || prefs.preferredChannel === 'auto' || prefs.preferredChannel === 'sms_only' || prefs.preferredChannel === 'sms_whatsapp');
      }

      if (wantsApp) {
        insertNotification({
          id: `notif-job-${job.id}-${rider.id}-${Date.now()}`,
          userId: rider.id,
          title: `New Job Alert: ${job.title}`,
          message: `${job.employerCompany} (${job.village ? `${job.village}, ` : ''}${job.subCounty}) — Pay: ${
            job.salaryDisplay || `UGX ${job.paymentAmountUgx.toLocaleString()}`
          }. Call ${job.employerPhone} before ${job.deadline}.`,
          timestamp: nowIso,
          read: false,
          type: 'job',
          actionUrl: `jobs?jobId=${job.id}`,
        });
        appNotificationsSentCount++;
      }

      if (wantsSms) {
        if (!phoneCheck.isValid) {
          invalidPhoneCount++;
          deliveries.push({
            riderId: rider.id,
            riderName: rider.fullName,
            phone: rider.phone,
            normalizedPhone: phoneCheck.normalized,
            network: 'Invalid',
            phoneType,
            channel: wantsApp ? 'in_app' : 'skipped',
            smsStatus: 'invalid_number',
            appNotifSent: wantsApp,
            costUgx: 0,
            failureReason: phoneCheck.reason || 'Invalid Ugandan mobile number',
            updatedAt: nowIso,
          });
          continue;
        }

        smsQueue.push({
          rider,
          normalizedPhone: phoneCheck.normalized,
          network: phoneCheck.network as 'MTN' | 'Airtel' | 'Other',
        });
        deliveries.push({
          riderId: rider.id,
          riderName: rider.fullName,
          phone: rider.phone,
          normalizedPhone: phoneCheck.normalized,
          network: phoneCheck.network,
          phoneType,
          channel: wantsApp ? 'both' : 'sms',
          smsStatus: 'queued',
          appNotifSent: wantsApp,
          costUgx: 0,
          updatedAt: nowIso,
        });
      } else {
        const dupBlocked = (dispatchMode === 'sms_only' || dispatchMode === 'both') && hasExistingJobNotification(job.id, rider.id, 'sms');
        if (prefs.optedOutSms && (dispatchMode === 'sms_only' || dispatchMode === 'both')) {
          optedOutSkippedCount++;
        }
        deliveries.push({
          riderId: rider.id,
          riderName: rider.fullName,
          phone: rider.phone,
          normalizedPhone: phoneCheck.normalized,
          network: phoneCheck.network,
          phoneType,
          channel: wantsApp ? 'in_app' : 'skipped',
          smsStatus: dupBlocked ? 'skipped_duplicate' : prefs.optedOutSms ? 'opted_out' : 'queued',
          appNotifSent: wantsApp,
          costUgx: 0,
          failureReason: dupBlocked
            ? 'Already notified for this job via SMS (duplicate prevented)'
            : prefs.optedOutSms
            ? 'Rider opted out of SMS alerts'
            : !matchesJobType
            ? 'Job category filtered out by rider preferences'
            : dispatchMode === 'app_only' && phoneType === 'feature_phone'
            ? 'Feature-phone rider cannot receive app notifications (choose SMS or Both)'
            : undefined,
          updatedAt: nowIso,
        });
      }
    }

    const estimatedCostUgx = smsQueue.length * segInfo.segments * cfg.costPerSmsUgx;
    let smsSentCount = 0;
    let smsFailedCount = 0;
    let actualExpenditureUgx = 0;
    let gatewayError: string | undefined;
    let smsBlocked = false;

    if (smsQueue.length > 0) {
      if (!cfg.configured) {
        smsBlocked = true;
        gatewayError = `External SMS Gateway (${cfg.envMode}) is not configured. Required before sending real SMS: ${cfg.requirementsMissing.join(' | ')}`;
        for (const d of deliveries) {
          if (d.smsStatus === 'queued' && (d.channel === 'sms' || d.channel === 'both')) {
            d.smsStatus = 'blocked_unconfigured';
            d.failureReason = 'Gateway not configured (Missing AFRICASTALKING_USERNAME / AFRICASTALKING_API_KEY / Sender ID / Funding)';
            smsFailedCount++;
          }
        }
      } else {
        const baseUrl =
          cfg.envMode === 'sandbox'
            ? 'https://api.sandbox.africastalking.com'
            : 'https://api.africastalking.com';

        const params = new URLSearchParams();
        params.append('username', cfg.username);
        params.append('to', smsQueue.map((q) => q.normalizedPhone).join(','));
        params.append('message', smsText);
        if (cfg.senderId && cfg.senderIdApproved) {
          params.append('from', cfg.senderId);
        }

        try {
          const atResponse = await fetch(`${baseUrl}/version1/messaging`, {
            method: 'POST',
            headers: {
              apiKey: cfg.apiKey,
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          });

          const rawText = await atResponse.text();
          if (!atResponse.ok) {
            smsBlocked = true;
            gatewayError = `Africa's Talking API HTTP ${atResponse.status}: ${rawText}`;
            for (const d of deliveries) {
              if (d.smsStatus === 'queued' && (d.channel === 'sms' || d.channel === 'both')) {
                d.smsStatus = 'failed';
                d.failureReason = gatewayError;
                smsFailedCount++;
              }
            }
          } else {
            const parsed = JSON.parse(rawText) as {
              SMSMessageData?: {
                Message?: string;
                Recipients?: Array<{
                  number: string;
                  status: string;
                  statusCode: number;
                  cost: string;
                  messageId: string;
                }>;
              };
            };

            const recipients = parsed.SMSMessageData?.Recipients || [];
            for (const rec of recipients) {
              const target = deliveries.find((d) => d.normalizedPhone === rec.number && (d.channel === 'sms' || d.channel === 'both'));
              if (!target) continue;
              target.providerMessageId = rec.messageId;
              target.updatedAt = new Date().toISOString();

              const ok = rec.statusCode === 100 || rec.statusCode === 101 || rec.statusCode === 102;
              const numericCost = parseFloat((rec.cost || '0').replace(/[^0-9.]/g, '')) || 0;

              if (ok) {
                target.smsStatus = 'sent';
                target.costUgx = numericCost || segInfo.segments * cfg.costPerSmsUgx;
                smsSentCount++;
                actualExpenditureUgx += target.costUgx;
              } else {
                target.smsStatus = 'failed';
                target.failureReason = `${rec.status} (Code ${rec.statusCode})`;
                smsFailedCount++;
              }
            }

            for (const d of deliveries) {
              if (d.smsStatus === 'queued' && (d.channel === 'sms' || d.channel === 'both')) {
                d.smsStatus = 'failed';
                d.failureReason = parsed.SMSMessageData?.Message || 'Not acknowledged by carrier gateway';
                smsFailedCount++;
              }
            }
          }
        } catch (err) {
          smsBlocked = true;
          gatewayError = `Network error calling Africa's Talking: ${err instanceof Error ? err.message : 'Unknown error'}`;
          for (const d of deliveries) {
            if (d.smsStatus === 'queued' && (d.channel === 'sms' || d.channel === 'both')) {
              d.smsStatus = 'failed';
              d.failureReason = gatewayError;
              smsFailedCount++;
            }
          }
        }
      }
    }

    const campaign: SmsCampaignRecord = {
      id: `camp-${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      sentByAdminName: adminName || req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
      sentByAdminRole: 'super_admin',
      sentAt: nowIso,
      dispatchMode,
      recipientScope,
      scopeDetails,
      messageText: smsText,
      smsSegments: segInfo.segments,
      totalTargetedRiders: matched.length,
      smsAttemptedCount: smsQueue.length,
      smsSentCount,
      smsDeliveredCount: 0,
      smsFailedCount,
      invalidPhoneCount,
      optedOutSkippedCount,
      appNotificationsSentCount,
      estimatedCostUgx,
      actualExpenditureUgx,
      provider: "Africa's Talking Uganda (MTN & Airtel)",
      senderId: cfg.senderIdApproved ? cfg.senderId : `${cfg.senderId} (Unapproved)`,
      gatewayConfigured: cfg.configured,
      gatewayError,
      deliveries,
    };

    saveSmsCampaignRecord(campaign);
    if (appNotificationsSentCount > 0) {
      void sendWebPushToSubscribers({
        title: `New Job Alert: ${job.title}`,
        body: `${job.employerCompany} (${job.subCounty}) — ${job.salaryDisplay || `UGX ${job.paymentAmountUgx.toLocaleString()}`}`,
        url: `/?jobId=${encodeURIComponent(job.id)}`,
        tag: `eboda-job-${job.id}`,
      });
    }
    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: campaign.sentByAdminName,
      actorRole: req.adminOperator?.role || 'super_admin',
      action: smsBlocked ? 'JOB_SMS_BLOCKED_UNCONFIGURED' : 'JOB_ALERT_CAMPAIGN_DISPATCHED',
      category: 'jobs',
      targetId: job.id,
      targetLabel: `${job.title} (${matched.length} targeted)`,
      details: `Mode: ${dispatchMode}. App alerts: ${appNotificationsSentCount}. SMS Sent: ${smsSentCount}, Failed/Blocked: ${smsFailedCount}. Cost: UGX ${actualExpenditureUgx}.`,
    });

    res.json({
      success: true,
      gatewayConfigured: cfg.configured,
      smsBlocked,
      requirementsMissing: cfg.requirementsMissing,
      campaign,
    });
  });

  app.post('/api/sms/dlr', (req: Request, res: Response) => {
    const { id, status, phoneNumber, failureReason } = req.body || {};
    const campaigns = listSmsCampaigns();
    let updated = false;
    const normalizedStatus = String(status || '').toLowerCase();

    if (id) {
      const nextSt: SmsDeliveryStatus | null =
        normalizedStatus === 'success' || normalizedStatus === 'delivered'
          ? 'delivered'
          : normalizedStatus === 'failed' || normalizedStatus === 'rejected'
          ? 'failed'
          : null;
      if (nextSt) {
        const hit = updateJobDeliveryByProviderId(String(id), nextSt, failureReason ? String(failureReason) : undefined);
        if (hit) updated = true;
      }
    }

    for (const camp of campaigns) {
      let campUpdated = false;
      for (const d of camp.deliveries) {
        if ((id && d.providerMessageId === id) || (phoneNumber && d.normalizedPhone === phoneNumber && d.smsStatus === 'sent')) {
          if (normalizedStatus === 'success' || normalizedStatus === 'delivered') {
            d.smsStatus = 'delivered';
            d.updatedAt = new Date().toISOString();
            campUpdated = true;
          } else if (normalizedStatus === 'failed' || normalizedStatus === 'rejected') {
            d.smsStatus = 'failed';
            d.failureReason = failureReason || status;
            d.updatedAt = new Date().toISOString();
            campUpdated = true;
          }
        }
      }
      if (campUpdated) {
        camp.smsDeliveredCount = camp.deliveries.filter((x) => x.smsStatus === 'delivered').length;
        camp.smsFailedCount = camp.deliveries.filter((x) => x.smsStatus === 'failed' || x.smsStatus === 'blocked_unconfigured').length;
        saveSmsCampaignRecord(camp);
        updated = true;
      }
    }

    res.status(200).json({ received: true, updated });
  });

  // Meta WhatsApp Business Cloud API Delivery Status Webhook
  app.get('/api/whatsapp/webhook', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'bodacare_whatsapp_verify').trim();

    if (mode === 'subscribe' && token === expectedToken && typeof challenge === 'string') {
      res.status(200).send(challenge);
      return;
    }
    res.sendStatus(403);
  });

  app.post('/api/whatsapp/webhook', (req: Request, res: Response) => {
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
    let updatedCount = 0;

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const ch of changes) {
        const statuses = Array.isArray(ch?.value?.statuses) ? ch.value.statuses : [];
        for (const st of statuses) {
          const msgId = String(st?.id || '');
          const stVal = String(st?.status || '').toLowerCase();
          if (!msgId) continue;

          if (stVal === 'delivered' || stVal === 'read') {
            if (updateJobDeliveryByProviderId(msgId, 'delivered')) updatedCount++;
          } else if (stVal === 'failed') {
            const errMsg = st?.errors?.[0]?.title || st?.errors?.[0]?.message || 'WhatsApp delivery failed';
            if (updateJobDeliveryByProviderId(msgId, 'failed', errMsg)) updatedCount++;
          }
        }
      }
    }

    res.status(200).json({ received: true, updatedCount });
  });

  app.get('/api/sms/campaigns', requireAdminPermission('viewAnalytics'), (_req: Request, res: Response) => {
    res.json({ campaigns: listSmsCampaigns() });
  });

  app.get('/api/notifications', (req: Request, res: Response) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    res.json({ notifications: listNotifications(userId) });
  });

  // =========================================================================
  // 4. CENTRALIZED ADMIN MANAGEMENT API (SQLite + RBAC)
  // =========================================================================
  app.get('/api/admin/bootstrap', requireAdminPermission('viewAnalytics'), async (_req: AdminRequest, res: Response) => {
    const gatewayStatus = await fetchCombinedMessagingStatus();
    res.json({
      analytics: computeCentralAnalytics(),
      riders: listRiders(),
      passengers: listPassengers(),
      jobs: listJobs(),
      stations: listSwapStations(),
      centres: listMaintenanceCentres(),
      stages: listStages(),
      admins: listAdminAccounts(),
      auditLogs: listAuditLogs(150),
      deliveryLogs: listDeliveryLogs(150),
      gatewayStatus,
    });
  });

  app.get('/api/admin/analytics', requireAdminPermission('viewAnalytics'), (_req: AdminRequest, res: Response) => {
    res.json({ analytics: computeCentralAnalytics() });
  });

  // --- RIDER MANAGEMENT ---
  app.get('/api/admin/riders', requireAdminPermission('manageRiders'), (_req: AdminRequest, res: Response) => {
    res.json({ riders: listRiders() });
  });

  app.post('/api/admin/riders', requireAdminPermission('manageRiders'), async (req: AdminRequest, res: Response) => {
    try {
      const { rider, confirmationChannels } = req.body as {
        rider: RiderProfile;
        confirmationChannels?: Array<'in_app' | 'sms' | 'whatsapp'>;
      };
      if (!rider?.fullName || !rider?.phone || !rider?.motorcycleReg) {
        res.status(400).json({ error: 'Full name, telephone number, and motorcycle registration plate are required.' });
        return;
      }
      const phoneCheck = validateUgandaPhone(rider.phone);
      if (!phoneCheck.isValid) {
        res.status(400).json({ error: phoneCheck.reason || 'Invalid Uganda phone number.' });
        return;
      }

      const safeAvatar = sanitizeImageUrl(rider.avatarUrl);
      unrevokeByPhoneOrEmail(phoneCheck.normalized, undefined, rider.id);
      const saved = upsertRiderRecord({ ...rider, avatarUrl: safeAvatar }, false);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_RIDER_REGISTERED',
        category: 'riders',
        targetId: saved.id,
        targetLabel: `${saved.fullName} (${saved.riderIdNumber})`,
        details: `Registered ${saved.motorcycleType} rider (${saved.motorcycleReg}) at stage "${saved.stageName}", phoneType=${saved.phoneType}.`,
      });

      let deliveries: WelcomeNotificationRecord[] = [];
      try {
        deliveries = await dispatchAutomatedWelcomeForMember({
          recipientId: saved.id,
          recipientName: saved.fullName,
          phone: saved.phone,
          whatsappNumber: saved.whatsappNumber,
          memberId: saved.riderIdNumber,
          location: `${saved.stageName ? `${saved.stageName}, ` : ''}${saved.subCounty || 'Kikyusa'}, ${saved.district || 'Luweero'}`,
          accountCategory: 'rider',
          registrationSource: 'admin_manual',
          registrationDate: saved.registrationDate || new Date().toISOString().split('T')[0],
          sentBy: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
        });
      } catch (err) {
        console.error('Non-fatal automated welcome error on admin rider registration:', err);
      }

      res.json({ rider: saved, deliveries, analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to register rider.' });
    }
  });

  app.put('/api/admin/riders/:id', requireAdminPermission('manageRiders'), (req: AdminRequest, res: Response) => {
    try {
      const existing = getRiderById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Rider record not found.' });
        return;
      }
      const nextAvatar =
        req.body.avatarUrl !== undefined ? sanitizeImageUrl(req.body.avatarUrl) : existing.avatarUrl;
      const saved = upsertRiderRecord({ ...existing, ...req.body, id: existing.id, avatarUrl: nextAvatar }, false);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_RIDER_UPDATED',
        category: 'riders',
        targetId: saved.id,
        targetLabel: `${saved.fullName} (${saved.riderIdNumber})`,
        details: `Updated rider details (Status: ${saved.accountStatus}, Verification: ${saved.verificationStatus}, Stage: ${saved.stageName}).`,
      });
      res.json({ rider: saved, analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to update rider.' });
    }
  });

  app.post('/api/admin/riders/:id/transfer-stage', requireAdminPermission('manageStages'), (req: AdminRequest, res: Response) => {
    try {
      const { stageId } = req.body as { stageId: string };
      if (!stageId) {
        res.status(400).json({ error: 'Target stageId is required.' });
        return;
      }
      const result = assignRiderToStage(req.params.id, stageId);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_RIDER_STAGE_TRANSFERRED',
        category: 'stages',
        targetId: result.rider.id,
        targetLabel: result.rider.fullName,
        details: `Assigned/transferred to stage "${result.stage.name}" (${result.stage.subCounty}).`,
      });
      res.json({ ...result, stages: listStages(), analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to transfer rider.' });
    }
  });

  app.delete('/api/admin/riders/:id', requireAdminPermission('deleteRecords'), (req: AdminRequest, res: Response) => {
    const actorName = req.adminOperator?.fullName || 'Super Admin';
    const outcome = deleteEntityWithCleanup(
      'riders',
      req.params.id,
      { id: req.adminOperator?.id || 'admin-founder-mukisa', name: actorName },
      `Deleted individually by ${actorName}`
    );
    if (outcome.deleted) {
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName,
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_RIDER_DELETED',
        category: 'riders',
        targetId: req.params.id,
        targetLabel: outcome.label,
        details: `Permanently removed rider record and revoked access (${outcome.label}).`,
      });
    }
    res.json({ deleted: outcome.deleted, analytics: computeCentralAnalytics() });
  });

  // --- PASSENGER MANAGEMENT ---
  app.get('/api/admin/passengers', requireAdminPermission('managePassengers'), (_req: AdminRequest, res: Response) => {
    res.json({ passengers: listPassengers() });
  });

  app.post('/api/admin/passengers', requireAdminPermission('managePassengers'), async (req: AdminRequest, res: Response) => {
    try {
      const { passenger, confirmationChannels } = req.body as {
        passenger: PassengerProfile;
        confirmationChannels?: Array<'in_app' | 'sms' | 'whatsapp'>;
      };
      if (!passenger?.fullName || !passenger?.phone) {
        res.status(400).json({ error: 'Passenger full name and telephone number are required.' });
        return;
      }
      const phoneCheck = validateUgandaPhone(passenger.phone);
      if (!phoneCheck.isValid) {
        res.status(400).json({ error: phoneCheck.reason || 'Invalid Uganda phone number.' });
        return;
      }

      const safeAvatar = sanitizeImageUrl(passenger.avatarUrl);
      unrevokeByPhoneOrEmail(phoneCheck.normalized, undefined, passenger.id);
      const saved = upsertPassengerRecord({ ...passenger, avatarUrl: safeAvatar }, false);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_PASSENGER_REGISTERED',
        category: 'passengers',
        targetId: saved.id,
        targetLabel: `${saved.fullName} (${saved.passengerIdNumber})`,
        details: `Registered passenger (${saved.phoneType}, assisted=${saved.assistedRegistration}) in ${saved.subCounty}, ${saved.district}.`,
      });

      let deliveries: WelcomeNotificationRecord[] = [];
      try {
        deliveries = await dispatchAutomatedWelcomeForMember({
          recipientId: saved.id,
          recipientName: saved.fullName,
          phone: saved.phone,
          whatsappNumber: saved.whatsappNumber,
          memberId: saved.passengerIdNumber || saved.id,
          location: `${saved.subCounty || 'Luweero Town Council'}, ${saved.district || 'Luweero'}`,
          accountCategory: 'passenger',
          registrationSource: 'admin_manual',
          registrationDate: (saved.createdAt || new Date().toISOString()).split('T')[0],
          sentBy: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
        });
      } catch (err) {
        console.error('Non-fatal automated welcome error on admin passenger registration:', err);
      }

      res.json({ passenger: saved, deliveries, analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to register passenger.' });
    }
  });

  app.put('/api/admin/passengers/:id', requireAdminPermission('managePassengers'), (req: AdminRequest, res: Response) => {
    try {
      const existing = listPassengers().find((p) => p.id === req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Passenger record not found.' });
        return;
      }
      const nextAvatar =
        req.body.avatarUrl !== undefined ? sanitizeImageUrl(req.body.avatarUrl) : existing.avatarUrl;
      const saved = upsertPassengerRecord({ ...existing, ...req.body, id: existing.id, avatarUrl: nextAvatar }, false);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_PASSENGER_UPDATED',
        category: 'passengers',
        targetId: saved.id,
        targetLabel: `${saved.fullName} (${saved.passengerIdNumber})`,
        details: `Updated passenger account (Status: ${saved.accountStatus}, Verification: ${saved.verificationStatus}).`,
      });
      res.json({ passenger: saved, analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to update passenger.' });
    }
  });

  app.delete('/api/admin/passengers/:id', requireAdminPermission('deleteRecords'), (req: AdminRequest, res: Response) => {
    const actorName = req.adminOperator?.fullName || 'Super Admin';
    const outcome = deleteEntityWithCleanup(
      'passengers',
      req.params.id,
      { id: req.adminOperator?.id || 'admin-founder-mukisa', name: actorName },
      `Deleted individually by ${actorName}`
    );
    if (outcome.deleted) {
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName,
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_PASSENGER_DELETED',
        category: 'passengers',
        targetId: req.params.id,
        targetLabel: outcome.label,
        details: `Removed passenger record and revoked access (${outcome.label}).`,
      });
    }
    res.json({ deleted: outcome.deleted, analytics: computeCentralAnalytics() });
  });

  // --- BATTERY SWAP STATIONS MANAGEMENT ---
  app.get('/api/admin/stations', requireAdminPermission('manageStations'), (_req: AdminRequest, res: Response) => {
    res.json({ stations: listSwapStations() });
  });

  app.post('/api/admin/stations', requireAdminPermission('manageStations'), (req: AdminRequest, res: Response) => {
    try {
      const station = req.body as BatterySwapStation;
      if (!station?.name || !station?.operatorPhone) {
        res.status(400).json({ error: 'Station name and operator contact telephone are required.' });
        return;
      }
      unrevokeByPhoneOrEmail(station.operatorPhone, undefined, station.id);
      const saved = upsertStationRecord(station, false);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_SWAP_STATION_CREATED',
        category: 'stations',
        targetId: saved.id,
        targetLabel: `${saved.name} (${saved.stationCode})`,
        details: `Registered ${saved.batteryBrand} swap station in ${saved.subCounty}, GPS (${saved.lat}, ${saved.lng}).`,
      });
      res.json({ station: saved, analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to create swap station.' });
    }
  });

  app.put('/api/admin/stations/:id', requireAdminPermission('manageStations'), (req: AdminRequest, res: Response) => {
    try {
      const existing = listSwapStations().find((s) => s.id === req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Swap station not found.' });
        return;
      }
      const saved = upsertStationRecord({ ...existing, ...req.body, id: existing.id }, false);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_SWAP_STATION_UPDATED',
        category: 'stations',
        targetId: saved.id,
        targetLabel: `${saved.name} (${saved.stationCode})`,
        details: `Updated station status=${saved.status}, available=${saved.availableBatteries}/${saved.totalBatteries}.`,
      });
      void sendWebPushToSubscribers({
        title: `Swap Station Update: ${saved.name}`,
        body: `${saved.availableBatteries}/${saved.totalBatteries} batteries ready · Status: ${saved.status}`,
        url: '/?tab=swaps',
        tag: `station-update-${saved.id}`,
      });
      res.json({ station: saved, analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to update swap station.' });
    }
  });

  app.delete('/api/admin/stations/:id', requireAdminPermission('deleteRecords'), (req: AdminRequest, res: Response) => {
    const actorName = req.adminOperator?.fullName || 'Super Admin';
    const outcome = deleteEntityWithCleanup(
      'swap_stations',
      req.params.id,
      { id: req.adminOperator?.id || 'admin-founder-mukisa', name: actorName },
      `Deleted individually by ${actorName}`
    );
    if (outcome.deleted) {
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName,
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_SWAP_STATION_DELETED',
        category: 'stations',
        targetId: req.params.id,
        targetLabel: outcome.label,
        details: 'Deleted battery swap station record.',
      });
    }
    res.json({ deleted: outcome.deleted, analytics: computeCentralAnalytics() });
  });

  // --- MAINTENANCE CENTRES MANAGEMENT ---
  app.get('/api/admin/centres', requireAdminPermission('manageCentres'), (_req: AdminRequest, res: Response) => {
    res.json({ centres: listMaintenanceCentres() });
  });

  app.post('/api/admin/centres', requireAdminPermission('manageCentres'), (req: AdminRequest, res: Response) => {
    try {
      const centre = req.body as BusinessListing;
      if (!centre?.name || !centre?.phone || !centre?.ownerName) {
        res.status(400).json({ error: 'Garage name, lead mechanic/owner name, and phone number are required.' });
        return;
      }
      const safeImage = sanitizeImageUrl(centre.imageUrl);
      unrevokeByPhoneOrEmail(centre.phone, undefined, centre.id);
      const saved = upsertMaintenanceCentreRecord({ ...centre, imageUrl: safeImage || undefined }, false);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_MAINTENANCE_CENTRE_CREATED',
        category: 'centres',
        targetId: saved.id,
        targetLabel: `${saved.name} (${saved.centreCode})`,
        details: `Registered ${saved.bikeTypesServiced} centre in ${saved.subCounty}.`,
      });
      res.json({ centre: saved, analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to register maintenance centre.' });
    }
  });

  app.put('/api/admin/centres/:id', requireAdminPermission('manageCentres'), (req: AdminRequest, res: Response) => {
    try {
      const existing = listMaintenanceCentres().find((c) => c.id === req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Maintenance centre not found.' });
        return;
      }
      const nextImg =
        req.body.imageUrl !== undefined ? sanitizeImageUrl(req.body.imageUrl) || undefined : existing.imageUrl;
      const saved = upsertMaintenanceCentreRecord({ ...existing, ...req.body, id: existing.id, imageUrl: nextImg }, false);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_MAINTENANCE_CENTRE_UPDATED',
        category: 'centres',
        targetId: saved.id,
        targetLabel: `${saved.name} (${saved.centreCode})`,
        details: `Updated status=${saved.accountStatus}, verified=${saved.verified}.`,
      });
      res.json({ centre: saved, analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to update maintenance centre.' });
    }
  });

  app.delete('/api/admin/centres/:id', requireAdminPermission('deleteRecords'), (req: AdminRequest, res: Response) => {
    const actorName = req.adminOperator?.fullName || 'Super Admin';
    const outcome = deleteEntityWithCleanup(
      'maintenance_centres',
      req.params.id,
      { id: req.adminOperator?.id || 'admin-founder-mukisa', name: actorName },
      `Deleted individually by ${actorName}`
    );
    if (outcome.deleted) {
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName,
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_MAINTENANCE_CENTRE_DELETED',
        category: 'centres',
        targetId: req.params.id,
        targetLabel: outcome.label,
        details: 'Removed maintenance centre record.',
      });
    }
    res.json({ deleted: outcome.deleted, analytics: computeCentralAnalytics() });
  });

  // --- BODA STAGES MANAGEMENT ---
  app.get('/api/admin/stages', requireAdminPermission('manageStages'), (_req: AdminRequest, res: Response) => {
    res.json({ stages: listStages() });
  });

  app.post('/api/admin/stages', requireAdminPermission('manageStages'), (req: AdminRequest, res: Response) => {
    try {
      const stage = req.body as Stage;
      if (!stage?.name || !stage?.leaderName || !stage?.leaderPhone) {
        res.status(400).json({ error: 'Stage name, chairman/leader name, and contact telephone are required.' });
        return;
      }
      unrevokeByPhoneOrEmail(stage.leaderPhone, undefined, stage.id);
      const saved = upsertStageRecord(stage, false);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_STAGE_CREATED',
        category: 'stages',
        targetId: saved.id,
        targetLabel: `${saved.name} (${saved.stageCode})`,
        details: `Registered boda stage in ${saved.subCounty}, ${saved.district}. Chairman: ${saved.leaderName}.`,
      });
      res.json({ stage: saved, analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to register stage.' });
    }
  });

  app.put('/api/admin/stages/:id', requireAdminPermission('manageStages'), (req: AdminRequest, res: Response) => {
    try {
      const existing = listStages().find((s) => s.id === req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Boda stage not found.' });
        return;
      }
      const saved = upsertStageRecord({ ...existing, ...req.body, id: existing.id }, false);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_STAGE_UPDATED',
        category: 'stages',
        targetId: saved.id,
        targetLabel: `${saved.name} (${saved.stageCode})`,
        details: `Updated stage operatingStatus=${saved.operatingStatus}, leader=${saved.leaderName}.`,
      });
      res.json({ stage: saved, analytics: computeCentralAnalytics() });
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'Unable to update stage.' });
    }
  });

  app.delete('/api/admin/stages/:id', requireAdminPermission('deleteRecords'), (req: AdminRequest, res: Response) => {
    const actorName = req.adminOperator?.fullName || 'Super Admin';
    const outcome = deleteEntityWithCleanup(
      'stages',
      req.params.id,
      { id: req.adminOperator?.id || 'admin-founder-mukisa', name: actorName },
      `Deleted individually by ${actorName}`
    );
    if (outcome.deleted) {
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName,
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'ADMIN_STAGE_DELETED',
        category: 'stages',
        targetId: req.params.id,
        targetLabel: outcome.label,
        details: 'Removed boda stage record and unassigned affected riders cleanly.',
      });
    }
    res.json({ deleted: outcome.deleted, analytics: computeCentralAnalytics() });
  });

  // --- TARGETED MULTI-CHANNEL ANNOUNCEMENTS ---
  app.post('/api/admin/announcements', requireAdminPermission('sendNotifications'), async (req: AdminRequest, res: Response) => {
    const {
      targetGroup,
      selectedIds,
      stageId,
      locationFilter,
      channels,
      title,
      message,
    } = req.body as {
      targetGroup: 'riders' | 'passengers' | 'stage_riders' | 'location' | 'all_members';
      selectedIds?: string[];
      stageId?: string;
      locationFilter?: string;
      channels: Array<'in_app' | 'sms' | 'whatsapp'>;
      title: string;
      message: string;
    };

    if (!message?.trim() || !Array.isArray(channels) || channels.length === 0) {
      res.status(400).json({ error: 'Announcement message text and at least one delivery channel are required.' });
      return;
    }

    const riders = listRiders();
    const passengers = listPassengers();
    const recipients: Array<{ id: string; name: string; phone: string; whatsappNumber?: string; category: string }> = [];

    if (targetGroup === 'riders') {
      const targetRiders = selectedIds?.length ? riders.filter((r) => selectedIds.includes(r.id)) : riders;
      targetRiders.forEach((r) =>
        recipients.push({ id: r.id, name: r.fullName, phone: r.phone, whatsappNumber: r.whatsappNumber, category: 'rider' })
      );
    } else if (targetGroup === 'passengers') {
      const targetPass = selectedIds?.length ? passengers.filter((p) => selectedIds.includes(p.id)) : passengers;
      targetPass.forEach((p) =>
        recipients.push({ id: p.id, name: p.fullName, phone: p.phone, whatsappNumber: p.whatsappNumber, category: 'passenger' })
      );
    } else if (targetGroup === 'stage_riders' && stageId) {
      riders
        .filter((r) => r.stageId === stageId)
        .forEach((r) =>
          recipients.push({ id: r.id, name: r.fullName, phone: r.phone, whatsappNumber: r.whatsappNumber, category: 'stage_rider' })
        );
    } else if (targetGroup === 'location' && locationFilter) {
      const needle = locationFilter.trim().toLowerCase();
      riders
        .filter(
          (r) =>
            (r.subCounty || '').toLowerCase().includes(needle) ||
            (r.village || '').toLowerCase().includes(needle) ||
            (r.district || '').toLowerCase().includes(needle) ||
            (r.residentialArea || '').toLowerCase().includes(needle)
        )
        .forEach((r) =>
          recipients.push({ id: r.id, name: r.fullName, phone: r.phone, whatsappNumber: r.whatsappNumber, category: 'location_rider' })
        );
      passengers
        .filter(
          (p) =>
            (p.subCounty || '').toLowerCase().includes(needle) ||
            (p.village || '').toLowerCase().includes(needle) ||
            (p.district || '').toLowerCase().includes(needle) ||
            (p.residentialArea || '').toLowerCase().includes(needle)
        )
        .forEach((p) =>
          recipients.push({ id: p.id, name: p.fullName, phone: p.phone, whatsappNumber: p.whatsappNumber, category: 'location_passenger' })
        );
    } else if (targetGroup === 'all_members') {
      riders.forEach((r) =>
        recipients.push({ id: r.id, name: r.fullName, phone: r.phone, whatsappNumber: r.whatsappNumber, category: 'rider' })
      );
      passengers.forEach((p) =>
        recipients.push({ id: p.id, name: p.fullName, phone: p.phone, whatsappNumber: p.whatsappNumber, category: 'passenger' })
      );
    }

    const allDeliveries: NotificationDeliveryRecord[] = [];
    for (const rec of recipients) {
      const batch = await dispatchMultiChannelMessage({
        channels,
        recipientId: rec.id,
        recipientName: rec.name,
        phone: rec.phone,
        whatsappNumber: rec.whatsappNumber,
        category: `announcement:${targetGroup}`,
        title: title?.trim() || 'BodaCare Uganda Announcement',
        message: message.trim(),
        sentBy: req.adminOperator?.fullName || 'Brian Mukisa',
      });
      allDeliveries.push(...batch);
    }

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: req.adminOperator?.fullName || 'Super Admin',
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'ADMIN_ANNOUNCEMENT_DISPATCHED',
      category: 'notifications',
      targetLabel: `${recipients.length} recipients (${channels.join(', ')})`,
      details: `Title: "${title}". Deliveries logged: ${allDeliveries.length}.`,
    });

    res.json({
      targetedCount: recipients.length,
      deliveries: allDeliveries,
      deliveryLogs: listDeliveryLogs(150),
      gatewayStatus: await fetchCombinedMessagingStatus(),
    });
  });

  // --- ADMIN RBAC MANAGEMENT ---
  app.get('/api/admin/admins', requireAdminPermission('viewAnalytics'), (_req: AdminRequest, res: Response) => {
    res.json({ admins: listAdminAccounts() });
  });

  app.post('/api/admin/admins', requireAdminPermission('manageAdmins'), (req: AdminRequest, res: Response) => {
    try {
      const incoming = req.body as AdminAccount;
      if (!incoming?.fullName || !incoming?.email || !incoming?.phone) {
        res.status(400).json({ error: 'Administrator name, email, and phone are required.' });
        return;
      }
      const saved = upsertAdminAccount(incoming);
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'RBAC_ADMIN_ACCOUNT_SAVED',
        category: 'security',
        targetId: saved.id,
        targetLabel: `${saved.fullName} (${saved.role})`,
        details: `Admin ${saved.email} configured with role=${saved.role}, status=${saved.status}.`,
      });
      res.json({ admin: saved, admins: listAdminAccounts() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to save admin account.' });
    }
  });

  app.patch('/api/admin/admins/:id', requireAdminPermission('manageAdmins'), (req: AdminRequest, res: Response) => {
    try {
      const existing = getAdminById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Admin account not found.' });
        return;
      }
      if (existing.id === 'admin-founder-mukisa' && (req.body.status === 'suspended' || req.body.role !== 'super_admin')) {
        res.status(400).json({ error: 'Cannot suspend or demote the Founding Super Administrator.' });
        return;
      }
      const saved = upsertAdminAccount({ ...existing, ...req.body, id: existing.id });
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'RBAC_ADMIN_ACCOUNT_UPDATED',
        category: 'security',
        targetId: saved.id,
        targetLabel: `${saved.fullName} (${saved.role})`,
        details: `Status=${saved.status}, Role=${saved.role}.`,
      });
      res.json({ admin: saved, admins: listAdminAccounts() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to update admin account.' });
    }
  });

  app.delete('/api/admin/admins/:id', requireAdminPermission('manageAdmins'), (req: AdminRequest, res: Response) => {
    try {
      const existing = getAdminById(req.params.id);
      const deleted = deleteAdminAccount(req.params.id);
      if (deleted) {
        insertAuditLog({
          actorId: req.adminOperator?.id,
          actorName: req.adminOperator?.fullName || 'Super Admin',
          actorRole: req.adminOperator?.role || 'super_admin',
          action: 'RBAC_ADMIN_ACCOUNT_DELETED',
          category: 'security',
          targetId: req.params.id,
          targetLabel: existing?.fullName || req.params.id,
          details: 'Removed restricted administrator account.',
        });
      }
      res.json({ deleted, admins: listAdminAccounts() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to delete admin account.' });
    }
  });

  // --- EXPORTABLE DATABASE REPORTS (CSV / JSON) ---
  app.get('/api/admin/export', requireAdminPermission('viewAnalytics'), (req: AdminRequest, res: Response) => {
    const category = String(req.query.category || 'all');
    const format = String(req.query.format || 'csv');

    const payload = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.adminOperator?.fullName || 'Brian Mukisa',
      riders: category === 'all' || category === 'riders' ? listRiders() : undefined,
      passengers: category === 'all' || category === 'passengers' ? listPassengers() : undefined,
      jobs: category === 'all' || category === 'jobs' ? listJobs() : undefined,
      stations: category === 'all' || category === 'stations' ? listSwapStations() : undefined,
      centres: category === 'all' || category === 'centres' ? listMaintenanceCentres() : undefined,
      stages: category === 'all' || category === 'stages' ? listStages() : undefined,
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="bodacare_${category}_export.json"`);
      res.send(JSON.stringify(payload, null, 2));
      return;
    }

    const lines: string[] = [
      'Category,RecordID,NameOrTitle,PhoneOrContact,District,SubCounty,Village,Status,Verification,Details,CreatedOrRegisteredAt',
    ];

    if (payload.riders) {
      for (const r of payload.riders) {
        lines.push(
          [
            'Rider',
            r.riderIdNumber,
            r.fullName,
            r.phone,
            r.district || 'Luweero',
            r.subCounty || '',
            r.village || '',
            r.accountStatus || 'active',
            r.verificationStatus,
            `${r.motorcycleType.toUpperCase()} | ${r.motorcycleReg} | ${r.stageName} | ${r.phoneType || 'smartphone'}`,
            r.registrationDate,
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    }
    if (payload.passengers) {
      for (const p of payload.passengers) {
        lines.push(
          [
            'Passenger',
            p.passengerIdNumber || p.id,
            p.fullName,
            p.phone,
            p.district || 'Luweero',
            p.subCounty || '',
            p.village || '',
            p.accountStatus || 'active',
            p.verificationStatus || 'verified',
            `${p.phoneType || 'smartphone'} | Assisted:${p.assistedRegistration ? 'Yes' : 'No'} | NextOfKin:${p.trustedContactName}`,
            p.createdAt || '',
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    }
    if (payload.jobs) {
      for (const j of payload.jobs) {
        lines.push(
          [
            'Job',
            j.jobCode || j.id,
            j.title,
            j.employerPhone,
            j.district || 'Luweero',
            j.subCounty,
            j.village || '',
            j.status,
            j.adminApproved ? 'approved' : 'pending',
            `${j.employerCompany} | UGX ${j.paymentAmountUgx} | Deadline ${j.deadline}`,
            j.postedDate,
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    }
    if (payload.stations) {
      for (const s of payload.stations) {
        lines.push(
          [
            'SwapStation',
            s.stationCode || s.id,
            s.name,
            s.operatorPhone,
            s.district || 'Luweero',
            s.subCounty,
            s.village || '',
            s.status,
            s.verified ? 'verified' : 'unverified',
            `${s.batteryBrand} | ${s.availableBatteries}/${s.totalBatteries} packs | GPS(${s.lat},${s.lng})`,
            s.createdAt || '',
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    }
    if (payload.centres) {
      for (const c of payload.centres) {
        lines.push(
          [
            'MaintenanceCentre',
            c.centreCode || c.id,
            c.name,
            c.phone,
            c.district || 'Luweero',
            c.subCounty,
            c.village || '',
            c.accountStatus || 'active',
            c.verified ? 'verified' : 'pending',
            `${c.category} | Bikes:${c.bikeTypesServiced || 'both'} | ${c.operatingHours}`,
            c.createdAt || '',
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    }
    if (payload.stages) {
      for (const st of payload.stages) {
        lines.push(
          [
            'BodaStage',
            st.stageCode || st.id,
            st.name,
            st.leaderPhone,
            st.district,
            st.subCounty,
            st.village || '',
            st.operatingStatus || 'active',
            'verified',
            `Chairman:${st.leaderName} | Members:${st.memberCount} | GPS(${st.lat},${st.lng})`,
            st.createdAt || '',
          ]
            .map(escapeCsvCell)
            .join(',')
        );
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bodacare_${category}_registry.csv"`);
    res.send(lines.join('\n'));
  });

  // =========================================================================
  // 4B. AUTOMATED DAILY JOB DISCOVERY & ADMIN VERIFICATION API
  // =========================================================================
  const buildDiscoveryDashboardPayload = () => {
    const toggles = listIntegrationToggles();
    return {
      counts: computeDiscoveryCounts(),
      jobs: listDiscoveredJobs({ limit: 500 }),
      sources: listDiscoverySources(),
      schedule: getDiscoveryScheduleConfig(),
      runs: listDiscoveryRuns(25),
      employers: computeDiscoveryEmployers(),
      capabilities: {
        geminiExtractionConfigured: Boolean(
          toggles.gemini_ai?.enabled && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
        ),
        googleCustomSearchConfigured: Boolean(
          toggles.google_custom_search?.enabled &&
            process.env.GOOGLE_CSE_API_KEY &&
            !process.env.GOOGLE_CSE_API_KEY.startsWith('MY_') &&
            process.env.GOOGLE_CSE_CX &&
            !process.env.GOOGLE_CSE_CX.startsWith('MY_')
        ),
        serpApiConfigured: Boolean(
          toggles.serpapi_jobs?.enabled && process.env.SERPAPI_KEY && !process.env.SERPAPI_KEY.startsWith('MY_')
        ),
      },
    };
  };

  // =========================================================================
  // 4C. INTEGRATION MANAGEMENT & ENVIRONMENT STATUS API
  // =========================================================================
  function isEnvSet(name: string): boolean {
    const val = (process.env[name] || '').trim();
    return Boolean(val && !val.startsWith('MY_'));
  }

  function buildIntegrationsDashboardPayload(): IntegrationsDashboardPayload {
    const toggles = listIntegrationToggles();

    const essentialRuntimeVars: IntegrationEnvVarMeta[] = [
      {
        name: 'PORT',
        essential: true,
        configured: Boolean(process.env.PORT),
        defaultValue: '3000',
        purpose: 'HTTP port for Express command server & Vite/SPA serving (defaults cleanly to 3000 if unset).',
        whereToObtain: 'Automatically set by Cloud Run / Node hosting, or use 3000 locally.',
      },
      {
        name: 'APP_URL',
        essential: true,
        configured: isEnvSet('APP_URL'),
        defaultValue: 'Auto-detected from request host',
        purpose: 'Public base URL used inside SMS, WhatsApp, and Welcome alert links (auto-detected if omitted).',
        whereToObtain: 'Copy your live deployed domain URL (e.g., https://bodacare-uganda.com).',
      },
    ];

    const computeStatus = (enabled: boolean, credsOk: boolean) => {
      if (!enabled) return 'inactive' as const;
      return credsOk ? ('active' as const) : ('awaiting_credentials' as const);
    };

    const atCreds = isEnvSet('AFRICASTALKING_USERNAME') && isEnvSet('AFRICASTALKING_API_KEY');
    const waCreds = isEnvSet('WHATSAPP_ACCESS_TOKEN') && isEnvSet('WHATSAPP_PHONE_NUMBER_ID');
    const ussdCreds = isEnvSet('USSD_SERVICE_CODE');
    const gcsCreds = isEnvSet('GOOGLE_CSE_API_KEY') && isEnvSet('GOOGLE_CSE_CX');
    const serpCreds = isEnvSet('SERPAPI_KEY');
    const geminiCreds = isEnvSet('GEMINI_API_KEY') && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

    const services: IntegrationServiceStatus[] = [
      {
        id: 'africastalking_sms',
        name: "Africa's Talking SMS Gateway",
        category: 'messaging',
        description: 'Sends direct Uganda SMS (MTN & Airtel) for rider job alerts, button-phone welcome messages, and verification.',
        enabled: toggles.africastalking_sms.enabled,
        credentialsConfigured: atCreds,
        status: computeStatus(toggles.africastalking_sms.enabled, atCreds),
        statusMessage: !toggles.africastalking_sms.enabled
          ? 'Deactivated by Super Admin — SMS dispatch paused.'
          : atCreds
          ? "Configured & active — ready to dispatch real SMS across MTN & Airtel Uganda."
          : 'Awaiting Credentials — add AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY on server when ready.',
        fallbackBehavior: 'Registrations & job publishing continue normally; SMS alerts queue as blocked_unconfigured until credentials are added.',
        updatedAt: toggles.africastalking_sms.updatedAt,
        envVars: [
          {
            name: 'AFRICASTALKING_USERNAME',
            essential: false,
            configured: isEnvSet('AFRICASTALKING_USERNAME'),
            purpose: "Your Africa's Talking application username (or 'sandbox' for testing).",
            whereToObtain: "Africa's Talking Dashboard (https://account.africastalking.com) -> App Settings.",
          },
          {
            name: 'AFRICASTALKING_API_KEY',
            essential: false,
            configured: isEnvSet('AFRICASTALKING_API_KEY'),
            purpose: 'Secret API key authorizing outbound bulk SMS & welcome SMS.',
            whereToObtain: "Africa's Talking Dashboard -> Settings -> API Key (Generate Key).",
          },
          {
            name: 'AFRICASTALKING_ENV',
            essential: false,
            configured: isEnvSet('AFRICASTALKING_ENV'),
            defaultValue: 'sandbox',
            purpose: "Set to 'production' for live Uganda GSM networks or 'sandbox' for simulator testing.",
            whereToObtain: "Africa's Talking Dashboard app mode.",
          },
          {
            name: 'AFRICASTALKING_SENDER_ID',
            essential: false,
            configured: isEnvSet('AFRICASTALKING_SENDER_ID'),
            defaultValue: 'BODACARE',
            purpose: 'Approved alphanumeric caller ID shown to riders on their phone screen.',
            whereToObtain: "Apply under Africa's Talking SMS -> Sender IDs (with UCC approval letter).",
          },
          {
            name: 'AFRICASTALKING_SENDER_APPROVED',
            essential: false,
            configured: isEnvSet('AFRICASTALKING_SENDER_APPROVED'),
            defaultValue: 'false',
            purpose: "Set 'true' once your custom Sender ID is approved by MTN/Airtel Uganda.",
            whereToObtain: "Confirmed via Africa's Talking approval email.",
          },
          {
            name: 'SMS_COST_PER_SEGMENT_UGX',
            essential: false,
            configured: isEnvSet('SMS_COST_PER_SEGMENT_UGX'),
            defaultValue: '35',
            purpose: 'Estimated cost per 160-character SMS segment in UGX for Admin budget forecasts.',
            whereToObtain: "Africa's Talking Uganda SMS pricing table.",
          },
        ],
      },
      {
        id: 'whatsapp_cloud',
        name: 'Meta WhatsApp Business Cloud API',
        category: 'messaging',
        description: 'Sends formatted rich WhatsApp job alerts & welcome messages to smartphone riders & customers.',
        enabled: toggles.whatsapp_cloud.enabled,
        credentialsConfigured: waCreds,
        status: computeStatus(toggles.whatsapp_cloud.enabled, waCreds),
        statusMessage: !toggles.whatsapp_cloud.enabled
          ? 'Deactivated by Super Admin — WhatsApp messaging paused independently from SMS.'
          : waCreds
          ? 'Configured & active — ready to send WhatsApp Cloud messages.'
          : 'Awaiting Credentials — add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID on server.',
        fallbackBehavior: 'Platform continues operating seamlessly with In-App notifications and optional SMS.',
        updatedAt: toggles.whatsapp_cloud.updatedAt,
        envVars: [
          {
            name: 'WHATSAPP_ACCESS_TOKEN',
            essential: false,
            configured: isEnvSet('WHATSAPP_ACCESS_TOKEN'),
            purpose: 'Permanent Meta System User token for WhatsApp Business Cloud API.',
            whereToObtain: 'Meta for Developers (https://developers.facebook.com) -> WhatsApp -> API Setup / Business Settings.',
          },
          {
            name: 'WHATSAPP_PHONE_NUMBER_ID',
            essential: false,
            configured: isEnvSet('WHATSAPP_PHONE_NUMBER_ID'),
            purpose: 'Numeric ID of your verified official BodaCare Uganda WhatsApp Business number.',
            whereToObtain: 'Meta Developer Portal -> WhatsApp -> API Setup -> Phone Number ID.',
          },
          {
            name: 'WHATSAPP_API_VERSION',
            essential: false,
            configured: isEnvSet('WHATSAPP_API_VERSION'),
            defaultValue: 'v21.0',
            purpose: 'Meta Graph API version used for WhatsApp requests.',
            whereToObtain: 'Default v21.0 works out of the box.',
          },
          {
            name: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
            essential: false,
            configured: isEnvSet('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
            defaultValue: 'bodacare_whatsapp_verify',
            purpose: 'Verification token checked when Meta validates /api/whatsapp/webhook.',
            whereToObtain: 'Choose any custom secret passphrase and enter the same string in Meta Webhooks setup.',
          },
        ],
      },
      {
        id: 'ussd_gateway',
        name: 'Non-Smartphone USSD Menu (*284#)',
        category: 'ussd',
        description: 'Allows feature/button-phone riders without internet to dial USSD for Stage info, Verified Jobs & SOS help.',
        enabled: toggles.ussd_gateway.enabled,
        credentialsConfigured: ussdCreds,
        status: computeStatus(toggles.ussd_gateway.enabled, ussdCreds),
        statusMessage: !toggles.ussd_gateway.enabled
          ? 'Deactivated by Super Admin — USSD callback returns service-paused message.'
          : ussdCreds
          ? `Configured & active (${process.env.USSD_SERVICE_CODE}).`
          : 'Awaiting Credentials — USSD callback endpoint (/api/ussd/callback) is live & ready once USSD_SERVICE_CODE is assigned.',
        fallbackBehavior: 'Button-phone riders remain fully supported via manual Admin registration & SMS alerts.',
        updatedAt: toggles.ussd_gateway.updatedAt,
        envVars: [
          {
            name: 'USSD_SERVICE_CODE',
            essential: false,
            configured: ussdCreds,
            purpose: 'Assigned Uganda telecom USSD shortcode (e.g., *284*44#).',
            whereToObtain: "Africa's Talking USSD Channel registration (with UCC clearance).",
          },
        ],
      },
      {
        id: 'google_custom_search',
        name: 'Google Custom Search (Daily Job Discovery)',
        category: 'job_discovery',
        description: 'Searches indexed Ugandan job portals, NGO career pages, and district notices daily.',
        enabled: toggles.google_custom_search.enabled,
        credentialsConfigured: gcsCreds,
        status: computeStatus(toggles.google_custom_search.enabled, gcsCreds),
        statusMessage: !toggles.google_custom_search.enabled
          ? 'Deactivated by Super Admin — Google Custom Search queries paused.'
          : gcsCreds
          ? 'Configured & active — automated daily Google Search job discovery enabled.'
          : 'Awaiting Credentials — add GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX to activate Google Search indexing.',
        fallbackBehavior: 'Public RSS/Atom feeds, JSON career APIs, HTML pages, and partner webhooks keep scanning normally.',
        updatedAt: toggles.google_custom_search.updatedAt,
        envVars: [
          {
            name: 'GOOGLE_CSE_API_KEY',
            essential: false,
            configured: isEnvSet('GOOGLE_CSE_API_KEY'),
            purpose: 'Google Cloud API key with Custom Search JSON API enabled.',
            whereToObtain: 'Google Cloud Console (https://console.cloud.google.com/apis/library/customsearch.googleapis.com).',
          },
          {
            name: 'GOOGLE_CSE_CX',
            essential: false,
            configured: isEnvSet('GOOGLE_CSE_CX'),
            purpose: 'Programmable Search Engine ID targeting Ugandan recruitment websites.',
            whereToObtain: 'Google Programmable Search Engine (https://programmablesearchengine.google.com).',
          },
        ],
      },
      {
        id: 'serpapi_jobs',
        name: 'SerpApi Google Jobs Discovery',
        category: 'job_discovery',
        description: 'Alternative search aggregator fetching Google Jobs postings for Kikyusa, Luweero, and Uganda.',
        enabled: toggles.serpapi_jobs.enabled,
        credentialsConfigured: serpCreds,
        status: computeStatus(toggles.serpapi_jobs.enabled, serpCreds),
        statusMessage: !toggles.serpapi_jobs.enabled
          ? 'Deactivated by Super Admin — SerpApi job scanning paused.'
          : serpCreds
          ? 'Configured & active — SerpApi Uganda Google Jobs indexing enabled.'
          : 'Awaiting Credentials — add SERPAPI_KEY to activate SerpApi job aggregation.',
        fallbackBehavior: 'Discovery engine relies cleanly on RSS/JSON/Career sources or Google Custom Search without crashing.',
        updatedAt: toggles.serpapi_jobs.updatedAt,
        envVars: [
          {
            name: 'SERPAPI_KEY',
            essential: false,
            configured: serpCreds,
            purpose: 'SerpApi key for querying engine=google_jobs in Uganda (gl=ug).',
            whereToObtain: 'SerpApi Account Dashboard (https://serpapi.com/manage-api-key).',
          },
        ],
      },
      {
        id: 'gemini_ai',
        name: 'Gemini AI Job Metadata Enrichment',
        category: 'ai_enrichment',
        description: 'Optional AI helper that fills missing employer/salary/deadline fields on ambiguous discovered job adverts.',
        enabled: toggles.gemini_ai.enabled,
        credentialsConfigured: geminiCreds,
        status: computeStatus(toggles.gemini_ai.enabled, geminiCreds),
        statusMessage: !toggles.gemini_ai.enabled
          ? 'Deactivated by Super Admin — using fast deterministic regex/JSON-LD extraction only.'
          : geminiCreds
          ? 'Configured & active — enhances ambiguous discovered job ads alongside deterministic parser.'
          : 'Awaiting Credentials — deterministic regex & Schema.org extraction runs automatically without Gemini.',
        fallbackBehavior: 'All discovered jobs are still parsed deterministically using JSON-LD, RSS, and Ugandan contact/salary matchers.',
        updatedAt: toggles.gemini_ai.updatedAt,
        envVars: [
          {
            name: 'GEMINI_API_KEY',
            essential: false,
            configured: geminiCreds,
            purpose: 'Optional Gemini API key for server-side structured extraction of unclear job adverts.',
            whereToObtain: 'Google AI Studio (https://aistudio.google.com/apikey).',
          },
        ],
      },
      {
        id: 'web_push',
        name: 'Android PWA Web Push Notifications',
        category: 'messaging',
        description: 'Sends native Android & browser push alerts for verified jobs, welcome notices, swap stations, and admin broadcasts.',
        enabled: toggles.web_push.enabled,
        credentialsConfigured: true,
        status: toggles.web_push.enabled ? 'active' : 'inactive',
        statusMessage: toggles.web_push.enabled
          ? `Active (${listPushSubscriptions().length} subscribed Android/browser device(s)).`
          : 'Deactivated by Super Admin — Web Push notifications paused.',
        fallbackBehavior: 'In-App notification feed and optional SMS/WhatsApp alerts remain fully active.',
        updatedAt: toggles.web_push.updatedAt,
        envVars: [
          {
            name: 'VAPID_PUBLIC_KEY',
            essential: false,
            configured: isEnvSet('VAPID_PUBLIC_KEY'),
            defaultValue: 'Auto-generated on server',
            purpose: 'Public VAPID key shared with browsers to subscribe for Web Push notifications.',
            whereToObtain: 'Auto-generated securely in SQLite or via `npx web-push generate-vapid-keys`.',
          },
          {
            name: 'VAPID_PRIVATE_KEY',
            essential: false,
            configured: isEnvSet('VAPID_PRIVATE_KEY'),
            defaultValue: 'Auto-generated on server (never exposed to client)',
            purpose: 'Server-only private VAPID key signing outgoing push notifications.',
            whereToObtain: 'Auto-generated securely in SQLite or via `npx web-push generate-vapid-keys`.',
          },
        ],
      },
    ];

    return {
      services,
      essentialRuntimeVars,
      checkedAt: new Date().toISOString(),
    };
  }

  app.get('/api/integrations/dashboard', requireAdminPermission('viewAnalytics'), (_req: AdminRequest, res: Response) => {
    res.json(buildIntegrationsDashboardPayload());
  });

  app.patch('/api/integrations/:serviceId', requireAdminPermission('manageAdmins'), (req: AdminRequest, res: Response) => {
    const validIds: IntegrationServiceId[] = [
      'africastalking_sms',
      'whatsapp_cloud',
      'ussd_gateway',
      'google_custom_search',
      'serpapi_jobs',
      'gemini_ai',
      'web_push',
    ];
    const sid = req.params.serviceId as IntegrationServiceId;
    if (!validIds.includes(sid)) {
      res.status(400).json({ error: 'Unknown integration service ID.' });
      return;
    }
    const { enabled } = (req.body || {}) as { enabled?: boolean };
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Boolean "enabled" flag is required.' });
      return;
    }

    const updated = setIntegrationToggle(sid, enabled);
    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
      actorRole: req.adminOperator?.role || 'super_admin',
      action: enabled ? 'INTEGRATION_ACTIVATED' : 'INTEGRATION_DEACTIVATED',
      category: 'security',
      targetId: sid,
      targetLabel: sid,
      details: `Super Admin ${enabled ? 'activated' : 'deactivated'} integration service "${sid}".`,
    });

    res.json({
      success: true,
      updated,
      dashboard: buildIntegrationsDashboardPayload(),
    });
  });

  // =========================================================================
  // 4D. AUTOMATED WELCOME & REGISTRATION NOTIFICATION SYSTEM
  // =========================================================================
  function renderWelcomeMessage(
    template: string,
    vars: {
      name: string;
      category: string;
      registrationDate: string;
      brandName: string;
      memberId: string;
      location: string;
    }
  ): string {
    return template
      .replace(/\{\{name\}\}/gi, vars.name)
      .replace(/\{\{category\}\}/gi, vars.category)
      .replace(/\{\{registrationDate\}\}/gi, vars.registrationDate)
      .replace(/\{\{brandName\}\}/gi, vars.brandName)
      .replace(/\{\{memberId\}\}/gi, vars.memberId)
      .replace(/\{\{location\}\}/gi, vars.location)
      .trim();
  }

  async function dispatchAutomatedWelcomeForMember(params: {
    recipientId: string;
    recipientName: string;
    phone: string;
    whatsappNumber?: string;
    memberId: string;
    location: string;
    accountCategory: WelcomeAccountCategory;
    registrationSource: 'self_registration' | 'admin_manual';
    registrationDate: string;
    channelsOverride?: WelcomeChannel[];
    isResend?: boolean;
    sentBy?: string;
  }): Promise<WelcomeNotificationRecord[]> {
    const settings = getWelcomeSettings();
    const isResend = Boolean(params.isResend);
    if (!isResend && !settings.enabled) {
      return [];
    }

    const channelsToRun: WelcomeChannel[] = params.channelsOverride?.length
      ? params.channelsOverride
      : ([
          settings.inAppEnabled ? 'in_app' : null,
          settings.smsEnabled ? 'sms' : null,
          settings.whatsappEnabled ? 'whatsapp' : null,
        ].filter((c): c is WelcomeChannel => Boolean(c)));

    if (channelsToRun.length === 0) return [];

    const categoryLabel = params.accountCategory === 'rider' ? 'Rider' : 'Customer / Passenger';
    const rawTemplate = params.accountCategory === 'rider' ? settings.riderTemplate : settings.passengerTemplate;
    const personalizedText = renderWelcomeMessage(rawTemplate, {
      name: params.recipientName,
      category: categoryLabel,
      registrationDate: params.registrationDate,
      brandName: 'BodaCare Uganda',
      memberId: params.memberId,
      location: params.location || 'Kikyusa, Luweero',
    });

    const sentBy = params.sentBy || 'BodaCare Automated Welcome Engine';
    const results: WelcomeNotificationRecord[] = [];

    for (const channel of channelsToRun) {
      // Idempotency guard: never send duplicate initial welcome notification for same user/category/channel
      if (!isResend && hasInitialWelcomeSent(params.recipientId, params.accountCategory, channel)) {
        continue;
      }

      const nowIso = new Date().toISOString();
      const targetRawPhone = channel === 'whatsapp' ? params.whatsappNumber || params.phone : params.phone;
      const phoneCheck = validateUgandaPhone(targetRawPhone || '');
      const providerLabel =
        channel === 'in_app'
          ? 'BodaCare SQLite In-App Store'
          : channel === 'sms'
          ? "Africa's Talking Uganda"
          : 'Meta WhatsApp Cloud API';

      const recId = `wlc-${params.accountCategory}-${params.recipientId}-${channel}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

      // Persist pending attempt first for full reliability & auditability
      let record = upsertWelcomeNotification({
        id: recId,
        recipientId: params.recipientId,
        recipientName: params.recipientName,
        recipientPhone: phoneCheck.normalized || params.phone,
        whatsappNumber: params.whatsappNumber,
        accountCategory: params.accountCategory,
        registrationSource: params.registrationSource,
        registrationDate: params.registrationDate,
        channel,
        messageText: personalizedText,
        status: 'pending',
        provider: providerLabel,
        isResend,
        retryCount: 0,
        sentBy,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      if (channel === 'in_app') {
        insertNotification({
          id: `notif-welcome-${recId}`,
          userId: params.recipientId,
          title: `Welcome to BodaCare Uganda, ${params.recipientName}!`,
          message: personalizedText,
          timestamp: nowIso,
          read: false,
          type: 'system',
        });
        record = upsertWelcomeNotification({
          ...record,
          status: 'delivered',
          updatedAt: new Date().toISOString(),
        });
        insertDeliveryLog({
          id: `log-${recId}`,
          channel: 'in_app',
          recipientId: params.recipientId,
          recipientName: params.recipientName,
          recipientPhone: phoneCheck.normalized || params.phone,
          category: `welcome:${params.accountCategory}`,
          message: personalizedText,
          provider: providerLabel,
          status: 'in_app_delivered',
          sentBy,
          createdAt: nowIso,
        });
      } else if (channel === 'sms') {
        if (!phoneCheck.isValid) {
          record = upsertWelcomeNotification({
            ...record,
            status: 'invalid_number',
            errorReason: phoneCheck.reason || 'Invalid Uganda phone number',
            updatedAt: new Date().toISOString(),
          });
        } else {
          const smsRes = await sendRealSmsViaGateway(phoneCheck.normalized, personalizedText);
          record = upsertWelcomeNotification({
            ...record,
            recipientPhone: phoneCheck.normalized,
            status: smsRes.status,
            providerMessageId: smsRes.providerMessageId,
            errorReason: smsRes.errorReason,
            updatedAt: new Date().toISOString(),
          });
        }
        insertDeliveryLog({
          id: `log-${recId}`,
          channel: 'sms',
          recipientId: params.recipientId,
          recipientName: params.recipientName,
          recipientPhone: record.recipientPhone,
          category: `welcome:${params.accountCategory}`,
          message: personalizedText,
          provider: providerLabel,
          providerMessageId: record.providerMessageId,
          status:
            record.status === 'sent'
              ? 'sent'
              : record.status === 'delivered'
              ? 'delivered'
              : record.status === 'blocked_unconfigured'
              ? 'blocked_unconfigured'
              : 'failed',
          errorReason: record.errorReason,
          sentBy,
          createdAt: nowIso,
        });
      } else if (channel === 'whatsapp') {
        if (!phoneCheck.isValid) {
          record = upsertWelcomeNotification({
            ...record,
            status: 'invalid_number',
            errorReason: phoneCheck.reason || 'Invalid WhatsApp Uganda phone number',
            updatedAt: new Date().toISOString(),
          });
        } else {
          const waRes = await sendRealWhatsAppViaGateway(phoneCheck.normalized, personalizedText);
          record = upsertWelcomeNotification({
            ...record,
            recipientPhone: phoneCheck.normalized,
            status: waRes.status,
            providerMessageId: waRes.providerMessageId,
            errorReason: waRes.errorReason,
            updatedAt: new Date().toISOString(),
          });
        }
        insertDeliveryLog({
          id: `log-${recId}`,
          channel: 'whatsapp',
          recipientId: params.recipientId,
          recipientName: params.recipientName,
          recipientPhone: record.recipientPhone,
          category: `welcome:${params.accountCategory}`,
          message: personalizedText,
          provider: providerLabel,
          providerMessageId: record.providerMessageId,
          status:
            record.status === 'sent'
              ? 'sent'
              : record.status === 'delivered'
              ? 'delivered'
              : record.status === 'blocked_unconfigured'
              ? 'blocked_unconfigured'
              : 'failed',
          errorReason: record.errorReason,
          sentBy,
          createdAt: nowIso,
        });
      }

      results.push(record);
    }

    return results;
  }

  // Public Self-Registration endpoint (syncs Rider/Passenger to SQLite and triggers automatic Welcome Notification)
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const {
        fullName,
        phone,
        whatsappNumber,
        email,
        role,
        location,
        motorcycleReg,
        motorcycleType,
        inviteCodeUsed,
        avatarUrl,
      } = (req.body || {}) as {
        fullName?: string;
        phone?: string;
        whatsappNumber?: string;
        email?: string;
        role?: string;
        location?: string;
        motorcycleReg?: string;
        motorcycleType?: 'electric' | 'petrol';
        inviteCodeUsed?: string;
        avatarUrl?: string;
      };

      if (role === 'super_admin') {
        res.status(403).json({ error: 'Super Admin accounts cannot be created via public self-registration.' });
        return;
      }

      if (!fullName?.trim() || !phone?.trim()) {
        res.status(400).json({ error: 'Full name and Ugandan phone number are required.' });
        return;
      }

      const phoneCheck = validateUgandaPhone(phone.trim());
      if (!phoneCheck.isValid) {
        res.status(400).json({ error: phoneCheck.reason || 'Valid Ugandan mobile number required.' });
        return;
      }

      const revoked = isAccountRevoked({ phone: phoneCheck.normalized, email });
      if (revoked) {
        res.status(403).json({
          error: 'This phone number or account was removed by the Super Administrator. Please contact BodaCare Uganda Admin (+256 772 100 240) to be re-registered.',
          revoked: true,
        });
        return;
      }

      const safeAvatar = sanitizeImageUrl(avatarUrl);
      const nowIso = new Date().toISOString();
      const todayIso = nowIso.split('T')[0];
      const normKey = phoneCheck.normalized;
      const cleanLoc = (location || 'Kikyusa, Luweero').trim();
      const locInfo = computeUgandaLocationDetails(cleanLoc);

      if (role === 'rider') {
        const existingRider = listRiders().find((r) => normalizePhoneKey(r.phone) === normKey);
        if (existingRider) {
          if (existingRider.accountStatus !== 'active') {
            res.status(403).json({ error: 'Your rider account is suspended or deactivated. Please contact Super Admin.' });
            return;
          }
          res.json({
            success: true,
            alreadyRegistered: true,
            role: 'rider',
            profile: existingRider,
            welcomeDeliveries: [],
          });
          return;
        }

        const existingStages = listStages();
        const defaultStage = existingStages.find((s) => s.id === 'stage-kikyusa-main') || existingStages[0];

        const riderId = `rider-${Date.now()}`;
        const savedRider = upsertRiderRecord(
          {
            id: riderId,
            userId: `user-${Date.now()}`,
            riderIdNumber: generateRecordCode('RDR'),
            fullName: fullName.trim(),
            phone: phoneCheck.normalized,
            whatsappNumber: whatsappNumber?.trim() || phoneCheck.normalized,
            avatarUrl: safeAvatar,
            nin: `PENDING-${Date.now().toString().slice(-6)}`,
            permitNumber: 'PENDING',
            motorcycleReg: (motorcycleReg || `PENDING-${Date.now().toString().slice(-4)}`).trim().toUpperCase(),
            motorcycleMakeModel: motorcycleType === 'electric' ? 'Electric Boda' : 'Bajaj Boxer',
            motorcycleType: motorcycleType === 'electric' ? 'electric' : 'petrol',
            ownershipStatus: 'owner',
            stageId: defaultStage?.id || '',
            stageName: defaultStage?.name || 'Unassigned (Pending Stage)',
            district: locInfo.district === 'Uganda (National)' ? 'Luweero' : locInfo.district,
            subCounty: locInfo.subCounty,
            village: cleanLoc,
            residentialArea: cleanLoc,
            phoneType: 'smartphone',
            verificationStatus: 'pending',
            subscriptionTier: 'basic',
            subscriptionStatus: 'none',
            subscriptionExpiry: '2026-12-31',
            accountStatus: 'active',
            emergencyContactName: 'Pending Verification',
            emergencyContactPhone: phoneCheck.normalized,
            rating: 5.0,
            completedTrips: 0,
            isOnline: false,
            helmetAvailable: true,
            walletBalanceUgx: 0,
            registrationDate: todayIso,
            updatedAt: nowIso,
          },
          true
        );

        insertAuditLog({
          actorId: savedRider.userId,
          actorName: savedRider.fullName,
          actorRole: 'rider',
          action: 'SELF_RIDER_REGISTERED',
          category: 'riders',
          targetId: savedRider.id,
          targetLabel: `${savedRider.fullName} (${savedRider.riderIdNumber})`,
          details: `Self-registered via Auth modal (${savedRider.phone}). Invite=${inviteCodeUsed || 'Direct'}, Email=${email || 'n/a'}.`,
        });

        let welcomeDeliveries: WelcomeNotificationRecord[] = [];
        try {
          welcomeDeliveries = await dispatchAutomatedWelcomeForMember({
            recipientId: savedRider.id,
            recipientName: savedRider.fullName,
            phone: savedRider.phone,
            whatsappNumber: savedRider.whatsappNumber,
            memberId: savedRider.riderIdNumber,
            location: cleanLoc,
            accountCategory: 'rider',
            registrationSource: 'self_registration',
            registrationDate: savedRider.registrationDate || todayIso,
            sentBy: 'BodaCare Self-Registration',
          });
        } catch (err) {
          console.error('Non-fatal self-registration welcome error:', err);
        }

        res.json({
          success: true,
          alreadyRegistered: false,
          role: 'rider',
          profile: savedRider,
          welcomeDeliveries,
        });
        return;
      }

      if (role === 'passenger') {
        const existingPassenger = listPassengers().find((p) => normalizePhoneKey(p.phone) === normKey);
        if (existingPassenger) {
          res.json({
            success: true,
            alreadyRegistered: true,
            role: 'passenger',
            profile: existingPassenger,
            welcomeDeliveries: [],
          });
          return;
        }

        const savedPassenger = upsertPassengerRecord(
          {
            id: `pass-${Date.now()}`,
            userId: `user-pass-${Date.now()}`,
            passengerIdNumber: generateRecordCode('PAS'),
            fullName: fullName.trim(),
            phone: phoneCheck.normalized,
            whatsappNumber: whatsappNumber?.trim() || phoneCheck.normalized,
            residentialArea: cleanLoc,
            district: locInfo.district === 'Uganda (National)' ? 'Luweero' : locInfo.district,
            subCounty: locInfo.subCounty,
            village: cleanLoc,
            trustedContactName: 'Emergency Next of Kin',
            trustedContactPhone: '+256 772 100 240',
            phoneType: 'smartphone',
            assistedRegistration: false,
            accountStatus: 'active',
            verificationStatus: 'verified',
            rating: 5.0,
            totalRides: 0,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          true
        );

        insertAuditLog({
          actorId: savedPassenger.userId,
          actorName: savedPassenger.fullName,
          actorRole: 'passenger',
          action: 'SELF_PASSENGER_REGISTERED',
          category: 'passengers',
          targetId: savedPassenger.id,
          targetLabel: `${savedPassenger.fullName} (${savedPassenger.passengerIdNumber})`,
          details: `Self-registered Customer via Auth modal (${savedPassenger.phone}). Area=${cleanLoc}.`,
        });

        let welcomeDeliveries: WelcomeNotificationRecord[] = [];
        try {
          welcomeDeliveries = await dispatchAutomatedWelcomeForMember({
            recipientId: savedPassenger.id,
            recipientName: savedPassenger.fullName,
            phone: savedPassenger.phone,
            whatsappNumber: savedPassenger.whatsappNumber,
            memberId: savedPassenger.passengerIdNumber || savedPassenger.id,
            location: cleanLoc,
            accountCategory: 'passenger',
            registrationSource: 'self_registration',
            registrationDate: todayIso,
            sentBy: 'BodaCare Self-Registration',
          });
        } catch (err) {
          console.error('Non-fatal self-registration passenger welcome error:', err);
        }

        res.json({
          success: true,
          alreadyRegistered: false,
          role: 'passenger',
          profile: savedPassenger,
          welcomeDeliveries,
        });
        return;
      }

      // Other roles (stage_leader, mechanic, employer)
      res.json({
        success: true,
        alreadyRegistered: false,
        role: role || 'rider',
        welcomeDeliveries: [],
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Registration sync failed.' });
    }
  });

  async function buildWelcomeDashboardPayload(): Promise<WelcomeDashboardPayload> {
    const settings = getWelcomeSettings();
    const records = listWelcomeNotifications({ limit: 400 });
    const riders = listRiders();
    const passengers = listPassengers();
    return {
      settings,
      records,
      counts: {
        total: records.length,
        deliveredOrSent: records.filter((r) => r.status === 'delivered' || r.status === 'sent').length,
        pending: records.filter((r) => r.status === 'pending' || r.status === 'queued').length,
        failedOrBlocked: records.filter(
          (r) => r.status === 'failed' || r.status === 'blocked_unconfigured' || r.status === 'invalid_number'
        ).length,
      },
      members: {
        riders: riders.map((r) => ({
          id: r.id,
          fullName: r.fullName,
          phone: r.phone,
          whatsappNumber: r.whatsappNumber,
          riderIdNumber: r.riderIdNumber,
          registrationDate: r.registrationDate,
          subCounty: r.subCounty,
          district: r.district,
          phoneType: r.phoneType,
        })),
        passengers: passengers.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          phone: p.phone,
          whatsappNumber: p.whatsappNumber,
          passengerIdNumber: p.passengerIdNumber,
          createdAt: p.createdAt,
          subCounty: p.subCounty,
          district: p.district,
          phoneType: p.phoneType,
        })),
      },
      gatewayStatus: await fetchCombinedMessagingStatus(),
    };
  }

  app.get('/api/welcome/dashboard', requireAdminPermission('viewAnalytics'), async (_req: AdminRequest, res: Response) => {
    res.json(await buildWelcomeDashboardPayload());
  });

  app.put('/api/welcome/settings', requireAdminPermission('sendNotifications'), async (req: AdminRequest, res: Response) => {
    const body = (req.body || {}) as Partial<WelcomeSettingsConfig>;
    const updated = saveWelcomeSettings(body);
    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'WELCOME_SETTINGS_UPDATED',
      category: 'security',
      targetId: 'default',
      targetLabel: `Auto=${updated.enabled} | SMS=${updated.smsEnabled} | WA=${updated.whatsappEnabled} | App=${updated.inAppEnabled}`,
      details: 'Updated welcome message templates and channel settings.',
    });
    res.json({
      success: true,
      settings: updated,
      dashboard: await buildWelcomeDashboardPayload(),
    });
  });

  app.post('/api/welcome/resend', requireAdminPermission('sendNotifications'), async (req: AdminRequest, res: Response) => {
    const { recipientId, accountCategory, channels } = (req.body || {}) as {
      recipientId?: string;
      accountCategory?: WelcomeAccountCategory;
      channels?: WelcomeChannel[];
    };
    if (!recipientId || (accountCategory !== 'rider' && accountCategory !== 'passenger')) {
      res.status(400).json({ error: 'Valid recipientId and accountCategory ("rider" | "passenger") are required.' });
      return;
    }

    const sentBy = req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)';

    if (accountCategory === 'rider') {
      const rider = getRiderById(recipientId);
      if (!rider) {
        res.status(404).json({ error: 'Rider record not found.' });
        return;
      }
      const deliveries = await dispatchAutomatedWelcomeForMember({
        recipientId: rider.id,
        recipientName: rider.fullName,
        phone: rider.phone,
        whatsappNumber: rider.whatsappNumber,
        memberId: rider.riderIdNumber,
        location: `${rider.stageName ? `${rider.stageName}, ` : ''}${rider.subCounty || 'Kikyusa'}, ${rider.district || 'Luweero'}`,
        accountCategory: 'rider',
        registrationSource: 'admin_manual',
        registrationDate: rider.registrationDate || new Date().toISOString().split('T')[0],
        channelsOverride: Array.isArray(channels) && channels.length > 0 ? channels : undefined,
        isResend: true,
        sentBy,
      });
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: sentBy,
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'WELCOME_MESSAGE_RESENT',
        category: 'riders',
        targetId: rider.id,
        targetLabel: rider.fullName,
        details: `Resent rider welcome notification across ${deliveries.map((d) => `${d.channel}:${d.status}`).join(', ')}.`,
      });
      res.json({ success: true, deliveries, dashboard: await buildWelcomeDashboardPayload() });
      return;
    }

    const passenger = listPassengers().find((p) => p.id === recipientId);
    if (!passenger) {
      res.status(404).json({ error: 'Passenger/customer record not found.' });
      return;
    }
    const deliveries = await dispatchAutomatedWelcomeForMember({
      recipientId: passenger.id,
      recipientName: passenger.fullName,
      phone: passenger.phone,
      whatsappNumber: passenger.whatsappNumber,
      memberId: passenger.passengerIdNumber || passenger.id,
      location: `${passenger.subCounty || 'Luweero Town Council'}, ${passenger.district || 'Luweero'}`,
      accountCategory: 'passenger',
      registrationSource: 'admin_manual',
      registrationDate: (passenger.createdAt || new Date().toISOString()).split('T')[0],
      channelsOverride: Array.isArray(channels) && channels.length > 0 ? channels : undefined,
      isResend: true,
      sentBy,
    });
    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: sentBy,
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'WELCOME_MESSAGE_RESENT',
      category: 'passengers',
      targetId: passenger.id,
      targetLabel: passenger.fullName,
      details: `Resent customer welcome notification across ${deliveries.map((d) => `${d.channel}:${d.status}`).join(', ')}.`,
    });
    res.json({ success: true, deliveries, dashboard: await buildWelcomeDashboardPayload() });
  });

  app.post('/api/welcome/retry', requireAdminPermission('sendNotifications'), async (req: AdminRequest, res: Response) => {
    const { recordIds } = (req.body || {}) as { recordIds?: string[] };
    const candidates =
      Array.isArray(recordIds) && recordIds.length > 0
        ? recordIds.map((id) => getWelcomeNotificationById(id)).filter((r): r is WelcomeNotificationRecord => Boolean(r))
        : listWelcomeNotifications({ limit: 300 }).filter(
            (r) => r.status === 'failed' || r.status === 'blocked_unconfigured' || r.status === 'pending'
          );

    if (candidates.length === 0) {
      res.status(400).json({ error: 'No failed or pending welcome notifications found to retry.' });
      return;
    }

    let retriedCount = 0;
    const updatedRecords: WelcomeNotificationRecord[] = [];
    for (const item of candidates) {
      const nowIso = new Date().toISOString();
      const targetPhone = item.channel === 'whatsapp' ? item.whatsappNumber || item.recipientPhone : item.recipientPhone;
      const phoneCheck = validateUgandaPhone(targetPhone || '');

      if (item.channel === 'in_app') {
        insertNotification({
          id: `notif-welcome-retry-${item.id}-${Date.now()}`,
          userId: item.recipientId,
          title: `Welcome to BodaCare Uganda, ${item.recipientName}!`,
          message: item.messageText,
          timestamp: nowIso,
          read: false,
          type: 'system',
        });
        const nextRec = upsertWelcomeNotification({
          ...item,
          status: 'delivered',
          errorReason: undefined,
          retryCount: (item.retryCount || 0) + 1,
          updatedAt: nowIso,
        });
        updatedRecords.push(nextRec);
        retriedCount++;
      } else if (!phoneCheck.isValid) {
        const nextRec = upsertWelcomeNotification({
          ...item,
          status: 'invalid_number',
          errorReason: phoneCheck.reason || 'Invalid Uganda phone number',
          retryCount: (item.retryCount || 0) + 1,
          updatedAt: nowIso,
        });
        updatedRecords.push(nextRec);
      } else if (item.channel === 'sms') {
        const smsRes = await sendRealSmsViaGateway(phoneCheck.normalized, item.messageText);
        const nextRec = upsertWelcomeNotification({
          ...item,
          recipientPhone: phoneCheck.normalized,
          status: smsRes.status,
          providerMessageId: smsRes.providerMessageId,
          errorReason: smsRes.errorReason,
          retryCount: (item.retryCount || 0) + 1,
          updatedAt: nowIso,
        });
        updatedRecords.push(nextRec);
        retriedCount++;
      } else if (item.channel === 'whatsapp') {
        const waRes = await sendRealWhatsAppViaGateway(phoneCheck.normalized, item.messageText);
        const nextRec = upsertWelcomeNotification({
          ...item,
          recipientPhone: phoneCheck.normalized,
          status: waRes.status,
          providerMessageId: waRes.providerMessageId,
          errorReason: waRes.errorReason,
          retryCount: (item.retryCount || 0) + 1,
          updatedAt: nowIso,
        });
        updatedRecords.push(nextRec);
        retriedCount++;
      }
    }

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'WELCOME_NOTIFICATIONS_RETRIED',
      category: 'security',
      targetLabel: `${retriedCount} welcome record(s)`,
      details: `Retried ${candidates.length} welcome notification(s).`,
    });

    res.json({
      success: true,
      retriedCount,
      updatedRecords,
      dashboard: await buildWelcomeDashboardPayload(),
    });
  });

  app.get('/api/discovery/dashboard', requireAdminPermission('manageJobs'), (_req: AdminRequest, res: Response) => {
    res.json(buildDiscoveryDashboardPayload());
  });

  app.post('/api/discovery/scan', requireAdminPermission('manageJobs'), async (req: AdminRequest, res: Response) => {
    const { trigger, sourceIds } = (req.body || {}) as {
      trigger?: 'manual' | 'retry';
      sourceIds?: string[];
    };
    const runReport = await runDiscoveryPipeline(
      {
        trigger: trigger === 'retry' ? 'retry' : 'manual',
        sourceIds: Array.isArray(sourceIds) ? sourceIds : undefined,
        actorName: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
      },
      notifyAdminOnJobDiscovery
    );
    res.json({
      success: true,
      runReport,
      dashboard: buildDiscoveryDashboardPayload(),
    });
  });

  app.post('/api/discovery/ingest', requireAdminPermission('manageJobs'), async (req: AdminRequest, res: Response) => {
    const { sourceId, items } = (req.body || {}) as {
      sourceId?: string;
      items?: RawDiscoveredCandidate[];
    };
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one structured job item is required for feed ingestion.' });
      return;
    }
    const source = getSourceOrDefault(sourceId);
    const result = await normalizeAndPersistCandidates(items, source);
    const nowIso = new Date().toISOString();
    upsertDiscoverySource({
      ...source,
      lastCheckedAt: nowIso,
      lastStatus: 'ok',
      lastError: undefined,
      jobsFoundLastRun: result.savedNew.length,
      totalJobsDiscovered: (source.totalJobsDiscovered || 0) + result.savedNew.length,
      updatedAt: nowIso,
    });

    if (result.savedNew.length > 0) {
      const schedule = getDiscoveryScheduleConfig();
      const syntheticRun = {
        id: `drun-ingest-${Date.now()}`,
        trigger: 'manual' as const,
        startedAt: nowIso,
        completedAt: nowIso,
        status: 'completed' as const,
        sourcesScanned: 1,
        sourcesFailed: 0,
        totalFetched: items.length,
        newJobsDiscovered: result.savedNew.length,
        duplicatesDetected: result.duplicatesDetected,
        suspiciousFlagged: result.suspiciousFlagged,
        expiredDetected: result.expiredFlagged,
        awaitingApprovalCount: computeDiscoveryCounts().new + computeDiscoveryCounts().awaiting_verification,
        rejectedCount: computeDiscoveryCounts().rejected,
        adminNotificationsSent: [] as Array<{ channel: string; status: string; target: string }>,
        sourceOutcomes: [],
      };
      syntheticRun.adminNotificationsSent = await notifyAdminOnJobDiscovery({
        runReport: syntheticRun,
        newlySavedJobs: result.savedNew,
        schedule,
      });
    }

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: req.adminOperator?.fullName || 'Super Admin',
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'DISCOVERY_FEED_INGESTED',
      category: 'jobs',
      targetId: source.id,
      targetLabel: source.name,
      details: `Ingested ${items.length} ad(s): ${result.savedNew.length} new, ${result.duplicatesDetected} duplicate(s), ${result.suspiciousFlagged} suspicious, ${result.expiredFlagged} expired.`,
    });

    res.json({
      success: true,
      ingested: result,
      dashboard: buildDiscoveryDashboardPayload(),
    });
  });

  app.post('/api/discovery/sources', requireAdminPermission('manageJobs'), (req: AdminRequest, res: Response) => {
    const body = (req.body || {}) as Partial<DiscoverySource>;
    if (!body.name?.trim() || !body.url?.trim() || !body.sourceType) {
      res.status(400).json({ error: 'Source name, source type, and endpoint URL are required.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const created = upsertDiscoverySource({
      id: body.id || `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: body.name.trim(),
      category: body.category || 'uganda_job_portal',
      sourceType: body.sourceType,
      url: body.url.trim(),
      queryTemplate: body.queryTemplate?.trim() || undefined,
      active: body.active !== false,
      respectRobotsTxt: body.respectRobotsTxt !== false,
      priorityWeight: Number(body.priorityWeight ?? 80),
      lastStatus: 'never_run',
      jobsFoundLastRun: 0,
      totalJobsDiscovered: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: req.adminOperator?.fullName || 'Super Admin',
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'DISCOVERY_SOURCE_ADDED',
      category: 'jobs',
      targetId: created.id,
      targetLabel: created.name,
      details: `Added ${created.sourceType} source (${created.url}).`,
    });
    res.json({ source: created, sources: listDiscoverySources() });
  });

  app.put('/api/discovery/sources/:id', requireAdminPermission('manageJobs'), (req: AdminRequest, res: Response) => {
    const existing = getDiscoverySourceById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Discovery source not found.' });
      return;
    }
    const body = (req.body || {}) as Partial<DiscoverySource>;
    const updated = upsertDiscoverySource({
      ...existing,
      ...body,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    });
    res.json({ source: updated, sources: listDiscoverySources() });
  });

  app.delete('/api/discovery/sources/:id', requireAdminPermission('deleteRecords'), (req: AdminRequest, res: Response) => {
    const existing = getDiscoverySourceById(req.params.id);
    const deleted = deleteDiscoverySource(req.params.id);
    if (deleted && existing) {
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'DISCOVERY_SOURCE_DELETED',
        category: 'jobs',
        targetId: existing.id,
        targetLabel: existing.name,
        details: `Removed discovery source (${existing.url}).`,
      });
    }
    res.json({ deleted, sources: listDiscoverySources() });
  });

  app.post('/api/discovery/sources/:id/test', requireAdminPermission('manageJobs'), async (req: AdminRequest, res: Response) => {
    const source = getDiscoverySourceById(req.params.id);
    if (!source) {
      res.status(404).json({ error: 'Discovery source not found.' });
      return;
    }
    const schedule = getDiscoveryScheduleConfig();
    const result = await fetchFromDiscoverySource(source, schedule);
    const nowIso = new Date().toISOString();
    upsertDiscoverySource({
      ...source,
      lastCheckedAt: nowIso,
      lastStatus: result.status,
      lastError: result.error,
      updatedAt: nowIso,
    });
    res.json({
      sourceId: source.id,
      status: result.status,
      error: result.error,
      sampleCount: result.candidates.length,
      sampleTitles: result.candidates.slice(0, 5).map((c) => c.title),
      sources: listDiscoverySources(),
    });
  });

  app.put('/api/discovery/schedule', requireAdminPermission('manageJobs'), (req: AdminRequest, res: Response) => {
    const current = getDiscoveryScheduleConfig();
    const body = (req.body || {}) as Partial<DiscoveryScheduleConfig>;
    const cleanTimes = Array.isArray(body.scanTimes)
      ? body.scanTimes.filter((t) => /^\d{2}:\d{2}$/.test(String(t).trim()))
      : current.scanTimes;

    const saved = saveDiscoveryScheduleConfig({
      ...current,
      ...body,
      id: 'default',
      scanTimes: cleanTimes.length > 0 ? cleanTimes : current.scanTimes,
    });

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: req.adminOperator?.fullName || 'Super Admin',
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'DISCOVERY_SCHEDULE_UPDATED',
      category: 'jobs',
      targetId: 'default',
      targetLabel: `Auto=${saved.automationEnabled} | Times=${saved.scanTimes.join(', ')}`,
      details: `Admin SMS=${saved.notifyAdminSms}, WhatsApp=${saved.notifyAdminWhatsapp}, InApp=${saved.notifyAdminInApp}.`,
    });

    res.json({ schedule: saved });
  });

  app.put('/api/discovery/jobs/:id', requireAdminPermission('manageJobs'), (req: AdminRequest, res: Response) => {
    const existing = getDiscoveredJobById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Discovered job record not found.' });
      return;
    }
    const body = (req.body || {}) as Partial<DiscoveredJobRecord>;
    const nextTitle = (body.title ?? existing.title).trim();
    const nextEmployer = (body.employerName ?? existing.employerName).trim();
    const nextDesc = (body.description ?? existing.description).trim();
    const nextRawLoc = (body.rawLocation ?? existing.rawLocation).trim();
    const loc = computeUgandaLocationDetails(`${nextTitle} ${nextRawLoc} ${body.subCounty || ''} ${body.district || ''}`);
    const nextDeadline = body.deadline !== undefined ? body.deadline : existing.deadline;
    const todayIso = new Date().toISOString().split('T')[0];
    const isExpired = nextDeadline ? nextDeadline < todayIso : false;

    const risk = analyzeScamAndCompleteness({
      title: nextTitle,
      employerName: nextEmployer,
      employerPhone: body.employerPhone ?? existing.employerPhone,
      employerEmail: body.employerEmail ?? existing.employerEmail,
      employerWebsite: body.employerWebsite ?? existing.employerWebsite,
      employerAddress: body.employerAddress ?? existing.employerAddress,
      description: nextDesc,
      salaryDisplay: body.salaryDisplay ?? existing.salaryDisplay,
      deadline: nextDeadline,
    });

    const updated = upsertDiscoveredJob({
      ...existing,
      ...body,
      id: existing.id,
      title: nextTitle,
      employerName: nextEmployer,
      description: nextDesc,
      rawLocation: nextRawLoc,
      district: body.district || loc.district,
      subCounty: body.subCounty || loc.subCounty,
      locationPriorityScore: body.locationPriorityScore ?? loc.locationPriorityScore,
      contentHash: buildContentHash(nextTitle, nextEmployer, body.originalUrl || existing.originalUrl, body.district || loc.district),
      isExpired,
      isAcceptingApplications: !isExpired,
      scamFlags: risk.scamFlags,
      incompleteFlags: risk.incompleteFlags,
      status: existing.status === 'new' ? 'awaiting_verification' : existing.status,
      reviewedBy: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: req.adminOperator?.fullName || 'Super Admin',
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'DISCOVERED_JOB_EDITED',
      category: 'jobs',
      targetId: updated.id,
      targetLabel: updated.title,
      details: `Edited discovered job details before verification (${updated.employerName}, ${updated.subCounty}).`,
    });

    res.json({ job: updated, dashboard: buildDiscoveryDashboardPayload() });
  });

  app.post('/api/discovery/jobs/:id/approve-publish', requireAdminPermission('manageJobs'), async (req: AdminRequest, res: Response) => {
    const discovered = getDiscoveredJobById(req.params.id);
    if (!discovered) {
      res.status(404).json({ error: 'Discovered job record not found.' });
      return;
    }

    const {
      dispatchMode = 'all_channels',
      matchCriteria = { matchLocation: true, matchOccupation: true, matchQualifications: true },
      customSmsMessage,
      customWhatsappMessage,
    } = (req.body || {}) as {
      dispatchMode?: JobAlertDispatchMode;
      matchCriteria?: {
        matchLocation?: boolean;
        matchOccupation?: boolean;
        matchQualifications?: boolean;
      };
      customSmsMessage?: string;
      customWhatsappMessage?: string;
    };

    const nowIso = new Date().toISOString();
    const sentBy = req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)';

    // Convert into a verified published BodaCare job (never auto-published without this Admin step)
    const publishedJobId = discovered.publishedJobId || `job-disc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const publishedJob = upsertJobRecord(
      {
        id: publishedJobId,
        jobCode: generateRecordCode('JOB'),
        employerId: `emp-disc-${discovered.employerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 18)}`,
        employerName: discovered.employerName,
        employerPhone: discovered.employerPhone || '+256 772 100 240',
        employerCompany: discovered.employerName,
        title: discovered.title,
        type: discovered.jobCategory,
        description: `${discovered.description}\n\nVerified Original Source: ${discovered.sourceName} (${discovered.originalUrl})`,
        pickupLocation: discovered.employerAddress || discovered.rawLocation || `${discovered.subCounty}, ${discovered.district}`,
        deliveryLocation: `${discovered.subCounty}, ${discovered.district}`,
        district: discovered.district,
        subCounty: discovered.subCounty,
        village: discovered.village,
        distanceKm: 10,
        paymentAmountUgx: discovered.salaryAmountUgx || 0,
        salaryDisplay: discovered.salaryDisplay || (discovered.salaryAmountUgx ? `UGX ${discovered.salaryAmountUgx.toLocaleString()}` : 'Competitive / As Agreed'),
        paymentFrequency: discovered.paymentFrequency || 'weekly',
        requiredMotorcycleType: 'any',
        status: 'open',
        postedDate: nowIso.split('T')[0],
        deadline: discovered.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        applicationsCount: 0,
        adminApproved: true,
        requirements: [discovered.qualifications, discovered.experienceRequirements].filter(Boolean).join(' | '),
        applicationInstructions: `Original ad verified via BodaCare Admin. Contact ${discovered.employerPhone || discovered.employerEmail || discovered.originalUrl}`,
        verifiedBy: sentBy,
        verifiedAt: nowIso,
        notificationMode: dispatchMode,
        updatedAt: nowIso,
      },
      true
    );

    const updatedDiscovered = upsertDiscoveredJob({
      ...discovered,
      status: 'verified',
      employerVerificationStatus: 'confirmed_by_admin',
      publishedJobId: publishedJob.id,
      reviewedBy: sentBy,
      reviewedAt: nowIso,
      updatedAt: nowIso,
    });

    // Match registered job seekers by Preferred Location, Occupation / Job Category, and Qualifications
    const allRiders = listRiders().filter((r) => (r.accountStatus || 'active') === 'active');
    const matchedRiders = allRiders.filter((rider) => {
      const prefs = rider.jobAlertPreferences;
      if (matchCriteria.matchLocation !== false) {
        const riderLocTokens = [
          rider.district,
          rider.subCounty,
          rider.village,
          rider.stageName,
          ...(prefs?.preferredSubCounties || []),
        ]
          .filter((s): s is string => Boolean(s))
          .map((s) => s.toLowerCase());

        const jobLocTerms = [discovered.district, discovered.subCounty, discovered.village, discovered.rawLocation]
          .filter((s): s is string => Boolean(s))
          .map((s) => s.toLowerCase());

        const isNationalJob = discovered.district.toLowerCase().includes('uganda');
        const locOverlap =
          isNationalJob ||
          riderLocTokens.length === 0 ||
          riderLocTokens.some((rTok) =>
            jobLocTerms.some((jTok) => jTok.includes(rTok) || rTok.includes(jTok))
          );
        if (!locOverlap) return false;
      }

      if (matchCriteria.matchOccupation !== false) {
        const matchesCat = !prefs?.jobTypes?.length || prefs.jobTypes.includes(publishedJob.type);
        const occText = (prefs?.occupation || '').trim().toLowerCase();
        const jobOccText = `${discovered.title} ${discovered.occupationTag || ''} ${discovered.jobCategory}`.toLowerCase();
        const matchesOcc = !occText || occText.split(/[\s,/]+/).some((tok) => tok.length >= 3 && jobOccText.includes(tok));
        if (!matchesCat && !matchesOcc) return false;
      }

      if (matchCriteria.matchQualifications !== false && discovered.qualifications) {
        const qualLower = `${discovered.qualifications} ${discovered.experienceRequirements || ''}`.toLowerCase();
        if (qualLower.includes('electric') && rider.motorcycleType !== 'electric') {
          return false;
        }
        if (qualLower.includes('verified permit') || qualLower.includes('class a')) {
          if (rider.verificationStatus === 'suspended' || rider.verificationStatus === 'rejected') return false;
        }
        if (prefs?.qualifications?.length) {
          const riderQuals = prefs.qualifications.map((q) => q.toLowerCase());
          const hasSpecificRequirement = ['degree', 'diploma', 'certificate', 'class a', 'permit', 'mechanics'].some((kw) =>
            qualLower.includes(kw)
          );
          if (
            hasSpecificRequirement &&
            !riderQuals.some((rq) => qualLower.includes(rq) || rq.includes('permit'))
          ) {
            return false;
          }
        }
      }

      return true;
    });

    const targetRiders = matchedRiders.length > 0 ? matchedRiders : allRiders;
    const appOrigin = resolveAppOrigin(req);
    let broadcastResult: Awaited<ReturnType<typeof enqueueJobSeekerBroadcast>> | null = null;

    if (dispatchMode !== 'none') {
      broadcastResult = await enqueueJobSeekerBroadcast({
        job: publishedJob,
        dispatchMode,
        matchedRiders: targetRiders,
        recipientScope: 'all',
        scopeDetails: `Intelligent Seeker Match (${targetRiders.length}/${allRiders.length} riders matched by Location=${matchCriteria.matchLocation !== false}, Occupation=${matchCriteria.matchOccupation !== false}, Qualifications=${matchCriteria.matchQualifications !== false})`,
        appOrigin,
        sentBy,
        adminOperatorId: req.adminOperator?.id,
        customSmsMessage,
        customWhatsappMessage,
        respectJobTypeFilter: matchCriteria.matchOccupation !== false,
      });
    }

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: sentBy,
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'DISCOVERED_JOB_APPROVED_AND_PUBLISHED',
      category: 'jobs',
      targetId: publishedJob.id,
      targetLabel: `${publishedJob.title} (${publishedJob.employerCompany})`,
      details: `Approved discovered job ${discovered.id} -> Published ${publishedJob.id}. Matched ${targetRiders.length} rider(s). Dispatch mode: ${dispatchMode}.`,
    });

    res.json({
      success: true,
      discoveredJob: updatedDiscovered,
      publishedJob,
      matchedRidersCount: targetRiders.length,
      broadcast: broadcastResult?.broadcast || null,
      dashboard: buildDiscoveryDashboardPayload(),
    });
  });

  app.post('/api/discovery/jobs/:id/request-info', requireAdminPermission('manageJobs'), async (req: AdminRequest, res: Response) => {
    const existing = getDiscoveredJobById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Discovered job record not found.' });
      return;
    }
    const { note, channel } = (req.body || {}) as {
      note?: string;
      channel?: 'none' | 'sms' | 'whatsapp';
    };
    const nowIso = new Date().toISOString();
    const sentBy = req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)';
    const inquiryMsg =
      note?.trim() ||
      `Hello ${existing.employerName}, BodaCare Uganda Admin is verifying your job advert "${existing.title}" (${existing.subCounty}). Kindly reply with your business location, contact confirmation, and salary/deadline details before publication.`;

    let deliveryResult: NotificationDeliveryRecord[] = [];
    if ((channel === 'sms' || channel === 'whatsapp') && existing.employerPhone) {
      deliveryResult = await dispatchMultiChannelMessage({
        channels: [channel],
        recipientId: existing.id,
        recipientName: existing.employerName,
        phone: existing.employerPhone,
        whatsappNumber: existing.employerPhone,
        category: `employer_verification:${existing.id}`,
        title: 'Employer Verification Inquiry',
        message: inquiryMsg,
        sentBy,
      });
    }

    const updated = upsertDiscoveredJob({
      ...existing,
      status: 'info_requested',
      employerVerificationStatus: 'info_requested',
      infoRequestNote: inquiryMsg,
      reviewedBy: sentBy,
      reviewedAt: nowIso,
      updatedAt: nowIso,
    });

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: sentBy,
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'DISCOVERED_JOB_INFO_REQUESTED',
      category: 'jobs',
      targetId: updated.id,
      targetLabel: updated.title,
      details: `Requested more info from employer ${updated.employerName} via ${channel || 'admin_note'}.`,
    });

    res.json({ job: updated, deliveries: deliveryResult, dashboard: buildDiscoveryDashboardPayload() });
  });

  app.post('/api/discovery/jobs/:id/reject', requireAdminPermission('manageJobs'), (req: AdminRequest, res: Response) => {
    const existing = getDiscoveredJobById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Discovered job record not found.' });
      return;
    }
    const { reason } = (req.body || {}) as { reason?: string };
    const nowIso = new Date().toISOString();
    const sentBy = req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)';

    const updated = upsertDiscoveredJob({
      ...existing,
      status: 'rejected',
      adminNotes: reason?.trim() || 'Rejected during Admin verification review.',
      reviewedBy: sentBy,
      reviewedAt: nowIso,
      updatedAt: nowIso,
    });

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: sentBy,
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'DISCOVERED_JOB_REJECTED',
      category: 'jobs',
      targetId: updated.id,
      targetLabel: updated.title,
      details: updated.adminNotes || 'Rejected by Admin.',
    });

    res.json({ job: updated, dashboard: buildDiscoveryDashboardPayload() });
  });

  app.post('/api/discovery/jobs/:id/mark-suspicious', requireAdminPermission('manageJobs'), (req: AdminRequest, res: Response) => {
    const existing = getDiscoveredJobById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Discovered job record not found.' });
      return;
    }
    const { reason } = (req.body || {}) as { reason?: string };
    const nowIso = new Date().toISOString();
    const sentBy = req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)';
    const nextFlags = Array.from(
      new Set([
        ...existing.scamFlags,
        reason?.trim() || 'Marked suspicious by Super Admin review',
      ])
    );

    const updated = upsertDiscoveredJob({
      ...existing,
      status: 'suspicious',
      employerVerificationStatus: 'flagged',
      scamScore: Math.max(existing.scamScore, 80),
      scamFlags: nextFlags,
      adminNotes: reason?.trim() || existing.adminNotes,
      reviewedBy: sentBy,
      reviewedAt: nowIso,
      updatedAt: nowIso,
    });

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: sentBy,
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'DISCOVERED_JOB_MARKED_SUSPICIOUS',
      category: 'security',
      targetId: updated.id,
      targetLabel: updated.title,
      details: `Flagged employer ${updated.employerName} as suspicious: ${nextFlags.join('; ')}`,
    });

    res.json({ job: updated, dashboard: buildDiscoveryDashboardPayload() });
  });

  app.delete('/api/discovery/jobs/:id', requireAdminPermission('deleteRecords'), (req: AdminRequest, res: Response) => {
    const existing = getDiscoveredJobById(req.params.id);
    const deleted = deleteDiscoveredJob(req.params.id);
    if (deleted && existing) {
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Super Admin',
        actorRole: req.adminOperator?.role || 'super_admin',
        action: 'DISCOVERED_JOB_DELETED',
        category: 'jobs',
        targetId: existing.id,
        targetLabel: existing.title,
        details: `Deleted discovery record from ${existing.sourceName}.`,
      });
    }
    res.json({ deleted, dashboard: buildDiscoveryDashboardPayload() });
  });

  app.post('/api/discovery/employers/contact', requireAdminPermission('manageJobs'), async (req: AdminRequest, res: Response) => {
    const {
      employerName,
      phone,
      channel,
      message,
      verificationStatus,
      registrationInfo,
    } = (req.body || {}) as {
      employerName: string;
      phone?: string;
      channel?: 'sms' | 'whatsapp' | 'call_logged' | 'status_only';
      message?: string;
      verificationStatus?: DiscoveredJobRecord['employerVerificationStatus'];
      registrationInfo?: string;
    };

    if (!employerName) {
      res.status(400).json({ error: 'Employer name is required.' });
      return;
    }

    const sentBy = req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)';
    const nowIso = new Date().toISOString();
    let deliveries: NotificationDeliveryRecord[] = [];

    if ((channel === 'sms' || channel === 'whatsapp') && phone) {
      deliveries = await dispatchMultiChannelMessage({
        channels: [channel],
        recipientId: `emp-${employerName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        recipientName: employerName,
        phone,
        whatsappNumber: phone,
        category: 'employer_verification_check',
        title: 'BodaCare Employer Verification Check',
        message:
          message?.trim() ||
          `Hello ${employerName}, Brian Mukisa (BodaCare Uganda Admin) is confirming your vacancy posting for riders in Luweero/Kikyusa. Kindly reply to confirm authenticity.`,
        sentBy,
      });
    }

    const matchingJobs = listDiscoveredJobs({ limit: 2000 }).filter(
      (j) => j.employerName.toLowerCase() === employerName.toLowerCase()
    );
    for (const mj of matchingJobs) {
      upsertDiscoveredJob({
        ...mj,
        employerVerificationStatus: verificationStatus || mj.employerVerificationStatus,
        employerRegistrationInfo: registrationInfo?.trim() || mj.employerRegistrationInfo,
        reviewedBy: sentBy,
        reviewedAt: nowIso,
        updatedAt: nowIso,
      });
    }

    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName: sentBy,
      actorRole: req.adminOperator?.role || 'super_admin',
      action: 'DISCOVERY_EMPLOYER_VERIFICATION_UPDATED',
      category: 'jobs',
      targetLabel: employerName,
      details: `Channel=${channel || 'status_only'}, Status=${verificationStatus || 'unchanged'}, RegInfo=${registrationInfo || 'n/a'}.`,
    });

    res.json({
      success: true,
      deliveries,
      dashboard: buildDiscoveryDashboardPayload(),
    });
  });

  // =========================================================================
  // 5. NON-SMARTPHONE USSD CALLBACK FOUNDATION (AFRICA'S TALKING WEBHOOK)
  // =========================================================================
  app.post('/api/ussd/callback', (req: Request, res: Response) => {
    const ussdCfg = getUssdConfigFromEnv();
    if (!ussdCfg.ussdAdminEnabled) {
      res.setHeader('Content-Type', 'text/plain');
      res.send('END BodaCare USSD menu is temporarily paused by Admin. Call 0772 100 240 for assistance.');
      return;
    }

    const sessionId = String(req.body?.sessionId || `ussd-${Date.now()}`);
    const serviceCode = String(req.body?.serviceCode || ussdCfg.serviceCode);
    const phoneNumber = String(req.body?.phoneNumber || '');
    const text = String(req.body?.text || '').trim();
    const normPhone = normalizePhoneKey(phoneNumber);

    if (normPhone && isAccountRevoked({ phone: normPhone })) {
      res.setHeader('Content-Type', 'text/plain');
      res.send('END Your BodaCare account has been removed or suspended by the Administrator. Call 0772 100 240.');
      return;
    }

    const riders = listRiders();
    const passengers = listPassengers();
    const matchedRider = normPhone ? riders.find((r) => normalizePhoneKey(r.phone) === normPhone) : undefined;
    const matchedPassenger = normPhone ? passengers.find((p) => normalizePhoneKey(p.phone) === normPhone) : undefined;

    const db = getDb();
    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO ussd_sessions (session_id, phone_number, service_code, last_input, rider_id, passenger_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        last_input = excluded.last_input,
        updated_at = excluded.updated_at
    `).run(
      sessionId,
      normPhone || phoneNumber,
      serviceCode,
      text,
      matchedRider?.id || '',
      matchedPassenger?.id || '',
      nowIso,
      nowIso
    );

    res.setHeader('Content-Type', 'text/plain');

    const parts = text ? text.split('*') : [];
    if (!text) {
      const greeting = matchedRider
        ? `BodaCare Rider: ${matchedRider.fullName} (${matchedRider.riderIdNumber})`
        : matchedPassenger
        ? `BodaCare Member: ${matchedPassenger.fullName} (${matchedPassenger.passengerIdNumber})`
        : 'Welcome to BodaCare Uganda (Luweero & Kikyusa)';
      res.send(
        `CON ${greeting}\n1. My Account & Stage Info\n2. Latest Verified Boda Jobs\n3. Nearest Battery Swap Stations\n4. Emergency SOS Helpline`
      );
      return;
    }

    const choice = parts[0];
    if (choice === '1') {
      if (matchedRider) {
        res.send(
          `END Rider ID: ${matchedRider.riderIdNumber}\nPlate: ${matchedRider.motorcycleReg} (${matchedRider.motorcycleType})\nStage: ${matchedRider.stageName}\nStatus: ${matchedRider.verificationStatus.toUpperCase()}`
        );
      } else if (matchedPassenger) {
        res.send(
          `END Passenger ID: ${matchedPassenger.passengerIdNumber}\nArea: ${matchedPassenger.subCounty}, ${matchedPassenger.district}\nStatus: ${matchedPassenger.accountStatus || 'active'}`
        );
      } else {
        res.send(
          'END Phone number not registered in BodaCare.\nVisit your Boda Stage Chairman or call 0772 100 240 for assisted registration.'
        );
      }
      return;
    }

    if (choice === '2') {
      const openJobs = listJobs().filter((j) => j.adminApproved && j.status === 'open').slice(0, 3);
      if (openJobs.length === 0) {
        res.send('END No open verified boda jobs right now. You will receive SMS alerts when new jobs are posted.');
      } else {
        const lines = openJobs.map(
          (j, idx) => `${idx + 1}. ${j.title.slice(0, 34)} (${j.subCounty}) UGX ${j.paymentAmountUgx.toLocaleString()} Call ${j.employerPhone}`
        );
        res.send(`END Latest Verified Jobs:\n${lines.join('\n')}`);
      }
      return;
    }

    if (choice === '3') {
      const stations = listSwapStations()
        .filter((s) => s.status === 'operational' || s.status === 'open')
        .slice(0, 3);
      if (stations.length === 0) {
        res.send('END No operational swap stations found.');
      } else {
        const lines = stations.map(
          (s, idx) => `${idx + 1}. ${s.name} (${s.subCounty}) - ${s.availableBatteries} packs ready. Tel ${s.operatorPhone}`
        );
        res.send(`END Battery Swap Stations:\n${lines.join('\n')}`);
      }
      return;
    }

    if (choice === '4') {
      res.send('END BodaCare 24/7 Emergency & Dispatch Support:\nCall Brian Mukisa: +256 772 100 240\nKikyusa / Luweero Rapid Response.');
      return;
    }

    res.send('END Invalid selection. Please dial again.');
  });

  // =========================================================================
  // 6. PUBLIC LIVE DIRECTORY SYNC & AUTH VERIFICATION (SQLite Authoritative)
  // =========================================================================
  app.get('/api/public/directory', (_req: Request, res: Response) => {
    res.json({
      riders: listRiders(),
      passengers: listPassengers(),
      stages: listStages(),
      stations: listSwapStations(),
      centres: listMaintenanceCentres(),
      jobs: listJobs(),
      resetAt: getSystemMeta('membership_reset_at'),
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { phone, email, role } = (req.body || {}) as {
      phone?: string;
      email?: string;
      role?: string;
    };
    const normPhone = phone ? normalizePhoneKey(phone) : '';
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!normPhone && !cleanEmail) {
      res.status(400).json({ error: 'Phone number or email is required to sign in.' });
      return;
    }

    // 1. Check Super Admin first (Super Admin is never blocked by membership resets)
    const admins = listAdminAccounts();
    const matchedAdmin = admins.find(
      (a) =>
        (normPhone && normalizePhoneKey(a.phone) === normPhone) ||
        (cleanEmail && a.email.toLowerCase() === cleanEmail)
    );
    if (matchedAdmin) {
      if (matchedAdmin.status !== 'active') {
        res.status(403).json({ error: 'This administrator account has been suspended or revoked.' });
        return;
      }
      res.json({
        success: true,
        role: matchedAdmin.role === 'super_admin' ? 'super_admin' : role || 'super_admin',
        adminAccount: matchedAdmin,
        fullName: matchedAdmin.fullName,
        phone: matchedAdmin.phone,
        email: matchedAdmin.email,
      });
      return;
    }

    // 2. Deny deleted / revoked accounts immediately
    const revoked = isAccountRevoked({ phone: normPhone, email: cleanEmail });
    if (revoked) {
      insertAuditLog({
        actorId: revoked.recordId,
        actorName: revoked.fullName,
        actorRole: role || 'member',
        action: 'REVOKED_LOGIN_ATTEMPT_BLOCKED',
        category: 'security',
        targetId: revoked.recordId,
        targetLabel: `${revoked.fullName} (${revoked.phone || revoked.email})`,
        details: `Blocked sign-in attempt from removed/revoked account.`,
      });
      res.status(403).json({
        error: 'Access denied: Your account was removed or revoked by the Super Administrator.',
        revoked: true,
      });
      return;
    }

    // 3. Verify member exists & is active across SQLite directories
    const matchedRider = listRiders().find((r) => normPhone && normalizePhoneKey(r.phone) === normPhone);
    if (matchedRider) {
      if (matchedRider.accountStatus !== 'active') {
        res.status(403).json({ error: 'Your rider account is suspended or deactivated. Contact BodaCare Admin.' });
        return;
      }
      res.json({ success: true, role: 'rider', profile: matchedRider, fullName: matchedRider.fullName, phone: matchedRider.phone });
      return;
    }

    const matchedPassenger = listPassengers().find((p) => normPhone && normalizePhoneKey(p.phone) === normPhone);
    if (matchedPassenger) {
      if (matchedPassenger.accountStatus && matchedPassenger.accountStatus !== 'active') {
        res.status(403).json({ error: 'Your passenger account is suspended or deactivated. Contact BodaCare Admin.' });
        return;
      }
      res.json({ success: true, role: 'passenger', profile: matchedPassenger, fullName: matchedPassenger.fullName, phone: matchedPassenger.phone });
      return;
    }

    const matchedStage = listStages().find((s) => normPhone && normalizePhoneKey(s.leaderPhone) === normPhone);
    if (matchedStage) {
      if (matchedStage.operatingStatus && matchedStage.operatingStatus !== 'active') {
        res.status(403).json({ error: 'Your boda stage account is suspended or closed.' });
        return;
      }
      res.json({ success: true, role: 'stage_leader', profile: matchedStage, fullName: matchedStage.leaderName, phone: matchedStage.leaderPhone });
      return;
    }

    const matchedCentre = listMaintenanceCentres().find((c) => normPhone && normalizePhoneKey(c.phone) === normPhone);
    if (matchedCentre) {
      if (matchedCentre.accountStatus && matchedCentre.accountStatus !== 'active') {
        res.status(403).json({ error: 'Your maintenance centre account is suspended or deactivated.' });
        return;
      }
      res.json({ success: true, role: 'mechanic', profile: matchedCentre, fullName: matchedCentre.ownerName, phone: matchedCentre.phone });
      return;
    }

    const matchedStation = listSwapStations().find((st) => normPhone && normalizePhoneKey(st.operatorPhone) === normPhone);
    if (matchedStation) {
      res.json({ success: true, role: 'station_operator', profile: matchedStation, fullName: matchedStation.operatorName, phone: matchedStation.operatorPhone });
      return;
    }

    res.status(404).json({
      error: 'No active registered account matches that phone number or email. Please create a new account or contact Super Admin.',
    });
  });

  app.get('/api/auth/session-verify', (req: Request, res: Response) => {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    const phone = typeof req.query.phone === 'string' ? req.query.phone : '';
    const email = typeof req.query.email === 'string' ? req.query.email : '';
    const role = typeof req.query.role === 'string' ? req.query.role : '';

    if (role === 'super_admin' || email.toLowerCase() === 'bmukisa@bodawerk.co.ug') {
      const sa = getAdminById('admin-founder-mukisa');
      res.json({ valid: Boolean(sa && sa.status === 'active'), revoked: false });
      return;
    }

    if (isAccountRevoked({ id, phone, email })) {
      res.json({ valid: false, revoked: true });
      return;
    }

    res.json({ valid: true, revoked: false });
  });

  // =========================================================================
  // 7. SUPER ADMIN AUTHENTICATION & APP RESET / MEMBER MANAGEMENT API
  // =========================================================================
  app.get('/api/auth/super-admin/status', (_req: Request, res: Response) => {
    const status = getSuperAdminCredentialStatus();
    res.json(status);
  });

  app.post('/api/auth/super-admin/claim', (req: Request, res: Response) => {
    const { identifier, passcode, confirmPasscode } = (req.body || {}) as {
      identifier?: string;
      passcode?: string;
      confirmPasscode?: string;
    };
    const credStatus = getSuperAdminCredentialStatus();
    if (!credStatus.requiresSetup) {
      res.status(409).json({
        error: 'Super Admin security passcode is already configured. Please use Unlock instead.',
      });
      return;
    }
    if (!isBrianMukisaIdentifier(identifier)) {
      res.status(403).json({
        error: 'Super Admin claim denied. Enter Brian Mukisa’s verified email (bmukisa@bodawerk.co.ug) or phone (+256 772 100 240).',
      });
      return;
    }
    const cleanPass = (passcode || '').trim();
    if (cleanPass.length < 6) {
      res.status(400).json({ error: 'Security passcode must be at least 6 characters long.' });
      return;
    }
    if (confirmPasscode !== undefined && cleanPass !== confirmPasscode.trim()) {
      res.status(400).json({ error: 'Passcode confirmation does not match.' });
      return;
    }

    try {
      saveSuperAdminPasscodeHash(cleanPass);
      const admin = getAdminById('admin-founder-mukisa')!;
      const signed = signSuperAdminToken(admin);
      insertAuditLog({
        actorId: admin.id,
        actorName: admin.fullName,
        actorRole: 'super_admin',
        action: 'SUPER_ADMIN_PASSCODE_CONFIGURED',
        category: 'security',
        targetLabel: admin.email,
        details: 'Initial cryptographic scrypt Super Admin passcode configured and session unlocked.',
      });
      res.json({
        success: true,
        token: signed.token,
        expiresAt: signed.expiresAt,
        admin: {
          id: admin.id,
          fullName: admin.fullName,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
        },
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to configure passcode.' });
    }
  });

  app.post('/api/auth/super-admin/unlock', (req: Request, res: Response) => {
    const { identifier, passcode } = (req.body || {}) as {
      identifier?: string;
      passcode?: string;
    };
    const credStatus = getSuperAdminCredentialStatus();
    if (credStatus.requiresSetup) {
      res.status(409).json({
        error: 'Super Admin security passcode has not been configured yet. Complete initial setup first.',
        requiresSetup: true,
      });
      return;
    }
    if (identifier && !isBrianMukisaIdentifier(identifier)) {
      insertAuditLog({
        actorId: 'anonymous',
        actorName: identifier,
        actorRole: 'guest',
        action: 'SUPER_ADMIN_UNLOCK_FAILED',
        category: 'security',
        targetLabel: 'POST /api/auth/super-admin/unlock',
        details: `Failed Super Admin unlock attempt with unrecognized identifier "${identifier}".`,
      });
      res.status(401).json({ error: 'Invalid Super Admin credentials.' });
      return;
    }
    if (!passcode || !verifySuperAdminPasscode(passcode)) {
      insertAuditLog({
        actorId: 'anonymous',
        actorName: identifier || 'Unknown Caller',
        actorRole: 'guest',
        action: 'SUPER_ADMIN_UNLOCK_FAILED',
        category: 'security',
        targetLabel: 'POST /api/auth/super-admin/unlock',
        details: 'Failed Super Admin unlock attempt (incorrect security passcode).',
      });
      res.status(401).json({ error: 'Incorrect Super Admin security passcode.' });
      return;
    }

    const admin = getAdminById('admin-founder-mukisa');
    if (!admin || admin.status !== 'active' || admin.role !== 'super_admin') {
      res.status(403).json({ error: 'Super Admin account is unavailable.' });
      return;
    }

    const signed = signSuperAdminToken(admin);
    insertAuditLog({
      actorId: admin.id,
      actorName: admin.fullName,
      actorRole: 'super_admin',
      action: 'SUPER_ADMIN_SESSION_UNLOCKED',
      category: 'security',
      targetLabel: admin.email,
      details: 'Super Admin unlocked App Reset & Member Management authenticated session.',
    });

    res.json({
      success: true,
      token: signed.token,
      expiresAt: signed.expiresAt,
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
      },
    });
  });

  app.post('/api/auth/super-admin/logout', requireSuperAdmin, (req: AdminRequest, res: Response) => {
    const authHeader = req.header('authorization') || '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (rawToken) {
      revokedSuperAdminTokens.add(rawToken);
    }
    insertAuditLog({
      actorId: req.adminOperator?.id || 'admin-founder-mukisa',
      actorName: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
      actorRole: 'super_admin',
      action: 'SUPER_ADMIN_SESSION_LOCKED',
      category: 'security',
      targetLabel: 'App Reset & Member Management',
      details: 'Super Admin manually locked and revoked active Bearer session token.',
    });
    res.json({ success: true });
  });

  app.post('/api/auth/super-admin/change-passcode', requireSuperAdmin, (req: AdminRequest, res: Response) => {
    const credStatus = getSuperAdminCredentialStatus();
    if (credStatus.source === 'env') {
      res.status(409).json({
        error:
          'Passcode is currently managed by the SUPER_ADMIN_PASSCODE server environment variable. Update SUPER_ADMIN_PASSCODE in your Secrets / host environment settings instead.',
      });
      return;
    }

    const { currentPasscode, newPasscode, confirmNewPasscode } = (req.body || {}) as {
      currentPasscode?: string;
      newPasscode?: string;
      confirmNewPasscode?: string;
    };

    if (!currentPasscode || !verifySuperAdminPasscode(currentPasscode)) {
      res.status(401).json({ error: 'Current Super Admin passcode is incorrect.' });
      return;
    }
    const cleanNew = (newPasscode || '').trim();
    if (cleanNew.length < 6) {
      res.status(400).json({ error: 'New security passcode must be at least 6 characters long.' });
      return;
    }
    if (confirmNewPasscode !== undefined && cleanNew !== confirmNewPasscode.trim()) {
      res.status(400).json({ error: 'New passcode confirmation does not match.' });
      return;
    }

    saveSuperAdminPasscodeHash(cleanNew);
    insertAuditLog({
      actorId: req.adminOperator?.id || 'admin-founder-mukisa',
      actorName: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
      actorRole: 'super_admin',
      action: 'SUPER_ADMIN_PASSCODE_ROTATED',
      category: 'security',
      targetLabel: credStatus.email,
      details: 'Brian Mukisa updated his scrypt-hashed Super Admin security passcode.',
    });

    res.json({ success: true, status: getSuperAdminCredentialStatus() });
  });

  app.get('/api/admin/system-reset/overview', requireSuperAdmin, (_req: AdminRequest, res: Response) => {
    res.json(buildSystemResetOverview());
  });

  app.get('/api/admin/system-reset/backup', requireSuperAdmin, (req: AdminRequest, res: Response) => {
    const actorName = req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)';
    const snapshot = buildMembershipBackupSnapshot(actorName);
    insertAuditLog({
      actorId: req.adminOperator?.id,
      actorName,
      actorRole: 'super_admin',
      action: 'SYSTEM_MEMBERSHIP_BACKUP_EXPORTED',
      category: 'security',
      targetLabel: `Exported ${snapshot.counts.riders} riders, ${snapshot.counts.passengers} passengers, ${snapshot.counts.stages} stages, ${snapshot.counts.swap_stations} stations, ${snapshot.counts.maintenance_centres} centres`,
      details: 'Super Admin exported full pre-reset JSON backup snapshot.',
    });
    const dateTag = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="bodacare-uganda-backup-${dateTag}.json"`);
    res.send(JSON.stringify(snapshot, null, 2));
  });

  app.post('/api/admin/system-reset/selective', requireSuperAdmin, (req: AdminRequest, res: Response) => {
    const { items, reason } = (req.body || {}) as {
      items?: SelectiveDeleteTarget[];
      reason?: string;
    };
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Select at least one record to delete permanently.' });
      return;
    }

    const actor = {
      id: req.adminOperator?.id || 'admin-founder-mukisa',
      name: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
    };
    const db = getDb();
    let deletedCount = 0;
    let revokedCount = 0;
    const deletedLabels: string[] = [];
    const errors: string[] = [];

    db.exec('BEGIN IMMEDIATE');
    try {
      for (const item of items) {
        if (!item?.category || !item?.id) continue;
        const outcome = deleteEntityWithCleanup(
          item.category as ResetCategoryId,
          item.id,
          actor,
          reason?.trim() || 'Selective removal by Super Admin'
        );
        if (outcome.deleted) {
          deletedCount++;
          if (outcome.revoked) revokedCount++;
          deletedLabels.push(`[${item.category}] ${outcome.label}`);
        } else if (outcome.error) {
          errors.push(`${item.category}/${item.id}: ${outcome.error}`);
        }
      }

      if (deletedCount > 0) {
        insertAuditLog({
          actorId: actor.id,
          actorName: actor.name,
          actorRole: 'super_admin',
          action: 'SYSTEM_SELECTIVE_MEMBERSHIP_REMOVAL',
          category: 'security',
          targetLabel: `${deletedCount} record(s) removed`,
          details: `Selectively removed: ${deletedLabels.slice(0, 12).join('; ')}${deletedLabels.length > 12 ? ` (+${deletedLabels.length - 12} more)` : ''}. Reason: ${reason?.trim() || 'Super Admin cleanup'}.`,
        });
      }

      db.exec('COMMIT');
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      res.status(500).json({ error: err instanceof Error ? err.message : 'Selective deletion failed.' });
      return;
    }

    res.json({
      success: true,
      mode: 'selective',
      deletedCount,
      revokedCount,
      errors,
      resetAt: new Date().toISOString(),
      details: `Removed ${deletedCount} selected record(s) and revoked ${revokedCount} associated login credential(s).`,
      overview: buildSystemResetOverview(),
      analytics: computeCentralAnalytics(),
    });
  });

  const VALID_RESET_CATEGORIES = new Set<ResetCategoryId>([
    'riders',
    'passengers',
    'stages',
    'swap_stations',
    'maintenance_centres',
    'jobs',
    'discovered_jobs',
    'non_super_admins',
  ]);

  app.post('/api/admin/system-reset/category', requireSuperAdmin, (req: AdminRequest, res: Response) => {
    const { categories, confirmationText, reason } = (req.body || {}) as {
      categories?: string[];
      confirmationText?: string;
      reason?: string;
    };

    const validCategories = Array.isArray(categories)
      ? (categories.filter((c): c is ResetCategoryId => VALID_RESET_CATEGORIES.has(c as ResetCategoryId)))
      : [];

    if (validCategories.length === 0) {
      res.status(400).json({ error: 'Provide at least one valid category to reset.' });
      return;
    }

    if ((confirmationText || '').trim().toUpperCase() !== 'RESET') {
      res.status(400).json({
        error: 'Safety confirmation phrase mismatch. Type "RESET" exactly to authorize this operation.',
      });
      return;
    }

    try {
      const summary = performCategoryReset({
        actorId: req.adminOperator?.id || 'admin-founder-mukisa',
        actorName: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
        categories: validCategories,
        reason,
      });

      res.json({
        success: true,
        mode: 'category',
        ...summary,
        overview: buildSystemResetOverview(),
        analytics: computeCentralAnalytics(),
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Category reset failed.' });
    }
  });

  app.post('/api/admin/system-reset/complete', requireSuperAdmin, (req: AdminRequest, res: Response) => {
    const { confirmationText, includeJobs, reason } = (req.body || {}) as {
      confirmationText?: string;
      includeJobs?: boolean;
      reason?: string;
    };

    if ((confirmationText || '').trim().toUpperCase() !== 'RESET') {
      res.status(400).json({
        error: 'Safety confirmation phrase mismatch. Type "RESET" exactly to authorize this operation.',
      });
      return;
    }

    try {
      const summary = performCompleteMembershipReset({
        actorId: req.adminOperator?.id || 'admin-founder-mukisa',
        actorName: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
        includeJobs: includeJobs !== false,
        reason,
      });

      res.json({
        success: true,
        mode: 'complete',
        ...summary,
        overview: buildSystemResetOverview(),
        analytics: computeCentralAnalytics(),
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Complete system reset failed.' });
    }
  });

  app.post('/api/admin/system-reset/unrevoke', requireSuperAdmin, (req: AdminRequest, res: Response) => {
    const { idOrPhone } = (req.body || {}) as { idOrPhone?: string };
    if (!idOrPhone?.trim()) {
      res.status(400).json({ error: 'Revocation ID or phone/email is required.' });
      return;
    }
    const val = idOrPhone.trim();
    const removed = unrevokeByPhoneOrEmail(val, val, val);
    if (removed > 0) {
      insertAuditLog({
        actorId: req.adminOperator?.id,
        actorName: req.adminOperator?.fullName || 'Brian Mukisa (Super Admin)',
        actorRole: 'super_admin',
        action: 'SYSTEM_ACCOUNT_ACCESS_RESTORED',
        category: 'security',
        targetLabel: val,
        details: `Super Admin lifted account revocation block for "${val}".`,
      });
    }
    res.json({
      success: removed > 0,
      removed,
      overview: buildSystemResetOverview(),
      analytics: computeCentralAnalytics(),
    });
  });

  // =========================================================================
  // 8. ANDROID PWA WEB PUSH SUBSCRIPTION & NOTIFICATION ROUTES
  // =========================================================================
  app.get('/api/push/vapid-public-key', (_req: Request, res: Response) => {
    const runtime = getWebPushRuntime();
    res.json({
      enabled: runtime.enabled,
      publicKey: runtime.publicKey,
      source: runtime.source,
      subscribedDevicesCount: listPushSubscriptions().length,
    });
  });

  app.post('/api/push/subscribe', (req: Request, res: Response) => {
    const { subscription, userId, role } = (req.body || {}) as {
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      userId?: string;
      role?: string;
    };

    const endpoint = String(subscription?.endpoint || '').trim();
    const p256dh = String(subscription?.keys?.p256dh || '').trim();
    const auth = String(subscription?.keys?.auth || '').trim();

    if (!endpoint || !p256dh || !auth) {
      res.status(400).json({ error: 'Valid PushSubscription endpoint and keys (p256dh, auth) are required.' });
      return;
    }

    try {
      const parsedUrl = new URL(endpoint);
      const isHttpsOrLocal =
        parsedUrl.protocol === 'https:' ||
        (parsedUrl.protocol === 'http:' && (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1'));
      if (!isHttpsOrLocal) {
        res.status(400).json({ error: 'Push subscription endpoint must use HTTPS.' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'Malformed push subscription endpoint URL.' });
      return;
    }

    const saved = upsertPushSubscription({
      endpoint,
      p256dh,
      auth,
      userId: typeof userId === 'string' ? userId.slice(0, 80) : undefined,
      role: typeof role === 'string' ? role.slice(0, 40) : undefined,
      userAgent: req.header('user-agent') || '',
    });

    res.json({ success: true, id: saved.id, subscribedAt: saved.updatedAt });
  });

  app.post('/api/push/unsubscribe', (req: Request, res: Response) => {
    const { endpoint } = (req.body || {}) as { endpoint?: string };
    if (!endpoint?.trim()) {
      res.status(400).json({ error: 'Subscription endpoint is required to unsubscribe.' });
      return;
    }
    const removed = deletePushSubscription(endpoint.trim());
    res.json({ success: true, removed });
  });

  app.post('/api/push/test', async (req: Request, res: Response) => {
    const { title, body, url, userId } = (req.body || {}) as {
      title?: string;
      body?: string;
      url?: string;
      userId?: string;
    };

    const result = await sendWebPushToSubscribers(
      {
        title: (title || 'E Boda Connect Luweero').trim().slice(0, 80),
        body: (body || 'Push notifications are active for verified jobs, station updates & announcements.').trim().slice(0, 220),
        url: typeof url === 'string' && url.startsWith('/') ? url : '/',
        tag: 'eboda-test-push',
      },
      userId ? { userId } : undefined
    );

    res.json({
      success: true,
      ...result,
      subscribedDevicesCount: listPushSubscriptions().length,
    });
  });

  // Guarantee unmatched /api/* routes always return JSON (never fall through to SPA HTML)
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Guarantee API errors return structured JSON
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const status =
      typeof (err as { status?: unknown })?.status === 'number'
        ? ((err as { status: number }).status)
        : 500;
    const message = err instanceof Error ? err.message : 'Internal server error.';
    if (req.path.startsWith('/api') || req.path.startsWith('/.netlify/functions')) {
      res.status(status).json({ error: message });
      return;
    }
    next(err);
  });

  return app;
}

export async function startServer() {
  const app = createApiApp({ enableScheduler: true });

  // Ensure web app manifest always uses standard MIME type
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.endsWith('.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    }
    next();
  });

  const httpServer = http.createServer(app);

  // Vite or Static Asset Serving
  if (process.env.NODE_ENV !== 'production') {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePkg);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
        allowedHosts: true,
        ws: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`BodaCare Uganda SQLite Command Server running at http://0.0.0.0:${PORT}`);
  });
}

const isDirectEntry =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(__filename) &&
  !process.env.NETLIFY &&
  !process.env.AWS_LAMBDA_FUNCTION_NAME &&
  !process.env.LAMBDA_TASK_ROOT;

if (isDirectEntry) {
  startServer();
}
