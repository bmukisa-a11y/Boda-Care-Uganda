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
} from '../types';

export const HERO_IMAGE = '/src/assets/images/bodacare_rider_hero_1793382094028.jpg';
export const STAGE_IMAGE = '/src/assets/images/bodacare_community_stage_1793382094462.jpg';

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
    fullName: 'Kato Moses',
    phone: '+256 774 912 304',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    nin: 'CM910481023K4L',
    permitNumber: 'UG-DL-A-883921',
    residentialArea: 'Kikyusa Trading Centre, Luweero',
    stageId: 'stage-kikyusa-main',
    stageName: 'Kikyusa Main Stage',
    motorcycleReg: 'UFG 421K',
    motorcycleMakeModel: 'Bajaj Boxer BM150 (Red)',
    ownershipStatus: 'owner',
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
  },
  {
    id: 'rider-ssempijja-ronald',
    userId: 'user-ronald-02',
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
    ownershipStatus: 'rental',
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
  },
  {
    id: 'rider-mugwanya-isaac',
    userId: 'user-isaac-03',
    fullName: 'Mugwanya Isaac',
    phone: '+256 788 412 900',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    nin: 'CM950284719M1A',
    permitNumber: 'UG-DL-A-102948',
    residentialArea: 'Wobulenzi Town',
    stageId: 'stage-kasana-market',
    stageName: 'Kasana Central Market Stage',
    motorcycleReg: 'UEX 902C',
    motorcycleMakeModel: 'Bajaj Boxer BM100 (Blue)',
    ownershipStatus: 'loan',
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
  },
  {
    id: 'rider-kigozi-gerald',
    userId: 'user-gerald-04',
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
    ownershipStatus: 'owner',
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
];

// Helper to access LocalStorage safely
class BodaStorage {
  private get<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(`bodacare_${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`bodacare_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  // Riders
  getRiders(): RiderProfile[] {
    return this.get<RiderProfile[]>('riders', INITIAL_RIDERS);
  }

  saveRider(rider: RiderProfile): void {
    const riders = this.getRiders();
    const idx = riders.findIndex((r) => r.id === rider.id);
    if (idx >= 0) {
      riders[idx] = rider;
    } else {
      riders.unshift(rider);
    }
    this.set('riders', riders);
  }

  updateRiderStatus(riderId: string, status: RiderProfile['verificationStatus']): void {
    const riders = this.getRiders();
    const r = riders.find((x) => x.id === riderId);
    if (r) {
      r.verificationStatus = status;
      this.set('riders', riders);
      this.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorName: 'Ronald Ssemakula (Platform Owner)',
        actorRole: 'super_admin',
        action: `RIDER_STATUS_${status.toUpperCase()}`,
        target: `${r.fullName} (${r.motorcycleReg})`,
        details: `Updated verification status to ${status}.`,
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
}

export const storage = new BodaStorage();

