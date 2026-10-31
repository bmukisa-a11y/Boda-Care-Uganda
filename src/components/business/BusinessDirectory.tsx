import React, { useState } from 'react';
import {
  Wrench,
  Search,
  Phone,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  Filter,
  PlusCircle,
  Truck,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { BusinessListing, BusinessService } from '../../types';
import { storage } from '../../lib/storage';
import { formatUgx, translations, Language } from '../../lib/i18n';

interface BusinessDirectoryProps {
  lang: Language;
}

export const BusinessDirectory: React.FC<BusinessDirectoryProps> = ({ lang }) => {
  const t = translations[lang];

  const [businesses, setBusinesses] = useState<BusinessListing[]>(() => storage.getBusinesses());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCounty, setSelectedSubCounty] = useState('all');

  // Service Request Modal
  const [activeRequestBiz, setActiveRequestBiz] = useState<BusinessListing | null>(null);
  const [requestServiceName, setRequestServiceName] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  // Business registration modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizOwner, setNewBizOwner] = useState('');
  const [newBizPhone, setNewBizPhone] = useState('');
  const [newBizLocation, setNewBizLocation] = useState('Luweero Town');
  const [newBizCategory, setNewBizCategory] = useState<BusinessListing['category']>('garage');

  const categories = [
    { id: 'all', label: 'All Services' },
    { id: 'garage', label: 'Garages & Overhauls' },
    { id: 'spares', label: 'Genuine Spares' },
    { id: 'tyres', label: 'Tyre & Vulcanising' },
    { id: 'towing', label: '24/7 Breakdown & Towing' },
  ];

  const filteredBusinesses = businesses.filter((b) => {
    const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;
    const matchesSub = selectedSubCounty === 'all' || b.subCounty === selectedSubCounty;
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.services.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSub && matchesSearch;
  });

  const handleSendServiceRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSent(true);
    setTimeout(() => {
      setRequestSent(false);
      setActiveRequestBiz(null);
      setRequestServiceName('');
      setRequestNotes('');
      alert('Service request sent directly to garage! The mechanic will call you back.');
    }, 1200);
  };

  const handleRegisterBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    const newBiz: BusinessListing = {
      id: `biz-${Date.now()}`,
      name: newBizName,
      ownerName: newBizOwner,
      phone: newBizPhone,
      location: newBizLocation,
      subCounty: 'Luweero',
      category: newBizCategory,
      rating: 5.0,
      reviewCount: 1,
      operatingHours: '08:00 AM - 07:00 PM',
      verified: true,
      isPromoted: false,
      emergencyCallout: false,
      services: [
        { name: 'Standard Motorcycle Diagnostic', priceUgx: 5000, description: 'Inspection & electrical check' },
      ],
    };

    setBusinesses([newBiz, ...businesses]);
    setShowRegisterModal(false);
    setNewBizName('');
    setNewBizOwner('');
    setNewBizPhone('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Verified Mechanics, Garages & Spare Parts
          </span>
          <h2 className="text-xl font-bold text-white mt-1">
            Keep Your Motorcycle in Peak Road Condition
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Direct access to genuine Bajaj & TVS parts and certified mechanics in Luweero & Kikyusa
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Register Your Garage / Shop</span>
        </button>
      </div>

      {/* 2. Filter Bar & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Pills (Functional buttons) */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#0B192C] text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Location Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tyre, oil, piston, garage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <select
            value={selectedSubCounty}
            onChange={(e) => setSelectedSubCounty(e.target.value)}
            className="text-xs p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Locations</option>
            <option value="Kikyusa">Kikyusa</option>
            <option value="Luweero Town Council">Luweero Town</option>
            <option value="Kasana">Kasana</option>
          </select>
        </div>
      </div>

      {/* 3. Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredBusinesses.map((biz) => (
          <div
            key={biz.id}
            className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all ${
              biz.isPromoted ? 'border-amber-400 ring-1 ring-amber-400/30' : 'border-slate-200'
            }`}
          >
            <div className="space-y-3">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{biz.name}</h3>
                    {biz.verified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Proprietor: {biz.ownerName}</p>
                </div>

                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-amber-900 text-xs font-bold shrink-0">
                  <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                  <span>{biz.rating}</span>
                  <span className="text-[10px] text-slate-400">({biz.reviewCount})</span>
                </div>
              </div>

              {/* Location & Operating Hours */}
              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{biz.location} ({biz.subCounty})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{biz.operatingHours}</span>
                </div>
                {biz.emergencyCallout && (
                  <div className="flex items-center gap-2 text-rose-700 font-semibold">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>24/7 Roadside Rescue Available</span>
                  </div>
                )}
              </div>

              {/* Published Services & Genuine Spares Price List */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Services & Genuine Spares Pricing:
                </p>
                <div className="space-y-1.5">
                  {biz.services.map((svc, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg border border-slate-100 hover:bg-slate-50/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{svc.name}</p>
                        <p className="text-[10px] text-slate-500">{svc.description}</p>
                      </div>
                      {svc.priceUgx && (
                        <span className="font-bold text-[#0B192C] font-mono shrink-0 ml-2">
                          {formatUgx(svc.priceUgx)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <a
                href={`tel:${biz.phone}`}
                className="flex-1 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Call {biz.phone}</span>
              </a>

              <button
                onClick={() => {
                  setActiveRequestBiz(biz);
                  setRequestServiceName(biz.services[0]?.name || 'Motorcycle Service');
                }}
                className="py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Book Service
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Service Booking Modal */}
      {activeRequestBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Book Service with {activeRequestBiz.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Your request will be dispatched to {activeRequestBiz.ownerName}.
            </p>

            <form onSubmit={handleSendServiceRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Needed:</label>
                <select
                  value={requestServiceName}
                  onChange={(e) => setRequestServiceName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                >
                  {activeRequestBiz.services.map((s, i) => (
                    <option key={i} value={s.name}>
                      {s.name} ({s.priceUgx ? formatUgx(s.priceUgx) : 'Custom quote'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Describe Problem / Boda Model:
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Bajaj Boxer 150 making clicking sound in gearbox, stalled near Kikyusa"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={requestSent}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  {requestSent ? 'Dispatching...' : 'Confirm Service Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRequestBiz(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Business Registration Application Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Register Garage or Spare Shop</h3>
            <p className="text-xs text-slate-500 mb-4">
              Get listed on BodaCare Uganda and receive repair orders from local operators.
            </p>

            <form onSubmit={handleRegisterBusiness} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Luweero Precision Cycle Works"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ssekandi Fred"
                  value={newBizOwner}
                  onChange={(e) => setNewBizOwner(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (+256):</label>
                <input
                  type="tel"
                  required
                  placeholder="+256 775 000 000"
                  value={newBizPhone}
                  onChange={(e) => setNewBizPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category:</label>
                <select
                  value={newBizCategory}
                  onChange={(e) => setNewBizCategory(e.target.value as BusinessListing['category'])}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="garage">Full Service Garage</option>
                  <option value="spares">Motorcycle Spare Parts Dealer</option>
                  <option value="tyres">Tyres & Vulcanising</option>
                  <option value="towing">Breakdown Towing & Rescue</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0B192C] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Submit for Verification
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
