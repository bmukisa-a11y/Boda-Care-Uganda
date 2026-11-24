/**
 * BodaCare Uganda - Core Type Definitions
 * Designed for Boda-boda operators, passengers, stage leaders, mechanics, and admins in Luweero District & across Uganda.
 */

export type UserRole = 'super_admin' | 'rider' | 'passenger' | 'stage_leader' | 'mechanic' | 'station_operator' | 'employer';

export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
export type SubscriptionTier = 'basic' | 'standard' | 'premium';
export type PaymentProvider = 'MTN MoMo' | 'Airtel Money' | 'Cash' | 'Wallet';

export interface User {
  id: string;
  phone: string;
  fullName: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  location?: string;
  accountType?: string;
  inviteCodeUsed?: string;
  createdAt: string;
  preferredLanguage: 'en' | 'lg';
  isSuperAdmin?: boolean;
  passwordHash?: string;
}

export interface RiderProfile {
  id: string;
  userId: string;
  riderIdNumber: string; // Unique Rider ID Number e.g. BCU-LWR-0421
  fullName: string;
  phone: string;
  avatarUrl: string;
  nin: string; // National Identification Number (e.g., CM87019238XYZ)
  permitNumber: string; // Driving permit license class A
  residentialArea: string; // e.g., Kikyusa Town, Luweero
  stageId: string;
  stageName: string;
  motorcycleReg: string; // e.g., UFG 421K
  motorcycleMakeModel: string; // e.g., Bajaj Boxer BM150, TVS HLX 125, Bodawerk E-Boda
  motorcycleType: 'electric' | 'petrol';
  batteryModel?: string; // e.g. Bodawerk 48V 50Ah LiFePO4, Zembo G2
  ownershipStatus: 'owner' | 'rental' | 'loan';
  ninDocumentUrl?: string;
  permitDocumentUrl?: string;
  stageLetterUrl?: string;
  insuranceDocUrl?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  verificationStatus: VerificationStatus;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus?: 'none' | 'pending_verification' | 'active' | 'rejected' | 'expired';
  subscriptionExpiry: string;
  lastPaymentSubmissionId?: string;
  rejectionReason?: string;
  rating: number;
  completedTrips: number;
  isOnline: boolean;
  helmetAvailable: boolean;
  registrationDate: string;
  walletBalanceUgx: number;
  phoneType?: 'smartphone' | 'feature_phone'; // Smartphone vs button/feature phone
  whatsappNumber?: string;
  district?: string;
  parish?: string;
  village?: string; // e.g., Kikyusa Central, Kalagala, Kasana West
  subCounty?: string; // e.g., Kikyusa, Luweero Town Council, Wobulenzi
  accountStatus?: 'active' | 'suspended' | 'deactivated';
  updatedAt?: string;
  jobAlertPreferences?: RiderJobAlertPreferences;
}

export interface RiderJobAlertPreferences {
  enabled: boolean;
  consentGiven?: boolean;
  consentUpdatedAt?: string;
  preferredChannel: 'auto' | 'sms_only' | 'whatsapp_only' | 'sms_whatsapp' | 'app_only' | 'both' | 'none';
  optedOutSms: boolean;
  optedOutAt?: string;
  optOutReason?: string;
  jobTypes: BodaJob['type'][];
  preferredSubCounties: string[];
  occupation?: string;
  qualifications?: string[];
  updatedAt: string;
}

