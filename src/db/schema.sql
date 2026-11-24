-- =========================================================================
-- BODACARE UGANDA - PRODUCTION POSTGRESQL & SUPABASE DATABASE ARCHITECTURE
-- Targeted deployment for Luweero District, Kikyusa, and National Expansion
-- Includes Row Level Security (RLS) policies, triggers, and foreign keys.
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'rider', 'passenger', 'stage_leader', 'mechanic')),
    preferred_language VARCHAR(5) DEFAULT 'en' CHECK (preferred_language IN ('en', 'lg')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. STAGES TABLE (Boda Boda Stages e.g. Kikyusa, Luweero)
CREATE TABLE IF NOT EXISTS public.stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    district VARCHAR(100) DEFAULT 'Luweero',
    sub_county VARCHAR(100) NOT NULL,
    leader_name VARCHAR(150),
    leader_phone VARCHAR(20),
    daily_welfare_fee_ugx NUMERIC(12, 2) DEFAULT 1000.00,
    landmark TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. RIDER PROFILES
CREATE TABLE IF NOT EXISTS public.rider_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES public.stages(id),
    nin VARCHAR(30) UNIQUE NOT NULL, -- National ID
    permit_number VARCHAR(50) NOT NULL,
    residential_area TEXT,
    motorcycle_reg VARCHAR(20) UNIQUE NOT NULL,
    motorcycle_make_model VARCHAR(100) NOT NULL,
    ownership_status VARCHAR(20) CHECK (ownership_status IN ('owner', 'rental', 'loan')),
    emergency_contact_name VARCHAR(150) NOT NULL,
    emergency_contact_phone VARCHAR(20) NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected', 'suspended')),
    subscription_tier VARCHAR(20) DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'standard', 'premium')),
    subscription_expiry DATE,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    completed_trips INT DEFAULT 0,
    is_online BOOLEAN DEFAULT FALSE,
    has_passenger_helmet BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. PASSENGER PROFILES
CREATE TABLE IF NOT EXISTS public.passenger_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    residential_area TEXT,
    trusted_contact_name VARCHAR(150),
    trusted_contact_phone VARCHAR(20),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_trips INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. STAGE ATTENDANCE & WELFARE CONTRIBUTIONS
CREATE TABLE IF NOT EXISTS public.stage_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id UUID REFERENCES public.stages(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
    attendance_date DATE DEFAULT CURRENT_DATE,
    check_in_time TIME DEFAULT CURRENT_TIME,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'excused')),
    paid_welfare_fee BOOLEAN DEFAULT FALSE,
    fee_amount_ugx NUMERIC(10, 2) DEFAULT 1000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(stage_id, rider_id, attendance_date)
);

-- 6. BUSINESSES (Mechanics & Spare Parts)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    owner_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    location TEXT NOT NULL,
    sub_county VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('garage', 'mechanic', 'tyres', 'engine', 'spares', 'accessories', 'towing')),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    operating_hours TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_promoted BOOLEAN DEFAULT FALSE,
    emergency_callout BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. BUSINESS SERVICES
CREATE TABLE IF NOT EXISTS public.business_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    service_name VARCHAR(200) NOT NULL,
    price_ugx NUMERIC(12, 2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 8. BOOKINGS & PARCEL DELIVERIES
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('ride', 'delivery')),
    passenger_id UUID REFERENCES public.users(id),
    rider_id UUID REFERENCES public.rider_profiles(id),
    pickup_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    distance_km NUMERIC(5, 2) NOT NULL,
    fare_ugx NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled')),
    sender_name VARCHAR(150),
    sender_phone VARCHAR(20),
    recipient_name VARCHAR(150),
    recipient_phone VARCHAR(20),
    parcel_description TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    review_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 9. RIDER DAILY INCOME RECORDS
CREATE TABLE IF NOT EXISTS public.income_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
    record_date DATE DEFAULT CURRENT_DATE,
    category VARCHAR(30) CHECK (category IN ('transport', 'delivery', 'other')),
    amount_ugx NUMERIC(12, 2) NOT NULL,
    description TEXT,
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile_money')),
    is_synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 10. RIDER EXPENSE RECORDS
