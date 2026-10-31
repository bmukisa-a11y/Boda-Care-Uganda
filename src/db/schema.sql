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

-- Sample RLS Policy: Only Super Admins can modify founder_profiles
-- CREATE POLICY super_admin_only_founder ON public.founder_profiles
--     FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

