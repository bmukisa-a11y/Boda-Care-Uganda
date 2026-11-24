import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  MapPin,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Clock,
  Shield,
  FileText,
  Zap,
  ArrowRight,
  Filter,
  DollarSign,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Mechanic, RepairRequest, ServiceRecord, UserRole } from '../../types';
import { storage } from '../../lib/storage';

interface RepairsMaintenanceHubProps {
  currentRole: UserRole;
  currentRiderId?: string;
  onOpenSOS?: () => void;
}

export const RepairsMaintenanceHub: React.FC<RepairsMaintenanceHubProps> = ({
  currentRole,
  currentRiderId = 'rider-kato-moses',
  onOpenSOS
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'schedule' | 'logbook' | 'requests'>(
    currentRole === 'mechanic' ? 'requests' : 'directory'
  );
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  
  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCounty, setSelectedSubCounty] = useState('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [selectedMechanicForRequest, setSelectedMechanicForRequest] = useState<Mechanic | null>(null);

  // New repair request form state
  const [requestMotorcycleReg, setRequestMotorcycleReg] = useState('UFG 421K');
  const [requestMotorcycleType, setRequestMotorcycleType] = useState<'electric' | 'petrol'>('electric');
  const [requestServiceType, setRequestServiceType] = useState('Routine Service & Oil Change');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestUrgency, setRequestUrgency] = useState<RepairRequest['urgency']>('urgent');
  const [requestLocation, setRequestLocation] = useState('Kikyusa Trading Centre');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState('');

  // New service record form state
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordMileage, setRecordMileage] = useState(14850);
  const [recordServiceType, setRecordServiceType] = useState('Total 4T Engine Oil Change & Chain Lubrication');
  const [recordParts, setRecordParts] = useState('Total 4T Oil 1L, Bajaj Oil Filter, Chain spray');
  const [recordCost, setRecordCost] = useState('28000');
  const [recordMechanicName, setRecordMechanicName] = useState('Mugerwa John');
  const [recordGarageName, setRecordGarageName] = useState('Kikyusa Central Boda Workshop');
  const [recordNextDueKm, setRecordNextDueKm] = useState(16350);
  const [recordNotes, setRecordNotes] = useState('Brakes checked and tuned. Rear tyre tread 70%.');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setMechanics(storage.getMechanics());
    setServiceRecords(storage.getServiceRecords());
    setRepairRequests(storage.getRepairRequests());
  };

  const filteredMechanics = mechanics.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subCounty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.services.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSubCounty = selectedSubCounty === 'all' || m.subCounty === selectedSubCounty;
    const matchesSpecialty =
      selectedSpecialty === 'all' ||
      m.services.some((s) => s.name.toLowerCase().includes(selectedSpecialty.toLowerCase()));

    return matchesSearch && matchesSubCounty && matchesSpecialty;
  });

  const handleOpenRequestModal = (mech?: Mechanic) => {
    if (mech) {
      setSelectedMechanicForRequest(mech);
    } else {
      setSelectedMechanicForRequest(null);
    }
    setShowRequestModal(true);
  };

  const handleSubmitRepairRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDescription.trim()) return;

    setRequestSubmitting(true);
    setTimeout(() => {
      const newReq: RepairRequest = {
        id: `rep-${Date.now().toString().slice(-6)}`,
        riderId: currentRiderId,
        riderName: 'Kato Moses',
        riderPhone: '+256 774 912 304',
        motorcycleReg: requestMotorcycleReg,
        motorcycleType: requestMotorcycleType,
        garageId: selectedMechanicForRequest ? selectedMechanicForRequest.id : 'biz-01',
        garageName: selectedMechanicForRequest ? selectedMechanicForRequest.name : 'Kikyusa Central Boda Workshop',
        serviceType: requestServiceType,
        description: requestDescription,
        urgency: requestUrgency,
        location: requestLocation,
        status: 'requested',
        createdAt: new Date().toISOString()
      };

      storage.createRepairRequest(newReq);
      loadData();
      setRequestSubmitting(false);
      setRequestSuccessMsg('Repair request successfully submitted! Mechanics in Luweero have been notified.');
      setTimeout(() => {
        setRequestSuccessMsg('');
        setShowRequestModal(false);
        setRequestDescription('');
        setActiveTab('requests');
      }, 1500);
    }, 600);
  };

  const handleAddServiceRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: ServiceRecord = {
      id: `srv-${Date.now().toString().slice(-6)}`,
      riderId: currentRiderId,
      motorcycleReg: 'UFG 421K',
      serviceDate: recordDate,
      odometerKm: Number(recordMileage),
      servicePerformed: recordServiceType,
      partsReplaced: recordParts.split(',').map((p) => p.trim()).filter(Boolean),
      costUgx: Number(recordCost),
      mechanicName: recordMechanicName,
      garageName: recordGarageName,
      nextServiceDueKm: Number(recordNextDueKm),
      notes: recordNotes
    };

    storage.addServiceRecord(newRecord);
    loadData();
    setShowAddRecordModal(false);
    setActiveTab('logbook');
  };

  const handleUpdateStatus = (reqId: string, status: RepairRequest['status']) => {
    storage.updateRepairRequestStatus(reqId, status);
    loadData();
  };

  // Maintenance schedules calculation for current bike
  const currentBikeMileage = 14850;
  const maintenanceItems = [
    {
      title: 'Engine Oil Replacement',
      standardIntervalKm: 1500,
      lastServicedKm: 14000,
      dueKm: 15500,
      kmRemaining: 650,
      status: 'good',
      recommendation: 'Recommended Total 4T 20W-50 for high-load rural unpaved roads.'
    },
    {
      title: 'Drive Chain Tension & Lubrication',
      standardIntervalKm: 2000,
      lastServicedKm: 13500,
      dueKm: 15500,
      kmRemaining: 650,
      status: 'good',
      recommendation: 'Inspect slack (20-30mm) and spray heavy gear lube.'
    },
    {
      title: 'Brake Shoes & Cables Inspection',
      standardIntervalKm: 3000,
      lastServicedKm: 12000,
      dueKm: 15000,
      kmRemaining: 150,
      status: 'warning',
      recommendation: 'Due in 150 km. Rear drum brake shows 35% wear.'
    },
    {
      title: 'EV Controller & Battery Wiring Insulation',
      standardIntervalKm: 5000,
      lastServicedKm: 10000,
      dueKm: 15000,
      kmRemaining: 150,
      status: 'warning',
      recommendation: 'For electric bodas: check Anderson power connector and moisture seals.'
    },
    {
      title: 'Air Filter Cleaning & Spark Plug Gap',
      standardIntervalKm: 2500,
      lastServicedKm: 11000,
      dueKm: 13500,
      kmRemaining: -1350,
      status: 'overdue',
      recommendation: 'Overdue by 1,350 km. High dust on Kikyusa-Wobulenzi road reduces fuel economy.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-sky-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-radial from-amber-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-semibold">
              <Wrench className="w-3.5 h-3.5" />
              <span>Module 4 • Certified Luweero Mechanics & Garages</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Repairs, Maintenance & Service Logbook
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Find verified mechanics in Kikyusa, Luweero Town, and Wobulenzi. Track preventative maintenance schedules, log service history, and request quick roadside assistance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenRequestModal()}
              className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-400/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Book Repair Request</span>
            </button>
            <button
              onClick={() => setShowAddRecordModal(true)}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/15 flex items-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Log Completed Service</span>
            </button>
          </div>
        </div>

        {/* Quick Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-white/10">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Garages Directory ({mechanics.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Maintenance Schedule (UFG 421K)</span>
          </button>

          <button
            onClick={() => setActiveTab('logbook')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'logbook'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Service Logbook ({serviceRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer relative ${
              activeTab === 'requests'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Repair Requests ({repairRequests.length})</span>
            {repairRequests.some((r) => r.status === 'requested') && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: GARAGES DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by mechanic name, garage, brand (Bajaj, TVS, EV Bodawerk)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-semibold">Sub-County:</span>
              </div>
              <select
                value={selectedSubCounty}
                onChange={(e) => setSelectedSubCounty(e.target.value)}
                className="py-2.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Luweero</option>
                <option value="Kikyusa">Kikyusa</option>
                <option value="Luweero Town">Luweero Town</option>
                <option value="Wobulenzi">Wobulenzi</option>
                <option value="Kasana">Kasana</option>
                <option value="Kalagala">Kalagala</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
                <Filter className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-semibold">Specialty:</span>
              </div>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="py-2.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Specialties</option>
                <option value="Bajaj">Bajaj Boxer</option>
                <option value="TVS">TVS HLX</option>
                <option value="Electric">EV / Electric Motors</option>
                <option value="Wiring">Auto Electrical & Wiring</option>
                <option value="Engine">Complete Engine Overhaul</option>
              </select>
            </div>
          </div>

          {/* Mechanics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMechanics.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <Wrench className="w-9 h-9 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Mechanics or Maintenance Centres Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No verified garages match your current filter or the maintenance directory has not been populated yet.
                </p>
              </div>
            ) : (
              filteredMechanics.map((mech) => (
              <div
                key={mech.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-sky-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{mech.name}</h3>
                        {mech.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <Shield className="w-3 h-3 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Lead Mechanic: {mech.ownerName}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-amber-500 flex items-center justify-end gap-1">
                        <span>★</span>
                        <span>{mech.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {mech.reviewCount} reviews
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{mech.subCounty}, Luweero District</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`tel:${mech.phone}`} className="hover:text-sky-600 font-mono">
                        {mech.phone}
                      </a>
                    </div>
                  </div>

                  {/* Services Pills */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Services & Parts:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {mech.services.map((spec, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                        >
                          {spec.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                  <a
                    href={`tel:${mech.phone}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Call Garage</span>
                  </a>
                  <button
                    onClick={() => handleOpenRequestModal(mech)}
                    className="flex-1 py-2 px-3 rounded-xl bg-sky-900 hover:bg-sky-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-300" />
                    <span>Request Job</span>
                  </button>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MAINTENANCE SCHEDULE & REMINDERS */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Current Bike Summary Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-600">
                <Wrench className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">Bajaj Boxer BM 150 HD</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-xs font-mono font-bold">
                    UFG 421K
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned Rider: Kato Moses • Stage: Kikyusa Main Stage
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Odometer</span>
                <span className="text-lg font-mono font-extrabold text-slate-900">
                  {currentBikeMileage.toLocaleString()} km
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Services</span>
                <span className="text-lg font-mono font-extrabold text-sky-900">
                  {serviceRecords.length} logged
                </span>
              </div>
            </div>
          </div>

          {/* Maintenance Items List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Scheduled Maintenance Countdown</h4>
                <p className="text-xs text-slate-500">
                  Calculated based on average Luweero daily mileage (110 km/day).
                </p>
              </div>
              <button
                onClick={() => setShowAddRecordModal(true)}
                className="px-3 py-1.5 rounded-lg bg-sky-900 text-white text-xs font-semibold hover:bg-sky-800 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Maintenance</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {maintenanceItems.map((item, index) => {
                const isOverdue = item.kmRemaining < 0;
                const isWarning = item.kmRemaining <= 300 && !isOverdue;

                return (
                  <div key={index} className="p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                              OVERDUE BY {Math.abs(item.kmRemaining)} KM
                            </span>
                          )}
                          {isWarning && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                              DUE IN {item.kmRemaining} KM
                            </span>
                          )}
                          {!isOverdue && !isWarning && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                              HEALTHY ({item.kmRemaining} KM REMAINING)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{item.recommendation}</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Every</span>
                          <span className="font-semibold text-slate-700">
                            {item.standardIntervalKm.toLocaleString()} km
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Target Odometer</span>
                          <span className="font-bold font-mono text-slate-900">
                            {item.dueKm.toLocaleString()} km
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setRecordServiceType(item.title);
                            setShowAddRecordModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                        >
                          Mark Done
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICE LOGBOOK */}
      {activeTab === 'logbook' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Motorcycle Digital Service History</h3>
              <p className="text-xs text-slate-500">
                Official records certified by verified Luweero mechanics and stage leaders.
              </p>
            </div>
            <button
              onClick={() => setShowAddRecordModal(true)}
              className="px-4 py-2 rounded-xl bg-sky-900 hover:bg-sky-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Service Record</span>
            </button>
          </div>

          <div className="space-y-3">
            {serviceRecords.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{rec.servicePerformed}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono font-medium">
                        {rec.motorcycleReg}
                      </span>
                      <span className="text-xs text-slate-400">• {rec.serviceDate}</span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <strong>Workshop/Garage:</strong> {rec.garageName} (Lead: {rec.mechanicName})
                      </p>
                      <p>
                        <strong>Parts Replaced:</strong> {rec.partsReplaced.join(', ') || 'Inspection only'}
                      </p>
                      {rec.notes && (
                        <p className="text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          &ldquo;{rec.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-end justify-between md:justify-start gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Cost</span>
                      <span className="text-base font-bold text-emerald-600 font-mono">
                        UGX {rec.costUgx.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Service Odometer</span>
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        {rec.odometerKm.toLocaleString()} km
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: REPAIR REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Active Repair & Breakdown Orders</h3>
              <p className="text-xs text-slate-500">
                Roadside dispatches and workshop repair jobs across Luweero.
              </p>
            </div>
            <button
              onClick={() => handleOpenRequestModal()}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Repair Request</span>
            </button>
          </div>

          <div className="space-y-4">
            {repairRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {req.serviceType}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.urgency === 'roadside_breakdown'
                          ? 'bg-rose-100 text-rose-700'
                          : req.urgency === 'urgent'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {req.urgency.replace('_', ' ').toUpperCase()} PRIORITY
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'in_repair'
                          ? 'bg-sky-100 text-sky-800'
                          : req.status === 'accepted'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      STATUS: {req.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(req.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {req.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-slate-600 border-t border-slate-100">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span>
                      <strong>Rider:</strong> {req.riderName} ({req.motorcycleReg})
                    </span>
                    <span>
                      <strong>Location:</strong> {req.location}
                    </span>
                    <span>
                      <strong>Target Garage:</strong> {req.garageName || 'Open Dispatch'}
                    </span>
                  </div>

                  {/* Actions depending on role */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${req.riderPhone}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Call Rider</span>
                    </a>

                    {req.status === 'requested' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'accepted')}
                        className="px-3 py-1.5 rounded-lg bg-sky-900 hover:bg-sky-800 text-white font-semibold transition-colors cursor-pointer"
                      >
                        Accept Job
                      </button>
                    )}

                    {req.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'in_repair')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors cursor-pointer"
                      >
                        Start Work
                      </button>
                    )}

                    {req.status === 'in_repair' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'completed')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors cursor-pointer"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: BOOK REPAIR REQUEST */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 my-auto mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Request Repair / Breakdown</h3>
                  <p className="text-xs text-slate-500">
                    {selectedMechanicForRequest
                      ? `Target: ${selectedMechanicForRequest.name}`
                      : 'Broadcast to all available Luweero mechanics'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {requestSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{requestSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRepairRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Motorcycle Number Plate</label>
                  <input
                    type="text"
                    required
                    value={requestMotorcycleReg}
                    onChange={(e) => setRequestMotorcycleReg(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Motorcycle Type</label>
                  <select
                    value={requestMotorcycleType}
                    onChange={(e) => setRequestMotorcycleType(e.target.value as 'electric' | 'petrol')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="electric">Electric (E-Boda / Lithium)</option>
                    <option value="petrol">Petrol / Fuel Engine</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Category</label>
                  <select
                    value={requestServiceType}
                    onChange={(e) => setRequestServiceType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Routine Service & Oil Change">Routine Service & Oil Change</option>
                    <option value="Roadside Mechanical Breakdown">Roadside Breakdown</option>
                    <option value="EV Battery Wiring & Controller">EV Battery Wiring & Controller</option>
                    <option value="Tyre Puncture & Replacement">Tyre Puncture & Replacement</option>
                    <option value="Engine Knock & Clutch Tuning">Engine Knock & Clutch Tuning</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={requestUrgency}
                    onChange={(e) => setRequestUrgency(e.target.value as RepairRequest['urgency'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="routine">Routine (Next 2-3 days)</option>
                    <option value="urgent">Urgent (Within few hours)</option>
                    <option value="roadside_breakdown">Roadside Breakdown (Immediate SOS Rescue)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Location / Landmark</label>
                <input
                  type="text"
                  required
                  value={requestLocation}
                  onChange={(e) => setRequestLocation(e.target.value)}
                  placeholder="e.g. Kalagala Road, 2km from Kikyusa Trading Centre"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description of Fault</label>
                <textarea
                  required
                  rows={3}
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  placeholder="Describe the noise, symptoms, or what happened to the bike..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-md transition-colors cursor-pointer"
                >
                  {requestSubmitting ? 'Submitting...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG COMPLETED SERVICE RECORD */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 my-auto mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add Service Record</h3>
                  <p className="text-xs text-slate-500">Log routine maintenance or major overhaul</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddRecordModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddServiceRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Date</label>
                  <input
                    type="date"
                    required
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current Mileage (km)</label>
                  <input
                    type="number"
                    required
                    value={recordMileage}
                    onChange={(e) => setRecordMileage(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Performed</label>
                <input
                  type="text"
                  required
                  value={recordServiceType}
                  onChange={(e) => setRecordServiceType(e.target.value)}
                  placeholder="e.g. Engine Oil, Spark Plug & Chain Adjustment"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Parts Replaced (comma separated)
                </label>
                <input
                  type="text"
                  value={recordParts}
                  onChange={(e) => setRecordParts(e.target.value)}
                  placeholder="Total 4T Oil 1L, Oil filter, Brake shoe rear"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Cost (UGX)</label>
                  <input
                    type="number"
                    required
                    value={recordCost}
                    onChange={(e) => setRecordCost(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Next Service Due (km)</label>
                  <input
                    type="number"
                    required
                    value={recordNextDueKm}
                    onChange={(e) => setRecordNextDueKm(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mechanic / Garage Name</label>
                <input
                  type="text"
                  required
                  value={recordMechanicName}
                  onChange={(e) => setRecordMechanicName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inspection Notes</label>
                <textarea
                  rows={2}
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-900 hover:bg-sky-800 text-white font-bold shadow-md transition-colors cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