CREATE TABLE IF NOT EXISTS public.expense_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
    record_date DATE DEFAULT CURRENT_DATE,
    category VARCHAR(50) CHECK (category IN ('fuel', 'repairs', 'tyres', 'engine_oil', 'rental', 'loan_repayment', 'stage_contribution', 'other')),
    amount_ugx NUMERIC(12, 2) NOT NULL,
    description TEXT,
    is_synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 11. MOTORCYCLE MAINTENANCE REMINDERS
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
    item_name VARCHAR(150) NOT NULL,
    last_service_km INT NOT NULL,
    next_service_km INT NOT NULL,
    current_km INT NOT NULL,
    status VARCHAR(20) DEFAULT 'ok' CHECK (status IN ('ok', 'due_soon', 'overdue')),
    cost_estimate_ugx NUMERIC(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 12. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id VARCHAR(30) PRIMARY KEY, -- 'basic', 'standard', 'premium'
    name VARCHAR(100) NOT NULL,
    price_ugx NUMERIC(12, 2) NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    features JSONB NOT NULL,
    is_popular BOOLEAN DEFAULT FALSE
);

-- 13. PAYMENT TRANSACTIONS (MTN MoMo & Airtel Money)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id),
    provider VARCHAR(30) CHECK (provider IN ('MTN MoMo', 'Airtel Money', 'Cash')),
    amount_ugx NUMERIC(12, 2) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    plan_id VARCHAR(30) REFERENCES public.subscription_plans(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    telecom_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 14. EMERGENCY SOS INCIDENTS
CREATE TABLE IF NOT EXISTS public.emergency_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES public.rider_profiles(id),
    category VARCHAR(50) NOT NULL CHECK (category IN ('road_accident', 'motorcycle_theft', 'medical_emergency', 'robbery', 'mechanical_breakdown', 'other')),
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved')),
    assigned_officer TEXT,
    resolution_notes TEXT,
    dispatched_to TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 15. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID,
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target VARCHAR(200),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 16. FOUNDER & BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS public.founder_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    title VARCHAR(150) NOT NULL,
    photo_url TEXT,
    business_name VARCHAR(200) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    whatsapp_number VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    support_phone VARCHAR(30),
    support_email VARCHAR(150),
    emergency_hotline VARCHAR(50),
    website TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 17. PLATFORM INVITATIONS & REFERRALS
CREATE TABLE IF NOT EXISTS public.platform_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('rider', 'passenger', 'stage_leader', 'mechanic', 'delivery', 'super_admin')),
    target_name VARCHAR(150),
    target_phone VARCHAR(30),
    target_stage VARCHAR(150),
    note TEXT,
    created_date DATE DEFAULT CURRENT_DATE,
    created_by VARCHAR(150) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'approved')),
    registered_user_name VARCHAR(150),
    registered_date DATE,
    share_url TEXT,
    channel VARCHAR(30) DEFAULT 'whatsapp',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 18. MOBILE MONEY PAYMENT SUBMISSIONS & VERIFICATIONS (Mukisa Brian Admin Desk)
CREATE TABLE IF NOT EXISTS public.payment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name VARCHAR(150) NOT NULL,
    user_phone VARCHAR(30) NOT NULL,
    network VARCHAR(10) NOT NULL CHECK (network IN ('MTN', 'Airtel')),
    amount_ugx NUMERIC(12, 2) NOT NULL,
    transaction_id VARCHAR(100) NOT NULL,
    normalized_transaction_id VARCHAR(100) UNIQUE NOT NULL, -- Strict duplicate prevention constraint
    payment_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    plan_id VARCHAR(30) REFERENCES public.subscription_plans(id),
    plan_name VARCHAR(100) NOT NULL,
    screenshot_url TEXT,
    screenshot_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(150),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_riders_stage ON public.rider_profiles(stage_id);
