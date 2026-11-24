/**
 * BodaCare Uganda - Storage & Mock Database Layer
 * Provides persistent state management, initial seed data for Luweero District,
 * and offline/online synchronisation capabilities.
 */

import {
  RiderProfile,
  PassengerProfile,
  Stage,
  StageMember,
  StageAttendance,
  StageAnnouncement,
  BusinessListing,
  Booking,
  IncomeRecord,
  ExpenseRecord,
  MaintenanceReminder,
  EmergencyIncident,
  SubscriptionPlan,
  SubscriptionTier,
  PaymentTransaction,
  PaymentSubmission,
  PaymentSubmissionStatus,
  AuditLog,
  AppNotification,
  UserRole,
  User,
  FounderProfile,
  PlatformInvitation,
  BodaJob,
  JobApplication,
  BatterySwapStation,
  StationProblemReport,
  RepairRequest,
  ServiceRecord,
  RiderWallet,
  WalletTransaction,
  ExternalServicesConfig,
  ComplaintReport,
  RiderJobAlertPreferences,
  SmsCampaignRecord,
  JobAlertDispatchMode,
} from '../types';

import heroImage from '../assets/images/bodacare_rider_hero_1793382094028.jpg';
import stageImage from '../assets/images/bodacare_community_stage_1793382094462.jpg';

export const HERO_IMAGE = heroImage;
export const STAGE_IMAGE = stageImage;

// Official BodaCare Uganda Mobile Money Payment Details
export const OFFICIAL_PAYMENT_DETAILS = {
  accountName: 'Mukisa Brian',
  mtn: {
    provider: 'MTN MOBILE MONEY',
    network: 'MTN' as const,
    number: '0766848865',
    accountName: 'Mukisa Brian',
    dialCode: '*165#',
    color: '#FFCC00',
  },
  airtel: {
    provider: 'AIRTEL MONEY',
    network: 'Airtel' as const,
    number: '0731931455',
    accountName: 'Mukisa Brian',
    dialCode: '*185#',
    color: '#E60000',
  },
};

/**
 * Normalizes transaction IDs for strict duplicate prevention:
 * - Trims leading & trailing whitespace
 * - Removes any internal spaces
 * - Converts all letters to UPPERCASE
 */
export function normalizeTransactionId(txId: string): string {
  if (!txId) return '';
  return txId.trim().replace(/\s+/g, '').toUpperCase();
}

/**
 * Robust clipboard copy function supporting modern Clipboard API with fallback
 * to document.execCommand for mobile Android Chrome and WebViews where
 * navigator.clipboard might be restricted or unavailable.
 */
export function safeCopyToClipboard(text: string): boolean {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).catch(() => {
        legacyClipboardCopy(text);
      });
      return true;
    }
  } catch {
    // Continue to legacy fallback
  }
  return legacyClipboardCopy(text);
}

function legacyClipboardCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.contain = 'strict';
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    textArea.style.fontSize = '12pt';
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

// Initial Subscription Plans
export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic Rider',
    priceUgx: 0,
    billingCycle: 'monthly',
    features: [
      'Free registration & official profile',
      'Daily income & expense tracker',
      'Stage announcements broadcast',
      'Standard customer directory listing',
    ],
  },
  {
    id: 'standard',
    name: 'Standard Rider',
    priceUgx: 5000,
    billingCycle: 'monthly',
    isPopular: true,
    features: [
      'Verified Badge on passenger app',
      'Motorcycle maintenance countdown reminders',
      'Priority stage welfare & attendance tracker',
      'Emergency SOS direct police & stage dispatch',
      'Discounts at Luweero mechanic garages',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Rider Pro',
    priceUgx: 10000,
    billingCycle: 'monthly',
    features: [
      'Top search rank for Passenger & Delivery bookings',
      'Detailed monthly Net Profit PDF & CSV export',
      'Spare-parts dealer credit eligibility',
      '24/7 dedicated support line & legal representation',
      'Full stage leader management dashboard access',
    ],
  },
];

// Initial Stages in Luweero District
export const INITIAL_STAGES: Stage[] = [
  {
    id: 'stage-kikyusa-main',
    name: 'Kikyusa Main Stage',
    district: 'Luweero',
    subCounty: 'Kikyusa',
    leaderName: 'Chairman Mugisha David',
    leaderPhone: '+256 772 458 912',
    memberCount: 38,
    dailyWelfareFeeUgx: 1000,
    landmark: 'Opposite Kikyusa Health Centre IV Roundabout',
    lat: 0.8145,
    lng: 32.6121,
  },
  {
    id: 'stage-luweero-taxi-park',
    name: 'Luweero Taxi Park Boda Stage',
    district: 'Luweero',
    subCounty: 'Luweero Town Council',
    leaderName: 'Chairman Wasswa Joseph',
    leaderPhone: '+256 701 884 213',
    memberCount: 64,
    dailyWelfareFeeUgx: 1500,
    landmark: 'Behind Stanbic Bank, Kampala-Gulu Highway',
    lat: 0.8492,
    lng: 32.4934,
  },
  {
    id: 'stage-kasana-market',
    name: 'Kasana Central Market Stage',
    district: 'Luweero',
    subCounty: 'Kasana',
    leaderName: 'Chairman Kasujja Peter',
    leaderPhone: '+256 782 119 405',
    memberCount: 42,
    dailyWelfareFeeUgx: 1000,
    landmark: 'Kasana Market Fresh Produce Entrance',
    lat: 0.8621,
    lng: 32.4819,
  },
  {
    id: 'stage-wobulenzi-junction',
    name: 'Wobulenzi Junction Stage',
    district: 'Luweero',
    subCounty: 'Wobulenzi',
    leaderName: 'Chairman Lule Robert',
    leaderPhone: '+256 754 390 128',
    memberCount: 51,
    dailyWelfareFeeUgx: 1000,
    landmark: 'Zirobwe Road Turnoff, Wobulenzi',
    lat: 0.7214,
    lng: 32.5312,
  },
];

// Initial Riders
export const INITIAL_RIDERS: RiderProfile[] = [
  {
    id: 'rider-kato-moses',
    userId: 'user-kato-01',
    riderIdNumber: 'BCU-LWR-0421',
    fullName: 'Kato Moses',
    phone: '+256 774 912 304',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    nin: 'CM910481023K4L',
    permitNumber: 'UG-DL-A-883921',
    residentialArea: 'Kikyusa Trading Centre, Luweero',
    stageId: 'stage-kikyusa-main',
    stageName: 'Kikyusa Main Stage',
    motorcycleReg: 'UFG 421K',
    motorcycleMakeModel: 'Bodawerk E-Boda (Electric Yellow)',
    motorcycleType: 'electric',
    batteryModel: 'Bodawerk 48V 50Ah LiFePO4',
    ownershipStatus: 'owner',
    ninDocumentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
    permitDocumentUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&auto=format&fit=crop&q=80',
    stageLetterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    emergencyContactName: 'Nalubega Sarah (Wife)',
    emergencyContactPhone: '+256 779 120 445',
    verificationStatus: 'verified',
    subscriptionTier: 'premium',
    subscriptionStatus: 'active',
    subscriptionExpiry: '2026-11-28',
    lastPaymentSubmissionId: 'sub-tx-01',
    rating: 4.9,
    completedTrips: 1420,
    isOnline: true,
    helmetAvailable: true,
    registrationDate: '2025-08-14',
    walletBalanceUgx: 65000,
    phoneType: 'smartphone',
    village: 'Kikyusa Central',
    subCounty: 'Kikyusa',
    jobAlertPreferences: {
      enabled: true,
      preferredChannel: 'auto',
      optedOutSms: false,
      jobTypes: ['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda', 'passenger_contract'],
      preferredSubCounties: ['Kikyusa', 'Luweero Town Council', 'Kasana'],
      updatedAt: '2026-11-01T08:00:00Z',
    },
  },
  {
    id: 'rider-ssempijja-ronald',
    userId: 'user-ronald-02',
    riderIdNumber: 'BCU-LWR-0819',
    fullName: 'Ssempijja Ronald',
    phone: '+256 702 331 990',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    nin: 'CM880192847J8P',
    permitNumber: 'UG-DL-A-449102',
    residentialArea: 'Kasana Luweero',
    stageId: 'stage-luweero-taxi-park',
    stageName: 'Luweero Taxi Park Boda Stage',
    motorcycleReg: 'UFA 819D',
    motorcycleMakeModel: 'TVS HLX 125 (Black)',
    motorcycleType: 'petrol',
    ownershipStatus: 'rental',
    ninDocumentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
    permitDocumentUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&auto=format&fit=crop&q=80',
    emergencyContactName: 'Mukasa Ssempijja (Brother)',
    emergencyContactPhone: '+256 752 901 324',
    verificationStatus: 'verified',
    subscriptionTier: 'standard',
    subscriptionStatus: 'active',
    subscriptionExpiry: '2026-11-15',
    rating: 4.8,
    completedTrips: 876,
    isOnline: true,
    helmetAvailable: true,
    registrationDate: '2025-11-02',
    walletBalanceUgx: 32000,
    phoneType: 'smartphone',
    village: 'Kasana West',
    subCounty: 'Luweero Town Council',
    jobAlertPreferences: {
      enabled: true,
      preferredChannel: 'both',
      optedOutSms: false,
      jobTypes: ['produce_transport', 'parcel_delivery', 'corporate_boda'],
      preferredSubCounties: ['Luweero Town Council', 'Kasana'],
      updatedAt: '2026-11-01T08:00:00Z',
    },
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
    stageId: 'stage-kasana-market',
    stageName: 'Kasana Central Market Stage',
    motorcycleReg: 'UEX 902C',
    motorcycleMakeModel: 'Zembo Storm E-Boda (Blue)',
    motorcycleType: 'electric',
    batteryModel: 'Zembo 72V 35Ah QuickSwap',
    ownershipStatus: 'loan',
    ninDocumentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
    permitDocumentUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&auto=format&fit=crop&q=80',
    emergencyContactName: 'Nampeera Joyce (Sister)',
    emergencyContactPhone: '+256 701 445 221',
    verificationStatus: 'pending',
    subscriptionTier: 'standard',
    subscriptionStatus: 'pending_verification',
    subscriptionExpiry: '2026-11-01',
    lastPaymentSubmissionId: 'sub-tx-02',
    rating: 4.6,
    completedTrips: 114,
    isOnline: false,
    helmetAvailable: true,
    registrationDate: '2026-10-24',
    walletBalanceUgx: 18000,
    phoneType: 'feature_phone',
    village: 'Wobulenzi East',
    subCounty: 'Wobulenzi',
    jobAlertPreferences: {
      enabled: true,
      preferredChannel: 'sms_only',
      optedOutSms: false,
      jobTypes: ['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda'],
      preferredSubCounties: ['Wobulenzi', 'Kasana', 'Luweero Town Council'],
      updatedAt: '2026-11-01T08:00:00Z',
    },
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
    stageId: 'stage-kikyusa-main',
    stageName: 'Kikyusa Main Stage',
    motorcycleReg: 'UFR 104M',
    motorcycleMakeModel: 'Bajaj Boxer BM150 (Red)',
    motorcycleType: 'petrol',
    ownershipStatus: 'owner',
    ninDocumentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
    permitDocumentUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&auto=format&fit=crop&q=80',
    emergencyContactName: 'Kigozi Agnes (Mother)',
    emergencyContactPhone: '+256 782 994 001',
    verificationStatus: 'under_review',
    subscriptionTier: 'basic',
    subscriptionStatus: 'rejected',
    rejectionReason: 'Transaction amount (UGX 2,000) does not match Standard Rider plan fee (UGX 5,000). Please submit a valid transaction ID with correct plan amount.',
    subscriptionExpiry: '2026-11-05',
    lastPaymentSubmissionId: 'sub-tx-03',
    rating: 4.4,
    completedTrips: 450,
    isOnline: false,
    helmetAvailable: false,
    registrationDate: '2026-09-12',
    walletBalanceUgx: 5000,
    phoneType: 'feature_phone',
    village: 'Kalagala',
    subCounty: 'Kikyusa',
    jobAlertPreferences: {
      enabled: true,
      preferredChannel: 'sms_only',
      optedOutSms: false,
      jobTypes: ['produce_transport', 'parcel_delivery', 'passenger_contract'],
      preferredSubCounties: ['Kikyusa'],
      updatedAt: '2026-11-01T08:00:00Z',
    },
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
    stageId: 'stage-kikyusa-main',
    stageName: 'Kikyusa Main Stage',
    motorcycleReg: 'UFH 612B',
    motorcycleMakeModel: 'Bajaj Boxer BM150 (Blue)',
    motorcycleType: 'petrol',
    ownershipStatus: 'owner',
    emergencyContactName: 'Wamala Grace',
    emergencyContactPhone: '+256 772 883 114',
    verificationStatus: 'verified',
    subscriptionTier: 'standard',
    subscriptionStatus: 'active',
    subscriptionExpiry: '2026-12-01',
    rating: 4.7,
    completedTrips: 632,
    isOnline: true,
    helmetAvailable: true,
    registrationDate: '2025-12-10',
    walletBalanceUgx: 24000,
    phoneType: 'feature_phone',
    village: 'Kalagala',
    subCounty: 'Kikyusa',
    jobAlertPreferences: {
      enabled: true,
      preferredChannel: 'sms_only',
      optedOutSms: false,
      jobTypes: ['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda'],
      preferredSubCounties: ['Kikyusa', 'Bamunanika'],
      updatedAt: '2026-11-01T08:00:00Z',
    },
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
    stageId: 'stage-luweero-taxi-park',
    stageName: 'Luweero Taxi Park Boda Stage',
    motorcycleReg: 'UFP 734T',
    motorcycleMakeModel: 'TVS HLX 125 (Red)',
    motorcycleType: 'petrol',
    ownershipStatus: 'owner',
    emergencyContactName: 'Namazzi Jane',
    emergencyContactPhone: '+256 701 992 104',
    verificationStatus: 'verified',
    subscriptionTier: 'standard',
    subscriptionStatus: 'active',
    subscriptionExpiry: '2026-12-05',
    rating: 4.8,
    completedTrips: 510,
    isOnline: true,
    helmetAvailable: true,
    registrationDate: '2026-01-18',
    walletBalanceUgx: 19500,
    phoneType: 'feature_phone',
    village: 'Luweero Central',
    subCounty: 'Luweero Town Council',
    jobAlertPreferences: {
      enabled: true,
      preferredChannel: 'sms_only',
      optedOutSms: false,
      jobTypes: ['produce_transport', 'parcel_delivery', 'corporate_boda', 'passenger_contract'],
      preferredSubCounties: ['Luweero Town Council', 'Kasana', 'Wobulenzi'],
      updatedAt: '2026-11-01T08:00:00Z',
    },
  },
];