export interface PassengerProfile {
  id: string;
  userId: string;
  passengerIdNumber?: string;
  fullName: string;
  phone: string;
  whatsappNumber?: string;
  avatarUrl?: string;
  residentialArea: string;
  district?: string;
  subCounty?: string;
  village?: string;
  trustedContactName: string;
  trustedContactPhone: string;
  phoneType?: 'smartphone' | 'feature_phone';
  assistedRegistration?: boolean;
  accountStatus?: 'active' | 'suspended' | 'deactivated';
  verificationStatus?: 'verified' | 'pending' | 'rejected';
  rating: number;
  totalRides: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Stage {
  id: string;
  stageCode?: string;
  name: string;
  district: string; // Luweero
  subCounty: string; // Kikyusa, Luweero Town Council, Wobulenzi, Kasana
  parish?: string;
  village?: string;
  leaderName: string;
  leaderPhone: string;
  memberCount: number;
  dailyWelfareFeeUgx: number;
  landmark: string;
  lat: number;
  lng: number;
  servicesAvailable?: string[];
  operatingStatus?: 'active' | 'suspended' | 'closed';
  createdAt?: string;
  updatedAt?: string;
}

export interface StageMember {
  id: string;
  stageId: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  bikeReg: string;
  joinedDate: string;
  status: 'active' | 'suspended' | 'pending';
  lastAttendance: string;
  welfarePaidUntil: string;
}

export interface StageAttendance {
  id: string;
  stageId: string;
  riderId: string;
  riderName: string;
  date: string;
  time: string;
  status: 'present' | 'absent' | 'excused';
  paidContribution: boolean;
  amountUgx: number;
}

export interface StageAnnouncement {
  id: string;
  stageId: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  priority: 'normal' | 'urgent';
}

export interface BusinessService {
  name: string;
  priceUgx?: number;
  description: string;
}

export interface BusinessListing {
  id: string;
  centreCode?: string;
  name: string;
  ownerName: string;
  phone: string;
  location: string;
  district?: string;
  subCounty: string;
  village?: string;
  lat?: number;
  lng?: number;
  category: 'garage' | 'mechanic' | 'tyres' | 'engine' | 'spares' | 'accessories' | 'towing';
  rating: number;
  reviewCount: number;
  operatingHours: string;
  services: BusinessService[];
  servicesSummary?: string;
  brandsServiced?: string[];
  bikeTypesServiced?: 'petrol' | 'electric' | 'both';
  verified: boolean;
  isPromoted: boolean;
  emergencyCallout: boolean;
  accountStatus?: 'active' | 'suspended' | 'deactivated';
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type Mechanic = BusinessListing;

export interface Booking {
  id: string;
  type: 'ride' | 'delivery';
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  riderBike?: string;
  pickupLocation: string;
  destination: string;
  distanceKm: number;
  fareUgx: number;
  status: 'requested' | 'accepted' | 'arriving' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  rating?: number;
  reviewComment?: string;
  deliveryDetails?: {
    senderName: string;
    senderPhone: string;
    recipientName: string;
    recipientPhone: string;
    parcelDescription: string;
    deliveryInstructions?: string;
  };
}

export interface IncomeRecord {
  id: string;
  riderId: string;
  date: string;
  category: 'transport' | 'delivery' | 'other';
  amountUgx: number;
  description: string;
  paymentMethod: 'cash' | 'mobile_money';
  isSynced: boolean;
}

export interface ExpenseRecord {
  id: string;
  riderId: string;
  date: string;
  category: 'fuel' | 'repairs' | 'tyres' | 'engine_oil' | 'rental' | 'loan_repayment' | 'stage_contribution' | 'other';
  amountUgx: number;
  description: string;
  isSynced: boolean;
}

export interface MaintenanceReminder {
  id: string;
  riderId: string;
  item: string;
  lastServiceKm: number;
  nextServiceKm: number;
  currentKm: number;
  dueDate: string;
  status: 'ok' | 'due_soon' | 'overdue';
  costEstimateUgx: number;
}

export interface EmergencyIncident {
  id: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  motorcycleReg: string;
  stageName: string;
  category: 'road_accident' | 'motorcycle_theft' | 'medical_emergency' | 'robbery' | 'mechanical_breakdown' | 'other';
  timestamp: string;
  locationName: string;
  lat: number;
  lng: number;
  status: 'active' | 'investigating' | 'resolved';
  assignedResponder?: string;
  notes?: string;
  dispatchedTo: string[];
}

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  priceUgx: number;
  billingCycle: 'monthly';
  features: string[];
  isPopular?: boolean;
}

export interface PaymentTransaction {
  id: string;
  reference: string;
  userId: string;
  userName: string;
  userPhone: string;
  provider: PaymentProvider;
  amountUgx: number;
  purpose: 'subscription' | 'ride_fare' | 'stage_welfare' | 'business_promotion';
  planId?: SubscriptionTier;
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  operatorRef: string;
}

export type PaymentSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentSubmission {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  network: 'MTN' | 'Airtel';
  amountUgx: number;
  transactionId: string;
  normalizedTxId: string; // Trimmed, spaces removed, uppercase
  paymentDateTime: string;
  planId: SubscriptionTier;
  planName: string;
  screenshotUrl?: string;
  screenshotName?: string;
  status: PaymentSubmissionStatus;
  adminNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  submittedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  target: string;
  details: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'booking' | 'payment' | 'emergency' | 'stage' | 'system' | 'job' | 'swap' | 'repair' | 'sos';
  actionUrl?: string;
}

export interface FounderProfile {
  fullName: string;
  title: string;
  photoUrl: string;
  businessName: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  location: string;
  description: string;
  logoUrl?: string;
  supportPhone: string;
  supportEmail: string;
  emergencyHotline: string;
  website?: string;
  updatedAt: string;
}

export interface PlatformInvitation {
  id: string;
  code: string;
  role: 'rider' | 'passenger' | 'stage_leader' | 'mechanic' | 'station_operator' | 'employer' | 'delivery' | 'super_admin';
  targetName?: string;
  targetPhone?: string;
  targetStage?: string;
  note?: string;
  createdDate: string;
  createdBy: string;
  status: 'pending' | 'registered' | 'approved';
  registeredUserName?: string;
  registeredDate?: string;
  shareUrl: string;
  channel: 'whatsapp' | 'sms' | 'direct_link';
}

// Module 2: Jobs & Delivery Opportunities
export interface BodaJob {
  id: string;
  employerId: string;
  employerName: string;
  employerPhone: string;
  employerCompany: string;
  title: string;
  type: 'passenger_contract' | 'parcel_delivery' | 'produce_transport' | 'scheduled_courier' | 'corporate_boda';
  description: string;
  pickupLocation: string;
  deliveryLocation: string;
  subCounty: string; // Kikyusa, Luweero Town, Wobulenzi, Kasana, Bamunanika
  district?: string;
  jobCode?: string;
  distanceKm: number;
  cargoWeightKg?: number;
  cargoDescription?: string;
  paymentAmountUgx: number;
  paymentFrequency: 'one_time' | 'daily' | 'weekly' | 'per_trip';
  requiredMotorcycleType: 'any' | 'electric' | 'petrol';
  status: 'open' | 'assigned' | 'completed' | 'cancelled' | 'suspended';
  postedDate: string;
  deadline: string;
  applicationsCount: number;
  adminApproved: boolean;
  assignedRiderId?: string;
  assignedRiderName?: string;
  village?: string;
  salaryDisplay?: string;
  requirements?: string;
  applicationInstructions?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notificationMode?: JobAlertDispatchMode;
  lastAlertSentAt?: string;
  updatedAt?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  employerCompany: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  riderIdNumber: string;
  bikeReg: string;
  proposedRateUgx: number;
  coverNote: string;
  appliedAt: string;
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected';
}

// Module 3: Electric Bike Battery Swap Locator
export type BatteryBrand = 'Bodawerk' | 'Zembo' | 'Spiro' | 'ARC Ride' | 'Universal';

export interface BatterySwapStation {
  id: string;
  stationCode?: string;
  name: string;
  operatorName: string;
  operatorPhone: string;
  locationName: string;
  district?: string;
  subCounty: string; // Kikyusa, Luweero Town, Wobulenzi, Kasana, Bamunanika
  village?: string;
  lat: number;
  lng: number;
  totalBatteries: number;
  availableBatteries: number;
  chargingBatteries: number;
  batteryBrand: BatteryBrand;
  supportedBatteryTypes?: string[];
  connectorType: string; // e.g. Chogori, Anderson SB50, Rosenberger
  swapFeeUgx: number;
  servicesOffered?: 'swapping' | 'charging' | 'both';
  operatingHours: string;
  powerSource: 'grid' | 'solar_hybrid' | 'solar_only' | 'generator_backup';
  verified: boolean;
  status: 'open' | 'congested' | 'offline' | 'out_of_batteries' | 'operational' | 'temporarily_closed' | 'unavailable';
  rating: number;
  lastStockUpdate: string;
  amenities: string[]; // e.g. Shelter, Free WiFi, Air Pump, Cold Drinks
  createdAt?: string;
  updatedAt?: string;
}

export interface StationProblemReport {
  id: string;
  stationId: string;
  stationName: string;
  reportedByRiderId: string;
  riderName: string;
  riderPhone: string;
  issueType: 'no_batteries' | 'station_closed' | 'connector_damaged' | 'meter_error' | 'overcharging' | 'power_cut';
  description: string;
  timestamp: string;
  status: 'open' | 'investigating' | 'resolved';
  adminNotes?: string;
}

// Module 4: Repairs and Maintenance
export interface RepairRequest {
  id: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  motorcycleReg: string;
  motorcycleType: 'electric' | 'petrol';
  garageId: string;
  garageName: string;
  serviceType: string;
  description: string;
  urgency: 'routine' | 'urgent' | 'roadside_breakdown';
  location: string;
  lat?: number;
  lng?: number;
  status: 'requested' | 'accepted' | 'in_repair' | 'completed' | 'cancelled';
  estimatedCostUgx?: number;
  finalCostUgx?: number;
  createdAt: string;
  completedAt?: string;
  mechanicNotes?: string;
}

export interface ServiceRecord {
  id: string;
  riderId: string;
  motorcycleReg: string;
  serviceDate: string;
  odometerKm: number;
  servicePerformed: string;
  partsReplaced: string[];
  mechanicName: string;
  garageName: string;
  costUgx: number;
  nextServiceDueKm: number;
  notes?: string;
}

// Module 6: Rider Wallet & Transactions
export interface RiderWallet {
  riderId: string;
  availableBalanceUgx: number;
  totalEarnedUgx: number;
  totalSpentUgx: number;
  pendingWithdrawalUgx: number;
  lastUpdated: string;
}

export interface WalletTransaction {
  id: string;
  riderId: string;
  type: 'credit' | 'debit';
  category: 'ride_fare' | 'job_payout' | 'subscription_fee' | 'battery_swap' | 'repair' | 'topup' | 'withdrawal' | 'stage_welfare';
  amountUgx: number;
  balanceAfterUgx: number;
  description: string;
  timestamp: string;
  reference: string;
  status: 'completed' | 'pending' | 'failed';
}

// System Configuration & Support (Non-secret frontend operational settings only)
export interface ExternalServicesConfig {
  smsProvider: 'africastalking' | 'twilio' | 'infobip';
  smsSenderId: string;
  whatsAppBusinessPhone: string;
  autoDispatchEnabled: boolean;
  updatedAt: string;
}

export interface ComplaintReport {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userRole: UserRole;
  category: 'fare_dispute' | 'rider_conduct' | 'lost_item' | 'app_glitch' | 'payment_issue' | 'emergency_delay';
  subject: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved';
  submittedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

// Job Alert & Multi-Channel Employment Broadcast System
export type SmsRecipientScope = 'all' | 'districts' | 'kikyusa' | 'luweero' | 'villages' | 'stages' | 'individual';
export type JobAlertDispatchMode = 'sms_only' | 'whatsapp_only' | 'sms_whatsapp' | 'app_only' | 'both' | 'all_channels' | 'none';
export type JobBroadcastChannel = 'sms' | 'whatsapp' | 'in_app';
export type SmsDeliveryStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'invalid_number'
  | 'opted_out'
  | 'skipped_duplicate'
  | 'skipped_preference'
  | 'blocked_unconfigured';

export interface SmsRecipientDelivery {
  riderId: string;
  riderName: string;
  phone: string;
  normalizedPhone: string;
  whatsappPhone?: string;
  network: 'MTN' | 'Airtel' | 'Other' | 'Invalid';
  phoneType: 'smartphone' | 'feature_phone';
  channel: 'sms' | 'whatsapp' | 'in_app' | 'both' | 'skipped';
  smsStatus: SmsDeliveryStatus;
  whatsappStatus?: SmsDeliveryStatus;
  appNotifSent: boolean;
  providerMessageId?: string;
  whatsappMessageId?: string;
  costUgx: number;
  failureReason?: string;
  whatsappFailureReason?: string;
  updatedAt: string;
}

export interface JobBroadcastDelivery {
  id: string;
  broadcastId: string;
  jobId: string;
  jobTitle: string;
  riderId: string;
  riderName: string;
  channel: JobBroadcastChannel;
  targetPhone: string;
  network: 'MTN' | 'Airtel' | 'Other' | 'Invalid';
  messageText: string;
  status: SmsDeliveryStatus;
  provider: string;
  providerMessageId?: string;
  errorReason?: string;
  costUgx: number;
  retryCount: number;
  lastAttemptAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobBroadcastCampaign {
  id: string;
  jobId: string;
  jobTitle: string;
  employerCompany: string;
  jobLink: string;
  channels: JobBroadcastChannel[];
  dispatchMode: JobAlertDispatchMode;
  recipientScope: SmsRecipientScope;
  scopeDetails: string;
  queueState: 'queued' | 'processing' | 'completed';
  sentByAdminName: string;
  sentAt: string;
  completedAt?: string;
  totalTargetedRiders: number;
  smsPendingCount: number;
  smsSentCount: number;
  smsDeliveredCount: number;
  smsFailedCount: number;
  whatsappPendingCount: number;
  whatsappSentCount: number;
  whatsappDeliveredCount: number;
  whatsappFailedCount: number;
  appNotifSentCount: number;
  skippedDuplicateCount: number;
  skippedPreferenceCount: number;
  invalidPhoneCount: number;
  estimatedSmsCostUgx: number;
  actualSmsCostUgx: number;
}

export interface JobNotificationDashboardStats {
  totalRegisteredRiders: number;
  consentedRidersCount: number;
  whatsappEnabledRidersCount: number;
  totalBroadcasts: number;
  totalSmsSent: number;
  totalWhatsappSent: number;
  totalInAppSent: number;
  successfullyDelivered: number;
  failedOrBlocked: number;
  pendingInQueue: number;
  skippedDuplicates: number;
}

export interface SmsCampaignRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  sentByAdminName: string;
  sentByAdminRole: UserRole;
  sentAt: string;
  dispatchMode: JobAlertDispatchMode;
  recipientScope: SmsRecipientScope;
  scopeDetails: string;
  messageText: string;
  smsSegments: number;
  totalTargetedRiders: number;
  smsAttemptedCount: number;
  smsSentCount: number;
  smsDeliveredCount: number;
  smsFailedCount: number;
  whatsappSentCount?: number;
  whatsappDeliveredCount?: number;
  whatsappFailedCount?: number;
  invalidPhoneCount: number;
  optedOutSkippedCount: number;
  appNotificationsSentCount: number;
  estimatedCostUgx: number;
  actualExpenditureUgx: number;
  provider: string;
  senderId: string;
  gatewayConfigured: boolean;
  gatewayError?: string;
  deliveries: SmsRecipientDelivery[];
}

export interface SmsGatewayStatus {
  configured: boolean;
  provider: 'africastalking';
  environment: 'production' | 'sandbox' | 'unconfigured';
  usernameConfigured: boolean;
  apiKeyConfigured: boolean;
  senderId: string;
  senderIdApproved: boolean;
  balanceText: string | null;
  balanceCurrency: string | null;
  balanceAmount: number | null;
  costPerSmsUgx: number;
  requirementsMissing: string[];
  checkedAt: string;
  backendReachable?: boolean;
}

// ==========================================
// CENTRALIZED ADMIN MANAGEMENT & RBAC TYPES
// ==========================================
export type AdminCategory = 'riders' | 'passengers' | 'jobs' | 'stations' | 'centres' | 'stages';
export type AdminRoleType = 'super_admin' | 'operations_admin' | 'verifier_admin' | 'support_admin';

export interface AdminPermissions {
  manageRiders: boolean;
  managePassengers: boolean;
  manageJobs: boolean;
  manageStations: boolean;
  manageCentres: boolean;
  manageStages: boolean;
  sendNotifications: boolean;
  viewAnalytics: boolean;
  manageAdmins: boolean;
  deleteRecords: boolean;
}

export interface AdminAccount {
  id: string;
  adminCode: string;
  fullName: string;
  email: string;
  phone: string;
  role: AdminRoleType;
  permissions: AdminPermissions;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryRecord {
  id: string;
  channel: 'sms' | 'whatsapp' | 'in_app';
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  category: string;
  message: string;
  provider: string;
  providerMessageId?: string;
  status: 'sent' | 'delivered' | 'failed' | 'blocked_unconfigured' | 'in_app_delivered';
  errorReason?: string;
  sentBy: string;
  createdAt: string;
}

export interface MessagingGatewayStatus {
  sms: SmsGatewayStatus;
  whatsapp: {
    configured: boolean;
    provider: 'meta_cloud_api';
    businessPhoneIdConfigured: boolean;
    accessTokenConfigured: boolean;
    apiVersion: string;
    requirementsMissing: string[];
  };
  ussd: {
    configured: boolean;
    serviceCode: string;
    callbackPath: string;
    requirementsMissing: string[];
  };
  checkedAt: string;
}

export interface CentralAnalytics {
  totals: {
    riders: number;
    passengers: number;
    jobs: number;
    stations: number;
    centres: number;
    stages: number;
  };
  ridersByStatus: {
    active: number;
    suspended: number;
    deactivated: number;
    verified: number;
    pendingVerification: number;
    electric: number;
    petrol: number;
    featurePhone: number;
    smartphone: number;
  };
  passengersByStatus: {
    active: number;
    suspended: number;
    deactivated: number;
    assistedOrButtonPhone: number;
  };
  jobsByStatus: {
    open: number;
    approved: number;
    pendingApproval: number;
    suspended: number;
  };
  stationsByStatus: {
    operational: number;
    temporarilyClosed: number;
    unavailable: number;
  };
  centresByStatus: {
    verified: number;
    pendingVerification: number;
    suspended: number;
  };
  stagesByStatus: {
    active: number;
    suspended: number;
    closed: number;
  };
  locationBreakdown: Array<{
    area: string;
    district: string;
    riders: number;
    passengers: number;
    stages: number;
    stations: number;
    centres: number;
    jobs: number;
  }>;
}

// ==========================================
// AUTOMATED DAILY JOB DISCOVERY & ADMIN VERIFICATION ENGINE
// ==========================================
export type DiscoverySourceType =
  | 'rss_feed'
  | 'json_api'
  | 'html_careers'
  | 'search_api'
  | 'webhook_ingest';

export type DiscoverySourceFetchStatus =
  | 'never_run'
  | 'ok'
  | 'blocked_robots'
  | 'blocked_auth_or_captcha'
  | 'unconfigured'
  | 'error';

export interface DiscoverySource {
  id: string;
  name: string;
  category:
    | 'uganda_job_portal'
    | 'company_careers'
    | 'ngo_government'
    | 'public_social_page'
    | 'search_engine_index'
    | 'newspaper_notice'
    | 'local_business_ad'
    | 'public_feed_api';
  sourceType: DiscoverySourceType;
  url: string;
  queryTemplate?: string;
  active: boolean;
  respectRobotsTxt: boolean;
  priorityWeight: number;
  lastCheckedAt?: string;
  lastStatus: DiscoverySourceFetchStatus;
  lastError?: string;
  jobsFoundLastRun: number;
  totalJobsDiscovered: number;
  createdAt: string;
  updatedAt: string;
}

export type DiscoveredJobStatus =
  | 'new'
  | 'awaiting_verification'
  | 'info_requested'
  | 'verified'
  | 'rejected'
  | 'suspicious'
  | 'expired'
  | 'duplicate';

export interface DiscoveredJobRecord {
  id: string;
  contentHash: string;
  sourceId: string;
  sourceName: string;
  sourceCategory: DiscoverySource['category'];
  originalUrl: string;
  title: string;
  employerName: string;
  employerAddress?: string;
  employerPhone?: string;
  employerEmail?: string;
  employerWebsite?: string;
  employerRegistrationInfo?: string;
  employerVerificationStatus: 'unverified' | 'info_requested' | 'confirmed_by_admin' | 'flagged';
  description: string;
  jobCategory: BodaJob['type'];
  occupationTag?: string;
  rawLocation: string;
  district: string;
  subCounty: string;
  village?: string;
  locationPriorityScore: number;
  salaryDisplay?: string;
  salaryAmountUgx?: number;
  paymentFrequency: BodaJob['paymentFrequency'];
  qualifications: string;
  experienceRequirements?: string;
  deadline?: string;
  isAcceptingApplications: boolean;
  isExpired: boolean;
  scamScore: number;
  scamFlags: string[];
  incompleteFlags: string[];
  duplicateOfId?: string;
  duplicateReason?: string;
  status: DiscoveredJobStatus;
  publishedJobId?: string;
  adminNotes?: string;
  infoRequestNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  discoveredAt: string;
  updatedAt: string;
}

export interface DiscoveryEmployerSummary {
  employerKey: string;
  employerName: string;
  companyAddress?: string;
  contactPhones: string[];
  contactEmails: string[];
  officialWebsite?: string;
  registrationInfo?: string;
  sourcesSeen: string[];
  verificationStatus: 'unverified' | 'info_requested' | 'confirmed_by_admin' | 'flagged';
  totalDiscoveredAds: number;
  verifiedPublishedCount: number;
  suspiciousCount: number;
  rejectedCount: number;
  lastDiscoveredAt: string;
}

export interface DiscoveryScheduleConfig {
  id: string;
  automationEnabled: boolean;
  scanTimes: string[]; // e.g. ['06:00', '14:00']
  timezone: string; // e.g. 'Africa/Kampala'
  maxRetriesPerSource: number;
  targetLocations: string[];
  searchKeywords: string[];
  enabledCategories: string[];
  notifyAdminInApp: boolean;
  notifyAdminSms: boolean;
  notifyAdminWhatsapp: boolean;
  adminNotifyPhone: string;
  adminNotifyWhatsapp: string;
  notifyOnlyWhenNewFound: boolean;
  lastScheduledSlotKey?: string;
  lastRunAt?: string;
  updatedAt: string;
}

export interface DiscoveryRunSourceOutcome {
  sourceId: string;
  sourceName: string;
  status: DiscoverySourceFetchStatus;
  attempts: number;
  rawItemsFetched: number;
  newSaved: number;
  duplicatesDetected: number;
  suspiciousFlagged: number;
  expiredFlagged: number;
  error?: string;
}

export interface DiscoveryRunReport {
  id: string;
  trigger: 'scheduled' | 'manual' | 'retry';
  slotKey?: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'completed_with_errors' | 'failed';
  sourcesScanned: number;
  sourcesFailed: number;
  totalFetched: number;
  newJobsDiscovered: number;
  duplicatesDetected: number;
  suspiciousFlagged: number;
  expiredDetected: number;
  awaitingApprovalCount: number;
  rejectedCount: number;
  adminNotificationsSent: Array<{ channel: string; status: string; target: string }>;
  sourceOutcomes: DiscoveryRunSourceOutcome[];
  errorSummary?: string;
}

export interface DiscoveryDashboardPayload {
  counts: {
    all: number;
    new: number;
    awaiting_verification: number;
    info_requested: number;
    verified: number;
    rejected: number;
    suspicious: number;
    expired: number;
    duplicate: number;
  };
  jobs: DiscoveredJobRecord[];
  sources: DiscoverySource[];
  schedule: DiscoveryScheduleConfig;
  runs: DiscoveryRunReport[];
  employers: DiscoveryEmployerSummary[];
  capabilities: {
    geminiExtractionConfigured: boolean;
    googleCustomSearchConfigured: boolean;
    serpApiConfigured: boolean;
  };
}

// ==========================================
// INTEGRATION MANAGEMENT & ENV CONFIGURATION
// ==========================================
export type IntegrationServiceId =
  | 'africastalking_sms'
  | 'whatsapp_cloud'
  | 'ussd_gateway'
  | 'google_custom_search'
  | 'serpapi_jobs'
  | 'gemini_ai'
  | 'web_push';

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userId?: string;
  role?: UserRole;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export type IntegrationComputedStatus = 'active' | 'inactive' | 'awaiting_credentials';

export interface IntegrationEnvVarMeta {
  name: string;
  essential: boolean;
  configured: boolean;
  defaultValue?: string;
  purpose: string;
  whereToObtain: string;
}

export interface IntegrationServiceStatus {
  id: IntegrationServiceId;
  name: string;
  category: 'messaging' | 'ussd' | 'job_discovery' | 'ai_enrichment';
  description: string;
  enabled: boolean;
  credentialsConfigured: boolean;
  status: IntegrationComputedStatus;
  statusMessage: string;
  fallbackBehavior: string;
  envVars: IntegrationEnvVarMeta[];
  updatedAt: string;
}

export interface IntegrationsDashboardPayload {
  services: IntegrationServiceStatus[];
  essentialRuntimeVars: IntegrationEnvVarMeta[];
  checkedAt: string;
}

// ==========================================
// AUTOMATED WELCOME & REGISTRATION NOTIFICATIONS
// ==========================================
export type WelcomeAccountCategory = 'rider' | 'passenger';
export type WelcomeChannel = 'sms' | 'whatsapp' | 'in_app';

export interface WelcomeSettingsConfig {
  id: 'default';
  enabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  inAppEnabled: boolean;
  riderTemplate: string;
  passengerTemplate: string;
  updatedAt: string;
}

export interface WelcomeNotificationRecord {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  whatsappNumber?: string;
  accountCategory: WelcomeAccountCategory;
  registrationSource: 'self_registration' | 'admin_manual';
  registrationDate: string;
  channel: WelcomeChannel;
  messageText: string;
  status: SmsDeliveryStatus;
  provider: string;
  providerMessageId?: string;
  errorReason?: string;
  isResend: boolean;
  retryCount: number;
  sentBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WelcomeDashboardPayload {
  settings: WelcomeSettingsConfig;
  records: WelcomeNotificationRecord[];
  counts: {
    total: number;
    deliveredOrSent: number;
    pending: number;
    failedOrBlocked: number;
  };
  members: {
    riders: Array<
      Pick<
        RiderProfile,
        'id' | 'fullName' | 'phone' | 'whatsappNumber' | 'riderIdNumber' | 'registrationDate' | 'subCounty' | 'district' | 'phoneType'
      >
    >;
    passengers: Array<
      Pick<
        PassengerProfile,
        'id' | 'fullName' | 'phone' | 'whatsappNumber' | 'passengerIdNumber' | 'createdAt' | 'subCounty' | 'district' | 'phoneType'
      >
    >;
  };
  gatewayStatus?: MessagingGatewayStatus;
}

// ==========================================
// SYSTEM RESET & MEMBERSHIP MANAGEMENT
// ==========================================
export type ResetCategoryId =
  | 'riders'
  | 'passengers'
  | 'stages'
  | 'swap_stations'
  | 'maintenance_centres'
  | 'jobs'
  | 'discovered_jobs'
  | 'non_super_admins';

export interface RevokedAccountRecord {
  id: string;
  recordId: string;
  category: ResetCategoryId | string;
  fullName: string;
  phone?: string;
  normalizedPhone?: string;
  email?: string;
  reason: string;
  revokedBy: string;
  revokedAt: string;
}

export interface SelectiveDeleteTarget {
  category: ResetCategoryId;
  id: string;
}

export interface SystemResetOverviewItem {
  id: string;
  category: ResetCategoryId;
  title: string;
  subtitle: string;
  location: string;
  status: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface SystemResetDependentCounts {
  ussdSessions: number;
  welcomeNotifications: number;
  memberNotifications: number;
  jobDeliveries: number;
  assignedRiderStageLinks: number;
  pushSubscriptions: number;
}

export interface SystemResetOverviewPayload {
  counts: Record<ResetCategoryId, number>;
  totalRemovable: number;
  dependentCounts?: SystemResetDependentCounts;
  itemsByCategory: Record<ResetCategoryId, SystemResetOverviewItem[]>;
  revokedAccounts: RevokedAccountRecord[];
  resetAuditLogs: AuditLog[];
  lastResetAt: string | null;
  lastResetBy: string | null;
  protectedRecords: {
    superAdminEmail: string;
    auditLogsCount: number;
    financialRecordsPreserved: boolean;
  };
}

export interface SystemResetResult {
  success: boolean;
  mode: 'selective' | 'category' | 'complete';
  clearedCategories?: ResetCategoryId[];
  deletedCount: number;
  revokedCount: number;
  resetAt: string;
  details: string;
  overview: SystemResetOverviewPayload;
  analytics?: CentralAnalytics;
}