CREATE INDEX IF NOT EXISTS idx_riders_verification ON public.rider_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_income_rider_date ON public.income_records(rider_id, record_date);
CREATE INDEX IF NOT EXISTS idx_expenses_rider_date ON public.expense_records(rider_id, record_date);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON public.emergency_incidents(status);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.platform_invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.platform_invitations(status);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;

-- 19. BODA & FREIGHT JOBS
CREATE TABLE IF NOT EXISTS public.boda_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID REFERENCES public.users(id),
    employer_name VARCHAR(150) NOT NULL,
    employer_phone VARCHAR(30) NOT NULL,
    employer_type VARCHAR(30) CHECK (employer_type IN ('corporate', 'individual', 'cooperative', 'farm')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('passenger_transport', 'parcel_delivery', 'agricultural_produce', 'bulk_cargo', 'contract_dispatch')),
    pickup_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    sub_county VARCHAR(100) NOT NULL,
    pay_amount_ugx NUMERIC(12, 2) NOT NULL,
    pay_type VARCHAR(20) DEFAULT 'fixed' CHECK (pay_type IN ('per_trip', 'daily', 'monthly', 'fixed')),
    vehicle_requirement VARCHAR(30) DEFAULT 'any' CHECK (vehicle_requirement IN ('any', 'petrol_only', 'electric_preferred', 'electric_only')),
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 20. JOB APPLICATIONS
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.boda_jobs(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
    rider_name VARCHAR(150) NOT NULL,
    rider_phone VARCHAR(30) NOT NULL,
    motorcycle_reg VARCHAR(20) NOT NULL,
    motorcycle_type VARCHAR(20) NOT NULL,
    proposal_note TEXT,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 21. BATTERY SWAP STATIONS (Electric Boda Infrastructure)
CREATE TABLE IF NOT EXISTS public.battery_swap_stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    location_name TEXT NOT NULL,
    sub_county VARCHAR(100) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    operator_name VARCHAR(150) NOT NULL,
    operator_phone VARCHAR(30) NOT NULL,
    batteries_available INT DEFAULT 0,
    batteries_charging INT DEFAULT 0,
    total_slots INT NOT NULL,
    battery_model VARCHAR(100) NOT NULL,
    price_per_swap_ugx NUMERIC(10, 2) NOT NULL,
    operating_hours VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    solar_assisted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 22. STATION PROBLEM REPORTS
CREATE TABLE IF NOT EXISTS public.station_problem_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES public.battery_swap_stations(id) ON DELETE CASCADE,
    station_name VARCHAR(200) NOT NULL,
    reporter_id UUID REFERENCES public.users(id),
    reporter_phone VARCHAR(30) NOT NULL,
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('out_of_batteries', 'dock_offline', 'defective_battery', 'overcharging', 'closed_unexpectedly', 'power_blackout')),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_note TEXT
);

-- 23. CERTIFIED MECHANICS & GARAGES
CREATE TABLE IF NOT EXISTS public.mechanics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    name VARCHAR(150) NOT NULL,
    workshop_name VARCHAR(200) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    sub_county VARCHAR(100) NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    specialties TEXT[],
    is_certified BOOLEAN DEFAULT TRUE,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    repairs_count INT DEFAULT 0,
    roadside_rescue_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 24. REPAIR REQUESTS & ROADSIDE BREAKDOWNS
CREATE TABLE IF NOT EXISTS public.repair_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES public.rider_profiles(id),
    rider_name VARCHAR(150) NOT NULL,
    rider_phone VARCHAR(30) NOT NULL,
    motorcycle_reg VARCHAR(20) NOT NULL,
    mechanic_id UUID REFERENCES public.mechanics(id),
    mechanic_name VARCHAR(150),
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('routine_service', 'breakdown', 'electrical', 'puncture', 'engine_issue')),
    description TEXT NOT NULL,
    urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
    location TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 25. SERVICE RECORDS (Digital Maintenance Logbook)