// Initial Passenger
export const INITIAL_PASSENGERS: PassengerProfile[] = [
  {
    id: 'pass-prossy-01',
    userId: 'user-pass-prossy',
    fullName: 'Babirye Prossy',
    phone: '+256 772 901 882',
    residentialArea: 'Luweero Central, Near District Headquarters',
    trustedContactName: 'Kivumbi Patrick (Husband)',
    trustedContactPhone: '+256 701 442 309',
    rating: 5.0,
    totalRides: 48,
  },
  {
    id: 'pass-ivan-02',
    userId: 'user-pass-ivan',
    fullName: 'Nsubuga Ivan',
    phone: '+256 704 112 400',
    residentialArea: 'Kikyusa Trading Centre',
    trustedContactName: 'Nantongo Betty (Mother)',
    trustedContactPhone: '+256 788 332 100',
    rating: 4.9,
    totalRides: 19,
  },
];

// Initial Businesses (Mechanics & Spare Parts in Luweero)
export const INITIAL_BUSINESSES: BusinessListing[] = [
  {
    id: 'biz-ssekandi-garage',
    name: 'Ssekandi Motorcycle Garage & Vulcanising',
    ownerName: 'Makanika Ssekandi Fred',
    phone: '+256 775 889 120',
    location: 'Luweero-Kikyusa Road, near Kikyusa Trading Centre',
    subCounty: 'Kikyusa',
    category: 'garage',
    rating: 4.9,
    reviewCount: 68,
    operatingHours: '07:00 AM - 08:30 PM (Mon - Sat)',
    verified: true,
    isPromoted: true,
    emergencyCallout: true,
    services: [
      { name: 'Full Engine Overhaul (Bajaj / TVS)', priceUgx: 45000, description: 'Piston, ring, valves, and oil seal refit with warranty' },
      { name: 'Brake Shoe & Cable Replacement', priceUgx: 12000, description: 'Genuine high-friction shoes installed with cable lubing' },
      { name: 'Tyre Puncture Vulcanising (Hot Patch)', priceUgx: 4000, description: 'Heavy duty hot vulcanising for rough murram roads' },
      { name: 'Chain & Sprocket Kit Fitment', priceUgx: 15000, description: 'Tensioning and wheel alignment included' },
    ],
  },
  {
    id: 'biz-luweero-spares',
    name: 'Luweero Genuine Bajaj & TVS Spares',
    ownerName: 'Hajji Kateregga Sulaiman',
    phone: '+256 702 441 800',
    location: 'Opposite Stanbic Bank, Kampala-Gulu Highway, Luweero Town',
    subCounty: 'Luweero Town Council',
    category: 'spares',
    rating: 4.8,
    reviewCount: 92,
    operatingHours: '07:30 AM - 07:00 PM',
    verified: true,
    isPromoted: true,
    emergencyCallout: false,
    services: [
      { name: 'Original Total 2T / 4T Engine Oil (1L)', priceUgx: 18000, description: 'Direct from TotalEnergies Uganda distributor' },
      { name: 'Bajaj Boxer Heavy Duty Rear Tyre (3.00-17)', priceUgx: 75000, description: 'Rugged deep-tread terrain tyre for murram conditions' },
      { name: 'TVS HLX 125 Clutch Plates Set', priceUgx: 28000, description: 'Genuine TVS factory sealed clutch pack' },
      { name: 'Exide 12V Boda Battery with Acid', priceUgx: 65000, description: '6 months warranty with free voltage testing' },
    ],
  },
  {
    id: 'biz-kasana-tyres',
    name: 'Mugerwa Quick Tyre Repair & Alignment',
    ownerName: 'Mugerwa Charles',
    phone: '+256 781 990 234',
    location: 'Kasana Market Roundabout, Luweero',
    subCounty: 'Kasana',
    category: 'tyres',
    rating: 4.7,
    reviewCount: 44,
    operatingHours: '06:30 AM - 09:00 PM (Daily)',
    verified: true,
    isPromoted: false,
    emergencyCallout: true,
    services: [
      { name: 'Tube Patching & Valve Core Fix', priceUgx: 3500, description: 'Instant roadside repair' },
      { name: 'Tubeless Conversion Kit & Sealant', priceUgx: 35000, description: 'Prevents sudden deflation on long rural trips' },
    ],
  },
  {
    id: 'biz-kikyusa-rescue',
    name: 'Kikyusa 24/7 Breakdown Towing & Rescue',
    ownerName: 'Kibirige Dan',
    phone: '+256 777 400 911',
    location: 'Kikyusa Centre, Luweero',
    subCounty: 'Kikyusa',
    category: 'towing',
    rating: 5.0,
    reviewCount: 31,
    operatingHours: '24 Hours Emergency Dispatch',
    verified: true,
    isPromoted: false,
    emergencyCallout: true,
    services: [
      { name: 'Roadside Motorcycle Transport to Garage', priceUgx: 25000, description: 'Specialized pickup carrier within 25km radius' },
      { name: 'Emergency Fuel Delivery (2 Litres Petrol)', priceUgx: 16000, description: 'Dispatched to rural road if stalled out of petrol' },
    ],
  },
];

// Initial Bookings
export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'bk-2026-091',
    type: 'ride',
    passengerId: 'pass-prossy-01',
    passengerName: 'Babirye Prossy',
    passengerPhone: '+256 772 901 882',
    riderId: 'rider-kato-moses',
    riderName: 'Kato Moses',
    riderPhone: '+256 774 912 304',
    riderBike: 'Bajaj Boxer BM150 (UFG 421K)',
    pickupLocation: 'Luweero Central Market',
    destination: 'Kikyusa Health Centre IV',
    distanceKm: 14.5,
    fareUgx: 12000,
    status: 'in_progress',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'bk-2026-088',
    type: 'delivery',
    passengerId: 'pass-ivan-02',
    passengerName: 'Nsubuga Ivan',
    passengerPhone: '+256 704 112 400',
    riderId: 'rider-ssempijja-ronald',
    riderName: 'Ssempijja Ronald',
    riderPhone: '+256 702 331 990',
    riderBike: 'TVS HLX 125 (UFA 819D)',
    pickupLocation: 'Luweero Agro-Farm Supply Shop',
    destination: 'Wobulenzi Trading Centre (Kakooza Farm)',
    distanceKm: 18.0,
    fareUgx: 16000,
    status: 'completed',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    rating: 5,
    reviewComment: 'Arrived very fast, safely delivered 2 sacks of improved hybrid maize seed without tears.',
    deliveryDetails: {
      senderName: 'Nsubuga Ivan (Agro Dealer)',
      senderPhone: '+256 704 112 400',
      recipientName: 'Mzee Kakooza Dan',
      recipientPhone: '+256 752 443 219',
      parcelDescription: '2 bags Maize Seed (Longe 5) + 1 box Veterinary Medicine',
      deliveryInstructions: 'Call Mzee Kakooza when reaching Wobulenzi junction.',
    },
  },
  {
    id: 'bk-2026-085',
    type: 'ride',
    passengerId: 'pass-prossy-01',
    passengerName: 'Babirye Prossy',
    passengerPhone: '+256 772 901 882',
    riderId: 'rider-kato-moses',
    riderName: 'Kato Moses',
    riderPhone: '+256 774 912 304',
    riderBike: 'Bajaj Boxer BM150 (UFG 421K)',
    pickupLocation: 'Kasana Market',
    destination: 'Luweero District Headquarters',
    distanceKm: 4.2,
    fareUgx: 5000,
    status: 'completed',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 23.5 * 3600 * 1000).toISOString(),
    rating: 5,
    reviewComment: 'Very disciplined rider, clean helmet provided and drove at moderate safe speed.',
  },
];

// Initial Income Records for Kato Moses
export const INITIAL_INCOME: IncomeRecord[] = [
  {
    id: 'inc-01',
    riderId: 'rider-kato-moses',
    date: new Date().toISOString().split('T')[0],
    category: 'transport',
    amountUgx: 15000,
    description: '3 Trips: Kikyusa town to Zirobwe road junction',
    paymentMethod: 'cash',
    isSynced: true,
  },
  {
    id: 'inc-02',
    riderId: 'rider-kato-moses',
    date: new Date().toISOString().split('T')[0],
    category: 'delivery',
    amountUgx: 12000,
    description: 'Carried milk canisters from Mzee Mukasa to dairy cooler',
    paymentMethod: 'mobile_money',
    isSynced: true,
  },
  {
    id: 'inc-03',
    riderId: 'rider-kato-moses',
    date: new Date().toISOString().split('T')[0],
    category: 'transport',
    amountUgx: 8000,
    description: 'School transport drop: St. Jude Kikyusa',
    paymentMethod: 'cash',
    isSynced: true,
  },
  {
    id: 'inc-04',
    riderId: 'rider-kato-moses',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    category: 'transport',
    amountUgx: 42000,
    description: 'Full day trips around Luweero town & Kasana',
    paymentMethod: 'cash',
    isSynced: true,
  },
  {
    id: 'inc-05',
    riderId: 'rider-kato-moses',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    category: 'delivery',
    amountUgx: 25000,
    description: 'Delivered spare parts from Luweero to Kikyusa garage',
    paymentMethod: 'mobile_money',
    isSynced: true,
  },
];

// Initial Expense Records for Kato Moses
export const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-01',
    riderId: 'rider-kato-moses',
    date: new Date().toISOString().split('T')[0],
    category: 'fuel',
    amountUgx: 12000,
    description: 'Shell Luweero: 2.2 litres Unleaded Petrol',
    isSynced: true,
  },
  {
    id: 'exp-02',
    riderId: 'rider-kato-moses',
    date: new Date().toISOString().split('T')[0],
    category: 'stage_contribution',
    amountUgx: 1000,
    description: 'Daily Stage Welfare Pot (Kikyusa Main Stage)',
    isSynced: true,
  },
  {
    id: 'exp-03',
    riderId: 'rider-kato-moses',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    category: 'fuel',
    amountUgx: 15000,
    description: 'TotalEnergies petrol top up',
    isSynced: true,
  },
  {
    id: 'exp-04',
    riderId: 'rider-kato-moses',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    category: 'engine_oil',
    amountUgx: 18000,
    description: 'Total 4T Special Engine Oil change at Ssekandi Garage',
    isSynced: true,
  },
];

// Maintenance Reminders
export const INITIAL_MAINTENANCE: MaintenanceReminder[] = [
  {
    id: 'maint-01',
    riderId: 'rider-kato-moses',
    item: 'Engine Oil Change (Total 4T)',
    lastServiceKm: 18400,
    nextServiceKm: 19900,
    currentKm: 19780,
    dueDate: 'In 120 km (approx. 2 days)',
    status: 'due_soon',
    costEstimateUgx: 18000,
  },
  {
    id: 'maint-02',
    riderId: 'rider-kato-moses',
    item: 'Drive Chain Tension & Lubrication',
    lastServiceKm: 19200,
    nextServiceKm: 20200,
    currentKm: 19780,
    dueDate: 'In 420 km',
    status: 'ok',
    costEstimateUgx: 3000,
  },
  {
    id: 'maint-03',
    riderId: 'rider-kato-moses',
    item: 'Rear Brake Shoe Inspection',
    lastServiceKm: 16000,
    nextServiceKm: 19500,
    currentKm: 19780,
    dueDate: 'Overdue by 280 km',
    status: 'overdue',
    costEstimateUgx: 12000,
  },
];

