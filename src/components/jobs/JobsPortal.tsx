import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Package,
  MapPin,
  Clock,
  DollarSign,
  Send,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Zap,
  Building2,
  User,
  Trash2,
  Check,
  Bell,
  Phone,
} from 'lucide-react';
import { BodaJob, JobApplication, RiderProfile, UserRole } from '../../types';
import { storage } from '../../lib/storage';
import { formatUgx, translations, Language } from '../../lib/i18n';
import { RiderJobAlertsCard } from '../rider/RiderJobAlertsCard';
import { OfflineFreshnessBanner } from '../common/OfflineFreshnessBanner';

interface JobsPortalProps {
  lang?: Language;
  currentRole: UserRole;
  onOpenSOS?: () => void;
  onNavigateTab?: (tab: string) => void;
  highlightedJobId?: string | null;
  onClearHighlight?: () => void;
  isOffline?: boolean;
  lastSyncedAt?: string | null;
}

export const JobsPortal: React.FC<JobsPortalProps> = ({
  lang = 'en',
  currentRole,
  onOpenSOS,
  onNavigateTab,
  highlightedJobId = null,
  onClearHighlight,
  isOffline = false,
  lastSyncedAt = null,
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'available' | 'my_applications' | 'post_job' | 'alert_preferences'>('available');
  const [jobs, setJobs] = useState<BodaJob[]>(() => storage.getJobs());
  const [applications, setApplications] = useState<JobApplication[]>(() => storage.getJobApplications());

  useEffect(() => {
    if (highlightedJobId) {
      setActiveTab('available');
      setSearchQuery('');
      setSelectedSubCounty('all');
      setSelectedType('all');
      setPowertrainFilter('all');
    }
  }, [highlightedJobId]);

  // Current logged in rider (may be null after membership reset)
  const [rider, setRider] = useState<RiderProfile | null>(
    () => storage.getRiders().find((r) => r.id === 'rider-kato-moses') || storage.getRiders()[0] || null
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCounty, setSelectedSubCounty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [powertrainFilter, setPowertrainFilter] = useState<'all' | 'electric' | 'petrol'>('all');

  // Application Modal state
  const [selectedJobForApp, setSelectedJobForApp] = useState<BodaJob | null>(null);
  const [proposedRate, setProposedRate] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [appSubmitting, setAppSubmitting] = useState(false);
  const [appFeedback, setAppFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Post Job Form State (Employers & Admin)
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newEmployerName, setNewEmployerName] = useState('Nsubuga Henry');
  const [newEmployerPhone, setNewEmployerPhone] = useState('+256 782 550 918');
  const [newType, setNewType] = useState<BodaJob['type']>('produce_transport');
  const [newDescription, setNewDescription] = useState('');
  const [newPickup, setNewPickup] = useState('Kikyusa Bulking Centre');
  const [newDelivery, setNewDelivery] = useState('Kasana Processing Mill');
  const [newSubCounty, setNewSubCounty] = useState('Kikyusa');
  const [newDistance, setNewDistance] = useState('14');
  const [newCargoWeight, setNewCargoWeight] = useState('75');
  const [newCargoDesc, setNewCargoDesc] = useState('');
  const [newPayment, setNewPayment] = useState('35000');
  const [newFrequency, setNewFrequency] = useState<BodaJob['paymentFrequency']>('per_trip');
  const [newBikeReq, setNewBikeReq] = useState<BodaJob['requiredMotorcycleType']>('any');
  const [postSuccess, setPostSuccess] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered jobs (only admin-verified jobs shown to riders unless viewed by super_admin)
  const filteredJobs = jobs.filter((j) => {
    const isVisibleToRole = currentRole === 'super_admin' || j.adminApproved;
    const isNotExpired = !j.deadline || j.deadline >= todayStr;
    const matchesSearch =
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.employerCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.deliveryLocation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSub = selectedSubCounty === 'all' || j.subCounty === selectedSubCounty;
    const matchesType = selectedType === 'all' || j.type === selectedType;
    const matchesPower =
      powertrainFilter === 'all' ||
      j.requiredMotorcycleType === 'any' ||
      j.requiredMotorcycleType === powertrainFilter;

    return isVisibleToRole && isNotExpired && matchesSearch && matchesSub && matchesType && matchesPower;
  });

  // Handle Application Submit
  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForApp) return;
    if (!rider) {
      setAppFeedback({
        type: 'error',
        message: 'No active registered rider profile found. Please register as a Boda Rider first.',
      });
      return;
    }

    setAppSubmitting(true);
    const rate = parseInt(proposedRate, 10) || selectedJobForApp.paymentAmountUgx;

    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      jobId: selectedJobForApp.id,
      jobTitle: selectedJobForApp.title,
      employerCompany: selectedJobForApp.employerCompany,
      riderId: rider.id,
      riderName: rider.fullName,
      riderPhone: rider.phone,
      riderIdNumber: rider.riderIdNumber || 'BCU-LWR-0421',
      bikeReg: `${rider.motorcycleReg} (${rider.motorcycleType === 'electric' ? 'Electric E-Boda' : 'Petrol'})`,
      proposedRateUgx: rate,
      coverNote: coverNote.trim() || 'Ready for immediate dispatch with verified documents and safety helmet.',
      appliedAt: new Date().toISOString(),
      status: 'pending',
    };

    const res = storage.applyToJob(newApp);
    setAppSubmitting(false);

    if (res.success) {
      setAppFeedback({ type: 'success', message: res.message });
      setApplications(storage.getJobApplications());
      setJobs(storage.getJobs());
      setTimeout(() => {
        setSelectedJobForApp(null);
        setAppFeedback(null);
        setProposedRate('');
        setCoverNote('');
      }, 1800);
    } else {
      setAppFeedback({ type: 'error', message: res.message });
    }
  };

  // Handle Post New Job
  const handlePostJob = (e: React.FormEvent) => {
    e.preventDefault();
    const pay = parseInt(newPayment, 10);
    if (isNaN(pay) || pay <= 0) return;

    const newJob: BodaJob = {
      id: `job-${Date.now()}`,
      employerId: 'emp-user-custom',
      employerName: newEmployerName.trim(),
      employerPhone: newEmployerPhone.trim(),
      employerCompany: newCompany.trim() || 'Luweero Enterprise',
      title: newTitle.trim(),
      type: newType,
      description: newDescription.trim(),
      pickupLocation: newPickup.trim(),
      deliveryLocation: newDelivery.trim(),
      subCounty: newSubCounty,
      distanceKm: parseFloat(newDistance) || 10,
      cargoWeightKg: parseFloat(newCargoWeight) || undefined,
      cargoDescription: newCargoDesc.trim() || undefined,
      paymentAmountUgx: pay,
      paymentFrequency: newFrequency,
      requiredMotorcycleType: newBikeReq,
      status: 'open',
      postedDate: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      applicationsCount: 0,
      adminApproved: currentRole === 'super_admin',
    };

    storage.saveJob(newJob);
    setJobs(storage.getJobs());
    setPostSuccess(true);
    setTimeout(() => {
      setPostSuccess(false);
      setActiveTab('available');
      setNewTitle('');
      setNewDescription('');
    }, 2000);
  };

  // Handle Admin Remove
  const handleDeleteJob = (id: string) => {
    if (confirm('Are you sure you want to remove this job opportunity?')) {
      storage.deleteJob(id);
      setJobs(storage.getJobs());
    }
  };

  const getJobTypeLabel = (type: BodaJob['type']) => {
    switch (type) {
      case 'produce_transport':
        return 'Produce & Agriculture';
      case 'parcel_delivery':
        return 'Commercial Parcel';
      case 'scheduled_courier':
        return 'Scheduled Courier';
      case 'corporate_boda':
        return 'Corporate Transport';
      default:
        return 'Boda Transport';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      <OfflineFreshnessBanner
        isOffline={isOffline}
        lastSyncedAt={lastSyncedAt}
        contextLabel="Cached job listings & applications"
      />
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0B192C] via-slate-900 to-[#143220] text-white p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Module 2: Transportation & Delivery Opportunities</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Luweero Boda Freight & Jobs Marketplace
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Connecting verified riders in Kikyusa, Luweero Town, and Wobulenzi with lucrative coffee haulage, farm produce delivery, medical supplies, and commercial courier contracts.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('available')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'available'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              Available Jobs ({jobs.length})
            </button>

            <button
              onClick={() => setActiveTab('my_applications')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'my_applications'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              My Proposals ({rider ? applications.filter((a) => a.riderId === rider.id).length : 0})
            </button>

            <button
              onClick={() => setActiveTab('post_job')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'post_job'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-emerald-400 hover:text-white border border-slate-700'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post Boda Opportunity</span>
            </button>

            <button
              onClick={() => setActiveTab('alert_preferences')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'alert_preferences'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-amber-300 hover:text-white border border-slate-700'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>SMS &amp; Job Alerts</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: AVAILABLE JOBS */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search coffee, parcel, town..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            {/* Sub-county & Type Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedSubCounty}
                onChange={(e) => setSelectedSubCounty(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-medium focus:ring-1 focus:ring-amber-400"
              >
                <option value="all">All Luweero Sub-Counties</option>
                <option value="Kikyusa">Kikyusa</option>
                <option value="Luweero Town Council">Luweero Town</option>
                <option value="Wobulenzi">Wobulenzi</option>
                <option value="Kasana">Kasana</option>
                <option value="Bamunanika">Bamunanika</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-medium focus:ring-1 focus:ring-amber-400"
              >
                <option value="all">All Freight Types</option>
                <option value="produce_transport">Agricultural Produce</option>
                <option value="scheduled_courier">Medical & Clinic Courier</option>
                <option value="parcel_delivery">Commercial Hardware/Retail</option>
              </select>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setPowertrainFilter('all')}
                  className={`px-2 py-1 rounded-lg font-semibold ${powertrainFilter === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
                >
                  All Bikes
                </button>
                <button
                  onClick={() => setPowertrainFilter('electric')}
                  className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 ${powertrainFilter === 'electric' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600'}`}
                >
                  <Zap className="w-3 h-3" />
                  <span>E-Boda</span>
                </button>
              </div>
            </div>
          </div>

          {/* Jobs Listing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No jobs match your filter criteria</h3>
                <p className="text-xs text-slate-500">Try selecting another sub-county or clearing search keywords.</p>
              </div>
            ) : (
              filteredJobs.map((job) => {
                const hasApplied = rider ? applications.some((a) => a.jobId === job.id && a.riderId === rider.id) : false;
                const isAssigned = job.status === 'assigned';
                const isHighlighted = Boolean(highlightedJobId && job.id === highlightedJobId);

                return (
                  <div
                    key={job.id}
                    className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3.5 relative flex flex-col justify-between ${
                      isHighlighted
                        ? 'border-2 border-amber-400 ring-2 ring-amber-300/70'
                        : 'border border-slate-200'
                    }`}
                  >
                    {isHighlighted && (
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-[11px] font-bold text-amber-950">
                        <span className="flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-600" />
                          <span>Opened Directly From BodaCare Job Notification Link</span>
                        </span>
                        {onClearHighlight && (
                          <button
                            type="button"
                            onClick={onClearHighlight}
                            className="text-[10px] underline text-amber-800 hover:text-black cursor-pointer"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                              {getJobTypeLabel(job.type)}
                            </span>
                            {job.requiredMotorcycleType === 'electric' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-emerald-600" />
                                <span>Electric Only</span>
                              </span>
                            )}
                            <span className="text-slate-400 text-xs">• {job.subCounty}</span>
                          </div>
                          <h3 className="text-base font-extrabold text-slate-900 leading-snug">{job.title}</h3>
                          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{job.employerCompany}</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-lg font-black text-emerald-600 font-mono">
                            {formatUgx(job.paymentAmountUgx)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium capitalize">
                            /{job.paymentFrequency.replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {job.description}
                      </p>

                      {/* Route Details */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Pickup: <strong className="text-slate-900">{job.pickupLocation}</strong></span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>Drop-off: <strong className="text-slate-900">{job.deliveryLocation}</strong></span>
                          </span>
                          <span className="font-mono text-slate-500 font-semibold">{job.distanceKm} km</span>
                        </div>
                        {job.cargoWeightKg && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                            <span>Cargo Weight: <strong>{job.cargoWeightKg} kg</strong></span>
                            <span>{job.cargoDescription}</span>
                          </div>
                        )}
                        {job.requirements && (
                          <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                            <strong>Requirements:</strong> {job.requirements}
                          </div>
                        )}
                        {job.applicationInstructions && (
                          <div className="text-[11px] text-slate-600">
                            <strong>Apply:</strong> {job.applicationInstructions}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500">Employer Contact:</span>
                          <a
                            href={`tel:${job.employerPhone.replace(/\s+/g, '')}`}
                            className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{job.employerPhone}</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Deadline: {job.deadline}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{job.applicationsCount} proposals</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentRole === 'super_admin' && (
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Listing (Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {isAssigned ? (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">
                            Assigned to {job.assignedRiderName || 'Rider'}
                          </span>
                        ) : hasApplied ? (
                          <span className="px-3.5 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Bid Submitted</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedJobForApp(job);
                              setProposedRate(job.paymentAmountUgx.toString());
                            }}
                            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit Bid</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY PROPOSALS */}
      {activeTab === 'my_applications' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-900">Your Submitted Freight & Courier Proposals</h2>
            <p className="text-xs text-slate-500">
              Track the approval status of your bids with employers in Kikyusa, Kasana, and Luweero.
            </p>

            <div className="space-y-3">
              {(rider ? applications.filter((a) => a.riderId === rider.id) : []).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  You have not applied for any jobs yet. Check the Available Jobs tab to submit your first proposal.
                </div>
              ) : (
                applications
                  .filter((a) => rider && a.riderId === rider.id)
                  .map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{app.jobTitle}</h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              app.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.status === 'shortlisted'
                                ? 'bg-blue-100 text-blue-800'
                                : app.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          Employer: <strong className="text-slate-800">{app.employerCompany}</strong> • Bid:{' '}
                          <strong className="text-emerald-700 font-mono">{formatUgx(app.proposedRateUgx)}</strong>
                        </p>
                        <p className="text-slate-500 text-[11px] italic">"{app.coverNote}"</p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[11px] text-slate-400">
                          Applied: {new Date(app.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POST A JOB */}
      {activeTab === 'post_job' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl max-w-2xl mx-auto space-y-5 text-xs">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Publish Boda Transport or Delivery Job</h2>
            <p className="text-xs text-slate-500 mt-1">
              Connect directly with verified boda operators in Luweero District. All listings are monitored by platform administrators.
            </p>
          </div>

          {postSuccess && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Job opportunity published and broadcasted to verified Luweero riders!</span>
            </div>
          )}

          <form onSubmit={handlePostJob} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Daily Coffee Bags Transport from Kikyusa to Kasana"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Organization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kikyusa Coffee Growers Union"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Freight / Service Category</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as BodaJob['type'])}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                >
                  <option value="produce_transport">Agricultural Produce Transport</option>
                  <option value="scheduled_courier">Scheduled Medical & Document Courier</option>
                  <option value="parcel_delivery">Commercial Hardware / Retail Goods</option>
                  <option value="corporate_boda">Corporate Staff Transport</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pickup Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kikyusa Cooperative Store"
                  value={newPickup}
                  onChange={(e) => setNewPickup(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Drop-off Destination</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasana Processing Plant"
                  value={newDelivery}
                  onChange={(e) => setNewDelivery(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sub-County</label>
                <select
                  value={newSubCounty}
                  onChange={(e) => setNewSubCounty(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                >
                  <option value="Kikyusa">Kikyusa</option>
                  <option value="Luweero Town Council">Luweero Town Council</option>
                  <option value="Wobulenzi">Wobulenzi</option>
                  <option value="Kasana">Kasana</option>
                  <option value="Bamunanika">Bamunanika</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount (UGX)</label>
                <input
                  type="number"
                  required
                  placeholder="35000"
                  value={newPayment}
                  onChange={(e) => setNewPayment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opportunity Description & Requirements</label>
              <textarea
                rows={3}
                required
                placeholder="Specify cargo dimensions, road terrain details, pickup time, and required safety gear..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('available')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Publish Job Listing
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: RIDER JOB ALERT & SMS PREFERENCES */}
      {activeTab === 'alert_preferences' && (
        rider ? (
          <RiderJobAlertsCard
            rider={rider}
            onUpdated={(updated) => setRider(updated)}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <Bell className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No Active Rider Profile</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Register as a Boda Rider or ask the Super Administrator to add your rider account to configure SMS and WhatsApp job alert preferences.
            </p>
          </div>
        )
      )}

      {/* SUBMIT BID MODAL */}
      {selectedJobForApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-xs my-auto mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {selectedJobForApp.employerCompany}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">{selectedJobForApp.title}</h3>
                <p className="text-slate-500 text-[11px]">
                  Official Offer: <strong className="text-emerald-700 font-mono">{formatUgx(selectedJobForApp.paymentAmountUgx)}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedJobForApp(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {appFeedback && (
              <div
                className={`p-3 rounded-xl font-semibold flex items-center gap-2 ${
                  appFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {appFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{appFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleApply} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Your Proposed Rate (UGX)</label>
                <input
                  type="number"
                  required
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Proposal Note / Experience</label>
                <textarea
                  rows={3}
                  placeholder="Explain why you are the best rider for this route (e.g. strong carrier, electric motor torque, knowledge of murram short-cuts)..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                {rider ? (
                  <>
                    <p>
                      Applying as: <strong>{rider.fullName}</strong> ({rider.riderIdNumber})
                    </p>
                    <p>
                      Motorcycle: <strong>{rider.motorcycleReg}</strong> •{' '}
                      <span className="capitalize font-semibold text-emerald-700">{rider.motorcycleType}</span>
                    </p>
                  </>
                ) : (
                  <p className="text-rose-700 font-semibold">
                    No active rider profile registered. Only registered riders can submit job bids.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobForApp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={appSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{appSubmitting ? 'Transmitting...' : 'Send Application'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
