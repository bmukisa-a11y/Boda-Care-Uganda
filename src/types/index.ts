/**
 * BodaCare Uganda - Core Type Definitions
 * Designed for Boda-boda operators, passengers, stage leaders, mechanics, and admins in Luweero District & across Uganda.
 */

export type UserRole = 'super_admin' | 'rider' | 'passenger' | 'stage_leader' | 'mechanic';

export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
export type SubscriptionTier = 'basic' | 'standard' | 'premium';
export type PaymentProvider = 'MTN MoMo' | 'Airtel Money' | 'Cash';

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
  fullName: string;
  phone: string;
  avatarUrl: string;
  nin: string; // National Identification Number (e.g., CM87019238XYZ)
  permitNumber: string; // Driving permit license class A
  residentialArea: string; // e.g., Kikyusa Town, Luweero
  stageId: string;
  stageName: string;
  motorcycleReg: string; // e.g., UFG 421K
  motorcycleMakeModel: string; // e.g., Bajaj Boxer BM150, TVS HLX 125
  ownershipStatus: 'owner' | 'rental' | 'loan';
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
}

export interface PassengerProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  residentialArea: string;
  trustedContactName: string;
  trustedContactPhone: string;
  rating: number;
  totalRides: number;
}

export interface Stage {
  id: string;
  name: string;
  district: string; // Luweero
  subCounty: string; // Kikyusa, Luweero Town Council, Wobulenzi, Kasana
  leaderName: string;
  leaderPhone: string;
  memberCount: number;
  dailyWelfareFeeUgx: number;
  landmark: string;
  lat: number;
  lng: number;
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
  name: string;
  ownerName: string;
  phone: string;
  location: string;
  subCounty: string;
  category: 'garage' | 'mechanic' | 'tyres' | 'engine' | 'spares' | 'accessories' | 'towing';
  rating: number;
  reviewCount: number;
  operatingHours: string;
  services: BusinessService[];
  verified: boolean;
  isPromoted: boolean;
  emergencyCallout: boolean;
  imageUrl?: string;
}

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
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'booking' | 'payment' | 'emergency' | 'stage' | 'system';
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
  role: 'rider' | 'passenger' | 'stage_leader' | 'mechanic' | 'delivery' | 'super_admin';
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