// Initial Emergency Incidents
export const INITIAL_INCIDENTS: EmergencyIncident[] = [
  {
    id: 'sos-2026-01',
    riderId: 'rider-kigozi-gerald',
    riderName: 'Kigozi Gerald',
    riderPhone: '+256 756 123 889',
    motorcycleReg: 'UFR 104M',
    stageName: 'Kikyusa Main Stage',
    category: 'mechanical_breakdown',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    locationName: 'Kikyusa-Bamunanika murram road, 3km after swamp bridge',
    lat: 0.7921,
    lng: 32.6412,
    status: 'active',
    assignedResponder: 'Officer Ntale (Kikyusa Police Post) + Ssekandi Garage',
    notes: 'Engine seized after hitting deep water-filled pothole. Breakdown rescue truck enroute.',
    dispatchedTo: ['Kikyusa Police Post', 'Stage Chairman Mugisha', 'Luweero Dispatch Admin'],
  },
  {
    id: 'sos-2026-00',
    riderId: 'rider-ssempijja-ronald',
    riderName: 'Ssempijja Ronald',
    riderPhone: '+256 702 331 990',
    motorcycleReg: 'UFA 819D',
    stageName: 'Luweero Taxi Park',
    category: 'robbery',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    locationName: 'Near Kasana railway line crossing',
    lat: 0.8550,
    lng: 32.4890,
    status: 'resolved',
    assignedResponder: 'Luweero Central Police Flying Squad',
    notes: 'Thieves attempted snatching bike at 9:30 PM. BodaCare SOS triggered instant stage response, 6 nearby riders arrived in 3 mins. Suspect fled, bike secured safely.',
    dispatchedTo: ['Luweero Central Police Station', 'Stage Leader Wasswa', 'BodaCare Rapid Response'],
  },
];

// Initial Stage Announcements
export const INITIAL_ANNOUNCEMENTS: StageAnnouncement[] = [
  {
    id: 'ann-01',
    stageId: 'stage-kikyusa-main',
    title: 'Monthly Stage General Meeting & Welfare Audit',
    content: 'All 38 members of Kikyusa Main Stage are required to attend this Sunday 3:00 PM at the Community Hall. We will review our welfare savings and issue new BodaCare high-vis reflector vests.',
    author: 'Chairman Mugisha David',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    priority: 'urgent',
  },
  {
    id: 'ann-02',
    stageId: 'stage-kikyusa-main',
    title: 'Police Road Safety Inspection Reminder',
    content: 'Luweero DPC reminds all riders: wear your helmet, carry your national ID, and have valid BodaCare digital registration ready.',
    author: 'Stage Secretary Lule',
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    priority: 'normal',
  },
];

// Initial Transactions
export const INITIAL_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'tx-2026-001',
    reference: 'BODACARE-MM-UGX-91823',
    userId: 'user-kato-01',
    userName: 'Kato Moses',
    userPhone: '+256 774 912 304',
    provider: 'MTN MoMo',
    amountUgx: 10000,
    purpose: 'subscription',
    planId: 'premium',
    status: 'completed',
    timestamp: '2026-10-28T09:14:22Z',
    operatorRef: 'MTN-UG-991204812',
  },
  {
    id: 'tx-2026-002',
    reference: 'BODACARE-AM-UGX-44129',
    userId: 'user-ronald-02',
    userName: 'Ssempijja Ronald',
    userPhone: '+256 702 331 990',
    provider: 'Airtel Money',
    amountUgx: 5000,
    purpose: 'subscription',
    planId: 'standard',
    status: 'completed',
    timestamp: '2026-10-15T14:20:10Z',
    operatorRef: 'AIRTEL-UG-3391024',
  },
  {
    id: 'tx-2026-003',
    reference: 'BODACARE-MM-UGX-88310',
    userId: 'biz-ssekandi-garage',
    userName: 'Ssekandi Fred (Garage)',
    userPhone: '+256 775 889 120',
    provider: 'MTN MoMo',
    amountUgx: 20000,
    purpose: 'business_promotion',
    status: 'completed',
    timestamp: '2026-10-20T11:05:00Z',
    operatorRef: 'MTN-UG-441029311',
  },
];

// Initial Mobile Money Payment Submissions for Verification
export const INITIAL_PAYMENT_SUBMISSIONS: PaymentSubmission[] = [
  {
    id: 'sub-tx-01',
    userId: 'rider-kato-moses',
    userName: 'Kato Moses',
    userPhone: '+256 774 912 304',
    network: 'MTN',
    amountUgx: 10000,
    transactionId: 'MM982341029',
    normalizedTxId: 'MM982341029',
    paymentDateTime: '2026-10-28 09:14',
    planId: 'premium',
    planName: 'Premium Rider Pro',
    screenshotName: 'mtn_momo_receipt_kato.png',
    screenshotUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80',
    status: 'approved',
    adminNotes: 'Transaction verified against Mukisa Brian MTN MoMo merchant statement. Subscription activated for 30 days.',
    reviewedAt: '2026-10-28T09:30:00Z',
    reviewedBy: 'Mukisa Brian',
    submittedAt: '2026-10-28T09:15:00Z',
  },
  {
    id: 'sub-tx-02',
    userId: 'rider-mugwanya-isaac',
    userName: 'Mugwanya Isaac',
    userPhone: '+256 788 412 900',
    network: 'MTN',
    amountUgx: 5000,
    transactionId: 'MM778891024',
    normalizedTxId: 'MM778891024',
    paymentDateTime: '2026-10-31 08:30',
    planId: 'standard',
    planName: 'Standard Rider',
    screenshotName: 'mtn_sms_confirmation.jpg',
    screenshotUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80',
    status: 'pending',
    submittedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'sub-tx-03',
    userId: 'rider-kigozi-gerald',
    userName: 'Kigozi Gerald',
    userPhone: '+256 756 123 889',
    network: 'Airtel',
    amountUgx: 2000,
    transactionId: 'AT339102847',
    normalizedTxId: 'AT339102847',
    paymentDateTime: '2026-10-29 16:10',
    planId: 'standard',
    planName: 'Standard Rider',
    status: 'rejected',
    adminNotes: 'Transaction amount (UGX 2,000) does not match Standard Rider plan fee (UGX 5,000). Please submit a valid transaction ID with correct plan amount.',
    reviewedAt: '2026-10-29T17:00:00Z',
    reviewedBy: 'Mukisa Brian',
    submittedAt: '2026-10-29T16:15:00Z',
  },
  {
    id: 'sub-tx-04',
    userId: 'user-paul-03',
    userName: 'Ssemwogerere Paul',
    userPhone: '+256 701 552 819',
    network: 'Airtel',
    amountUgx: 10000,
    transactionId: 'AT552910381',
    normalizedTxId: 'AT552910381',
    paymentDateTime: '2026-10-31 10:15',
    planId: 'premium',
    planName: 'Premium Rider Pro',
    screenshotName: 'airtel_sms_proof.png',
    status: 'pending',
    submittedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

// Initial Audit Logs
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-01',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    actorName: 'Ronald Ssemakula (Platform Owner)',
    actorRole: 'super_admin',
    action: 'VERIFIED_RIDER',
    target: 'Kato Moses (UFG 421K)',
    details: 'Verified National ID CM910481023K4L and Class A Driving Permit. Approved for premium tier.',
  },
  {
    id: 'log-02',
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    actorName: 'Chairman Mugisha David',
    actorRole: 'stage_leader',
    action: 'RECORDED_STAGE_ATTENDANCE',
    target: 'Kikyusa Main Stage (36 riders present)',
    details: 'Daily welfare collection total UGX 36,000 reconciled with Mobile Money float.',
  },
  {
    id: 'log-03',
    timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    actorName: 'System Security Engine',
    actorRole: 'super_admin',
    action: 'EMERGENCY_DISPATCHED',
    target: 'Incident #sos-2026-01',
    details: 'Dispatched automated SOS packet with GPS (0.7921, 32.6412) to Luweero Police Command.',
  },
];

// Default Founder Profile
export const DEFAULT_FOUNDER_PROFILE: FounderProfile = {
  fullName: 'Brian Mukisa',
  title: 'Founder & Platform Director',
  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  businessName: 'BodaCare Uganda',
  phone: '+256 772 100 240',
  whatsappNumber: '+256 772 100 240',
  email: 'bmukisa@bodawerk.co.ug',
  location: 'Kikyusa, Luweero District, Uganda',
  description: 'BodaCare Uganda is an indigenous mobility and fintech enterprise dedicated to formalizing, digitizing, and protecting motorcycle taxi operators (boda-bodas) and rural passenger communities across Luweero District and nationwide.',
  logoUrl: '',
  supportPhone: '+256 701 450 900',
  supportEmail: 'support@bodacare.ug',
  emergencyHotline: '+256 414 610 220',
  website: 'https://bodacare.ug',
  updatedAt: new Date().toISOString(),
};

// Initial Platform Invitations
export const INITIAL_INVITATIONS: PlatformInvitation[] = [
  {
    id: 'inv-001',
    code: 'BODA-RIDER-7821',
    role: 'rider',
    targetName: 'Ssebuwufu John',
    targetPhone: '+256 775 889 123',
    targetStage: 'Kikyusa Main Stage',
    note: 'Invited by Founder at Kikyusa community baraza',
    createdDate: '2026-10-25',
    createdBy: 'Brian Mukisa (Founder)',
    status: 'registered',
    registeredUserName: 'Kato Moses',
    registeredDate: '2026-10-26',
    shareUrl: 'https://bodacare.ug/register?code=BODA-RIDER-7821',
    channel: 'whatsapp',
  },
  {
    id: 'inv-002',
    code: 'BODA-STAGE-4412',
    role: 'stage_leader',
    targetName: 'Chairman Lule Robert',
    targetPhone: '+256 754 390 128',
    targetStage: 'Wobulenzi Junction Stage',
    note: 'Official Stage Executive onboarding',
    createdDate: '2026-10-27',
    createdBy: 'Brian Mukisa (Founder)',
    status: 'approved',
    registeredUserName: 'Chairman Lule Robert',
    registeredDate: '2026-10-28',
    shareUrl: 'https://bodacare.ug/register?code=BODA-STAGE-4412',
    channel: 'whatsapp',
  },
  {
    id: 'inv-003',
    code: 'BODA-MECH-9021',
    role: 'mechanic',
    targetName: 'Makanika Ssekandi Fred',
    targetPhone: '+256 775 889 120',
    targetStage: 'Kikyusa Garage Zone',
    note: 'Accredited garage partnership',
    createdDate: '2026-10-28',
    createdBy: 'Brian Mukisa (Founder)',
    status: 'approved',
    registeredUserName: 'Ssekandi Fred (Garage)',
    registeredDate: '2026-10-29',
    shareUrl: 'https://bodacare.ug/register?code=BODA-MECH-9021',
    channel: 'direct_link',
  },
  {
    id: 'inv-004',
    code: 'BODA-PASS-1123',
    role: 'passenger',
    targetName: 'Babirye Prossy',
    targetPhone: '+256 772 901 882',
    note: 'Luweero Market trader referral',
    createdDate: '2026-10-29',
    createdBy: 'Brian Mukisa (Founder)',
    status: 'registered',
    registeredUserName: 'Babirye Prossy',
    registeredDate: '2026-10-30',
    shareUrl: 'https://bodacare.ug/register?code=BODA-PASS-1123',
    channel: 'sms',
  },
  {
    id: 'inv-005',
    code: 'BODA-DELIV-5510',
    role: 'delivery',
    targetName: 'Mukasa Dan',
    targetPhone: '+256 701 445 221',
    targetStage: 'Kasana Market',
    note: 'Produce and seed delivery partner',
    createdDate: '2026-10-30',
    createdBy: 'Brian Mukisa (Founder)',
    status: 'pending',
    shareUrl: 'https://bodacare.ug/register?code=BODA-DELIV-5510',
    channel: 'whatsapp',
  },
];

// Initial Users
export const INITIAL_USERS: User[] = [
  {
    id: 'user-founder-01',
    fullName: 'Brian Mukisa',
    phone: '+256 772 100 240',
    email: 'bmukisa@bodawerk.co.ug',
    role: 'super_admin',
    isSuperAdmin: true,
    location: 'Kikyusa, Luweero District',
    accountType: 'Founder & Super Administrator',
    createdAt: '2025-01-01',
    preferredLanguage: 'en',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-kato-01',
    fullName: 'Kato Moses',
    phone: '+256 774 912 304',
    email: 'kato.moses@gmail.com',
    role: 'rider',
    isSuperAdmin: false,
    location: 'Kikyusa Town',
    accountType: 'Boda-Boda Operator',
    createdAt: '2025-08-14',
    preferredLanguage: 'lg',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'user-pass-prossy',
    fullName: 'Babirye Prossy',
    phone: '+256 772 901 882',
    email: 'prossy.babirye@yahoo.com',
    role: 'passenger',
    isSuperAdmin: false,
    location: 'Luweero Central',
    accountType: 'Passenger / Customer',
    createdAt: '2025-09-10',
    preferredLanguage: 'en',
  },
  {
    id: 'user-mugisha-chair',
    fullName: 'Chairman Mugisha David',
    phone: '+256 772 458 912',
    role: 'stage_leader',
    isSuperAdmin: false,
    location: 'Kikyusa Main Stage',
    accountType: 'Stage Leader (Chairman)',
    createdAt: '2025-06-01',
    preferredLanguage: 'lg',
  },
  {
    id: 'user-ssekandi-mech',
    fullName: 'Makanika Ssekandi Fred',
    phone: '+256 775 889 120',
    role: 'mechanic',
    isSuperAdmin: false,
    location: 'Luweero-Kikyusa Road',
    accountType: 'Garage & Spares Proprietor',
    createdAt: '2025-07-15',
    preferredLanguage: 'en',
  },
  {
    id: 'user-station-opio',
    fullName: 'Opio Samuel',
    phone: '+256 701 334 112',
    email: 'opio.samuel@bodawerk.co.ug',
    role: 'station_operator',
    isSuperAdmin: false,
    location: 'Kikyusa Trading Centre',
    accountType: 'Battery Swap Station Operator',
    createdAt: '2025-09-01',
    preferredLanguage: 'en',
  },
  {
    id: 'user-employer-coop',
    fullName: 'Nsubuga Henry',
    phone: '+256 782 550 918',
    email: 'kikyusacoffee@coop.ug',
    role: 'employer',
    isSuperAdmin: false,
    location: 'Kikyusa & Kasana',
    accountType: 'Agricultural Produce Dispatcher',
    createdAt: '2025-09-15',
    preferredLanguage: 'en',
  },
];

