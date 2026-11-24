import React, { useState } from 'react';
import {
  BatteryCharging,
  Zap,
  MapPin,
  Phone,
  Clock,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Filter,
  PlusCircle,
  Share2,
  Sun,
  ShieldCheck,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  X,
  Send,
  Sliders,
} from 'lucide-react';
import { BatterySwapStation, StationProblemReport, UserRole, BatteryBrand } from '../../types';
import { storage } from '../../lib/storage';
import { formatUgx, translations, Language } from '../../lib/i18n';
import { OfflineFreshnessBanner } from '../common/OfflineFreshnessBanner';

interface BatterySwapLocatorProps {
  lang?: Language;
  currentRole: UserRole;
  onOpenSOS?: () => void;
  isOffline?: boolean;
  lastSyncedAt?: string | null;
}

export const BatterySwapLocator: React.FC<BatterySwapLocatorProps> = ({
  lang = 'en',
  currentRole,
  onOpenSOS,
  isOffline = false,
  lastSyncedAt = null,
}) => {
  const t = translations[lang];

  const [stations, setStations] = useState<BatterySwapStation[]>(() => storage.getSwapStations());
  const [selectedStation, setSelectedStation] = useState<BatterySwapStation | null>(stations[0] || null);

  // Filters
  const [selectedSubCounty, setSelectedSubCounty] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [showRegisterStationModal, setShowRegisterStationModal] = useState(false);
  const [showInventoryUpdateModal, setShowInventoryUpdateModal] = useState(false);

  // Problem reporting form
  const [issueType, setIssueType] = useState<StationProblemReport['issueType']>('no_batteries');
  const [issueDescription, setIssueDescription] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Quick inventory update form (For Station Operators / Admins)
  const [inventoryAvailable, setInventoryAvailable] = useState('14');
  const [inventoryCharging, setInventoryCharging] = useState('6');
  const [inventorySaved, setInventorySaved] = useState(false);

  // Register station form
  const [newStationName, setNewStationName] = useState('');
  const [newOperatorName, setNewOperatorName] = useState('');
  const [newOperatorPhone, setNewOperatorPhone] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newSubCounty, setNewSubCounty] = useState('Kikyusa');
  const [newBrand, setNewBrand] = useState<BatteryBrand>('Bodawerk');
  const [newTotalBatteries, setNewTotalBatteries] = useState('16');
  const [newSwapFee, setNewSwapFee] = useState('3500');
  const [regSuccess, setRegSuccess] = useState(false);

  const filteredStations = stations.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.operatorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSub = selectedSubCounty === 'all' || s.subCounty === selectedSubCounty;
    const matchesBrand = selectedBrand === 'all' || s.batteryBrand === selectedBrand;

    return matchesSearch && matchesSub && matchesBrand;
  });

  const handleReportProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;

    const report: StationProblemReport = {
      id: `prob-${Date.now()}`,
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      reportedByRiderId: 'rider-kato-moses',
      riderName: 'Kato Moses',
      riderPhone: '+256 774 912 304',
      issueType,
      description: issueDescription.trim() || 'Rider reported problem with battery availability or hardware.',
      timestamp: new Date().toISOString(),
      status: 'open',
    };

    storage.reportStationProblem(report);
    setReportSuccess(true);
    setTimeout(() => {
      setReportSuccess(false);
      setShowProblemModal(false);
      setIssueDescription('');
    }, 2000);
  };

  const handleUpdateInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;

    const avail = parseInt(inventoryAvailable, 10);
    const charg = parseInt(inventoryCharging, 10);
    if (isNaN(avail) || isNaN(charg)) return;

    storage.updateStationInventory(selectedStation.id, avail, charg);
    setStations(storage.getSwapStations());
    const updated = storage.getSwapStations().find((s) => s.id === selectedStation.id);
    if (updated) setSelectedStation(updated);

    setInventorySaved(true);
    setTimeout(() => {
      setInventorySaved(false);
      setShowInventoryUpdateModal(false);
    }, 1500);
  };

  const handleRegisterStation = (e: React.FormEvent) => {
    e.preventDefault();
    const tot = parseInt(newTotalBatteries, 10) || 12;
    const fee = parseInt(newSwapFee, 10) || 3500;

    const newStation: BatterySwapStation = {
      id: `station-${Date.now()}`,
      name: newStationName.trim(),
      operatorName: newOperatorName.trim(),
      operatorPhone: newOperatorPhone.trim(),
      locationName: newLocationName.trim(),
      subCounty: newSubCounty,
      lat: 0.8145 + (Math.random() - 0.5) * 0.05,
      lng: 32.6121 + (Math.random() - 0.5) * 0.05,
      totalBatteries: tot,
      availableBatteries: Math.floor(tot * 0.7),
      chargingBatteries: Math.floor(tot * 0.3),
      batteryBrand: newBrand,
      connectorType: 'Chogori Universal High-Amp',
      swapFeeUgx: fee,
      operatingHours: '06:00 AM - 10:00 PM',
      powerSource: 'solar_hybrid',
      verified: currentRole === 'super_admin',
      status: 'open',
      rating: 5.0,
      lastStockUpdate: new Date().toISOString(),
      amenities: ['Solar Hybrid Power', 'Air Pump', 'Clean Restrooms'],
    };

    storage.saveSwapStation(newStation);
    setStations(storage.getSwapStations());
    setSelectedStation(newStation);
    setRegSuccess(true);
    setTimeout(() => {
      setRegSuccess(false);
      setShowRegisterStationModal(false);
      setNewStationName('');
    }, 1800);
  };

  const getStatusColor = (status: BatterySwapStation['status']) => {
    switch (status) {
      case 'open':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'congested':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'out_of_batteries':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      <OfflineFreshnessBanner
        isOffline={isOffline}
        lastSyncedAt={lastSyncedAt}
        contextLabel="Cached EV battery swap station stock"
      />
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0B192C] via-slate-900 to-[#0F3822] text-white p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Module 3: Electric Mobility & Battery Swap Infrastructure</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Luweero E-Boda Battery Swap Locator
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Real-time battery availability, solar charging status, and turn-by-turn navigation for electric motorcycle operators across Kikyusa, Luweero Town, Wobulenzi, and Kasana.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1 text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>5 Stations Online</span>
            </span>
            <span>•</span>
            <span className="text-amber-400 font-bold">55 Charged Batteries Ready</span>
            <span>•</span>
            <span className="text-slate-400">Bodawerk, Zembo, Spiro</span>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-col items-stretch gap-2.5 shrink-0">
          <button
            onClick={() => setShowRegisterStationModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Swap Station</span>
          </button>

          {(currentRole === 'station_operator' || currentRole === 'super_admin') && selectedStation && (
            <button
              onClick={() => {
                setInventoryAvailable(selectedStation.availableBatteries.toString());
                setInventoryCharging(selectedStation.chargingBatteries.toString());
                setShowInventoryUpdateModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>Update Station Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search station name, operator, or trading centre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedSubCounty}
            onChange={(e) => setSelectedSubCounty(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-medium focus:ring-1 focus:ring-amber-400"
          >
            <option value="all">All Sub-Counties</option>
            <option value="Kikyusa">Kikyusa</option>
            <option value="Luweero Town Council">Luweero Town Council</option>
            <option value="Wobulenzi">Wobulenzi</option>
            <option value="Kasana">Kasana</option>
            <option value="Bamunanika">Bamunanika</option>
          </select>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-medium focus:ring-1 focus:ring-amber-400"
          >
            <option value="all">All Battery Brands</option>
            <option value="Bodawerk">Bodawerk (48V)</option>
            <option value="Zembo">Zembo (72V)</option>
            <option value="Spiro">Spiro (RoPD)</option>
          </select>
        </div>
      </div>

      {/* 3. Interactive Map & Stations Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive District Map & Visual Pinpoints */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Luweero District E-Mobility Grid Map
              </h2>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              GPS Live Tracking
            </span>
          </div>

          {/* Interactive SVG Map Canvas */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-[#0E1B2B] p-4 flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 600 380"
              className="w-full h-full"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
            >
              {/* Regional Outline - Luweero District */}
              <path
                d="M 50 180 Q 90 60 220 50 Q 380 40 480 80 Q 560 140 540 260 Q 480 340 320 350 Q 180 360 80 290 Z"
                fill="#132438"
                stroke="#2A4365"
                strokeWidth="2"
              />

              {/* Major Roads in Luweero (Kampala-Gulu Highway, Kikyusa-Bamunanika Road) */}
              {/* Highway */}
              <path
                d="M 120 370 L 220 280 L 260 210 L 290 140 L 340 50"
                fill="none"
                stroke="#FBBF24"
                strokeWidth="4"
                strokeDasharray="6,4"
              />
              {/* Murram connecting road from Highway to Kikyusa */}
              <path
                d="M 260 210 L 360 220 L 440 200"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
              />
              {/* Kikyusa to Bamunanika Road */}
              <path
                d="M 440 200 L 410 290 L 320 350"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.5"
              />

              {/* District Labels */}
              <text x="70" y="80" fill="#64748B" fontSize="12" fontWeight="700">LUWEERO DISTRICT</text>
              <text x="140" y="320" fill="#94A3B8" fontSize="10">Wobulenzi</text>
              <text x="210" y="190" fill="#94A3B8" fontSize="10">Luweero Town</text>
              <text x="260" y="125" fill="#94A3B8" fontSize="10">Kasana Market</text>
              <text x="450" y="190" fill="#FBBF24" fontSize="11" fontWeight="800">KIKYUSA MAIN</text>
              <text x="415" y="315" fill="#94A3B8" fontSize="10">Bamunanika</text>

              {/* Interactive Station Markers */}
              {/* 1. Kikyusa Bodawerk Hub */}
              <g
                className="cursor-pointer transform hover:scale-125 transition-transform"
                onClick={() => setSelectedStation(stations.find((s) => s.id === 'station-kikyusa-main') || null)}
              >
                <circle cx="440" cy="200" r="14" fill="#10B981" fillOpacity="0.3" className="animate-ping" />
                <circle cx="440" cy="200" r="10" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                <text x="440" y="203" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">14</text>
              </g>

              {/* 2. Luweero Town Council */}
              <g
                className="cursor-pointer transform hover:scale-125 transition-transform"
                onClick={() => setSelectedStation(stations.find((s) => s.id === 'station-luweero-zembo') || null)}
              >
                <circle cx="260" cy="210" r="10" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                <text x="260" y="213" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">18</text>
              </g>

              {/* 3. Wobulenzi Spiro Hub */}
              <g
                className="cursor-pointer transform hover:scale-125 transition-transform"
                onClick={() => setSelectedStation(stations.find((s) => s.id === 'station-wobulenzi-spiro') || null)}
              >
                <circle cx="220" cy="280" r="9" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                <text x="220" y="283" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">9</text>
              </g>

              {/* 4. Kasana Market Hub */}
              <g
                className="cursor-pointer transform hover:scale-125 transition-transform"
                onClick={() => setSelectedStation(stations.find((s) => s.id === 'station-kasana-market') || null)}
              >
                <circle cx="290" cy="140" r="9" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
                <text x="290" y="143" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">4</text>
              </g>

              {/* 5. Bamunanika Solar Depot */}
              <g
                className="cursor-pointer transform hover:scale-125 transition-transform"
                onClick={() => setSelectedStation(stations.find((s) => s.id === 'station-bamunanika-solar') || null)}
              >
                <circle cx="410" cy="290" r="9" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                <text x="410" y="293" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">10</text>
              </g>
            </svg>

            {/* Map Legend Floating Box */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 text-[10px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Plenty of Batteries (5+)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Congested / Low Stock (&lt;5)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-amber-400" />
                <span>Kampala-Gulu Highway</span>
              </div>
            </div>
          </div>

          {/* Quick Station Selector Pills */}
          <div className="p-4 pt-0">
            <p className="text-xs font-semibold text-slate-500 mb-2">Tap any station to inspect details:</p>
            <div className="flex flex-wrap gap-2">
              {filteredStations.map((station) => (
                <button
                  key={station.id}
                  onClick={() => setSelectedStation(station)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedStation?.id === station.id
                      ? 'bg-[#0B192C] text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      station.status === 'open' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>{station.name.split('(')[0].trim()}</span>
                  <span className="text-[10px] font-mono opacity-80 font-normal">
                    ({station.availableBatteries} ready)
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Selected Station Detail Card & Action Drawer */}
        <div className="lg:col-span-5 space-y-4">
          {selectedStation ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
              {/* Header Info */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${getStatusColor(selectedStation.status)}`}>
                      {selectedStation.status.replace('_', ' ')}
                    </span>
                    {selectedStation.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Verified Hub</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                    {selectedStation.name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedStation.locationName}</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-base font-black text-emerald-600 font-mono">
                    {formatUgx(selectedStation.swapFeeUgx)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Standard Swap Fee</p>
                </div>
              </div>

              {/* Battery Stock Progress Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <BatteryCharging className="w-4 h-4 text-emerald-600" />
                    <span>Real-Time Inventory Status</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Total: {selectedStation.totalBatteries} Packs
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${(selectedStation.availableBatteries / selectedStation.totalBatteries) * 100}%`,
                    }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`${selectedStation.availableBatteries} Ready`}
                  />
                  <div
                    style={{
                      width: `${(selectedStation.chargingBatteries / selectedStation.totalBatteries) * 100}%`,
                    }}
                    className="bg-amber-400 h-full transition-all"
                    title={`${selectedStation.chargingBatteries} Charging`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xl font-extrabold text-emerald-700 font-mono">
                      {selectedStation.availableBatteries}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-900 uppercase">Charged & Ready</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xl font-extrabold text-amber-700 font-mono">
                      {selectedStation.chargingBatteries}
                    </p>
                    <p className="text-[10px] font-bold text-amber-900 uppercase">Currently Charging</p>
                  </div>
                </div>
              </div>

              {/* Tech Specs & Operator Info */}
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">BATTERY BRAND</span>
                    <strong className="text-slate-900">{selectedStation.batteryBrand}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">POWER SOURCE</span>
                    <strong className="text-slate-900 capitalize flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-500" />
                      <span>{selectedStation.powerSource.replace('_', ' ')}</span>
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">OPERATOR</span>
                    <strong className="text-slate-900">{selectedStation.operatorName}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">HOURS</span>
                    <strong className="text-slate-900">{selectedStation.operatingHours}</strong>
                  </div>
                </div>

                {/* Amenities */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Station Amenities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStation.amenities.map((a, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowDirectionsModal(true)}
                    className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Get Directions</span>
                  </button>

                  <a
                    href={`tel:${selectedStation.operatorPhone}`}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Call Operator</span>
                  </a>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href={`https://wa.me/${selectedStation.operatorPhone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(selectedStation.operatorName)},%20I%20am%20a%20BodaCare%20rider%20heading%20to%20${encodeURIComponent(selectedStation.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Chat</span>
                  </a>

                  <button
                    onClick={() => setShowProblemModal(true)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Report Problem</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
              Select a station on the map to see battery stocks and directions.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: STEP-BY-STEP DIRECTIONS */}
      {showDirectionsModal && selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Navigation Guide to {selectedStation.name}
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Route from Kikyusa Main Stage (Current Location)
                </p>
              </div>
              <button
                onClick={() => setShowDirectionsModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 font-bold uppercase">Estimated Ride Time</span>
                <p className="text-lg font-black text-emerald-950 font-mono">8 - 12 Minutes</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-800 font-bold uppercase">Distance</span>
                <p className="text-lg font-black text-emerald-950 font-mono">
                  {selectedStation.id === 'station-kikyusa-main' ? '0.3 km' : '14.5 km'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Head northwest from Kikyusa Main Stage past the Health Centre IV Gate.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Follow the paved bypass road for 200m towards the solar streetlights.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="text-slate-700 leading-relaxed font-semibold">
                  Arrive at {selectedStation.name} on the right-hand side. Look for the illuminated yellow Bodawerk battery rack.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDirectionsModal(false)}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
              >
                Close Navigation Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REPORT STATION PROBLEM */}
      {showProblemModal && selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Report Problem: {selectedStation.name}
                </h3>
                <p className="text-slate-500 text-xs">
                  Your report alerts station operators and platform admin immediately.
                </p>
              </div>
              <button
                onClick={() => setShowProblemModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Problem report logged! Technical supervisor notified.</span>
              </div>
            )}

            <form onSubmit={handleReportProblem} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as StationProblemReport['issueType'])}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                >
                  <option value="no_batteries">No charged batteries available</option>
                  <option value="station_closed">Station closed during operating hours</option>
                  <option value="connector_damaged">Damaged battery connector / pin</option>
                  <option value="meter_error">Meter or tariff billing dispute</option>
                  <option value="power_cut">Complete power failure / solar inverter trip</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe what occurred (e.g., waiting time, damaged cable, attendant absent)..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProblemModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Problem Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INVENTORY UPDATE (STATION OPERATOR) */}
      {showInventoryUpdateModal && selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Update Battery Stock: {selectedStation.name}
                </h3>
                <p className="text-slate-500 text-xs">
                  Operator: <strong>{selectedStation.operatorName}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowInventoryUpdateModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inventorySaved && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Live battery inventory updated! All riders see updated count.</span>
              </div>
            )}

            <form onSubmit={handleUpdateInventory} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Charged Batteries (Ready for Swap)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="50"
                  value={inventoryAvailable}
                  onChange={(e) => setInventoryAvailable(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Packs Currently in Solar Re-charge Bay
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="50"
                  value={inventoryCharging}
                  onChange={(e) => setInventoryCharging(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 font-mono font-bold text-lg"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInventoryUpdateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm active:scale-95 transition-all"
                >
                  Save Live Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: REGISTER NEW SWAP STATION */}
      {showRegisterStationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Register New Battery Swap Station
                </h3>
                <p className="text-slate-500 text-xs">
                  Apply to join the certified BodaCare Uganda electric charging network.
                </p>
              </div>
              <button
                onClick={() => setShowRegisterStationModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {regSuccess && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Station registered! Added to Luweero E-Mobility directory.</span>
              </div>
            )}

            <form onSubmit={handleRegisterStation} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Station Commercial Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zirobwe Town Solar Battery Hub"
                  value={newStationName}
                  onChange={(e) => setNewStationName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Station Operator / Owner</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Walusimbi Deo"
                    value={newOperatorName}
                    onChange={(e) => setNewOperatorName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operator Phone (+256)</label>
                  <input
                    type="tel"
                    required
                    placeholder="+256 772 000 000"
                    value={newOperatorPhone}
                    onChange={(e) => setNewOperatorPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location Landmark</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zirobwe Market Stage Roundabout"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
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
                  <label className="block font-semibold text-slate-700 mb-1">Supported Battery Brand</label>
                  <select
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value as BatteryBrand)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="Bodawerk">Bodawerk (48V 50Ah)</option>
                    <option value="Zembo">Zembo (72V)</option>
                    <option value="Spiro">Spiro (RoPD)</option>
                    <option value="Universal">Universal Smart Pack</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Battery Capacity</label>
                  <input
                    type="number"
                    required
                    value={newTotalBatteries}
                    onChange={(e) => setNewTotalBatteries(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRegisterStationModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm active:scale-95 transition-all"
                >
                  Submit Station Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
