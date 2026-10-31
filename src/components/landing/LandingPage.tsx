import React, { useState } from 'react';
import { Shield, Bike, MapPin, Users, Wrench, ArrowRight, CheckCircle2, Phone, Star, Sparkles, AlertTriangle, ChevronRight, Calculator } from 'lucide-react';
import { HERO_IMAGE, STAGE_IMAGE, INITIAL_PLANS } from '../../lib/storage';
import { formatUgx, translations, Language } from '../../lib/i18n';
import { UserRole } from '../../types';

interface LandingPageProps {
  lang: Language;
  onSelectRole: (role: UserRole) => void;
  onOpenPayment: () => void;
  onOpenSOS: () => void;
  onNavigateTab: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  lang,
  onSelectRole,
  onOpenPayment,
  onOpenSOS,
  onNavigateTab,
}) => {
  const t = translations[lang];

  // Quick Fare Estimator State
  const [pickup, setPickup] = useState('Kikyusa Main Stage');
  const [dropoff, setDropoff] = useState('Luweero Town Council (Stanbic)');
  const [estimatedKm, setEstimatedKm] = useState(14.5);

  const calculateFare = (km: number) => {
    // Base 2,500 UGX + 700 UGX per km
    return Math.round((2500 + km * 700) / 500) * 500;
  };

  const handleRouteSelect = (from: string, to: string, km: number) => {
    setPickup(from);
    setDropoff(to);
    setEstimatedKm(km);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 1. Hero Section */}
      <section className="relative bg-[#0B192C] text-white overflow-hidden py-12 md:py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                <span>Luweero District Pilot</span>
                <span>·</span>
                <span>Kikyusa & Surrounding Communities</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-balance">
                Digital Business Platform for <span className="text-amber-400">Boda-Boda Riders</span> & Communities in Uganda.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                BodaCare empowers motorcycle taxi operators with digital income tracking, fair-priced passenger bookings, digital stage management, genuine spare parts, and one-tap emergency safety.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    onSelectRole('rider');
                    onNavigateTab('rider');
                  }}
                  className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Bike className="w-4 h-4" />
                  <span>Launch Rider Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    onSelectRole('passenger');
                    onNavigateTab('passenger');
                  }}
                  className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Book Boda / Send Parcel</span>
                </button>

                <button
                  onClick={onOpenSOS}
                  className="px-4 py-3.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-sm flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                  <span>SOS Rescue</span>
                </button>
              </div>

              {/* Key Trust Signals */}
              <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-xl font-extrabold text-amber-400 font-mono">195+</p>
                  <p className="text-slate-400 mt-0.5">Verified Riders</p>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-emerald-400 font-mono">4 Stages</p>
                  <p className="text-slate-400 mt-0.5">Active in Luweero</p>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-sky-400 font-mono">UGX 5,000</p>
                  <p className="text-slate-400 mt-0.5">Affordable Tier / Mo</p>
                </div>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative bg-slate-800 aspect-[4/3] lg:aspect-auto lg:h-[460px]">
                <img
                  src={HERO_IMAGE}
                  alt="Verified Ugandan Boda Rider in Luweero with helmet and safety reflector"
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                        Verified Operator Spotlight
                      </p>
                      <h4 className="text-sm font-bold text-white">Kato Moses · Bajaj Boxer UFG 421K</h4>
                      <p className="text-[11px] text-slate-300">Kikyusa Main Stage · 1,420 Safe Trips</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs">
                      4.9 ★
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Fare Estimator & Luweero Corridor Routes */}
      <section className="py-12 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded">
                <Calculator className="w-3.5 h-3.5" />
                <span>Fair Pricing Calculator</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Transparent Fares for Luweero Routes
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                No bargaining or sudden price spikes. BodaCare provides standardized, fair fares for passengers while guaranteeing dignified earnings for operators across rural and urban Luweero.
              </p>

              {/* Quick Route Buttons */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Popular Trading Centre Routes:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRouteSelect('Kikyusa Main Stage', 'Luweero Town Council', 14.5)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700 transition-colors"
                  >
                    Kikyusa ↔ Luweero Town (14.5 km)
                  </button>
                  <button
                    onClick={() => handleRouteSelect('Kasana Market Stage', 'Wobulenzi Junction', 12.0)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700 transition-colors"
                  >
                    Kasana ↔ Wobulenzi (12 km)
                  </button>
                  <button
                    onClick={() => handleRouteSelect('Kikyusa Centre', 'Bamunanika Roundabout', 9.8)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700 transition-colors"
                  >
                    Kikyusa ↔ Bamunanika (9.8 km)
                  </button>
                </div>
              </div>
            </div>

            {/* Fare Card */}
            <div className="lg:col-span-7">
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Pickup Point</span>
                    <input
                      type="text"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Destination</span>
                    <input
                      type="text"
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400">Estimated Distance: {estimatedKm} km</span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
                      {formatUgx(calculateFare(estimatedKm))}
                    </div>
                    <span className="text-[11px] text-emerald-400">Includes rider helmet + passenger safety cover</span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectRole('passenger');
                      onNavigateTab('passenger');
                    }}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
                  >
                    Request This Ride Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The 4 Stakeholder Pillars */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            A Complete Ecosystem for Rural & Urban Mobility
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Every user has dedicated tools built for daily Ugandan realities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Riders */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Bike className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">For Boda-Boda Riders</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track daily cash & MoMo income, log fuel and repair costs, calculate net profit, and access emergency rescue on remote roads.
              </p>
            </div>
            <button
              onClick={() => {
                onSelectRole('rider');
                onNavigateTab('rider');
              }}
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-900 hover:text-amber-600 flex items-center justify-between cursor-pointer"
            >
              <span>Open Rider Hub</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Passengers */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-400 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">For Passengers & Senders</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hail verified riders with inspected bikes, send parcels and farm produce securely, and share live trip details with family.
              </p>
            </div>
            <button
              onClick={() => {
                onSelectRole('passenger');
                onNavigateTab('passenger');
              }}
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-900 hover:text-emerald-600 flex items-center justify-between cursor-pointer"
            >
              <span>Book Ride / Parcel</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: Stage Leaders */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-400 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">For Stage Leaders</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Take daily digital roll-call attendance, collect UGX 1,000 welfare dues transparently, broadcast announcements, and resolve disputes.
              </p>
            </div>
            <button
              onClick={() => {
                onSelectRole('stage_leader');
                onNavigateTab('stage');
              }}
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-900 hover:text-sky-600 flex items-center justify-between cursor-pointer"
            >
              <span>Manage My Stage</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 4: Mechanics & Garages */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">For Garages & Spares</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                List genuine Bajaj and TVS parts, tyres, and repair services to over 195 active riders in Kikyusa and Luweero.
              </p>
            </div>
            <button
              onClick={() => {
                onSelectRole('mechanic');
                onNavigateTab('business');
              }}
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-900 hover:text-indigo-600 flex items-center justify-between cursor-pointer"
            >
              <span>View Business Directory</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Community Stage Showcase Photo */}
      <section className="py-12 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
              <img
                src={STAGE_IMAGE}
                alt="Disciplined Boda Boda riders parked at organized stage in Luweero Uganda"
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded">
                <span>Community Organisation</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Transforming Boda-Boda Stages into Dignified Local Businesses
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                In rural Uganda, boda stages are the lifeblood of transport. BodaCare gives stage chairpersons modern tools to eliminate ghost riders, enforce safety helmets, and build transparent welfare funds that protect riders during illness or accidents.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    onSelectRole('super_admin');
                    onNavigateTab('admin');
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 cursor-pointer transition-colors"
                >
                  Enter Platform Owner Command Center
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Subscription Packages Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Affordable Subscriptions for Every Operator
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Pay easily with MTN Mobile Money (*165#) or Airtel Money (*185#). Instant verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {INITIAL_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 border transition-all flex flex-col justify-between relative ${
                plan.isPopular
                  ? 'bg-white border-amber-500 shadow-xl ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                  Most Popular in Luweero
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#0B192C] font-mono">
                    {plan.priceUgx === 0 ? 'Free' : formatUgx(plan.priceUgx)}
                  </span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  onClick={onOpenPayment}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    plan.isPopular
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md'
                      : 'bg-[#0B192C] hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{plan.priceUgx === 0 ? 'Start Free Profile' : `Subscribe with MoMo`}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="bg-[#0B192C] text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
              BC
            </div>
            <span className="font-bold text-white text-sm">Owned and Managed by BodaCare Uganda.</span>
            <span>· Kikyusa & Luweero District</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400 text-[11px]">
            <span>Compliant with Uganda Data Protection and Privacy Act, 2019</span>
            <span>·</span>
            <span>Emergency Police: 999 / 112</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
