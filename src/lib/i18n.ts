/**
 * BodaCare Uganda - Internationalization (English & Luganda)
 * Luganda is the lingua franca of Luweero District and Central Uganda.
 */

export type Language = 'en' | 'lg';

export const translations = {
  en: {
    appName: 'BodaCare Uganda',
    tagline: 'Empowering Boda-Boda Riders & Communities in Luweero',
    luganda: 'Oluganda',
    english: 'English',
    switchRole: 'Switch Role',
    offline: 'Offline Mode (Luweero Rural)',
    online: 'Connected',
    syncQueue: 'Pending Sync',
    syncNow: 'Sync Records Now',
    emergencySOS: 'Emergency SOS',
    quickSOS: 'One-Tap SOS',
    callPolice: 'Call Luweero Police (999 / 112)',

    // Navigation
    navDashboard: 'Dashboard',
    navBookRide: 'Ride & Delivery',
    navStage: 'Stage Hub',
    navDirectory: 'Mechanics & Spares',
    navAdmin: 'Owner Command',
    navIncome: 'Income & Expense',

    // Financial
    currency: 'UGX',
    todayEarnings: "Today's Earnings",
    todayExpenses: "Today's Expenses",
    netProfit: 'Net Profit',
    weeklyIncome: 'Weekly Gross',
    monthlyIncome: 'Monthly Gross',
    recordIncome: 'Record Daily Income',
    recordExpense: 'Record Expense',
    subscriptionStatus: 'Subscription Tier',
    daysRemaining: 'days remaining',
    renewNow: 'Upgrade / Renew Tier',
    paymentMethod: 'Payment Channel',
    mtnMoMo: 'MTN Mobile Money (*165#)',
    airtelMoney: 'Airtel Money (*185#)',

    // Roles
    superAdmin: 'Platform Owner',
    rider: 'Boda Rider',
    passenger: 'Passenger',
    stageLeader: 'Stage Leader',
    mechanic: 'Mechanic / Garage',

    // Rider registration
    registerRider: 'Register as Verified Rider',
    nationalId: 'National ID (NIN)',
    drivingPermit: 'Driving Permit No.',
    motorcycleReg: 'Number Plate',
    bodaStage: 'Boda Stage',
    ownership: 'Bike Ownership',
    statusVerified: 'Verified & Inspected',
    statusPending: 'Awaiting Stage Leader / Admin',
    statusUnderReview: 'Under Review',

    // Booking
    whereFrom: 'Pickup Stage / Location',
    whereTo: 'Drop-off Destination',
    requestBoda: 'Request Verified Boda',
    parcelDelivery: 'Send Parcel Delivery',
    estimatedFare: 'Estimated Fare',
    distance: 'Distance',
    riderArriving: 'Rider is on the way',
    tripStarted: 'Trip in progress',
    tripCompleted: 'Trip completed safely',
    rateRide: 'Rate your rider',
    shareTrip: 'Share Trip via WhatsApp/SMS',

    // Emergency
    sosAlertTitle: 'BodaCare Emergency Incident Dispatch',
    sosPrompt: 'Select emergency type to alert Luweero Police & Stage Responders:',
    accident: 'Road Accident',
    theft: 'Motorcycle Theft',
    medical: 'Medical Emergency',
    robbery: 'Robbery / Security Threat',
    breakdown: 'Mechanical Breakdown',
    sosSent: 'SOS broadcasted! Coordinates transmitted to Kikyusa & Luweero Central.',

    // Stage
    kikyusaStage: 'Kikyusa Main Stage',
    attendanceToday: 'Daily Roll Call',
    welfareFund: 'Stage Welfare Pot',
    postAnnouncement: 'Broadcast Announcement',

    // General
    actions: 'Actions',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    downloadReceipt: 'Download Receipt',
    verifiedBadge: 'Verified Operator',
  },
  lg: {
    appName: 'BodaCare Uganda',
    tagline: 'Okuzimba n’Okutumbula Abavuzi ba Boda mu Luweero',
    luganda: 'Oluganda',
    english: 'English',
    switchRole: 'Kyusa Ekifo',
    offline: 'Tewali Yintaneeti (Offline)',
    online: 'Yintaneeti Eriko',
    syncQueue: 'Ebitannatwalibwa',
    syncNow: 'Sindika Bye Wakoze',
    emergencySOS: 'Obuyambi Bw\'Amangu (SOS)',
    quickSOS: 'Koonako Buno n\'Buno',
    callPolice: 'Kuba Poliisi ya Luweero (999)',

    // Navigation
    navDashboard: 'Olutimbe Olukulu',
    navBookRide: 'Pangisa & Tuma Entaawa',
    navStage: 'Suteegi Yange',
    navDirectory: 'Makanika & Sipaya',
    navAdmin: 'Ebirowoozo by\'Omukulembeze',
    navIncome: 'Ennyingiza n\'Ensaasaanya',

    // Financial
    currency: 'UGX',
    todayEarnings: "Sente z'Okoze Leero",
    todayExpenses: "Ezaasaanyiziddwa Leero",
    netProfit: 'Amagoba Amasunsule',
    weeklyIncome: 'Ennyingiza ya Sabbiiti',
    monthlyIncome: 'Ennyingiza y\'Omwezi',
    recordIncome: 'Wandiika Ennyingiza',
    recordExpense: 'Wandiika Ensaasaanya',
    subscriptionStatus: 'Empeera y\'Okubaawo',
    daysRemaining: 'ennaku ezisigaddeyo',
    renewNow: 'Sasula Omwezi Omujja',
    paymentMethod: 'Engeri y\'Okusasula',
    mtnMoMo: 'MTN Mobile Money (*165#)',
    airtelMoney: 'Airtel Money (*185#)',

    // Roles
    superAdmin: 'Nannyini Pulatifomu',
    rider: 'Omugoba wa Boda',
    passenger: 'Omusaabaze',
    stageLeader: 'Mukulu wa Suteegi',
    mechanic: 'Makanika w\'Eppipa',

    // Rider registration
    registerRider: 'Wandiisa Boda Yo',
    nationalId: 'Endaga Muntu (NIN)',
    drivingPermit: 'Ppaamiti y\'Okuvuga',
    motorcycleReg: 'Namba y\'Eppipa (Plate)',
    bodaStage: 'Suteegi yo eya Boda',
    ownership: 'Bannannyini Pikipiki',
    statusVerified: 'Akakasiddwa Bulungi',
    statusPending: 'Kikyatunulwamu',
    statusUnderReview: 'Kyekenenyebwa',

    // Booking
    whereFrom: 'W\'Osangibwa (Pickup)',
    whereTo: 'Gy\'Ogenda (Destination)',
    requestBoda: 'Pangisa Boda Ennamu',
    parcelDelivery: 'Tuma Omugugu / Ebbusu',
    estimatedFare: 'Ebisale Ebiteeberezebwa',
    distance: 'Ebbanga (Kilometers)',
    riderArriving: 'Omugoba ali mu kkubo ajja',
    tripStarted: 'Lugendo lutandise',
    tripCompleted: 'Mwatuuse bulungi emirembe',
    rateRide: 'Wa omugoba amadaala',
    shareTrip: 'Weereza Ab\'Enganda Ku WhatsApp',

    // Emergency
    sosAlertTitle: 'Kutegeeza ku Kabi akaguddeewo mu Bwangu',
    sosPrompt: 'Londa ekika ky\'obuzibu obukuguddeko:',
    accident: 'Akabenje ku Kkubo',
    theft: 'Pikipiki Ebbibwa',
    medical: 'Obulwadde obw\'embagirawo',
    robbery: 'Ababbi b\'Emundu / Emigo',
    breakdown: 'Pikipiki Efudde mu Kkubo',
    sosSent: 'Obubaka bugenze! Poliisi ne Suteegi bitegeezeddwa.',

    // Stage
    kikyusaStage: 'Suteegi ya Kikyusa Enkulu',
    attendanceToday: 'Olukalala lw\'Abanene Leero',
    welfareFund: 'Akasente k\'Obwegassi',
    postAnnouncement: 'Langa eri Ba Boda bonna',

    // General
    actions: 'Ebikolwa',
    cancel: 'Sazaamu',
    confirm: 'Kakasa',
    save: 'Tereka',
    downloadReceipt: 'Kwata Risiiti',
    verifiedBadge: 'Omukakase mu Mateeka',
  },
};

export function formatUgx(amount: number): string {
  return `UGX ${amount.toLocaleString('en-US')}`;
}