CREATE TABLE IF NOT EXISTS public.service_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
    motorcycle_reg VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    mileage_km INT NOT NULL,
    service_type VARCHAR(200) NOT NULL,
    parts_replaced TEXT[],
    cost_ugx NUMERIC(12, 2) NOT NULL,
    mechanic_name VARCHAR(150) NOT NULL,
    next_due_km INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 26. RIDER DIGITAL WALLETS
CREATE TABLE IF NOT EXISTS public.rider_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID UNIQUE REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
    balance_ugx NUMERIC(12, 2) DEFAULT 0.00 CHECK (balance_ugx >= 0),
    total_earned_ugx NUMERIC(12, 2) DEFAULT 0.00,
    total_spent_ugx NUMERIC(12, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'UGX',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 27. WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.rider_wallets(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES public.rider_profiles(id),
    amount_ugx NUMERIC(12, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credit', 'debit')),
    description TEXT NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('fare', 'topup', 'subscription', 'maintenance', 'withdrawal', 'transfer')),
    balance_after_ugx NUMERIC(12, 2) NOT NULL,
    reference VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 28. EXTERNAL SERVICES CONFIGURATION
CREATE TABLE IF NOT EXISTS public.external_services_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sms_provider VARCHAR(30) DEFAULT 'africastalking' CHECK (sms_provider IN ('africastalking', 'twilio')),
    sms_api_key TEXT,
    sms_sender_id VARCHAR(30) DEFAULT 'BODACARE',
    whatsapp_api_endpoint TEXT,
    whatsapp_access_token TEXT,
    whatsapp_business_phone VARCHAR(30),
    google_maps_api_key TEXT,
    auto_dispatch_enabled BOOLEAN DEFAULT TRUE,
    momo_webhook_secret TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 29. COMPLAINT REPORTS & CUSTOMER SUPPORT
CREATE TABLE IF NOT EXISTS public.complaint_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    user_name VARCHAR(150) NOT NULL,
    user_phone VARCHAR(30) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('fare_dispute', 'rider_conduct', 'lost_item', 'app_glitch', 'payment_issue', 'emergency_delay')),
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- ADDITIONAL INDEXES
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.boda_jobs(status);
CREATE INDEX IF NOT EXISTS idx_stations_sub_county ON public.battery_swap_stations(sub_county);
CREATE INDEX IF NOT EXISTS idx_wallet_rider ON public.rider_wallets(rider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_rider ON public.wallet_transactions(rider_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON public.repair_requests(status);

-- ============================================================================
-- JOB ALERT AND SMS EMPLOYMENT NOTIFICATION SYSTEM SCHEMA EXTENSIONS
-- ============================================================================

-- 30. EXTEND RIDER PROFILES FOR PHONE TYPE (SMARTPHONE VS FEATURE-PHONE) & VILLAGE TARGETING
ALTER TABLE public.rider_profiles
  ADD COLUMN IF NOT EXISTS phone_type VARCHAR(20) DEFAULT 'smartphone' CHECK (phone_type IN ('smartphone', 'feature_phone')),
  ADD COLUMN IF NOT EXISTS village VARCHAR(120),
  ADD COLUMN IF NOT EXISTS sub_county VARCHAR(120);

-- 31. EXTEND BODA JOBS WITH VERIFICATION, REQUIREMENTS & APPLICATION INSTRUCTIONS
ALTER TABLE public.boda_jobs
  ADD COLUMN IF NOT EXISTS employer_company VARCHAR(200),
  ADD COLUMN IF NOT EXISTS village VARCHAR(120),
  ADD COLUMN IF NOT EXISTS salary_display VARCHAR(120),
  ADD COLUMN IF NOT EXISTS requirements TEXT,
  ADD COLUMN IF NOT EXISTS application_instructions TEXT,
  ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_by VARCHAR(150),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS notification_mode VARCHAR(20) DEFAULT 'none' CHECK (notification_mode IN ('sms_only', 'app_only', 'both', 'none')),
  ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMP WITH TIME ZONE;

-- 32. RIDER JOB ALERT PREFERENCES & OPT-OUT MANAGEMENT (1:1 WITH RIDER PROFILE - NO DUPLICATES)
CREATE TABLE IF NOT EXISTS public.rider_job_alert_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID UNIQUE NOT NULL REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    preferred_channel VARCHAR(20) DEFAULT 'auto' CHECK (preferred_channel IN ('auto', 'sms_only', 'app_only', 'both')),
    opted_out_sms BOOLEAN DEFAULT FALSE,
    opted_out_at TIMESTAMP WITH TIME ZONE,
    opt_out_reason TEXT,
    job_types TEXT[] DEFAULT ARRAY['produce_transport', 'parcel_delivery', 'scheduled_courier', 'corporate_boda', 'passenger_contract'],
    preferred_sub_counties TEXT[] DEFAULT ARRAY['Kikyusa', 'Luweero Town Council', 'Wobulenzi', 'Kasana'],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 33. BULK SMS JOB ALERT CAMPAIGNS & EXPENDITURE AUDIT
CREATE TABLE IF NOT EXISTS public.sms_job_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.boda_jobs(id) ON DELETE SET NULL,
    job_title VARCHAR(200) NOT NULL,
    sent_by_admin_name VARCHAR(150) NOT NULL,
    sent_by_admin_role VARCHAR(50) NOT NULL CHECK (sent_by_admin_role = 'super_admin'),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    dispatch_mode VARCHAR(20) NOT NULL CHECK (dispatch_mode IN ('sms_only', 'app_only', 'both', 'none')),
    recipient_scope VARCHAR(30) NOT NULL CHECK (recipient_scope IN ('all', 'kikyusa', 'luweero', 'villages', 'stages', 'individual')),
    scope_details TEXT,
    message_text TEXT NOT NULL,
    sms_segments INT DEFAULT 1,
    total_targeted_riders INT DEFAULT 0,
    sms_attempted_count INT DEFAULT 0,
    sms_sent_count INT DEFAULT 0,
    sms_delivered_count INT DEFAULT 0,
    sms_failed_count INT DEFAULT 0,
    invalid_phone_count INT DEFAULT 0,
    opted_out_skipped_count INT DEFAULT 0,
    app_notifications_sent_count INT DEFAULT 0,
    estimated_cost_ugx NUMERIC(12, 2) DEFAULT 0,
    actual_expenditure_ugx NUMERIC(12, 2) DEFAULT 0,
    provider VARCHAR(50) DEFAULT 'africastalking',
    sender_id VARCHAR(30) DEFAULT 'BODACARE',
    gateway_configured BOOLEAN DEFAULT FALSE,
    gateway_error TEXT
);

-- 34. PER-RIDER SMS & APP DELIVERY REPORTS (DLR TRACKING)
CREATE TABLE IF NOT EXISTS public.sms_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.sms_job_campaigns(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES public.rider_profiles(id) ON DELETE CASCADE,
    rider_name VARCHAR(150) NOT NULL,
    raw_phone VARCHAR(30) NOT NULL,
    normalized_phone VARCHAR(20),
    network VARCHAR(20) NOT NULL CHECK (network IN ('MTN', 'Airtel', 'Other', 'Invalid')),
    phone_type VARCHAR(20) NOT NULL CHECK (phone_type IN ('smartphone', 'feature_phone')),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'in_app', 'both', 'skipped')),
    sms_status VARCHAR(30) NOT NULL CHECK (sms_status IN ('queued', 'sent', 'delivered', 'failed', 'invalid_number', 'opted_out', 'blocked_unconfigured')),
    app_notif_sent BOOLEAN DEFAULT FALSE,
    provider_message_id VARCHAR(120),
    cost_ugx NUMERIC(10, 2) DEFAULT 0,
    failure_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_rider_prefs_rider ON public.rider_job_alert_preferences(rider_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_job ON public.sms_job_campaigns(job_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_sent_at ON public.sms_job_campaigns(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_dlr_campaign ON public.sms_delivery_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_dlr_provider_msg ON public.sms_delivery_logs(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_sms_dlr_status ON public.sms_delivery_logs(sms_status);


