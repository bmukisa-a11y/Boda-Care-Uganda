import React, { useState } from 'react';
import {
  MapPin,
  Bike,
  Package,
  Phone,
  ShieldCheck,
  Star,
  Share2,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  ArrowRight,
  Shield,
  Send,
} from 'lucide-react';
import { Booking, RiderProfile } from '../../types';
import { storage } from '../../lib/storage';
import { formatUgx, translations, Language } from '../../lib/i18n';

interface PassengerAppProps {
  lang: Language;
  onOpenSOS: () => void;
}

export const PassengerApp: React.FC<PassengerAppProps> = ({ lang, onOpenSOS }) => {
  const t = translations[lang];

  // Active bookings list
  const [bookings, setBookings] = useState<Booking[]>(() => storage.getBookings());
  const [verifiedRiders] = useState<RiderProfile[]>(() =>
    storage.getRiders().filter((r) => r.verificationStatus === 'verified')
  );

  // Booking Type: 'ride' or 'delivery'
  const [bookingType, setBookingType] = useState<'ride' | 'delivery'>('ride');

  // Form Inputs
  const [pickup, setPickup] = useState('Luweero Central Market');
  const [destination, setDestination] = useState('Kikyusa Health Centre IV');
  const [distanceKm, setDistanceKm] = useState(14.5);

  // Delivery-specific inputs
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [parcelDesc, setParcelDesc] = useState('');

  // Selected Rider
  const [selectedRiderId, setSelectedRiderId] = useState<string>('rider-kato-moses');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(() => {
    return bookings.find((b) => b.status === 'in_progress' || b.status === 'accepted' || b.status === 'arriving') || null;
  });

  // Rating Modal
  const [ratingBooking, setRatingBooking] = useState<Booking | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Calculate fare in UGX: 2500 base + 700 / km
  const fareUgx = Math.round((2500 + distanceKm * 700) / 500) * 500;

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const assignedRider = verifiedRiders.find((r) => r.id === selectedRiderId) || verifiedRiders[0];

    setTimeout(() => {
      const newBooking: Booking = {
        id: `bk-${Date.now().toString().slice(-6)}`,
        type: bookingType,
        passengerId: 'pass-prossy-01',
        passengerName: 'Babirye Prossy',
        passengerPhone: '+256 772 901 882',
        riderId: assignedRider.id,
        riderName: assignedRider.fullName,
        riderPhone: assignedRider.phone,
        riderBike: `${assignedRider.motorcycleMakeModel} (${assignedRider.motorcycleReg})`,
        pickupLocation: pickup,
        destination: destination,
        distanceKm: distanceKm,
        fareUgx: fareUgx,
        status: 'accepted',
        createdAt: new Date().toISOString(),
        deliveryDetails:
          bookingType === 'delivery'
            ? {
                senderName: 'Babirye Prossy',
                senderPhone: '+256 772 901 882',
                recipientName: recipientName.trim() || 'Consignee',
                recipientPhone: recipientPhone.trim() || '+256 700 000 000',
                parcelDescription: parcelDesc.trim() || 'Standard package',
              }
            : undefined,
      };

      storage.createBooking(newBooking);
      setBookings(storage.getBookings());
      setActiveBooking(newBooking);
      setIsSubmitting(false);
    }, 700);
  };

  const handleShareTrip = (b: Booking) => {
    const text = `I am on a verified BodaCare Uganda trip!\nDriver: ${b.riderName} (${b.riderPhone})\nBike: ${b.riderBike}\nRoute: ${b.pickupLocation} to ${b.destination}\nEmergency: +256 414 610 220`;
    if (navigator.share) {
      navigator.share({ title: 'My BodaCare Trip', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Trip safety details copied to clipboard! You can paste in WhatsApp or SMS.');
    }
  };

  const handleCompleteAndRate = (b: Booking) => {
    storage.updateBookingStatus(b.id, 'completed');
    setBookings(storage.getBookings());
    setActiveBooking(null);
    setRatingBooking(b);
  };

  const handleSubmitRating = (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingBooking) {
      storage.updateBookingStatus(ratingBooking.id, 'completed', ratingScore, reviewComment);
      setBookings(storage.getBookings());
      setRatingBooking(null);
      setReviewComment('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Verified Passenger & Delivery Hub
          </span>
          <h2 className="text-xl font-bold text-white mt-1">
            Safe, Inspected Boda-Bodas in Luweero District
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Logged in as <strong>Babirye Prossy</strong> (+256 772 901 882) · Luweero Central
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSOS}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
            <span>Passenger SOS</span>
          </button>
        </div>
      </div>

      {/* 2. Active Trip Monitor Card if trip in progress */}
      {activeBooking && (
        <div className="bg-white rounded-2xl p-5 border-2 border-emerald-500 shadow-xl space-y-4 animate-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="text-base font-extrabold text-slate-900">
                {activeBooking.type === 'ride' ? 'Active Ride' : 'Active Delivery'} Tracker: #{activeBooking.id}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                {activeBooking.status.replace('_', ' ')}
              </span>
              <button
                onClick={() => handleShareTrip(activeBooking)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Share Safety Link</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Driver Identity Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center">
                    KM
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{activeBooking.riderName}</h4>
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Rider</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900 font-mono">{activeBooking.riderBike}</p>
                  <p className="text-[11px] text-slate-500">Helmet Provided</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <a
                  href={`tel:${activeBooking.riderPhone}`}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-700"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Rider</span>
                </a>
                <span className="text-xs font-extrabold text-[#0B192C] font-mono">
                  Fare: {formatUgx(activeBooking.fareUgx)}
                </span>
              </div>
            </div>

            {/* Route & Progress */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pickup: <strong>{activeBooking.pickupLocation}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Drop-off: <strong>{activeBooking.destination}</strong></span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-500">
                <span>Distance: {activeBooking.distanceKm} km</span>
                <button
                  onClick={() => handleCompleteAndRate(activeBooking)}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Complete Trip & Rate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Booking Grid: Form + Interactive Luweero Map Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Booking & Parcel Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            {/* Toggle: Ride vs Delivery */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setBookingType('ride')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  bookingType === 'ride'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>Passenger Boda</span>
              </button>
              <button
                type="button"
                onClick={() => setBookingType('delivery')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  bookingType === 'delivery'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Send Parcel</span>
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-3">
              {/* Pickup location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pickup Point (Stage or Landmark):
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="e.g. Luweero Central Market"
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Drop-off Destination:
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-rose-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Kikyusa Health Centre IV"
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Distance Slider for Demo */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Estimated Distance:</span>
                  <span className="font-bold text-slate-900">{distanceKm} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="35"
                  step="0.5"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Delivery specific fields */}
              {bookingType === 'delivery' && (
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2 text-xs">
                  <p className="font-bold text-amber-900">Parcel & Recipient Details:</p>
                  <input
                    type="text"
                    required
                    placeholder="Recipient Full Name (e.g. Mzee Kakooza)"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Recipient Phone (+256 7XX XXX XXX)"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                  <textarea
                    rows={2}
                    placeholder="Parcel description (e.g. 2 sacks seeds, medicine box)"
                    value={parcelDesc}
                    onChange={(e) => setParcelDesc(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              {/* Select Verified Rider */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Choose Available Verified Rider:
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {verifiedRiders.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRiderId(r.id)}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        selectedRiderId === r.id
                          ? 'border-amber-500 bg-amber-50/60 font-semibold'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Bike className="w-3.5 h-3.5 text-amber-600" />
                        <span>{r.fullName} ({r.motorcycleReg})</span>
                      </div>
                      <span className="text-[10px] text-slate-500">★ {r.rating}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Fixed Transparent Fare</span>
                  <p className="text-xl font-extrabold text-amber-400 font-mono">
                    {formatUgx(fareUgx)}
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  <p>Cash or MoMo on arrival</p>
                  <p className="text-emerald-400">Clean helmet included</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Connecting to Rider...'
                    : bookingType === 'ride'
                    ? 'Confirm Boda Booking'
                    : 'Dispatch Parcel Delivery'}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Interactive Luweero District Map Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Luweero Corridor Live Map & Stages
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time GPS positions around Kikyusa, Luweero Town, Kasana & Wobulenzi
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                4 Stages Online
              </span>
            </div>

            {/* Stylized Interactive Map Canvas */}
            <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 p-4 select-none">
              {/* Murram / Highway Roads Graphic SVG */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* Main Kampala-Gulu Highway */}
                <line x1="20%" y1="95%" x2="50%" y2="5%" stroke="#475569" strokeWidth="8" strokeDasharray="6,4" />
                {/* Kikyusa Branch Road */}
                <line x1="45%" y1="40%" x2="85%" y2="60%" stroke="#d97706" strokeWidth="6" />
                {/* Bamunanika Feeder Road */}
                <line x1="85%" y1="60%" x2="90%" y2="90%" stroke="#78716c" strokeWidth="4" />
              </svg>

              {/* Station Markers */}
              {/* Luweero Town */}
              <div className="absolute top-[35%] left-[40%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
                <div className="p-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md">
                  <MapPin className="w-3.5 h-3.5 text-slate-950" />
                  <span>Luweero Town Stage</span>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-950/80 px-1 rounded block mt-0.5">
                  64 active bodas
                </span>
              </div>

              {/* Kikyusa Stage */}
              <div className="absolute top-[58%] left-[82%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
                <div className="p-1.5 rounded-lg bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md ring-2 ring-emerald-300">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Kikyusa Main Stage</span>
                </div>
                <span className="text-[10px] text-emerald-300 bg-slate-950/80 px-1 rounded block mt-0.5">
                  Chairman Mugisha
                </span>
              </div>

              {/* Kasana Market */}
              <div className="absolute top-[18%] left-[48%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
                <div className="p-1 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs flex items-center gap-1 shadow">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Kasana Market</span>
                </div>
              </div>

              {/* Wobulenzi Junction */}
              <div className="absolute top-[75%] left-[28%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
                <div className="p-1 rounded bg-slate-800 text-slate-200 border border-slate-700 text-xs flex items-center gap-1 shadow">
                  <MapPin className="w-3 h-3 text-sky-400" />
                  <span>Wobulenzi Junction</span>
                </div>
              </div>

              {/* Dynamic Rider Pin: Kato Moses */}
              <div className="absolute top-[48%] left-[62%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 animate-bounce">
                <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-lg ring-2 ring-white">
                  <Bike className="w-4 h-4" />
                </div>
                <span className="text-[10px] bg-slate-950 text-amber-400 font-mono px-1 rounded border border-amber-400/40">
                  UFG 421K
                </span>
              </div>

              {/* Map Footer Overlay */}
              <div className="absolute bottom-3 left-3 right-3 p-2 bg-slate-950/80 backdrop-blur-sm rounded-lg border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  GPS Grounding: Luweero Sub-County Geodata
                </span>
                <span className="text-slate-300 font-mono">Lat: 0.8492 · Lng: 32.4934</span>
              </div>
            </div>
          </div>

          {/* Passenger Safety Guarantee */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-slate-900">BodaCare Safety Commitment</h4>
              <p className="text-slate-600 mt-0.5">
                Every rider undergoes national ID inspection, road worthiness checks, and stage leader sponsorship. Every trip can be shared with your family via WhatsApp or SMS.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Rating & Review Modal */}
      {ratingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Rate Your Ride with {ratingBooking.riderName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Route: {ratingBooking.pickupLocation} → {ratingBooking.destination}
              </p>
            </div>

            <form onSubmit={handleSubmitRating} className="space-y-3">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingScore(star)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= ratingScore ? 'text-amber-400 fill-current' : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                placeholder="Share your feedback (e.g. Clean helmet, safe riding speed...)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-400"
              />

              <button
                type="submit"
                className="w-full py-2.5 bg-[#0B192C] text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Submit Rating & Help Community
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
