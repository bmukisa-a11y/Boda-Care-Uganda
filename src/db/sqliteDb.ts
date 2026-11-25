import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { validateUgandaPhone } from '../lib/ugandaPhone.ts';
import type {
  AdminAccount,
  AdminPermissions,
  AppNotification,
  AuditLog,
  BatterySwapStation,
  BodaJob,
  BusinessListing,
  CentralAnalytics,
  DiscoveredJobRecord,
  DiscoveredJobStatus,
  DiscoveryDashboardPayload,
  DiscoveryEmployerSummary,
  DiscoveryRunReport,
  DiscoveryScheduleConfig,
  DiscoverySource,
  IntegrationServiceId,
  JobBroadcastCampaign,
  JobBroadcastChannel,
  JobBroadcastDelivery,
  JobNotificationDashboardStats,
  NotificationDeliveryRecord,
  PassengerProfile,
  PushSubscriptionRecord,
  ResetCategoryId,
  RevokedAccountRecord,
  RiderProfile,
  SmsCampaignRecord,
  SmsDeliveryStatus,
  Stage,
  SystemResetOverviewItem,
  SystemResetOverviewPayload,
  WelcomeAccountCategory,
  WelcomeChannel,
  WelcomeNotificationRecord,
  WelcomeSettingsConfig,
} from '../types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

function resolveDataPaths(): { dataDir: string; sqlitePath: string; legacyJsonPath: string } {
  const customDbPath = (process.env.BODACARE_DB_PATH || '').trim();
  if (customDbPath) {
    const resolved = path.resolve(customDbPath);
    const dir = path.dirname(resolved);
    return {
      dataDir: dir,
      sqlitePath: resolved,
      legacyJsonPath: path.join(dir, 'bodacare-db.json'),
    };
  }

  const isServerless = Boolean(
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), 'bodacare-data');
    return {
      dataDir: tmpDir,
      sqlitePath: path.join(tmpDir, 'bodacare.sqlite'),
      legacyJsonPath: path.join(tmpDir, 'bodacare-db.json'),
    };
  }

  const localDir = path.join(ROOT_DIR, '.data');
  return {
    dataDir: localDir,
    sqlitePath: path.join(localDir, 'bodacare.sqlite'),
    legacyJsonPath: path.join(localDir, 'bodacare-db.json'),
  };
}

let { dataDir: DATA_DIR, sqlitePath: SQLITE_PATH, legacyJsonPath: LEGACY_JSON_PATH } = resolveDataPaths();

let dbInstance: DatabaseSync | null = null;

export function normalizePhoneKey(raw: string): string {
  const checked = validateUgandaPhone(raw || '');
  if (checked.isValid && checked.normalized) return checked.normalized;
  return (raw || '').replace(/[\s\-().]/g, '').trim();
}