// Initial Electric Bike Battery Swap Stations in Luweero District
export const INITIAL_SWAP_STATIONS: BatterySwapStation[] = [
  {
    id: 'station-kikyusa-main',
    name: 'Kikyusa Bodawerk E-Hub (Main)',
    operatorName: 'Opio Samuel',
    operatorPhone: '+256 701 334 112',
    locationName: 'Opposite Health Centre IV Roundabout, Kikyusa',
    subCounty: 'Kikyusa',
    lat: 0.8145,
    lng: 32.6121,
    totalBatteries: 20,
    availableBatteries: 14,
    chargingBatteries: 6,
    batteryBrand: 'Bodawerk',
    connectorType: 'Chogori 2+1+5 Pin High-Amp',
    swapFeeUgx: 3500,
    operatingHours: '24 Hours / 7 Days',
    powerSource: 'solar_hybrid',
    verified: true,
    status: 'open',
    rating: 4.9,
    lastStockUpdate: new Date().toISOString(),
    amenities: ['24/7 Solar Backup', 'Free WiFi', 'Digital Tyre Inflator', 'Clean Drinking Water', 'Rider Lounge'],
  },
  {
    id: 'station-luweero-zembo',
    name: 'Luweero Town Zembo Solar Station',
    operatorName: 'Kintu Andrew',
    operatorPhone: '+256 772 884 102',
    locationName: 'Behind TotalEnergies, Kampala-Gulu Highway',
    subCounty: 'Luweero Town Council',
    lat: 0.8492,
    lng: 32.4934,
    totalBatteries: 24,
    availableBatteries: 18,
    chargingBatteries: 6,
    batteryBrand: 'Zembo',
    connectorType: 'Anderson SB50 Quick-Lock',
    swapFeeUgx: 4000,
    operatingHours: '06:00 AM - 11:00 PM',
    powerSource: 'solar_hybrid',
    verified: true,
    status: 'open',
    rating: 4.8,
    lastStockUpdate: new Date(Date.now() - 20 * 60000).toISOString(),
    amenities: ['Solar Hybrid Grid', 'Motorcycle Wash Bay', 'TVS & Zembo Certified Mechanic'],
  },
  {
    id: 'station-wobulenzi-spiro',
    name: 'Wobulenzi Spiro Highway Swap Point',
    operatorName: 'Nabukeera Betty',
    operatorPhone: '+256 754 110 392',
    locationName: 'Wobulenzi Junction Stage, Near Stanbic ATM',
    subCounty: 'Wobulenzi',
    lat: 0.7214,
    lng: 32.5312,
    totalBatteries: 16,
    availableBatteries: 9,
    chargingBatteries: 7,
    batteryBrand: 'Spiro',
    connectorType: 'Rosenberger RoPD Heavy Duty',
    swapFeeUgx: 3800,
    operatingHours: '06:00 AM - 10:00 PM',
    powerSource: 'grid',
    verified: true,
    status: 'open',
    rating: 4.7,
    lastStockUpdate: new Date(Date.now() - 45 * 60000).toISOString(),
    amenities: ['Highway Rest Stop', 'Automated Battery Bay', 'Mobile Money Cash Out'],
  },
  {
    id: 'station-kasana-market',
    name: 'Kasana Market Green Energy Swap Hub',
    operatorName: 'Walusimbi Deo',
    operatorPhone: '+256 703 992 411',
    locationName: 'Kasana Fresh Produce Market Gate 2',
    subCounty: 'Kasana',
    lat: 0.8621,
    lng: 32.4819,
    totalBatteries: 18,
    availableBatteries: 4,
    chargingBatteries: 14,
    batteryBrand: 'Bodawerk',
    connectorType: 'Chogori Universal',
    swapFeeUgx: 3500,
    operatingHours: '05:30 AM - 09:30 PM',
    powerSource: 'solar_hybrid',
    verified: true,
    status: 'congested',
    rating: 4.6,
    lastStockUpdate: new Date(Date.now() - 10 * 60000).toISOString(),
    amenities: ['High Turnover Hub', 'Market Produce Loading Dock', 'Puncture Repair'],
  },
  {
    id: 'station-bamunanika-solar',
    name: 'Bamunanika Community Solar Depot',
    operatorName: 'Namatovu Grace',
    operatorPhone: '+256 788 661 204',
    locationName: 'Bamunanika Palace Trading Centre',
    subCounty: 'Bamunanika',
    lat: 0.7921,
    lng: 32.6412,
    totalBatteries: 12,
    availableBatteries: 10,
    chargingBatteries: 2,
    batteryBrand: 'Bodawerk',
    connectorType: 'Chogori Universal',
    swapFeeUgx: 3500,
    operatingHours: '07:00 AM - 08:00 PM',
    powerSource: 'solar_only',
    verified: true,
    status: 'open',
    rating: 4.9,
    lastStockUpdate: new Date(Date.now() - 60 * 60000).toISOString(),
    amenities: ['Pure Solar PV System', 'Emergency Battery Reserve for Clinic Ambulances'],
  },
];

// Initial Boda Jobs & Delivery Opportunities
export const INITIAL_JOBS: BodaJob[] = [
  {
    id: 'job-coffee-01',
    employerId: 'user-employer-coop',
    employerName: 'Nsubuga Henry',
    employerPhone: '+256 782 550 918',
    employerCompany: 'Kikyusa Coffee Growers Cooperative',
    title: 'Daily Parchment Coffee Transport to Kasana Processing Mill',
    type: 'produce_transport',
    description: 'Transport 4 to 6 bags of dried parchment coffee from our Kikyusa collection centre to Kasana Mill. Requires a sturdy motorcycle carrier with weather-proof straps. Regular daily runs available through harvest season.',
    pickupLocation: 'Kikyusa Cooperative Bulking Store, Block 4',
    deliveryLocation: 'Kasana Quality Coffee Mill, Factory Gate',
    subCounty: 'Kikyusa',
    distanceKm: 15.2,
    cargoWeightKg: 85,
    cargoDescription: 'Export-grade dried parchment coffee bags',
    paymentAmountUgx: 35000,
    paymentFrequency: 'per_trip',
    requiredMotorcycleType: 'any',
    status: 'open',
    postedDate: new Date(Date.now() - 3 * 3600000).toISOString().split('T')[0],
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    applicationsCount: 4,
    adminApproved: true,
    village: 'Kikyusa Central',
    requirements: 'Valid Class A driving permit, sturdy rear luggage carrier, tarpaulin straps.',
    applicationInstructions: 'Apply in BodaCare app or call Nsubuga Henry on +256 782 550 918 with your Rider ID.',
    verifiedBy: 'Brian Mukisa',
    verifiedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'job-pharma-02',
    employerId: 'emp-medipharm',
    employerName: 'Dr. Sarah Nalwanga',
    employerPhone: '+256 774 201 983',
    employerCompany: 'Medipharm Luweero District Depot',
    title: 'Urgent Cold-Chain Vaccine & Antibiotic Clinic Dispatch',
    type: 'scheduled_courier',
    description: 'Delivering temperature-sensitive vaccine flasks and essential antibiotics to rural clinics in Kikyusa Health Centre IV and Bamunanika Sub-County Dispensary. Strict adherence to non-vibrating, smooth riding required.',
    pickupLocation: 'Stanbic Bank Plaza 1st Floor, Luweero Town',
    deliveryLocation: 'Kikyusa Health Centre IV Pharmacy',
    subCounty: 'Luweero Town Council',
    distanceKm: 22.4,
    cargoWeightKg: 12,
    cargoDescription: 'Insulated cooler flask containing routine childhood vaccines',
    paymentAmountUgx: 45000,
    paymentFrequency: 'per_trip',
    requiredMotorcycleType: 'electric',
    status: 'open',
    postedDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    applicationsCount: 2,
    adminApproved: true,
  },
  {
    id: 'job-dairy-03',
    employerId: 'emp-dairy-coop',
    employerName: 'Mugisha Patrick',
    employerPhone: '+256 752 443 219',
    employerCompany: 'Luweero Fresh Dairy Association',
    title: 'Daily Morning Milk Cans Run to Wobulenzi Cooler',
    type: 'produce_transport',
    description: 'Morning pickup of 2 x 50-litre milk cans from farmers along Zirobwe-Wobulenzi road into the main cooling tank. Daily contract at UGX 20,000 per morning (UGX 140,000 paid weekly via Mobile Money).',
    pickupLocation: 'Kikyusa Farm Junction Boda Stage',
    deliveryLocation: 'Wobulenzi Chilling Plant',
    subCounty: 'Wobulenzi',
    distanceKm: 11.0,
    cargoWeightKg: 100,
    cargoDescription: '2 aluminium dairy cans (raw whole milk)',
    paymentAmountUgx: 20000,
    paymentFrequency: 'daily',
    requiredMotorcycleType: 'any',
    status: 'open',
    postedDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    deadline: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    applicationsCount: 5,
    adminApproved: true,
  },
  {
    id: 'job-hardware-04',
    employerId: 'emp-hardware-01',
    employerName: 'Sserunjogi Daniel',
    employerPhone: '+256 701 889 443',
    employerCompany: 'Sserunjogi Hardware & Builders Store',
    title: 'Heavy Fasteners & Paint Tins Delivery to School Construction Site',
    type: 'parcel_delivery',
    description: 'Dispatch 4 tins of weather-guard paint and 20kg structural bolts to the classroom construction site at Kikyusa High School.',
    pickupLocation: 'Kikyusa Main Street Hardware',
    deliveryLocation: 'Kikyusa High School Construction Site',
    subCounty: 'Kikyusa',
    distanceKm: 4.8,
    cargoWeightKg: 60,
    cargoDescription: 'Sadolin paint tins and galvanized steel bolts',
    paymentAmountUgx: 25000,
    paymentFrequency: 'one_time',
    requiredMotorcycleType: 'any',
    status: 'assigned',
    postedDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    applicationsCount: 3,
    adminApproved: true,
    assignedRiderId: 'rider-kato-moses',
    assignedRiderName: 'Kato Moses (UFG 421K)',
  },
];

// Initial Job Applications
export const INITIAL_JOB_APPLICATIONS: JobApplication[] = [
  {
    id: 'app-01',
    jobId: 'job-coffee-01',
    jobTitle: 'Daily Parchment Coffee Transport to Kasana Processing Mill',
    employerCompany: 'Kikyusa Coffee Growers Cooperative',
    riderId: 'rider-kato-moses',
    riderName: 'Kato Moses',
    riderPhone: '+256 774 912 304',
    riderIdNumber: 'BCU-LWR-0421',
    bikeReg: 'UFG 421K (Electric Bodawerk)',
    proposedRateUgx: 35000,
    coverNote: 'I have a heavy-duty reinforced carrier and electric torque perfect for steep murram slopes with 90kg load. Stationed directly at Kikyusa Main Stage.',
    appliedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: 'pending',
  },
  {
    id: 'app-02',
    jobId: 'job-pharma-02',
    jobTitle: 'Urgent Cold-Chain Vaccine & Antibiotic Clinic Dispatch',
    employerCompany: 'Medipharm Luweero District Depot',
    riderId: 'rider-kato-moses',
    riderName: 'Kato Moses',
    riderPhone: '+256 774 912 304',
    riderIdNumber: 'BCU-LWR-0421',
    bikeReg: 'UFG 421K',
    proposedRateUgx: 45000,
    coverNote: 'I operate an electric E-Boda with zero vibration, smooth regenerative braking, and 48V power outlet for digital cooler monitoring. Verified Grade A Permit.',
    appliedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    status: 'shortlisted',
  },
  {
    id: 'app-03',
    jobId: 'job-coffee-01',
    jobTitle: 'Daily Parchment Coffee Transport to Kasana Processing Mill',
    employerCompany: 'Kikyusa Coffee Growers Cooperative',
    riderId: 'rider-ssempijja-ronald',
    riderName: 'Ssempijja Ronald',
    riderPhone: '+256 702 331 990',
    riderIdNumber: 'BCU-LWR-0819',
    bikeReg: 'UFA 819D (TVS HLX 125)',
    proposedRateUgx: 34000,
    coverNote: 'Know the Kikyusa-Kasana short-cut road well. Regular haulage experience.',
    appliedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    status: 'pending',
  },
];

