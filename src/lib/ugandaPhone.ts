/**
 * Ugandan Phone Number Validation, Carrier Detection & SMS Segment Utility
 * Supports MTN Uganda (077, 078, 076), Airtel Uganda (070, 075, 074), and UTL/Lyca (071, 072).
 */

export type UgandaCarrier = 'MTN' | 'Airtel' | 'Other' | 'Invalid';

export interface PhoneValidationResult {
  raw: string;
  normalized: string;
  isValid: boolean;
  network: UgandaCarrier;
  reason?: string;
}

export function validateUgandaPhone(rawPhone: string): PhoneValidationResult {
  const raw = (rawPhone || '').trim();
  if (!raw) {
    return {
      raw,
      normalized: '',
      isValid: false,
      network: 'Invalid',
      reason: 'Phone number is empty',
    };
  }

  // Strip spaces, dashes, parentheses
  let cleaned = raw.replace(/[\s\-().]/g, '');

  // Convert 00256... -> +256...
  if (cleaned.startsWith('00256')) {
    cleaned = '+256' + cleaned.slice(5);
  } else if (cleaned.startsWith('256')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    cleaned = '+256' + cleaned.slice(1);
  } else if (/^7\d{8}$/.test(cleaned)) {
    cleaned = '+256' + cleaned;
  }

  // Must match +2567XXXXXXXX (13 characters)
  if (!/^\+2567\d{8}$/.test(cleaned)) {
    return {
      raw,
      normalized: cleaned,
      isValid: false,
      network: 'Invalid',
      reason: 'Must be a valid 10-digit Ugandan mobile number (e.g. 0774912304 or +256774912304)',
    };
  }

  const prefix2 = cleaned.slice(4, 6); // e.g. '77', '78', '70', '75'
  let network: UgandaCarrier = 'Other';

  if (['77', '78', '76', '79'].includes(prefix2)) {
    network = 'MTN';
  } else if (['70', '75', '74'].includes(prefix2)) {
    network = 'Airtel';
  } else if (['71', '72', '73'].includes(prefix2)) {
    network = 'Other';
  } else {
    return {
      raw,
      normalized: cleaned,
      isValid: false,
      network: 'Invalid',
      reason: `Unrecognized Ugandan mobile prefix (0${prefix2})`,
    };
  }

  return {
    raw,
    normalized: cleaned,
    isValid: true,
    network,
  };
}

export function calculateSmsSegments(message: string): {
  length: number;
  segments: number;
  encoding: 'GSM-7' | 'UCS-2';
} {
  const text = message || '';
  // Detect non-GSM-7 characters (e.g. emojis or special unicode)
  const isGsm7 = /^[\x20-\x7E\r\n£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¤¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/.test(text);
  const length = text.length;

  if (length === 0) {
    return { length: 0, segments: 0, encoding: isGsm7 ? 'GSM-7' : 'UCS-2' };
  }

  if (isGsm7) {
    const segments = length <= 160 ? 1 : Math.ceil(length / 153);
    return { length, segments, encoding: 'GSM-7' };
  } else {
    const segments = length <= 70 ? 1 : Math.ceil(length / 67);
    return { length, segments, encoding: 'UCS-2' };
  }
}

export interface JobTemplateInput {
  id?: string;
  title: string;
  employerName?: string;
  employerCompany?: string;
  description?: string;
  district?: string;
  subCounty: string;
  village?: string;
  pickupLocation?: string;
  deliveryLocation?: string;
  paymentAmountUgx: number;
  paymentFrequency: string;
  employerPhone: string;
  deadline: string;
  salaryDisplay?: string;
  requirements?: string;
  applicationInstructions?: string;
}

export function buildJobDeepLink(jobId?: string, baseUrl?: string): string {
  const cleanBase = (baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://bodacare.ug')).replace(/\/+$/, '');
  if (!jobId) return cleanBase;
  return `${cleanBase}/?jobId=${encodeURIComponent(jobId)}`;
}

export function formatJobSmsTemplate(job: JobTemplateInput, appBaseUrl?: string): string {
  const employer = job.employerCompany || job.employerName || 'Verified BodaCare Employer';
  const locParts = [job.village, job.subCounty, job.district || 'Luweero'].filter(Boolean);
  const loc = locParts.join(', ');
  const pay =
    job.salaryDisplay ||
    `UGX ${Number(job.paymentAmountUgx || 0).toLocaleString()} (${(job.paymentFrequency || 'per_trip').replace('_', ' ')})`;
  const phone = (job.employerPhone || '').replace(/\s+/g, '');
  const link = buildJobDeepLink(job.id, appBaseUrl);

  return [
    'NEW JOB ALERT - BODA CARE LUWEERO!',
    '',
    `Job: ${job.title}`,
    `Employer: ${employer}`,
    `Location: ${loc}`,
    `Pay: ${pay} | Deadline: ${job.deadline} | Tel: ${phone}`,
    '',
    `For details and application, visit: ${link}`,
  ].join('\n');
}

export function formatJobWhatsAppTemplate(
  job: JobTemplateInput,
  riderName: string,
  appBaseUrl?: string
): string {
  const employer = job.employerCompany || job.employerName || 'Verified BodaCare Employer';
  const locParts = [job.village, job.subCounty, job.district || 'Luweero'].filter(Boolean);
  const routeNote =
    job.pickupLocation && job.deliveryLocation
      ? ` (${job.pickupLocation} -> ${job.deliveryLocation})`
      : '';
  const locationText = `${locParts.join(', ')}${routeNote}`;
  const pay =
    job.salaryDisplay ||
    `UGX ${Number(job.paymentAmountUgx || 0).toLocaleString()} (${(job.paymentFrequency || 'per_trip').replace('_', ' ')})`;
  const desc = (job.description || 'Verified boda transport / delivery assignment.').trim();
  const reqs = (job.requirements || 'Valid Class A driving permit, helmet, and BodaCare Rider ID.').trim();
  const instructions = job.applicationInstructions
    ? `\nHow to Apply: ${job.applicationInstructions.trim()}`
    : '';
  const link = buildJobDeepLink(job.id, appBaseUrl);

  return [
    'NEW JOB OPPORTUNITY!',
    '',
    `Hello ${riderName || 'Rider'},`,
    '',
    'A new job opportunity is available on Boda Care Luweero.',
    '',
    `Job: ${job.title}`,
    `Employer: ${employer}`,
    `Location: ${locationText}`,
    `Salary/Pay: ${pay}`,
    `Description: ${desc}`,
    `Requirements: ${reqs}${instructions}`,
    `Contact: ${job.employerPhone} | Deadline: ${job.deadline}`,
    '',
    `View full details and apply here: ${link}`,
    '',
    'Boda Care Luweero - Connecting Riders to Opportunities.',
  ].join('\n');
}