export function generateRecordCode(prefix: string, seqHint?: number): string {
  const num = seqHint ?? Math.floor(1000 + Math.random() * 9000);
  const tail = Date.now().toString().slice(-3);
  return `BCU-${prefix}-${num}${tail}`;
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Fall back to OS temp directory if application directory is read-only (e.g. serverless)
    const fallbackDir = path.join(os.tmpdir(), 'bodacare-data');
    DATA_DIR = fallbackDir;
    SQLITE_PATH = path.join(fallbackDir, 'bodacare.sqlite');
    LEGACY_JSON_PATH = path.join(fallbackDir, 'bodacare-db.json');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  const db = new DatabaseSync(SQLITE_PATH);
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch {
    db.exec('PRAGMA journal_mode = DELETE;');
  }
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY,
      stage_code TEXT UNIQUE NOT NULL,
      name TEXT UNIQUE NOT NULL,
      district TEXT NOT NULL DEFAULT 'Luweero',
      sub_county TEXT NOT NULL,
      parish TEXT DEFAULT '',
      village TEXT DEFAULT '',
      operating_status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS riders (
      id TEXT PRIMARY KEY,
      rider_id_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      normalized_phone TEXT UNIQUE NOT NULL,
      nin TEXT DEFAULT '',
      motorcycle_reg TEXT UNIQUE NOT NULL,
      motorcycle_type TEXT NOT NULL DEFAULT 'petrol',
      phone_type TEXT NOT NULL DEFAULT 'smartphone',
      stage_id TEXT DEFAULT '',
      district TEXT NOT NULL DEFAULT 'Luweero',
      sub_county TEXT DEFAULT 'Kikyusa',
      village TEXT DEFAULT '',
      verification_status TEXT NOT NULL DEFAULT 'pending',
      account_status TEXT NOT NULL DEFAULT 'active',
      registration_date TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS passengers (
      id TEXT PRIMARY KEY,
      passenger_id_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      normalized_phone TEXT UNIQUE NOT NULL,
      district TEXT NOT NULL DEFAULT 'Luweero',
      sub_county TEXT DEFAULT 'Luweero Town Council',
      village TEXT DEFAULT '',
      phone_type TEXT NOT NULL DEFAULT 'smartphone',
      assisted_registration INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'verified',
      account_status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      job_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      employer_company TEXT NOT NULL,
      employer_phone TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT 'Luweero',
      sub_county TEXT NOT NULL,
      village TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      admin_approved INTEGER NOT NULL DEFAULT 0,
      deadline TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS swap_stations (
      id TEXT PRIMARY KEY,
      station_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      operator_phone TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT 'Luweero',
      sub_county TEXT NOT NULL,
      village TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'operational',
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_centres (
      id TEXT PRIMARY KEY,
      centre_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      normalized_phone TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT 'Luweero',
      sub_county TEXT NOT NULL,
      village TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'garage',
      bike_types_serviced TEXT NOT NULL DEFAULT 'both',
      verified INTEGER NOT NULL DEFAULT 0,
      account_status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_accounts (
      id TEXT PRIMARY KEY,
      admin_code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      actor_id TEXT DEFAULT '',
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      category TEXT DEFAULT 'system',
      target_id TEXT DEFAULT '',
      target_label TEXT DEFAULT '',
      details TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'all',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'system',
      action_url TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS notifications_delivery_log (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_message_id TEXT DEFAULT '',
      status TEXT NOT NULL,
      error_reason TEXT DEFAULT '',
      sent_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sms_campaigns (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ussd_sessions (
      session_id TEXT PRIMARY KEY,
      phone_number TEXT NOT NULL,
      service_code TEXT NOT NULL,
      last_input TEXT DEFAULT '',
      rider_id TEXT DEFAULT '',
      passenger_id TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_broadcasts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      job_title TEXT NOT NULL,
      queue_state TEXT NOT NULL DEFAULT 'queued',
      sent_at TEXT NOT NULL,
      completed_at TEXT DEFAULT '',
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_notification_deliveries (
      id TEXT PRIMARY KEY,
      broadcast_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      job_title TEXT NOT NULL,
      rider_id TEXT NOT NULL,
      rider_name TEXT NOT NULL,
      channel TEXT NOT NULL,
      target_phone TEXT NOT NULL,
      network TEXT NOT NULL DEFAULT 'Invalid',
      message_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      provider TEXT NOT NULL,
      provider_message_id TEXT DEFAULT '',
      error_reason TEXT DEFAULT '',
      cost_ugx REAL NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_job_del_lookup
      ON job_notification_deliveries(job_id, rider_id, channel);
    CREATE INDEX IF NOT EXISTS idx_job_del_broadcast
      ON job_notification_deliveries(broadcast_id, status);
    CREATE INDEX IF NOT EXISTS idx_job_del_provider_id
      ON job_notification_deliveries(provider_message_id);

    CREATE TABLE IF NOT EXISTS discovery_sources (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      source_type TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      url TEXT NOT NULL,
      last_status TEXT NOT NULL DEFAULT 'never_run',
      last_checked_at TEXT DEFAULT '',
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS discovered_jobs (
      id TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      source_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      employer_name TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT 'Uganda',
      location_priority_score INTEGER NOT NULL DEFAULT 0,
      scam_score INTEGER NOT NULL DEFAULT 0,
      is_expired INTEGER NOT NULL DEFAULT 0,
      discovered_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_discovered_hash
      ON discovered_jobs(content_hash);
    CREATE INDEX IF NOT EXISTS idx_discovered_status
      ON discovered_jobs(status, discovered_at);

    CREATE TABLE IF NOT EXISTS discovery_schedule_config (
      id TEXT PRIMARY KEY,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS discovery_runs (
      id TEXT PRIMARY KEY,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT DEFAULT '',
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS integration_settings (
      service_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS welcome_settings (
      id TEXT PRIMARY KEY,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS welcome_notifications (
      id TEXT PRIMARY KEY,
      recipient_id TEXT NOT NULL,
      account_category TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      is_resend INTEGER NOT NULL DEFAULT 0,
      registration_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_welcome_lookup
      ON welcome_notifications(recipient_id, account_category, channel);

    CREATE TABLE IF NOT EXISTS system_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revoked_accounts (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      category TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      normalized_phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      reason TEXT NOT NULL,
      revoked_by TEXT NOT NULL,
      revoked_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_revoked_lookup
      ON revoked_accounts(normalized_phone, email);

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_id TEXT DEFAULT '',
      role TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  dbInstance = db;
  seedInitialAndMigrateLegacy(db);
  return db;
}

const DEFAULT_SUPER_ADMIN_PERMS: AdminPermissions = {
  manageRiders: true,
  managePassengers: true,
  manageJobs: true,
  manageStations: true,
  manageCentres: true,
  manageStages: true,
  sendNotifications: true,
  viewAnalytics: true,
  manageAdmins: true,
  deleteRecords: true,
};

function seedInitialAndMigrateLegacy(db: DatabaseSync): void {
  const nowIso = new Date().toISOString();

  // 1. ALWAYS ensure Founder Super Admin exists in RBAC table (never deleted even on membership reset)
  db.prepare(`
    INSERT OR IGNORE INTO admin_accounts
    (id, admin_code, full_name, email, phone, role, permissions_json, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'admin-founder-mukisa',
    'BCU-ADM-0001',
    'Brian Mukisa',
    'bmukisa@bodawerk.co.ug',
    '+256 772 100 240',
    'super_admin',
    JSON.stringify(DEFAULT_SUPER_ADMIN_PERMS),
    'active',
    '2025-01-01T00:00:00Z',
    nowIso
  );

  // Check if initial baseline seeding already occurred (prevents re-seeding after Super Admin Reset!)
  const seedMeta = db
    .prepare("SELECT value FROM system_meta WHERE key = 'initial_seed_completed'")
    .get() as { value: string } | undefined;
  const alreadySeeded = seedMeta?.value === '1';

  if (!alreadySeeded) {
    // 2. Migrate any existing legacy .data/bodacare-db.json records
    let legacyStages: Stage[] = [];
    let legacyRiders: RiderProfile[] = [];
    let legacyJobs: BodaJob[] = [];
    let legacyCampaigns: SmsCampaignRecord[] = [];
    let legacyNotifs: AppNotification[] = [];
    let legacyLogs: AuditLog[] = [];

    if (fs.existsSync(LEGACY_JSON_PATH)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, 'utf-8')) as {
          stages?: Stage[];
          riders?: RiderProfile[];
          jobs?: BodaJob[];
          smsCampaigns?: SmsCampaignRecord[];
          notifications?: AppNotification[];
          auditLogs?: AuditLog[];
        };
        legacyStages = parsed.stages || [];
        legacyRiders = parsed.riders || [];
        legacyJobs = parsed.jobs || [];
        legacyCampaigns = parsed.smsCampaigns || [];
        legacyNotifs = parsed.notifications || [];
        legacyLogs = parsed.auditLogs || [];
      } catch {
        // ignore malformed legacy file
      }
    }

    // 3. Seed existing baseline platform records ONLY on first run
    const existingStagesCount = (db.prepare('SELECT COUNT(*) as cnt FROM stages').get() as { cnt: number }).cnt;
    if (existingStagesCount === 0) {
    const initialStages: Stage[] = legacyStages.length > 0 ? legacyStages : [
      {
        id: 'stage-kikyusa-main',
        stageCode: 'BCU-STG-0001',
        name: 'Kikyusa Main Stage',
        district: 'Luweero',
        subCounty: 'Kikyusa',
        parish: 'Kikyusa Parish',
        village: 'Kikyusa Central',
        leaderName: 'Chairman Mugisha David',
        leaderPhone: '+256 772 458 912',
        memberCount: 38,
        dailyWelfareFeeUgx: 1000,
        landmark: 'Opposite Kikyusa Health Centre IV Roundabout',
        lat: 0.8145,
        lng: 32.6121,
        servicesAvailable: ['Passenger Rides', 'Produce Haulage', 'SOS Rapid Response'],
        operatingStatus: 'active',
        createdAt: '2025-06-01T08:00:00Z',
        updatedAt: nowIso,
      },
      {
        id: 'stage-luweero-taxi-park',
        stageCode: 'BCU-STG-0002',
        name: 'Luweero Taxi Park Boda Stage',
        district: 'Luweero',
        subCounty: 'Luweero Town Council',
        parish: 'Luweero Central',
        village: 'Luweero Central',
        leaderName: 'Chairman Wasswa Joseph',
        leaderPhone: '+256 701 884 213',
        memberCount: 64,
        dailyWelfareFeeUgx: 1500,
        landmark: 'Behind Stanbic Bank, Kampala-Gulu Highway',
        lat: 0.8492,
        lng: 32.4934,
        servicesAvailable: ['Passenger Rides', 'Parcel Dispatch', 'E-Boda Charging'],
        operatingStatus: 'active',
        createdAt: '2025-06-01T08:00:00Z',
        updatedAt: nowIso,
      },
      {
        id: 'stage-kasana-market',
        stageCode: 'BCU-STG-0003',
        name: 'Kasana Central Market Stage',
        district: 'Luweero',
        subCounty: 'Kasana',
        parish: 'Kasana Parish',
        village: 'Kasana West',
        leaderName: 'Chairman Kasujja Peter',
        leaderPhone: '+256 782 119 405',
        memberCount: 42,
        dailyWelfareFeeUgx: 1000,
        landmark: 'Kasana Market Fresh Produce Entrance',
        lat: 0.8621,
        lng: 32.4819,
        servicesAvailable: ['Market Freight', 'Passenger Rides'],
        operatingStatus: 'active',
        createdAt: '2025-06-01T08:00:00Z',
        updatedAt: nowIso,
      },
      {
        id: 'stage-wobulenzi-junction',
        stageCode: 'BCU-STG-0004',
        name: 'Wobulenzi Junction Stage',
        district: 'Luweero',
        subCounty: 'Wobulenzi',
        parish: 'Wobulenzi Town',
        village: 'Wobulenzi East',
        leaderName: 'Chairman Lule Robert',
        leaderPhone: '+256 754 390 128',
        memberCount: 51,
        dailyWelfareFeeUgx: 1000,
        landmark: 'Zirobwe Road Turnoff, Wobulenzi',
        lat: 0.7214,
        lng: 32.5312,
        servicesAvailable: ['Highway Courier', 'Passenger Rides'],
        operatingStatus: 'active',
        createdAt: '2025-06-01T08:00:00Z',
        updatedAt: nowIso,
      },
    ];
    for (const s of initialStages) {
      upsertStageRecord(s, true);
    }
  }

  const existingRidersCount = (db.prepare('SELECT COUNT(*) as cnt FROM riders').get() as { cnt: number }).cnt;
  if (existingRidersCount === 0) {
    const initialRiders: RiderProfile[] = legacyRiders.length > 0 ? legacyRiders : [
      {
        id: 'rider-kato-moses',
        userId: 'user-kato-01',
        riderIdNumber: 'BCU-LWR-0421',
        fullName: 'Kato Moses',
        phone: '+256 774 912 304',
        whatsappNumber: '+256 774 912 304',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        nin: 'CM910481023K4L',
        permitNumber: 'UG-DL-A-883921',
        residentialArea: 'Kikyusa Trading Centre, Luweero',
        district: 'Luweero',
        subCounty: 'Kikyusa',
        parish: 'Kikyusa Parish',
        village: 'Kikyusa Central',
        stageId: 'stage-kikyusa-main',
        stageName: 'Kikyusa Main Stage',
        motorcycleReg: 'UFG 421K',
        motorcycleMakeModel: 'Bodawerk E-Boda (Electric Yellow)',
        motorcycleType: 'electric',
        batteryModel: 'Bodawerk 48V 50Ah LiFePO4',
        ownershipStatus: 'owner',
        emergencyContactName: 'Nalubega Sarah (Wife)',
        emergencyContactPhone: '+256 779 120 445',
        verificationStatus: 'verified',
        accountStatus: 'active',
        subscriptionTier: 'premium',
        subscriptionStatus: 'active',
        subscriptionExpiry: '2026-11-28',
        rating: 4.9,
        completedTrips: 1420,
        isOnline: true,
        helmetAvailable: true,
        registrationDate: '2025-08-14',
        updatedAt: nowIso,
        walletBalanceUgx: 65000,
        phoneType: 'smartphone',
      },
      {
        id: 'rider-ssempijja-ronald',
        userId: 'user-ronald-02',
        riderIdNumber: 'BCU-LWR-0819',
        fullName: 'Ssempijja Ronald',
        phone: '+256 702 331 990',
        whatsappNumber: '+256 702 331 990',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        nin: 'CM880192847J8P',
        permitNumber: 'UG-DL-A-449102',
        residentialArea: 'Kasana Luweero',
        district: 'Luweero',
        subCounty: 'Luweero Town Council',
        village: 'Kasana West',
        stageId: 'stage-luweero-taxi-park',
        stageName: 'Luweero Taxi Park Boda Stage',
        motorcycleReg: 'UFA 819D',
        motorcycleMakeModel: 'TVS HLX 125 (Black)',
        motorcycleType: 'petrol',
        ownershipStatus: 'rental',
        emergencyContactName: 'Mukasa Ssempijja (Brother)',
        emergencyContactPhone: '+256 752 901 324',
        verificationStatus: 'verified',
        accountStatus: 'active',
        subscriptionTier: 'standard',
        subscriptionStatus: 'active',
        subscriptionExpiry: '2026-11-15',
        rating: 4.8,
        completedTrips: 876,
        isOnline: true,
        helmetAvailable: true,
        registrationDate: '2025-11-02',
        updatedAt: nowIso,
        walletBalanceUgx: 32000,
        phoneType: 'smartphone',
      },
      {
        id: 'rider-mugwanya-isaac',
        userId: 'user-isaac-03',
        riderIdNumber: 'BCU-LWR-0902',
        fullName: 'Mugwanya Isaac',
        phone: '+256 788 412 900',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        nin: 'CM950284719M1A',
        permitNumber: 'UG-DL-A-102948',
        residentialArea: 'Wobulenzi Town',
        district: 'Luweero',
        subCounty: 'Wobulenzi',
        village: 'Wobulenzi East',
        stageId: 'stage-kasana-market',
        stageName: 'Kasana Central Market Stage',
        motorcycleReg: 'UEX 902C',
        motorcycleMakeModel: 'Zembo Storm E-Boda (Blue)',
        motorcycleType: 'electric',
        batteryModel: 'Zembo 72V 35Ah QuickSwap',
        ownershipStatus: 'loan',
        emergencyContactName: 'Nampeera Joyce (Sister)',
        emergencyContactPhone: '+256 701 445 221',
        verificationStatus: 'pending',
        accountStatus: 'active',
        subscriptionTier: 'standard',
        subscriptionStatus: 'pending_verification',
        subscriptionExpiry: '2026-11-01',
        rating: 4.6,
        completedTrips: 114,
        isOnline: false,
        helmetAvailable: true,
        registrationDate: '2026-10-24',
        updatedAt: nowIso,
        walletBalanceUgx: 18000,
        phoneType: 'feature_phone',
      },
      {
        id: 'rider-kigozi-gerald',
        userId: 'user-gerald-04',
        riderIdNumber: 'BCU-LWR-0104',
        fullName: 'Kigozi Gerald',
        phone: '+256 756 123 889',
        avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        nin: 'CM840391823T6V',
        permitNumber: 'UG-DL-A-774910',
        residentialArea: 'Kikyusa Town',
        district: 'Luweero',
        subCounty: 'Kikyusa',
        village: 'Kalagala',
        stageId: 'stage-kikyusa-main',
        stageName: 'Kikyusa Main Stage',
        motorcycleReg: 'UFR 104M',
        motorcycleMakeModel: 'Bajaj Boxer BM150 (Red)',
        motorcycleType: 'petrol',
        ownershipStatus: 'owner',
        emergencyContactName: 'Kigozi Agnes (Mother)',
        emergencyContactPhone: '+256 782 994 001',
        verificationStatus: 'under_review',
        accountStatus: 'active',
        subscriptionTier: 'basic',
        subscriptionStatus: 'rejected',
        subscriptionExpiry: '2026-11-05',
        rating: 4.4,
        completedTrips: 450,
        isOnline: false,
        helmetAvailable: false,
        registrationDate: '2026-09-12',
        updatedAt: nowIso,
        walletBalanceUgx: 5000,
        phoneType: 'feature_phone',
      },
      {
        id: 'rider-wamala-joseph',
        userId: 'user-wamala-05',
        riderIdNumber: 'BCU-LWR-0612',
        fullName: 'Wamala Joseph',
        phone: '+256 779 441 205',
        avatarUrl: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=150&auto=format&fit=crop&q=80',
        nin: 'CM890112349K2M',
        permitNumber: 'UG-DL-A-552019',
        residentialArea: 'Kikyusa - Kalagala Village',
        district: 'Luweero',
        subCounty: 'Kikyusa',
        village: 'Kalagala',
        stageId: 'stage-kikyusa-main',
        stageName: 'Kikyusa Main Stage',
        motorcycleReg: 'UFH 612B',
        motorcycleMakeModel: 'Bajaj Boxer BM150 (Blue)',
        motorcycleType: 'petrol',
        ownershipStatus: 'owner',
        emergencyContactName: 'Wamala Grace',
        emergencyContactPhone: '+256 772 883 114',
        verificationStatus: 'verified',
        accountStatus: 'active',
        subscriptionTier: 'standard',
        subscriptionStatus: 'active',
        subscriptionExpiry: '2026-12-01',
        rating: 4.7,
        completedTrips: 632,
        isOnline: true,
        helmetAvailable: true,
        registrationDate: '2025-12-10',
        updatedAt: nowIso,
        walletBalanceUgx: 24000,
        phoneType: 'feature_phone',
      },
      {
        id: 'rider-lubega-samuel',
        userId: 'user-lubega-06',
        riderIdNumber: 'BCU-LWR-0734',
        fullName: 'Lubega Samuel',
        phone: '+256 705 619 382',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
        nin: 'CM920554109L7R',
        permitNumber: 'UG-DL-A-618204',
        residentialArea: 'Luweero Central',
        district: 'Luweero',
        subCounty: 'Luweero Town Council',
        village: 'Luweero Central',
        stageId: 'stage-luweero-taxi-park',
        stageName: 'Luweero Taxi Park Boda Stage',
        motorcycleReg: 'UFP 734T',
        motorcycleMakeModel: 'TVS HLX 125 (Red)',
        motorcycleType: 'petrol',
        ownershipStatus: 'owner',
        emergencyContactName: 'Namazzi Jane',
        emergencyContactPhone: '+256 701 992 104',
        verificationStatus: 'verified',
        accountStatus: 'active',
        subscriptionTier: 'standard',
        subscriptionStatus: 'active',
        subscriptionExpiry: '2026-12-05',
        rating: 4.8,
        completedTrips: 510,
        isOnline: true,
        helmetAvailable: true,
        registrationDate: '2026-01-18',
        updatedAt: nowIso,
        walletBalanceUgx: 19500,
        phoneType: 'feature_phone',
      },
    ];
    for (const r of initialRiders) {
      upsertRiderRecord(r, true);
    }
  }

  const existingPassCount = (db.prepare('SELECT COUNT(*) as cnt FROM passengers').get() as { cnt: number }).cnt;
  if (existingPassCount === 0) {
    const initialPassengers: PassengerProfile[] = [
      {
        id: 'pass-prossy-01',
        userId: 'user-pass-prossy',
        passengerIdNumber: 'BCU-PAS-0001',
        fullName: 'Babirye Prossy',
        phone: '+256 772 901 882',
        whatsappNumber: '+256 772 901 882',
        residentialArea: 'Luweero Central, Near District Headquarters',
        district: 'Luweero',
        subCounty: 'Luweero Town Council',
        village: 'Luweero Central',
        trustedContactName: 'Kivumbi Patrick (Husband)',
        trustedContactPhone: '+256 701 442 309',
        phoneType: 'smartphone',
        assistedRegistration: false,
        accountStatus: 'active',
        verificationStatus: 'verified',
        rating: 5.0,
        totalRides: 48,
        createdAt: '2025-09-10T08:00:00Z',
        updatedAt: nowIso,
      },
      {
        id: 'pass-ivan-02',
        userId: 'user-pass-ivan',
        passengerIdNumber: 'BCU-PAS-0002',
        fullName: 'Nsubuga Ivan',
        phone: '+256 704 112 400',
        whatsappNumber: '+256 704 112 400',
        residentialArea: 'Kikyusa Trading Centre',
        district: 'Luweero',
        subCounty: 'Kikyusa',
        village: 'Kikyusa Central',
        trustedContactName: 'Nantongo Betty (Mother)',
        trustedContactPhone: '+256 788 332 100',
        phoneType: 'smartphone',
        assistedRegistration: false,
        accountStatus: 'active',
        verificationStatus: 'verified',
        rating: 4.9,
        totalRides: 19,
        createdAt: '2025-10-05T08:00:00Z',
        updatedAt: nowIso,
      },
    ];
    for (const p of initialPassengers) {
      upsertPassengerRecord(p, true);
    }
  }

  const existingStationsCount = (db.prepare('SELECT COUNT(*) as cnt FROM swap_stations').get() as { cnt: number }).cnt;
  if (existingStationsCount === 0) {
    const initialStations: BatterySwapStation[] = [
      {
        id: 'station-kikyusa-main',
        stationCode: 'BCU-SWP-0001',
        name: 'Kikyusa Bodawerk E-Hub (Main)',
        operatorName: 'Opio Samuel',
        operatorPhone: '+256 701 334 112',
        locationName: 'Opposite Health Centre IV Roundabout, Kikyusa',
        district: 'Luweero',
        subCounty: 'Kikyusa',
        village: 'Kikyusa Central',
        lat: 0.8145,
        lng: 32.6121,
        totalBatteries: 20,
        availableBatteries: 14,
        chargingBatteries: 6,
        batteryBrand: 'Bodawerk',
        supportedBatteryTypes: ['Bodawerk 48V 50Ah LiFePO4', 'Universal 48V'],
        connectorType: 'Chogori 2+1+5 Pin High-Amp',
        swapFeeUgx: 3500,
        servicesOffered: 'both',
        operatingHours: '24 Hours / 7 Days',
        powerSource: 'solar_hybrid',
        verified: true,
        status: 'operational',
        rating: 4.9,
        lastStockUpdate: nowIso,
        amenities: ['24/7 Solar Backup', 'Free WiFi', 'Digital Tyre Inflator', 'Rider Lounge'],
        createdAt: '2025-09-01T08:00:00Z',
        updatedAt: nowIso,
      },
      {
        id: 'station-luweero-zembo',
        stationCode: 'BCU-SWP-0002',
        name: 'Luweero Town Zembo Solar Station',
        operatorName: 'Kintu Andrew',
        operatorPhone: '+256 772 884 102',
        locationName: 'Behind TotalEnergies, Kampala-Gulu Highway',
        district: 'Luweero',
        subCounty: 'Luweero Town Council',
        village: 'Luweero Central',
        lat: 0.8492,
        lng: 32.4934,
        totalBatteries: 24,
        availableBatteries: 18,
        chargingBatteries: 6,
        batteryBrand: 'Zembo',
        supportedBatteryTypes: ['Zembo 72V 35Ah QuickSwap'],
        connectorType: 'Anderson SB50 Quick-Lock',
        swapFeeUgx: 4000,
        servicesOffered: 'both',
        operatingHours: '06:00 AM - 11:00 PM',
        powerSource: 'solar_hybrid',
        verified: true,
        status: 'operational',
        rating: 4.8,
        lastStockUpdate: nowIso,
        amenities: ['Solar Hybrid Grid', 'Motorcycle Wash Bay'],
        createdAt: '2025-09-10T08:00:00Z',
        updatedAt: nowIso,
      },
      {
        id: 'station-wobulenzi-spiro',
        stationCode: 'BCU-SWP-0003',
        name: 'Wobulenzi Spiro Highway Swap Point',
        operatorName: 'Nabukeera Betty',
        operatorPhone: '+256 754 110 392',
        locationName: 'Wobulenzi Junction Stage, Near Stanbic ATM',
        district: 'Luweero',
        subCounty: 'Wobulenzi',
        village: 'Wobulenzi East',
        lat: 0.7214,
        lng: 32.5312,
        totalBatteries: 16,
        availableBatteries: 9,
        chargingBatteries: 7,
        batteryBrand: 'Spiro',
        supportedBatteryTypes: ['Spiro Commando 72V', 'Spiro Ekon'],
        connectorType: 'Rosenberger RoPD Heavy Duty',
        swapFeeUgx: 3800,
        servicesOffered: 'swapping',
        operatingHours: '06:00 AM - 10:00 PM',
        powerSource: 'grid',
        verified: true,
        status: 'operational',
        rating: 4.7,
        lastStockUpdate: nowIso,
        amenities: ['Highway Rest Stop', 'Automated Battery Bay'],
        createdAt: '2025-09-20T08:00:00Z',
        updatedAt: nowIso,
      },
    ];
    for (const st of initialStations) {
      upsertStationRecord(st, true);
    }
  }

  const existingCentresCount = (db.prepare('SELECT COUNT(*) as cnt FROM maintenance_centres').get() as { cnt: number }).cnt;
  if (existingCentresCount === 0) {
    const initialCentres: BusinessListing[] = [
      {
        id: 'biz-ssekandi-garage',
        centreCode: 'BCU-MNT-0001',
        name: 'Ssekandi Motorcycle Garage & Vulcanising',
        ownerName: 'Makanika Ssekandi Fred',
        phone: '+256 775 889 120',
        location: 'Luweero-Kikyusa Road, near Kikyusa Trading Centre',
        district: 'Luweero',
        subCounty: 'Kikyusa',
        village: 'Kikyusa Central',
        lat: 0.8152,
        lng: 32.6134,
        category: 'garage',
        rating: 4.9,
        reviewCount: 68,
        operatingHours: '07:00 AM - 08:30 PM (Mon - Sat)',
        services: [
          { name: 'Full Engine Overhaul (Bajaj / TVS)', priceUgx: 45000, description: 'Piston, ring, valves, and oil seal refit' },
          { name: 'Tyre Puncture Vulcanising', priceUgx: 4000, description: 'Heavy duty hot patch' },
        ],
        servicesSummary: 'Engine Overhaul, E-Boda Controller Check, Tyre Vulcanising, Chain & Sprocket',
        brandsServiced: ['Bajaj Boxer', 'TVS HLX', 'Bodawerk E-Boda', 'Zembo'],
        bikeTypesServiced: 'both',
        verified: true,
        isPromoted: true,
        emergencyCallout: true,
        accountStatus: 'active',
        createdAt: '2025-07-15T08:00:00Z',
        updatedAt: nowIso,
      },
      {
        id: 'biz-luweero-spares',
        centreCode: 'BCU-MNT-0002',
        name: 'Luweero Genuine Bajaj & TVS Spares',
        ownerName: 'Hajji Kateregga Sulaiman',
        phone: '+256 702 441 800',
        location: 'Opposite Stanbic Bank, Kampala-Gulu Highway, Luweero Town',
        district: 'Luweero',
        subCounty: 'Luweero Town Council',
        village: 'Luweero Central',
        lat: 0.8498,
        lng: 32.4941,
        category: 'spares',
        rating: 4.8,
        reviewCount: 92,
        operatingHours: '07:30 AM - 07:00 PM',
        services: [
          { name: 'Original Total 4T Engine Oil', priceUgx: 18000, description: '1L sealed bottle' },
        ],
        servicesSummary: 'Genuine Spare Parts, Oil Change, Brake & Clutch Fitment',
        brandsServiced: ['Bajaj Boxer', 'TVS HLX', 'Haojue'],
        bikeTypesServiced: 'petrol',
        verified: true,
        isPromoted: true,
        emergencyCallout: false,
        accountStatus: 'active',
        createdAt: '2025-07-20T08:00:00Z',
        updatedAt: nowIso,
      },
      {
        id: 'biz-kikyusa-rescue',
        centreCode: 'BCU-MNT-0003',
        name: 'Kikyusa 24/7 Breakdown Towing & Rescue',
        ownerName: 'Kibirige Dan',
        phone: '+256 777 400 911',
        location: 'Kikyusa Centre, Luweero',
        district: 'Luweero',
        subCounty: 'Kikyusa',
        village: 'Kikyusa Central',
        lat: 0.8141,
        lng: 32.6119,
        category: 'towing',
        rating: 5.0,
        reviewCount: 31,
        operatingHours: '24 Hours Emergency Dispatch',
        services: [{ name: 'Roadside Motorcycle Transport', priceUgx: 25000, description: 'Within 25km radius' }],
        servicesSummary: '24/7 Roadside Rescue, Breakdown Towing, Emergency Fuel & Battery Jump',
        brandsServiced: ['Bajaj Boxer', 'TVS HLX', 'Bodawerk E-Boda', 'Spiro'],
        bikeTypesServiced: 'both',
        verified: true,
        isPromoted: false,
        emergencyCallout: true,
        accountStatus: 'active',
        createdAt: '2025-08-01T08:00:00Z',
        updatedAt: nowIso,
      },
    ];
    for (const c of initialCentres) {
      upsertMaintenanceCentreRecord(c, true);
    }
  }

  const existingJobsCount = (db.prepare('SELECT COUNT(*) as cnt FROM jobs').get() as { cnt: number }).cnt;
  if (existingJobsCount === 0 && legacyJobs.length > 0) {
    for (const j of legacyJobs) {
      upsertJobRecord(j, true);
    }
  } else if (existingJobsCount === 0) {
    const initialJobs: BodaJob[] = [
      {
        id: 'job-coffee-01',
        jobCode: 'BCU-JOB-0001',
        employerId: 'user-employer-coop',
        employerName: 'Nsubuga Henry',
        employerPhone: '+256 782 550 918',
        employerCompany: 'Kikyusa Coffee Growers Cooperative',
        title: 'Daily Parchment Coffee Transport to Kasana Processing Mill',
        type: 'produce_transport',
        description: 'Transport 4 to 6 bags of dried parchment coffee from Kikyusa collection centre to Kasana Mill.',
        pickupLocation: 'Kikyusa Cooperative Bulking Store, Block 4',
        deliveryLocation: 'Kasana Quality Coffee Mill, Factory Gate',
        district: 'Luweero',
        subCounty: 'Kikyusa',
        village: 'Kikyusa Central',
        distanceKm: 15.2,
        cargoWeightKg: 85,
        paymentAmountUgx: 35000,
        paymentFrequency: 'per_trip',
        requiredMotorcycleType: 'any',
        status: 'open',
        postedDate: nowIso.split('T')[0],
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        applicationsCount: 4,
        adminApproved: true,
        requirements: 'Valid Class A driving permit, sturdy rear luggage carrier.',
        applicationInstructions: 'Apply in BodaCare app or call +256 782 550 918 with your Rider ID.',
        verifiedBy: 'Brian Mukisa',
        verifiedAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'job-pharma-02',
        jobCode: 'BCU-JOB-0002',
        employerId: 'emp-medipharm',
        employerName: 'Dr. Sarah Nalwanga',
        employerPhone: '+256 774 201 983',
        employerCompany: 'Medipharm Luweero District Depot',
        title: 'Urgent Cold-Chain Vaccine & Antibiotic Clinic Dispatch',
        type: 'scheduled_courier',
        description: 'Delivering temperature-sensitive vaccine flasks to rural clinics in Kikyusa Health Centre IV.',
        pickupLocation: 'Stanbic Bank Plaza, Luweero Town',
        deliveryLocation: 'Kikyusa Health Centre IV Pharmacy',
        district: 'Luweero',
        subCounty: 'Luweero Town Council',
        village: 'Luweero Central',
        distanceKm: 22.4,
        cargoWeightKg: 12,
        paymentAmountUgx: 45000,
        paymentFrequency: 'per_trip',
        requiredMotorcycleType: 'electric',
        status: 'open',
        postedDate: nowIso.split('T')[0],
        deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        applicationsCount: 2,
        adminApproved: true,
        verifiedBy: 'Brian Mukisa',
        verifiedAt: nowIso,
        updatedAt: nowIso,
      },
    ];
    for (const j of initialJobs) {
      upsertJobRecord(j, true);
    }
  }

    for (const camp of legacyCampaigns) {
      saveSmsCampaignRecord(camp);
    }
    for (const n of legacyNotifs) {
      insertNotification(n);
    }
    for (const log of legacyLogs) {
      insertAuditLog({
        id: log.id,
        timestamp: log.timestamp,
        actorId: '',
        actorName: log.actorName,
        actorRole: log.actorRole,
        action: log.action,
        category: 'system',
        targetId: '',
        targetLabel: log.target,
        details: log.details,
      });
    }

    db.prepare(`
      INSERT INTO system_meta (key, value, updated_at)
      VALUES ('initial_seed_completed', '1', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(nowIso);
  }

  // 4. Seed Default Legitimate Job Discovery Sources (public APIs, feeds, & partner webhook templates)
  const existingSourcesCnt = (db.prepare('SELECT COUNT(*) as cnt FROM discovery_sources').get() as { cnt: number }).cnt;
  if (existingSourcesCnt === 0) {
    const seedSources: DiscoverySource[] = [
      {
        id: 'src-reliefweb-uganda-api',
        name: 'ReliefWeb Uganda Humanitarian & NGO Jobs API',
        category: 'ngo_government',
        sourceType: 'json_api',
        url: 'https://api.reliefweb.int/v1/jobs?appname=bodacare-uganda&filter[field]=country.name&filter[value]=Uganda&limit=20&preset=latest',
        active: true,
        respectRobotsTxt: true,
        priorityWeight: 85,
        lastStatus: 'never_run',
        jobsFoundLastRun: 0,
        totalJobsDiscovered: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'src-search-kikyusa-luweero',
        name: 'Public Search Index — Kikyusa & Luweero Jobs',
        category: 'search_engine_index',
        sourceType: 'search_api',
        url: 'https://www.googleapis.com/customsearch/v1',
        queryTemplate: '("Kikyusa" OR "Luweero" OR "Wobulenzi" OR "Kasana") (boda OR rider OR courier OR driver OR delivery OR field) jobs Uganda',
        active: true,
        respectRobotsTxt: true,
        priorityWeight: 100,
        lastStatus: 'never_run',
        jobsFoundLastRun: 0,
        totalJobsDiscovered: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'src-uganda-public-rss',
        name: 'Uganda Recruitment & Career Portal RSS Feed',
        category: 'uganda_job_portal',
        sourceType: 'rss_feed',
        url: 'https://www.fuzu.com/uganda/rss',
        active: false,
        respectRobotsTxt: true,
        priorityWeight: 75,
        lastStatus: 'never_run',
        jobsFoundLastRun: 0,
        totalJobsDiscovered: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: 'src-luweero-partner-webhook',
        name: 'Luweero & Kikyusa Partner Newspaper / Employer Feed Webhook',
        category: 'newspaper_notice',
        sourceType: 'webhook_ingest',
        url: '/api/discovery/ingest',
        active: true,
        respectRobotsTxt: true,
        priorityWeight: 95,
        lastStatus: 'ok',
        jobsFoundLastRun: 0,
        totalJobsDiscovered: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];
    for (const src of seedSources) {
      upsertDiscoverySource(src);
    }
  }

  const existingSchedCnt = (db.prepare('SELECT COUNT(*) as cnt FROM discovery_schedule_config').get() as { cnt: number }).cnt;
  if (existingSchedCnt === 0) {
    const defaultSchedule: DiscoveryScheduleConfig = {
      id: 'default',
      automationEnabled: true,
      scanTimes: ['06:00', '14:00'],
      timezone: 'Africa/Kampala',
      maxRetriesPerSource: 2,
      targetLocations: [
        'Kikyusa',
        'Luweero',
        'Wobulenzi',
        'Kasana',
        'Bamunanika',
        'Zirobwe',
        'Nakaseke',
        'Nakasongola',
        'Wakiso',
        'Kampala',
        'Uganda',
      ],
      searchKeywords: [
        'boda rider',
        'delivery rider',
        'motorcycle courier',
        'driver',
        'field officer',
        'coffee transport',
        'milk collection',
        'warehouse loader',
        'sales agent',
      ],
      enabledCategories: [
        'produce_transport',
        'parcel_delivery',
        'scheduled_courier',
        'corporate_boda',
        'passenger_contract',
      ],
      notifyAdminInApp: true,
      notifyAdminSms: false,
      notifyAdminWhatsapp: false,
      adminNotifyPhone: '+256772100240',
      adminNotifyWhatsapp: '+256772100240',
      notifyOnlyWhenNewFound: true,
      updatedAt: nowIso,
    };
    saveDiscoveryScheduleConfig(defaultSchedule);
  }
}

// =========================================================================
// RECORD CRUD & DUPLICATE CHECKS
// =========================================================================

export function listRiders(): RiderProfile[] {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM riders ORDER BY registration_date DESC, updated_at DESC').all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as RiderProfile);
}

export function getRiderById(id: string): RiderProfile | null {
  const db = getDb();
  const row = db.prepare('SELECT data_json FROM riders WHERE id = ?').get(id) as { data_json: string } | undefined;
  return row ? (JSON.parse(row.data_json) as RiderProfile) : null;
}

export function findDuplicateRider(phone: string, motorcycleReg: string, nin?: string, excludeId?: string): string | null {
  const db = getDb();
  const normPhone = normalizePhoneKey(phone);
  const cleanPlate = (motorcycleReg || '').trim().toUpperCase();
  const cleanNin = (nin || '').trim().toUpperCase();

  if (normPhone) {
    const byPhone = db.prepare('SELECT id, full_name FROM riders WHERE normalized_phone = ?').get(normPhone) as
      | { id: string; full_name: string }
      | undefined;
    if (byPhone && byPhone.id !== excludeId) {
      return `Duplicate phone number detected: already registered to rider "${byPhone.full_name}".`;
    }
  }

  if (cleanPlate) {
    const byPlate = db.prepare('SELECT id, full_name FROM riders WHERE UPPER(motorcycle_reg) = ?').get(cleanPlate) as
      | { id: string; full_name: string }
      | undefined;
    if (byPlate && byPlate.id !== excludeId) {
      return `Duplicate motorcycle registration plate (${cleanPlate}): already assigned to "${byPlate.full_name}".`;
    }
  }

  if (cleanNin && !cleanNin.startsWith('PENDING-')) {
    const byNin = db.prepare("SELECT id, full_name FROM riders WHERE UPPER(nin) = ? AND nin != ''").get(cleanNin) as
      | { id: string; full_name: string }
      | undefined;
    if (byNin && byNin.id !== excludeId) {
      return `Duplicate NIN (${cleanNin}): already registered to rider "${byNin.full_name}".`;
    }
  }

  return null;
}

export function upsertRiderRecord(rider: RiderProfile, skipDuplicateCheck = false): RiderProfile {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const normPhone = normalizePhoneKey(rider.phone);
  const cleanPlate = (rider.motorcycleReg || '').trim().toUpperCase() || `UNREG-${Date.now().toString().slice(-5)}`;
  const riderCode = rider.riderIdNumber?.trim() || generateRecordCode('RDR');

  if (!skipDuplicateCheck) {
    const dup = findDuplicateRider(rider.phone, cleanPlate, rider.nin, rider.id);
    if (dup) throw new Error(dup);
  }

  const enriched: RiderProfile = {
    ...rider,
    id: rider.id || `rider-${Date.now()}`,
    userId: rider.userId || `user-${Date.now()}`,
    riderIdNumber: riderCode,
    motorcycleReg: cleanPlate,
    district: rider.district || 'Luweero',
    subCounty: rider.subCounty || 'Kikyusa',
    accountStatus: rider.accountStatus || (rider.verificationStatus === 'suspended' ? 'suspended' : 'active'),
    registrationDate: rider.registrationDate || nowIso.split('T')[0],
    updatedAt: nowIso,
  };

  db.prepare(`
    INSERT INTO riders (
      id, rider_id_number, full_name, phone, normalized_phone, nin,
      motorcycle_reg, motorcycle_type, phone_type, stage_id, district,
      sub_county, village, verification_status, account_status, registration_date,
      updated_at, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      rider_id_number = excluded.rider_id_number,
      full_name = excluded.full_name,
      phone = excluded.phone,
      normalized_phone = excluded.normalized_phone,
      nin = excluded.nin,
      motorcycle_reg = excluded.motorcycle_reg,
      motorcycle_type = excluded.motorcycle_type,
      phone_type = excluded.phone_type,
      stage_id = excluded.stage_id,
      district = excluded.district,
      sub_county = excluded.sub_county,
      village = excluded.village,
      verification_status = excluded.verification_status,
      account_status = excluded.account_status,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    enriched.id,
    enriched.riderIdNumber,
    enriched.fullName,
    enriched.phone,
    normPhone || enriched.id,
    enriched.nin || '',
    enriched.motorcycleReg,
    enriched.motorcycleType || 'petrol',
    enriched.phoneType || 'smartphone',
    enriched.stageId || '',
    enriched.district || 'Luweero',
    enriched.subCounty || 'Kikyusa',
    enriched.village || '',
    enriched.verificationStatus || 'pending',
    enriched.accountStatus || 'active',
    enriched.registrationDate,
    nowIso,
    JSON.stringify(enriched)
  );

  return enriched;
}

export function deleteRiderRecord(id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM riders WHERE id = ?').run(id);
  return res.changes > 0;
}

// PASSENGERS
export function listPassengers(): PassengerProfile[] {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM passengers ORDER BY created_at DESC').all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as PassengerProfile);
}

export function upsertPassengerRecord(passenger: PassengerProfile, skipDuplicateCheck = false): PassengerProfile {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const normPhone = normalizePhoneKey(passenger.phone);
  const code = passenger.passengerIdNumber?.trim() || generateRecordCode('PAS');

  if (!skipDuplicateCheck && normPhone) {
    const existing = db.prepare('SELECT id, full_name FROM passengers WHERE normalized_phone = ?').get(normPhone) as
      | { id: string; full_name: string }
      | undefined;
    if (existing && existing.id !== passenger.id) {
      throw new Error(`Duplicate passenger phone number: already registered to "${existing.full_name}".`);
    }
  }

  const enriched: PassengerProfile = {
    ...passenger,
    id: passenger.id || `pass-${Date.now()}`,
    userId: passenger.userId || `user-pass-${Date.now()}`,
    passengerIdNumber: code,
    district: passenger.district || 'Luweero',
    subCounty: passenger.subCounty || 'Luweero Town Council',
    phoneType: passenger.phoneType || 'smartphone',
    assistedRegistration: Boolean(passenger.assistedRegistration),
    accountStatus: passenger.accountStatus || 'active',
    verificationStatus: passenger.verificationStatus || 'verified',
    createdAt: passenger.createdAt || nowIso,
    updatedAt: nowIso,
  };

  db.prepare(`
    INSERT INTO passengers (
      id, passenger_id_number, full_name, phone, normalized_phone,
      district, sub_county, village, phone_type, assisted_registration,
      verification_status, account_status, created_at, updated_at, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      full_name = excluded.full_name,
      phone = excluded.phone,
      normalized_phone = excluded.normalized_phone,
      district = excluded.district,
      sub_county = excluded.sub_county,
      village = excluded.village,
      phone_type = excluded.phone_type,
      assisted_registration = excluded.assisted_registration,
      verification_status = excluded.verification_status,
      account_status = excluded.account_status,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    enriched.id,
    enriched.passengerIdNumber || code,
    enriched.fullName,
    enriched.phone,
    normPhone || enriched.id,
    enriched.district || 'Luweero',
    enriched.subCounty || 'Luweero Town Council',
    enriched.village || '',
    enriched.phoneType || 'smartphone',
    enriched.assistedRegistration ? 1 : 0,
    enriched.verificationStatus || 'verified',
    enriched.accountStatus || 'active',
    enriched.createdAt || nowIso,
    nowIso,
    JSON.stringify(enriched)
  );

  return enriched;
}

export function deletePassengerRecord(id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM passengers WHERE id = ?').run(id);
  return res.changes > 0;
}

// JOBS
export function listJobs(): BodaJob[] {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM jobs ORDER BY created_at DESC').all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as BodaJob);
}

export function upsertJobRecord(job: BodaJob, _skipDup = false): BodaJob {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const code = job.jobCode?.trim() || generateRecordCode('JOB');

  const enriched: BodaJob = {
    ...job,
    id: job.id || `job-${Date.now()}`,
    jobCode: code,
    district: job.district || 'Luweero',
    postedDate: job.postedDate || nowIso.split('T')[0],
    updatedAt: nowIso,
  };

  db.prepare(`
    INSERT INTO jobs (
      id, job_code, title, type, employer_company, employer_phone,
      district, sub_county, village, status, admin_approved, deadline,
      created_at, updated_at, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      type = excluded.type,
      employer_company = excluded.employer_company,
      employer_phone = excluded.employer_phone,
      district = excluded.district,
      sub_county = excluded.sub_county,
      village = excluded.village,
      status = excluded.status,
      admin_approved = excluded.admin_approved,
      deadline = excluded.deadline,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    enriched.id,
    enriched.jobCode || code,
    enriched.title,
    enriched.type,
    enriched.employerCompany || enriched.employerName,
    enriched.employerPhone,
    enriched.district || 'Luweero',
    enriched.subCounty,
    enriched.village || '',
    enriched.status || 'open',
    enriched.adminApproved ? 1 : 0,
    enriched.deadline,
    enriched.postedDate,
    nowIso,
    JSON.stringify(enriched)
  );

  return enriched;
}

export function deleteJobRecord(id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  return res.changes > 0;
}

// SWAP STATIONS
export function listSwapStations(): BatterySwapStation[] {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM swap_stations ORDER BY created_at DESC').all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as BatterySwapStation);
}

export function upsertStationRecord(station: BatterySwapStation, skipDup = false): BatterySwapStation {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const code = station.stationCode?.trim() || generateRecordCode('SWP');

  if (!skipDup) {
    const existing = db
      .prepare('SELECT id, name FROM swap_stations WHERE LOWER(name) = ? AND LOWER(sub_county) = ?')
      .get(station.name.trim().toLowerCase(), (station.subCounty || '').trim().toLowerCase()) as
      | { id: string; name: string }
      | undefined;
    if (existing && existing.id !== station.id) {
      throw new Error(`Duplicate swap station detected: "${existing.name}" already registered in ${station.subCounty}.`);
    }
  }

  const enriched: BatterySwapStation = {
    ...station,
    id: station.id || `station-${Date.now()}`,
    stationCode: code,
    district: station.district || 'Luweero',
    servicesOffered: station.servicesOffered || 'both',
    supportedBatteryTypes: station.supportedBatteryTypes?.length
      ? station.supportedBatteryTypes
      : [station.batteryBrand || 'Bodawerk'],
    lastStockUpdate: station.lastStockUpdate || nowIso,
    createdAt: station.createdAt || nowIso,
    updatedAt: nowIso,
  };

  db.prepare(`
    INSERT INTO swap_stations (
      id, station_code, name, operator_phone, district, sub_county,
      village, status, verified, created_at, updated_at, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      operator_phone = excluded.operator_phone,
      district = excluded.district,
      sub_county = excluded.sub_county,
      village = excluded.village,
      status = excluded.status,
      verified = excluded.verified,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    enriched.id,
    enriched.stationCode || code,
    enriched.name,
    enriched.operatorPhone,
    enriched.district || 'Luweero',
    enriched.subCounty,
    enriched.village || '',
    enriched.status,
    enriched.verified ? 1 : 0,
    enriched.createdAt || nowIso,
    nowIso,
    JSON.stringify(enriched)
  );

  return enriched;
}

export function deleteStationRecord(id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM swap_stations WHERE id = ?').run(id);
  return res.changes > 0;
}

// MAINTENANCE CENTRES
export function listMaintenanceCentres(): BusinessListing[] {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM maintenance_centres ORDER BY created_at DESC').all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as BusinessListing);
}

export function upsertMaintenanceCentreRecord(centre: BusinessListing, skipDup = false): BusinessListing {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const normPhone = normalizePhoneKey(centre.phone);
  const code = centre.centreCode?.trim() || generateRecordCode('MNT');

  if (!skipDup) {
    const existing = db
      .prepare('SELECT id, name FROM maintenance_centres WHERE LOWER(name) = ? AND normalized_phone = ?')
      .get(centre.name.trim().toLowerCase(), normPhone) as { id: string; name: string } | undefined;
    if (existing && existing.id !== centre.id) {
      throw new Error(`Duplicate maintenance centre detected: "${existing.name}" already registered with this phone.`);
    }
  }

  const enriched: BusinessListing = {
    ...centre,
    id: centre.id || `biz-${Date.now()}`,
    centreCode: code,
    district: centre.district || 'Luweero',
    bikeTypesServiced: centre.bikeTypesServiced || 'both',
    brandsServiced: centre.brandsServiced?.length ? centre.brandsServiced : ['Bajaj Boxer', 'TVS HLX'],
    accountStatus: centre.accountStatus || 'active',
    createdAt: centre.createdAt || nowIso,
    updatedAt: nowIso,
  };

  db.prepare(`
    INSERT INTO maintenance_centres (
      id, centre_code, name, owner_name, phone, normalized_phone,
      district, sub_county, village, category, bike_types_serviced,
      verified, account_status, created_at, updated_at, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      owner_name = excluded.owner_name,
      phone = excluded.phone,
      normalized_phone = excluded.normalized_phone,
      district = excluded.district,
      sub_county = excluded.sub_county,
      village = excluded.village,
      category = excluded.category,
      bike_types_serviced = excluded.bike_types_serviced,
      verified = excluded.verified,
      account_status = excluded.account_status,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    enriched.id,
    enriched.centreCode || code,
    enriched.name,
    enriched.ownerName,
    enriched.phone,
    normPhone || enriched.id,
    enriched.district || 'Luweero',
    enriched.subCounty,
    enriched.village || '',
    enriched.category || 'garage',
    enriched.bikeTypesServiced || 'both',
    enriched.verified ? 1 : 0,
    enriched.accountStatus || 'active',
    enriched.createdAt || nowIso,
    nowIso,
    JSON.stringify(enriched)
  );

  return enriched;
}

export function deleteMaintenanceCentreRecord(id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM maintenance_centres WHERE id = ?').run(id);
  return res.changes > 0;
}

// STAGES
export function listStages(): Stage[] {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM stages ORDER BY name ASC').all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as Stage);
}

export function upsertStageRecord(stage: Stage, skipDup = false): Stage {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const code = stage.stageCode?.trim() || generateRecordCode('STG');

  if (!skipDup) {
    const existing = db.prepare('SELECT id, name FROM stages WHERE LOWER(name) = ?').get(stage.name.trim().toLowerCase()) as
      | { id: string; name: string }
      | undefined;
    if (existing && existing.id !== stage.id) {
      throw new Error(`Duplicate boda stage detected: "${existing.name}" already exists.`);
    }
  }

  const enriched: Stage = {
    ...stage,
    id: stage.id || `stage-${Date.now()}`,
    stageCode: code,
    district: stage.district || 'Luweero',
    operatingStatus: stage.operatingStatus || 'active',
    servicesAvailable: stage.servicesAvailable?.length ? stage.servicesAvailable : ['Passenger Rides'],
    createdAt: stage.createdAt || nowIso,
    updatedAt: nowIso,
  };

  db.prepare(`
    INSERT INTO stages (
      id, stage_code, name, district, sub_county, parish, village,
      operating_status, created_at, updated_at, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      district = excluded.district,
      sub_county = excluded.sub_county,
      parish = excluded.parish,
      village = excluded.village,
      operating_status = excluded.operating_status,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    enriched.id,
    enriched.stageCode || code,
    enriched.name,
    enriched.district,
    enriched.subCounty,
    enriched.parish || '',
    enriched.village || '',
    enriched.operatingStatus || 'active',
    enriched.createdAt || nowIso,
    nowIso,
    JSON.stringify(enriched)
  );

  return enriched;
}

export function deleteStageRecord(id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM stages WHERE id = ?').run(id);
  return res.changes > 0;
}

export function assignRiderToStage(riderId: string, stageId: string): { rider: RiderProfile; stage: Stage } {
  const db = getDb();
  const stageRow = db.prepare('SELECT data_json FROM stages WHERE id = ?').get(stageId) as { data_json: string } | undefined;
  if (!stageRow) throw new Error('Target boda stage not found.');
  const stage = JSON.parse(stageRow.data_json) as Stage;

  const rider = getRiderById(riderId);
  if (!rider) throw new Error('Rider record not found.');

  const prevStageId = rider.stageId;
  const updatedRider = upsertRiderRecord(
    {
      ...rider,
      stageId: stage.id,
      stageName: stage.name,
      district: stage.district || rider.district,
      subCounty: stage.subCounty || rider.subCounty,
    },
    true
  );

  // Recalculate member counts accurately if stage exists
  if (prevStageId && prevStageId !== stage.id) {
    const prevRow = db.prepare('SELECT data_json FROM stages WHERE id = ?').get(prevStageId) as { data_json: string } | undefined;
    if (prevRow) {
      const prevStage = JSON.parse(prevRow.data_json) as Stage;
      const cnt = (db.prepare('SELECT COUNT(*) as cnt FROM riders WHERE stage_id = ?').get(prevStageId) as { cnt: number }).cnt;
      upsertStageRecord({ ...prevStage, memberCount: Math.max(prevStage.memberCount - 1, cnt) }, true);
    }
  }
  const newCnt = (db.prepare('SELECT COUNT(*) as cnt FROM riders WHERE stage_id = ?').get(stage.id) as { cnt: number }).cnt;
  const updatedStage = upsertStageRecord({ ...stage, memberCount: Math.max(stage.memberCount, newCnt) }, true);

  return { rider: updatedRider, stage: updatedStage };
}

// ADMIN ACCOUNTS & RBAC
export function listAdminAccounts(): AdminAccount[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM admin_accounts ORDER BY created_at ASC').all() as Array<{
    id: string;
    admin_code: string;
    full_name: string;
    email: string;
    phone: string;
    role: AdminAccount['role'];
    permissions_json: string;
    status: AdminAccount['status'];
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    adminCode: r.admin_code,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    permissions: JSON.parse(r.permissions_json) as AdminPermissions,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function getAdminById(id: string): AdminAccount | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM admin_accounts WHERE id = ?').get(id) as
    | {
        id: string;
        admin_code: string;
        full_name: string;
        email: string;
        phone: string;
        role: AdminAccount['role'];
        permissions_json: string;
        status: AdminAccount['status'];
        created_at: string;
        updated_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    adminCode: row.admin_code,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    permissions: JSON.parse(row.permissions_json) as AdminPermissions,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function upsertAdminAccount(admin: AdminAccount): AdminAccount {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const code = admin.adminCode?.trim() || generateRecordCode('ADM');
  const perms = admin.role === 'super_admin' ? DEFAULT_SUPER_ADMIN_PERMS : admin.permissions;

  const enriched: AdminAccount = {
    ...admin,
    id: admin.id || `adm-${Date.now()}`,
    adminCode: code,
    permissions: perms,
    createdAt: admin.createdAt || nowIso,
    updatedAt: nowIso,
  };

  db.prepare(`
    INSERT INTO admin_accounts (
      id, admin_code, full_name, email, phone, role, permissions_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      full_name = excluded.full_name,
      email = excluded.email,
      phone = excluded.phone,
      role = excluded.role,
      permissions_json = excluded.permissions_json,
      status = excluded.status,
      updated_at = excluded.updated_at
  `).run(
    enriched.id,
    enriched.adminCode,
    enriched.fullName,
    enriched.email.trim().toLowerCase(),
    enriched.phone,
    enriched.role,
    JSON.stringify(enriched.permissions),
    enriched.status,
    enriched.createdAt,
    nowIso
  );

  return enriched;
}

export function deleteAdminAccount(id: string): boolean {
  if (id === 'admin-founder-mukisa') {
    throw new Error('Cannot remove the Founding Super Administrator account.');
  }
  const db = getDb();
  const res = db.prepare('DELETE FROM admin_accounts WHERE id = ?').run(id);
  return res.changes > 0;
}

// AUDIT LOGS, NOTIFICATIONS & CAMPAIGNS
export function insertAuditLog(entry: {
  id?: string;
  timestamp?: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  category?: string;
  targetId?: string;
  targetLabel?: string;
  details: string;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO audit_logs (
      id, timestamp, actor_id, actor_name, actor_role, action, category, target_id, target_label, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entry.timestamp || new Date().toISOString(),
    entry.actorId || '',
    entry.actorName,
    entry.actorRole,
    entry.action,
    entry.category || 'admin',
    entry.targetId || '',
    entry.targetLabel || '',
    entry.details
  );
}

export function listAuditLogs(limit = 150): AuditLog[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit) as Array<{
    id: string;
    timestamp: string;
    actor_name: string;
    actor_role: AuditLog['actorRole'];
    action: string;
    target_label: string;
    details: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    action: r.action,
    target: r.target_label,
    details: r.details,
  }));
}

export function insertNotification(notif: AppNotification): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO notifications (id, user_id, title, message, timestamp, read, type, action_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    notif.id,
    notif.userId || 'all',
    notif.title,
    notif.message,
    notif.timestamp,
    notif.read ? 1 : 0,
    notif.type || 'system',
    notif.actionUrl || ''
  );
}

export function listNotifications(userId?: string): AppNotification[] {
  const db = getDb();
  const rows = (
    userId
      ? db.prepare("SELECT * FROM notifications WHERE user_id = ? OR user_id = 'all' ORDER BY timestamp DESC LIMIT 100").all(userId)
      : db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 100').all()
  ) as Array<{
    id: string;
    user_id: string;
    title: string;
    message: string;
    timestamp: string;
    read: number;
    type: AppNotification['type'];
    action_url: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    message: r.message,
    timestamp: r.timestamp,
    read: Boolean(r.read),
    type: r.type,
    actionUrl: r.action_url || undefined,
  }));
}

export function insertDeliveryLog(record: NotificationDeliveryRecord): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO notifications_delivery_log (
      id, channel, recipient_id, recipient_name, recipient_phone, category, message,
      provider, provider_message_id, status, error_reason, sent_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.channel,
    record.recipientId,
    record.recipientName,
    record.recipientPhone,
    record.category,
    record.message,
    record.provider,
    record.providerMessageId || '',
    record.status,
    record.errorReason || '',
    record.sentBy,
    record.createdAt
  );
}

export function listDeliveryLogs(limit = 150): NotificationDeliveryRecord[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM notifications_delivery_log ORDER BY created_at DESC LIMIT ?').all(limit) as Array<{
    id: string;
    channel: NotificationDeliveryRecord['channel'];
    recipient_id: string;
    recipient_name: string;
    recipient_phone: string;
    category: string;
    message: string;
    provider: string;
    provider_message_id: string;
    status: NotificationDeliveryRecord['status'];
    error_reason: string;
    sent_by: string;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    channel: r.channel,
    recipientId: r.recipient_id,
    recipientName: r.recipient_name,
    recipientPhone: r.recipient_phone,
    category: r.category,
    message: r.message,
    provider: r.provider,
    providerMessageId: r.provider_message_id || undefined,
    status: r.status,
    errorReason: r.error_reason || undefined,
    sentBy: r.sent_by,
    createdAt: r.created_at,
  }));
}

export function saveSmsCampaignRecord(camp: SmsCampaignRecord): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO sms_campaigns (id, job_id, sent_at, data_json)
    VALUES (?, ?, ?, ?)
  `).run(camp.id, camp.jobId, camp.sentAt, JSON.stringify(camp));
}

export function listSmsCampaigns(): SmsCampaignRecord[] {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM sms_campaigns ORDER BY sent_at DESC').all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as SmsCampaignRecord);
}

// ADVANCED JOB NOTIFICATION BROADCASTS & QUEUE HELPERS
export function upsertJobBroadcastRecord(broadcast: JobBroadcastCampaign): JobBroadcastCampaign {
  const db = getDb();
  db.prepare(`
    INSERT INTO job_broadcasts (id, job_id, job_title, queue_state, sent_at, completed_at, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      job_title = excluded.job_title,
      queue_state = excluded.queue_state,
      completed_at = excluded.completed_at,
      data_json = excluded.data_json
  `).run(
    broadcast.id,
    broadcast.jobId,
    broadcast.jobTitle,
    broadcast.queueState,
    broadcast.sentAt,
    broadcast.completedAt || '',
    JSON.stringify(broadcast)
  );
  return broadcast;
}

export function getJobBroadcastById(id: string): JobBroadcastCampaign | null {
  const db = getDb();
  const row = db.prepare('SELECT data_json FROM job_broadcasts WHERE id = ?').get(id) as { data_json: string } | undefined;
  return row ? (JSON.parse(row.data_json) as JobBroadcastCampaign) : null;
}

export function listJobBroadcasts(): JobBroadcastCampaign[] {
  const db = getDb();
  const rows = db.prepare('SELECT data_json FROM job_broadcasts ORDER BY sent_at DESC').all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as JobBroadcastCampaign);
}

export function hasExistingJobNotification(
  jobId: string,
  riderId: string,
  channel: JobBroadcastChannel
): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id FROM job_notification_deliveries
       WHERE job_id = ? AND rider_id = ? AND channel = ?
       AND status IN ('pending', 'queued', 'sent', 'delivered')
       LIMIT 1`
    )
    .get(jobId, riderId, channel) as { id: string } | undefined;
  return Boolean(row);
}

export function upsertJobDeliveryRecord(del: JobBroadcastDelivery): JobBroadcastDelivery {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const updatedAt = del.updatedAt || nowIso;

  db.prepare(`
    INSERT INTO job_notification_deliveries (
      id, broadcast_id, job_id, job_title, rider_id, rider_name, channel,
      target_phone, network, message_text, status, provider, provider_message_id,
      error_reason, cost_ugx, retry_count, last_attempt_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      provider = excluded.provider,
      provider_message_id = excluded.provider_message_id,
      error_reason = excluded.error_reason,
      cost_ugx = excluded.cost_ugx,
      retry_count = excluded.retry_count,
      last_attempt_at = excluded.last_attempt_at,
      updated_at = excluded.updated_at
  `).run(
    del.id,
    del.broadcastId,
    del.jobId,
    del.jobTitle,
    del.riderId,
    del.riderName,
    del.channel,
    del.targetPhone || '',
    del.network || 'Invalid',
    del.messageText,
    del.status,
    del.provider,
    del.providerMessageId || '',
    del.errorReason || '',
    Number(del.costUgx || 0),
    Number(del.retryCount || 0),
    del.lastAttemptAt || '',
    del.createdAt || nowIso,
    updatedAt
  );

  return { ...del, updatedAt };
}

interface JobDeliveryRow {
  id: string;
  broadcast_id: string;
  job_id: string;
  job_title: string;
  rider_id: string;
  rider_name: string;
  channel: JobBroadcastChannel;
  target_phone: string;
  network: 'MTN' | 'Airtel' | 'Other' | 'Invalid';
  message_text: string;
  status: SmsDeliveryStatus;
  provider: string;
  provider_message_id: string;
  error_reason: string;
  cost_ugx: number;
  retry_count: number;
  last_attempt_at: string;
  created_at: string;
  updated_at: string;
}

function mapJobDeliveryRow(r: JobDeliveryRow): JobBroadcastDelivery {
  return {
    id: r.id,
    broadcastId: r.broadcast_id,
    jobId: r.job_id,
    jobTitle: r.job_title,
    riderId: r.rider_id,
    riderName: r.rider_name,
    channel: r.channel,
    targetPhone: r.target_phone,
    network: r.network,
    messageText: r.message_text,
    status: r.status,
    provider: r.provider,
    providerMessageId: r.provider_message_id || undefined,
    errorReason: r.error_reason || undefined,
    costUgx: Number(r.cost_ugx || 0),
    retryCount: Number(r.retry_count || 0),
    lastAttemptAt: r.last_attempt_at || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getJobDeliveryById(id: string): JobBroadcastDelivery | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM job_notification_deliveries WHERE id = ?').get(id) as JobDeliveryRow | undefined;
  return row ? mapJobDeliveryRow(row) : null;
}

export function listJobDeliveries(options?: {
  broadcastId?: string;
  jobId?: string;
  status?: string;
  channel?: string;
  limit?: number;
}): JobBroadcastDelivery[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (options?.broadcastId) {
    clauses.push('broadcast_id = ?');
    params.push(options.broadcastId);
  }
  if (options?.jobId) {
    clauses.push('job_id = ?');
    params.push(options.jobId);
  }
  if (options?.status && options.status !== 'all') {
    clauses.push('status = ?');
    params.push(options.status);
  }
  if (options?.channel && options.channel !== 'all') {
    clauses.push('channel = ?');
    params.push(options.channel);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = options?.limit ?? 300;
  params.push(limit);

  const rows = db
    .prepare(`SELECT * FROM job_notification_deliveries ${whereSql} ORDER BY created_at DESC, updated_at DESC LIMIT ?`)
    .all(...params) as unknown as JobDeliveryRow[];

  return rows.map(mapJobDeliveryRow);
}

export function recomputeJobBroadcastCounts(broadcastId: string): JobBroadcastCampaign | null {
  const existing = getJobBroadcastById(broadcastId);
  if (!existing) return null;

  const allDels = listJobDeliveries({ broadcastId, limit: 2000 });
  const sms = allDels.filter((d) => d.channel === 'sms');
  const wa = allDels.filter((d) => d.channel === 'whatsapp');
  const app = allDels.filter((d) => d.channel === 'in_app');

  const smsPendingCount = sms.filter((d) => d.status === 'pending' || d.status === 'queued').length;
  const whatsappPendingCount = wa.filter((d) => d.status === 'pending' || d.status === 'queued').length;
  const isDone = smsPendingCount === 0 && whatsappPendingCount === 0;

  const updated: JobBroadcastCampaign = {
    ...existing,
    queueState: isDone ? 'completed' : 'processing',
    completedAt: isDone ? existing.completedAt || new Date().toISOString() : undefined,
    smsPendingCount,
    smsSentCount: sms.filter((d) => d.status === 'sent' || d.status === 'delivered').length,
    smsDeliveredCount: sms.filter((d) => d.status === 'delivered').length,
    smsFailedCount: sms.filter((d) => d.status === 'failed' || d.status === 'blocked_unconfigured' || d.status === 'invalid_number').length,
    whatsappPendingCount,
    whatsappSentCount: wa.filter((d) => d.status === 'sent' || d.status === 'delivered').length,
    whatsappDeliveredCount: wa.filter((d) => d.status === 'delivered').length,
    whatsappFailedCount: wa.filter((d) => d.status === 'failed' || d.status === 'blocked_unconfigured' || d.status === 'invalid_number').length,
    appNotifSentCount: app.filter((d) => d.status === 'delivered' || d.status === 'sent').length,
    skippedDuplicateCount: allDels.filter((d) => d.status === 'skipped_duplicate').length,
    skippedPreferenceCount: allDels.filter((d) => d.status === 'skipped_preference' || d.status === 'opted_out').length,
    invalidPhoneCount: allDels.filter((d) => d.status === 'invalid_number').length,
    actualSmsCostUgx: sms.reduce((acc, d) => acc + (d.costUgx || 0), 0),
  };

  return upsertJobBroadcastRecord(updated);
}

export function updateJobDeliveryByProviderId(
  providerMessageId: string,
  nextStatus: SmsDeliveryStatus,
  errorReason?: string
): JobBroadcastDelivery | null {
  if (!providerMessageId) return null;
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM job_notification_deliveries WHERE provider_message_id = ? LIMIT 1')
    .get(providerMessageId) as JobDeliveryRow | undefined;
  if (!row) return null;

  const existing = mapJobDeliveryRow(row);
  const updated = upsertJobDeliveryRecord({
    ...existing,
    status: nextStatus,
    errorReason: errorReason || existing.errorReason,
    updatedAt: new Date().toISOString(),
  });
  recomputeJobBroadcastCounts(updated.broadcastId);
  return updated;
}

export function getJobNotificationDashboardStats(): JobNotificationDashboardStats {
  const riders = listRiders();
  const broadcasts = listJobBroadcasts();
  const deliveries = listJobDeliveries({ limit: 5000 });

  const consentedRidersCount = riders.filter((r) => {
    const prefs = r.jobAlertPreferences;
    if (!prefs) return true;
    return prefs.enabled !== false && prefs.consentGiven !== false && prefs.preferredChannel !== 'none';
  }).length;

  const whatsappEnabledRidersCount = riders.filter((r) => {
    const waPhone = validateUgandaPhone(r.whatsappNumber || r.phone);
    const prefs = r.jobAlertPreferences;
    const optedIn = !prefs || (prefs.enabled !== false && prefs.consentGiven !== false && prefs.preferredChannel !== 'none' && prefs.preferredChannel !== 'sms_only' && prefs.preferredChannel !== 'app_only');
    return waPhone.isValid && optedIn;
  }).length;

  const smsRows = deliveries.filter((d) => d.channel === 'sms');
  const waRows = deliveries.filter((d) => d.channel === 'whatsapp');
  const appRows = deliveries.filter((d) => d.channel === 'in_app');

  return {
    totalRegisteredRiders: riders.length,
    consentedRidersCount,
    whatsappEnabledRidersCount,
    totalBroadcasts: broadcasts.length,
    totalSmsSent: smsRows.filter((d) => d.status === 'sent' || d.status === 'delivered').length,
    totalWhatsappSent: waRows.filter((d) => d.status === 'sent' || d.status === 'delivered').length,
    totalInAppSent: appRows.filter((d) => d.status === 'sent' || d.status === 'delivered').length,
    successfullyDelivered: deliveries.filter((d) => d.status === 'delivered').length,
    failedOrBlocked: deliveries.filter(
      (d) => d.status === 'failed' || d.status === 'blocked_unconfigured' || d.status === 'invalid_number'
    ).length,
    pendingInQueue: deliveries.filter((d) => d.status === 'pending' || d.status === 'queued').length,
    skippedDuplicates: deliveries.filter((d) => d.status === 'skipped_duplicate').length,
  };
}

// ANALYTICS ENGINE
export function computeCentralAnalytics(): CentralAnalytics {
  const riders = listRiders();
  const passengers = listPassengers();
  const jobs = listJobs();
  const stations = listSwapStations();
  const centres = listMaintenanceCentres();
  const stages = listStages();

  const areaBuckets = ['Kikyusa', 'Luweero Town Council', 'Kasana', 'Wobulenzi', 'Bamunanika', 'Other / National'];

  const normalizeArea = (subCounty?: string, district?: string): string => {
    const sc = (subCounty || '').toLowerCase();
    const dist = (district || 'Luweero').toLowerCase();
    if (sc.includes('kikyusa')) return 'Kikyusa';
    if (sc.includes('luweero')) return 'Luweero Town Council';
    if (sc.includes('kasana')) return 'Kasana';
    if (sc.includes('wobulenzi')) return 'Wobulenzi';
    if (sc.includes('bamunanika')) return 'Bamunanika';
    if (dist && !dist.includes('luweero')) return 'Other / National';
    return 'Other / National';
  };

  const locationBreakdown = areaBuckets.map((area) => {
    return {
      area,
      district: area === 'Other / National' ? 'Uganda National' : 'Luweero',
      riders: riders.filter((r) => normalizeArea(r.subCounty || r.residentialArea, r.district) === area).length,
      passengers: passengers.filter((p) => normalizeArea(p.subCounty || p.residentialArea, p.district) === area).length,
      stages: stages.filter((s) => normalizeArea(s.subCounty, s.district) === area).length,
      stations: stations.filter((st) => normalizeArea(st.subCounty, st.district) === area).length,
      centres: centres.filter((c) => normalizeArea(c.subCounty, c.district) === area).length,
      jobs: jobs.filter((j) => normalizeArea(j.subCounty, j.district) === area).length,
    };
  });

  return {
    totals: {
      riders: riders.length,
      passengers: passengers.length,
      jobs: jobs.length,
      stations: stations.length,
      centres: centres.length,
      stages: stages.length,
    },
    ridersByStatus: {
      active: riders.filter((r) => (r.accountStatus || 'active') === 'active').length,
      suspended: riders.filter((r) => r.accountStatus === 'suspended' || r.verificationStatus === 'suspended').length,
      deactivated: riders.filter((r) => r.accountStatus === 'deactivated').length,
      verified: riders.filter((r) => r.verificationStatus === 'verified').length,
      pendingVerification: riders.filter((r) => r.verificationStatus === 'pending' || r.verificationStatus === 'under_review').length,
      electric: riders.filter((r) => r.motorcycleType === 'electric').length,
      petrol: riders.filter((r) => r.motorcycleType !== 'electric').length,
      featurePhone: riders.filter((r) => r.phoneType === 'feature_phone').length,
      smartphone: riders.filter((r) => (r.phoneType || 'smartphone') === 'smartphone').length,
    },
    passengersByStatus: {
      active: passengers.filter((p) => (p.accountStatus || 'active') === 'active').length,
      suspended: passengers.filter((p) => p.accountStatus === 'suspended').length,
      deactivated: passengers.filter((p) => p.accountStatus === 'deactivated').length,
      assistedOrButtonPhone: passengers.filter((p) => p.assistedRegistration || p.phoneType === 'feature_phone').length,
    },
    jobsByStatus: {
      open: jobs.filter((j) => j.status === 'open').length,
      approved: jobs.filter((j) => j.adminApproved).length,
      pendingApproval: jobs.filter((j) => !j.adminApproved).length,
      suspended: jobs.filter((j) => j.status === 'suspended' || j.status === 'cancelled').length,
    },
    stationsByStatus: {
      operational: stations.filter((s) => s.status === 'operational' || s.status === 'open').length,
      temporarilyClosed: stations.filter((s) => s.status === 'temporarily_closed' || s.status === 'offline').length,
      unavailable: stations.filter((s) => s.status === 'unavailable' || s.status === 'out_of_batteries').length,
    },
    centresByStatus: {
      verified: centres.filter((c) => c.verified && (c.accountStatus || 'active') === 'active').length,
      pendingVerification: centres.filter((c) => !c.verified && (c.accountStatus || 'active') === 'active').length,
      suspended: centres.filter((c) => c.accountStatus === 'suspended' || c.accountStatus === 'deactivated').length,
    },
    stagesByStatus: {
      active: stages.filter((s) => (s.operatingStatus || 'active') === 'active').length,
      suspended: stages.filter((s) => s.operatingStatus === 'suspended').length,
      closed: stages.filter((s) => s.operatingStatus === 'closed').length,
    },
    locationBreakdown,
  };
}

// =========================================================================
// AUTOMATED DAILY JOB DISCOVERY ENGINE CRUD & ANALYTICS HELPERS
// =========================================================================

export function listDiscoverySources(): DiscoverySource[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT data_json FROM discovery_sources ORDER BY updated_at DESC')
    .all() as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as DiscoverySource);
}

export function getDiscoverySourceById(id: string): DiscoverySource | null {
  const db = getDb();
  const row = db
    .prepare('SELECT data_json FROM discovery_sources WHERE id = ?')
    .get(id) as { data_json: string } | undefined;
  return row ? (JSON.parse(row.data_json) as DiscoverySource) : null;
}

export function upsertDiscoverySource(src: DiscoverySource): DiscoverySource {
  const db = getDb();
  const updatedAt = src.updatedAt || new Date().toISOString();
  const normalized: DiscoverySource = {
    ...src,
    createdAt: src.createdAt || updatedAt,
    updatedAt,
  };
  db.prepare(`
    INSERT INTO discovery_sources (id, category, source_type, active, url, last_status, last_checked_at, updated_at, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      source_type = excluded.source_type,
      active = excluded.active,
      url = excluded.url,
      last_status = excluded.last_status,
      last_checked_at = excluded.last_checked_at,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    normalized.id,
    normalized.category,
    normalized.sourceType,
    normalized.active ? 1 : 0,
    normalized.url,
    normalized.lastStatus,
    normalized.lastCheckedAt || '',
    updatedAt,
    JSON.stringify(normalized)
  );
  return normalized;
}

export function deleteDiscoverySource(id: string): boolean {
  const db = getDb();
  const info = db.prepare('DELETE FROM discovery_sources WHERE id = ?').run(id);
  return info.changes > 0;
}

export function listDiscoveredJobs(options?: {
  status?: DiscoveredJobStatus | 'all';
  limit?: number;
}): DiscoveredJobRecord[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (options?.status && options.status !== 'all') {
    clauses.push('status = ?');
    params.push(options.status);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = options?.limit ?? 500;
  params.push(limit);

  const rows = db
    .prepare(
      `SELECT data_json FROM discovered_jobs ${whereSql} ORDER BY location_priority_score DESC, discovered_at DESC LIMIT ?`
    )
    .all(...params) as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as DiscoveredJobRecord);
}

export function getDiscoveredJobById(id: string): DiscoveredJobRecord | null {
  const db = getDb();
  const row = db
    .prepare('SELECT data_json FROM discovered_jobs WHERE id = ?')
    .get(id) as { data_json: string } | undefined;
  return row ? (JSON.parse(row.data_json) as DiscoveredJobRecord) : null;
}

export function upsertDiscoveredJob(job: DiscoveredJobRecord): DiscoveredJobRecord {
  const db = getDb();
  const updatedAt = job.updatedAt || new Date().toISOString();
  const normalized: DiscoveredJobRecord = {
    ...job,
    discoveredAt: job.discoveredAt || updatedAt,
    updatedAt,
  };
  db.prepare(`
    INSERT INTO discovered_jobs (
      id, content_hash, source_id, status, employer_name, district,
      location_priority_score, scam_score, is_expired, discovered_at, updated_at, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      content_hash = excluded.content_hash,
      source_id = excluded.source_id,
      status = excluded.status,
      employer_name = excluded.employer_name,
      district = excluded.district,
      location_priority_score = excluded.location_priority_score,
      scam_score = excluded.scam_score,
      is_expired = excluded.is_expired,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    normalized.id,
    normalized.contentHash,
    normalized.sourceId,
    normalized.status,
    normalized.employerName,
    normalized.district,
    Number(normalized.locationPriorityScore || 0),
    Number(normalized.scamScore || 0),
    normalized.isExpired ? 1 : 0,
    normalized.discoveredAt,
    updatedAt,
    JSON.stringify(normalized)
  );
  return normalized;
}

export function deleteDiscoveredJob(id: string): boolean {
  const db = getDb();
  const info = db.prepare('DELETE FROM discovered_jobs WHERE id = ?').run(id);
  return info.changes > 0;
}

export function getDiscoveryScheduleConfig(): DiscoveryScheduleConfig {
  const db = getDb();
  const row = db
    .prepare("SELECT data_json FROM discovery_schedule_config WHERE id = 'default'")
    .get() as { data_json: string } | undefined;
  if (row) {
    return JSON.parse(row.data_json) as DiscoveryScheduleConfig;
  }
  const nowIso = new Date().toISOString();
  return {
    id: 'default',
    automationEnabled: true,
    scanTimes: ['06:00', '14:00'],
    timezone: 'Africa/Kampala',
    maxRetriesPerSource: 2,
    targetLocations: ['Kikyusa', 'Luweero', 'Wobulenzi', 'Kasana', 'Uganda'],
    searchKeywords: ['boda rider', 'delivery', 'driver', 'courier'],
    enabledCategories: ['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda', 'passenger_contract'],
    notifyAdminInApp: true,
    notifyAdminSms: false,
    notifyAdminWhatsapp: false,
    adminNotifyPhone: '+256772100240',
    adminNotifyWhatsapp: '+256772100240',
    notifyOnlyWhenNewFound: true,
    updatedAt: nowIso,
  };
}

export function saveDiscoveryScheduleConfig(cfg: DiscoveryScheduleConfig): DiscoveryScheduleConfig {
  const db = getDb();
  const updatedAt = new Date().toISOString();
  const normalized: DiscoveryScheduleConfig = {
    ...cfg,
    id: 'default',
    updatedAt,
  };
  db.prepare(`
    INSERT INTO discovery_schedule_config (id, updated_at, data_json)
    VALUES ('default', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(updatedAt, JSON.stringify(normalized));
  return normalized;
}

export function listDiscoveryRuns(limit = 30): DiscoveryRunReport[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT data_json FROM discovery_runs ORDER BY started_at DESC LIMIT ?')
    .all(limit) as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as DiscoveryRunReport);
}

export function getDiscoveryRunById(id: string): DiscoveryRunReport | null {
  const db = getDb();
  const row = db
    .prepare('SELECT data_json FROM discovery_runs WHERE id = ?')
    .get(id) as { data_json: string } | undefined;
  return row ? (JSON.parse(row.data_json) as DiscoveryRunReport) : null;
}

export function upsertDiscoveryRun(run: DiscoveryRunReport): DiscoveryRunReport {
  const db = getDb();
  db.prepare(`
    INSERT INTO discovery_runs (id, trigger_type, status, started_at, completed_at, data_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      completed_at = excluded.completed_at,
      data_json = excluded.data_json
  `).run(
    run.id,
    run.trigger,
    run.status,
    run.startedAt,
    run.completedAt || '',
    JSON.stringify(run)
  );
  return run;
}

export function computeDiscoveryCounts(): DiscoveryDashboardPayload['counts'] {
  const all = listDiscoveredJobs({ limit: 2000 });
  return {
    all: all.length,
    new: all.filter((j) => j.status === 'new').length,
    awaiting_verification: all.filter((j) => j.status === 'awaiting_verification').length,
    info_requested: all.filter((j) => j.status === 'info_requested').length,
    verified: all.filter((j) => j.status === 'verified').length,
    rejected: all.filter((j) => j.status === 'rejected').length,
    suspicious: all.filter((j) => j.status === 'suspicious').length,
    expired: all.filter((j) => j.status === 'expired').length,
    duplicate: all.filter((j) => j.status === 'duplicate').length,
  };
}

export function computeDiscoveryEmployers(): DiscoveryEmployerSummary[] {
  const discovered = listDiscoveredJobs({ limit: 2000 });
  const map = new Map<string, DiscoveryEmployerSummary>();

  for (const j of discovered) {
    const nameClean = (j.employerName || 'Unverified Employer').trim();
    const key = nameClean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        employerKey: key,
        employerName: nameClean,
        companyAddress: j.employerAddress,
        contactPhones: j.employerPhone ? [j.employerPhone] : [],
        contactEmails: j.employerEmail ? [j.employerEmail] : [],
        officialWebsite: j.employerWebsite,
        registrationInfo: j.employerRegistrationInfo,
        sourcesSeen: [j.sourceName],
        verificationStatus: j.employerVerificationStatus,
        totalDiscoveredAds: 1,
        verifiedPublishedCount: j.status === 'verified' ? 1 : 0,
        suspiciousCount: j.status === 'suspicious' ? 1 : 0,
        rejectedCount: j.status === 'rejected' ? 1 : 0,
        lastDiscoveredAt: j.discoveredAt,
      });
    } else {
      existing.totalDiscoveredAds += 1;
      if (j.status === 'verified') existing.verifiedPublishedCount += 1;
      if (j.status === 'suspicious') existing.suspiciousCount += 1;
      if (j.status === 'rejected') existing.rejectedCount += 1;
      if (!existing.companyAddress && j.employerAddress) existing.companyAddress = j.employerAddress;
      if (!existing.officialWebsite && j.employerWebsite) existing.officialWebsite = j.employerWebsite;
      if (!existing.registrationInfo && j.employerRegistrationInfo) existing.registrationInfo = j.employerRegistrationInfo;
      if (j.employerPhone && !existing.contactPhones.includes(j.employerPhone)) existing.contactPhones.push(j.employerPhone);
      if (j.employerEmail && !existing.contactEmails.includes(j.employerEmail)) existing.contactEmails.push(j.employerEmail);
      if (!existing.sourcesSeen.includes(j.sourceName)) existing.sourcesSeen.push(j.sourceName);
      if (j.employerVerificationStatus === 'confirmed_by_admin') {
        existing.verificationStatus = 'confirmed_by_admin';
      } else if (j.employerVerificationStatus === 'flagged' && existing.verificationStatus !== 'confirmed_by_admin') {
        existing.verificationStatus = 'flagged';
      } else if (j.employerVerificationStatus === 'info_requested' && existing.verificationStatus === 'unverified') {
        existing.verificationStatus = 'info_requested';
      }
      if (j.discoveredAt > existing.lastDiscoveredAt) {
        existing.lastDiscoveredAt = j.discoveredAt;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.lastDiscoveredAt.localeCompare(a.lastDiscoveredAt));
}

// =========================================================================
// INTEGRATION ACTIVATION TOGGLES (INDEPENDENT PER-SERVICE ADMIN CONTROLS)
// =========================================================================
const DEFAULT_INTEGRATION_IDS: IntegrationServiceId[] = [
  'africastalking_sms',
  'whatsapp_cloud',
  'ussd_gateway',
  'google_custom_search',
  'serpapi_jobs',
  'gemini_ai',
  'web_push',
];

export function listIntegrationToggles(): Record<IntegrationServiceId, { enabled: boolean; updatedAt: string }> {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const rows = db
    .prepare('SELECT service_id, enabled, updated_at FROM integration_settings')
    .all() as Array<{ service_id: string; enabled: number; updated_at: string }>;

  const map = new Map(rows.map((r) => [r.service_id, { enabled: Boolean(r.enabled), updatedAt: r.updated_at }]));
  const result = {} as Record<IntegrationServiceId, { enabled: boolean; updatedAt: string }>;

  for (const id of DEFAULT_INTEGRATION_IDS) {
    const existing = map.get(id);
    if (existing) {
      result[id] = existing;
    } else {
      db.prepare(
        'INSERT OR IGNORE INTO integration_settings (service_id, enabled, updated_at) VALUES (?, 1, ?)'
      ).run(id, nowIso);
      result[id] = { enabled: true, updatedAt: nowIso };
    }
  }
  return result;
}

export function getIntegrationToggle(serviceId: IntegrationServiceId): boolean {
  const db = getDb();
  const row = db
    .prepare('SELECT enabled FROM integration_settings WHERE service_id = ?')
    .get(serviceId) as { enabled: number } | undefined;
  if (!row) return true;
  return Boolean(row.enabled);
}

export function setIntegrationToggle(
  serviceId: IntegrationServiceId,
  enabled: boolean
): { serviceId: IntegrationServiceId; enabled: boolean; updatedAt: string } {
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.prepare(`
    INSERT INTO integration_settings (service_id, enabled, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(service_id) DO UPDATE SET
      enabled = excluded.enabled,
      updated_at = excluded.updated_at
  `).run(serviceId, enabled ? 1 : 0, nowIso);
  return { serviceId, enabled, updatedAt: nowIso };
}

// =========================================================================
// AUTOMATED WELCOME & REGISTRATION NOTIFICATION HELPERS
// =========================================================================
const DEFAULT_RIDER_WELCOME_TEMPLATE =
  'Welcome to {{brandName}}, {{name}}! Your {{category}} account ({{memberId}}) was registered on {{registrationDate}} in {{location}}. Stay verified for safe trips & boda jobs in Luweero! Help: 0772100240.';

const DEFAULT_PASSENGER_WELCOME_TEMPLATE =
  'Welcome to {{brandName}}, {{name}}! Your {{category}} account ({{memberId}}) was registered on {{registrationDate}} ({{location}}). Enjoy safe rides with verified boda riders across Luweero District. Help: 0772100240.';

export function getWelcomeSettings(): WelcomeSettingsConfig {
  const db = getDb();
  const row = db
    .prepare("SELECT data_json FROM welcome_settings WHERE id = 'default'")
    .get() as { data_json: string } | undefined;
  if (row) {
    const parsed = JSON.parse(row.data_json) as WelcomeSettingsConfig;
    return {
      id: 'default',
      enabled: parsed.enabled !== false,
      smsEnabled: parsed.smsEnabled !== false,
      whatsappEnabled: parsed.whatsappEnabled !== false,
      inAppEnabled: parsed.inAppEnabled !== false,
      riderTemplate: parsed.riderTemplate || DEFAULT_RIDER_WELCOME_TEMPLATE,
      passengerTemplate: parsed.passengerTemplate || DEFAULT_PASSENGER_WELCOME_TEMPLATE,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  }
  const nowIso = new Date().toISOString();
  const initial: WelcomeSettingsConfig = {
    id: 'default',
    enabled: true,
    smsEnabled: true,
    whatsappEnabled: true,
    inAppEnabled: true,
    riderTemplate: DEFAULT_RIDER_WELCOME_TEMPLATE,
    passengerTemplate: DEFAULT_PASSENGER_WELCOME_TEMPLATE,
    updatedAt: nowIso,
  };
  db.prepare(
    "INSERT OR IGNORE INTO welcome_settings (id, updated_at, data_json) VALUES ('default', ?, ?)"
  ).run(nowIso, JSON.stringify(initial));
  return initial;
}

export function saveWelcomeSettings(cfg: Partial<WelcomeSettingsConfig>): WelcomeSettingsConfig {
  const db = getDb();
  const current = getWelcomeSettings();
  const updatedAt = new Date().toISOString();
  const merged: WelcomeSettingsConfig = {
    id: 'default',
    enabled: cfg.enabled ?? current.enabled,
    smsEnabled: cfg.smsEnabled ?? current.smsEnabled,
    whatsappEnabled: cfg.whatsappEnabled ?? current.whatsappEnabled,
    inAppEnabled: cfg.inAppEnabled ?? current.inAppEnabled,
    riderTemplate: cfg.riderTemplate?.trim() || current.riderTemplate,
    passengerTemplate: cfg.passengerTemplate?.trim() || current.passengerTemplate,
    updatedAt,
  };
  db.prepare(`
    INSERT INTO welcome_settings (id, updated_at, data_json)
    VALUES ('default', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(updatedAt, JSON.stringify(merged));
  return merged;
}

export function hasInitialWelcomeSent(
  recipientId: string,
  accountCategory: WelcomeAccountCategory,
  channel: WelcomeChannel
): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id FROM welcome_notifications
       WHERE recipient_id = ? AND account_category = ? AND channel = ?
       AND is_resend = 0
       AND status IN ('pending', 'queued', 'sent', 'delivered', 'blocked_unconfigured')
       LIMIT 1`
    )
    .get(recipientId, accountCategory, channel) as { id: string } | undefined;
  return Boolean(row);
}

export function upsertWelcomeNotification(rec: WelcomeNotificationRecord): WelcomeNotificationRecord {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const normalized: WelcomeNotificationRecord = {
    ...rec,
    createdAt: rec.createdAt || nowIso,
    updatedAt: rec.updatedAt || nowIso,
  };
  db.prepare(`
    INSERT INTO welcome_notifications (
      id, recipient_id, account_category, channel, status, is_resend,
      registration_date, created_at, updated_at, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      updated_at = excluded.updated_at,
      data_json = excluded.data_json
  `).run(
    normalized.id,
    normalized.recipientId,
    normalized.accountCategory,
    normalized.channel,
    normalized.status,
    normalized.isResend ? 1 : 0,
    normalized.registrationDate,
    normalized.createdAt,
    normalized.updatedAt,
    JSON.stringify(normalized)
  );
  return normalized;
}

export function getWelcomeNotificationById(id: string): WelcomeNotificationRecord | null {
  const db = getDb();
  const row = db
    .prepare('SELECT data_json FROM welcome_notifications WHERE id = ?')
    .get(id) as { data_json: string } | undefined;
  return row ? (JSON.parse(row.data_json) as WelcomeNotificationRecord) : null;
}

export function listWelcomeNotifications(options?: {
  accountCategory?: WelcomeAccountCategory | 'all';
  channel?: WelcomeChannel | 'all';
  status?: string;
  limit?: number;
}): WelcomeNotificationRecord[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (options?.accountCategory && options.accountCategory !== 'all') {
    clauses.push('account_category = ?');
    params.push(options.accountCategory);
  }
  if (options?.channel && options.channel !== 'all') {
    clauses.push('channel = ?');
    params.push(options.channel);
  }
  if (options?.status && options.status !== 'all') {
    clauses.push('status = ?');
    params.push(options.status);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = options?.limit ?? 300;
  params.push(limit);

  const rows = db
    .prepare(`SELECT data_json FROM welcome_notifications ${whereSql} ORDER BY created_at DESC LIMIT ?`)
    .all(...params) as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as WelcomeNotificationRecord);
}

// =========================================================================
// SYSTEM RESET, REVOCATION, BACKUP & MEMBERSHIP CLEANUP
// =========================================================================

export function getSystemMeta(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM system_meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setSystemMeta(key: string, value: string): void {
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.prepare(`
    INSERT INTO system_meta (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, nowIso);
}

export function upsertRevokedAccount(entry: Omit<RevokedAccountRecord, 'id'> & { id?: string }): RevokedAccountRecord {
  const db = getDb();
  const normPhone = entry.phone ? normalizePhoneKey(entry.phone) : entry.normalizedPhone || '';
  const cleanEmail = (entry.email || '').trim().toLowerCase();
  const id = entry.id || `rev-${entry.category}-${entry.recordId}-${Date.now().toString(36)}`;
  const record: RevokedAccountRecord = {
    id,
    recordId: entry.recordId,
    category: entry.category,
    fullName: entry.fullName,
    phone: entry.phone || '',
    normalizedPhone: normPhone,
    email: cleanEmail,
    reason: entry.reason,
    revokedBy: entry.revokedBy,
    revokedAt: entry.revokedAt || new Date().toISOString(),
  };

  // Avoid creating duplicate active revocation rows for the exact same normalized phone or email
  if (normPhone) {
    db.prepare('DELETE FROM revoked_accounts WHERE normalized_phone = ?').run(normPhone);
  }
  if (cleanEmail) {
    db.prepare('DELETE FROM revoked_accounts WHERE LOWER(email) = ? AND email != \'\'').run(cleanEmail);
  }

  db.prepare(`
    INSERT INTO revoked_accounts (
      id, record_id, category, full_name, phone, normalized_phone,
      email, reason, revoked_by, revoked_at, data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      reason = excluded.reason,
      revoked_by = excluded.revoked_by,
      revoked_at = excluded.revoked_at,
      data_json = excluded.data_json
  `).run(
    record.id,
    record.recordId,
    record.category,
    record.fullName,
    record.phone || '',
    normPhone,
    cleanEmail,
    record.reason,
    record.revokedBy,
    record.revokedAt,
    JSON.stringify(record)
  );
  return record;
}

export function listRevokedAccounts(limit = 300): RevokedAccountRecord[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT data_json FROM revoked_accounts ORDER BY revoked_at DESC LIMIT ?')
    .all(limit) as { data_json: string }[];
  return rows.map((r) => JSON.parse(r.data_json) as RevokedAccountRecord);
}

export function isAccountRevoked(lookup: { id?: string; phone?: string; email?: string }): RevokedAccountRecord | null {
  const db = getDb();
  const normPhone = lookup.phone ? normalizePhoneKey(lookup.phone) : '';
  const cleanEmail = (lookup.email || '').trim().toLowerCase();
  const cleanId = (lookup.id || '').trim();

  if (cleanId) {
    const byId = db
      .prepare('SELECT data_json FROM revoked_accounts WHERE record_id = ? LIMIT 1')
      .get(cleanId) as { data_json: string } | undefined;
    if (byId) return JSON.parse(byId.data_json) as RevokedAccountRecord;
  }
  if (normPhone) {
    const byPhone = db
      .prepare('SELECT data_json FROM revoked_accounts WHERE normalized_phone = ? LIMIT 1')
      .get(normPhone) as { data_json: string } | undefined;
    if (byPhone) return JSON.parse(byPhone.data_json) as RevokedAccountRecord;
  }
  if (cleanEmail) {
    const byEmail = db
      .prepare('SELECT data_json FROM revoked_accounts WHERE LOWER(email) = ? LIMIT 1')
      .get(cleanEmail) as { data_json: string } | undefined;
    if (byEmail) return JSON.parse(byEmail.data_json) as RevokedAccountRecord;
  }
  return null;
}

export function unrevokeByPhoneOrEmail(phone?: string, email?: string, recordId?: string): number {
  const db = getDb();
  let removed = 0;
  const normPhone = phone ? normalizePhoneKey(phone) : '';
  const cleanEmail = (email || '').trim().toLowerCase();
  if (normPhone) {
    removed += Number(db.prepare('DELETE FROM revoked_accounts WHERE normalized_phone = ?').run(normPhone).changes || 0);
  }
  if (cleanEmail) {
    removed += Number(db.prepare('DELETE FROM revoked_accounts WHERE LOWER(email) = ?').run(cleanEmail).changes || 0);
  }
  if (recordId) {
    removed += Number(db.prepare('DELETE FROM revoked_accounts WHERE id = ? OR record_id = ?').run(recordId, recordId).changes || 0);
  }
  return removed;
}

export function deleteEntityWithCleanup(
  category: ResetCategoryId,
  id: string,
  actor: { id: string; name: string },
  reason = 'Removed via Super Admin Membership Management'
): { deleted: boolean; label: string; revoked: boolean; error?: string } {
  const db = getDb();
  const nowIso = new Date().toISOString();

  if (category === 'riders') {
    const rider = getRiderById(id);
    if (!rider) return { deleted: false, label: id, revoked: false, error: 'Rider not found' };
    const prevStageId = rider.stageId;
    db.prepare('DELETE FROM riders WHERE id = ?').run(id);
    db.prepare('DELETE FROM ussd_sessions WHERE rider_id = ?').run(id);
    db.prepare('DELETE FROM notifications WHERE user_id = ? OR user_id = ?').run(id, rider.userId || id);
    db.prepare('DELETE FROM welcome_notifications WHERE recipient_id = ? AND account_category = ?').run(id, 'rider');
    upsertRevokedAccount({
      recordId: id,
      category: 'riders',
      fullName: rider.fullName,
      phone: rider.phone,
      reason,
      revokedBy: actor.name,
      revokedAt: nowIso,
    });
    if (prevStageId) {
      const stageRow = db.prepare('SELECT data_json FROM stages WHERE id = ?').get(prevStageId) as { data_json: string } | undefined;
      if (stageRow) {
        const st = JSON.parse(stageRow.data_json) as Stage;
        const cnt = (db.prepare('SELECT COUNT(*) as cnt FROM riders WHERE stage_id = ?').get(prevStageId) as { cnt: number }).cnt;
        upsertStageRecord({ ...st, memberCount: cnt }, true);
      }
    }
    return { deleted: true, label: `${rider.fullName} (${rider.riderIdNumber})`, revoked: true };
  }

  if (category === 'passengers') {
    const passenger = listPassengers().find((p) => p.id === id);
    if (!passenger) return { deleted: false, label: id, revoked: false, error: 'Passenger not found' };
    db.prepare('DELETE FROM passengers WHERE id = ?').run(id);
    db.prepare('DELETE FROM notifications WHERE user_id = ? OR user_id = ?').run(id, passenger.userId || id);
    db.prepare('DELETE FROM welcome_notifications WHERE recipient_id = ? AND account_category = ?').run(id, 'passenger');
    upsertRevokedAccount({
      recordId: id,
      category: 'passengers',
      fullName: passenger.fullName,
      phone: passenger.phone,
      reason,
      revokedBy: actor.name,
      revokedAt: nowIso,
    });
    return { deleted: true, label: `${passenger.fullName} (${passenger.passengerIdNumber || id})`, revoked: true };
  }

  if (category === 'stages') {
    const stage = listStages().find((s) => s.id === id);
    if (!stage) return { deleted: false, label: id, revoked: false, error: 'Stage not found' };
    db.prepare('DELETE FROM stages WHERE id = ?').run(id);
    // Prevent orphaned stage references on remaining riders
    const affectedRiders = db.prepare('SELECT data_json FROM riders WHERE stage_id = ?').all(id) as { data_json: string }[];
    for (const row of affectedRiders) {
      const r = JSON.parse(row.data_json) as RiderProfile;
      upsertRiderRecord(
        {
          ...r,
          stageId: '',
          stageName: 'Unassigned (Pending Stage)',
        },
        true
      );
    }
    if (stage.leaderPhone) {
      upsertRevokedAccount({
        recordId: id,
        category: 'stages',
        fullName: `${stage.name} (${stage.leaderName})`,
        phone: stage.leaderPhone,
        reason,
        revokedBy: actor.name,
        revokedAt: nowIso,
      });
    }
    return { deleted: true, label: `${stage.name} (${stage.stageCode || id})`, revoked: Boolean(stage.leaderPhone) };
  }

  if (category === 'swap_stations') {
    const station = listSwapStations().find((s) => s.id === id);
    if (!station) return { deleted: false, label: id, revoked: false, error: 'Swap station not found' };
    db.prepare('DELETE FROM swap_stations WHERE id = ?').run(id);
    if (station.operatorPhone) {
      upsertRevokedAccount({
        recordId: id,
        category: 'swap_stations',
        fullName: `${station.name} (${station.operatorName})`,
        phone: station.operatorPhone,
        reason,
        revokedBy: actor.name,
        revokedAt: nowIso,
      });
    }
    return { deleted: true, label: `${station.name} (${station.stationCode || id})`, revoked: Boolean(station.operatorPhone) };
  }

  if (category === 'maintenance_centres') {
    const centre = listMaintenanceCentres().find((c) => c.id === id);
    if (!centre) return { deleted: false, label: id, revoked: false, error: 'Maintenance centre not found' };
    db.prepare('DELETE FROM maintenance_centres WHERE id = ?').run(id);
    if (centre.phone) {
      upsertRevokedAccount({
        recordId: id,
        category: 'maintenance_centres',
        fullName: `${centre.name} (${centre.ownerName})`,
        phone: centre.phone,
        reason,
        revokedBy: actor.name,
        revokedAt: nowIso,
      });
    }
    return { deleted: true, label: `${centre.name} (${centre.centreCode || id})`, revoked: Boolean(centre.phone) };
  }

  if (category === 'jobs') {
    const job = listJobs().find((j) => j.id === id);
    if (!job) return { deleted: false, label: id, revoked: false, error: 'Job opportunity not found' };
    db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
    db.prepare('DELETE FROM job_notification_deliveries WHERE job_id = ?').run(id);
    db.prepare('DELETE FROM job_broadcasts WHERE job_id = ?').run(id);
    db.prepare('DELETE FROM sms_campaigns WHERE job_id = ?').run(id);
    return { deleted: true, label: `${job.title} (${job.employerCompany})`, revoked: false };
  }

  if (category === 'discovered_jobs') {
    const row = db.prepare('SELECT id, data_json FROM discovered_jobs WHERE id = ?').get(id) as
      | { id: string; data_json: string }
      | undefined;
    if (!row) return { deleted: false, label: id, revoked: false, error: 'Discovered job not found' };
    const parsed = JSON.parse(row.data_json) as DiscoveredJobRecord;
    db.prepare('DELETE FROM discovered_jobs WHERE id = ?').run(id);
    return { deleted: true, label: `${parsed.title} (${parsed.employerName})`, revoked: false };
  }

  if (category === 'non_super_admins') {
    const adm = getAdminById(id);
    if (!adm) return { deleted: false, label: id, revoked: false, error: 'Admin account not found' };
    if (adm.id === 'admin-founder-mukisa' || adm.role === 'super_admin') {
      return {
        deleted: false,
        label: adm.fullName,
        revoked: false,
        error: 'Founder & Super Admin accounts are strictly protected and cannot be deleted.',
      };
    }
    db.prepare('DELETE FROM admin_accounts WHERE id = ?').run(id);
    upsertRevokedAccount({
      recordId: id,
      category: 'non_super_admins',
      fullName: adm.fullName,
      phone: adm.phone,
      email: adm.email,
      reason,
      revokedBy: actor.name,
      revokedAt: nowIso,
    });
    return { deleted: true, label: `${adm.fullName} (${adm.role})`, revoked: true };
  }

  return { deleted: false, label: id, revoked: false, error: 'Unsupported category' };
}

export function buildMembershipBackupSnapshot(actorName: string) {
  const riders = listRiders();
  const passengers = listPassengers();
  const stages = listStages();
  const swapStations = listSwapStations();
  const maintenanceCentres = listMaintenanceCentres();
  const jobs = listJobs();
  const discoveredJobs = listDiscoveredJobs({ limit: 500 });
  const nonSuperAdmins = listAdminAccounts().filter(
    (a) => a.role !== 'super_admin' && a.id !== 'admin-founder-mukisa'
  );
  const welcomeNotifications = listWelcomeNotifications({ limit: 500 });
  const revokedAccounts = listRevokedAccounts(500);
  const auditLogsCount = (getDb().prepare('SELECT COUNT(*) as cnt FROM audit_logs').get() as { cnt: number }).cnt;

  return {
    exportedAt: new Date().toISOString(),
    exportedBy: actorName,
    schemaVersion: 'bodacare-uganda-membership-v1',
    preservedNotice:
      'Super Admin account (admin-founder-mukisa), Payment Submissions, Financial Transaction History, and Audit Logs are always preserved on System Reset.',
    counts: {
      riders: riders.length,
      passengers: passengers.length,
      stages: stages.length,
      swap_stations: swapStations.length,
      maintenance_centres: maintenanceCentres.length,
      jobs: jobs.length,
      discovered_jobs: discoveredJobs.length,
      non_super_admins: nonSuperAdmins.length,
      auditLogsPreserved: auditLogsCount,
    },
    data: {
      riders,
      passengers,
      stages,
      swapStations,
      maintenanceCentres,
      jobs,
      discoveredJobs,
      nonSuperAdmins,
      welcomeNotifications,
      revokedAccounts,
    },
  };
}

export function buildSystemResetOverview(): SystemResetOverviewPayload {
  const db = getDb();
  const riders = listRiders();
  const passengers = listPassengers();
  const stages = listStages();
  const stations = listSwapStations();
  const centres = listMaintenanceCentres();
  const jobs = listJobs();
  const discoveredJobs = listDiscoveredJobs({ limit: 500 });
  const nonSuperAdmins = listAdminAccounts().filter(
    (a) => a.role !== 'super_admin' && a.id !== 'admin-founder-mukisa'
  );

  const itemsByCategory: Record<ResetCategoryId, SystemResetOverviewItem[]> = {
    riders: riders.map((r) => ({
      id: r.id,
      category: 'riders',
      title: r.fullName,
      subtitle: `${r.phone} • ${r.motorcycleReg} (${r.motorcycleType})`,
      location: `${r.stageName || 'Unassigned'}, ${r.subCounty || r.district || 'Luweero'}`,
      status: `${r.accountStatus || 'active'} (${r.verificationStatus})`,
      avatarUrl: r.avatarUrl,
      createdAt: r.registrationDate || r.updatedAt,
    })),
    passengers: passengers.map((p) => ({
      id: p.id,
      category: 'passengers',
      title: p.fullName,
      subtitle: `${p.phone} • ${p.passengerIdNumber || p.id}`,
      location: `${p.residentialArea || p.village || ''}, ${p.subCounty || p.district || 'Luweero'}`,
      status: `${p.accountStatus || 'active'} (${p.verificationStatus || 'verified'})`,
      avatarUrl: p.avatarUrl,
      createdAt: p.createdAt || p.updatedAt,
    })),
    stages: stages.map((s) => ({
      id: s.id,
      category: 'stages',
      title: s.name,
      subtitle: `Leader: ${s.leaderName} (${s.leaderPhone})`,
      location: `${s.subCounty}, ${s.district}`,
      status: `${s.operatingStatus || 'active'} • ${s.memberCount} riders`,
      createdAt: s.createdAt || s.updatedAt,
    })),
    swap_stations: stations.map((st) => ({
      id: st.id,
      category: 'swap_stations',
      title: st.name,
      subtitle: `${st.batteryBrand} • Op: ${st.operatorName} (${st.operatorPhone})`,
      location: `${st.locationName}, ${st.subCounty}`,
      status: `${st.status} (${st.availableBatteries}/${st.totalBatteries})`,
      createdAt: st.createdAt || st.updatedAt,
    })),
    maintenance_centres: centres.map((c) => ({
      id: c.id,
      category: 'maintenance_centres',
      title: c.name,
      subtitle: `${c.ownerName} (${c.phone}) • ${c.category}`,
      location: `${c.location}, ${c.subCounty || c.district || 'Luweero'}`,
      status: `${c.accountStatus || 'active'}${c.verified ? ' • Verified' : ''}`,
      avatarUrl: c.imageUrl,
      createdAt: c.createdAt || c.updatedAt,
    })),
    jobs: jobs.map((j) => ({
      id: j.id,
      category: 'jobs',
      title: j.title,
      subtitle: `${j.employerCompany} (${j.employerPhone})`,
      location: `${j.pickupLocation} (${j.subCounty})`,
      status: `${j.status}${j.adminApproved ? ' • Verified' : ' • Unverified'}`,
      createdAt: j.postedDate || j.updatedAt,
    })),
    discovered_jobs: discoveredJobs.map((d) => ({
      id: d.id,
      category: 'discovered_jobs',
      title: d.title,
      subtitle: `${d.employerName} • ${d.sourceName}`,
      location: `${d.district || d.rawLocation}`,
      status: d.status,
      createdAt: d.discoveredAt,
    })),
    non_super_admins: nonSuperAdmins.map((a) => ({
      id: a.id,
      category: 'non_super_admins',
      title: a.fullName,
      subtitle: `${a.email} • ${a.phone}`,
      location: a.role,
      status: a.status,
      createdAt: a.createdAt,
    })),
  };

  const counts: Record<ResetCategoryId, number> = {
    riders: riders.length,
    passengers: passengers.length,
    stages: stages.length,
    swap_stations: stations.length,
    maintenance_centres: centres.length,
    jobs: jobs.length,
    discovered_jobs: discoveredJobs.length,
    non_super_admins: nonSuperAdmins.length,
  };

  const dependentCounts = {
    ussdSessions: (db.prepare('SELECT COUNT(*) as cnt FROM ussd_sessions').get() as { cnt: number }).cnt,
    welcomeNotifications: (db.prepare('SELECT COUNT(*) as cnt FROM welcome_notifications').get() as { cnt: number }).cnt,
    memberNotifications: (
      db
        .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE user_id != 'admin-founder-mukisa' AND user_id != 'user-founder-01'")
        .get() as { cnt: number }
    ).cnt,
    jobDeliveries: (db.prepare('SELECT COUNT(*) as cnt FROM job_notification_deliveries').get() as { cnt: number }).cnt,
    assignedRiderStageLinks: riders.filter((r) => Boolean(r.stageId)).length,
    pushSubscriptions: (
      db.prepare("SELECT COUNT(*) as cnt FROM push_subscriptions WHERE role != 'super_admin'").get() as { cnt: number }
    ).cnt,
  };

  const totalRemovable = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const superAdmin = getAdminById('admin-founder-mukisa');
  const auditLogsCount = (db.prepare('SELECT COUNT(*) as cnt FROM audit_logs').get() as { cnt: number }).cnt;
  const resetAuditLogs = listAuditLogs(100).filter(
    (log) =>
      log.action.includes('RESET') ||
      log.action.includes('DELETED') ||
      log.action.includes('REVOKED') ||
      log.action.includes('BACKUP') ||
      log.action.includes('SELECTIVE')
  );

  return {
    counts,
    totalRemovable,
    dependentCounts,
    itemsByCategory,
    revokedAccounts: listRevokedAccounts(250),
    resetAuditLogs,
    lastResetAt: getSystemMeta('membership_reset_at'),
    lastResetBy: getSystemMeta('membership_reset_by'),
    protectedRecords: {
      superAdminEmail: superAdmin?.email || 'bmukisa@bodawerk.co.ug',
      auditLogsCount,
      financialRecordsPreserved: true,
    },
  };
}

export function performCategoryReset(opts: {
  actorId: string;
  actorName: string;
  categories: ResetCategoryId[];
  reason?: string;
}): {
  deletedCount: number;
  revokedCount: number;
  resetAt: string;
  clearedCategories: ResetCategoryId[];
  details: string;
} {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const uniqueCats = Array.from(new Set(opts.categories));
  const reason = opts.reason?.trim() || `Category reset (${uniqueCats.join(', ')}) by Super Admin`;

  let deletedCount = 0;
  let revokedCount = 0;
  const summaryParts: string[] = [];

  db.exec('BEGIN IMMEDIATE');
  try {
    if (uniqueCats.includes('riders')) {
      const riders = listRiders();
      for (const r of riders) {
        upsertRevokedAccount({
          recordId: r.id,
          category: 'riders',
          fullName: r.fullName,
          phone: r.phone,
          reason,
          revokedBy: opts.actorName,
          revokedAt: nowIso,
        });
        revokedCount++;
      }
      const deletedRiders = Number(db.prepare('DELETE FROM riders').run().changes || 0);
      deletedCount += deletedRiders;
      db.prepare('DELETE FROM ussd_sessions').run();
      db.prepare("DELETE FROM welcome_notifications WHERE account_category = 'rider'").run();
      db.prepare("DELETE FROM notifications WHERE user_id != 'admin-founder-mukisa' AND user_id != 'user-founder-01'").run();
      db.prepare("DELETE FROM push_subscriptions WHERE role = 'rider'").run();

      // Update member counts on any remaining stages to 0
      if (!uniqueCats.includes('stages')) {
        for (const st of listStages()) {
          upsertStageRecord({ ...st, memberCount: 0 }, true);
        }
      }
      summaryParts.push(`${deletedRiders} rider(s)`);
    }

    if (uniqueCats.includes('passengers')) {
      const passengers = listPassengers();
      for (const p of passengers) {
        upsertRevokedAccount({
          recordId: p.id,
          category: 'passengers',
          fullName: p.fullName,
          phone: p.phone,
          reason,
          revokedBy: opts.actorName,
          revokedAt: nowIso,
        });
        revokedCount++;
      }
      const deletedPass = Number(db.prepare('DELETE FROM passengers').run().changes || 0);
      deletedCount += deletedPass;
      db.prepare("DELETE FROM welcome_notifications WHERE account_category = 'passenger'").run();
      db.prepare("DELETE FROM push_subscriptions WHERE role = 'passenger'").run();
      summaryParts.push(`${deletedPass} passenger(s)`);
    }

    if (uniqueCats.includes('stages')) {
      const stages = listStages();
      for (const stg of stages) {
        if (stg.leaderPhone) {
          upsertRevokedAccount({
            recordId: stg.id,
            category: 'stages',
            fullName: `${stg.name} (${stg.leaderName})`,
            phone: stg.leaderPhone,
            reason,
            revokedBy: opts.actorName,
            revokedAt: nowIso,
          });
          revokedCount++;
        }
      }
      const deletedStages = Number(db.prepare('DELETE FROM stages').run().changes || 0);
      deletedCount += deletedStages;
      db.prepare("DELETE FROM push_subscriptions WHERE role = 'stage_leader'").run();
      // If riders were not deleted in the same transaction, detach their stage assignments cleanly
      if (!uniqueCats.includes('riders')) {
        for (const r of listRiders()) {
          if (r.stageId) {
            upsertRiderRecord({ ...r, stageId: '', stageName: 'Unassigned (Pending Stage)' }, true);
          }
        }
      }
      summaryParts.push(`${deletedStages} boda stage(s)`);
    }

    if (uniqueCats.includes('swap_stations')) {
      const stations = listSwapStations();
      for (const st of stations) {
        if (st.operatorPhone) {
          upsertRevokedAccount({
            recordId: st.id,
            category: 'swap_stations',
            fullName: `${st.name} (${st.operatorName})`,
            phone: st.operatorPhone,
            reason,
            revokedBy: opts.actorName,
            revokedAt: nowIso,
          });
          revokedCount++;
        }
      }
      const deletedStations = Number(db.prepare('DELETE FROM swap_stations').run().changes || 0);
      deletedCount += deletedStations;
      db.prepare("DELETE FROM push_subscriptions WHERE role = 'station_operator'").run();
      summaryParts.push(`${deletedStations} swap station(s)`);
    }

    if (uniqueCats.includes('maintenance_centres')) {
      const centres = listMaintenanceCentres();
      for (const c of centres) {
        if (c.phone) {
          upsertRevokedAccount({
            recordId: c.id,
            category: 'maintenance_centres',
            fullName: `${c.name} (${c.ownerName})`,
            phone: c.phone,
            reason,
            revokedBy: opts.actorName,
            revokedAt: nowIso,
          });
          revokedCount++;
        }
      }
      const deletedCentres = Number(db.prepare('DELETE FROM maintenance_centres').run().changes || 0);
      deletedCount += deletedCentres;
      db.prepare("DELETE FROM push_subscriptions WHERE role = 'mechanic'").run();
      summaryParts.push(`${deletedCentres} maintenance centre(s)`);
    }

    if (uniqueCats.includes('jobs')) {
      const deletedJobs = Number(db.prepare('DELETE FROM jobs').run().changes || 0);
      deletedCount += deletedJobs;
      db.prepare('DELETE FROM job_notification_deliveries').run();
      db.prepare('DELETE FROM job_broadcasts').run();
      db.prepare('DELETE FROM sms_campaigns').run();
      summaryParts.push(`${deletedJobs} job(s)`);
    }

    if (uniqueCats.includes('discovered_jobs')) {
      const deletedDisc = Number(db.prepare('DELETE FROM discovered_jobs').run().changes || 0);
      deletedCount += deletedDisc;
      summaryParts.push(`${deletedDisc} discovered job(s)`);
    }

    if (uniqueCats.includes('non_super_admins')) {
      const nonSuperAdmins = listAdminAccounts().filter(
        (a) => a.role !== 'super_admin' && a.id !== 'admin-founder-mukisa'
      );
      for (const adm of nonSuperAdmins) {
        upsertRevokedAccount({
          recordId: adm.id,
          category: 'non_super_admins',
          fullName: adm.fullName,
          phone: adm.phone,
          email: adm.email,
          reason,
          revokedBy: opts.actorName,
          revokedAt: nowIso,
        });
        revokedCount++;
      }
      const deletedAdmins = Number(
        db.prepare("DELETE FROM admin_accounts WHERE role != 'super_admin' AND id != 'admin-founder-mukisa'").run().changes || 0
      );
      deletedCount += deletedAdmins;
      summaryParts.push(`${deletedAdmins} delegated sub-admin(s)`);
    }

    setSystemMeta('initial_seed_completed', '1');
    setSystemMeta('membership_reset_at', nowIso);
    setSystemMeta('membership_reset_by', opts.actorName);

    const details =
      `Category reset executed by ${opts.actorName}. Cleared ${summaryParts.join(', ')}. ` +
      `Revoked ${revokedCount} access credential(s). Protected: Brian Mukisa Super Admin, payments, transactions, branding, and audit logs.`;

    insertAuditLog({
      actorId: opts.actorId,
      actorName: opts.actorName,
      actorRole: 'super_admin',
      action: 'SYSTEM_CATEGORY_RESET',
      category: 'security',
      targetId: `category-reset:${uniqueCats.join(',')}`,
      targetLabel: `Removed ${deletedCount} record(s) across ${uniqueCats.join(', ')}`,
      details,
    });

    db.exec('COMMIT');
    return {
      deletedCount,
      revokedCount,
      resetAt: nowIso,
      clearedCategories: uniqueCats,
      details,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    throw err;
  }
}

export function performCompleteMembershipReset(opts: {
  actorId: string;
  actorName: string;
  includeJobs?: boolean;
  reason?: string;
}): {
  deletedCount: number;
  revokedCount: number;
  resetAt: string;
  details: string;
} {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const includeJobs = opts.includeJobs !== false;
  const reason = opts.reason?.trim() || 'Complete Membership & Directory Reset by Super Admin';

  const riders = listRiders();
  const passengers = listPassengers();
  const stages = listStages();
  const stations = listSwapStations();
  const centres = listMaintenanceCentres();
  const jobs = listJobs();
  const discoveredJobs = listDiscoveredJobs({ limit: 1000 });
  const nonSuperAdmins = listAdminAccounts().filter(
    (a) => a.role !== 'super_admin' && a.id !== 'admin-founder-mukisa'
  );

  let deletedCount = 0;
  let revokedCount = 0;

  db.exec('BEGIN IMMEDIATE');
  try {
    // 1. Revoke existing member & sub-admin access immediately
    for (const r of riders) {
      upsertRevokedAccount({
        recordId: r.id,
        category: 'riders',
        fullName: r.fullName,
        phone: r.phone,
        reason,
        revokedBy: opts.actorName,
        revokedAt: nowIso,
      });
      revokedCount++;
    }
    for (const p of passengers) {
      upsertRevokedAccount({
        recordId: p.id,
        category: 'passengers',
        fullName: p.fullName,
        phone: p.phone,
        reason,
        revokedBy: opts.actorName,
        revokedAt: nowIso,
      });
      revokedCount++;
    }
    for (const c of centres) {
      if (c.phone) {
        upsertRevokedAccount({
          recordId: c.id,
          category: 'maintenance_centres',
          fullName: `${c.name} (${c.ownerName})`,
          phone: c.phone,
          reason,
          revokedBy: opts.actorName,
          revokedAt: nowIso,
        });
        revokedCount++;
      }
    }
    for (const st of stations) {
      if (st.operatorPhone) {
        upsertRevokedAccount({
          recordId: st.id,
          category: 'swap_stations',
          fullName: `${st.name} (${st.operatorName})`,
          phone: st.operatorPhone,
          reason,
          revokedBy: opts.actorName,
          revokedAt: nowIso,
        });
        revokedCount++;
      }
    }
    for (const stg of stages) {
      if (stg.leaderPhone) {
        upsertRevokedAccount({
          recordId: stg.id,
          category: 'stages',
          fullName: `${stg.name} (${stg.leaderName})`,
          phone: stg.leaderPhone,
          reason,
          revokedBy: opts.actorName,
          revokedAt: nowIso,
        });
        revokedCount++;
      }
    }
    for (const adm of nonSuperAdmins) {
      upsertRevokedAccount({
        recordId: adm.id,
        category: 'non_super_admins',
        fullName: adm.fullName,
        phone: adm.phone,
        email: adm.email,
        reason,
        revokedBy: opts.actorName,
        revokedAt: nowIso,
      });
      revokedCount++;
    }

    // 2. Delete membership, stage, swap station, maintenance centre, session & non-super-admin records
    deletedCount += Number(db.prepare('DELETE FROM riders').run().changes || 0);
    deletedCount += Number(db.prepare('DELETE FROM passengers').run().changes || 0);
    deletedCount += Number(db.prepare('DELETE FROM stages').run().changes || 0);
    deletedCount += Number(db.prepare('DELETE FROM swap_stations').run().changes || 0);
    deletedCount += Number(db.prepare('DELETE FROM maintenance_centres').run().changes || 0);
    deletedCount += Number(
      db.prepare("DELETE FROM admin_accounts WHERE role != 'super_admin' AND id != 'admin-founder-mukisa'").run().changes || 0
    );
    db.prepare('DELETE FROM ussd_sessions').run();
    db.prepare('DELETE FROM welcome_notifications').run();
    db.prepare("DELETE FROM notifications WHERE user_id != 'admin-founder-mukisa' AND user_id != 'user-founder-01'").run();
    db.prepare("DELETE FROM push_subscriptions WHERE role != 'super_admin'").run();

    if (includeJobs) {
      deletedCount += Number(db.prepare('DELETE FROM jobs').run().changes || 0);
      deletedCount += Number(db.prepare('DELETE FROM discovered_jobs').run().changes || 0);
      db.prepare('DELETE FROM job_notification_deliveries').run();
      db.prepare('DELETE FROM job_broadcasts').run();
      db.prepare('DELETE FROM sms_campaigns').run();
    }

    // 3. Persist reset flags so initial demo data NEVER re-seeds on server restart
    setSystemMeta('initial_seed_completed', '1');
    setSystemMeta('membership_reset_at', nowIso);
    setSystemMeta('membership_reset_by', opts.actorName);

    // 4. Preserve audit_logs and append an immutable complete reset audit log entry
    const details =
      `Complete membership reset executed by ${opts.actorName}. Cleared ${riders.length} riders, ${passengers.length} passengers, ` +
      `${stages.length} boda stages, ${stations.length} swap stations, ${centres.length} maintenance centres, ` +
      `${nonSuperAdmins.length} delegated admins` +
      (includeJobs ? `, ${jobs.length} jobs, ${discoveredJobs.length} discovered jobs` : '') +
      `. Protected: Super Admin account, payment submissions, financial transaction logs, branding, and audit logs.`;

    insertAuditLog({
      actorId: opts.actorId,
      actorName: opts.actorName,
      actorRole: 'super_admin',
      action: 'SYSTEM_COMPLETE_MEMBERSHIP_RESET',
      category: 'security',
      targetId: 'system-reset',
      targetLabel: `Removed ${deletedCount} record(s), Revoked ${revokedCount} access credential(s)`,
      details,
    });

    db.exec('COMMIT');
    return { deletedCount, revokedCount, resetAt: nowIso, details };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    throw err;
  }
}

// =========================================================================
// SUPER ADMIN CRYPTOGRAPHIC CREDENTIAL HELPERS (SCRYPT + TIMING-SAFE)
// =========================================================================

export function getSuperAdminCredentialStatus(): {
  configured: boolean;
  requiresSetup: boolean;
  source: 'env' | 'sqlite_scrypt' | 'unset';
  email: string;
  fullName: string;
  phone: string;
} {
  const admin = getAdminById('admin-founder-mukisa');
  const envPass = (process.env.SUPER_ADMIN_PASSCODE || '').trim();
  const storedHash = getSystemMeta('super_admin_passcode_hash');

  let source: 'env' | 'sqlite_scrypt' | 'unset' = 'unset';
  if (envPass.length >= 6) {
    source = 'env';
  } else if (storedHash && storedHash.startsWith('scrypt:')) {
    source = 'sqlite_scrypt';
  }

  return {
    configured: source !== 'unset',
    requiresSetup: source === 'unset',
    source,
    email: admin?.email || 'bmukisa@bodawerk.co.ug',
    fullName: admin?.fullName || 'Brian Mukisa',
    phone: admin?.phone || '+256 772 100 240',
  };
}

export function saveSuperAdminPasscodeHash(passcode: string): void {
  const clean = passcode.trim();
  if (clean.length < 6) {
    throw new Error('Super Admin security passcode must be at least 6 characters.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(clean, salt, 64).toString('hex');
  setSystemMeta('super_admin_passcode_hash', `scrypt:${salt}:${derived}`);
}

export function verifySuperAdminPasscode(passcode: string): boolean {
  const candidate = passcode.trim();
  if (!candidate) return false;

  const envPass = (process.env.SUPER_ADMIN_PASSCODE || '').trim();
  if (envPass.length >= 6) {
    const a = crypto.createHash('sha256').update(candidate).digest();
    const b = crypto.createHash('sha256').update(envPass).digest();
    return crypto.timingSafeEqual(a, b);
  }

  const stored = getSystemMeta('super_admin_passcode_hash');
  if (!stored || !stored.startsWith('scrypt:')) return false;
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [, salt, hexHash] = parts;
  if (!salt || !hexHash) return false;

  const expectedBuf = Buffer.from(hexHash, 'hex');
  const derivedBuf = crypto.scryptSync(candidate, salt, 64);
  if (expectedBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, derivedBuf);
}

// =========================================================================
// ANDROID / WEB PUSH SUBSCRIPTION & VAPID KEY STORAGE HELPERS
// =========================================================================

export function upsertPushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string;
  role?: string;
  userAgent?: string;
}): PushSubscriptionRecord {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const existing = db
    .prepare('SELECT id, created_at FROM push_subscriptions WHERE endpoint = ?')
    .get(sub.endpoint) as { id: string; created_at: string } | undefined;

  const id = existing?.id || `push-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = existing?.created_at || nowIso;

  db.prepare(`
    INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, user_id, role, user_agent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_id = excluded.user_id,
      role = excluded.role,
      user_agent = excluded.user_agent,
      updated_at = excluded.updated_at
  `).run(
    id,
    sub.endpoint,
    sub.p256dh,
    sub.auth,
    sub.userId || '',
    sub.role || '',
    (sub.userAgent || '').slice(0, 240),
    createdAt,
    nowIso
  );

  return {
    id,
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
    userId: sub.userId || undefined,
    role: (sub.role as PushSubscriptionRecord['role']) || undefined,
    userAgent: sub.userAgent || undefined,
    createdAt,
    updatedAt: nowIso,
  };
}

export function listPushSubscriptions(filter?: { userId?: string; role?: string }): PushSubscriptionRecord[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: string[] = [];
  if (filter?.userId) {
    clauses.push('user_id = ?');
    params.push(filter.userId);
  }
  if (filter?.role) {
    clauses.push('role = ?');
    params.push(filter.role);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM push_subscriptions ${where} ORDER BY updated_at DESC`)
    .all(...params) as Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_id: string;
    role: string;
    user_agent: string;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
    userId: r.user_id || undefined,
    role: (r.role as PushSubscriptionRecord['role']) || undefined,
    userAgent: r.user_agent || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function deletePushSubscription(endpoint: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  return res.changes > 0;
}

export function getOrPersistVapidKeys(generator: () => { publicKey: string; privateKey: string }): {
  publicKey: string;
  privateKey: string;
  source: 'env' | 'sqlite_generated';
} {
  const envPub = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const envPriv = (process.env.VAPID_PRIVATE_KEY || '').trim();
  if (envPub && envPriv && !envPub.startsWith('MY_') && !envPriv.startsWith('MY_')) {
    return { publicKey: envPub, privateKey: envPriv, source: 'env' };
  }

  const storedPub = getSystemMeta('vapid_public_key');
  const storedPriv = getSystemMeta('vapid_private_key');
  if (storedPub && storedPriv) {
    return { publicKey: storedPub, privateKey: storedPriv, source: 'sqlite_generated' };
  }

  const generated = generator();
  setSystemMeta('vapid_public_key', generated.publicKey);
  setSystemMeta('vapid_private_key', generated.privateKey);
  return {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    source: 'sqlite_generated',
  };
}