// Initial Repair Requests
export const INITIAL_REPAIR_REQUESTS: RepairRequest[] = [
  {
    id: 'rep-01',
    riderId: 'rider-kato-moses',
    riderName: 'Kato Moses',
    riderPhone: '+256 774 912 304',
    motorcycleReg: 'UFG 421K',
    motorcycleType: 'electric',
    garageId: 'biz-01',
    garageName: 'Makanika Ssekandi Precision Garage & Spares',
    serviceType: 'Drive Chain Adjustment & Front Fork Bushing Replacement',
    description: 'Chain slack causing slapping on swingarm; front fork making clicking noise on potholed murram sections.',
    urgency: 'urgent',
    location: 'Kikyusa Main Stage, 50m from garage',
    status: 'completed',
    estimatedCostUgx: 25000,
    finalCostUgx: 23000,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    completedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    mechanicNotes: 'Fitted genuine heavy-gauge 428H roller chain. Fork seals lubricated.',
  },
  {
    id: 'rep-02',
    riderId: 'rider-mugwanya-isaac',
    riderName: 'Mugwanya Isaac',
    riderPhone: '+256 788 412 900',
    motorcycleReg: 'UEX 902C',
    motorcycleType: 'electric',
    garageId: 'biz-01',
    garageName: 'Makanika Ssekandi Precision Garage & Spares',
    serviceType: 'Electric Motor Controller Inspection & Throttle Calibration',
    description: 'Throttle response lagging when accelerating under heavy load; digital dash showing code E-04.',
    urgency: 'routine',
    location: 'Wobulenzi-Kikyusa Road',
    status: 'in_repair',
    estimatedCostUgx: 18000,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    mechanicNotes: 'Hall sensor harness cleaned and re-seated. Diagnostic scan normal.',
  },
  {
    id: 'rep-03',
    riderId: 'rider-kigozi-gerald',
    riderName: 'Kigozi Gerald',
    riderPhone: '+256 756 123 889',
    motorcycleReg: 'UFR 104M',
    motorcycleType: 'petrol',
    garageId: 'biz-02',
    garageName: 'Kasana Modern Cycle Clinic',
    serviceType: 'Roadside Breakdown: Rear Tyre Bead Puncture & Tube Replacement',
    description: 'Stuck with flat tyre on muddy incline 2km outside Kikyusa towards Bamunanika.',
    urgency: 'roadside_breakdown',
    location: 'Kikyusa-Bamunanika Road, swamp bridge',
    status: 'accepted',
    estimatedCostUgx: 16000,
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
    mechanicNotes: 'Dispatching apprentice on mobile unit with heavy-duty tube & foot pump.',
  },
];

// Initial Service Records (Digital Logbook)
export const INITIAL_SERVICE_RECORDS: ServiceRecord[] = [
  {
    id: 'srv-01',
    riderId: 'rider-kato-moses',
    motorcycleReg: 'UFG 421K',
    serviceDate: '2026-10-22',
    odometerKm: 18400,
    servicePerformed: 'Bodawerk Hub Motor Service & 48V Battery Terminal De-oxidation',
    partsReplaced: ['Terminal Copper Washers', 'High-Temp Hub Grease', 'Brake Pads (Front)'],
    mechanicName: 'Makanika Ssekandi Fred',
    garageName: 'Makanika Ssekandi Precision Garage',
    costUgx: 32000,
    nextServiceDueKm: 21400,
    notes: 'Battery health test: 94% capacity retention. Excellent electric drive performance.',
  },
  {
    id: 'srv-02',
    riderId: 'rider-kato-moses',
    motorcycleReg: 'UFG 421K',
    serviceDate: '2026-08-15',
    odometerKm: 15200,
    servicePerformed: 'Rear Shock Absorber Bushings & Heavy Duty Carrier Welding',
    partsReplaced: ['Rubber Bushings x 4', 'Reinforced Support Brackets'],
    mechanicName: 'Makanika Ssekandi Fred',
    garageName: 'Makanika Ssekandi Precision Garage',
    costUgx: 28000,
    nextServiceDueKm: 18400,
  },
  {
    id: 'srv-03',
    riderId: 'rider-ssempijja-ronald',
    motorcycleReg: 'UFA 819D',
    serviceDate: '2026-10-10',
    odometerKm: 22100,
    servicePerformed: 'Total 4T Special Engine Oil & Spark Plug Replacement',
    partsReplaced: ['Total 4T 20W50 Oil 1L', 'NGK Spark Plug CPR8EA', 'Fuel Filter'],
    mechanicName: 'Muwonge Charles',
    garageName: 'Kasana Modern Cycle Clinic',
    costUgx: 24000,
    nextServiceDueKm: 23600,
  },
];

// Initial External Services Configuration (Non-secret settings only; secret keys live strictly on server)
export const DEFAULT_EXTERNAL_CONFIG: ExternalServicesConfig = {
  smsProvider: 'africastalking',
  smsSenderId: 'BODACARE',
  whatsAppBusinessPhone: '+256 772 100 240',
  autoDispatchEnabled: true,
  updatedAt: new Date().toISOString(),
};

// Initial Complaints & Customer Support Reports
export const INITIAL_COMPLAINTS: ComplaintReport[] = [
  {
    id: 'cmp-01',
    userId: 'user-pass-prossy',
    userName: 'Babirye Prossy',
    userPhone: '+256 772 901 882',
    userRole: 'passenger',
    category: 'fare_dispute',
    subject: 'Fare discrepancy on Kasana to Kikyusa trip',
    description: 'System calculated UGX 7,000 based on standard distance, but the rider initially demanded UGX 10,000 due to wet road muddy conditions. Reconciled peacefully at stage.',
    status: 'resolved',
    submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    resolutionNotes: 'Stage Chairman Mugisha confirmed standard muddy weather tariff adjustment of UGX 1,500. Refund credited to customer wallet.',
  },
  {
    id: 'cmp-02',
    userId: 'user-kato-01',
    userName: 'Kato Moses',
    userPhone: '+256 774 912 304',
    userRole: 'rider',
    category: 'app_glitch',
    subject: 'Offline sync indicator showed 2 pending records after reconnecting in Kikyusa',
    description: 'During rural ride through Bamunanika murram, saved two trips in offline cache. On hitting 3G network in Kikyusa, required tapping Sync button twice.',
    status: 'resolved',
    submittedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    resolutionNotes: 'Updated local cache queue sync retry logic in storage engine.',
  },
];


// Helper to access LocalStorage safely with resilient in-memory fallback for Android WebViews & private browsing
class BodaStorage {
  private memoryFallback: Map<string, string> = new Map();
  private storageAvailable: boolean | null = null;

  private isStorageAvailable(): boolean {
    if (this.storageAvailable !== null) {
      return this.storageAvailable;
    }
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.storageAvailable = false;
        return false;
      }
      const testKey = '__boda_probe__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      this.storageAvailable = true;
      return true;
    } catch {
      this.storageAvailable = false;
      return false;
    }
  }

  private get<T>(key: string, fallback: T): T {
    const fullKey = `bodacare_${key}`;
    try {
      if (this.isStorageAvailable()) {
        const item = window.localStorage.getItem(fullKey);
        if (item !== null) {
          return JSON.parse(item);
        }
      }
    } catch {
      // Degrade gracefully to in-memory map
    }

    const memItem = this.memoryFallback.get(fullKey);
    if (memItem !== undefined) {
      try {
        return JSON.parse(memItem);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  private set<T>(key: string, value: T): void {
    const fullKey = `bodacare_${key}`;
    const serialized = JSON.stringify(value);
    // Always store in memory cache first so the session never loses state
    this.memoryFallback.set(fullKey, serialized);

    try {
      if (this.isStorageAvailable()) {
        window.localStorage.setItem(fullKey, serialized);
      }
    } catch {
      // Local storage unavailable or full; in-memory fallback active
    }
  }

  // Riders (hydrate new alert preference fields seamlessly without duplicates)
  getRiders(): RiderProfile[] {
    const raw = this.get<RiderProfile[]>('riders', INITIAL_RIDERS);
    return raw.map((r) => ({
      ...r,
      phoneType: r.phoneType || 'smartphone',
      subCounty:
        r.subCounty ||
        (r.stageName?.toLowerCase().includes('kikyusa') || r.residentialArea?.toLowerCase().includes('kikyusa')
          ? 'Kikyusa'
          : r.stageName?.toLowerCase().includes('wobulenzi') || r.residentialArea?.toLowerCase().includes('wobulenzi')
          ? 'Wobulenzi'
          : 'Luweero Town Council'),
      village: r.village || r.residentialArea?.split(',')[0] || 'Kikyusa Central',
      jobAlertPreferences: r.jobAlertPreferences || {
        enabled: true,
        preferredChannel: r.phoneType === 'feature_phone' ? 'sms_only' : 'auto',
        optedOutSms: false,
        jobTypes: ['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda', 'passenger_contract'],
        preferredSubCounties: ['Kikyusa', 'Luweero Town Council', 'Wobulenzi', 'Kasana'],
        updatedAt: r.registrationDate || new Date().toISOString(),
      },
    }));
  }

  saveRider(rider: RiderProfile): void {
    const riders = this.getRiders();
    const cleanPhone = (rider.phone || '').replace(/\s+/g, '');
    const idx = riders.findIndex(
      (r) => r.id === rider.id || (cleanPhone && (r.phone || '').replace(/\s+/g, '') === cleanPhone)
    );
    if (idx >= 0) {
      riders[idx] = { ...riders[idx], ...rider, id: riders[idx].id };
    } else {
      riders.unshift(rider);
    }
    this.set('riders', riders);
  }

  updateRiderStatus(riderId: string, status: RiderProfile['verificationStatus'], rejectionReason?: string): void {
    const riders = this.getRiders();
    const r = riders.find((x) => x.id === riderId);
    if (r) {
      r.verificationStatus = status;
      if (rejectionReason) {
        r.rejectionReason = rejectionReason;
      }
      this.set('riders', riders);
      this.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorName: 'Mukisa Brian (Founder & Super Admin)',
        actorRole: 'super_admin',
        action: `RIDER_STATUS_${status.toUpperCase()}`,
        target: `${r.fullName} (${r.motorcycleReg})`,
        details: rejectionReason
          ? `Status changed to ${status}. Reason: ${rejectionReason}`
          : `Updated verification status to ${status}.`,
      });

      // Send in-app notification to the rider
      this.addNotification({
        id: `notif-${Date.now()}`,
        title: status === 'verified' ? 'Account Verified!' : 'KYC Verification Update',
        message:
          status === 'verified'
            ? `Congratulations! Your BodaCare badge (${r.riderIdNumber || 'BCU-LWR'}) has been officially verified by Founder Mukisa Brian.`
            : `Your application status is now ${status}. ${rejectionReason ? `Note: ${rejectionReason}` : ''}`,
        type: 'system',
        timestamp: new Date().toISOString(),
        read: false,
        actionUrl: 'rider',
      });
    }
  }

  // Stages
  getStages(): Stage[] {
    return this.get<Stage[]>('stages', INITIAL_STAGES);
  }

  saveStage(stage: Stage): void {
    const stages = this.getStages();
    const idx = stages.findIndex((s) => s.id === stage.id);
    if (idx >= 0) {
      stages[idx] = stage;
    } else {
      stages.push(stage);
    }
    this.set('stages', stages);
  }

  // Bookings
  getBookings(): Booking[] {
    return this.get<Booking[]>('bookings', INITIAL_BOOKINGS);
  }

  createBooking(booking: Booking): void {
    const list = this.getBookings();
    list.unshift(booking);
    this.set('bookings', list);
  }

  updateBookingStatus(id: string, status: Booking['status'], rating?: number, review?: string): void {
    const list = this.getBookings();
    const b = list.find((x) => x.id === id);
    if (b) {
      b.status = status;
      if (status === 'completed') {
        b.completedAt = new Date().toISOString();
      }
      if (rating !== undefined) b.rating = rating;
      if (review !== undefined) b.reviewComment = review;
      this.set('bookings', list);
    }
  }

  // Income & Expenses
  getIncome(riderId: string): IncomeRecord[] {
    const all = this.get<IncomeRecord[]>('income', INITIAL_INCOME);
    return all.filter((i) => i.riderId === riderId);
  }

  getAllIncome(): IncomeRecord[] {
    return this.get<IncomeRecord[]>('income', INITIAL_INCOME);
  }

  addIncome(record: IncomeRecord): void {
    const all = this.get<IncomeRecord[]>('income', INITIAL_INCOME);
    all.unshift(record);
    this.set('income', all);
  }

  getExpenses(riderId: string): ExpenseRecord[] {
    const all = this.get<ExpenseRecord[]>('expenses', INITIAL_EXPENSES);
    return all.filter((e) => e.riderId === riderId);
  }

  getAllExpenses(): ExpenseRecord[] {
    return this.get<ExpenseRecord[]>('expenses', INITIAL_EXPENSES);
  }

  addExpense(record: ExpenseRecord): void {
    const all = this.get<ExpenseRecord[]>('expenses', INITIAL_EXPENSES);
    all.unshift(record);
    this.set('expenses', all);
  }

  // Maintenance
  getMaintenance(riderId: string): MaintenanceReminder[] {
    const all = this.get<MaintenanceReminder[]>('maintenance', INITIAL_MAINTENANCE);
    return all.filter((m) => m.riderId === riderId);
  }

  updateMaintenance(item: MaintenanceReminder): void {
    const all = this.get<MaintenanceReminder[]>('maintenance', INITIAL_MAINTENANCE);
    const idx = all.findIndex((m) => m.id === item.id);
    if (idx >= 0) all[idx] = item;
    else all.push(item);
    this.set('maintenance', all);
  }

  // Emergency Incidents
  getIncidents(): EmergencyIncident[] {
    return this.get<EmergencyIncident[]>('incidents', INITIAL_INCIDENTS);
  }

  reportEmergency(incident: EmergencyIncident): void {
    const list = this.getIncidents();
    list.unshift(incident);
    this.set('incidents', list);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: incident.riderName,
      actorRole: 'rider',
      action: 'EMERGENCY_SOS_TRIGGERED',
      target: `${incident.category.toUpperCase()} at ${incident.locationName}`,
      details: `Alerted ${incident.dispatchedTo.join(', ')}. Coordinates: ${incident.lat}, ${incident.lng}`,
    });
  }

  resolveIncident(id: string, notes: string): void {
    const list = this.getIncidents();
    const inc = list.find((x) => x.id === id);
    if (inc) {
      inc.status = 'resolved';
      inc.notes = notes;
      this.set('incidents', list);
    }
  }

  // Businesses
  getBusinesses(): BusinessListing[] {
    return this.get<BusinessListing[]>('businesses', INITIAL_BUSINESSES);
  }

  // Transactions
  getTransactions(): PaymentTransaction[] {
    return this.get<PaymentTransaction[]>('transactions', INITIAL_TRANSACTIONS);
  }

  addTransaction(tx: PaymentTransaction): void {
    const list = this.getTransactions();
    list.unshift(tx);
    this.set('transactions', list);
  }

  // Announcements
  getAnnouncements(stageId?: string): StageAnnouncement[] {
    const list = this.get<StageAnnouncement[]>('announcements', INITIAL_ANNOUNCEMENTS);
    if (!stageId) return list;
    return list.filter((a) => a.stageId === stageId || a.stageId === 'all');
  }

  addAnnouncement(ann: StageAnnouncement): void {
    const list = this.getAnnouncements();
    list.unshift(ann);
    this.set('announcements', list);
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);
  }

  addAuditLog(log: AuditLog): void {
    const logs = this.getAuditLogs();
    logs.unshift(log);
    this.set('audit_logs', logs.slice(0, 100)); // retain last 100
  }

  // Offline Sync Queue
  getSyncQueue(): { type: 'income' | 'expense'; data: IncomeRecord | ExpenseRecord }[] {
    return this.get('sync_queue', []);
  }

  addToSyncQueue(item: { type: 'income' | 'expense'; data: IncomeRecord | ExpenseRecord }): void {
    const queue = this.getSyncQueue();
    queue.push(item);
    this.set('sync_queue', queue);
  }

  flushSyncQueue(): number {
    const queue = this.getSyncQueue();
    const count = queue.length;
    queue.forEach((item) => {
      if (item.type === 'income') {
        const inc = item.data as IncomeRecord;
        inc.isSynced = true;
        this.addIncome(inc);
      } else {
        const exp = item.data as ExpenseRecord;
        exp.isSynced = true;
        this.addExpense(exp);
      }
    });
    this.set('sync_queue', []);
    return count;
  }

  // Founder and Business Profile
  getFounderProfile(): FounderProfile {
    return this.get<FounderProfile>('founder_profile', DEFAULT_FOUNDER_PROFILE);
  }

  saveFounderProfile(profile: FounderProfile): void {
    this.set('founder_profile', profile);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: profile.fullName,
      actorRole: 'super_admin',
      action: 'FOUNDER_PROFILE_UPDATED',
      target: profile.businessName,
      details: `Updated business contacts (${profile.phone}, ${profile.email}, location: ${profile.location}).`,
    });
  }

  // Platform Invitations
  getInvitations(): PlatformInvitation[] {
    return this.get<PlatformInvitation[]>('invitations', INITIAL_INVITATIONS);
  }

  createInvitation(invite: PlatformInvitation): void {
    const list = this.getInvitations();
    list.unshift(invite);
    this.set('invitations', list);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: invite.createdBy,
      actorRole: 'super_admin',
      action: 'INVITATION_ISSUED',
      target: `${invite.role.toUpperCase()} (${invite.code})`,
      details: `Generated invitation code ${invite.code} for ${invite.targetName || 'Member'} via ${invite.channel}.`,
    });
  }

  updateInvitationStatus(idOrCode: string, status: PlatformInvitation['status'], userName?: string): void {
    const list = this.getInvitations();
    const inv = list.find((i) => i.id === idOrCode || i.code.toLowerCase() === idOrCode.toLowerCase());
    if (inv) {
      inv.status = status;
      if (userName) inv.registeredUserName = userName;
      if (status === 'registered' || status === 'approved') {
        inv.registeredDate = new Date().toISOString().split('T')[0];
      }
      this.set('invitations', list);
    }
  }

  // Users & Authentication
  getUsers(): User[] {
    return this.get<User[]>('users', INITIAL_USERS);
  }

  saveUser(user: User): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id || u.phone === user.phone);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.unshift(user);
    }
    this.set('users', users);
  }

  getCurrentUser(): User | null {
    const stored = this.get<User | null>('current_user', null);
    if (stored) return stored;
    // Default to Founder Super Admin or Rider
    return INITIAL_USERS[0]; // Brian Mukisa
  }

  setCurrentUser(user: User | null): void {
    this.set('current_user', user);
  }

  // --- Mobile Money Payment Verification & Duplicate Prevention Engine ---

  getPaymentSubmissions(): PaymentSubmission[] {
    return this.get<PaymentSubmission[]>('payment_submissions', INITIAL_PAYMENT_SUBMISSIONS);
  }

  getPaymentSubmissionById(id: string): PaymentSubmission | undefined {
    return this.getPaymentSubmissions().find((s) => s.id === id);
  }

  getUserSubmissions(userIdOrPhone: string): PaymentSubmission[] {
    const list = this.getPaymentSubmissions();
    const cleanPhone = userIdOrPhone.replace(/[^0-9]/g, '');
    return list.filter((s) => {
      const subCleanPhone = s.userPhone.replace(/[^0-9]/g, '');
      return (
        s.userId === userIdOrPhone ||
        s.userPhone === userIdOrPhone ||
        (cleanPhone.length > 6 && subCleanPhone.includes(cleanPhone.slice(-9)))
      );
    });
  }

  /**
   * Strict duplicate check:
   * Normalizes the transaction ID (trims spaces, removes internal whitespace, converts to uppercase)
   * and verifies whether it has ever been submitted across the entire system
   * regardless of whether it is approved, pending, or rejected.
   */
  isTransactionIdUsed(txId: string): boolean {
    const normalized = normalizeTransactionId(txId);
    if (!normalized) return false;
    const submissions = this.getPaymentSubmissions();
    return submissions.some((s) => s.normalizedTxId === normalized);
  }

  /**
   * Atomic submission of Mobile Money payment details for verification by Mukisa Brian.
   * Enforces strict uniqueness before writing to storage.
   */
  submitPayment(submissionData: {
    userId: string;
    userName: string;
    userPhone: string;
    network: 'MTN' | 'Airtel';
    amountUgx: number;
    transactionId: string;
    paymentDateTime: string;
    planId: SubscriptionTier;
    planName: string;
    screenshotUrl?: string;
    screenshotName?: string;
  }): { success: boolean; error?: string; submission?: PaymentSubmission } {
    const rawTxId = submissionData.transactionId || '';
    const normalizedTxId = normalizeTransactionId(rawTxId);

    if (!normalizedTxId) {
      return { success: false, error: 'Mobile Money transaction ID is required.' };
    }

    // Atomic uniqueness check across all submissions
    const submissions = this.getPaymentSubmissions();
    const isDuplicate = submissions.some((s) => s.normalizedTxId === normalizedTxId);

    if (isDuplicate) {
      return {
        success: false,
        error: 'This transaction ID has already been used. Please submit a valid transaction ID.',
      };
    }

    const newSubmission: PaymentSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: submissionData.userId,
      userName: submissionData.userName.trim(),
      userPhone: submissionData.userPhone.trim(),
      network: submissionData.network,
      amountUgx: submissionData.amountUgx,
      transactionId: rawTxId.trim(),
      normalizedTxId,
      paymentDateTime: submissionData.paymentDateTime,
      planId: submissionData.planId,
      planName: submissionData.planName,
      screenshotUrl: submissionData.screenshotUrl,
      screenshotName: submissionData.screenshotName,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    // Save atomically to database
    submissions.unshift(newSubmission);
    this.set('payment_submissions', submissions);

    // Update rider state to pending_verification
    const riders = this.getRiders();
    const rider = riders.find(
      (r) => r.id === submissionData.userId || r.phone === submissionData.userPhone
    );
    if (rider) {
      rider.subscriptionStatus = 'pending_verification';
      rider.lastPaymentSubmissionId = newSubmission.id;
      rider.rejectionReason = undefined;
      this.saveRider(rider);
    }

    // Add Audit Log
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: submissionData.userName,
      actorRole: 'rider',
      action: 'PAYMENT_SUBMITTED_FOR_VERIFICATION',
      target: `${submissionData.network} MoMo (Tx: ${normalizedTxId})`,
      details: `Submitted UGX ${submissionData.amountUgx.toLocaleString()} for ${submissionData.planName}. Under review by Mukisa Brian.`,
    });

    return { success: true, submission: newSubmission };
  }

  /**
   * Administrator (Mukisa Brian) approves a submitted payment.
   * Triggers automatic account & subscription activation.
   */
  approvePayment(
    submissionId: string,
    adminName: string = 'Mukisa Brian'
  ): { success: boolean; error?: string } {
    const submissions = this.getPaymentSubmissions();
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) {
      return { success: false, error: 'Payment submission not found.' };
    }

    sub.status = 'approved';
    sub.reviewedAt = new Date().toISOString();
    sub.reviewedBy = adminName;
    if (!sub.adminNotes) {
      sub.adminNotes = `Payment verified against telecom transaction log by ${adminName}.`;
    }
    this.set('payment_submissions', submissions);

    // 1. Calculate 30-day active subscription period
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiryStr = expiryDate.toISOString().split('T')[0];

    // 2. Automatically activate rider account
    const riders = this.getRiders();
    const rider = riders.find(
      (r) => r.id === sub.userId || r.phone === sub.userPhone || r.fullName.toLowerCase() === sub.userName.toLowerCase()
    );
    if (rider) {
      rider.subscriptionTier = sub.planId;
      rider.subscriptionStatus = 'active';
      rider.subscriptionExpiry = expiryStr;
      rider.verificationStatus = 'verified';
      rider.rejectionReason = undefined;
      this.saveRider(rider);
    }

    // 3. Record official settled transaction in master ledger
    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      reference: `BODACARE-${sub.network === 'MTN' ? 'MM' : 'AM'}-${sub.normalizedTxId.slice(-6)}`,
      userId: sub.userId,
      userName: sub.userName,
      userPhone: sub.userPhone,
      provider: sub.network === 'MTN' ? 'MTN MoMo' : 'Airtel Money',
      amountUgx: sub.amountUgx,
      purpose: 'subscription',
      planId: sub.planId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      operatorRef: `${sub.network}-UG-${sub.normalizedTxId}`,
    };
    this.addTransaction(newTx);

    // 4. Log immutable audit entry
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: adminName,
      actorRole: 'super_admin',
      action: 'PAYMENT_VERIFIED_AND_APPROVED',
      target: `${sub.userName} (${sub.normalizedTxId})`,
      details: `Approved UGX ${sub.amountUgx.toLocaleString()} via ${sub.network}. Subscription active until ${expiryStr}.`,
    });

    return { success: true };
  }

  /**
   * Administrator (Mukisa Brian) rejects a payment with a mandatory explanation note.
   */
  rejectPayment(
    submissionId: string,
    adminNotes: string,
    adminName: string = 'Mukisa Brian'
  ): { success: boolean; error?: string } {
    if (!adminNotes || !adminNotes.trim()) {
      return { success: false, error: 'An administrative note is required when rejecting a payment.' };
    }

    const submissions = this.getPaymentSubmissions();
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) {
      return { success: false, error: 'Payment submission not found.' };
    }

    sub.status = 'rejected';
    sub.adminNotes = adminNotes.trim();
    sub.reviewedAt = new Date().toISOString();
    sub.reviewedBy = adminName;
    this.set('payment_submissions', submissions);

    // Update rider account to rejected with administrative note visible
    const riders = this.getRiders();
    const rider = riders.find(
      (r) => r.id === sub.userId || r.phone === sub.userPhone || r.fullName.toLowerCase() === sub.userName.toLowerCase()
    );
    if (rider) {
      rider.subscriptionStatus = 'rejected';
      rider.rejectionReason = adminNotes.trim();
      this.saveRider(rider);
    }

    // Log immutable audit entry
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: adminName,
      actorRole: 'super_admin',
      action: 'PAYMENT_VERIFICATION_REJECTED',
      target: `${sub.userName} (${sub.normalizedTxId})`,
      details: `Rejected submission: "${adminNotes.trim()}". User prompted to resubmit with valid transaction ID.`,
    });

    return { success: true };
  }

  // ==========================================
  // MODULE 2: JOBS & DELIVERY OPPORTUNITIES
  // ==========================================
  getJobs(): BodaJob[] {
    return this.get<BodaJob[]>('jobs', INITIAL_JOBS);
  }

  saveJob(job: BodaJob): void {
    const list = this.getJobs();
    const idx = list.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      list[idx] = job;
    } else {
      list.unshift(job);
    }
    this.set('jobs', list);
  }

  updateJobStatus(id: string, status: BodaJob['status'], assignedRiderId?: string, assignedRiderName?: string): void {
    const list = this.getJobs();
    const job = list.find((j) => j.id === id);
    if (job) {
      job.status = status;
      if (assignedRiderId) job.assignedRiderId = assignedRiderId;
      if (assignedRiderName) job.assignedRiderName = assignedRiderName;
      this.set('jobs', list);
    }
  }

  deleteJob(id: string): void {
    const list = this.getJobs().filter((j) => j.id !== id);
    this.set('jobs', list);
  }

  getJobApplications(jobId?: string): JobApplication[] {
    const all = this.get<JobApplication[]>('job_applications', INITIAL_JOB_APPLICATIONS);
    if (jobId) return all.filter((a) => a.jobId === jobId);
    return all;
  }

  applyToJob(app: JobApplication): { success: boolean; message: string } {
    const list = this.getJobApplications();
    const already = list.find((a) => a.jobId === app.jobId && a.riderId === app.riderId);
    if (already) {
      return { success: false, message: 'You have already submitted a proposal for this job.' };
    }
    list.unshift(app);
    this.set('job_applications', list);

    // Increment count on job
    const jobs = this.getJobs();
    const j = jobs.find((x) => x.id === app.jobId);
    if (j) {
      j.applicationsCount = (j.applicationsCount || 0) + 1;
      this.set('jobs', jobs);
    }

    // Add in-app notification
    this.addNotification({
      id: `notif-${Date.now()}`,
      userId: app.riderId,
      title: 'Application Submitted',
      message: `Your proposal for "${app.jobTitle}" was submitted to ${app.employerCompany}.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'booking',
    });

    return { success: true, message: 'Proposal submitted successfully!' };
  }

  updateApplicationStatus(id: string, status: JobApplication['status']): void {
    const list = this.getJobApplications();
    const app = list.find((a) => a.id === id);
    if (app) {
      app.status = status;
      this.set('job_applications', list);

      if (status === 'accepted') {
        this.updateJobStatus(app.jobId, 'assigned', app.riderId, app.riderName);
        this.addNotification({
          id: `notif-${Date.now()}`,
          userId: app.riderId,
          title: 'Proposal Accepted!',
          message: `Congratulations! ${app.employerCompany} accepted your bid for "${app.jobTitle}".`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'booking',
        });
      }
    }
  }

  // ==========================================
  // MODULE 3: BATTERY SWAP LOCATOR (E-BODA)
  // ==========================================
  getSwapStations(): BatterySwapStation[] {
    return this.get<BatterySwapStation[]>('swap_stations', INITIAL_SWAP_STATIONS);
  }

  saveSwapStation(station: BatterySwapStation): void {
    const list = this.getSwapStations();
    const idx = list.findIndex((s) => s.id === station.id);
    if (idx >= 0) {
      list[idx] = station;
    } else {
      list.push(station);
    }
    this.set('swap_stations', list);
  }

  updateStationInventory(id: string, available: number, charging: number): void {
    const list = this.getSwapStations();
    const s = list.find((x) => x.id === id);
    if (s) {
      s.availableBatteries = available;
      s.chargingBatteries = charging;
      s.totalBatteries = available + charging;
      s.lastStockUpdate = new Date().toISOString();
      if (available === 0) s.status = 'out_of_batteries';
      else if (available <= 3) s.status = 'congested';
      else s.status = 'open';
      this.set('swap_stations', list);
    }
  }

  verifyStation(id: string, verified: boolean): void {
    const list = this.getSwapStations();
    const s = list.find((x) => x.id === id);
    if (s) {
      s.verified = verified;
      this.set('swap_stations', list);
    }
  }

  getStationProblems(): StationProblemReport[] {
    return this.get<StationProblemReport[]>('station_problems', [
      {
        id: 'prob-01',
        stationId: 'station-kasana-market',
        stationName: 'Kasana Market Green Energy Swap Hub',
        reportedByRiderId: 'rider-kato-moses',
        riderName: 'Kato Moses',
        riderPhone: '+256 774 912 304',
        issueType: 'no_batteries',
        description: 'Only 1 charged battery remaining at peak 5 PM market loading rush. Lines forming.',
        timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
        status: 'investigating',
        adminNotes: 'Station operator Opio contacted. Dispatching 6 charged reserve packs from Kikyusa hub.',
      },
    ]);
  }

  reportStationProblem(report: StationProblemReport): void {
    const list = this.getStationProblems();
    list.unshift(report);
    this.set('station_problems', list);

    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: report.riderName,
      actorRole: 'rider',
      action: 'STATION_PROBLEM_REPORTED',
      target: report.stationName,
      details: `${report.issueType}: ${report.description}`,
    });
  }

  resolveStationProblem(id: string, notes: string): void {
    const list = this.getStationProblems();
    const p = list.find((x) => x.id === id);
    if (p) {
      p.status = 'resolved';
      p.adminNotes = notes;
      this.set('station_problems', list);
    }
  }

  // ==========================================
  // MODULE 4: REPAIRS AND MAINTENANCE
  // ==========================================
  getRepairRequests(riderId?: string): RepairRequest[] {
    const all = this.get<RepairRequest[]>('repair_requests', INITIAL_REPAIR_REQUESTS);
    if (riderId) return all.filter((r) => r.riderId === riderId);
    return all;
  }

  createRepairRequest(req: RepairRequest): void {
    const list = this.getRepairRequests();
    list.unshift(req);
    this.set('repair_requests', list);

    this.addNotification({
      id: `notif-${Date.now()}`,
      userId: req.riderId,
      title: 'Service Request Sent',
      message: `Your repair order for "${req.serviceType}" was sent to ${req.garageName}.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'booking',
    });
  }

  updateRepairRequestStatus(id: string, status: RepairRequest['status'], cost?: number, notes?: string): void {
    const list = this.getRepairRequests();
    const req = list.find((r) => r.id === id);
    if (req) {
      req.status = status;
      if (cost !== undefined) req.finalCostUgx = cost;
      if (notes) req.mechanicNotes = notes;
      if (status === 'completed') req.completedAt = new Date().toISOString();
      this.set('repair_requests', list);
    }
  }

  getServiceRecords(riderId?: string): ServiceRecord[] {
    const all = this.get<ServiceRecord[]>('service_records', INITIAL_SERVICE_RECORDS);
    if (riderId) return all.filter((s) => s.riderId === riderId);
    return all;
  }

  addServiceRecord(record: ServiceRecord): void {
    const list = this.getServiceRecords();
    list.unshift(record);
    this.set('service_records', list);
  }

  // ==========================================
  // MODULE 6: RIDER WALLET & TRANSACTIONS
  // ==========================================
  getRiderWallet(riderId: string): RiderWallet {
    const riders = this.getRiders();
    const rider = riders.find((r) => r.id === riderId);
    const balance = rider ? (rider.walletBalanceUgx || 0) : 0;
    
    // Compute total earnings and expenditures from transactions
    const txs = this.getWalletTransactions(riderId);
    const earned = txs.filter((t) => t.type === 'credit').reduce((sum, t) => sum + t.amountUgx, 0);
    const spent = txs.filter((t) => t.type === 'debit').reduce((sum, t) => sum + t.amountUgx, 0);

    return {
      riderId,
      availableBalanceUgx: balance,
      totalEarnedUgx: Math.max(earned, 250000),
      totalSpentUgx: Math.max(spent, 60000),
      pendingWithdrawalUgx: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  getWalletTransactions(riderId: string): WalletTransaction[] {
    const all = this.get<WalletTransaction[]>('wallet_transactions', [
      {
        id: 'wtx-01',
        riderId: 'rider-kato-moses',
        type: 'credit',
        category: 'job_payout',
        amountUgx: 35000,
        balanceAfterUgx: 65000,
        description: 'Payment for Coffee Transport: Kikyusa to Kasana Mill',
        timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
        reference: 'BCU-JOB-PAY-7721',
        status: 'completed',
      },
      {
        id: 'wtx-02',
        riderId: 'rider-kato-moses',
        type: 'debit',
        category: 'battery_swap',
        amountUgx: 3500,
        balanceAfterUgx: 30000,
        description: 'E-Boda 48V Battery Swap at Kikyusa Bodawerk Hub',
        timestamp: new Date(Date.now() - 14 * 3600000).toISOString(),
        reference: 'BCU-SWAP-0912',
        status: 'completed',
      },
      {
        id: 'wtx-03',
        riderId: 'rider-kato-moses',
        type: 'credit',
        category: 'ride_fare',
        amountUgx: 15000,
        balanceAfterUgx: 33500,
        description: 'Passenger Trip: Kikyusa to Wobulenzi Town',
        timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
        reference: 'BCU-RIDE-4412',
        status: 'completed',
      },
    ]);
    return all.filter((t) => t.riderId === riderId);
  }

  depositToWallet(riderId: string, amountUgx: number, network: 'MTN' | 'Airtel', txId: string): { success: boolean; message: string; balance: number } {
    if (amountUgx <= 0) return { success: false, message: 'Invalid deposit amount.', balance: 0 };
    const normId = normalizeTransactionId(txId);
    if (!normId) return { success: false, message: 'Transaction ID is required.', balance: 0 };

    // Prevent duplicate transaction ID across payments and wallet
    if (this.isTransactionIdUsed(normId)) {
      return { success: false, message: 'This transaction ID has already been used. Please submit a valid transaction ID.', balance: 0 };
    }

    const riders = this.getRiders();
    const r = riders.find((x) => x.id === riderId);
    if (!r) return { success: false, message: 'Rider not found.', balance: 0 };

    const newBalance = (r.walletBalanceUgx || 0) + amountUgx;
    r.walletBalanceUgx = newBalance;
    this.saveRider(r);

    // Save transaction
    const all = this.get<WalletTransaction[]>('wallet_transactions', []);
    const wtx: WalletTransaction = {
      id: `wtx-${Date.now()}`,
      riderId,
      type: 'credit',
      category: 'topup',
      amountUgx,
      balanceAfterUgx: newBalance,
      description: `Mobile Money Top-up via ${network} (${normId})`,
      timestamp: new Date().toISOString(),
      reference: `BODACARE-TOPUP-${normId.slice(-6)}`,
      status: 'completed',
    };
    all.unshift(wtx);
    this.set('wallet_transactions', all);

    return { success: true, message: `Successfully topped up UGX ${amountUgx.toLocaleString()} via ${network}!`, balance: newBalance };
  }

  deductWallet(riderId: string, amountUgx: number, category: WalletTransaction['category'], description: string): { success: boolean; message: string; balance: number } {
    const riders = this.getRiders();
    const r = riders.find((x) => x.id === riderId);
    if (!r) return { success: false, message: 'Rider not found.', balance: 0 };

    const currentBal = r.walletBalanceUgx || 0;
    if (currentBal < amountUgx) {
      return { success: false, message: `Insufficient wallet balance (UGX ${currentBal.toLocaleString()}). Please top up via MTN or Airtel.`, balance: currentBal };
    }

    const newBalance = currentBal - amountUgx;
    r.walletBalanceUgx = newBalance;
    this.saveRider(r);

    const all = this.get<WalletTransaction[]>('wallet_transactions', []);
    const wtx: WalletTransaction = {
      id: `wtx-${Date.now()}`,
      riderId,
      type: 'debit',
      category,
      amountUgx,
      balanceAfterUgx: newBalance,
      description,
      timestamp: new Date().toISOString(),
      reference: `BODACARE-DED-${Date.now().toString().slice(-6)}`,
      status: 'completed',
    };
    all.unshift(wtx);
    this.set('wallet_transactions', all);

    return { success: true, message: `Paid UGX ${amountUgx.toLocaleString()} from wallet balance.`, balance: newBalance };
  }

  // ==========================================
  // EXTERNAL SERVICES CONFIGURATION
  // ==========================================
  getExternalConfig(): ExternalServicesConfig {
    return this.get<ExternalServicesConfig>('external_config', DEFAULT_EXTERNAL_CONFIG);
  }

  saveExternalConfig(cfg: ExternalServicesConfig): void {
    cfg.updatedAt = new Date().toISOString();
    this.set('external_config', cfg);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: 'Mukisa Brian (Founder)',
      actorRole: 'super_admin',
      action: 'UPDATED_EXTERNAL_SERVICES_CONFIG',
      target: `SMS: ${cfg.smsProvider}, Sender: ${cfg.smsSenderId}`,
      details: 'Updated gateway credentials and automated dispatch parameters.',
    });
  }

  // ==========================================
  // COMPLAINTS & SUPPORT TICKETS
  // ==========================================
  getComplaints(): ComplaintReport[] {
    return this.get<ComplaintReport[]>('complaints', INITIAL_COMPLAINTS);
  }

  submitComplaint(report: ComplaintReport): void {
    const list = this.getComplaints();
    list.unshift(report);
    this.set('complaints', list);

    this.addNotification({
      id: `notif-${Date.now()}`,
      userId: report.userId,
      title: 'Support Ticket Received',
      message: `Your complaint "${report.subject}" was logged. Reference #${report.id}.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'system',
    });
  }

  resolveComplaint(id: string, resolutionNotes: string): void {
    const list = this.getComplaints();
    const c = list.find((x) => x.id === id);
    if (c) {
      c.status = 'resolved';
      c.resolvedAt = new Date().toISOString();
      c.resolutionNotes = resolutionNotes;
      this.set('complaints', list);
    }
  }

  // ==========================================
  // IN-APP NOTIFICATIONS
  // ==========================================
  getNotifications(userId?: string): AppNotification[] {
    const all = this.get<AppNotification[]>('notifications', [
      {
        id: 'notif-init-01',
        userId: 'rider-kato-moses',
        title: 'New Boda Job in Kikyusa',
        message: 'Kikyusa Coffee Growers Coop posted a daily coffee haulage run paying UGX 35,000.',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
        read: false,
        type: 'booking',
      },
      {
        id: 'notif-init-02',
        userId: 'rider-kato-moses',
        title: 'Battery Stock Alert',
        message: '14 charged batteries ready at Kikyusa Bodawerk E-Hub.',
        timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
        read: true,
        type: 'system',
      },
      {
        id: 'notif-init-03',
        userId: 'user-founder-01',
        title: 'Mobile Money Payment Received',
        message: 'New subscription verification submission from Kato Moses (UGX 10,000).',
        timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
        read: false,
        type: 'payment',
      },
    ]);
    if (userId) return all.filter((n) => n.userId === userId || n.userId === 'all');
    return all;
  }

  addNotification(notif: AppNotification): void {
    const list = this.getNotifications();
    list.unshift(notif);
    this.set('notifications', list);
  }

  markNotificationRead(id: string): void {
    const list = this.getNotifications();
    const item = list.find((n) => n.id === id);
    if (item) {
      item.read = true;
      this.set('notifications', list);
    }
  }

  markAllNotificationsRead(userId?: string): void {
    const list = this.getNotifications();
    list.forEach((n) => {
      if (!userId || n.userId === userId || n.userId === 'all') {
        n.read = true;
      }
    });
    this.set('notifications', list);
  }

  getMechanics() {
    return this.getBusinesses();
  }

  safeCopyToClipboard(text: string): boolean {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
        return true;
      }
    } catch {
      // fallback
    }
    return false;
  }

  checkDuplicateTxId(rawId: string): boolean {
    const clean = rawId.trim().toUpperCase();
    if (!clean) return false;
    const subs = this.getPaymentSubmissions();
    const txs = this.getTransactions();
    const existsInSubs = subs.some(
      (s) => s.transactionId && s.transactionId.trim().toUpperCase() === clean
    );
    const existsInTxs = txs.some(
      (t) => t.reference && t.reference.trim().toUpperCase() === clean
    );
    return existsInSubs || existsInTxs;
  }

  // ==========================================
  // JOB ALERT & BULK SMS EMPLOYMENT SYSTEM
  // ==========================================
  verifyJob(jobId: string, verified: boolean, adminName = 'Brian Mukisa (Super Admin)'): BodaJob | null {
    const list = this.getJobs();
    const job = list.find((j) => j.id === jobId);
    if (!job) return null;
    job.adminApproved = verified;
    job.verifiedBy = verified ? adminName : undefined;
    job.verifiedAt = verified ? new Date().toISOString() : undefined;
    this.set('jobs', list);
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: adminName,
      actorRole: 'super_admin',
      action: verified ? 'JOB_VERIFIED_FOR_ALERTS' : 'JOB_UNVERIFIED',
      target: `${job.title} (${job.employerCompany})`,
      details: verified
        ? 'Verified employer & job details prior to publishing and bulk rider alert.'
        : 'Marked job unverified for review.',
    });
    return job;
  }

  updateRiderJobPreferences(
    riderId: string,
    prefs: Partial<RiderJobAlertPreferences>,
    phoneType?: 'smartphone' | 'feature_phone',
    updatedBy = 'Rider Self-Service'
  ): RiderProfile | null {
    const riders = this.getRiders();
    const idx = riders.findIndex((r) => r.id === riderId);
    if (idx < 0) return null;

    const current = riders[idx];
    const currentPrefs = current.jobAlertPreferences || {
      enabled: true,
      preferredChannel: 'auto',
      optedOutSms: false,
      jobTypes: ['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda', 'passenger_contract'],
      preferredSubCounties: ['Kikyusa', 'Luweero Town Council', 'Wobulenzi', 'Kasana'],
      updatedAt: new Date().toISOString(),
    };

    const nextPrefs: RiderJobAlertPreferences = {
      ...currentPrefs,
      ...prefs,
      updatedAt: new Date().toISOString(),
    };

    if (prefs.optedOutSms === true && !currentPrefs.optedOutSms) {
      nextPrefs.optedOutAt = new Date().toISOString();
    } else if (prefs.optedOutSms === false) {
      nextPrefs.optedOutAt = undefined;
      nextPrefs.optOutReason = undefined;
    }

    riders[idx] = {
      ...current,
      phoneType: phoneType ?? current.phoneType ?? 'smartphone',
      jobAlertPreferences: nextPrefs,
    };
    this.set('riders', riders);

    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: updatedBy,
      actorRole: updatedBy.toLowerCase().includes('admin') ? 'super_admin' : 'rider',
      action: 'UPDATED_JOB_ALERT_PREFERENCES',
      target: `${current.fullName} (${current.phone})`,
      details: `PhoneType: ${riders[idx].phoneType}, SMS Opt-Out: ${nextPrefs.optedOutSms}, Job Types: ${nextPrefs.jobTypes.length}`,
    });

    return riders[idx];
  }

  getSmsCampaigns(): SmsCampaignRecord[] {
    return this.get<SmsCampaignRecord[]>('sms_campaigns', []);
  }

  saveSmsCampaign(campaign: SmsCampaignRecord): void {
    const list = this.getSmsCampaigns();
    const idx = list.findIndex((c) => c.id === campaign.id);
    if (idx >= 0) {
      list[idx] = campaign;
    } else {
      list.unshift(campaign);
    }
    this.set('sms_campaigns', list);

    // Update last alert timestamp on the job
    const jobs = this.getJobs();
    const job = jobs.find((j) => j.id === campaign.jobId);
    if (job) {
      job.lastAlertSentAt = campaign.sentAt;
      job.notificationMode = campaign.dispatchMode;
      this.set('jobs', jobs);
    }

    // Log immutable audit entry
    this.addAuditLog({
      id: `log-${Date.now()}`,
      timestamp: campaign.sentAt,
      actorName: campaign.sentByAdminName,
      actorRole: 'super_admin',
      action: 'JOB_ALERT_CAMPAIGN_RECORDED',
      target: `${campaign.jobTitle} (${campaign.totalTargetedRiders} riders)`,
      details: `Mode: ${campaign.dispatchMode}, Scope: ${campaign.scopeDetails}. App Alerts: ${campaign.appNotificationsSentCount}, SMS Sent: ${campaign.smsSentCount}, Failed/Blocked: ${campaign.smsFailedCount}, Expenditure: UGX ${campaign.actualExpenditureUgx.toLocaleString()}.`,
    });
  }

  dispatchInAppJobNotifications(job: BodaJob, riderIds: string[], dispatchMode: JobAlertDispatchMode): number {
    if (dispatchMode !== 'app_only' && dispatchMode !== 'both') return 0;
    const riders = this.getRiders();
    let count = 0;

    for (const rid of riderIds) {
      const r = riders.find((x) => x.id === rid);
      if (!r) continue;
      const isSmartphone = (r.phoneType || 'smartphone') === 'smartphone';
      const acceptsApp =
        isSmartphone &&
        (r.jobAlertPreferences?.enabled ?? true) &&
        r.jobAlertPreferences?.preferredChannel !== 'sms_only';

      if (acceptsApp) {
        this.addNotification({
          id: `notif-job-${job.id}-${r.id}-${Date.now()}`,
          userId: r.id,
          title: `New Job Alert: ${job.title}`,
          message: `${job.employerCompany} (${job.village ? `${job.village}, ` : ''}${job.subCounty}) — Pay: ${
            job.salaryDisplay || `UGX ${job.paymentAmountUgx.toLocaleString()}`
          }. Deadline: ${job.deadline}. Contact: ${job.employerPhone}.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'job',
          actionUrl: 'jobs',
        });
        count++;
      }
    }
    return count;
  }

  // ==========================================
  // CENTRAL SQLITE-TO-CLIENT CACHE SYNC HELPERS
  // ==========================================
  getPassengers(): PassengerProfile[] {
    return this.get<PassengerProfile[]>('passengers', INITIAL_PASSENGERS);
  }

  setRidersCache(riders: RiderProfile[]): void {
    this.set('riders', riders);
  }

  setPassengersCache(passengers: PassengerProfile[]): void {
    this.set('passengers', passengers);
  }

  setStagesCache(stages: Stage[]): void {
    this.set('stages', stages);
  }

  setSwapStationsCache(stations: BatterySwapStation[]): void {
    this.set('swap_stations', stations);
  }

  setBusinessesCache(centres: BusinessListing[]): void {
    this.set('businesses', centres);
  }

  setJobsCache(jobs: BodaJob[]): void {
    this.set('jobs', jobs);
  }

  validateSafeImageUrl(raw?: string): { valid: boolean; cleanUrl: string; error?: string } {
    const trimmed = (raw || '').trim();
    if (!trimmed) return { valid: true, cleanUrl: '' };
    if (trimmed.length > 750000) {
      return { valid: false, cleanUrl: '', error: 'Image size must be under 500 KB.' };
    }
    if (/^https?:\/\/\S+$/i.test(trimmed)) {
      return { valid: true, cleanUrl: trimmed };
    }
    if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
      return { valid: true, cleanUrl: trimmed };
    }
    return {
      valid: false,
      cleanUrl: '',
      error: 'Only HTTPS/HTTP image links or PNG, JPG, WEBP, GIF uploads are supported.',
    };
  }

  applyClientMembershipReset(options?: { includeJobs?: boolean; categories?: string[] }): void {
    const categories = options?.categories;
    if (categories && categories.length > 0) {
      const catSet = new Set(categories);
      if (catSet.has('riders')) {
        this.set('riders', []);
        this.set('job_applications', []);
        this.set('bookings', []);
        this.set('repair_requests', []);
        this.set('service_records', []);
        this.set('stage_attendance', []);
      }
      if (catSet.has('passengers')) {
        this.set('passengers', []);
        this.set('bookings', []);
      }
      if (catSet.has('stages')) {
        this.set('stages', []);
        this.set('stage_attendance', []);
        this.set('announcements', []);
      }
      if (catSet.has('swap_stations')) {
        this.set('swap_stations', []);
        this.set('station_problems', []);
      }
      if (catSet.has('maintenance_centres')) {
        this.set('businesses', []);
      }
      if (catSet.has('jobs')) {
        this.set('jobs', []);
        this.set('sms_campaigns', []);
      }
      if (catSet.has('riders') || catSet.has('passengers') || catSet.has('non_super_admins')) {
        const existingUsers = this.getUsers();
        const superAdminUsers = existingUsers.filter(
          (u) => u.role === 'super_admin' || u.id === 'user-founder-01'
        );
        this.set('users', superAdminUsers.length > 0 ? superAdminUsers : [INITIAL_USERS[0]]);
        const curUser = this.get<User | null>('current_user', null);
        if (curUser && curUser.role !== 'super_admin') {
          this.setCurrentUser(null);
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bodacare:directory-updated'));
      }
      return;
    }

    const includeJobs = options?.includeJobs !== false;
    this.set('riders', []);
    this.set('passengers', []);
    this.set('stages', []);
    this.set('swap_stations', []);
    this.set('businesses', []);
    this.set('job_applications', []);
    this.set('bookings', []);
    this.set('repair_requests', []);
    this.set('service_records', []);
    this.set('station_problems', []);
    this.set('invitations', []);
    this.set('stage_attendance', []);
    this.set('announcements', []);

    if (includeJobs) {
      this.set('jobs', []);
      this.set('sms_campaigns', []);
    }

    // Preserve ONLY Super Admin user, financial transactions, payment submissions, and audit logs
    const existingUsers = this.getUsers();
    const superAdminUsers = existingUsers.filter(
      (u) => u.role === 'super_admin' || u.id === 'user-founder-01'
    );
    this.set('users', superAdminUsers.length > 0 ? superAdminUsers : [INITIAL_USERS[0]]);

    const notifs = this.getNotifications();
    this.set(
      'notifications',
      notifs.filter((n) => n.userId === 'user-founder-01' || n.userId === 'admin-founder-mukisa')
    );

    const curUser = this.get<User | null>('current_user', null);
    if (curUser && curUser.role !== 'super_admin') {
      this.setCurrentUser(null);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bodacare:directory-updated'));
    }
  }

  getLastSyncedAt(): string | null {
    return this.get<string | null>('last_synced_at', null);
  }

  async syncDirectoryFromServer(): Promise<{ synced: boolean; resetAt: string | null; syncedAt?: string }> {
    try {
      const resp = await fetch('/api/public/directory', { cache: 'no-store' });
      if (!resp.ok) return { synced: false, resetAt: null };
      const data = (await resp.json()) as {
        riders?: RiderProfile[];
        passengers?: PassengerProfile[];
        stages?: Stage[];
        stations?: BatterySwapStation[];
        centres?: BusinessListing[];
        jobs?: BodaJob[];
        resetAt?: string | null;
      };

      if (Array.isArray(data.riders)) this.setRidersCache(data.riders);
      if (Array.isArray(data.passengers)) this.setPassengersCache(data.passengers);
      if (Array.isArray(data.stages)) this.setStagesCache(data.stages);
      if (Array.isArray(data.stations)) this.setSwapStationsCache(data.stations);
      if (Array.isArray(data.centres)) this.setBusinessesCache(data.centres);
      if (Array.isArray(data.jobs)) this.setJobsCache(data.jobs);

      const syncedAt = new Date().toISOString();
      this.set('last_synced_at', syncedAt);

      // Verify current non-super-admin session wasn't deleted or revoked
      const curUser = this.get<User | null>('current_user', null);
      if (curUser && curUser.role !== 'super_admin') {
        const params = new URLSearchParams({
          id: curUser.id || '',
          phone: curUser.phone || '',
          email: curUser.email || '',
          role: curUser.role || '',
        });
        const verifyResp = await fetch(`/api/auth/session-verify?${params.toString()}`, { cache: 'no-store' }).catch(() => null);
        if (verifyResp && verifyResp.ok) {
          const verifyJson = (await verifyResp.json()) as { valid?: boolean; revoked?: boolean };
          if (verifyJson.revoked || verifyJson.valid === false) {
            this.setCurrentUser(null);
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bodacare:directory-updated'));
      }
      return { synced: true, resetAt: data.resetAt || null, syncedAt };
    } catch {
      return { synced: false, resetAt: null };
    }
  }
}

export const storage = new BodaStorage();



